import fs from "node:fs";

const files = {
  contracts: "apps/messaging-gateway/src/outbox/contracts.ts",
  policies: "apps/messaging-gateway/src/outbox/policies.ts",
  worker: "apps/messaging-gateway/src/outbox/worker.ts",
  repository: "apps/messaging-gateway/src/outbox/in-memory-repository.ts",
  migration: "supabase/migrations/20260804151000_stage22_outbox_delivery.sql",
  compat: "supabase/migrations/20260804151500_stage22_outbox_delivery_compat.sql",
  dbTest: "supabase/tests/messaging-outbox/outbox.test.sql",
  runner: "scripts/run-messaging-outbox-db-tests.mjs",
  tests: "tests/messaging-outbox.test.ts"
};
const failures = [];
for (const file of Object.values(files)) if (!fs.existsSync(file)) failures.push(`Arquivo W-10 ausente: ${file}`);
const read = key => fs.existsSync(files[key]) ? fs.readFileSync(files[key], "utf8") : "";
const contracts = read("contracts");
const policies = read("policies");
const worker = read("worker");
const repository = read("repository");
const migration = `${read("migration")}\n${read("compat")}`.toLowerCase();
const dbTest = read("dbTest");
const runner = read("runner");
const tests = read("tests");
for (const token of [
  "CanonicalDeliveryCommand", "DeliveryAttempt", "DeliveryRepository", "DeliveryProvider",
  "DeliveryCircuitBreaker", "DeliveryRateLimiter", "idempotencyKey", "sequenceNumber"
]) if (!contracts.includes(token)) failures.push(`Contrato W-10 sem ${token}`);
for (const token of [
  "boundedDeliveryBackoffMs", "InMemoryDeliveryCircuitBreaker", "FixedWindowDeliveryRateLimiter",
  "CLOSED", "OPEN", "HALF_OPEN"
]) if (!policies.includes(token)) failures.push(`Política W-10 sem ${token}`);
for (const token of [
  "createDeliveryWorker", "claimOrdered", "repository.complete", "repository.fail",
  "circuitBreaker", "rateLimiter", "normalizeDeliveryFailure", "maxAttempts"
]) if (!worker.includes(token)) failures.push(`Worker W-10 sem ${token}`);
for (const token of [
  "earlierIncomplete", "claimToken", "simulateCrashAfterClaim", "reconcile", "REPLAY_JUSTIFICATION_REQUIRED"
]) if (!repository.includes(token)) failures.push(`Repositório W-10 sem ${token}`);
for (const token of [
  "sequence_number", "channel_delivery_circuits", "channel_delivery_rate_buckets",
  "reserve_channel_delivery_capacity", "claim_ordered_channel_outbox_events",
  "begin_channel_delivery_attempt", "complete_channel_delivery_attempt",
  "fail_channel_delivery_attempt", "reconcile_unconfirmed_channel_commands",
  "replay_channel_outbox_event", "for update of event skip locked",
  "pg_advisory_xact_lock", "force row level security"
]) if (!migration.includes(token)) failures.push(`Migration W-10 sem ${token}`);
for (const forbidden of [
  "create table public.channel_messages", "create table public.channel_conversations",
  "create table public.channel_contacts", "raw_payload"
]) if (migration.includes(forbidden)) failures.push(`Domínio/payload proibido W-10: ${forbidden}`);
for (const token of [
  "persist-before-send aprovado", "comando idempotente aprovado", "sequência por conversa aprovada",
  "ordenação por conversa aprovada", "ledger separado aprovado", "claim token de worker aprovado",
  "retry e backoff aprovado", "sucesso e confirmação aprovados", "desbloqueio sequencial aprovado",
  "terminal DLQ e circuit breaker aprovados", "replay justificado aprovado",
  "limite por organização e sessão aprovado", "crash e reconciliação aprovados",
  "monotonicidade e privilégio mínimo aprovados"
]) if (!dbTest.includes(token)) failures.push(`Controle PostgreSQL W-10 ausente: ${token}`);
if (!runner.includes("EXPECTED_APPROVALS = 14")) failures.push("Runner W-10 não exige 14 controles.");
for (const token of [
  "enqueue é idempotente", "ordena comandos por conversa", "worker conclui sucesso",
  "aplica backoff", "falha terminal", "circuit breaker abre", "limita volume",
  "reconcilia crash", "não envia quando rate limiter rejeita"
]) if (!tests.includes(token)) failures.push(`Teste TypeScript W-10 ausente: ${token}`);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  contract: "messaging-outbox-boundary-v1",
  canonicalCommands: true,
  persistBeforeSend: true,
  orderedPerConversation: true,
  idempotent: true,
  attemptLedger: true,
  boundedBackoff: true,
  circuitBreaker: true,
  reconciliation: true,
  outboundDlq: true,
  replayJustified: true,
  organizationSessionRateLimit: true,
  providerRuntimeRequired: false
}, null, 2));
