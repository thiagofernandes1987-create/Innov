-- Etapa 12.2 — RLS, Storage privado e privilégios das RPCs.

alter table public.signature_documents enable row level security;
alter table public.signature_document_versions enable row level security;
alter table public.signature_fields enable row level security;
alter table public.signature_field_values enable row level security;
alter table public.signature_attachments enable row level security;
alter table public.signature_delivery_events enable row level security;
alter table public.signature_evidence_records enable row level security;
alter table public.signature_access_tokens enable row level security;
alter table public.signature_conversion_jobs enable row level security;

create policy signature_documents_internal_read
on public.signature_documents for select to authenticated
using(public.has_module_permission(organization_id,'assinaturas','READ'::public.app_access_level,project_id,null));
create policy signature_documents_internal_create
on public.signature_documents for insert to authenticated
with check(public.has_module_permission(organization_id,'assinaturas','EDIT'::public.app_access_level,project_id,null));
create policy signature_documents_internal_update
on public.signature_documents for update to authenticated
using(public.has_module_permission(organization_id,'assinaturas','EDIT'::public.app_access_level,project_id,null))
with check(public.has_module_permission(organization_id,'assinaturas','EDIT'::public.app_access_level,project_id,null));
create policy signature_documents_client_read
on public.signature_documents for select to authenticated
using(
  status='COMPLETED'
  and exists(select 1 from public.clients client where client.id=client_id and client.user_id=auth.uid())
);

create policy signature_document_versions_internal_read
on public.signature_document_versions for select to authenticated
using(exists(
  select 1 from public.signature_documents document
  where document.id=document_id
    and public.has_module_permission(document.organization_id,'assinaturas','READ'::public.app_access_level,document.project_id,null)
));
create policy signature_document_versions_internal_write
on public.signature_document_versions for all to authenticated
using(exists(
  select 1 from public.signature_documents document
  where document.id=document_id
    and public.has_module_permission(document.organization_id,'assinaturas','EDIT'::public.app_access_level,document.project_id,null)
))
with check(exists(
  select 1 from public.signature_documents document
  where document.id=document_id
    and public.has_module_permission(document.organization_id,'assinaturas','EDIT'::public.app_access_level,document.project_id,null)
));
create policy signature_document_versions_client_read
on public.signature_document_versions for select to authenticated
using(
  client_released_at is not null
  and exists(
    select 1 from public.signature_documents document
    join public.clients client on client.id=document.client_id
    where document.id=document_id and client.user_id=auth.uid()
  )
);

create policy signature_fields_internal_read
on public.signature_fields for select to authenticated
using(exists(
  select 1 from public.signature_document_versions version
  join public.signature_documents document on document.id=version.document_id
  where version.id=document_version_id
    and public.has_module_permission(document.organization_id,'assinaturas','READ'::public.app_access_level,document.project_id,null)
));
create policy signature_fields_internal_write
on public.signature_fields for all to authenticated
using(exists(
  select 1 from public.signature_document_versions version
  join public.signature_documents document on document.id=version.document_id
  where version.id=document_version_id
    and public.has_module_permission(document.organization_id,'assinaturas','EDIT'::public.app_access_level,document.project_id,null)
))
with check(exists(
  select 1 from public.signature_document_versions version
  join public.signature_documents document on document.id=version.document_id
  where version.id=document_version_id
    and public.has_module_permission(document.organization_id,'assinaturas','EDIT'::public.app_access_level,document.project_id,null)
));
create policy signature_fields_signer_read
on public.signature_fields for select to authenticated
using(exists(select 1 from public.signature_signers signer where signer.id=signer_id and signer.user_id=auth.uid()));

create policy signature_field_values_internal_read
on public.signature_field_values for select to authenticated
using(exists(
  select 1 from public.signature_fields field
  join public.signature_document_versions version on version.id=field.document_version_id
  join public.signature_documents document on document.id=version.document_id
  where field.id=field_id
    and public.has_module_permission(document.organization_id,'assinaturas','READ'::public.app_access_level,document.project_id,null)
));
create policy signature_field_values_signer_read
on public.signature_field_values for select to authenticated
using(exists(select 1 from public.signature_signers signer where signer.id=signer_id and signer.user_id=auth.uid()));

create policy signature_attachments_internal_read
on public.signature_attachments for select to authenticated
using(public.has_module_permission(organization_id,'assinaturas','READ'::public.app_access_level,null,null));
create policy signature_attachments_signer_read
on public.signature_attachments for select to authenticated
using(exists(select 1 from public.signature_signers signer where signer.id=signer_id and signer.user_id=auth.uid()));

create policy signature_delivery_events_internal_read
on public.signature_delivery_events for select to authenticated
using(public.has_module_permission(organization_id,'assinaturas','READ'::public.app_access_level,null,null));
create policy signature_delivery_events_recipient_read
on public.signature_delivery_events for select to authenticated
using(recipient_user_id=auth.uid() and status in('SENT','DELIVERED'));

