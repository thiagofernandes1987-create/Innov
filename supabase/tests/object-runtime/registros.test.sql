-- Testes de comportamento da camada de registros do Object Runtime.
-- Cada teste falha fechado: `raise exception` interrompe e o script sai != 0.

\set ON_ERROR_STOP on

do $$
declare
  v_org uuid;
  v_user uuid;
  v_arquiteto uuid;
  v_definition uuid;
  v_spec jsonb;
  v_record uuid;
  v_outro uuid;
  v_raised boolean;
  v_texto text;
  v_num numeric;
  v_ref uuid;
  v_count integer;
  v_versao integer;
begin
  insert into auth.users(email) values ('registro@innovar.local') returning id into v_user;
  insert into auth.users(email) values ('arquiteto@innovar.local') returning id into v_arquiteto;
  insert into public.organizations(name) values ('Empresa dos registros') returning id into v_org;
  perform set_config('test.user_id', v_user::text, false);
  perform set_config('test.permission_granted', 'true', false);

  v_definition := public.create_object_definition(
    v_org, 'vistoria', 'Vistoria', 'cadastro', 'qualidade', 'projeto'
  );

  v_spec := jsonb_build_object(
    'key', 'vistoria', 'name', 'Vistoria', 'class', 'cadastro',
    'moduleKey', 'qualidade', 'scope', 'projeto', 'traits', '[]'::jsonb,
    'fields', jsonb_build_array(
      jsonb_build_object('key', 'titulo', 'label', 'Título', 'type', 'texto', 'indexed', true),
      jsonb_build_object('key', 'area', 'label', 'Área', 'type', 'numero', 'indexed', true),
      jsonb_build_object('key', 'arquiteto', 'label', 'Arquiteto', 'type', 'usuario', 'indexed', true),
      jsonb_build_object('key', 'observacao', 'label', 'Observação', 'type', 'texto_longo')
    )
  );
  perform public.publish_object_definition(v_definition, v_spec);

  ---------------------------------------------------------------- gravar ---
  v_record := public.object_record_upsert(
    v_definition,
    jsonb_build_object('titulo', 'Apto 101', 'area', '58.4', 'arquiteto', v_arquiteto::text,
                       'observacao', 'Trinca no rodapé')
  );

  select txt_1, num_1, ref_1, definition_version
    into v_texto, v_num, v_ref, v_versao
  from public.object_records where id = v_record;

  if v_texto <> 'Apto 101' then
    raise exception 'O slot de texto não foi preenchido: "%".', coalesce(v_texto, '(nulo)');
  end if;
  if v_num <> 58.4 then
    raise exception 'O slot numérico não foi preenchido: %.', coalesce(v_num::text, '(nulo)');
  end if;
  if v_ref is distinct from v_arquiteto then
    raise exception 'O slot de referência não guardou a pessoa apontada.';
  end if;
  if v_versao <> 1 then
    raise exception 'O registro deveria guardar a versão com que nasceu.';
  end if;

  -- Campo não indexável fica só no payload.
  select payload ->> 'observacao' into v_texto from public.object_records where id = v_record;
  if v_texto <> 'Trinca no rodapé' then
    raise exception 'O payload não guardou o campo não indexável.';
  end if;

  ------------------------------------------------------------- seguidor ---
  -- T-32.3.3: o campo de pessoa inscreve quem foi apontado.
  select count(*) into v_count
  from public.object_record_followers
  where record_id = v_record and user_id = v_arquiteto and field_key = 'arquiteto';
  if v_count <> 1 then
    raise exception 'O arquiteto apontado deveria ter virado seguidor, veio % linha(s).', v_count;
  end if;

  -- Gravar de novo não duplica o seguidor.
  perform public.object_record_upsert(
    v_definition, jsonb_build_object('titulo', 'Apto 101', 'area', '58.4', 'arquiteto', v_arquiteto::text),
    v_record
  );
  select count(*) into v_count from public.object_record_followers where record_id = v_record;
  if v_count <> 1 then
    raise exception 'Regravar duplicou o seguidor: % linha(s).', v_count;
  end if;

  -- Pessoa inexistente não vira seguidor, e não derruba a gravação.
  v_outro := public.object_record_upsert(
    v_definition, jsonb_build_object('titulo', 'Apto 102', 'arquiteto', gen_random_uuid()::text)
  );
  select count(*) into v_count from public.object_record_followers where record_id = v_outro;
  if v_count <> 0 then
    raise exception 'Uuid que não é usuário não deveria virar seguidor.';
  end if;

  ----------------------------------------------------------- atualizar ---
  perform public.object_record_upsert(
    v_definition, jsonb_build_object('titulo', 'Apto 101 revisado', 'area', '60'), v_record
  );
  select txt_1, num_1 into v_texto, v_num from public.object_records where id = v_record;
  if v_texto <> 'Apto 101 revisado' or v_num <> 60 then
    raise exception 'A atualização não refez os slots: "%", %.', v_texto, v_num;
  end if;

  ------------------------------------------- obrigatoriedade vale para frente ---
  -- Versão 2 acrescenta um campo obrigatório. O registro da versão 1 continua
  -- salvável pela versão dele — obrigatoriedade nova não invalida o passado.
  perform public.save_object_definition_draft(v_definition, v_spec);
  perform public.publish_object_definition(
    v_definition,
    jsonb_set(v_spec, '{fields}', (v_spec -> 'fields') || jsonb_build_array(
      jsonb_build_object('key', 'responsavel', 'label', 'Responsável', 'type', 'texto', 'required', true)
    ))
  );

  perform public.object_record_upsert(
    v_definition, jsonb_build_object('titulo', 'Apto 101 de novo', 'area', '60'), v_record
  );

  -- Registro novo nasce na versão 2 e é cobrado pelo campo obrigatório.
  v_raised := false;
  begin
    perform public.object_record_upsert(v_definition, jsonb_build_object('titulo', 'Apto 201'));
  exception when others then
    v_raised := true;
    if sqlerrm not like '%Responsável%' then
      raise exception 'A cobrança do campo obrigatório não nomeou o campo: %', sqlerrm;
    end if;
  end;
  if not v_raised then
    raise exception 'Registro novo sem o campo obrigatório da versão 2 deveria ser recusado.';
  end if;

  ------------------------------------------------------------ objeto fechado ---
  v_raised := false;
  begin
    perform public.object_record_upsert(
      public.create_object_definition(v_org, 'so_rascunho', 'Só rascunho', 'cadastro', 'qualidade', 'organizacao'),
      jsonb_build_object('titulo', 'x')
    );
  exception when others then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'Objeto em rascunho não deveria aceitar registro.';
  end if;

  --------------------------------------------------------------- permissão ---
  perform set_config('test.permission_granted', 'false', false);
  v_raised := false;
  begin
    perform public.object_record_upsert(v_definition, jsonb_build_object('titulo', 'sem permissão', 'responsavel', 'x'));
  exception when others then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'Gravar sem permissão no módulo do objeto deveria ser recusado.';
  end if;
  perform set_config('test.permission_granted', 'true', false);

  ------------------------------------------------------------- teto do payload ---
  v_raised := false;
  begin
    perform public.object_record_upsert(
      v_definition,
      jsonb_build_object('titulo', 'grande', 'responsavel', 'x', 'observacao', repeat('a', 70000))
    );
  exception when others then
    v_raised := true;
    if sqlerrm not like '%65536%' then
      raise exception 'O teto de payload recusou com a mensagem errada: %', sqlerrm;
    end if;
  end;
  if not v_raised then
    raise exception 'Payload acima de 64 KB deveria ser recusado.';
  end if;

  ------------------------------------------------------------------- pai ---
  -- Os dois lados: o tipo válido passa e o inventado é recusado. Só o segundo
  -- não provaria nada — recusar tudo também faria o teste passar.
  perform public.object_record_upsert(
    v_definition, jsonb_build_object('titulo', 'filho', 'responsavel', 'Ana'),
    null, null, 'obras', gen_random_uuid()
  );

  v_raised := false;
  begin
    perform public.object_record_upsert(
      v_definition, jsonb_build_object('titulo', 'filho', 'responsavel', 'Ana'),
      null, null, 'modulo_que_nao_existe', gen_random_uuid()
    );
  exception when others then
    v_raised := true;
    if sqlerrm not like '%desconhecido%' then
      raise exception 'O pai inválido foi recusado por outro motivo: %', sqlerrm;
    end if;
  end;
  if not v_raised then
    raise exception 'Tipo de registro pai desconhecido deveria ser recusado.';
  end if;

  raise notice 'Object Runtime — registros: 13 testes de comportamento aprovados.';
end;
$$;

-- Privilégio: authenticated não escreve direto, nem na partição.
do $$
declare
  v_raised boolean := false;
begin
  set local role authenticated;
  begin
    insert into public.object_records(organization_id, object_id, definition_version, module_key)
    values (gen_random_uuid(), gen_random_uuid(), 1, 'qualidade');
  exception when insufficient_privilege then
    v_raised := true;
  end;
  reset role;

  if not v_raised then
    raise exception 'authenticated conseguiu escrever direto em object_records.';
  end if;
  raise notice 'Object Runtime — registros: escrita direta por authenticated recusada.';
end;
$$;
