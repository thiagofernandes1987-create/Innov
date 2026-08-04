-- Pipeline — presets de etapas.
-- Sprint S-23 do inventário de execução.
--
-- As listas que o responsável declarou vivem aqui, como dados de partida — não
-- como esquema. A organização que instala a plataforma escolhe um preset,
-- recebe as etapas prontas e a partir daí renomeia, reordena, acrescenta e
-- remove sem migration nenhuma.
--
-- Por que preset e não CHECK: "medição, projeto executivo, fabricação" é o
-- fluxo de móveis planejados. Uma marcenaria reconhece; uma consultoria, uma
-- assistência técnica ou uma construtora, não. O que é comum entre elas é a
-- forma — etapas ordenadas, com prazo e com datas —, e é a forma que o
-- esquema fixa.

-- ── Catálogo de presets ─────────────────────────────────────────────────────

create or replace function public.pipeline_presets()
returns table (preset text, trilha text, module_key text, nome text, descricao text)
language sql
immutable
parallel safe
as $$
  select *
  from (values
    ('projeto_moveis_planejados', 'projeto', 'obras', 'Trilha do projeto',
     'Da medição à pós-montagem. Ponto de partida de móveis planejados; renomeie as etapas para o seu fluxo.'),
    ('assistencia_padrao', 'assistencia', 'sac', 'Trilha de assistência',
     'Da abertura do chamado à assistência finalizada, com agendamento de vistoria e de atendimento.'),
    ('cliente_comercial', 'cliente', 'clientes', 'Trilha do cliente',
     'Percurso comercial do contato até o fechamento.')
  ) as t(preset, trilha, module_key, nome, descricao);
$$;

-- ── Etapas de cada preset ───────────────────────────────────────────────────
-- `datas` é o que a etapa mostra no formulário; `obrigatorias`, o que ela
-- exige. Toda etapa mostra previsto e efetivo de início e término — é disso
-- que o Gantt é feito, e sem isso "prazo" seria enfeite no cartão.

