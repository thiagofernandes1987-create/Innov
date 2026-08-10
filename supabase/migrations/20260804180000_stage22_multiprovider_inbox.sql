-- Etapa 22 / Sprint W-13 — inbox multiprovider e atendimento.
-- Conversas whatsapp_* permanecem canônicas; channel_* guarda operação e eventos técnicos.

begin;

create table if not exists public.channel_inbox_queues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  active boolean not null default true,
  priority integer not null default 100 check(priority between 1 and 1000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,name)
);

alter table public.whatsapp_conversations
  add column if not exists client_id uuid,
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists queue_id uuid references public.channel_inbox_queues(id) on delete set null,
  add column if not exists ownership_version bigint not null default 1,
  add column if not exists channel_state text not null default 'ONLINE',
  add column if not exists last_actor_kind text not null default 'HUMAN',
  add column if not exists human_controlled_at timestamptz;

do $$
begin
  if not exists(select 1 from pg_constraint where conname='whatsapp_conversations_ownership_version_check') then
    alter table public.whatsapp_conversations add constraint whatsapp_conversations_ownership_version_check
      check(ownership_version>0);
  end if;
  if not exists(select 1 from pg_constraint where conname='whatsapp_conversations_channel_state_check') then
    alter table public.whatsapp_conversations add constraint whatsapp_conversations_channel_state_check
      check(channel_state in ('ONLINE','OFFLINE','RECONNECTING','DEGRADED','ACTION_REQUIRED'));
  end if;
  if not exists(select 1 from pg_constraint where conname='whatsapp_conversations_actor_kind_check') then
    alter table public.whatsapp_conversations add constraint whatsapp_conversations_actor_kind_check
      check(last_actor_kind in ('HUMAN','AUTOMATION','AI','SYSTEM'));
  end if;
end;
$$;
create index if not exists whatsapp_conversations_queue_idx
  on public.whatsapp_conversations(organization_id,queue_id,status,last_message_at desc);
create index if not exists whatsapp_conversations_assignee_idx
  on public.whatsapp_conversations(organization_id,assigned_to,status,last_message_at desc);
create index if not exists whatsapp_conversations_unified_contact_idx
  on public.whatsapp_conversations(organization_id,client_id,contact_id,last_message_at desc);

create table if not exists public.channel_conversation_assignment_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  previous_queue_id uuid references public.channel_inbox_queues(id) on delete set null,
  new_queue_id uuid references public.channel_inbox_queues(id) on delete set null,
  previous_assignee_id uuid references auth.users(id) on delete set null,
  new_assignee_id uuid references auth.users(id) on delete set null,
  ownership_version bigint not null check(ownership_version>0),
  reason text not null check(length(btrim(reason))>=3),
  changed_by uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now()
);
create index if not exists channel_assignment_events_conversation_idx
  on public.channel_conversation_assignment_events(conversation_id,occurred_at desc);

create table if not exists public.channel_conversation_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  body text not null check(length(btrim(body)) between 1 and 4000),
  visibility text not null default 'INTERNAL' check(visibility='INTERNAL'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check(body !~* '(access[_ -]?token|refresh[_ -]?token|pairing[_ -]?code|qr[_ -]?value|cookie)\s*[:=]')
);
create index if not exists channel_conversation_notes_idx
  on public.channel_conversation_notes(conversation_id,created_at desc);

create table if not exists public.channel_operator_presence (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  presence text not null check(presence in ('ONLINE','AWAY','BUSY','OFFLINE')),
  active_conversation_id uuid references public.whatsapp_conversations(id) on delete set null,
  expires_at timestamptz not null,
  version bigint not null default 1 check(version>0),
  updated_at timestamptz not null default now(),
  primary key(organization_id,user_id),
  check(expires_at>updated_at)
);
create index if not exists channel_operator_presence_expiry_idx
  on public.channel_operator_presence(expires_at);

create table if not exists public.channel_workspace_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid references public.whatsapp_conversations(id) on delete cascade,
  event_type text not null check(event_type in (
    'ASSIGNMENT_CHANGED','NOTE_CREATED','ACTOR_CHANGED','CHANNEL_STATE_CHANGED','PRESENCE_CHANGED'
  )),
  event_payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  delivered_at timestamptz,
  check(jsonb_typeof(event_payload)='object'),
  check(pg_column_size(event_payload)<=8192),
  check(not (event_payload ?| array[
    'raw_payload','credentials','secret','token','cookie','qr','pairing_code','message_body'
  ]))
);
create index if not exists channel_workspace_events_delivery_idx
  on public.channel_workspace_events(organization_id,delivered_at,occurred_at,id)
  where delivered_at is null;

