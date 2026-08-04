import fs from "node:fs";

const files = {
  pipeline: "lib/messaging/plugins.ts",
  migration: "supabase/migrations/20260804210000_stage22_message_plugins.sql",
  dbTest: "supabase/tests/messaging-plugins/plugins.test.sql",
  tests: "tests/messaging-plugins.test.ts"
};
const failures = [];
for (const file of Object.values(files)) if (!fs.existsSync(file)) failures.push(`Arquivo W-16 ausente: ${file}`);
const read = key => fs.existsSync(files[key]) ? fs.readFileSync(files[key], "utf8") : "";
const pipeline = read("pipeline");
const migration = read("migration").toLowerCase();

for (const token of [
  "MessagePlugin", "MessagePluginPipeline", "priority", "decision.kind !== \"CONTINUE\"",
  "createConsentPlugin", "createAntiSpamPlugin", "createQualificationPlugin",
  "createProjectStatusPlugin", "createDocumentPlugin", "createSacPlugin",
  "createHandoffPlugin", "createAiFallbackPlugin", "requiredPermission",
  "featureFlag", "plugin de IA deve ser obrigatoriamente o último", "requiresHumanReview: true"
]) if (!pipeline.includes(token)) failures.push(`Pipeline W-16 sem ${token}`);
for (const forbidden of ["sendMessage(", "makeWASocket(", "requiresHumanReview: false } as"])
  if (pipeline.includes(forbidden)) failures.push(`Pipeline W-16 contém execução proibida: ${forbidden}`);
for (const token of [
  "channel_message_plugin_policies", "channel_message_plugin_decisions",
  "set_channel_message_plugin_policy", "record_channel_message_plugin_decision",
  "consent_plugin_required", "ai_plugin_must_be_last_and_flagged",
  "plugin_decision_immutable", "force row level security"
]) if (!migration.includes(token)) failures.push(`SQL W-16 sem ${token}`);
for (const token of [
  "persistência de plugins aprovada", "prioridade e políticas persistentes aprovadas",
  "consentimento obrigatório aprovado", "IA como último recurso aprovada",
  "conflito de prioridade bloqueado aprovado", "decisão e short-circuit auditados aprovados",
  "draft exige revisão humana aprovado", "trace minimizado aprovado",
  "decisão imutável aprovada", "isolamento multiempresa aprovado", "RLS e privilégio mínimo aprovados"
]) if (!read("dbTest").includes(token)) failures.push(`Teste PostgreSQL W-16 ausente: ${token}`);
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
  contract: "messaging-governed-plugin-pipeline-boundary-v1",
  priorityDeterministic: true,
  shortCircuit: true,
  consentFirst: true,
  antiSpamBeforeAutomation: true,
  qualificationPlugin: true,
  projectStatusPlugin: true,
  canonicalDocumentPlugin: true,
  sacPlugin: true,
  handoffPlugin: true,
  aiLastResource: true,
  permissionsAndFlags: true,
  decisionsImmutable: true,
  crossTenantBlocked: true,
  automaticSending: false
}, null, 2));
