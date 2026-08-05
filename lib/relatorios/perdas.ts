// Pareto das perdas do funil, por motivo.
//
// É a razão de a lista de motivos ser curada: sem valores comparáveis, não há
// o que ordenar. Com eles, a pergunta que o gestor faz — "onde estamos
// perdendo?" — tem resposta com número, e não com impressão.
//
// **Pareto sobre a causa, nunca sobre o sintoma**, como manda
// `diretrizes/QUALIDADE-CAUSA-RAIZ.md` §2. Aqui o motivo cadastrado já é a
// causa: "praça errada" leva a uma decisão (parar de prospectar naquela
// região), "parou de responder" leva a outra (cadência de retomada). Fosse
// sintoma — "cliente sumiu" — não levaria a nenhuma.
//
// **Ordena por valor, não por contagem.** Doze perdas de R$ 5 mil somam menos
// que uma de R$ 400 mil, e uma lista por contagem mandaria a empresa resolver o
// problema errado. A contagem aparece ao lado, porque frequência alta com valor
// baixo também diz alguma coisa — é onde o processo desperdiça esforço.

export type PerdaCrua = {
  motivo: string | null;
  valor: number;
};

export type LinhaDePareto = {
  motivo: string;
  negocios: number;
  valor: number;
  /** Participação no valor total perdido, 0–1. */
  fatia: number;
  /** Participação acumulada até esta linha, 0–1. */
  acumulado: number;
  /** A pelos primeiros 80% do valor, B até 95%, C o resto. */
  classe: "A" | "B" | "C";
};

/** Como aparece a perda sem motivo — anterior à lista cadastrada, ou importada. */
export const SEM_MOTIVO = "Sem motivo registrado";

/**
 * O Pareto, já ordenado e classificado.
 *
 * A perda **sem motivo** entra na conta em vez de ser escondida. Ela costuma
 * ser a maior fatia num histórico antigo, e omiti-la produziria um relatório
 * bonito e falso: os percentuais fechariam em 100% sobre uma base que não é o
 * total perdido.
 */
export function pareto(perdas: readonly PerdaCrua[]): LinhaDePareto[] {
  const porMotivo = new Map<string, { negocios: number; valor: number }>();
  for (const perda of perdas) {
    const motivo = String(perda.motivo ?? "").trim() || SEM_MOTIVO;
    const atual = porMotivo.get(motivo) ?? { negocios: 0, valor: 0 };
    porMotivo.set(motivo, {
      negocios: atual.negocios + 1,
      valor: atual.valor + Math.max(0, Number(perda.valor) || 0)
    });
  }

  const total = [...porMotivo.values()].reduce((soma, m) => soma + m.valor, 0);
  const ordenado = [...porMotivo.entries()].sort(
    (a, b) => b[1].valor - a[1].valor || b[1].negocios - a[1].negocios || a[0].localeCompare(b[0], "pt-BR")
  );

  let acumulado = 0;
  return ordenado.map(([motivo, m], indice) => {
    // Sem valor nenhum — tudo a zero, ou nenhuma perda — a divisão seria por
    // zero. Fatia zero é a resposta correta, e não `NaN` na tela.
    const fatia = total > 0 ? m.valor / total : 0;
    acumulado += fatia;
    return {
      motivo,
      negocios: m.negocios,
      valor: m.valor,
      fatia,
      acumulado,
      // A regra é a da tabela canônica de `QUALIDADE-CAUSA-RAIZ.md` §2:
      // classifica pelo acumulado **depois** da linha — 74,3% é A, 80,5% é B,
      // 96,3% é C. Ela vale para os casos que aquela tabela tinha, e quebra num
      // que ela não tinha: com um motivo só, o acumulado da primeira linha já é
      // 100% e a maior causa da empresa sairia como classe C, que é o rótulo de
      // "desprezível". A primeira linha é sempre A — ela é, por definição, a
      // prioridade, e é para isso que o Pareto existe.
      classe: indice === 0 ? "A" : acumulado <= 0.8 ? "A" : acumulado <= 0.95 ? "B" : "C"
    } as LinhaDePareto;
  });
}

/**
 * Os motivos cadastrados que **não** apareceram no período.
 *
 * Serve à curadoria, que é o outro lado do relatório: motivo que ninguém
 * escolhe em doze meses ou não descreve a realidade da empresa, ou está
 * escrito de um jeito que ninguém reconhece. Nos dois casos, a lista pede
 * revisão — e sem esta lista ninguém descobre, porque o que não aparece não
 * chama atenção.
 */
export function motivosSemUso(
  cadastrados: readonly { rotulo: string }[],
  linhas: readonly LinhaDePareto[]
): string[] {
  const usados = new Set(linhas.map(l => l.motivo));
  return cadastrados.map(c => c.rotulo).filter(rotulo => !usados.has(rotulo));
}

/**
 * A partir de quantos motivos a classificação A/B/C significa alguma coisa.
 *
 * ABC pressupõe **cauda longa**: a graça é separar as poucas causas que pesam
 * das muitas que não pesam. Com dois motivos ela mente — medido na tela, "praça
 * errada" com 44% da perda saía como classe C, que é o rótulo de desprezível.
 * Abaixo do corte, a ordem por valor já é a mensagem inteira e a coluna some.
 */
export const MINIMO_PARA_CLASSIFICAR = 5;

/** A classificação A/B/C ajuda neste conjunto, ou só atrapalha? */
export function classificacaoUtil(linhas: readonly LinhaDePareto[]): boolean {
  return linhas.length >= MINIMO_PARA_CLASSIFICAR;
}

/** Total perdido no período, para o cartão de topo. */
export function totalPerdido(linhas: readonly LinhaDePareto[]): { negocios: number; valor: number } {
  return linhas.reduce(
    (soma, l) => ({ negocios: soma.negocios + l.negocios, valor: soma.valor + l.valor }),
    { negocios: 0, valor: 0 }
  );
}
