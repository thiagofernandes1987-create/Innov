import { describe, expect, it } from "vitest";
import {
  CODIGOS_DATA,
  codigoDe,
  decompor,
  descrever,
  situacaoDoPrazo,
  type CodigoData
} from "../lib/pipeline/datas";

describe("catálogo de códigos", () => {
  it("cobre os dez códigos declarados pelo responsável", () => {
    expect(Object.keys(CODIGOS_DATA).sort()).toEqual(
      ["DEA", "DEE", "DEI", "DET", "DLA", "DLE", "DPA", "DPE", "DPI", "DPT"].sort()
    );
  });

  it("decompõe o código em natureza e marco", () => {
    expect(decompor("DPI")).toEqual({ natureza: "prevista", marco: "inicio" });
    expect(decompor("DET")).toEqual({ natureza: "efetiva", marco: "termino" });
    expect(decompor("DLA")).toEqual({ natureza: "limite", marco: "assistencia" });
    expect(decompor("DEA")).toEqual({ natureza: "efetiva", marco: "agendamento" });
  });

  it("monta o código a partir dos dois eixos", () => {
    expect(codigoDe("prevista", "inicio")).toBe("DPI");
    expect(codigoDe("efetiva", "entrega")).toBe("DEE");
    expect(codigoDe("limite", "entrega")).toBe("DLE");
  });

  it("devolve nulo para combinação que ainda não existe, em vez de inventar código", () => {
    expect(codigoDe("limite", "inicio")).toBeNull();
    expect(codigoDe("prevista", "assistencia")).toBeNull();
  });

  it("descreve o código por extenso, para a interface não exibir sigla solta", () => {
    expect(descrever("DPE")).toBe("Data prevista de entrega");
    expect(descrever("DLA")).toBe("Data limite de assistência");
    expect(descrever("DEI")).toBe("Data efetiva de início");
  });

  it("ida e volta é estável em todos os códigos", () => {
    for (const codigo of Object.keys(CODIGOS_DATA) as CodigoData[]) {
      const { natureza, marco } = decompor(codigo);
      expect(codigoDe(natureza, marco), codigo).toBe(codigo);
    }
  });
});

describe("situacaoDoPrazo", () => {
  const hoje = new Date("2026-07-26T12:00:00Z");

  it("sem data prevista, não há prazo a julgar", () => {
    expect(situacaoDoPrazo({ prevista: null, efetiva: null }, hoje).estado).toBe("sem_prazo");
  });

  it("concluído no prazo quando a efetiva não passou da prevista", () => {
    const s = situacaoDoPrazo({ prevista: "2026-07-30", efetiva: "2026-07-28" }, hoje);
    expect(s.estado).toBe("concluido_no_prazo");
    expect(s.diasDeAtraso).toBe(0);
  });

  it("concluído com atraso conta os dias, e conta a partir da prevista", () => {
    const s = situacaoDoPrazo({ prevista: "2026-07-20", efetiva: "2026-07-23" }, hoje);
    expect(s.estado).toBe("concluido_com_atraso");
    expect(s.diasDeAtraso).toBe(3);
  });

  it("em aberto e vencido quando a prevista já passou", () => {
    const s = situacaoDoPrazo({ prevista: "2026-07-24", efetiva: null }, hoje);
    expect(s.estado).toBe("vencido");
    expect(s.diasDeAtraso).toBe(2);
  });

  it("vence hoje é um estado próprio, não vencido", () => {
    expect(situacaoDoPrazo({ prevista: "2026-07-26", efetiva: null }, hoje).estado).toBe("vence_hoje");
  });

  it("em aberto e dentro do prazo informa quantos dias faltam", () => {
    const s = situacaoDoPrazo({ prevista: "2026-07-31", efetiva: null }, hoje);
    expect(s.estado).toBe("no_prazo");
    expect(s.diasRestantes).toBe(5);
  });

  it("data inválida não derruba a tela", () => {
    expect(situacaoDoPrazo({ prevista: "amanhã", efetiva: null }, hoje).estado).toBe("sem_prazo");
  });
});
