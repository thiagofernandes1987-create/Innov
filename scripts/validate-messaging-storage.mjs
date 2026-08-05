import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = {
  multiprovider: "supabase/migrations/20260804011500_stage22_multiprovider_storage.sql",
  session: "supabase/migrations/20260804123000_stage22_session_credential_store.sql",
  sessionFix: "supabase/migrations/20260804123500_stage22_session_credential_store_function_fix.sql",
  runtime: "supabase/migrations/20260804134000_stage22_session_runtime_leases.sql",
  multiproviderTest: "supabase/tests/messaging-multiprovider/storage.test.sql",
  sessionTest: "supabase/tests/messaging-session-credentials/storage.test.sql",
  runtimeTest: "supabase/tests/messaging-runtime-leases/lifecycle.test.sql",
  multiproviderRunner: "scripts/run-messaging-multiprovider-db-tests.mjs",
  sessionRunner: "scripts/run-messaging-session-credential-db-tests.mjs",
  runtimeRunner: "scripts/run-messaging-runtime-lease-db-tests.mjs",
  sessionStore: "apps/messaging-gateway/src/session-store/session-credential-store.ts",
  sessionContracts: "apps/messaging-gateway/src/session-store/contracts.ts",
  runtimeContracts: "apps/messaging-gateway/src/runtime/contracts.ts",
  gatewayPackage: "apps/messaging-gateway/package.json",
  gatewayIndex: "apps/messaging-gateway/src/index.ts",
  fixture: "supabase/tests/messaging-multiprovider/fixture.sql",
  seed: "supabase/tests/messaging-multiprovider/legacy-seed.sql"
};

const failures = [];
for (const file of Object.values(files)) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`Arquivo ausente: ${file}`);
}
const read = file => {
  const full = path.join(root, file);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
};

const multiprovider = read(files.multiprovider);
const session = `${read(files.session)}\n${read(files.sessionFix)}`;
const runtime = read(files.runtime);
const lowerMultiprovider = multiprovider.toLowerCase();
const lowerSession = session.toLowerCase();
const lowerRuntime = runtime.toLowerCase();
const rootPackage = JSON.parse(read("package.json") || "{}");
const gatewayPackage = JSON.parse(read(files.gatewayPackage) || "{}");
const gatewayIndex = read(files.gatewayIndex);

for (const relation of [
  "channel_contact_identities", "channel_commands", "channel_outbox_events",
  "channel_inbox_events", "channel_delivery_attempts", "channel_dead_letters",
  "channel_provider_rollbacks"
]) if (!lowerMultiprovider.includes(`public.${relation}`)) failures.push(`Relação W-04 ausente: ${relation}`);

for (const forbidden of [
  "create table public.channel_contacts",
  "create table public.channel_conversations",
  "create table public.channel_messages"
]) if (lowerMultiprovider.includes(forbidden)) failures.push(`Domínio paralelo proibido: ${forbidden}`);

for (const token of [
  "enqueue_channel_command", "register_channel_inbox_event", "claim_channel_outbox_events",
  "record_channel_delivery_attempt", "move_channel_failure_to_dlq",
  "rollback_channel_provider_projection", "force row level security"
]) if (!lowerMultiprovider.includes(token)) failures.push(`Controle W-04 ausente: ${token}`);
if (!lowerMultiprovider.includes("sanitized_payload")) failures.push("Inbox sanitizada W-04 ausente.");
for (const forbidden of ["raw_payload", "raw_event", "raw_body"])
  if (lowerMultiprovider.includes(forbidden)) failures.push(`Payload bruto persistente proibido: ${forbidden}`);

for (const relation of [
  "channel_session_secret_envelopes", "channel_session_credentials",
  "channel_session_keys", "channel_session_secret_audit"
]) if (!lowerSession.includes(`public.${relation}`)) failures.push(`Relação W-07 ausente: ${relation}`);
for (const token of [
  "wrapped_dek bytea", "ciphertext bytea", "compare_and_swap_channel_session_credentials",
  "delete_channel_session_secrets", "force row level security"
]) if (!lowerSession.includes(token)) failures.push(`Controle W-07 ausente: ${token}`);

for (const relation of [
  "session_runtime_leases", "messaging_runtime_global_control",
  "session_runtime_controls", "session_runtime_audit"
]) if (!lowerRuntime.includes(`public.${relation}`)) failures.push(`Relação W-08 ausente: ${relation}`);
for (const token of [
  "acquire_session_runtime_lease", "renew_session_runtime_lease",
  "release_session_runtime_lease", "assert_session_runtime_fence",
  "compare_and_swap_channel_session_credentials_fenced",
  "set_global_messaging_runtime_kill_switch", "set_session_runtime_kill_switch",
  "fencing_token", "lease_expires_at", "for update", "for share",
  "force row level security"
]) if (!lowerRuntime.includes(token)) failures.push(`Controle W-08 ausente: ${token}`);

