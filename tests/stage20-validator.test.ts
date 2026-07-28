import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("validador semântico da Etapa 20", () => {
  const source = fs.readFileSync("scripts/validate-stage20.mjs", "utf8");

  it("valida a casca atual sem exigir classes removidas", () => {
    expect(source).toContain('className="casca"');
    expect(source).toContain('className="barra-superior"');
    expect(source).toContain('className="launcher-faixa"');
    expect(source).toContain('id="launcher-titulo"');
    expect(source).not.toContain('aria-label="Navegação principal"');
    expect(source).not.toContain('className="nav-icon"');
    expect(source).not.toContain('className="launcher-cabecalho"');
    expect(source).not.toContain('className="launcher-busca"');
  });

  it("aceita atributos adicionais no html e foco com substituição visível", () => {
    expect(source).toContain("lang=[\"']pt-BR");
    expect(source).not.toContain("if(/outline\\s*:\\s*none");
    expect(source).toContain("box-shadow");
  });
});
