import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  const absolute = path.join(root, relativePath);
  if (!fs.existsSync(absolute)) {
    failures.push(`Arquivo obrigatório ausente: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(absolute, "utf8");
}

function requirePattern(content, pattern, message) {
  if (!pattern.test(content)) failures.push(message);
}

const migration = read("supabase/migrations/20260729163500_flexible_projects_proposals_discounts.sql");
const districtMigration = read("supabase/migrations/20260729170500_project_district_and_flexible_rpc_v2.sql");
const readinessMigration = read("supabase/migrations/20260729171500_discount_decision_preserves_proposal_readiness.sql");
const actions = read("app/actions/flexible-workflows.ts");
const proposalForm = read("components/propostas/proposal-form.tsx");
const projectForm = read("components/obras/project-entry-form.tsx");
const proposalsPage = read("app/app/propostas/page.tsx");
const newProposalPage = read("app/app/propostas/nova/page.tsx");
const planningPage = read("app/app/planejamento/page.tsx");
const budgetsPage = read("app/app/orcamentos/page.tsx");
const search = read("components/busca/smart-search-bar.tsx");
const css = read("app/modern-workflows.css");
const layout = read("app/layout.tsx");
const menus = read("lib/casca/menus.ts");

requirePattern(migration, /alter table public\.proposals alter column budget_id drop not null/i,
  "Proposta continua obrigando orçamento no banco.");
requirePattern(migration, /alter table public\.proposal_versions alter column budget_version_id drop not null/i,
  "Versão de proposta continua obrigando versão de orçamento.");
requirePattern(migration, /pricing_mode in \('BUDGET','FIXED'\)/i,
  "Modos BUDGET/FIXED não estão protegidos por constraint.");
requirePattern(migration, /v_discount_rate\s*>\s*0\.07/i,
  "Alçada de 7% não está protegida na RPC de proposta.");
requirePattern(migration, /auth\.uid\(\)\s*=\s*v_decision\.requested_by/i,
  "Solicitante ainda pode decidir o próprio desconto.");
requirePattern(migration, /create_independent_project/i,
  "Entrada de projeto independente ausente.");
requirePattern(districtMigration, /add column if not exists district text/i,
  "Bairro não foi persistido em projects.");
requirePattern(districtMigration, /p_district text/i,
  "RPC v2 não recebe bairro.");
requirePattern(readinessMigration, /document_sha256 is null or v_version\.frozen_at is null/i,
  "Aprovação de desconto pode aprovar proposta sem documento final.");

requirePattern(actions, /create_independent_project_v2/i,
  "Ação de projeto não usa a RPC que persiste bairro.");
requirePattern(actions, /create_commercial_proposal/i,
  "Ação flexível de proposta não usa a RPC de domínio.");
requirePattern(actions, /MAX_COMMERCIAL_PDF_SIZE = 20 \* 1024 \* 1024/i,
  "Limite explícito do PDF comercial ausente.");

for (const mode of ["BUDGET", "FIXED"]) {
  requirePattern(proposalForm, new RegExp(`value=["']${mode}["']`),
    `Formulário de proposta não oferece ${mode}.`);
}
requirePattern(proposalForm, /discountPercent/i,
  "Formulário de proposta não permite desconto.");
requirePattern(proposalForm, /discountPercent > 7/i,
  "Interface não explica a alçada acima de 7%.");
requirePattern(newProposalPage, /\.in\("status", \["APPROVAL_PENDING", "APPROVED"\]\)/i,
  "Nova proposta não lista orçamentos calculados em estados utilizáveis.");
requirePattern(proposalsPage, /decideFlexibleProposalDiscount/i,
  "Carteira de propostas não apresenta decisão da diretoria.");

for (const mode of ["INDEPENDENT", "IN_PROGRESS", "HISTORICAL", "IMPORTED"]) {
  requirePattern(projectForm, new RegExp(`["']${mode}["']`),
    `Formulário de projeto não oferece ${mode}.`);
}
requirePattern(projectForm, /name=["']district["']/i,
  "Formulário de projeto não permite bairro.");
requirePattern(planningPage, /name: ["']district["']/i,
  "Planejamento não filtra por bairro.");
requirePattern(planningPage, /entry_mode/i,
  "Planejamento não exibe a origem do projeto.");

for (const page of [proposalsPage, planningPage, budgetsPage]) {
  requirePattern(page, /SmartSearchBar/i,
    "Uma carteira crítica não usa a busca compartilhada com filtros.");
}
for (const filter of ["status", "client", "minPrice", "maxPrice", "minMargin"]) {
  requirePattern(budgetsPage, new RegExp(filter, "i"),
    `Carteira de orçamentos não contempla o filtro ${filter}.`);
}
requirePattern(search, /URLSearchParams/i,
  "Busca não materializa filtros na URL.");
requirePattern(search, /smart-search-chip/i,
  "Busca não exibe filtros ativos em chips.");

requirePattern(css, /select option[\s\S]*background: var\(--popover-bg\)[\s\S]*color: var\(--popover-text\)/i,
  "Contraste de options não está definido por tokens.");
requirePattern(css, /\.financial-rail[\s\S]*position: sticky/i,
  "Resumo financeiro não possui comportamento controlado em desktop.");
requirePattern(css, /@media \(max-width: 1180px\)[\s\S]*\.financial-rail[\s\S]*position: static/i,
  "Resumo financeiro pode continuar sobrepondo conteúdo em notebook.");
requirePattern(layout, /modern-workflows\.css/i,
  "Correções visuais não estão carregadas no layout raiz.");

for (const href of [
  "/app/obras/novo",
  "/app/planejamento",
  "/app/orcamentos",
  "/app/orcamentos/sinapi",
  "/app/propostas",
  "/app/propostas/nova",
  "/app/relatorios"
]) {
  requirePattern(menus, new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `Menu interno não expõe ${href}.`);
}

if (failures.length) {
  console.error(JSON.stringify({ status: "failed", vaccine: ["VACINA-028", "VACINA-040", "VACINA-041"], failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "passed",
  checks: {
    independentProjects: true,
    existingProjectsWithCutoff: true,
    fixedAndBudgetProposals: true,
    discountAuthority: true,
    districtSearch: true,
    embeddedFilters: true,
    fieldContrast: true,
    nonOverlappingBudgetSummary: true,
    appMenus: true
  }
}, null, 2));
