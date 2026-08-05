import { describe, expect, it } from "vitest";
// @ts-expect-error — módulo .mjs de ferramenta, sem tipos: é script de QA, não código da plataforma.
import { alfa, contraste, lum, minimoExigido, num, FONTE } from "../scripts/qa/cor.mjs";

// Testes de regressão do medidor de contraste.
//
// O instrumento teve **quatro versões erradas**, e nenhuma foi encontrada por
// teste — todas por acaso, durante outra investigação. Três aprovavam o que
// deviam reprovar; a quarta acusava o que estava correto. As duas direções
// custam: a primeira entrega tela ilegível, a segunda manda corrigir o que não
// está quebrado e ensina a duvidar da ferramenta.
//
// Cada bloco abaixo é um desses defeitos, transformado em caso executável.

describe("aritmética de cor", () => {
  it("preto sobre branco é 21:1, o máximo da escala", () => {
    expect(contraste("rgb(0,0,0)", "rgb(255,255,255)")).toBeCloseTo(21, 2);
  });

  it("uma cor contra ela mesma é 1:1", () => {
    expect(contraste("rgb(120,130,140)", "rgb(120,130,140)")).toBeCloseTo(1, 5);
  });

  it("a ordem dos argumentos não muda a razão", () => {
    const a = contraste("rgb(16,35,49)", "rgb(238,242,244)");
    const b = contraste("rgb(238,242,244)", "rgb(16,35,49)");
    expect(a).toBeCloseTo(b, 10);
  });
});

describe("v4 — notação color(srgb …) lida como preto", () => {
  it("texto escuro sobre fundo claro em color(srgb) não vira reprovação", () => {
    // Medido 1,3:1 pela versão anterior, com 15:1 na tela. O regex de números
    // lia 0.955 como componente em escala 0–255, ou seja, quase preto.
    expect(contraste("rgb(16, 35, 49)", "color(srgb 0.955137 0.971451 0.989804)")).toBeGreaterThan(14);
  });

  it("color(srgb 0 0 0) e color(srgb 1 1 1) fecham nos mesmos 21:1", () => {
    expect(contraste("color(srgb 0 0 0)", "color(srgb 1 1 1)")).toBeCloseTo(21, 2);
  });

  it("o nome do espaço não entra como componente", () => {
    // `display-p3` tem um `3` no nome; lê-lo como componente deslocaria os três
    // canais e daria uma cor completamente diferente.
    expect(num("color(display-p3 0.1 0.2 0.3)").map(Math.round)).toEqual([26, 51, 77]);
  });

  it("componente fora de 0–1 é grampeado, não estourado", () => {
    expect(num("color(srgb 1.4 -0.2 0.5)").map(Math.round)).toEqual([255, 0, 128]);
  });

  it("rgb comum não regride com a mudança", () => {
    expect(num("rgb(96, 113, 125)")).toEqual([96, 113, 125]);
    expect(contraste("rgb(96, 113, 125)", "rgb(238, 242, 244)")).toBeCloseTo(4.49, 2);
  });
});

describe("opacidade nas três notações", () => {
  it("rgb sem alfa é opaco", () => {
    expect(alfa("rgb(1,2,3)")).toBe(1);
  });

  it("rgba devolve o quarto componente", () => {
    expect(alfa("rgba(255, 255, 255, 0.72)")).toBeCloseTo(0.72, 5);
  });

  it("color(…) com barra devolve o alfa depois da barra", () => {
    expect(alfa("color(srgb 1 1 1 / 0.4)")).toBeCloseTo(0.4, 5);
  });

  it("color(…) sem barra é opaco — e não pega o último componente por engano", () => {
    expect(alfa("color(srgb 0.1 0.2 0.9)")).toBe(1);
  });
});

describe("mínimo exigido — 3:1 só para texto grande", () => {
  it("texto corrido exige 4,5:1", () => {
    expect(minimoExigido(16, 400)).toBe(4.5);
    expect(minimoExigido(16, 700)).toBe(4.5);
  });

  it("24px é grande, com qualquer peso", () => {
    expect(minimoExigido(24, 400)).toBe(3);
  });

  it("18,66px só é grande em negrito", () => {
    expect(minimoExigido(18.66, 400)).toBe(4.5);
    expect(minimoExigido(18.66, 700)).toBe(3);
  });

  it("logo abaixo do limite continua exigindo 4,5:1", () => {
    // Falhar por um décimo é a pior forma de falhar: parece conforme.
    expect(minimoExigido(23.9, 900)).toBe(3);
    expect(minimoExigido(18.6, 700)).toBe(4.5);
  });
});

describe("luminância", () => {
  it("branco é 1 e preto é 0", () => {
    expect(lum([255, 255, 255])).toBeCloseTo(1, 6);
    expect(lum([0, 0, 0])).toBeCloseTo(0, 6);
  });

  it("verde pesa mais que vermelho, e vermelho mais que azul", () => {
    // É o que a fórmula WCAG diz, e o que faz azul sobre preto reprovar onde
    // verde sobre preto passa.
    expect(lum([0, 255, 0])).toBeGreaterThan(lum([255, 0, 0]));
    expect(lum([255, 0, 0])).toBeGreaterThan(lum([0, 0, 255]));
  });
});

describe("injeção no navegador", () => {
  it("o prelúdio carrega as quatro funções que o corpo usa", () => {
    // O corpo da auditoria é serializado para o Chromium e chama `lum`, `num`,
    // `alfa` e `minimoExigido` por nome. Faltando uma, a auditoria quebra
    // dentro do navegador, onde a mensagem não chega ao terminal.
    for (const nome of ["function lum", "function num", "function alfa", "function minimoExigido"]) {
      expect(FONTE).toContain(nome);
    }
  });
});
