-- Etapa 19 — Auditoria e observabilidade: schema transversal.
begin;

alter table public.audit_events
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists module_key text,
  add column if not exists severity text not null default 'INFO',
  add column if not exists source text not null default 'APPLICATION',
  add column if not exists actor_type text not null default 'INTERNAL',
  add column if not exists message text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists request_id text,
  add column if not exists deduplication_key text,
  add column if not exists ip_sha256 text,
  add column if not exists user_agent_sha256 text,
  add column if not exists occurred_at timestamptz not null default now(),
  add column if not exists retention_until timestamptz;

alter table public.audit_events drop constraint if exists audit_events_severity_check;
alter table public.audit_events add constraint audit_events_severity_check check (severity in ('INFO','WARNING','ERROR','CRITICAL'));
alter table public.audit_events drop constraint if exists audit_events_source_check;
alter table public.audit_events add constraint audit_events_source_check check (source in ('APPLICATION','DATABASE','WORKER','INTEGRATION','SECURITY','HEALTH'));
alter table public.audit_events drop constraint if exists audit_events_actor_type_check;
alter table public.audit_events add constraint audit_events_actor_type_check check (actor_type in ('INTERNAL','CLIENT','SYSTEM','INTEGRATION'));
alter table public.audit_events drop constraint if exists audit_events_ip_sha256_check;
alter table public.audit_events add constraint audit_events_ip_sha256_check check (ip_sha256 is null or ip_sha256 ~ '^[a-f0-9]{64}$');
alter table public.audit_events drop constraint if exists audit_events_user_agent_sha256_check;
alter table public.audit_events add constraint audit_events_user_agent_sha256_check check (user_agent_sha256 is null or user_agent_sha256 ~ '^[a-f0-9]{64}$');

create table if not exists public.observability_alert_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  module_key text,
  event_type_pattern text,
  minimum_severity text not null default 'ERROR' check (minimum_severity in ('INFO','WARNING','ERROR','CRITICAL')),
  threshold_count integer not null default 1 check (threshold_count > 0),
  window_minutes integer not null default 15 check (window_minutes > 0),
  cooldown_minutes integer not null default 30 check (cooldown_minutes >= 0),
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,name)
);

create table if not exists public.observability_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rule_id uuid references public.observability_alert_rules(id) on delete set null,
  audit_event_id uuid references public.audit_events(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  module_key text,
  severity text not null check (severity in ('INFO','WARNING','ERROR','CRITICAL')),
  title text not null,
  message text not null,
  status text not null default 'OPEN' check (status in ('OPEN','ACKNOWLEDGED','RESOLVED','SUPPRESSED')),
  occurrence_count integer not null default 1 check (occurrence_count > 0),
  first_occurred_at timestamptz not null default now(),
  last_occurred_at timestamptz not null default now(),
  acknowledged_by uuid references auth.users(id),
  acknowledged_at timestamptz,
  acknowledgement_reason text,
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  resolution_reason text,
  correlation_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.observability_health_checks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  check_key text not null,
  component text not null,
  status text not null check (status in ('HEALTHY','DEGRADED','UNHEALTHY','UNKNOWN')),
  message text not null default '',
  details jsonb not null default '{}'::jsonb,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  source text not null default 'DATABASE',
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.observability_diagnostics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  diagnostic_type text not null check (diagnostic_type in ('UNINDEXED_FK','RLS_INITPLAN','MULTIPLE_PERMISSIVE_POLICIES','FUNCTION_PRIVILEGE','MIGRATION_LEDGER','OTHER')),
  severity text not null default 'WARNING' check (severity in ('INFO','WARNING','ERROR','CRITICAL')),
  object_schema text not null default 'public',
  object_name text not null,
  code text not null,
  message text not null,
  details jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_note text,
  unique (organization_id,diagnostic_type,object_schema,object_name,code)
);

create table if not exists public.observability_retention_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_table text not null,
  retention_days integer not null check (retention_days between 30 and 3650),
  preserve_critical boolean not null default true,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,source_table)
);

create trigger touch_observability_alert_rules before update on public.observability_alert_rules for each row execute function public.touch_updated_at();
create trigger touch_observability_alerts before update on public.observability_alerts for each row execute function public.touch_updated_at();
create trigger touch_observability_retention_policies before update on public.observability_retention_policies for each row execute function public.touch_updated_at();

commit;
