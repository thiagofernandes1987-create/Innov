-- Etapa 22 / Sprint W-04 — evolução multiprovider sem domínio paralelo.
-- Contatos, conversas e mensagens continuam nas relações whatsapp_* existentes.
-- As relações channel_* abaixo armazenam somente infraestrutura técnica de provider.

begin;

-- ---------------------------------------------------------------------------
-- 1. Projeção provider-neutral nas relações existentes
-- ---------------------------------------------------------------------------

alter table public.whatsapp_accounts
  add column if not exists provider_type text not null default 'META_CLOUD',
  add column if not exists provider_account_id text,
  add column if not exists provider_status text not null default 'ENABLED',
  add column if not exists provider_metadata jsonb not null default '{}'::jsonb,
  add column if not exists config_version bigint not null default 1;

update public.whatsapp_accounts
set provider_account_id=phone_number_id
where provider_account_id is null;

alter table public.whatsapp_accounts
  alter column provider_account_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='whatsapp_accounts_provider_type_check'
  ) then
    alter table public.whatsapp_accounts
      add constraint whatsapp_accounts_provider_type_check check (
        provider_type in (
          'META_CLOUD','WHATSAPP_WEB_BAILEYS','WEB_CHAT',
          'WHATSAPP_WEB_WHATSMEOW','WHATSAPP_WEB_PUPPETEER',
          'EMAIL','CUSTOM'
        )
      );
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname='whatsapp_accounts_provider_status_check'
  ) then
    alter table public.whatsapp_accounts
      add constraint whatsapp_accounts_provider_status_check check (
        provider_status in ('ENABLED','DISABLED','MIGRATING','ROLLED_BACK')
      );
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname='whatsapp_accounts_config_version_check'
  ) then
    alter table public.whatsapp_accounts
      add constraint whatsapp_accounts_config_version_check check (config_version>0);
  end if;
end;
$$;

create unique index if not exists whatsapp_accounts_provider_uidx
  on public.whatsapp_accounts(
    organization_id,provider_type,provider_account_id
  );
create unique index if not exists whatsapp_accounts_id_org_uidx
  on public.whatsapp_accounts(id,organization_id);

alter table public.whatsapp_messages
  add column if not exists provider_type text not null default 'META_CLOUD',
  add column if not exists provider_account_id text;

update public.whatsapp_messages message
set provider_type=account.provider_type,
    provider_account_id=account.provider_account_id
from public.whatsapp_conversations conversation
join public.whatsapp_accounts account on account.id=conversation.account_id
where conversation.id=message.conversation_id
  and message.provider_account_id is null;

alter table public.whatsapp_messages
  alter column provider_account_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='whatsapp_messages_provider_type_check'
  ) then
    alter table public.whatsapp_messages
      add constraint whatsapp_messages_provider_type_check check (
        provider_type in (
          'META_CLOUD','WHATSAPP_WEB_BAILEYS','WEB_CHAT',
          'WHATSAPP_WEB_WHATSMEOW','WHATSAPP_WEB_PUPPETEER',
          'EMAIL','CUSTOM'
        )
      );
  end if;
end;
$$;

drop index if exists public.whatsapp_messages_provider_uidx;
create unique index if not exists whatsapp_messages_provider_scoped_uidx
  on public.whatsapp_messages(
    organization_id,provider_type,provider_account_id,provider_message_id
  ) where provider_message_id is not null;
create unique index if not exists whatsapp_messages_id_org_uidx
  on public.whatsapp_messages(id,organization_id);

alter table public.whatsapp_webhook_events
  add column if not exists provider_type text not null default 'META_CLOUD',
  add column if not exists provider_account_id text;

update public.whatsapp_webhook_events event
set provider_type=account.provider_type,
    provider_account_id=account.provider_account_id
from public.whatsapp_accounts account
where account.id=event.account_id
  and event.provider_account_id is null;

create index if not exists whatsapp_webhook_provider_idx
  on public.whatsapp_webhook_events(
    organization_id,provider_type,provider_account_id,received_at desc
  );

create unique index if not exists whatsapp_contacts_id_org_uidx
  on public.whatsapp_contacts(id,organization_id);
create unique index if not exists whatsapp_conversations_id_org_uidx
  on public.whatsapp_conversations(id,organization_id);

-- ---------------------------------------------------------------------------
-- 2. Identidades externas: aliases ligados ao contato existente
-- ---------------------------------------------------------------------------

