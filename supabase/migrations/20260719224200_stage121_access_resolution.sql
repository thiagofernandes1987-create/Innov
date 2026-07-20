begin;

create or replace function public.default_role_module_permission(
  p_role public.org_role,
  p_module_key text
) returns table(
  access_level public.app_access_level,
  can_approve boolean,
  can_release boolean,
  can_sign boolean,
  can_export boolean,
  can_administer boolean,
  can_view_sensitive boolean
)
language sql
immutable
set search_path=public,pg_temp
as $$
  select
    case
      when p_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR') then (enum_range(null::public.app_access_level))[4]
      when p_role='COMERCIAL' and p_module_key in ('crm','clientes','propostas') then 'EDIT'::public.app_access_level
      when p_role='COMERCIAL' and p_module_key in ('obras','contratos','assinaturas','relatorios') then 'READ'::public.app_access_level
      when p_role='GESTOR_OBRAS' and p_module_key in ('obras','planejamento','tarefas','diario','equipes','documentos','qualidade') then 'EDIT'::public.app_access_level
      when p_role='GESTOR_OBRAS' and p_module_key in ('clientes','contratos','assinaturas','relatorios') then 'READ'::public.app_access_level
      when p_role='ENGENHEIRO' and p_module_key in ('obras','planejamento','tarefas','diario','documentos','qualidade') then 'EDIT'::public.app_access_level
      when p_role='ENGENHEIRO' and p_module_key in ('clientes','equipes','relatorios') then 'READ'::public.app_access_level
      when p_role='ORCAMENTISTA' and p_module_key in ('orcamentos','propostas') then 'EDIT'::public.app_access_level
      when p_role='ORCAMENTISTA' and p_module_key in ('clientes','obras','contratos','documentos','relatorios') then 'READ'::public.app_access_level
      when p_role='FINANCEIRO' and p_module_key in ('contratos','aditivos','relatorios') then 'EDIT'::public.app_access_level
      when p_role='FINANCEIRO' and p_module_key in ('clientes','orcamentos','propostas','assinaturas','auditoria') then 'READ'::public.app_access_level
      when p_role='QUALIDADE' and p_module_key in ('diario','documentos','qualidade') then 'EDIT'::public.app_access_level
      when p_role='QUALIDADE' and p_module_key in ('clientes','obras','planejamento','tarefas','relatorios') then 'READ'::public.app_access_level
      when p_role='SAC' and p_module_key='sac' then 'EDIT'::public.app_access_level
      when p_role='SAC' and p_module_key in ('clientes','obras','documentos','relatorios') then 'READ'::public.app_access_level
      else 'NONE'::public.app_access_level
    end,
    case
      when p_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR') then true
      when p_role='GESTOR_OBRAS' and p_module_key in ('obras','planejamento','tarefas','diario','documentos','qualidade') then true
      when p_role='FINANCEIRO' and p_module_key in ('orcamentos','propostas','contratos','aditivos','relatorios') then true
      when p_role='QUALIDADE' and p_module_key in ('diario','documentos','qualidade') then true
      when p_role='SAC' and p_module_key='sac' then true
      else false
    end,
    case
      when p_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR') then true
      when p_role='COMERCIAL' and p_module_key='propostas' then true
      when p_role='GESTOR_OBRAS' and p_module_key in ('obras','planejamento','tarefas','diario','documentos','qualidade') then true
      when p_role='ENGENHEIRO' and p_module_key in ('obras','planejamento','tarefas','diario','documentos','qualidade') then true
      when p_role='ORCAMENTISTA' and p_module_key='propostas' then true
      when p_role='QUALIDADE' and p_module_key in ('diario','documentos','qualidade') then true
      when p_role='SAC' and p_module_key='sac' then true
      else false
    end,
    p_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR'),
    case
      when p_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR') then true
      when p_role='COMERCIAL' and p_module_key in ('crm','clientes','propostas','contratos','relatorios') then true
      when p_role in ('GESTOR_OBRAS','ENGENHEIRO') and p_module_key in ('obras','planejamento','tarefas','diario','documentos','qualidade','relatorios') then true
      when p_role='ORCAMENTISTA' and p_module_key in ('orcamentos','propostas','contratos','documentos','relatorios') then true
      when p_role='FINANCEIRO' and p_module_key in ('orcamentos','propostas','contratos','aditivos','assinaturas','relatorios','auditoria') then true
      when p_role='QUALIDADE' and p_module_key in ('diario','documentos','qualidade','relatorios') then true
      when p_role='SAC' and p_module_key in ('sac','relatorios') then true
      else false
    end,
    p_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR'),
    case
      when p_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR') then true
      when p_role='GESTOR_OBRAS' and p_module_key='equipes' then true
      when p_role='ENGENHEIRO' and p_module_key='equipes' then true
      when p_role='ORCAMENTISTA' and p_module_key in ('orcamentos','propostas','relatorios') then true
      when p_role='FINANCEIRO' and p_module_key in ('orcamentos','propostas','contratos','aditivos','relatorios','auditoria') then true
      else false
    end;
$$;

