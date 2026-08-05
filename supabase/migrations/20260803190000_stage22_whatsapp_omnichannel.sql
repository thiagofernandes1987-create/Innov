-- Etapa 22 — WhatsApp oficial, atendimento omnichannel e fontes canônicas.
-- O conteúdo padrão não é duplicado: cada binding referencia uma versão existente
-- de modelo/documento e cada envio conserva somente o snapshot efetivamente transmitido.

begin;

create table if not exists public.whatsapp_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  waba_id text not null,
  phone_number_id text not null,
  display_phone_number text,
  business_name text,
  active boolean not null default true,
  is_default boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, phone_number_id)
);
create unique index if not exists whatsapp_accounts_phone_number_uidx
  on public.whatsapp_accounts(phone_number_id);
create unique index if not exists whatsapp_accounts_default_uidx
  on public.whatsapp_accounts(organization_id) where is_default and active;

create table if not exists public.whatsapp_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  account_id uuid not null references public.whatsapp_accounts(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  wa_id text not null,
  phone_e164 text not null,
  display_name text,
  profile_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, account_id, wa_id)
);
create index if not exists whatsapp_contacts_client_idx
  on public.whatsapp_contacts(client_id);
create index if not exists whatsapp_contacts_account_idx
  on public.whatsapp_contacts(account_id, updated_at desc);

