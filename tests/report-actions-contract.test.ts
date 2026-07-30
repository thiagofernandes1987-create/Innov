import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("ações seguras de relatórios", () => {
  it("preserva formulários e não devolve mensagens técnicas", () => {
    const actions = read("app/actions/reports.ts");
    const forms = read("components/reports/report-action-forms.tsx");

    expect(forms).toContain("useActionState");
    expect(forms).toContain("o preenchimento será preservado");
    expect(actions).toContain("ReportActionState");
    expect(actions).toContain("reportDataAccessError");
    expect(actions).not.toMatch(/reportActionError\([^\n]*error\.message/);
    expect(actions).not.toMatch(/redirect\([^\n]*error\.message/);
  });

  it("mantém a assinatura exigida por useActionState sem warning de parâmetro ocioso", () => {
    const actions = read("app/actions/reports.ts");
    expect(actions.match(/void previous;/g)).toHaveLength(3);
    expect(actions).not.toContain("_previous:");
  });

  it("trata falhas parciais e evita estados vazios enganosos", () => {
    const saved = read("app/app/relatorios/salvos/page.tsx");
    const targets = read("app/app/relatorios/metas/page.tsx");
    const snapshots = read("app/app/relatorios/snapshots/page.tsx");

    expect(saved).toContain("viewsError");
    expect(targets).toContain("metricsError");
    expect(targets).toContain("targetsError");
    expect(snapshots).toContain("snapshotsError");
    expect(snapshots).toContain("viewsError");
    expect(snapshots).not.toContain("snapshot.error_message||");
  });

  it("protege atualização e arquivamento pelo escopo da organização", () => {
    const actions = read("app/actions/reports.ts");
    expect(actions).toMatch(/update\(payload\)[\s\S]*eq\("organization_id", context\.organizationId\)/);
    expect(actions).toMatch(/update\(\{ active: false[\s\S]*eq\("organization_id", context\.organizationId\)[\s\S]*eq\("active", true\)/);
    expect(actions).toContain("Já existe um registro com esses dados.");
  });
});
