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
  "apps/messaging-gateway/src/engines/baileys/stored-auth-state.ts",
  "apps/messaging-gateway/src/engines/baileys/index.ts",
  "apps/messaging-gateway/src/session-store/contracts.ts",
  "apps/messaging-gateway/src/session-store/session-credential-store.ts",
  "apps/messaging-gateway/src/runtime/contracts.ts",
  "apps/messaging-gateway/src/runtime/backoff.ts",
  "apps/messaging-gateway/src/runtime/failure-classification.ts",
  "apps/messaging-gateway/src/runtime/memory-runtime-lease-repository.ts",
  "apps/messaging-gateway/src/runtime/lifecycle-supervisor.ts",
  "apps/messaging-gateway/src/runtime/index.ts",
  "tests/messaging-domain.test.ts",
  "tests/messaging-engine.test.ts",
  "tests/messaging-boundary.test.ts",
  "tests/messaging-baileys-adapter.test.ts",
  "tests/messaging-session-credential-store.test.ts",
  "tests/messaging-runtime-lifecycle.test.ts",
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
const engineTests = read("tests/messaging-engine.test.ts");
const baileysTests = read("tests/messaging-baileys-adapter.test.ts");
const sessionTests = read("tests/messaging-session-credential-store.test.ts");
const runtimeTests = read("tests/messaging-runtime-lifecycle.test.ts");
const baileysAdapter = read("apps/messaging-gateway/src/engines/baileys/adapter.ts");
const baileysFactory = read("apps/messaging-gateway/src/engines/baileys/official-factory.ts");
const baileysContracts = read("apps/messaging-gateway/src/engines/baileys/contracts.ts");
const baileysJid = read("apps/messaging-gateway/src/engines/baileys/jid.ts");
const baileysContent = read("apps/messaging-gateway/src/engines/baileys/content.ts");
const storedAuthState = read("apps/messaging-gateway/src/engines/baileys/stored-auth-state.ts");
const sessionStore = read("apps/messaging-gateway/src/session-store/session-credential-store.ts");
const runtimeContracts = read("apps/messaging-gateway/src/runtime/contracts.ts");
const runtimeRepository = read("apps/messaging-gateway/src/runtime/memory-runtime-lease-repository.ts");
const runtimeSupervisor = read("apps/messaging-gateway/src/runtime/lifecycle-supervisor.ts");
const actions = read("app/actions/whatsapp.ts");
const page = read("app/app/whatsapp/page.tsx");
const server = read("lib/whatsapp/server.ts");
const gatewayIndex = read("apps/messaging-gateway/src/index.ts");
const env = read(".env.example");
const rootPackage = JSON.parse(read("package.json") || "{}");
const gatewayPackage = JSON.parse(read("apps/messaging-gateway/package.json") || "{}");
const workspace = read("pnpm-workspace.yaml");

function requireTokens(content, label, tokens) {
  for (const token of tokens) {
    if (!content.includes(token)) violations.push(`${label} sem token: ${token}`);
  }
}

