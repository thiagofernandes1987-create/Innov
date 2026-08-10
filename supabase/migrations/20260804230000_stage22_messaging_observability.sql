-- Sprint W-18 — observabilidade e operação.

create table if not exists public.channel_runtime_observations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider_type text not null,
  provider_account_id text,
  session_state text not null check (session_state in ('DISCONNECTED','CONNECTING','CONNECTED','RECONNECTING','DEGRADED','ACTION_REQUIRED')),
  reconnects_window integer not null default 0 check (reconnects_window >= 0),
  ingress_rate numeric(14,4) not null default 0 check (ingress_rate >= 0),
  egress_rate numeric(14,4) not null default 0 check (egress_rate >= 0),
  retry_rate numeric(14,6) not null default 0 check (retry_rate >= 0),
  dlq_depth integer not null default 0 check (dlq_depth >= 0),
  media_quarantine_depth integer not null default 0 check (media_quarantine_depth >= 0),
  lease_conflicts_window integer not null default 0 check (lease_conflicts_window >= 0),
  key_persistence_failures_window integer not null default 0 check (key_persistence_failures_window >= 0),
  ai_invocations_window integer not null default 0 check (ai_invocations_window >= 0),
  ai_tokens_window bigint not null default 0 check (ai_tokens_window >= 0),
  ai_cost_micros_window bigint not null default 0 check (ai_cost_micros_window >= 0),
  observed_at timestamptz not null default now()
);

create index if not exists channel_runtime_observations_lookup_idx
  on public.channel_runtime_observations(organization_id,provider_type,observed_at desc);

create table if not exists public.channel_operational_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider_type text not null,
  provider_account_id text,
  alert_code text not null check (alert_code in ('RECONNECT_LOOP','DLQ_GROWTH','LEASE_CONFLICT','KEY_PERSISTENCE_FAILURE')),
  severity text not null check (severity in ('WARNING','CRITICAL')),
  status text not null default 'OPEN' check (status in ('OPEN','ACKNOWLEDGED','RESOLVED')),
  summary text not null check (length(summary) between 3 and 500),
  observed_value numeric not null,
  threshold_value numeric not null,
  runbook text not null check (runbook in ('RUNBOOK-DESCONEXAO-W18.md','RUNBOOK-UPGRADE-BAILEYS-W18.md','RUNBOOK-ROLLBACK-W18.md')),
  correlation_id text not null check (length(correlation_id) between 8 and 160),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  acknowledged_by uuid references auth.users(id) on delete set null,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  check ((status='ACKNOWLEDGED') = (acknowledged_at is not null) or status <> 'ACKNOWLEDGED'),
  check ((status='RESOLVED') = (resolved_at is not null))
);

create unique index if not exists channel_operational_alert_open_uidx
  on public.channel_operational_alerts(organization_id,provider_type,coalesce(provider_account_id,''),alert_code)
  where status in ('OPEN','ACKNOWLEDGED');

create or replace function public.record_channel_runtime_observation(
  p_organization_id uuid,
  p_provider_type text,
  p_provider_account_id text,
  p_session_state text,
  p_reconnects_window integer,
  p_ingress_rate numeric,
  p_egress_rate numeric,
  p_retry_rate numeric,
  p_dlq_depth integer,
  p_media_quarantine_depth integer,
  p_lease_conflicts_window integer,
  p_key_persistence_failures_window integer,
  p_ai_invocations_window integer,
  p_ai_tokens_window bigint,
  p_ai_cost_micros_window bigint
)
returns public.channel_runtime_observations
language plpgsql security definer set search_path=pg_catalog,public
as $$ declare result public.channel_runtime_observations;
begin
  if not public.has_module_permission(p_organization_id,'whatsapp','EDIT',null,'administer') then raise exception 'OBSERVABILITY_FORBIDDEN'; end if;
  insert into public.channel_runtime_observations(
    organization_id,provider_type,provider_account_id,session_state,reconnects_window,
    ingress_rate,egress_rate,retry_rate,dlq_depth,media_quarantine_depth,
    lease_conflicts_window,key_persistence_failures_window,ai_invocations_window,
    ai_tokens_window,ai_cost_micros_window
  ) values (
    p_organization_id,left(p_provider_type,80),nullif(left(p_provider_account_id,160),''),p_session_state,p_reconnects_window,
    p_ingress_rate,p_egress_rate,p_retry_rate,p_dlq_depth,p_media_quarantine_depth,
    p_lease_conflicts_window,p_key_persistence_failures_window,p_ai_invocations_window,
    p_ai_tokens_window,p_ai_cost_micros_window
  ) returning * into result;
  return result;
end $$;

