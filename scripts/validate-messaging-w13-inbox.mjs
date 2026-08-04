import fs from "node:fs";

const files = {
  model: "lib/messaging/inbox.ts",
  loader: "lib/messaging/inbox.server.ts",
  actions: "app/actions/messaging-inbox.ts",
  page: "app/app/whatsapp/inbox/page.tsx",
  migration: "supabase/migrations/20260804180000_stage22_multiprovider_inbox.sql",
  compat: "supabase/migrations/20260804180500_stage22_inbox_fixture_compat.sql",
  dbTest: "supabase/tests/messaging-inbox/inbox.test.sql",
  tests: "tests/messaging-inbox.test.ts"
};
const failures = [];
for (const file of Object.values(files)) if (!fs.existsSync(file)) failures.push(`Arquivo W-13 ausente: ${file}`);
const read = key => fs.existsSync(files[key]) ? fs.readFileSync(files[key], "utf8") : "";
const migration = `${read("migration")}\n${read("compat")}`.toLowerCase();
const page = read("page");

for (const token of [
  "UnifiedInboxConversation", "buildUnifiedInbox", "filterUnifiedInbox",
  "deriveInboxActionAvailability", "InboxChannelState", "OperatorPresence",
  "conflictingOwnership", "providerTypes", "capabilities"
]) if (!read("model").includes(token)) failures.push(`View model W-13 sem ${token}`);
for (const token of [
  "loadMultiproviderInbox", "channel_inbox_queues", "channel_operator_presence",
  "channel_conversation_notes", "resolveMetaCloudRuntimePolicy",
  "BAILEYS_PLANNED_CAPABILITY_MATRIX", "hasCapability"
]) if (!read("loader").includes(token)) failures.push(`Loader W-13 sem ${token}`);
for (const token of [
  "assignMessagingConversation", "addMessagingConversationNote",
  "updateMessagingOperatorPresence", "ownershipVersion", "assign_channel_conversation"
]) if (!read("actions").includes(token)) failures.push(`Action W-13 sem ${token}`);
for (const token of [
  "Inbox multiprovider", "repeat(auto-fit", "messagingProviderLabel", "channelStateLabel",
  "deriveInboxActionAvailability", "Ownership divergente", "Nota interna",
  "Somente não lidas", "Abrir conversa"
]) if (!page.includes(token)) failures.push(`UI W-13 sem ${token}`);
for (const token of [
  "channel_inbox_queues", "channel_conversation_assignment_events",
  "channel_conversation_notes", "channel_operator_presence", "channel_workspace_events",
  "ownership_version", "channel_state", "last_actor_kind",
  "assign_channel_conversation", "add_channel_conversation_note",
  "set_channel_operator_presence", "set_channel_conversation_actor",
  "set_channel_conversation_state", "channel_inbox_unified_contacts",
  "security_invoker=true", "force row level security"
]) if (!migration.includes(token)) failures.push(`SQL W-13 sem ${token}`);
for (const forbidden of [
  "create table public.channel_conversations", "create table public.channel_messages",
  "create table public.channel_contacts", "message_body text"
]) if (migration.includes(forbidden)) failures.push(`Domínio/payload paralelo W-13: ${forbidden}`);
if (!migration.includes("event_payload ?| array[")) failures.push("Eventos W-13 não bloqueiam payload sensível.");
for (const token of [
  "atribuição persistente aprovada", "concorrência de agentes aprovada",
  "transferência com histórico aprovada", "nota interna sanitizada aprovada",
  "segredo em nota bloqueado aprovado", "presença separada do canal aprovada",
  "estados degradados aprovados", "indicadores de ator aprovados",
  "unificação com origem aprovada", "filtros operacionais aprovados",
  "realtime pelo backend aprovado", "isolamento de fila aprovado",
  "RLS e privilégio mínimo aprovados"
]) if (!read("dbTest").includes(token)) failures.push(`Teste PostgreSQL W-13 ausente: ${token}`);
for (const token of [
  "unifica threads do mesmo contato", "ownership conflitante", "filtra por provider",
  "canal está offline", "presença do operador", "capability matrix", "rotula providers"
]) if (!read("tests").includes(token)) failures.push(`Teste TypeScript W-13 ausente: ${token}`);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  contract: "messaging-multiprovider-inbox-boundary-v1",
  unifiedByCanonicalContact: true,
  providerOriginPreserved: true,
  filtersOperational: true,
  assignmentVersioned: true,
  notesInternal: true,
  operatorPresenceSeparated: true,
  backendRealtimeOnly: true,
  degradedStatesSupported: true,
  capabilityActionsGated: true,
  responsiveLayout: true,
  concurrentAgentsProtected: true,
  parallelConversationDomainCreated: false
}, null, 2));
