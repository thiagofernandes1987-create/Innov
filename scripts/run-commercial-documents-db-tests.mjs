import fs from "node:fs";
import { runPostgresFiles } from "./lib/postgres-test-container.mjs";

// VACINA-014: o ensaio descobre as migrations do domínio na mesma ordem do
// Supabase. O replay integral tem fixture própria; este runner isola estágio 9
// e o complemento documental para localizar a causa de uma falha no fluxo.
const migrations = fs.readdirSync("supabase/migrations")
  .filter(file => /_(stage9_|workflow_documental_descobrivel).*\.sql$/.test(file))
  .sort()
  .map(file => `supabase/migrations/${file}`);

runPostgresFiles({
  containerPrefix: "innov-commercial-documents",
  database: "commercial_documents_test",
  files: [
    "supabase/tests/replay/bootstrap.sql",
    ...migrations,
    "supabase/tests/commercial-documents/workflow.test.sql"
  ],
  expectedApprovals: 3,
  successMessage: "Testes de proposta, PDF, contrato e aditivo aprovados."
});
