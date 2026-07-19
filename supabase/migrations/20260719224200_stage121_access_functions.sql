begin;

create or replace function public.effective_module_permissions(
  p_organization_id uuid,
  p_user_id uuid default auth.uid(),
  p_project_id uuid default null
) returns table(
  module_id uuid,
  module_key text,
  module_name text,
  module_description text,
  module_href text,
  icon_key text,
  display_order integer,
  sensitive boolean,
  access_level public.app_access_level,
  can_approve boolean,
  can_release boolean,
  can_sign boolean,
  can_export boolean,
  can_administer boolean,
  can_view_sensitive boolean,
  permission_source text
)
language sql
stable
security definer
set search_path=public,auth,pg_temp
as $$
  with authorized as (
    select 1
    where p_user_id=auth.uid()
       or public.has_org_role(
         p_organization_id,
         array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]
       )
  ), membership as (
    select
      om.organization_id,
      om.user_id,
      om.role,
      coalesce(om.access_profile_id,ap.id) as profile_id
    from public.organization_memberships om
    left join public.access_profiles ap
      on ap.organization_id=om.organization_id
     and ap.base_role=om.role
     and ap.active
    where om.organization_id=p_organization_id
      and om.user_id=p_user_id
      and om.active
      and exists(select 1 from authorized)
    limit 1
  ), base as (
    select
      m.id as module_id,
      m.key as module_key,
      m.name as module_name,
      m.description as module_description,
      m.href as module_href,
      m.icon_key,
      m.display_order,
      m.sensitive,
      coalesce(pmp.access_level,'NONE'::public.app_access_level) as base_level,
      coalesce(pmp.can_approve,false) as base_approve,
      coalesce(pmp.can_release,false) as base_release,
      coalesce(pmp.can_sign,false) as base_sign,
      coalesce(pmp.can_export,false) as base_export,
      coalesce(pmp.can_administer,false) as base_administer,
      coalesce(pmp.can_view_sensitive,false) as base_sensitive
    from membership mem
    cross join public.app_modules m
    left join public.profile_module_permissions pmp
      on pmp.profile_id=mem.profile_id
     and pmp.module_id=m.id
     and pmp.organization_id=mem.organization_id
    where m.active
  ), user_override as (
    select u.*
    from public.user_module_permission_overrides u
    where u.organization_id=p_organization_id
      and u.user_id=p_user_id
      and (u.expires_at is null or u.expires_at>now())
  ), project_override as (
    select p.*
    from public.project_module_permission_overrides p
    where p_organization_id=p.organization_id
      and p.user_id=p_user_id
      and p.project_id=p_project_id
      and p_project_id is not null
      and (p.expires_at is null or p.expires_at>now())
  )
  select
    b.module_id,
    b.module_key,
    b.module_name,
    b.module_description,
    b.module_href,
    b.icon_key,
    b.display_order,
    b.sensitive,
    case
      when coalesce(po.denied,false) or coalesce(uo.denied,false) then 'NONE'::public.app_access_level
      else coalesce(po.access_level,uo.access_level,b.base_level)
    end as access_level,
    case when coalesce(po.denied,false) or coalesce(uo.denied,false) then false else coalesce(po.can_approve,uo.can_approve,b.base_approve) end,
    case when coalesce(po.denied,false) or coalesce(uo.denied,false) then false else coalesce(po.can_release,uo.can_release,b.base_release) end,
    case when coalesce(po.denied,false) or coalesce(uo.denied,false) then false else coalesce(po.can_sign,uo.can_sign,b.base_sign) end,
    case when coalesce(po.denied,false) or coalesce(uo.denied,false) then false else coalesce(po.can_export,uo.can_export,b.base_export) end,
    case when coalesce(po.denied,false) or coalesce(uo.denied,false) then false else coalesce(po.can_administer,uo.can_administer,b.base_administer) end,
    case when coalesce(po.denied,false) or coalesce(uo.denied,false) then false else coalesce(po.can_view_sensitive,uo.can_view_sensitive,b.base_sensitive) end,
    case
      when coalesce(po.denied,false) then 'PROJECT_DENY'
      when po.id is not null then 'PROJECT_OVERRIDE'
      when coalesce(uo.denied,false) then 'USER_DENY'
      when uo.id is not null then 'USER_OVERRIDE'
      else 'PROFILE'
    end as permission_source
  from base b
  left join user_override uo on uo.module_id=b.module_id
  left join project_override po on po.module_id=b.module_id
  order by b.display_order,b.module_name;
$$;

