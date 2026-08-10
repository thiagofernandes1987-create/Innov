import { describe, expect, it } from "vitest";
import {
  custoDoItem,
  rotuloDaNatureza,
  totaisPorNatureza,
  type ItemParaTotal
} from "../lib/orcamentos/naturezas";

const item = (extra: Partial<ItemParaTotal>): ItemParaTotal => ({
  item_category: "MATERIAL",
  cost_type: "DIRECT",
  quantity: 1,
  unit_cost: 100,
  loss_rate: 0,
  freight_rate: 0,
  ...extra
});

describe("o custo de um item é o mesmo que o banco calcula", () => {
  it("direto e indireto sofrem perda e frete", () => {
    // `calculate_budget_version_core`: quantity * unit_cost * (1 + loss + freight).
    // A comparação é por centavo porque o banco soma em `numeric` exato e o
    // JavaScript em ponto flutuante binário: 10 × 50 × 1,15 sai
    // 575.0000000000001 aqui e 575,00 lá. O arredondamento acontece no total,
    // como no banco, e não item a item.
    expect(custoDoItem(item({ quantity: 10, unit_cost: 50, loss_rate: 0.1, freight_rate: 0.05 }))).toBeCloseTo(575, 2);
    expect(custoDoItem(item({ cost_type: "INDIRECT", quantity: 2, unit_cost: 100, loss_rate: 0.5 }))).toBe(300);
  });

  it("fixo e administrativo não sofrem", () => {
    // No banco esses dois somam `quantity * unit_cost`, sem perda nem frete.
    // Aplicar a fórmula do direto aqui faria a soma por natureza divergir do
    // custo-base — dois números diferentes para a mesma coisa, na mesma tela.
    expect(custoDoItem(item({ cost_type: "FIXED", quantity: 3, unit_cost: 100, loss_rate: 0.2 }))).toBe(300);
    expect(custoDoItem(item({ cost_type: "ADMINISTRATIVE", quantity: 1, unit_cost: 61.78, freight_rate: 0.9 }))).toBe(61.78);
  });

  it("valor ausente conta como zero, não quebra a soma", () => {
    expect(custoDoItem(item({ quantity: null as never, unit_cost: null as never }))).toBe(0);
  });
});

describe("totais por natureza", () => {
  const itens = [
    item({ item_category: "MATERIAL", quantity: 100, unit_cost: 892.29 }),
    item({ item_category: "LABOR", quantity: 100, unit_cost: 1192.01 }),
    item({ item_category: "OTHER", cost_type: "ADMINISTRATIVE", quantity: 100, unit_cost: 61.78 }),
    item({ item_category: "MATERIAL", quantity: 10, unit_cost: 25 })
  ];

  it("soma cada natureza uma vez", () => {
    const totais = totaisPorNatureza(itens);
    const material = totais.find(t => t.natureza === "MATERIAL");
    expect(material?.total).toBe(89479);
    expect(totais.find(t => t.natureza === "LABOR")?.total).toBe(119201);
  });

  it("a soma das naturezas é o custo-base", () => {
    const totais = totaisPorNatureza(itens);
    const soma = totais.reduce((t, n) => t + n.total, 0);
    expect(Number(soma.toFixed(2))).toBe(Number(itens.reduce((t, i) => t + custoDoItem(i), 0).toFixed(2)));
  });

  it("a maior natureza vem primeiro — é a que decide a obra", () => {
    expect(totaisPorNatureza(itens)[0].natureza).toBe("LABOR");
  });

  it("participação é sobre o custo-base e fecha em 100%", () => {
    const totais = totaisPorNatureza(itens);
    const soma = totais.reduce((t, n) => t + n.participacao, 0);
    expect(Math.abs(soma - 1)).toBeLessThan(1e-9);
    expect(Number((totais[0].participacao * 100).toFixed(1))).toBe(55.5);
  });

  it("natureza sem item não aparece", () => {
    expect(totaisPorNatureza(itens).map(t => t.natureza)).toEqual(["LABOR", "MATERIAL", "OTHER"]);
  });

  it("orçamento vazio não quebra e não divide por zero", () => {
    expect(totaisPorNatureza([])).toEqual([]);
  });

  it("orçamento que soma zero não produz participação infinita", () => {
    const totais = totaisPorNatureza([item({ quantity: 0, unit_cost: 0 })]);
    for (const t of totais) expect(Number.isFinite(t.participacao)).toBe(true);
  });

  it("natureza desconhecida é agrupada, não descartada", () => {
    // Descartar esconderia dinheiro do total. O rótulo mostra a chave crua.
    const totais = totaisPorNatureza([item({ item_category: "INVENTADA" as never, quantity: 1, unit_cost: 10 })]);
    expect(totais).toHaveLength(1);
    expect(totais[0].total).toBe(10);
  });
});

describe("rótulo em português", () => {
  it("traduz o que conhece e devolve o que não conhece", () => {
    expect(rotuloDaNatureza("LABOR")).toBe("Mão de obra");
    expect(rotuloDaNatureza("MATERIAL")).toBe("Material");
    expect(rotuloDaNatureza("INVENTADA")).toBe("INVENTADA");
  });
});