create or replace function public.guard_channel_queue_scope()
returns trigger language plpgsql set search_path=public,pg_temp
as $$
declare queue_org uuid;
begin
  if new.queue_id is null then return new; end if;
  select organization_id into queue_org from public.channel_inbox_queues where id=new.queue_id and active;
  if queue_org is null or queue_org<>new.organization_id then raise exception 'QUEUE_SCOPE_MISMATCH'; end if;
  return new;
end;
$$;
drop trigger if exists whatsapp_conversation_queue_scope_guard on public.whatsapp_conversations;
create trigger whatsapp_conversation_queue_scope_guard
before insert or update of organization_id,queue_id on public.whatsapp_conversations
for each row execute function public.guard_channel_queue_scope();

create or replace function public.assign_channel_conversation(
  p_conversation_id uuid,p_new_assignee_id uuid,p_new_queue_id uuid,
  p_expected_version bigint,p_reason text
)
returns public.whatsapp_conversations
language plpgsql security definer
set search_path=public,auth,pg_temp
as $$
declare conversation_row public.whatsapp_conversations%rowtype;
declare result public.whatsapp_conversations%rowtype;
begin
  if length(btrim(p_reason))<3 then raise exception 'ASSIGNMENT_REASON_REQUIRED'; end if;
  select * into conversation_row from public.whatsapp_conversations
    where id=p_conversation_id for update;
  if conversation_row.id is null then raise exception 'CONVERSATION_NOT_FOUND'; end if;
  if not public.has_module_permission(
    conversation_row.organization_id,'whatsapp','EDIT',conversation_row.project_id,null
  ) then raise exception 'ACCESS_DENIED'; end if;
  if conversation_row.ownership_version<>p_expected_version then raise exception 'OWNERSHIP_VERSION_CONFLICT'; end if;
  if p_new_queue_id is not null and not exists(
    select 1 from public.channel_inbox_queues queue
    where queue.id=p_new_queue_id and queue.organization_id=conversation_row.organization_id and queue.active
  ) then raise exception 'QUEUE_SCOPE_MISMATCH'; end if;
  if p_new_assignee_id is not null and not exists(select 1 from auth.users where id=p_new_assignee_id) then
    raise exception 'ASSIGNEE_NOT_FOUND';
  end if;
  update public.whatsapp_conversations set
    assigned_to=p_new_assignee_id,queue_id=p_new_queue_id,
    ownership_version=ownership_version+1,updated_at=now()
  where id=conversation_row.id returning * into result;
  insert into public.channel_conversation_assignment_events(
    organization_id,conversation_id,previous_queue_id,new_queue_id,
    previous_assignee_id,new_assignee_id,ownership_version,reason,changed_by
  ) values(
    conversation_row.organization_id,conversation_row.id,conversation_row.queue_id,p_new_queue_id,
    conversation_row.assigned_to,p_new_assignee_id,result.ownership_version,p_reason,auth.uid()
  );
  insert into public.channel_workspace_events(
    organization_id,conversation_id,event_type,event_payload
  ) values(
    conversation_row.organization_id,conversation_row.id,'ASSIGNMENT_CHANGED',
    jsonb_build_object('ownershipVersion',result.ownership_version,'queueChanged',conversation_row.queue_id is distinct from p_new_queue_id,
      'assigneeChanged',conversation_row.assigned_to is distinct from p_new_assignee_id)
  );
  return result;
end;
$$;

create or replace function public.add_channel_conversation_note(
  p_conversation_id uuid,p_body text
)
returns public.channel_conversation_notes
language plpgsql security definer
set search_path=public,auth,pg_temp
as $$
declare conversation_row public.whatsapp_conversations%rowtype;
declare result public.channel_conversation_notes%rowtype;
begin
  select * into conversation_row from public.whatsapp_conversations where id=p_conversation_id;
  if conversation_row.id is null then raise exception 'CONVERSATION_NOT_FOUND'; end if;
  if not public.has_module_permission(
    conversation_row.organization_id,'whatsapp','EDIT',conversation_row.project_id,null
  ) then raise exception 'ACCESS_DENIED'; end if;
  insert into public.channel_conversation_notes(
    organization_id,conversation_id,body,created_by
  ) values(
    conversation_row.organization_id,conversation_row.id,btrim(p_body),auth.uid()
  ) returning * into result;
  insert into public.channel_workspace_events(
    organization_id,conversation_id,event_type,event_payload
  ) values(
    conversation_row.organization_id,conversation_row.id,'NOTE_CREATED',
    jsonb_build_object('noteId',result.id,'bodyIncluded',false)
  );
  return result;