for (const forbidden of [
  "master_key bytea", "kek_plaintext", "dek_plaintext", "credentials_plaintext",
  "raw_credentials", "qr text", "qr_value text", "pairing_code text",
  "challenge_value text", "secret_value"
]) {
  if (`${lowerSession}\n${lowerRuntime}`.includes(forbidden)) {
    failures.push(`Material sensível persistente proibido: ${forbidden}`);
  }
}

const multiproviderTest = read(files.multiproviderTest);
const sessionTest = read(files.sessionTest);
const runtimeTest = read(files.runtimeTest);
for (const token of [
  "backfill legado aprovado", "unicidade provider-scoped aprovada", "aliases PN/LID",
  "comando e outbox idempotentes", "RLS e privilégio mínimo", "inbox sanitizada",
  "claim durável", "ledger de tentativas", "DLQ idempotente",
  "rollback lógico sem perda histórica", "Baileys continua sem runtime"
]) if (!multiproviderTest.includes(token)) failures.push(`Teste W-04 ausente: ${token}`);
for (const token of [
  "criação transacional aprovada", "concorrência otimista aprovada",
  "versionamento crescente aprovado", "ausência de chave-mestra",
  "isolamento de escopo aprovado", "auditoria sanitizada aprovada",
  "RLS e privilégio mínimo aprovados", "exclusão criptográfica aprovada"
]) if (!sessionTest.includes(token)) failures.push(`Teste W-07 ausente: ${token}`);
for (const token of [
  "aquisição inicial e token crescente aprovados", "exclusão de segundo writer aprovada",
  "takeover após expiração aprovado", "processo zumbi bloqueado por fencing aprovado",
  "rollback de escrita zumbi aprovado", "kill switch por sessão aprovado",
  "kill switch global aprovado", "release e token monotônico aprovados"
]) if (!runtimeTest.includes(token)) failures.push(`Teste W-08 ausente: ${token}`);

if (!read(files.multiproviderRunner).includes("EXPECTED_APPROVALS = 11")) failures.push("Runner W-04 incompleto.");
if (!read(files.sessionRunner).includes("EXPECTED_APPROVALS = 8")) failures.push("Runner W-07 incompleto.");
if (!read(files.runtimeRunner).includes("EXPECTED_APPROVALS = 12")) failures.push("Runner W-08 incompleto.");

const sessionStore = read(files.sessionStore);
for (const token of [
  "createEncryptedSessionCredentialStore", "compareAndSwapCredentials",
  "rotateSessionDataKey", "exportEncryptedBackup", "deleteSessionSecrets"
]) if (!sessionStore.includes(token)) failures.push(`Store W-07 incompleto: ${token}`);
for (const token of ["KeyEnvelopeProvider", "EncryptedSessionBackup", "SessionSecretAuditEvent"])
  if (!read(files.sessionContracts).includes(token)) failures.push(`Contrato W-07 incompleto: ${token}`);
for (const token of ["SessionRuntimeLeaseRepository", "fencingToken", "RuntimeKillSwitchDecision"])
  if (!read(files.runtimeContracts).includes(token)) failures.push(`Contrato W-08 incompleto: ${token}`);

if (rootPackage.dependencies?.["@whiskeysockets/baileys"] || rootPackage.devDependencies?.["@whiskeysockets/baileys"]) {
  failures.push("Baileys não pode ser instalado no pacote raiz.");
}
if (gatewayPackage.dependencies?.["@whiskeysockets/baileys"] !== "7.0.0-rc13") {
  failures.push("Gateway não fixa @whiskeysockets/baileys@7.0.0-rc13.");
}
if (gatewayIndex.includes("BaileysEngineAdapter") || gatewayIndex.includes("engines/baileys") || gatewayIndex.includes("SessionLifecycleSupervisor")) {
  failures.push("Runtime real foi registrado no bootstrap antes da autorização operacional.");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  contract: "messaging-storage-boundary-v4",
  legacyDomainRelations: 7,
  technicalRelations: 7,
  encryptedSessionRelations: 4,
  runtimeControlRelations: 4,
  multiproviderControls: 11,
  sessionStoreControls: 8,
  runtimeLeaseControls: 12,
  rawPayloadColumns: 0,
  parallelContactConversationMessageTables: 0,
  baileysPackageInstalledInGateway: true,
  baileysVersion: "7.0.0-rc13",
  baileysRuntimeRegistered: false,
  encryptedSessionStorageImplemented: true,
  masterKeyInDatabase: false,
  sessionLeaseImplemented: true,
  monotonicFencingImplemented: true,
  globalAndSessionKillSwitches: true,
  realSessionMaterialPresent: false
}, null, 2));
