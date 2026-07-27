// Cálculo de datas do cronograma, a partir das dependências.
//
// Os quatro tipos vêm do enum `task_dependency_type` do banco, e são os que o
// responsável nomeou em português:
//
//   FS = Término-Início  (TI) — só começa quando o anterior termina
//   SS = Início-Início   (II) — começam juntas
//   FF = Término-Término (TT) — terminam juntas
//   SF = Início-Término  (IT) — só termina quando o outro começa
//
// `folgaDias` é positiva para espera e negativa para antecipação: "começa 2
// dias depois que o outro terminar" é folga 2; "pode começar 1 dia antes de o
// outro terminar" é folga −1.
//
// Este módulo é função pura sobre datas. Nenhuma consulta, nenhum fuso: a data
// de obra é dia de calendário, e converter para instante introduziria o erro de
// virada de dia que aparece em toda planilha que alguém já teve de corrigir.
//
// **A duração é em dias úteis**, contados pelo regime de trabalho da equipe e
// pelos feriados — `lib/planejamento/calendario.ts`. A primeira versão deste
// módulo contava dia corrido, e isso produz uma data que não existe no mundo:
// nenhuma equipe de obra trabalha vinte dias seguidos. A folga também é em
// dias úteis, pelo mesmo motivo.

import {
  avancarDiasUteis,
  contarDias,
  diaUtilAnterior,
  feriadosNaFaixa,
  paraDia,
  paraIso,
  proximoDiaUtil,
  REGIME_PADRAO,
  terminoPorDiasUteis,
  type Calendario
} from "./calendario";

export const TIPOS_DEPENDENCIA = ["FS", "SS", "FF", "SF"] as const;
export type TipoDependencia = (typeof TIPOS_DEPENDENCIA)[number];

export const SIGLA_PT: Record<TipoDependencia, string> = {
  FS: "TI",
  SS: "II",
  FF: "TT",
  SF: "IT"
};

export const ROTULO_DEPENDENCIA: Record<TipoDependencia, string> = {
  FS: "Término → Início",
  SS: "Início → Início",
  FF: "Término → Término",
  SF: "Início → Término"
};

export type TarefaCronograma = {
  id: string;
  titulo: string;
  duracaoDias: number;
  /** Data fixada pelo planejador. Sem ela, a data vem das dependências. */
  inicioPlanejado: string | null;
  terminoPlanejado: string | null;
  progresso: number;
};

export type Dependencia = {
  predecessorId: string;
  sucessorId: string;
  tipo: TipoDependencia;
  folgaDias: number;
};

export type BarraCronograma = {
  id: string;
  titulo: string;
  inicio: string;
  termino: string;
  /** Dias corridos entre início e término, inclusive. */
  duracaoDias: number;
  /** Dias efetivamente trabalhados — o número que o planejador digitou. */
  diasUteis: number;
  /** Fins de semana e feriados dentro da barra. */
  diasParados: number;
  progresso: number;
  /** A data foi calculada a partir de dependência, e não fixada pelo planejador. */
  derivada: boolean;
};

/**
 * Ordem topológica das tarefas.
 *
 * Devolve `null` quando há ciclo. O banco já recusa ciclo na escrita, mas esta
 * função também roda sobre dados que chegaram por importação ou por uma versão
 * anterior do esquema — e travar a tela num laço infinito é pior que desenhar
 * um cronograma incompleto.
 */
export function ordenar(
  tarefas: TarefaCronograma[],
  dependencias: Dependencia[]
): TarefaCronograma[] | null {
  const grau = new Map<string, number>(tarefas.map(t => [t.id, 0]));
  const seguintes = new Map<string, string[]>(tarefas.map(t => [t.id, []]));

  for (const dep of dependencias) {
    if (!grau.has(dep.sucessorId) || !seguintes.has(dep.predecessorId)) continue;
    grau.set(dep.sucessorId, (grau.get(dep.sucessorId) ?? 0) + 1);
    seguintes.get(dep.predecessorId)!.push(dep.sucessorId);
  }

  const fila = tarefas.filter(t => (grau.get(t.id) ?? 0) === 0).map(t => t.id);
  const porId = new Map(tarefas.map(t => [t.id, t]));
  const ordem: TarefaCronograma[] = [];

  while (fila.length > 0) {
    const id = fila.shift()!;
    const tarefa = porId.get(id);
    if (tarefa) ordem.push(tarefa);
    for (const proximo of seguintes.get(id) ?? []) {
      const restante = (grau.get(proximo) ?? 0) - 1;
      grau.set(proximo, restante);
      if (restante === 0) fila.push(proximo);
    }
  }

  return ordem.length === tarefas.length ? ordem : null;
}

/**
 * Passada para frente: cada tarefa começa o mais cedo que suas dependências
 * permitem.
 *
 * A data fixada pelo planejador **vence** a calculada quando for mais tarde:
 * quem marcou "não antes de 10 de agosto" tinha um motivo que o grafo não
 * conhece — entrega de material, disponibilidade de equipe, liberação do
 * cliente. Deixar o cálculo puxar para antes apagaria essa informação.
 */
