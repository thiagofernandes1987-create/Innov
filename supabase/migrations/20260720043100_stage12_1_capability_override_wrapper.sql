create or replace function public.set_user_module_capability_override(
 p_organization_id uuid,
 p_user_id uuid,
 p_module_key text,
 p_capability_key text,
 p_effect text,
 p_expires_at timestamptz default null,
 p_reason text default null
) returns uuid
language plpgsql security definer set search_path=public,auth,pg_temp as $$
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
 if not public.has_org_role(p_organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]) then raise exception 'Acesso negado'; end if;
 if p_effect not in('ALLOW','DENY') then raise exception 'Efeito inválido'; end if;
 select * into v_module from public.app_modules where key=lower(p_module_key) and active;
 if not found then raise exception 'Módulo não encontrado'; end if;
 select * into v_current from public.user_module_permission_overrides
 where organization_id=p_organization_id and user_id=p_user_id and module_id=v_module.id and revoked_at is null;
 if found then
  v_denied:=v_current.denied;v_level:=v_current.access_level;v_approve:=v_current.can_approve;
  v_release:=v_current.can_release;v_sign:=v_current.can_sign;v_export:=v_current.can_export;
  v_administer:=v_current.can_administer;v_sensitive:=v_current.can_view_sensitive;
 end if;
 if p_effect='DENY' then
  v_denied:=true;
 else
  v_denied:=false;
  case lower(p_capability_key)
   when 'read' then v_level:=case when v_level is null or v_level<'READ' then 'READ' else v_level end;
   when 'create' then v_level:=case when v_level is null or v_level<'EDIT' then 'EDIT' else v_level end;
   when 'update' then v_level:=case when v_level is null or v_level<'EDIT' then 'EDIT' else v_level end;
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
  p_organization_id,p_user_id,p_module_key,v_denied,v_level,v_approve,v_release,v_sign,v_export,v_administer,v_sensitive,p_expires_at,p_reason
 );
end;$$;

revoke all on function public.set_user_module_capability_override(uuid,uuid,text,text,text,timestamptz,text) from public,anon;
grant execute on function public.set_user_module_capability_override(uuid,uuid,text,text,text,timestamptz,text) to authenticated,service_role;
