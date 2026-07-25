-- Pré-requisitos mínimos para exercitar as migrations do Object Runtime em um
-- PostgreSQL limpo, sem depender das outras 106 migrations da plataforma.
--
-- O que está aqui é substituto de fronteira, não reimplementação: papéis do
-- Supabase, `auth.uid()`, a tabela de organizações e `has_module_permission`.
-- A função de permissão real é exercitada pelos testes das etapas que a
-- criaram; aqui ela é controlável para que o teste possa provar que a RPC
-- recusa quando a permissão nega.

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

-- Identidade corrente do teste, trocável por `set local`.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$ select nullif(current_setting('test.user_id', true), '')::uuid; $$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

-- Nível de acesso é enum na plataforma, não texto. A fixture espelha a
-- assinatura real, verificada em 25/07/2026 contra o projeto de homologação:
-- has_module_permission(uuid, text, app_access_level, uuid, text). Fixture com
-- assinatura diferente da real deixa passar justamente o erro que ela deveria
-- pegar — uma chamada que não resolve em produção.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_access_level') then
    create type public.app_access_level as enum ('NONE', 'READ', 'EDIT', 'DELETE');
  end if;
end;
$$;

-- Permissão controlável pelo teste: `test.permission_granted` decide.
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

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
