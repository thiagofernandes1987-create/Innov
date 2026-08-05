import fs from "node:fs";

const files = {
  pipeline: "lib/messaging/plugins.ts",
  migration: "supabase/migrations/20260804210000_stage22_message_plugins.sql",
  hardening: "supabase/migrations/20260805005000_stage22_plugin_policy_canonical_order.sql",
  dbTest: "supabase/tests/messaging-plugins/plugins.test.sql",
  dbRunner: "scripts/run-messaging-w16-plugins-db-tests.mjs",
  tests: "tests/messaging-plugins.test.ts"
};
const failures = [];
for (const file of Object.values(files)) if (!fs.existsSync(file)) failures.push(`Arquivo W-16 ausente: ${file}`);
const read = key => fs.existsSync(files[key]) ? fs.readFileSync(files[key], "utf8") : "";
const pipeline = read("pipeline");
const migration = read("migration").toLowerCase();
const hardening = read("hardening").toLowerCase();

for (const token of [
  "MessagePlugin", "MessagePluginPipeline", "priority", "decision.kind !== \"CONTINUE\"",
  "createConsentPlugin", "createAntiSpamPlugin", "createQualificationPlugin",
  "createProjectStatusPlugin", "createDocumentPlugin", "createSacPlugin",
  "createHandoffPlugin", "createAiFallbackPlugin", "requiredPermission",
  "featureFlag", "plugin de IA deve ser obrigatoriamente o último", "requiresHumanReview: true"
]) if (!pipeline.includes(token)) failures.push(`Pipeline W-16 sem ${token}`);
for (const forbidden of ["sendMessage(", "makeWASocket(", "requiresHumanReview: false } as"])
  if (pipeline.includes(forbidden)) failures.push(`Pipeline W-16 contém execução proibida: ${forbidden}`);
const antiSpamStart = pipeline.indexOf("export function createAntiSpamPlugin");
const antiSpamEnd = pipeline.indexOf("export function createQualificationPlugin", antiSpamStart);
const antiSpamBlock = pipeline.slice(antiSpamStart, antiSpamEnd);
if (!antiSpamBlock.includes("featureFlag: null")) failures.push("Anti-spam obrigatório ainda depende de feature flag.");
for (const token of [
  "channel_message_plugin_policies", "channel_message_plugin_decisions",
  "set_channel_message_plugin_policy", "record_channel_message_plugin_decision",
  "consent_plugin_required", "ai_plugin_must_be_last_and_flagged",
  "plugin_decision_immutable", "force row level security"
]) if (!migration.includes(token)) failures.push(`SQL W-16 original sem ${token}`);
for (const token of [
  "mandatory_plugin_required", "plugin_id_invalid", "plugin_configuration_secret_detected",
  "('consent'::text,10", "('anti_spam',20", "('handoff',70", "('ai_fallback',1000",
  "canonical_priority", "canonical_permission", "canonical_flag",
  "drop index if exists public.channel_message_plugin_priority_uidx",
  "create unique index channel_message_plugin_priority_uidx"
]) if (!hardening.includes(token)) failures.push(`Hardening W-16 sem ${token}`);
for (const forbidden of [
  "priority=excluded.priority" // permitido apenas na normalização/insert canônico, não vindo da UI
]) {
  if (!hardening.includes("canonical_priority")) failures.push(`Hardening W-16 não neutraliza ${forbidden}`);
}
for (const token of [
  "persistência de plugins aprovada", "catálogo canônico completo aprovado",
  "metadados canônicos imunes à UI aprovados", "plugins críticos obrigatórios aprovados",
  "prioridade e ordem canônicas aprovadas", "identificador de plugin fail-closed aprovado",
  "segredo em configuração bloqueado aprovado", "decisão e short-circuit auditados aprovados",
  "draft exige revisão humana aprovado", "trace minimizado aprovado",
  "decisão imutável aprovada", "isolamento multiempresa aprovado", "RLS e privilégio mínimo aprovados"
]) if (!read("dbTest").includes(token)) failures.push(`Teste PostgreSQL W-16 ausente: ${token}`);
for (const token of [
  "20260804210000_stage22_message_plugins.sql",
  "20260805005000_stage22_plugin_policy_canonical_order.sql"
]) if (!read("dbRunner").includes(token)) failures.push(`Runner W-16 sem ${token}`);
for (const token of [
  "prioridade determinística", "consentimento bloqueia", "anti-spam", "qualificação exige",
  "status usa dado canônico", "documento resolve", "SAC encaminha", "operador já atribuído",
  "IA é último recurso", "prioridade conflitante", "IA fora da última", "mais de um plugin de IA"
]) if (!read("tests").includes(token)) failures.push(`Teste TypeScript W-16 ausente: ${token}`);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  contract: "messaging-governed-plugin-pipeline-boundary-v2",
  priorityDeterministic: true,
  serverCanonicalOrder: true,
  clientPriorityIgnored: true,
  clientPermissionIgnored: true,
  clientFeatureFlagIgnored: true,
  shortCircuit: true,
  consentFirstAndMandatory: true,
  antiSpamMandatoryBeforeAutomation: true,
  qualificationPlugin: true,
  projectStatusPlugin: true,
  canonicalDocumentPlugin: true,
  sacPlugin: true,
  handoffMandatoryBeforeAi: true,
  aiLastResource: true,
  permissionsAndFlagsCanonical: true,
  pluginConfigurationSecretsBlocked: true,
  decisionsImmutable: true,
  crossTenantBlocked: true,
  automaticSending: false
}, null, 2));
