-- Sprint W-21 — piloto limitado; execução real permanece bloqueada.

create table if not exists public.channel_pilot_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(name) between 3 and 160),
  status text not null default 'HOLD' check (status in ('DRAFT','HOLD','NO_GO')),
  maximum_team_members integer not null check (maximum_team_members between 1 and 5),
  maximum_conversations integer not null check (maximum_conversations between 1 and 20),
  maximum_daily_messages integer not null check (maximum_daily_messages between 1 and 100),
  timezone text not null default 'America/Sao_Paulo',
  start_hour integer not null check (start_hour between 0 and 23),
  end_hour integer not null check (end_hour between 1 and 24 and end_hour > start_hour),
  weekdays integer[] not null check (cardinality(weekdays) between 1 and 7),
  campaigns_enabled boolean not null default false check (not campaigns_enabled),
  ai_mode text not null default 'DRAFT_ONLY' check (ai_mode='DRAFT_ONLY'),
  organization_feature_enabled boolean not null default false,
  session_feature_enabled boolean not null default false,
  kill_switch boolean not null default false,
  real_team_selected boolean not null default false check (not real_team_selected),
  real_conversations_selected boolean not null default false check (not real_conversations_selected),
  real_pilot_authorized boolean not null default false check (not real_pilot_authorized),
  real_pilot_executed boolean not null default false check (not real_pilot_executed),
  production_authorized boolean not null default false check (not production_authorized),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.channel_pilot_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pilot_plan_id uuid not null references public.channel_pilot_plans(id) on delete cascade,
  decision text not null check (decision in ('HOLD','NO_GO')),
  blockers jsonb not null check (jsonb_typeof(blockers)='array' and jsonb_array_length(blockers)>0),
  slis_slos jsonb not null check (jsonb_typeof(slis_slos)='array'),
  abort_criteria jsonb not null check (jsonb_typeof(abort_criteria)='array'),
  provider_comparison jsonb not null check (jsonb_typeof(provider_comparison)='array'),
  synthetic_costs jsonb not null check (jsonb_typeof(synthetic_costs)='object'),
  legal_review_status text not null check (legal_review_status in ('NOT_REQUESTED','PENDING','REJECTED')),
  rollback_tested_synthetic boolean not null default false,
  daily_incident_review_defined boolean not null default false,
  homologation_gate_released boolean not null default false check (not homologation_gate_released),
  real_pilot_executed boolean not null default false check (not real_pilot_executed),
  real_conversations_used boolean not null default false check (not real_conversations_used),
  production_authorized boolean not null default false check (not production_authorized),
  commit_sha text not null check (commit_sha ~ '^[a-f0-9]{40}$'),
  assessed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (not (provider_comparison::text ~* '"(phone|body|content|secret|token|credential)"')),
  check (not (synthetic_costs::text ~* '"(phone|body|content|secret|token|credential)"'))
);

create table if not exists public.channel_pilot_daily_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pilot_plan_id uuid not null references public.channel_pilot_plans(id) on delete cascade,
  review_date date not null,
  status text not null check (status in ('SYNTHETIC_REHEARSAL','NOT_EXECUTED')),
  incidents jsonb not null default '[]'::jsonb check (jsonb_typeof(incidents)='array'),
  costs jsonb not null default '{}'::jsonb check (jsonb_typeof(costs)='object'),
  rollback_required boolean not null default false,
  real_activity boolean not null default false check (not real_activity),
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (pilot_plan_id,review_date),
  check (not (incidents::text ~* '"(phone|body|content|secret|token|credential)"'))
);

create or replace function public.channel_pilot_scope_guard()
returns trigger language plpgsql set search_path=pg_catalog,public
as $$
declare plan_org uuid;
begin
  if tg_table_name='channel_pilot_plans' then return new; end if;
  select organization_id into plan_org from public.channel_pilot_plans where id=new.pilot_plan_id;
  if plan_org is null or plan_org <> new.organization_id then raise exception 'PILOT_SCOPE_MISMATCH'; end if;
  return new;
end $$;

do $$ declare relation text;
begin
  foreach relation in array array['channel_pilot_assessments','channel_pilot_daily_reviews'] loop
    execute format('drop trigger if exists %I on public.%I',relation||'_scope_guard',relation);
    execute format('create trigger %I before insert or update on public.%I for each row execute function public.channel_pilot_scope_guard()',relation||'_scope_guard',relation);
  end loop;
end $$;

create or replace function public.channel_pilot_evidence_immutable()
returns trigger language plpgsql set search_path=pg_catalog,public
as $$ begin raise exception 'PILOT_EVIDENCE_IMMUTABLE'; end $$;

do $$ declare relation text;
begin
  foreach relation in array array['channel_pilot_assessments','channel_pilot_daily_reviews'] loop
    execute format('drop trigger if exists %I on public.%I',relation||'_immutable',relation);
    execute format('create trigger %I before update or delete on public.%I for each row execute function public.channel_pilot_evidence_immutable()',relation||'_immutable',relation);
  end loop;
end $$;

