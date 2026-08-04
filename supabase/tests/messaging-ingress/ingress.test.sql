-- Sprint W-09 — testes PostgreSQL de ingress e normalização.

-- 1. Persistência canônica antecede dispatch.
do $$
declare result record;
begin
  select * into result from public.persist_channel_ingress_event(
    '11111111-1111-1111-1111-111111111111',
    '10000000-0000-0000-0000-000000000001',
    'META_CLOUD','phone-1','messages.upsert','MESSAGE','provider-event-1',
    repeat('1',64),repeat('a',64),
    jsonb_build_object(
      'schemaVersion','1.0.0','eventKind','MESSAGE','idempotencyKey',repeat('1',64),
      'payloadSanitized',true
    ),'conversation-1',1,now()
  );
  if result.ingress_state<>'PERSISTED' or result.duplicate then
    raise exception 'Evento não foi persistido corretamente: %',result;
  end if;
  raise notice 'W-09 persist-before-dispatch aprovado';
end;
$$;

-- 2. Duplicado retorna o mesmo evento sem segunda linha.
do $$
declare first_id uuid; second_result record; total integer;
begin
  select id into first_id from public.channel_inbox_events where idempotency_key=repeat('1',64);
  select * into second_result from public.persist_channel_ingress_event(
    '11111111-1111-1111-1111-111111111111',
    '10000000-0000-0000-0000-000000000001',
    'META_CLOUD','phone-1','messages.upsert','MESSAGE','provider-event-1',
    repeat('1',64),repeat('a',64),
    jsonb_build_object('schemaVersion','1.0.0','eventKind','MESSAGE','payloadSanitized',true),
    'conversation-1',1,now()
  );
  select count(*) into total from public.channel_inbox_events where idempotency_key=repeat('1',64);
  if not second_result.duplicate or second_result.event_id<>first_id or total<>1 then
    raise exception 'Deduplicação falhou: %, %, %',second_result,first_id,total;
  end if;
  raise notice 'W-09 idempotência por envelope aprovada';
end;
$$;

-- 3. Payload desconhecido falha fechado.
do $$
begin
  perform public.persist_channel_ingress_event(
    '11111111-1111-1111-1111-111111111111',
    '10000000-0000-0000-0000-000000000001',
    'META_CLOUD','phone-1','unknown','UNKNOWN','provider-unknown',
    repeat('2',64),repeat('b',64),jsonb_build_object('schemaVersion','1.0.0'),
    'conversation-1',null,now()
  );
  raise exception 'Payload desconhecido foi aceito.';
exception when others then
  if position('UNKNOWN_PAYLOAD' in sqlerrm)=0 then raise; end if;
  raise notice 'W-09 payload desconhecido isolado aprovado';
end;
$$;

-- 4. Escopo de organização/conta é validado.
do $$
begin
  perform public.persist_channel_ingress_event(
    '22222222-2222-2222-2222-222222222222',
    '10000000-0000-0000-0000-000000000001',
    'META_CLOUD','phone-1','message','MESSAGE','provider-scope',
    repeat('3',64),repeat('c',64),jsonb_build_object('schemaVersion','1.0.0'),
    'conversation-1',null,now()
  );
  raise exception 'Escopo cruzado foi aceito.';
exception when others then
  if position('INGRESS_SCOPE_MISMATCH' in sqlerrm)=0 then raise; end if;
  raise notice 'W-09 resolução de tenant aprovada';
end;
$$;

-- 5. Claim muda somente evento persistido para DISPATCHING.
do $$
declare claimed public.channel_inbox_events%rowtype;
begin
  select * into claimed from public.claim_channel_ingress_events('worker-a',1,interval '2 minutes');
  if claimed.id is null or claimed.ingress_state<>'DISPATCHING' or claimed.dispatch_locked_by<>'worker-a' then
    raise exception 'Claim inválido: %',claimed;
  end if;
  raise notice 'W-09 claim durável aprovado';
end;
$$;

-- 6. Segundo worker não toma evento com lock válido.
do $$
declare total integer;
begin
  select count(*) into total from public.claim_channel_ingress_events('worker-b',1,interval '2 minutes');
  if total<>0 then raise exception 'Segundo worker tomou evento vivo.'; end if;
  raise notice 'W-09 dispatch concorrente bloqueado aprovado';
end;
$$;

-- 7. Conclusão exige o mesmo worker.
do $$
declare event_id uuid;
begin
  select id into event_id from public.channel_inbox_events where dispatch_locked_by='worker-a';
  begin
    perform public.complete_channel_ingress_event(event_id,'worker-b');
    raise exception 'Worker incorreto concluiu evento.';
  exception when others then
    if position('INGRESS_CLAIM_MISMATCH' in sqlerrm)=0 then raise; end if;
  end;
  perform public.complete_channel_ingress_event(event_id,'worker-a');
  if not exists(select 1 from public.channel_inbox_events where id=event_id and ingress_state='DISPATCHED') then
    raise exception 'Evento não foi concluído.';
  end if;
  raise notice 'W-09 conclusão fenced por worker aprovada';
