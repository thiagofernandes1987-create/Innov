-- Etapa 12.2 — índices de apoio para joins, RLS e auditoria.

create index if not exists signature_documents_created_by_idx
  on public.signature_documents(created_by);
create index if not exists signature_document_versions_created_by_idx
  on public.signature_document_versions(created_by);
create index if not exists signature_document_versions_layout_frozen_by_idx
  on public.signature_document_versions(layout_frozen_by)
  where layout_frozen_by is not null;
create index if not exists signature_document_versions_completed_by_idx
  on public.signature_document_versions(completed_by)
  where completed_by is not null;
create index if not exists signature_envelopes_document_version_full_idx
  on public.signature_envelopes(document_version_id);
create index if not exists signature_signers_user_id_idx
  on public.signature_signers(user_id)
  where user_id is not null;
create index if not exists signature_fields_created_by_idx
  on public.signature_fields(created_by);
create index if not exists signature_field_values_signer_id_idx
  on public.signature_field_values(signer_id)
  where signer_id is not null;
create index if not exists signature_attachments_field_id_idx
  on public.signature_attachments(field_id)
  where field_id is not null;
create index if not exists signature_delivery_events_recipient_user_idx
  on public.signature_delivery_events(recipient_user_id)
  where recipient_user_id is not null;
create index if not exists signature_delivery_events_created_by_idx
  on public.signature_delivery_events(created_by)
  where created_by is not null;
create index if not exists signature_evidence_records_signer_idx
  on public.signature_evidence_records(signer_id)
  where signer_id is not null;
create index if not exists signature_evidence_records_actor_idx
  on public.signature_evidence_records(actor_user_id)
  where actor_user_id is not null;
