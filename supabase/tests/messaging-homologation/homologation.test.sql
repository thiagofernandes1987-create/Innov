\set ON_ERROR_STOP on
select set_config('test.organization_id','11111111-1111-1111-1111-111111111111',false);
select set_config('test.user_id','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
select set_config('test.permission_granted','true',false);

do $$ begin
  if to_regclass('public.channel_homologation_assessments') is null
    or to_regclass('public.channel_homologation_rehearsals') is null then
    raise exception 'W-20 tabelas ausentes';
  end if;
  raise notice 'W-20 ledger de homologação aprovado';
end $$;

do $$ declare item public.channel_homologation_assessments; begin
  item := public.record_channel_homologation_assessment(
    '11111111-1111-1111-1111-111111111111','BLOCKED_NOT_EXECUTED',
    '[{"requirement":"EXCLUSIVE_AUTHORIZED_NUMBER","level":"NONE","passed":false},{"requirement":"CAMPAIGNS_BLOCKED","level":"SYNTHETIC","passed":true}]'::jsonb,
    '["EXCLUSIVE_AUTHORIZED_NUMBER","DEDICATED_ORGANIZATION","AUTHORIZED_USERS"]'::jsonb,
    repeat('a',40)
  );
  if item.decision <> 'BLOCKED_NOT_EXECUTED' or item.real_number_used or item.external_connection_used then
    raise exception 'W-20 decisão inválida';
  end if;
  raise notice 'W-20 decisão bloqueada e sem execução real aprovada';
end $$;

do $$ begin
  begin
    perform public.record_channel_homologation_assessment(
      '11111111-1111-1111-1111-111111111111','READY_FOR_AUTHORIZED_EXECUTION','[]'::jsonb,'[]'::jsonb,repeat('b',40)
    );
    raise exception 'W-20 readiness real aceito sem evidência';
  exception when others then
    if sqlerrm not like '%REAL_HOMOLOGATION_EVIDENCE_REQUIRED%' then raise; end if;
  end;
  raise notice 'W-20 readiness sem evidência real bloqueado aprovado';
end $$;

select public.record_channel_homologation_rehearsal(
  '11111111-1111-1111-1111-111111111111','SESSION_PURGE','PASSED_SYNTHETIC',
  '{"source":"W07_CRYPTO_DELETE","realExecution":false}'::jsonb
);
select public.record_channel_homologation_rehearsal(
  '11111111-1111-1111-1111-111111111111','HUMAN_HANDOFF','PASSED_SYNTHETIC',
  '{"source":"W15_W16_HANDOFF","realExecution":false}'::jsonb
);
select public.record_channel_homologation_rehearsal(
  '11111111-1111-1111-1111-111111111111','INCIDENT_REGISTRATION','PASSED_SYNTHETIC',
  '{"source":"W17_INCIDENT","realExecution":false}'::jsonb
);
select public.record_channel_homologation_rehearsal(
  '11111111-1111-1111-1111-111111111111','DAILY_OPERATION','PASSED_SYNTHETIC',
  '{"steps":8,"realExecution":false}'::jsonb
);

do $$ begin
  if (select count(*) from public.channel_homologation_rehearsals where organization_id='11111111-1111-1111-1111-111111111111') <> 4 then
    raise exception 'W-20 ensaios incompletos';
  end if;
  if exists (select 1 from public.channel_homologation_rehearsals where real_execution) then
    raise exception 'W-20 ensaio marcado como real';
  end if;
  raise notice 'W-20 purge handoff incidente e fluxo diário sintéticos aprovados';
end $$;

do $$ begin
  begin
    insert into public.channel_homologation_assessments(
      organization_id,decision,checks,blockers,real_number_used,commit_sha
    ) values (
      '11111111-1111-1111-1111-111111111111','BLOCKED_NOT_EXECUTED','[]'::jsonb,'[]'::jsonb,true,repeat('c',40)
    );
    raise exception 'W-20 número real aceito';
  exception when check_violation then null;
  end;
  raise notice 'W-20 número real bloqueado aprovado';
end $$;

do $$ begin
  begin
    insert into public.channel_homologation_assessments(
      organization_id,decision,checks,blockers,dedicated_real_organization_used,commit_sha
    ) values (
      '11111111-1111-1111-1111-111111111111','BLOCKED_NOT_EXECUTED','[]'::jsonb,'[]'::jsonb,true,repeat('d',40)
    );
    raise exception 'W-20 organização real aceita';
  exception when check_violation then null;
  end;
  raise notice 'W-20 organização dedicada real bloqueada aprovada';
end $$;

do $$ begin
  begin
    insert into public.channel_homologation_assessments(
      organization_id,decision,checks,blockers,production_authorized,commit_sha
    ) values (
      '11111111-1111-1111-1111-111111111111','BLOCKED_NOT_EXECUTED','[]'::jsonb,'[]'::jsonb,true,repeat('e',40)
    );
    raise exception 'W-20 produção autorizada';
  exception when check_violation then null;
  end;
  raise notice 'W-20 produção bloqueada aprovada';
end $$;

do $$ declare assessment_id uuid; begin
  select id into assessment_id from public.channel_homologation_assessments limit 1;
  begin
    update public.channel_homologation_assessments set decision='READY_FOR_AUTHORIZED_EXECUTION' where id=assessment_id;
    raise exception 'W-20 evidência mutável';
  exception when others then
    if sqlerrm not like '%HOMOLOGATION_EVIDENCE_IMMUTABLE%' then raise; end if;
  end;
  raise notice 'W-20 evidência imutável aprovada';
end $$;

begin;
set local role authenticated;
select set_config('test.organization_id','22222222-2222-2222-2222-222222222222',true);
do $$ begin
  if exists (select 1 from public.channel_homologation_assessments where organization_id='11111111-1111-1111-1111-111111111111') then
    raise exception 'W-20 leitura cross tenant permitida';
  end if;
  raise notice 'W-20 isolamento multiempresa aprovado';
end $$;
rollback;
select set_config('test.organization_id','11111111-1111-1111-1111-111111111111',false);

do $$ declare forced_count integer; begin
  select count(*) into forced_count from pg_class
  where oid in ('public.channel_homologation_assessments'::regclass,'public.channel_homologation_rehearsals'::regclass)
    and relrowsecurity and relforcerowsecurity;
  if forced_count <> 2 then raise exception 'W-20 RLS não forçada'; end if;
  if has_table_privilege('authenticated','public.channel_homologation_assessments','INSERT') then
    raise exception 'W-20 escrita direta permitida';
  end if;
  raise notice 'W-20 RLS e privilégio mínimo aprovados';
end $$;

\echo 'Testes PostgreSQL W-20 aprovados: 9 controles.'
