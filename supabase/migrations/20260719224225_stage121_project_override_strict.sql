begin;

create or replace function public.set_project_module_permission_override(
  p_project_id uuid,
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
  v_project public.projects;
  v_module public.app_modules;
  v_id uuid;
begin
  select * into v_project from public.projects where id=p_project_id;
  if not found then raise exception 'Obra não encontrada'; end if;
  if not public.has_org_role(
    v_project.organization_id,
    array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]
  ) then
    raise exception 'Acesso negado';
  end if;
  if not exists(
    select 1 from public.organization_memberships
    where organization_id=v_project.organization_id
      and user_id=p_user_id
      and active
  ) then
    raise exception 'Usuário não pertence à organização';
  end if;
  select * into v_module
  from public.app_modules
  where key=lower(p_module_key) and active;
  if not found then raise exception 'Módulo não encontrado'; end if;

  insert into public.project_module_permission_overrides(
    organization_id,project_id,user_id,module_id,denied,access_level,
    can_approve,can_release,can_sign,can_export,can_administer,
    can_view_sensitive,reason,expires_at,created_by,revoked_at,revoked_by
  ) values (
    v_project.organization_id,v_project.id,p_user_id,v_module.id,p_denied,
    p_access_level,p_can_approve,p_can_release,p_can_sign,p_can_export,
    p_can_administer,p_can_view_sensitive,p_reason,p_expires_at,auth.uid(),null,null
  )
  on conflict(project_id,user_id,module_id) do update set
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
    revoked_at=null,
    revoked_by=null,
    updated_at=now()
  returning id into v_id;

  insert into public.permission_change_events(
    organization_id,actor_user_id,target_user_id,module_id,project_id,
    action,after_data,reason
  ) values (
    v_project.organization_id,auth.uid(),p_user_id,v_module.id,v_project.id,
    case when p_denied then 'DENY_PROJECT_MODULE' else 'SET_PROJECT_OVERRIDE' end,
    jsonb_build_object('override_id',v_id,'access_level',p_access_level,'denied',p_denied),
    p_reason
  );
  perform public.write_audit(
    v_project.organization_id,'PROJECT_MODULE_PERMISSION',v_id,
    'SET_PROJECT_OVERRIDE',
    jsonb_build_object('user_id',p_user_id,'module',p_module_key,'denied',p_denied),
    v_project.id
  );
  return v_id;
end;
$$;

create or replace function public.revoke_project_module_permission_override(
  p_override_id uuid,
  p_reason text default null
) returns boolean
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_override public.project_module_permission_overrides;
begin
  select * into v_override
  from public.project_module_permission_overrides
  where id=p_override_id
  for update;
  if not found then return false; end if;
  if not public.has_org_role(
    v_override.organization_id,
    array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]
  ) then
    raise exception 'Acesso negado';
  end if;
  update public.project_module_permission_overrides
  set revoked_at=now(),revoked_by=auth.uid(),updated_at=now()
  where id=v_override.id;
  insert into public.permission_change_events(
    organization_id,actor_user_id,target_user_id,module_id,project_id,
    action,before_data,after_data,reason
  ) values (
    v_override.organization_id,auth.uid(),v_override.user_id,
    v_override.module_id,v_override.project_id,'REVOKE_PROJECT_OVERRIDE',
    to_jsonb(v_override),jsonb_build_object('revoked_at',now()),p_reason
  );
  perform public.write_audit(
    v_override.organization_id,'PROJECT_MODULE_PERMISSION',v_override.id,
    'REVOKE_PROJECT_OVERRIDE',jsonb_build_object('reason',p_reason),
    v_override.project_id
  );
  return true;
end;
$$;

commit;
