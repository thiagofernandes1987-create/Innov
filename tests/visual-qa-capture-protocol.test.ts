import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const protocol = readFileSync(
  new URL("../docs/QA-VISUAL-POR-CAPTURAS.md", import.meta.url),
  "utf8"
);
const vaccine = readFileSync(
  new URL(
    "../diretrizes/vacinas/VACINA-043-CORRECAO-VISUAL-EXIGE-CAPTURA-DO-PREVIEW.md",
    import.meta.url
  ),
  "utf8"
);

describe("protocolo de QA visual por capturas", () => {
  it("exige preview publicado, captura e comparação antes/depois", () => {
    for (const token of [
      "Publicar o preview",
      "Tirar a captura da tela atualizada",
      "Comparar antes/depois",
      "Consultar logs de runtime"
    ]) {
      expect(protocol).toContain(token);
    }
  });

  it("mantém a matriz mínima de larguras e temas", () => {
    for (const token of ["375px", "768px", "1280px", "Tema claro", "Tema escuro"]) {
      expect(protocol).toContain(token);
    }
  });

  it("obriga a inspeção das classes de defeito vistas pelo usuário", () => {
    for (const token of [
      "contraste",
      "sobrepõem",
      "overflow horizontal",
      "pt-BR",
      "NaN",
      "PGRST",
      "estados vazio",
      "44px"
    ]) {
      expect(protocol).toContain(token);
    }
  });

  it("registra a causa raiz como vacina vigente", () => {
    expect(vaccine).toContain("**Estado:** vigente");
    expect(vaccine).toContain("captura do preview");
    expect(vaccine).toContain("analisar a captura como usuário");
  });
});
