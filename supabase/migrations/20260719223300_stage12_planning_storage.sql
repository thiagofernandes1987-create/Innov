begin;

create policy project_documents_storage_select
on storage.objects for select to authenticated
using (
  bucket_id='project-documents'
  and exists(
    select 1
    from public.project_document_versions v
    where v.storage_path=storage.objects.name
      and (
        public.can_access_project(v.project_id)
        or (v.client_released_at is not null and public.is_project_client(v.project_id))
      )
  )
);

create policy project_documents_storage_insert
on storage.objects for insert to authenticated
with check (
  bucket_id='project-documents'
  and exists(
    select 1
    from public.projects p
    where split_part(storage.objects.name,'/',1)=p.organization_id::text
      and split_part(storage.objects.name,'/',2)=p.id::text
      and public.can_manage_project(p.id)
  )
);

create policy project_documents_storage_update
on storage.objects for update to authenticated
using (
  bucket_id='project-documents'
  and exists(
    select 1
    from public.projects p
    where split_part(storage.objects.name,'/',1)=p.organization_id::text
      and split_part(storage.objects.name,'/',2)=p.id::text
      and public.can_manage_project(p.id)
  )
)
with check (
  bucket_id='project-documents'
  and exists(
    select 1
    from public.projects p
    where split_part(storage.objects.name,'/',1)=p.organization_id::text
      and split_part(storage.objects.name,'/',2)=p.id::text
      and public.can_manage_project(p.id)
  )
);

create policy project_documents_storage_delete
on storage.objects for delete to authenticated
using (
  bucket_id='project-documents'
  and exists(
    select 1
    from public.projects p
    where split_part(storage.objects.name,'/',1)=p.organization_id::text
      and split_part(storage.objects.name,'/',2)=p.id::text
      and public.can_manage_project(p.id)
  )
);

create policy daily_log_media_storage_select
on storage.objects for select to authenticated
using (
  bucket_id='daily-log-media'
  and exists(
    select 1
    from public.daily_log_media m
    where m.storage_path=storage.objects.name
      and (
        public.can_access_project(m.project_id)
        or (m.client_visible and public.is_project_client(m.project_id))
      )
  )
);

create policy daily_log_media_storage_insert
on storage.objects for insert to authenticated
with check (
  bucket_id='daily-log-media'
  and exists(
    select 1
    from public.projects p
    where split_part(storage.objects.name,'/',1)=p.organization_id::text
      and split_part(storage.objects.name,'/',2)=p.id::text
      and public.can_write_daily_log(p.id)
  )
);

create policy daily_log_media_storage_update
on storage.objects for update to authenticated
using (
  bucket_id='daily-log-media'
  and exists(
    select 1
    from public.projects p
    where split_part(storage.objects.name,'/',1)=p.organization_id::text
      and split_part(storage.objects.name,'/',2)=p.id::text
      and public.can_write_daily_log(p.id)
  )
)
with check (
  bucket_id='daily-log-media'
  and exists(
    select 1
    from public.projects p
    where split_part(storage.objects.name,'/',1)=p.organization_id::text
      and split_part(storage.objects.name,'/',2)=p.id::text
      and public.can_write_daily_log(p.id)
  )
);

create policy daily_log_media_storage_delete
on storage.objects for delete to authenticated
using (
  bucket_id='daily-log-media'
  and exists(
    select 1
    from public.projects p
    where split_part(storage.objects.name,'/',1)=p.organization_id::text
      and split_part(storage.objects.name,'/',2)=p.id::text
      and public.can_write_daily_log(p.id)
  )
);

commit;
