import fs from "node:fs";

const files = {
  model: "lib/messaging/homologation.ts",
  migration: "supabase/migrations/20260805001000_stage22_homologation_assessments.sql",
  dbTest: "supabase/tests/messaging-homologation/homologation.test.sql",
  tests: "tests/messaging-homologation.test.ts",
  report: "docs/ETAPA-22-WHATSAPP-WEB-NAO-OFICIAL/HOMOLOGACAO-W20.md"
};
const failures = [];
for (const file of Object.values(files)) if (!fs.existsSync(file)) failures.push(`Arquivo W-20 ausente: ${file}`);
const read = key => fs.existsSync(files[key]) ? fs.readFileSync(files[key], "utf8") : "";
const model = read("model");
const migration = read("migration").toLowerCase();
const report = read("report");

for (const token of [
  "EXCLUSIVE_AUTHORIZED_NUMBER", "DEDICATED_ORGANIZATION", "AUTHORIZED_USERS",
  "CAMPAIGNS_BLOCKED", "AI_DISABLED", "ALLOWED_CONTENT_TYPES", "DAILY_OPERATION_RUNBOOK",
  "METRICS_AND_ALERTS", "SESSION_PURGE_REHEARSAL", "HUMAN_HANDOFF_REHEARSAL",
  "INCIDENT_REGISTRATION", "REAL_VERIFIED", "BLOCKED_NOT_EXECUTED",
  "HOMOLOGATION_DAILY_RUNBOOK", "productionAuthorized: false"
]) if (!model.includes(token)) failures.push(`Modelo W-20 sem ${token}`);
for (const token of [
  "channel_homologation_assessments", "channel_homologation_rehearsals",
  "record_channel_homologation_assessment", "record_channel_homologation_rehearsal",
  "real_number_used boolean not null default false check (not real_number_used)",
  "external_connection_used boolean not null default false check (not external_connection_used)",
  "production_authorized boolean not null default false check (not production_authorized)",
  "real_homologation_evidence_required", "homologation_evidence_immutable", "force row level security"
]) if (!migration.includes(token)) failures.push(`SQL W-20 sem ${token}`);
for (const token of [
  "ledger de homologação aprovado", "decisão bloqueada e sem execução real aprovada",
  "readiness sem evidência real bloqueado aprovado", "purge handoff incidente e fluxo diário sintéticos aprovados",
  "número real bloqueado aprovado", "organização dedicada real bloqueada aprovada",
  "produção bloqueada aprovada", "evidência imutável aprovada",
  "isolamento multiempresa aprovado", "RLS e privilégio mínimo aprovados"
]) if (!read("dbTest").includes(token)) failures.push(`Teste PostgreSQL W-20 ausente: ${token}`);
for (const token of [
  "todos os requisitos previstos", "decisão bloqueada sem número", "não aceita evidência sintética",
  "dependências externas têm evidência real", "campanhas bloqueadas", "ensaios sintéticos de purge",
  "fluxo diário fail-closed", "nunca autoriza produção"
]) if (!read("tests").includes(token)) failures.push(`Teste TypeScript W-20 ausente: ${token}`);
for (const token of [
  "`BLOCKED_NOT_EXECUTED`", "Número exclusivo autorizado", "Organização dedicada",
  "Usuários autorizados", "Não liberado", "Resultados sintéticos não substituem"
]) if (!report.includes(token)) failures.push(`Relatório W-20 sem ${token}`);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  contract: "messaging-controlled-homologation-boundary-v1",
  exclusiveAuthorizedNumber: "BLOCKED_NOT_EXECUTED",
  dedicatedOrganization: "BLOCKED_NOT_EXECUTED",
  authorizedUsers: "BLOCKED_NOT_EXECUTED",
  campaignsBlocked: true,
  aiAutonomousDisabled: true,
  allowedContentPolicy: true,
  dailyRunbook: true,
  metricsAlertsReviewed: true,
  sessionPurgeRehearsedSynthetic: true,
  humanHandoffRehearsedSynthetic: true,
  incidentRecordedSynthetic: true,
  reportPublished: true,
  realHomologationExecuted: false,
  gateW20Released: false,
  productionAuthorized: false
}, null, 2));
