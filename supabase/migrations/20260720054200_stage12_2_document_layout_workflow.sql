-- Etapa 12.2 — criação de documento, envelope, signatários e layout.

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
  if nullif(trim(p_title),'') is null then raise exception 'Título obrigatório'; end if;
  if p_original_size_bytes<=0 then raise exception 'Tamanho inválido'; end if;
  if lower(p_original_sha256) !~ '^[a-f0-9]{64}$' then raise exception 'Hash original inválido'; end if;
  if p_client_id is not null and not exists(
    select 1 from public.clients where id=p_client_id and organization_id=p_organization_id
  ) then raise exception 'Cliente inválido'; end if;
  if p_project_id is not null and not exists(
    select 1 from public.projects where id=p_project_id and organization_id=p_organization_id
      and(p_client_id is null or client_id=p_client_id)
  ) then raise exception 'Obra inválida'; end if;

  if p_source_format='PDF' then
    if p_original_mime_type<>'application/pdf'
      or p_rendered_pdf_path is null
      or lower(p_rendered_pdf_sha256) !~ '^[a-f0-9]{64}$'
      or p_page_count is null or p_page_count<1 then
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
    p_organization_id,p_client_id,p_project_id,trim(p_title),
    coalesce(nullif(trim(p_category),''),'OUTRO'),auth.uid()
  ) returning id into v_document_id;

  insert into public.signature_document_versions(
    organization_id,document_id,version_number,source_format,
    original_storage_path,original_file_name,original_mime_type,
    original_size_bytes,original_sha256,rendered_pdf_path,
    rendered_pdf_sha256,conversion_status,page_count,created_by
  ) values(
    p_organization_id,v_document_id,1,p_source_format,
    p_original_storage_path,p_original_file_name,p_original_mime_type,
    p_original_size_bytes,lower(p_original_sha256),p_rendered_pdf_path,
    lower(p_rendered_pdf_sha256),v_conversion,p_page_count,auth.uid()
  ) returning id into v_version_id;

  update public.signature_documents
  set current_version_id=v_version_id
  where id=v_document_id;

  if p_source_format='DOCX' then
    insert into public.signature_conversion_jobs(organization_id,document_version_id)
    values(p_organization_id,v_version_id)
    on conflict(document_version_id) do nothing;
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
  v_email text;
  v_order integer;
  v_expires_at timestamptz;