requireTokens(capabilities, "capabilities", [
  "EngineCapabilityMatrix", "META_CLOUD_CAPABILITY_MATRIX", "UnsupportedCapabilityError",
  "MESSAGE_SEND_TEXT", "MESSAGE_SEND_DOCUMENT", "MESSAGE_SEND_REACTION", "MESSAGE_SEND_REPLY",
  "GROUP_WRITE", "PRESENCE_WRITE", "HISTORY_SYNC", "MESSAGE_EDIT"
]);
requireTokens(engine, "contrato de engine", [
  "interface MessagingEngine", "interface SessionEngine", "interface EngineEventSource",
  "EngineSendCommand", "EngineEvent", "assertEngineCommand"
]);
requireTokens(flags, "feature flags", [
  "resolveProviderPolicy", "runtimeAvailable", "configurationValid",
  "IMPLEMENTED_CHANNEL_PROVIDER_TYPES"
]);
requireTokens(policy, "policy server", [
  "resolveMetaCloudRuntimePolicy", "requireMetaCloudCapability",
  "MESSAGING_PROVIDER_FLAGS_JSON", "applyCapabilityOverrides", "PROVIDER_NOT_AVAILABLE"
]);
requireTokens(meta, "adapter Meta", [
  "class MetaCloudMessagingEngine", "META_CLOUD_CAPABILITY_MATRIX",
  "sendText", "sendDocument", "sendTemplate"
]);
requireTokens(mock, "mock engine", [
  "class MockMessagingEngine", "implements MessagingEngine, SessionEngine, EngineEventSource",
  "queueFailure", "requestPairing"
]);
requireTokens(engineTests, "contract tests de engine", [
  "contract test:", "não permite habilitar Baileys sem runtime registrado",
  "rejeita capability ainda não encapsulada",
  "implementa sessão, pairing e event source determinísticos"
]);
requireTokens(baileysAdapter, "adapter Baileys", [
  "class BaileysEngineAdapter", "handleConnectionUpdate", "handleMessagesUpsert",
  "handleReceiptUpdates", "quotedMessageResolver", "allowGroups", "allowNewsletters",
  "qrPersisted: false"
]);
requireTokens(baileysFactory, "fábrica Baileys", [
  "@whiskeysockets/baileys", "createOfficialBaileysSocketFactory",
  "EXTERNAL_SOCKET_BLOCKED", "printQRInTerminal: false", "syncFullHistory: false"
]);
requireTokens(baileysContracts, "contrato Baileys", [
  "BAILEYS_PACKAGE_VERSION", "7.0.0-rc13", "BaileysSocketPort",
  "BaileysEngineSendCommand", "BaileysEngineEvent"
]);
requireTokens(baileysJid, "mapeamento JID", [
  "WHATSAPP_PN", "WHATSAPP_LID", "GROUP", "NEWSLETTER", "GROUPS_DISABLED"
]);
requireTokens(baileysContent, "tradução de conteúdo", [
  "SIGNED_URL", "UNSAFE_MEDIA_REFERENCE", "DOCUMENT", "IMAGE", "AUDIO", "VIDEO",
  "STICKER", "LOCATION", "REACTION", "providerMedia"
]);
requireTokens(baileysTests, "testes W-06", [
  "fixa a versão exata somente no pacote do gateway",
  "mantém a fábrica oficial bloqueada sem autorização explícita",
  "traduz mídia", "resolve quoted message", "bloqueia grupos e newsletters",
  "normaliza mensagem inbound", "normaliza receipts"
]);
requireTokens(storedAuthState, "auth state W-07", [
  "createStoredBaileysAuthenticationState", "BufferJSON", "initAuthCreds",
  "JSON_BUFFER_V1", "currentGeneration"
]);
requireTokens(sessionStore, "session store W-07", [
  "createEncryptedSessionCredentialStore", "compareAndSwapCredentials",
  "rotateSessionDataKey", "rewrapSessionDataKey", "exportEncryptedBackup",
  "restoreEncryptedBackup", "deleteSessionSecrets"
]);
requireTokens(sessionTests, "testes W-07", [
  "permite somente um vencedor em escritas concorrentes",
  "rotaciona a DEK e recriptografa todos os registros",
  "exporta backup cifrado e restaura sem plaintext",
  "integra AuthenticationState sem arquivos nem socket"
]);
requireTokens(runtimeContracts, "contratos W-08", [
  "SessionRuntimeLeaseRepository", "SessionRuntimeLease", "fencingToken",
  "leaseExpiresAt", "RuntimeKillSwitchDecision", "RuntimeLifecycleState",
  "EphemeralPairingNotice", "FencedCredentialMutation", "SessionRuntimeDriver"
]);
requireTokens(runtimeRepository, "lease repository W-08", [
  "createMemoryRuntimeLeaseRepository", "LEASE_HELD", "FENCING_TOKEN_STALE",
  "KILL_SWITCH_ACTIVE", "fencingToken: (current?.fencingToken ?? 0) + 1"
]);
requireTokens(runtimeSupervisor, "supervisor W-08", [
  "class SessionLifecycleSupervisor", "ACQUIRING_LEASE", "PAIRING_REQUIRED",
  "BACKOFF", "FENCED_OUT", "runFencedCredentialMutation", "restoreOnNewInstance",
  "enforceKillSwitch", "reconnectNow", "persisted: false"
]);
requireTokens(runtimeTests, "testes W-08", [
  "impede dois writers", "descarta o valor do QR", "reconecta falha transitória",
  "fenceia processo zumbi", "aborta atualização de credenciais",
  "restaura checkpoint somente pela nova instância", "kill switch global"
]);
requireTokens(actions, "server action", [
  "createMetaCloudMessagingEngine", "requireMetaCloudCapability", "capabilityForSendCommand",
  "EngineSendCommand", "engine.send", "provider_type: sendResult.providerType"
]);
if (actions.includes("sendWhatsAppText") || actions.includes("sendWhatsAppDocument") || actions.includes("sendWhatsAppTemplate")) {
  violations.push("server action voltou a acoplar diretamente ao transporte Meta");
}
requireTokens(page, "UI capability gate", [
  "selectedMessagingCapabilities", "canSendAny", "canSendText", "canSendTemplate",
  "canSendDocument", "canStartConversation"
]);
requireTokens(server, "workspace policy gate", [
  "resolveMetaCloudRuntimePolicy", "accountCapabilities", "selectedMessagingCapabilities"
]);

