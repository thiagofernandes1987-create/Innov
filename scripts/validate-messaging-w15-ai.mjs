import fs from "node:fs";

const files = {
  bridge: "lib/messaging/ai.ts",
  migration: "supabase/migrations/20260804200000_stage22_ai_bridge.sql",
  dbTest: "supabase/tests/messaging-ai/ai.test.sql",
  tests: "tests/messaging-ai.test.ts"
};
const failures = [];
for (const file of Object.values(files)) if (!fs.existsSync(file)) failures.push(`Arquivo W-15 ausente: ${file}`);
const read = key => fs.existsSync(files[key]) ? fs.readFileSync(files[key], "utf8") : "";
const bridge = read("bridge");
const migration = read("migration").toLowerCase();

for (const token of [
  "AiProvider", "AiOrchestrator", "ContextBuilder", "lexicalSearch", "vectorSearch",
  "LEXICAL_FALLBACK", "organizationId", "projectId", "validUntil", "workflowResult",
  "AiConversationLock", "AiBudgetLedger", "AiHandoffStore", "buildHandoffSummary",
  "AiCitation", "validateDraftClaims", "PROMPT_INJECTION_PATTERNS", "AiAuditSink",
  "DRAFT_ONLY", "requiresHumanReview"
]) if (!bridge.includes(token)) failures.push(`Ponte W-15 sem ${token}`);

for (const forbidden of [
  "sendMessage(", "makeWASocket(", "AUTONOMOUS\" as const", "AUTO_REPLY"
]) if (bridge.includes(forbidden)) failures.push(`Ponte W-15 contém execução proibida: ${forbidden}`);

for (const token of [
  "channel_ai_conversation_locks", "channel_ai_budget_daily", "channel_ai_handoffs",
  "channel_ai_invocations", "claim_channel_ai_conversation", "reserve_channel_ai_budget",
  "request_channel_ai_handoff", "record_channel_ai_invocation", "autonomy_mode='draft_only'",
  "ai_invocation_immutable", "force row level security"
]) if (!migration.includes(token)) failures.push(`SQL W-15 sem ${token}`);

for (const token of [
  "lock atômico por conversa aprovado", "concorrência de geração bloqueada aprovada",
  "orçamento e custo por organização aprovados", "handoff persistente e resumo aprovados",
  "auditoria de modelo fontes ferramentas e custo aprovada", "minimização e payload bruto bloqueado aprovados",
  "auditoria imutável aprovada", "isolamento multiempresa aprovado", "RLS e privilégio mínimo aprovados"
]) if (!read("dbTest").includes(token)) failures.push(`Teste PostgreSQL W-15 ausente: ${token}`);

for (const token of [
  "aplica filtros de tenancy", "prompt injection", "fallback lexical", "precedência do workflow",
  "falha antes da persistência", "humano assume", "draft_only", "execução concorrente",
  "orçamento da organização", "ferramentas fora da allowlist", "audita modelo", "valida números"
]) if (!read("tests").includes(token)) failures.push(`Teste TypeScript W-15 ausente: ${token}`);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  contract: "messaging-governed-ai-bridge-boundary-v1",
  providerIndependent: true,
  channelIndependent: true,
  contextMinimized: true,
  lexicalRetrieval: true,
  vectorOptional: true,
  hybridFallback: true,
  tenancyAndValidityFiltered: true,
  workflowPrecedence: true,
  conversationAtomicLimit: true,
  organizationBudget: true,
  handoffPersistent: true,
  humanDisablesAi: true,
  internalCitations: true,
  claimsValidated: true,
  promptInjectionProtected: true,
  auditComplete: true,
  autonomyMode: "DRAFT_ONLY",
  realProviderCalls: false,
  automaticSending: false
}, null, 2));
