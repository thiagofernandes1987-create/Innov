import fs from "node:fs";

const root = "apps/messaging-gateway";
const smokeFile = "scripts/run-messaging-gateway-container-smoke.sh";
const lockGateFile = "scripts/verify-w06-lockfile.mjs";
const requiredFiles = [
  `${root}/package.json`, `${root}/tsconfig.json`, `${root}/README.md`, `${root}/Dockerfile`,
  `${root}/compose.yaml`, `${root}/src/config.ts`, `${root}/src/contracts.ts`,
  `${root}/src/security.ts`, `${root}/src/replay-guard.ts`, `${root}/src/metrics.ts`,
  `${root}/src/fake-client.ts`, `${root}/src/server.ts`, `${root}/src/index.ts`,
  `${root}/src/engines/baileys/adapter.ts`, `${root}/src/engines/baileys/official-factory.ts`,
  "tests/messaging-gateway.test.ts", "tests/messaging-baileys-adapter.test.ts",
  smokeFile, lockGateFile
];
const failures = [];
for (const file of requiredFiles) if (!fs.existsSync(file)) failures.push(`Arquivo ausente: ${file}`);
const read = file => fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
const packageJson = JSON.parse(read(`${root}/package.json`) || "{}");
const rootPackage = JSON.parse(read("package.json") || "{}");
const baseSources = [
  `${root}/src/config.ts`, `${root}/src/contracts.ts`, `${root}/src/security.ts`,
  `${root}/src/replay-guard.ts`, `${root}/src/metrics.ts`, `${root}/src/fake-client.ts`,
  `${root}/src/server.ts`, `${root}/src/index.ts`
].map(read).join("\n");
const config = read(`${root}/src/config.ts`);
const security = read(`${root}/src/security.ts`);
const replay = read(`${root}/src/replay-guard.ts`);
const server = read(`${root}/src/server.ts`);
const gatewayIndex = read(`${root}/src/index.ts`);
const fakeClient = read(`${root}/src/fake-client.ts`);
const adapter = read(`${root}/src/engines/baileys/adapter.ts`);
const factory = read(`${root}/src/engines/baileys/official-factory.ts`);
const dockerfile = read(`${root}/Dockerfile`);
const compose = read(`${root}/compose.yaml`);
const tests = read("tests/messaging-gateway.test.ts");
const baileysTests = read("tests/messaging-baileys-adapter.test.ts");
const smoke = read(smokeFile);
const lockGate = read(lockGateFile);
const ci = read(".github/workflows/ci.yml");
const workspace = read("pnpm-workspace.yaml");

if (packageJson.engines?.node !== ">=24 <25") failures.push("Gateway não fixa compatibilidade com Node.js 24.");
const dependencies = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
if (Object.keys(dependencies).length !== 1 || dependencies["@whiskeysockets/baileys"] !== "7.0.0-rc13") {
  failures.push("Gateway W-06 deve possuir somente @whiskeysockets/baileys@7.0.0-rc13 como dependência própria.");
}
if (rootPackage.dependencies?.["@whiskeysockets/baileys"] || rootPackage.devDependencies?.["@whiskeysockets/baileys"]) {
  failures.push("Baileys não pode ser dependência do pacote raiz.");
}
for (const token of ["@whiskeysockets/baileys", "WAMessage", "WAMessageKey", "WASocket"])
  if (baseSources.includes(token)) failures.push(`Tipo/SDK de canal escapou para o runtime base: ${token}`);
