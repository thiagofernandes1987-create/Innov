-- Etapa 12.2 — bucket privado e políticas de objetos.

update storage.buckets
set public=false,
    file_size_limit=52428800,
    allowed_mime_types=array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg','image/png','image/webp','image/heic',
      'application/msword','application/octet-stream'
    ]
where id='signature-artifacts';

create policy signature_artifacts_internal_select
on storage.objects for select to authenticated
using(
  bucket_id='signature-artifacts'
  and split_part(name,'/',1) ~ '^[a-f0-9-]{36}$'
  and public.has_module_permission(
    split_part(name,'/',1)::uuid,
    'assinaturas','READ'::public.app_access_level,null,null
  )
);

create policy signature_artifacts_internal_insert
on storage.objects for insert to authenticated
with check(
  bucket_id='signature-artifacts'
  and split_part(name,'/',1) ~ '^[a-f0-9-]{36}$'
  and public.has_module_permission(
    split_part(name,'/',1)::uuid,
    'assinaturas','EDIT'::public.app_access_level,null,null
  )
);

create policy signature_artifacts_internal_update
on storage.objects for update to authenticated
using(
  bucket_id='signature-artifacts'
  and split_part(name,'/',1) ~ '^[a-f0-9-]{36}$'
  and public.has_module_permission(
    split_part(name,'/',1)::uuid,
    'assinaturas','EDIT'::public.app_access_level,null,null
  )
)
with check(
  bucket_id='signature-artifacts'
  and split_part(name,'/',1) ~ '^[a-f0-9-]{36}$'
  and public.has_module_permission(
    split_part(name,'/',1)::uuid,
    'assinaturas','EDIT'::public.app_access_level,null,null
  )
);
