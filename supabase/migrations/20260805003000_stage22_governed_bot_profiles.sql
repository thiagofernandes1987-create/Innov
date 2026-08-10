-- Etapa 22 pós-fechamento — perfis de bot governados, somente rascunho.
-- Nenhum perfil criado por esta migration pode enviar mensagens autonomamente.

begin;

create table if not exists public.channel_bot_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(btrim(name)) between 3 and 100),
  description text check (description is null or length(description) <= 500),
  enabled_for_drafts boolean not null default false,
  autonomy_mode text not null default 'DRAFT_ONLY' check (autonomy_mode = 'DRAFT_ONLY'),
  review_required boolean not null default true check (review_required),
  send_allowed boolean not null default false check (not send_allowed),
  provider_id text not null default 'DISABLED' check (provider_id in ('DISABLED','OPENAI')),
  model_id text check (model_id is null or length(btrim(model_id)) between 1 and 160),
  system_instructions text not null check (length(btrim(system_instructions)) between 20 and 4000),
  retrieval_mode text not null default 'LEXICAL' check (retrieval_mode in ('LEXICAL','HYBRID')),
  allowed_tools text[] not null default '{}'::text[],
  max_output_tokens integer not null default 500 check (max_output_tokens between 64 and 1200),
  max_cost_micros_per_run bigint not null default 0 check (max_cost_micros_per_run between 0 and 1000000000),
  priority integer not null default 100 check (priority between 1 and 10000),
  queue_id uuid references public.channel_inbox_queues(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name),
  check (allowed_tools <@ array[
    'SEARCH_CANONICAL','READ_PROJECT_STATUS','READ_CANONICAL_DOCUMENT','CREATE_HANDOFF'
  ]::text[]),
  check (cardinality(allowed_tools) <= 4),
  check (not (system_instructions ~* '(api[_ -]?key|secret|token|credential|password|cookie)\s*[:=]')),
  check (not enabled_for_drafts or (
    provider_id <> 'DISABLED'
    and model_id is not null
    and max_cost_micros_per_run > 0
  ))
);

create index if not exists channel_bot_profiles_scope_idx
  on public.channel_bot_profiles(organization_id, enabled_for_drafts, queue_id, project_id, priority, id);

create or replace function public.channel_bot_profile_scope_guard()
returns trigger
language plpgsql
set search_path=pg_catalog,public
as $$
begin
  if new.queue_id is not null and not exists (
    select 1 from public.channel_inbox_queues queue
    where queue.id = new.queue_id
      and queue.organization_id = new.organization_id
      and queue.active
  ) then
    raise exception 'BOT_QUEUE_SCOPE_MISMATCH';
  end if;
  if new.project_id is not null and not exists (
    select 1 from public.projects project
    where project.id = new.project_id
      and project.organization_id = new.organization_id
  ) then
    raise exception 'BOT_PROJECT_SCOPE_MISMATCH';
  end if;
  return new;
end;
$$;

drop trigger if exists channel_bot_profiles_scope_guard on public.channel_bot_profiles;
create trigger channel_bot_profiles_scope_guard
before insert or update of organization_id, queue_id, project_id
on public.channel_bot_profiles
for each row execute function public.channel_bot_profile_scope_guard();

create or replace function public.upsert_channel_bot_profile(
  p_organization_id uuid,
  p_name text,
  p_description text,
  p_enabled_for_drafts boolean,
  p_provider_id text,
  p_model_id text,
  p_system_instructions text,
  p_retrieval_mode text,
  p_allowed_tools text[],
  p_max_output_tokens integer,
  p_max_cost_micros_per_run bigint,
  p_priority integer,
  p_queue_id uuid default null,
  p_project_id uuid default null,
  p_profile_id uuid default null
)
returns public.channel_bot_profiles
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
  result public.channel_bot_profiles;
  profile_name text := btrim(p_name);
  instructions text := btrim(regexp_replace(p_system_instructions, '[[:cntrl:]]', ' ', 'g'));
