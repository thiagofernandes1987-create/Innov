-- Etapa 12.1 — resolução efetiva, operações administrativas e bootstrap organizacional.

create or replace function public.ensure_organization_module_defaults(p_organization_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
begin
  if not exists(select 1 from public.organizations where id=p_organization_id) then
    raise exception 'Organização não encontrada';
  end if;

  perform public.ensure_organization_access_profiles(p_organization_id);

  update public.access_profiles
  set name=case base_role
    when 'COMERCIAL' then 'Vendas'
    when 'GESTOR_OBRAS' then 'Operacional'
    when 'SAC' then 'Pós-venda'
    when 'FINANCEIRO' then 'Financeiro'
    when 'ORCAMENTISTA' then 'Orçamentista'
    when 'ENGENHEIRO' then 'Engenharia'
    when 'QUALIDADE' then 'Qualidade'
    when 'DIRECAO' then 'Direção'
    when 'ADMINISTRADOR' then 'Administrador'
    when 'SUPER_ADMIN' then 'Superadministrador'
    when 'CLIENTE' then 'Cliente'
    else name
  end
  where organization_id=p_organization_id and system;

  insert into public.access_profiles(
    organization_id,code,name,description,base_role,system,active
  ) values(
    p_organization_id,
    'usuario-comum',
    'Usuário comum',
    'Perfil sem módulos concedidos por padrão.',
    null,
    true,
    true
  )
  on conflict(organization_id,code) do nothing;

  insert into public.organization_modules(
    organization_id,module_id,status,installed_version,settings,enabled_at
  )
  select
    p_organization_id,
    module.id,
    case when module.default_enabled or module.is_core then 'ENABLED' else 'DISABLED' end,
    module.version,
    '{}'::jsonb,
    case when module.default_enabled or module.is_core then now() end
  from public.app_modules module
  where module.active
  on conflict(organization_id,module_id) do update set
    installed_version=excluded.installed_version,
    updated_at=now();

  insert into public.profile_module_permissions(
    organization_id,profile_id,module_id,access_level,
    can_approve,can_release,can_sign,can_export,can_administer,can_view_sensitive
  )
  select
    p_organization_id,
    profile.id,
    module.id,
    defaults.access_level,
    defaults.can_approve,
    defaults.can_release,
    defaults.can_sign,
    defaults.can_export,
    defaults.can_administer,
    defaults.can_view_sensitive
  from public.access_profiles profile
  cross join public.app_modules module
  cross join lateral public.default_role_module_permission(profile.base_role,module.key) defaults
  where profile.organization_id=p_organization_id
    and profile.base_role is not null
  on conflict(profile_id,module_id) do nothing;

  update public.organization_memberships membership
  set access_profile_id=profile.id
  from public.access_profiles profile
  where membership.organization_id=p_organization_id
    and profile.organization_id=membership.organization_id
    and profile.base_role=membership.role
    and membership.access_profile_id is null;

  insert into public.membership_access_profiles(
    organization_id,membership_id,profile_id,scope_type,assigned_by
  )
  select
    membership.organization_id,
    membership.id,
    membership.access_profile_id,
    'ORGANIZATION',
    membership.user_id
  from public.organization_memberships membership
  where membership.organization_id=p_organization_id
    and membership.access_profile_id is not null
  on conflict do nothing;

  return true;
end;
$$;

create or replace function public.ensure_organization_module_defaults_trigger()
returns trigger
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
begin
  perform public.ensure_organization_module_defaults(new.id);
  return new;
end;
$$;

drop trigger if exists organizations_initialize_modules on public.organizations;
create trigger organizations_initialize_modules
after insert on public.organizations
for each row execute function public.ensure_organization_module_defaults_trigger();

create or replace function public.create_modular_access_profile(
  p_organization_id uuid,
  p_code text,
  p_name text,
  p_description text,
  p_base_role public.org_role default null
)
returns uuid
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_id uuid;
begin
  if not public.has_org_role(
    p_organization_id,
    array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]
  ) then
    raise exception 'Acesso negado';
  end if;

  insert into public.access_profiles(
    organization_id,code,name,description,base_role,system,active,created_by
  ) values(
    p_organization_id,
    lower(regexp_replace(trim(p_code),'[^a-zA-Z0-9]+','-','g')),
    trim(p_name),
    coalesce(trim(p_description),''),
    p_base_role,
    false,
    true,
    auth.uid()
  )
  returning id into v_id;

  insert into public.permission_change_events(
    organization_id,actor_user_id,profile_id,action,after_data,reason
  ) values(
    p_organization_id,
    auth.uid(),
    v_id,
    'CREATE_ACCESS_PROFILE',
    jsonb_build_object('name',p_name,'code',p_code),
    'Criação de perfil modular'
  );

  return v_id;
