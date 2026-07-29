import fs from "node:fs";
import { runPostgresFiles } from "./lib/postgres-test-container.mjs";

// VACINA-014: descobre migrations do domínio e da Rodada 02 sem lista fixa.
const migrations = fs.readdirSync("supabase/migrations")
  .filter(file => /_(stage9_|budget_readiness_and_cost_sources|seed_sinduscon_sp_cub|budget_item_categories).*\.sql$/.test(file))
  .sort()
  .map(file => `supabase/migrations/${file}`);

runPostgresFiles({
  containerPrefix: "innov-budget-readiness",
  database: "budget_readiness_test",
  files: [
    "supabase/tests/replay/bootstrap.sql",
    ...migrations,
    "supabase/tests/budgets/readiness.test.sql"
  ],
  expectedApprovals: 4,
  successMessage: "Testes de composição, fontes, margem e aprovação de orçamento aprovados."
});
