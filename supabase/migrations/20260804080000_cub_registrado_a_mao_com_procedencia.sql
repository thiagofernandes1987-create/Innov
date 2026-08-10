-- T-37.13b — o CUB dos outros 26 estados entra à mão, com procedência.
--
-- O problema medido na T-37.13a: a tela passou a seguir a UF da obra, e obra
-- fora de São Paulo encontra "Sem CUB importado para MG". Está correto — é
-- melhor que oferecer o paulista disfarçado —, mas é um beco: não existe
-- caminho nenhum para carregar o CUB de MG. A fonte automática por estado
-- (T-37.13c) depende de escrever um leitor por Sinduscon, e o portal nacional
-- (`cub.org.br`) está bloqueado pela política de rede deste ambiente (T-37.13d).
-- Este é o caminho que vale para os 27 **hoje**.
--
-- Por que RPC e não escrita direta: desde a T-37.12 a referência oficial é
-- imutável para `authenticated` — gatilho `guard_official_cost_reference` mais
-- `revoke insert, update, delete`. Afrouxar isso para caber uma importação
-- manual desfaria a correção da VACINA-061 pela porta da frente. A função roda
-- como `postgres` (`security definer`), então passa pelo gatilho por ser o
-- caminho autorizado, e **é ela** que carrega as regras.
--
-- Quem pode: quem tem EDIT em `orcamentos` — o orçamentista, que é a persona
-- que tem o PDF do Sinduscon na mão. Exigir `administer` deixaria a tarefa com
-- quem não a faz, e o efeito prático seria ninguém importar nada.
--
-- ## A parte incômoda: o que `source_sha256` significa aqui
--
-- Nas linhas automáticas a coluna é o hash do arquivo que o servidor baixou e
-- leu — evidência de verdade. Numa declaração manual o servidor não vê arquivo
-- nenhum. Aceitar um hash digitado deixaria a coluna **parecendo** a mesma
-- coisa, e "número não conferido com evidência ao lado atestando que foi" é
-- exatamente o formato que a VACINA-061 registra como o pior.
--
-- Então a coluna guarda o que o servidor de fato pode atestar: o digest da
-- **declaração canônica** — os valores exatos que entraram, concatenados aqui
-- dentro. É verificável (recalcula-se a partir da linha) e não é falsificável
-- pelo chamador. O hash do arquivo, quando a pessoa o informa, vai para
-- `raw_payload.arquivoSha256Declarado`, com esse nome, porque é declarado e não
-- conferido.
--
-- `raw_payload.retrievalMode = 'declaracao-manual'` é o que a tela lê para
-- **nunca** apresentar uma linha declarada com a mesma cara de uma lida.
--
-- ## Precedência
--
-- Quando a fonte automática daquela UF existir (T-37.13c), ela grava por
-- `upsert` na mesma chave natural e **sobrescreve** a declaração manual. É a
-- ordem certa: leitura conferida ganha de declaração. A pessoa não perde nada —
-- o valor declarado vira o valor lido, ou a divergência aparece no histórico.

begin;

-- ---------------------------------------------------------------------------
-- 1. Vocabulário das tipologias e das UFs, no banco.
-- ---------------------------------------------------------------------------
-- As dezenove siglas já existem em `lib/cost-sources/cub-serie-historica.ts`.
-- Esta é a segunda cópia, e cópia que diverge em silêncio foi o defeito da
-- T-37.7 — por isso `validate:vaccines` compara as duas listas, código a
-- código, e reprova quando param de bater.
create or replace function public.tipologias_do_cub()
returns text[]
language sql
immutable
set search_path to 'public', 'pg_temp'
as $function$
  select array[
    'R1-B','PP-4B','R8-B','PIS','R1-N','PP-4N','R8-N','R16-N','R1-A','R8-A',
    'R16-A','CAL-8N','CSL-8N','CSL-16N','CAL-8A','CSL-8A','CSL-16A','RP1Q','GI'
  ];
$function$;

comment on function public.tipologias_do_cub() is
  'As dezenove tipologias da NBR 12721. Espelha TIPOLOGIAS_CUB em lib/cost-sources/cub-serie-historica.ts; validate:vaccines compara as duas.';

