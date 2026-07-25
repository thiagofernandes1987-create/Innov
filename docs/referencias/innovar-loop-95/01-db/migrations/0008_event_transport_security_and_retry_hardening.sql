BEGIN;

-- Harden completion/failure functions against cross-tenant calls and malformed runtime data.
CREATE OR REPLACE FUNCTION platform.complete_outbox_publish(
 p_organization_id uuid,p_message_id uuid,p_worker_id text,p_provider_message_id text
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,platform AS $$
BEGIN
 IF p_organization_id IS DISTINCT FROM platform.current_organization_id() THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='TENANT_CONTEXT_MISMATCH'; END IF;
 IF nullif(btrim(p_worker_id),'') IS NULL OR nullif(btrim(p_provider_message_id),'') IS NULL THEN
   RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='INVALID_PUBLISH_COMPLETION_ARGUMENT'; END IF;
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
 IF p_organization_id IS DISTINCT FROM platform.current_organization_id() THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='TENANT_CONTEXT_MISMATCH'; END IF;
 IF nullif(btrim(p_worker_id),'') IS NULL OR nullif(btrim(p_error),'') IS NULL OR p_retry_seconds NOT BETWEEN 1 AND 86400 THEN
   RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='INVALID_RETRY_ARGUMENT'; END IF;
 UPDATE platform.outbox_messages SET locked_by=NULL,locked_until=NULL,last_error=left(p_error,4000),
 available_at=now()+make_interval(secs=>p_retry_seconds)
 WHERE organization_id=p_organization_id AND id=p_message_id AND locked_by=p_worker_id
   AND locked_until>=now() AND published_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='OUTBOX_LEASE_LOST'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION platform.claim_inbox(
 p_organization_id uuid,p_consumer_name text,p_event_id uuid,p_event_version integer,
 p_worker_id text,p_lease_seconds integer,p_expires_at timestamptz
) RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,platform AS $$
DECLARE v_status platform.operation_status;
BEGIN
 IF p_organization_id IS DISTINCT FROM platform.current_organization_id() THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='TENANT_CONTEXT_MISMATCH'; END IF;
 IF nullif(btrim(p_consumer_name),'') IS NULL OR nullif(btrim(p_worker_id),'') IS NULL OR
    p_event_version<=0 OR p_lease_seconds NOT BETWEEN 5 AND 900 OR p_expires_at<=now() THEN
   RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='INVALID_INBOX_ARGUMENT'; END IF;
 INSERT INTO platform.consumer_inbox(organization_id,consumer_name,event_id,event_version,status,attempts,locked_by,locked_until,expires_at)
 VALUES(p_organization_id,p_consumer_name,p_event_id,p_event_version,'IN_PROGRESS',1,p_worker_id,now()+make_interval(secs=>p_lease_seconds),p_expires_at)
 ON CONFLICT(organization_id,consumer_name,event_id) DO UPDATE
 SET attempts=platform.consumer_inbox.attempts+1,locked_by=EXCLUDED.locked_by,locked_until=EXCLUDED.locked_until,last_error=NULL
 WHERE (platform.consumer_inbox.status='FAILED' OR platform.consumer_inbox.locked_until<now())
   AND platform.consumer_inbox.attempts < 100
 RETURNING status INTO v_status;
 IF NOT FOUND THEN RETURN 'DUPLICATE_BUSY_OR_EXHAUSTED'; END IF;
 RETURN 'CLAIMED';
END; $$;

CREATE OR REPLACE FUNCTION platform.complete_inbox(
 p_organization_id uuid,p_consumer_name text,p_event_id uuid,p_worker_id text,p_result_hash text
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,platform AS $$
BEGIN
 IF p_organization_id IS DISTINCT FROM platform.current_organization_id() THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='TENANT_CONTEXT_MISMATCH'; END IF;
 IF nullif(btrim(p_worker_id),'') IS NULL OR nullif(btrim(p_result_hash),'') IS NULL THEN
   RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='INVALID_INBOX_COMPLETION_ARGUMENT'; END IF;
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
 IF p_organization_id IS DISTINCT FROM platform.current_organization_id() THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='TENANT_CONTEXT_MISMATCH'; END IF;
 IF nullif(btrim(p_worker_id),'') IS NULL OR nullif(btrim(p_error),'') IS NULL THEN
   RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='INVALID_INBOX_FAILURE_ARGUMENT'; END IF;
 UPDATE platform.consumer_inbox SET status='FAILED',last_error=left(p_error,4000),locked_by=NULL,locked_until=NULL
 WHERE organization_id=p_organization_id AND consumer_name=p_consumer_name AND event_id=p_event_id
 AND status='IN_PROGRESS' AND locked_by=p_worker_id AND locked_until>=now();
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='INBOX_LEASE_LOST'; END IF;
END; $$;

REVOKE ALL ON FUNCTION platform.complete_outbox_publish(uuid,uuid,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION platform.fail_outbox_publish(uuid,uuid,text,text,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION platform.claim_inbox(uuid,text,uuid,integer,text,integer,timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION platform.complete_inbox(uuid,text,uuid,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION platform.fail_inbox(uuid,text,uuid,text,text) FROM PUBLIC;
COMMIT;