export function calcular(
  tarefas: TarefaCronograma[],
  dependencias: Dependencia[],
  calendario?: Calendario
): { barras: BarraCronograma[]; ciclo: boolean } {
  const cal: Calendario = calendario ?? {
    regime: REGIME_PADRAO,
    feriados: feriadosNaFaixa(
      tarefas.map(t => t.inicioPlanejado).filter(Boolean).sort()[0] ?? `${new Date().getUTCFullYear()}-01-01`,
      `${new Date().getUTCFullYear() + 3}-12-31`
    )
  };
  const ordem = ordenar(tarefas, dependencias);
  if (!ordem) return { barras: [], ciclo: true };

  const porSucessor = new Map<string, Dependencia[]>();
  for (const dep of dependencias) {
    const lista = porSucessor.get(dep.sucessorId) ?? [];
    lista.push(dep);
    porSucessor.set(dep.sucessorId, lista);
  }

  const calculadas = new Map<string, { inicio: number; termino: number }>();
  const barras: BarraCronograma[] = [];

  for (const tarefa of ordem) {
    const duracao = Math.max(0, Math.round(tarefa.duracaoDias));
    const fixadoInicio = tarefa.inicioPlanejado ? paraDia(tarefa.inicioPlanejado) : null;
    const fixadoTermino = tarefa.terminoPlanejado ? paraDia(tarefa.terminoPlanejado) : null;

    let inicioMinimo: number | null = null;
    let terminoMinimo: number | null = null;

    for (const dep of porSucessor.get(tarefa.id) ?? []) {
      const anterior = calculadas.get(dep.predecessorId);
      if (!anterior) continue;
      const folga = Math.round(dep.folgaDias);

      // A folga é em dias **úteis**, e o "dia seguinte" é o próximo dia útil.
      // Contar corrido faria a sucessora de uma tarefa que termina na sexta
      // começar no sábado, quando a equipe não trabalha.
      if (dep.tipo === "FS") {
        const base = avancarDiasUteis(cal, anterior.termino, 1 + folga);
        inicioMinimo = maiorOuNulo(inicioMinimo, base);
      }
      if (dep.tipo === "SS") inicioMinimo = maiorOuNulo(inicioMinimo, avancarDiasUteis(cal, anterior.inicio, folga));
      if (dep.tipo === "FF") terminoMinimo = maiorOuNulo(terminoMinimo, avancarDiasUteis(cal, anterior.termino, folga));
      if (dep.tipo === "SF") terminoMinimo = maiorOuNulo(terminoMinimo, avancarDiasUteis(cal, anterior.inicio, folga));
    }

    let inicio: number;
    let termino: number;
    const temDependencia = (porSucessor.get(tarefa.id) ?? []).length > 0;

    if (terminoMinimo !== null && inicioMinimo === null) {
      // Amarrada pelo fim: o início recua contando dias úteis para trás.
      const alvo = fixadoTermino !== null ? Math.max(fixadoTermino, terminoMinimo) : terminoMinimo;
      termino = diaUtilAnterior(cal, alvo);
      inicio = duracao <= 1 ? termino : avancarDiasUteis(cal, termino, -(duracao - 1));
    } else {
      const base = inicioMinimo ?? fixadoInicio ?? (fixadoTermino !== null ? fixadoTermino : hojeOuZero(tarefas));
      inicio = proximoDiaUtil(cal, fixadoInicio !== null ? Math.max(fixadoInicio, base) : base);
      termino = terminoPorDiasUteis(cal, inicio, duracao);
      if (terminoMinimo !== null && terminoMinimo > termino) termino = diaUtilAnterior(cal, terminoMinimo);
    }

    const contagem = contarDias(cal, inicio, termino);
    calculadas.set(tarefa.id, { inicio, termino });
    barras.push({
      id: tarefa.id,
      titulo: tarefa.titulo,
      inicio: paraIso(inicio),
      termino: paraIso(termino),
      duracaoDias: contagem.corridos,
      diasUteis: contagem.uteis,
      diasParados: contagem.naoUteis + contagem.feriados,
      progresso: tarefa.progresso,
      derivada: temDependencia && fixadoInicio === null
    });
  }

  return { barras, ciclo: false };
}

function maiorOuNulo(atual: number | null, candidato: number): number {
  return atual === null ? candidato : Math.max(atual, candidato);
}

/** Tarefa sem data nenhuma ancora no primeiro início declarado, ou em hoje. */
function hojeOuZero(tarefas: TarefaCronograma[]): number {
  const primeiro = tarefas.map(t => t.inicioPlanejado).filter((d): d is string => Boolean(d)).sort()[0];
  return primeiro ? paraDia(primeiro) : paraDia(new Date().toISOString().slice(0, 10));
}

/**
 * Caminho mais longo até o fim — o que decide a data de entrega.
 *
 * Não é o caminho crítico completo do PERT/CPM, que exige passada para trás e
 * folga total. É a cadeia que hoje empurra o término, e é o que responde "se eu
 * ganhar um dia, ganho onde?". Dizer que é caminho crítico sem calcular folga
 * seria vender um número que não é o que o nome promete.
 */
export function cadeiaMaisLonga(barras: BarraCronograma[], dependencias: Dependencia[]): Set<string> {
  if (barras.length === 0) return new Set();

  const porId = new Map(barras.map(b => [b.id, b]));
  const anteriores = new Map<string, string[]>();
  for (const dep of dependencias) {
    const lista = anteriores.get(dep.sucessorId) ?? [];
    lista.push(dep.predecessorId);
    anteriores.set(dep.sucessorId, lista);
  }

  const ultimo = barras.reduce((maior, atual) =>
    paraDia(atual.termino) > paraDia(maior.termino) ? atual : maior
  );

  const cadeia = new Set<string>();
  let atual: string | null = ultimo.id;
  while (atual !== null && !cadeia.has(atual)) {
    cadeia.add(atual);
    const candidatos: BarraCronograma[] = (anteriores.get(atual) ?? [])
      .map(id => porId.get(id))
      .filter((b): b is BarraCronograma => b !== undefined);
    if (candidatos.length === 0) break;
    const anterior: BarraCronograma = candidatos.reduce((maior, item) =>
      paraDia(item.termino) > paraDia(maior.termino) ? item : maior
    );
    atual = anterior.id;
  }
  return cadeia;
}
