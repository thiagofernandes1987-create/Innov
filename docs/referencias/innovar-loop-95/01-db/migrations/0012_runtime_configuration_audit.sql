BEGIN;
CREATE TABLE IF NOT EXISTS runtime_configuration_audit (
 audit_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, service_name text NOT NULL,
 config_fingerprint text NOT NULL CHECK(config_fingerprint ~ '^[a-f0-9]{64}$'), deployed_revision text NOT NULL,
 observed_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE(tenant_id,service_name,deployed_revision));
ALTER TABLE runtime_configuration_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE runtime_configuration_audit FORCE ROW LEVEL SECURITY;
CREATE POLICY runtime_configuration_audit_tenant ON runtime_configuration_audit
 USING (tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid)
 WITH CHECK (tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid);
COMMIT;
