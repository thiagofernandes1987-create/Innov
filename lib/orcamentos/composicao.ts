// A composição analítica: do que o serviço é feito, e se a conta fecha.
//
// T-37.10. O catálogo do SINAPI já importava insumos e composições, e nenhuma
// tela abria uma composição. Faltava a leitura que o orçamentista faz antes de
// puxar um serviço para o orçamento — "esse preço paga o escopo?" —, e que só
// se responde vendo os itens.
//
// **A pergunta que a tela precisa responder não é o preço; é se o preço está
// inteiro.** Medido no arquivo de 06/2026, em SP: 2.859 das 8.403 composições
// (34%) têm ao menos um item sem preço publicado no estado. Nelas o custo
// oficial existe, mas a soma dos itens é menor — não porque a composição seja
// barata, e sim porque parte dela não foi coletada. Sem essa distinção em tela,
// as duas situações se parecem, e a mais perigosa é a que passa despercebida.
//
// Lógica pura, sem `server-only`, para ser exercitada em teste.

export type PriceStatus = "COM_CUSTO" | "SEM_PRECO_NA_UF" | "FORA_DO_RELATORIO" | (string & {});

export type ItemDaComposicao = {
  coefficient: number | string | null;
  unit_cost: number | string | null;
  total_cost: number | string | null;
  price_status: PriceStatus | null;
  sinapi_situation: string | null;
};

export type SituacaoDaConta = "FECHA" | "NAO_FECHA" | "INCOMPLETA" | "SEM_ITENS";

export type Reconciliacao = {
  itens: number;
  itensSemCusto: number;
  /** Soma dos itens que **têm** custo. */
  soma: number;
  custoPublicado: number;
  /** `soma - custoPublicado`. Negativo quando falta. */
  diferenca: number;
  /** A diferença como fração do custo publicado. */
  percentual: number;
  situacao: SituacaoDaConta;
};

/**
 * A diferença aceitável entre a soma dos itens e o custo publicado.
 *
 * A CAIXA publica o custo já arredondado, e os coeficientes têm seis casas:
 * exigir igualdade exata reprovaria composição correta, e aviso que dispara
 * sempre é aviso que se aprende a ignorar. Um por cento é o mesmo limite com
 * que a reconciliação foi medida contra o arquivo real — 5.433 de 5.544
 * composições completas fecham dentro dele, com desvio mediano de 0,02%.
 */
export const TOLERANCIA_DA_CONTA = 0.01;

const MOTIVOS: Readonly<Record<string, string>> = {
  SEM_PRECO_NA_UF: "Sem coleta de preço nesta UF",
  FORA_DO_RELATORIO: "Fora do relatório publicado"
};

const SITUACOES: Readonly<Record<string, string>> = {
  COM_PRECO: "Com preço em alguma UF",
  SEM_PRECO: "Sem preço em nenhuma UF",
  COM_CUSTO: "Com custo calculado",
  SEM_CUSTO: "Sem custo calculado",
  EM_ESTUDO: "Em estudo",
  DESCONHECIDA: "Não declarada"
};

/**
 * Por que falta o custo deste item, em texto.
 *
 * Devolve `null` quando não falta. Motivo desconhecido volta com o próprio
 * nome: sumir esconderia a novidade e faria a composição parecer completa —
 * que é exatamente o efeito que esta tela existe para impedir.
 */
export function motivoDoItem(status: PriceStatus | null): string | null {
  const chave = String(status ?? "COM_CUSTO");
  if (chave === "COM_CUSTO") return null;
  return MOTIVOS[chave] ?? chave;
}

/**
 * A situação que a **planilha** declara, traduzida.
 *
 * É contexto, não veredito: a legenda do relatório diz que "COM PREÇO" vale
 * para insumo coletado em **pelo menos uma UF**. Um item pode ser COM PREÇO e
 * não ter preço no estado que está sendo lido — são 4.679 casos em SP.
 */
export function situacaoDaPlanilhaEmPortugues(situacao: string | null): string | null {
  const chave = String(situacao ?? "").trim();
  if (!chave) return null;
  return SITUACOES[chave] ?? chave;
}

function numero(valor: number | string | null): number {
  const convertido = Number(valor ?? 0);
  return Number.isFinite(convertido) ? convertido : 0;
}

function temCusto(item: ItemDaComposicao): boolean {
  return String(item.price_status ?? "COM_CUSTO") === "COM_CUSTO" && item.unit_cost !== null;
}

/**
 * A soma dos itens contra o custo publicado.
 *
 * Quatro respostas, e a distinção entre as duas do meio é o ponto:
 *
 * - `FECHA` — todos os itens têm custo e a diferença cabe na tolerância.
 * - `NAO_FECHA` — todos têm custo e a diferença não cabe. É divergência de
 *   dado, e merece conferência antes de virar preço de proposta.
 * - `INCOMPLETA` — falta preço de pelo menos um item. A soma é
 *   necessariamente menor, e chamar isso de "não fecha" culparia a composição
 *   por uma ausência da fonte.
 * - `SEM_ITENS` — a aba analítica não trouxe linha nenhuma. Dizer que fecha
 *   seria afirmar sobre o que não foi medido.
 */
export function reconciliacaoDaComposicao(
  custoPublicado: number | string | null,
  itens: readonly ItemDaComposicao[]
): Reconciliacao {
  const publicado = numero(custoPublicado);
  const semCusto = itens.filter(item => !temCusto(item)).length;

  // `total_cost` vem do leitor já arredondado; recalcular por cima produziria
  // um segundo número para a mesma linha. Só recompõe quando não veio.
  const soma = itens.reduce((total, item) => {
    if (!temCusto(item)) return total;
    const gravado = item.total_cost === null ? null : numero(item.total_cost);
    return total + (gravado ?? numero(item.unit_cost) * numero(item.coefficient));
  }, 0);

  const diferenca = soma - publicado;
  const percentual = publicado === 0 ? (soma === 0 ? 0 : 1) : Math.abs(diferenca) / publicado;

  const situacao: SituacaoDaConta = !itens.length
    ? "SEM_ITENS"
    : semCusto > 0
      ? "INCOMPLETA"
      : percentual <= TOLERANCIA_DA_CONTA
        ? "FECHA"
        : "NAO_FECHA";

  return {
    itens: itens.length,
    itensSemCusto: semCusto,
    soma: Number(soma.toFixed(6)),
    custoPublicado: publicado,
    diferenca: Number(diferenca.toFixed(6)),
    percentual,
    situacao
  };
}
