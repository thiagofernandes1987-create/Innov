begin;

revoke all on function public.default_role_module_permission(public.org_role,text) from public,anon,authenticated;
revoke all on function public.effective_module_permissions(uuid,uuid,uuid) from public,anon;
revoke all on function public.list_my_modules(uuid) from public,anon;
revoke all on function public.profile_effective_module_permissions(uuid) from public,anon;
revoke all on function public.has_module_permission(uuid,text,public.app_access_level,uuid,text) from public,anon;

grant execute on function public.effective_module_permissions(uuid,uuid,uuid) to authenticated,service_role;
grant execute on function public.list_my_modules(uuid) to authenticated,service_role;
grant execute on function public.profile_effective_module_permissions(uuid) to authenticated,service_role;
grant execute on function public.has_module_permission(uuid,text,public.app_access_level,uuid,text) to authenticated,service_role;
grant execute on function public.default_role_module_permission(public.org_role,text) to service_role;

commit;
