import fs from "node:fs";

const files = {
  model: "lib/messaging/pilot.ts",
  migration: "supabase/migrations/20260805002000_stage22_limited_pilot.sql",
  dbTest: "supabase/tests/messaging-pilot/pilot.test.sql",
  tests: "tests/messaging-pilot.test.ts",
  report: "docs/ETAPA-22-WHATSAPP-WEB-NAO-OFICIAL/PILOTO-W21.md"
};
const failures = [];
for (const file of Object.values(files)) if (!fs.existsSync(file)) failures.push(`Arquivo W-21 ausente: ${file}`);
const read = key => fs.existsSync(files[key]) ? fs.readFileSync(files[key], "utf8") : "";
const model = read("model");
const migration = read("migration").toLowerCase();
const report = read("report");

for (const token of [
  "maximumTeamMembers", "maximumConversations", "maximumDailyMessages", "PilotWindow",
  "campaignsEnabled: false", "aiMode: \"DRAFT_ONLY\"", "DEFAULT_PILOT_SLIS",
  "PILOT_ABORT_CRITERIA", "organizationEnabled", "sessionEnabled", "PILOT_INSTANT_ROLLBACK",
  "PILOT_DAILY_INCIDENT_REVIEW", "META_CLOUD", "WHATSAPP_WEB_BAILEYS",
  "legalReviewStatus", "PilotDecision", "HOLD", "NO_GO", "GO", "realPilotExecuted: false"
]) if (!model.includes(token)) failures.push(`Modelo W-21 sem ${token}`);
for (const token of [
  "channel_pilot_plans", "channel_pilot_assessments", "channel_pilot_daily_reviews",
  "maximum_team_members integer not null check (maximum_team_members between 1 and 5)",
  "maximum_conversations integer not null check (maximum_conversations between 1 and 20)",
  "campaigns_enabled boolean not null default false check (not campaigns_enabled)",
  "ai_mode text not null default 'draft_only' check (ai_mode='draft_only')",
  "real_pilot_executed boolean not null default false check (not real_pilot_executed)",
  "production_authorized boolean not null default false check (not production_authorized)",
  "real_pilot_review_required", "pilot_evidence_immutable", "force row level security"
]) if (!migration.includes(token)) failures.push(`SQL W-21 sem ${token}`);
for (const token of [
  "ledger de piloto aprovado", "limites horário campanhas e IA aprovados",
  "escopo pequeno obrigatório aprovado", "decisão HOLD e bloqueadores aprovados",
  "GO sem revisão real bloqueado aprovado", "campanhas e IA autônoma bloqueadas aprovadas",
  "revisão diária de incidentes e custo aprovada", "comparação providers SLIs SLOs rollback e custo aprovados",
  "evidência de piloto imutável aprovada", "isolamento multiempresa aprovado", "RLS e privilégio mínimo aprovados"
]) if (!read("dbTest").includes(token)) failures.push(`Teste PostgreSQL W-21 ausente: ${token}`);
for (const token of [
  "estado atual em HOLD", "limita equipe", "campanhas desativadas", "seis SLIs",
  "critérios de aborto", "feature flag por organização", "rollback instantâneo",
  "revisão diária de incidentes", "compara Meta oficial", "recusa escopo grande",
  "somente retorna GO", "nunca afirma piloto real"
]) if (!read("tests").includes(token)) failures.push(`Teste TypeScript W-21 ausente: ${token}`);
for (const token of [
  "`HOLD`", "Nenhum piloto real foi iniciado", "equipe máxima: 5", "conversas máximas: 20",
  "campanhas: desativadas", "IA: `DRAFT_ONLY`", "`PENDING`", "piloto real `NOT_EXECUTED`",
  "produção `NOT_AUTHORIZED`"
]) if (!report.includes(token)) failures.push(`Relatório W-21 sem ${token}`);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  contract: "messaging-limited-pilot-boundary-v1",
  smallTeamDefined: true,
  conversationLimitDefined: true,
  operatingWindowDefined: true,
  campaignsDisabled: true,
  aiMode: "DRAFT_ONLY",
  slisSlosDefined: true,
  abortCriteriaDefined: true,
  organizationAndSessionFlags: true,
  instantRollback: true,
  dailyIncidentReview: true,
  providerComparisonSynthetic: true,
  costMeasurementSynthetic: true,
  legalReview: "PENDING",
  decision: "HOLD",
  realPilotExecuted: false,
  realConversationsUsed: false,
  gateW21Released: false,
  productionAuthorized: false
}, null, 2));
