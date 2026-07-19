begin;

alter table public.project_memberships enable row level security;
alter table public.work_breakdown_items enable row level security;
alter table public.project_tasks enable row level security;
alter table public.task_dependencies enable row level security;
alter table public.project_milestones enable row level security;

create policy projects_internal_or_client_stage12
on public.projects for select to authenticated
using (public.can_access_project(id) or public.is_project_client(id));

create policy projects_internal_write_stage12
on public.projects for all to authenticated
using (public.can_manage_project(id))
with check (public.is_internal_member(organization_id));

create policy project_memberships_internal
on public.project_memberships for all to authenticated
using (public.can_manage_project(project_id))
with check (public.can_manage_project(project_id));

create policy wbs_internal_or_client
on public.work_breakdown_items for select to authenticated
using (public.can_access_project(project_id) or (client_visible and public.is_project_client(project_id)));

create policy wbs_internal_write
on public.work_breakdown_items for all to authenticated
using (public.can_manage_project(project_id))
with check (public.can_manage_project(project_id));

create policy tasks_internal_or_client
on public.project_tasks for select to authenticated
using (public.can_access_project(project_id) or (client_visible and public.is_project_client(project_id)));

create policy tasks_internal_write
on public.project_tasks for all to authenticated
using (public.can_manage_project(project_id))
with check (public.can_manage_project(project_id));

create policy dependencies_internal
on public.task_dependencies for all to authenticated
using (public.can_access_project(project_id))
with check (public.can_manage_project(project_id));

create policy milestones_internal_or_client
on public.project_milestones for select to authenticated
using (public.can_access_project(project_id) or (client_visible and public.is_project_client(project_id)));

create policy milestones_internal_write
on public.project_milestones for all to authenticated
using (public.can_manage_project(project_id))
with check (public.can_manage_project(project_id));

commit;
