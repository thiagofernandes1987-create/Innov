-- Bootstrap mínimo para replay das migrations do repositório em PostgreSQL limpo.
-- Reproduz o que o Supabase provê antes da primeira migration do projeto:
-- papéis, esquemas `auth`, `storage` e `extensions`, e as funções de identidade.
--
-- Não reimplementa regra de negócio. Serve para responder uma pergunta só:
-- o repositório, sozinho, constrói o esquema da plataforma?

do $$
begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin noinherit bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname='supabase_auth_admin') then create role supabase_auth_admin nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='authenticator') then create role authenticator nologin noinherit; end if;
end;
$$;

create schema if not exists auth;
create schema if not exists storage;
create schema if not exists extensions;

create extension if not exists pgcrypto with schema extensions;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function auth.uid() returns uuid
language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid; $$;

create or replace function auth.role() returns text
language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon'); $$;

create or replace function auth.email() returns text
language sql stable as $$ select nullif(current_setting('request.jwt.claim.email', true), ''); $$;

create or replace function auth.jwt() returns jsonb
language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb); $$;

-- Colunas conforme o `storage.buckets` real do Supabase. Stub incompleto faz a
-- migration falhar por defeito da fixture, e não do repositório — foi o que
-- aconteceu na primeira tentativa, em `file_size_limit`.
create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  owner uuid,
  owner_id text,
  public boolean not null default false,
  avif_autodetection boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create or replace function storage.foldername(name text) returns text[]
language sql immutable as $$ select string_to_array(name, '/'); $$;

create or replace function storage.filename(name text) returns text
language sql immutable as $$ select (string_to_array(name, '/'))[array_length(string_to_array(name, '/'), 1)]; $$;

grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;
