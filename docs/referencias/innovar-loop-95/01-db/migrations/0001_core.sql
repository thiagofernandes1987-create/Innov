BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS platform;
CREATE SCHEMA IF NOT EXISTS metadata;
CREATE SCHEMA IF NOT EXISTS work;

CREATE TYPE platform.lifecycle_state AS ENUM ('ACTIVE','SUSPENDED','ARCHIVED');
CREATE TYPE metadata.definition_state AS ENUM ('DRAFT','IN_REVIEW','PUBLISHED','DEPRECATED','ARCHIVED');
CREATE TYPE platform.operation_status AS ENUM ('IN_PROGRESS','SUCCEEDED','FAILED');
CREATE TYPE work.item_kind AS ENUM ('TASK','ACTIVITY','APPROVAL','APPOINTMENT','ALERT');

CREATE TABLE platform.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(80) NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  legal_name varchar(200) NOT NULL,
  default_locale varchar(10) NOT NULL DEFAULT 'pt-BR',
  default_timezone varchar(64) NOT NULL DEFAULT 'America/Sao_Paulo',
  default_currency char(3) NOT NULL DEFAULT 'BRL',
  lifecycle_state platform.lifecycle_state NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE platform.idempotency_store (
  organization_id uuid NOT NULL REFERENCES platform.organizations(id),
  idempotency_key uuid NOT NULL,
  operation_scope varchar(120) NOT NULL,
  request_hash char(64) NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  status platform.operation_status NOT NULL,
  response_status integer,
  response_headers jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(response_headers)='object'),
  response_body jsonb,
  locked_until timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  PRIMARY KEY (organization_id, operation_scope, idempotency_key)
);
CREATE INDEX idempotency_store_expiry_brin ON platform.idempotency_store USING brin (expires_at);

CREATE TABLE platform.domain_events (
  organization_id uuid NOT NULL REFERENCES platform.organizations(id),
  event_id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_type varchar(180) NOT NULL,
  event_version integer NOT NULL CHECK (event_version > 0),
  aggregate_type varchar(120) NOT NULL,
  aggregate_id uuid NOT NULL,
  aggregate_version bigint NOT NULL CHECK (aggregate_version > 0),
  actor_id uuid,
  actor_type varchar(40) NOT NULL,
  occurred_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  correlation_id uuid NOT NULL,
  causation_id uuid,
  request_id uuid NOT NULL,
  idempotency_key uuid,
  producer varchar(120) NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object'),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata)='object'),
  pii_classification varchar(32) NOT NULL DEFAULT 'INTERNAL',
  retention_class varchar(32) NOT NULL DEFAULT 'OPERATIONAL',
  PRIMARY KEY (organization_id, event_id)
) PARTITION BY RANGE (recorded_at);

CREATE TABLE platform.domain_events_default
  PARTITION OF platform.domain_events DEFAULT;
CREATE INDEX domain_events_aggregate_idx ON platform.domain_events_default
  (organization_id, aggregate_type, aggregate_id, aggregate_version);
CREATE INDEX domain_events_type_time_idx ON platform.domain_events_default
  (organization_id, event_type, recorded_at DESC);
CREATE INDEX domain_events_recorded_brin ON platform.domain_events_default USING brin(recorded_at);

CREATE TABLE platform.outbox_messages (
  organization_id uuid NOT NULL REFERENCES platform.organizations(id),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  topic varchar(180) NOT NULL,
  partition_key varchar(200) NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object'),
  headers jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(headers)='object'),
  available_at timestamptz NOT NULL DEFAULT now(),
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts smallint NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 20),
  locked_by varchar(120),
  locked_until timestamptz,
  published_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, id),
  UNIQUE (organization_id, event_id)
);
CREATE INDEX outbox_pending_idx ON platform.outbox_messages
  (available_at, created_at) WHERE published_at IS NULL;

CREATE TABLE platform.consumer_inbox (
  organization_id uuid NOT NULL REFERENCES platform.organizations(id),
  consumer_name varchar(120) NOT NULL,
  event_id uuid NOT NULL,
  event_version integer NOT NULL,
  status platform.operation_status NOT NULL DEFAULT 'IN_PROGRESS',
  attempts smallint NOT NULL DEFAULT 1,
  result_hash char(64),
  processed_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, consumer_name, event_id)
);

CREATE TABLE platform.tenant_quotas (
  organization_id uuid NOT NULL REFERENCES platform.organizations(id),
  quota_key varchar(120) NOT NULL,
  hard_limit bigint NOT NULL CHECK (hard_limit >= 0),
  current_usage bigint NOT NULL DEFAULT 0 CHECK (current_usage >= 0),
  version bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, quota_key)
);

