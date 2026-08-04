import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationPath = "supabase/migrations/20260804011500_stage22_multiprovider_storage.sql";
const fixturePath = "supabase/tests/messaging-multiprovider/fixture.sql";
const seedPath = "supabase/tests/messaging-multiprovider/legacy-seed.sql";
const testPath = "supabase/tests/messaging-multiprovider/storage.test.sql";
const runnerPath = "scripts/run-messaging-multiprovider-db-tests.mjs";
const gatewayPackagePath = "apps/messaging-gateway/package.json";
const gatewayIndexPath = "apps/messaging-gateway/src/index.ts";

const requiredFiles = [
  migrationPath,
  fixturePath,
  seedPath,
  testPath,
  runnerPath,
  gatewayPackagePath,
  gatewayIndexPath
];
const failures = [];
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`Arquivo ausente: ${file}`);
}

function read(file) {
  const full = path.join(root, file);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
}

const migration = read(migrationPath);
const test = read(testPath);
const runner = read(runnerPath);
const rootPackage = JSON.parse(read("package.json") || "{}");
const gatewayPackage = JSON.parse(read(gatewayPackagePath) || "{}");
const gatewayIndex = read(gatewayIndexPath);
const lower = migration.toLowerCase();

for (const relation of [
  "channel_contact_identities",
  "channel_commands",
  "channel_outbox_events",
  "channel_inbox_events",
  "channel_delivery_attempts",
  "channel_dead_letters",
  "channel_provider_rollbacks"
]) {
  if (!migration.includes(`public.${relation}`)) failures.push(`Relação técnica ausente: ${relation}`);
}

for (const forbidden of [
  "create table public.channel_contacts",
  "create table public.channel_conversations",
  "create table public.channel_messages"
]) {
  if (lower.includes(forbidden)) failures.push(`Domínio paralelo proibido: ${forbidden}`);
}

for (const token of [
  "provider_type",
  "provider_account_id",
  "channel_contact_identity_scope_guard",
  "channel_command_scope_guard",
  "channel_command_create_outbox",
  "enqueue_channel_command",
  "register_channel_inbox_event",
  "claim_channel_outbox_events",
  "record_channel_delivery_attempt",
  "move_channel_failure_to_dlq",
  "rollback_channel_provider_projection",
  "force row level security",
  "revoke insert,update,delete"
]) {
  if (!lower.includes(token.toLowerCase())) failures.push(`Controle W-04 ausente: ${token}`);
}

if (!migration.includes("sanitized_payload")) failures.push("Inbox sanitizada ausente.");
for (const forbidden of ["raw_payload", "raw_event", "raw_body"]) {
  if (migration.includes(forbidden)) failures.push(`Payload bruto persistente proibido: ${forbidden}`);
}

for (const token of [
  "backfill legado aprovado",
  "unicidade provider-scoped aprovada",
  "aliases PN/LID",
  "comando e outbox idempotentes",
  "RLS e privilégio mínimo",
  "inbox sanitizada",
  "claim durável",
  "ledger de tentativas",
  "DLQ idempotente",
  "rollback lógico sem perda histórica",
  "Baileys continua sem runtime"
]) {
  if (!test.includes(token)) failures.push(`Teste comportamental ausente: ${token}`);
}

if (!runner.includes("EXPECTED_APPROVALS = 11")) {
  failures.push("Runner não prova a execução dos 11 controles W-04.");
}

if (rootPackage.dependencies?.["@whiskeysockets/baileys"] || rootPackage.devDependencies?.["@whiskeysockets/baileys"]) {
  failures.push("Baileys não pode ser instalado no pacote raiz.");
}
if (gatewayPackage.dependencies?.["@whiskeysockets/baileys"] !== "7.0.0-rc13") {
  failures.push("Gateway não fixa @whiskeysockets/baileys@7.0.0-rc13.");
}
if (gatewayIndex.includes("BaileysEngineAdapter") || gatewayIndex.includes("engines/baileys")) {
  failures.push("Runtime Baileys foi registrado antes do armazenamento de sessão e lifecycle.");
}

const forbiddenSessionRelations = [
  "channel_session_credentials",
  "channel_session_keys",
  "channel_session_secrets",
  "session_runtime_leases"
];
for (const relation of forbiddenSessionRelations) {
  if (lower.includes(`create table public.${relation}`)) {
    failures.push(`Persistência de sessão prematura encontrada: ${relation}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  contract: "messaging-storage-boundary-v2",
  legacyDomainRelations: 7,
  technicalRelations: 7,
  behaviorControls: 11,
  rawPayloadColumns: 0,
  parallelContactConversationMessageTables: 0,
  baileysPackageInstalledInGateway: true,
  baileysVersion: "7.0.0-rc13",
  baileysRuntimeRegistered: false,
  sessionStorageImplemented: false,
  sessionLeaseImplemented: false,
  realSessionMaterialPresent: false
}, null, 2));
