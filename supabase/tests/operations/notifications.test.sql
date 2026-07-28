insert into public.organizations(id,name) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Innovar'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','Outra empresa');

insert into auth.users(id,email) values
  ('11111111-1111-1111-1111-111111111111','planejamento@teste.local'),
  ('22222222-2222-2222-2222-222222222222','assistencia@teste.local'),
  ('33333333-3333-3333-3333-333333333333','gerente@teste.local'),
  ('44444444-4444-4444-4444-444444444444','diretoria@teste.local'),
  ('55555555-5555-5555-5555-555555555555','cliente@teste.local'),
  ('66666666-6666-6666-6666-666666666666','outra@teste.local');

insert into public.organization_memberships(organization_id,user_id,role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','ENGENHEIRO'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222','SAC'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','33333333-3333-3333-3333-333333333333','GESTOR_OBRAS'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','44444444-4444-4444-4444-444444444444','DIRECAO'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','55555555-5555-5555-5555-555555555555','CLIENTE'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','66666666-6666-6666-6666-666666666666','GESTOR_OBRAS');

insert into public.projects(id,organization_id,name) values
  ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Obra um'),
  ('bbbbbbbb-0000-0000-0000-000000000001','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','Obra alheia');

insert into public.operational_responsibilities(
  organization_id,project_id,persona_id,user_id
) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','aaaaaaaa-0000-0000-0000-000000000001','P2','11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','aaaaaaaa-0000-0000-0000-000000000001','P5','22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','aaaaaaaa-0000-0000-0000-000000000001','P8','33333333-3333-3333-3333-333333333333'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',null,'P13','44444444-4444-4444-4444-444444444444'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','aaaaaaaa-0000-0000-0000-000000000001','P15','55555555-5555-5555-5555-555555555555'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','bbbbbbbb-0000-0000-0000-000000000001','P8','66666666-6666-6666-6666-666666666666');

set role authenticated;
select set_config('test.user_id','11111111-1111-1111-1111-111111111111',false);

select public.create_operational_event(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'planning.critical_path_at_risk',
  'planejamento',
  'project',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Entrega em risco',
  'Sete dias no caminho crítico',
  'P8',
  '2099-07-28T12:00:00Z',
  '2099-07-28T14:00:00Z',
  false,
  '{"source":"test"}',
  'planning:obra-1:critical'
);

-- Idempotência: a mesma chave não cria outro fato nem outra caixa de entrada.
select public.create_operational_event(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'planning.critical_path_at_risk',
  'planejamento',
  'project',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Entrega em risco',
  'Sete dias no caminho crítico',
  'P8',
  '2099-07-28T12:00:00Z',
  '2099-07-28T14:00:00Z',
  false,
  '{"source":"test"}',
  'planning:obra-1:critical'
);

reset role;

do $$
begin
  if (select count(*) from public.operational_events) <> 1 then
    raise exception 'TESTE 1 falhou: deduplicação criou mais de um fato.';
  end if;
  if (select count(*) from public.operational_notifications) <> 2 then
    raise exception 'TESTE 2 falhou: esperava gerente e diretoria configurados.';
  end if;
  if exists (
    select 1 from public.operational_notifications
    where recipient_user_id = '66666666-6666-6666-6666-666666666666'
  ) then
    raise exception 'TESTE 3 falhou: destinatário de outra organização entrou.';
  end if;
end;
$$;

set role authenticated;
select set_config('test.user_id','22222222-2222-2222-2222-222222222222',false);

select public.create_operational_event(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'service.sla_breached',
  'sac',
  'ticket',
  'aaaaaaaa-0000-0000-0000-000000000009',
  'Atendimento fora do SLA',
  'Peça sem disponibilidade',
  'P9',
  '2099-07-28T12:00:00Z',
  '2099-07-28T13:00:00Z',
  false,
  '{}',
  'service:sac-9:not-approved'
);

select public.create_operational_event(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'service.sla_breached',
  'sac',
  'ticket',
  'aaaaaaaa-0000-0000-0000-000000000010',
  'Atendimento fora do SLA',
  'Peça sem disponibilidade',
  'P9',
  '2099-07-28T12:00:00Z',
  '2099-07-28T13:00:00Z',
  true,
  '{}',
  'service:sac-10:approved'
);

reset role;

do $$
declare
  v_not_approved uuid;
  v_approved uuid;
begin
  select id into v_not_approved from public.operational_events
   where deduplication_key='service:sac-9:not-approved';
  select id into v_approved from public.operational_events
   where deduplication_key='service:sac-10:approved';

  if exists (
    select 1 from public.operational_notifications
    where event_id=v_not_approved and recipient_persona='P15'
  ) then
    raise exception 'TESTE 4 falhou: cliente recebeu fato não aprovado.';
  end if;
  if not exists (
    select 1 from public.operational_notifications
    where event_id=v_approved and recipient_persona='P15'
  ) then
    raise exception 'TESTE 5 falhou: cliente não recebeu fato aprovado.';
  end if;
