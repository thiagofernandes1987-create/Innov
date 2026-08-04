\set ON_ERROR_STOP on
select set_config('test.organization_id','11111111-1111-1111-1111-111111111111',false);
select set_config('test.user_id','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
select set_config('test.permission_granted','true',false);

do $$ begin
  if to_regclass('public.channel_sensitive_access_audit') is null
    or to_regclass('public.channel_security_incidents') is null
    or to_regclass('public.channel_critical_write_approvals') is null then
    raise exception 'W-17 tabelas ausentes';
  end if;
  raise notice 'W-17 persistência de segurança aprovada';
end $$;

insert into public.channel_security_retention_policies(
  organization_id,data_class,retention_days,legal_hold,updated_by
) values
  ('11111111-1111-1111-1111-111111111111','EPHEMERAL',7,false,'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('11111111-1111-1111-1111-111111111111','OPERATIONAL',365,false,'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('11111111-1111-1111-1111-111111111111','AUDIT',1825,true,'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

do $$ begin
  if (select retention_days from public.channel_security_retention_policies where organization_id='11111111-1111-1111-1111-111111111111' and data_class='EPHEMERAL') <> 7 then
    raise exception 'W-17 política de retenção inválida';
  end if;
  raise notice 'W-17 retenção e legal hold aprovados';
end $$;

do $$ declare item public.channel_sensitive_access_audit; begin
  item := public.record_channel_sensitive_access(
    '11111111-1111-1111-1111-111111111111','SESSION_CREDENTIAL',repeat('a',32),'READ',
    'Investigação autorizada','correlation-security-0001'
  );
  if item.actor_id is null or item.action <> 'READ' then raise exception 'W-17 auditoria sensível incompleta'; end if;
  raise notice 'W-17 auditoria de acesso sensível aprovada';
end $$;

do $$ begin
  begin
    perform public.record_channel_sensitive_access(
      '11111111-1111-1111-1111-111111111111','SESSION_CREDENTIAL','not-a-hash','READ',
      'Investigação autorizada','correlation-security-0002'
    );
    raise exception 'W-17 fingerprint inválido aceito';
  exception when check_violation then null;
  end;
  raise notice 'W-17 fingerprint sem segredo aprovado';
end $$;

do $$ declare item public.channel_security_incidents; begin
  item := public.create_channel_security_incident(
    '11111111-1111-1111-1111-111111111111','SESSION_COMPROMISE','CRITICAL',
    '{"signal":"unexpected_key_rotation","correlationId":"incident-1"}'::jsonb,true
  );
  if not item.kill_switch_activated or item.status <> 'OPEN' then raise exception 'W-17 incidente inválido'; end if;
  raise notice 'W-17 resposta a comprometimento registrada aprovada';
end $$;

do $$ begin
  begin
    perform public.create_channel_security_incident(
      '11111111-1111-1111-1111-111111111111','CREDENTIAL_EXPOSURE','HIGH',
      '{"token":"secret-value"}'::jsonb,true
    );
    raise exception 'W-17 segredo em evidência aceito';
  exception when check_violation then null;
  end;
  raise notice 'W-17 redação de evidência sensível aprovada';
end $$;

do $$ declare item public.channel_critical_write_approvals; begin
  item := public.approve_channel_critical_write(
    '11111111-1111-1111-1111-111111111111','DELETE_SESSION',repeat('b',64),
    'Sessão comprometida confirmada',15
  );
  if item.consumed_at is not null then raise exception 'W-17 aprovação já consumida'; end if;
  if not public.consume_channel_critical_write_approval(
    '11111111-1111-1111-1111-111111111111','DELETE_SESSION',repeat('b',64)
  ) then raise exception 'W-17 aprovação válida não consumida'; end if;
  if public.consume_channel_critical_write_approval(
    '11111111-1111-1111-1111-111111111111','DELETE_SESSION',repeat('b',64)
  ) then raise exception 'W-17 aprovação reutilizada'; end if;
  raise notice 'W-17 aprovação crítica de uso único aprovada';
end $$;

do $$ declare audit_id uuid; begin
  select id into audit_id from public.channel_sensitive_access_audit limit 1;
  begin
    update public.channel_sensitive_access_audit set reason='alterado' where id=audit_id;
    raise exception 'W-17 auditoria mutável';
  exception when others then
    if sqlerrm not like '%SECURITY_EVENT_IMMUTABLE%' then raise; end if;
  end;
  raise notice 'W-17 eventos de segurança imutáveis aprovados';
end $$;

do $$ begin
  select set_config('test.organization_id','22222222-2222-2222-2222-222222222222',true);
  if exists (
    select 1 from public.channel_sensitive_access_audit
    where organization_id='11111111-1111-1111-1111-111111111111'
  ) then raise exception 'W-17 leitura cross tenant permitida'; end if;
  perform set_config('test.organization_id','11111111-1111-1111-1111-111111111111',true);
  raise notice 'W-17 isolamento multiempresa aprovado';
end $$;

do $$ declare forced_count integer; begin
  select count(*) into forced_count from pg_class
  where oid in (
    'public.channel_security_retention_policies'::regclass,
    'public.channel_sensitive_access_audit'::regclass,
    'public.channel_security_incidents'::regclass,
    'public.channel_critical_write_approvals'::regclass
  ) and relrowsecurity and relforcerowsecurity;
  if forced_count <> 4 then raise exception 'W-17 RLS não forçada'; end if;
  if has_table_privilege('authenticated','public.channel_security_incidents','INSERT') then
    raise exception 'W-17 escrita direta permitida';
  end if;
  raise notice 'W-17 RLS e privilégio mínimo aprovados';
end $$;

\echo 'Testes PostgreSQL W-17 aprovados: 10 controles.'
