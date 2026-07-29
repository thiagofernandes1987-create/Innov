import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  classifyProjectCreationProviderError,
  validateContractProject,
  validateFlexibleProject
} from "@/lib/projects/project-creation";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("criação segura de projetos", () => {
  it("aceita obra em andamento coerente e preserva valores normalizados", () => {
    const result = validateFlexibleProject(form({
      entryMode: "IN_PROGRESS",
      code: " obr-2026-010 ",
      name: "Obra existente",
      status: "IN_PROGRESS",
      progressPercent: "35,5",
      actualStart: "2026-01-10",
      dataCutoff: "2026-07-20",
      historicalCost: "125.000,50",
      state: "sp",
      postalCode: "12460-000"
    }), "00000000-0000-0000-0000-000000000001");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.code).toBe("OBR-2026-010");
    expect(result.value.progress).toBe(0.355);
    expect(result.value.historicalCost).toBe(125000.5);
    expect(result.value.state).toBe("SP");
    expect(result.value.postalCode).toBe("12460000");
  });

  it("bloqueia histórico inconsistente e importação sem origem", () => {
    const historical = validateFlexibleProject(form({
      entryMode: "HISTORICAL",
      code: "OBR-HIST",
      name: "Histórica",
      status: "COMPLETED",
      progressPercent: "80",
      actualStart: "2025-01-01",
      dataCutoff: "2026-01-01"
    }), "00000000-0000-0000-0000-000000000001");
    expect(historical.ok).toBe(false);
    if (!historical.ok) expect(historical.state.fieldErrors.progressPercent).toContain("100%");

    const imported = validateFlexibleProject(form({
      entryMode: "IMPORTED",
      code: "OBR-IMP",
      name: "Importada",
      status: "PLANNING",
      progressPercent: "0",
      dataCutoff: "2026-01-01"
    }), "00000000-0000-0000-0000-000000000001");
    expect(imported.ok).toBe(false);
    if (!imported.ok) expect(imported.state.fieldErrors.importedFrom).toBeTruthy();
  });

  it("bloqueia período de contrato invertido", () => {
    const result = validateContractProject(form({
      contractId: "00000000-0000-0000-0000-000000000002",
      code: "OBR-CONTRATO",
      name: "Obra pelo contrato",
      plannedStart: "2026-08-10",
      plannedEnd: "2026-08-01",
      state: "SP"
    }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.state.fieldErrors.plannedEnd).toContain("anterior");
  });

  it("classifica falha do provedor sem devolver mensagem técnica", () => {
    const result = classifyProjectCreationProviderError(
      { code: "23505", message: "duplicate key value violates unique constraint projects_org_code_key" },
      "Falha genérica"
    );
    expect(result.message).toContain("Já existe");
    expect(result.message).not.toContain("duplicate key");
  });

  it("mantém formulários com useActionState e página sem erro cru", () => {
    const freeForm = read("components/obras/project-entry-form.tsx");
    const contractForm = read("components/obras/contract-project-form.tsx");
    const page = read("app/app/obras/novo/page.tsx");

    expect(freeForm).toContain("useActionState");
    expect(contractForm).toContain("useActionState");
    expect(freeForm).toContain("Em caso de validação, os dados permanecem no formulário");
    expect(contractForm).toContain("o preenchimento será preservado");
    expect(page).not.toContain("error.message");
    expect(page).toContain("contractsAvailable");
    expect(page).toContain("clientsAvailable");
    expect(page).toContain("managersAvailable");
  });

  it("protege acesso e coerência também no banco", () => {
    const migration = read("supabase/migrations/20260729211500_safe_project_creation_workflows.sql");

    expect(migration).toContain("create_independent_project_v3");
    expect(migration).toContain("create_project_from_contract_v2");
    expect(migration).toMatch(/revoke execute on function public\.create_independent_project_v2/i);
    expect(migration).toContain("project_memberships");
    expect(migration).toContain("v_creator_role");
    expect(migration).toContain("Contrato já possui obra vinculada");
    expect(migration).toContain("Data de corte não pode estar no futuro");
  });
});
