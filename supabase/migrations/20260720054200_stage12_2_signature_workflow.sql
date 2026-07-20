-- Etapa 12.2 — fluxo transacional de documentos, layout, preenchimento e conclusão.

create or replace function public.create_advanced_signature_document(
  p_organization_id uuid,
  p_client_id uuid,
  p_project_id uuid,
  p_title text,
  p_category text,
  p_source_format public.signature_source_format,
  p_original_storage_path text,
  p_original_file_name text,
  p_original_mime_type text,
  p_original_size_bytes bigint,
  p_original_sha256 text,
  p_rendered_pdf_path text default null,
  p_rendered_pdf_sha256 text default null,
  p_page_count integer default null
)
returns uuid
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_document_id uuid;
  v_version_id uuid;
  v_conversion public.signature_conversion_status;
begin
  if not public.has_module_permission(
    p_organization_id,'assinaturas','EDIT'::public.app_access_level,p_project_id,null
  ) then raise exception 'Acesso negado'; end if;
  if p_original_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'Hash original inválido'; end if;
  if p_client_id is not null and not exists(
    select 1 from public.clients where id=p_client_id and organization_id=p_organization_id
  ) then raise exception 'Cliente inválido'; end if;
  if p_project_id is not null and not exists(
    select 1 from public.projects where id=p_project_id and organization_id=p_organization_id
      and(p_client_id is null or client_id=p_client_id)
  ) then raise exception 'Obra inválida'; end if;

  if p_source_format='PDF' then
    if p_original_mime_type<>'application/pdf' or p_rendered_pdf_path is null
      or p_rendered_pdf_sha256 is null or p_page_count is null then
      raise exception 'PDF exige representação e quantidade de páginas';
    end if;
    v_conversion:='READY';
  else
    if p_original_mime_type<>'application/vnd.openxmlformats-officedocument.wordprocessingml.document' then
      raise exception 'MIME de DOCX inválido';
    end if;
    v_conversion:='PENDING';
  end if;

  insert into public.signature_documents(
    organization_id,client_id,project_id,title,category,created_by
  ) values(
    p_organization_id,p_client_id,p_project_id,trim(p_title),coalesce(nullif(trim(p_category),''),'OUTRO'),auth.uid()
  ) returning id into v_document_id;

  insert into public.signature_document_versions(
    organization_id,document_id,version_number,source_format,
    original_storage_path,original_file_name,original_mime_type,original_size_bytes,original_sha256,
    rendered_pdf_path,rendered_pdf_sha256,conversion_status,page_count,created_by
  ) values(
    p_organization_id,v_document_id,1,p_source_format,
    p_original_storage_path,p_original_file_name,p_original_mime_type,p_original_size_bytes,p_original_sha256,
    p_rendered_pdf_path,p_rendered_pdf_sha256,v_conversion,p_page_count,auth.uid()
  ) returning id into v_version_id;

  update public.signature_documents set current_version_id=v_version_id where id=v_document_id;

  if p_source_format='DOCX' then
    insert into public.signature_conversion_jobs(organization_id,document_version_id)
    values(p_organization_id,v_version_id);
  end if;

  return v_document_id;
end;
$$;

create or replace function public.create_advanced_signature_envelope(
  p_document_version_id uuid,
  p_provider public.signature_provider,
  p_idempotency_key text,
  p_signers jsonb
)
returns uuid
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_version public.signature_document_versions;
  v_document public.signature_documents;
  v_envelope_id uuid;
  v_signer jsonb;
  v_signer_id uuid;
  v_token_hash text;
  v_expires_at timestamptz;
