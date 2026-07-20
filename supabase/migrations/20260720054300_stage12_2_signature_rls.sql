-- Etapa 12.2 — RLS do módulo de assinatura avançada.

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
  and exists(
    select 1 from public.clients client
    where client.id=client_id and client.user_id=auth.uid()
  )
);

create policy signature_document_versions_internal_read
on public.signature_document_versions for select to authenticated
using(exists(
  select 1 from public.signature_documents document
  where document.id=document_id
    and public.has_module_permission(
      document.organization_id,'assinaturas','READ'::public.app_access_level,
      document.project_id,null
    )
));

create policy signature_document_versions_internal_write
on public.signature_document_versions for all to authenticated
using(exists(
  select 1 from public.signature_documents document
  where document.id=document_id
    and public.has_module_permission(
      document.organization_id,'assinaturas','EDIT'::public.app_access_level,
      document.project_id,null
    )
))
with check(exists(
  select 1 from public.signature_documents document
  where document.id=document_id
    and public.has_module_permission(
      document.organization_id,'assinaturas','EDIT'::public.app_access_level,
      document.project_id,null
    )
));

create policy signature_document_versions_client_read
on public.signature_document_versions for select to authenticated
using(
  client_released_at is not null
  and exists(
    select 1
    from public.signature_documents document
    join public.clients client on client.id=document.client_id
    where document.id=document_id and client.user_id=auth.uid()
  )
);

create policy signature_fields_internal_read
on public.signature_fields for select to authenticated
using(exists(
  select 1
  from public.signature_document_versions version
  join public.signature_documents document on document.id=version.document_id
  where version.id=document_version_id
    and public.has_module_permission(
      document.organization_id,'assinaturas','READ'::public.app_access_level,
      document.project_id,null
    )
));

create policy signature_fields_internal_write
on public.signature_fields for all to authenticated
using(exists(
  select 1
  from public.signature_document_versions version
  join public.signature_documents document on document.id=version.document_id
  where version.id=document_version_id
    and public.has_module_permission(
      document.organization_id,'assinaturas','EDIT'::public.app_access_level,
      document.project_id,null
    )
))
with check(exists(
  select 1
  from public.signature_document_versions version
  join public.signature_documents document on document.id=version.document_id
  where version.id=document_version_id
    and public.has_module_permission(
      document.organization_id,'assinaturas','EDIT'::public.app_access_level,
      document.project_id,null
    )
));

create policy signature_fields_signer_read
on public.signature_fields for select to authenticated
using(exists(
  select 1 from public.signature_signers signer
  where signer.id=signer_id and signer.user_id=auth.uid()
));

create policy signature_field_values_internal_read
on public.signature_field_values for select to authenticated
using(exists(
  select 1
  from public.signature_fields field
  join public.signature_document_versions version on version.id=field.document_version_id
  join public.signature_documents document on document.id=version.document_id
  where field.id=field_id
    and public.has_module_permission(
      document.organization_id,'assinaturas','READ'::public.app_access_level,
      document.project_id,null
    )
));

create policy signature_field_values_signer_read
on public.signature_field_values for select to authenticated
using(exists(
  select 1 from public.signature_signers signer
  where signer.id=signer_id and signer.user_id=auth.uid()
));

create policy signature_attachments_internal_read
on public.signature_attachments for select to authenticated
using(public.has_module_permission(
  organization_id,'assinaturas','READ'::public.app_access_level,null,null
));

create policy signature_attachments_signer_read
on public.signature_attachments for select to authenticated
using(exists(
  select 1 from public.signature_signers signer
  where signer.id=signer_id and signer.user_id=auth.uid()
));

create policy signature_delivery_events_internal_read
on public.signature_delivery_events for select to authenticated
using(public.has_module_permission(
  organization_id,'assinaturas','READ'::public.app_access_level,null,null
));

create policy signature_delivery_events_recipient_read
on public.signature_delivery_events for select to authenticated
using(recipient_user_id=auth.uid() and status in('SENT','DELIVERED'));

create policy signature_evidence_internal_read
on public.signature_evidence_records for select to authenticated
using(public.has_module_permission(
  organization_id,'assinaturas','READ'::public.app_access_level,null,null
));

create policy signature_evidence_signer_read
on public.signature_evidence_records for select to authenticated
using(exists(
  select 1 from public.signature_signers signer
  where signer.id=signer_id and signer.user_id=auth.uid()
));

revoke all on public.signature_access_tokens from anon,authenticated;
revoke all on public.signature_conversion_jobs from anon,authenticated;
revoke insert,update,delete
on public.signature_field_values,
   public.signature_attachments,
   public.signature_delivery_events,
   public.signature_evidence_records
from anon,authenticated;
