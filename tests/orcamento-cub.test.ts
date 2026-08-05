import { describe, expect, it } from "vitest";
import { linhasDoCub, type ReferenciaDeCusto } from "../lib/orcamentos/cub";

const R8N_DESONERADO: ReferenciaDeCusto = {
  sourceName: "SindusCon-SP",
  referenceCode: "R8-N",
  region: "SP",
  baseDate: "2026-06-01",
  taxRelief: true,
  unit: "m²",
  totalCost: 2146.08,
  materialsCost: 892.29,
  laborCost: 1192.01,
  administrativeCost: 61.78,
  equipmentCost: null
};

const R8N_SEM_DECOMPOSICAO: ReferenciaDeCusto = {
  ...R8N_DESONERADO,
  taxRelief: false,
  totalCost: 2221.44,
  materialsCost: null,
  laborCost: null,
  administrativeCost: null,
  equipmentCost: null
};

// T-37.4: a série histórica passou a semear as dezenove tipologias **com** a
// decomposição, inclusive sem desoneração — que antes vinha só com o total e
// caía na linha única de referência. Estes são os números publicados de
// julho/2026, conferidos contra o arquivo oficial.
const CSL16A_SEM_DESONERACAO: ReferenciaDeCusto = {
  sourceName: "SindusCon-SP",
  referenceCode: "CSL-16A",
  region: "SP",
  baseDate: "2026-07-01",
  taxRelief: false,
  unit: "m²",
  totalCost: 3139.51,
  materialsCost: 1317.19,
  laborCost: 1748.58,
  administrativeCost: 73.74,
  equipmentCost: null
};

describe("as tipologias semeadas da série histórica decompõem", () => {
  it("o que antes virava linha única de referência agora separa natureza", () => {
    const { linhas, decomposto, motivo } = linhasDoCub(CSL16A_SEM_DESONERACAO, 250);
    expect(decomposto).toBe(true);
    expect(motivo).toBeUndefined();
    expect(linhas.map(l => l.itemCategory)).toEqual(["MATERIAL", "LABOR", "OTHER"]);
    // 1317,19 + 1748,58 + 73,74 fecha com os 3.139,51 publicados, e é essa
    // conciliação que autoriza a decomposição.
    const total = linhas.reduce((soma, linha) => soma + linha.unitCost * linha.quantity, 0);
    expect(total).toBeCloseTo(3139.51 * 250, 6);
  });
});

describe("o CUB entra decomposto quando a publicação traz a decomposição", () => {
  const { linhas, decomposto } = linhasDoCub(R8N_DESONERADO, 100);

  it("vira uma linha por natureza, não uma linha de referência", () => {
    expect(decomposto).toBe(true);
    expect(linhas.map(l => l.itemCategory)).toEqual(["MATERIAL", "LABOR", "OTHER"]);
  });

  it("cada linha guarda o custo unitário da sua parte", () => {
    expect(linhas.map(l => l.unitCost)).toEqual([892.29, 1192.01, 61.78]);
    for (const linha of linhas) expect(linha.quantity).toBe(100);
  });

  it("a soma das partes é exatamente o total da referência", () => {
    const soma = linhas.reduce((total, l) => total + l.unitCost * l.quantity, 0);
    expect(Number(soma.toFixed(2))).toBe(Number((2146.08 * 100).toFixed(2)));
  });

  it("o administrativo entra como custo administrativo, não como direto", () => {
    // A taxa administrativa do CUB não é custo de obra; somá-la ao direto
    // inflaria a base sobre a qual o BDI incide.
    expect(linhas.find(l => l.itemCategory === "OTHER")?.costType).toBe("ADMINISTRATIVE");
    expect(linhas.filter(l => l.costType === "DIRECT").map(l => l.itemCategory)).toEqual([
      "MATERIAL",
      "LABOR"
    ]);
  });

  it("o código de cada linha diz de qual referência ela veio", () => {
    for (const linha of linhas) {
      expect(linha.code).toContain("CUB-R8-N-SP-2026-06-01-CD");
      expect(linha.source).toContain("SindusCon-SP");
    }
    expect(new Set(linhas.map(l => l.code)).size).toBe(linhas.length);
  });

  it("nenhuma linha do CUB carrega perda ou frete", () => {
    // Referência global já é o custo pronto por m²; acrescentar perda seria
    // contar duas vezes o que a pesquisa do sindicato já embutiu.
    for (const linha of linhas) {
      expect(linha.lossRate).toBe(0);
      expect(linha.freightRate).toBe(0);
    }
  });
});

describe("sem decomposição publicada, nada é inventado", () => {
  it("continua sendo uma linha de referência com o total", () => {
    const { linhas, decomposto, motivo } = linhasDoCub(R8N_SEM_DECOMPOSICAO, 100);
    expect(decomposto).toBe(false);
    expect(linhas).toHaveLength(1);
    expect(linhas[0].itemCategory).toBe("REFERENCE");
    expect(linhas[0].unitCost).toBe(2221.44);
    expect(motivo).toContain("não publica");
  });
});

describe("decomposição que não fecha não é usada", () => {
  it("parte faltando derruba para a linha única, dizendo por quê", () => {
    // Se a soma das partes não bate com o total, usar as partes mudaria o
    // valor do orçamento em relação à referência oficial — e o erro apareceria
    // só na hora de comparar com o índice publicado.
    const { linhas, decomposto, motivo } = linhasDoCub(
      { ...R8N_DESONERADO, laborCost: 1000 },
      100
    );
    expect(decomposto).toBe(false);
    expect(linhas).toHaveLength(1);
    expect(motivo).toContain("não fecha");
  });

  it("diferença de um centavo é arredondamento, e passa", () => {
    const { decomposto } = linhasDoCub({ ...R8N_DESONERADO, materialsCost: 892.28 }, 100);
    expect(decomposto).toBe(true);
  });

  it("equipamento entra quando a publicação traz", () => {
    const { linhas, decomposto } = linhasDoCub(
      { ...R8N_DESONERADO, materialsCost: 800, equipmentCost: 92.29 },
      50
    );
    expect(decomposto).toBe(true);
    expect(linhas.map(l => l.itemCategory)).toEqual(["MATERIAL", "LABOR", "EQUIPMENT", "OTHER"]);
  });

  it("componente zerado não vira linha de zero real", () => {
    // Linha de R$ 0,00 no orçamento é ruído: ocupa uma linha da tabela para
    // não dizer nada.
    const { linhas } = linhasDoCub(
      { ...R8N_DESONERADO, administrativeCost: 0, laborCost: 1253.79 },
      100
    );
    expect(linhas.map(l => l.itemCategory)).toEqual(["MATERIAL", "LABOR"]);
  });
});

describe("área", () => {
  it("a quantidade é a metragem informada", () => {
    const { linhas } = linhasDoCub(R8N_DESONERADO, 37.5);
    for (const linha of linhas) expect(linha.quantity).toBe(37.5);
  });

  it("metragem que não é número positivo não produz linha", () => {
    expect(linhasDoCub(R8N_DESONERADO, 0).linhas).toEqual([]);
    expect(linhasDoCub(R8N_DESONERADO, -3).linhas).toEqual([]);
  });
});
