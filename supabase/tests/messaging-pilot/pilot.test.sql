\set ON_ERROR_STOP on
select set_config('test.organization_id','11111111-1111-1111-1111-111111111111',false);
select set_config('test.user_id','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
select set_config('test.permission_granted','true',false);

do $$ begin
  if to_regclass('public.channel_pilot_plans') is null
    or to_regclass('public.channel_pilot_assessments') is null
    or to_regclass('public.channel_pilot_daily_reviews') is null then
    raise exception 'W-21 tabelas ausentes';
  end if;
  raise notice 'W-21 ledger de piloto aprovado';
end $$;

create temporary table pilot_ids(id uuid);
insert into pilot_ids
select id from public.create_channel_pilot_plan(
  '11111111-1111-1111-1111-111111111111','Piloto controlado sintético',5,20,100,9,17,array[1,2,3,4,5]
);

do $$ declare item public.channel_pilot_plans; begin
  select * into item from public.channel_pilot_plans where id=(select id from pilot_ids);
  if item.status <> 'HOLD' or item.campaigns_enabled or item.ai_mode <> 'DRAFT_ONLY' then
    raise exception 'W-21 plano não fail-closed';
  end if;
  if item.real_team_selected or item.real_conversations_selected or item.real_pilot_executed then
    raise exception 'W-21 atividade real marcada';
  end if;
  raise notice 'W-21 limites horário campanhas e IA aprovados';
end $$;

do $$ begin
  begin
    perform public.create_channel_pilot_plan(
      '11111111-1111-1111-1111-111111111111','Piloto grande',6,20,100,9,17,array[1,2,3,4,5]
    );
    raise exception 'W-21 equipe acima do limite aceita';
  exception when check_violation then null;
  end;
  begin
    perform public.create_channel_pilot_plan(
      '11111111-1111-1111-1111-111111111111','Piloto amplo',5,21,100,9,17,array[1,2,3,4,5]
    );
    raise exception 'W-21 conversas acima do limite aceitas';
  exception when check_violation then null;
  end;
  raise notice 'W-21 escopo pequeno obrigatório aprovado';
end $$;

do $$ declare item public.channel_pilot_assessments; begin
  item := public.record_channel_pilot_assessment(
    '11111111-1111-1111-1111-111111111111',(select id from pilot_ids),'HOLD',
    '["HOMOLOGATION_GATE_BLOCKED","LEGAL_REVIEW_NOT_APPROVED","REAL_PILOT_NOT_AUTHORIZED"]'::jsonb,
    '[{"id":"AVAILABILITY","objective":99},{"id":"DELIVERY_SUCCESS","objective":98},{"id":"DUPLICATE_RATE","objective":0},{"id":"HANDOFF_LATENCY","objective":300},{"id":"SECURITY_INCIDENTS","objective":0},{"id":"COST_PER_CONVERSATION","objective":500000}]'::jsonb,
    '[{"id":"SESSION_RESTRICTION","immediateRollback":true},{"id":"DUPLICATE_SEND","immediateRollback":true},{"id":"CROSS_TENANT","immediateRollback":true},{"id":"KEY_PERSISTENCE","immediateRollback":true},{"id":"LEASE_CONFLICT","immediateRollback":true},{"id":"DLQ_GROWTH","immediateRollback":false},{"id":"SLO_BREACH","immediateRollback":false},{"id":"LEGAL_OR_COMPLIANCE","immediateRollback":true}]'::jsonb,
    '[{"provider":"META_CLOUD","evidenceLevel":"SYNTHETIC","policyRisk":"LOW"},{"provider":"WHATSAPP_WEB_BAILEYS","evidenceLevel":"SYNTHETIC","policyRisk":"HIGH"}]'::jsonb,
    '{"environment":"SYNTHETIC_LOCAL","estimatedCostMicros":0}'::jsonb,
    'PENDING',true,true,repeat('a',40)
  );
  if item.decision <> 'HOLD' or item.homologation_gate_released or item.real_pilot_executed then
    raise exception 'W-21 assessment inválido';
  end if;
  raise notice 'W-21 decisão HOLD e bloqueadores aprovados';
end $$;

do $$ begin
  begin
    perform public.record_channel_pilot_assessment(
      '11111111-1111-1111-1111-111111111111',(select id from pilot_ids),'GO','[]'::jsonb,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,'{}'::jsonb,'APPROVED',true,true,repeat('b',40)
    );
    raise exception 'W-21 GO aceito sem revisão real';
  exception when others then
    if sqlerrm not like '%REAL_PILOT_REVIEW_REQUIRED%' then raise; end if;
  end;
  raise notice 'W-21 GO sem revisão real bloqueado aprovado';
end $$;

do $$ begin
  begin
    insert into public.channel_pilot_plans(
      organization_id,name,status,maximum_team_members,maximum_conversations,maximum_daily_messages,
      start_hour,end_hour,weekdays,campaigns_enabled,ai_mode
    ) values (
      '11111111-1111-1111-1111-111111111111','Campanha proibida','NO_GO',1,1,1,9,10,array[1],true,'DRAFT_ONLY'
    );
    raise exception 'W-21 campanhas habilitadas';
  exception when check_violation then null;
  end;
  begin
    insert into public.channel_pilot_plans(
      organization_id,name,status,maximum_team_members,maximum_conversations,maximum_daily_messages,
      start_hour,end_hour,weekdays,campaigns_enabled,ai_mode
    ) values (
      '11111111-1111-1111-1111-111111111111','IA autônoma proibida','NO_GO',1,1,1,9,10,array[1],false,'AUTONOMOUS'
    );
    raise exception 'W-21 IA autônoma aceita';
  exception when check_violation then null;
  end;
  raise notice 'W-21 campanhas e IA autônoma bloqueadas aprovadas';
end $$;

do $$ declare item public.channel_pilot_daily_reviews; begin
  item := public.record_channel_pilot_daily_review(
    '11111111-1111-1111-1111-111111111111',(select id from pilot_ids),current_date,
    '[{"category":"OPEN_SECURITY_INCIDENTS","count":0},{"category":"DUPLICATE_SIDE_EFFECTS","count":0}]'::jsonb,
    '{"environment":"SYNTHETIC_LOCAL","costMicros":0}'::jsonb,false
  );
  if item.status <> 'SYNTHETIC_REHEARSAL' or item.real_activity then raise exception 'W-21 revisão diária inválida'; end if;
  raise notice 'W-21 revisão diária de incidentes e custo aprovada';
end $$;

do $$ begin
  if (select jsonb_array_length(provider_comparison) from public.channel_pilot_assessments limit 1) <> 2 then
    raise exception 'W-21 comparação incompleta';
  end if;
  if not (select rollback_tested_synthetic and daily_incident_review_defined from public.channel_pilot_assessments limit 1) then
    raise exception 'W-21 rollback ou review ausente';
  end if;
  raise notice 'W-21 comparação providers SLIs SLOs rollback e custo aprovados';
end $$;

do $$ declare assessment_id uuid; begin
  select id into assessment_id from public.channel_pilot_assessments limit 1;
  begin
    update public.channel_pilot_assessments set decision='NO_GO' where id=assessment_id;
    raise exception 'W-21 avaliação mutável';
  exception when others then
    if sqlerrm not like '%PILOT_EVIDENCE_IMMUTABLE%' then raise; end if;
  end;
  raise notice 'W-21 evidência de piloto imutável aprovada';
end $$;

begin;
set local role authenticated;
select set_config('test.organization_id','22222222-2222-2222-2222-222222222222',true);
do $$ begin
  if exists (select 1 from public.channel_pilot_plans where organization_id='11111111-1111-1111-1111-111111111111') then
    raise exception 'W-21 leitura cross tenant permitida';
  end if;
  raise notice 'W-21 isolamento multiempresa aprovado';
end $$;
rollback;
select set_config('test.organization_id','11111111-1111-1111-1111-111111111111',false);

do $$ declare forced_count integer; begin
  select count(*) into forced_count from pg_class
  where oid in (
    'public.channel_pilot_plans'::regclass,
    'public.channel_pilot_assessments'::regclass,
    'public.channel_pilot_daily_reviews'::regclass
  ) and relrowsecurity and relforcerowsecurity;
  if forced_count <> 3 then raise exception 'W-21 RLS não forçada'; end if;
  if has_table_privilege('authenticated','public.channel_pilot_assessments','INSERT') then
    raise exception 'W-21 escrita direta permitida';
  end if;
  raise notice 'W-21 RLS e privilégio mínimo aprovados';
end $$;

\echo 'Testes PostgreSQL W-21 aprovados: 10 controles.'
