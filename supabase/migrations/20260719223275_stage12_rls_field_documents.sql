begin;

alter table public.daily_logs enable row level security;
alter table public.daily_log_activities enable row level security;
alter table public.daily_log_resources enable row level security;
alter table public.daily_log_media enable row level security;
alter table public.project_documents enable row level security;
alter table public.project_document_versions enable row level security;
alter table public.project_progress_snapshots enable row level security;

create policy daily_logs_internal_or_client
on public.daily_logs for select to authenticated
using (public.can_access_project(project_id) or (client_visible and status='APPROVED' and public.is_project_client(project_id)));

create policy daily_logs_internal_write
on public.daily_logs for all to authenticated
using (public.can_write_daily_log(project_id))
with check (public.can_write_daily_log(project_id));

create policy daily_activities_internal_or_client
on public.daily_log_activities for select to authenticated
using (public.can_access_project(project_id) or exists(select 1 from public.daily_logs d where d.id=daily_log_id and d.client_visible and d.status='APPROVED' and public.is_project_client(d.project_id)));

create policy daily_activities_internal_write
on public.daily_log_activities for all to authenticated
using (public.can_write_daily_log(project_id))
with check (public.can_write_daily_log(project_id));

create policy daily_resources_internal_or_client
on public.daily_log_resources for select to authenticated
using (public.can_access_project(project_id) or exists(select 1 from public.daily_logs d where d.id=daily_log_id and d.client_visible and d.status='APPROVED' and public.is_project_client(d.project_id)));

create policy daily_resources_internal_write
on public.daily_log_resources for all to authenticated
using (public.can_write_daily_log(project_id))
with check (public.can_write_daily_log(project_id));

create policy daily_media_internal_or_client
on public.daily_log_media for select to authenticated
using (public.can_access_project(project_id) or (client_visible and exists(select 1 from public.daily_logs d where d.id=daily_log_id and d.client_visible and d.status='APPROVED' and public.is_project_client(d.project_id))));

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
using (public.can_access_project(project_id) or (client_released_at is not null and public.is_project_client(project_id)));

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
