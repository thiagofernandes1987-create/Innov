-- Sprint W-17 — threat model e hardening persistente.

create table if not exists public.channel_security_retention_policies (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  data_class text not null check (data_class in ('EPHEMERAL','OPERATIONAL','AUDIT')),
  retention_days integer not null check (retention_days between 1 and 3650),
  legal_hold boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (organization_id,data_class)
);

create table if not exists public.channel_sensitive_access_audit (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  resource_type text not null check (resource_type in ('SESSION_CREDENTIAL','MESSAGE_CONTENT','CONTACT_IDENTITY','MEDIA','CANONICAL_DOCUMENT','AI_CONTEXT')),
  resource_fingerprint text not null check (resource_fingerprint ~ '^[a-f0-9]{16,64}$'),
  action text not null check (action in ('READ','EXPORT','ROTATE','DELETE','RESTORE','APPROVE')),
  reason text not null check (length(reason) between 3 and 500),
  correlation_id text not null check (length(correlation_id) between 8 and 160),
  created_at timestamptz not null default now()
);

create table if not exists public.channel_security_incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  incident_type text not null check (incident_type in ('SESSION_COMPROMISE','CREDENTIAL_EXPOSURE','CROSS_TENANT_ATTEMPT','PROMPT_INJECTION','COMMAND_INJECTION','REPLAY_ATTACK')),
  severity text not null check (severity in ('LOW','MEDIUM','HIGH','CRITICAL')),
  status text not null default 'OPEN' check (status in ('OPEN','CONTAINED','ERADICATED','RECOVERED','CLOSED')),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  kill_switch_activated boolean not null default false,
  detected_at timestamptz not null default now(),
  contained_at timestamptz,
  closed_at timestamptz,
  check (not (evidence::text ~* '"(secret|token|credential|password|cookie|body|content)"'))
);

create table if not exists public.channel_critical_write_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  action text not null check (action in ('SEND_MESSAGE','DELETE_SESSION','ROTATE_MASTER_KEY','MERGE_CONTACT_IDENTITIES','CHANGE_RETENTION_POLICY','ENABLE_AUTOMATION','REGISTER_REAL_NUMBER')),
  scope_hash text not null check (scope_hash ~ '^[a-f0-9]{64}$'),
  reason text not null check (length(reason) between 3 and 500),
  approved_by uuid not null references auth.users(id) on delete restrict,
  approved_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  check (expires_at > approved_at)
);

create unique index if not exists channel_critical_write_approval_active_uidx
  on public.channel_critical_write_approvals(organization_id,action,scope_hash)
  where consumed_at is null;

create or replace function public.channel_security_immutable_event()
returns trigger language plpgsql set search_path=pg_catalog,public
as $$ begin raise exception 'SECURITY_EVENT_IMMUTABLE'; end $$;

do $$ declare relation text;
begin
  foreach relation in array array['channel_sensitive_access_audit','channel_security_incidents'] loop
    execute format('drop trigger if exists %I on public.%I',relation||'_immutable',relation);
    execute format('create trigger %I before update or delete on public.%I for each row execute function public.channel_security_immutable_event()',relation||'_immutable',relation);
  end loop;
end $$;

create or replace function public.record_channel_sensitive_access(
  p_organization_id uuid,
  p_resource_type text,
  p_resource_fingerprint text,
  p_action text,
  p_reason text,
  p_correlation_id text
)
returns public.channel_sensitive_access_audit
language plpgsql security definer set search_path=pg_catalog,public
as $$ declare result public.channel_sensitive_access_audit;
begin
  if not public.has_module_permission(p_organization_id,'whatsapp','READ',null,null) then raise exception 'SECURITY_FORBIDDEN'; end if;
  insert into public.channel_sensitive_access_audit(
    organization_id,actor_id,resource_type,resource_fingerprint,action,reason,correlation_id
  ) values (
    p_organization_id,auth.uid(),p_resource_type,lower(p_resource_fingerprint),p_action,
    left(regexp_replace(p_reason,'[[:cntrl:]]',' ','g'),500),left(p_correlation_id,160)
  ) returning * into result;
  return result;
end $$;

