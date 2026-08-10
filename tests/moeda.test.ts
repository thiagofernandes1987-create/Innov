import { describe, expect, it } from "vitest";
import { formatarDecimal, formatarMoeda, lerMoeda, mascararMoeda } from "../lib/validacao/moeda";

describe("leitura de valor digitado", () => {
  it("vazio é nulo, não zero — informado e não informado são coisas diferentes", () => {
    expect(lerMoeda("")).toBeNull();
    expect(lerMoeda(null)).toBeNull();
    expect(lerMoeda("   ")).toBeNull();
  });

  it("com vírgula, a vírgula é o decimal e o ponto é milhar", () => {
    expect(lerMoeda("1.500,25")).toBe(1500.25);
    expect(lerMoeda("1.500.000,00")).toBe(1500000);
    expect(lerMoeda("0,50")).toBe(0.5);
  });

  it("o caso que fazia perder três ordens de grandeza", () => {
    // Num `type="number"`, "1.500" era lido como 1,5. No teclado brasileiro
    // quem digita isso quer mil e quinhentos.
    expect(lerMoeda("1.500")).toBe(1500);
    expect(lerMoeda("1.500.000")).toBe(1500000);
  });

  it("ponto separando 1 ou 2 dígitos finais é decimal, como vem de integração", () => {
    expect(lerMoeda("1500.00")).toBe(1500);
    expect(lerMoeda("1.5")).toBe(1.5);
    expect(lerMoeda("1.50")).toBe(1.5);
  });

  it("aceita o valor já formatado, com símbolo", () => {
    expect(lerMoeda("R$ 1.500,00")).toBe(1500);
    expect(lerMoeda("R$1.234.567,89")).toBe(1234567.89);
  });

  it("aceita número puro", () => {
    expect(lerMoeda(1500.25)).toBe(1500.25);
    expect(lerMoeda(0)).toBe(0);
  });

  it("negativo por sinal ou por parênteses", () => {
    expect(lerMoeda("-1.500,00")).toBe(-1500);
    expect(lerMoeda("(1.500,00)")).toBe(-1500);
  });

  it("lixo vira nulo em vez de NaN", () => {
    expect(lerMoeda("abc")).toBeNull();
    expect(lerMoeda("R$")).toBeNull();
  });
});

describe("máscara de digitação, no padrão de caixa", () => {
  it("o número entra pela direita, em centavos", () => {
    expect(mascararMoeda("1")).toBe("0,01");
    expect(mascararMoeda("15")).toBe("0,15");
    expect(mascararMoeda("150")).toBe("1,50");
    expect(mascararMoeda("1500")).toBe("15,00");
    expect(mascararMoeda("150000")).toBe("1.500,00");
  });

  it("campo vazio continua vazio, não vira 0,00", () => {
    expect(mascararMoeda("")).toBe("");
    expect(mascararMoeda("abc")).toBe("");
  });

  it("ignora o que não é dígito e não acumula zero à esquerda", () => {
    expect(mascararMoeda("R$ 1.500,00")).toBe("1.500,00");
    expect(mascararMoeda("000150")).toBe("1,50");
  });
});

describe("exibição", () => {
  it("formata em real", () => {
    expect(formatarMoeda(1500)).toContain("1.500,00");
    expect(formatarMoeda(1500)).toContain("R$");
  });

  it("nulo e lixo viram travessão, nunca NaN na tela", () => {
    expect(formatarMoeda(null)).toBe("—");
    expect(formatarMoeda(undefined)).toBe("—");
    expect(formatarMoeda("abc")).toBe("—");
  });

  it("decimal sem símbolo, para grade", () => {
    expect(formatarDecimal(1500)).toBe("1.500,00");
    expect(formatarDecimal(null)).toBe("");
  });

  it("ida e volta: o que a máscara produz, a leitura devolve", () => {
    for (const digitado of ["150000", "1", "999999999"]) {
      const mascarado = mascararMoeda(digitado);
      const lido = lerMoeda(mascarado);
      expect(formatarDecimal(lido)).toBe(mascarado);
    }
  });
});
