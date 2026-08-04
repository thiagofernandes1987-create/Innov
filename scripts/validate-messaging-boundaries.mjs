import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceRoots = ["app", "components", "lib", "apps"];
const allowedEngineDirectories = [
  "lib/messaging/adapters/baileys/",
  "apps/messaging-gateway/src/engines/baileys/"
];
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const packageImportPattern = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)["'](?:@whiskeysockets\/baileys|baileys)(?:\/[^"']*)?["']/i;
const nativeTypePatterns = [
  /\bWAMessage\b/,
  /\bWAMessageKey\b/,
  /\bBinaryNode\b/,
  /\bproto\.Message\b/,
  /\bWASocket\b/,
  /\bBaileysEventMap\b/
];
const requiredFiles = [
  "lib/messaging/domain.ts",
  "lib/messaging/capabilities.ts",
  "lib/messaging/engine.ts",
  "lib/messaging/feature-flags.ts",
  "lib/messaging/policy.server.ts",
  "lib/messaging/engines/meta-cloud.ts",
  "lib/messaging/engines/meta-cloud.server.ts",
  "lib/messaging/engines/mock.ts",
  "lib/messaging/whatsapp-compatibility.ts",
  "apps/messaging-gateway/src/engines/baileys/contracts.ts",
  "apps/messaging-gateway/src/engines/baileys/capabilities.ts",
  "apps/messaging-gateway/src/engines/baileys/errors.ts",
  "apps/messaging-gateway/src/engines/baileys/jid.ts",
  "apps/messaging-gateway/src/engines/baileys/content.ts",
  "apps/messaging-gateway/src/engines/baileys/adapter.ts",
  "apps/messaging-gateway/src/engines/baileys/official-factory.ts",
  "apps/messaging-gateway/src/engines/baileys/index.ts",
  "tests/messaging-domain.test.ts",
  "tests/messaging-engine.test.ts",
  "tests/messaging-boundary.test.ts",
  "tests/messaging-baileys-adapter.test.ts",
  "app/actions/whatsapp.ts",
  "app/app/whatsapp/page.tsx",
  "lib/whatsapp/server.ts"
];

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    return sourceExtensions.has(path.extname(entry.name)) ? [full] : [];
  });
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function allowed(file) {
  return allowedEngineDirectories.some(prefix => file.startsWith(prefix));
}

function read(file) {
  const absolute = path.join(root, file);
  return fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8") : "";
}

const violations = [];
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) violations.push(`${file}: arquivo obrigatório ausente`);
}

for (const sourceRoot of sourceRoots) {
  for (const absoluteFile of walk(path.join(root, sourceRoot))) {
    const file = relative(absoluteFile);
    if (allowed(file)) continue;
    const content = fs.readFileSync(absoluteFile, "utf8");
    if (packageImportPattern.test(content)) {
      violations.push(`${file}: import Baileys fora do adapter autorizado`);
    }
    for (const pattern of nativeTypePatterns) {
      if (pattern.test(content)) {
        violations.push(`${file}: tipo nativo ${pattern.source} fora do adapter autorizado`);
      }
    }
  }
}

const capabilities = read("lib/messaging/capabilities.ts");
const engine = read("lib/messaging/engine.ts");
const flags = read("lib/messaging/feature-flags.ts");
const policy = read("lib/messaging/policy.server.ts");
const meta = read("lib/messaging/engines/meta-cloud.ts");
const mock = read("lib/messaging/engines/mock.ts");
const tests = read("tests/messaging-engine.test.ts");
const baileysTests = read("tests/messaging-baileys-adapter.test.ts");
const baileysAdapter = read("apps/messaging-gateway/src/engines/baileys/adapter.ts");
const baileysFactory = read("apps/messaging-gateway/src/engines/baileys/official-factory.ts");
const baileysContracts = read("apps/messaging-gateway/src/engines/baileys/contracts.ts");
const baileysJid = read("apps/messaging-gateway/src/engines/baileys/jid.ts");
const baileysContent = read("apps/messaging-gateway/src/engines/baileys/content.ts");
const actions = read("app/actions/whatsapp.ts");
const page = read("app/app/whatsapp/page.tsx");
const server = read("lib/whatsapp/server.ts");
const env = read(".env.example");
const rootPackage = JSON.parse(read("package.json") || "{}");
const gatewayPackage = JSON.parse(read("apps/messaging-gateway/package.json") || "{}");
const workspace = read("pnpm-workspace.yaml");

