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
  /\bproto\.Message\b/
];
const requiredFiles = [
  "lib/messaging/domain.ts",
  "lib/messaging/capabilities.ts",
  "lib/messaging/engine.ts",
  "lib/messaging/feature-flags.ts",
  "lib/messaging/engines/meta-cloud.ts",
  "lib/messaging/engines/meta-cloud.server.ts",
  "lib/messaging/engines/mock.ts",
  "lib/messaging/whatsapp-compatibility.ts",
  "tests/messaging-domain.test.ts",
  "tests/messaging-engine.test.ts",
  "tests/messaging-boundary.test.ts",
  "app/app/whatsapp/page.tsx",
  "lib/whatsapp/server.ts"
];

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap(entry => {
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
  if (!fs.existsSync(path.join(root, file))) {
    violations.push(`${file}: arquivo obrigatório ausente`);
  }
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
const meta = read("lib/messaging/engines/meta-cloud.ts");
const mock = read("lib/messaging/engines/mock.ts");
const tests = read("tests/messaging-engine.test.ts");
const page = read("app/app/whatsapp/page.tsx");
const server = read("lib/whatsapp/server.ts");
const env = read(".env.example");
const packageJson = read("package.json");

for (const token of [
  "EngineCapabilityMatrix",
  "META_CLOUD_CAPABILITY_MATRIX",
  "UnsupportedCapabilityError",
  "MESSAGE_SEND_TEXT",
  "MESSAGE_SEND_DOCUMENT",
  "MESSAGE_SEND_REACTION",
  "MESSAGE_SEND_REPLY",
  "GROUP_WRITE",
  "PRESENCE_WRITE",
  "HISTORY_SYNC",
  "MESSAGE_EDIT"
]) {
  if (!capabilities.includes(token)) violations.push(`capabilities sem token: ${token}`);
}

for (const token of [
  "interface MessagingEngine",
  "interface SessionEngine",
  "interface EngineEventSource",
  "EngineSendCommand",
  "EngineEvent",
  "assertEngineCommand"
]) {
  if (!engine.includes(token)) violations.push(`contrato de engine sem token: ${token}`);
}

for (const token of [
  "resolveProviderPolicy",
  "runtimeAvailable",
  "configurationValid",
  "IMPLEMENTED_CHANNEL_PROVIDER_TYPES"
]) {
  if (!flags.includes(token)) violations.push(`feature flags sem controle: ${token}`);
}

for (const token of [
  "class MetaCloudMessagingEngine",
  "META_CLOUD_CAPABILITY_MATRIX",
  "sendText",
  "sendDocument",
  "sendTemplate"
]) {
  if (!meta.includes(token)) violations.push(`adapter Meta incompleto: ${token}`);
}

for (const token of [
  "class MockMessagingEngine",
  "implements MessagingEngine, SessionEngine, EngineEventSource",
  "queueFailure",
  "requestPairing"
]) {
  if (!mock.includes(token)) violations.push(`mock engine incompleto: ${token}`);
}

for (const token of [
  "contract test:",
  "não permite habilitar Baileys sem runtime registrado",
  "rejeita capability ainda não encapsulada",
  "implementa sessão, pairing e event source determinísticos"
]) {
  if (!tests.includes(token)) violations.push(`contract test ausente: ${token}`);
}

for (const token of [
  "selectedMessagingCapabilities",
  "canSendAny",
  "canSendText",
  "canSendTemplate",
  "canSendDocument",
  "canStartConversation"
]) {
  if (!page.includes(token)) violations.push(`UI sem capability gate: ${token}`);
}

for (const token of [
  "MESSAGING_PROVIDER_FLAGS_JSON",
  "applyCapabilityOverrides",
  "deriveMessagingUiCapabilities",
  "accountCapabilities"
]) {
  if (!server.includes(token)) violations.push(`workspace sem policy gate: ${token}`);
}

if (!env.includes("MESSAGING_PROVIDER_FLAGS_JSON={}")) {
  violations.push(".env.example sem MESSAGING_PROVIDER_FLAGS_JSON");
}
if (/[@\/]whiskeysockets\/baileys|["']baileys["']/.test(packageJson)) {
  violations.push("Baileys foi adicionado ao package.json antes da sprint autorizada");
}

if (violations.length) {
  console.error(violations.join("\n"));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      contract: "messaging-engine-boundary-v2",
      scannedRoots: sourceRoots.filter(item => fs.existsSync(path.join(root, item))),
      requiredFiles: requiredFiles.length,
      allowedEngineDirectories,
      forbiddenPackages: ["@whiskeysockets/baileys", "baileys"],
      forbiddenNativeTypes: ["WAMessage", "WAMessageKey", "BinaryNode", "proto.Message"],
      engineContracts: ["MessagingEngine", "SessionEngine", "EngineEventSource"],
      implementedProviders: ["META_CLOUD"],
      baileysInstalled: false,
      uiCapabilityGate: true,
      organizationProviderFlags: true
    },
    null,
    2
  )
);
