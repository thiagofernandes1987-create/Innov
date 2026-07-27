// Curva de avanço: planejado total, previsto parcial e realizado parcial.
//
// Pedido do responsável em 27 de julho: "na barra de % concluída que vai
// embaixo do Gantt tem que ter 3, uma embaixo da outra, podendo ser Planejado
// total, Previsto parcial e Realizado parcial, assim a pessoa pode acompanhar o
// gráfico de Previsto x Realizado".
//
// As três respondem perguntas diferentes:
//
//   planejado  — quanto da obra **deveria** estar pronto em cada dia, se tudo
//                seguisse o cronograma. É a curva S clássica, e não muda
//                enquanto o plano não mudar;
//   previsto   — quanto **estará** pronto, considerando o replanejamento atual;
//   realizado  — quanto **está** pronto, pelo progresso apontado. Para no dia
//                de hoje: projetar realizado para o futuro é inventar.
//
// A ponderação é por dia útil de cada tarefa, não por contagem. Tarefa de vinte
// dias pesa vinte vezes mais que a de um, e a média simples faria uma tarefa
// curta concluída parecer metade da obra.

import { paraDia, paraIso } from "./calendario";
import type { BarraCronograma } from "./cronograma";

export type PontoDaCurva = {
  data: string;
  /** 0 a 100. */
  planejado: number;
  previsto: number;
  /** Nulo depois de hoje — não se projeta o que ainda não foi apontado. */
  realizado: number | null;
};

/**
 * Curva de avanço acumulado, dia a dia.
 *
 * `linhaDeBase` é o cronograma congelado, quando existe. Sem ela, planejado e
 * previsto coincidem — é o caso de quem ainda não congelou baseline, e dizer
 * que há desvio nesse caso seria inventar um desvio contra nada.
 */
export function curvaDeAvanco(
  barras: BarraCronograma[],
  hoje: string,
  linhaDeBase?: BarraCronograma[]
): PontoDaCurva[] {
  if (barras.length === 0) return [];

  const base = linhaDeBase && linhaDeBase.length > 0 ? linhaDeBase : barras;
  const diaDeHoje = paraDia(hoje);

  const todas = [...barras, ...base];
  const inicio = Math.min(...todas.map(b => paraDia(b.inicio)));
  const fim = Math.max(...todas.map(b => paraDia(b.termino)));

  const pesoTotal = barras.reduce((soma, b) => soma + Math.max(1, b.diasUteis), 0);
  const pesoBase = base.reduce((soma, b) => soma + Math.max(1, b.diasUteis), 0);

  const pontos: PontoDaCurva[] = [];
  for (let dia = inicio; dia <= fim; dia++) {
    pontos.push({
      data: paraIso(dia),
      planejado: acumulado(base, dia, pesoBase),
      previsto: acumulado(barras, dia, pesoTotal),
      realizado: dia <= diaDeHoje ? realizadoAte(barras, dia, pesoTotal) : null
    });
  }
  return pontos;
}

/**
 * Fração da obra que já deveria estar pronta em `dia`, distribuindo o avanço de
 * cada tarefa linearmente ao longo dela.
 *
 * Distribuição linear é simplificação declarada: o consumo real de uma
 * concretagem não é uniforme. Mas a alternativa — curva por tipo de serviço —
 * exige coeficiente que a plataforma ainda não coleta, e inventar a forma da
 * curva seria pior que assumir a reta e dizer que é reta.
 */
function acumulado(barras: BarraCronograma[], dia: number, pesoTotal: number): number {
  if (pesoTotal <= 0) return 0;
  let soma = 0;
  for (const barra of barras) {
    const inicio = paraDia(barra.inicio);
    const termino = paraDia(barra.termino);
    const peso = Math.max(1, barra.diasUteis);
    if (dia >= termino) soma += peso;
    else if (dia >= inicio) {
      const total = Math.max(1, termino - inicio + 1);
      soma += peso * ((dia - inicio + 1) / total);
    }
  }
  return Math.round((soma / pesoTotal) * 1000) / 10;
}

/**
 * O que foi apontado.
 *
 * **Limitação declarada, e a correção do diagnóstico anterior.** Esta função
 * reconstrói a curva do passado distribuindo o progresso atual ao longo do
 * tempo já decorrido da tarefa. Isso é aproximação, não medição: uma tarefa que
 * ficou parada duas semanas e avançou tudo ontem aparece como avanço gradual.
 *
 * A versão anterior deste comentário dizia que a série datada "não existe na
 * plataforma". **Existe, e desde a etapa 12** — o que não existe é a leitura:
 *
 *   `project_progress_snapshots` — `snapshot_date`, `planned_progress`,
 *     `actual_progress`, `source`, com unicidade em (projeto, data, origem).
 *     É exatamente a série que esta função precisaria;
 *   `daily_log_activities` — `progress_before` e `progress_after` por tarefa,
 *     amarrados ao `daily_log_id`, que tem `log_date`. É o apontamento datado
 *     na origem, tarefa a tarefa.
 *
 * Ou seja: o dado é gravável hoje, sem migration. Falta escrever o snapshot ao
 * aprovar o diário e ler dele aqui. Enquanto isso não acontece, a reconstrução
 * fica — e continua sendo aproximação.
 *
 * Registrar a limitação aqui é o que impede alguém de usar a curva do passado
 * como prova em discussão de prazo.
 */
function realizadoAte(barras: BarraCronograma[], dia: number, pesoTotal: number): number {
  if (pesoTotal <= 0) return 0;
  let soma = 0;
  for (const barra of barras) {
    const inicio = paraDia(barra.inicio);
    if (dia < inicio) continue;
    const termino = paraDia(barra.termino);
    const total = Math.max(1, termino - inicio + 1);
    const decorrido = Math.min(1, (dia - inicio + 1) / total);
    soma += Math.max(1, barra.diasUteis) * barra.progresso * decorrido;
  }
  return Math.round((soma / pesoTotal) * 1000) / 10;
}

/** Desvio de hoje: previsto menos realizado, em pontos percentuais. */
export function desvioDeHoje(pontos: PontoDaCurva[], hoje: string): number | null {
  const ponto = pontos.find(p => p.data === hoje);
  if (!ponto || ponto.realizado === null) return null;
  return Math.round((ponto.realizado - ponto.planejado) * 10) / 10;
}
