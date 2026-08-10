import fs from "node:fs";
import { runPostgresFiles } from "./lib/postgres-test-container.mjs";

const migrations=fs.readdirSync("supabase/migrations")
  .filter(name=>/_rh_.*\.sql$/.test(name))
  .sort()
  .map(name=>`supabase/migrations/${name}`);

runPostgresFiles({
  containerPrefix:"innov-rh-government",
  database:"rh_government_test",
  files:[
    "supabase/tests/rh/fixture.sql",
    ...migrations,
    "supabase/tests/rh/dctfweb-fgts.test.sql"
  ],
  expectedApprovals:1,
  successMessage:"DCTFWeb e FGTS Digital operacionais aprovados."
});
