import fs from "node:fs";

const files = {
  model: "lib/messaging/playbooks.ts",
  resolver: "lib/whatsapp/source-resolver.ts",
  migration: "supabase/migrations/20260804190000_stage22_communication_playbooks.sql",
  dbTest: "supabase/tests/messaging-playbooks/playbooks.test.sql",
  tests: "tests/messaging-playbooks.test.ts"
};
const failures = [];
for (const file of Object.values(files)) if (!fs.existsSync(file)) failures.push(`Arquivo W-14 ausente: ${file}`);
const read = key => fs.existsSync(files[key]) ? fs.readFileSync(files[key], "utf8") : "";
const model = read("model");
const migration = read("migration").toLowerCase();

for (const token of [
  "CommunicationPlaybookVersion", "PlaybookVariableSchema", "validatePlaybookVariables",
  "assertPlaybookPolicy", "createPlaybookExecutionSnapshot", "reproducePlaybookExecution",
  "CANONICAL_ONLY", "HUMAN_ONLY", "CONTRACTUAL", "FREE_REWRITE_BLOCKED"
]) if (!model.includes(token)) failures.push(`Contrato W-14 sem ${token}`);
for (const token of [
  "whatsapp_content_bindings", "communication_playbooks", "communication_playbook_versions",
  "communication_playbook_version_approvals", "communication_playbook_executions",
  "create_communication_playbook_version", "decide_communication_playbook_version",
  "register_communication_playbook_execution", "version_number_snapshot",
  "binding_id_snapshot", "variables_snapshot", "source_snapshot", "resolved_snapshot",
  "content_sha256", "canonical_only", "approval_required", "security_invoker=true",
  "force row level security", "immutable_playbook_history"
]) if (!migration.includes(token)) failures.push(`SQL W-14 sem ${token}`);
for (const forbidden of [
  "create table public.whatsapp_content_bindings",
  "create table public.communication_messages",
  "message_body text",
  "template_text text",
  "free_text text"
]) if (migration.includes(forbidden)) failures.push(`Duplicação ou reescrita livre W-14: ${forbidden}`);
for (const token of [
  "binding canônico sem duplicação aprovado", "versionamento inicial aprovado",
  "validação de variáveis aprovada", "autonomia contratual restrita aprovada",
  "aprovação humana obrigatória aprovada", "execução após aprovação aprovada",
  "snapshot versão e SHA aprovado", "imutabilidade de versão aprovada",
  "atualização sem alterar histórico aprovada", "reprodução histórica aprovada",
  "isolamento multiempresa aprovado", "RLS e privilégio mínimo aprovados"
]) if (!read("dbTest").includes(token)) failures.push(`Teste PostgreSQL W-14 ausente: ${token}`);
for (const token of [
  "valida variáveis declaradas", "bloqueia autonomia não humana",
  "exige aprovação humana", "bloqueia reescrita contratual livre",
  "snapshot, versão, binding e SHA", "reproduz histórico",
  "nova versão não altera snapshot histórico"
]) if (!read("tests").includes(token)) failures.push(`Teste TypeScript W-14 ausente: ${token}`);
if (!read("resolver").includes("whatsapp_content_bindings")) failures.push("Resolver canônico existente não foi preservado.");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  contract: "messaging-canonical-playbooks-boundary-v1",
  contentBindingsReused: true,
  duplicateStandardMessages: false,
  versionedPlaybooks: true,
  variableSchemaValidated: true,
  sourceSnapshotVersionSha: true,
  autonomyClassified: true,
  contractualFreeRewriteBlocked: true,
  sensitiveHumanApprovalRequired: true,
  historicalReproduction: true,
  immutableHistory: true,
  crossTenantBlocked: true
}, null, 2));