end;
$$;

set role authenticated;
select set_config('test.user_id','11111111-1111-1111-1111-111111111111',false);

do $$
declare
  v_raised boolean := false;
begin
  begin
    perform public.create_operational_event(
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'aaaaaaaa-0000-0000-0000-000000000001',
      'security.access_conflict',
      'administracao',
      'security',
      'aaaaaaaa-0000-0000-0000-000000000099',
      'Conflito de acesso',
      'Segregação violada',
      'P6',
      '2099-07-28T12:00:00Z',
      '2099-07-28T13:00:00Z',
      false,
      '{}',
      'security:conflict-99'
    );
  exception when others then
    v_raised := sqlerrm like '%não responde pela persona%';
  end;
  if not v_raised then
    raise exception 'TESTE 6 falhou: persona de origem pôde ser falsificada.';
  end if;
end;
$$;

do $$
declare
  v_raised boolean := false;
begin
  begin
    insert into public.operational_events(
      organization_id, event_code, module_key, object_type, object_id,
      title, impact, obligation_persona, actor_persona, actor_user_id,
      occurred_at, response_due_at, deduplication_key
    ) values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'planning.critical_path_at_risk','planejamento','project',
      'aaaaaaaa-0000-0000-0000-000000000088','Inserção direta',
      'Contorno da RPC','P8','P2','11111111-1111-1111-1111-111111111111',
      '2099-07-28T12:00:00Z','2099-07-28T13:00:00Z','direct:must-fail'
    );
  exception when insufficient_privilege then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'TESTE 7 falhou: escrita direta no fato foi aceita.';
  end if;
end;
$$;

reset role;

do $$
declare
  v_raised boolean := false;
begin
  begin
    insert into public.operational_responsibilities(
      organization_id,project_id,persona_id,user_id
    ) values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'bbbbbbbb-0000-0000-0000-000000000001',
      'P8',
      '33333333-3333-3333-3333-333333333333'
    );
  exception when foreign_key_violation then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'TESTE 8 falhou: responsabilidade cruzou organizações.';
  end if;

end;
$$;

-- O cliente enxerga somente o fato cujo recorte foi aprovado e destinado a ele.
set role authenticated;
select set_config('test.user_id','55555555-5555-5555-5555-555555555555',false);

do $$
begin
  if (select count(*) from public.operational_notifications) <> 1 then
    raise exception 'TESTE 9 falhou: caixa do cliente expôs aviso alheio.';
  end if;
  if (select count(*) from public.operational_events) <> 1 then
    raise exception 'TESTE 10 falhou: cliente viu fato interno ou perdeu o fato aprovado.';
  end if;
end;
$$;

update public.operational_notifications
set read_at = '2099-07-28T12:30:00Z'
where read_at is null;

do $$
declare
  v_raised boolean := false;
begin
  if not exists (
    select 1 from public.operational_notifications
    where read_at = '2099-07-28T12:30:00Z'
  ) then
    raise exception 'TESTE 11 falhou: destinatário não conseguiu marcar o próprio aviso como lido.';
  end if;

  begin
    update public.operational_notifications set escalated = true;
  exception when insufficient_privilege then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'TESTE 12 falhou: destinatário alterou conteúdo protegido do aviso.';
  end if;
end;
$$;

reset role;

do $$
begin
  null;
end;
$$;

-- Cliente pode originar somente a rotina P15 que lhe pertence.
set role authenticated;
select set_config('test.user_id','55555555-5555-5555-5555-555555555555',false);

select public.create_operational_event(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'client.decision_or_context_risk',
  'sac',
  'ticket',
  'aaaaaaaa-0000-0000-0000-000000000011',
  'Decisão do cliente pendente',
  'A entrega depende de uma escolha de acabamento',
  'P1',
  '2099-07-28T12:00:00Z',
  '2099-07-28T16:00:00Z',
  false,
  '{}',
  'client:decision-11'
);

do $$
declare
  v_raised boolean := false;
begin
  if not exists (
    select 1 from public.operational_events
    where deduplication_key = 'client:decision-11'
  ) then
    raise exception 'TESTE 13 falhou: cliente não originou a própria rotina.';
  end if;

  begin
    perform public.create_operational_event(
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'aaaaaaaa-0000-0000-0000-000000000001',
      'service.sla_breached',
      'sac',
      'ticket',
      'aaaaaaaa-0000-0000-0000-000000000012',
      'Tentativa de representar o SAC',
      'Cliente não pode assumir cadeira interna',
      'P5',
      '2099-07-28T12:00:00Z',
      '2099-07-28T16:00:00Z',
      false,
      '{}',
      'client:spoof-service-12'
    );
  exception when others then
    v_raised := sqlerrm like '%não pode originar%';
  end;
  if not v_raised then
    raise exception 'TESTE 14 falhou: cliente representou uma profissão interna.';
  end if;
end;
$$;

reset role;

do $$
begin
  raise notice 'Operações — 14 testes de evento, RLS e notificação aprovados.';
end;
$$;
