BEGIN;
ALTER TABLE platform.dead_letter_messages DROP CONSTRAINT IF EXISTS dead_letter_messages_consumer_name_source_event_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS dead_letter_messages_tenant_dedupe_uk
 ON platform.dead_letter_messages(organization_id,consumer_name,source_event_id);
ALTER TABLE platform.dead_letter_messages ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'OPEN';
ALTER TABLE platform.dead_letter_messages ADD COLUMN IF NOT EXISTS resolution_code text;
ALTER TABLE platform.dead_letter_messages ADD CONSTRAINT dead_letter_status_check CHECK(status IN ('OPEN','RESOLVED'));

CREATE TABLE IF NOT EXISTS platform.dead_letter_replays(
 id uuid PRIMARY KEY,
 organization_id uuid NOT NULL,
 dead_letter_id uuid NOT NULL REFERENCES platform.dead_letter_messages(id),
 actor_id text NOT NULL,
 reason text NOT NULL,
 idempotency_key uuid NOT NULL,
 dry_run boolean NOT NULL DEFAULT true,
 provider_message_id text,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,idempotency_key)
);
ALTER TABLE platform.dead_letter_replays ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.dead_letter_replays FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dead_letter_replays_tenant_isolation ON platform.dead_letter_replays;
CREATE POLICY dead_letter_replays_tenant_isolation ON platform.dead_letter_replays
 USING (organization_id=platform.current_organization_id())
 WITH CHECK (organization_id=platform.current_organization_id());

CREATE OR REPLACE FUNCTION platform.claim_dead_letter_replay(
 p_organization_id uuid,p_dead_letter_id uuid,p_actor_id text,p_reason text,
 p_idempotency_key uuid,p_dry_run boolean
) RETURNS TABLE(replay_id uuid,created boolean,event_type text,source_event_id uuid,payload jsonb)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,platform AS $$
DECLARE v_existing platform.dead_letter_replays; v_dlq platform.dead_letter_messages;
BEGIN
 IF p_organization_id IS DISTINCT FROM platform.current_organization_id() THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='TENANT_CONTEXT_MISMATCH'; END IF;
 IF nullif(btrim(p_actor_id),'') IS NULL OR nullif(btrim(p_reason),'') IS NULL THEN
   RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='INVALID_REPLAY_ARGUMENT'; END IF;
 SELECT * INTO v_existing FROM platform.dead_letter_replays
  WHERE organization_id=p_organization_id AND idempotency_key=p_idempotency_key;
 IF FOUND THEN
   SELECT * INTO v_dlq FROM platform.dead_letter_messages WHERE organization_id=p_organization_id AND id=v_existing.dead_letter_id;
   RETURN QUERY SELECT v_existing.id,false,v_dlq.event_type,v_dlq.source_event_id,v_dlq.payload; RETURN;
 END IF;
 SELECT * INTO v_dlq FROM platform.dead_letter_messages
  WHERE organization_id=p_organization_id AND id=p_dead_letter_id AND status='OPEN'
  FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='DLQ_NOT_FOUND_OR_CLOSED'; END IF;
 INSERT INTO platform.dead_letter_replays(id,organization_id,dead_letter_id,actor_id,reason,idempotency_key,dry_run)
 VALUES(gen_random_uuid(),p_organization_id,p_dead_letter_id,p_actor_id,p_reason,p_idempotency_key,p_dry_run)
 RETURNING id INTO replay_id;
 created:=true; event_type:=v_dlq.event_type; source_event_id:=v_dlq.source_event_id; payload:=v_dlq.payload; RETURN NEXT;
END; $$;

CREATE OR REPLACE FUNCTION platform.complete_dead_letter_replay(
 p_organization_id uuid,p_replay_id uuid,p_provider_message_id text
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,platform AS $$
BEGIN
 IF p_organization_id IS DISTINCT FROM platform.current_organization_id() THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='TENANT_CONTEXT_MISMATCH'; END IF;
 IF nullif(btrim(p_provider_message_id),'') IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='INVALID_PROVIDER_MESSAGE_ID'; END IF;
 UPDATE platform.dead_letter_replays SET provider_message_id=p_provider_message_id
 WHERE organization_id=p_organization_id AND id=p_replay_id AND provider_message_id IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='REPLAY_NOT_CLAIMED_OR_ALREADY_COMPLETED'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION platform.resolve_dead_letter(
 p_organization_id uuid,p_dead_letter_id uuid,p_resolution_code text,p_note text
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,platform AS $$
BEGIN
 IF p_organization_id IS DISTINCT FROM platform.current_organization_id() THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='TENANT_CONTEXT_MISMATCH'; END IF;
 IF nullif(btrim(p_resolution_code),'') IS NULL OR nullif(btrim(p_note),'') IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='INVALID_RESOLUTION_ARGUMENT'; END IF;
 UPDATE platform.dead_letter_messages SET status='RESOLVED',resolution_code=p_resolution_code,resolution_note=p_note,resolved_at=now()
 WHERE organization_id=p_organization_id AND id=p_dead_letter_id AND status='OPEN';
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='DLQ_NOT_FOUND_OR_CLOSED'; END IF;
END; $$;

REVOKE ALL ON FUNCTION platform.claim_dead_letter_replay(uuid,uuid,text,text,uuid,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION platform.complete_dead_letter_replay(uuid,uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION platform.resolve_dead_letter(uuid,uuid,text,text) FROM PUBLIC;
COMMIT;
