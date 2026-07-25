BEGIN;

-- The runtime tables are tenant-scoped and must reference the tenant registry.
ALTER TABLE platform.state_machine_instances
  ADD CONSTRAINT state_machine_instances_org_fk
  FOREIGN KEY (organization_id) REFERENCES platform.organizations(id);

ALTER TABLE platform.state_machine_transitions
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ADD CONSTRAINT state_machine_transitions_org_fk
  FOREIGN KEY (organization_id) REFERENCES platform.organizations(id),
  ADD CONSTRAINT state_machine_transitions_instance_fk
  FOREIGN KEY (organization_id, machine_id, aggregate_id)
  REFERENCES platform.state_machine_instances(organization_id, machine_id, aggregate_id),
  ADD CONSTRAINT state_machine_transition_version_check
  CHECK (machine_version > 0 AND expected_snapshot_version > 0);

CREATE UNIQUE INDEX state_machine_transition_dedupe_idx
  ON platform.state_machine_transitions
  (organization_id, machine_id, aggregate_id, expected_snapshot_version, event_name);
CREATE INDEX state_machine_transition_history_idx
  ON platform.state_machine_transitions
  (organization_id, machine_id, aggregate_id, occurred_at DESC);

ALTER TABLE platform.dead_letter_messages
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ADD CONSTRAINT dead_letter_messages_org_fk
  FOREIGN KEY (organization_id) REFERENCES platform.organizations(id),
  DROP CONSTRAINT dead_letter_messages_consumer_name_source_event_id_key;

ALTER TABLE platform.dead_letter_messages
  ADD CONSTRAINT dead_letter_messages_tenant_dedupe_uk
  UNIQUE (organization_id, consumer_name, source_event_id),
  ADD CONSTRAINT dead_letter_resolution_check
  CHECK ((resolved_at IS NULL AND resolution_note IS NULL)
      OR (resolved_at IS NOT NULL AND resolution_note IS NOT NULL));

CREATE INDEX dead_letter_unresolved_idx
  ON platform.dead_letter_messages (organization_id, failed_at DESC)
  WHERE resolved_at IS NULL;

-- A record must reference an actual immutable object-version row, not only the definition.
ALTER TABLE metadata.records
  ADD CONSTRAINT records_object_version_fk
  FOREIGN KEY (organization_id, object_definition_id, object_version)
  REFERENCES metadata.object_versions(organization_id, object_definition_id, version);

CREATE OR REPLACE FUNCTION metadata.reject_published_object_version_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, metadata
AS $$
BEGIN
  IF OLD.state = 'PUBLISHED' THEN
    RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='PUBLISHED_VERSION_IMMUTABLE';
  END IF;
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER object_versions_published_immutable
BEFORE UPDATE OR DELETE ON metadata.object_versions
FOR EACH ROW EXECUTE FUNCTION metadata.reject_published_object_version_mutation();

COMMIT;
