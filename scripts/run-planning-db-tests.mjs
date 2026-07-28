import fs from "node:fs";
import { runPostgresFiles } from "./lib/postgres-test-container.mjs";

// VACINA-014: migrations de planejamento entram por descoberta, em ordem.
const migrations = fs.readdirSync("supabase/migrations")
  .filter(name => /_stage12_planning_schema\.sql$|_planejamento_.*\.sql$/.test(name))
  .sort()
  .map(name => `supabase/migrations/${name}`);

if (migrations.length === 0) {
  throw new Error("Nenhuma migration de planejamento encontrada.");
}
console.log(`Migrations de planejamento no encadeamento: ${migrations.length}`);

runPostgresFiles({
  containerPrefix: "innov-planning-tests",
  database: "planning_test",
  files: [
    "supabase/tests/pipeline/fixture.sql",
    "supabase/tests/planejamento/fixture.sql",
    ...migrations,
    "supabase/tests/planejamento/dependencias.test.sql"
  ],
  expectedApprovals: 1,
  successMessage: "Testes de dependência de cronograma aprovados."
});
