begin;

-- A criação de revisão atual usa create_next_budget_version, que copia a árvore
-- completa de seções, itens, cenários, referência e markup. A RPC antiga
-- create_budget_version ficou sem consumidor no runtime e mantém um contrato
-- anterior/incompleto para a mesma operação.
--
-- Auditoria 2026-08-08: nenhum objeto do Postgres depende diretamente desta
-- função e o runtime web não a chama.
drop function if exists public.create_budget_version(
  uuid, text, public.budget_scenario_type
);

commit;
