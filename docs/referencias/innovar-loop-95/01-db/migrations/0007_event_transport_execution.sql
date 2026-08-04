BEGIN;

-- Atomic aggregate + domain event + outbox write. The caller must already have
-- set app.current_organization_id and must execute the aggregate mutation in the
-- same PostgreSQL transaction before invoking this function.
CREATE OR REPLACE FUNCTION platform.append_domain_event_and_outbox(
  p_organization_id uuid,
  p_event_id uuid,
  p_event_type text,
  p_event_version integer,
  p_aggregate_type text,
  p_aggregate_id uuid,
  p_aggregate_version bigint,
  p_actor_id uuid,
  p_actor_type text,
  p_occurred_at timestamptz,
  p_correlation_id uuid,
  p_causation_id uuid,
  p_request_id uuid,
  p_idempotency_key uuid,
  p_producer text,
  p_payload jsonb,
  p_metadata jsonb,
  p_topic text,
  p_partition_key text,
  p_headers jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, platform
AS $$
BEGIN
  IF p_organization_id IS DISTINCT FROM platform.current_organization_id() THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='TENANT_CONTEXT_MISMATCH';
  END IF;
  IF p_event_version <= 0 OR p_aggregate_version <= 0 THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='INVALID_EVENT_VERSION';
  END IF;

  INSERT INTO platform.domain_events(
    organization_id,event_id,event_type,event_version,aggregate_type,aggregate_id,
    aggregate_version,actor_id,actor_type,occurred_at,correlation_id,causation_id,
    request_id,idempotency_key,producer,payload,metadata
  ) VALUES (
    p_organization_id,p_event_id,p_event_type,p_event_version,p_aggregate_type,p_aggregate_id,
    p_aggregate_version,p_actor_id,p_actor_type,p_occurred_at,p_correlation_id,p_causation_id,
    p_request_id,p_idempotency_key,p_producer,p_payload,COALESCE(p_metadata,'{}'::jsonb)
  );

  INSERT INTO platform.outbox_messages(
    organization_id,event_id,topic,partition_key,payload,headers
  ) VALUES (
    p_organization_id,p_event_id,p_topic,p_partition_key,p_payload,COALESCE(p_headers,'{}'::jsonb)
  );
  RETURN p_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION platform.claim_outbox(
  p_organization_id uuid, p_worker_id text, p_batch_size integer,
  p_lease_seconds integer
) RETURNS SETOF platform.outbox_messages
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,platform AS $$
BEGIN
  IF p_organization_id IS DISTINCT FROM platform.current_organization_id() THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='TENANT_CONTEXT_MISMATCH';
  END IF;
  IF p_batch_size NOT BETWEEN 1 AND 500 OR p_lease_seconds NOT BETWEEN 5 AND 900 THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='INVALID_CLAIM_ARGUMENT';
  END IF;
  RETURN QUERY
  WITH candidates AS (
    SELECT organization_id,id FROM platform.outbox_messages
    WHERE organization_id=p_organization_id AND published_at IS NULL
      AND available_at<=now() AND attempts<max_attempts
      AND (locked_until IS NULL OR locked_until<now())
    ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT p_batch_size
  )
  UPDATE platform.outbox_messages o
  SET locked_by=p_worker_id, locked_until=now()+make_interval(secs=>p_lease_seconds),
      attempts=o.attempts+1
  FROM candidates c WHERE o.organization_id=c.organization_id AND o.id=c.id
  RETURNING o.*;
END; $$;

CREATE OR REPLACE FUNCTION platform.complete_outbox_publish(
 p_organization_id uuid,p_message_id uuid,p_worker_id text,p_provider_message_id text
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,platform AS $$
BEGIN
 UPDATE platform.outbox_messages SET published_at=now(),locked_by=NULL,locked_until=NULL,
 headers=headers||jsonb_build_object('provider_message_id',p_provider_message_id),last_error=NULL
 WHERE organization_id=p_organization_id AND id=p_message_id AND locked_by=p_worker_id
   AND locked_until>=now() AND published_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='OUTBOX_LEASE_LOST'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION platform.fail_outbox_publish(
 p_organization_id uuid,p_message_id uuid,p_worker_id text,p_error text,p_retry_seconds integer
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,platform AS $$
BEGIN
 IF p_retry_seconds NOT BETWEEN 1 AND 86400 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='INVALID_RETRY_DELAY'; END IF;
 UPDATE platform.outbox_messages SET locked_by=NULL,locked_until=NULL,last_error=left(p_error,4000),
 available_at=now()+make_interval(secs=>p_retry_seconds)
 WHERE organization_id=p_organization_id AND id=p_message_id AND locked_by=p_worker_id
   AND published_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='OUTBOX_LEASE_LOST'; END IF;
END; $$;

ALTER TABLE platform.consumer_inbox ADD COLUMN IF NOT EXISTS locked_by varchar(120);
ALTER TABLE platform.consumer_inbox ADD COLUMN IF NOT EXISTS locked_until timestamptz;
ALTER TABLE platform.consumer_inbox ADD COLUMN IF NOT EXISTS last_error text;
ALTER TABLE platform.consumer_inbox DROP CONSTRAINT IF EXISTS consumer_inbox_attempts_check;
ALTER TABLE platform.consumer_inbox ADD CONSTRAINT consumer_inbox_attempts_check CHECK(attempts BETWEEN 1 AND 100);

CREATE OR REPLACE FUNCTION platform.claim_inbox(
 p_organization_id uuid,p_consumer_name text,p_event_id uuid,p_event_version integer,
 p_worker_id text,p_lease_seconds integer,p_expires_at timestamptz
) RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,platform AS $$
DECLARE v_status platform.operation_status;
BEGIN
 IF p_organization_id IS DISTINCT FROM platform.current_organization_id() THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='TENANT_CONTEXT_MISMATCH'; END IF;
 IF p_event_version<=0 OR p_lease_seconds NOT BETWEEN 5 AND 900 OR p_expires_at<=now() THEN
   RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='INVALID_INBOX_ARGUMENT'; END IF;
 INSERT INTO platform.consumer_inbox(organization_id,consumer_name,event_id,event_version,status,attempts,locked_by,locked_until,expires_at)
 VALUES(p_organization_id,p_consumer_name,p_event_id,p_event_version,'IN_PROGRESS',1,p_worker_id,now()+make_interval(secs=>p_lease_seconds),p_expires_at)
 ON CONFLICT(organization_id,consumer_name,event_id) DO UPDATE
 SET attempts=platform.consumer_inbox.attempts+1,locked_by=EXCLUDED.locked_by,locked_until=EXCLUDED.locked_until,last_error=NULL
 WHERE platform.consumer_inbox.status='FAILED' OR platform.consumer_inbox.locked_until<now()
 RETURNING status INTO v_status;
 IF NOT FOUND THEN RETURN 'DUPLICATE_OR_BUSY'; END IF;
 RETURN 'CLAIMED';
END; $$;

CREATE OR REPLACE FUNCTION platform.complete_inbox(
 p_organization_id uuid,p_consumer_name text,p_event_id uuid,p_worker_id text,p_result_hash text
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,platform AS $$
BEGIN
 UPDATE platform.consumer_inbox SET status='SUCCEEDED',processed_at=now(),result_hash=p_result_hash,
 locked_by=NULL,locked_until=NULL,last_error=NULL
 WHERE organization_id=p_organization_id AND consumer_name=p_consumer_name AND event_id=p_event_id
 AND status='IN_PROGRESS' AND locked_by=p_worker_id AND locked_until>=now();
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='INBOX_LEASE_LOST'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION platform.fail_inbox(
 p_organization_id uuid,p_consumer_name text,p_event_id uuid,p_worker_id text,p_error text
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,platform AS $$
BEGIN
 UPDATE platform.consumer_inbox SET status='FAILED',last_error=left(p_error,4000),locked_by=NULL,locked_until=NULL
 WHERE organization_id=p_organization_id AND consumer_name=p_consumer_name AND event_id=p_event_id
 AND status='IN_PROGRESS' AND locked_by=p_worker_id;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='INBOX_LEASE_LOST'; END IF;
END; $$;

REVOKE ALL ON FUNCTION platform.append_domain_event_and_outbox(uuid,uuid,text,integer,text,uuid,bigint,uuid,text,timestamptz,uuid,uuid,uuid,uuid,text,jsonb,jsonb,text,text,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION platform.claim_outbox(uuid,text,integer,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION platform.complete_outbox_publish(uuid,uuid,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION platform.fail_outbox_publish(uuid,uuid,text,text,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION platform.claim_inbox(uuid,text,uuid,integer,text,integer,timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION platform.complete_inbox(uuid,text,uuid,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION platform.fail_inbox(uuid,text,uuid,text,text) FROM PUBLIC;
COMMIT;
