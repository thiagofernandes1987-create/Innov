import { execFileSync } from "node:child_process";
import fs from "node:fs";

const validatorPattern = /^validate-messaging-w(?:1[1-9]|2[0-2])-.+\.mjs$/;
const databasePattern = /^run-messaging-w(?:1[1-9]|2[0-2])-.+-db-tests\.mjs$/;

function selected(pattern) {
  return fs.readdirSync("scripts")
    .filter(file => pattern.test(file))
    .sort();
}

const files = [...selected(validatorPattern), ...selected(databasePattern)];
if (files.length === 0) {
  console.error("Nenhum gate incremental W-11+ encontrado.");
  process.exit(1);
}

for (const file of files) {
  console.log(`\n==> ${file}`);
  execFileSync(process.execPath, [`scripts/${file}`], {
    stdio: "inherit",
    env: process.env
  });
}

console.log(`\nGates incrementais aprovados: ${files.length}.`);
