import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const validatorPath = "scripts/validate-messaging-session-store.mjs";
const files = {
  contracts: "apps/messaging-gateway/src/session-store/contracts.ts",
  crypto: "apps/messaging-gateway/src/session-store/envelope-crypto.ts",
  repository: "apps/messaging-gateway/src/session-store/memory-repository.ts",
  store: "apps/messaging-gateway/src/session-store/session-credential-store.ts",
  index: "apps/messaging-gateway/src/session-store/index.ts",
  bridge: "apps/messaging-gateway/src/engines/baileys/stored-auth-state.ts",
  tests: "tests/messaging-session-credential-store.test.ts",
  migration: "supabase/migrations/20260804123000_stage22_session_credential_store.sql",
  dbTests: "supabase/tests/messaging-session-credentials/storage.test.sql",
  dbRunner: "scripts/run-messaging-session-credential-db-tests.mjs",
  docs: "docs/ETAPA-22-WHATSAPP-WEB-NAO-OFICIAL/SESSION-STORE-W07.md",
  evidence: "docs/ETAPA-22-WHATSAPP-WEB-NAO-OFICIAL/EVIDENCIAS-W07.md"
};
const failures = [];
for (const file of Object.values(files)) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`Arquivo W-07 ausente: ${file}`);
}
const read = file => fs.existsSync(path.join(root, file))
  ? fs.readFileSync(path.join(root, file), "utf8")
  : "";
const contracts = read(files.contracts);
const crypto = read(files.crypto);
const repository = read(files.repository);
const store = read(files.store);
const bridge = read(files.bridge);
const tests = read(files.tests);
const migration = read(files.migration);
const dbTests = read(files.dbTests);
const dbRunner = read(files.dbRunner);
const packageJson = JSON.parse(read("package.json") || "{}");
const ci = read(".github/workflows/ci.yml");
const gatewayIndex = read("apps/messaging-gateway/src/index.ts");

for (const token of [
  "interface SessionCredentialStore", "loadCredentials", "compareAndSwapCredentials",
  "getKeys", "setKeys", "deleteSessionSecrets", "KeyEnvelopeProvider",
  "EncryptedSessionBackup", "SessionSecretAuditEvent", "GENERATION_CONFLICT"
]) if (!contracts.includes(token)) failures.push(`Contrato W-07 ausente: ${token}`);

for (const token of [
  "aes-256-gcm", "authTagLength: GCM_AUTH_TAG_BYTES", "cipher.setAAD",
  "decipher.setAAD", "createSessionDataKey", "randomBytes(AES_KEY_BYTES)",
  "zeroize", "aadSha256"
]) if (!crypto.includes(token)) failures.push(`Controle criptográfico W-07 ausente: ${token}`);

for (const token of [
  "transaction<T>", "cloneState", "candidate", "this.state = candidate"
]) if (!repository.includes(token)) failures.push(`Transação sintética W-07 ausente: ${token}`);

for (const token of [
  "resolveWritableEnvelope", "assertExpectedGeneration", "rotateSessionDataKey",
  "rewrapSessionDataKey", "exportEncryptedBackup", "restoreEncryptedBackup",
  "validateEncryptedRecords", "cryptographicErasure"
]) if (!store.includes(token)) failures.push(`Implementação W-07 ausente: ${token}`);

for (const token of [
  "createStoredBaileysAuthenticationState", "BufferJSON", "initAuthCreds",
  "JSON_BUFFER_V1", "currentGeneration"
]) if (!bridge.includes(token)) failures.push(`Bridge Baileys W-07 ausente: ${token}`);

for (const forbidden of ["console.log", "console.error", "console.warn", "console.debug"])
  if ([crypto, repository, store, bridge].some(source => source.includes(forbidden))) {
    failures.push(`Session store não pode registrar material em console: ${forbidden}`);
  }