create table if not exists public.channel_contact_identities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  account_id uuid not null references public.whatsapp_accounts(id) on delete cascade,
  contact_id uuid not null references public.whatsapp_contacts(id) on delete cascade,
  provider_type text not null,
  provider_account_id text not null,
  namespace text not null check (
    namespace in (
      'PHONE','WHATSAPP_PN','WHATSAPP_LID','GROUP',
      'NEWSLETTER','WEB_USER','EMAIL','CUSTOM'
    )
  ),
  external_id text not null,
  normalized_id text not null,
  device_id text,
  confidence text not null default 'OBSERVED' check (
    confidence in ('OBSERVED','INFERRED','CONFIRMED')
  ),
  is_primary boolean not null default false,
  verified_at timestamptz,
  first_observed_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now(),
  superseded_by uuid references public.channel_contact_identities(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(btrim(external_id))>0),
  check (length(btrim(normalized_id))>0),
  check (last_observed_at>=first_observed_at)
);
create unique index if not exists channel_contact_identity_uidx
  on public.channel_contact_identities(
    organization_id,provider_type,provider_account_id,namespace,
    normalized_id,coalesce(device_id,'')
  ) where active;
create unique index if not exists channel_contact_primary_uidx
  on public.channel_contact_identities(contact_id,namespace)
  where is_primary and active;
create index if not exists channel_contact_identities_account_idx
  on public.channel_contact_identities(account_id,last_observed_at desc);
create index if not exists channel_contact_identities_contact_idx
  on public.channel_contact_identities(contact_id,last_observed_at desc);
create index if not exists channel_contact_identities_superseded_idx
  on public.channel_contact_identities(superseded_by);

create or replace function public.guard_channel_contact_identity_scope()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
declare
  v_organization_id uuid;
  v_account_id uuid;
  v_provider_type text;
  v_provider_account_id text;
begin
  select contact.organization_id,contact.account_id,
         account.provider_type,account.provider_account_id
    into v_organization_id,v_account_id,v_provider_type,v_provider_account_id
  from public.whatsapp_contacts contact
  join public.whatsapp_accounts account on account.id=contact.account_id
  where contact.id=new.contact_id;

  if not found then
    raise exception 'Contato canônico não encontrado.';
  end if;

  if new.organization_id<>v_organization_id
    or new.account_id<>v_account_id
    or new.provider_type<>v_provider_type
    or new.provider_account_id<>v_provider_account_id
  then
    raise exception 'Identidade externa fora do escopo do contato/conta.';
  end if;

  return new;
end;
$$;

drop trigger if exists channel_contact_identity_scope_guard
  on public.channel_contact_identities;
create trigger channel_contact_identity_scope_guard
before insert or update of organization_id,account_id,contact_id,provider_type,provider_account_id
on public.channel_contact_identities
for each row execute function public.guard_channel_contact_identity_scope();

-- ---------------------------------------------------------------------------
-- 3. Comandos, outbox, inbox sanitizada, DLQ e ledger de tentativas
-- ---------------------------------------------------------------------------

create table if not exists public.channel_commands (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  account_id uuid not null references public.whatsapp_accounts(id) on delete restrict,
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete restrict,
  message_id uuid references public.whatsapp_messages(id) on delete restrict,
  provider_type text not null,
  provider_account_id text not null,
  command_type text not null check (
    command_type in (
      'SEND_MESSAGE','DOWNLOAD_MEDIA','RESOLVE_IDENTITY',
      'REFRESH_ACCOUNT','CUSTOM'
    )
  ),
  idempotency_key text not null,
  payload jsonb not null default '{}'::jsonb,
  state text not null default 'PENDING' check (
    state in ('PENDING','CLAIMED','SUCCEEDED','FAILED','CANCELLED')
  ),
  available_at timestamptz not null default now(),
  locked_by text,
  locked_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count>=0),
  max_attempts integer not null default 5 check (max_attempts>0),
  last_error_code text,
  last_error_message text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(btrim(idempotency_key))>0)
);
create unique index if not exists channel_commands_idempotency_uidx
  on public.channel_commands(
    organization_id,provider_type,provider_account_id,idempotency_key
  );
create index if not exists channel_commands_dispatch_idx
  on public.channel_commands(state,available_at,created_at)
  where state in ('PENDING','FAILED');
create index if not exists channel_commands_account_idx
  on public.channel_commands(account_id,created_at desc);