create or replace function public.list_my_modules(p_organization_id uuid)
returns table(
  module_id uuid,
  module_key text,
  module_name text,
  module_description text,
  module_href text,
  icon_key text,
  display_order integer,
  sensitive boolean,
  access_level public.app_access_level,
  can_approve boolean,
  can_release boolean,
  can_sign boolean,
  can_export boolean,
  can_administer boolean,
  can_view_sensitive boolean,
  permission_source text
)
language sql
stable
security definer
set search_path=public,auth,pg_temp
as $$
  select *
  from public.effective_module_permissions(p_organization_id,auth.uid(),null)
  where access_level<>'NONE'::public.app_access_level
  order by display_order,module_name;
$$;

create or replace function public.has_module_permission(
  p_organization_id uuid,
  p_module_key text,
  p_required_level public.app_access_level default 'READ',
  p_project_id uuid default null,
  p_action text default null
) returns boolean
language sql
stable
security definer
set search_path=public,auth,pg_temp
as $$
  select coalesce(bool_or(
    access_level>=p_required_level
    and case lower(coalesce(p_action,''))
      when '' then true
      when 'approve' then can_approve
      when 'release' then can_release
      when 'sign' then can_sign
      when 'export' then can_export
      when 'administer' then can_administer
      when 'sensitive' then can_view_sensitive
      else false
    end
  ),false)
  from public.effective_module_permissions(
    p_organization_id,
    auth.uid(),
    p_project_id
  )
  where module_key=lower(p_module_key);
$$;

create or replace function public.set_profile_module_permission(
  p_profile_id uuid,
  p_module_key text,
  p_access_level public.app_access_level,
  p_can_approve boolean default false,
  p_can_release boolean default false,
  p_can_sign boolean default false,
  p_can_export boolean default false,
  p_can_administer boolean default false,
  p_can_view_sensitive boolean default false,
  p_reason text default null
) returns uuid
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_profile public.access_profiles;
  v_module public.app_modules;
  v_before jsonb;
  v_after jsonb;
  v_id uuid;
begin
  select * into v_profile from public.access_profiles where id=p_profile_id;
  if not found then raise exception 'Perfil não encontrado'; end if;
  if not public.has_org_role(v_profile.organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]) then
    raise exception 'Acesso negado';
  end if;
  select * into v_module from public.app_modules where key=lower(p_module_key) and active;
  if not found then raise exception 'Módulo não encontrado'; end if;

  select to_jsonb(pmp) into v_before
  from public.profile_module_permissions pmp
  where pmp.profile_id=v_profile.id and pmp.module_id=v_module.id;

  insert into public.profile_module_permissions(
    organization_id,profile_id,module_id,access_level,can_approve,can_release,
    can_sign,can_export,can_administer,can_view_sensitive,created_by
  ) values (
    v_profile.organization_id,v_profile.id,v_module.id,p_access_level,
    p_can_approve,p_can_release,p_can_sign,p_can_export,p_can_administer,
    p_can_view_sensitive,auth.uid()
  )
  on conflict(profile_id,module_id) do update set
    access_level=excluded.access_level,
    can_approve=excluded.can_approve,
    can_release=excluded.can_release,
    can_sign=excluded.can_sign,
    can_export=excluded.can_export,
    can_administer=excluded.can_administer,
    can_view_sensitive=excluded.can_view_sensitive,
    updated_at=now()
  returning id into v_id;

  select to_jsonb(pmp) into v_after
  from public.profile_module_permissions pmp where id=v_id;

  insert into public.permission_change_events(
    organization_id,actor_user_id,profile_id,module_id,action,
    before_data,after_data,reason
  ) values (
    v_profile.organization_id,auth.uid(),v_profile.id,v_module.id,
    'SET_PROFILE_PERMISSION',v_before,v_after,p_reason
  );
  perform public.write_audit(
    v_profile.organization_id,'PROFILE_MODULE_PERMISSION',v_id,
    'SET_PROFILE_PERMISSION',v_after,null
  );
  return v_id;
end;
$$;

create or replace function public.set_user_module_permission_override(
  p_organization_id uuid,
  p_user_id uuid,
  p_module_key text,
  p_denied boolean default false,
  p_access_level public.app_access_level default null,
  p_can_approve boolean default null,
  p_can_release boolean default null,
  p_can_sign boolean default null,
  p_can_export boolean default null,
  p_can_administer boolean default null,
  p_can_view_sensitive boolean default null,
  p_expires_at timestamptz default null,
  p_reason text default null
) returns uuid
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_module public.app_modules;
  v_before jsonb;
  v_after jsonb;
  v_id uuid;
