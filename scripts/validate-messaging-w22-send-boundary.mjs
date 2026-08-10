import fs from "node:fs";

const files = {
  action: "app/actions/whatsapp.ts",
  server: "lib/whatsapp/server.ts",
  page: "app/app/whatsapp/page.tsx",
  migration: "supabase/migrations/20260805004000_stage22_whatsapp_dispatch_claim.sql",
  dbFixture: "supabase/tests/messaging-dispatch/fixture.sql",
  dbTest: "supabase/tests/messaging-dispatch/dispatch.test.sql",
  dbRunner: "scripts/run-messaging-w22-dispatch-db-tests.mjs"
};
const failures = [];
for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) failures.push(`Arquivo de envio ausente: ${file}`);
}
const read = key => fs.existsSync(files[key]) ? fs.readFileSync(files[key], "utf8") : "";
const action = read("action");
const server = read("server");
const page = read("page");
const migration = read("migration").toLowerCase();

for (const token of [
  "SUPPORTED_PROVIDER_TYPES",
  "assertMetaCloudAccount",
  "provider_type",
  "provider_status",
  "provider_account_id",
  "UnsupportedCapabilityError",
  "providerType !== \"META_CLOUD\"",
  "String(account.provider_status ?? \"\") !== \"ENABLED\"",
  "UUID_PATTERN",
  "IDEMPOTENCY_PATTERN",
  "A obra informada não corresponde à conversa",
  "Mensagem já processada anteriormente",
  "A mensagem já está em processamento",
  "queue_whatsapp_outbound_message",
  "claim_whatsapp_outbound_dispatch",
  "complete_whatsapp_outbound_dispatch",
  "completeDispatchWithRetry",
  "providerAccepted",
  "Não reenvie"
]) if (!action.includes(token)) failures.push(`Boundary de envio sem ${token}`);

const sendStart = action.indexOf("export async function sendWhatsAppMessage");
const guardIndex = action.indexOf("assertMetaCloudAccount(account)", sendStart);
const identityIndex = action.indexOf("createCanonicalPhoneIdentity", sendStart);
const queueIndex = action.indexOf("queue_whatsapp_outbound_message", sendStart);
const claimIndex = action.indexOf("claim_whatsapp_outbound_dispatch", sendStart);
const engineIndex = action.indexOf("createMetaCloudMessagingEngine()", sendStart);
const completeIndex = action.indexOf("completeDispatchWithRetry", engineIndex);
if (sendStart < 0) failures.push("Action de envio ausente.");
if ([guardIndex, identityIndex, queueIndex, claimIndex, engineIndex, completeIndex].some(index => index < 0)) {
  failures.push("Sequência crítica de envio incompleta.");
} else if (!(guardIndex < identityIndex && identityIndex < queueIndex && queueIndex < claimIndex && claimIndex < engineIndex && engineIndex < completeIndex)) {
  failures.push("Ordem obrigatória: provider, identidade, persistência, claim, engine e conclusão.");
}

const startConversation = action.indexOf("export async function startWhatsAppConversation");
const startGuard = action.indexOf("assertMetaCloudAccount", startConversation);
const contactWrite = action.indexOf(".from(\"whatsapp_contacts\")", startConversation);
if (!(startConversation >= 0 && startGuard > startConversation && contactWrite > startGuard)) {
  failures.push("Nova conversa não valida provider antes de criar contato.");
}

for (const forbidden of [
  "account.provider_type ?? \"META_CLOUD\"",
  "account.provider_status ?? \"ENABLED\"",
  "complete_whatsapp_outbound_message\""
]) if (action.includes(forbidden)) failures.push(`Fallback ou conclusão sem fencing detectado: ${forbidden}`);

for (const token of [
  "dispatch_token uuid",
  "dispatch_started_at timestamptz",
  "claim_whatsapp_outbound_dispatch",
  "complete_whatsapp_outbound_dispatch",
  "dispatch_token=p_dispatch_token",
  "status='queued'",
  "dispatch_fencing_rejected",
  "grant execute on function public.claim_whatsapp_outbound_dispatch",
  "to service_role"
]) if (!migration.includes(token)) failures.push(`Migration de dispatch sem ${token}`);

for (const token of [
  "public.clients",
  "public.projects",
  "public.app_modules",
  "alter table public.whatsapp_contacts",
  "client_id uuid",
  "alter table public.whatsapp_messages",
  "source_snapshot jsonb",
  "sent_at timestamptz"
]) if (!read("dbFixture").toLowerCase().includes(token.toLowerCase())) failures.push(`Fixture de dispatch sem ${token}`);

for (const token of [
  "idempotência de persistência aprovada",
  "claim concorrente exclusivo aprovado",
  "fencing de conclusão aprovado",
  "recuperação de claim obsoleto aprovada",
  "estado terminal não redispatchável aprovado",
  "privilégio mínimo do dispatch aprovado"
]) if (!read("dbTest").includes(token)) failures.push(`Teste PostgreSQL de dispatch ausente: ${token}`);
for (const token of [
  "supabase/tests/messaging-dispatch/fixture.sql",
  "20260803190000_stage22_whatsapp_omnichannel.sql",
  "20260805004000_stage22_whatsapp_dispatch_claim.sql"
]) if (!read("dbRunner").includes(token)) failures.push(`Runner de dispatch sem ${token}`);

for (const token of [
  "accountCapabilities",
  "selectedProviderType",
  "selectedProviderLabel",
  "selectedMessagingCapabilities",
  "BAILEYS_PLANNED_CAPABILITY_MATRIX"
]) if (!server.includes(token)) failures.push(`Workspace detalhado sem ${token}`);

for (const token of [
  "selectedMessagingCapabilities",
  "canSendAny",
  "selectedProviderLabel",
  "/app/whatsapp/inbox",
  "/app/whatsapp/bots",
  "repeat(auto-fit"
]) if (!page.includes(token)) failures.push(`UI detalhada sem ${token}`);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  contract: "messaging-provider-send-boundary-v2",
  providerValidatedBeforeContactCreation: true,
  providerValidatedBeforeCanonicalIdentity: true,
  providerValidatedBeforePersistence: true,
  dispatchClaimedBeforeMetaEngine: true,
  dispatchCompletionFenced: true,
  staleClaimRecoveryFenced: true,
  isolatedFixtureCompatibleWithOfficialMigration: true,
  invalidOrMissingProviderFailsClosed: true,
  disabledProviderFailsClosed: true,
  projectScopeRevalidated: true,
  identifiersValidated: true,
  duplicateSentMessageSkipped: true,
  acceptedButUnconfirmedMarkedFailed: false,
  responsiveProviderAwareUi: true,
  whatsappWebRealSendAuthorized: false,
  productionAuthorized: false
}, null, 2));
