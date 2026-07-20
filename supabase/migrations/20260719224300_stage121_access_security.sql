begin;

alter table public.app_modules enable row level security;
alter table public.access_profiles enable row level security;
alter table public.profile_module_permissions enable row level security;
alter table public.user_module_permission_overrides enable row level security;
alter table public.project_module_permission_overrides enable row level security;
alter table public.permission_change_events enable row level security;

create policy app_modules_authenticated_read on public.app_modules for select to authenticated using(active);
create policy access_profiles_admin_or_assigned_read on public.access_profiles for select to authenticated using(public.has_org_role(organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]) or exists(select 1 from public.organization_memberships om where om.access_profile_id=id and om.user_id=auth.uid() and om.active));
create policy access_profiles_admin_write on public.access_profiles for all to authenticated using(public.has_org_role(organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[])) with check(public.has_org_role(organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]));
create policy profile_permissions_admin_read on public.profile_module_permissions for select to authenticated using(public.has_org_role(organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]));
create policy profile_permissions_admin_write on public.profile_module_permissions for all to authenticated using(public.has_org_role(organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[])) with check(public.has_org_role(organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]));
create policy user_overrides_admin_or_self_read on public.user_module_permission_overrides for select to authenticated using(user_id=auth.uid() or public.has_org_role(organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]));
create policy user_overrides_admin_write on public.user_module_permission_overrides for all to authenticated using(public.has_org_role(organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[])) with check(public.has_org_role(organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]));
create policy project_overrides_admin_manager_or_self_read on public.project_module_permission_overrides for select to authenticated using(user_id=auth.uid() or public.has_org_role(organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]) or public.can_manage_project(project_id));
create policy project_overrides_admin_manager_write on public.project_module_permission_overrides for all to authenticated using(public.has_org_role(organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]) or public.can_manage_project(project_id)) with check(public.has_org_role(organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]) or public.can_manage_project(project_id));
create policy permission_events_admin_read on public.permission_change_events for select to authenticated using(public.has_org_role(organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]));
create policy profiles_admin_same_organization on public.profiles for select to authenticated using(id=auth.uid() or exists(select 1 from public.organization_memberships target join public.organization_memberships actor on actor.organization_id=target.organization_id and actor.user_id=auth.uid() and actor.active and actor.role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR') where target.user_id=profiles.id and target.active));

revoke all on function public.default_role_module_permission(public.org_role,text) from public,anon,authenticated;
revoke all on function public.effective_module_permissions(uuid,uuid,uuid) from public,anon;
revoke all on function public.list_my_modules(uuid) from public,anon;
revoke all on function public.profile_effective_module_permissions(uuid) from public,anon;
revoke all on function public.has_module_permission(uuid,text,public.app_access_level,uuid,text) from public,anon;
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

grant execute on function public.effective_module_permissions(uuid,uuid,uuid) to authenticated,service_role;
grant execute on function public.list_my_modules(uuid) to authenticated,service_role;
grant execute on function public.profile_effective_module_permissions(uuid) to authenticated,service_role;
grant execute on function public.has_module_permission(uuid,text,public.app_access_level,uuid,text) to authenticated,service_role;
grant execute on function public.set_profile_module_permission(uuid,text,public.app_access_level,boolean,boolean,boolean,boolean,boolean,boolean,text) to authenticated,service_role;
grant execute on function public.set_user_module_permission_override(uuid,uuid,text,boolean,public.app_access_level,boolean,boolean,boolean,boolean,boolean,boolean,timestamptz,text) to authenticated,service_role;
grant execute on function public.revoke_user_module_permission_override(uuid,text) to authenticated,service_role;
grant execute on function public.set_project_module_permission_override(uuid,uuid,text,boolean,public.app_access_level,boolean,boolean,boolean,boolean,boolean,boolean,timestamptz,text) to authenticated,service_role;
grant execute on function public.revoke_project_module_permission_override(uuid,text) to authenticated,service_role;
grant execute on function public.assign_membership_access_profile(uuid,uuid,text) to authenticated,service_role;
grant execute on function public.default_role_module_permission(public.org_role,text) to service_role;
grant execute on function public.ensure_organization_access_profiles(uuid) to service_role;
grant execute on function public.ensure_organization_access_profiles_trigger() to service_role;
grant execute on function public.resolve_membership_access_profile() to service_role;
grant execute on function public.prevent_permission_event_mutation() to service_role;

commit;
