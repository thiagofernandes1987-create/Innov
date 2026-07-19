import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "lib/finance.ts",
  "lib/finance.test.ts",
  "lib/auth.ts",
  "lib/supabase/server.ts",
  "proxy.ts",
  "app/login/page.tsx",
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
  "supabase/migrations/20260719230000_stage9_financial_contracts.sql",
  "supabase/migrations/20260719231500_stage9_workflows.sql",
  "supabase/migrations/20260719232500_stage9_client_signature_policies.sql"
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

const finance = await readFile("lib/finance.ts", "utf8");
for (const token of [
  "calculateBdi",
  "calculateMarkupFactor",
  "grossMarginRate",
  "estimatedRoiRate",
  "paybackMonth",
  "ADMIN_FEE_DUPLICATED",
  "FIXED_COST_DUPLICATED",
  "PROFIT_MARGIN_DUPLICATED"
]) {
  await check(`finance:${token}`, async () => finance.includes(token));
}

const migration = await readFile("supabase/migrations/20260719230000_stage9_financial_contracts.sql", "utf8");
const tables = [
  "cost_catalog_items",
  "cost_compositions",
  "cost_composition_versions",
  "cost_composition_items",
  "fixed_costs",
  "administrative_fee_models",
  "bdi_models",
  "bdi_model_versions",
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
  await check(`rls:${table}`, async () => migration.includes(`alter table public.${table} enable row level security`) || migration.includes(`'${table}'`));
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
  "create_budget_version",
  "release_proposal_version",
  "create_contract_from_proposal",
  "create_amendment",
  "create_sandbox_signature_envelope"
]) {
  await check(`workflow:${fn}`, async () => workflows.includes(`function public.${fn}`));
}

for (const token of ["MFA AAL2 obrigatório", "Separação de funções", "Versão congelada é imutável"]) {
  await check(`seguranca:${token}`, async () => `${migration}\n${workflows}`.includes(token));
}

const env = await readFile(".env.example", "utf8");
await check("segredo:não-preenchido", async () => !/SUPABASE_SERVICE_ROLE_KEY=\S+/.test(env));
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
