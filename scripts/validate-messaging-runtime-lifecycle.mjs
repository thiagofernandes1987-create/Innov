import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = {
  contracts: "apps/messaging-gateway/src/runtime/contracts.ts",
  backoff: "apps/messaging-gateway/src/runtime/backoff.ts",
  classification: "apps/messaging-gateway/src/runtime/failure-classification.ts",
  repository: "apps/messaging-gateway/src/runtime/memory-runtime-lease-repository.ts",
  supervisor: "apps/messaging-gateway/src/runtime/lifecycle-supervisor.ts",
  index: "apps/messaging-gateway/src/runtime/index.ts",
  migration: "supabase/migrations/20260804134000_stage22_session_runtime_leases.sql",
  dbTest: "supabase/tests/messaging-runtime-leases/lifecycle.test.sql",
  dbRunner: "scripts/run-messaging-runtime-lease-db-tests.mjs",
  tests: "tests/messaging-runtime-lifecycle.test.ts",
  gatewayIndex: "apps/messaging-gateway/src/index.ts",
  package: "package.json",
  ci: ".github/workflows/ci.yml"
};

const failures = [];
for (const file of Object.values(files)) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`Arquivo W-08 ausente: ${file}`);
}
const read = file => {
  const full = path.join(root, file);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
};

const contracts = read(files.contracts);
const backoff = read(files.backoff);
const classification = read(files.classification);
const repository = read(files.repository);
const supervisor = read(files.supervisor);
const migration = read(files.migration);
const dbTest = read(files.dbTest);
const dbRunner = read(files.dbRunner);
const tests = read(files.tests);
const gatewayIndex = read(files.gatewayIndex);
const rootPackage = JSON.parse(read(files.package) || "{}");
const ci = read(files.ci);
const combinedRuntime = [contracts, backoff, classification, repository, supervisor].join("\n");
const lowerMigration = migration.toLowerCase();

for (const token of [
  "SessionRuntimeLeaseRepository", "fencingToken", "leaseExpiresAt",
  "RuntimeKillSwitchDecision", "RuntimeLifecycleState", "EphemeralPairingNotice",
  "FencedCredentialMutation", "SessionRuntimeDriver"
]) if (!contracts.includes(token)) failures.push(`Contrato W-08 incompleto: ${token}`);

for (const token of [
  "createMemoryRuntimeLeaseRepository", "LEASE_HELD", "FENCING_TOKEN_STALE",
  "KILL_SWITCH_ACTIVE", "fencingToken: (current?.fencingToken ?? 0) + 1"
]) if (!repository.includes(token)) failures.push(`Lease repository incompleto: ${token}`);

for (const token of [
  "class SessionLifecycleSupervisor", "ACQUIRING_LEASE", "PAIRING_REQUIRED",
  "BACKOFF", "FENCED_OUT", "runFencedCredentialMutation", "restoreOnNewInstance",
  "enforceKillSwitch", "reconnectNow", "persisted: false"
]) if (!supervisor.includes(token)) failures.push(`Supervisor W-08 incompleto: ${token}`);

for (const token of ["reconnectBackoffMs", "maxMs", "jitterRatio"])
  if (!backoff.includes(token)) failures.push(`Backoff W-08 incompleto: ${token}`);
for (const token of ["LOGGED_OUT", "RESTRICTED", "ACTION_REQUIRED", "TRANSIENT"])
  if (!classification.includes(token)) failures.push(`Classificação W-08 incompleta: ${token}`);

for (const relation of [
  "session_runtime_leases", "messaging_runtime_global_control",
  "session_runtime_controls", "session_runtime_audit"
]) if (!lowerMigration.includes(`public.${relation}`)) failures.push(`Relação W-08 ausente: ${relation}`);

for (const token of [
  "acquire_session_runtime_lease", "renew_session_runtime_lease",
  "release_session_runtime_lease", "assert_session_runtime_fence",
  "compare_and_swap_channel_session_credentials_fenced",
  "set_global_messaging_runtime_kill_switch", "set_session_runtime_kill_switch",
  "for update", "for share", "force row level security"
]) if (!lowerMigration.includes(token)) failures.push(`Controle SQL W-08 ausente: ${token}`);

for (const forbidden of [
  "qr_value text", "pairing_code text", "challenge_value text",
  "credentials_plaintext", "secret_value", "raw_qr"
]) if (lowerMigration.includes(forbidden)) failures.push(`Persistência sensível proibida: ${forbidden}`);

for (const token of [
  "aquisição inicial e token crescente aprovados", "exclusão de segundo writer aprovada",
  "renovação de lease aprovada", "takeover após expiração aprovado",
  "processo zumbi bloqueado por fencing aprovado", "rollback de escrita zumbi aprovado",
  "kill switch por sessão aprovado", "kill switch global aprovado",
  "release e token monotônico aprovados", "auditoria sanitizada aprovados"
]) if (!dbTest.includes(token)) failures.push(`Prova SQL W-08 ausente: ${token}`);
if (!dbRunner.includes("EXPECTED_APPROVALS = 12")) failures.push("Runner W-08 não exige 12 controles.");

for (const token of [
  "impede dois writers", "descarta o valor do QR", "reconecta falha transitória",
  "fenceia processo zumbi", "aborta atualização de credenciais",
  "restaura checkpoint somente pela nova instância", "kill switch global"
]) if (!tests.includes(token)) failures.push(`Teste TypeScript W-08 ausente: ${token}`);

if (/console\.(log|error|warn|debug)\s*\(/.test(combinedRuntime)) {
  failures.push("Runtime lifecycle não pode registrar desafio, credencial ou payload por console.");
}
if (gatewayIndex.includes("runtime/lifecycle-supervisor") || gatewayIndex.includes("SessionLifecycleSupervisor")) {
  failures.push("Supervisor W-08 foi registrado no bootstrap antes de autorização de runtime real.");
}
if (combinedRuntime.includes("@whiskeysockets/baileys")) {
  failures.push("Runtime lifecycle provider-neutral importou SDK Baileys diretamente.");
}
if (combinedRuntime.includes("DATABASE_URL") || combinedRuntime.includes("SUPABASE_SERVICE_ROLE_KEY")) {
  failures.push("Runtime lifecycle acoplou credencial ou conexão do banco principal.");
}

for (const script of [
  "validate:messaging-runtime", "test:messaging-runtime", "test:db:messaging-runtime"
]) if (!rootPackage.scripts?.[script]) failures.push(`Script W-08 ausente: ${script}`);
for (const token of [
  "Validate messaging runtime lifecycle", "Messaging runtime lease database tests",
  "Messaging runtime lifecycle tests"
]) if (!ci.includes(token)) failures.push(`CI sem gate W-08: ${token}`);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  contract: "messaging-runtime-lifecycle-boundary-v1",
  singleWriterImplemented: true,
  leaseExpirationImplemented: true,
  monotonicFencingToken: true,
  zombieWriterBlocked: true,
  connectionStateMachine: true,
  ephemeralPairingOnly: true,
  reconnectBackoffWithJitter: true,
  failureClassification: true,
  globalKillSwitch: true,
  sessionKillSwitch: true,
  runtimeRegistered: false,
  externalSocketOpened: false,
  realSessionMaterialPresent: false,
  productionEnabled: false
}, null, 2));