create index if not exists channel_commands_conversation_idx
  on public.channel_commands(conversation_id,created_at desc);
create index if not exists channel_commands_message_idx
  on public.channel_commands(message_id);
create index if not exists channel_commands_created_by_idx
  on public.channel_commands(created_by);

create table if not exists public.channel_outbox_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  command_id uuid not null references public.channel_commands(id) on delete cascade,
  topic text not null,
  payload jsonb not null default '{}'::jsonb,
  state text not null default 'PENDING' check (
    state in ('PENDING','CLAIMED','PUBLISHED','FAILED','CANCELLED')
  ),
  available_at timestamptz not null default now(),
  locked_by text,
  locked_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count>=0),
  last_error text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(command_id,topic)
);
create index if not exists channel_outbox_dispatch_idx
  on public.channel_outbox_events(state,available_at,created_at)
  where state in ('PENDING','FAILED');
create index if not exists channel_outbox_org_idx
  on public.channel_outbox_events(organization_id,created_at desc);

create table if not exists public.channel_inbox_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  account_id uuid not null references public.whatsapp_accounts(id) on delete restrict,
  provider_type text not null,
  provider_account_id text not null,
  event_type text not null,
  provider_event_id text,
  payload_sha256 text not null,
  sanitized_payload jsonb not null default '{}'::jsonb,
  state text not null default 'RECEIVED' check (
    state in ('RECEIVED','PROCESSING','PROCESSED','FAILED','DLQ')
  ),
  occurred_at timestamptz,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error_code text,
  error_message text,
  check (length(payload_sha256)=64)
);
create unique index if not exists channel_inbox_payload_uidx
  on public.channel_inbox_events(
    organization_id,provider_type,provider_account_id,payload_sha256
  );
create unique index if not exists channel_inbox_provider_event_uidx
  on public.channel_inbox_events(
    organization_id,provider_type,provider_account_id,provider_event_id
  ) where provider_event_id is not null;
create index if not exists channel_inbox_processing_idx
  on public.channel_inbox_events(state,received_at)
  where state in ('RECEIVED','FAILED');
create index if not exists channel_inbox_account_idx
  on public.channel_inbox_events(account_id,received_at desc);

create table if not exists public.channel_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  command_id uuid not null references public.channel_commands(id) on delete cascade,
  message_id uuid references public.whatsapp_messages(id) on delete restrict,
  attempt_number integer not null check (attempt_number>0),
  payload_sha256 text not null check (length(payload_sha256)=64),
  failure_class text,
  provider_code text,
  retryable boolean not null default false,
  outcome text not null check (
    outcome in ('SUCCESS','RETRY','TERMINAL','ABORTED')
  ),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  next_attempt_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique(command_id,attempt_number),
  check (finished_at is null or finished_at>=started_at),
  check (not retryable or outcome='RETRY')
);
create index if not exists channel_delivery_attempts_org_idx
  on public.channel_delivery_attempts(organization_id,started_at desc);
create index if not exists channel_delivery_attempts_message_idx
  on public.channel_delivery_attempts(message_id,started_at desc);

create table if not exists public.channel_dead_letters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_kind text not null check (source_kind in ('COMMAND','OUTBOX','INBOX')),
  source_id uuid not null,
  failure_class text not null,
  reason text not null,
  payload_snapshot jsonb not null default '{}'::jsonb,
  state text not null default 'OPEN' check (
    state in ('OPEN','REPLAYED','RESOLVED','DISCARDED')
  ),
  replay_count integer not null default 0 check (replay_count>=0),
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create unique index if not exists channel_dead_letters_open_uidx
  on public.channel_dead_letters(source_kind,source_id)
  where state='OPEN';
create index if not exists channel_dead_letters_org_idx
  on public.channel_dead_letters(organization_id,state,created_at desc);

create table if not exists public.channel_provider_rollbacks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  account_id uuid not null references public.whatsapp_accounts(id) on delete restrict,
  provider_type text not null,
  provider_account_id text not null,
  previous_status text not null,
  reason text not null,
  cancelled_commands integer not null default 0,
  cancelled_outbox_events integer not null default 0,
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (length(btrim(reason))>=8)
);
create index if not exists channel_provider_rollbacks_account_idx
  on public.channel_provider_rollbacks(account_id,created_at desc);
create index if not exists channel_provider_rollbacks_requested_by_idx
  on public.channel_provider_rollbacks(requested_by);

