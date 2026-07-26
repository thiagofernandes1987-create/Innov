-- Testes de comportamento do pipeline (trilhas de cliente, projeto e assistência).
-- Roda contra um PostgreSQL com a fixture e as duas migrations aplicadas.
-- Cada teste falha fechado: `raise exception` interrompe e o script sai != 0.

\set ON_ERROR_STOP on

do $$
declare
  v_org uuid;
  v_outra_org uuid;
  v_user uuid;
  v_outro_user uuid;
  v_client uuid;
  v_project uuid;
  v_ticket uuid;
  v_pipeline_projeto uuid;
  v_pipeline_assistencia uuid;
  v_pipeline_cliente uuid;
  v_stage_medicao uuid;
  v_stage_entrega uuid;
  v_stage_abertura uuid;
  v_card uuid;
  v_tag uuid;
  v_texto text;
  v_count integer;
  v_raised boolean;
begin
  insert into auth.users(email) values ('responsavel@innovar.local') returning id into v_user;
  insert into auth.users(email) values ('colega@innovar.local') returning id into v_outro_user;
  insert into public.organizations(name) values ('Empresa de teste') returning id into v_org;
  insert into public.organizations(name) values ('Outra empresa') returning id into v_outra_org;
  perform set_config('test.user_id', v_user::text, false);
  perform set_config('test.permission_granted', 'true', false);

  insert into public.clients(organization_id, legal_name)
  values (v_org, 'Cliente de teste') returning id into v_client;
  insert into public.projects(organization_id, client_id, name)
  values (v_org, v_client, 'Cozinha do apartamento 71') returning id into v_project;
  insert into public.sac_tickets(organization_id, client_id, project_id, title)
  values (v_org, v_client, v_project, 'Porta desalinhada') returning id into v_ticket;

  ------------------------------------------------------------ preset ---------
  v_pipeline_projeto := public.pipeline_criar_do_preset(v_org, 'projeto_moveis_planejados', null, null, true);

  select count(*) into v_count from public.pipeline_stages where pipeline_id = v_pipeline_projeto;
  if v_count <> 9 then
    raise exception 'TESTE 1 falhou: preset de projeto criou % etapas, esperado 9.', v_count;
  end if;

  select string_agg(key, ',' order by posicao) into v_texto
  from public.pipeline_stages where pipeline_id = v_pipeline_projeto;
  if v_texto is distinct from
     'medicao,projeto_executivo,apresentacao_projeto,fabricacao,entrega,montagem,vistoria_finalizacao,pos_montagem,finalizados' then
    raise exception 'TESTE 2 falhou: ordem das etapas do preset de projeto veio como %.', v_texto;
  end if;

  v_pipeline_assistencia := public.pipeline_criar_do_preset(v_org, 'assistencia_padrao', null, null, true);
  select string_agg(key, ',' order by posicao) into v_texto
  from public.pipeline_stages where pipeline_id = v_pipeline_assistencia;
  if v_texto is distinct from
     'abertura,em_contato,agendamento_vistoria,vistoria,aguardando_indisponivel,aguardando_disponivel,agendamento_assistencia,assistencia,assistencia_finalizada' then
    raise exception 'TESTE 3 falhou: ordem das etapas do preset de assistência veio como %.', v_texto;
  end if;

  v_pipeline_cliente := public.pipeline_criar_do_preset(v_org, 'cliente_comercial', null, null, true);

  -- Etapa final recolhida, como a coluna dobrada do padrão de mercado.
  if not (select recolhida from public.pipeline_stages
          where pipeline_id = v_pipeline_projeto and key = 'finalizados') then
    raise exception 'TESTE 4 falhou: a etapa final deveria nascer recolhida.';
  end if;

  ------------------------------------------------------- datas da etapa ------
  select id into v_stage_medicao from public.pipeline_stages
  where pipeline_id = v_pipeline_projeto and key = 'medicao';
  select id into v_stage_entrega from public.pipeline_stages
  where pipeline_id = v_pipeline_projeto and key = 'entrega';
  select id into v_stage_abertura from public.pipeline_stages
  where pipeline_id = v_pipeline_assistencia and key = 'abertura';

  -- Toda etapa mostra previsto e efetivo de início e término: é disso que o
  -- Gantt é feito.
  select count(*) into v_count from public.pipeline_stage_date_codes
  where stage_id = v_stage_medicao;
  if v_count <> 6 then
    raise exception 'TESTE 5 falhou: medição deveria exibir 6 datas (4 padrão + agendamento), veio %.', v_count;
  end if;

  if not exists (
    select 1 from public.pipeline_stage_date_codes
    where stage_id = v_stage_entrega and natureza = 'limite' and marco = 'entrega' and obrigatoria
  ) then
    raise exception 'TESTE 6 falhou: entrega deveria exigir a data limite de entrega (DLE).';
  end if;

  if not exists (
    select 1 from public.pipeline_stage_date_codes
    where stage_id = v_stage_abertura and natureza = 'limite' and marco = 'assistencia' and obrigatoria
  ) then
    raise exception 'TESTE 7 falhou: abertura de chamado deveria exigir a data limite de assistência (DLA).';
  end if;

  ------------------------------------------------------------- cartão --------
  insert into public.pipeline_cards
    (organization_id, pipeline_id, stage_id, trilha, project_id, client_id, titulo, created_by)
  values (v_org, v_pipeline_projeto, v_stage_medicao, 'projeto', v_project, v_client,
          'Cozinha do apartamento 71', v_user)
  returning id into v_card;

  -- Trilha de assistência sem chamado não é cartão: é cartão que não abre nada.
  v_raised := false;
  begin
    insert into public.pipeline_cards
      (organization_id, pipeline_id, stage_id, trilha, client_id, titulo)
    values (v_org, v_pipeline_assistencia, v_stage_abertura, 'assistencia', v_client, 'Chamado sem chamado');
  exception when check_violation then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'TESTE 8 falhou: cartão de assistência sem ticket_id foi aceito.';
  end if;

  -- Etapa de outra trilha não serve: a chave composta impede.
  v_raised := false;
  begin
    insert into public.pipeline_cards
      (organization_id, pipeline_id, stage_id, trilha, project_id, titulo)
    values (v_org, v_pipeline_projeto, v_stage_abertura, 'projeto', v_project, 'Etapa emprestada');
  exception when foreign_key_violation then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'TESTE 9 falhou: cartão aceitou etapa de outra pipeline.';
  end if;

  -- Trilha declarada tem que bater com a da pipeline.
  v_raised := false;
  begin
    insert into public.pipeline_cards
      (organization_id, pipeline_id, stage_id, trilha, client_id, titulo)
    values (v_org, v_pipeline_projeto, v_stage_medicao, 'cliente', v_client, 'Trilha trocada');
  exception when foreign_key_violation then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'TESTE 10 falhou: cartão declarou trilha diferente da pipeline e foi aceito.';
  end if;

  ---------------------------------------------------------- histórico --------
  select count(*) into v_count from public.pipeline_card_stage_history where card_id = v_card;
  if v_count <> 1 then
    raise exception 'TESTE 11 falhou: criação do cartão deveria registrar 1 entrada de histórico, veio %.', v_count;
  end if;

  update public.pipeline_cards
  set stage_id = (select id from public.pipeline_stages
                  where pipeline_id = v_pipeline_projeto and key = 'projeto_executivo')
  where id = v_card;

  select count(*) into v_count from public.pipeline_card_stage_history where card_id = v_card;
  if v_count <> 2 then
    raise exception 'TESTE 12 falhou: mover o cartão deveria registrar a segunda entrada, veio %.', v_count;
  end if;

  -- Mudar o que o cartão é, e não onde ele está, é recusado.
  v_raised := false;
  begin
    update public.pipeline_cards set trilha = 'cliente' where id = v_card;
  exception when raise_exception then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'TESTE 13 falhou: cartão trocou de trilha depois de criado.';
  end if;

  ------------------------------------------------------------- datas ---------
  insert into public.pipeline_card_dates(card_id, organization_id, natureza, marco, data, definido_por)
  values (v_card, v_org, 'prevista', 'inicio', date '2026-08-03', v_user);

  select codigo into v_texto from public.pipeline_card_dates
  where card_id = v_card and natureza = 'prevista' and marco = 'inicio';
  if v_texto is distinct from 'DPI' then
    raise exception 'TESTE 14 falhou: a sigla derivada deveria ser DPI, veio %.', coalesce(v_texto, '(nula)');
  end if;

  -- Combinação sem sigla declarada não entra: a interface mostraria um campo
  -- que nenhum filtro alcança.
  v_raised := false;
  begin
    insert into public.pipeline_card_dates(card_id, organization_id, natureza, marco, data)
    values (v_card, v_org, 'limite', 'inicio', date '2026-08-01');
  exception when check_violation then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'TESTE 15 falhou: combinação limite×início foi aceita sem ter sigla.';
  end if;

  -- Duas datas previstas de início para o mesmo cartão é ambiguidade, não dado.
  v_raised := false;
  begin
    insert into public.pipeline_card_dates(card_id, organization_id, natureza, marco, data)
    values (v_card, v_org, 'prevista', 'inicio', date '2026-08-10');
  exception when unique_violation then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'TESTE 16 falhou: o cartão aceitou duas datas previstas de início.';
  end if;

  --------------------------------------------------------- marcadores --------
  insert into public.pipeline_tags(organization_id, nome, cor)
  values (v_org, 'Urgente', 3) returning id into v_tag;
  insert into public.pipeline_card_tags(card_id, tag_id, organization_id)
  values (v_card, v_tag, v_org);

  v_raised := false;
  begin
    insert into public.pipeline_tags(organization_id, nome) values (v_org, '  urgente ');
  exception when unique_violation then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'TESTE 17 falhou: marcador repetido só por caixa e espaço foi aceito.';
  end if;

  -- Marcador de outra organização não cola em cartão desta. Marcador novo, para
  -- que o teste falhe pela chave estrangeira e não pela chave primária.
  insert into public.pipeline_tags(organization_id, nome, cor)
  values (v_org, 'Reagendado', 5) returning id into v_tag;
  v_raised := false;
  begin
    insert into public.pipeline_card_tags(card_id, tag_id, organization_id)
    values (v_card, v_tag, v_outra_org);
  exception when foreign_key_violation then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'TESTE 18 falhou: vínculo de marcador aceitou organização divergente.';
  end if;

  ------------------------------------------------------------ presets --------
  v_raised := false;
  begin
    perform public.pipeline_criar_do_preset(v_org, 'preset_que_nao_existe');
  exception when others then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'TESTE 19 falhou: preset inexistente foi aceito.';
  end if;

  -- Uma trilha padrão por tipo: duas fariam a tela escolher em silêncio.
  v_raised := false;
  begin
    perform public.pipeline_criar_do_preset(v_org, 'projeto_moveis_planejados', 'Segunda trilha', 'projeto_2', true);
  exception when unique_violation then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'TESTE 20 falhou: a organização ficou com duas trilhas padrão do mesmo tipo.';
  end if;

  -- Sem permissão de administração, ninguém desenha funil.
  perform set_config('test.permission_granted', 'false', false);
  v_raised := false;
  begin
    perform public.pipeline_criar_do_preset(v_outra_org, 'assistencia_padrao');
  exception when insufficient_privilege then
    v_raised := true;
  end;
  if not v_raised then
    raise exception 'TESTE 21 falhou: preset instalado sem permissão de administração.';
  end if;
  perform set_config('test.permission_granted', 'true', false);

  raise notice 'Pipeline — 21 testes de comportamento aprovados.';