begin
  if not public.is_aal2() then raise exception 'MFA_AAL2_REQUIRED'; end if;
  select * into v_version
  from public.signature_document_versions
  where id=p_document_version_id;
  if not found then raise exception 'Versão não encontrada'; end if;
  select * into v_document
  from public.signature_documents
  where id=v_version.document_id;
  if not public.has_module_permission(
    v_version.organization_id,'assinaturas','EDIT'::public.app_access_level,
    v_document.project_id,'sign'
  ) then raise exception 'Acesso negado'; end if;
  if v_version.conversion_status<>'READY' then
    raise exception 'Documento ainda não possui PDF pronto';
  end if;
  if jsonb_typeof(p_signers)<>'array' or jsonb_array_length(p_signers)=0 then
    raise exception 'Informe signatários';
  end if;

  insert into public.signature_envelopes(
    organization_id,provider,document_version_id,status,
    idempotency_key,provider_payload,created_by
  ) values(
    v_version.organization_id,p_provider,p_document_version_id,'DRAFT',
    p_idempotency_key,
    jsonb_build_object('advanced',true,'source_format',v_version.source_format),
    auth.uid()
  )
  on conflict(organization_id,idempotency_key) do update set updated_at=now()
  returning id into v_envelope_id;

  for v_signer in select value from jsonb_array_elements(p_signers)
  loop
    v_token_hash:=lower(coalesce(v_signer->>'token_sha256',''));
    v_email:=lower(trim(coalesce(v_signer->>'email','')));
    v_order:=coalesce(nullif(v_signer->>'signing_order','')::integer,1);
    v_expires_at:=coalesce(
      nullif(v_signer->>'expires_at','')::timestamptz,
      now()+interval '7 days'
    );
    if v_token_hash !~ '^[a-f0-9]{64}$' then
      raise exception 'Hash de token inválido';
    end if;
    if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
      raise exception 'E-mail de signatário inválido';
    end if;

    select id into v_signer_id
    from public.signature_signers
    where envelope_id=v_envelope_id
      and lower(email)=v_email
      and signing_order=v_order;

    if v_signer_id is null then
      insert into public.signature_signers(
        organization_id,envelope_id,user_id,name,legal_name,email,
        initials,role_label,signing_order,status,
        authentication_method,authentication_metadata
      ) values(
        v_version.organization_id,
        v_envelope_id,
        nullif(v_signer->>'user_id','')::uuid,
        trim(v_signer->>'name'),
        coalesce(nullif(trim(v_signer->>'legal_name'),''),trim(v_signer->>'name')),
        v_email,
        nullif(trim(v_signer->>'initials'),''),
        nullif(trim(v_signer->>'role_label'),''),
        v_order,
        'DRAFT',
        coalesce(nullif(v_signer->>'authentication_method',''),'EMAIL_LINK'),
        coalesce(v_signer->'authentication_metadata','{}'::jsonb)
      ) returning id into v_signer_id;
    else
      update public.signature_signers
      set name=trim(v_signer->>'name'),
          legal_name=coalesce(nullif(trim(v_signer->>'legal_name'),''),trim(v_signer->>'name')),
          initials=nullif(trim(v_signer->>'initials'),''),
          role_label=nullif(trim(v_signer->>'role_label'),''),
          user_id=nullif(v_signer->>'user_id','')::uuid,
          authentication_method=coalesce(nullif(v_signer->>'authentication_method',''),'EMAIL_LINK'),
          authentication_metadata=coalesce(v_signer->'authentication_metadata','{}'::jsonb)
      where id=v_signer_id;
    end if;

    insert into public.signature_access_tokens(
      organization_id,envelope_id,signer_id,token_sha256,
      document_sha256,expires_at
    ) values(
      v_version.organization_id,v_envelope_id,v_signer_id,
      v_token_hash,v_version.rendered_pdf_sha256,v_expires_at
    )
    on conflict(envelope_id,signer_id) do update set
      token_sha256=excluded.token_sha256,
      document_sha256=excluded.document_sha256,
      expires_at=excluded.expires_at,
      attempts=0,
      last_used_at=null,
      revoked_at=null,
      completed_at=null;
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
  select * into v_envelope
  from public.signature_envelopes
  where id=p_envelope_id;
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
    v_document.project_id,null
  ) then raise exception 'Acesso negado'; end if;
  if v_envelope.status<>'DRAFT' or v_version.layout_frozen_at is not null then
    raise exception 'Layout congelado';
  end if;
  if p_page_number<1 or p_page_number>v_version.page_count then
    raise exception 'Página inválida';
  end if;
  if p_signer_id is not null and not exists(
    select 1 from public.signature_signers
    where id=p_signer_id and envelope_id=p_envelope_id
  ) then raise exception 'Signatário inválido'; end if;

  insert into public.signature_fields(
    organization_id,document_version_id,signer_id,field_type,
    page_number,x_ratio,y_ratio,width_ratio,height_ratio,
    label,placeholder,required,signing_order,config,created_by
  ) values(
    v_envelope.organization_id,v_version.id,p_signer_id,p_field_type,
    p_page_number,p_x_ratio,p_y_ratio,p_width_ratio,p_height_ratio,
    p_label,p_placeholder,coalesce(p_required,true),
    coalesce(p_signing_order,1),coalesce(p_config,'{}'::jsonb),auth.uid()
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
  if v_version.conversion_status<>'READY' then raise exception 'PDF não está pronto'; end if;
  if not exists(
    select 1 from public.signature_signers where envelope_id=p_envelope_id
  ) then raise exception 'Sem signatários'; end if;
  if exists(
    select 1
    from public.signature_signers signer
    where signer.envelope_id=p_envelope_id
      and not exists(
        select 1 from public.signature_fields field
        where field.document_version_id=v_version.id
          and field.signer_id=signer.id
          and field.field_type='SIGNATURE'
      )
  ) then raise exception 'Cada signatário precisa de um campo de assinatura'; end if;

  update public.signature_document_versions
  set layout_frozen_at=now(),layout_frozen_by=auth.uid()
  where id=v_version.id;
  update public.signature_documents
  set status='LAYOUT_READY',updated_at=now()
  where id=v_document.id;
  update public.signature_envelopes
  set status='SENT',sent_at=now(),updated_at=now()
  where id=p_envelope_id;
  update public.signature_signers
  set status='SENT'
  where envelope_id=p_envelope_id;
  return true;
end;
$$;