begin
  if not public.is_aal2() then raise exception 'MFA_AAL2_REQUIRED'; end if;
  select * into v_version from public.signature_document_versions where id=p_document_version_id;
  if not found then raise exception 'Versão não encontrada'; end if;
  select * into v_document from public.signature_documents where id=v_version.document_id;
  if not public.has_module_permission(
    v_version.organization_id,'assinaturas','EDIT'::public.app_access_level,v_document.project_id,'sign'
  ) then raise exception 'Acesso negado'; end if;
  if v_version.conversion_status<>'READY' then raise exception 'Documento ainda não possui PDF pronto'; end if;
  if jsonb_typeof(p_signers)<>'array' or jsonb_array_length(p_signers)=0 then raise exception 'Informe signatários'; end if;

  insert into public.signature_envelopes(
    organization_id,provider,document_version_id,status,idempotency_key,provider_payload,created_by
  ) values(
    v_version.organization_id,p_provider,p_document_version_id,'DRAFT',p_idempotency_key,
    jsonb_build_object('advanced',true,'source_format',v_version.source_format),auth.uid()
  )
  on conflict(organization_id,idempotency_key) do update set updated_at=now()
  returning id into v_envelope_id;

  for v_signer in select value from jsonb_array_elements(p_signers)
  loop
    v_token_hash:=lower(coalesce(v_signer->>'token_sha256',''));
    v_expires_at:=coalesce((v_signer->>'expires_at')::timestamptz,now()+interval '7 days');
    if v_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'Hash de token inválido'; end if;

    insert into public.signature_signers(
      organization_id,envelope_id,user_id,name,legal_name,email,initials,role_label,
      signing_order,status,authentication_method,authentication_metadata
    ) values(
      v_version.organization_id,v_envelope_id,(v_signer->>'user_id')::uuid,
      trim(v_signer->>'name'),coalesce(nullif(trim(v_signer->>'legal_name'),''),trim(v_signer->>'name')),
      lower(trim(v_signer->>'email')),nullif(trim(v_signer->>'initials'),''),
      nullif(trim(v_signer->>'role_label'),''),coalesce((v_signer->>'signing_order')::integer,1),
      'DRAFT',coalesce(nullif(v_signer->>'authentication_method',''),'EMAIL_LINK'),
      coalesce(v_signer->'authentication_metadata','{}'::jsonb)
    )
    on conflict(envelope_id,email) do update set
      name=excluded.name,legal_name=excluded.legal_name,initials=excluded.initials,
      role_label=excluded.role_label,signing_order=excluded.signing_order
    returning id into v_signer_id;

    insert into public.signature_access_tokens(
      organization_id,envelope_id,signer_id,token_sha256,document_sha256,expires_at
    ) values(
      v_version.organization_id,v_envelope_id,v_signer_id,v_token_hash,
      v_version.rendered_pdf_sha256,v_expires_at
    )
    on conflict(envelope_id,signer_id) do update set
      token_sha256=excluded.token_sha256,document_sha256=excluded.document_sha256,
      expires_at=excluded.expires_at,attempts=0,last_used_at=null,revoked_at=null,completed_at=null;
  end loop;

  return v_envelope_id;
end;
$$;