end;
$$;

create or replace function public.set_organization_module_status(
  p_organization_id uuid,
  p_module_key text,
  p_status text,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_module public.app_modules;
  v_before jsonb;
  v_missing text[];
  v_dependents text[];
begin
  if not public.has_org_role(
    p_organization_id,
    array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]
  ) then
    raise exception 'Acesso negado';
  end if;

  if p_status not in('ENABLED','DISABLED','ARCHIVED') then
    raise exception 'Estado inválido';
  end if;

  select * into v_module
  from public.app_modules
  where key=lower(p_module_key) and active;
  if not found then raise exception 'Módulo não encontrado'; end if;

  if v_module.is_core and p_status<>'ENABLED' then
    raise exception 'Módulo de núcleo não pode ser desabilitado';
  end if;

  if p_status='ENABLED' then
    select array_agg(dependency.key order by dependency.key)
    into v_missing
    from public.app_module_dependencies relation
    join public.app_modules dependency on dependency.id=relation.depends_on_module_id
    left join public.organization_modules installed
      on installed.organization_id=p_organization_id
      and installed.module_id=dependency.id
      and installed.status='ENABLED'
    where relation.module_id=v_module.id
      and relation.required
      and installed.id is null;

    if coalesce(array_length(v_missing,1),0)>0 then
      raise exception 'Dependências não habilitadas: %',array_to_string(v_missing,', ');
    end if;
  else
    select array_agg(dependent.key order by dependent.key)
    into v_dependents
    from public.app_module_dependencies relation
    join public.app_modules dependent on dependent.id=relation.module_id
    join public.organization_modules installed
      on installed.organization_id=p_organization_id
      and installed.module_id=dependent.id
      and installed.status='ENABLED'
    where relation.depends_on_module_id=v_module.id
      and relation.required;

    if coalesce(array_length(v_dependents,1),0)>0 then
      raise exception 'Desabilite primeiro os módulos dependentes: %',array_to_string(v_dependents,', ');
    end if;
  end if;

  select to_jsonb(row_data) into v_before
  from public.organization_modules row_data
  where row_data.organization_id=p_organization_id
    and row_data.module_id=v_module.id;

  insert into public.organization_modules(
    organization_id,module_id,status,installed_version,installed_by,
    enabled_at,disabled_at,archived_at
  ) values(
    p_organization_id,
    v_module.id,
    p_status,
    v_module.version,
    auth.uid(),
    case when p_status='ENABLED' then now() end,
    case when p_status='DISABLED' then now() end,
    case when p_status='ARCHIVED' then now() end
  )
  on conflict(organization_id,module_id) do update set
    status=excluded.status,
    installed_version=excluded.installed_version,
    installed_by=excluded.installed_by,
    enabled_at=case when excluded.status='ENABLED' then now() else public.organization_modules.enabled_at end,
    disabled_at=case when excluded.status='DISABLED' then now() else null end,
    archived_at=case when excluded.status='ARCHIVED' then now() else null end,
    updated_at=now();

  insert into public.permission_change_events(
    organization_id,actor_user_id,module_id,action,before_data,after_data,reason
  ) values(
    p_organization_id,
    auth.uid(),
    v_module.id,
    'SET_ORGANIZATION_MODULE_STATUS',
    v_before,
    jsonb_build_object('status',p_status),
    p_reason
  );

  return true;
end;
$$;

