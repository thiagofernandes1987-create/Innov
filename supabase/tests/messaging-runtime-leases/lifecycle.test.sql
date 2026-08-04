-- Sprint W-08 — single writer, lease, fencing, takeover e kill switch.

update public.whatsapp_accounts
set provider_type='WHATSAPP_WEB_BAILEYS',
    provider_account_id='baileys-runtime-test'
where id='10000000-0000-0000-0000-000000000001';

-- 1. Primeira aquisição cria fencing token 1.
do $$
declare
  result record;
begin
  select * into result
  from public.acquire_session_runtime_lease(
    '72000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '10000000-0000-0000-0000-000000000001',
    'WHATSAPP_WEB_BAILEYS','baileys-runtime-test','instance-a',30
  );
  if result.fencing_token<>1 or not result.acquired or result.holder_instance_id<>'instance-a' then
    raise exception 'Aquisição inicial inválida: %',result;
  end if;
  raise notice 'W-08 aquisição inicial e token crescente aprovados';
end;
$$;

-- 2. Segundo writer é rejeitado enquanto o lease está vivo.
do $$
begin
  perform public.acquire_session_runtime_lease(
    '72000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '10000000-0000-0000-0000-000000000001',
    'WHATSAPP_WEB_BAILEYS','baileys-runtime-test','instance-b',30
  );
  raise exception 'Dois writers foram aceitos.';
exception
  when others then
    if position('LEASE_HELD' in sqlerrm)=0 then raise; end if;
    raise notice 'W-08 exclusão de segundo writer aprovada';
end;
$$;

-- 3. Holder atual renova sem trocar o fencing token.
do $$
declare
  result record;
begin
  select * into result
  from public.renew_session_runtime_lease(
    '72000000-0000-0000-0000-000000000001','instance-a',1,60
  );
  if result.fencing_token<>1 or result.lease_expires_at<=clock_timestamp() then
    raise exception 'Renovação inválida: %',result;
  end if;
  raise notice 'W-08 renovação de lease aprovada';
end;
$$;

-- 4. Escrita inicial protegida pelo token vigente.
do $$
declare
  result record;
begin
  select * into result
  from public.compare_and_swap_channel_session_credentials_fenced(
    'instance-a',1,
    '72000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '10000000-0000-0000-0000-000000000001',
    'WHATSAPP_WEB_BAILEYS','baileys-runtime-test',
    null,1,'kms-test',1,
    decode(repeat('ab',32),'hex'),decode(repeat('01',12),'hex'),
    decode(repeat('02',16),'hex'),repeat('a',64),
    'BINARY',decode(repeat('cd',48),'hex'),decode(repeat('03',12),'hex'),
    decode(repeat('04',16),'hex'),repeat('b',64),'corr-w08-create'
  );
  if result.generation<>1 or result.record_version<>1 then
    raise exception 'CAS fenced inicial inválido: %',result;
  end if;
  raise notice 'W-08 escrita fenced inicial aprovada';
end;
$$;

-- 5. Lease expirado permite takeover e incrementa token.
update public.session_runtime_leases
set lease_expires_at=clock_timestamp()-interval '1 second'
where session_id='72000000-0000-0000-0000-000000000001';

do $$
declare
  result record;
begin
  select * into result
  from public.acquire_session_runtime_lease(
    '72000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '10000000-0000-0000-0000-000000000001',
    'WHATSAPP_WEB_BAILEYS','baileys-runtime-test','instance-b',30
  );
  if result.fencing_token<>2 or not result.acquired or result.holder_instance_id<>'instance-b' then
    raise exception 'Takeover inválido: %',result;
  end if;
  raise notice 'W-08 takeover após expiração aprovado';
end;
$$;

-- 6. Processo zumbi com token antigo é rejeitado.
do $$
begin
  perform public.assert_session_runtime_fence(
    '72000000-0000-0000-0000-000000000001','instance-a',1
  );
  raise exception 'Processo zumbi foi aceito.';
exception
  when others then
    if position('FENCING_TOKEN_STALE' in sqlerrm)=0 then raise; end if;
    raise notice 'W-08 processo zumbi bloqueado por fencing aprovado';
end;
$$;

-- 7. CAS com token obsoleto não altera a geração.
do $$
declare
  before_generation bigint;
begin
  select generation into before_generation
  from public.channel_session_secret_envelopes
  where session_id='72000000-0000-0000-0000-000000000001';

  begin
    perform public.compare_and_swap_channel_session_credentials_fenced(
      'instance-a',1,
      '72000000-0000-0000-0000-000000000001',
      '11111111-1111-1111-1111-111111111111',
      '10000000-0000-0000-0000-000000000001',
      'WHATSAPP_WEB_BAILEYS','baileys-runtime-test',
      before_generation,1,'kms-test',1,
      decode(repeat('ab',32),'hex'),decode(repeat('01',12),'hex'),
      decode(repeat('02',16),'hex'),repeat('a',64),
      'BINARY',decode(repeat('ef',48),'hex'),decode(repeat('05',12),'hex'),
      decode(repeat('06',16),'hex'),repeat('c',64),'corr-zombie'
    );
    raise exception 'CAS zumbi foi aceita.';
  exception
    when others then
      if position('FENCING_TOKEN_STALE' in sqlerrm)=0 then raise; end if;
  end;

  if (select generation from public.channel_session_secret_envelopes
      where session_id='72000000-0000-0000-0000-000000000001')<>before_generation then
    raise exception 'CAS zumbi alterou a geração.';
  end if;
  raise notice 'W-08 rollback de escrita zumbi aprovado';
