import fs from "node:fs";
import path from "node:path";

const migrationsDirectory = path.join(process.cwd(), "supabase", "migrations");
const migrationFiles = fs
  .readdirSync(migrationsDirectory)
  .filter((file) => file.endsWith(".sql"))
  .sort((left, right) => left.localeCompare(right));

const latestDefinitions = new Map();
const functionPattern = /create\s+or\s+replace\s+function\s+public\.([a-zA-Z0-9_]+)[\s\S]*?as\s+(\$[a-zA-Z0-9_]*\$)([\s\S]*?)\2\s*;/gi;

for (const file of migrationFiles) {
  const sql = fs.readFileSync(path.join(migrationsDirectory, file), "utf8");
  for (const match of sql.matchAll(functionPattern)) {
    latestDefinitions.set(match[1], {
      file,
      definition: match[0],
      body: match[3]
    });
  }
}

const failures = [];
const checked = [];

for (const [name, entry] of latestDefinitions) {
  if (!/security\s+definer/i.test(entry.definition)) continue;
  if (!/(^|[^.\w])digest\s*\(/i.test(entry.body)) continue;

  checked.push({ name, file: entry.file });
  failures.push(
    `${name} em ${entry.file} usa digest() sem o schema extensions (VACINA-032).`
  );
}

const expectedCorrectedFunctions = [
  "sandbox_signature_event_core",
  "create_report_snapshot"
];

for (const name of expectedCorrectedFunctions) {
  const entry = latestDefinitions.get(name);
  if (!entry) {
    failures.push(`Definição final ausente para ${name}.`);
    continue;
  }
  if (!/extensions\.digest\s*\(/i.test(entry.body)) {
    failures.push(`${name} não usa extensions.digest() na definição final.`);
  }
}

if (failures.length > 0) {
  console.error(
    JSON.stringify(
      {
        status: "failed",
        vaccine: "VACINA-032",
        migrationCount: migrationFiles.length,
        checked,
        failures
      },
      null,
      2
    )
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      vaccine: "VACINA-032",
      migrationCount: migrationFiles.length,
      correctedFunctions: expectedCorrectedFunctions
    },
    null,
    2
  )
);
