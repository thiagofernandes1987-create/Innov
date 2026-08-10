import { execFileSync } from "node:child_process";
import fs from "node:fs";

const files = [
  "supabase/tests/messaging-multiprovider/fixture.sql",
  "supabase/tests/messaging-multiprovider/legacy-seed.sql",
  "supabase/migrations/20260804011500_stage22_multiprovider_storage.sql",
  "supabase/migrations/20260804142000_stage22_ingress_normalization.sql",
  "supabase/migrations/20260804170000_stage22_secure_media.sql",
  "supabase/tests/messaging-media/media.test.sql"
];
for (const file of files) if (!fs.existsSync(file)) throw new Error(`Arquivo ausente: ${file}`);
const database = process.env.MESSAGING_MEDIA_TEST_DB ?? "messaging_media_test";
const run = args => execFileSync("psql", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const notices = args => {
  const escaped = args.map(value => `'${String(value).replaceAll("'", "'\\''")}'`).join(" ");
  return execFileSync("bash", ["-c", `psql ${escaped} 2>&1`], { encoding: "utf8" });
};
const details = error => error instanceof Error
  ? [error.message, error.stdout, error.stderr].filter(value => typeof value === "string" && value.trim()).join("\n")
  : String(error);
let connection;
try {
  run(["-U", "postgres", "-d", "postgres", "-tAc", `drop database if exists ${database}`]);
  run(["-U", "postgres", "-d", "postgres", "-tAc", `create database ${database}`]);
  connection = ["-U", "postgres", "-d", database];
} catch (error) {
  console.error("PostgreSQL indisponível: W-12 NÃO executada.");
  console.error(details(error));
  process.exit(1);
}
let approvals = 0;
try {
  for (const file of files) {
    const output = notices([...connection, "-v", "ON_ERROR_STOP=1", "-q", "-f", file]);
    for (const line of output.split("\n")) {
      const value = line.trim();
      if (!value) continue;
      console.log(value);
      if (/W-12 .*aprovad/i.test(value)) approvals += 1;
    }
  }
} catch (error) {
  console.error(details(error));
  process.exit(1);
}
if (approvals !== 10) {
  console.error(`W-12 produziu ${approvals}/10 confirmações.`);
  process.exit(1);
}
console.log("Testes PostgreSQL W-12 aprovados: 10 controles.");