create or replace function public.pipeline_preset_estagios(p_preset text)
returns table (
  key text,
  name text,
  posicao integer,
  categoria text,
  recolhida boolean,
  cor smallint,
  datas text[],
  obrigatorias text[]
)
language sql
immutable
parallel safe
as $$
  with base as (
    select array['prevista:inicio','prevista:termino','efetiva:inicio','efetiva:termino']::text[] as padrao,
           array['prevista:agendamento','efetiva:agendamento']::text[] as agenda,
           array['limite:entrega','prevista:entrega','efetiva:entrega']::text[] as entrega,
           array['limite:assistencia']::text[] as assistencia
  )
  select e.key, e.name, e.posicao, e.categoria, e.recolhida, e.cor::smallint, e.datas, e.obrigatorias
  from base b,
  lateral (
    select * from (values
      -- Móveis planejados: a lista declarada pelo responsável, na ordem dada.
      ('projeto_moveis_planejados', 'medicao',              'Medição',                   1, 'aberto',  false, 1, b.padrao || b.agenda, array['prevista:inicio']),
      ('projeto_moveis_planejados', 'projeto_executivo',    'Projeto executivo',         2, 'aberto',  false, 2, b.padrao, array[]::text[]),
      ('projeto_moveis_planejados', 'apresentacao_projeto', 'Apresentação do projeto',   3, 'aberto',  false, 3, b.padrao || b.agenda, array[]::text[]),
      ('projeto_moveis_planejados', 'fabricacao',           'Fabricação',                4, 'aberto',  false, 4, b.padrao, array['prevista:termino']),
      ('projeto_moveis_planejados', 'entrega',              'Entrega',                   5, 'aberto',  false, 5, b.padrao || b.entrega, array['limite:entrega']),
      ('projeto_moveis_planejados', 'montagem',             'Montagem',                  6, 'aberto',  false, 6, b.padrao || b.agenda, array[]::text[]),
      ('projeto_moveis_planejados', 'vistoria_finalizacao', 'Vistoria de finalização',   7, 'aberto',  false, 7, b.padrao || b.agenda, array[]::text[]),
      ('projeto_moveis_planejados', 'pos_montagem',         'Pós-montagem',              8, 'aberto',  false, 8, b.padrao || b.agenda, array[]::text[]),
      ('projeto_moveis_planejados', 'finalizados',          'Finalizados',               9, 'ganho',   true,  9, b.padrao, array['efetiva:termino']),

      -- Assistência: a segunda lista declarada, também na ordem dada.
      ('assistencia_padrao', 'abertura',                'Abertura de chamados',      1, 'aberto',  false, 1, b.padrao || b.assistencia, array['limite:assistencia']),
      ('assistencia_padrao', 'em_contato',              'Em contato',                2, 'aberto',  false, 2, b.padrao || b.assistencia, array[]::text[]),
      ('assistencia_padrao', 'agendamento_vistoria',    'Agendamento de vistoria',   3, 'aberto',  false, 3, b.padrao || b.assistencia || b.agenda, array['prevista:agendamento']),
      ('assistencia_padrao', 'vistoria',                'Vistoria',                  4, 'aberto',  false, 4, b.padrao || b.assistencia || b.agenda, array[]::text[]),
      -- Duas esperas distintas: sem peça e com peça. Uma coluna só apagaria a
      -- diferença entre o que depende de fornecedor e o que depende de agenda.
      ('assistencia_padrao', 'aguardando_indisponivel', 'Aguardando — indisponível', 5, 'aberto',  false, 5, b.padrao || b.assistencia, array[]::text[]),
      ('assistencia_padrao', 'aguardando_disponivel',   'Aguardando — disponível',   6, 'aberto',  false, 6, b.padrao || b.assistencia, array[]::text[]),
      ('assistencia_padrao', 'agendamento_assistencia', 'Agendamento de assistência',7, 'aberto',  false, 7, b.padrao || b.assistencia || b.agenda, array['prevista:agendamento']),
      ('assistencia_padrao', 'assistencia',             'Assistência',               8, 'aberto',  false, 8, b.padrao || b.assistencia || b.agenda, array[]::text[]),
      ('assistencia_padrao', 'assistencia_finalizada',  'Assistência finalizada',    9, 'ganho',   true,  9, b.padrao || b.assistencia, array['efetiva:termino']),

      -- Trilha do cliente: percurso comercial genérico, sem vocabulário de
      -- segmento. Serve de ponto de partida para qualquer ramo.
      ('cliente_comercial', 'prospeccao',   'Prospecção',   1, 'aberto',  false, 1, b.padrao, array[]::text[]),
      ('cliente_comercial', 'qualificacao', 'Qualificação', 2, 'aberto',  false, 2, b.padrao, array[]::text[]),
      ('cliente_comercial', 'proposta',     'Proposta',     3, 'aberto',  false, 3, b.padrao || b.entrega, array[]::text[]),
      ('cliente_comercial', 'negociacao',   'Negociação',   4, 'aberto',  false, 4, b.padrao, array[]::text[]),
      ('cliente_comercial', 'ganho',        'Ganho',        5, 'ganho',   true,  10, b.padrao, array['efetiva:termino']),
      ('cliente_comercial', 'perdido',      'Perdido',      6, 'perdido', true,  11, b.padrao, array[]::text[])
    ) as v(preset, key, name, posicao, categoria, recolhida, cor, datas, obrigatorias)
    where v.preset = p_preset
  ) as e;
$$;

-- ── Instalação de um preset ─────────────────────────────────────────────────
-- RPC em vez de escrita direta: criar uma trilha são quatro inserções em três
-- tabelas que precisam concordar entre si. Deixar isso a cargo da aplicação é
-- deixar a coerência a cargo de quem esquecer uma delas.

