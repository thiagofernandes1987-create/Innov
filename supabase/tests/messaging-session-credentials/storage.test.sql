-- Sprint W-07 — testes comportamentais do armazenamento cifrado de sessão.

update public.whatsapp_accounts
set provider_type='WHATSAPP_WEB_BAILEYS',
    provider_account_id='baileys-test-account'
where id='10000000-0000-0000-0000-000000000001';

-- 1. Criação atômica da sessão + credenciais cifradas.
do $$
declare
  result record;
begin
  select * into result
  from public.compare_and_swap_channel_session_credentials(
    '71000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '10000000-0000-0000-0000-000000000001',
    'WHATSAPP_WEB_BAILEYS','baileys-test-account',
    null,1,'kms-test',1,
    decode(repeat('ab',32),'hex'),decode(repeat('01',12),'hex'),
    decode(repeat('02',16),'hex'),repeat('a',64),
    'BINARY',decode(repeat('cd',48),'hex'),decode(repeat('03',12),'hex'),
    decode(repeat('04',16),'hex'),repeat('b',64),'corr-create'
  );
  if result.generation<>1 or result.record_version<>1 or result.data_key_version<>1 then
    raise exception 'Criação CAS retornou versão inesperada: %',result;
  end if;
  raise notice 'W-07 criação transacional aprovada';
end;
$$;

-- 2. Optimistic concurrency rejeita geração obsoleta.
do $$
begin
  perform public.compare_and_swap_channel_session_credentials(
    '71000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '10000000-0000-0000-0000-000000000001',
    'WHATSAPP_WEB_BAILEYS','baileys-test-account',
    0,1,'kms-test',1,
    decode(repeat('ab',32),'hex'),decode(repeat('01',12),'hex'),
    decode(repeat('02',16),'hex'),repeat('a',64),
    'BINARY',decode(repeat('ef',48),'hex'),decode(repeat('05',12),'hex'),
    decode(repeat('06',16),'hex'),repeat('c',64),'corr-stale'
  );
  raise exception 'Geração obsoleta foi aceita.';
exception
  when others then
    if position('GENERATION_CONFLICT' in sqlerrm)=0 then raise; end if;
    raise notice 'W-07 concorrência otimista aprovada';
end;
$$;

-- 3. Atualização válida incrementa geração e record_version.
do $$
declare
  result record;
begin
  select * into result
  from public.compare_and_swap_channel_session_credentials(
    '71000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '10000000-0000-0000-0000-000000000001',
    'WHATSAPP_WEB_BAILEYS','baileys-test-account',
    1,1,'kms-test',1,
    decode(repeat('ab',32),'hex'),decode(repeat('01',12),'hex'),
    decode(repeat('02',16),'hex'),repeat('a',64),
    'BINARY',decode(repeat('ef',48),'hex'),decode(repeat('05',12),'hex'),
    decode(repeat('06',16),'hex'),repeat('c',64),'corr-update'
  );
  if result.generation<>2 or result.record_version<>2 then
    raise exception 'Incremento CAS inesperado: %',result;
  end if;
  raise notice 'W-07 versionamento crescente aprovado';
end;
$$;

-- 4. Banco contém somente material cifrado binário e não possui chave-mestra.
do $$
declare
  forbidden_count integer;
  wrong_type_count integer;
begin
  select count(*) into forbidden_count
  from information_schema.columns
  where table_schema='public'
    and table_name in (
      'channel_session_secret_envelopes','channel_session_credentials','channel_session_keys'
    )
    and column_name in (
      'master_key','kek_plaintext','dek_plaintext','credentials_plaintext',
      'key_material','raw_credentials','qr','pairing_code'
    );
  select count(*) into wrong_type_count
  from information_schema.columns
  where table_schema='public'
    and (
      (table_name='channel_session_secret_envelopes'
        and column_name in ('wrapped_dek','wrap_iv','wrap_auth_tag')
        and data_type<>'bytea')
      or
      (table_name in ('channel_session_credentials','channel_session_keys')
        and column_name in ('ciphertext','iv','auth_tag')
        and data_type<>'bytea')
    );
  if forbidden_count<>0 or wrong_type_count<>0 then
    raise exception 'Schema contém plaintext/chave-mestra ou tipo inseguro.';
  end if;
  raise notice 'W-07 ausência de chave-mestra e plaintext aprovada';
