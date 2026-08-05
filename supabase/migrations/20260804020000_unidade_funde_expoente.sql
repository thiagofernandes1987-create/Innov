-- Unidade de medida: `m²` e `m2` viram uma linha só.
--
-- T-33.15. São a mesma unidade escrita de dois jeitos, e as duas vão ser
-- digitadas: uma sai do teclado do telefone, a outra de quem sabe o atalho.
-- Sem fundir, a mesma unidade ocupa duas linhas da sugestão e a contagem de
-- área fica dividida em duas.
--
-- **Só neste escopo.** Fundir expoente globalmente re-escreveria o sentido de
-- toda chave já gravada: "H²" no nome de uma etapa é o nome da etapa, não uma
-- unidade escrita torto. A regra em TypeScript está em `chaveDoEscopo`, e esta
-- migration é o outro lado dela — a chave já gravada precisa passar a valer
-- pela regra nova, senão a linha antiga vira órfã da própria regra.
--
-- A tradução cobre expoente e índice, que é o que o NFKD do TypeScript resolve
-- para os mesmos casos: ⁰¹²³⁴⁵⁶⁷⁸⁹ e ₀₁₂₃₄₅₆₇₈₉.
--
-- A chave da tabela é `(organization_id, scope, normalized)` — não há coluna
-- de id. Fundir é agregar sobre a chave nova e reinserir, e não atualizar
-- linha a linha: `update` em coluna de chave primária esbarraria na própria
-- unicidade no meio do caminho.

do $$
declare
  v_antes integer;
  v_depois integer;
begin
  select count(*) into v_antes from public.value_catalog where scope = 'medida.unidade';

  create temporary table unidades_fundidas on commit drop as
  select organization_id,
         scope,
         translate(normalized, '⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉', '01234567890123456789') as normalized,
         -- A grafia que fica é a de uso mais recente: é a que a empresa usa
         -- hoje, e é a que ela reconhece na lista.
         (array_agg(label order by last_used_at desc, uses desc))[1] as label,
         sum(uses)::integer as uses,
         min(first_used_at) as first_used_at,
         max(last_used_at) as last_used_at
  from public.value_catalog
  where scope = 'medida.unidade'
  group by organization_id, scope,
           translate(normalized, '⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉', '01234567890123456789');

  delete from public.value_catalog where scope = 'medida.unidade';

  insert into public.value_catalog(
    organization_id, scope, normalized, label, uses, first_used_at, last_used_at
  )
  select organization_id, scope, normalized, label, uses, first_used_at, last_used_at
  from unidades_fundidas;

  select count(*) into v_depois from public.value_catalog where scope = 'medida.unidade';
  raise notice 'Unidades: % linha(s) antes, % depois (% fundida(s)).', v_antes, v_depois, v_antes - v_depois;

  -- Verificação embutida --------------------------------------------------
  if exists (
    select 1 from public.value_catalog
    where scope = 'medida.unidade'
      and normalized <> translate(normalized, '⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉', '01234567890123456789')
  ) then
    raise exception 'Sobrou chave de unidade com expoente.';
  end if;

  -- Nenhum uso pode ter sumido na fusão: somar é o ponto, perder seria trocar
  -- uma contagem dividida por uma contagem errada.
  if (select coalesce(sum(uses), 0) from public.value_catalog where scope = 'medida.unidade')
     <> (select coalesce(sum(uses), 0) from unidades_fundidas) then
    raise exception 'A soma de usos mudou na fusão.';
  end if;
end;
$$;
