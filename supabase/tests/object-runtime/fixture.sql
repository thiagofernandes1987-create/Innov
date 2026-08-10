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
--
-- **E a ação é conferida contra o vocabulário fechado da função real.** A
-- versão anterior devolvia o booleano do teste para qualquer ação, inclusive
-- uma inexistente — e foi por isso que os catorze testes passaram enquanto
-- `publish_object_definition` pedia a ação `'configure'`, que a função de
-- produção resolve no `else false`. Fixture mais permissiva que a realidade
-- não é substituto de fronteira: é uma segunda implementação, mais frouxa,
-- que aprova o que a real recusa. Ver VACINA-058.
--
-- O vocabulário abaixo foi lido da função real do projeto de homologação em
-- 03/08/2026. A definição dela não tem arquivo de migration no repositório —
-- é uma das 55 aplicações sem arquivo que a S-22 tem de reconstruir.
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
  select case
    when coalesce(p_action, '') = '' then true
    when lower(p_action) in ('approve','release','sign','export','administer','sensitive') then true
    else false
  end
  and coalesce(nullif(current_setting('test.permission_granted', true), '')::boolean, true);
$$;

-- Catálogo de aplicativos. A RPC de registro valida `parent_kind` contra ele
-- (§7.2: `parent_id` não tem chave estrangeira, porque não existe FK que aponte
-- para várias tabelas).
--
-- **Sem esta tabela o teste do pai passava pelo motivo errado**: qualquer
-- `parent_kind` era recusado, inclusive um válido, porque a consulta estourava
-- em "relation app_modules does not exist". Teste que só prova recusa não
-- distingue "recusa o inválido" de "recusa tudo" — mesma família da VACINA-058.
create table if not exists public.app_modules (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  active boolean not null default true
);

insert into public.app_modules(key, name) values
  ('qualidade', 'Qualidade'),
  ('obras', 'Obras'),
  ('administracao', 'Administração')
on conflict (key) do nothing;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
