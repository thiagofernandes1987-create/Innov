BEGIN;

CREATE TABLE IF NOT EXISTS platform.dead_letter_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  dead_letter_id uuid NOT NULL REFERENCES platform.dead_letter_messages(id),
  actor_id text NOT NULL,
  resolution_code text NOT NULL,
  resolution_note text NOT NULL,
  idempotency_key uuid NOT NULL,
  resolved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, idempotency_key)
);
ALTER TABLE platform.dead_letter_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.dead_letter_resolutions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dead_letter_resolutions_tenant_isolation ON platform.dead_letter_resolutions;
CREATE POLICY dead_letter_resolutions_tenant_isolation ON platform.dead_letter_resolutions
 USING (organization_id=platform.current_organization_id())
 WITH CHECK (organization_id=platform.current_organization_id());

CREATE OR REPLACE FUNCTION platform.resolve_dead_letter_idempotent(
 p_organization_id uuid,p_dead_letter_id uuid,p_actor_id text,p_resolution_code text,p_note text,p_idempotency_key uuid
) RETURNS TABLE(resolution_id uuid,created boolean,dead_letter_id uuid,status text,resolution_code text,resolution_note text,resolved_at timestamptz)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,platform AS $$
DECLARE v_existing platform.dead_letter_resolutions; v_dlq platform.dead_letter_messages;
BEGIN
 IF p_organization_id IS DISTINCT FROM platform.current_organization_id() THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='TENANT_CONTEXT_MISMATCH'; END IF;
 IF nullif(btrim(p_actor_id),'') IS NULL OR nullif(btrim(p_resolution_code),'') IS NULL OR nullif(btrim(p_note),'') IS NULL THEN
   RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='INVALID_RESOLUTION_ARGUMENT'; END IF;
 SELECT * INTO v_existing FROM platform.dead_letter_resolutions
  WHERE organization_id=p_organization_id AND idempotency_key=p_idempotency_key;
 IF FOUND THEN
   RETURN QUERY SELECT v_existing.id,false,v_existing.dead_letter_id,'RESOLVED'::text,v_existing.resolution_code,v_existing.resolution_note,v_existing.resolved_at; RETURN;
 END IF;
 SELECT * INTO v_dlq FROM platform.dead_letter_messages
  WHERE organization_id=p_organization_id AND id=p_dead_letter_id AND status='OPEN' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='DLQ_NOT_FOUND_OR_CLOSED'; END IF;
 UPDATE platform.dead_letter_messages SET status='RESOLVED',resolution_code=p_resolution_code,resolution_note=p_note,resolved_at=now()
  WHERE organization_id=p_organization_id AND id=p_dead_letter_id;
 INSERT INTO platform.dead_letter_resolutions(organization_id,dead_letter_id,actor_id,resolution_code,resolution_note,idempotency_key)
 VALUES(p_organization_id,p_dead_letter_id,p_actor_id,p_resolution_code,p_note,p_idempotency_key) RETURNING id,platform.dead_letter_resolutions.resolved_at INTO resolution_id,resolved_at;
 created:=true; dead_letter_id:=p_dead_letter_id; status:='RESOLVED'; resolution_code:=p_resolution_code; resolution_note:=p_note; RETURN NEXT;
END; $$;

REVOKE ALL ON FUNCTION platform.resolve_dead_letter_idempotent(uuid,uuid,text,text,text,uuid) FROM PUBLIC;
COMMIT;
