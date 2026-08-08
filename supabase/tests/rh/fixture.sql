do $$
begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end$$;

create schema if not exists auth;
create table if not exists auth.users(id uuid primary key default gen_random_uuid(),email text);
create or replace function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.user_id',true),'')::uuid$$;

create table if not exists public.organizations(id uuid primary key default gen_random_uuid(),name text not null);
create table if not exists public.organization_memberships(
  organization_id uuid not null references public.organizations(id),
  user_id uuid not null references auth.users(id),
  role text not null default 'ADMIN',
  active boolean not null default true,
  primary key(organization_id,user_id)
);

do $$begin if not exists(select 1 from pg_type where typname='app_access_level') then create type public.app_access_level as enum('NONE','READ','EDIT','DELETE'); end if;end$$;

create or replace function public.has_module_permission(
 p_organization_id uuid,p_module_key text,p_required_level public.app_access_level,p_project_id uuid,p_action text
) returns boolean language sql stable as $$select coalesce(nullif(current_setting('test.permission_granted',true),'')::boolean,true)$$;

create table if not exists public.app_modules(
 id uuid primary key default gen_random_uuid(),
 key text not null unique,
 name text not null,
 description text not null default '',
 category text not null default 'Teste',
 display_order integer not null default 100,
 version text not null default '0.0.0',
 is_core boolean not null default false,
 default_enabled boolean not null default false,
 active boolean not null default true
);
create table if not exists public.app_module_dependencies(
 module_id uuid not null references public.app_modules(id),
 depends_on_module_id uuid not null references public.app_modules(id),
 required boolean not null default true,
 primary key(module_id,depends_on_module_id)
);
insert into public.app_modules(key,name) values('documentos','Documentos'),('financeiro','Financeiro') on conflict(key) do nothing;

grant usage on schema public to anon,authenticated,service_role;
grant usage on schema auth to anon,authenticated,service_role;