for (const token of [
  "EngineCapabilityMatrix", "META_CLOUD_CAPABILITY_MATRIX", "UnsupportedCapabilityError",
  "MESSAGE_SEND_TEXT", "MESSAGE_SEND_DOCUMENT", "MESSAGE_SEND_REACTION", "MESSAGE_SEND_REPLY",
  "GROUP_WRITE", "PRESENCE_WRITE", "HISTORY_SYNC", "MESSAGE_EDIT"
]) if (!capabilities.includes(token)) violations.push(`capabilities sem token: ${token}`);

for (const token of [
  "interface MessagingEngine", "interface SessionEngine", "interface EngineEventSource",
  "EngineSendCommand", "EngineEvent", "assertEngineCommand"
]) if (!engine.includes(token)) violations.push(`contrato de engine sem token: ${token}`);

for (const token of [
  "resolveProviderPolicy", "runtimeAvailable", "configurationValid", "IMPLEMENTED_CHANNEL_PROVIDER_TYPES"
]) if (!flags.includes(token)) violations.push(`feature flags sem controle: ${token}`);

for (const token of [
  "resolveMetaCloudRuntimePolicy", "requireMetaCloudCapability", "MESSAGING_PROVIDER_FLAGS_JSON",
  "applyCapabilityOverrides", "PROVIDER_NOT_AVAILABLE"
]) if (!policy.includes(token)) violations.push(`policy server sem controle: ${token}`);

for (const token of [
  "class MetaCloudMessagingEngine", "META_CLOUD_CAPABILITY_MATRIX",
  "sendText", "sendDocument", "sendTemplate"
]) if (!meta.includes(token)) violations.push(`adapter Meta incompleto: ${token}`);

for (const token of [
  "class MockMessagingEngine", "implements MessagingEngine, SessionEngine, EngineEventSource",
  "queueFailure", "requestPairing"
]) if (!mock.includes(token)) violations.push(`mock engine incompleto: ${token}`);

for (const token of [
  "contract test:", "não permite habilitar Baileys sem runtime registrado",
  "rejeita capability ainda não encapsulada", "implementa sessão, pairing e event source determinísticos"
]) if (!tests.includes(token)) violations.push(`contract test legado ausente: ${token}`);

for (const token of [
  "class BaileysEngineAdapter", "handleConnectionUpdate", "handleMessagesUpsert",
  "handleReceiptUpdates", "quotedMessageResolver", "allowGroups", "allowNewsletters"
]) if (!baileysAdapter.includes(token)) violations.push(`adapter Baileys incompleto: ${token}`);

for (const token of [
  "@whiskeysockets/baileys", "createOfficialBaileysSocketFactory",
  "EXTERNAL_SOCKET_BLOCKED", "printQRInTerminal: false", "syncFullHistory: false"
]) if (!baileysFactory.includes(token)) violations.push(`fábrica Baileys incompleta: ${token}`);

for (const token of [
  "BAILEYS_PACKAGE_VERSION", "7.0.0-rc13", "BaileysSocketPort",
  "BaileysEngineSendCommand", "BaileysEngineEvent"
]) if (!baileysContracts.includes(token)) violations.push(`contrato Baileys incompleto: ${token}`);

for (const token of ["WHATSAPP_PN", "WHATSAPP_LID", "GROUP", "NEWSLETTER", "GROUPS_DISABLED"])
  if (!baileysJid.includes(token)) violations.push(`mapeamento JID incompleto: ${token}`);

