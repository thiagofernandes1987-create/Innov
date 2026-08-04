begin;

select set_config('test.user_id','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',true);
select set_config('test.organization_id','11111111-1111-1111-1111-111111111111',true);
select set_config('test.permission_granted','true',true);

-- 1. Backfill preserva dados legados e deriva a conta externa.
do $$
begin
  if not exists (
    select 1 from public.whatsapp_accounts
    where id='10000000-0000-0000-0000-000000000001'
      and provider_type='META_CLOUD'
      and provider_account_id='phone-1'
      and provider_status='ENABLED'
  ) then
    raise exception 'Backfill da conta legado não foi aplicado.';
  end if;

  if not exists (
    select 1 from public.whatsapp_messages
    where id='13000000-0000-0000-0000-000000000001'
      and provider_type='META_CLOUD'
      and provider_account_id='phone-1'
      and body='Histórico legado'
  ) then
    raise exception 'Backfill da mensagem legado não preservou o histórico.';
  end if;

  if not exists (
    select 1 from public.whatsapp_webhook_events
    where id='14000000-0000-0000-0000-000000000001'
      and provider_type='META_CLOUD'
      and provider_account_id='phone-1'
  ) then
    raise exception 'Backfill do webhook legado não foi aplicado.';
  end if;

  raise notice 'W-04 — backfill legado aprovado.';
end;
$$;

-- 2. Provider message id é único no escopo da conta, não global.
insert into public.whatsapp_messages(
  id,organization_id,conversation_id,direction,message_type,status,
  provider_type,provider_account_id,provider_message_id,idempotency_key,body
) values (
  '24000000-0000-0000-0000-000000000002',
  '22222222-2222-2222-2222-222222222222',
  '23000000-0000-0000-0000-000000000002',
  'OUTBOUND','TEXT','SENT','META_CLOUD','phone-2',
  'provider-message-shared','legacy-2','Mesmo id externo, conta diferente'
);

do $$
begin
  if (select count(*) from public.whatsapp_messages
      where provider_message_id='provider-message-shared')<>2 then
    raise exception 'Unicidade escopada por provider/conta não foi aplicada.';
  end if;
  raise notice 'W-04 — unicidade provider-scoped aprovada.';
end;
$$;

-- 3. Identidades externas são aliases do contato canônico, sem novo contato.
insert into public.channel_contact_identities(
  organization_id,account_id,contact_id,provider_type,provider_account_id,
  namespace,external_id,normalized_id,confidence,is_primary
) values
  (
    '11111111-1111-1111-1111-111111111111',
    '10000000-0000-0000-0000-000000000001',
    '11000000-0000-0000-0000-000000000001',
    'META_CLOUD','phone-1','WHATSAPP_PN','5511999990001','5511999990001',
    'CONFIRMED',true
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '20000000-0000-0000-0000-000000000002',
    '22000000-0000-0000-0000-000000000002',
    'META_CLOUD','phone-2','WHATSAPP_PN','5511999990001','5511999990001',
    'OBSERVED',true
  );

do $$
begin
  begin
    insert into public.channel_contact_identities(
      organization_id,account_id,contact_id,provider_type,provider_account_id,
      namespace,external_id,normalized_id
    ) values (
      '22222222-2222-2222-2222-222222222222',
      '10000000-0000-0000-0000-000000000001',
      '11000000-0000-0000-0000-000000000001',
      'META_CLOUD','phone-1','WHATSAPP_LID','lid-cross','lid-cross'
    );
    raise exception 'Identidade cross-tenant foi aceita.';
  exception when others then
    if sqlerrm='Identidade cross-tenant foi aceita.' then raise; end if;
  end;

  begin
    insert into public.channel_contact_identities(
      organization_id,account_id,contact_id,provider_type,provider_account_id,
      namespace,external_id,normalized_id
    ) values (
      '11111111-1111-1111-1111-111111111111',
      '10000000-0000-0000-0000-000000000001',
      '11000000-0000-0000-0000-000000000001',
      'META_CLOUD','phone-1','WHATSAPP_PN','duplicado','5511999990001'
    );
    raise exception 'Alias duplicado foi aceito.';
  exception when unique_violation then
    null;
  end;

  if to_regclass('public.channel_contacts') is not null
    or to_regclass('public.channel_conversations') is not null
    or to_regclass('public.channel_messages') is not null
  then
    raise exception 'Domínio paralelo de contatos/conversas/mensagens foi criado.';
  end if;

  raise notice 'W-04 — aliases PN/LID e ausência de domínio paralelo aprovados.';
