-- Sprint W-10 — testes PostgreSQL de outbox, comandos e entrega.

-- 1. Enqueue persiste comando e outbox antes de qualquer envio.
do $$
declare command_row public.channel_commands%rowtype;
begin
  command_row:=public.enqueue_channel_command(
    '12000000-0000-0000-0000-000000000001',
    '13000000-0000-0000-0000-000000000001',
    'SEND_MESSAGE',jsonb_build_object('text','fixture'),'delivery-idempotency-1'
  );
  if command_row.sequence_number<>1 or not exists(
    select 1 from public.channel_outbox_events event
    where event.command_id=command_row.id and event.state='PENDING'
      and event.sequence_number=1
  ) then raise exception 'Comando/outbox não foram persistidos atomicamente.'; end if;
  raise notice 'W-10 persist-before-send aprovado';
end;
$$;

-- 2. Idempotência retorna o mesmo comando e não duplica outbox.
do $$
declare first_id uuid; repeated public.channel_commands%rowtype; total integer;
begin
  select id into first_id from public.channel_commands where idempotency_key='delivery-idempotency-1';
  repeated:=public.enqueue_channel_command(
    '12000000-0000-0000-0000-000000000001',
    '13000000-0000-0000-0000-000000000001',
    'SEND_MESSAGE',jsonb_build_object('text','outra fixture'),'delivery-idempotency-1'
  );
  select count(*) into total from public.channel_outbox_events where command_id=first_id;
  if repeated.id<>first_id or total<>1 then raise exception 'Idempotência outbound falhou.'; end if;
  raise notice 'W-10 comando idempotente aprovado';
end;
$$;

-- 3. Segundo comando recebe sequência crescente na conversa.
do $$
declare command_row public.channel_commands%rowtype;
begin
  command_row:=public.enqueue_channel_command(
    '12000000-0000-0000-0000-000000000001',null,
    'SEND_MESSAGE',jsonb_build_object('text','segunda fixture'),'delivery-idempotency-2'
  );
  if command_row.sequence_number<>2 then raise exception 'Sequência inesperada: %',command_row.sequence_number; end if;
  raise notice 'W-10 sequência por conversa aprovada';
end;
$$;

-- 4. Claim respeita ordenação e não libera o segundo comando.
do $$
declare claimed public.channel_outbox_events%rowtype; total integer;
begin
  select * into claimed from public.claim_ordered_channel_outbox_events('worker-a',10,interval '2 minutes');
  select count(*) into total from public.channel_outbox_events where locked_by='worker-a';
  if claimed.sequence_number<>1 or total<>1 then raise exception 'Ordenação de claim falhou: %, %',claimed.sequence_number,total; end if;
  raise notice 'W-10 ordenação por conversa aprovada';
end;
$$;

-- 5. Ledger inicia tentativa separada da mensagem.
do $$
declare event_id uuid; attempt public.channel_delivery_attempts%rowtype;
begin
  select id into event_id from public.channel_outbox_events where locked_by='worker-a';
  attempt:=public.begin_channel_delivery_attempt(event_id,'worker-a',repeat('a',64),interval '2 minutes');
  if attempt.attempt_number<>1 or attempt.outcome<>'ABORTED' or attempt.message_id is null then
    raise exception 'Tentativa inicial inválida: %',attempt;
  end if;
  raise notice 'W-10 ledger separado aprovado';
end;
$$;

-- 6. Worker diferente não conclui nem falha a tentativa.
do $$
declare event_id uuid;
begin
  select id into event_id from public.channel_outbox_events where locked_by='worker-a';
  begin
    perform public.complete_channel_delivery_attempt(event_id,'worker-b','provider-forbidden','{}'::jsonb);
    raise exception 'Worker incorreto concluiu entrega.';
  exception when others then
    if position('OUTBOX_CLAIM_MISMATCH' in sqlerrm)=0 then raise; end if;
  end;
  raise notice 'W-10 claim token de worker aprovado';
end;
$$;

-- 7. Falha retryable agenda retry limitado.
do $$
declare event_id uuid; attempt public.channel_delivery_attempts%rowtype;
begin
  select id into event_id from public.channel_outbox_events where locked_by='worker-a';
  attempt:=public.fail_channel_delivery_attempt(
    event_id,'worker-a','NETWORK_TIMEOUT','ETIMEDOUT',true,0,'Falha sintética transitória'
  );
  if attempt.outcome<>'RETRY' or not attempt.retryable or attempt.next_attempt_at is null then
    raise exception 'Retry não foi agendado: %',attempt;
  end if;
  raise notice 'W-10 retry e backoff aprovado';
end;
$$;

-- 8. O mesmo comando é reclamado antes do segundo e conclui com sucesso.
do $$
declare event_row public.channel_outbox_events%rowtype; attempt public.channel_delivery_attempts%rowtype;
begin
  select * into event_row from public.claim_ordered_channel_outbox_events('worker-a',10,interval '2 minutes');
  if event_row.sequence_number<>1 then raise exception 'Comando posterior ultrapassou retry anterior.'; end if;
  attempt:=public.begin_channel_delivery_attempt(event_row.id,'worker-a',repeat('b',64),interval '2 minutes');
  attempt:=public.complete_channel_delivery_attempt(
    event_row.id,'worker-a','provider-success-1',jsonb_build_object('sanitized',true)
  );
  if attempt.outcome<>'SUCCESS' or not exists(
    select 1 from public.channel_commands command
    where command.id=event_row.command_id and command.state='SUCCEEDED'
  ) then raise exception 'Conclusão outbound falhou.'; end if;
  raise notice 'W-10 sucesso e confirmação aprovados';
