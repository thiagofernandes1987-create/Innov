BEGIN;

ALTER TABLE metadata.object_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE metadata.object_definitions FORCE ROW LEVEL SECURITY;
ALTER TABLE metadata.object_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE metadata.object_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE metadata.object_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE metadata.object_fields FORCE ROW LEVEL SECURITY;
ALTER TABLE metadata.records ENABLE ROW LEVEL SECURITY;
ALTER TABLE metadata.records FORCE ROW LEVEL SECURITY;
ALTER TABLE work.work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE work.work_items FORCE ROW LEVEL SECURITY;
ALTER TABLE work.work_item_user_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE work.work_item_user_state FORCE ROW LEVEL SECURITY;
ALTER TABLE platform.idempotency_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.idempotency_store FORCE ROW LEVEL SECURITY;
ALTER TABLE platform.tenant_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.tenant_quotas FORCE ROW LEVEL SECURITY;


ALTER TABLE platform.state_machine_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.state_machine_instances FORCE ROW LEVEL SECURITY;
ALTER TABLE platform.state_machine_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.state_machine_transitions FORCE ROW LEVEL SECURITY;
ALTER TABLE platform.dead_letter_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.dead_letter_messages FORCE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION platform.current_organization_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT nullif(current_setting('app.current_organization_id', true), '')::uuid
$$;

CREATE POLICY tenant_isolation_object_definitions ON metadata.object_definitions
USING (organization_id = platform.current_organization_id())
WITH CHECK (organization_id = platform.current_organization_id());

CREATE POLICY tenant_isolation_object_versions ON metadata.object_versions
USING (organization_id = platform.current_organization_id())
WITH CHECK (organization_id = platform.current_organization_id());

CREATE POLICY tenant_isolation_object_fields ON metadata.object_fields
USING (organization_id = platform.current_organization_id())
WITH CHECK (organization_id = platform.current_organization_id());

CREATE POLICY tenant_isolation_records ON metadata.records
USING (organization_id = platform.current_organization_id())
WITH CHECK (organization_id = platform.current_organization_id());

CREATE POLICY tenant_isolation_work_items ON work.work_items
USING (organization_id = platform.current_organization_id())
WITH CHECK (organization_id = platform.current_organization_id());

CREATE POLICY tenant_isolation_work_item_user_state ON work.work_item_user_state
USING (organization_id = platform.current_organization_id())
WITH CHECK (organization_id = platform.current_organization_id());

CREATE POLICY tenant_isolation_idempotency ON platform.idempotency_store
USING (organization_id = platform.current_organization_id())
WITH CHECK (organization_id = platform.current_organization_id());

CREATE POLICY tenant_isolation_quotas ON platform.tenant_quotas
USING (organization_id = platform.current_organization_id())
WITH CHECK (organization_id = platform.current_organization_id());


CREATE POLICY tenant_isolation_state_machine_instances ON platform.state_machine_instances
USING (organization_id = platform.current_organization_id())
WITH CHECK (organization_id = platform.current_organization_id());

CREATE POLICY tenant_isolation_state_machine_transitions ON platform.state_machine_transitions
USING (organization_id = platform.current_organization_id())
WITH CHECK (organization_id = platform.current_organization_id());

CREATE POLICY tenant_isolation_dead_letter_messages ON platform.dead_letter_messages
USING (organization_id = platform.current_organization_id())
WITH CHECK (organization_id = platform.current_organization_id());

COMMIT;