begin
  if not public.has_org_role(p_organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]) then
    raise exception 'Acesso negado';
  end if;
  if not exists(
    select 1 from public.organization_memberships
    where organization_id=p_organization_id and user_id=p_user_id and active
  ) then
    raise exception 'Usuário não pertence à organização';
  end if;
  select * into v_module from public.app_modules where key=lower(p_module_key) and active;
  if not found then raise exception 'Módulo não encontrado'; end if;

  select to_jsonb(u) into v_before
  from public.user_module_permission_overrides u
  where u.organization_id=p_organization_id
    and u.user_id=p_user_id
    and u.module_id=v_module.id;

  insert into public.user_module_permission_overrides(
    organization_id,user_id,module_id,denied,access_level,can_approve,
    can_release,can_sign,can_export,can_administer,can_view_sensitive,
    reason,expires_at,created_by
  ) values (
    p_organization_id,p_user_id,v_module.id,p_denied,p_access_level,
    p_can_approve,p_can_release,p_can_sign,p_can_export,p_can_administer,
    p_can_view_sensitive,p_reason,p_expires_at,auth.uid()
  )
  on conflict(organization_id,user_id,module_id) do update set
    denied=excluded.denied,
    access_level=excluded.access_level,
    can_approve=excluded.can_approve,
    can_release=excluded.can_release,
    can_sign=excluded.can_sign,
    can_export=excluded.can_export,
    can_administer=excluded.can_administer,
    can_view_sensitive=excluded.can_view_sensitive,
    reason=excluded.reason,
    expires_at=excluded.expires_at,
    updated_at=now()
  returning id into v_id;

  select to_jsonb(u) into v_after
  from public.user_module_permission_overrides u where id=v_id;

  insert into public.permission_change_events(
    organization_id,actor_user_id,target_user_id,module_id,action,
    before_data,after_data,reason
  ) values (
    p_organization_id,auth.uid(),p_user_id,v_module.id,
    case when p_denied then 'DENY_USER_MODULE' else 'SET_USER_OVERRIDE' end,
    v_before,v_after,p_reason
  );
  perform public.write_audit(
    p_organization_id,'USER_MODULE_PERMISSION',v_id,
    case when p_denied then 'DENY_USER_MODULE' else 'SET_USER_OVERRIDE' end,
    v_after,null
  );
  return v_id;
end;
$$;

create or replace function public.remove_user_module_permission_override(
  p_override_id uuid,
  p_reason text default null
) returns boolean
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_override public.user_module_permission_overrides;
begin
  select * into v_override
  from public.user_module_permission_overrides
  where id=p_override_id for update;
  if not found then return false; end if;
  if not public.has_org_role(v_override.organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]) then
    raise exception 'Acesso negado';
  end if;
  delete from public.user_module_permission_overrides where id=v_override.id;
  insert into public.permission_change_events(
    organization_id,actor_user_id,target_user_id,module_id,action,
    before_data,reason
  ) values (
    v_override.organization_id,auth.uid(),v_override.user_id,
    v_override.module_id,'REMOVE_USER_OVERRIDE',to_jsonb(v_override),p_reason
  );
  perform public.write_audit(
    v_override.organization_id,'USER_MODULE_PERMISSION',v_override.id,
    'REMOVE_USER_OVERRIDE',jsonb_build_object('removed',true,'reason',p_reason),null
  );
  return true;
end;
$$;

create or replace function public.assign_membership_access_profile(
  p_membership_id uuid,
  p_profile_id uuid,
  p_reason text default null
) returns boolean
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_membership public.organization_memberships;
  v_profile public.access_profiles;
  v_before jsonb;
begin
  select * into v_membership from public.organization_memberships where id=p_membership_id for update;
  if not found then raise exception 'Vínculo não encontrado'; end if;
  if not public.has_org_role(v_membership.organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]) then
    raise exception 'Acesso negado';
  end if;
  select * into v_profile from public.access_profiles
  where id=p_profile_id and organization_id=v_membership.organization_id and active;
  if not found then raise exception 'Perfil inválido'; end if;
  v_before:=to_jsonb(v_membership);
  update public.organization_memberships
  set access_profile_id=v_profile.id
  where id=v_membership.id;
  insert into public.permission_change_events(
    organization_id,actor_user_id,target_user_id,profile_id,action,
    before_data,after_data,reason
  ) values (
    v_membership.organization_id,auth.uid(),v_membership.user_id,v_profile.id,
    'ASSIGN_ACCESS_PROFILE',v_before,
    jsonb_build_object('membership_id',v_membership.id,'access_profile_id',v_profile.id),
    p_reason
  );
  perform public.write_audit(
    v_membership.organization_id,'ORGANIZATION_MEMBERSHIP',v_membership.id,
    'ASSIGN_ACCESS_PROFILE',jsonb_build_object('access_profile_id',v_profile.id),null
  );
  return true;
end;
$$;

create or replace function public.prevent_permission_event_mutation()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
begin
  raise exception 'Eventos de permissão são imutáveis';
end;
$$;

create trigger permission_change_events_immutable
before update or delete on public.permission_change_events
for each row execute function public.prevent_permission_event_mutation();

commit;
