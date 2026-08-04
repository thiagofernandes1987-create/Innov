BEGIN;

CREATE SCHEMA IF NOT EXISTS platform;

CREATE TABLE IF NOT EXISTS platform.state_machine_instances (
  organization_id uuid NOT NULL,
  machine_id text NOT NULL,
  aggregate_id uuid NOT NULL,
  machine_version integer NOT NULL CHECK (machine_version > 0),
  state text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  snapshot_version bigint NOT NULL DEFAULT 1 CHECK (snapshot_version > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, machine_id, aggregate_id)
);

CREATE TABLE IF NOT EXISTS platform.state_machine_transitions (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  machine_id text NOT NULL,
  aggregate_id uuid NOT NULL,
  machine_version integer NOT NULL,
  from_state text NOT NULL,
  event_name text NOT NULL,
  to_state text NOT NULL,
  expected_snapshot_version bigint NOT NULL,
  actor_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.dead_letter_messages (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  source_event_id uuid NOT NULL,
  consumer_name text NOT NULL,
  event_type text NOT NULL,
  event_version integer NOT NULL,
  payload jsonb NOT NULL,
  headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempts integer NOT NULL CHECK (attempts > 0),
  last_error text NOT NULL,
  failed_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolution_note text,
  UNIQUE (consumer_name, source_event_id)
);

ALTER TABLE platform.state_machine_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.state_machine_instances FORCE ROW LEVEL SECURITY;
ALTER TABLE platform.state_machine_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.state_machine_transitions FORCE ROW LEVEL SECURITY;
ALTER TABLE platform.dead_letter_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.dead_letter_messages FORCE ROW LEVEL SECURITY;

COMMIT;
