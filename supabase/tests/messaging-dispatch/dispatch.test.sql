\set ON_ERROR_STOP on
select set_config('test.organization_id','11111111-1111-1111-1111-111111111111',false);
select set_config('test.user_id','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
select set_config('test.permission_granted','true',false);

insert into public.whatsapp_accounts(
  id,organization_id,waba_id,phone_number_id,display_phone_number,business_name,active,is_default,created_by
) values (
  '51000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',
  '1234567890','9988776655','+55 12 99999-0000','Conta teste',true,true,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
);

insert into public.whatsapp_contacts(
  id,organization_id,account_id,wa_id,phone_e164,display_name
) values (
  '52000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',
  '51000000-0000-0000-0000-000000000001','5512999990000','5512999990000','Cliente teste'
);

insert into public.whatsapp_conversations(
  id,organization_id,account_id,contact_id,status,last_customer_message_at,created_by
) values (
  '53000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',
  '51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000001',
  'OPEN',clock_timestamp(),'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
);

do $$
declare first_row public.whatsapp_messages; second_row public.whatsapp_messages;
begin
  first_row := public.queue_whatsapp_outbound_message(
    '53000000-0000-0000-0000-000000000001','TEXT','Mensagem única',null,null,'{}'::jsonb,'dispatch-key-00000001'
  );
  second_row := public.queue_whatsapp_outbound_message(
    '53000000-0000-0000-0000-000000000001','TEXT','Mensagem única',null,null,'{}'::jsonb,'dispatch-key-00000001'
  );
  if first_row.id <> second_row.id then raise exception 'Idempotência criou duas linhas'; end if;
  raise notice 'idempotência de persistência aprovada';
end $$;

do $$
declare message_id uuid; claimed boolean;
begin
  select id into message_id from public.whatsapp_messages where idempotency_key='dispatch-key-00000001';
  claimed := public.claim_whatsapp_outbound_dispatch(
    message_id,'61000000-0000-0000-0000-000000000001',900
  );
  if not claimed then raise exception 'Primeiro dispatcher não obteve claim'; end if;
  claimed := public.claim_whatsapp_outbound_dispatch(
    message_id,'61000000-0000-0000-0000-000000000002',900
  );
  if claimed then raise exception 'Segundo dispatcher obteve claim concorrente'; end if;
  raise notice 'claim concorrente exclusivo aprovado';
end $$;

do $$
declare message_id uuid;
begin
  select id into message_id from public.whatsapp_messages where idempotency_key='dispatch-key-00000001';
  begin
    perform public.complete_whatsapp_outbound_dispatch(
      message_id,'61000000-0000-0000-0000-000000000002','wamid-invalido','SENT',null,null
    );
    raise exception 'Token sem ownership concluiu envio';
  exception when others then
    if sqlerrm not like '%DISPATCH_FENCING_REJECTED%' then raise; end if;
  end;
  perform public.complete_whatsapp_outbound_dispatch(
    message_id,'61000000-0000-0000-0000-000000000001','wamid-valido','SENT',null,null
  );
  if not exists (
    select 1 from public.whatsapp_messages
    where id=message_id and status='SENT' and provider_message_id='wamid-valido'
      and dispatch_token is null and dispatch_started_at is null
  ) then raise exception 'Conclusão válida não persistida'; end if;
  raise notice 'fencing de conclusão aprovado';
end $$;

do $$
declare item public.whatsapp_messages; claimed boolean;
begin
  item := public.queue_whatsapp_outbound_message(
    '53000000-0000-0000-0000-000000000001','TEXT','Mensagem recuperável',null,null,'{}'::jsonb,'dispatch-key-00000002'
  );
  if not public.claim_whatsapp_outbound_dispatch(
    item.id,'62000000-0000-0000-0000-000000000001',30
  ) then raise exception 'Claim inicial da recuperação falhou'; end if;
  update public.whatsapp_messages
  set dispatch_started_at=clock_timestamp()-interval '31 seconds'
  where id=item.id;
  claimed := public.claim_whatsapp_outbound_dispatch(
    item.id,'62000000-0000-0000-0000-000000000002',30
  );
  if not claimed then raise exception 'Claim obsoleto não foi recuperado'; end if;
  begin
    perform public.complete_whatsapp_outbound_dispatch(
      item.id,'62000000-0000-0000-0000-000000000001',null,'FAILED','OLD','token antigo'
    );
    raise exception 'Token antigo concluiu após recuperação';
  exception when others then
    if sqlerrm not like '%DISPATCH_FENCING_REJECTED%' then raise; end if;
  end;
  perform public.complete_whatsapp_outbound_dispatch(
    item.id,'62000000-0000-0000-0000-000000000002',null,'FAILED','TEST_FAILURE','falha controlada'
  );
  raise notice 'recuperação de claim obsoleto aprovada';
end $$;

do $$
declare item public.whatsapp_messages; claimed boolean;
begin
  select * into item from public.whatsapp_messages where idempotency_key='dispatch-key-00000001';
  claimed := public.claim_whatsapp_outbound_dispatch(
    item.id,'63000000-0000-0000-0000-000000000001',30
  );
  if claimed then raise exception 'Mensagem terminal foi reclamada'; end if;
  raise notice 'estado terminal não redispatchável aprovado';
end $$;

do $$ declare executable boolean; begin
  executable := has_function_privilege(
    'authenticated','public.claim_whatsapp_outbound_dispatch(uuid,uuid,integer)','EXECUTE'
  );
  if not executable then raise exception 'Operador autenticado não pode solicitar claim'; end if;
  if has_function_privilege(
    'authenticated','public.complete_whatsapp_outbound_dispatch(uuid,uuid,text,text,text,text)','EXECUTE'
  ) then raise exception 'Operador autenticado pode concluir dispatch diretamente'; end if;
  raise notice 'privilégio mínimo do dispatch aprovado';
end $$;

\echo 'Testes PostgreSQL do dispatch oficial aprovados: 6 controles.'
