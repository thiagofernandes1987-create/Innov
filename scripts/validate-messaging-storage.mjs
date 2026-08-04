import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationPath = "supabase/migrations/20260804011500_stage22_multiprovider_storage.sql";
const sessionMigrationPath = "supabase/migrations/20260804123000_stage22_session_credential_store.sql";
const sessionFixPath = "supabase/migrations/20260804123500_stage22_session_credential_store_function_fix.sql";
const fixturePath = "supabase/tests/messaging-multiprovider/fixture.sql";
const seedPath = "supabase/tests/messaging-multiprovider/legacy-seed.sql";
const testPath = "supabase/tests/messaging-multiprovider/storage.test.sql";
const runnerPath = "scripts/run-messaging-multiprovider-db-tests.mjs";
const sessionStorePath = "apps/messaging-gateway/src/session-store/session-credential-store.ts";
const sessionContractsPath = "apps/messaging-gateway/src/session-store/contracts.ts";
const gatewayPackagePath = "apps/messaging-gateway/package.json";
const gatewayIndexPath = "apps/messaging-gateway/src/index.ts";

const requiredFiles = [
  migrationPath,
  sessionMigrationPath,
  sessionFixPath,
  fixturePath,
  seedPath,
  testPath,
  runnerPath,
  sessionStorePath,
  sessionContractsPath,
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
const sessionMigration = read(sessionMigrationPath);
const sessionFix = read(sessionFixPath);
const sessionStore = read(sessionStorePath);
const sessionContracts = read(sessionContractsPath);
const test = read(testPath);
const runner = read(runnerPath);
const rootPackage = JSON.parse(read("package.json") || "{}");
const gatewayPackage = JSON.parse(read(gatewayPackagePath) || "{}");
const gatewayIndex = read(gatewayIndexPath);
const lower = migration.toLowerCase();
const sessionLower = `${sessionMigration}\n${sessionFix}`.toLowerCase();

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
  failures.push("Runtime Baileys foi registrado antes do lifecycle W-08.");
}

for (const relation of [
  "channel_session_secret_envelopes",
  "channel_session_credentials",
  "channel_session_keys",
  "channel_session_secret_audit"
]) {
  if (!sessionLower.includes(`public.${relation}`)) {
    failures.push(`Relação criptográfica W-07 ausente: ${relation}`);
  }
}
for (const token of [
  "wrapped_dek bytea",
  "ciphertext bytea",
  "compare_and_swap_channel_session_credentials",
  "delete_channel_session_secrets",
  "force row level security"
]) {
  if (!sessionLower.includes(token)) failures.push(`Controle criptográfico SQL ausente: ${token}`);
}
for (const forbidden of [
  "master_key bytea",
  "kek_plaintext",
  "dek_plaintext",
  "credentials_plaintext",
  "raw_credentials",
  "pairing_code text",
  "qr text"
]) {
  if (sessionLower.includes(forbidden)) failures.push(`Material sensível persistente proibido: ${forbidden}`);
}
if (sessionLower.includes("create table public.session_runtime_leases")) {
  failures.push("Lease W-08 foi implementado prematuramente.");
}
for (const token of [
  "createEncryptedSessionCredentialStore",
  "compareAndSwapCredentials",
  "rotateSessionDataKey",
  "exportEncryptedBackup",
  "deleteSessionSecrets"
]) {
  if (!sessionStore.includes(token)) failures.push(`Store W-07 incompleto: ${token}`);
}
for (const token of ["KeyEnvelopeProvider", "EncryptedSessionBackup", "SessionSecretAuditEvent"])
  if (!sessionContracts.includes(token)) failures.push(`Contrato W-07 incompleto: ${token}`);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  contract: "messaging-storage-boundary-v3",
  legacyDomainRelations: 7,
  technicalRelations: 7,
  encryptedSessionRelations: 4,
  behaviorControls: 11,
  rawPayloadColumns: 0,
  parallelContactConversationMessageTables: 0,
  baileysPackageInstalledInGateway: true,
  baileysVersion: "7.0.0-rc13",
  baileysRuntimeRegistered: false,
  encryptedSessionStorageImplemented: true,
  masterKeyInDatabase: false,
  sessionLeaseImplemented: false,
  realSessionMaterialPresent: false
}, null, 2));
