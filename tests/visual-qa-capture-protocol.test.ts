import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const protocol = readFileSync(
  new URL("../docs/QA-VISUAL-POR-CAPTURAS.md", import.meta.url),
  "utf8"
);
const normalizedProtocol = protocol.toLocaleLowerCase("pt-BR");
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

  it("mantém a matriz mínima de viewports e temas", () => {
    for (const token of ["1920x1080", "1366x768", "390x844", "Tema claro", "Tema escuro"]) {
      expect(protocol).toContain(token);
    }
  });

  it("obriga a inspeção das classes de defeito vistas pelo usuário", () => {
    for (const token of [
      "contraste",
      "sobrepõem",
      "overflow horizontal",
      "pt-br",
      "nan",
      "pgrst",
      "estados vazio"
    ]) {
      expect(normalizedProtocol).toContain(token);
    }
  });

  it("registra a causa raiz como vacina vigente", () => {
    expect(vaccine).toContain("**Estado:** vigente");
    expect(vaccine).toContain("captura do preview");
    expect(vaccine).toContain("analisar a captura como usuário");
  });
});
