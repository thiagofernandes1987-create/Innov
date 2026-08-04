import { describe, expect, it } from "vitest";
import {
  formatarData,
  formatarMoeda,
  montarColunas,
  ordenarCodigos,
  ordenarPorUrgencia,
  prazoPrincipal,
  rotuloSituacao,
  type CartaoPipeline,
  type EtapaPipeline
} from "../lib/pipeline/domain";
import { situacaoDoPrazo, type CodigoData } from "../lib/pipeline/datas";

const hoje = new Date("2026-07-26T12:00:00Z");

function etapa(id: string, posicao: number): EtapaPipeline {
  return {
    id,
    key: id,
    name: id,
    posicao,
    categoria: "aberto",
    recolhida: false,
    cor: 0,
    prazoDias: null
  };
}

function cartao(
  id: string,
  stageId: string,
  extras: Partial<CartaoPipeline> = {}
): CartaoPipeline {
  return {
    id,
    stageId,
    trilha: "projeto",
    titulo: id,
    descricao: null,
    clientId: null,
    projectId: "p1",
    ticketId: null,
    subtitulo: null,
    responsavel: null,
    prioridade: 0,
    valor: null,
    cor: 0,
    posicao: 0,
    datas: [],
    marcadores: [],
    criadoEm: "2026-07-01T00:00:00Z",
    ...extras
  };
}

function data(codigo: CodigoData, valor: string) {
  const mapa: Record<string, { natureza: "limite" | "prevista" | "efetiva"; marco: "inicio" | "termino" | "entrega" | "agendamento" | "assistencia" }> = {
    DLA: { natureza: "limite", marco: "assistencia" },
    DLE: { natureza: "limite", marco: "entrega" },
    DPI: { natureza: "prevista", marco: "inicio" },
    DPT: { natureza: "prevista", marco: "termino" },
    DPE: { natureza: "prevista", marco: "entrega" },
    DPA: { natureza: "prevista", marco: "agendamento" },
    DEI: { natureza: "efetiva", marco: "inicio" },
    DET: { natureza: "efetiva", marco: "termino" },
    DEE: { natureza: "efetiva", marco: "entrega" },
    DEA: { natureza: "efetiva", marco: "agendamento" }
  };
  return { ...mapa[codigo], codigo, data: valor };
}

describe("montarColunas", () => {
  it("distribui os cartões e devolve as colunas na ordem das etapas", () => {
    const { colunas } = montarColunas(
      [etapa("b", 2), etapa("a", 1)],
      [cartao("c1", "a"), cartao("c2", "b"), cartao("c3", "a")]
    );
    expect(colunas.map(coluna => coluna.etapa.id)).toEqual(["a", "b"]);
    expect(colunas[0].quantidade).toBe(2);
    expect(colunas[1].quantidade).toBe(1);
  });

  it("soma o valor da coluna ignorando cartão sem valor", () => {
    const { colunas } = montarColunas(
      [etapa("a", 1)],
      [cartao("c1", "a", { valor: 1500 }), cartao("c2", "a"), cartao("c3", "a", { valor: 500.5 })]
    );
    expect(colunas[0].valor).toBe(2000.5);
  });

  it("cartão de etapa desconhecida volta como órfão, não desaparece", () => {
    const { colunas, orfaos } = montarColunas([etapa("a", 1)], [cartao("c1", "fantasma")]);
    expect(colunas[0].quantidade).toBe(0);
    expect(orfaos.map(item => item.id)).toEqual(["c1"]);
  });

  it("etapa sem cartão continua existindo como coluna vazia", () => {
    const { colunas } = montarColunas([etapa("a", 1), etapa("b", 2)], [cartao("c1", "a")]);
    expect(colunas).toHaveLength(2);
    expect(colunas[1].cartoes).toEqual([]);
  });

  it("ordena os cartões dentro da coluna pela posição", () => {
    const { colunas } = montarColunas(
      [etapa("a", 1)],
      [cartao("c2", "a", { posicao: 2 }), cartao("c1", "a", { posicao: 1 })]
    );
    expect(colunas[0].cartoes.map(item => item.id)).toEqual(["c1", "c2"]);
  });
});