end;
$$;

-- 8. DLQ guarda somente snapshot sanitizado.
do $$
declare event_id uuid; dlq_id uuid; snapshot jsonb;
begin
  select event_id into event_id from public.persist_channel_ingress_event(
    '11111111-1111-1111-1111-111111111111',
    '10000000-0000-0000-0000-000000000001',
    'META_CLOUD','phone-1','receipt','RECEIPT','provider-event-2',
    repeat('4',64),repeat('d',64),
    jsonb_build_object('schemaVersion','1.0.0','eventKind','RECEIPT','payloadSanitized',true),
    'message-1',2,now()
  );
  dlq_id:=public.move_channel_ingress_to_dlq(event_id,'UNKNOWN_RECEIPT','Fixture sintética inválida');
  select payload_snapshot into snapshot from public.channel_dead_letters where id=dlq_id;
  if snapshot ?| array['raw_payload','canonical_envelope','credentials','qr']
     or coalesce((snapshot->>'sanitized')::boolean,false) is not true then
    raise exception 'DLQ contém material não sanitizado: %',snapshot;
  end if;
  raise notice 'W-09 DLQ sanitizada aprovada';
end;
$$;

-- 9. Replay exige justificativa e é idempotente.
do $$
declare event_id uuid; replayed public.channel_inbox_events%rowtype;
begin
  select id into event_id from public.channel_inbox_events where idempotency_key=repeat('4',64);
  begin
    perform public.replay_channel_ingress_event(event_id,'curta');
    raise exception 'Replay sem justificativa suficiente foi aceito.';
  exception when others then
    if position('REPLAY_JUSTIFICATION_REQUIRED' in sqlerrm)=0 then raise; end if;
  end;
  replayed:=public.replay_channel_ingress_event(event_id,'Correção sintética validada');
  if replayed.ingress_state<>'PERSISTED' or replayed.replay_count<>1 then
    raise exception 'Replay inválido: %',replayed;
  end if;
  raise notice 'W-09 replay idempotente aprovado';
end;
$$;

-- 10. Eventos fora de ordem preservam sequência sem sobrescrever histórico.
do $$
declare first_id uuid; second_id uuid;
begin
  select event_id into first_id from public.persist_channel_ingress_event(
    '11111111-1111-1111-1111-111111111111','10000000-0000-0000-0000-000000000001',
    'META_CLOUD','phone-1','receipt','RECEIPT','provider-order-2',repeat('5',64),repeat('e',64),
    jsonb_build_object('schemaVersion','1.0.0','eventKind','RECEIPT','payloadSanitized',true),
    'message-order',2,now()-interval '2 minutes'
  );
  select event_id into second_id from public.persist_channel_ingress_event(
    '11111111-1111-1111-1111-111111111111','10000000-0000-0000-0000-000000000001',
    'META_CLOUD','phone-1','receipt','RECEIPT','provider-order-1',repeat('6',64),repeat('f',64),
    jsonb_build_object('schemaVersion','1.0.0','eventKind','RECEIPT','payloadSanitized',true),
    'message-order',1,now()-interval '3 minutes'
  );
  if first_id=second_id or (
    select count(*) from public.channel_inbox_events
    where sequence_key='message-order' and sequence_number in (1,2)
  )<>2 then raise exception 'Eventos fora de ordem foram sobrescritos.'; end if;
  raise notice 'W-09 eventos fora de ordem preservados aprovados';
end;
$$;

-- 11. Escrita direta permanece revogada.
do $$
begin
  if has_table_privilege('authenticated','public.channel_inbox_events','INSERT')
     or has_table_privilege('authenticated','public.channel_inbox_events','UPDATE') then
    raise exception 'Authenticated possui escrita direta no ingress.';
  end if;
  raise notice 'W-09 privilégio mínimo aprovado';
end;
$$;

-- 12. Schema não possui coluna de payload bruto e envelope bloqueia segredos top-level.
do $$
begin
  if exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='channel_inbox_events'
      and column_name in ('raw_payload','raw_body','raw_event','credentials','qr')
  ) then raise exception 'Coluna bruta encontrada no ingress.'; end if;
  begin
    insert into public.channel_inbox_events(
      organization_id,account_id,provider_type,provider_account_id,event_type,event_kind,
      provider_event_id,payload_sha256,idempotency_key,sanitized_payload,canonical_envelope,
      ingress_state,sequence_key
    ) values (
      '11111111-1111-1111-1111-111111111111','10000000-0000-0000-0000-000000000001',
      'META_CLOUD','phone-1','message','MESSAGE','provider-secret',repeat('7',64),repeat('7',64),
      '{}'::jsonb,jsonb_build_object('qr','segredo'),'PERSISTED','conversation-secret'
    );
    raise exception 'Envelope com QR foi aceito.';
  exception when check_violation then null;
  end;
  raise notice 'W-09 ausência de payload bruto aprovada';
end;
$$;