create policy signature_evidence_internal_read
on public.signature_evidence_records for select to authenticated
using(public.has_module_permission(organization_id,'assinaturas','READ'::public.app_access_level,null,null));
create policy signature_evidence_signer_read
on public.signature_evidence_records for select to authenticated
using(exists(select 1 from public.signature_signers signer where signer.id=signer_id and signer.user_id=auth.uid()));

-- Tokens e jobs nunca são lidos diretamente por navegador.
revoke all on public.signature_access_tokens from anon,authenticated;
revoke all on public.signature_conversion_jobs from anon,authenticated;
revoke insert,update,delete on public.signature_field_values,public.signature_attachments,
  public.signature_delivery_events,public.signature_evidence_records from anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'signature-artifacts','signature-artifacts',false,52428800,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg','image/png','image/webp','image/heic',
    'application/msword','application/octet-stream'
  ]
)
on conflict(id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create policy signature_artifacts_internal_select
on storage.objects for select to authenticated
using(
  bucket_id='signature-artifacts'
  and split_part(name,'/',1) ~ '^[a-f0-9-]{36}$'
  and public.has_module_permission(
    split_part(name,'/',1)::uuid,'assinaturas','READ'::public.app_access_level,null,null
  )
);
create policy signature_artifacts_internal_insert
on storage.objects for insert to authenticated
with check(
  bucket_id='signature-artifacts'
  and split_part(name,'/',1) ~ '^[a-f0-9-]{36}$'
  and public.has_module_permission(
    split_part(name,'/',1)::uuid,'assinaturas','EDIT'::public.app_access_level,null,null
  )
);
create policy signature_artifacts_internal_update
on storage.objects for update to authenticated
using(
  bucket_id='signature-artifacts'
  and public.has_module_permission(
    split_part(name,'/',1)::uuid,'assinaturas','EDIT'::public.app_access_level,null,null
  )
)
with check(
  bucket_id='signature-artifacts'
  and public.has_module_permission(
    split_part(name,'/',1)::uuid,'assinaturas','EDIT'::public.app_access_level,null,null
  )
);

revoke all on function public.lock_signature_conversion_job(text) from public,anon,authenticated;
revoke all on function public.complete_signature_conversion_job(uuid,text,text,integer) from public,anon,authenticated;
revoke all on function public.fail_signature_conversion_job(uuid,text,interval) from public,anon,authenticated;
revoke all on function public.record_advanced_signature_field_value(text,uuid,text,boolean,text,text,text,bigint,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.mark_advanced_signer_complete(text,text) from public,anon,authenticated;
revoke all on function public.complete_signature_copy_delivery(uuid,public.signature_delivery_status,text) from public,anon,authenticated;

grant execute on function public.lock_signature_conversion_job(text) to service_role;
grant execute on function public.complete_signature_conversion_job(uuid,text,text,integer) to service_role;
grant execute on function public.fail_signature_conversion_job(uuid,text,interval) to service_role;
grant execute on function public.record_advanced_signature_field_value(text,uuid,text,boolean,text,text,text,bigint,text,text,jsonb) to service_role;
grant execute on function public.mark_advanced_signer_complete(text,text) to service_role;
grant execute on function public.complete_signature_copy_delivery(uuid,public.signature_delivery_status,text) to service_role;

revoke all on function public.create_advanced_signature_document(uuid,uuid,uuid,text,text,public.signature_source_format,text,text,text,bigint,text,text,text,integer) from public,anon;
revoke all on function public.create_advanced_signature_envelope(uuid,public.signature_provider,text,jsonb) from public,anon;
revoke all on function public.add_advanced_signature_field(uuid,uuid,public.signature_field_type,integer,numeric,numeric,numeric,numeric,text,text,boolean,integer,jsonb) from public,anon;
revoke all on function public.freeze_advanced_signature_layout(uuid) from public,anon;
revoke all on function public.finalize_advanced_signature_envelope(uuid,text,text,text,text) from public,anon;
revoke all on function public.queue_signature_copy_delivery(uuid,uuid,text,public.signature_delivery_channel) from public,anon;

grant execute on function public.create_advanced_signature_document(uuid,uuid,uuid,text,text,public.signature_source_format,text,text,text,bigint,text,text,text,integer) to authenticated,service_role;
grant execute on function public.create_advanced_signature_envelope(uuid,public.signature_provider,text,jsonb) to authenticated,service_role;
grant execute on function public.add_advanced_signature_field(uuid,uuid,public.signature_field_type,integer,numeric,numeric,numeric,numeric,text,text,boolean,integer,jsonb) to authenticated,service_role;
grant execute on function public.freeze_advanced_signature_layout(uuid) to authenticated,service_role;
grant execute on function public.finalize_advanced_signature_envelope(uuid,text,text,text,text) to authenticated,service_role;
grant execute on function public.queue_signature_copy_delivery(uuid,uuid,text,public.signature_delivery_channel) to authenticated,service_role;
