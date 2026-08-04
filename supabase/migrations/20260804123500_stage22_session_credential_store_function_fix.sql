-- Sprint W-07 — qualifica referências que também são nomes de parâmetros OUT.

begin;

create or replace function public.compare_and_swap_channel_session_credentials(
  p_session_id uuid,
  p_organization_id uuid,
  p_account_id uuid,
  p_provider_type text,
  p_provider_account_id text,
  p_expected_generation bigint,
  p_data_key_version bigint,
  p_kek_id text,
  p_kek_version bigint,
  p_wrapped_dek bytea,
  p_wrap_iv bytea,
  p_wrap_auth_tag bytea,
  p_wrap_aad_sha256 text,
  p_encoding text,
  p_ciphertext bytea,
  p_iv bytea,
  p_auth_tag bytea,
  p_aad_sha256 text,
  p_correlation_id text default null
)
returns table(generation bigint,record_version bigint,data_key_version bigint)
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_envelope public.channel_session_secret_envelopes%rowtype;
  v_record_version bigint;
begin
  select envelope.* into v_envelope
  from public.channel_session_secret_envelopes as envelope
  where envelope.session_id=p_session_id
  for update;

  if not found then
    if p_expected_generation is not null then
      raise exception 'SESSION_NOT_FOUND';
    end if;
    insert into public.channel_session_secret_envelopes(
      session_id,organization_id,account_id,provider_type,provider_account_id,
      schema_version,generation,data_key_version,kek_id,kek_version,
      wrapped_dek,wrap_iv,wrap_auth_tag,wrap_aad_sha256
    ) values (
      p_session_id,p_organization_id,p_account_id,p_provider_type,p_provider_account_id,
      1,1,p_data_key_version,p_kek_id,p_kek_version,
      p_wrapped_dek,p_wrap_iv,p_wrap_auth_tag,p_wrap_aad_sha256
    );
    v_record_version:=1;
  else
    if p_expected_generation is null or v_envelope.generation<>p_expected_generation then
      raise exception 'GENERATION_CONFLICT';
    end if;
    if v_envelope.organization_id<>p_organization_id
      or v_envelope.account_id<>p_account_id
      or v_envelope.provider_type<>p_provider_type
      or v_envelope.provider_account_id<>p_provider_account_id
      or v_envelope.data_key_version<>p_data_key_version
    then
      raise exception 'INVALID_SCOPE';
    end if;

    select coalesce(credentials.record_version,0)+1
      into v_record_version
    from public.channel_session_credentials as credentials
    where credentials.session_id=p_session_id;
    v_record_version:=coalesce(v_record_version,1);

    update public.channel_session_secret_envelopes as envelope
    set generation=envelope.generation+1,
        updated_at=now()
    where envelope.session_id=p_session_id;
  end if;

  insert into public.channel_session_credentials(
    session_id,record_version,encoding,ciphertext,iv,auth_tag,aad_sha256,updated_at
  ) values (
    p_session_id,v_record_version,p_encoding,p_ciphertext,p_iv,p_auth_tag,p_aad_sha256,now()
  )
  on conflict(session_id) do update set
    record_version=excluded.record_version,
    encoding=excluded.encoding,
    ciphertext=excluded.ciphertext,
    iv=excluded.iv,
    auth_tag=excluded.auth_tag,
    aad_sha256=excluded.aad_sha256,
    updated_at=excluded.updated_at;

  insert into public.channel_session_secret_audit(
    session_id,organization_id,account_id,provider_type,provider_account_id,
    action,outcome,generation,correlation_id,attributes
  )
  select
    envelope.session_id,envelope.organization_id,envelope.account_id,
    envelope.provider_type,envelope.provider_account_id,
    'CREDENTIALS_WRITTEN','SUCCESS',envelope.generation,p_correlation_id,
    jsonb_build_object('recordVersion',v_record_version,'encrypted',true)
  from public.channel_session_secret_envelopes as envelope
  where envelope.session_id=p_session_id;

  return query
  select envelope.generation,v_record_version,envelope.data_key_version
  from public.channel_session_secret_envelopes as envelope
  where envelope.session_id=p_session_id;
end;
$$;

commit;