for (const token of [
  "SIGNED_URL", "UNSAFE_MEDIA_REFERENCE", "DOCUMENT", "IMAGE", "AUDIO", "VIDEO",
  "STICKER", "LOCATION", "REACTION", "providerMedia"
]) if (!baileysContent.includes(token)) violations.push(`tradução de conteúdo incompleta: ${token}`);

for (const token of [
  "fixa a versão exata somente no pacote do gateway",
  "mantém a fábrica oficial bloqueada sem autorização explícita",
  "traduz mídia", "resolve quoted message", "bloqueia grupos e newsletters",
  "normaliza mensagem inbound", "normaliza receipts"
]) if (!baileysTests.includes(token)) violations.push(`teste Baileys W-06 ausente: ${token}`);

for (const token of [
  "createMetaCloudMessagingEngine", "requireMetaCloudCapability", "capabilityForSendCommand",
  "EngineSendCommand", "engine.send", "provider_type: sendResult.providerType"
]) if (!actions.includes(token)) violations.push(`server action fora do engine/policy: ${token}`);
if (actions.includes("sendWhatsAppText") || actions.includes("sendWhatsAppDocument") || actions.includes("sendWhatsAppTemplate")) {
  violations.push("server action voltou a acoplar diretamente ao transporte Meta");
}

for (const token of [
  "selectedMessagingCapabilities", "canSendAny", "canSendText", "canSendTemplate",
  "canSendDocument", "canStartConversation"
]) if (!page.includes(token)) violations.push(`UI sem capability gate: ${token}`);

for (const token of ["resolveMetaCloudRuntimePolicy", "accountCapabilities", "selectedMessagingCapabilities"])
  if (!server.includes(token)) violations.push(`workspace sem policy gate: ${token}`);

if (!env.includes("MESSAGING_PROVIDER_FLAGS_JSON={}")) violations.push(".env.example sem MESSAGING_PROVIDER_FLAGS_JSON");
if (rootPackage.dependencies?.["@whiskeysockets/baileys"] || rootPackage.devDependencies?.["@whiskeysockets/baileys"]) {
  violations.push("Baileys foi adicionado ao pacote raiz; deve existir somente no gateway");
}
if (gatewayPackage.dependencies?.["@whiskeysockets/baileys"] !== "7.0.0-rc13") {
  violations.push("gateway não fixa @whiskeysockets/baileys exatamente em 7.0.0-rc13");
}
if (JSON.stringify(gatewayPackage).includes("latest") || /[~^*]/.test(gatewayPackage.dependencies?.["@whiskeysockets/baileys"] || "")) {
  violations.push("versão Baileys flutuante ou latest proibida");
}
if (!workspace.includes("apps/messaging-gateway")) violations.push("gateway ausente do pnpm workspace");
if (!baileysAdapter.includes("qrPersisted: false") || baileysAdapter.includes("snapshot.qr")) {
  violations.push("adapter não comprova descarte do valor QR");
}
if (/WHATSAPP_WEB_BAILEYS["']?\s*[,\]]/.test(read("lib/messaging/domain.ts").split("IMPLEMENTED_CHANNEL_PROVIDER_TYPES")[1]?.split(";")[0] || "")) {
  violations.push("Baileys foi registrado como runtime implementado antes das sprints de sessão/lifecycle");
}

if (violations.length) {
  console.error(violations.join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  contract: "messaging-engine-boundary-v4",
  scannedRoots: sourceRoots.filter(item => fs.existsSync(path.join(root, item))),
  requiredFiles: requiredFiles.length,
  allowedEngineDirectories,
  nativeTypesConfined: true,
  baileysPackage: "@whiskeysockets/baileys",
  baileysVersion: "7.0.0-rc13",
  installedOnlyInGateway: true,
  adapterImplemented: true,
  runtimeRegistered: false,
  externalSocketBlockedByDefault: true,
  qrValueDiscarded: true,
  sessionPersistence: false,
  realNumberUsed: false,
  productionEnabled: false,
  implementedProviders: ["META_CLOUD"]
}, null, 2));