create or replace function public.create_channel_pilot_plan(
  p_organization_id uuid,
  p_name text,
  p_maximum_team_members integer,
  p_maximum_conversations integer,
  p_maximum_daily_messages integer,
  p_start_hour integer,
  p_end_hour integer,
  p_weekdays integer[]
)
returns public.channel_pilot_plans
language plpgsql security definer set search_path=pg_catalog,public
as $$ declare result public.channel_pilot_plans;
begin
  if not public.has_module_permission(p_organization_id,'whatsapp','EDIT',null,'manage') then raise exception 'PILOT_FORBIDDEN'; end if;
  insert into public.channel_pilot_plans(
    organization_id,name,status,maximum_team_members,maximum_conversations,maximum_daily_messages,
    start_hour,end_hour,weekdays,campaigns_enabled,ai_mode,created_by
  ) values (
    p_organization_id,left(p_name,160),'HOLD',p_maximum_team_members,p_maximum_conversations,p_maximum_daily_messages,
    p_start_hour,p_end_hour,p_weekdays,false,'DRAFT_ONLY',auth.uid()
  ) returning * into result;
  return result;
end $$;

create or replace function public.record_channel_pilot_assessment(
  p_organization_id uuid,
  p_pilot_plan_id uuid,
  p_decision text,
  p_blockers jsonb,
  p_slis_slos jsonb,
  p_abort_criteria jsonb,
  p_provider_comparison jsonb,
  p_synthetic_costs jsonb,
  p_legal_review_status text,
  p_rollback_tested_synthetic boolean,
  p_daily_incident_review_defined boolean,
  p_commit_sha text
)
returns public.channel_pilot_assessments
language plpgsql security definer set search_path=pg_catalog,public
as $$ declare result public.channel_pilot_assessments;
begin
  if not public.has_module_permission(p_organization_id,'whatsapp','EDIT',null,'manage') then raise exception 'PILOT_FORBIDDEN'; end if;
  if p_decision='GO' then raise exception 'REAL_PILOT_REVIEW_REQUIRED'; end if;
  insert into public.channel_pilot_assessments(
    organization_id,pilot_plan_id,decision,blockers,slis_slos,abort_criteria,provider_comparison,
    synthetic_costs,legal_review_status,rollback_tested_synthetic,daily_incident_review_defined,commit_sha,
    homologation_gate_released,real_pilot_executed,real_conversations_used,production_authorized,assessed_by
  ) values (
    p_organization_id,p_pilot_plan_id,p_decision,coalesce(p_blockers,'[]'::jsonb),coalesce(p_slis_slos,'[]'::jsonb),
    coalesce(p_abort_criteria,'[]'::jsonb),coalesce(p_provider_comparison,'[]'::jsonb),
    coalesce(p_synthetic_costs,'{}'::jsonb),p_legal_review_status,p_rollback_tested_synthetic,
    p_daily_incident_review_defined,lower(p_commit_sha),false,false,false,false,auth.uid()
  ) returning * into result;
  return result;
end $$;

create or replace function public.record_channel_pilot_daily_review(
  p_organization_id uuid,
  p_pilot_plan_id uuid,
  p_review_date date,
  p_incidents jsonb,
  p_costs jsonb,
  p_rollback_required boolean
)
returns public.channel_pilot_daily_reviews
language plpgsql security definer set search_path=pg_catalog,public
as $$ declare result public.channel_pilot_daily_reviews;
begin
  if not public.has_module_permission(p_organization_id,'whatsapp','EDIT',null,'manage') then raise exception 'PILOT_FORBIDDEN'; end if;
  insert into public.channel_pilot_daily_reviews(
    organization_id,pilot_plan_id,review_date,status,incidents,costs,rollback_required,real_activity,reviewed_by
  ) values (
    p_organization_id,p_pilot_plan_id,p_review_date,'SYNTHETIC_REHEARSAL',coalesce(p_incidents,'[]'::jsonb),
    coalesce(p_costs,'{}'::jsonb),p_rollback_required,false,auth.uid()
  ) returning * into result;
  return result;
end $$;

alter table public.channel_pilot_plans enable row level security;
alter table public.channel_pilot_plans force row level security;
alter table public.channel_pilot_assessments enable row level security;
alter table public.channel_pilot_assessments force row level security;
alter table public.channel_pilot_daily_reviews enable row level security;
alter table public.channel_pilot_daily_reviews force row level security;

do $$ declare relation text;
begin
  foreach relation in array array['channel_pilot_plans','channel_pilot_assessments','channel_pilot_daily_reviews'] loop
    execute format('drop policy if exists %I on public.%I',relation||'_read',relation);
    execute format('create policy %I on public.%I for select to authenticated using (public.has_module_permission(organization_id,''whatsapp'',''READ'',null,null))',relation||'_read',relation);
    execute format('revoke all on public.%I from anon,authenticated',relation);
    execute format('grant select on public.%I to authenticated',relation);
  end loop;
end $$;

revoke all on function public.create_channel_pilot_plan(uuid,text,integer,integer,integer,integer,integer,integer[]) from public,anon;
revoke all on function public.record_channel_pilot_assessment(uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,jsonb,text,boolean,boolean,text) from public,anon;
revoke all on function public.record_channel_pilot_daily_review(uuid,uuid,date,jsonb,jsonb,boolean) from public,anon;
grant execute on function public.create_channel_pilot_plan(uuid,text,integer,integer,integer,integer,integer,integer[]) to authenticated,service_role;
grant execute on function public.record_channel_pilot_assessment(uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,jsonb,text,boolean,boolean,text) to authenticated,service_role;
grant execute on function public.record_channel_pilot_daily_review(uuid,uuid,date,jsonb,jsonb,boolean) to authenticated,service_role;
