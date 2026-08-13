import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { recusarBancoDaPlataforma } from "./banco-alvo.mjs";

const files = [
  "supabase/tests/messaging-multiprovider/fixture.sql",
  "supabase/tests/messaging-multiprovider/legacy-seed.sql",
  "supabase/migrations/20260804011500_stage22_multiprovider_storage.sql",
  "supabase/migrations/20260804142000_stage22_ingress_normalization.sql",
  "supabase/tests/messaging-ingress/ingress.test.sql"
];
for (const file of files) {
  if (!fs.existsSync(file)) {
    console.error(`Arquivo ausente: ${file}`);
    process.exit(1);
  }
}

const url = process.env.DATABASE_URL ?? "";
// Banco descartável: este script cria e derruba um banco no servidor apontado
// por DATABASE_URL. Alcançar um projeto Supabase aqui não é alvo errado — é
// `drop database` no lugar errado (S-79).
recusarBancoDaPlataforma(url);
const database = process.env.MESSAGING_INGRESS_TEST_DB ?? "messaging_ingress_test";
function psql(args) {
  return execFileSync("psql", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}
function psqlWithNotices(args) {
  const escaped = args.map(value => `'${String(value).replaceAll("'", "'\\''")}'`).join(" ");
  return execFileSync("bash", ["-c", `psql ${escaped} 2>&1`], { encoding: "utf8" });
}
function details(error) {
  if (!(error instanceof Error)) return String(error);
  const candidate = error;
  return [candidate.message, candidate.stdout, candidate.stderr]
    .filter(value => typeof value === "string" && value.trim())
    .join("\n");
}

let connection;
try {
  if (url) {
    connection = ["-d", url];
    psql([...connection, "-tAc", "select 1"]);
  } else {
    psql(["-U", "postgres", "-d", "postgres", "-tAc", `drop database if exists ${database}`]);
    psql(["-U", "postgres", "-d", "postgres", "-tAc", `create database ${database}`]);
    connection = ["-U", "postgres", "-d", database];
  }
} catch (error) {
  console.error("PostgreSQL indisponível: testes W-09 NÃO foram executados.");
  console.error(details(error));
  process.exit(1);
}

let approvals = 0;
try {
  for (const file of files) {
    const output = psqlWithNotices([...connection, "-v", "ON_ERROR_STOP=1", "-q", "-f", file]);
    for (const line of output.split("\n")) {
      const value = line.trim();
      if (!value) continue;
      console.log(value);
      if (/W-09 .*aprovad/i.test(value)) approvals += 1;
    }
  }
} catch (error) {
  console.error(details(error));
  console.error("Testes PostgreSQL W-09 reprovados.");
  process.exit(1);
}

const EXPECTED_APPROVALS = 12;
if (approvals !== EXPECTED_APPROVALS) {
  console.error(`A suíte W-09 produziu ${approvals} confirmações; esperado ${EXPECTED_APPROVALS}.`);
  process.exit(1);
}
console.log(`Testes PostgreSQL W-09 aprovados: ${approvals} controles.`);
