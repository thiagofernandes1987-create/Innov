-- Etapa 12.2 — conclusão, evidência, cópia ao cliente e invariantes.

create or replace function public.finalize_advanced_signature_envelope(
  p_envelope_id uuid,
  p_final_pdf_path text,
  p_final_pdf_sha256 text,
  p_audit_artifact_path text,
  p_audit_artifact_sha256 text
)
returns boolean
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_envelope public.signature_envelopes;
  v_version public.signature_document_versions;
  v_document public.signature_documents;
begin
  if not public.is_aal2() then raise exception 'MFA_AAL2_REQUIRED'; end if;
  select * into v_envelope
  from public.signature_envelopes
  where id=p_envelope_id
  for update;
  if not found or v_envelope.document_version_id is null then
    raise exception 'Envelope avançado inválido';
  end if;
  select * into v_version
  from public.signature_document_versions
  where id=v_envelope.document_version_id
  for update;
  select * into v_document
  from public.signature_documents
  where id=v_version.document_id;
  if not public.has_module_permission(
    v_envelope.organization_id,'assinaturas','EDIT'::public.app_access_level,
    v_document.project_id,'sign'
  ) then raise exception 'Acesso negado'; end if;
  if lower(p_final_pdf_sha256) !~ '^[a-f0-9]{64}$'
    or lower(p_audit_artifact_sha256) !~ '^[a-f0-9]{64}$' then
    raise exception 'Hashes finais inválidos';
  end if;
  if exists(
    select 1 from public.signature_signers
    where envelope_id=p_envelope_id and status<>'COMPLETED'
  ) then raise exception 'Signatários pendentes'; end if;
  if exists(
    select 1
    from public.signature_fields field
    left join public.signature_field_values value on value.field_id=field.id
    where field.document_version_id=v_version.id
      and field.required
      and value.id is null
  ) then raise exception 'Campos obrigatórios pendentes'; end if;

  update public.signature_document_versions
  set final_pdf_path=p_final_pdf_path,
      final_pdf_sha256=lower(p_final_pdf_sha256),
      audit_artifact_path=p_audit_artifact_path,
      audit_artifact_sha256=lower(p_audit_artifact_sha256),
      completed_at=now(),
      completed_by=auth.uid()
  where id=v_version.id;

  update public.signature_documents
  set status='COMPLETED',updated_at=now()
  where id=v_document.id;

  update public.signature_envelopes
  set status='COMPLETED',
      final_document_path=p_final_pdf_path,
      audit_artifact_path=p_audit_artifact_path,
      final_document_sha256=lower(p_final_pdf_sha256),
      evidence_sha256=lower(p_audit_artifact_sha256),
      completed_at=now(),
      updated_at=now()
  where id=p_envelope_id;

  insert into public.signature_evidence_records(
    organization_id,envelope_id,actor_user_id,event_type,
    document_sha256,payload_sha256
  ) values(
    v_envelope.organization_id,p_envelope_id,auth.uid(),
    'ENVELOPE_COMPLETED',lower(p_final_pdf_sha256),
    lower(p_audit_artifact_sha256)
  );
  return true;
end;
$$;

create or replace function public.queue_signature_copy_delivery(
  p_envelope_id uuid,
  p_recipient_user_id uuid,
  p_recipient_email text,
  p_channel public.signature_delivery_channel
)
returns uuid
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_envelope public.signature_envelopes;
  v_version public.signature_document_versions;
  v_document public.signature_documents;
  v_id uuid;