create or replace function public.upsert_channel_operational_alert(
  p_organization_id uuid,
  p_provider_type text,
  p_provider_account_id text,
  p_alert_code text,
  p_severity text,
  p_summary text,
  p_observed_value numeric,
  p_threshold_value numeric,
  p_runbook text,
  p_correlation_id text
)
returns public.channel_operational_alerts
language plpgsql security definer set search_path=pg_catalog,public
as $$ declare result public.channel_operational_alerts;
begin
  if not public.has_module_permission(p_organization_id,'whatsapp','EDIT',null,'administer') then raise exception 'OBSERVABILITY_FORBIDDEN'; end if;
  insert into public.channel_operational_alerts(
    organization_id,provider_type,provider_account_id,alert_code,severity,summary,
    observed_value,threshold_value,runbook,correlation_id
  ) values (
    p_organization_id,left(p_provider_type,80),nullif(left(p_provider_account_id,160),''),p_alert_code,p_severity,
    left(regexp_replace(p_summary,'[[:cntrl:]]',' ','g'),500),p_observed_value,p_threshold_value,p_runbook,left(p_correlation_id,160)
  )
  on conflict (organization_id,provider_type,coalesce(provider_account_id,''),alert_code)
    where status in ('OPEN','ACKNOWLEDGED')
  do update set severity=excluded.severity,summary=excluded.summary,observed_value=excluded.observed_value,
    threshold_value=excluded.threshold_value,runbook=excluded.runbook,correlation_id=excluded.correlation_id,
    last_seen_at=clock_timestamp()
  returning * into result;
  return result;
end $$;

create or replace function public.acknowledge_channel_operational_alert(
  p_organization_id uuid,
  p_alert_id uuid
)
returns public.channel_operational_alerts
language plpgsql security definer set search_path=pg_catalog,public
as $$ declare result public.channel_operational_alerts;
begin
  if not public.has_module_permission(p_organization_id,'whatsapp','EDIT',null,'administer') then raise exception 'OBSERVABILITY_FORBIDDEN'; end if;
  update public.channel_operational_alerts
  set status='ACKNOWLEDGED',acknowledged_by=auth.uid(),acknowledged_at=clock_timestamp()
  where id=p_alert_id and organization_id=p_organization_id and status='OPEN'
  returning * into result;
  if result.id is null then raise exception 'ALERT_NOT_OPEN'; end if;
  return result;
end $$;

create or replace function public.resolve_channel_operational_alert(
  p_organization_id uuid,
  p_alert_id uuid
)
returns public.channel_operational_alerts
language plpgsql security definer set search_path=pg_catalog,public
as $$ declare result public.channel_operational_alerts;
begin
  if not public.has_module_permission(p_organization_id,'whatsapp','EDIT',null,'administer') then raise exception 'OBSERVABILITY_FORBIDDEN'; end if;
  update public.channel_operational_alerts
  set status='RESOLVED',resolved_at=clock_timestamp()
  where id=p_alert_id and organization_id=p_organization_id and status in ('OPEN','ACKNOWLEDGED')
  returning * into result;
  if result.id is null then raise exception 'ALERT_NOT_ACTIVE'; end if;
  return result;
end $$;

create or replace function public.channel_runtime_observation_immutable()
returns trigger language plpgsql set search_path=pg_catalog,public
as $$ begin raise exception 'RUNTIME_OBSERVATION_IMMUTABLE'; end $$;

drop trigger if exists channel_runtime_observations_immutable on public.channel_runtime_observations;
create trigger channel_runtime_observations_immutable before update or delete on public.channel_runtime_observations
for each row execute function public.channel_runtime_observation_immutable();

alter table public.channel_runtime_observations enable row level security;
alter table public.channel_runtime_observations force row level security;
alter table public.channel_operational_alerts enable row level security;
alter table public.channel_operational_alerts force row level security;

do $$ declare relation text;
begin
  foreach relation in array array['channel_runtime_observations','channel_operational_alerts'] loop
    execute format('drop policy if exists %I on public.%I',relation||'_read',relation);
    execute format('create policy %I on public.%I for select to authenticated using (public.has_module_permission(organization_id,''whatsapp'',''READ'',null,null))',relation||'_read',relation);
    execute format('revoke all on public.%I from anon,authenticated',relation);
    execute format('grant select on public.%I to authenticated',relation);
  end loop;
end $$;

revoke all on function public.record_channel_runtime_observation(uuid,text,text,text,integer,numeric,numeric,numeric,integer,integer,integer,integer,integer,bigint,bigint) from public,anon;
revoke all on function public.upsert_channel_operational_alert(uuid,text,text,text,text,text,numeric,numeric,text,text) from public,anon;
revoke all on function public.acknowledge_channel_operational_alert(uuid,uuid) from public,anon;
revoke all on function public.resolve_channel_operational_alert(uuid,uuid) from public,anon;
grant execute on function public.record_channel_runtime_observation(uuid,text,text,text,integer,numeric,numeric,numeric,integer,integer,integer,integer,integer,bigint,bigint) to authenticated,service_role;
grant execute on function public.upsert_channel_operational_alert(uuid,text,text,text,text,text,numeric,numeric,text,text) to authenticated,service_role;
grant execute on function public.acknowledge_channel_operational_alert(uuid,uuid) to authenticated,service_role;
grant execute on function public.resolve_channel_operational_alert(uuid,uuid) to authenticated,service_role;
