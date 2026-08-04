\set ON_ERROR_STOP on
select set_config('test.organization_id','11111111-1111-1111-1111-111111111111',false);
select set_config('test.user_id','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
select set_config('test.permission_granted','true',false);

do $$ begin
  if to_regclass('public.channel_message_plugin_policies') is null
    or to_regclass('public.channel_message_plugin_decisions') is null then
    raise exception 'W-16 tabelas ausentes';
  end if;
  raise notice 'W-16 persistência de plugins aprovada';
end $$;

select public.set_channel_message_plugin_policy(
  '11111111-1111-1111-1111-111111111111','CONSENT',true,10,null,null,'{}'::jsonb
);
select public.set_channel_message_plugin_policy(
  '11111111-1111-1111-1111-111111111111','ANTI_SPAM',true,20,null,'MESSAGING_ANTI_SPAM','{"maximumRecentInbound":12}'::jsonb
);
select public.set_channel_message_plugin_policy(
  '11111111-1111-1111-1111-111111111111','QUALIFICATION',true,30,'messaging.qualification','MESSAGING_QUALIFICATION','{}'::jsonb
);
select public.set_channel_message_plugin_policy(
  '11111111-1111-1111-1111-111111111111','AI_FALLBACK',true,1000,'messaging.ai.draft','MESSAGING_AI_DRAFT','{"mode":"DRAFT_ONLY"}'::jsonb
);

do $$ begin
  if (select count(*) from public.channel_message_plugin_policies where organization_id='11111111-1111-1111-1111-111111111111') <> 4 then
    raise exception 'W-16 políticas não persistidas';
  end if;
  raise notice 'W-16 prioridade e políticas persistentes aprovadas';
end $$;

do $$ begin
  begin
    perform public.set_channel_message_plugin_policy(
      '11111111-1111-1111-1111-111111111111','CONSENT',false,10,null,null,'{}'::jsonb
    );
    raise exception 'W-16 consentimento desativado';
  exception when others then
    if sqlerrm not like '%CONSENT_PLUGIN_REQUIRED%' then raise; end if;
  end;
  raise notice 'W-16 consentimento obrigatório aprovado';
end $$;

do $$ begin
  begin
    perform public.set_channel_message_plugin_policy(
      '11111111-1111-1111-1111-111111111111','AI_FALLBACK',true,50,'messaging.ai.draft','MESSAGING_AI_DRAFT','{}'::jsonb
    );
    raise exception 'W-16 IA fora da última posição aceita';
  exception when others then
    if sqlerrm not like '%AI_PLUGIN_MUST_BE_LAST_AND_FLAGGED%' then raise; end if;
  end;
  raise notice 'W-16 IA como último recurso aprovada';
end $$;

do $$ begin
  begin
    perform public.set_channel_message_plugin_policy(
      '11111111-1111-1111-1111-111111111111','DOCUMENT',true,20,'documents.read','MESSAGING_DOCUMENTS','{}'::jsonb
    );
    raise exception 'W-16 prioridade duplicada aceita';
  exception when unique_violation then null;
  end;
  raise notice 'W-16 conflito de prioridade bloqueado aprovado';
end $$;

do $$ declare item public.channel_message_plugin_decisions; begin
  item := public.record_channel_message_plugin_decision(
    '11111111-1111-1111-1111-111111111111',
    '12000000-0000-0000-0000-000000000001',
    '13000000-0000-0000-0000-000000000001',
    'QUALIFICATION',30,'RESPOND','QUALIFICATION_INTENT',true,
    '[{"pluginId":"CONSENT","decision":"CONTINUE"},{"pluginId":"QUALIFICATION","decision":"RESPOND"}]'::jsonb
  );
  if not item.requires_human_review or item.decision <> 'RESPOND' then raise exception 'W-16 decisão inválida'; end if;
  raise notice 'W-16 decisão e short-circuit auditados aprovados';
end $$;

do $$ begin
  begin
    perform public.record_channel_message_plugin_decision(
      '11111111-1111-1111-1111-111111111111',
      '12000000-0000-0000-0000-000000000001',null,
      'AI_FALLBACK',1000,'DRAFT','LAST_RESORT',false,'[]'::jsonb
    );
    raise exception 'W-16 draft sem revisão humana aceito';
  exception when check_violation then null;
  end;
  raise notice 'W-16 draft exige revisão humana aprovado';
end $$;

do $$ begin
  begin
    perform public.record_channel_message_plugin_decision(
      '11111111-1111-1111-1111-111111111111',
      '12000000-0000-0000-0000-000000000001',null,
      'ANTI_SPAM',20,'BLOCK','RATE_LIMIT_EXCEEDED',false,'[{"content":"payload bruto"}]'::jsonb
    );
    raise exception 'W-16 payload sensível em trace aceito';
  exception when check_violation then null;
  end;
  raise notice 'W-16 trace minimizado aprovado';
end $$;

do $$ declare decision_id uuid; begin
  select id into decision_id from public.channel_message_plugin_decisions limit 1;
  begin
    delete from public.channel_message_plugin_decisions where id=decision_id;
    raise exception 'W-16 decisão mutável';
  exception when others then
    if sqlerrm not like '%PLUGIN_DECISION_IMMUTABLE%' then raise; end if;
  end;
  raise notice 'W-16 decisão imutável aprovada';
end $$;

do $$ begin
  begin
    perform public.record_channel_message_plugin_decision(
      '22222222-2222-2222-2222-222222222222',
      '12000000-0000-0000-0000-000000000001',null,
      'HANDOFF',70,'HANDOFF','HUMAN_REQUESTED',false,'[]'::jsonb
    );
    raise exception 'W-16 cross tenant aceito';
  exception when others then
    if sqlerrm not like '%PLUGIN_FORBIDDEN%' and sqlerrm not like '%PLUGIN_SCOPE_MISMATCH%' then raise; end if;
  end;
  raise notice 'W-16 isolamento multiempresa aprovado';
end $$;

do $$ declare forced_count integer; begin
  select count(*) into forced_count from pg_class
  where oid in ('public.channel_message_plugin_policies'::regclass,'public.channel_message_plugin_decisions'::regclass)
    and relrowsecurity and relforcerowsecurity;
  if forced_count <> 2 then raise exception 'W-16 RLS não forçada'; end if;
  if has_table_privilege('authenticated','public.channel_message_plugin_decisions','INSERT') then
    raise exception 'W-16 escrita direta permitida';
  end if;
  raise notice 'W-16 RLS e privilégio mínimo aprovados';
end $$;

\echo 'Testes PostgreSQL W-16 aprovados: 10 controles.'