-- Escopo canônico do comando: organização, conta, conversa e mensagem devem coincidir.
create or replace function public.guard_channel_command_scope()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
declare
  v_organization_id uuid;
  v_account_id uuid;
  v_provider_type text;
  v_provider_account_id text;
  v_message_conversation_id uuid;
  v_message_organization_id uuid;
begin
  select conversation.organization_id,conversation.account_id,
         account.provider_type,account.provider_account_id
    into v_organization_id,v_account_id,v_provider_type,v_provider_account_id
  from public.whatsapp_conversations conversation
  join public.whatsapp_accounts account on account.id=conversation.account_id
  where conversation.id=new.conversation_id;

  if not found then
    raise exception 'Conversa canônica não encontrada.';
  end if;

  if new.organization_id<>v_organization_id
    or new.account_id<>v_account_id
    or new.provider_type<>v_provider_type
    or new.provider_account_id<>v_provider_account_id
  then
    raise exception 'Comando fora do escopo da conversa/conta.';
  end if;

  if new.message_id is not null then
    select message.conversation_id,message.organization_id
      into v_message_conversation_id,v_message_organization_id
    from public.whatsapp_messages message
    where message.id=new.message_id;

    if not found
      or v_message_conversation_id<>new.conversation_id
      or v_message_organization_id<>new.organization_id
    then
      raise exception 'Mensagem fora do escopo do comando.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists channel_command_scope_guard on public.channel_commands;
create trigger channel_command_scope_guard
before insert or update of organization_id,account_id,conversation_id,message_id,provider_type,provider_account_id
on public.channel_commands
for each row execute function public.guard_channel_command_scope();

create or replace function public.create_channel_outbox_for_command()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
begin
  insert into public.channel_outbox_events(
    organization_id,command_id,topic,payload
  ) values (
    new.organization_id,new.id,'channel.command.requested.v1',
    jsonb_build_object(
      'commandId',new.id,
      'organizationId',new.organization_id,
      'providerType',new.provider_type,
      'providerAccountId',new.provider_account_id,
      'commandType',new.command_type,
      'conversationId',new.conversation_id,
      'messageId',new.message_id
    )
  ) on conflict(command_id,topic) do nothing;
  return new;
end;
$$;

drop trigger if exists channel_command_create_outbox on public.channel_commands;
create trigger channel_command_create_outbox
after insert on public.channel_commands
for each row execute function public.create_channel_outbox_for_command();

-- ---------------------------------------------------------------------------
-- 4. RLS, privilégio mínimo e portas de escrita
-- ---------------------------------------------------------------------------

alter table public.channel_contact_identities enable row level security;
alter table public.channel_contact_identities force row level security;
alter table public.channel_commands enable row level security;
alter table public.channel_commands force row level security;
alter table public.channel_outbox_events enable row level security;
alter table public.channel_outbox_events force row level security;
alter table public.channel_inbox_events enable row level security;
alter table public.channel_inbox_events force row level security;
alter table public.channel_delivery_attempts enable row level security;
alter table public.channel_delivery_attempts force row level security;
alter table public.channel_dead_letters enable row level security;
alter table public.channel_dead_letters force row level security;
alter table public.channel_provider_rollbacks enable row level security;
alter table public.channel_provider_rollbacks force row level security;

-- As relações históricas existentes também passam a forçar RLS.
alter table public.whatsapp_accounts force row level security;
alter table public.whatsapp_contacts force row level security;
alter table public.whatsapp_conversations force row level security;
alter table public.whatsapp_content_bindings force row level security;
alter table public.whatsapp_messages force row level security;
alter table public.whatsapp_message_status_events force row level security;
alter table public.whatsapp_webhook_events force row level security;

drop policy if exists channel_contact_identities_read on public.channel_contact_identities;
create policy channel_contact_identities_read on public.channel_contact_identities
for select to authenticated using (
  public.has_module_permission(organization_id,'whatsapp','READ',null,null)
);

drop policy if exists channel_commands_read on public.channel_commands;
create policy channel_commands_read on public.channel_commands
for select to authenticated using (
  public.has_module_permission(organization_id,'whatsapp','READ',null,null)
);

drop policy if exists channel_outbox_read on public.channel_outbox_events;
create policy channel_outbox_read on public.channel_outbox_events
for select to authenticated using (
  public.has_module_permission(organization_id,'whatsapp','READ',null,'administer')
);

