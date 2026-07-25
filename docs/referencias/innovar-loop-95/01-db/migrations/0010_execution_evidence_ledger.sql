BEGIN;
CREATE TABLE IF NOT EXISTS execution_evidence (
 evidence_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL,
 campaign_id text NOT NULL, gate_key text NOT NULL,
 status text NOT NULL CHECK(status IN ('PASS','FAIL','BLOCKED')),
 artifact_sha256 text CHECK(artifact_sha256 IS NULL OR artifact_sha256 ~ '^[a-f0-9]{64}$'),
 command_line text, tool_versions jsonb NOT NULL DEFAULT '{}'::jsonb,
 observed_at timestamptz NOT NULL DEFAULT clock_timestamp(), metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE execution_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_evidence FORCE ROW LEVEL SECURITY;
CREATE POLICY execution_evidence_tenant_isolation ON execution_evidence
 USING (tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid)
 WITH CHECK (tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid);
CREATE OR REPLACE FUNCTION reject_execution_evidence_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'execution evidence is append-only' USING ERRCODE='55000'; END $$;
CREATE TRIGGER trg_execution_evidence_immutable BEFORE UPDATE OR DELETE ON execution_evidence
FOR EACH ROW EXECUTE FUNCTION reject_execution_evidence_mutation();
COMMIT;
