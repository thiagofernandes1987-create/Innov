import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

function fonte(caminho: string) {
  return readFileSync(caminho, "utf8");
}

describe("contrato do alvo visual aprovado", () => {
  it("mantém a fonte visual versionada", () => {
    expect(existsSync("docs/referencias/visual/launcher-dark-target-2026-07-28.png")).toBe(true);
  });

  it("mantém a hierarquia obrigatória do launcher", () => {
    const barra = fonte("components/casca/barra-superior.tsx");
    const launcher = fonte("components/casca/launcher.tsx");

    expect(barra).toContain("BuscaGlobal");
    expect(barra).toContain("barra-organizacao");
    expect(launcher).toContain("launcher-destaque");
    expect(launcher).toContain("launcher-indicador");
    expect(launcher).toContain("Personalizar");
  });

  it("mantém as sete visualizações operacionais do pipeline", () => {
    const pipeline = fonte("components/pipeline/pipeline-view.tsx");
    for (const visao of ["kanban", "lista", "calendario", "tabela", "grafico", "localizacao", "atividades"]) {
      expect(pipeline).toContain(`valor: "${visao}"`);
    }
  });

  it("exige registro final do QA visual", () => {
    expect(existsSync("design-qa.md")).toBe(true);
    expect(fonte("design-qa.md")).toContain("Resultado final: passed");
  });
});