drop policy if exists channel_inbox_read on public.channel_inbox_events;
create policy channel_inbox_read on public.channel_inbox_events
for select to authenticated using (
  public.has_module_permission(organization_id,'whatsapp','READ',null,'administer')
);

drop policy if exists channel_delivery_attempts_read on public.channel_delivery_attempts;
create policy channel_delivery_attempts_read on public.channel_delivery_attempts
for select to authenticated using (
  public.has_module_permission(organization_id,'whatsapp','READ',null,'administer')
);

drop policy if exists channel_dead_letters_read on public.channel_dead_letters;
create policy channel_dead_letters_read on public.channel_dead_letters
for select to authenticated using (
  public.has_module_permission(organization_id,'whatsapp','READ',null,'administer')
);

drop policy if exists channel_provider_rollbacks_read on public.channel_provider_rollbacks;
create policy channel_provider_rollbacks_read on public.channel_provider_rollbacks
for select to authenticated using (
  public.has_module_permission(organization_id,'whatsapp','READ',null,'administer')
);

revoke all on table
  public.channel_contact_identities,
  public.channel_commands,
  public.channel_outbox_events,
  public.channel_inbox_events,
  public.channel_delivery_attempts,
  public.channel_dead_letters,
  public.channel_provider_rollbacks
from anon;

grant select on table
  public.channel_contact_identities,
  public.channel_commands,
  public.channel_outbox_events,
  public.channel_inbox_events,
  public.channel_delivery_attempts,
  public.channel_dead_letters,
  public.channel_provider_rollbacks
to authenticated;

revoke insert,update,delete on table
  public.channel_contact_identities,
  public.channel_commands,
  public.channel_outbox_events,
  public.channel_inbox_events,
  public.channel_delivery_attempts,
  public.channel_dead_letters,
  public.channel_provider_rollbacks
from authenticated;

-- ---------------------------------------------------------------------------
-- 5. RPCs duráveis e idempotentes
-- ---------------------------------------------------------------------------

create or replace function public.enqueue_channel_command(
  p_conversation_id uuid,
  p_message_id uuid,
  p_command_type text,
  p_payload jsonb,
  p_idempotency_key text
)
returns public.channel_commands
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_conversation public.whatsapp_conversations;
  v_account public.whatsapp_accounts;
  v_command public.channel_commands;
begin
  select * into v_conversation
  from public.whatsapp_conversations
  where id=p_conversation_id
  for share;

  if not found then raise exception 'Conversa não encontrada.'; end if;
  if not public.has_module_permission(
    v_conversation.organization_id,'whatsapp','EDIT',v_conversation.project_id,null
  ) then raise exception 'Acesso negado.'; end if;

  select * into v_account
  from public.whatsapp_accounts
  where id=v_conversation.account_id and active and provider_status='ENABLED';

  if not found then raise exception 'Conta de canal indisponível.'; end if;
  if p_command_type not in (
    'SEND_MESSAGE','DOWNLOAD_MEDIA','RESOLVE_IDENTITY','REFRESH_ACCOUNT','CUSTOM'
  ) then raise exception 'Tipo de comando inválido.'; end if;
  if nullif(btrim(p_idempotency_key),'') is null then
    raise exception 'Idempotency key obrigatória.';
  end if;

  insert into public.channel_commands(
    organization_id,account_id,conversation_id,message_id,
    provider_type,provider_account_id,command_type,idempotency_key,
    payload,created_by
  ) values (
    v_conversation.organization_id,v_account.id,v_conversation.id,p_message_id,
    v_account.provider_type,v_account.provider_account_id,p_command_type,
    btrim(p_idempotency_key),coalesce(p_payload,'{}'::jsonb),auth.uid()
  )
  on conflict(
    organization_id,provider_type,provider_account_id,idempotency_key
  ) do update set idempotency_key=excluded.idempotency_key
  returning * into v_command;

  return v_command;
end;
$$;

create or replace function public.register_channel_inbox_event(
  p_account_id uuid,
  p_event_type text,
  p_provider_event_id text,
  p_payload_sha256 text,
  p_sanitized_payload jsonb,
  p_occurred_at timestamptz default null
)
returns public.channel_inbox_events
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_account public.whatsapp_accounts;
  v_event public.channel_inbox_events;
