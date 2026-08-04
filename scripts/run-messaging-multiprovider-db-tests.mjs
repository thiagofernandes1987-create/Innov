import { execFileSync } from "node:child_process";
import fs from "node:fs";

const files = [
  "supabase/tests/messaging-multiprovider/fixture.sql",
  "supabase/tests/messaging-multiprovider/legacy-seed.sql",
  "supabase/migrations/20260804011500_stage22_multiprovider_storage.sql",
  "supabase/tests/messaging-multiprovider/storage.test.sql"
];

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.error(`Arquivo ausente: ${file}`);
    process.exit(1);
  }
}

const url = process.env.DATABASE_URL ?? "";
const database = process.env.MESSAGING_MULTIPROVIDER_TEST_DB ?? "messaging_multiprovider_test";

function psql(args) {
  return execFileSync("psql", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function psqlWithNotices(args) {
  const escaped = args.map(argument => `'${String(argument).replaceAll("'", "'\\''")}'`).join(" ");
  return execFileSync("bash", ["-c", `psql ${escaped} 2>&1`], {
    encoding: "utf8"
  });
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
  console.log("PostgreSQL indisponível: testes multiprovider NÃO foram executados.");
  console.log(`Motivo: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
  process.exit(0);
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
      const text = line.trim();
      if (!text) continue;
      console.log(text);
      if (/^ERROR:|^FATAL:/.test(text)) failed = true;
      if (/W-04 .*aprovad/i.test(text)) approvals += 1;
    }
    if (failed) break;
  } catch (error) {
    failed = true;
    console.error(`Falha ao aplicar ${file}:\n${error instanceof Error ? error.message : String(error)}`);
    break;
  }
}

const EXPECTED_APPROVALS = 11;
if (!failed && approvals < EXPECTED_APPROVALS) {
  console.error(
    `A suíte produziu ${approvals} confirmação(ões) de ${EXPECTED_APPROVALS}; testes podem não ter executado.`
  );
  process.exit(1);
}

if (failed) {
  console.error("Testes de banco multiprovider reprovados.");
  process.exit(1);
}

console.log(`Testes de banco multiprovider aprovados: ${approvals} controles.`);
