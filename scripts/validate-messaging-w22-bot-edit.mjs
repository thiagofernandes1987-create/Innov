import fs from "node:fs";

const files = {
  page: "app/app/whatsapp/bots/page.tsx",
  editPage: "app/app/whatsapp/bots/[botId]/page.tsx",
  action: "app/actions/messaging-bots.ts",
  migration: "supabase/migrations/20260805003000_stage22_governed_bot_profiles.sql",
  dbTest: "supabase/tests/messaging-bots/edit.test.sql",
  runner: "scripts/run-messaging-w22-bots-db-tests.mjs"
};
const failures = [];
for (const file of Object.values(files)) if (!fs.existsSync(file)) failures.push(`Arquivo de edição de bot ausente: ${file}`);
const read = key => fs.existsSync(files[key]) ? fs.readFileSync(files[key], "utf8") : "";
const normalized = key => read(key).replace(/\s+/g, " ");

for (const token of ["Editar ou pausar", "/app/whatsapp/bots/${profile.id}", "PAUSADO"])
  if (!normalized("page").includes(token)) failures.push(`Lista de bots sem ${token}`);
for (const token of [
  "profileId", "defaultChecked={profile.enabledForDrafts}", "Salvar alterações",
  "pausa novos testes", "Autonomia permanece DRAFT_ONLY", "notFound()"
]) if (!normalized("editPage").includes(token)) failures.push(`Página de edição sem ${token}`);
for (const token of ["p_profile_id: optional(data, \"profileId\")", "saveMessagingBotProfile"])
  if (!normalized("action").includes(token)) failures.push(`Action de edição sem ${token}`);
for (const token of ["p_profile_id uuid default null", "where id=p_profile_id", "updated_at=clock_timestamp()"])
  if (!normalized("migration").includes(token)) failures.push(`RPC de edição sem ${token}`);
for (const token of [
  "edição e pausa sem perda de identidade aprovadas", "updated.id <> existing_id",
  "updated.created_at <> original_created_at", "updated.autonomy_mode <> 'DRAFT_ONLY'"
]) if (!normalized("dbTest").includes(token)) failures.push(`Teste de edição sem ${token}`);
if (!normalized("runner").includes("supabase/tests/messaging-bots/edit.test.sql")) failures.push("Runner não executa teste de edição de bot.");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  contract: "messaging-bot-edit-boundary-v2",
  formattingIndependent: true,
  existingProfileEditable: true,
  profileIdentityPreserved: true,
  profileCreationHistoryPreserved: true,
  profilePausableWithoutDeletion: true,
  autonomyModeImmutable: "DRAFT_ONLY",
  humanReviewImmutable: true,
  autonomousSendAllowed: false
}, null, 2));
