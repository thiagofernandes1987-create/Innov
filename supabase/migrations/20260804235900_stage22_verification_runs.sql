-- Sprint W-19 — ledger de testes sintéticos; proíbe evidência real nesta etapa.

create table if not exists public.channel_verification_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  suite text not null check (suite in ('UNIT','CONTRACT','POSTGRES_INTEGRATION','CHAOS_SYNTHETIC','PERFORMANCE_SYNTHETIC')),
  scenario text not null check (length(scenario) between 3 and 120),
  status text not null check (status in ('PASSED','FAILED','BLOCKED_NOT_EXECUTED')),
  environment text not null default 'SYNTHETIC_LOCAL' check (environment='SYNTHETIC_LOCAL'),
  assertions jsonb not null default '[]'::jsonb check (jsonb_typeof(assertions)='array'),
  measurements jsonb not null default '{}'::jsonb check (jsonb_typeof(measurements)='object'),
  limits jsonb not null default '{}'::jsonb check (jsonb_typeof(limits)='object'),
  real_number_used boolean not null default false check (not real_number_used),
  qr_or_pairing_used boolean not null default false check (not qr_or_pairing_used),
  external_network_used boolean not null default false check (not external_network_used),
  production_claim boolean not null default false check (not production_claim),
  commit_sha text not null check (commit_sha ~ '^[a-f0-9]{40}$'),
  created_at timestamptz not null default now(),
  check (not (assertions::text ~* '"(body|content|secret|token|credential|number)"')),
  check (not (measurements::text ~* '"(body|content|secret|token|credential|phone)"'))
);

create index if not exists channel_verification_runs_lookup_idx
  on public.channel_verification_runs(organization_id,suite,scenario,created_at desc);

create or replace function public.record_channel_verification_run(
  p_organization_id uuid,
  p_suite text,
  p_scenario text,
  p_status text,
  p_assertions jsonb,
  p_measurements jsonb,
  p_limits jsonb,
  p_commit_sha text
)
returns public.channel_verification_runs
language plpgsql security definer set search_path=pg_catalog,public
as $$ declare result public.channel_verification_runs;
begin
  if not public.has_module_permission(p_organization_id,'whatsapp','EDIT',null,'manage') then
    raise exception 'VERIFICATION_FORBIDDEN';
  end if;
  insert into public.channel_verification_runs(
    organization_id,suite,scenario,status,assertions,measurements,limits,commit_sha
  ) values (
    p_organization_id,p_suite,left(p_scenario,120),p_status,coalesce(p_assertions,'[]'::jsonb),
    coalesce(p_measurements,'{}'::jsonb),coalesce(p_limits,'{}'::jsonb),lower(p_commit_sha)
  ) returning * into result;
  return result;
end $$;

create or replace function public.channel_verification_run_immutable()
returns trigger language plpgsql set search_path=pg_catalog,public
as $$ begin raise exception 'VERIFICATION_RUN_IMMUTABLE'; end $$;

drop trigger if exists channel_verification_runs_immutable on public.channel_verification_runs;
create trigger channel_verification_runs_immutable before update or delete on public.channel_verification_runs
for each row execute function public.channel_verification_run_immutable();

alter table public.channel_verification_runs enable row level security;
alter table public.channel_verification_runs force row level security;
drop policy if exists channel_verification_runs_read on public.channel_verification_runs;
create policy channel_verification_runs_read on public.channel_verification_runs
for select to authenticated using (public.has_module_permission(organization_id,'whatsapp','READ',null,null));
revoke all on public.channel_verification_runs from anon,authenticated;
grant select on public.channel_verification_runs to authenticated;
revoke all on function public.record_channel_verification_run(uuid,text,text,text,jsonb,jsonb,jsonb,text) from public,anon;
grant execute on function public.record_channel_verification_run(uuid,text,text,text,jsonb,jsonb,jsonb,text) to authenticated,service_role;
