begin;

alter table public.project_resources enable row level security;
alter table public.task_resource_allocations enable row level security;
alter table public.project_teams enable row level security;
alter table public.project_team_members enable row level security;

create policy resources_internal
on public.project_resources for all to authenticated
using (public.can_access_project(project_id))
with check (public.can_manage_project(project_id));

create policy allocations_internal
on public.task_resource_allocations for all to authenticated
using (public.can_access_project(project_id))
with check (public.can_manage_project(project_id));

create policy teams_internal
on public.project_teams for all to authenticated
using (public.can_access_project(project_id))
with check (public.can_manage_project(project_id));

create policy team_members_internal
on public.project_team_members for all to authenticated
using (public.can_access_project(project_id))
with check (public.can_manage_project(project_id));

commit;
