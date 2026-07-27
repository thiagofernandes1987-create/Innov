-- Dependência de tarefa: ciclo recusado e coerência de projeto.
--
-- O que se prova aqui não dá para provar em teste de unidade: o gatilho e as
-- chaves compostas são do banco, e é no banco que a recusa precisa acontecer —
-- a aplicação é um caminho, não o único.

do $$
declare
  v_org uuid;
  v_outra_org uuid;
  v_client uuid;
  v_projeto uuid;
  v_outro_projeto uuid;
  v_a uuid; v_b uuid; v_c uuid; v_alheia uuid;
  v_raised boolean;
begin
  insert into public.organizations(name) values ('Planejamento teste') returning id into v_org;
  insert into public.organizations(name) values ('Outra empresa') returning id into v_outra_org;

  insert into public.clients(organization_id, legal_name) values (v_org, 'Cliente') returning id into v_client;
  insert into public.projects(organization_id, client_id, code, name)
    values (v_org, v_client, 'OBRA-1', 'Obra um') returning id into v_projeto;
  insert into public.projects(organization_id, client_id, code, name)
    values (v_org, v_client, 'OBRA-2', 'Obra dois') returning id into v_outro_projeto;

  insert into public.project_tasks(organization_id, project_id, code, title, duration_days)
    values (v_org, v_projeto, 'T1', 'Medição', 2) returning id into v_a;
  insert into public.project_tasks(organization_id, project_id, code, title, duration_days)
    values (v_org, v_projeto, 'T2', 'Projeto executivo', 3) returning id into v_b;
  insert into public.project_tasks(organization_id, project_id, code, title, duration_days)
    values (v_org, v_projeto, 'T3', 'Fabricação', 5) returning id into v_c;
  insert into public.project_tasks(organization_id, project_id, code, title, duration_days)
    values (v_org, v_outro_projeto, 'T1', 'Tarefa de outra obra', 1) returning id into v_alheia;

  -- TESTE 1: cadeia legítima entra.
  insert into public.task_dependencies(organization_id, project_id, predecessor_task_id, successor_task_id, dependency_type)
    values (v_org, v_projeto, v_a, v_b, 'FS');
  insert into public.task_dependencies(organization_id, project_id, predecessor_task_id, successor_task_id, dependency_type)
    values (v_org, v_projeto, v_b, v_c, 'FS');

  -- TESTE 2: ciclo direto B→A é recusado.
  v_raised := false;
  begin
    insert into public.task_dependencies(organization_id, project_id, predecessor_task_id, successor_task_id, dependency_type)
      values (v_org, v_projeto, v_b, v_a, 'FS');
  exception when check_violation then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'TESTE 2 falhou: ciclo direto foi aceito.';
  end if;

  -- TESTE 3: ciclo indireto C→A é recusado. É o caso que a unicidade do par e a
  -- recusa de auto-referência deixam passar: nenhuma delas olha além do par.
  v_raised := false;
  begin
    insert into public.task_dependencies(organization_id, project_id, predecessor_task_id, successor_task_id, dependency_type)
      values (v_org, v_projeto, v_c, v_a, 'FS');
  exception when check_violation then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'TESTE 3 falhou: ciclo indireto A→B→C→A foi aceito.';
  end if;

  -- TESTE 4: tarefa de outro projeto é recusada pela chave composta.
  v_raised := false;
  begin
    insert into public.task_dependencies(organization_id, project_id, predecessor_task_id, successor_task_id, dependency_type)
      values (v_org, v_projeto, v_alheia, v_c, 'FS');
  exception when foreign_key_violation then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'TESTE 4 falhou: dependência entre projetos diferentes foi aceita.';
  end if;

  -- TESTE 5: dependência de si mesma continua recusada.
  v_raised := false;
  begin
    insert into public.task_dependencies(organization_id, project_id, predecessor_task_id, successor_task_id, dependency_type)
      values (v_org, v_projeto, v_a, v_a, 'FS');
  exception when check_violation then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'TESTE 5 falhou: tarefa dependendo de si mesma foi aceita.';
  end if;

  -- TESTE 6: os quatro tipos são aceitos. A tela oferece os quatro, e um enum
  -- reduzido faria a tela prometer o que o banco recusa.
  insert into public.project_tasks(organization_id, project_id, code, title, duration_days)
    values (v_org, v_projeto, 'T4', 'Montagem', 2);
  perform 1;
  if (select count(*) from pg_enum e join pg_type t on t.oid = e.enumtypid
      where t.typname = 'task_dependency_type' and e.enumlabel in ('FS','SS','FF','SF')) <> 4 then
    raise exception 'TESTE 6 falhou: os quatro tipos de dependência não estão no enum.';
  end if;

  -- TESTE 7: UPDATE que criaria ciclo também é recusado. Sem cobrir o UPDATE, a
  -- guarda seria contornável editando a aresta em vez de inserir outra.
  v_raised := false;
  begin
    update public.task_dependencies
       set predecessor_task_id = v_c, successor_task_id = v_a
     where predecessor_task_id = v_a and successor_task_id = v_b;
  exception when check_violation then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'TESTE 7 falhou: UPDATE fechou um ciclo.';
  end if;

  raise notice 'Planejamento — 7 testes de dependência aprovados.';
end;
$$;