end;
$$;

-- 4. Comando e outbox são criados de forma idempotente.
do $$
declare
  v_first uuid;
  v_second uuid;
begin
  select id into v_first
  from public.enqueue_channel_command(
    '12000000-0000-0000-0000-000000000001',
    '13000000-0000-0000-0000-000000000001',
    'SEND_MESSAGE',jsonb_build_object('kind','TEXT'),'command-idempotent-1'
  );
  select id into v_second
  from public.enqueue_channel_command(
    '12000000-0000-0000-0000-000000000001',
    '13000000-0000-0000-0000-000000000001',
    'SEND_MESSAGE',jsonb_build_object('kind','TEXT'),'command-idempotent-1'
  );

  if v_first is distinct from v_second then
    raise exception 'Comando idempotente gerou ids diferentes.';
  end if;
  if (select count(*) from public.channel_outbox_events where command_id=v_first)<>1 then
    raise exception 'Outbox não foi criado exatamente uma vez.';
  end if;

  raise notice 'W-04 — comando e outbox idempotentes aprovados.';
end;
$$;

-- 5. Escrita direta é revogada e RLS isola organizações.
do $$
begin
  if has_table_privilege('authenticated','public.channel_commands','INSERT')
    or has_table_privilege('authenticated','public.channel_outbox_events','UPDATE')
    or has_table_privilege('authenticated','public.channel_inbox_events','DELETE')
  then
    raise exception 'Privilégio direto indevido nas tabelas técnicas.';
  end if;

  if (
    select count(*)
    from pg_class
    where oid in (
      'public.channel_contact_identities'::regclass,
      'public.channel_commands'::regclass,
      'public.channel_outbox_events'::regclass,
      'public.channel_inbox_events'::regclass,
      'public.channel_delivery_attempts'::regclass,
      'public.channel_dead_letters'::regclass,
      'public.channel_provider_rollbacks'::regclass
    ) and relrowsecurity and relforcerowsecurity
  )<>7 then
    raise exception 'RLS forçada não cobre todas as tabelas técnicas.';
  end if;
end;
$$;

set local role authenticated;
do $$
begin
  if (select count(*) from public.channel_contact_identities)<>1 then
    raise exception 'RLS não isolou a organização autenticada.';
  end if;
  raise notice 'W-04 — RLS e privilégio mínimo aprovados.';
end;
$$;
reset role;

-- 6. Inbox recebe somente payload sanitizado e deduplica por hash.
do $$
declare
  v_first uuid;
  v_second uuid;
begin
  select id into v_first
  from public.register_channel_inbox_event(
    '10000000-0000-0000-0000-000000000001',
    'conversation.message_received.v1','provider-event-1',repeat('b',64),
    jsonb_build_object('messageId','safe-1'),now()
  );
  select id into v_second
  from public.register_channel_inbox_event(
    '10000000-0000-0000-0000-000000000001',
    'conversation.message_received.v1','provider-event-1',repeat('b',64),
    jsonb_build_object('messageId','safe-1'),now()
  );

  if v_first is distinct from v_second then
    raise exception 'Inbox idempotente gerou ids diferentes.';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='channel_inbox_events'
      and column_name in ('raw_payload','raw_event','raw_body')
  ) then
    raise exception 'Inbox persistiu coluna de payload bruto.';
  end if;

  raise notice 'W-04 — inbox sanitizada e idempotente aprovada.';
end;
$$;

-- 7. Claim usa estado durável e worker explícito.
do $$
declare
  v_claimed public.channel_outbox_events;
begin
  select * into v_claimed
  from public.claim_channel_outbox_events('worker-w04',1)
  limit 1;

  if v_claimed.id is null or v_claimed.state<>'CLAIMED'
    or v_claimed.locked_by<>'worker-w04' then
    raise exception 'Claim da outbox não persistiu ownership.';
  end if;
  raise notice 'W-04 — claim durável da outbox aprovado.';
