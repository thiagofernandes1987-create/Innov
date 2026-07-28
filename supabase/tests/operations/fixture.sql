create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end;
$$;

create schema if not exists auth;

create table auth.users (
  id uuid primary key,
  email text
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$ select nullif(current_setting('test.user_id', true), '')::uuid; $$;

create type public.org_role as enum (
  'SUPER_ADMIN','DIRECAO','ADMINISTRADOR','COMERCIAL','GESTOR_OBRAS',
  'ENGENHEIRO','ORCAMENTISTA','FINANCEIRO','QUALIDADE','SAC','CLIENTE'
);

create table public.organizations (
  id uuid primary key,
  name text not null
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.org_role not null,
  active boolean not null default true,
  unique (organization_id, user_id)
);

create table public.projects (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null
);

create table public.app_modules (
  key text primary key,
  active boolean not null default true
);

insert into public.app_modules(key) values
  ('planejamento'), ('sac'), ('administracao');

create or replace function public.is_internal_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = p_organization_id
      and membership.user_id = auth.uid()
      and membership.active
      and membership.role <> 'CLIENTE'
  );
$$;

create or replace function public.has_org_role(
  p_organization_id uuid,
  p_roles public.org_role[]
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = p_organization_id
      and membership.user_id = auth.uid()
      and membership.active
      and membership.role = any(p_roles)
  );
$$;

grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
