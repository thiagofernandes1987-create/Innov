import fs from "node:fs";

const root = "apps/messaging-gateway";
const smokeFile = "scripts/run-messaging-gateway-container-smoke.sh";
const requiredFiles = [
  `${root}/package.json`,
  `${root}/tsconfig.json`,
  `${root}/README.md`,
  `${root}/Dockerfile`,
  `${root}/compose.yaml`,
  `${root}/src/config.ts`,
  `${root}/src/contracts.ts`,
  `${root}/src/security.ts`,
  `${root}/src/replay-guard.ts`,
  `${root}/src/metrics.ts`,
  `${root}/src/fake-client.ts`,
  `${root}/src/server.ts`,
  `${root}/src/index.ts`,
  "tests/messaging-gateway.test.ts",
  smokeFile
];
const failures = [];
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) failures.push(`Arquivo ausente: ${file}`);
}
const read = file => fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
const packageJson = JSON.parse(read(`${root}/package.json`) || "{}");
const rootPackage = JSON.parse(read("package.json") || "{}");
const sources = requiredFiles.filter(file => file.includes("/src/")).map(read).join("\n");
const config = read(`${root}/src/config.ts`);
const security = read(`${root}/src/security.ts`);
const replay = read(`${root}/src/replay-guard.ts`);
const server = read(`${root}/src/server.ts`);
const fakeClient = read(`${root}/src/fake-client.ts`);
const dockerfile = read(`${root}/Dockerfile`);
const compose = read(`${root}/compose.yaml`);
const tests = read("tests/messaging-gateway.test.ts");
const smoke = read(smokeFile);
const ci = read(".github/workflows/ci.yml");

if (packageJson.engines?.node !== ">=24 <25") failures.push("Gateway não fixa compatibilidade com Node.js 24.");
const dependencies = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
if (Object.keys(dependencies).length !== 0) failures.push("Gateway W-05 deve permanecer sem dependências próprias.");
for (const token of ["@whiskeysockets/baileys", "whatsapp-web.js", "WAMessage", "useMultiFileAuthState"])
  if (sources.includes(token) || JSON.stringify(packageJson).includes(token)) failures.push(`Dependência/tipo de canal proibido na W-05: ${token}`);
for (const token of ["DATABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "WHATSAPP_ACCESS_TOKEN"])
  if (sources.includes(token) || compose.includes(token)) failures.push(`Credencial ou banco principal acoplado ao gateway: ${token}`);

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
for (const token of ["USER 10001:10001", "STOPSIGNAL SIGTERM"])
  if (!dockerfile.includes(token)) failures.push(`Container sem hardening: ${token}`);
for (const token of ["read_only: true", "cap_drop:", "no-new-privileges:true", "pids_limit: 128", "mem_limit: 256m", "cpus: 0.50", "internal: true"])
  if (!compose.includes(token)) failures.push(`Limite/isolamento ausente: ${token}`);
for (const token of ["--network none", "--read-only", "--cap-drop ALL", "10001:10001", "gateway_shutdown_completed"])
  if (!smoke.includes(token)) failures.push(`Smoke test de container incompleto: ${token}`);
for (const token of ["bloqueia comando sem HMAC", "rejeita replay", "limita o tamanho do corpo", "preserva correlação e causalidade"])
  if (!tests.includes(token)) failures.push(`Teste W-05 ausente: ${token}`);
for (const script of [
  "validate:messaging-gateway", "test:messaging-gateway",
  "test:container:messaging-gateway", "build:messaging-gateway"
]) if (!rootPackage.scripts?.[script]) failures.push(`Script raiz ausente: ${script}`);
for (const token of [
  "Validate messaging gateway skeleton", "Messaging gateway unit tests",
  "Messaging gateway container smoke test", "Build messaging gateway"
]) if (!ci.includes(token)) failures.push(`CI sem gate explícito: ${token}`);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  contract: "messaging-gateway-boundary-v2",
  node: packageJson.engines.node,
  endpoints: 4,
  ownDependencies: 0,
  whatsappSdk: false,
  databaseAccess: false,
  nonRootUid: 10001,
  internalNetwork: true,
  containerSmokeRequired: true,
  fakeClientOnly: true
}, null, 2));
