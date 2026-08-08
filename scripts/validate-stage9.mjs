import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "lib/pdf.ts",
  "lib/auth.ts",
  "lib/supabase/server.ts",
  "lib/supabase/admin.ts",
  "proxy.ts",
  "app/login/page.tsx",
  "app/actions/budgets.ts",
  "app/actions/budget-versions.ts",
  "app/app/orcamentos/page.tsx",
  "app/app/orcamentos/novo/page.tsx",
  "app/app/orcamentos/[id]/page.tsx",
  "app/app/propostas/page.tsx",
  "app/app/contratos/page.tsx",
  "app/app/aditivos/page.tsx",
  "app/app/assinaturas/page.tsx",
  "app/cliente/orcamentos/page.tsx",
  "app/cliente/contratos/page.tsx",
  "app/cliente/aditivos/page.tsx",
  "app/cliente/assinaturas/page.tsx",
  "app/api/proposals/[versionId]/pdf/route.ts",
  "app/api/contracts/[versionId]/pdf/route.ts",
  "app/api/signatures/webhook/route.ts",
  "supabase/migrations/20260719230000_stage9_financial_contracts.sql",
  "supabase/migrations/20260719231500_stage9_workflows.sql",
  "supabase/migrations/20260719232500_stage9_client_signature_policies.sql",
  "supabase/migrations/20260719233500_stage9_frozen_version_rules.sql",
  "supabase/migrations/20260719234000_stage9_apply_amendment.sql",
  "supabase/migrations/20260729013000_budget_next_version.sql"
];

const checks = [];

async function check(name, fn) {
  try {
    const result = await fn();
    checks.push({ name, passed: Boolean(result) });
  } catch (error) {
    checks.push({ name, passed: false, error: error instanceof Error ? error.message : String(error) });
  }
}

for (const file of requiredFiles) {
  await check(`arquivo:${file}`, async () => {
    await access(file);
    return true;
  });
}

// O motor TypeScript de BDI/markup da Etapa 9 deixou de ser runtime e foi
// removido. A formação de preço canônica vive nas actions + RPCs que o produto
// realmente chama. Testar arquivo morto seria cobertura falsa.
const budgetActions = await readFile("app/actions/budgets.ts", "utf8");
for (const token of [
  "updateBudgetPricing",
  'from("markup_models")',
  'rpc("calculate_budget_version"',
  "desiredMarginRate",
  "investedCapital",
  "ROI_WITHOUT_CAPITAL"
]) {
  await check(`pricing-atual:${token}`, async () => budgetActions.includes(token));
}

const versionActions = await readFile("app/actions/budget-versions.ts", "utf8");
await check("versao-atual:create-next", async () => versionActions.includes('rpc("create_next_budget_version"'));
await check("versao-atual:sem-create-version-legado", async () => !versionActions.includes('rpc("create_budget_version"'));

const migration = await readFile("supabase/migrations/20260719230000_stage9_financial_contracts.sql", "utf8");
const tables = [
  "cost_catalog_items",
  "cost_compositions",
  "cost_composition_versions",
  "cost_composition_items",
  "markup_models",
  "budgets",
  "budget_versions",
  "budget_sections",
  "budget_items",
  "budget_scenarios",
  "budget_approvals",
  "budget_validation_results",
  "proposals",
  "proposal_versions",
  "proposal_acceptances",
  "contract_templates",
  "contracts",
  "contract_versions",
  "contract_parties",
  "amendments",
  "amendment_versions",
  "signature_envelopes",
  "signature_signers",
  "signature_events",
  "document_access_logs"
];

for (const table of tables) {
  await check(`tabela:${table}`, async () => migration.includes(`create table public.${table}`));
  await check(`rls:${table}`, async () =>
    migration.includes(`alter table public.${table} enable row level security`) || migration.includes(`'${table}'`)
  );
}

for (const bucket of ["commercial-documents", "contract-documents", "signature-artifacts"]) {
  await check(`bucket:${bucket}`, async () => migration.includes(`'${bucket}'`));
}

for (const fn of [
  "calculate_budget_version",
  "freeze_budget_version",
  "decide_budget_approval",
  "accept_proposal",
  "sandbox_signature_event"
]) {
  await check(`rpc:${fn}`, async () => migration.includes(`function public.${fn}`));
}

