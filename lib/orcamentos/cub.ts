// CUB no orçamento: uma linha por natureza, não uma linha de total.
//
// T-37.5. A referência global do sindicato entrava como **uma** linha
// `REFERENCE` com o custo por m² inteiro. A publicação, porém, já vem
// decomposta — a linha de R8-N com desoneração de junho de 2026 traz
// 892,29 de material, 1.192,01 de mão de obra e 61,78 de administrativo, que
// somam exatamente os 2.146,08 do total. As colunas existiam em
// `cost_reference_snapshots` desde a semeadura e ninguém as lia.
//
// A diferença não é de apresentação. Sem separar, não existe "quanto desta
// obra é mão de obra" — e essa é a conta que decide contratação de equipe
// própria contra empreitada, e é a primeira que o cliente pergunta.
//
// **Nada é inventado.** Publicação sem decomposição continua entrando como uma
// linha só; decomposição que não fecha com o total também. Distribuir um
// resíduo por conta própria faria o orçamento divergir da referência oficial
// justamente onde ela deveria ser citável.

/** O que a publicação oficial traz, já lido do banco. */
export type ReferenciaDeCusto = {
  sourceName: string;
  referenceCode: string;
  region: string;
  baseDate: string;
  taxRelief: boolean;
  unit: string;
  totalCost: number;
  materialsCost: number | null;
  laborCost: number | null;
  administrativeCost: number | null;
  equipmentCost: number | null;
};

export type NaturezaDeItem =
  | "MATERIAL"
  | "LABOR"
  | "EQUIPMENT"
  | "SERVICE"
  | "SUBCONTRACT"
  | "FIXED_COST"
  | "REFERENCE"
  | "OTHER";

export type TipoDeCusto = "DIRECT" | "INDIRECT" | "FIXED" | "ADMINISTRATIVE";

export type LinhaDoCub = {
  code: string;
  description: string;
  itemCategory: NaturezaDeItem;
  costType: TipoDeCusto;
  unit: string;
  quantity: number;
  unitCost: number;
  lossRate: 0;
  freightRate: 0;
  source: string;
};

/**
 * Quanto a soma das partes pode divergir do total, por unidade.
 *
 * Um centavo: os valores publicados têm duas casas, e a soma de três parcelas
 * arredondadas pode cair um centavo do total arredondado. Mais que isso não é
 * arredondamento — é parte faltando, e aí a decomposição não serve.
 */
const TOLERANCIA_POR_UNIDADE = 0.01;

type Componente = {
  natureza: NaturezaDeItem;
  tipo: TipoDeCusto;
  rotulo: string;
  sufixo: string;
  valor: number | null;
};

function componentes(referencia: ReferenciaDeCusto): Componente[] {
  return [
    { natureza: "MATERIAL", tipo: "DIRECT", rotulo: "materiais", sufixo: "MAT", valor: referencia.materialsCost },
    { natureza: "LABOR", tipo: "DIRECT", rotulo: "mão de obra", sufixo: "MO", valor: referencia.laborCost },
    { natureza: "EQUIPMENT", tipo: "DIRECT", rotulo: "equipamentos", sufixo: "EQP", valor: referencia.equipmentCost },
    // A taxa administrativa do CUB não é custo de obra. Somá-la ao direto
    // inflaria a base sobre a qual o BDI incide, e é a duplicidade que
    // `calculate_budget_version` já reprova quando ela também está no BDI.
    { natureza: "OTHER", tipo: "ADMINISTRATIVE", rotulo: "administrativo", sufixo: "ADM", valor: referencia.administrativeCost }
  ];
}

function identificacao(referencia: ReferenciaDeCusto) {
  const regime = referencia.taxRelief ? "CD" : "SD";
  return {
    prefixo: `CUB-${referencia.referenceCode}-${referencia.region}-${referencia.baseDate}-${regime}`,
    regime: referencia.taxRelief ? "com desoneração" : "sem desoneração"
  };
}

export type ResultadoDoCub = {
  linhas: LinhaDoCub[];
  /** Verdadeiro quando entrou separado por natureza. */
  decomposto: boolean;
  /** Por que não foi decomposto, quando não foi. */
  motivo?: string;
};

/**
 * As linhas de orçamento que uma referência global produz para uma metragem.
 *
 * Decompõe quando a publicação traz as partes **e** elas fecham com o total.
 * Nos demais casos devolve a linha única de referência, dizendo por quê — a
 * tela mostra o motivo, porque "por que só apareceu uma linha" é a primeira
 * pergunta de quem esperava ver a mão de obra separada.
 */
export function linhasDoCub(referencia: ReferenciaDeCusto, area: number): ResultadoDoCub {
  if (!Number.isFinite(area) || area <= 0) return { linhas: [], decomposto: false };

  const { prefixo, regime } = identificacao(referencia);
  const fonte = `${referencia.sourceName} · ${referencia.referenceCode} · ${regime}`;
  const base = {
    unit: referencia.unit,
    quantity: area,
    lossRate: 0 as const,
    freightRate: 0 as const,
    source: fonte
  };

  const linhaUnica = (motivo: string): ResultadoDoCub => ({
    decomposto: false,
    motivo,
    linhas: [
      {
        ...base,
        code: prefixo,
        description: `Referência global ${referencia.sourceName} ${referencia.referenceCode} ${regime}`,
        itemCategory: "REFERENCE",
        costType: "DIRECT",
        unitCost: referencia.totalCost
      }
    ]
  });

  const partes = componentes(referencia).filter(parte => parte.valor !== null);
  if (partes.length === 0) {
    return linhaUnica(
      `${referencia.sourceName} não publica a decomposição desta referência: o custo entra em uma linha só.`
    );
  }

  const soma = partes.reduce((total, parte) => total + Number(parte.valor), 0);
  if (Math.abs(soma - referencia.totalCost) > TOLERANCIA_POR_UNIDADE) {
    return linhaUnica(
      `A decomposição publicada não fecha com o total (${soma.toFixed(2)} contra ${referencia.totalCost.toFixed(2)} por ${referencia.unit}): o custo entra em uma linha só, para não divergir da referência oficial.`
    );
  }

  // Componente zerado não vira linha: uma linha de R$ 0,00 ocupa espaço na
  // tabela para não dizer nada.
  const linhas = partes
    .filter(parte => Number(parte.valor) !== 0)
    .map(parte => ({
      ...base,
      code: `${prefixo}-${parte.sufixo}`,
      description: `Referência global ${referencia.sourceName} ${referencia.referenceCode} ${regime} — ${parte.rotulo}`,
      itemCategory: parte.natureza,
      costType: parte.tipo,
      unitCost: Number(parte.valor)
    }));

  return { linhas, decomposto: true };
}
