begin;

create table public.role_module_defaults (
  role public.org_role not null,
  module_id uuid not null references public.app_modules(id) on delete cascade,
  access_level public.app_access_level not null default 'NONE',
  can_approve boolean not null default false,
  can_release boolean not null default false,
  can_sign boolean not null default false,
  can_export boolean not null default false,
  can_administer boolean not null default false,
  can_view_sensitive boolean not null default false,
  primary key(role,module_id)
);

insert into public.role_module_defaults(
  role,module_id,access_level,can_approve,can_release,can_sign,
  can_export,can_administer,can_view_sensitive
)
select distinct on (ap.base_role,pmp.module_id)
  ap.base_role,pmp.module_id,pmp.access_level,pmp.can_approve,pmp.can_release,
  pmp.can_sign,pmp.can_export,pmp.can_administer,pmp.can_view_sensitive
from public.profile_module_permissions pmp
join public.access_profiles ap on ap.id=pmp.profile_id
where ap.system and ap.base_role is not null
order by ap.base_role,pmp.module_id,ap.created_at
on conflict(role,module_id) do update set
  access_level=excluded.access_level,
  can_approve=excluded.can_approve,
  can_release=excluded.can_release,
  can_sign=excluded.can_sign,
  can_export=excluded.can_export,
  can_administer=excluded.can_administer,
  can_view_sensitive=excluded.can_view_sensitive;

create or replace function public.seed_organization_access(p_organization_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
begin
  if not exists(select 1 from public.organizations where id=p_organization_id) then
    raise exception 'Organização não encontrada';
  end if;

  insert into public.access_profiles(
    organization_id,code,name,description,base_role,system,active
  )
  select
    p_organization_id,
    lower(r.role::text),
    case r.role
      when 'SUPER_ADMIN' then 'Superadministrador'
      when 'DIRECAO' then 'Direção'
      when 'ADMINISTRADOR' then 'Administrador'
      when 'COMERCIAL' then 'Comercial'
      when 'GESTOR_OBRAS' then 'Gestor de obras'
      when 'ENGENHEIRO' then 'Engenheiro'
      when 'ORCAMENTISTA' then 'Orçamentista'
      when 'FINANCEIRO' then 'Financeiro'
      when 'QUALIDADE' then 'Qualidade'
      when 'SAC' then 'SAC'
      when 'CLIENTE' then 'Cliente'
    end,
    'Perfil padrão vinculado ao papel ' || r.role::text,
    r.role,true,true
  from (
    values
      ('SUPER_ADMIN'::public.org_role),('DIRECAO'::public.org_role),
      ('ADMINISTRADOR'::public.org_role),('COMERCIAL'::public.org_role),
      ('GESTOR_OBRAS'::public.org_role),('ENGENHEIRO'::public.org_role),
      ('ORCAMENTISTA'::public.org_role),('FINANCEIRO'::public.org_role),
      ('QUALIDADE'::public.org_role),('SAC'::public.org_role),
      ('CLIENTE'::public.org_role)
  ) as r(role)
  on conflict(organization_id,code) do nothing;

  insert into public.profile_module_permissions(
    organization_id,profile_id,module_id,access_level,can_approve,
    can_release,can_sign,can_export,can_administer,can_view_sensitive
  )
  select
    p_organization_id,ap.id,d.module_id,d.access_level,d.can_approve,
    d.can_release,d.can_sign,d.can_export,d.can_administer,d.can_view_sensitive
  from public.access_profiles ap
  join public.role_module_defaults d on d.role=ap.base_role
  where ap.organization_id=p_organization_id
  on conflict(profile_id,module_id) do nothing;

  update public.organization_memberships om
  set access_profile_id=ap.id
  from public.access_profiles ap
  where om.organization_id=p_organization_id
    and ap.organization_id=om.organization_id
    and ap.base_role=om.role
    and om.access_profile_id is null;

  return true;
end;
$$;

create or replace function public.seed_organization_access_trigger()
returns trigger
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
begin
  perform public.seed_organization_access(new.id);
  return new;
end;
$$;

create trigger organizations_seed_access_after_insert
after insert on public.organizations
for each row execute function public.seed_organization_access_trigger();

create or replace function public.resolve_membership_access_profile()
returns trigger
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
begin
  if new.access_profile_id is null then
    perform public.seed_organization_access(new.organization_id);
    select id into new.access_profile_id
    from public.access_profiles
    where organization_id=new.organization_id
      and base_role=new.role
      and active
    limit 1;
  end if;
  return new;
end;
$$;

create trigger organization_memberships_resolve_access_profile
before insert or update of organization_id,role,access_profile_id
on public.organization_memberships
for each row execute function public.resolve_membership_access_profile();

select public.seed_organization_access(id) from public.organizations;

commit;