end;
$$;

-- 5. Escopo cruzado da conta é rejeitado pelo trigger.
do $$
begin
  insert into public.channel_session_secret_envelopes(
    session_id,organization_id,account_id,provider_type,provider_account_id,
    generation,data_key_version,kek_id,kek_version,wrapped_dek,
    wrap_iv,wrap_auth_tag,wrap_aad_sha256
  ) values (
    '72000000-0000-0000-0000-000000000002',
    '22222222-2222-2222-2222-222222222222',
    '10000000-0000-0000-0000-000000000001',
    'WHATSAPP_WEB_BAILEYS','baileys-test-account',0,1,'kms-test',1,
    decode(repeat('ab',32),'hex'),decode(repeat('01',12),'hex'),
    decode(repeat('02',16),'hex'),repeat('d',64)
  );
  raise exception 'Escopo cruzado foi aceito.';
exception
  when others then
    if position('fora do escopo' in sqlerrm)=0 then raise; end if;
    raise notice 'W-07 isolamento de escopo aprovado';
end;
$$;

-- 6. Auditoria rejeita material sensível mesmo quando cifrado é citado por chave.
do $$
begin
  insert into public.channel_session_secret_audit(
    session_id,organization_id,account_id,provider_type,provider_account_id,
    action,outcome,generation,attributes
  ) values (
    '71000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '10000000-0000-0000-0000-000000000001',
    'WHATSAPP_WEB_BAILEYS','baileys-test-account',
    'INTEGRITY_FAILURE','FAILED',2,'{"secret":"proibido"}'::jsonb
  );
  raise exception 'Metadata sensível foi aceita na auditoria.';
exception
  when check_violation then
    raise notice 'W-07 auditoria sanitizada aprovada';
end;
$$;

-- 7. RLS forçada e privilégios diretos removidos.
do $$
declare
  hardened integer;
  leaked integer;
begin
  select count(*) into hardened
  from pg_class relation
  join pg_namespace namespace on namespace.oid=relation.relnamespace
  where namespace.nspname='public'
    and relation.relname in (
      'channel_session_secret_envelopes','channel_session_credentials',
      'channel_session_keys','channel_session_secret_audit'
    )
    and relation.relrowsecurity and relation.relforcerowsecurity;
  select count(*) into leaked
  from information_schema.role_table_grants
  where table_schema='public'
    and table_name in (
      'channel_session_secret_envelopes','channel_session_credentials',
      'channel_session_keys','channel_session_secret_audit'
    )
    and grantee in ('anon','authenticated');
  if hardened<>4 or leaked<>0 then
    raise exception 'RLS/privilégio mínimo não comprovado.';
  end if;
  raise notice 'W-07 RLS e privilégio mínimo aprovados';
end;
$$;

-- 8. Exclusão criptográfica remove envelope, credenciais e keys, preservando auditoria.
insert into public.channel_session_keys(
  session_id,category,key_id,record_version,encoding,ciphertext,iv,auth_tag,aad_sha256
) values (
  '71000000-0000-0000-0000-000000000001','session','synthetic-device',1,
  'BINARY',decode(repeat('aa',32),'hex'),decode(repeat('07',12),'hex'),
  decode(repeat('08',16),'hex'),repeat('e',64)
);

select public.delete_channel_session_secrets(
  '71000000-0000-0000-0000-000000000001',2,'corr-delete'
);

do $$
declare
  remaining integer;
  deletion_audit integer;
begin
  select
    (select count(*) from public.channel_session_secret_envelopes where session_id='71000000-0000-0000-0000-000000000001')+
    (select count(*) from public.channel_session_credentials where session_id='71000000-0000-0000-0000-000000000001')+
    (select count(*) from public.channel_session_keys where session_id='71000000-0000-0000-0000-000000000001')
    into remaining;
  select count(*) into deletion_audit
  from public.channel_session_secret_audit
  where session_id='71000000-0000-0000-0000-000000000001'
    and action='SESSION_SECRETS_DELETED'
    and attributes->>'cryptographicErasure'='true';
  if remaining<>0 or deletion_audit<>1 then
    raise exception 'Exclusão criptográfica incompleta.';
  end if;
  raise notice 'W-07 exclusão criptográfica aprovada';
end;
$$;
