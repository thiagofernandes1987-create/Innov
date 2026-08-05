import fs from "node:fs";

const files = {
  model: "lib/messaging/observability.ts",
  migration: "supabase/migrations/20260804230000_stage22_messaging_observability.sql",
  dbTest: "supabase/tests/messaging-observability/observability.test.sql",
  tests: "tests/messaging-observability.test.ts",
  docs: "docs/ETAPA-22-WHATSAPP-WEB-NAO-OFICIAL/OBSERVABILITY-W18.md",
  disconnect: "docs/ETAPA-22-WHATSAPP-WEB-NAO-OFICIAL/RUNBOOK-DESCONEXAO-W18.md",
  upgrade: "docs/ETAPA-22-WHATSAPP-WEB-NAO-OFICIAL/RUNBOOK-UPGRADE-BAILEYS-W18.md",
  rollback: "docs/ETAPA-22-WHATSAPP-WEB-NAO-OFICIAL/RUNBOOK-ROLLBACK-W18.md"
};
const failures = [];
for (const file of Object.values(files)) if (!fs.existsSync(file)) failures.push(`Arquivo W-18 ausente: ${file}`);
const read = key => fs.existsSync(files[key]) ? fs.readFileSync(files[key], "utf8") : "";
const model = read("model");
const migration = read("migration").toLowerCase();

for (const token of [
  "messaging_session_state", "messaging_ingress_total", "messaging_egress_total",
  "messaging_retry_total", "messaging_dlq_depth", "messaging_media_total",
  "messaging_ai_invocations_total", "messaging_ai_cost_micros_total",
  "structuredMessagingLog", "MessagingTrace", "MESSAGING_OPERATIONS_DASHBOARD",
  "RECONNECT_LOOP", "DLQ_GROWTH", "LEASE_CONFLICT", "KEY_PERSISTENCE_FAILURE"
]) if (!model.includes(token)) failures.push(`Observabilidade W-18 sem ${token}`);
for (const forbidden of ["organization_id\" as const", "conversation_id\" as const", "message_id\" as const"])
  if (model.includes(forbidden)) failures.push(`Label de alta cardinalidade W-18: ${forbidden}`);
for (const token of [
  "channel_runtime_observations", "channel_operational_alerts",
  "record_channel_runtime_observation", "upsert_channel_operational_alert",
  "acknowledge_channel_operational_alert", "resolve_channel_operational_alert",
  "runtime_observation_immutable", "force row level security"
]) if (!migration.includes(token)) failures.push(`SQL W-18 sem ${token}`);
for (const token of [
  "persistência de observabilidade aprovada", "métricas de sessão tráfego retry DLQ mídia e IA aprovadas",
  "alerta de reconnect loop aprovado", "deduplicação e atualização de alerta aprovadas",
  "alerta de DLQ aprovado", "alerta de perda de lease aprovado",
  "alerta de persistência de keys aprovado", "acknowledgment e resolução aprovados",
  "observação imutável aprovada", "isolamento multiempresa aprovado", "RLS e privilégio mínimo aprovados"
]) if (!read("dbTest").includes(token)) failures.push(`Teste PostgreSQL W-18 ausente: ${token}`);
for (const token of [
  "métricas de sessão", "baixa cardinalidade", "sanitiza logs", "trace ponta a ponta",
  "reconnect loop", "crescimento da DLQ", "perda ou disputa de lease",
  "persistência de keys", "dashboard operacional"
]) if (!read("tests").includes(token)) failures.push(`Teste TypeScript W-18 ausente: ${token}`);
for (const key of ["disconnect", "upgrade", "rollback"])
  if (read(key).length < 300) failures.push(`Runbook W-18 incompleto: ${files[key]}`);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  contract: "messaging-observability-operations-boundary-v1",
  sessionMetrics: true,
  ingressEgressMetrics: true,
  retryDlqMetrics: true,
  mediaMetrics: true,
  aiCostMetrics: true,
  structuredLogs: true,
  endToEndTraces: true,
  operationsDashboard: true,
  reconnectLoopAlert: true,
  dlqAlert: true,
  leaseConflictAlert: true,
  keyPersistenceAlert: true,
  disconnectRunbook: true,
  baileysUpgradeRunbook: true,
  rollbackRunbook: true,
  realTrafficObserved: false
}, null, 2));