end;
$$;

-- RLS sob papel de cliente ---------------------------------------------------
-- Fora do bloco anterior porque troca de papel não pode acontecer dentro de
-- uma função.

do $$
declare
  v_count integer;
  v_visivel integer;
begin
  select count(*) into v_count from public.pipeline_cards;
  if v_count = 0 then
    raise exception 'TESTE 22 falhou: sem cartão gravado, o teste de RLS não prova nada.';
  end if;

  perform set_config('test.permission_granted', 'false', false);
  set local role authenticated;
  select count(*) into v_visivel from public.pipeline_cards;
  reset role;
  perform set_config('test.permission_granted', 'true', false);

  if v_visivel <> 0 then
    raise exception 'TESTE 22 falhou: authenticated sem permissão enxergou % cartão(ões).', v_visivel;
  end if;
  raise notice 'Pipeline — RLS: leitura de cartão recusada sem permissão de módulo.';
end;
$$;

-- Histórico não se reescreve -------------------------------------------------
do $$
declare
  v_raised boolean := false;
begin
  begin
    set local role authenticated;
    delete from public.pipeline_card_stage_history;
  exception when insufficient_privilege then
    v_raised := true;
  end;
  reset role;
  if not v_raised then
    raise exception 'TESTE 23 falhou: authenticated apagou histórico de etapa.';
  end if;
  raise notice 'Pipeline — privilégio: escrita direta no histórico de etapa recusada.';
end;
$$;