end;
$$;

create or replace function public.set_channel_operator_presence(
  p_presence text,p_active_conversation_id uuid default null,p_ttl_seconds integer default 90
)
returns public.channel_operator_presence
language plpgsql security definer
set search_path=public,auth,pg_temp
as $$
declare organization_id_value uuid;
declare result public.channel_operator_presence%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_presence not in ('ONLINE','AWAY','BUSY','OFFLINE') then raise exception 'INVALID_PRESENCE'; end if;
  if p_ttl_seconds<30 or p_ttl_seconds>300 then raise exception 'INVALID_PRESENCE_TTL'; end if;
  if p_active_conversation_id is not null then
    select organization_id into organization_id_value from public.whatsapp_conversations
    where id=p_active_conversation_id;
  else
    organization_id_value:=nullif(current_setting('test.organization_id',true),'')::uuid;
  end if;
  if organization_id_value is null then raise exception 'ORGANIZATION_UNRESOLVED'; end if;
  if not public.has_module_permission(organization_id_value,'whatsapp','READ',null,null) then
    raise exception 'ACCESS_DENIED';
  end if;
  insert into public.channel_operator_presence(
    organization_id,user_id,presence,active_conversation_id,expires_at
  ) values(
    organization_id_value,auth.uid(),p_presence,p_active_conversation_id,
    now()+make_interval(secs=>p_ttl_seconds)
  ) on conflict(organization_id,user_id) do update set
    presence=excluded.presence,active_conversation_id=excluded.active_conversation_id,
    expires_at=excluded.expires_at,version=public.channel_operator_presence.version+1,updated_at=now()
  returning * into result;
  insert into public.channel_workspace_events(
    organization_id,conversation_id,event_type,event_payload
  ) values(
    organization_id_value,p_active_conversation_id,'PRESENCE_CHANGED',
    jsonb_build_object('userId',auth.uid(),'presence',p_presence,'version',result.version)
  );
  return result;
end;
$$;

create or replace function public.set_channel_conversation_actor(
  p_conversation_id uuid,p_actor_kind text
)
returns public.whatsapp_conversations
language plpgsql security definer
set search_path=public,auth,pg_temp
as $$
declare conversation_row public.whatsapp_conversations%rowtype;
declare result public.whatsapp_conversations%rowtype;
begin
  if p_actor_kind not in ('HUMAN','AUTOMATION','AI','SYSTEM') then raise exception 'INVALID_ACTOR_KIND'; end if;
  select * into conversation_row from public.whatsapp_conversations where id=p_conversation_id for update;
  if conversation_row.id is null then raise exception 'CONVERSATION_NOT_FOUND'; end if;
  if not public.has_module_permission(
    conversation_row.organization_id,'whatsapp','EDIT',conversation_row.project_id,null
  ) then raise exception 'ACCESS_DENIED'; end if;
  update public.whatsapp_conversations set
    last_actor_kind=p_actor_kind,
    human_controlled_at=case when p_actor_kind='HUMAN' then now() else human_controlled_at end,
    updated_at=now()
  where id=p_conversation_id returning * into result;
  insert into public.channel_workspace_events(
    organization_id,conversation_id,event_type,event_payload
  ) values(
    result.organization_id,result.id,'ACTOR_CHANGED',jsonb_build_object('actorKind',p_actor_kind)
  );
  return result;
end;
$$;

create or replace function public.set_channel_conversation_state(
  p_conversation_id uuid,p_channel_state text
)
returns public.whatsapp_conversations
language plpgsql security definer
set search_path=public,pg_temp
as $$
declare result public.whatsapp_conversations%rowtype;
begin
  if p_channel_state not in ('ONLINE','OFFLINE','RECONNECTING','DEGRADED','ACTION_REQUIRED') then
    raise exception 'INVALID_CHANNEL_STATE';
  end if;
  update public.whatsapp_conversations set channel_state=p_channel_state,updated_at=now()
  where id=p_conversation_id returning * into result;
  if result.id is null then raise exception 'CONVERSATION_NOT_FOUND'; end if;
  insert into public.channel_workspace_events(
    organization_id,conversation_id,event_type,event_payload
  ) values(result.organization_id,result.id,'CHANNEL_STATE_CHANGED',jsonb_build_object('channelState',p_channel_state));
  return result;