end;
$$;

-- 9. Após sucesso, o segundo comando fica elegível.
do $$
declare event_row public.channel_outbox_events%rowtype;
begin
  select * into event_row from public.claim_ordered_channel_outbox_events('worker-a',10,interval '2 minutes');
  if event_row.sequence_number<>2 then raise exception 'Segundo comando não foi liberado: %',event_row.sequence_number; end if;
  raise notice 'W-10 desbloqueio sequencial aprovado';
end;
$$;

-- 10. Falha terminal cria DLQ sanitizada e abre circuito.
do $$
declare event_row public.channel_outbox_events%rowtype; attempt public.channel_delivery_attempts%rowtype; snapshot jsonb;
begin
  select * into event_row from public.channel_outbox_events where locked_by='worker-a' and sequence_number=2;
  attempt:=public.begin_channel_delivery_attempt(event_row.id,'worker-a',repeat('c',64),interval '2 minutes');
  attempt:=public.fail_channel_delivery_attempt(
    event_row.id,'worker-a','POLICY_REJECTED','403',false,0,'Rejeição sintética de política'
  );
  select payload_snapshot into snapshot from public.channel_dead_letters
  where source_kind='OUTBOX' and source_id=event_row.id and state='OPEN';
  if attempt.outcome<>'TERMINAL' or coalesce((snapshot->>'sanitized')::boolean,false) is not true
     or not exists(
       select 1 from public.channel_delivery_circuits circuit
       where circuit.account_id='10000000-0000-0000-0000-000000000001' and circuit.state='OPEN'
     ) then raise exception 'Terminal/DLQ/circuito inválido.'; end if;
  raise notice 'W-10 terminal DLQ e circuit breaker aprovados';
end;
$$;

-- 11. Replay exige justificativa e preserva histórico de tentativas.
do $$
declare event_id uuid; replayed public.channel_outbox_events%rowtype; attempt_count integer;
begin
  select id into event_id from public.channel_outbox_events where sequence_number=2;
  begin
    perform public.replay_channel_outbox_event(event_id,'curta');
    raise exception 'Replay sem justificativa foi aceito.';
  exception when others then
    if position('REPLAY_JUSTIFICATION_REQUIRED' in sqlerrm)=0 then raise; end if;
  end;
  replayed:=public.replay_channel_outbox_event(event_id,'Reprocessamento sintético autorizado');
  select count(*) into attempt_count from public.channel_delivery_attempts where command_id=replayed.command_id;
  if replayed.state<>'PENDING' or attempt_count<>1 then raise exception 'Replay apagou histórico ou não reabriu.'; end if;
  raise notice 'W-10 replay justificado aprovado';
end;
$$;

-- 12. Rate limit é atômico por organização e conta.
do $$
declare first_ok boolean; second_ok boolean;
begin
  first_ok:=public.reserve_channel_delivery_capacity(
    '11111111-1111-1111-1111-111111111111','10000000-0000-0000-0000-000000000001',1,60
  );
  second_ok:=public.reserve_channel_delivery_capacity(
    '11111111-1111-1111-1111-111111111111','10000000-0000-0000-0000-000000000001',1,60
  );
  if not first_ok or second_ok then raise exception 'Rate limit não foi aplicado atomicamente.'; end if;
  raise notice 'W-10 limite por organização e sessão aprovado';
end;
$$;

-- 13. Reconciliação recupera crash após início e antes da confirmação.
do $$
declare event_row public.channel_outbox_events%rowtype; affected integer;
begin
  update public.channel_delivery_circuits set state='CLOSED',opened_until=null where true;
  select * into event_row from public.claim_ordered_channel_outbox_events('worker-crash',10,interval '2 minutes');
  perform public.begin_channel_delivery_attempt(
    event_row.id,'worker-crash',repeat('d',64),interval '-1 second'
  );
  affected:=public.reconcile_unconfirmed_channel_commands(100);
  if affected<>1 or not exists(
    select 1 from public.channel_outbox_events event
    where event.id=event_row.id and event.state='FAILED' and event.failure_class='CONFIRMATION_TIMEOUT'
  ) then raise exception 'Reconciliação de crash falhou: %',affected; end if;
  raise notice 'W-10 crash e reconciliação aprovados';
end;
$$;

-- 14. Status canônico não regride e escrita direta segue revogada.
do $$
begin
  update public.whatsapp_messages set status='READ' where id='13000000-0000-0000-0000-000000000001';
  if has_table_privilege('authenticated','public.channel_delivery_circuits','INSERT')
     or has_table_privilege('authenticated','public.channel_delivery_rate_buckets','UPDATE') then
    raise exception 'Privilégio direto indevido.';
  end if;
  if (select status from public.whatsapp_messages where id='13000000-0000-0000-0000-000000000001')<>'READ' then
    raise exception 'Status canônico regrediu.';
  end if;
  raise notice 'W-10 monotonicidade e privilégio mínimo aprovados';
end;
$$;
