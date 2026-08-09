import fs from "node:fs";
import { runPostgresFiles } from "./lib/postgres-test-container.mjs";

const migrations=fs.readdirSync("supabase/migrations")
  .filter(name=>/_rh_.*\.sql$/.test(name))
  .sort()
  .map(name=>`supabase/migrations/${name}`);

if(migrations.length===0)throw new Error("Nenhuma migration RH encontrada.");
console.log(`Migrations RH no encadeamento: ${migrations.length}`);

runPostgresFiles({
  containerPrefix:"innov-rh-tests",
  database:"rh_test",
  files:[
    "supabase/tests/rh/fixture.sql",
    ...migrations,
    "supabase/tests/rh/payroll-v1.test.sql",
    "supabase/tests/rh/structure.test.sql",
    "supabase/tests/rh/admission.test.sql",
    "supabase/tests/rh/payroll-v2.test.sql",
    "supabase/tests/rh/payroll-regulatory-config.test.sql",
    "supabase/tests/rh/payroll-irrf-2026.test.sql",
    "supabase/tests/rh/mit-json.test.sql",
    "supabase/tests/rh/payroll-shadow.test.sql",
    "supabase/tests/rh/benefits-documents.test.sql",
    "supabase/tests/rh/tsv-esocial.test.sql",
    "supabase/tests/rh/fk-postgrest.test.sql"
  ],
  expectedApprovals:11,
  successMessage:"Verticais RH empregado/estrutura/admissão/folha V1/V2/regulatório/IRRF 2026/MIT/folha sombra/benefícios/documentos/TSVE/PostgREST aprovadas."
});
