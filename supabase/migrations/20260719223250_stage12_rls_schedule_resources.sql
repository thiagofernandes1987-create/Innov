begin;

alter table public.schedule_baselines enable row level security;
alter table public.schedule_baseline_tasks enable row level security;
alter table public.project_resources enable row level security;
alter table public.task_resource_allocations enable row level security;
alter table public.project_teams enable row level security;
alter table public.project_team_members enable row level security;

create policy baselines_internal
on public.schedule_baselines for all to authenticated
using (public.can_access_project(project_id))
with check (public.can_manage_project(project_id));

create policy baseline_tasks_internal
on public.schedule_baseline_tasks for all to authenticated
using (public.can_access_project((select b.project_id from public.schedule_baselines b where b.id=baseline_id)))
with check (public.can_manage_project((select b.project_id from public.schedule_baselines b where b.id=baseline_id)));

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
