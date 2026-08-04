-- Sprint W-20 — homologação controlada; execução real permanece bloqueada.

create table if not exists public.channel_homologation_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  decision text not null check (decision in ('BLOCKED_NOT_EXECUTED','READY_FOR_AUTHORIZED_EXECUTION')),
  checks jsonb not null check (jsonb_typeof(checks)='array'),
  blockers jsonb not null check (jsonb_typeof(blockers)='array'),
  campaigns_blocked boolean not null default true check (campaigns_blocked),
  ai_autonomous_disabled boolean not null default true check (ai_autonomous_disabled),
  real_number_used boolean not null default false check (not real_number_used),
  dedicated_real_organization_used boolean not null default false check (not dedicated_real_organization_used),
  real_users_used boolean not null default false check (not real_users_used),
  qr_or_pairing_used boolean not null default false check (not qr_or_pairing_used),
  external_connection_used boolean not null default false check (not external_connection_used),
  production_authorized boolean not null default false check (not production_authorized),
  commit_sha text not null check (commit_sha ~ '^[a-f0-9]{40}$'),
  assessed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (decision <> 'READY_FOR_AUTHORIZED_EXECUTION' or jsonb_array_length(blockers)=0),
  check (not (checks::text ~* '"(secret|token|credential|password|phone_number|body|content)"'))
);

create index if not exists channel_homologation_assessments_lookup_idx
  on public.channel_homologation_assessments(organization_id,created_at desc);

create table if not exists public.channel_homologation_rehearsals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rehearsal_type text not null check (rehearsal_type in ('SESSION_PURGE','HUMAN_HANDOFF','INCIDENT_REGISTRATION','DAILY_OPERATION')),
  status text not null check (status in ('PASSED_SYNTHETIC','FAILED_SYNTHETIC')),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  real_execution boolean not null default false check (not real_execution),
  created_at timestamptz not null default now(),
  check (not (evidence::text ~* '"(secret|token|credential|password|phone|body|content)"'))
);

create or replace function public.record_channel_homologation_assessment(
  p_organization_id uuid,
  p_decision text,
  p_checks jsonb,
  p_blockers jsonb,
  p_commit_sha text
)
returns public.channel_homologation_assessments
language plpgsql security definer set search_path=pg_catalog,public
as $$ declare result public.channel_homologation_assessments;
begin
  if not public.has_module_permission(p_organization_id,'whatsapp','EDIT',null,'manage') then raise exception 'HOMOLOGATION_FORBIDDEN'; end if;
  if p_decision='READY_FOR_AUTHORIZED_EXECUTION' then raise exception 'REAL_HOMOLOGATION_EVIDENCE_REQUIRED'; end if;
  insert into public.channel_homologation_assessments(
    organization_id,decision,checks,blockers,commit_sha,assessed_by
  ) values (
    p_organization_id,'BLOCKED_NOT_EXECUTED',coalesce(p_checks,'[]'::jsonb),coalesce(p_blockers,'[]'::jsonb),lower(p_commit_sha),auth.uid()
  ) returning * into result;
  return result;
end $$;

create or replace function public.record_channel_homologation_rehearsal(
  p_organization_id uuid,
  p_rehearsal_type text,
  p_status text,
  p_evidence jsonb
)
returns public.channel_homologation_rehearsals
language plpgsql security definer set search_path=pg_catalog,public
as $$ declare result public.channel_homologation_rehearsals;
begin
  if not public.has_module_permission(p_organization_id,'whatsapp','EDIT',null,'manage') then raise exception 'HOMOLOGATION_FORBIDDEN'; end if;
  insert into public.channel_homologation_rehearsals(
    organization_id,rehearsal_type,status,evidence,real_execution
  ) values (
    p_organization_id,p_rehearsal_type,p_status,coalesce(p_evidence,'{}'::jsonb),false
  ) returning * into result;
  return result;
end $$;

create or replace function public.channel_homologation_evidence_immutable()
returns trigger language plpgsql set search_path=pg_catalog,public
as $$ begin raise exception 'HOMOLOGATION_EVIDENCE_IMMUTABLE'; end $$;

do $$ declare relation text;
begin
  foreach relation in array array['channel_homologation_assessments','channel_homologation_rehearsals'] loop
    execute format('drop trigger if exists %I on public.%I',relation||'_immutable',relation);
    execute format('create trigger %I before update or delete on public.%I for each row execute function public.channel_homologation_evidence_immutable()',relation||'_immutable',relation);
    execute format('alter table public.%I enable row level security',relation);
    execute format('alter table public.%I force row level security',relation);
    execute format('drop policy if exists %I on public.%I',relation||'_read',relation);
    execute format('create policy %I on public.%I for select to authenticated using (public.has_module_permission(organization_id,''whatsapp'',''READ'',null,null))',relation||'_read',relation);
    execute format('revoke all on public.%I from anon,authenticated',relation);
    execute format('grant select on public.%I to authenticated',relation);
  end loop;
end $$;

revoke all on function public.record_channel_homologation_assessment(uuid,text,jsonb,jsonb,text) from public,anon;
revoke all on function public.record_channel_homologation_rehearsal(uuid,text,text,jsonb) from public,anon;
grant execute on function public.record_channel_homologation_assessment(uuid,text,jsonb,jsonb,text) to authenticated,service_role;
grant execute on function public.record_channel_homologation_rehearsal(uuid,text,text,jsonb) to authenticated,service_role;
