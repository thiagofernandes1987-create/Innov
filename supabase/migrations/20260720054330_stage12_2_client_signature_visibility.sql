-- Etapa 12.2 — visibilidade do portal para documentos avançados liberados.

create policy signature_envelopes_client_advanced_select
on public.signature_envelopes for select to authenticated
using(
  document_version_id is not null
  and exists(
    select 1
    from public.signature_document_versions version
    join public.signature_documents document on document.id=version.document_id
    join public.clients client on client.id=document.client_id
    where version.id=document_version_id
      and version.client_released_at is not null
      and document.status='COMPLETED'
      and client.user_id=auth.uid()
  )
);

create policy signature_signers_client_advanced_select
on public.signature_signers for select to authenticated
using(
  exists(
    select 1
    from public.signature_envelopes envelope
    join public.signature_document_versions version on version.id=envelope.document_version_id
    join public.signature_documents document on document.id=version.document_id
    join public.clients client on client.id=document.client_id
    where envelope.id=envelope_id
      and version.client_released_at is not null
      and document.status='COMPLETED'
      and client.user_id=auth.uid()
  )
);

create policy signature_events_client_advanced_select
on public.signature_events for select to authenticated
using(
  exists(
    select 1
    from public.signature_envelopes envelope
    join public.signature_document_versions version on version.id=envelope.document_version_id
    join public.signature_documents document on document.id=version.document_id
    join public.clients client on client.id=document.client_id
    where envelope.id=envelope_id
      and version.client_released_at is not null
      and document.status='COMPLETED'
      and client.user_id=auth.uid()
  )
);

create policy signature_evidence_client_advanced_select
on public.signature_evidence_records for select to authenticated
using(
  exists(
    select 1
    from public.signature_envelopes envelope
    join public.signature_document_versions version on version.id=envelope.document_version_id
    join public.signature_documents document on document.id=version.document_id
    join public.clients client on client.id=document.client_id
    where envelope.id=envelope_id
      and version.client_released_at is not null
      and document.status='COMPLETED'
      and client.user_id=auth.uid()
  )
);
