-- Pipeline — endurecimento apontado pelo advisor do Supabase.
-- Sprint S-23. Aplicado em 26 de julho de 2026, logo após as duas migrations
-- anteriores, com base no relatório de segurança do próprio projeto.
--
-- Dois achados, ambos meus:
--
-- 1. `function_search_path_mutable` em quatro funções do pipeline. As duas
--    `security definer` já fixavam o caminho; estas quatro não, porque eram
--    `security invoker` e o validador só exigia das definer. O caso mais grave
--    é `pipeline_codigo_data`: ela é usada em CHECK constraint e em coluna
--    gerada, então um esquema à frente no search_path poderia sombreá-la e
--    mudar o que o banco aceita gravar.
--
-- 2. `anon_security_definer_function_executable` em `pipeline_permite` e
--    `pipeline_permite_cartao`. Elas nascem com EXECUTE para PUBLIC, o que as
--    expõe em `/rest/v1/rpc/` para quem não fez login. São auxiliares de
--    política, não API.
--
-- O que NÃO é corrigido aqui, e por quê: `authenticated` continua com EXECUTE
-- nas duas. A expressão de uma política é avaliada com o papel de quem
-- consulta, então revogar de `authenticated` quebraria toda a leitura do
-- pipeline. O que a função devolve a quem chama direto é apenas se aquele
-- mesmo usuário tem permissão — não vaza dado de terceiro.

-- ── 1. search_path fixo nas funções restantes ───────────────────────────────

create or replace function public.pipeline_codigo_data(p_natureza text, p_marco text)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select case p_natureza || ':' || p_marco
    when 'limite:assistencia'    then 'DLA'
    when 'limite:entrega'        then 'DLE'
    when 'prevista:inicio'       then 'DPI'
    when 'prevista:termino'      then 'DPT'
    when 'prevista:entrega'      then 'DPE'
    when 'prevista:agendamento'  then 'DPA'
    when 'efetiva:inicio'        then 'DEI'
    when 'efetiva:termino'       then 'DET'
    when 'efetiva:entrega'       then 'DEE'
    when 'efetiva:agendamento'   then 'DEA'
    else null
  end;
$$;

create or replace function public.pipeline_cards_congelar_origem()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if new.organization_id is distinct from old.organization_id
     or new.trilha is distinct from old.trilha
     or new.pipeline_id is distinct from old.pipeline_id then
    raise exception 'Cartão não muda de organização, de trilha nem de pipeline. Arquive e crie outro.';
  end if;
  return new;
end;
$$;

