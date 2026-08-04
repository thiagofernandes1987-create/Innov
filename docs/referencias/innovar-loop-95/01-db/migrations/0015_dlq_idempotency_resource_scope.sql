BEGIN;

ALTER TABLE platform.dead_letter_replays
  ADD COLUMN IF NOT EXISTS request_hash text;
UPDATE platform.dead_letter_replays
SET request_hash = COALESCE(request_hash, 'legacy:' || id::text)
WHERE request_hash IS NULL;
ALTER TABLE platform.dead_letter_replays
  ALTER COLUMN request_hash SET NOT NULL;
ALTER TABLE platform.dead_letter_replays
  DROP CONSTRAINT IF EXISTS dead_letter_replays_organization_id_idempotency_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS dead_letter_replays_resource_idempotency_uk
  ON platform.dead_letter_replays(organization_id, dead_letter_id, idempotency_key);

ALTER TABLE platform.dead_letter_resolutions
  ADD COLUMN IF NOT EXISTS request_hash text;
UPDATE platform.dead_letter_resolutions
SET request_hash = COALESCE(request_hash, 'legacy:' || id::text)
WHERE request_hash IS NULL;
ALTER TABLE platform.dead_letter_resolutions
  ALTER COLUMN request_hash SET NOT NULL;
ALTER TABLE platform.dead_letter_resolutions
  DROP CONSTRAINT IF EXISTS dead_letter_resolutions_organization_id_idempotency_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS dead_letter_resolutions_resource_idempotency_uk
  ON platform.dead_letter_resolutions(organization_id, dead_letter_id, idempotency_key);

DROP FUNCTION IF EXISTS platform.claim_dead_letter_replay(uuid,uuid,text,text,uuid,boolean);
CREATE OR REPLACE FUNCTION platform.claim_dead_letter_replay(
 p_organization_id uuid,p_dead_letter_id uuid,p_actor_id text,p_reason text,
 p_idempotency_key uuid,p_dry_run boolean,p_request_hash text
) RETURNS TABLE(replay_id uuid,created boolean,event_type text,source_event_id uuid,payload jsonb)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,platform AS $$
DECLARE v_existing platform.dead_letter_replays; v_dlq platform.dead_letter_messages;
BEGIN
 IF p_organization_id IS DISTINCT FROM platform.current_organization_id() THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='TENANT_CONTEXT_MISMATCH'; END IF;
 IF nullif(btrim(p_actor_id),'') IS NULL OR nullif(btrim(p_reason),'') IS NULL OR nullif(btrim(p_request_hash),'') IS NULL THEN
   RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='INVALID_REPLAY_ARGUMENT'; END IF;
 SELECT * INTO v_existing FROM platform.dead_letter_replays
  WHERE organization_id=p_organization_id AND dead_letter_id=p_dead_letter_id AND idempotency_key=p_idempotency_key;
 IF FOUND THEN
   IF v_existing.request_hash IS DISTINCT FROM p_request_hash THEN
     RAISE EXCEPTION USING ERRCODE='23505',MESSAGE='IDEMPOTENCY_KEY_REUSED'; END IF;
   SELECT * INTO v_dlq FROM platform.dead_letter_messages
    WHERE organization_id=p_organization_id AND id=v_existing.dead_letter_id;
   RETURN QUERY SELECT v_existing.id,false,v_dlq.event_type,v_dlq.source_event_id,v_dlq.payload; RETURN;
 END IF;
 SELECT * INTO v_dlq FROM platform.dead_letter_messages
  WHERE organization_id=p_organization_id AND id=p_dead_letter_id AND status='OPEN' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='DLQ_NOT_FOUND_OR_CLOSED'; END IF;
 INSERT INTO platform.dead_letter_replays(id,organization_id,dead_letter_id,actor_id,reason,idempotency_key,request_hash,dry_run)
 VALUES(gen_random_uuid(),p_organization_id,p_dead_letter_id,p_actor_id,p_reason,p_idempotency_key,p_request_hash,p_dry_run)
 RETURNING id INTO replay_id;
 created:=true; event_type:=v_dlq.event_type; source_event_id:=v_dlq.source_event_id; payload:=v_dlq.payload; RETURN NEXT;
END; $$;

DROP FUNCTION IF EXISTS platform.resolve_dead_letter_idempotent(uuid,uuid,text,text,text,uuid);
CREATE OR REPLACE FUNCTION platform.resolve_dead_letter_idempotent(
 p_organization_id uuid,p_dead_letter_id uuid,p_actor_id text,p_resolution_code text,p_note text,
 p_idempotency_key uuid,p_request_hash text
) RETURNS TABLE(resolution_id uuid,created boolean,dead_letter_id uuid,status text,resolution_code text,resolution_note text,resolved_at timestamptz)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,platform AS $$
DECLARE v_existing platform.dead_letter_resolutions; v_dlq platform.dead_letter_messages;
BEGIN
 IF p_organization_id IS DISTINCT FROM platform.current_organization_id() THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='TENANT_CONTEXT_MISMATCH'; END IF;
 IF nullif(btrim(p_actor_id),'') IS NULL OR nullif(btrim(p_resolution_code),'') IS NULL OR nullif(btrim(p_note),'') IS NULL OR nullif(btrim(p_request_hash),'') IS NULL THEN
   RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='INVALID_RESOLUTION_ARGUMENT'; END IF;
 SELECT * INTO v_existing FROM platform.dead_letter_resolutions
  WHERE organization_id=p_organization_id AND dead_letter_id=p_dead_letter_id AND idempotency_key=p_idempotency_key;
 IF FOUND THEN
   IF v_existing.request_hash IS DISTINCT FROM p_request_hash THEN
     RAISE EXCEPTION USING ERRCODE='23505',MESSAGE='IDEMPOTENCY_KEY_REUSED'; END IF;
   RETURN QUERY SELECT v_existing.id,false,v_existing.dead_letter_id,'RESOLVED'::text,v_existing.resolution_code,v_existing.resolution_note,v_existing.resolved_at; RETURN;
 END IF;
 SELECT * INTO v_dlq FROM platform.dead_letter_messages
  WHERE organization_id=p_organization_id AND id=p_dead_letter_id AND status='OPEN' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='DLQ_NOT_FOUND_OR_CLOSED'; END IF;
 UPDATE platform.dead_letter_messages
 SET status='RESOLVED',resolution_code=p_resolution_code,resolution_note=p_note,resolved_at=now()
 WHERE organization_id=p_organization_id AND id=p_dead_letter_id;
 INSERT INTO platform.dead_letter_resolutions(organization_id,dead_letter_id,actor_id,resolution_code,resolution_note,idempotency_key,request_hash)
 VALUES(p_organization_id,p_dead_letter_id,p_actor_id,p_resolution_code,p_note,p_idempotency_key,p_request_hash)
 RETURNING id,platform.dead_letter_resolutions.resolved_at INTO resolution_id,resolved_at;
 created:=true; dead_letter_id:=p_dead_letter_id; status:='RESOLVED'; resolution_code:=p_resolution_code; resolution_note:=p_note; RETURN NEXT;
END; $$;

REVOKE ALL ON FUNCTION platform.claim_dead_letter_replay(uuid,uuid,text,text,uuid,boolean,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION platform.resolve_dead_letter_idempotent(uuid,uuid,text,text,text,uuid,text) FROM PUBLIC;
COMMIT;
