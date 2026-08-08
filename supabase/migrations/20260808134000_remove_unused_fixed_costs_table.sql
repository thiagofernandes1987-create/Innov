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

drop table if exists public.fixed_costs;

commit;