create or replace function public.pipeline_criar_do_preset(
  p_organization_id uuid,
  p_preset text,
  p_nome text default null,
  p_key text default null,
  p_padrao boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_meta record;
  v_pipeline_id uuid;
  v_stage record;
  v_stage_id uuid;
  v_codigo text;
  v_natureza text;
  v_marco text;
begin
  select * into v_meta from public.pipeline_presets() where preset = p_preset;
  if v_meta is null then
    raise exception 'Preset de pipeline desconhecido: %. Presets disponíveis: %',
      p_preset,
      (select string_agg(preset, ', ' order by preset) from public.pipeline_presets());
  end if;

  if not public.has_module_permission(p_organization_id, 'administracao', 'EDIT', null, null) then
    raise exception 'Sem permissão para criar trilha nesta organização.'
      using errcode = '42501';
  end if;

  insert into public.pipelines
    (organization_id, key, name, trilha, module_key, descricao, padrao, created_by)
  values (
    p_organization_id,
    coalesce(p_key, p_preset),
    coalesce(p_nome, v_meta.nome),
    v_meta.trilha,
    v_meta.module_key,
    v_meta.descricao,
    p_padrao,
    auth.uid()
  )
  returning id into v_pipeline_id;

  for v_stage in select * from public.pipeline_preset_estagios(p_preset) order by posicao loop
    insert into public.pipeline_stages
      (pipeline_id, organization_id, key, name, posicao, categoria, recolhida, cor)
    values (
      v_pipeline_id, p_organization_id, v_stage.key, v_stage.name,
      v_stage.posicao, v_stage.categoria, v_stage.recolhida, v_stage.cor
    )
    returning id into v_stage_id;

    foreach v_codigo in array v_stage.datas loop
      v_natureza := split_part(v_codigo, ':', 1);
      v_marco := split_part(v_codigo, ':', 2);
      insert into public.pipeline_stage_date_codes
        (stage_id, organization_id, natureza, marco, obrigatoria)
      values (
        v_stage_id, p_organization_id, v_natureza, v_marco,
        v_codigo = any (v_stage.obrigatorias)
      )
      on conflict (stage_id, natureza, marco) do nothing;
    end loop;
  end loop;

  return v_pipeline_id;
end;
$$;

revoke all on function public.pipeline_criar_do_preset(uuid, text, text, text, boolean)
  from public, anon;
grant execute on function public.pipeline_criar_do_preset(uuid, text, text, text, boolean)
  to authenticated;

grant execute on function public.pipeline_presets() to authenticated;
grant execute on function public.pipeline_preset_estagios(text) to authenticated;

-- ── Autoteste ───────────────────────────────────────────────────────────────
-- A migration não termina sem provar que os presets estão íntegros. Preset com
-- posição repetida ou com código de data inexistente só apareceria quando
-- alguém tentasse instalá-lo, semanas depois.

do $$
declare
  v_preset text;
  v_total integer;
  v_ruim text;
begin
  for v_preset in select preset from public.pipeline_presets() loop
    select count(*) into v_total from public.pipeline_preset_estagios(v_preset);
    if v_total = 0 then
      raise exception 'Preset % não devolve etapa nenhuma.', v_preset;
    end if;

    if exists (
      select 1 from public.pipeline_preset_estagios(v_preset)
      group by posicao having count(*) > 1
    ) then
      raise exception 'Preset % tem posição de etapa repetida.', v_preset;
    end if;

    if exists (
      select 1 from public.pipeline_preset_estagios(v_preset)
      group by key having count(*) > 1
    ) then
      raise exception 'Preset % tem chave de etapa repetida.', v_preset;
    end if;

    -- Toda combinação declarada precisa ter sigla, e toda obrigatória precisa
    -- estar entre as exibidas — exigir campo que a etapa não mostra é pedir o
    -- impossível ao operador.
    select string_agg(distinct d.codigo, ', ') into v_ruim
    from public.pipeline_preset_estagios(v_preset) e,
         lateral unnest(e.datas) as d(codigo)
    where public.pipeline_codigo_data(split_part(d.codigo, ':', 1), split_part(d.codigo, ':', 2)) is null;
    if v_ruim is not null then
      raise exception 'Preset % declara combinação de data sem sigla: %', v_preset, v_ruim;
    end if;

    select string_agg(distinct o.codigo, ', ') into v_ruim
    from public.pipeline_preset_estagios(v_preset) e,
         lateral unnest(e.obrigatorias) as o(codigo)
    where not (o.codigo = any (e.datas));
    if v_ruim is not null then
      raise exception 'Preset % exige data que a etapa não exibe: %', v_preset, v_ruim;
    end if;
  end loop;

  -- As duas listas declaradas têm nove etapas cada. O número está aqui para
  -- que remover uma etapa por engano reprove a migration.
  if (select count(*) from public.pipeline_preset_estagios('projeto_moveis_planejados')) <> 9 then
    raise exception 'Preset de projeto deveria ter 9 etapas.';
  end if;
  if (select count(*) from public.pipeline_preset_estagios('assistencia_padrao')) <> 9 then
    raise exception 'Preset de assistência deveria ter 9 etapas.';
  end if;

  raise notice 'Presets de pipeline verificados: % preset(s).',
    (select count(*) from public.pipeline_presets());
end;
$$;
