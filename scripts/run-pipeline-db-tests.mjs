import fs from "node:fs";
import { runPostgresFiles } from "./lib/postgres-test-container.mjs";

// VACINA-014: migrations do pipeline entram por descoberta, em ordem.
const migrations = fs.readdirSync("supabase/migrations")
  .filter(name => /_pipeline_.*\.sql$/.test(name))
  .sort()
  .map(name => `supabase/migrations/${name}`);

if (migrations.length === 0) {
  throw new Error("Nenhuma migration de pipeline encontrada.");
}
console.log(`Migrations de pipeline no encadeamento: ${migrations.length}`);

runPostgresFiles({
  containerPrefix: "innov-pipeline-tests",
  database: "pipeline_test",
  files: [
    "supabase/tests/pipeline/fixture.sql",
    ...migrations,
    "supabase/tests/pipeline/pipeline.test.sql"
  ],
  expectedApprovals: 2,
  successMessage: "Testes de banco do pipeline aprovados."
});
