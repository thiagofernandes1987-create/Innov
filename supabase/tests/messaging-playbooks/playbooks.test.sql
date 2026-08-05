-- Sprint W-14 — playbooks, fontes canônicas e histórico reproduzível.

select set_config('test.organization_id','11111111-1111-1111-1111-111111111111',false);
select set_config('test.user_id','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
select set_config('test.permission_granted','true',false);

insert into public.whatsapp_content_bindings(
  id,organization_id,name,source_type,source_id,source_field,variables_schema,active
) values
  ('31000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',
   'Contrato aprovado','CONTRACT_VERSION','51000000-0000-0000-0000-000000000001','RENDERED_BODY','{}',true),
  ('32000000-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222',
   'Fonte outra empresa','PROJECT_DOCUMENT_VERSION','52000000-0000-0000-0000-000000000002','DOCUMENT','{}',true);

insert into public.communication_playbooks(
  id,organization_id,playbook_key,name,description,created_by
) values
  ('41000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',
   'contrato.envio','Envio contratual','Usa versão canônica aprovada','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('42000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111',
   'rotina.aviso','Aviso de rotina','Comunicação operacional de baixo risco','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('43000000-0000-0000-0000-000000000003','22222222-2222-2222-2222-222222222222',
   'outra.empresa','Playbook externo','Isolamento multiempresa','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

select public.create_communication_playbook_version(
  '41000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000001',
  '{"cliente_nome":{"type":"string","required":true},"obra_codigo":{"type":"string","required":true}}',
  'AUTO_LOW_RISK','CONTRACTUAL','Versão contratual inicial'
);
select public.create_communication_playbook_version(
  '42000000-0000-0000-0000-000000000002',
  '31000000-0000-0000-0000-000000000001',
  '{"cliente_nome":{"type":"string","required":true}}',
  'AUTO_LOW_RISK','ROUTINE','Versão operacional inicial'
);

do $$
begin
  if not exists(
    select 1 from public.communication_playbook_versions version
    where version.playbook_id='41000000-0000-0000-0000-000000000001'
      and version.binding_id='31000000-0000-0000-0000-000000000001'
  ) then raise exception 'binding canônico não reutilizado'; end if;
  if exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='communication_playbook_versions'
      and column_name in ('body','message_body','template_text','free_text')
  ) then raise exception 'mensagem padrão duplicada'; end if;
  raise notice 'W-14 binding canônico sem duplicação aprovado';
end;
$$;

do $$
begin
  if not exists(
    select 1 from public.communication_playbook_versions
    where playbook_id='41000000-0000-0000-0000-000000000001' and version_number=1
  ) then raise exception 'versão 1 ausente'; end if;
  raise notice 'W-14 versionamento inicial aprovado';
end;
$$;

do $$
declare version_id uuid;
begin
  select id into version_id from public.communication_playbook_versions
  where playbook_id='42000000-0000-0000-0000-000000000002' and version_number=1;
  begin
    perform public.register_communication_playbook_execution(
      version_id,'12000000-0000-0000-0000-000000000001','{}',
      jsonb_build_object('sourceType','CONTRACT_VERSION','sourceId','51000000-0000-0000-0000-000000000001',
        'sourceField','RENDERED_BODY','sourceVersion',1,'sourceName','Contrato','sha256',repeat('a',64)),
      jsonb_build_object('kind','TEXT','body','Conteúdo canônico'),repeat('b',64)
    );
    raise exception 'variável obrigatória aceita';
  exception when others then
    if sqlerrm not like 'REQUIRED_PLAYBOOK_VARIABLE:%' then raise; end if;
  end;
  raise notice 'W-14 validação de variáveis aprovada';
end;
$$;

do $$
begin
  if not exists(
    select 1 from public.communication_playbook_versions
    where playbook_id='41000000-0000-0000-0000-000000000001'
      and autonomy='HUMAN_ONLY' and sensitivity='CONTRACTUAL'
      and content_mode='CANONICAL_ONLY' and approval_required
  ) then raise exception 'política contratual incorreta'; end if;
  raise notice 'W-14 autonomia contratual restrita aprovada';
end;
$$;

do $$
declare version_id uuid;
begin
  select id into version_id from public.communication_playbook_versions
  where playbook_id='41000000-0000-0000-0000-000000000001' and version_number=1;
  begin
    perform public.register_communication_playbook_execution(
      version_id,'12000000-0000-0000-0000-000000000001',
      '{"cliente_nome":"Marcos","obra_codigo":"OB-0026"}',
      jsonb_build_object('sourceType','CONTRACT_VERSION','sourceId','51000000-0000-0000-0000-000000000001',
        'sourceField','RENDERED_BODY','sourceVersion',1,'sourceName','Contrato','sha256',repeat('a',64)),
      jsonb_build_object('kind','TEXT','body','Conteúdo canônico V1'),repeat('b',64)
    );
    raise exception 'execução sensível sem aprovação aceita';
  exception when others then
    if sqlerrm<>'PLAYBOOK_APPROVAL_REQUIRED' then raise; end if;
  end;
  raise notice 'W-14 aprovação humana obrigatória aprovada';
end;
$$;

do $$
declare version_id uuid;
declare execution_id uuid;
begin
  select id into version_id from public.communication_playbook_versions
  where playbook_id='41000000-0000-0000-0000-000000000001' and version_number=1;
  perform public.decide_communication_playbook_version(version_id,'APPROVED','Revisão humana contratual concluída');
  select id into execution_id from public.register_communication_playbook_execution(
    version_id,'12000000-0000-0000-0000-000000000001',
    '{"cliente_nome":"Marcos","obra_codigo":"OB-0026"}',
    jsonb_build_object('sourceType','CONTRACT_VERSION','sourceId','51000000-0000-0000-0000-000000000001',
      'sourceField','RENDERED_BODY','sourceVersion',1,'sourceName','Contrato','sha256',repeat('a',64)),
    jsonb_build_object('kind','TEXT','body','Conteúdo canônico V1'),repeat('b',64)
  );
  if execution_id is null then raise exception 'execução aprovada não registrada'; end if;
  raise notice 'W-14 execução após aprovação aprovada';
end;
$$;

do $$
begin
  if not exists(
    select 1 from public.communication_playbook_executions execution
    where execution.version_number_snapshot=1
      and execution.binding_id_snapshot='31000000-0000-0000-0000-000000000001'
      and execution.content_sha256=repeat('b',64)
      and execution.source_snapshot->>'sha256'=repeat('a',64)
  ) then raise exception 'snapshot ou SHA ausente'; end if;
  raise notice 'W-14 snapshot versão e SHA aprovado';
end;
$$;

do $$
declare version_id uuid;
begin
  select id into version_id from public.communication_playbook_versions
  where playbook_id='41000000-0000-0000-0000-000000000001' and version_number=1;
  begin
    update public.communication_playbook_versions set change_note='Tentativa de mutação histórica' where id=version_id;
    raise exception 'versão histórica mutável';
  exception when others then
    if sqlerrm<>'IMMUTABLE_PLAYBOOK_HISTORY' then raise; end if;
  end;
  raise notice 'W-14 imutabilidade de versão aprovada';
end;
$$;

select public.create_communication_playbook_version(
  '41000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000001',
  '{"cliente_nome":{"type":"string","required":true},"obra_codigo":{"type":"string","required":true},"validade":{"type":"string","required":false}}',
  'HUMAN_ONLY','CONTRACTUAL','Nova versão sem alterar histórico'
);

do $$
begin
  if (select count(*) from public.communication_playbook_versions
      where playbook_id='41000000-0000-0000-0000-000000000001')<>2 then
    raise exception 'nova versão não criada';
  end if;
  if not exists(
    select 1 from public.communication_playbook_executions
    where version_number_snapshot=1 and resolved_snapshot->>'body'='Conteúdo canônico V1'
  ) then raise exception 'histórico V1 alterado'; end if;
  raise notice 'W-14 atualização sem alterar histórico aprovada';
end;
$$;

do $$
declare execution_id uuid;
declare snapshot jsonb;
begin
  select id,resolved_snapshot into execution_id,snapshot
  from public.communication_playbook_executions order by executed_at limit 1;
  if execution_id is null or snapshot->>'body'<>'Conteúdo canônico V1' then
    raise exception 'reprodução histórica falhou';
  end if;
  begin
    update public.communication_playbook_executions set resolved_snapshot='{}' where id=execution_id;
    raise exception 'execução histórica mutável';
  exception when others then
    if sqlerrm<>'IMMUTABLE_PLAYBOOK_HISTORY' then raise; end if;
  end;
  raise notice 'W-14 reprodução histórica aprovada';
end;
$$;

do $$
declare routine_version uuid;
begin
  select id into routine_version from public.communication_playbook_versions
  where playbook_id='42000000-0000-0000-0000-000000000002' and version_number=1;
  begin
    perform public.register_communication_playbook_execution(
      routine_version,'23000000-0000-0000-0000-000000000002','{"cliente_nome":"Marcos"}',
      jsonb_build_object('sourceType','CONTRACT_VERSION','sourceId','51000000-0000-0000-0000-000000000001',
        'sourceField','RENDERED_BODY','sourceVersion',1,'sourceName','Contrato','sha256',repeat('a',64)),
      jsonb_build_object('kind','TEXT','body','Conteúdo'),repeat('c',64)
    );
    raise exception 'execução cross-tenant aceita';
  exception when others then
    if sqlerrm<>'PLAYBOOK_EXECUTION_SCOPE_MISMATCH' then raise; end if;
  end;
  begin
    perform public.create_communication_playbook_version(
      '41000000-0000-0000-0000-000000000001','32000000-0000-0000-0000-000000000002',
      '{}','HUMAN_ONLY','CONTRACTUAL','Tentativa com fonte externa'
    );
    raise exception 'binding cross-tenant aceito';
  exception when others then
    if sqlerrm<>'BINDING_SCOPE_MISMATCH' then raise; end if;
  end;
  raise notice 'W-14 isolamento multiempresa aprovado';
end;
$$;

do $$
declare relation text;
begin
  foreach relation in array array[
    'communication_playbooks','communication_playbook_versions',
    'communication_playbook_version_approvals','communication_playbook_executions'
  ] loop
    if not exists(
      select 1 from pg_class where oid=('public.'||relation)::regclass and relrowsecurity and relforcerowsecurity
    ) then raise exception 'RLS ausente em %',relation; end if;
    if has_table_privilege('authenticated','public.'||relation,'INSERT')
       or has_table_privilege('authenticated','public.'||relation,'UPDATE')
       or has_table_privilege('authenticated','public.'||relation,'DELETE') then
      raise exception 'escrita direta concedida em %',relation;
    end if;
  end loop;
  raise notice 'W-14 RLS e privilégio mínimo aprovados';
end;
$$;
