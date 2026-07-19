begin;

alter table public.project_memberships enable row level security;
alter table public.work_breakdown_items enable row level security;
alter table public.project_tasks enable row level security;
alter table public.task_dependencies enable row level security;
alter table public.project_milestones enable row level security;
alter table public.schedule_baselines enable row level security;
alter table public.schedule_baseline_tasks enable row level security;
alter table public.project_resources enable row level security;
alter table public.task_resource_allocations enable row level security;
alter table public.project_teams enable row level security;
alter table public.project_team_members enable row level security;
alter table public.daily_logs enable row level security;
alter table public.daily_log_activities enable row level security;
alter table public.daily_log_resources enable row level security;
alter table public.daily_log_media enable row level security;
alter table public.project_documents enable row level security;
alter table public.project_document_versions enable row level security;
alter table public.project_progress_snapshots enable row level security;

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

create policy baselines_internal
on public.schedule_baselines for all to authenticated
using (public.can_access_project(project_id))
with check (public.can_manage_project(project_id));

create policy baseline_tasks_internal
on public.schedule_baseline_tasks for all to authenticated
using (
  public.can_access_project(
    (select b.project_id from public.schedule_baselines b where b.id=baseline_id)
  )
)
with check (
  public.can_manage_project(
    (select b.project_id from public.schedule_baselines b where b.id=baseline_id)
  )
);

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

create policy daily_logs_internal_or_client
on public.daily_logs for select to authenticated
using (
  public.can_access_project(project_id)
  or (client_visible and status='APPROVED' and public.is_project_client(project_id))
);

create policy daily_logs_internal_write
on public.daily_logs for all to authenticated
using (public.can_write_daily_log(project_id))
with check (public.can_write_daily_log(project_id));

create policy daily_activities_internal_or_client
on public.daily_log_activities for select to authenticated
using (
  public.can_access_project(project_id)
  or exists(
    select 1 from public.daily_logs d
    where d.id=daily_log_id
      and d.client_visible
      and d.status='APPROVED'
      and public.is_project_client(d.project_id)
  )
);

create policy daily_activities_internal_write
on public.daily_log_activities for all to authenticated
using (public.can_write_daily_log(project_id))
with check (public.can_write_daily_log(project_id));

create policy daily_resources_internal_or_client
on public.daily_log_resources for select to authenticated
using (
  public.can_access_project(project_id)
  or exists(
    select 1 from public.daily_logs d
    where d.id=daily_log_id
      and d.client_visible
      and d.status='APPROVED'
      and public.is_project_client(d.project_id)
  )
);

create policy daily_resources_internal_write
on public.daily_log_resources for all to authenticated
using (public.can_write_daily_log(project_id))
with check (public.can_write_daily_log(project_id));

create policy daily_media_internal_or_client
on public.daily_log_media for select to authenticated
using (
  public.can_access_project(project_id)
  or (
    client_visible
    and exists(
      select 1 from public.daily_logs d
      where d.id=daily_log_id
        and d.client_visible
        and d.status='APPROVED'
        and public.is_project_client(d.project_id)
    )
  )
);

create policy daily_media_internal_write
on public.daily_log_media for all to authenticated
using (public.can_write_daily_log(project_id))
with check (public.can_write_daily_log(project_id));

create policy project_documents_internal_or_client
on public.project_documents for select to authenticated
using (public.can_access_project(project_id) or (client_visible and public.is_project_client(project_id)));

create policy project_documents_internal_write
on public.project_documents for all to authenticated
using (public.can_manage_project(project_id))
with check (public.can_manage_project(project_id));

create policy project_document_versions_internal_or_client
on public.project_document_versions for select to authenticated
using (
  public.can_access_project(project_id)
  or (client_released_at is not null and public.is_project_client(project_id))
);

create policy project_document_versions_internal_write
on public.project_document_versions for all to authenticated
using (public.can_manage_project(project_id))
with check (public.can_manage_project(project_id));

create policy progress_internal_or_client
on public.project_progress_snapshots for select to authenticated
using (public.can_access_project(project_id) or public.is_project_client(project_id));

create policy progress_internal_write
on public.project_progress_snapshots for all to authenticated
using (public.can_manage_project(project_id))
with check (public.can_manage_project(project_id));

commit;
