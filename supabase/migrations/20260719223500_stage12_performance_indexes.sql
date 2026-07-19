begin;

create index if not exists wbs_org_idx
  on public.work_breakdown_items(organization_id);
create index if not exists wbs_parent_idx
  on public.work_breakdown_items(parent_id);

create index if not exists project_tasks_org_idx
  on public.project_tasks(organization_id);
create index if not exists project_tasks_parent_idx
  on public.project_tasks(parent_task_id);

create index if not exists task_dependencies_org_idx
  on public.task_dependencies(organization_id);
create index if not exists task_dependencies_predecessor_idx
  on public.task_dependencies(predecessor_task_id);

create index if not exists project_milestones_org_idx
  on public.project_milestones(organization_id);

create index if not exists schedule_baselines_org_idx
  on public.schedule_baselines(organization_id);
create index if not exists schedule_baseline_tasks_org_idx
  on public.schedule_baseline_tasks(organization_id);
create index if not exists schedule_baseline_tasks_task_idx
  on public.schedule_baseline_tasks(task_id);

create index if not exists project_resources_org_idx
  on public.project_resources(organization_id);
create index if not exists allocations_org_idx
  on public.task_resource_allocations(organization_id);
create index if not exists allocations_resource_idx
  on public.task_resource_allocations(resource_id);

create index if not exists project_teams_org_idx
  on public.project_teams(organization_id);
create index if not exists project_teams_leader_idx
  on public.project_teams(leader_user_id);
create index if not exists project_team_members_org_idx
  on public.project_team_members(organization_id);
create index if not exists project_team_members_project_idx
  on public.project_team_members(project_id);
create index if not exists project_team_members_user_idx
  on public.project_team_members(user_id);

create index if not exists daily_log_activities_org_idx
  on public.daily_log_activities(organization_id);
create index if not exists daily_log_activities_project_idx
  on public.daily_log_activities(project_id);
create index if not exists daily_log_activities_task_idx
  on public.daily_log_activities(task_id);

create index if not exists daily_log_resources_org_idx
  on public.daily_log_resources(organization_id);
create index if not exists daily_log_resources_project_idx
  on public.daily_log_resources(project_id);
create index if not exists daily_log_resources_resource_idx
  on public.daily_log_resources(resource_id);

create index if not exists daily_log_media_org_idx
  on public.daily_log_media(organization_id);
create index if not exists daily_log_media_project_idx
  on public.daily_log_media(project_id);
create index if not exists daily_log_media_uploader_idx
  on public.daily_log_media(uploaded_by);

create index if not exists project_documents_org_idx
  on public.project_documents(organization_id);
create index if not exists project_documents_current_version_idx
  on public.project_documents(current_version_id);

create index if not exists project_document_versions_org_idx
  on public.project_document_versions(organization_id);
create index if not exists project_document_versions_project_idx
  on public.project_document_versions(project_id);
create index if not exists project_document_versions_uploader_idx
  on public.project_document_versions(uploaded_by);
create index if not exists project_document_versions_reviewer_idx
  on public.project_document_versions(reviewed_by);
create index if not exists project_document_versions_approver_idx
  on public.project_document_versions(approved_by);

create index if not exists progress_snapshots_org_idx
  on public.project_progress_snapshots(organization_id);

commit;
