-- Fixture mínima para a Sprint W-04 em PostgreSQL limpo.
-- Modela somente as fronteiras exigidas pela migration multiprovider.

do $$
begin
  if not exists (select 1 from pg_roles where rolname='anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then
    create role service_role nologin bypassrls;
  end if;
end;
$$;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('test.user_id',true),'')::uuid;
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname='app_access_level') then
    create type public.app_access_level as enum ('NONE','READ','EDIT','DELETE');
  end if;
end;
$$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create or replace function public.has_module_permission(
  p_organization_id uuid,
  p_module_key text,
  p_required_level public.app_access_level,
  p_project_id uuid,
  p_action text
)
returns boolean
language sql
stable
as $$
  select
    p_module_key='whatsapp'
    and coalesce(nullif(current_setting('test.permission_granted',true),'')::boolean,true)
    and (
      nullif(current_setting('test.organization_id',true),'') is null
      or p_organization_id=nullif(current_setting('test.organization_id',true),'')::uuid
    );
$$;

create table public.whatsapp_accounts (
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
  unique(organization_id,phone_number_id)
);

create table public.whatsapp_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  account_id uuid not null references public.whatsapp_accounts(id) on delete cascade,
  wa_id text not null,
  phone_e164 text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,account_id,wa_id)
);

create table public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  account_id uuid not null references public.whatsapp_accounts(id) on delete cascade,
  contact_id uuid not null references public.whatsapp_contacts(id) on delete cascade,
  project_id uuid,
  status text not null default 'OPEN',
  last_customer_message_at timestamptz,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.whatsapp_content_bindings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  direction text not null default 'OUTBOUND',
  message_type text not null default 'TEXT',
  status text not null default 'QUEUED',
  provider_message_id text,
  idempotency_key text,
  body text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index whatsapp_messages_provider_uidx
  on public.whatsapp_messages(provider_message_id)
  where provider_message_id is not null;

create table public.whatsapp_message_status_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  message_id uuid not null references public.whatsapp_messages(id) on delete cascade,
  status text not null,
  created_at timestamptz not null default now()
);

create table public.whatsapp_webhook_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  account_id uuid references public.whatsapp_accounts(id) on delete set null,
  payload_sha256 text not null unique,
  received_at timestamptz not null default now()
);

-- Políticas mínimas das relações legadas para que FORCE RLS da W-04 possa ser testado.
foreach_table: do $$
declare
  relation text;
begin
  foreach relation in array array[
    'whatsapp_accounts','whatsapp_contacts','whatsapp_conversations',
    'whatsapp_content_bindings','whatsapp_messages',
    'whatsapp_message_status_events','whatsapp_webhook_events'
  ] loop
    execute format('alter table public.%I enable row level security',relation);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.has_module_permission(organization_id,''whatsapp'',''READ'',null,null))',
      relation||'_fixture_read',relation
    );
    execute format('grant select on public.%I to authenticated',relation);
  end loop;
end;
$$;

grant usage on schema public,auth to anon,authenticated,service_role;
