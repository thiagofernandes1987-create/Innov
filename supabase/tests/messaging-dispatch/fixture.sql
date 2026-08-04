-- Fixture de compatibilidade para aplicar a migration oficial de WhatsApp
-- sobre o schema legado mínimo usado pelos testes isolados de mensageria.
-- Não deve ser reutilizada pelos testes W-04 de backfill.

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  legal_name text,
  trade_name text
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  code text,
  name text,
  status text,
  updated_at timestamptz not null default now()
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade
);

create table if not exists public.sac_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade
);

create table if not exists public.app_modules (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  href text,
  icon_key text,
  display_order integer not null default 0,
  active boolean not null default true,
  sensitive boolean not null default false,
  version text not null default '1.0.0',
  category text,
  manifest jsonb not null default '{}'::jsonb,
  default_enabled boolean not null default false,
  is_core boolean not null default false,
  deprecated_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.app_module_dependencies (
  module_id uuid not null references public.app_modules(id) on delete cascade,
  depends_on_module_id uuid not null references public.app_modules(id) on delete cascade,
  minimum_version text,
  required boolean not null default true,
  primary key(module_id,depends_on_module_id)
);

create table if not exists public.organization_modules (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module_id uuid not null references public.app_modules(id) on delete cascade,
  status text not null,
  installed_version text,
  settings jsonb not null default '{}'::jsonb,
  enabled_at timestamptz,
  primary key(organization_id,module_id)
);

create table if not exists public.access_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  base_role text
);

create table if not exists public.profile_module_permissions (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.access_profiles(id) on delete cascade,
  module_id uuid not null references public.app_modules(id) on delete cascade,
  access_level public.app_access_level not null default 'NONE',
  can_approve boolean not null default false,
  can_release boolean not null default false,
  can_sign boolean not null default false,
  can_export boolean not null default false,
  can_administer boolean not null default false,
  can_view_sensitive boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(profile_id,module_id)
);

insert into public.app_modules(key,name,version)
values
  ('clientes','Clientes','1.0.0'),
  ('crm','CRM','1.0.0'),
  ('sac','SAC','1.0.0'),
  ('documentos','Documentos','1.0.0')
on conflict(key) do nothing;

alter table public.whatsapp_contacts
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists profile_name text;

alter table public.whatsapp_conversations
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists contract_id uuid references public.contracts(id) on delete set null,
  add column if not exists opportunity_id uuid references public.opportunities(id) on delete set null,
  add column if not exists sac_ticket_id uuid references public.sac_tickets(id) on delete set null,
  add column if not exists unread_count integer not null default 0,
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.whatsapp_content_bindings
  add column if not exists source_type text,
  add column if not exists source_id uuid,
  add column if not exists source_field text,
  add column if not exists meta_template_name text,
  add column if not exists language_code text not null default 'pt_BR',
  add column if not exists parameter_order text[] not null default '{}',
  add column if not exists variables_schema jsonb not null default '{}'::jsonb,
  add column if not exists active boolean not null default true,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.whatsapp_messages
  add column if not exists caption text,
  add column if not exists source_binding_id uuid references public.whatsapp_content_bindings(id) on delete set null,
  add column if not exists source_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists provider_metadata jsonb not null default '{}'::jsonb,
  add column if not exists error_code text,
  add column if not exists error_message text,
  add column if not exists sent_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists read_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.whatsapp_message_status_events
  add column if not exists provider_timestamp timestamptz,
  add column if not exists error_code text,
  add column if not exists error_title text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.whatsapp_webhook_events
  add column if not exists object_type text,
  add column if not exists event_summary jsonb not null default '{}'::jsonb,
  add column if not exists processed_at timestamptz,
  add column if not exists error_code text;
