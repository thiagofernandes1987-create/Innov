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
      "app/app/obras/[id]/equipes/page.tsx",
      "app/app/obras/[id]/diario/page.tsx",
      "app/app/obras/[id]/eap/page.tsx",
      "app/app/obras/[id]/documentos/page.tsx"
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
    expect(read(collectionPages[4])).toContain("!logsLoadFailed");
    expect(read(collectionPages[5])).toContain("!itemsLoadFailed");
  });

  it("separa coleção, versões e URLs assinadas nos documentos da obra", () => {
    const page = read("app/app/obras/[id]/documentos/page.tsx");

    expect(page).toContain('.from("project_documents")');
    expect(page).toContain('.from("project_document_versions")');
    expect(page).not.toMatch(/project_documents[\s\S]{0,250}project_document_versions\(/);
    expect(page).toContain("documentsLoadFailed");
    expect(page).toContain("signedUrlsLoadFailed");
    expect(page).toContain("link indisponível");
    expect(page).not.toContain('href={signedByPath.get(version.storage_path) ?? "#"}');
  });

  it("mantém cadastro independente quando apenas a coleção do diário falha", () => {
    const page = read("app/app/obras/[id]/diario/page.tsx");

    expect(page).toContain("!logsLoadFailed");
    expect(page).toContain("<form action={createDailyLog}");
    expect(page.indexOf("<form action={createDailyLog}"))
      .toBeGreaterThan(page.indexOf("!logsLoadFailed"));
  });

  it("bloqueia peso e hierarquia da EAP quando os itens não são confirmados", () => {
    const page = read("app/app/obras/[id]/eap/page.tsx");

    expect(page).toContain("!itemsLoadFailed");
    expect(page).toContain("Peso raiz");
    expect(page).toContain("O cadastro está bloqueado porque a hierarquia atual não pôde ser carregada");
  });

  it("protege tarefas, diário, equipes e relatórios globais contra zeros e vazios falsos", () => {
    const tasks = read("app/app/tarefas/page.tsx");
    const dailyLogs = read("app/app/diario/page.tsx");
    const teams = read("app/app/equipes/page.tsx");
    const reports = read("app/app/relatorios/page.tsx");

    for (const [relativePath, page] of [
      ["tarefas", tasks],
      ["diario", dailyLogs],
      ["equipes", teams],
      ["relatorios", reports]
    ] as const) {
      expect(page, relativePath).not.toContain("error.message");
      expect(page, relativePath).toContain("DATA_LOAD_ERROR_MESSAGE");
      expect(page, relativePath).toContain("reportDataAccessError");
    }

    expect(tasks).toContain("!loadFailed ?");
    expect(tasks.indexOf("!tasks.length")).toBeGreaterThan(tasks.indexOf("!loadFailed ?"));
    expect(dailyLogs).toContain("!loadFailed ?");
    expect(dailyLogs.indexOf("!logs.length")).toBeGreaterThan(dailyLogs.indexOf("!loadFailed ?"));

    expect(teams).toContain("teamsLoadFailed");
    expect(teams).toContain("resourcesLoadFailed");
    expect(teams).toContain('reportDataAccessError("all-teams.resources"');
    expect(teams).toContain("Indicadores de recursos indisponíveis");

    expect(reports).not.toContain("throw new Error");
    expect(reports).toContain('reportDataAccessError("reports.dashboard.all"');
    expect(reports).toContain('reportDataAccessError("reports.dashboard.project"');
    expect(reports).toContain("selectedProjectLoadFailed");
    expect(reports).toContain("Nenhum indicador, total ou estado vazio foi calculado");
  });

  it("mantém o cronograma Gantt calculado com dependências", () => {
    const schedule = read("app/app/obras/[id]/cronograma/page.tsx");
    const planner = read("components/planejamento/schedule-planner.tsx");

    // O contrato é a **invariante**, não o nome do arquivo: a tela de
    // cronograma desenha barras cujas datas saem do cálculo de rede, e não de
    // data digitada. Quando o espaço de trabalho de EAP e Gantt substituiu o
    // componente `<Gantt>`, este teste reprovou por procurar o import antigo —
    // o cálculo tinha sido preservado, só mudou de casa. Amarrar o teste ao
    // import fez um refactor correto parecer regressão.
    expect(schedule).toContain("SchedulePlanner");
    expect(schedule).toContain("dependencies");
    expect(planner).toMatch(/\bcalcular\(/);
    expect(planner).toMatch(/\bcadeiaMaisLonga\(/);
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
    // O invariante é **existir ícone de aplicação**, não o formato dele. A
    // primeira versão fixava `app/icon.svg` e reprovou quando o ícone passou a
    // ser a marca real em PNG — teste que descreve a implementação em vez da
    // garantia quebra na melhoria, e é a mesma armadilha já corrigida neste
    // arquivo no contrato do planejamento.
    const formatos = ["icon.svg", "icon.png", "icon.ico", "favicon.ico"];
    const encontrados = formatos.filter(nome => fs.existsSync(path.join(root, "app", nome)));
    expect(encontrados.length, "nenhum ícone de aplicação em app/").toBeGreaterThan(0);
  });
});
