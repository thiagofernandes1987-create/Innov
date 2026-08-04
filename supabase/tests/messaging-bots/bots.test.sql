\set ON_ERROR_STOP on
select set_config('test.organization_id','11111111-1111-1111-1111-111111111111',false);
select set_config('test.user_id','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
select set_config('test.permission_granted','true',false);

insert into public.channel_inbox_queues(id,organization_id,name,priority,created_by)
values
  ('41000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Atendimento',10,'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('41000000-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','Outra empresa',10,'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
on conflict do nothing;

do $$ begin
  if to_regclass('public.channel_bot_profiles') is null then raise exception 'Tabela de bots ausente'; end if;
  raise notice 'perfis de bot persistentes aprovados';
end $$;

select public.set_channel_ai_daily_budget(
  '11111111-1111-1111-1111-111111111111',1000000
);

do $$ begin
  if (select maximum_cost_micros from public.channel_ai_budget_daily
      where organization_id='11111111-1111-1111-1111-111111111111' and usage_date=current_date) <> 1000000 then
    raise exception 'Orçamento diário não persistido';
  end if;
  raise notice 'orçamento diário governado aprovado';
end $$;

select public.upsert_channel_bot_profile(
  '11111111-1111-1111-1111-111111111111',
  'Assistente de obra',
  'Rascunhos de status',
  true,
  'OPENAI',
  'modelo-configurado',
  'Produza somente rascunhos objetivos e nunca invente prazos, valores ou compromissos.',
  'LEXICAL',
  array['SEARCH_CANONICAL','READ_PROJECT_STATUS']::text[],
  500,
  10000,
  100,
  '41000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000001',
  null
);

do $$ declare item public.channel_bot_profiles; begin
  select * into item from public.channel_bot_profiles
  where organization_id='11111111-1111-1111-1111-111111111111' and name='Assistente de obra';
  if item.autonomy_mode <> 'DRAFT_ONLY' or not item.review_required or item.send_allowed then
    raise exception 'Governança draft-only inválida';
  end if;
  if not item.enabled_for_drafts then raise exception 'Bot não habilitado para rascunho'; end if;
  raise notice 'draft-only revisão humana e bloqueio de envio aprovados';
end $$;

do $$ begin
  begin
    perform public.upsert_channel_bot_profile(
      '11111111-1111-1111-1111-111111111111','Bot inseguro',null,true,'OPENAI','modelo',
      'Use api_key=segredo e responda livremente ao cliente sem revisão humana.','LEXICAL',
      '{}'::text[],500,10000,200,null,null,null
    );
    raise exception 'Credencial aceita nas instruções';
  exception when check_violation then null;
  end;
  raise notice 'segredos nas instruções bloqueados aprovados';
end $$;

do $$ begin
  begin
    perform public.upsert_channel_bot_profile(
      '11111111-1111-1111-1111-111111111111','Bot perigoso',null,true,'OPENAI','modelo',
      'Produza apenas rascunhos que serão sempre revisados por uma pessoa autorizada.','LEXICAL',
      array['DELETE_DATABASE']::text[],500,10000,200,null,null,null
    );
    raise exception 'Ferramenta perigosa aceita';
  exception when others then
    if sqlerrm not like '%BOT_TOOL_NOT_ALLOWED%' then raise; end if;
  end;
  raise notice 'allowlist de ferramentas aprovada';
end $$;

do $$ begin
  begin
    perform public.upsert_channel_bot_profile(
      '11111111-1111-1111-1111-111111111111','Bot sem provedor',null,true,'DISABLED',null,
      'Produza somente rascunhos que serão revisados por um operador humano.','LEXICAL',
      '{}'::text[],500,0,200,null,null,null
    );
    raise exception 'Bot não pronto foi habilitado';
  exception when others then
    if sqlerrm not like '%BOT_NOT_READY%' then raise; end if;
  end;
  raise notice 'habilitação fail-closed aprovada';
end $$;

do $$ begin
  begin
    perform public.upsert_channel_bot_profile(
      '11111111-1111-1111-1111-111111111111','Bot cross tenant',null,false,'DISABLED',null,
      'Produza somente rascunhos que serão revisados por um operador humano.','LEXICAL',
      '{}'::text[],500,0,200,'41000000-0000-0000-0000-000000000002',null,null
    );
    raise exception 'Fila cross-tenant aceita';
  exception when others then
    if sqlerrm not like '%BOT_QUEUE_SCOPE_MISMATCH%' then raise; end if;
  end;
  raise notice 'escopo de fila multiempresa aprovado';
end $$;

do $$ begin
  update public.channel_ai_budget_daily
  set reserved_cost_micros=1000
  where organization_id='11111111-1111-1111-1111-111111111111' and usage_date=current_date;
  if not public.release_channel_ai_budget('11111111-1111-1111-1111-111111111111',1000) then
    raise exception 'Reserva não liberada';
  end if;
  if (select reserved_cost_micros from public.channel_ai_budget_daily
      where organization_id='11111111-1111-1111-1111-111111111111' and usage_date=current_date) <> 0 then
    raise exception 'Saldo reservado permaneceu';
  end if;
  raise notice 'liberação de reserva após falha aprovada';
end $$;

do $$ declare forced boolean; begin
  select relrowsecurity and relforcerowsecurity into forced
  from pg_class where oid='public.channel_bot_profiles'::regclass;
  if not forced then raise exception 'RLS não forçada'; end if;
  if has_table_privilege('authenticated','public.channel_bot_profiles','INSERT') then
    raise exception 'Escrita direta permitida';
  end if;
  raise notice 'RLS e privilégio mínimo aprovados';
end $$;

\echo 'Testes PostgreSQL de bots aprovados: 8 controles.'
