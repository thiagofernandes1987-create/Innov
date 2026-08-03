import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "supabase/migrations/20260803190000_stage22_whatsapp_omnichannel.sql",
  "lib/whatsapp/domain.ts",
  "lib/whatsapp/client.ts",
  "lib/whatsapp/source-resolver.ts",
  "lib/whatsapp/server.ts",
  "app/actions/whatsapp.ts",
  "app/api/webhooks/whatsapp/route.ts",
  "app/app/whatsapp/page.tsx",
  "tests/whatsapp-domain.test.ts",
  "docs/ETAPA-22-WHATSAPP-OMNICHANNEL.md"
];

const failures = [];
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`Arquivo ausente: ${file}`);
}

function read(file) {
  const full = path.join(root, file);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
}

const migration = read(requiredFiles[0]);
const registry = read("lib/modules/registry.ts");
const webhook = read("app/api/webhooks/whatsapp/route.ts");
const resolver = read("lib/whatsapp/source-resolver.ts");
const client = read("lib/whatsapp/client.ts");
const actions = read("app/actions/whatsapp.ts");
const env = read(".env.example");
const page = read("app/app/whatsapp/page.tsx");

for (const relation of [
  "whatsapp_accounts",
  "whatsapp_contacts",
  "whatsapp_conversations",
  "whatsapp_content_bindings",
  "whatsapp_messages",
  "whatsapp_message_status_events",
  "whatsapp_webhook_events"
]) {
  if (!migration.includes(`public.${relation}`)) {
    failures.push(`Relação ausente: ${relation}`);
  }
}

for (const token of [
  "enable row level security",
  "queue_whatsapp_outbound_message",
  "complete_whatsapp_outbound_message",
  "has_module_permission",
  "revoke insert,update,delete",
  "'whatsapp'",
  "app_module_dependencies",
  "install_whatsapp_defaults",
  "source_type",
  "source_snapshot",
  "payload_sha256"
]) {
  if (!migration.toLowerCase().includes(token.toLowerCase())) {
    failures.push(`Controle de banco ausente: ${token}`);
  }
}

if (!registry.includes('key:"whatsapp"') && !registry.includes('key: "whatsapp"')) {
  failures.push("Módulo WhatsApp ausente do registry.");
}
if (!registry.includes('routePrefix:"/app/whatsapp"') &&
    !registry.includes('routePrefix: "/app/whatsapp"')) {
  failures.push("Rota do WhatsApp ausente do registry.");
}

for (const token of [
  "x-hub-signature-256",
  "verifyMetaWebhookSignature",
  "whatsapp_business_account",
  "payload_sha256"
]) {
  if (!webhook.includes(token)) failures.push(`Webhook sem controle: ${token}`);
}

for (const token of [
  "CONTRACT_TEMPLATE",
  "PROPOSAL_VERSION",
  "CONTRACT_VERSION",
  "AMENDMENT_VERSION",
  "PROJECT_DOCUMENT_VERSION",
  "project-documents",
  "contract-documents",
  "commercial-documents"
]) {
  if (!resolver.includes(token)) failures.push(`Resolvedor sem fonte: ${token}`);
}

if (resolver.includes("body_text") || migration.includes("body_text")) {
  failures.push("Mensagem padrão duplicada em campo body_text.");
}
if (!page.includes("modelos e documentos existentes")) {
  failures.push("Interface não declara a fonte canônica.");
}
if (!actions.includes("sourceSnapshot") || !actions.includes("source_binding_id")) {
  failures.push("Envio não preserva a proveniência.");
}
if (!actions.includes("isSupportWindowOpen") ||
    !migration.includes("interval '24 hours'")) {
  failures.push("Janela de atendimento sem dupla validação.");
}
if (!client.includes("WHATSAPP_GRAPH_API_VERSION") ||
    client.includes("v23.0") || client.includes("v24.0")) {
  failures.push("Versão da Graph API precisa ser configurável e não fixada.");
}

for (const variable of [
  "WHATSAPP_GRAPH_API_VERSION",
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_APP_SECRET",
  "WHATSAPP_WEBHOOK_VERIFY_TOKEN"
]) {
  if (!env.includes(variable)) failures.push(`Variável ausente: ${variable}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      stage: 22,
      files: requiredFiles.length,
      canonicalSources: 5,
      relations: 7,
      webhookSignature: "HMAC_SHA256",
      freeFormWindowHours: 24
    },
    null,
    2
  )
);