for (const token of ["DATABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "WHATSAPP_ACCESS_TOKEN"])
  if (baseSources.includes(token) || compose.includes(token) || adapter.includes(token)) failures.push(`Credencial ou banco principal acoplado ao gateway: ${token}`);

for (const token of [
  "GATEWAY_HMAC_SECRET", "GATEWAY_INSTANCE_ID", "GATEWAY_REPLAY_WINDOW_SECONDS",
  "GATEWAY_MAX_BODY_BYTES", "GATEWAY_SHUTDOWN_TIMEOUT_MS"
]) if (!config.includes(token)) failures.push(`Configuração tipada ausente: ${token}`);
for (const token of ["createHmac", "timingSafeEqual", "sha256Hex", "x-innov-signature"])
  if (!security.includes(token)) failures.push(`Controle HMAC ausente: ${token}`);
for (const token of ["REPLAY_DETECTED", "STALE_REQUEST", "maxEntries", "purge"])
  if (!replay.includes(token)) failures.push(`Replay guard incompleto: ${token}`);
for (const token of ["/health", "/ready", "/metrics", "/internal/commands", "closeAllConnections", "closeIdleConnections"])
  if (!server.includes(token)) failures.push(`Lifecycle/API ausente: ${token}`);
for (const token of ["correlationId", "causationId", "payloadSha256", "fake: true"])
  if (!fakeClient.includes(token)) failures.push(`Cliente fake sem contrato: ${token}`);
for (const token of ["class BaileysEngineAdapter", "socketFactory", "qrPersisted: false"])
  if (!adapter.includes(token)) failures.push(`Adapter W-06 incompleto: ${token}`);
for (const token of ["createOfficialBaileysSocketFactory", "EXTERNAL_SOCKET_BLOCKED", "import(\"@whiskeysockets/baileys\")"])
  if (!factory.includes(token)) failures.push(`Fábrica W-06 incompleta: ${token}`);
if (gatewayIndex.includes("engines/baileys") || gatewayIndex.includes("BaileysEngineAdapter")) {
  failures.push("Gateway base registrou Baileys no runtime antes de W-07/W-08.");
}
for (const token of ["USER 10001:10001", "STOPSIGNAL SIGTERM", "verify-w06-lockfile.mjs"])
  if (!dockerfile.includes(token)) failures.push(`Container sem hardening/reprodutibilidade: ${token}`);
for (const token of ["read_only: true", "cap_drop:", "no-new-privileges:true", "pids_limit: 128", "mem_limit: 256m", "cpus: 0.50", "internal: true"])
  if (!compose.includes(token)) failures.push(`Limite/isolamento ausente: ${token}`);
for (const token of ["--network none", "--read-only", "--cap-drop ALL", "10001:10001", "gateway_shutdown_completed"])
  if (!smoke.includes(token)) failures.push(`Smoke test de container incompleto: ${token}`);
for (const token of [
  "ce984fcb21008b5210e35c76287752374de2fd262efd8e4e382939b60a443fff",
  "messaging-w06-lockfile-v1", "libsignal@6.0.0", "whatsapp-rust-bridge@0.5.4"
]) if (!lockGate.includes(token)) failures.push(`Gate de lockfile incompleto: ${token}`);
for (const token of ["bloqueia comando sem HMAC", "rejeita replay", "limita o tamanho do corpo", "preserva correlação e causalidade"])
  if (!tests.includes(token)) failures.push(`Teste W-05 ausente: ${token}`);
for (const token of ["fábrica oficial bloqueada", "normaliza mensagem inbound", "normaliza receipts"])
  if (!baileysTests.includes(token)) failures.push(`Teste W-06 ausente: ${token}`);
for (const script of [
  "validate:messaging-gateway", "validate:messaging-lockfile", "test:messaging-gateway",
  "test:messaging-baileys", "test:container:messaging-gateway", "build:messaging-gateway"
]) if (!rootPackage.scripts?.[script]) failures.push(`Script raiz ausente: ${script}`);
for (const token of [
  "Validate messaging gateway skeleton", "Verify resolved W-06 lockfile",
  "Messaging gateway unit tests", "Baileys adapter contract tests",
  "Messaging gateway container smoke test", "Build messaging gateway"
]) if (!ci.includes(token)) failures.push(`CI sem gate explícito: ${token}`);
if (!ci.includes("--ignore-scripts")) failures.push("CI permite lifecycle scripts de dependências.");
if (!dockerfile.includes("--ignore-scripts")) failures.push("Docker permite lifecycle scripts de dependências.");
if (!workspace.includes("apps/messaging-gateway")) failures.push("Gateway ausente do workspace pnpm.");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  contract: "messaging-gateway-boundary-v4",
  node: packageJson.engines.node,
  endpoints: 4,
  ownDependencies: 1,
  baileysVersion: "7.0.0-rc13",
  baileysConfined: true,
  baileysRuntimeRegistered: false,
  externalSocketBlockedByDefault: true,
  lifecycleScriptsExecuted: false,
  resolvedLockfileSha256: "ce984fcb21008b5210e35c76287752374de2fd262efd8e4e382939b60a443fff",
  databaseAccess: false,
  nonRootUid: 10001,
  internalNetwork: true,
  containerSmokeRequired: true,
  activeChannelClient: "fake"
}, null, 2));