describe("prazoPrincipal", () => {
  it("sem data de prazo, não há prazo a exibir", () => {
    expect(prazoPrincipal(cartao("c1", "a"), hoje)).toBeNull();
  });

  it("data limite manda no cartão, mesmo com previsão mais próxima", () => {
    const resultado = prazoPrincipal(
      cartao("c1", "a", { datas: [data("DPT", "2026-07-27"), data("DLE", "2026-08-10")] }),
      hoje
    );
    expect(resultado?.codigo).toBe("DLE");
  });

  it("limite de assistência tem precedência sobre limite de entrega", () => {
    const resultado = prazoPrincipal(
      cartao("c1", "a", { datas: [data("DLE", "2026-07-30"), data("DLA", "2026-08-05")] }),
      hoje
    );
    expect(resultado?.codigo).toBe("DLA");
  });

  it("compara com a data efetiva do mesmo marco, não com hoje", () => {
    const resultado = prazoPrincipal(
      cartao("c1", "a", { datas: [data("DLE", "2026-07-20"), data("DEE", "2026-07-19")] }),
      hoje
    );
    expect(resultado?.situacao.estado).toBe("concluido_no_prazo");
  });

  it("prazo em aberto e vencido conta os dias de atraso", () => {
    const resultado = prazoPrincipal(cartao("c1", "a", { datas: [data("DPT", "2026-07-21")] }), hoje);
    expect(resultado?.situacao.estado).toBe("vencido");
    expect(resultado?.situacao.diasDeAtraso).toBe(5);
  });

  it("cai para a previsão de início quando não há mais nada", () => {
    const resultado = prazoPrincipal(cartao("c1", "a", { datas: [data("DPI", "2026-07-28")] }), hoje);
    expect(resultado?.codigo).toBe("DPI");
    expect(resultado?.situacao.estado).toBe("no_prazo");
  });
});

describe("ordenarPorUrgencia", () => {
  it("vencido vem antes de vence hoje, que vem antes de no prazo", () => {
    const lista = [
      cartao("no-prazo", "a", { datas: [data("DPT", "2026-08-30")] }),
      cartao("sem-prazo", "a"),
      cartao("vencido", "a", { datas: [data("DPT", "2026-07-01")] }),
      cartao("hoje", "a", { datas: [data("DPT", "2026-07-26")] })
    ];
    expect(ordenarPorUrgencia(lista, hoje).map(item => item.id)).toEqual([
      "vencido",
      "hoje",
      "no-prazo",
      "sem-prazo"
    ]);
  });

  it("empate de estado desempata pela data, depois pela prioridade", () => {
    const lista = [
      cartao("depois", "a", { datas: [data("DPT", "2026-08-10")] }),
      cartao("antes", "a", { datas: [data("DPT", "2026-08-01")] })
    ];
    expect(ordenarPorUrgencia(lista, hoje).map(item => item.id)).toEqual(["antes", "depois"]);

    const semData = [
      cartao("baixa", "a", { prioridade: 0 }),
      cartao("alta", "a", { prioridade: 3 })
    ];
    expect(ordenarPorUrgencia(semData, hoje).map(item => item.id)).toEqual(["alta", "baixa"]);
  });

  it("não altera a lista recebida", () => {
    const lista = [cartao("b", "a", { prioridade: 0 }), cartao("a", "a", { prioridade: 3 })];
    const original = lista.map(item => item.id);
    ordenarPorUrgencia(lista, hoje);
    expect(lista.map(item => item.id)).toEqual(original);
  });
});

describe("ordenarCodigos", () => {
  it("agrupa por marco e, dentro dele, do limite ao efetivo", () => {
    expect(ordenarCodigos(["DET", "DLE", "DPI", "DEE", "DPE", "DPT"])).toEqual([
      "DPI",
      "DPT",
      "DET",
      "DLE",
      "DPE",
      "DEE"
    ]);
  });
});

describe("apresentação", () => {
  it("descreve o prazo em português, com singular e plural", () => {
    expect(rotuloSituacao(situacaoDoPrazo({ prevista: "2026-07-27", efetiva: null }, hoje))).toBe("Falta 1 dia");
    expect(rotuloSituacao(situacaoDoPrazo({ prevista: "2026-07-31", efetiva: null }, hoje))).toBe("Faltam 5 dias");
    expect(rotuloSituacao(situacaoDoPrazo({ prevista: "2026-07-25", efetiva: null }, hoje))).toBe("1 dia de atraso");
    expect(rotuloSituacao(situacaoDoPrazo({ prevista: "2026-07-26", efetiva: null }, hoje))).toBe("Vence hoje");
    expect(rotuloSituacao(situacaoDoPrazo({ prevista: null, efetiva: null }, hoje))).toBe("Sem prazo");
  });

  it("formata data e moeda no padrão brasileiro, e ausência como travessão", () => {
    expect(formatarData("2026-07-26")).toBe("26/07/2026");
    expect(formatarData("2026-07-26T10:00:00Z")).toBe("26/07/2026");
    expect(formatarData(null)).toBe("—");
    expect(formatarData("qualquer coisa")).toBe("—");
    // O separador entre "R$" e o número é espaço não separável em pt-BR.
    // Comparar o texto inteiro tornaria o teste refém do caractere.
    expect(formatarMoeda(1234.5)).toMatch(/^R\$\s1\.234,50$/);
    expect(formatarMoeda(0)).toMatch(/^R\$\s0,00$/);
    expect(formatarMoeda(null)).toBe("—");
  });
});