end;
$$;

create or replace view public.channel_inbox_unified_contacts
with (security_invoker=true)
as
select
  conversation.organization_id,
  coalesce(conversation.client_id::text,conversation.contact_id::text) as unified_contact_key,
  max(conversation.last_message_at) as last_message_at,
  sum(coalesce(conversation.unread_count,0))::bigint as unread_count,
  count(*)::bigint as thread_count,
  jsonb_agg(jsonb_build_object(
    'conversationId',conversation.id,
    'contactId',conversation.contact_id,
    'clientId',conversation.client_id,
    'accountId',conversation.account_id,
    'providerType',account.provider_type,
    'providerAccountId',account.provider_account_id,
    'channelState',conversation.channel_state,
    'queueId',conversation.queue_id,
    'assignedTo',conversation.assigned_to,
    'lastActorKind',conversation.last_actor_kind,
    'status',conversation.status,
    'unreadCount',conversation.unread_count,
    'lastMessageAt',conversation.last_message_at
  ) order by conversation.last_message_at desc nulls last) as threads
from public.whatsapp_conversations conversation
join public.whatsapp_accounts account on account.id=conversation.account_id
where conversation.status<>'ARCHIVED'
group by conversation.organization_id,
  coalesce(conversation.client_id::text,conversation.contact_id::text);

grant select on public.channel_inbox_unified_contacts to authenticated,service_role;

alter table public.channel_inbox_queues enable row level security;
alter table public.channel_inbox_queues force row level security;
alter table public.channel_conversation_assignment_events enable row level security;
alter table public.channel_conversation_assignment_events force row level security;
alter table public.channel_conversation_notes enable row level security;
alter table public.channel_conversation_notes force row level security;
alter table public.channel_operator_presence enable row level security;
alter table public.channel_operator_presence force row level security;
alter table public.channel_workspace_events enable row level security;
alter table public.channel_workspace_events force row level security;

create policy channel_inbox_queues_read on public.channel_inbox_queues for select to authenticated
  using(public.has_module_permission(organization_id,'whatsapp','READ',null,null));
create policy channel_assignment_events_read on public.channel_conversation_assignment_events for select to authenticated
  using(public.has_module_permission(organization_id,'whatsapp','READ',null,null));
create policy channel_notes_read on public.channel_conversation_notes for select to authenticated
  using(public.has_module_permission(organization_id,'whatsapp','READ',null,null));
create policy channel_presence_read on public.channel_operator_presence for select to authenticated
  using(public.has_module_permission(organization_id,'whatsapp','READ',null,null));
create policy channel_workspace_events_read on public.channel_workspace_events for select to authenticated
  using(public.has_module_permission(organization_id,'whatsapp','READ',null,null));

revoke insert,update,delete on public.channel_inbox_queues,public.channel_conversation_assignment_events,
  public.channel_conversation_notes,public.channel_operator_presence,public.channel_workspace_events
  from public,anon,authenticated;
revoke all on function public.assign_channel_conversation(uuid,uuid,uuid,bigint,text) from public,anon,authenticated;
revoke all on function public.add_channel_conversation_note(uuid,text) from public,anon,authenticated;
revoke all on function public.set_channel_operator_presence(text,uuid,integer) from public,anon,authenticated;
revoke all on function public.set_channel_conversation_actor(uuid,text) from public,anon,authenticated;
revoke all on function public.set_channel_conversation_state(uuid,text) from public,anon,authenticated;
grant execute on function public.assign_channel_conversation(uuid,uuid,uuid,bigint,text) to authenticated,service_role;
grant execute on function public.add_channel_conversation_note(uuid,text) to authenticated,service_role;
grant execute on function public.set_channel_operator_presence(text,uuid,integer) to authenticated,service_role;
grant execute on function public.set_channel_conversation_actor(uuid,text) to authenticated,service_role;
grant execute on function public.set_channel_conversation_state(uuid,text) to service_role;

commit;