create or replace function public.ufs_do_brasil()
returns text[]
language sql
immutable
set search_path to 'public', 'pg_temp'
as $function$
  select array[
    'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB',
    'PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'
  ];
$function$;

comment on function public.ufs_do_brasil() is
  'As 27 unidades federativas. Espelha UFS_DO_BRASIL em lib/orcamentos/cub-por-uf.ts; validate:vaccines compara as duas.';

-- O que conta como fonte oficial de custo, num lugar só. Antes era uma lista
-- literal repetida dentro do gatilho; agora a mesma pergunta serve ao gatilho e
-- à RPC, e incluir uma fonte nova é uma edição só.
create or replace function public.fonte_de_custo_oficial(p_source_key text)
returns boolean
language sql
immutable
set search_path to 'public', 'pg_temp'
as $function$
  select coalesce(p_source_key, '') = 'SINAPI_CAIXA'
      or coalesce(p_source_key, '') ~ '^SINDUSCON_[A-Z]{2}_CUB$';
$function$;

comment on function public.fonte_de_custo_oficial(text) is
  'Vocabulário fechado das fontes oficiais de custo. Forma, não lista, porque o CUB tem 27 chaves — uma por UF.';

-- ---------------------------------------------------------------------------
-- 2. A guarda passa a proteger os 27, não só São Paulo.
-- ---------------------------------------------------------------------------
-- A lista fechada `('SINAPI_CAIXA','SINDUSCON_SP_CUB')` era certa quando havia
-- um estado. Com `SINDUSCON_MG_CUB` gravado, a linha de Minas ficaria **fora**
-- da guarda: editável por qualquer membro interno, com a procedência intacta ao
-- lado. Seria a VACINA-061 de novo, aberta pela funcionalidade que a respeita.
--
-- O vocabulário continua fechado — muda de lista para forma, e a forma é
-- ancorada nas duas pontas para `PROPRIA_SINDUSCON_XX_CUB_FALSA` não passar.
create or replace function public.guard_official_cost_reference()
returns trigger
language plpgsql
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_antiga text;
  v_nova text;
  v_pai_antigo uuid;
  v_pai_novo uuid;
begin
  if current_user in ('postgres', 'service_role') then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  if tg_table_name in ('cost_catalog_items', 'cost_compositions', 'cost_reference_snapshots') then
    if tg_op <> 'INSERT' then v_antiga := old.source_key; end if;
    if tg_op <> 'DELETE' then v_nova := new.source_key; end if;

  elsif tg_table_name = 'cost_composition_versions' then
    if tg_op <> 'INSERT' then v_pai_antigo := old.composition_id; end if;
    if tg_op <> 'DELETE' then v_pai_novo := new.composition_id; end if;
    select source_key into v_antiga from public.cost_compositions where id = v_pai_antigo;
    select source_key into v_nova from public.cost_compositions where id = v_pai_novo;

  elsif tg_table_name = 'cost_composition_items' then
    if tg_op <> 'INSERT' then v_pai_antigo := old.composition_version_id; end if;
    if tg_op <> 'DELETE' then v_pai_novo := new.composition_version_id; end if;
    select composicao.source_key into v_antiga
    from public.cost_composition_versions versao
    join public.cost_compositions composicao on composicao.id = versao.composition_id
    where versao.id = v_pai_antigo;
    select composicao.source_key into v_nova
    from public.cost_composition_versions versao
    join public.cost_compositions composicao on composicao.id = versao.composition_id
    where versao.id = v_pai_novo;
  end if;

  -- Continua conferindo os **dois** sentidos: o que a linha era e o que ela
  -- passaria a ser. Um só deixa metade do buraco aberto (T-37.12).
  if public.fonte_de_custo_oficial(v_antiga) or public.fonte_de_custo_oficial(v_nova) then
    raise exception 'Referência oficial de custo é imutável fora do importador autorizado.';
  end if;

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 3. A importação manual.
-- ---------------------------------------------------------------------------
create or replace function public.registrar_cub_manual(
  p_organization_id uuid,
  p_region text,
  p_reference_code text,
  p_base_date date,
  p_tax_relief boolean,
  p_total_cost numeric,
  p_materials_cost numeric,
  p_labor_cost numeric,
  p_administrative_cost numeric,
  p_source_name text,
  p_source_url text,
  p_publication_date date default null,
  p_arquivo_sha256 text default null
)
returns uuid
language plpgsql
security definer
-- `extensions` fica **fora** do `search_path` e `digest` é chamada qualificada:
-- é a VACINA das funções de pgcrypto (20260728233000_qualify_pgcrypto_functions).
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_uf text := upper(trim(coalesce(p_region, '')));
  v_codigo text := upper(trim(coalesce(p_reference_code, '')));
  v_fonte text := trim(coalesce(p_source_name, ''));
  v_url text := trim(coalesce(p_source_url, ''));
  v_arquivo text := nullif(lower(trim(coalesce(p_arquivo_sha256, ''))), '');
  v_source_key text;
  v_partes numeric;
  v_declaracao text;
  v_sha text;
  v_existente public.cost_reference_snapshots;
  v_id uuid;
