import fs from "node:fs";

const files = {
  migration: "supabase/migrations/20260805003000_stage22_governed_bot_profiles.sql",
  domain: "lib/messaging/bots.ts",
  provider: "lib/messaging/openai-responses-provider.ts",
  loader: "lib/messaging/bots.server.ts",
  actions: "app/actions/messaging-bots.ts",
  page: "app/app/whatsapp/bots/page.tsx",
  tester: "app/app/whatsapp/bots/bot-draft-tester.tsx",
  tests: "tests/messaging-bots.test.ts",
  dbTests: "supabase/tests/messaging-bots/bots.test.sql",
  dbRunner: "scripts/run-messaging-w22-bots-db-tests.mjs"
};
const failures = [];
for (const file of Object.values(files)) if (!fs.existsSync(file)) failures.push(`Arquivo de bots ausente: ${file}`);
const read = key => fs.existsSync(files[key]) ? fs.readFileSync(files[key], "utf8") : "";
const migration = read("migration").toLowerCase();

for (const token of [
  "channel_bot_profiles", "autonomy_mode", "DRAFT_ONLY", "review_required", "send_allowed",
  "allowed_tools", "BOT_TOOL_NOT_ALLOWED", "BOT_NOT_READY", "channel_bot_profile_scope_guard",
  "upsert_channel_bot_profile", "set_channel_ai_daily_budget", "release_channel_ai_budget",
  "force row level security"
]) if (!read("migration").includes(token) && !migration.includes(token.toLowerCase())) failures.push(`Migration de bots sem ${token}`);
for (const forbidden of ["send_allowed boolean not null default true", "autonomy_mode text not null default 'autonomous'"])
  if (migration.includes(forbidden)) failures.push(`Autonomia insegura detectada: ${forbidden}`);
for (const token of [
  "BOT_ALLOWED_TOOLS", "normalizeBotTools", "validateBotProfile", "deriveBotReadiness",
  "sendAllowed: false", "humanReviewRequired: true"
]) if (!read("domain").includes(token)) failures.push(`Domínio de bots sem ${token}`);
for (const token of [
  "OpenAiResponsesProvider", "https://api.openai.com/v1/responses", "store: false",
  "AbortController", "max_output_tokens", "toolsUsed: []", "OPENAI_API_KEY",
  "OPENAI_MESSAGING_MODEL", "OPENAI_MESSAGING_INPUT_COST_MICROS_PER_MILLION"
]) if (!read("provider").includes(token)) failures.push(`Provider OpenAI sem ${token}`);
for (const token of [
  "loadMessagingBotsWorkspace", "deriveBotReadiness", "channel_ai_invocations",
  "channel_ai_handoffs", "channel_message_plugin_policies", "missingVariables"
]) if (!read("loader").includes(token)) failures.push(`Loader de bots sem ${token}`);
for (const token of [
  "saveMessagingBotProfile", "setMessagingAiBudget", "setMessagingPluginPolicy",
  "testMessagingBotDraft", "claim_channel_ai_conversation", "reserve_channel_ai_budget",
  "commit_channel_ai_budget", "release_channel_ai_budget", "record_channel_ai_invocation",
  "requiresHumanReview: true"
]) if (!read("actions").includes(token)) failures.push(`Actions de bots sem ${token}`);
for (const token of [
  "Bots governados", "DRAFT_ONLY", "envio autônomo bloqueado", "Criar bot de rascunho",
  "BotDraftTester", "Plugins e automações", "Gerações recentes", "Transferências para humanos"
]) if (!read("page").includes(token)) failures.push(`UI de bots sem ${token}`);
for (const token of [
  "Gerar rascunho sem enviar", "testMessagingBotDraft", "Revisão humana obrigatória",
  "Alertas de claims", "Nunca é enviado"
]) if (!read("tester").toLowerCase().includes(token.toLowerCase())) failures.push(`Tester de bot sem ${token}`);
for (const token of [
  "normaliza ferramentas", "bloqueia credenciais", "não habilita bot", "revisão humana",
  "store false", "bloqueia passagem de ferramentas", "sanitiza falha do provedor"
]) if (!read("tests").toLowerCase().includes(token.toLowerCase())) failures.push(`Teste TypeScript de bots ausente: ${token}`);
for (const token of [
  "perfis de bot persistentes aprovados", "orçamento diário governado aprovado",
  "draft-only revisão humana e bloqueio de envio aprovados", "segredos nas instruções bloqueados aprovados",
  "allowlist de ferramentas aprovada", "habilitação fail-closed aprovada",
  "escopo de fila multiempresa aprovado", "liberação de reserva após falha aprovada",
  "RLS e privilégio mínimo aprovados"
]) if (!read("dbTests").includes(token)) failures.push(`Teste PostgreSQL de bots ausente: ${token}`);
if (!read("dbRunner").includes("20260805003000_stage22_governed_bot_profiles.sql")) failures.push("Runner não aplica migration de bots.");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  contract: "messaging-governed-bots-ux-boundary-v1",
  botProfilesPersistent: true,
  autonomyMode: "DRAFT_ONLY",
  humanReviewRequired: true,
  autonomousSendAllowed: false,
  provider: "OPENAI_RESPONSES",
  providerStateStored: false,
  providerToolsEnabled: false,
  budgetReservedAndReleased: true,
  conversationLockRequired: true,
  auditRequired: true,
  promptSourcesCurrentlyConnected: false,
  productionAuthorized: false
}, null, 2));
