-- Testes de comportamento do catálogo do Object Runtime.
-- Roda contra um PostgreSQL com a fixture e as duas migrations aplicadas.
-- Cada teste falha fechado: `raise exception` interrompe e o script sai != 0.

\set ON_ERROR_STOP on

do $$
declare
  v_org uuid;
  v_user uuid;
  v_definition uuid;
  v_spec jsonb;
  v_outra_spec jsonb;
  v_result jsonb;
  v_slots text;
  v_raised boolean;
  v_count integer;
begin
  insert into auth.users(email) values ('teste@innovar.local') returning id into v_user;
  insert into public.organizations(name) values ('Empresa de teste') returning id into v_org;
  perform set_config('test.user_id', v_user::text, false);
  perform set_config('test.permission_granted', 'true', false);

  insert into public.object_definitions(organization_id, key, name, class, module_key, scope)
  values (v_org, 'checklist_campo', 'Checklist de campo', 'cadastro', 'qualidade', 'projeto')
  returning id into v_definition;

  v_spec := jsonb_build_object(
    'key', 'checklist_campo',
    'name', 'Checklist de campo',
    'class', 'cadastro',
    'moduleKey', 'qualidade',
    'scope', 'projeto',
    'traits', jsonb_build_array('auditavel', 'arquivavel'),
    'fields', jsonb_build_array(
      jsonb_build_object('key', 'titulo', 'label', 'Título', 'type', 'texto', 'indexed', true),
      jsonb_build_object('key', 'valor', 'label', 'Valor', 'type', 'moeda', 'indexed', true),
      jsonb_build_object('key', 'observacao', 'label', 'Observação', 'type', 'texto_longo')
    )
  );

  ---------------------------------------------------------------- publicar ---
  v_result := public.publish_object_definition(v_definition, v_spec);

  if (v_result ->> 'version')::integer <> 1 then
    raise exception 'TESTE 1 falhou: a primeira publicação deveria ser a versão 1, veio %', v_result;
  end if;
  if (v_result ->> 'created')::boolean is not true then
    raise exception 'TESTE 1 falhou: a primeira publicação deveria criar versão.';
  end if;
  if (v_result ->> 'checksum') !~ '^[0-9a-f]{64}$' then
    raise exception 'TESTE 1 falhou: checksum não é sha256 hexadecimal: %', v_result ->> 'checksum';
  end if;

  select status, current_version into strict v_slots, v_count
  from public.object_definitions where id = v_definition;
  if v_slots <> 'publicado' or v_count <> 1 then
    raise exception 'TESTE 2 falhou: a definição não passou para publicado na versão 1 (% / %).', v_slots, v_count;
  end if;

  ------------------------------------------------------- projeção de slots ---
  select string_agg(field_key || '=' || slot_column, ',' order by field_key)
    into v_slots
  from public.object_field_slots where definition_id = v_definition and version = 1;
  if v_slots is distinct from 'titulo=txt_1,valor=num_1' then
    raise exception 'TESTE 3 falhou: projeção de slots inesperada: %', coalesce(v_slots, '(vazia)');
  end if;

  select count(*) into v_count
  from public.object_field_slots
  where definition_id = v_definition and field_key = 'observacao';
  if v_count <> 0 then
    raise exception 'TESTE 4 falhou: campo não filtrável consumiu slot.';
  end if;

  -------------------------------------------------------------- republicar ---
  v_result := public.publish_object_definition(v_definition, v_spec);
  if (v_result ->> 'version')::integer <> 1 or (v_result ->> 'created')::boolean is not false then
    raise exception 'TESTE 5 falhou: republicar a mesma especificação criou versão nova: %', v_result;
  end if;
  select count(*) into v_count from public.object_definition_versions where definition_id = v_definition;
  if v_count <> 1 then
    raise exception 'TESTE 5 falhou: existem % versões após republicar a mesma especificação.', v_count;
  end if;

  ------------------------------------------------- publicar versão diferente ---
  v_outra_spec := jsonb_set(v_spec, '{name}', '"Checklist de campo revisado"');
  v_result := public.publish_object_definition(v_definition, v_outra_spec);
  if (v_result ->> 'version')::integer <> 2 or (v_result ->> 'created')::boolean is not true then
    raise exception 'TESTE 6 falhou: especificação diferente deveria criar a versão 2: %', v_result;
  end if;
  select count(*) into v_count from public.object_field_slots where definition_id = v_definition;
  if v_count <> 4 then
    raise exception 'TESTE 6 falhou: a versão 2 não projetou os próprios slots (% linhas).', v_count;
  end if;

  --------------------------------------------- versão publicada é imutável ---
  v_raised := false;
  begin
    update public.object_definition_versions set spec = '{}'::jsonb where definition_id = v_definition and version = 1;
  exception when others then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'TESTE 7 falhou: foi possível alterar uma versão publicada.';
  end if;

  v_raised := false;
  begin
    delete from public.object_definition_versions where definition_id = v_definition and version = 1;
  exception when others then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'TESTE 8 falhou: foi possível apagar uma versão publicada.';
  end if;

  ------------------------------------------------------ estouro de slots ---
  v_raised := false;
  begin
    perform public.publish_object_definition(v_definition, jsonb_set(v_spec, '{fields}', jsonb_build_array(
      jsonb_build_object('key', 'd1', 'label', 'd1', 'type', 'data', 'indexed', true),
      jsonb_build_object('key', 'd2', 'label', 'd2', 'type', 'data_hora', 'indexed', true),
      jsonb_build_object('key', 'd3', 'label', 'd3', 'type', 'data', 'indexed', true)
    )));
  exception when others then
    v_raised := true;
    if position('"d3"' in sqlerrm) = 0 then
      raise exception 'TESTE 9 falhou: o estouro não nomeou o campo que não coube: %', sqlerrm;
    end if;
  end;
  if not v_raised then
    raise exception 'TESTE 9 falhou: o estouro do orçamento de slots não falhou fechado.';
  end if;

  --------------------------------------------------- definição incoerente ---
  v_raised := false;
  begin
    perform public.publish_object_definition(v_definition, jsonb_set(v_spec, '{fields}', jsonb_build_array(
      jsonb_build_object('key', 'titulo', 'label', 'a', 'type', 'texto'),
      jsonb_build_object('key', 'titulo', 'label', 'b', 'type', 'texto')
    )));
  exception when others then v_raised := true;
  end;
  if not v_raised then
    raise exception 'TESTE 10 falhou: chave de campo duplicada foi publicada.';
  end if;

  v_raised := false;
  begin
    perform public.publish_object_definition(v_definition, jsonb_set(v_spec, '{fields}', jsonb_build_array(
      jsonb_build_object('key', 'x', 'label', 'x', 'type', 'inventado')
    )));
  exception when others then v_raised := true;
  end;
  if not v_raised then
    raise exception 'TESTE 11 falhou: tipo de campo desconhecido foi publicado.';
  end if;

  v_raised := false;
  begin
    perform public.publish_object_definition(v_definition, jsonb_set(v_spec, '{fields}', '[]'::jsonb));
  exception when others then v_raised := true;
  end;
  if not v_raised then
    raise exception 'TESTE 12 falhou: definição sem campo foi publicada.';
  end if;

  ------------------------------------------------------ permissão recusada ---
  perform set_config('test.permission_granted', 'false', false);
  v_raised := false;
  begin
    perform public.publish_object_definition(v_definition, jsonb_set(v_spec, '{name}', '"Sem permissão"'));
  exception when others then
    v_raised := true;
    if position('Permissão insuficiente' in sqlerrm) = 0 then
      raise exception 'TESTE 13 falhou: recusa por outro motivo que não permissão: %', sqlerrm;
    end if;
  end;
  if not v_raised then
    raise exception 'TESTE 13 falhou: publicou sem permissão de administração.';
  end if;
  perform set_config('test.permission_granted', 'true', false);

  --------------------------------------------------- definição inexistente ---
  v_raised := false;
  begin
    perform public.publish_object_definition('00000000-0000-0000-0000-000000000000'::uuid, v_spec);
  exception when others then v_raised := true;
  end;
  if not v_raised then
    raise exception 'TESTE 14 falhou: publicou definição inexistente.';
  end if;

  raise notice 'Object Runtime — catálogo: 14 testes de comportamento aprovados.';
end;
$$;

-- Escrita direta por papel de cliente ----------------------------------------
-- Fora do bloco anterior porque troca de papel não pode acontecer dentro de
-- uma função. `set role` vale até o fim da transação do script.

do $$
declare
  v_org uuid;
  v_raised boolean := false;
begin
  select id into v_org from public.organizations limit 1;
  begin
    set local role authenticated;
    insert into public.object_definitions(organization_id, key, name, class, module_key)
    values (v_org, 'direto', 'Direto', 'cadastro', 'qualidade');
  exception when insufficient_privilege then
    v_raised := true;
  end;
  reset role;
  if not v_raised then
    raise exception 'TESTE 15 falhou: authenticated escreveu direto em object_definitions.';
  end if;
  raise notice 'Object Runtime — privilégio: escrita direta por authenticated recusada.';
end;
$$;