begin
  -- Quem: EDIT em `orcamentos`. `has_module_permission` já confere que quem
  -- chama é membro ativo **daquela** organização, então passar o id de outra
  -- não abre caminho.
  if not public.has_module_permission(p_organization_id, 'orcamentos', 'EDIT', null::uuid, '') then
    raise exception 'Registrar CUB exige permissão de edição em Orçamentos.';
  end if;

  if not (v_uf = any (public.ufs_do_brasil())) then
    raise exception 'UF inválida: %. Use a sigla de uma das 27 unidades federativas.', v_uf;
  end if;

  if not (v_codigo = any (public.tipologias_do_cub())) then
    raise exception 'Tipologia inválida: %. O CUB da NBR 12721 tem dezenove, de R1-B a GI.', v_codigo;
  end if;

  if p_base_date is null or date_trunc('month', p_base_date)::date <> p_base_date then
    raise exception 'A data-base do CUB é o primeiro dia do mês de referência.';
  end if;
  -- CUB de mês que ainda não terminou não existe: ninguém publica antes de
  -- apurar. Data futura aqui é dedo escorregado no ano, e entraria como a
  -- referência "mais recente" de todas.
  if p_base_date > date_trunc('month', current_date)::date then
    raise exception 'A data-base % é futura; o CUB daquele mês ainda não foi publicado.', to_char(p_base_date, 'MM/YYYY');
  end if;
  if p_publication_date is not null then
    if p_publication_date < p_base_date then
      raise exception 'A data de publicação não pode ser anterior à data-base.';
    end if;
    if p_publication_date > current_date then
      raise exception 'A data de publicação não pode ser futura.';
    end if;
  end if;

  if p_total_cost is null or p_total_cost <= 0 then
    raise exception 'O CUB por m² precisa ser maior que zero.';
  end if;
  -- Faixa de ordem de grandeza, não de plausibilidade fina: pega o valor
  -- digitado em centavos e o custo da obra inteira no lugar do custo por m².
  -- Larga de propósito — o CUB brasileiro corre na casa dos milhares, e uma
  -- faixa apertada envelheceria com a inflação e reprovaria dado correto.
  if p_total_cost < 100 or p_total_cost > 100000 then
    raise exception 'O CUB por m² informado (%) está fora da ordem de grandeza esperada. Confira se o valor é por metro quadrado.', to_char(p_total_cost, 'FM999999990.00');
  end if;

  -- Decomposição é tudo ou nada. Meia decomposição chegaria à tela como
  -- "material de R$ 0,00" — que é a VACINA-060 outra vez, ausência gravada
  -- como zero.
  if (p_materials_cost is null) <> (p_labor_cost is null)
     or (p_materials_cost is null) <> (p_administrative_cost is null) then
    raise exception 'Informe material, mão de obra e despesas administrativas juntos, ou nenhum dos três.';
  end if;

  if p_materials_cost is not null then
    if p_materials_cost < 0 or p_labor_cost < 0 or p_administrative_cost < 0 then
      raise exception 'As parcelas do CUB não podem ser negativas.';
    end if;
    v_partes := p_materials_cost + p_labor_cost + p_administrative_cost;
    -- Um centavo, a mesma tolerância da série histórica (TOLERANCIA_DA_SERIE).
    -- Aceitar diferença maior gravaria uma decomposição que não fecha, e a tela
    -- a exibiria separada por natureza — inventando a diferença.
    if abs(v_partes - p_total_cost) > 0.01 then
      raise exception 'As parcelas somam % e o total informado é %. A diferença precisa ser de no máximo um centavo.',
        to_char(v_partes, 'FM999999990.00'), to_char(p_total_cost, 'FM999999990.00');
    end if;
  end if;

  if v_fonte = '' then
    raise exception 'Informe o nome do sindicato que publicou o CUB.';
  end if;
  if length(v_fonte) > 120 then
    raise exception 'O nome da fonte é longo demais.';
  end if;

  -- `https` e nada mais. `http` publicaria uma referência oficial cuja origem
  -- pode ter sido reescrita no caminho, e os esquemas `javascript:`/`data:`
  -- viram link clicável na tela de quem confere a procedência.
  if v_url !~ '^https://[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+(:[0-9]{1,5})?(/|$)' then
    raise exception 'O endereço da publicação precisa ser um https:// do site do sindicato.';
  end if;
  if length(v_url) > 2000 then
    raise exception 'O endereço da publicação é longo demais.';
  end if;

  if v_arquivo is not null and v_arquivo !~ '^[a-f0-9]{64}$' then
    raise exception 'O SHA-256 do arquivo, quando informado, tem 64 dígitos hexadecimais.';
  end if;

  v_source_key := 'SINDUSCON_' || v_uf || '_CUB';

  -- A procedência que o servidor **pode** atestar: o digest da declaração
  -- canônica. Não é o hash do arquivo — o servidor não viu arquivo nenhum — e
  -- por isso não é o chamador quem o fornece. Recalculável a partir da linha.
  v_declaracao := concat_ws('|',
    'declaracao-manual-v1',
    v_source_key, v_uf, v_codigo,
    p_base_date::text,
    p_tax_relief::text,
    to_char(p_total_cost, 'FM99999999990.0000'),
    coalesce(to_char(p_materials_cost, 'FM99999999990.0000'), ''),
    coalesce(to_char(p_labor_cost, 'FM99999999990.0000'), ''),
    coalesce(to_char(p_administrative_cost, 'FM99999999990.0000'), ''),
    v_url,
    coalesce(v_arquivo, '')
  );
  v_sha := encode(extensions.digest(v_declaracao, 'sha256'), 'hex');

  -- Registrar duas vezes a mesma coisa é acidente comum (voltar no navegador,
  -- clicar duas vezes) e não é erro: devolve a linha que já existe. Registrar
  -- **outro valor** para a mesma competência é outra coisa — seria trocar em
  -- silêncio uma referência que orçamentos já podem estar usando, e a T-37.12
  -- existe justamente para isso não acontecer por `update`.
  select * into v_existente
  from public.cost_reference_snapshots
  where source_key = v_source_key
    and region = v_uf
    and reference_code = v_codigo
    and base_date = p_base_date
    and tax_relief = coalesce(p_tax_relief, false);

  if found then
    if v_existente.source_sha256 = v_sha then
      return v_existente.id;
    end if;
    raise exception 'Já existe CUB % de % para % em %, com valor de %. Uma referência publicada não é substituída por outra declaração.',
      v_codigo, to_char(p_base_date, 'MM/YYYY'), v_uf,
      case when coalesce(p_tax_relief, false) then 'regime desonerado' else 'regime sem desoneração' end,
      to_char(v_existente.total_cost, 'FM999999990.00');
  end if;

  insert into public.cost_reference_snapshots(
    source_key, source_name, region, reference_code,
    base_date, publication_date, tax_relief, unit,
    total_cost, materials_cost, labor_cost, administrative_cost, equipment_cost,
    source_url, source_sha256, raw_payload
  ) values (
    v_source_key, v_fonte, v_uf, v_codigo,
    p_base_date, p_publication_date, coalesce(p_tax_relief, false), 'm²',
    p_total_cost, p_materials_cost, p_labor_cost, p_administrative_cost, null,
    v_url, v_sha,
    jsonb_build_object(
      -- É isto que a tela lê para não mostrar uma declaração com a cara de uma
      -- leitura conferida.
      'retrievalMode', 'declaracao-manual',
      'declaradoPor', auth.uid(),
      'declaradoPelaOrganizacao', p_organization_id,
      'declaradoEm', now(),
      'arquivoSha256Declarado', v_arquivo,
      'evidence', v_fonte || ' — declaração manual'
    )
  ) returning id into v_id;

  -- WARNING, e não INFO: entrou no catálogo oficial um número que ninguém leu
  -- de arquivo nenhum. É legítimo e é o único caminho hoje — e é exatamente por
  -- isso que precisa aparecer na auditoria sem ninguém procurar.
  perform public.record_audit_event(
    p_organization_id, 'orcamentos', 'cost.reference.manual.register',
    'cost_reference_snapshot', v_id, 'CREATE', 'SUCCESS', 'WARNING', 'APPLICATION',
    format('CUB %s de %s declarado à mão para %s.', v_codigo, to_char(p_base_date, 'MM/YYYY'), v_uf),
    null,
    jsonb_build_object(
      'region', v_uf, 'referenceCode', v_codigo, 'baseDate', p_base_date,
      'taxRelief', coalesce(p_tax_relief, false), 'totalCost', p_total_cost,
      'sourceName', v_fonte, 'sourceUrl', v_url
    ),
    jsonb_build_object('retrievalMode', 'declaracao-manual', 'arquivoSha256Declarado', v_arquivo),
    null, null, null, null, null, 'INTERNAL', null, null
  );

  return v_id;
