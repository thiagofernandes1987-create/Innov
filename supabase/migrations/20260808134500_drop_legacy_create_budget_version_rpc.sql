begin;

-- A criação de revisão atual usa create_next_budget_version, que copia a árvore
-- completa de seções, itens, cenários, referência e markup. A RPC antiga
-- create_budget_version ficou sem consumidor no runtime e mantém um contrato
-- anterior/incompleto para a mesma operação.
--
-- Auditoria 2026-08-08: nenhum objeto do Postgres depende diretamente desta
-- função e o runtime web não a chama.
--
-- Antes do DROP, exigimos que a porta canônica exista e continue executável por
-- authenticated. O DROP usa RESTRICT implícito, portanto qualquer dependência
-- nova do contrato antigo bloqueia a migration.
do $$
declare
  v_next oid;
begin
  v_next := to_regprocedure('public.create_next_budget_version(uuid,text)');

  if v_next is null then
    raise exception
      'create_next_budget_version ausente; não é seguro remover create_budget_version';
  end if;

  if not has_function_privilege('authenticated', v_next, 'EXECUTE') then
    raise exception
      'create_next_budget_version deixou de ser executável por authenticated; reclassifique antes do DROP';
  end if;
end;
$$;

drop function if exists public.create_budget_version(
  uuid, text, public.budget_scenario_type
);

commit;
