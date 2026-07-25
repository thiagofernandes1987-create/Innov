BEGIN;

CREATE OR REPLACE FUNCTION platform.reserve_quota(
  p_organization_id uuid,
  p_quota_key varchar,
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

CREATE OR REPLACE FUNCTION platform.compute_retry_at(
  p_attempt integer,
  p_base_seconds numeric DEFAULT 2,
  p_max_seconds numeric DEFAULT 300
) RETURNS timestamptz
LANGUAGE sql VOLATILE
AS $$
  SELECT now() + make_interval(
    secs => LEAST(p_max_seconds, power(p_base_seconds, p_attempt))
            * (0.9 + random() * 0.2)
  )
$$;

COMMIT;
