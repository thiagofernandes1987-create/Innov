import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { recusarBancoDaPlataforma } from "./banco-alvo.mjs";

const files = [
  "supabase/tests/messaging-multiprovider/fixture.sql",
  "supabase/tests/messaging-multiprovider/legacy-seed.sql",
  "supabase/migrations/20260804011500_stage22_multiprovider_storage.sql",
  "supabase/migrations/20260804123000_stage22_session_credential_store.sql",
  "supabase/migrations/20260804123500_stage22_session_credential_store_function_fix.sql",
  "supabase/migrations/20260804134000_stage22_session_runtime_leases.sql",
  "supabase/tests/messaging-runtime-leases/lifecycle.test.sql"
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
const database = process.env.MESSAGING_RUNTIME_LEASE_TEST_DB ?? "messaging_runtime_lease_test";

function psql(args) {
  return execFileSync("psql", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function psqlWithNotices(args) {
  const escaped = args
    .map(argument => `'${String(argument).replaceAll("'", "'\\''")}'`)
    .join(" ");
  return execFileSync("bash", ["-c", `psql ${escaped} 2>&1`], {
    encoding: "utf8"
  });
}

function commandFailureDetails(error) {
  if (!(error instanceof Error)) return String(error);
  const stdout = typeof error.stdout === "string" ? error.stdout.trim() : "";
  const stderr = typeof error.stderr === "string" ? error.stderr.trim() : "";
  return [error.message, stdout, stderr].filter(Boolean).join("\n");
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
  console.error("PostgreSQL indisponível: testes W-08 NÃO foram executados.");
  console.error(commandFailureDetails(error));
  process.exit(1);
}

let failed = false;
let approvals = 0;
for (const file of files) {
  try {
    const output = psqlWithNotices([
      ...connection,
      "-v", "ON_ERROR_STOP=1",
      "-q",
      "-f", file
    ]);
    for (const line of output.split("\n")) {
      const value = line.trim();
      if (!value) continue;
      console.log(value);
      if (/^ERROR:|^FATAL:/.test(value)) failed = true;
      if (/W-08 .*aprovad/i.test(value)) approvals += 1;
    }
    if (failed) break;
  } catch (error) {
    failed = true;
    console.error(`Falha ao aplicar ${file}:\n${commandFailureDetails(error)}`);
    break;
  }
}

const EXPECTED_APPROVALS = 12;
if (!failed && approvals < EXPECTED_APPROVALS) {
  console.error(
    `A suíte produziu ${approvals} confirmação(ões) de ${EXPECTED_APPROVALS}; testes podem não ter executado.`
  );
  process.exit(1);
}
if (failed) {
  console.error("Testes de banco de runtime W-08 reprovados.");
  process.exit(1);
}
console.log(`Testes de banco de runtime W-08 aprovados: ${approvals} controles.`);
