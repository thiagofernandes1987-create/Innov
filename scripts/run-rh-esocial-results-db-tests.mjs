import fs from "node:fs";
import { runPostgresFiles } from "./lib/postgres-test-container.mjs";

const migrations=fs.readdirSync("supabase/migrations")
  .filter(name=>/_rh_.*\.sql$/.test(name))
  .sort()
  .map(name=>`supabase/migrations/${name}`);

runPostgresFiles({
  containerPrefix:"innov-rh-esocial-results",
  database:"rh_esocial_results_test",
  files:[
    "supabase/tests/rh/fixture.sql",
    ...migrations,
    "supabase/tests/rh/esocial-individual-results.test.sql"
  ],
  expectedApprovals:1,
  successMessage:"Resultados individuais eSocial aprovados."
});
