import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("S-23 — fundação de interface", () => {
  it("consulta documentos sem embed ambíguo e sem erro técnico cru", () => {
    const page = read("app/app/documentos/page.tsx");

    expect(page).toContain("projects!project_documents_project_id_fkey");
    expect(page).toContain('.from("project_document_versions")');
    expect(page).not.toContain("project_document_versions(count)");
    expect(page).not.toMatch(/\{\s*error\.message\s*\}/);
    expect(page).toContain("DATA_LOAD_ERROR_MESSAGE");
  });

  it("mantém kanban, lista, calendário, tabela e gráfico sobre o mesmo pipeline", () => {
    const pipeline = read("components/pipeline/pipeline-view.tsx");

    for (const view of ["kanban", "lista", "calendario", "tabela", "grafico"]) {
      expect(pipeline).toContain(`valor: "${view}"`);
    }
    expect(pipeline).toContain("moverCartao");
    expect(pipeline).toContain("BarraDeTrabalho");
  });

  it("oferece lista, cartões e calendário funcionais no mesmo portfólio", () => {
    const planningPage = read("app/app/planejamento/page.tsx");
    const portfolio = read("components/planejamento/portfolio-view.tsx");

    expect(planningPage).toContain("PlanningPortfolioView");
    expect(planningPage).not.toMatch(/\{\s*error\.message\s*\}/);
    for (const view of ["list", "cards", "calendar"]) {
      expect(portfolio).toContain(`id: "${view}"`);
    }
    expect(portfolio).toContain("planning-portfolio-view");
    expect(portfolio).toContain("Abrir cronograma");
  });

  it("não expõe erro técnico nem converte indisponibilidade em vazio ou 404", () => {
    const collectionPages = [
      "app/app/obras/page.tsx",
      "app/app/obras/[id]/tarefas/page.tsx",
      "app/app/obras/[id]/cronograma/page.tsx",
      "app/app/obras/[id]/equipes/page.tsx"
    ];

    for (const relativePath of collectionPages) {
      const page = read(relativePath);
      expect(page, relativePath).not.toContain("error.message");
      expect(page, relativePath).toContain("DATA_LOAD_ERROR_MESSAGE");
      expect(page, relativePath).toContain("reportDataAccessError");
    }

    const projects = read(collectionPages[0]);
    expect(projects).toContain("!projects.length && !loadFailed");

    for (const relativePath of collectionPages.slice(1)) {
      const page = read(relativePath);
      expect(page.indexOf("if (projectResult.error)"), relativePath).toBeGreaterThan(-1);
      expect(page.indexOf("if (!project) notFound()"), relativePath)
        .toBeGreaterThan(page.indexOf("if (projectResult.error)"));
    }

    expect(read(collectionPages[1])).toContain("!tasksLoadFailed");
    expect(read(collectionPages[2])).toContain("!scheduleLoadFailed");
    expect(read(collectionPages[3])).toContain("!teamsLoadFailed");
    expect(read(collectionPages[3])).toContain("!resourcesLoadFailed");
  });

  it("mantém o cronograma Gantt calculado com dependências", () => {
    const schedule = read("app/app/obras/[id]/cronograma/page.tsx");
    const gantt = read("components/planejamento/gantt.tsx");

    expect(schedule).toContain('import { Gantt }');
    expect(schedule).toContain("dependencias=");
    expect(gantt).toMatch(/\bcalcular\(tarefas, dependencias, calendario\)/);
  });

  it("mantém o orçamento operável com inclusão, remoção e recálculo", () => {
    const budget = read("app/app/orcamentos/[id]/page.tsx");

    expect(budget).toContain("addManualBudgetItem");
    expect(budget).toContain("addCubReferenceItem");
    expect(budget).toContain("removeBudgetItem");
    expect(budget).toContain("calculateBudgetVersion");
    expect(budget).toContain("updateBudgetPricing");
  });

  it("mantém mensagens de login classificadas e ícone de aplicação", () => {
    const authErrors = read("lib/auth-errors.ts");

    expect(authErrors).toContain("invalid_credentials");
    expect(authErrors).toContain("email_not_confirmed");
    expect(fs.existsSync(path.join(root, "app/icon.svg"))).toBe(true);
  });
});
