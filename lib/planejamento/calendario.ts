// Calendário de trabalho: regime, feriados e a conta de dias úteis.
//
// Ditado pelo responsável em 27 de julho:
//
//   "se em uma etapa do marco Fundação, perfuração de brocas, eu coloco que
//   uma atividade leva 20 dias úteis, e aquela equipe só trabalha de seg a
//   sex, importante definir regime de trabalho, e tem um feriado no meio da
//   execução, logo dias totais seriam 4 finais de semana + 1 feriado + 20 dias
//   úteis"
//
// A conta, executada: 20 úteis + 8 de fim de semana + 1 feriado = **29 dias
// corridos**. Quatro fins de semana são oito dias, não quatro — a estrutura do
// raciocínio está certa e só o total muda.
//
// Sem isto, duração é dia corrido, e "20 dias" vira uma data que não existe no
// mundo: nenhuma equipe de obra trabalha 20 dias seguidos. É o erro que
// aparece na primeira reunião de prazo com o cliente.

export const DIA_MS = 86_400_000;

/** Dias da semana em que se trabalha. 0 é domingo, 6 é sábado. */
export type RegimeDeTrabalho = {
  chave: string;
  rotulo: string;
  /** Índices de dia da semana trabalhados. */
  dias: number[];
};

export const REGIMES: RegimeDeTrabalho[] = [
  { chave: "seg_sex", rotulo: "Segunda a sexta", dias: [1, 2, 3, 4, 5] },
  { chave: "seg_sab", rotulo: "Segunda a sábado", dias: [1, 2, 3, 4, 5, 6] },
  { chave: "seg_sab_meio", rotulo: "Segunda a sexta e sábado até o meio-dia", dias: [1, 2, 3, 4, 5, 6] },
  { chave: "todos", rotulo: "Todos os dias", dias: [0, 1, 2, 3, 4, 5, 6] }
];

export const REGIME_PADRAO = REGIMES[0];

export function regimePorChave(chave: string | null | undefined): RegimeDeTrabalho {
  return REGIMES.find(r => r.chave === chave) ?? REGIME_PADRAO;
}

export function paraDia(iso: string): number {
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(ano, mes - 1, dia) / DIA_MS;
}

export function paraIso(dia: number): string {
  return new Date(dia * DIA_MS).toISOString().slice(0, 10);
}

function diaDaSemana(dia: number): number {
  return new Date(dia * DIA_MS).getUTCDay();
}

// ── Feriados nacionais ──────────────────────────────────────────────────────
//
// Os fixos são lei. Os móveis dependem da Páscoa, e por isso são **calculados**
// e não digitados: uma tabela ano a ano envelhece em silêncio, e o cronograma
// erra exatamente no ano que ninguém conferiu.

/** Domingo de Páscoa pelo algoritmo de Meeus/Jones/Butcher, calendário gregoriano. */
export function pascoa(ano: number): number {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(ano, mes - 1, dia) / DIA_MS;
}

export type Feriado = { data: string; nome: string; movel: boolean };

/**
 * Feriados nacionais brasileiros de um ano.
 *
 * Não inclui feriados estaduais e municipais — esses variam por praça e entram
 * como calendário próprio da organização. Anunciar aqui um feriado municipal
 * que não vale na cidade da obra seria pior que não ter nenhum.
 */
export function feriadosNacionais(ano: number): Feriado[] {
  const domingoDePascoa = pascoa(ano);
  const fixos: [number, number, string][] = [
    [0, 1, "Confraternização Universal"],
    [3, 21, "Tiradentes"],
    [4, 1, "Dia do Trabalho"],
    [8, 7, "Independência"],
    [9, 12, "Nossa Senhora Aparecida"],
    [10, 2, "Finados"],
    [10, 15, "Proclamação da República"],
    [10, 20, "Consciência Negra"],
    [11, 25, "Natal"]
  ];

  const moveis: [number, string][] = [
    [-48, "Carnaval (segunda)"],
    [-47, "Carnaval (terça)"],
    [-2, "Sexta-feira Santa"],
    [60, "Corpus Christi"]
  ];

  return [
    ...fixos.map(([mes, dia, nome]) => ({
      data: paraIso(Date.UTC(ano, mes, dia) / DIA_MS),
      nome,
      movel: false
    })),
    ...moveis.map(([desloc, nome]) => ({
      data: paraIso(domingoDePascoa + desloc),
      nome,
      movel: true
    }))
  ].sort((a, b) => a.data.localeCompare(b.data));
}

