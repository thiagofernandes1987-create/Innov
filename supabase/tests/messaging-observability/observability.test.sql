\set ON_ERROR_STOP on
select set_config('test.organization_id','11111111-1111-1111-1111-111111111111',false);
select set_config('test.user_id','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
select set_config('test.permission_granted','true',false);

do $$ begin
  if to_regclass('public.channel_runtime_observations') is null
    or to_regclass('public.channel_operational_alerts') is null then
    raise exception 'W-18 tabelas ausentes';
  end if;
  raise notice 'W-18 persistência de observabilidade aprovada';
end $$;

do $$ declare item public.channel_runtime_observations; begin
  item := public.record_channel_runtime_observation(
    '11111111-1111-1111-1111-111111111111','WHATSAPP_WEB_BAILEYS','synthetic-account','RECONNECTING',
    6,12.5,8.2,0.12,15,2,1,1,4,500,1200
  );
  if item.reconnects_window <> 6 or item.ai_cost_micros_window <> 1200 then
    raise exception 'W-18 snapshot incompleto';
  end if;
  raise notice 'W-18 métricas de sessão tráfego retry DLQ mídia e IA aprovadas';
end $$;

do $$ declare item public.channel_operational_alerts; begin
  item := public.upsert_channel_operational_alert(
    '11111111-1111-1111-1111-111111111111','WHATSAPP_WEB_BAILEYS','synthetic-account',
    'RECONNECT_LOOP','WARNING','Sessão em loop de reconexão',6,5,
    'RUNBOOK-DESCONEXAO-W18.md','correlation-observability-1'
  );
  if item.status <> 'OPEN' or item.runbook <> 'RUNBOOK-DESCONEXAO-W18.md' then
    raise exception 'W-18 alerta inválido';
  end if;
  raise notice 'W-18 alerta de reconnect loop aprovado';
end $$;

do $$ declare first_id uuid; second_id uuid; begin
  select id into first_id from public.channel_operational_alerts where alert_code='RECONNECT_LOOP';
  select id into second_id from public.upsert_channel_operational_alert(
    '11111111-1111-1111-1111-111111111111','WHATSAPP_WEB_BAILEYS','synthetic-account',
    'RECONNECT_LOOP','CRITICAL','Sessão exige ação humana',10,5,
    'RUNBOOK-DESCONEXAO-W18.md','correlation-observability-2'
  );
  if first_id <> second_id then raise exception 'W-18 alerta duplicado'; end if;
  if (select severity from public.channel_operational_alerts where id=first_id) <> 'CRITICAL' then
    raise exception 'W-18 alerta não atualizado';
  end if;
  raise notice 'W-18 deduplicação e atualização de alerta aprovadas';
end $$;

do $$ declare item public.channel_operational_alerts; begin
  item := public.upsert_channel_operational_alert(
    '11111111-1111-1111-1111-111111111111','WHATSAPP_WEB_BAILEYS','synthetic-account',
    'DLQ_GROWTH','CRITICAL','DLQ acima do limite',20,10,
    'RUNBOOK-ROLLBACK-W18.md','correlation-observability-3'
  );
  if item.alert_code <> 'DLQ_GROWTH' then raise exception 'W-18 alerta DLQ inválido'; end if;
  raise notice 'W-18 alerta de DLQ aprovado';
end $$;

do $$ declare item public.channel_operational_alerts; begin
  item := public.upsert_channel_operational_alert(
    '11111111-1111-1111-1111-111111111111','WHATSAPP_WEB_BAILEYS','synthetic-account',
    'LEASE_CONFLICT','CRITICAL','Disputa de single writer',1,1,
    'RUNBOOK-DESCONEXAO-W18.md','correlation-observability-4'
  );
  if item.alert_code <> 'LEASE_CONFLICT' then raise exception 'W-18 alerta lease inválido'; end if;
  raise notice 'W-18 alerta de perda de lease aprovado';
end $$;

do $$ declare item public.channel_operational_alerts; begin
  item := public.upsert_channel_operational_alert(
    '11111111-1111-1111-1111-111111111111','WHATSAPP_WEB_BAILEYS','synthetic-account',
    'KEY_PERSISTENCE_FAILURE','CRITICAL','Falha de persistência de keys',1,1,
    'RUNBOOK-ROLLBACK-W18.md','correlation-observability-5'
  );
  if item.alert_code <> 'KEY_PERSISTENCE_FAILURE' then raise exception 'W-18 alerta keys inválido'; end if;
  raise notice 'W-18 alerta de persistência de keys aprovado';
end $$;

do $$ declare alert_id uuid; item public.channel_operational_alerts; begin
  select id into alert_id from public.channel_operational_alerts where alert_code='RECONNECT_LOOP';
  item := public.acknowledge_channel_operational_alert('11111111-1111-1111-1111-111111111111',alert_id);
  if item.status <> 'ACKNOWLEDGED' or item.acknowledged_by is null then raise exception 'W-18 ack inválido'; end if;
  item := public.resolve_channel_operational_alert('11111111-1111-1111-1111-111111111111',alert_id);
  if item.status <> 'RESOLVED' or item.resolved_at is null then raise exception 'W-18 resolução inválida'; end if;
  raise notice 'W-18 acknowledgment e resolução aprovados';
end $$;

do $$ declare observation_id uuid; begin
  select id into observation_id from public.channel_runtime_observations limit 1;
  begin
    update public.channel_runtime_observations set session_state='CONNECTED' where id=observation_id;
    raise exception 'W-18 observação mutável';
  exception when others then
    if sqlerrm not like '%RUNTIME_OBSERVATION_IMMUTABLE%' then raise; end if;
  end;
  raise notice 'W-18 observação imutável aprovada';
end $$;

begin;
set local role authenticated;
select set_config('test.organization_id','22222222-2222-2222-2222-222222222222',true);
do $$ begin
  if exists (select 1 from public.channel_runtime_observations where organization_id='11111111-1111-1111-1111-111111111111') then
    raise exception 'W-18 leitura cross tenant permitida';
  end if;
  raise notice 'W-18 isolamento multiempresa aprovado';
end $$;
rollback;
select set_config('test.organization_id','11111111-1111-1111-1111-111111111111',false);

do $$ declare forced_count integer; begin
  select count(*) into forced_count from pg_class
  where oid in ('public.channel_runtime_observations'::regclass,'public.channel_operational_alerts'::regclass)
    and relrowsecurity and relforcerowsecurity;
  if forced_count <> 2 then raise exception 'W-18 RLS não forçada'; end if;
  if has_table_privilege('authenticated','public.channel_operational_alerts','INSERT') then
    raise exception 'W-18 escrita direta permitida';
  end if;
  raise notice 'W-18 RLS e privilégio mínimo aprovados';
end $$;

\echo 'Testes PostgreSQL W-18 aprovados: 10 controles.'