create or replace function public.pipeline_presets()
returns table (preset text, trilha text, module_key text, nome text, descricao text)
language sql
immutable
parallel safe
set search_path = pg_catalog
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
set search_path = pg_catalog
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
      ('projeto_moveis_planejados', 'medicao',              'Medição',                   1, 'aberto',  false, 1, b.padrao || b.agenda, array['prevista:inicio']),
      ('projeto_moveis_planejados', 'projeto_executivo',    'Projeto executivo',         2, 'aberto',  false, 2, b.padrao, array[]::text[]),
      ('projeto_moveis_planejados', 'apresentacao_projeto', 'Apresentação do projeto',   3, 'aberto',  false, 3, b.padrao || b.agenda, array[]::text[]),
      ('projeto_moveis_planejados', 'fabricacao',           'Fabricação',                4, 'aberto',  false, 4, b.padrao, array['prevista:termino']),
      ('projeto_moveis_planejados', 'entrega',              'Entrega',                   5, 'aberto',  false, 5, b.padrao || b.entrega, array['limite:entrega']),
      ('projeto_moveis_planejados', 'montagem',             'Montagem',                  6, 'aberto',  false, 6, b.padrao || b.agenda, array[]::text[]),
      ('projeto_moveis_planejados', 'vistoria_finalizacao', 'Vistoria de finalização',   7, 'aberto',  false, 7, b.padrao || b.agenda, array[]::text[]),
      ('projeto_moveis_planejados', 'pos_montagem',         'Pós-montagem',              8, 'aberto',  false, 8, b.padrao || b.agenda, array[]::text[]),
      ('projeto_moveis_planejados', 'finalizados',          'Finalizados',               9, 'ganho',   true,  9, b.padrao, array['efetiva:termino']),

      ('assistencia_padrao', 'abertura',                'Abertura de chamados',      1, 'aberto',  false, 1, b.padrao || b.assistencia, array['limite:assistencia']),
      ('assistencia_padrao', 'em_contato',              'Em contato',                2, 'aberto',  false, 2, b.padrao || b.assistencia, array[]::text[]),
      ('assistencia_padrao', 'agendamento_vistoria',    'Agendamento de vistoria',   3, 'aberto',  false, 3, b.padrao || b.assistencia || b.agenda, array['prevista:agendamento']),
      ('assistencia_padrao', 'vistoria',                'Vistoria',                  4, 'aberto',  false, 4, b.padrao || b.assistencia || b.agenda, array[]::text[]),
      ('assistencia_padrao', 'aguardando_indisponivel', 'Aguardando — indisponível', 5, 'aberto',  false, 5, b.padrao || b.assistencia, array[]::text[]),
      ('assistencia_padrao', 'aguardando_disponivel',   'Aguardando — disponível',   6, 'aberto',  false, 6, b.padrao || b.assistencia, array[]::text[]),
      ('assistencia_padrao', 'agendamento_assistencia', 'Agendamento de assistência',7, 'aberto',  false, 7, b.padrao || b.assistencia || b.agenda, array['prevista:agendamento']),
      ('assistencia_padrao', 'assistencia',             'Assistência',               8, 'aberto',  false, 8, b.padrao || b.assistencia || b.agenda, array[]::text[]),
      ('assistencia_padrao', 'assistencia_finalizada',  'Assistência finalizada',    9, 'ganho',   true,  9, b.padrao || b.assistencia, array['efetiva:termino']),

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

-- ── 2. Auxiliares de política fora da API pública ───────────────────────────

revoke all on function public.pipeline_permite(uuid, public.app_access_level)
  from public, anon;
revoke all on function public.pipeline_permite_cartao(uuid, public.app_access_level)
  from public, anon;

grant execute on function public.pipeline_permite(uuid, public.app_access_level)
  to authenticated;
grant execute on function public.pipeline_permite_cartao(uuid, public.app_access_level)
  to authenticated;

-- ── Verificação embutida ────────────────────────────────────────────────────

do $$
declare
  v_ruim text;
begin
  -- Nenhuma função do pipeline pode ficar com search_path mutável.
  select string_agg(p.proname, ', ')
    into v_ruim
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname like 'pipeline\_%'
    and not exists (
      select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) as cfg
      where cfg like 'search\_path=%'
    );
  if v_ruim is not null then
    raise exception 'Funções de pipeline sem search_path fixo: %', v_ruim;
  end if;

  -- anon não executa auxiliar de política.
  if has_function_privilege('anon', 'public.pipeline_permite(uuid, public.app_access_level)', 'execute')
     or has_function_privilege('anon', 'public.pipeline_permite_cartao(uuid, public.app_access_level)', 'execute') then
    raise exception 'anon ainda executa auxiliar de política do pipeline.';
  end if;

  -- authenticated precisa executar, senão a política de leitura para de funcionar.
  if not has_function_privilege('authenticated', 'public.pipeline_permite(uuid, public.app_access_level)', 'execute') then
    raise exception 'authenticated perdeu EXECUTE em pipeline_permite — a leitura do pipeline quebraria.';
  end if;

  -- O catálogo continua resolvendo as dez siglas depois da troca de search_path.
  if public.pipeline_codigo_data('prevista','inicio') is distinct from 'DPI'
     or public.pipeline_codigo_data('limite','assistencia') is distinct from 'DLA'
     or public.pipeline_codigo_data('limite','inicio') is not null then
    raise exception 'pipeline_codigo_data mudou de comportamento após fixar o search_path.';
  end if;
end;
$$;
