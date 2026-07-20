begin;

revoke all on function public.set_profile_module_permission(uuid,text,public.app_access_level,boolean,boolean,boolean,boolean,boolean,boolean,text) from public,anon;
revoke all on function public.set_user_module_permission_override(uuid,uuid,text,boolean,public.app_access_level,boolean,boolean,boolean,boolean,boolean,boolean,timestamptz,text) from public,anon;
revoke all on function public.revoke_user_module_permission_override(uuid,text) from public,anon;
revoke all on function public.set_project_module_permission_override(uuid,uuid,text,boolean,public.app_access_level,boolean,boolean,boolean,boolean,boolean,boolean,timestamptz,text) from public,anon;
revoke all on function public.revoke_project_module_permission_override(uuid,text) from public,anon;
revoke all on function public.assign_membership_access_profile(uuid,uuid,text) from public,anon;
revoke all on function public.ensure_organization_access_profiles(uuid) from public,anon,authenticated;
revoke all on function public.ensure_organization_access_profiles_trigger() from public,anon,authenticated;
revoke all on function public.resolve_membership_access_profile() from public,anon,authenticated;
revoke all on function public.prevent_permission_event_mutation() from public,anon,authenticated;

grant execute on function public.set_profile_module_permission(uuid,text,public.app_access_level,boolean,boolean,boolean,boolean,boolean,boolean,text) to authenticated,service_role;
grant execute on function public.set_user_module_permission_override(uuid,uuid,text,boolean,public.app_access_level,boolean,boolean,boolean,boolean,boolean,boolean,timestamptz,text) to authenticated,service_role;
grant execute on function public.revoke_user_module_permission_override(uuid,text) to authenticated,service_role;
grant execute on function public.set_project_module_permission_override(uuid,uuid,text,boolean,public.app_access_level,boolean,boolean,boolean,boolean,boolean,boolean,timestamptz,text) to authenticated,service_role;
grant execute on function public.revoke_project_module_permission_override(uuid,text) to authenticated,service_role;
grant execute on function public.assign_membership_access_profile(uuid,uuid,text) to authenticated,service_role;
grant execute on function public.ensure_organization_access_profiles(uuid) to service_role;
grant execute on function public.ensure_organization_access_profiles_trigger() to service_role;
grant execute on function public.resolve_membership_access_profile() to service_role;
grant execute on function public.prevent_permission_event_mutation() to service_role;

commit;
