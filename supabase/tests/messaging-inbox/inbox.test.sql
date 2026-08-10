-- Sprint W-13 — testes PostgreSQL da inbox multiprovider.

select set_config('test.user_id','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
select set_config('test.organization_id','11111111-1111-1111-1111-111111111111',false);
select set_config('test.permission_granted','true',false);

insert into public.channel_inbox_queues(
  id,organization_id,name,description,priority,created_by
) values(
  '81000000-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'Atendimento geral','Fila sintética',100,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
),(
  '81000000-0000-0000-0000-000000000002',
  '11111111-1111-1111-1111-111111111111',
  'Engenharia','Fila sintética de engenharia',50,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
);

-- 1. Atribuição atualiza responsável/fila e cria evento sem payload sensível.
do $$
declare result public.whatsapp_conversations%rowtype;
begin
  result:=public.assign_channel_conversation(
    '12000000-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '81000000-0000-0000-0000-000000000001',1,'Assumir atendimento'
  );
  if result.assigned_to is null or result.queue_id is null or result.ownership_version<>2 then
    raise exception 'Atribuição incompleta: %',result;
  end if;
  if not exists(
    select 1 from public.channel_conversation_assignment_events event
    where event.conversation_id=result.id and event.ownership_version=2
  ) then raise exception 'Evento de atribuição ausente.'; end if;
  raise notice 'W-13 atribuição persistente aprovada';
end;
$$;

-- 2. Versão obsoleta impede dois agentes de assumirem simultaneamente.
do $$
begin
  perform public.assign_channel_conversation(
    '12000000-0000-0000-0000-000000000001',null,
    '81000000-0000-0000-0000-000000000002',1,'Concorrência obsoleta'
  );
  raise exception 'Ownership obsoleto foi aceito.';
exception when others then
  if position('OWNERSHIP_VERSION_CONFLICT' in sqlerrm)=0 then raise; end if;
  raise notice 'W-13 concorrência de agentes aprovada';
end;
$$;

-- 3. Transferência válida preserva histórico de ownership.
do $$
declare result public.whatsapp_conversations%rowtype; events integer;
begin
  result:=public.assign_channel_conversation(
    '12000000-0000-0000-0000-000000000001',null,
    '81000000-0000-0000-0000-000000000002',2,'Transferir para engenharia'
  );
  select count(*) into events from public.channel_conversation_assignment_events
    where conversation_id=result.id;
  if result.queue_id<>'81000000-0000-0000-0000-000000000002' or result.ownership_version<>3 or events<>2 then
    raise exception 'Transferência inválida: %, %',result,events;
  end if;
  raise notice 'W-13 transferência com histórico aprovada';
end;
$$;

-- 4. Nota interna não é mensagem do cliente e evento realtime não contém corpo.
do $$
declare note public.channel_conversation_notes%rowtype; payload jsonb;
begin
  note:=public.add_channel_conversation_note(
    '12000000-0000-0000-0000-000000000001','Validar contrato antes de responder.'
  );
  select event_payload into payload from public.channel_workspace_events
    where event_type='NOTE_CREATED' and conversation_id=note.conversation_id
    order by occurred_at desc limit 1;
  if note.visibility<>'INTERNAL' or payload ? 'message_body' or payload::text like '%Validar contrato%' then
    raise exception 'Nota vazou para evento realtime: %',payload;
  end if;
  raise notice 'W-13 nota interna sanitizada aprovada';
end;
$$;

-- 5. Nota com segredo aparente é rejeitada.
do $$
begin
  perform public.add_channel_conversation_note(
    '12000000-0000-0000-0000-000000000001','access_token=segredo-proibido'
  );
  raise exception 'Segredo aparente foi aceito em nota.';
exception when check_violation then
  raise notice 'W-13 segredo em nota bloqueado aprovado';
end;
$$;

-- 6. Presença do operador é independente do estado do canal.
do $$
declare presence public.channel_operator_presence%rowtype; state_before text;
begin
  select channel_state into state_before from public.whatsapp_conversations
    where id='12000000-0000-0000-0000-000000000001';
  presence:=public.set_channel_operator_presence(
    'BUSY','12000000-0000-0000-0000-000000000001',90
  );
  if presence.presence<>'BUSY' or (
    select channel_state from public.whatsapp_conversations
    where id='12000000-0000-0000-0000-000000000001'
  )<>state_before then raise exception 'Presença alterou estado do canal.'; end if;
  raise notice 'W-13 presença separada do canal aprovada';
end;
$$;

-- 7. Estados offline/reconnecting/degraded/action required são persistidos e auditados.
do $$
declare state text;
begin
  perform public.set_channel_conversation_state(
    '12000000-0000-0000-0000-000000000001','RECONNECTING'
  );
  perform public.set_channel_conversation_state(
    '12000000-0000-0000-0000-000000000001','DEGRADED'
  );
  perform public.set_channel_conversation_state(
    '12000000-0000-0000-0000-000000000001','ACTION_REQUIRED'
  );
  select channel_state into state from public.whatsapp_conversations
    where id='12000000-0000-0000-0000-000000000001';
  if state<>'ACTION_REQUIRED' or (
    select count(*) from public.channel_workspace_events
    where conversation_id='12000000-0000-0000-0000-000000000001'
      and event_type='CHANNEL_STATE_CHANGED'
  )<>3 then raise exception 'Estados de canal não foram preservados.'; end if;
  raise notice 'W-13 estados degradados aprovados';
end;
$$;

-- 8. Indicador distingue humano, automação e IA.
do $$
declare result public.whatsapp_conversations%rowtype;
begin
  result:=public.set_channel_conversation_actor(
    '12000000-0000-0000-0000-000000000001','AI'
  );
  if result.last_actor_kind<>'AI' then raise exception 'Indicador IA ausente.'; end if;
  result:=public.set_channel_conversation_actor(result.id,'HUMAN');
  if result.last_actor_kind<>'HUMAN' or result.human_controlled_at is null then
    raise exception 'Handoff humano não foi registrado.';
  end if;
  raise notice 'W-13 indicadores de ator aprovados';
end;
$$;

-- 9. View unifica múltiplas threads do mesmo contato sem perder origem.
insert into public.whatsapp_conversations(
  id,organization_id,account_id,contact_id,status,last_message_at,unread_count
) values(
  '12000000-0000-0000-0000-000000000004',
  '11111111-1111-1111-1111-111111111111',
  '10000000-0000-0000-0000-000000000001',
  '11000000-0000-0000-0000-000000000001','OPEN',now(),2
);
do $$
declare grouped record;
begin
  select * into grouped from public.channel_inbox_unified_contacts
    where organization_id='11111111-1111-1111-1111-111111111111'
      and unified_contact_key='11000000-0000-0000-0000-000000000001';
  if grouped.thread_count<>2 or jsonb_array_length(grouped.threads)<>2
     or not (grouped.threads->0 ? 'providerType')
     or not (grouped.threads->0 ? 'conversationId') then
    raise exception 'Unificação perdeu threads/origem: %',grouped;
  end if;
  raise notice 'W-13 unificação com origem aprovada';
end;
$$;

-- 10. Filtros possuem índices operacionais por fila/responsável.
do $$
begin
  if not exists(select 1 from pg_indexes where indexname='whatsapp_conversations_queue_idx')
     or not exists(select 1 from pg_indexes where indexname='whatsapp_conversations_assignee_idx') then
    raise exception 'Índices de filtro ausentes.';
  end if;
  raise notice 'W-13 filtros operacionais aprovados';
end;
$$;

-- 11. Eventos de backend são sanitizados e entregues somente pelo Innov.
do $$
begin
  if exists(
    select 1 from public.channel_workspace_events
    where event_payload ?| array['raw_payload','credentials','secret','token','cookie','qr','message_body']
  ) then raise exception 'Evento realtime contém material proibido.'; end if;
  if has_table_privilege('authenticated','public.channel_workspace_events','INSERT') then
    raise exception 'Cliente pode publicar evento realtime diretamente.';
  end if;
  raise notice 'W-13 realtime pelo backend aprovado';
end;
$$;

-- 12. Escopo de fila cross-tenant é rejeitado.
insert into public.channel_inbox_queues(
  id,organization_id,name,priority
) values(
  '82000000-0000-0000-0000-000000000002',
  '22222222-2222-2222-2222-222222222222','Fila externa',100
);
do $$
begin
  perform public.assign_channel_conversation(
    '12000000-0000-0000-0000-000000000001',null,
    '82000000-0000-0000-0000-000000000002',3,'Transferência proibida'
  );
  raise exception 'Fila cross-tenant foi aceita.';
exception when others then
  if position('QUEUE_SCOPE_MISMATCH' in sqlerrm)=0 then raise; end if;
  raise notice 'W-13 isolamento de fila aprovado';
end;
$$;

-- 13. Escrita direta nas relações operacionais permanece revogada.
do $$
begin
  if has_table_privilege('authenticated','public.channel_conversation_notes','INSERT')
     or has_table_privilege('authenticated','public.channel_operator_presence','UPDATE')
     or has_table_privilege('authenticated','public.channel_conversation_assignment_events','DELETE') then
    raise exception 'Escrita direta indevida encontrada.';
  end if;
  raise notice 'W-13 RLS e privilégio mínimo aprovados';
end;
$$;
