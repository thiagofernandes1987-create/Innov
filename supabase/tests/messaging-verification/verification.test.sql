\set ON_ERROR_STOP on
select set_config('test.organization_id','11111111-1111-1111-1111-111111111111',false);
select set_config('test.user_id','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
select set_config('test.permission_granted','true',false);

do $$ begin
  if to_regclass('public.channel_verification_runs') is null then raise exception 'W-19 tabela ausente'; end if;
  raise notice 'W-19 ledger de verificação aprovado';
end $$;

do $$ declare item public.channel_verification_runs; begin
  item := public.record_channel_verification_run(
    '11111111-1111-1111-1111-111111111111','CHAOS_SYNTHETIC','RESTART_DURING_MESSAGE','PASSED',
    '["persist-before-restart","single-dispatch"]'::jsonb,'{"dataLoss":false,"duplicateSideEffect":false}'::jsonb,
    '{}'::jsonb,repeat('a',40)
  );
  if item.environment <> 'SYNTHETIC_LOCAL' or item.real_number_used or item.qr_or_pairing_used then
    raise exception 'W-19 evidência não sintética';
  end if;
  raise notice 'W-19 chaos sintético persistido aprovado';
end $$;

do $$ declare item public.channel_verification_runs; begin
  item := public.record_channel_verification_run(
    '11111111-1111-1111-1111-111111111111','PERFORMANCE_SYNTHETIC','BENCHMARK_MEMORY_THROUGHPUT_LATENCY','PASSED',
    '["memory-per-session","throughput","p95-latency"]'::jsonb,
    '{"iterations":20000,"throughputPerSecond":10000,"p95LatencyMs":1,"bytesPerSyntheticSession":5000}'::jsonb,
    '{"minimumThroughputPerSecond":1000,"maximumP95LatencyMs":5,"maximumBytesPerSyntheticSession":1000000}'::jsonb,
    repeat('b',40)
  );
  if item.measurements->>'p95LatencyMs' <> '1' then raise exception 'W-19 medida ausente'; end if;
  raise notice 'W-19 limites de performance registrados aprovados';
end $$;

do $$ begin
  begin
    insert into public.channel_verification_runs(
      organization_id,suite,scenario,status,real_number_used,commit_sha
    ) values (
      '11111111-1111-1111-1111-111111111111','CHAOS_SYNTHETIC','REAL_NUMBER_ATTEMPT','PASSED',true,repeat('c',40)
    );
    raise exception 'W-19 número real aceito';
  exception when check_violation then null;
  end;
  raise notice 'W-19 número real bloqueado aprovado';
end $$;

do $$ begin
  begin
    insert into public.channel_verification_runs(
      organization_id,suite,scenario,status,qr_or_pairing_used,commit_sha
    ) values (
      '11111111-1111-1111-1111-111111111111','CHAOS_SYNTHETIC','QR_ATTEMPT','PASSED',true,repeat('d',40)
    );
    raise exception 'W-19 QR aceito';
  exception when check_violation then null;
  end;
  raise notice 'W-19 QR e pairing bloqueados aprovados';
end $$;

do $$ begin
  begin
    insert into public.channel_verification_runs(
      organization_id,suite,scenario,status,external_network_used,commit_sha
    ) values (
      '11111111-1111-1111-1111-111111111111','CHAOS_SYNTHETIC','NETWORK_ATTEMPT','PASSED',true,repeat('e',40)
    );
    raise exception 'W-19 rede externa aceita';
  exception when check_violation then null;
  end;
  raise notice 'W-19 rede externa bloqueada aprovada';
end $$;

do $$ begin
  begin
    insert into public.channel_verification_runs(
      organization_id,suite,scenario,status,production_claim,commit_sha
    ) values (
      '11111111-1111-1111-1111-111111111111','PERFORMANCE_SYNTHETIC','PRODUCTION_CLAIM','PASSED',true,repeat('f',40)
    );
    raise exception 'W-19 claim produtivo aceito';
  exception when check_violation then null;
  end;
  raise notice 'W-19 claim produtivo bloqueado aprovado';
end $$;

do $$ begin
  begin
    perform public.record_channel_verification_run(
      '11111111-1111-1111-1111-111111111111','CHAOS_SYNTHETIC','SENSITIVE_ASSERTION','PASSED',
      '[{"content":"payload bruto"}]'::jsonb,'{}'::jsonb,'{}'::jsonb,repeat('1',40)
    );
    raise exception 'W-19 payload sensível aceito';
  exception when check_violation then null;
  end;
  raise notice 'W-19 evidência minimizada aprovada';
end $$;

do $$ declare run_id uuid; begin
  select id into run_id from public.channel_verification_runs limit 1;
  begin
    update public.channel_verification_runs set status='FAILED' where id=run_id;
    raise exception 'W-19 resultado mutável';
  exception when others then
    if sqlerrm not like '%VERIFICATION_RUN_IMMUTABLE%' then raise; end if;
  end;
  raise notice 'W-19 resultado imutável aprovado';
end $$;

begin;
set local role authenticated;
select set_config('test.organization_id','22222222-2222-2222-2222-222222222222',true);
do $$ begin
  if exists (select 1 from public.channel_verification_runs where organization_id='11111111-1111-1111-1111-111111111111') then
    raise exception 'W-19 leitura cross tenant permitida';
  end if;
  raise notice 'W-19 isolamento multiempresa aprovado';
end $$;
rollback;
select set_config('test.organization_id','11111111-1111-1111-1111-111111111111',false);

do $$ begin
  if not (select relrowsecurity and relforcerowsecurity from pg_class where oid='public.channel_verification_runs'::regclass) then
    raise exception 'W-19 RLS não forçada';
  end if;
  if has_table_privilege('authenticated','public.channel_verification_runs','INSERT') then
    raise exception 'W-19 escrita direta permitida';
  end if;
  raise notice 'W-19 RLS e privilégio mínimo aprovados';
end $$;

\echo 'Testes PostgreSQL W-19 aprovados: 10 controles.'
