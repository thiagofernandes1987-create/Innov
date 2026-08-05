import { describe, expect, it } from "vitest";
import {
  motivoDoItem,
  reconciliacaoDaComposicao,
  situacaoDaPlanilhaEmPortugues,
  type ItemDaComposicao
} from "@/lib/orcamentos/composicao";

function item(parcial: Partial<ItemDaComposicao>): ItemDaComposicao {
  return {
    coefficient: 1,
    unit_cost: 10,
    total_cost: 10,
    price_status: "COM_CUSTO",
    sinapi_situation: "COM_PRECO",
    ...parcial
  };
}

describe("por que o custo de um item falta", () => {
  it("cada motivo tem texto próprio, e nenhum deles é só uma cor", () => {
    expect(motivoDoItem("COM_CUSTO")).toBeNull();
    expect(motivoDoItem("SEM_PRECO_NA_UF")).toBe("Sem coleta de preço nesta UF");
    expect(motivoDoItem("FORA_DO_RELATORIO")).toBe("Fora do relatório publicado");
  });

  it("motivo inédito aparece com o próprio nome em vez de sumir", () => {
    // Sumir esconderia a novidade e faria a composição parecer completa.
    expect(motivoDoItem("ALGO_QUE_A_CAIXA_INVENTAR")).toBe("ALGO_QUE_A_CAIXA_INVENTAR");
  });

  it("a situação da planilha é traduzida, e o nulo não vira texto", () => {
    expect(situacaoDaPlanilhaEmPortugues("COM_PRECO")).toBe("Com preço em alguma UF");
    expect(situacaoDaPlanilhaEmPortugues("SEM_PRECO")).toBe("Sem preço em nenhuma UF");
    expect(situacaoDaPlanilhaEmPortugues("EM_ESTUDO")).toBe("Em estudo");
    expect(situacaoDaPlanilhaEmPortugues(null)).toBeNull();
    expect(situacaoDaPlanilhaEmPortugues("")).toBeNull();
  });
});

describe("a soma dos itens fecha com o custo publicado?", () => {
  it("fecha quando todos têm custo e a diferença cabe em 1%", () => {
    const conta = reconciliacaoDaComposicao(100, [
      item({ coefficient: 2, unit_cost: 25, total_cost: 50 }),
      item({ coefficient: 1, unit_cost: 50, total_cost: 50 })
    ]);
    expect(conta.itens).toBe(2);
    expect(conta.itensSemCusto).toBe(0);
    expect(conta.soma).toBe(100);
    expect(conta.diferenca).toBe(0);
    expect(conta.situacao).toBe("FECHA");
  });

  it("tolera o centavo de arredondamento da planilha", () => {
    // A CAIXA publica o custo já arredondado; exigir igualdade exata reprovaria
    // composição correta e ensinaria a ignorar o aviso.
    const conta = reconciliacaoDaComposicao(100, [item({ coefficient: 1, unit_cost: 100.4, total_cost: 100.4 })]);
    expect(conta.situacao).toBe("FECHA");
    expect(conta.percentual).toBeCloseTo(0.004, 6);
  });

  it("não fecha quando a diferença passa de 1%, mesmo com todos os custos", () => {
    const conta = reconciliacaoDaComposicao(100, [item({ coefficient: 1, unit_cost: 80, total_cost: 80 })]);
    expect(conta.situacao).toBe("NAO_FECHA");
    expect(conta.percentual).toBeCloseTo(0.2, 6);
  });

  it("item sem custo torna a composição incompleta, e a soma deixa de valer como veredito", () => {
    // Sem o preço de um item, a soma é necessariamente menor que o custo
    // publicado. Chamar isso de "não fecha" culparia a composição por uma
    // ausência da fonte — são coisas diferentes e a tela precisa distinguir.
    const conta = reconciliacaoDaComposicao(100, [
      item({ coefficient: 1, unit_cost: 40, total_cost: 40 }),
      item({ coefficient: 3, unit_cost: null, total_cost: null, price_status: "SEM_PRECO_NA_UF" })
    ]);
    expect(conta.situacao).toBe("INCOMPLETA");
    expect(conta.itensSemCusto).toBe(1);
    expect(conta.soma).toBe(40);
    // A diferença continua calculada — quem quiser sabe o tamanho do buraco —,
    // mas não é ela que decide o rótulo.
    expect(conta.diferenca).toBe(-60);
  });

  it("usa o total gravado quando existe, e o recompõe quando não existe", () => {
    // `total_cost` vem do leitor já arredondado em seis casas. Recalcular por
    // cima produziria um segundo número para a mesma linha.
    const comTotal = reconciliacaoDaComposicao(30, [item({ coefficient: 3, unit_cost: 10, total_cost: 29.999999 })]);
    expect(comTotal.soma).toBeCloseTo(29.999999, 6);
    const semTotal = reconciliacaoDaComposicao(30, [item({ coefficient: 3, unit_cost: 10, total_cost: null, price_status: "COM_CUSTO" })]);
    expect(semTotal.soma).toBe(30);
  });

  it("composição sem itens não é composição que fecha", () => {
    // O catálogo tem composições cuja aba analítica não trouxe linha nenhuma.
    // Dizer "fecha" ali seria afirmar sobre o que não foi medido.
    const conta = reconciliacaoDaComposicao(100, []);
    expect(conta.situacao).toBe("SEM_ITENS");
    expect(conta.soma).toBe(0);
  });

  it("custo publicado zerado não vira divisão por zero", () => {
    const conta = reconciliacaoDaComposicao(0, [item({ coefficient: 1, unit_cost: 5, total_cost: 5 })]);
    expect(Number.isFinite(conta.percentual)).toBe(true);
    expect(conta.situacao).toBe("NAO_FECHA");
  });

  it("aceita número em texto, que é como o PostgREST devolve numeric", () => {
    const conta = reconciliacaoDaComposicao("100.00", [
      item({ coefficient: "2", unit_cost: "25", total_cost: "50.0000" }),
      item({ coefficient: "1", unit_cost: "50", total_cost: "50.0000" })
    ]);
    expect(conta.soma).toBe(100);
    expect(conta.situacao).toBe("FECHA");
  });
});