end;
$$;

-- 8. Ledger registra tentativa e próximo retry.
do $$
declare
  v_command uuid;
  v_attempt public.channel_delivery_attempts;
begin
  select id into v_command
  from public.channel_commands
  where idempotency_key='command-idempotent-1';

  select * into v_attempt
  from public.record_channel_delivery_attempt(
    v_command,'13000000-0000-0000-0000-000000000001',1,repeat('c',64),
    'RETRY','NETWORK','ECONNRESET',true,now()+interval '1 minute',
    jsonb_build_object('correlationId','corr-1')
  );

  if v_attempt.attempt_number<>1 or not v_attempt.retryable
    or v_attempt.outcome<>'RETRY' or v_attempt.next_attempt_at is null then
    raise exception 'Ledger de tentativa incompleto.';
  end if;
  raise notice 'W-04 — ledger de tentativas aprovado.';
end;
$$;

-- 9. DLQ é idempotente e preserva snapshot sanitizado.
do $$
declare
  v_outbox uuid;
  v_first uuid;
  v_second uuid;
begin
  select id into v_outbox
  from public.channel_outbox_events
  order by created_at
  limit 1;

  select id into v_first
  from public.move_channel_failure_to_dlq(
    'OUTBOX',v_outbox,'PROVIDER_UNAVAILABLE','Falha terminal de homologação',
    jsonb_build_object('safe',true)
  );
  select id into v_second
  from public.move_channel_failure_to_dlq(
    'OUTBOX',v_outbox,'PROVIDER_UNAVAILABLE','Falha terminal de homologação',
    jsonb_build_object('safe',true)
  );

  if v_first is distinct from v_second then
    raise exception 'DLQ aberta foi duplicada.';
  end if;
  raise notice 'W-04 — DLQ idempotente aprovada.';
end;
$$;

-- 10. Rollback lógico cancela trabalho pendente e preserva histórico.
do $$
declare
  v_command uuid;
  v_before integer;
  v_rollback public.channel_provider_rollbacks;
begin
  select count(*) into v_before
  from public.whatsapp_messages
  where organization_id='11111111-1111-1111-1111-111111111111';

  select id into v_command
  from public.enqueue_channel_command(
    '12000000-0000-0000-0000-000000000001',null,
    'REFRESH_ACCOUNT',jsonb_build_object('reason','test'),'rollback-pending-1'
  );

  select * into v_rollback
  from public.rollback_channel_provider_projection(
    '10000000-0000-0000-0000-000000000001',
    'Rollback lógico validado pela Sprint W-04'
  );

  if not exists (
    select 1 from public.whatsapp_accounts
    where id='10000000-0000-0000-0000-000000000001'
      and provider_status='ROLLED_BACK' and not active and config_version=2
  ) then
    raise exception 'Conta não foi desativada logicamente.';
  end if;
  if exists (
    select 1 from public.channel_commands
    where account_id='10000000-0000-0000-0000-000000000001'
      and state in ('PENDING','CLAIMED','FAILED')
  ) then
    raise exception 'Rollback deixou comandos executáveis.';
  end if;
  if (select count(*) from public.whatsapp_messages
      where organization_id='11111111-1111-1111-1111-111111111111')<>v_before then
    raise exception 'Rollback apagou ou duplicou histórico.';
  end if;
  if v_rollback.cancelled_commands<1 or v_rollback.cancelled_outbox_events<1 then
    raise exception 'Rollback não registrou itens cancelados.';
  end if;

  raise notice 'W-04 — rollback lógico sem perda histórica aprovado.';
end;
$$;

-- 11. Provider não implementado permanece somente como valor de contrato.
do $$
begin
  if exists (
    select 1 from public.whatsapp_accounts
    where provider_type='WHATSAPP_WEB_BAILEYS'
  ) then
    raise exception 'W-04 ativou provider Baileys indevidamente.';
  end if;
  raise notice 'W-04 — Baileys continua sem runtime ou conta ativa.';
end;
$$;

rollback;
