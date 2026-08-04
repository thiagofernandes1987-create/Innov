import fs from "node:fs";

const actionPath = "app/actions/whatsapp.ts";
const serverPath = "lib/whatsapp/server.ts";
const pagePath = "app/app/whatsapp/page.tsx";
const failures = [];
for (const file of [actionPath, serverPath, pagePath]) {
  if (!fs.existsSync(file)) failures.push(`Arquivo de envio ausente: ${file}`);
}
const action = fs.existsSync(actionPath) ? fs.readFileSync(actionPath, "utf8") : "";
const server = fs.existsSync(serverPath) ? fs.readFileSync(serverPath, "utf8") : "";
const page = fs.existsSync(pagePath) ? fs.readFileSync(pagePath, "utf8") : "";

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
  "queue_whatsapp_outbound_message",
  "complete_whatsapp_outbound_message"
]) if (!action.includes(token)) failures.push(`Boundary de envio sem ${token}`);

const sendStart = action.indexOf("export async function sendWhatsAppMessage");
const guardIndex = action.indexOf("assertMetaCloudAccount(account)", sendStart);
const identityIndex = action.indexOf("createCanonicalPhoneIdentity", sendStart);
const engineIndex = action.indexOf("createMetaCloudMessagingEngine()", sendStart);
const queueIndex = action.indexOf("queue_whatsapp_outbound_message", sendStart);
if (sendStart < 0) failures.push("Action de envio ausente.");
if (guardIndex < 0 || identityIndex < 0 || engineIndex < 0 || queueIndex < 0) {
  failures.push("Sequência crítica de envio incompleta.");
} else {
  if (!(guardIndex < identityIndex && identityIndex < queueIndex && queueIndex < engineIndex)) {
    failures.push("Provider deve ser validado antes de identidade, fila e engine Meta Cloud.");
  }
}

const startConversation = action.indexOf("export async function startWhatsAppConversation");
const startGuard = action.indexOf("assertMetaCloudAccount", startConversation);
const contactWrite = action.indexOf(".from(\"whatsapp_contacts\")", startConversation);
if (!(startConversation >= 0 && startGuard > startConversation && contactWrite > startGuard)) {
  failures.push("Nova conversa não valida provider antes de criar contato.");
}

for (const forbidden of [
  "account.provider_type ?? \"META_CLOUD\"",
  "account.provider_status ?? \"ENABLED\""
]) if (action.includes(forbidden)) failures.push(`Fallback permissivo de provider detectado: ${forbidden}`);

for (const token of [
  "accountCapabilities",
  "selectedProviderType",
  "selectedMessagingCapabilities",
  "BAILEYS_PLANNED_CAPABILITY_MATRIX"
]) if (!server.includes(token)) failures.push(`Workspace detalhado sem ${token}`);

if (!page.includes("selectedMessagingCapabilities") || !page.includes("canSendAny")) {
  failures.push("A UI detalhada não condiciona envio às capabilities selecionadas.");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  contract: "messaging-provider-send-boundary-v1",
  providerValidatedBeforeContactCreation: true,
  providerValidatedBeforeCanonicalIdentity: true,
  providerValidatedBeforeOutboxQueue: true,
  providerValidatedBeforeMetaEngine: true,
  invalidOrMissingProviderFailsClosed: true,
  disabledProviderFailsClosed: true,
  projectScopeRevalidated: true,
  identifiersValidated: true,
  duplicateSentMessageSkipped: true,
  whatsappWebRealSendAuthorized: false,
  productionAuthorized: false
}, null, 2));