create or replace function public.assign_user_access_profile(
  p_organization_id uuid,
  p_user_id uuid,
  p_profile_id uuid,
  p_scope_type text default 'ORGANIZATION',
  p_scope_id uuid default null,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_membership public.organization_memberships;
  v_id uuid;
begin
  if not public.has_org_role(
    p_organization_id,
    array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]
  ) then
    raise exception 'Acesso negado';
  end if;

  if p_scope_type not in('ORGANIZATION','CLIENT','PROJECT') then
    raise exception 'Escopo inválido';
  end if;
  if p_scope_type<>'ORGANIZATION' and p_scope_id is null then
    raise exception 'Escopo específico exige identificador';
  end if;

  select * into v_membership
  from public.organization_memberships
  where organization_id=p_organization_id
    and user_id=p_user_id
    and active
  for update;
  if not found then raise exception 'Usuário não pertence à organização'; end if;

  if not exists(
    select 1 from public.access_profiles
    where id=p_profile_id
      and organization_id=p_organization_id
      and active
  ) then
    raise exception 'Perfil inválido';
  end if;

  insert into public.membership_access_profiles(
    organization_id,membership_id,profile_id,scope_type,scope_id,assigned_by
  ) values(
    p_organization_id,
    v_membership.id,
    p_profile_id,
    p_scope_type,
    p_scope_id,
    auth.uid()
  )
  on conflict(organization_id,membership_id,profile_id,scope_type,scope_id)
  do update set
    active=true,
    starts_at=now(),
    ends_at=null,
    assigned_by=auth.uid()
  returning id into v_id;

  if v_membership.access_profile_id is null and p_scope_type='ORGANIZATION' then
    update public.organization_memberships
    set access_profile_id=p_profile_id
    where id=v_membership.id;
  end if;

  insert into public.permission_change_events(
    organization_id,actor_user_id,target_user_id,profile_id,project_id,
    action,after_data,reason
  ) values(
    p_organization_id,
    auth.uid(),
    p_user_id,
    p_profile_id,
    case when p_scope_type='PROJECT' then p_scope_id end,
    'ASSIGN_ADDITIONAL_ACCESS_PROFILE',
    jsonb_build_object('scope_type',p_scope_type,'scope_id',p_scope_id),
    p_reason
  );

  return v_id;
end;
$$;

create or replace function public.revoke_user_access_profile(
  p_assignment_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_row public.membership_access_profiles;
begin
  select * into v_row
  from public.membership_access_profiles
  where id=p_assignment_id
  for update;
  if not found then raise exception 'Atribuição não encontrada'; end if;

  if not public.has_org_role(
    v_row.organization_id,
    array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]
  ) then
    raise exception 'Acesso negado';
  end if;

  update public.membership_access_profiles
  set active=false,ends_at=now()
  where id=v_row.id;

  insert into public.permission_change_events(
    organization_id,actor_user_id,profile_id,project_id,
    action,before_data,reason
  ) values(
    v_row.organization_id,
    auth.uid(),
    v_row.profile_id,
    case when v_row.scope_type='PROJECT' then v_row.scope_id end,
    'REVOKE_ACCESS_PROFILE',
    to_jsonb(v_row),
    p_reason
  );

  return true;
end;
$$;

