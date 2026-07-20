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

commit;