create or replace function public.effective_module_permissions(
  p_organization_id uuid,
  p_user_id uuid default auth.uid(),
  p_project_id uuid default null
) returns table(
  module_id uuid,module_key text,module_name text,module_description text,module_href text,
  icon_key text,display_order integer,sensitive boolean,access_level public.app_access_level,
  can_approve boolean,can_release boolean,can_sign boolean,can_export boolean,
  can_administer boolean,can_view_sensitive boolean,permission_source text
)
language sql
stable
security definer
set search_path=public,auth,pg_temp
as $$
  with authorized as (
    select 1 where p_user_id=auth.uid() or public.has_org_role(
      p_organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[])
  ), membership as (
    select om.organization_id,om.user_id,om.role,coalesce(om.access_profile_id,ap.id) profile_id
    from public.organization_memberships om
    left join public.access_profiles ap on ap.organization_id=om.organization_id and ap.base_role=om.role and ap.active
    where om.organization_id=p_organization_id and om.user_id=p_user_id and om.active and exists(select 1 from authorized)
    limit 1
  ), base as (
    select m.id module_id,m.key module_key,m.name module_name,m.description module_description,
      m.href module_href,m.icon_key,m.display_order,m.sensitive,
      coalesce(pmp.access_level,d.access_level) base_level,
      coalesce(pmp.can_approve,d.can_approve) base_approve,
      coalesce(pmp.can_release,d.can_release) base_release,
      coalesce(pmp.can_sign,d.can_sign) base_sign,
      coalesce(pmp.can_export,d.can_export) base_export,
      coalesce(pmp.can_administer,d.can_administer) base_administer,
      coalesce(pmp.can_view_sensitive,d.can_view_sensitive) base_sensitive,
      case when pmp.id is null then 'ROLE_DEFAULT' else 'PROFILE' end base_source
    from membership mem cross join public.app_modules m
    cross join lateral public.default_role_module_permission(mem.role,m.key) d
    left join public.profile_module_permissions pmp on pmp.profile_id=mem.profile_id and pmp.module_id=m.id and pmp.organization_id=mem.organization_id
    where m.active
  ), user_override as (
    select * from public.user_module_permission_overrides
    where organization_id=p_organization_id and user_id=p_user_id and revoked_at is null
      and (expires_at is null or expires_at>now())
  ), project_override as (
    select * from public.project_module_permission_overrides
    where organization_id=p_organization_id and user_id=p_user_id and project_id=p_project_id
      and p_project_id is not null and revoked_at is null and (expires_at is null or expires_at>now())
  )
  select b.module_id,b.module_key,b.module_name,b.module_description,b.module_href,b.icon_key,
    b.display_order,b.sensitive,
    case when coalesce(po.denied,false) or coalesce(uo.denied,false) then 'NONE'::public.app_access_level else coalesce(po.access_level,uo.access_level,b.base_level) end,
    case when coalesce(po.denied,false) or coalesce(uo.denied,false) then false else coalesce(po.can_approve,uo.can_approve,b.base_approve) end,
    case when coalesce(po.denied,false) or coalesce(uo.denied,false) then false else coalesce(po.can_release,uo.can_release,b.base_release) end,
    case when coalesce(po.denied,false) or coalesce(uo.denied,false) then false else coalesce(po.can_sign,uo.can_sign,b.base_sign) end,
    case when coalesce(po.denied,false) or coalesce(uo.denied,false) then false else coalesce(po.can_export,uo.can_export,b.base_export) end,
    case when coalesce(po.denied,false) or coalesce(uo.denied,false) then false else coalesce(po.can_administer,uo.can_administer,b.base_administer) end,
    case when coalesce(po.denied,false) or coalesce(uo.denied,false) then false else coalesce(po.can_view_sensitive,uo.can_view_sensitive,b.base_sensitive) end,
    case when coalesce(po.denied,false) then 'PROJECT_DENY' when po.id is not null then 'PROJECT_OVERRIDE'
      when coalesce(uo.denied,false) then 'USER_DENY' when uo.id is not null then 'USER_OVERRIDE' else b.base_source end
  from base b left join user_override uo on uo.module_id=b.module_id
  left join project_override po on po.module_id=b.module_id
  order by b.display_order,b.module_name;
$$;

create or replace function public.profile_effective_module_permissions(p_profile_id uuid)
returns table(
  module_id uuid,module_key text,module_name text,module_href text,display_order integer,
  access_level public.app_access_level,can_approve boolean,can_release boolean,can_sign boolean,
  can_export boolean,can_administer boolean,can_view_sensitive boolean,permission_source text
)
language sql
stable
security definer
set search_path=public,auth,pg_temp
as $$
  with profile as (
    select * from public.access_profiles where id=p_profile_id and active
      and public.has_org_role(organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[])
  )
  select m.id,m.key,m.name,m.href,m.display_order,
    coalesce(pmp.access_level,d.access_level),coalesce(pmp.can_approve,d.can_approve),
    coalesce(pmp.can_release,d.can_release),coalesce(pmp.can_sign,d.can_sign),
    coalesce(pmp.can_export,d.can_export),coalesce(pmp.can_administer,d.can_administer),
    coalesce(pmp.can_view_sensitive,d.can_view_sensitive),
    case when pmp.id is null then 'ROLE_DEFAULT' else 'PROFILE' end
  from profile p cross join public.app_modules m
  cross join lateral public.default_role_module_permission(p.base_role,m.key) d
  left join public.profile_module_permissions pmp on pmp.profile_id=p.id and pmp.module_id=m.id
  where m.active
  order by m.display_order,m.name;
$$;

commit;
