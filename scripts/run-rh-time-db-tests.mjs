import fs from "node:fs";
import { runPostgresFiles } from "./lib/postgres-test-container.mjs";
const migrations=fs.readdirSync("supabase/migrations").filter(name=>/_rh_.*\.sql$/.test(name)).sort().map(name=>`supabase/migrations/${name}`);
runPostgresFiles({containerPrefix:"innov-rh-time",database:"rh_time_test",files:["supabase/tests/rh/fixture.sql",...migrations,"supabase/tests/rh/time-v1-executable.test.sql"],expectedApprovals:1,successMessage:"Jornada/ponto e exportação para folha aprovados."});
