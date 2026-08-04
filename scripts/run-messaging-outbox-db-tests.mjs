import { execFileSync } from "node:child_process";
import fs from "node:fs";

const files = [
  "supabase/tests/messaging-multiprovider/fixture.sql",
  "supabase/tests/messaging-multiprovider/legacy-seed.sql",
  "supabase/migrations/20260804011500_stage22_multiprovider_storage.sql",
  "supabase/migrations/20260804151000_stage22_outbox_delivery.sql",
  "supabase/migrations/20260804151500_stage22_outbox_delivery_compat.sql",
  "supabase/tests/messaging-outbox/outbox.test.sql"
];
for (const file of files) {
  if (!fs.existsSync(file)) {
    console.error(`Arquivo ausente: ${file}`);
    process.exit(1);
  }
}
const database = process.env.MESSAGING_OUTBOX_TEST_DB ?? "messaging_outbox_test";
const url = process.env.DATABASE_URL ?? "";
const run = args => execFileSync("psql", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const runNotices = args => {
  const escaped = args.map(value => `'${String(value).replaceAll("'", "'\\''")}'`).join(" ");
  return execFileSync("bash", ["-c", `psql ${escaped} 2>&1`], { encoding: "utf8" });
};
const details = error => error instanceof Error
  ? [error.message, error.stdout, error.stderr].filter(value => typeof value === "string" && value.trim()).join("\n")
  : String(error);
let connection;
try {
  if (url) {
    connection = ["-d", url];
    run([...connection, "-tAc", "select 1"]);
  } else {
    run(["-U", "postgres", "-d", "postgres", "-tAc", `drop database if exists ${database}`]);
    run(["-U", "postgres", "-d", "postgres", "-tAc", `create database ${database}`]);
    connection = ["-U", "postgres", "-d", database];
  }
} catch (error) {
  console.error("PostgreSQL indisponível: testes W-10 NÃO foram executados.");
  console.error(details(error));
  process.exit(1);
}
let approvals = 0;
try {
  for (const file of files) {
    const output = runNotices([...connection, "-v", "ON_ERROR_STOP=1", "-q", "-f", file]);
    for (const line of output.split("\n")) {
      const value = line.trim();
      if (!value) continue;
      console.log(value);
      if (/W-10 .*aprovad/i.test(value)) approvals += 1;
    }
  }
} catch (error) {
  console.error(details(error));
  console.error("Testes PostgreSQL W-10 reprovados.");
  process.exit(1);
}
const EXPECTED_APPROVALS = 14;
if (approvals !== EXPECTED_APPROVALS) {
  console.error(`A suíte W-10 produziu ${approvals} confirmações; esperado ${EXPECTED_APPROVALS}.`);
  process.exit(1);
}
console.log(`Testes PostgreSQL W-10 aprovados: ${approvals} controles.`);