begin
  if not public.has_module_permission(p_organization_id,'whatsapp','EDIT',p_project_id,'administer') then
    raise exception 'BOT_FORBIDDEN';
  end if;
  if length(profile_name) < 3 then raise exception 'BOT_NAME_INVALID'; end if;
  if p_provider_id not in ('DISABLED','OPENAI') then raise exception 'BOT_PROVIDER_INVALID'; end if;
  if p_retrieval_mode not in ('LEXICAL','HYBRID') then raise exception 'BOT_RETRIEVAL_INVALID'; end if;
  if not coalesce(p_allowed_tools,'{}'::text[]) <@ array[
    'SEARCH_CANONICAL','READ_PROJECT_STATUS','READ_CANONICAL_DOCUMENT','CREATE_HANDOFF'
  ]::text[] then raise exception 'BOT_TOOL_NOT_ALLOWED'; end if;
  if p_enabled_for_drafts and (
    p_provider_id = 'DISABLED'
    or nullif(btrim(p_model_id),'') is null
    or p_max_cost_micros_per_run <= 0
  ) then raise exception 'BOT_NOT_READY'; end if;

  if p_profile_id is null then
    insert into public.channel_bot_profiles(
      organization_id,name,description,enabled_for_drafts,provider_id,model_id,
      system_instructions,retrieval_mode,allowed_tools,max_output_tokens,
      max_cost_micros_per_run,priority,queue_id,project_id,created_by,updated_by
    ) values (
      p_organization_id,profile_name,nullif(btrim(p_description),''),p_enabled_for_drafts,
      p_provider_id,nullif(btrim(p_model_id),''),instructions,p_retrieval_mode,
      coalesce(p_allowed_tools,'{}'::text[]),p_max_output_tokens,p_max_cost_micros_per_run,
      p_priority,p_queue_id,p_project_id,auth.uid(),auth.uid()
    ) returning * into result;
  else
    update public.channel_bot_profiles set
      name=profile_name,
      description=nullif(btrim(p_description),''),
      enabled_for_drafts=p_enabled_for_drafts,
      provider_id=p_provider_id,
      model_id=nullif(btrim(p_model_id),''),
      system_instructions=instructions,
      retrieval_mode=p_retrieval_mode,
      allowed_tools=coalesce(p_allowed_tools,'{}'::text[]),
      max_output_tokens=p_max_output_tokens,
      max_cost_micros_per_run=p_max_cost_micros_per_run,
      priority=p_priority,
      queue_id=p_queue_id,
      project_id=p_project_id,
      updated_by=auth.uid(),
      updated_at=clock_timestamp()
    where id=p_profile_id and organization_id=p_organization_id
    returning * into result;
    if result.id is null then raise exception 'BOT_PROFILE_NOT_FOUND'; end if;
  end if;
  return result;
end;
$$;

create or replace function public.set_channel_ai_daily_budget(
  p_organization_id uuid,
  p_maximum_cost_micros bigint
)
returns public.channel_ai_budget_daily
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare result public.channel_ai_budget_daily;
begin
  if not public.has_module_permission(p_organization_id,'whatsapp','EDIT',null,'administer') then
    raise exception 'AI_BUDGET_FORBIDDEN';
  end if;
  if p_maximum_cost_micros < 0 or p_maximum_cost_micros > 100000000000 then
    raise exception 'AI_BUDGET_LIMIT_INVALID';
  end if;
  insert into public.channel_ai_budget_daily(
    organization_id,usage_date,maximum_cost_micros,reserved_cost_micros,committed_cost_micros,updated_at
  ) values (
    p_organization_id,current_date,p_maximum_cost_micros,0,0,clock_timestamp()
  )
  on conflict (organization_id,usage_date) do update set
    maximum_cost_micros=excluded.maximum_cost_micros,
    updated_at=excluded.updated_at
  where public.channel_ai_budget_daily.reserved_cost_micros
      + public.channel_ai_budget_daily.committed_cost_micros
      <= excluded.maximum_cost_micros
  returning * into result;
  if result.organization_id is null then raise exception 'AI_BUDGET_BELOW_CURRENT_USAGE'; end if;
  return result;
end;
$$;

create or replace function public.release_channel_ai_budget(
  p_organization_id uuid,
  p_reserved_micros bigint
)
returns boolean
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
begin
  if p_reserved_micros <= 0 then raise exception 'AI_BUDGET_RELEASE_INVALID'; end if;
  update public.channel_ai_budget_daily
  set reserved_cost_micros=reserved_cost_micros-p_reserved_micros,
      updated_at=clock_timestamp()
  where organization_id=p_organization_id
    and usage_date=current_date
    and reserved_cost_micros >= p_reserved_micros;
  return found;
end;
$$;

alter table public.channel_bot_profiles enable row level security;
alter table public.channel_bot_profiles force row level security;

drop policy if exists channel_bot_profiles_read on public.channel_bot_profiles;
create policy channel_bot_profiles_read
on public.channel_bot_profiles for select to authenticated
using (public.has_module_permission(organization_id,'whatsapp','READ',project_id,null));

revoke all on public.channel_bot_profiles from anon,authenticated;
grant select on public.channel_bot_profiles to authenticated;

revoke all on function public.upsert_channel_bot_profile(
  uuid,text,text,boolean,text,text,text,text,text[],integer,bigint,integer,uuid,uuid,uuid
) from public,anon;
revoke all on function public.set_channel_ai_daily_budget(uuid,bigint) from public,anon;
revoke all on function public.release_channel_ai_budget(uuid,bigint) from public,anon;

grant execute on function public.upsert_channel_bot_profile(
  uuid,text,text,boolean,text,text,text,text,text[],integer,bigint,integer,uuid,uuid,uuid
) to authenticated,service_role;
grant execute on function public.set_channel_ai_daily_budget(uuid,bigint) to authenticated,service_role;
grant execute on function public.release_channel_ai_budget(uuid,bigint) to authenticated,service_role;

commit;