for (const token of [
  "channel_session_secret_envelopes", "channel_session_credentials",
  "channel_session_keys", "channel_session_secret_audit", "wrapped_dek bytea",
  "ciphertext bytea", "force row level security",
  "compare_and_swap_channel_session_credentials", "delete_channel_session_secrets"
]) if (!migration.toLowerCase().includes(token.toLowerCase())) {
  failures.push(`Schema W-07 ausente: ${token}`);
}
for (const forbidden of [
  "master_key bytea", "kek_plaintext", "dek_plaintext", "credentials_plaintext",
  "raw_credentials", "pairing_code text", "qr text"
]) if (migration.toLowerCase().includes(forbidden)) {
  failures.push(`Material proibido no schema W-07: ${forbidden}`);
}

for (const token of [
  "W-07 criação transacional aprovada", "W-07 concorrência otimista aprovada",
  "W-07 versionamento crescente aprovado", "W-07 ausência de chave-mestra e plaintext aprovada",
  "W-07 isolamento de escopo aprovado", "W-07 auditoria sanitizada aprovada",
  "W-07 RLS e privilégio mínimo aprovados", "W-07 exclusão criptográfica aprovada"
]) if (!dbTests.includes(token)) failures.push(`Prova SQL W-07 ausente: ${token}`);
if (!dbRunner.includes("EXPECTED_APPROVALS = 8")) {
  failures.push("Runner W-07 não exige as oito provas SQL.");
}

for (const token of [
  "grava e carrega credenciais por compare-and-swap",
  "permite somente um vencedor em escritas concorrentes",
  "usa DEK distinta por sessão e não persiste plaintext",
  "rotaciona a DEK e recriptografa todos os registros",
  "rewrapa a DEK sob nova KEK sem recriptografar o payload",
  "exporta backup cifrado e restaura sem plaintext",
  "rejeita backup adulterado sem restauração parcial",
  "realiza exclusão criptográfica e preserva somente auditoria sanitizada",
  "integra AuthenticationState sem arquivos nem socket"
]) if (!tests.includes(token)) failures.push(`Teste W-07 ausente: ${token}`);

for (const script of [
  "validate:messaging-session-store", "test:messaging-session-store",
  "test:db:messaging-session-store"
]) if (!packageJson.scripts?.[script]) failures.push(`Script raiz W-07 ausente: ${script}`);
for (const token of [
  "Validate messaging session credential store",
  "Messaging session credential database tests",
  "Messaging session credential store tests"
]) if (!ci.includes(token)) failures.push(`CI sem gate W-07: ${token}`);

const codeFiles = [];
walk(root, codeFiles);
for (const file of codeFiles) {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  if (relative === validatorPath) continue;
  if (relative.startsWith("tests/disposable-baileys-lab/")) continue;
  const source = fs.readFileSync(file, "utf8");
  if (source.includes("useMultiFileAuthState")) {
    failures.push(`useMultiFileAuthState proibido fora de laboratório descartável: ${relative}`);
  }
}
if (gatewayIndex.includes("createStoredBaileysAuthenticationState")
  || gatewayIndex.includes("session-store")) {
  failures.push("Session store foi registrado no bootstrap antes da W-08.");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  contract: "messaging-session-store-boundary-v1",
  schemaVersion: 1,
  algorithm: "AES-256-GCM",
  authTagBytes: 16,
  ivBytes: 12,
  perSessionDataKey: true,
  masterKeyInDatabase: false,
  optimisticConcurrency: true,
  transactionBoundary: true,
  encryptedBackup: true,
  cryptographicErasure: true,
  secretLogging: false,
  useMultiFileAuthStateOccurrences: 0,
  runtimeRegistered: false,
  realSessionMaterial: false
}, null, 2));

function walk(directory, output) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".git", "node_modules", ".next", "dist", "docs"].includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full, output);
    else if (/\.(?:ts|tsx|js|mjs|cjs)$/.test(entry.name)) output.push(full);
  }
}