create or replace function public.effective_module_permissions(
  p_organization_id uuid,
  p_user_id uuid default auth.uid(),
  p_project_id uuid default null
)
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
with authorized as(
  select 1
  where p_user_id=auth.uid()
    or public.has_org_role(
      p_organization_id,
      array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]
    )
), membership as(
  select
    organization_membership.id as membership_id,
    organization_membership.organization_id,
    organization_membership.user_id,
    organization_membership.role,
    coalesce(organization_membership.access_profile_id,role_profile.id) as primary_profile_id
  from public.organization_memberships organization_membership
  left join public.access_profiles role_profile
    on role_profile.organization_id=organization_membership.organization_id
    and role_profile.base_role=organization_membership.role
    and role_profile.active
  where organization_membership.organization_id=p_organization_id
    and organization_membership.user_id=p_user_id
    and organization_membership.active
    and exists(select 1 from authorized)
  limit 1
), project_context as(
  select project.client_id
  from public.projects project
  where project.id=p_project_id
    and project.organization_id=p_organization_id
), assigned_profiles as(
  select membership.primary_profile_id as profile_id,'PRIMARY_PROFILE'::text as source
  from membership
  where membership.primary_profile_id is not null
  union
  select assignment.profile_id,
    case assignment.scope_type
      when 'PROJECT' then 'PROJECT_PROFILE'
      when 'CLIENT' then 'CLIENT_PROFILE'
      else 'ADDITIONAL_PROFILE'
    end
  from membership
  join public.membership_access_profiles assignment
    on assignment.membership_id=membership.membership_id
    and assignment.active
  where assignment.starts_at<=now()
    and(assignment.ends_at is null or assignment.ends_at>now())
    and(
      assignment.scope_type='ORGANIZATION'
      or(assignment.scope_type='PROJECT' and assignment.scope_id=p_project_id)
      or(
        assignment.scope_type='CLIENT'
        and assignment.scope_id=(select client_id from project_context)
      )
    )
), profile_permissions as(
  select
    permission.module_id,
    max(case permission.access_level
      when 'NONE' then 0
      when 'READ' then 1
      when 'EDIT' then 2
      when 'DELETE' then 3
    end) as level_rank,
    bool_or(permission.can_approve) as can_approve,
    bool_or(permission.can_release) as can_release,
    bool_or(permission.can_sign) as can_sign,
    bool_or(permission.can_export) as can_export,
    bool_or(permission.can_administer) as can_administer,
    bool_or(permission.can_view_sensitive) as can_view_sensitive
  from assigned_profiles profile
  join public.profile_module_permissions permission
    on permission.profile_id=profile.profile_id
  group by permission.module_id
), base as(
  select
    module.id as module_id,
    module.key as module_key,
    module.name as module_name,
    module.description as module_description,
    module.href as module_href,
    module.icon_key,
    module.display_order,
    module.sensitive,
    coalesce(
      case profile_permission.level_rank
        when 3 then 'DELETE'::public.app_access_level
        when 2 then 'EDIT'::public.app_access_level
        when 1 then 'READ'::public.app_access_level
        else 'NONE'::public.app_access_level
      end,
      defaults.access_level
    ) as base_level,
    coalesce(profile_permission.can_approve,defaults.can_approve) as base_approve,
    coalesce(profile_permission.can_release,defaults.can_release) as base_release,
    coalesce(profile_permission.can_sign,defaults.can_sign) as base_sign,
    coalesce(profile_permission.can_export,defaults.can_export) as base_export,
    coalesce(profile_permission.can_administer,defaults.can_administer) as base_administer,
    coalesce(profile_permission.can_view_sensitive,defaults.can_view_sensitive) as base_sensitive,
    case when profile_permission.module_id is null then 'ROLE_DEFAULT' else 'MULTI_PROFILE' end as base_source
  from membership
  join public.organization_modules installed
    on installed.organization_id=membership.organization_id
    and installed.status='ENABLED'
  join public.app_modules module
    on module.id=installed.module_id
    and module.active
  cross join lateral public.default_role_module_permission(membership.role,module.key) defaults
  left join profile_permissions profile_permission
    on profile_permission.module_id=module.id
), user_override as(
  select *
  from public.user_module_permission_overrides
  where organization_id=p_organization_id
    and user_id=p_user_id
    and revoked_at is null
    and(expires_at is null or expires_at>now())
), project_override as(
  select *
  from public.project_module_permission_overrides
  where organization_id=p_organization_id
    and user_id=p_user_id
    and project_id=p_project_id
    and p_project_id is not null
    and revoked_at is null
    and(expires_at is null or expires_at>now())
)
select
  base.module_id,
  base.module_key,
  base.module_name,
  base.module_description,
  base.module_href,
  base.icon_key,
  base.display_order,
  base.sensitive,
  case
    when coalesce(project_override.denied,false) or coalesce(user_override.denied,false)
      then 'NONE'::public.app_access_level
    else coalesce(project_override.access_level,user_override.access_level,base.base_level)
  end,
  case when coalesce(project_override.denied,false) or coalesce(user_override.denied,false)
    then false else coalesce(project_override.can_approve,user_override.can_approve,base.base_approve) end,
  case when coalesce(project_override.denied,false) or coalesce(user_override.denied,false)
    then false else coalesce(project_override.can_release,user_override.can_release,base.base_release) end,
  case when coalesce(project_override.denied,false) or coalesce(user_override.denied,false)
    then false else coalesce(project_override.can_sign,user_override.can_sign,base.base_sign) end,
  case when coalesce(project_override.denied,false) or coalesce(user_override.denied,false)
    then false else coalesce(project_override.can_export,user_override.can_export,base.base_export) end,
  case when coalesce(project_override.denied,false) or coalesce(user_override.denied,false)
    then false else coalesce(project_override.can_administer,user_override.can_administer,base.base_administer) end,
  case when coalesce(project_override.denied,false) or coalesce(user_override.denied,false)
    then false else coalesce(project_override.can_view_sensitive,user_override.can_view_sensitive,base.base_sensitive) end,
  case
    when coalesce(project_override.denied,false) then 'PROJECT_DENY'
    when project_override.id is not null then 'PROJECT_OVERRIDE'
    when coalesce(user_override.denied,false) then 'USER_DENY'
    when user_override.id is not null then 'USER_OVERRIDE'
    else base.base_source
  end
