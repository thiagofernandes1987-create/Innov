-- Testes de comportamento do rascunho de definição do Object Runtime.
-- Roda contra um PostgreSQL com a fixture e as migrations aplicadas.
-- Cada teste falha fechado: `raise exception` interrompe e o script sai != 0.

\set ON_ERROR_STOP on

do $$
declare
  v_org uuid;
  v_outra_org uuid;
  v_user uuid;
  v_definition uuid;
  v_spec jsonb;
  v_result jsonb;
  v_status text;
  v_draft jsonb;
  v_raised boolean;
begin
  insert into auth.users(email) values ('rascunho@innovar.local') returning id into v_user;
  insert into public.organizations(name) values ('Empresa do rascunho') returning id into v_org;
  insert into public.organizations(name) values ('Outra empresa') returning id into v_outra_org;
  perform set_config('test.user_id', v_user::text, false);
  perform set_config('test.permission_granted', 'true', false);

  ------------------------------------------------------------------ criar ---
  v_definition := public.create_object_definition(
    v_org, 'vistoria_de_entrega', 'Vistoria de entrega', 'cadastro', 'qualidade', 'projeto'
  );

  select status, draft_spec into v_status, v_draft
  from public.object_definitions where id = v_definition;

  if v_status <> 'rascunho' then
    raise exception 'Objeto criado deveria nascer em rascunho, veio "%".', v_status;
  end if;
  if v_draft ->> 'key' <> 'vistoria_de_entrega' or v_draft ->> 'moduleKey' <> 'qualidade' then
    raise exception 'O rascunho não nasceu semeado com a identificação do objeto: %', v_draft;
  end if;
  if jsonb_array_length(v_draft -> 'fields') <> 0 then
    raise exception 'O rascunho deveria nascer sem campos.';
  end if;

  ------------------------------------------------------------ chave repetida ---
  -- Mensagem que orienta, não violação de unicidade crua.
  v_raised := false;
  begin
    perform public.create_object_definition(
      v_org, 'vistoria_de_entrega', 'Outra vistoria', 'cadastro', 'qualidade', 'projeto'
    );
  exception when others then
    v_raised := true;
    if sqlerrm not like '%Já existe um objeto com a chave%' then
      raise exception 'Chave repetida recusada com a mensagem errada: %', sqlerrm;
    end if;
  end;
  if not v_raised then
    raise exception 'Chave repetida na mesma empresa deveria ser recusada.';
  end if;

  -- A mesma chave em outra empresa é outro objeto, e é legítima.
  perform public.create_object_definition(
    v_outra_org, 'vistoria_de_entrega', 'Vistoria de entrega', 'cadastro', 'qualidade', 'projeto'
  );

  ------------------------------------------------------------ chave inválida ---
  v_raised := false;
  begin
    perform public.create_object_definition(v_org, 'Vistoria Nova', 'Vistoria', 'cadastro', 'qualidade', 'projeto');
  exception when others then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'Chave fora do identificador deveria ser recusada.';
  end if;

  --------------------------------------------------------------- permissão ---
  perform set_config('test.permission_granted', 'false', false);
  v_raised := false;
  begin
    perform public.create_object_definition(v_org, 'sem_permissao', 'Sem permissão', 'cadastro', 'qualidade', 'organizacao');
  exception when others then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'Criar objeto sem permissão de administração deveria ser recusado.';
  end if;

  v_raised := false;
  begin
    perform public.save_object_definition_draft(v_definition, '{"fields":[]}'::jsonb);
  exception when others then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'Editar rascunho sem permissão de administração deveria ser recusado.';
  end if;
  perform set_config('test.permission_granted', 'true', false);

  ------------------------------------------------------------ guardar rascunho ---
  v_spec := jsonb_build_object(
    'key', 'vistoria_de_entrega',
    'name', 'Vistoria de entrega do apartamento',
    'class', 'cadastro',
    'moduleKey', 'qualidade',
    'scope', 'projeto',
    'traits', '[]'::jsonb,
    'fields', jsonb_build_array(
      jsonb_build_object('key', 'responsavel', 'label', 'Responsável', 'type', 'usuario', 'indexed', true),
      jsonb_build_object('key', 'data_da_vistoria', 'label', 'Data da vistoria', 'type', 'data', 'indexed', true)
    )
  );
  v_result := public.save_object_definition_draft(v_definition, v_spec);
  if (v_result ->> 'fields')::integer <> 2 then
    raise exception 'O rascunho guardado deveria ter 2 campos, veio %.', v_result ->> 'fields';
  end if;

  -- O nome do rascunho passa a valer no cabeçalho da listagem: nome que só
  -- muda ao publicar faria a lista mostrar um objeto que não existe mais.
  select name into v_status from public.object_definitions where id = v_definition;
  if v_status <> 'Vistoria de entrega do apartamento' then
    raise exception 'O nome deveria acompanhar o rascunho, veio "%".', v_status;
  end if;

  ------------------------------------------------------- rascunho não é objeto ---
  v_raised := false;
  begin
    perform public.save_object_definition_draft(v_definition, '"texto"'::jsonb);
  exception when others then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'Rascunho que não é objeto JSON deveria ser recusado.';
  end if;

  ------------------------------------------------------------------ publicar ---
  v_result := public.publish_object_definition(v_definition, v_spec);
  if (v_result ->> 'version')::integer <> 1 then
    raise exception 'A primeira publicação deveria ser a versão 1.';
  end if;

  -- Publicado continua editável — é assim que nasce a versão 2. O que não se
  -- edita é a versão congelada.
  perform public.save_object_definition_draft(
    v_definition, jsonb_set(v_spec, '{name}', '"Vistoria de entrega revisada"')
  );

  ------------------------------------------------- chave de publicado não muda ---
  v_raised := false;
  begin
    perform public.save_object_definition_draft(v_definition, jsonb_set(v_spec, '{key}', '"outra_chave"'));
  exception when others then
    v_raised := true;
    if sqlerrm not like '%não muda%' then
      raise exception 'Troca de chave recusada com a mensagem errada: %', sqlerrm;
    end if;
  end;
  if not v_raised then
    raise exception 'Trocar a chave de um objeto já publicado deveria ser recusado.';
  end if;

  --------------------------------------------------------------- arquivado ---
  update public.object_definitions set status = 'arquivado' where id = v_definition;
  v_raised := false;
  begin
    perform public.save_object_definition_draft(v_definition, v_spec);
  exception when others then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'Objeto arquivado não deveria aceitar edição.';
  end if;

  ----------------------------------------------------------- inexistente ---
  v_raised := false;
  begin
    perform public.save_object_definition_draft(gen_random_uuid(), v_spec);
  exception when others then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'Definição inexistente deveria ser recusada.';
  end if;

  raise notice 'Object Runtime — rascunho: 12 testes de comportamento aprovados.';
end;
$$;