begin
  select * into v_envelope
  from public.signature_envelopes
  where id=p_envelope_id;
  if not found or v_envelope.status<>'COMPLETED'
    or v_envelope.document_version_id is null then
    raise exception 'Documento ainda não concluído';
  end if;
  select * into v_version
  from public.signature_document_versions
  where id=v_envelope.document_version_id;
  select * into v_document
  from public.signature_documents
  where id=v_version.document_id;
  if not public.has_module_permission(
    v_envelope.organization_id,'assinaturas','READ'::public.app_access_level,
    v_document.project_id,'release'
  ) then raise exception 'Acesso negado'; end if;

  insert into public.signature_delivery_events(
    organization_id,envelope_id,recipient_user_id,recipient_email,
    channel,status,copy_storage_path,copy_sha256,created_by
  ) values(
    v_envelope.organization_id,
    p_envelope_id,
    p_recipient_user_id,
    lower(trim(p_recipient_email)),
    p_channel,
    'PENDING',
    v_envelope.final_document_path,
    v_envelope.final_document_sha256,
    auth.uid()
  ) returning id into v_id;

  if p_channel='PORTAL' and p_recipient_user_id is not null then
    update public.signature_document_versions
    set client_released_at=coalesce(client_released_at,now()),
        client_released_by=auth.uid()
    where id=v_version.id;
  end if;

  return v_id;
end;
$$;

create or replace function public.complete_signature_copy_delivery(
  p_delivery_id uuid,
  p_status public.signature_delivery_status,
  p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_delivery public.signature_delivery_events;
begin
  select * into v_delivery
  from public.signature_delivery_events
  where id=p_delivery_id
  for update;
  if not found then raise exception 'Entrega não encontrada'; end if;

  update public.signature_delivery_events
  set status=p_status,
      attempts=attempts+1,
      last_error=p_error,
      sent_at=case when p_status in('SENT','DELIVERED')
        then coalesce(sent_at,now()) else sent_at end,
      delivered_at=case when p_status='DELIVERED'
        then now() else delivered_at end,
      updated_at=now()
  where id=p_delivery_id;

  if p_status in('SENT','DELIVERED') then
    update public.signature_envelopes
    set client_copy_sent_at=coalesce(client_copy_sent_at,now())
    where id=v_delivery.envelope_id;
    update public.signature_signers
    set copy_sent_at=coalesce(copy_sent_at,now())
    where envelope_id=v_delivery.envelope_id
      and lower(email)=lower(v_delivery.recipient_email);
  end if;
  return true;
end;
$$;

create or replace function public.protect_signature_document_version()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
begin
  if old.completed_at is not null then
    if new.original_storage_path is distinct from old.original_storage_path
      or new.original_sha256 is distinct from old.original_sha256
      or new.rendered_pdf_path is distinct from old.rendered_pdf_path
      or new.rendered_pdf_sha256 is distinct from old.rendered_pdf_sha256
      or new.final_pdf_path is distinct from old.final_pdf_path
      or new.final_pdf_sha256 is distinct from old.final_pdf_sha256
      or new.audit_artifact_path is distinct from old.audit_artifact_path
      or new.audit_artifact_sha256 is distinct from old.audit_artifact_sha256
      or new.completed_at is distinct from old.completed_at then
      raise exception 'Versão assinada é imutável';
    end if;
  end if;
  if old.layout_frozen_at is not null and(
    new.original_storage_path is distinct from old.original_storage_path
    or new.original_sha256 is distinct from old.original_sha256
    or new.rendered_pdf_path is distinct from old.rendered_pdf_path
    or new.rendered_pdf_sha256 is distinct from old.rendered_pdf_sha256
    or new.page_count is distinct from old.page_count
  ) then raise exception 'Layout congelado é imutável'; end if;
  return new;
end;
$$;

drop trigger if exists signature_document_versions_protect
on public.signature_document_versions;
create trigger signature_document_versions_protect
before update on public.signature_document_versions
for each row execute function public.protect_signature_document_version();

create or replace function public.protect_signature_field_layout()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
declare
  v_version_id uuid;
begin
  if tg_op='DELETE' then v_version_id:=old.document_version_id;
  else v_version_id:=new.document_version_id;
  end if;
  if exists(
    select 1 from public.signature_document_versions
    where id=v_version_id and layout_frozen_at is not null
  ) then raise exception 'Campos de layout congelado são imutáveis'; end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists signature_fields_protect on public.signature_fields;
create trigger signature_fields_protect
before update or delete on public.signature_fields
for each row execute function public.protect_signature_field_layout();
