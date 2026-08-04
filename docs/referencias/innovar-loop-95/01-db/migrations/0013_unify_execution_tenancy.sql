BEGIN;

-- AUTO12 migrations 0010 and 0012 introduced tenant_id/app.tenant_id. The canonical
-- platform convention is organization_id/app.current_organization_id. This migration
-- repairs both fresh and upgraded installations without rewriting migration history.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='execution_evidence' AND column_name='tenant_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='execution_evidence' AND column_name='organization_id') THEN
    ALTER TABLE public.execution_evidence RENAME COLUMN tenant_id TO organization_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='runtime_configuration_audit' AND column_name='tenant_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='runtime_configuration_audit' AND column_name='organization_id') THEN
    ALTER TABLE public.runtime_configuration_audit RENAME COLUMN tenant_id TO organization_id;
  END IF;
END $$;

DROP POLICY IF EXISTS execution_evidence_tenant_isolation ON public.execution_evidence;
CREATE POLICY execution_evidence_organization_isolation ON public.execution_evidence
  USING (organization_id = nullif(current_setting('app.current_organization_id', true),'')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.current_organization_id', true),'')::uuid);

DROP POLICY IF EXISTS runtime_configuration_audit_tenant ON public.runtime_configuration_audit;
CREATE POLICY runtime_configuration_audit_organization_isolation ON public.runtime_configuration_audit
  USING (organization_id = nullif(current_setting('app.current_organization_id', true),'')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.current_organization_id', true),'')::uuid);

COMMENT ON COLUMN public.execution_evidence.organization_id IS 'Canonical tenant boundary; derived server-side and enforced by app.current_organization_id.';
COMMENT ON COLUMN public.runtime_configuration_audit.organization_id IS 'Canonical tenant boundary; derived server-side and enforced by app.current_organization_id.';
COMMIT;
