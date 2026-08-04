\set ON_ERROR_STOP on

select set_config('test.organization_id','11111111-1111-1111-1111-111111111111',false);
select set_config('test.user_id','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
select set_config('test.permission_granted','true',false);

insert into public.channel_ai_budget_daily(
  organization_id,usage_date,maximum_cost_micros
) values (
  '11111111-1111-1111-1111-111111111111',current_date,1000
);

do $$ begin
  if to_regclass('public.channel_ai_invocations') is null
    or to_regclass('public.channel_ai_handoffs') is null
    or to_regclass('public.channel_ai_conversation_locks') is null then
    raise exception 'W-15 tabelas ausentes';
  end if;
  raise notice 'W-15 persistência da ponte de IA aprovada';
end $$;

do $$ begin
  begin
    insert into public.channel_ai_invocations(
      organization_id,conversation_id,provider_id,model_id,autonomy_mode,status
    ) values (
      '11111111-1111-1111-1111-111111111111',
      '12000000-0000-0000-0000-000000000001','fake','model','AUTONOMOUS','DRAFT_CREATED'
    );
    raise exception 'W-15 autonomia indevida aceita';
  exception when check_violation then null;
  end;
  raise notice 'W-15 modo draft_only aprovado';
end $$;

do $$ declare token bigint; begin
  token := public.claim_channel_ai_conversation(
    '11111111-1111-1111-1111-111111111111',
    '12000000-0000-0000-0000-000000000001','worker-a',30
  );
  if token <> 1 then raise exception 'W-15 fencing inicial inválido'; end if;
  raise notice 'W-15 lock atômico por conversa aprovado';
end $$;

do $$ declare token bigint; begin
  token := public.claim_channel_ai_conversation(
    '11111111-1111-1111-1111-111111111111',
    '12000000-0000-0000-0000-000000000001','worker-b',30
  );
  if token is not null then raise exception 'W-15 concorrência não bloqueada'; end if;
  raise notice 'W-15 concorrência de geração bloqueada aprovada';
end $$;

do $$ begin
  if public.release_channel_ai_conversation(
    '11111111-1111-1111-1111-111111111111',
    '12000000-0000-0000-0000-000000000001','worker-a',99
  ) then raise exception 'W-15 fencing incorreto liberou lock'; end if;
  if not public.release_channel_ai_conversation(
    '11111111-1111-1111-1111-111111111111',
    '12000000-0000-0000-0000-000000000001','worker-a',1
  ) then raise exception 'W-15 lock correto não liberado'; end if;
  raise notice 'W-15 fencing e release aprovados';
end $$;

do $$ begin
  if not public.reserve_channel_ai_budget('11111111-1111-1111-1111-111111111111',700) then
    raise exception 'W-15 reserva válida recusada';
  end if;
  if public.reserve_channel_ai_budget('11111111-1111-1111-1111-111111111111',400) then
    raise exception 'W-15 orçamento excedido aceito';
  end if;
  if not public.commit_channel_ai_budget('11111111-1111-1111-1111-111111111111',700,250) then
    raise exception 'W-15 commit de custo recusado';
  end if;
  raise notice 'W-15 orçamento e custo por organização aprovados';
end $$;

do $$ declare item public.channel_ai_handoffs; begin
  item := public.request_channel_ai_handoff(
    '11111111-1111-1111-1111-111111111111',
    '12000000-0000-0000-0000-000000000001',
    'HUMAN_ASSIGNED',E'Operador assumiu\nResumo sanitizado'
  );
  if item.status <> 'OPEN' or item.summary like E'%\n%' then
    raise exception 'W-15 handoff inválido';
  end if;
  raise notice 'W-15 handoff persistente e resumo aprovados';
end $$;

do $$ declare item public.channel_ai_invocations; begin
  item := public.record_channel_ai_invocation(
    '11111111-1111-1111-1111-111111111111',
    '12000000-0000-0000-0000-000000000001',
    'FAKE_AI','fake-model','DRAFT_CREATED',
    '[{"sourceId":"source-1","version":2,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb,
    '["SEARCH_CANONICAL"]'::jsonb,100,20,250,
    '{"requiresHumanReview":true}'::jsonb,2
  );
  if item.autonomy_mode <> 'DRAFT_ONLY' or item.estimated_cost_micros <> 250 then
    raise exception 'W-15 auditoria incompleta';
  end if;
  raise notice 'W-15 auditoria de modelo fontes ferramentas e custo aprovada';
end $$;

do $$ begin
  begin
    perform public.record_channel_ai_invocation(
      '11111111-1111-1111-1111-111111111111',
      '12000000-0000-0000-0000-000000000001',
      'FAKE_AI','fake-model','DRAFT_CREATED',
      '[{"content":"prompt bruto"}]'::jsonb,'[]'::jsonb,0,0,0,'{}'::jsonb,0
    );
    raise exception 'W-15 payload bruto aceito';
  exception when check_violation then null;
  end;
  raise notice 'W-15 minimização e payload bruto bloqueado aprovados';
end $$;

do $$ declare invocation_id uuid; begin
  select id into invocation_id from public.channel_ai_invocations limit 1;
  begin
    update public.channel_ai_invocations set model_id='alterado' where id=invocation_id;
    raise exception 'W-15 auditoria mutável';
  exception when others then
    if sqlerrm not like '%AI_INVOCATION_IMMUTABLE%' then raise; end if;
  end;
  raise notice 'W-15 auditoria imutável aprovada';
end $$;

do $$ begin
  begin
    perform public.request_channel_ai_handoff(
      '22222222-2222-2222-2222-222222222222',
      '12000000-0000-0000-0000-000000000001',
      'HUMAN_ASSIGNED','cross tenant'
    );
    raise exception 'W-15 cross tenant aceito';
  exception when others then
    if sqlerrm not like '%AI_SCOPE_MISMATCH%' then raise; end if;
  end;
  raise notice 'W-15 isolamento multiempresa aprovado';
end $$;

do $$ declare forced_count integer; begin
  select count(*) into forced_count
  from pg_class
  where oid in (
    'public.channel_ai_conversation_locks'::regclass,
    'public.channel_ai_budget_daily'::regclass,
    'public.channel_ai_handoffs'::regclass,
    'public.channel_ai_invocations'::regclass
  ) and relrowsecurity and relforcerowsecurity;
  if forced_count <> 4 then raise exception 'W-15 RLS não forçada'; end if;
  if has_table_privilege('authenticated','public.channel_ai_invocations','INSERT') then
    raise exception 'W-15 escrita direta autenticada permitida';
  end if;
  raise notice 'W-15 RLS e privilégio mínimo aprovados';
end $$;

\echo 'Testes PostgreSQL W-15 aprovados: 12 controles.'