create or replace function public.create_channel_security_incident(
  p_organization_id uuid,
  p_incident_type text,
  p_severity text,
  p_evidence jsonb,
  p_kill_switch_activated boolean
)
returns public.channel_security_incidents
language plpgsql security definer set search_path=pg_catalog,public
as $$ declare result public.channel_security_incidents;
begin
  if not public.has_module_permission(p_organization_id,'whatsapp','EDIT',null,'manage') then raise exception 'SECURITY_FORBIDDEN'; end if;
  insert into public.channel_security_incidents(
    organization_id,incident_type,severity,evidence,kill_switch_activated
  ) values (
    p_organization_id,p_incident_type,p_severity,coalesce(p_evidence,'{}'::jsonb),p_kill_switch_activated
  ) returning * into result;
  return result;
end $$;

create or replace function public.approve_channel_critical_write(
  p_organization_id uuid,
  p_action text,
  p_scope_hash text,
  p_reason text,
  p_ttl_minutes integer default 15
)
returns public.channel_critical_write_approvals
language plpgsql security definer set search_path=pg_catalog,public
as $$ declare result public.channel_critical_write_approvals;
begin
  if not public.has_module_permission(p_organization_id,'whatsapp','DELETE',null,'manage') then raise exception 'SECURITY_APPROVER_FORBIDDEN'; end if;
  if p_ttl_minutes < 1 or p_ttl_minutes > 60 then raise exception 'SECURITY_APPROVAL_TTL_INVALID'; end if;
  insert into public.channel_critical_write_approvals(
    organization_id,action,scope_hash,reason,approved_by,expires_at
  ) values (
    p_organization_id,p_action,lower(p_scope_hash),left(regexp_replace(p_reason,'[[:cntrl:]]',' ','g'),500),
    auth.uid(),clock_timestamp()+make_interval(mins=>p_ttl_minutes)
  ) returning * into result;
  return result;
end $$;

create or replace function public.consume_channel_critical_write_approval(
  p_organization_id uuid,
  p_action text,
  p_scope_hash text
)
returns boolean
language plpgsql security definer set search_path=pg_catalog,public
as $$ begin
  update public.channel_critical_write_approvals
  set consumed_at=clock_timestamp()
  where organization_id=p_organization_id and action=p_action and scope_hash=lower(p_scope_hash)
    and consumed_at is null and expires_at > clock_timestamp();
  return found;
end $$;

alter table public.channel_security_retention_policies enable row level security;
alter table public.channel_security_retention_policies force row level security;
alter table public.channel_sensitive_access_audit enable row level security;
alter table public.channel_sensitive_access_audit force row level security;
alter table public.channel_security_incidents enable row level security;
alter table public.channel_security_incidents force row level security;
alter table public.channel_critical_write_approvals enable row level security;
alter table public.channel_critical_write_approvals force row level security;

do $$ declare relation text;
begin
  foreach relation in array array[
    'channel_security_retention_policies','channel_sensitive_access_audit',
    'channel_security_incidents','channel_critical_write_approvals'
  ] loop
    execute format('drop policy if exists %I on public.%I',relation||'_read',relation);
    execute format('create policy %I on public.%I for select to authenticated using (public.has_module_permission(organization_id,''whatsapp'',''READ'',null,null))',relation||'_read',relation);
    execute format('revoke all on public.%I from anon,authenticated',relation);
    execute format('grant select on public.%I to authenticated',relation);
  end loop;
end $$;

revoke all on function public.record_channel_sensitive_access(uuid,text,text,text,text,text) from public,anon;
revoke all on function public.create_channel_security_incident(uuid,text,text,jsonb,boolean) from public,anon;
revoke all on function public.approve_channel_critical_write(uuid,text,text,text,integer) from public,anon;
revoke all on function public.consume_channel_critical_write_approval(uuid,text,text) from public,anon;
grant execute on function public.record_channel_sensitive_access(uuid,text,text,text,text,text) to authenticated,service_role;
grant execute on function public.create_channel_security_incident(uuid,text,text,jsonb,boolean) to authenticated,service_role;
grant execute on function public.approve_channel_critical_write(uuid,text,text,text,integer) to authenticated,service_role;
grant execute on function public.consume_channel_critical_write_approval(uuid,text,text) to authenticated,service_role;
