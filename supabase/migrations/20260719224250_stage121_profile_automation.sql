begin;

create or replace function public.ensure_organization_access_profiles(p_organization_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
begin
  if not exists(select 1 from public.organizations where id=p_organization_id) then
    raise exception 'Organização não encontrada';
  end if;
  insert into public.access_profiles(organization_id,code,name,description,base_role,system,active)
  select p_organization_id,lower(r.role::text),
  case r.role when 'SUPER_ADMIN' then 'Superadministrador' when 'DIRECAO' then 'Direção' when 'ADMINISTRADOR' then 'Administrador' when 'COMERCIAL' then 'Comercial' when 'GESTOR_OBRAS' then 'Gestor de obras' when 'ENGENHEIRO' then 'Engenheiro' when 'ORCAMENTISTA' then 'Orçamentista' when 'FINANCEIRO' then 'Financeiro' when 'QUALIDADE' then 'Qualidade' when 'SAC' then 'SAC' when 'CLIENTE' then 'Cliente' end,
  'Perfil padrão vinculado ao papel '||r.role::text,r.role,true,true
  from (values ('SUPER_ADMIN'::public.org_role),('DIRECAO'::public.org_role),('ADMINISTRADOR'::public.org_role),('COMERCIAL'::public.org_role),('GESTOR_OBRAS'::public.org_role),('ENGENHEIRO'::public.org_role),('ORCAMENTISTA'::public.org_role),('FINANCEIRO'::public.org_role),('QUALIDADE'::public.org_role),('SAC'::public.org_role),('CLIENTE'::public.org_role)) as r(role)
  on conflict(organization_id,code) do nothing;
  update public.organization_memberships om set access_profile_id=ap.id
  from public.access_profiles ap
  where om.organization_id=p_organization_id and ap.organization_id=om.organization_id
    and ap.base_role=om.role and om.access_profile_id is null;
  return true;
end;
$$;

create or replace function public.ensure_organization_access_profiles_trigger()
returns trigger language plpgsql security definer set search_path=public,auth,pg_temp as $$
begin
  perform public.ensure_organization_access_profiles(new.id);
  return new;
end;
$$;

create trigger organizations_access_profiles_after_insert
after insert on public.organizations
for each row execute function public.ensure_organization_access_profiles_trigger();

create or replace function public.resolve_membership_access_profile()
returns trigger language plpgsql security definer set search_path=public,auth,pg_temp as $$
begin
  if new.access_profile_id is null then
    perform public.ensure_organization_access_profiles(new.organization_id);
    select id into new.access_profile_id from public.access_profiles
    where organization_id=new.organization_id and base_role=new.role and active limit 1;
  end if;
  return new;
end;
$$;

create trigger organization_memberships_resolve_access_profile
before insert or update of organization_id,role,access_profile_id on public.organization_memberships
for each row execute function public.resolve_membership_access_profile();

select public.ensure_organization_access_profiles(id) from public.organizations;

commit;