end;
$$;

-- 8. Novo writer consegue atualizar credenciais com token atual.
do $$
declare
  result record;
begin
  select * into result
  from public.compare_and_swap_channel_session_credentials_fenced(
    'instance-b',2,
    '72000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '10000000-0000-0000-0000-000000000001',
    'WHATSAPP_WEB_BAILEYS','baileys-runtime-test',
    1,1,'kms-test',1,
    decode(repeat('ab',32),'hex'),decode(repeat('01',12),'hex'),
    decode(repeat('02',16),'hex'),repeat('a',64),
    'BINARY',decode(repeat('ef',48),'hex'),decode(repeat('05',12),'hex'),
    decode(repeat('06',16),'hex'),repeat('c',64),'corr-takeover'
  );
  if result.generation<>2 or result.record_version<>2 then
    raise exception 'CAS do novo writer inválido: %',result;
  end if;
  raise notice 'W-08 atualização por nova instância aprovada';
end;
$$;

-- 9. Kill switch por sessão bloqueia renovação e volta a liberar após remoção.
do $$
begin
  perform public.set_session_runtime_kill_switch(
    '72000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '10000000-0000-0000-0000-000000000001',
    'WHATSAPP_WEB_BAILEYS','baileys-runtime-test',true,'TEST_SESSION_STOP'
  );
  begin
    perform public.renew_session_runtime_lease(
      '72000000-0000-0000-0000-000000000001','instance-b',2,30
    );
    raise exception 'Kill switch de sessão não bloqueou renovação.';
  exception
    when others then
      if position('SESSION_KILL_SWITCH_ACTIVE' in sqlerrm)=0 then raise; end if;
  end;
  perform public.set_session_runtime_kill_switch(
    '72000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '10000000-0000-0000-0000-000000000001',
    'WHATSAPP_WEB_BAILEYS','baileys-runtime-test',false,'TEST_SESSION_RESUME'
  );
  perform public.renew_session_runtime_lease(
    '72000000-0000-0000-0000-000000000001','instance-b',2,30
  );
  raise notice 'W-08 kill switch por sessão aprovado';
end;
$$;

-- 10. Kill switch global bloqueia novas aquisições.
do $$
begin
  perform public.set_global_messaging_runtime_kill_switch(true,'TEST_GLOBAL_STOP');
  begin
    perform public.acquire_session_runtime_lease(
      '72000000-0000-0000-0000-000000000002',
      '11111111-1111-1111-1111-111111111111',
      '10000000-0000-0000-0000-000000000001',
      'WHATSAPP_WEB_BAILEYS','baileys-runtime-test','instance-global',30
    );
    raise exception 'Kill switch global não bloqueou aquisição.';
  exception
    when others then
      if position('GLOBAL_KILL_SWITCH_ACTIVE' in sqlerrm)=0 then raise; end if;
  end;
  perform public.set_global_messaging_runtime_kill_switch(false,'TEST_GLOBAL_RESUME');
  raise notice 'W-08 kill switch global aprovado';
end;
$$;

-- 11. Release preserva contador e próxima aquisição incrementa token.
do $$
declare
  result record;
begin
  perform public.release_session_runtime_lease(
    '72000000-0000-0000-0000-000000000001','instance-b',2,'TEST_RELEASE'
  );
  select * into result
  from public.acquire_session_runtime_lease(
    '72000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '10000000-0000-0000-0000-000000000001',
    'WHATSAPP_WEB_BAILEYS','baileys-runtime-test','instance-c',30
  );
  if result.fencing_token<>3 or not result.acquired then
    raise exception 'Fencing token não permaneceu monotônico: %',result;
  end if;
  raise notice 'W-08 release e token monotônico aprovados';
end;
$$;

-- 12. RLS, privilégio mínimo e auditoria sem desafio secreto.
do $$
declare
  forbidden_columns integer;
  forbidden_audit integer;
begin
  if has_table_privilege('authenticated','public.session_runtime_leases','select')
    or has_table_privilege('authenticated','public.session_runtime_controls','select')
    or has_function_privilege(
      'authenticated',
      'public.acquire_session_runtime_lease(uuid,uuid,uuid,text,text,text,integer)',
      'execute'
    )
  then
    raise exception 'Privilégio indevido para authenticated.';
  end if;
  if not has_function_privilege(
    'service_role',
    'public.acquire_session_runtime_lease(uuid,uuid,uuid,text,text,text,integer)',
    'execute'
  ) then
    raise exception 'service_role sem porta de lease.';
  end if;

  select count(*) into forbidden_columns
  from information_schema.columns
  where table_schema='public'
    and table_name in ('session_runtime_leases','session_runtime_controls','session_runtime_audit')
    and column_name in ('qr','qr_value','pairing_code','challenge_value','credentials','secret');
  if forbidden_columns<>0 then
    raise exception 'Schema de runtime contém coluna sensível.';
  end if;

  select count(*) into forbidden_audit
  from public.session_runtime_audit
  where attributes ?| array[
    'qr','qr_value','pairing_code','challenge_value','credentials','keys',
    'plaintext','secret','ciphertext','wrapped_dek','auth_tag'
  ];
  if forbidden_audit<>0 then
    raise exception 'Auditoria contém material proibido.';
  end if;
  raise notice 'W-08 RLS, privilégio mínimo e auditoria sanitizada aprovados';
end;
$$;
