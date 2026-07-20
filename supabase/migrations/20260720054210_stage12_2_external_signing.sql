-- Etapa 12.2 — preenchimento externo por token com hash.

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
  if lower(p_token_sha256) !~ '^[a-f0-9]{64}$' then
    raise exception 'TOKEN_INVALID_OR_EXPIRED';
  end if;
  select * into v_token
  from public.signature_access_tokens
  where token_sha256=lower(p_token_sha256)
    and revoked_at is null
    and completed_at is null
    and expires_at>now()
    and attempts<max_attempts
  for update;
  if not found then raise exception 'TOKEN_INVALID_OR_EXPIRED'; end if;

  update public.signature_access_tokens
  set attempts=attempts+1,last_used_at=now()
  where id=v_token.id;

  select * into v_field
  from public.signature_fields
  where id=p_field_id and signer_id=v_token.signer_id;
  if not found then raise exception 'Campo não pertence ao signatário'; end if;

  select * into v_envelope
  from public.signature_envelopes
  where id=v_token.envelope_id
  for update;
  if v_envelope.status not in('SENT','VIEWED','PARTIALLY_SIGNED') then
    raise exception 'Envelope não aceita preenchimento';
  end if;
  if lower(p_value_sha256) !~ '^[a-f0-9]{64}$' then
    raise exception 'Hash de valor inválido';
  end if;

  if v_field.field_type in('PHOTO','ATTACHMENT','SIGNATURE','INITIALS') then
    if p_file_storage_path is null or lower(p_file_sha256) !~ '^[a-f0-9]{64}$'
      or p_file_size_bytes is null or p_file_size_bytes<=0 then
      raise exception 'Campo exige arquivo autenticado';
    end if;
  elsif v_field.field_type='CHECKBOX' then
    if p_boolean_value is null then raise exception 'Campo exige confirmação'; end if;
  elsif v_field.field_type in('DATE','FULL_NAME','TEXT') then
    if nullif(trim(p_text_value),'') is null then raise exception 'Campo exige texto'; end if;
  end if;

  insert into public.signature_field_values(
    organization_id,field_id,signer_id,text_value,boolean_value,
    file_storage_path,file_name,file_mime_type,file_size_bytes,
    file_sha256,value_sha256
  ) values(
    v_token.organization_id,v_field.id,v_token.signer_id,p_text_value,
    p_boolean_value,p_file_storage_path,p_file_name,p_file_mime_type,
    p_file_size_bytes,lower(p_file_sha256),lower(p_value_sha256)
  )
  on conflict(field_id) do update set
    text_value=excluded.text_value,
    boolean_value=excluded.boolean_value,
    file_storage_path=excluded.file_storage_path,
    file_name=excluded.file_name,
    file_mime_type=excluded.file_mime_type,
    file_size_bytes=excluded.file_size_bytes,
    file_sha256=excluded.file_sha256,
    value_sha256=excluded.value_sha256,
    completed_at=now()
  returning id into v_id;

  if p_file_storage_path is not null
    and v_field.field_type in('PHOTO','ATTACHMENT')
    and not exists(
      select 1 from public.signature_attachments
      where field_id=v_field.id and sha256=lower(p_file_sha256)
    ) then
    insert into public.signature_attachments(
      organization_id,envelope_id,signer_id,field_id,kind,
      storage_path,file_name,mime_type,size_bytes,sha256,
      captured_at,metadata
    ) values(
      v_token.organization_id,
      v_token.envelope_id,
      v_token.signer_id,
      v_field.id,
      case when v_field.field_type='PHOTO'
        then 'PHOTO'::public.signature_attachment_kind
        else 'DOCUMENT'::public.signature_attachment_kind end,
      p_file_storage_path,
      p_file_name,
      p_file_mime_type,
      p_file_size_bytes,
      lower(p_file_sha256),
      case when v_field.field_type='PHOTO' then now() end,
      coalesce(p_metadata,'{}'::jsonb)
    );
  end if;

  update public.signature_envelopes
  set status='VIEWED',updated_at=now()
  where id=v_token.envelope_id and status='SENT';
  update public.signature_signers
  set status='VIEWED',viewed_at=coalesce(viewed_at,now())
  where id=v_token.signer_id and status='SENT';

  insert into public.signature_evidence_records(
    organization_id,envelope_id,signer_id,event_type,
    document_sha256,payload_sha256,metadata
  ) values(
    v_token.organization_id,
    v_token.envelope_id,
    v_token.signer_id,
    'FIELD_COMPLETED',
    v_token.document_sha256,
    lower(p_value_sha256),
    jsonb_build_object(
      'field_id',v_field.id,
      'field_type',v_field.field_type,
      'metadata',coalesce(p_metadata,'{}'::jsonb)
    )
  );

  return v_id;
