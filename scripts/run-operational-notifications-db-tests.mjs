import fs from "node:fs";
import { runPostgresFiles } from "./lib/postgres-test-container.mjs";

// VACINA-014: toda migration operacional entra no ensaio em ordem.
const operationalMigrations = fs.readdirSync("supabase/migrations")
  .filter(file => /^\d+_operational_.*\.sql$/.test(file))
  .sort()
  .map(file => `supabase/migrations/${file}`);

if (operationalMigrations.length === 0) {
  throw new Error("Nenhuma migration operacional descoberta.");
}

runPostgresFiles({
  containerPrefix: "innov-operational-tests",
  database: "operations_test",
  files: [
    "supabase/tests/operations/fixture.sql",
    ...operationalMigrations,
    "supabase/tests/operations/notifications.test.sql"
  ],
  expectedApprovals: 1,
  successMessage: "Testes operacionais de evento, RLS e notificação aprovados."
});
