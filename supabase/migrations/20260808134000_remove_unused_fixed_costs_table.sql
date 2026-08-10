begin;

-- O modelo atual representa custos fixos como linhas de budget_items com
-- cost_type='FIXED'. A tabela fixed_costs ficou como artefato do desenho Stage 9
-- e não possui dados, consumidores de aplicação, views, funções SQL ou FKs de
-- entrada. A policy e o trigger pertencem exclusivamente à própria tabela e são
-- removidos junto com ela.
--
-- Importante: a chave de assumptions `fixed_costs_in_bdi` permanece válida; ela
-- protege contra dupla contagem do total FIXED calculado a partir de
-- budget_items e não depende desta tabela legada.
--
-- Revalidamos no deploy as duas premissas que poderiam causar perda/quebra:
-- nenhuma linha pode ter aparecido e nenhuma função pública pode ter voltado a
-- referenciar o identificador standalone `fixed_costs`. O regex por palavra não
-- confunde a chave `fixed_costs_in_bdi` com a tabela.
do $$
declare
  v_has_rows boolean := false;
  v_function_ref text;
begin
  if to_regclass('public.fixed_costs') is not null then
    execute 'select exists (select 1 from public.fixed_costs)'
      into v_has_rows;

    if v_has_rows then
      raise exception
        'fixed_costs ganhou dados após a auditoria; migre/reclassifique antes do DROP';
    end if;

    select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
      into v_function_ref
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and pg_get_functiondef(p.oid) ~ '\mfixed_costs\M'
    limit 1;

    if v_function_ref is not null then
      raise exception
        'fixed_costs voltou a ser referenciada por %; reclassifique antes do DROP',
        v_function_ref;
    end if;
  end if;
end;
$$;

drop table if exists public.fixed_costs;

commit;
