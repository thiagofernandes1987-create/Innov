// Quanto do orçamento é material, quanto é mão de obra.
//
// T-37.6. O resumo do orçamento somava por **tipo de custo** — direto,
// indireto, fixo, administrativo — que é a conta do BDI. A conta que decide
// contratação de equipe própria contra empreitada é outra: a **natureza** do
// item. Ela já era gravada em `budget_items.item_category` desde a S-24, e não
// era somada em lugar nenhum.
//
// **A fórmula é a mesma do banco, deliberadamente.**
// `calculate_budget_version_core` soma direto e indireto com perda e frete, e
// fixo e administrativo sem. Repetir a regra aqui é o preço de mostrar o corte
// sem uma ida ao banco; usar outra fórmula produziria dois números diferentes
// para a mesma coisa na mesma tela, e quem visse os dois não saberia em qual
// acreditar.
//
// Lógica pura, sem `server-only`, para ser exercitada em teste.

export type ItemParaTotal = {
  item_category: string | null;
  cost_type: string | null;
  quantity: number | string | null;
  unit_cost: number | string | null;
  loss_rate: number | string | null;
  freight_rate: number | string | null;
};

export type TotalPorNatureza = {
  natureza: string;
  rotulo: string;
  total: number;
  /** Fração do custo-base, entre 0 e 1. */
  participacao: number;
};

const ROTULOS: Readonly<Record<string, string>> = {
  MATERIAL: "Material",
  LABOR: "Mão de obra",
  EQUIPMENT: "Equipamento",
  SERVICE: "Serviço",
  SUBCONTRACT: "Subempreitada",
  FIXED_COST: "Custo fixo",
  REFERENCE: "Referência global",
  OTHER: "Outros"
};

/** O nome da natureza em português, ou a própria chave quando não se conhece. */
export function rotuloDaNatureza(natureza: string): string {
  return ROTULOS[natureza] ?? natureza;
}

function numero(valor: number | string | null): number {
  const convertido = Number(valor ?? 0);
  return Number.isFinite(convertido) ? convertido : 0;
}

/**
 * O custo de um item, pela mesma regra que o banco aplica.
 *
 * Perda e frete incidem sobre custo direto e indireto. Custo fixo e taxa
 * administrativa entram pelo valor cheio — são rateios, não insumos, e não têm
 * o que perder no caminho.
 */
export function custoDoItem(item: ItemParaTotal): number {
  const base = numero(item.quantity) * numero(item.unit_cost);
  const tipo = String(item.cost_type ?? "");
  if (tipo === "FIXED" || tipo === "ADMINISTRATIVE") return base;
  return base * (1 + numero(item.loss_rate) + numero(item.freight_rate));
}

/**
 * O custo-base repartido por natureza, do maior para o menor.
 *
 * Do maior porque é a leitura que se procura: qual parte manda nesta obra. Uma
 * lista em ordem fixa faria a mão de obra aparecer no meio de "equipamento" e
 * "serviço" mesmo quando ela é 55% do custo.
 *
 * Natureza desconhecida é agrupada com o nome cru em vez de descartada:
 * descartar esconderia dinheiro, e a soma das partes deixaria de fechar com o
 * custo-base sem que ninguém visse por quê.
 */
export function totaisPorNatureza(itens: readonly ItemParaTotal[]): TotalPorNatureza[] {
  const porNatureza = new Map<string, number>();
  for (const item of itens) {
    const natureza = String(item.item_category ?? "OTHER") || "OTHER";
    porNatureza.set(natureza, (porNatureza.get(natureza) ?? 0) + custoDoItem(item));
  }

  // Arredonda no fim, como o banco: `calculate_budget_version_core` soma em
  // `numeric` exato e só o resultado cai numa coluna `numeric(18,2)`.
  // Arredondar item a item faria a soma das naturezas diferir do custo-base em
  // centavos, e dois totais diferentes na mesma tela não têm desempate.
  const base = [...porNatureza.values()].reduce((total, valor) => total + valor, 0);
  return [...porNatureza.entries()]
    .map(([natureza, total]) => ({
      natureza,
      rotulo: rotuloDaNatureza(natureza),
      total: Number(total.toFixed(2)),
      participacao: base > 0 ? total / base : 0
    }))
    .sort((a, b) => b.total - a.total || a.rotulo.localeCompare(b.rotulo, "pt-BR"));
}