end;
$function$;

revoke all on function public.registrar_cub_manual(uuid,text,text,date,boolean,numeric,numeric,numeric,numeric,text,text,date,text) from public, anon;
grant execute on function public.registrar_cub_manual(uuid,text,text,date,boolean,numeric,numeric,numeric,numeric,text,text,date,text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Conferências desta migration.
-- ---------------------------------------------------------------------------
do $$
declare
  v_faltando text[];
begin
  if array_length(public.tipologias_do_cub(), 1) <> 19 then
    raise exception 'As tipologias do CUB deixaram de ser dezenove.';
  end if;
  if array_length(public.ufs_do_brasil(), 1) <> 27 then
    raise exception 'As UFs deixaram de ser vinte e sete.';
  end if;

  -- A guarda protege as 27 chaves de CUB, não só a paulista.
  if not public.fonte_de_custo_oficial('SINDUSCON_MG_CUB')
     or not public.fonte_de_custo_oficial('SINDUSCON_SP_CUB')
     or not public.fonte_de_custo_oficial('SINAPI_CAIXA') then
    raise exception 'A guarda deixou de reconhecer uma fonte oficial.';
  end if;
  -- E não protege o que só se parece com uma: `PROPRIA` continua editável, que
  -- é o ponto de a forma ser ancorada nas duas pontas.
  if public.fonte_de_custo_oficial('PROPRIA')
     or public.fonte_de_custo_oficial('PROPRIA_SINDUSCON_MG_CUB')
     or public.fonte_de_custo_oficial('SINDUSCON_MG_CUB_FALSA')
     or public.fonte_de_custo_oficial('SINDUSCON_MINAS_CUB')
     or public.fonte_de_custo_oficial(null) then
    raise exception 'A guarda passou a tratar fonte própria como oficial.';
  end if;

  -- Toda linha de CUB já gravada continua coberta pela guarda depois da troca
  -- de lista para forma. Se alguma escapar, a proteção teria sido reduzida
  -- justamente por quem veio ampliá-la.
  select array_agg(distinct source_key) into v_faltando
  from public.cost_reference_snapshots
  where not public.fonte_de_custo_oficial(source_key);
  if v_faltando is not null then
    raise exception 'Fontes de custo já gravadas ficaram fora da guarda: %', v_faltando;
  end if;
end $$;

commit;