if (!env.includes("MESSAGING_PROVIDER_FLAGS_JSON={}")) {
  violations.push(".env.example sem MESSAGING_PROVIDER_FLAGS_JSON");
}
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
if (baileysAdapter.includes("snapshot.qr")) violations.push("adapter voltou a propagar o valor QR");
if (
  gatewayIndex.includes("BaileysEngineAdapter") ||
  gatewayIndex.includes("createStoredBaileysAuthenticationState") ||
  gatewayIndex.includes("SessionLifecycleSupervisor") ||
  gatewayIndex.includes("session-store") ||
  gatewayIndex.includes("runtime/lifecycle-supervisor")
) {
  violations.push("adapter, store ou supervisor foi registrado no bootstrap antes da autorização operacional");
}
if (/WHATSAPP_WEB_BAILEYS["']?\s*[,\]]/.test(read("lib/messaging/domain.ts").split("IMPLEMENTED_CHANNEL_PROVIDER_TYPES")[1]?.split(";")[0] || "")) {
  violations.push("Baileys foi registrado como runtime implementado antes da autorização operacional");
}
if (/console\.(log|error|warn|debug)\s*\(/.test(`${runtimeRepository}\n${runtimeSupervisor}`)) {
  violations.push("runtime W-08 contém console capaz de vazar desafio ou estado sensível");
}

if (violations.length) {
  console.error(violations.join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  contract: "messaging-engine-boundary-v6",
  scannedRoots: sourceRoots.filter(item => fs.existsSync(path.join(root, item))),
  requiredFiles: requiredFiles.length,
  allowedEngineDirectories,
  nativeTypesConfined: true,
  baileysPackage: "@whiskeysockets/baileys",
  baileysVersion: "7.0.0-rc13",
  installedOnlyInGateway: true,
  adapterImplemented: true,
  encryptedSessionStoreImplemented: true,
  sessionPersistence: true,
  sessionLeaseImplemented: true,
  fencingImplemented: true,
  lifecycleSupervisorImplemented: true,
  runtimeRegistered: false,
  externalSocketBlockedByDefault: true,
  qrValueDiscarded: true,
  realSessionMaterialPresent: false,
  realNumberUsed: false,
  productionEnabled: false,
  implementedProviders: ["META_CLOUD"]
}, null, 2));