create or replace function public.add_advanced_signature_field(
  p_envelope_id uuid,
  p_signer_id uuid,
  p_field_type public.signature_field_type,
  p_page_number integer,
  p_x_ratio numeric,
  p_y_ratio numeric,
  p_width_ratio numeric,
  p_height_ratio numeric,
  p_label text,
  p_placeholder text,
  p_required boolean,
  p_signing_order integer,
  p_config jsonb default '{}'::jsonb
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
  select * into v_envelope from public.signature_envelopes where id=p_envelope_id;
  if not found or v_envelope.document_version_id is null then raise exception 'Envelope avançado inválido'; end if;
  select * into v_version from public.signature_document_versions where id=v_envelope.document_version_id for update;
  select * into v_document from public.signature_documents where id=v_version.document_id;
  if not public.has_module_permission(
    v_envelope.organization_id,'assinaturas','EDIT'::public.app_access_level,v_document.project_id,null
  ) then raise exception 'Acesso negado'; end if;
  if v_envelope.status<>'DRAFT' or v_version.layout_frozen_at is not null then raise exception 'Layout congelado'; end if;
  if p_page_number<1 or p_page_number>v_version.page_count then raise exception 'Página inválida'; end if;
  if p_signer_id is not null and not exists(
    select 1 from public.signature_signers where id=p_signer_id and envelope_id=p_envelope_id
  ) then raise exception 'Signatário inválido'; end if;

  insert into public.signature_fields(
    organization_id,document_version_id,signer_id,field_type,page_number,
    x_ratio,y_ratio,width_ratio,height_ratio,label,placeholder,required,signing_order,config,created_by
  ) values(
    v_envelope.organization_id,v_version.id,p_signer_id,p_field_type,p_page_number,
    p_x_ratio,p_y_ratio,p_width_ratio,p_height_ratio,p_label,p_placeholder,
    coalesce(p_required,true),coalesce(p_signing_order,1),coalesce(p_config,'{}'::jsonb),auth.uid()
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.freeze_advanced_signature_layout(p_envelope_id uuid)
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
  select * into v_envelope from public.signature_envelopes where id=p_envelope_id for update;
  if not found or v_envelope.document_version_id is null then raise exception 'Envelope avançado inválido'; end if;
  select * into v_version from public.signature_document_versions where id=v_envelope.document_version_id for update;
  select * into v_document from public.signature_documents where id=v_version.document_id;
  if not public.has_module_permission(
    v_envelope.organization_id,'assinaturas','EDIT'::public.app_access_level,v_document.project_id,'sign'
  ) then raise exception 'Acesso negado'; end if;
  if v_version.conversion_status<>'READY' then raise exception 'PDF não está pronto'; end if;
  if not exists(select 1 from public.signature_signers where envelope_id=p_envelope_id) then raise exception 'Sem signatários'; end if;
  if exists(
    select 1 from public.signature_signers signer
    where signer.envelope_id=p_envelope_id
      and not exists(
        select 1 from public.signature_fields field
        where field.document_version_id=v_version.id and field.signer_id=signer.id and field.field_type='SIGNATURE'
      )
  ) then raise exception 'Cada signatário precisa de um campo de assinatura'; end if;

  update public.signature_document_versions set layout_frozen_at=now(),layout_frozen_by=auth.uid() where id=v_version.id;
  update public.signature_documents set status='LAYOUT_READY',updated_at=now() where id=v_document.id;
  update public.signature_envelopes set status='SENT',sent_at=now(),updated_at=now() where id=p_envelope_id;
  update public.signature_signers set status='SENT' where envelope_id=p_envelope_id;
  return true;
end;
$$;

create or replace function public.record_advanced_signature_field_value(
  p_token_sha256 text,
  p_field_id uuid,
  p_text_value text,
  p_boolean_value boolean,
  p_file_storage_path text,
  p_file_name text,
  p_file_mime_type text,
  p_file_size_bytes bigint,
  p_file_sha256 text,
  p_value_sha256 text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_token public.signature_access_tokens;
  v_field public.signature_fields;
  v_envelope public.signature_envelopes;
  v_id uuid;
begin
  select * into v_token from public.signature_access_tokens
  where token_sha256=lower(p_token_sha256) and revoked_at is null and completed_at is null
    and expires_at>now() and attempts<max_attempts for update;
  if not found then raise exception 'TOKEN_INVALID_OR_EXPIRED'; end if;
  update public.signature_access_tokens set attempts=attempts+1,last_used_at=now() where id=v_token.id;
  select * into v_field from public.signature_fields where id=p_field_id and signer_id=v_token.signer_id;
  if not found then raise exception 'Campo não pertence ao signatário'; end if;
  select * into v_envelope from public.signature_envelopes where id=v_token.envelope_id for update;
  if v_envelope.status not in('SENT','VIEWED','PARTIALLY_SIGNED') then raise exception 'Envelope não aceita preenchimento'; end if;
  if p_value_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'Hash de valor inválido'; end if;
  if v_field.field_type in('PHOTO','ATTACHMENT','SIGNATURE','INITIALS') and(
    p_file_storage_path is null or p_file_sha256 !~ '^[a-f0-9]{64}$'
  ) then raise exception 'Campo exige arquivo autenticado'; end if;
  if v_field.field_type='CHECKBOX' and p_boolean_value is null then raise exception 'Campo exige confirmação'; end if;
  if v_field.field_type in('DATE','FULL_NAME','TEXT') and nullif(trim(p_text_value),'') is null then raise exception 'Campo exige texto'; end if;

  insert into public.signature_field_values(
    organization_id,field_id,signer_id,text_value,boolean_value,file_storage_path,
    file_name,file_mime_type,file_size_bytes,file_sha256,value_sha256
  ) values(
    v_token.organization_id,v_field.id,v_token.signer_id,p_text_value,p_boolean_value,
    p_file_storage_path,p_file_name,p_file_mime_type,p_file_size_bytes,p_file_sha256,p_value_sha256
  )
  on conflict(field_id) do update set
    text_value=excluded.text_value,boolean_value=excluded.boolean_value,
    file_storage_path=excluded.file_storage_path,file_name=excluded.file_name,
    file_mime_type=excluded.file_mime_type,file_size_bytes=excluded.file_size_bytes,
    file_sha256=excluded.file_sha256,value_sha256=excluded.value_sha256,completed_at=now()
  returning id into v_id;

  if p_file_storage_path is not null and v_field.field_type in('PHOTO','ATTACHMENT') then
    insert into public.signature_attachments(
      organization_id,envelope_id,signer_id,field_id,kind,storage_path,file_name,
      mime_type,size_bytes,sha256,captured_at,metadata
    ) values(
      v_token.organization_id,v_token.envelope_id,v_token.signer_id,v_field.id,
      case when v_field.field_type='PHOTO' then 'PHOTO' else 'DOCUMENT' end,
      p_file_storage_path,p_file_name,p_file_mime_type,p_file_size_bytes,p_file_sha256,
      case when v_field.field_type='PHOTO' then now() end,coalesce(p_metadata,'{}'::jsonb)
    ) on conflict do nothing;
  end if;

  update public.signature_envelopes set status='VIEWED',updated_at=now()
  where id=v_token.envelope_id and status='SENT';
  update public.signature_signers set status='VIEWED',viewed_at=coalesce(viewed_at,now())
  where id=v_token.signer_id and status='SENT';

  insert into public.signature_evidence_records(
    organization_id,envelope_id,signer_id,event_type,document_sha256,payload_sha256,metadata
  ) values(
    v_token.organization_id,v_token.envelope_id,v_token.signer_id,'FIELD_COMPLETED',
    v_token.document_sha256,p_value_sha256,
    jsonb_build_object('field_id',v_field.id,'field_type',v_field.field_type,'metadata',coalesce(p_metadata,'{}'::jsonb))
  );
  return v_id;
end;
$$;

create or replace function public.mark_advanced_signer_complete(p_token_sha256 text,p_payload_sha256 text)
returns boolean
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_token public.signature_access_tokens;
  v_envelope public.signature_envelopes;
begin
  select * into v_token from public.signature_access_tokens
  where token_sha256=lower(p_token_sha256) and revoked_at is null and completed_at is null
    and expires_at>now() for update;
  if not found then raise exception 'TOKEN_INVALID_OR_EXPIRED'; end if;
  if p_payload_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'Hash inválido'; end if;
  if exists(
    select 1 from public.signature_fields field
    left join public.signature_field_values value on value.field_id=field.id
    where field.signer_id=v_token.signer_id and field.required and value.id is null
  ) then raise exception 'Campos obrigatórios pendentes'; end if;

  update public.signature_signers set status='COMPLETED',signed_at=now() where id=v_token.signer_id;
  update public.signature_access_tokens set completed_at=now(),last_used_at=now() where id=v_token.id;
  select * into v_envelope from public.signature_envelopes where id=v_token.envelope_id for update;
  update public.signature_envelopes set status=case
    when exists(select 1 from public.signature_signers where envelope_id=v_token.envelope_id and status<>'COMPLETED')
      then 'PARTIALLY_SIGNED' else 'PARTIALLY_SIGNED' end,updated_at=now()
  where id=v_token.envelope_id;
  insert into public.signature_evidence_records(
    organization_id,envelope_id,signer_id,event_type,document_sha256,payload_sha256
  ) values(v_token.organization_id,v_token.envelope_id,v_token.signer_id,'SIGNER_COMPLETED',v_token.document_sha256,p_payload_sha256);
  return true;
end;
$$;

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
  select * into v_envelope from public.signature_envelopes where id=p_envelope_id for update;
  if not found or v_envelope.document_version_id is null then raise exception 'Envelope avançado inválido'; end if;
  select * into v_version from public.signature_document_versions where id=v_envelope.document_version_id for update;
  select * into v_document from public.signature_documents where id=v_version.document_id;
  if not public.has_module_permission(
    v_envelope.organization_id,'assinaturas','EDIT'::public.app_access_level,v_document.project_id,'sign'
  ) then raise exception 'Acesso negado'; end if;
  if p_final_pdf_sha256 !~ '^[a-f0-9]{64}$' or p_audit_artifact_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'Hashes finais inválidos'; end if;
  if exists(select 1 from public.signature_signers where envelope_id=p_envelope_id and status<>'COMPLETED') then raise exception 'Signatários pendentes'; end if;
  if exists(
    select 1 from public.signature_fields field
    left join public.signature_field_values value on value.field_id=field.id
    where field.document_version_id=v_version.id and field.required and value.id is null
  ) then raise exception 'Campos obrigatórios pendentes'; end if;

  update public.signature_document_versions set
    final_pdf_path=p_final_pdf_path,final_pdf_sha256=p_final_pdf_sha256,
    audit_artifact_path=p_audit_artifact_path,audit_artifact_sha256=p_audit_artifact_sha256,
    completed_at=now(),completed_by=auth.uid()
  where id=v_version.id;
  update public.signature_documents set status='COMPLETED',updated_at=now() where id=v_document.id;
  update public.signature_envelopes set status='COMPLETED',final_document_path=p_final_pdf_path,
    audit_artifact_path=p_audit_artifact_path,final_document_sha256=p_final_pdf_sha256,
    evidence_sha256=p_audit_artifact_sha256,completed_at=now(),updated_at=now()
  where id=p_envelope_id;
  insert into public.signature_evidence_records(
    organization_id,envelope_id,actor_user_id,event_type,document_sha256,payload_sha256
  ) values(v_envelope.organization_id,p_envelope_id,auth.uid(),'ENVELOPE_COMPLETED',p_final_pdf_sha256,p_audit_artifact_sha256);
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
  v_id uuid;
begin
  select * into v_envelope from public.signature_envelopes where id=p_envelope_id;
  if not found or v_envelope.status<>'COMPLETED' then raise exception 'Documento ainda não concluído'; end if;
  if not public.has_module_permission(v_envelope.organization_id,'assinaturas','READ'::public.app_access_level,null,'release') then raise exception 'Acesso negado'; end if;
  insert into public.signature_delivery_events(
    organization_id,envelope_id,recipient_user_id,recipient_email,channel,status,copy_storage_path,copy_sha256,created_by
  ) values(
    v_envelope.organization_id,p_envelope_id,p_recipient_user_id,lower(trim(p_recipient_email)),p_channel,
    'PENDING',v_envelope.final_document_path,v_envelope.final_document_sha256,auth.uid()
  ) returning id into v_id;
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
  select * into v_delivery from public.signature_delivery_events where id=p_delivery_id for update;
  if not found then raise exception 'Entrega não encontrada'; end if;
  update public.signature_delivery_events set status=p_status,attempts=attempts+1,last_error=p_error,
    sent_at=case when p_status in('SENT','DELIVERED') then coalesce(sent_at,now()) else sent_at end,
    delivered_at=case when p_status='DELIVERED' then now() else delivered_at end,updated_at=now()
  where id=p_delivery_id;
  if p_status in('SENT','DELIVERED') then
    update public.signature_envelopes set client_copy_sent_at=coalesce(client_copy_sent_at,now()) where id=v_delivery.envelope_id;
    update public.signature_signers set copy_sent_at=coalesce(copy_sent_at,now())
      where envelope_id=v_delivery.envelope_id and lower(email)=lower(v_delivery.recipient_email);
  end if;
  return true;
end;
$$;

create or replace function public.protect_signature_document_version()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if old.completed_at is not null then raise exception 'Versão assinada é imutável'; end if;
  if old.layout_frozen_at is not null and(
    new.original_storage_path is distinct from old.original_storage_path
    or new.original_sha256 is distinct from old.original_sha256
    or new.rendered_pdf_path is distinct from old.rendered_pdf_path
    or new.rendered_pdf_sha256 is distinct from old.rendered_pdf_sha256
    or new.page_count is distinct from old.page_count
  ) then raise exception 'Layout congelado é imutável'; end if;
  return new;
end;$$;
drop trigger if exists signature_document_versions_protect on public.signature_document_versions;
create trigger signature_document_versions_protect before update on public.signature_document_versions
for each row execute function public.protect_signature_document_version();

create or replace function public.protect_signature_field_layout()
returns trigger language plpgsql set search_path=public,pg_temp as $$
declare v_version_id uuid:=coalesce(new.document_version_id,old.document_version_id);
begin
  if exists(select 1 from public.signature_document_versions where id=v_version_id and layout_frozen_at is not null) then
    raise exception 'Campos de layout congelado são imutáveis';
  end if;
  return coalesce(new,old);
end;$$;
drop trigger if exists signature_fields_protect on public.signature_fields;
create trigger signature_fields_protect before update or delete on public.signature_fields
for each row execute function public.protect_signature_field_layout();
