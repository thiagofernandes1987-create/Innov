BEGIN;

-- Remove the legacy varchar overload. PostgreSQL treats varchar and text as
-- different function signatures for CREATE OR REPLACE purposes.
DROP FUNCTION IF EXISTS platform.reserve_quota(uuid, varchar, bigint, bigint);

-- Keep one canonical, hardened signature.
CREATE OR REPLACE FUNCTION platform.reserve_quota(
  p_organization_id uuid,
  p_quota_key text,
  p_amount bigint,
  p_expected_version bigint
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, platform
AS $$
DECLARE
  v_new_usage bigint;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='INVALID_QUOTA_AMOUNT';
  END IF;
  IF p_expected_version <= 0 THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='INVALID_EXPECTED_VERSION';
  END IF;
  IF p_organization_id IS DISTINCT FROM platform.current_organization_id() THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='TENANT_CONTEXT_MISMATCH';
  END IF;

  UPDATE platform.tenant_quotas
     SET current_usage = current_usage + p_amount,
         version = version + 1,
         updated_at = now()
   WHERE organization_id = p_organization_id
     AND quota_key = p_quota_key
     AND version = p_expected_version
     AND current_usage + p_amount <= hard_limit
  RETURNING current_usage INTO v_new_usage;

  IF NOT FOUND THEN
    IF EXISTS (
      SELECT 1 FROM platform.tenant_quotas
       WHERE organization_id=p_organization_id
         AND quota_key=p_quota_key
         AND version=p_expected_version
         AND current_usage + p_amount > hard_limit
    ) THEN
      RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='QUOTA_EXCEEDED';
    END IF;
    RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='VERSION_CONFLICT';
  END IF;

  RETURN v_new_usage;
END;
$$;

REVOKE ALL ON FUNCTION platform.reserve_quota(uuid,text,bigint,bigint) FROM PUBLIC;

-- The executable release supports JSONB_HYBRID only. Keep the database aligned
-- with the API and event contracts until provisioned tables have a real runtime.
ALTER TABLE metadata.object_definitions
  DROP CONSTRAINT IF EXISTS object_definitions_storage_strategy_check;
ALTER TABLE metadata.object_definitions
  ADD CONSTRAINT object_definitions_storage_strategy_check
  CHECK (storage_strategy = 'JSONB_HYBRID');

-- Event transport tables carry organization_id and must not be readable or
-- writable across tenant context.
ALTER TABLE platform.domain_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.domain_events FORCE ROW LEVEL SECURITY;
ALTER TABLE platform.outbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.outbox_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE platform.consumer_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.consumer_inbox FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_domain_events ON platform.domain_events
USING (organization_id = platform.current_organization_id())
WITH CHECK (organization_id = platform.current_organization_id());

CREATE POLICY tenant_isolation_outbox_messages ON platform.outbox_messages
USING (organization_id = platform.current_organization_id())
WITH CHECK (organization_id = platform.current_organization_id());

CREATE POLICY tenant_isolation_consumer_inbox ON platform.consumer_inbox
USING (organization_id = platform.current_organization_id())
WITH CHECK (organization_id = platform.current_organization_id());

COMMIT;
