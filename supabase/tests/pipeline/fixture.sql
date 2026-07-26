-- Pré-requisitos mínimos para exercitar as migrations de pipeline em um
-- PostgreSQL limpo, sem depender das outras migrations da plataforma.
--
-- Mesma regra da fixture do Object Runtime: substituto de fronteira, não
-- reimplementação. As tabelas de negócio aparecem aqui só com as colunas que
-- as chaves estrangeiras do pipeline exigem — o comportamento delas é testado
-- pelas etapas que as criaram.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
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
as $$ select nullif(current_setting('test.user_id', true), '')::uuid; $$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_access_level') then
    create type public.app_access_level as enum ('NONE', 'READ', 'EDIT', 'DELETE');
  end if;
end;
$$;

-- Permissão controlável pelo teste, com a assinatura real da plataforma:
-- has_module_permission(uuid, text, app_access_level, uuid, text).
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
as $$ select coalesce(nullif(current_setting('test.permission_granted', true), '')::boolean, true); $$;

-- Módulos: o pipeline referencia app_modules(key), então a chave precisa
-- existir e ser única, como no banco real.
create table if not exists public.app_modules (
  key text primary key,
  name text not null
);

insert into public.app_modules(key, name) values
  ('administracao', 'Administração'),
  ('clientes', 'Clientes'),
  ('crm', 'CRM e Vendas'),
  ('obras', 'Obras'),
  ('sac', 'Pós-venda e SAC')
on conflict (key) do nothing;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  legal_name text not null
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  name text not null
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  title text not null
);

create table if not exists public.sac_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null
);

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
