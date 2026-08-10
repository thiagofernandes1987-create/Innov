begin;

-- Limpeza destrutiva preparada pela auditoria de regressão de 2026-08-08/09.
-- NÃO aplicar antes do deploy do código compatível e do gate final da PR #44.
--
-- Evidência no banco ativo antes desta migration:
--   * contract_parties: 0 linhas, 0 FKs de entrada, 0 triggers, 0 funções e
--     0 views dependentes; o fluxo atual de assinatura usa a arquitetura
--     avançada de signatários e não popula esta tabela Stage 9;
--   * inventory_item_totals_v: 0 consumidores/dependentes; o dashboard atual
--     é produzido por get_inventory_dashboard com escopo de permissão;
--   * report_executive_kpis_v: 0 consumidores/dependentes; o dashboard atual
--     é produzido por get_report_dashboard a partir de report_project_kpis_v.
--
-- Segurança de deploy:
--   * contract_parties não é removida se ganhar qualquer registro antes da
--     aplicação desta migration;
--   * os DROP VIEW usam RESTRICT implícito (sem CASCADE), portanto uma nova
--     dependência criada depois da auditoria aborta o deploy em vez de apagá-la.

do $$
declare
  v_contract_parties_has_rows boolean := false;
begin
  if to_regclass('public.contract_parties') is not null then
    execute 'select exists (select 1 from public.contract_parties)'
      into v_contract_parties_has_rows;

    if v_contract_parties_has_rows then
      raise exception
        'contract_parties ganhou dados após a auditoria; reclassifique antes de remover';
    end if;
  end if;
end;
$$;

drop table if exists public.contract_parties;
drop view if exists public.inventory_item_totals_v;
drop view if exists public.report_executive_kpis_v;

commit;
