import fs from "node:fs";
import { runPostgresFiles } from "./lib/postgres-test-container.mjs";

// VACINA-014: descobre migrations do domínio e da Rodada 02 sem lista fixa.
const migrations = fs.readdirSync("supabase/migrations")
  .filter(file => /_(stage9_|budget_readiness_and_cost_sources|seed_sinduscon_sp_cub|budget_item_categories|budget_next_version|sinapi_official_catalog|sinapi_authenticated_rpcs_invoker|sinapi_import_fk_indexes|sinapi_automatic_update_guard).*\.sql$/.test(file))
  .sort()
  .map(file => `supabase/migrations/${file}`);

// Cada cenário possui uma evidência nominal. O contador não aceita qualquer
// NOTICE genérico e continua exigindo as seis confirmações do domínio.
const budgetApprovalPattern = /NOTICE:.*(Orçamento vazio bloqueado|Material, mão de obra, custo fixo, impostos e margem aprovados|Autoaprovação de orçamento bloqueada|Aprovação independente registrada|Nova versão editável preserva|Importação, busca, composição, orçamento e guardas SINAPI aprovados)/i;

runPostgresFiles({
  containerPrefix: "innov-budget-readiness",
  database: "budget_readiness_test",
  files: [
    "supabase/tests/replay/bootstrap.sql",
    ...migrations,
    "supabase/tests/budgets/readiness.test.sql",
    "supabase/tests/budgets/next-version.test.sql",
    "supabase/tests/budgets/sinapi.test.sql"
  ],
  approvalPattern: budgetApprovalPattern,
  expectedApprovals: 6,
  successMessage: "Testes de composição, fontes, margem, aprovação, versões e SINAPI aprovados."
});