CREATE TABLE metadata.object_definitions (
  organization_id uuid NOT NULL REFERENCES platform.organizations(id),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  object_key varchar(120) NOT NULL CHECK (object_key ~ '^[a-z][a-z0-9_]{2,119}$'),
  namespace varchar(80) NOT NULL CHECK (namespace ~ '^[a-z][a-z0-9_.-]{1,79}$'),
  singular_name varchar(120) NOT NULL,
  plural_name varchar(120) NOT NULL,
  storage_strategy varchar(32) NOT NULL DEFAULT 'JSONB_HYBRID'
    CHECK (storage_strategy IN ('JSONB_HYBRID','PROVISIONED_TABLE')),
  lifecycle_state metadata.definition_state NOT NULL DEFAULT 'DRAFT',
  audit_class varchar(32) NOT NULL DEFAULT 'STANDARD',
  retention_class varchar(32) NOT NULL DEFAULT 'OPERATIONAL',
  api_exposure boolean NOT NULL DEFAULT false,
  search_exposure boolean NOT NULL DEFAULT false,
  version bigint NOT NULL DEFAULT 1,
  published_version integer,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, id),
  UNIQUE (organization_id, namespace, object_key)
);

CREATE TABLE metadata.object_versions (
  organization_id uuid NOT NULL,
  object_definition_id uuid NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  state metadata.definition_state NOT NULL,
  schema_document jsonb NOT NULL CHECK (jsonb_typeof(schema_document)='object'),
  schema_hash char(64) NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  PRIMARY KEY (organization_id, object_definition_id, version),
  FOREIGN KEY (organization_id, object_definition_id)
    REFERENCES metadata.object_definitions(organization_id, id)
);

CREATE TABLE metadata.object_fields (
  organization_id uuid NOT NULL,
  object_definition_id uuid NOT NULL,
  field_key varchar(120) NOT NULL CHECK (field_key ~ '^[a-z][a-z0-9_]{1,119}$'),
  field_type varchar(40) NOT NULL,
  position integer NOT NULL DEFAULT 0,
  required boolean NOT NULL DEFAULT false,
  immutable boolean NOT NULL DEFAULT false,
  searchable boolean NOT NULL DEFAULT false,
  filterable boolean NOT NULL DEFAULT false,
  sortable boolean NOT NULL DEFAULT false,
  sensitive boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(config)='object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, object_definition_id, field_key),
  FOREIGN KEY (organization_id, object_definition_id)
    REFERENCES metadata.object_definitions(organization_id, id)
);

CREATE TABLE metadata.records (
  organization_id uuid NOT NULL REFERENCES platform.organizations(id),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  object_definition_id uuid NOT NULL,
  object_version integer NOT NULL,
  record_status varchar(40) NOT NULL DEFAULT 'ACTIVE',
  values jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(values)='object'),
  version bigint NOT NULL DEFAULT 1,
  created_by uuid NOT NULL,
  updated_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  PRIMARY KEY (organization_id, id),
  FOREIGN KEY (organization_id, object_definition_id)
    REFERENCES metadata.object_definitions(organization_id, id)
);
CREATE INDEX metadata_records_object_idx ON metadata.records
  (organization_id, object_definition_id, created_at DESC);
CREATE INDEX metadata_records_values_gin ON metadata.records USING gin(values jsonb_path_ops);

CREATE TABLE work.work_items (
  organization_id uuid NOT NULL REFERENCES platform.organizations(id),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_resource_id uuid NOT NULL,
  source_kind work.item_kind NOT NULL,
  source_state_version bigint NOT NULL,
  title varchar(240) NOT NULL,
  due_at timestamptz,
  priority smallint NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  responsible_user_id uuid,
  team_id uuid,
  project_id uuid,
  client_id uuid,
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, id),
  UNIQUE (organization_id, source_resource_id, source_kind)
);

CREATE TABLE work.work_item_user_state (
  organization_id uuid NOT NULL,
  work_item_id uuid NOT NULL,
  user_id uuid NOT NULL,
  seen_at timestamptz,
  pinned_at timestamptz,
  snoozed_until timestamptz,
  hidden_at timestamptz,
  personal_priority smallint CHECK (personal_priority BETWEEN 1 AND 5),
  PRIMARY KEY (organization_id, work_item_id, user_id),
  FOREIGN KEY (organization_id, work_item_id)
    REFERENCES work.work_items(organization_id, id)
);

COMMIT;