create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  account_id uuid not null references public.whatsapp_accounts(id) on delete cascade,
  contact_id uuid not null references public.whatsapp_contacts(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  contract_id uuid references public.contracts(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  sac_ticket_id uuid references public.sac_tickets(id) on delete set null,
  status text not null default 'OPEN' check (status in ('OPEN','PENDING','CLOSED')),
  assigned_to uuid references auth.users(id) on delete set null,
  last_customer_message_at timestamptz,
  last_message_at timestamptz,
  unread_count integer not null default 0 check (unread_count >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists whatsapp_conversations_queue_idx
  on public.whatsapp_conversations(organization_id,status,last_message_at desc);
create index if not exists whatsapp_conversations_contact_idx
  on public.whatsapp_conversations(contact_id,status);
create index if not exists whatsapp_conversations_project_idx
  on public.whatsapp_conversations(project_id);
create index if not exists whatsapp_conversations_client_idx
  on public.whatsapp_conversations(client_id);
create index if not exists whatsapp_conversations_contract_idx
  on public.whatsapp_conversations(contract_id);
create index if not exists whatsapp_conversations_opportunity_idx
  on public.whatsapp_conversations(opportunity_id);
create index if not exists whatsapp_conversations_ticket_idx
  on public.whatsapp_conversations(sac_ticket_id);
create index if not exists whatsapp_conversations_assigned_idx
  on public.whatsapp_conversations(assigned_to,status);

create unique index if not exists whatsapp_open_conversation_uidx
  on public.whatsapp_conversations(account_id,contact_id)
  where status in ('OPEN','PENDING');

create table if not exists public.whatsapp_content_bindings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  source_type text not null check (
    source_type in (
      'CONTRACT_TEMPLATE','PROPOSAL_VERSION','CONTRACT_VERSION',
      'AMENDMENT_VERSION','PROJECT_DOCUMENT_VERSION'
    )
  ),
  source_id uuid not null,
  source_field text not null,
  meta_template_name text,
  language_code text not null default 'pt_BR',
  parameter_order text[] not null default '{}',
  variables_schema jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);
create index if not exists whatsapp_content_bindings_source_idx
  on public.whatsapp_content_bindings(organization_id,source_type,source_id,active);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  direction text not null check (direction in ('INBOUND','OUTBOUND')),
  message_type text not null default 'TEXT' check (
    message_type in ('TEXT','TEMPLATE','DOCUMENT','IMAGE','AUDIO','INTERACTIVE','UNKNOWN')
  ),
  status text not null check (
    status in ('QUEUED','SENT','DELIVERED','READ','FAILED','RECEIVED')
  ),
  provider_message_id text,
  body text,
  caption text,
  source_binding_id uuid references public.whatsapp_content_bindings(id) on delete set null,
  source_snapshot jsonb not null default '{}'::jsonb,
  provider_metadata jsonb not null default '{}'::jsonb,
  idempotency_key text,
  error_code text,
  error_message text,
  occurred_at timestamptz not null default now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists whatsapp_messages_provider_uidx
  on public.whatsapp_messages(provider_message_id)
  where provider_message_id is not null;
create unique index if not exists whatsapp_messages_idempotency_uidx
  on public.whatsapp_messages(organization_id,idempotency_key)
  where idempotency_key is not null;
create index if not exists whatsapp_messages_conversation_idx
  on public.whatsapp_messages(conversation_id,occurred_at desc);
create index if not exists whatsapp_messages_binding_idx
  on public.whatsapp_messages(source_binding_id);

create table if not exists public.whatsapp_message_status_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  message_id uuid not null references public.whatsapp_messages(id) on delete cascade,
  status text not null,
  provider_timestamp timestamptz,
  error_code text,
  error_title text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create unique index if not exists whatsapp_status_event_uidx
  on public.whatsapp_message_status_events(
    message_id,status,coalesce(provider_timestamp,'epoch'::timestamptz)
  );
create index if not exists whatsapp_status_events_org_idx
  on public.whatsapp_message_status_events(organization_id,created_at desc);

create table if not exists public.whatsapp_webhook_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  account_id uuid references public.whatsapp_accounts(id) on delete set null,
  payload_sha256 text not null unique,
  object_type text,
  event_summary jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error_code text
);
create index if not exists whatsapp_webhook_events_org_idx
  on public.whatsapp_webhook_events(organization_id,received_at desc);
create index if not exists whatsapp_webhook_events_pending_idx
  on public.whatsapp_webhook_events(received_at)
  where processed_at is null;

alter table public.whatsapp_accounts enable row level security;
alter table public.whatsapp_contacts enable row level security;
alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_content_bindings enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.whatsapp_message_status_events enable row level security;
alter table public.whatsapp_webhook_events enable row level security;

drop policy if exists whatsapp_accounts_read on public.whatsapp_accounts;
create policy whatsapp_accounts_read on public.whatsapp_accounts
for select to authenticated using (
  public.has_module_permission(organization_id,'whatsapp','READ',null,null)
);
drop policy if exists whatsapp_accounts_admin on public.whatsapp_accounts;
create policy whatsapp_accounts_admin on public.whatsapp_accounts
for all to authenticated using (
  public.has_module_permission(organization_id,'whatsapp','EDIT',null,'administer')
) with check (
  public.has_module_permission(organization_id,'whatsapp','EDIT',null,'administer')
);

drop policy if exists whatsapp_contacts_read on public.whatsapp_contacts;
create policy whatsapp_contacts_read on public.whatsapp_contacts
for select to authenticated using (
  public.has_module_permission(organization_id,'whatsapp','READ',null,null)
);
drop policy if exists whatsapp_contacts_write on public.whatsapp_contacts;
create policy whatsapp_contacts_write on public.whatsapp_contacts
for all to authenticated using (
  public.has_module_permission(organization_id,'whatsapp','EDIT',null,null)
) with check (
  public.has_module_permission(organization_id,'whatsapp','EDIT',null,null)
);

drop policy if exists whatsapp_conversations_read on public.whatsapp_conversations;
create policy whatsapp_conversations_read on public.whatsapp_conversations
for select to authenticated using (
  public.has_module_permission(organization_id,'whatsapp','READ',project_id,null)
);
drop policy if exists whatsapp_conversations_write on public.whatsapp_conversations;
create policy whatsapp_conversations_write on public.whatsapp_conversations
for all to authenticated using (
  public.has_module_permission(organization_id,'whatsapp','EDIT',project_id,null)
) with check (
  public.has_module_permission(organization_id,'whatsapp','EDIT',project_id,null)
);

drop policy if exists whatsapp_bindings_read on public.whatsapp_content_bindings;
create policy whatsapp_bindings_read on public.whatsapp_content_bindings
for select to authenticated using (
  public.has_module_permission(organization_id,'whatsapp','READ',null,null)
);
drop policy if exists whatsapp_bindings_admin on public.whatsapp_content_bindings;
create policy whatsapp_bindings_admin on public.whatsapp_content_bindings
for all to authenticated using (
  public.has_module_permission(organization_id,'whatsapp','EDIT',null,'administer')
) with check (
  public.has_module_permission(organization_id,'whatsapp','EDIT',null,'administer')
);

drop policy if exists whatsapp_messages_read on public.whatsapp_messages;
create policy whatsapp_messages_read on public.whatsapp_messages
for select to authenticated using (
  exists (
    select 1
    from public.whatsapp_conversations conversation
    where conversation.id=whatsapp_messages.conversation_id
      and public.has_module_permission(
        conversation.organization_id,'whatsapp','READ',conversation.project_id,null
      )
  )
);

drop policy if exists whatsapp_status_events_read on public.whatsapp_message_status_events;
create policy whatsapp_status_events_read on public.whatsapp_message_status_events
for select to authenticated using (
  public.has_module_permission(organization_id,'whatsapp','READ',null,null)
);

drop policy if exists whatsapp_webhook_events_admin on public.whatsapp_webhook_events;
create policy whatsapp_webhook_events_admin on public.whatsapp_webhook_events
for select to authenticated using (
  organization_id is not null
  and public.has_module_permission(organization_id,'whatsapp','READ',null,'administer')
);

-- Mensagens e eventos do provedor são históricos. O usuário escreve por RPC;
-- o webhook usa service_role.
revoke insert,update,delete on public.whatsapp_messages from authenticated;
revoke insert,update,delete on public.whatsapp_message_status_events from authenticated;
revoke insert,update,delete on public.whatsapp_webhook_events from authenticated;

create or replace function public.queue_whatsapp_outbound_message(
  p_conversation_id uuid,
  p_message_type text,
  p_body text,
  p_caption text,
  p_source_binding_id uuid,
  p_source_snapshot jsonb,
  p_idempotency_key text
)
returns public.whatsapp_messages
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_conversation public.whatsapp_conversations;
  v_message public.whatsapp_messages;
begin
  select *
    into v_conversation
  from public.whatsapp_conversations
  where id=p_conversation_id
  for update;

  if not found then
    raise exception 'Conversa não encontrada.';
  end if;

  if not public.has_module_permission(
    v_conversation.organization_id,'whatsapp','EDIT',v_conversation.project_id,null
  ) then
    raise exception 'Acesso negado.';
  end if;

  if p_message_type not in ('TEXT','TEMPLATE','DOCUMENT') then
    raise exception 'Tipo de mensagem não suportado.';
  end if;

  if p_message_type<>'TEMPLATE'
    and (
      v_conversation.last_customer_message_at is null
      or v_conversation.last_customer_message_at < now()-interval '24 hours'
    )
  then
    raise exception 'Fora da janela de atendimento. Utilize um template aprovado.';
  end if;

  insert into public.whatsapp_messages(
    organization_id,conversation_id,direction,message_type,status,
    body,caption,source_binding_id,source_snapshot,idempotency_key,created_by
  ) values (
    v_conversation.organization_id,v_conversation.id,'OUTBOUND',p_message_type,'QUEUED',
    nullif(p_body,''),nullif(p_caption,''),p_source_binding_id,
    coalesce(p_source_snapshot,'{}'::jsonb),nullif(p_idempotency_key,''),auth.uid()
  )
  on conflict(organization_id,idempotency_key)
    where idempotency_key is not null
  do update set idempotency_key=excluded.idempotency_key
  returning * into v_message;

  update public.whatsapp_conversations
  set last_message_at=greatest(coalesce(last_message_at,'epoch'::timestamptz),v_message.occurred_at),
      updated_at=now()
  where id=v_conversation.id;

  return v_message;
end;
$$;

revoke all on function public.queue_whatsapp_outbound_message(
  uuid,text,text,text,uuid,jsonb,text
) from public,anon;
grant execute on function public.queue_whatsapp_outbound_message(
  uuid,text,text,text,uuid,jsonb,text
) to authenticated,service_role;

create or replace function public.complete_whatsapp_outbound_message(
  p_message_id uuid,
  p_provider_message_id text,
  p_status text,
  p_error_code text default null,
  p_error_message text default null
)
returns public.whatsapp_messages
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_message public.whatsapp_messages;
begin
  if p_status not in ('SENT','FAILED') then
    raise exception 'Estado de conclusão inválido.';
  end if;

  update public.whatsapp_messages
  set provider_message_id=coalesce(nullif(p_provider_message_id,''),provider_message_id),
      status=p_status,
      sent_at=case when p_status='SENT' then coalesce(sent_at,now()) else sent_at end,
      failed_at=case when p_status='FAILED' then coalesce(failed_at,now()) else failed_at end,
      error_code=case when p_status='FAILED' then nullif(p_error_code,'') else null end,
      error_message=case when p_status='FAILED' then nullif(p_error_message,'') else null end
  where id=p_message_id
  returning * into v_message;

  if not found then
    raise exception 'Mensagem não encontrada.';
  end if;

  return v_message;
end;
$$;

revoke all on function public.complete_whatsapp_outbound_message(
  uuid,text,text,text,text
) from public,anon,authenticated;
grant execute on function public.complete_whatsapp_outbound_message(
  uuid,text,text,text,text
) to service_role;

-- Catálogo modular.
insert into public.app_modules(
  key,name,description,href,icon_key,display_order,active,sensitive,
  version,category,manifest,default_enabled,is_core
) values (
  'whatsapp','WhatsApp e Atendimento',
  'Caixa omnichannel oficial vinculada a CRM, clientes, obras, contratos, SAC, modelos e documentos.',
  '/app/whatsapp','chat-circle-dots',185,true,true,
  '1.0.0','ATENDIMENTO',
  jsonb_build_object(
    'navigationLabel','WhatsApp',
    'provider','meta-cloud-api',
    'canonicalContent',true,
    'dependencies',jsonb_build_array('clientes','crm','sac','documentos')
  ),
  false,false
)
on conflict(key) do update set
  name=excluded.name,
  description=excluded.description,
  href=excluded.href,
  icon_key=excluded.icon_key,
  display_order=excluded.display_order,
  active=true,
  sensitive=true,
  version=excluded.version,
  category=excluded.category,
  manifest=excluded.manifest,
  deprecated_at=null,
  updated_at=now();

insert into public.app_module_dependencies(module_id,depends_on_module_id,minimum_version,required)
select module.id,dependency.id,'1.0.0',true
from (values
  ('whatsapp','clientes'),
  ('whatsapp','crm'),
  ('whatsapp','sac'),
  ('whatsapp','documentos')
) dependency_map(module_key,dependency_key)
join public.app_modules module on module.key=dependency_map.module_key
join public.app_modules dependency on dependency.key=dependency_map.dependency_key
on conflict(module_id,depends_on_module_id) do update set
  minimum_version=excluded.minimum_version,
  required=excluded.required;

create or replace function public.install_whatsapp_defaults(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
begin
  insert into public.organization_modules(
    organization_id,module_id,status,installed_version,settings,enabled_at
  )
  select p_organization_id,module.id,'ENABLED',module.version,
    jsonb_build_object(
      'provider','meta-cloud-api',
      'canonicalContentOnly',true,
      'freeFormWindowHours',24
    ),
    now()
  from public.app_modules module
  where module.key='whatsapp'
  on conflict(organization_id,module_id) do nothing;

  insert into public.profile_module_permissions(
    organization_id,profile_id,module_id,access_level,
    can_approve,can_release,can_sign,can_export,can_administer,can_view_sensitive
  )
  select profile.organization_id,profile.id,module.id,
    case
      when profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR')
        then 'DELETE'::public.app_access_level
      when profile.base_role in ('COMERCIAL','SAC')
        then 'EDIT'::public.app_access_level
      when profile.base_role in (
        'GESTOR_OBRAS','ENGENHEIRO','ORCAMENTISTA','FINANCEIRO'
      )
        then 'READ'::public.app_access_level
      else 'NONE'::public.app_access_level
    end,
    false,false,false,
    profile.base_role in (
      'SUPER_ADMIN','DIRECAO','ADMINISTRADOR','COMERCIAL','SAC'
    ),
    profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR'),
    profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR','COMERCIAL','SAC')
  from public.access_profiles profile
  join public.app_modules module on module.key='whatsapp'
  where profile.organization_id=p_organization_id
    and profile.base_role is not null
  on conflict(profile_id,module_id) do update set
    access_level=excluded.access_level,
    can_approve=excluded.can_approve,
    can_release=excluded.can_release,
    can_sign=excluded.can_sign,
    can_export=excluded.can_export,
    can_administer=excluded.can_administer,
    can_view_sensitive=excluded.can_view_sensitive,
    updated_at=now();
end;
$$;

create or replace function public.install_whatsapp_defaults_after_organization()
returns trigger
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
begin
  perform public.install_whatsapp_defaults(new.id);
  return new;
end;
$$;

drop trigger if exists organizations_install_whatsapp_defaults on public.organizations;
create trigger organizations_install_whatsapp_defaults
after insert on public.organizations
for each row execute function public.install_whatsapp_defaults_after_organization();

select public.install_whatsapp_defaults(id) from public.organizations;

revoke all on function public.install_whatsapp_defaults(uuid)
  from public,anon,authenticated;
revoke all on function public.install_whatsapp_defaults_after_organization()
  from public,anon,authenticated;
grant execute on function public.install_whatsapp_defaults(uuid) to service_role;

commit;