const workflows = await readFile("supabase/migrations/20260719231500_stage9_workflows.sql", "utf8");
for (const fn of [
  "create_budget",
  "release_proposal_version",
  "create_contract_from_proposal",
  "create_amendment",
  "create_sandbox_signature_envelope"
]) {
  await check(`workflow:${fn}`, async () => workflows.includes(`function public.${fn}`));
}

const nextVersion = await readFile("supabase/migrations/20260729013000_budget_next_version.sql", "utf8");
await check("workflow:create-next-budget-version", async () => nextVersion.includes("function public.create_next_budget_version"));
await check("workflow:next-version-copia-itens", async () => nextVersion.includes("insert into public.budget_items"));

const frozenRules = await readFile("supabase/migrations/20260719233500_stage9_frozen_version_rules.sql", "utf8");
await check("imutabilidade:valores", async () => frozenRules.includes("Valores de versão congelada são imutáveis"));
await check("imutabilidade:status-permitido", async () => frozenRules.includes("apenas status e metadados de aprovação podem avançar"));

const amendmentMigration = await readFile("supabase/migrations/20260719234000_stage9_apply_amendment.sql", "utf8");
await check("aditivo:aplicacao-idempotente", async () =>
  amendmentMigration.includes("apply_signed_amendment") && amendmentMigration.includes("applied_at is not null")
);

for (const token of ["MFA AAL2 obrigatório", "Separação de funções", "Versão congelada é imutável"]) {
  await check(`seguranca:${token}`, async () => `${migration}\n${workflows}`.includes(token));
}

const pdf = await readFile("lib/pdf.ts", "utf8");
await check("pdf:server-side", async () => pdf.includes("PDFDocument.create"));
await check("pdf:sha256", async () => pdf.includes("sha256Hex"));
await check("pdf:sem-dados-internos", async () => !pdf.includes("markup_factor") && !pdf.includes("estimated_roi_rate"));

const proposalPdf = await readFile("app/api/proposals/[versionId]/pdf/route.ts", "utf8");
await check("proposta:bucket-privado", async () => proposalPdf.includes('from("commercial-documents")'));
await check("proposta:idempotencia", async () => proposalPdf.includes("idempotency-key"));
await check("proposta:hash", async () => proposalPdf.includes("document_sha256"));

const contractPdf = await readFile("app/api/contracts/[versionId]/pdf/route.ts", "utf8");
await check("contrato:bucket-privado", async () => contractPdf.includes('from("contract-documents")'));
await check("contrato:idempotencia", async () => contractPdf.includes("idempotency-key"));

// A arquitetura de adapters Stage 9 (`lib/signatures/index.ts`) não tinha
// consumidor e foi substituída pela assinatura avançada da Etapa 12.2. Aqui
// preservamos apenas as garantias transversais que continuam desta etapa; o
// contrato atual de assinatura tem gate próprio em validate:stage12.2.
const webhook = await readFile("app/api/signatures/webhook/route.ts", "utf8");
await check("webhook:hmac", async () => webhook.includes("createHmac"));
await check("webhook:timing-safe", async () => webhook.includes("timingSafeEqual"));
await check("webhook:replay", async () => webhook.includes("MAX_CLOCK_SKEW_SECONDS"));
await check("webhook:idempotencia", async () => webhook.includes('eventError?.code === "23505"'));
await check("webhook:service-role-server", async () => webhook.includes("createSupabaseAdminClient"));

const env = await readFile(".env.example", "utf8");
await check("segredo:não-preenchido", async () => !/SUPABASE_SERVICE_ROLE_KEY=\S+/.test(env));
await check("credencial-provider:não-preenchida", async () => !/SIGNATURE_\w+_API_KEY=\S+/.test(env));
await check("sandbox:identificado", async () => workflows.includes("legal_validity','none"));

const proxy = await readFile("proxy.ts", "utf8");
await check("proxy:app", async () => proxy.includes('"/app"'));
await check("proxy:cliente", async () => proxy.includes('"/cliente"'));
await check("proxy:getUser", async () => proxy.includes("auth.getUser"));

const failed = checks.filter((item) => !item.passed);
const report = {
  stage: 9,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failures: failed
};

console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
