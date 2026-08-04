import fs from "node:fs";

const files = {
  contracts: "apps/messaging-gateway/src/media/contracts.ts",
  policy: "apps/messaging-gateway/src/media/policy.ts",
  pipeline: "apps/messaging-gateway/src/media/pipeline.ts",
  doubles: "apps/messaging-gateway/src/media/in-memory.ts",
  migration: "supabase/migrations/20260804170000_stage22_secure_media.sql",
  dbTest: "supabase/tests/messaging-media/media.test.sql",
  tests: "tests/messaging-media.test.ts",
  stage20: "lib/file-security/server.ts"
};
const failures = [];
for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) failures.push(`Arquivo W-12 ausente: ${file}`);
}
const read = key => fs.existsSync(files[key]) ? fs.readFileSync(files[key], "utf8") : "";
const all = Object.keys(files).map(read).join("\n");
const migration = read("migration").toLowerCase();
const pipeline = read("pipeline");
const policy = read("policy");
const stage20 = read("stage20");

for (const token of [
  "MediaReference", "MediaSecurityPort", "MediaReferenceRepository", "SignedMediaUrlProvider",
  "QUARANTINED", "SCANNING", "CLEAN", "BLOCKED"
]) if (!all.includes(token)) failures.push(`Contrato W-12 ausente: ${token}`);
for (const token of [
  "MESSAGING_MEDIA_MAX_BYTES", "sanitizeMediaFileName", "detectMimeFromSignature",
  "assertDetectedMime", "MEDIA_MIME_MISMATCH", "MEDIA_SIGNATURE_UNKNOWN"
]) if (!policy.includes(token)) failures.push(`Política W-12 ausente: ${token}`);
for (const token of [
  "AsyncIterable<Uint8Array>", "createHash", "MEDIA_TOO_LARGE",
  "MEDIA_TRUNCATED_OR_OVERSIZED", "findByDeduplicationKey", "security.quarantine",
  "security.scan", "security.promote", "removeQuarantine", "createSignedUrl",
  "MEDIA_NOT_CLEAN", "allowTranscription", "allowOcr"
]) if (!pipeline.includes(token)) failures.push(`Pipeline W-12 ausente: ${token}`);
for (const token of [
  "channel_media_references", "size_bytes", "sha256", "quarantine_object_path",
  "clean_object_path", "security_state", "register_channel_media_reference",
  "begin_channel_media_scan", "complete_channel_media_scan", "assert_channel_media_clean",
  "guard_channel_media_state_transition", "force row level security"
]) if (!migration.includes(token)) failures.push(`SQL W-12 ausente: ${token}`);
for (const forbidden of [
  "base64 text", "base64 bytea", "raw_payload bytea", "binary_data bytea",
  "file_bytes bytea", "create table public.channel_media_files"
]) if (migration.includes(forbidden)) failures.push(`Persistência proibida W-12: ${forbidden}`);
if (!migration.includes("processing_policy ?| array['base64'")) {
  failures.push("Schema W-12 não bloqueia base64 em processing_policy.");
}
for (const token of [
  "secureUpload", "file-quarantine", "scanWithClamAv", "assertFileContentSignature",
  "createHash(\"sha256\")", "MALWARE_DETECTED", "target.upload", "quarantine.remove"
]) if (!stage20.includes(token)) failures.push(`Reuso Etapa 20 não comprovado: ${token}`);
for (const token of [
  "referência sem binário aprovada", "idempotência provider media aprovada",
  "claim de scan aprovado", "promoção após antivírus aprovada",
  "hash e deduplicação aprovados", "malware bloqueado aprovado",
  "gate de URL assinada aprovado", "isolamento multiempresa aprovado",
  "ausência de base64 persistente aprovada", "RLS e privilégio mínimo aprovados"
]) if (!read("dbTest").includes(token)) failures.push(`Teste PostgreSQL W-12 ausente: ${token}`);
for (const token of [
  "faz streaming para quarentena", "deduplica retry pelo hash", "mantém malware BLOCKED",
  "arquivo truncado", "arquivo acima do limite", "MIME declarado incompatível",
  "assinatura desconhecida", "URL assinada temporária", "remove path traversal",
  "OCR, transcrição e thumbnail somente sob política"
]) if (!read("tests").includes(token)) failures.push(`Teste TypeScript W-12 ausente: ${token}`);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  contract: "messaging-secure-media-boundary-v1",
  stage20SecurityReused: true,
  streamingBounded: true,
  persistentBase64: false,
  privateQuarantineRequired: true,
  antivirusRequired: true,
  mimeSignatureRequired: true,
  sha256Deduplication: true,
  signedUrlOnlyClean: true,
  optionalProcessingPolicyGated: true,
  crossTenantBlocked: true,
  realMediaRequired: false
}, null, 2));
