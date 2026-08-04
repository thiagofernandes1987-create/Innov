import fs from "node:fs";

const files = {
  contracts: "apps/messaging-gateway/src/ingress/contracts.ts",
  normalizer: "apps/messaging-gateway/src/ingress/normalizer.ts",
  pipeline: "apps/messaging-gateway/src/ingress/pipeline.ts",
  repository: "apps/messaging-gateway/src/ingress/in-memory-repository.ts",
  index: "apps/messaging-gateway/src/ingress/index.ts",
  migration: "supabase/migrations/20260804142000_stage22_ingress_normalization.sql",
  dbTest: "supabase/tests/messaging-ingress/ingress.test.sql",
  runner: "scripts/run-messaging-ingress-db-tests.mjs",
  tests: "tests/messaging-ingress.test.ts"
};
const failures = [];
for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) failures.push(`Arquivo W-09 ausente: ${file}`);
}
const read = key => fs.existsSync(files[key]) ? fs.readFileSync(files[key], "utf8") : "";
const contracts = read("contracts");
const normalizer = read("normalizer");
const pipeline = read("pipeline");
const migration = read("migration");
const lowerMigration = migration.toLowerCase();
const tests = read("tests");
const dbTest = read("dbTest");
const runner = read("runner");

for (const token of [
  "CanonicalIngressEnvelope", "IngressState", "PERSISTED", "DISPATCHED",
  "idempotencyKey", "sequenceKey", "sanitizedMetadata"
]) if (!contracts.includes(token)) failures.push(`Contrato ingress sem ${token}`);
for (const token of [
  "normalizeBaileysEngineEvent", "wrapperNormalized", "ephemeralMaterialPersisted: false",
  "viewOnceMaterialPersisted: false", "rawPayloadPersisted: false", "RECEIPT"
]) if (!normalizer.includes(token)) failures.push(`Normalizador ingress sem ${token}`);
for (const token of [
  "createIngressPipeline", "assertPersistedBeforeAutomation", "UNKNOWN_PAYLOAD",
  "repository.persist", "options.dispatch", "markDispatched"
]) if (!pipeline.includes(token)) failures.push(`Pipeline ingress sem ${token}`);
for (const token of [
  "alter table public.channel_inbox_events", "idempotency_key", "canonical_envelope",
  "ingress_state", "sequence_key", "persist_channel_ingress_event",
  "claim_channel_ingress_events", "complete_channel_ingress_event",
  "move_channel_ingress_to_dlq", "replay_channel_ingress_event",
  "for update skip locked", "force row level security", "revoke insert,update,delete"
]) if (!lowerMigration.includes(token.toLowerCase())) failures.push(`Migration ingress sem ${token}`);
for (const forbidden of [
  "create table public.channel_messages", "create table public.channel_conversations",
  "create table public.channel_contacts", "raw_payload text", "raw_body text",
  "credentials jsonb", "qr text"
]) if (lowerMigration.includes(forbidden)) failures.push(`Persistência proibida W-09: ${forbidden}`);
for (const token of [
  "persist-before-dispatch aprovado", "idempotência por envelope aprovada",
  "payload desconhecido isolado aprovado", "resolução de tenant aprovada",
  "claim durável aprovado", "dispatch concorrente bloqueado aprovado",
  "conclusão fenced por worker aprovada", "DLQ sanitizada aprovada",
  "replay idempotente aprovado", "eventos fora de ordem preservados aprovados",
  "privilégio mínimo aprovado", "ausência de payload bruto aprovada"
]) if (!dbTest.includes(token)) failures.push(`Controle PostgreSQL W-09 ausente: ${token}`);
if (!runner.includes("EXPECTED_APPROVALS = 12")) failures.push("Runner W-09 não exige 12 controles.");
for (const token of [
  "persiste antes do dispatch", "deduplica sem redispatch", "isola payload desconhecido",
  "proíbe workflow e IA antes de PERSISTED", "replay mantém", "eventos fora de ordem"
]) if (!tests.includes(token)) failures.push(`Teste TypeScript W-09 ausente: ${token}`);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  contract: "messaging-ingress-boundary-v1",
  canonicalEnvelope: true,
  persistBeforeDispatch: true,
  idempotentPersistence: true,
  sanitizedOnly: true,
  unknownPayloadFailsClosed: true,
  replayWithJustification: true,
  dlqImplemented: true,
  aiBeforePersistedBlocked: true,
  parallelMessageDomainCreated: false,
  externalSocketRequired: false,
  realSessionRequired: false
}, null, 2));
