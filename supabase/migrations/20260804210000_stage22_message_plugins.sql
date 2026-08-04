-- Sprint W-16 — plugins e automações governadas.

create table if not exists public.channel_message_plugin_policies (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plugin_id text not null check (plugin_id in (
    'CONSENT','ANTI_SPAM','QUALIFICATION','PROJECT_STATUS','DOCUMENT','SAC','HANDOFF','AI_FALLBACK'
  )),
  enabled boolean not null default false,
  priority integer not null check (priority between 1 and 10000),
  required_permission text,
  feature_flag text,
  configuration jsonb not null default '{}'::jsonb check (jsonb_typeof(configuration)='object'),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (organization_id, plugin_id),
  check (not (configuration::text ~* '"(secret|token|credential|password|cookie)"')),
  check (plugin_id <> 'AI_FALLBACK' or enabled=false or feature_flag='MESSAGING_AI_DRAFT')
);

create unique index if not exists channel_message_plugin_priority_uidx
  on public.channel_message_plugin_policies(organization_id, priority)
  where enabled;

create table if not exists public.channel_message_plugin_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  message_id uuid references public.whatsapp_messages(id) on delete set null,
  plugin_id text not null,
  priority integer not null,
  decision text not null check (decision in ('CONTINUE','RESPOND','BLOCK','HANDOFF','DRAFT','SKIPPED')),
  reason text not null check (length(reason) between 1 and 240),
  requires_human_review boolean not null default false,
  trace jsonb not null default '[]'::jsonb check (jsonb_typeof(trace)='array'),
  created_at timestamptz not null default now(),
  check (decision <> 'DRAFT' or requires_human_review),
  check (not (trace::text ~* '"(body|content|secret|token|credential|password)"'))
);

create index if not exists channel_message_plugin_decisions_conversation_idx
  on public.channel_message_plugin_decisions(organization_id,conversation_id,created_at desc);

create or replace function public.channel_message_plugin_scope_guard()
returns trigger
language plpgsql
set search_path=pg_catalog,public
as $$
declare conversation_org uuid;
begin
  select organization_id into conversation_org from public.whatsapp_conversations where id=new.conversation_id;
  if conversation_org is null or conversation_org <> new.organization_id then
    raise exception 'PLUGIN_SCOPE_MISMATCH';
  end if;
  return new;
end;
$$;

drop trigger if exists channel_message_plugin_decision_scope_guard on public.channel_message_plugin_decisions;
create trigger channel_message_plugin_decision_scope_guard
before insert or update on public.channel_message_plugin_decisions
for each row execute function public.channel_message_plugin_scope_guard();

create or replace function public.channel_message_plugin_decision_immutable()
returns trigger
language plpgsql
set search_path=pg_catalog,public
as $$ begin raise exception 'PLUGIN_DECISION_IMMUTABLE'; end $$;

drop trigger if exists channel_message_plugin_decisions_immutable on public.channel_message_plugin_decisions;
create trigger channel_message_plugin_decisions_immutable
before update or delete on public.channel_message_plugin_decisions
for each row execute function public.channel_message_plugin_decision_immutable();

create or replace function public.set_channel_message_plugin_policy(
  p_organization_id uuid,
  p_plugin_id text,
  p_enabled boolean,
  p_priority integer,
  p_required_permission text,
  p_feature_flag text,
  p_configuration jsonb default '{}'::jsonb
)
returns public.channel_message_plugin_policies
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare result public.channel_message_plugin_policies;
begin
  if not public.has_module_permission(p_organization_id,'whatsapp','EDIT',null,'manage') then
    raise exception 'PLUGIN_FORBIDDEN';
  end if;
  if p_plugin_id='CONSENT' and not p_enabled then raise exception 'CONSENT_PLUGIN_REQUIRED'; end if;
  if p_plugin_id='AI_FALLBACK' and (p_priority < 1000 or p_feature_flag <> 'MESSAGING_AI_DRAFT') then
    raise exception 'AI_PLUGIN_MUST_BE_LAST_AND_FLAGGED';
  end if;
  insert into public.channel_message_plugin_policies(
    organization_id,plugin_id,enabled,priority,required_permission,feature_flag,configuration,updated_by,updated_at
  ) values (
    p_organization_id,p_plugin_id,p_enabled,p_priority,nullif(p_required_permission,''),nullif(p_feature_flag,''),
    coalesce(p_configuration,'{}'::jsonb),auth.uid(),clock_timestamp()
  )
  on conflict (organization_id,plugin_id) do update set
    enabled=excluded.enabled,priority=excluded.priority,required_permission=excluded.required_permission,
    feature_flag=excluded.feature_flag,configuration=excluded.configuration,updated_by=excluded.updated_by,
    updated_at=excluded.updated_at
  returning * into result;
  return result;
end;
$$;

create or replace function public.record_channel_message_plugin_decision(
  p_organization_id uuid,
  p_conversation_id uuid,
  p_message_id uuid,
  p_plugin_id text,
  p_priority integer,
  p_decision text,
  p_reason text,
  p_requires_human_review boolean,
  p_trace jsonb default '[]'::jsonb
)
returns public.channel_message_plugin_decisions
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare result public.channel_message_plugin_decisions;
begin
  if not public.has_module_permission(p_organization_id,'whatsapp','EDIT',null,'manage') then
    raise exception 'PLUGIN_FORBIDDEN';
  end if;
  insert into public.channel_message_plugin_decisions(
    organization_id,conversation_id,message_id,plugin_id,priority,decision,reason,requires_human_review,trace
  ) values (
    p_organization_id,p_conversation_id,p_message_id,p_plugin_id,p_priority,p_decision,
    left(regexp_replace(p_reason,'[[:cntrl:]]',' ','g'),240),p_requires_human_review,coalesce(p_trace,'[]'::jsonb)
  ) returning * into result;
  return result;
end;
$$;

alter table public.channel_message_plugin_policies enable row level security;
alter table public.channel_message_plugin_policies force row level security;
alter table public.channel_message_plugin_decisions enable row level security;
alter table public.channel_message_plugin_decisions force row level security;

do $$ declare relation text;
begin
  foreach relation in array array['channel_message_plugin_policies','channel_message_plugin_decisions'] loop
    execute format('drop policy if exists %I on public.%I',relation||'_read',relation);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.has_module_permission(organization_id,''whatsapp'',''READ'',null,null))',
      relation||'_read',relation
    );
    execute format('revoke all on public.%I from anon,authenticated',relation);
    execute format('grant select on public.%I to authenticated',relation);
  end loop;
end $$;

revoke all on function public.set_channel_message_plugin_policy(uuid,text,boolean,integer,text,text,jsonb) from public,anon;
revoke all on function public.record_channel_message_plugin_decision(uuid,uuid,uuid,text,integer,text,text,boolean,jsonb) from public,anon;
grant execute on function public.set_channel_message_plugin_policy(uuid,text,boolean,integer,text,text,jsonb) to authenticated,service_role;
grant execute on function public.record_channel_message_plugin_decision(uuid,uuid,uuid,text,integer,text,text,text,boolean,jsonb) to authenticated,service_role;