end;
$$;

create or replace function public.mark_advanced_signer_complete(
  p_token_sha256 text,
  p_payload_sha256 text
)
returns boolean
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_token public.signature_access_tokens;
  v_remaining integer;
begin
  select * into v_token
  from public.signature_access_tokens
  where token_sha256=lower(p_token_sha256)
    and revoked_at is null
    and completed_at is null
    and expires_at>now()
  for update;
  if not found then raise exception 'TOKEN_INVALID_OR_EXPIRED'; end if;
  if lower(p_payload_sha256) !~ '^[a-f0-9]{64}$' then
    raise exception 'Hash inválido';
  end if;
  if exists(
    select 1
    from public.signature_fields field
    left join public.signature_field_values value on value.field_id=field.id
    where field.signer_id=v_token.signer_id
      and field.required
      and value.id is null
  ) then raise exception 'Campos obrigatórios pendentes'; end if;

  update public.signature_signers
  set status='COMPLETED',signed_at=now()
  where id=v_token.signer_id;
  update public.signature_access_tokens
  set completed_at=now(),last_used_at=now()
  where id=v_token.id;

  select count(*) into v_remaining
  from public.signature_signers
  where envelope_id=v_token.envelope_id and status<>'COMPLETED';

  update public.signature_envelopes
  set status=case when v_remaining=0 then 'PARTIALLY_SIGNED' else 'PARTIALLY_SIGNED' end,
      updated_at=now()
  where id=v_token.envelope_id;

  insert into public.signature_evidence_records(
    organization_id,envelope_id,signer_id,event_type,
    document_sha256,payload_sha256
  ) values(
    v_token.organization_id,
    v_token.envelope_id,
    v_token.signer_id,
    'SIGNER_COMPLETED',
    v_token.document_sha256,
    lower(p_payload_sha256)
  );
  return true;
end;
$$;

create or replace function public.get_advanced_signing_context(p_token_sha256 text)
returns table(
  envelope_id uuid,
  signer_id uuid,
  signer_name text,
  signer_legal_name text,
  signer_email text,
  document_title text,
  document_version_id uuid,
  rendered_pdf_path text,
  rendered_pdf_sha256 text,
  page_count integer,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path=public,auth,pg_temp
as $$
  select
    token.envelope_id,
    signer.id,
    signer.name,
    signer.legal_name,
    signer.email,
    document.title,
    version.id,
    version.rendered_pdf_path,
    version.rendered_pdf_sha256,
    version.page_count,
    token.expires_at
  from public.signature_access_tokens token
  join public.signature_signers signer on signer.id=token.signer_id
  join public.signature_envelopes envelope on envelope.id=token.envelope_id
  join public.signature_document_versions version on version.id=envelope.document_version_id
  join public.signature_documents document on document.id=version.document_id
  where token.token_sha256=lower(p_token_sha256)
    and token.revoked_at is null
    and token.completed_at is null
    and token.expires_at>now()
    and token.attempts<token.max_attempts
    and envelope.status in('SENT','VIEWED','PARTIALLY_SIGNED');
$$;

create or replace function public.list_advanced_signer_fields(p_token_sha256 text)
returns table(
  field_id uuid,
  field_type public.signature_field_type,
  page_number integer,
  x_ratio numeric,
  y_ratio numeric,
  width_ratio numeric,
  height_ratio numeric,
  label text,
  placeholder text,
  required boolean,
  signing_order integer,
  config jsonb,
  completed boolean
)
language sql
stable
security definer
set search_path=public,auth,pg_temp
as $$
  select
    field.id,
    field.field_type,
    field.page_number,
    field.x_ratio,
    field.y_ratio,
    field.width_ratio,
    field.height_ratio,
    field.label,
    field.placeholder,
    field.required,
    field.signing_order,
    field.config,
    value.id is not null
  from public.signature_access_tokens token
  join public.signature_fields field on field.signer_id=token.signer_id
  left join public.signature_field_values value on value.field_id=field.id
  where token.token_sha256=lower(p_token_sha256)
    and token.revoked_at is null
    and token.completed_at is null
    and token.expires_at>now()
  order by field.signing_order,field.page_number,field.created_at;
$$;
