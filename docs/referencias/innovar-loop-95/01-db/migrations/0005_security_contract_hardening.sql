BEGIN;

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
    IF EXISTS (SELECT 1 FROM platform.tenant_quotas
      WHERE organization_id=p_organization_id AND quota_key=p_quota_key
        AND version=p_expected_version AND current_usage + p_amount > hard_limit) THEN
      RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='QUOTA_EXCEEDED';
    END IF;
    RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='VERSION_CONFLICT';
  END IF;
  RETURN v_new_usage;
END;
$$;

REVOKE ALL ON FUNCTION platform.reserve_quota(uuid,text,bigint,bigint) FROM PUBLIC;

COMMIT;