/** Conjunto de feriados que cobre a faixa inteira, ano a ano. */
export function feriadosNaFaixa(deIso: string, ateIso: string, extras: string[] = []): Set<number> {
  const primeiro = Number(deIso.slice(0, 4));
  const ultimo = Number(ateIso.slice(0, 4));
  const conjunto = new Set<number>();
  for (let ano = primeiro; ano <= ultimo; ano++) {
    for (const feriado of feriadosNacionais(ano)) conjunto.add(paraDia(feriado.data));
  }
  for (const extra of extras) conjunto.add(paraDia(extra));
  return conjunto;
}

// ── A conta ─────────────────────────────────────────────────────────────────

export type Calendario = {
  regime: RegimeDeTrabalho;
  /** Feriados como número de dia, já resolvidos. */
  feriados: Set<number>;
};

export function ehDiaUtil(calendario: Calendario, dia: number): boolean {
  return calendario.regime.dias.includes(diaDaSemana(dia)) && !calendario.feriados.has(dia);
}

/** O primeiro dia útil a partir de `dia`, inclusive. */
export function proximoDiaUtil(calendario: Calendario, dia: number): number {
  let atual = dia;
  // Trava de segurança: regime sem nenhum dia útil travaria o laço.
  if (calendario.regime.dias.length === 0) return dia;
  let voltas = 0;
  while (!ehDiaUtil(calendario, atual) && voltas < 400) {
    atual += 1;
    voltas += 1;
  }
  return atual;
}

/** O último dia útil até `dia`, andando para trás. */
export function diaUtilAnterior(calendario: Calendario, dia: number): number {
  if (calendario.regime.dias.length === 0) return dia;
  let atual = dia;
  let voltas = 0;
  while (!ehDiaUtil(calendario, atual) && voltas < 400) {
    atual -= 1;
    voltas += 1;
  }
  return atual;
}

/**
 * Término de uma tarefa que começa em `inicio` e dura `duracaoUtil` dias úteis.
 *
 * O próprio dia de início conta como o primeiro dia útil — "começa segunda e
 * dura 1 dia" termina na segunda, não na terça.
 */
export function terminoPorDiasUteis(calendario: Calendario, inicio: number, duracaoUtil: number): number {
  const duracao = Math.max(1, Math.round(duracaoUtil));
  let atual = proximoDiaUtil(calendario, inicio);
  let contados = 1;
  let voltas = 0;
  while (contados < duracao && voltas < 4000) {
    atual += 1;
    if (ehDiaUtil(calendario, atual)) contados += 1;
    voltas += 1;
  }
  return atual;
}

/** Avança `n` dias úteis a partir de `dia`, sem contar o próprio. */
export function avancarDiasUteis(calendario: Calendario, dia: number, n: number): number {
  if (n === 0) return dia;
  const passo = n > 0 ? 1 : -1;
  let restantes = Math.abs(Math.round(n));
  let atual = dia;
  let voltas = 0;
  while (restantes > 0 && voltas < 4000) {
    atual += passo;
    if (ehDiaUtil(calendario, atual)) restantes -= 1;
    voltas += 1;
  }
  return atual;
}

export type ContagemDeDias = {
  uteis: number;
  naoUteis: number;
  feriados: number;
  corridos: number;
};

/** A decomposição que o responsável pediu: úteis, fins de semana e feriados. */
export function contarDias(calendario: Calendario, inicio: number, termino: number): ContagemDeDias {
  let uteis = 0;
  let feriados = 0;
  let naoUteis = 0;
  for (let dia = inicio; dia <= termino; dia++) {
    const noRegime = calendario.regime.dias.includes(diaDaSemana(dia));
    if (!noRegime) naoUteis += 1;
    else if (calendario.feriados.has(dia)) feriados += 1;
    else uteis += 1;
  }
  return { uteis, naoUteis, feriados, corridos: termino - inicio + 1 };
}
