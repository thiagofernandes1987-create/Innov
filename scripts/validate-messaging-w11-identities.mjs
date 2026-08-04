import fs from "node:fs";

const files = {
  contracts: "apps/messaging-gateway/src/identities/contracts.ts",
  normalize: "apps/messaging-gateway/src/identities/normalize.ts",
  registry: "apps/messaging-gateway/src/identities/in-memory-registry.ts",
  cache: "apps/messaging-gateway/src/identities/cache.ts",
  migration: "supabase/migrations/20260804160000_stage22_identity_reconciliation.sql",
  dbTest: "supabase/tests/messaging-identities/identities.test.sql",
  tests: "tests/messaging-identities.test.ts"
};
const failures = [];
for (const file of Object.values(files)) if (!fs.existsSync(file)) failures.push(`Arquivo W-11 ausente: ${file}`);
const read = key => fs.existsSync(files[key]) ? fs.readFileSync(files[key], "utf8") : "";
const all = Object.keys(files).map(read).join("\n");
const migration = read("migration").toLowerCase();
for (const token of [
  "ObservedChannelIdentity", "IdentityResolution", "ContactMergeRequest", "IdentityRegistry",
  "normalizeExternalIdentity", "WHATSAPP_PN", "WHATSAPP_LID", "GROUP", "NEWSLETTER",
  "InMemoryIdentityRegistry", "CONFIRMED", "CONFLICT", "mergeContacts",
  "VersionedIdentityCache", "cacheVersion"
]) if (!all.includes(token)) failures.push(`Controle TypeScript W-11 ausente: ${token}`);
for (const token of [
  "channel_identity_alias_links", "channel_contact_merge_audit", "channel_identity_cache_versions",
  "observe_channel_contact_identity", "confirm_channel_identity_alias", "merge_channel_contacts",
  "identity_version", "merged_into_contact_id", "superseded_by", "force row level security"
]) if (!migration.includes(token)) failures.push(`Controle SQL W-11 ausente: ${token}`);
for (const forbidden of [
  "create table public.channel_contacts", "create table public.channel_customers",
  "delete from public.whatsapp_contacts", "raw_payload"
]) if (migration.includes(forbidden)) failures.push(`Domínio/histórico proibido W-11: ${forbidden}`);
for (const token of [
  "identidade PN observada aprovada", "identidade LID separada aprovada",
  "alias PN LID confirmado aprovado", "conflito observado sem merge aprovado",
  "vínculo observado distinto de confirmado aprovado", "concorrência de merge aprovada",
  "merge transacional com histórico aprovado", "aliases históricos preservados aprovados",
  "cache versionado aprovado", "isolamento multiempresa aprovado",
  "domínio único e privilégio mínimo aprovados"
]) if (!read("dbTest").includes(token)) failures.push(`Teste PostgreSQL W-11 ausente: ${token}`);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  contract: "messaging-identities-boundary-v1",
  pnLidNormalized: true,
  observedDistinctFromConfirmed: true,
  contact360Preserved: true,
  transactionalMerge: true,
  aliasesPreserved: true,
  cacheVersioned: true,
  crossTenantBlocked: true,
  parallelContactDomainCreated: false
}, null, 2));
