import { describe, expect, it } from "vitest";
import {
  UFS_DO_BRASIL,
  ufDaReferencia,
  referenciasDaUf,
  type ReferenciaDisponivel
} from "@/lib/orcamentos/cub-por-uf";

function referencia(parcial: Partial<ReferenciaDisponivel>): ReferenciaDisponivel {
  return {
    id: "1",
    region: "SP",
    reference_code: "R8-N",
    base_date: "2026-07-01",
    tax_relief: false,
    total_cost: 2231.37,
    ...parcial
  };
}

describe("qual UF a tela oferece", () => {
  it("as vinte e sete, porque a empresa faz obra fora do estado", () => {
    expect(UFS_DO_BRASIL).toHaveLength(27);
    expect(UFS_DO_BRASIL).toContain("SP");
    expect(UFS_DO_BRASIL).toContain("AC");
    expect(UFS_DO_BRASIL).toContain("TO");
  });

  it("a UF do projeto manda, quando o projeto tem UF", () => {
    // A obra é em Minas: oferecer o CUB paulista sem avisar seria oferecer o
    // preço de outro estado com cara de referência da obra.
    expect(ufDaReferencia({ ufDoProjeto: "MG", ufPedida: null })).toBe("MG");
  });

  it("o que a pessoa pede na tela ganha da UF do projeto", () => {
    expect(ufDaReferencia({ ufDoProjeto: "MG", ufPedida: "BA" })).toBe("BA");
  });

  it("sem projeto e sem pedido, cai em São Paulo — a única com fonte automática", () => {
    expect(ufDaReferencia({ ufDoProjeto: null, ufPedida: null })).toBe("SP");
  });

  it("UF inválida não vira filtro: volta para o padrão em vez de zerar a lista", () => {
    // Uma sigla errada na URL não pode transformar "sem referência neste
    // estado" em "sem referência nenhuma" — são coisas diferentes.
    expect(ufDaReferencia({ ufDoProjeto: "XX", ufPedida: null })).toBe("SP");
    expect(ufDaReferencia({ ufDoProjeto: "MG", ufPedida: "ZZ" })).toBe("MG");
    expect(ufDaReferencia({ ufDoProjeto: null, ufPedida: "sp" })).toBe("SP");
    expect(ufDaReferencia({ ufDoProjeto: " mg ", ufPedida: null })).toBe("MG");
  });
});

describe("o que a tela mostra para a UF escolhida", () => {
  const acervo = [
    referencia({ id: "sp-1", region: "SP", reference_code: "R8-N", total_cost: 2231.37 }),
    referencia({ id: "sp-2", region: "SP", reference_code: "R1-A", total_cost: 3242.79 }),
    referencia({ id: "mg-1", region: "MG", reference_code: "R8-N", total_cost: 1990.11 })
  ];

  it("só as daquele estado", () => {
    expect(referenciasDaUf(acervo, "SP").map(item => item.id)).toEqual(["sp-2", "sp-1"]);
    expect(referenciasDaUf(acervo, "MG").map(item => item.id)).toEqual(["mg-1"]);
  });

  it("estado sem referência devolve vazio, e isso é uma resposta", () => {
    // Vazio aqui significa "este estado ainda não tem CUB importado", e a tela
    // precisa dizer isso — não cair no de São Paulo.
    expect(referenciasDaUf(acervo, "BA")).toEqual([]);
  });

  it("ordena por data-base mais recente e depois pelo maior custo", () => {
    const comHistorico = [
      referencia({ id: "velho", base_date: "2026-06-01", total_cost: 2221.44 }),
      referencia({ id: "novo", base_date: "2026-07-01", total_cost: 2231.37 }),
      referencia({ id: "novo-caro", base_date: "2026-07-01", total_cost: 3242.79 })
    ];
    expect(referenciasDaUf(comHistorico, "SP").map(item => item.id)).toEqual([
      "novo-caro",
      "novo",
      "velho"
    ]);
  });

  it("a comparação de UF ignora caixa e espaço, que é como o cadastro digita", () => {
    const bagunçado = [referencia({ id: "x", region: " sp " })];
    expect(referenciasDaUf(bagunçado, "SP").map(item => item.id)).toEqual(["x"]);
  });
});