begin
  select * into v_account from public.whatsapp_accounts where id=p_account_id;
  if not found then raise exception 'Conta de canal não encontrada.'; end if;
  if length(coalesce(p_payload_sha256,''))<>64 then
    raise exception 'SHA-256 inválido.';
  end if;

  insert into public.channel_inbox_events(
    organization_id,account_id,provider_type,provider_account_id,
    event_type,provider_event_id,payload_sha256,sanitized_payload,occurred_at
  ) values (
    v_account.organization_id,v_account.id,v_account.provider_type,
    v_account.provider_account_id,p_event_type,nullif(p_provider_event_id,''),
    lower(p_payload_sha256),coalesce(p_sanitized_payload,'{}'::jsonb),p_occurred_at
  )
  on conflict(
    organization_id,provider_type,provider_account_id,payload_sha256
  ) do update set payload_sha256=excluded.payload_sha256
  returning * into v_event;

  return v_event;
end;
$$;

create or replace function public.claim_channel_outbox_events(
  p_worker_id text,
  p_limit integer default 20
)
returns setof public.channel_outbox_events
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if nullif(btrim(p_worker_id),'') is null then
    raise exception 'Worker obrigatório.';
  end if;
  if p_limit<1 or p_limit>100 then raise exception 'Limite inválido.'; end if;

  return query
  with candidates as (
    select event.id
    from public.channel_outbox_events event
    where event.state in ('PENDING','FAILED')
      and event.available_at<=now()
    order by event.available_at,event.created_at,event.id
    for update skip locked
    limit p_limit
  )
  update public.channel_outbox_events event
  set state='CLAIMED',locked_by=p_worker_id,locked_at=now(),updated_at=now()
  from candidates
  where event.id=candidates.id
  returning event.*;
end;
$$;