from base
left join user_override on user_override.module_id=base.module_id
left join project_override on project_override.module_id=base.module_id
order by base.display_order,base.module_name;
$$;

create or replace function public.set_user_module_capability_override(
  p_organization_id uuid,
  p_user_id uuid,
  p_module_key text,
  p_capability_key text,
  p_effect text,
  p_expires_at timestamptz default null,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_module public.app_modules;
  v_current public.user_module_permission_overrides;
  v_denied boolean:=false;
  v_level public.app_access_level;
  v_approve boolean;
  v_release boolean;
  v_sign boolean;
  v_export boolean;
  v_administer boolean;
  v_sensitive boolean;
begin
  if not public.has_org_role(
    p_organization_id,
    array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]
  ) then
    raise exception 'Acesso negado';
  end if;
  if p_effect not in('ALLOW','DENY') then raise exception 'Efeito inválido'; end if;

  select * into v_module
  from public.app_modules
  where key=lower(p_module_key) and active;
  if not found then raise exception 'Módulo não encontrado'; end if;

  select * into v_current
  from public.user_module_permission_overrides
  where organization_id=p_organization_id
    and user_id=p_user_id
    and module_id=v_module.id
    and revoked_at is null;

  if found then
    v_denied:=v_current.denied;
    v_level:=v_current.access_level;
    v_approve:=v_current.can_approve;
    v_release:=v_current.can_release;
    v_sign:=v_current.can_sign;
    v_export:=v_current.can_export;
    v_administer:=v_current.can_administer;
    v_sensitive:=v_current.can_view_sensitive;
  end if;

  if p_effect='DENY' then
    v_denied:=true;
  else
    v_denied:=false;
    case lower(p_capability_key)
      when 'read' then
        v_level:=case when v_level is null or v_level<'READ' then 'READ' else v_level end;
      when 'create' then
        v_level:=case when v_level is null or v_level<'EDIT' then 'EDIT' else v_level end;
      when 'update' then
        v_level:=case when v_level is null or v_level<'EDIT' then 'EDIT' else v_level end;
      when 'delete' then v_level:='DELETE';
      when 'approve' then v_approve:=true;
      when 'release_to_client' then v_release:=true;
      when 'sign' then v_sign:=true;
      when 'export' then v_export:=true;
      when 'manage' then v_administer:=true;
      when 'assign_users' then v_administer:=true;
      when 'configure' then v_administer:=true;
      when 'view_sensitive_financials' then v_sensitive:=true;
      else raise exception 'Capacidade inválida';
    end case;
  end if;

  return public.set_user_module_permission_override(
    p_organization_id,
    p_user_id,
    p_module_key,
    v_denied,
    v_level,
    v_approve,
    v_release,
    v_sign,
    v_export,
    v_administer,
    v_sensitive,
    p_expires_at,
    p_reason
  );
end;
$$;

select public.ensure_organization_module_defaults(id)
from public.organizations;