create or replace function public.record_channel_delivery_attempt(
  p_command_id uuid,
  p_message_id uuid,
  p_attempt_number integer,
  p_payload_sha256 text,
  p_outcome text,
  p_failure_class text default null,
  p_provider_code text default null,
  p_retryable boolean default false,
  p_next_attempt_at timestamptz default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.channel_delivery_attempts
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_command public.channel_commands;
  v_attempt public.channel_delivery_attempts;
begin
  select * into v_command from public.channel_commands where id=p_command_id;
  if not found then raise exception 'Comando não encontrado.'; end if;
  if length(coalesce(p_payload_sha256,''))<>64 then raise exception 'SHA-256 inválido.'; end if;

  insert into public.channel_delivery_attempts(
    organization_id,command_id,message_id,attempt_number,payload_sha256,
    failure_class,provider_code,retryable,outcome,finished_at,
    next_attempt_at,metadata
  ) values (
    v_command.organization_id,v_command.id,p_message_id,p_attempt_number,
    lower(p_payload_sha256),nullif(p_failure_class,''),nullif(p_provider_code,''),
    p_retryable,p_outcome,now(),p_next_attempt_at,coalesce(p_metadata,'{}'::jsonb)
  )
  on conflict(command_id,attempt_number) do update
    set attempt_number=excluded.attempt_number
  returning * into v_attempt;

  return v_attempt;
end;
$$;

create or replace function public.move_channel_failure_to_dlq(
  p_source_kind text,
  p_source_id uuid,
  p_failure_class text,
  p_reason text,
  p_payload_snapshot jsonb default '{}'::jsonb
)
returns public.channel_dead_letters
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_organization_id uuid;
  v_dead_letter public.channel_dead_letters;
begin
  if p_source_kind='COMMAND' then
    select organization_id into v_organization_id
    from public.channel_commands where id=p_source_id;
  elsif p_source_kind='OUTBOX' then
    select organization_id into v_organization_id
    from public.channel_outbox_events where id=p_source_id;
  elsif p_source_kind='INBOX' then
    select organization_id into v_organization_id
    from public.channel_inbox_events where id=p_source_id;
  else
    raise exception 'Origem de DLQ inválida.';
  end if;

  if v_organization_id is null then raise exception 'Origem de DLQ não encontrada.'; end if;

  insert into public.channel_dead_letters(
    organization_id,source_kind,source_id,failure_class,reason,payload_snapshot
  ) values (
    v_organization_id,p_source_kind,p_source_id,p_failure_class,p_reason,
    coalesce(p_payload_snapshot,'{}'::jsonb)
  )
  on conflict(source_kind,source_id) where state='OPEN'
  do update set
    failure_class=excluded.failure_class,
    reason=excluded.reason,
    payload_snapshot=excluded.payload_snapshot
  returning * into v_dead_letter;

  if p_source_kind='COMMAND' then
    update public.channel_commands set state='FAILED',updated_at=now()
    where id=p_source_id and state<>'CANCELLED';
  elsif p_source_kind='OUTBOX' then
    update public.channel_outbox_events set state='FAILED',updated_at=now()
    where id=p_source_id and state<>'CANCELLED';
  else
    update public.channel_inbox_events set state='DLQ',processed_at=now()
    where id=p_source_id;
  end if;

  return v_dead_letter;
end;
$$;

create or replace function public.rollback_channel_provider_projection(
  p_account_id uuid,
  p_reason text
)
returns public.channel_provider_rollbacks
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_account public.whatsapp_accounts;
  v_cancelled_commands integer:=0;
  v_cancelled_outbox integer:=0;
  v_rollback public.channel_provider_rollbacks;
begin
  select * into v_account
  from public.whatsapp_accounts
  where id=p_account_id
  for update;

  if not found then raise exception 'Conta de canal não encontrada.'; end if;
  if length(btrim(coalesce(p_reason,'')))<8 then raise exception 'Justificativa insuficiente.'; end if;
  if auth.uid() is not null and not public.has_module_permission(
    v_account.organization_id,'whatsapp','EDIT',null,'administer'
  ) then raise exception 'Acesso negado.'; end if;

  update public.channel_commands
  set state='CANCELLED',updated_at=now(),
      last_error_code='PROVIDER_ROLLBACK',last_error_message=p_reason
  where account_id=v_account.id and state in ('PENDING','CLAIMED','FAILED');
  get diagnostics v_cancelled_commands=row_count;

  update public.channel_outbox_events event
  set state='CANCELLED',updated_at=now(),last_error=p_reason
  from public.channel_commands command
  where event.command_id=command.id
    and command.account_id=v_account.id
    and event.state in ('PENDING','CLAIMED','FAILED');
  get diagnostics v_cancelled_outbox=row_count;

  update public.whatsapp_accounts
  set provider_status='ROLLED_BACK',active=false,
      config_version=config_version+1,updated_at=now()
  where id=v_account.id;

  insert into public.channel_provider_rollbacks(
    organization_id,account_id,provider_type,provider_account_id,
    previous_status,reason,cancelled_commands,cancelled_outbox_events,requested_by
  ) values (
    v_account.organization_id,v_account.id,v_account.provider_type,
    v_account.provider_account_id,v_account.provider_status,btrim(p_reason),
    v_cancelled_commands,v_cancelled_outbox,auth.uid()
  ) returning * into v_rollback;

  return v_rollback;
end;
$$;

revoke all on function public.enqueue_channel_command(uuid,uuid,text,jsonb,text)
  from public,anon;
grant execute on function public.enqueue_channel_command(uuid,uuid,text,jsonb,text)
  to authenticated,service_role;

revoke all on function public.register_channel_inbox_event(
  uuid,text,text,text,jsonb,timestamptz
) from public,anon,authenticated;
grant execute on function public.register_channel_inbox_event(
  uuid,text,text,text,jsonb,timestamptz
) to service_role;

revoke all on function public.claim_channel_outbox_events(text,integer)
  from public,anon,authenticated;
grant execute on function public.claim_channel_outbox_events(text,integer)
  to service_role;

revoke all on function public.record_channel_delivery_attempt(
  uuid,uuid,integer,text,text,text,text,boolean,timestamptz,jsonb
) from public,anon,authenticated;
grant execute on function public.record_channel_delivery_attempt(
  uuid,uuid,integer,text,text,text,text,boolean,timestamptz,jsonb
) to service_role;

revoke all on function public.move_channel_failure_to_dlq(
  text,uuid,text,text,jsonb
) from public,anon,authenticated;
grant execute on function public.move_channel_failure_to_dlq(
  text,uuid,text,text,jsonb
) to service_role;

revoke all on function public.rollback_channel_provider_projection(uuid,text)
  from public,anon;
grant execute on function public.rollback_channel_provider_projection(uuid,text)
  to authenticated,service_role;

revoke all on function public.guard_channel_contact_identity_scope()
  from public,anon,authenticated;
revoke all on function public.guard_channel_command_scope()
  from public,anon,authenticated;
revoke all on function public.create_channel_outbox_for_command()
  from public,anon,authenticated;

commit;
