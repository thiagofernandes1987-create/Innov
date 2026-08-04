// Datas de prazo do pipeline.
//
// Os dez códigos declarados pelo responsável não são dez colunas: são dois
// eixos. Natureza (limite, prevista, efetiva) × marco (início, término,
// entrega, agendamento, assistência). Guardar assim significa que "data limite
// de início", quando alguém pedir, nasce sem migration.
//
// Contrato em `diretrizes/PADRAO-DE-INTERFACE.md`.

export const NATUREZAS = ["limite", "prevista", "efetiva"] as const;
export type Natureza = (typeof NATUREZAS)[number];

export const MARCOS = ["inicio", "termino", "entrega", "agendamento", "assistencia"] as const;
export type Marco = (typeof MARCOS)[number];

export type CodigoData = "DLA" | "DLE" | "DPE" | "DPI" | "DPT" | "DEI" | "DEE" | "DET" | "DPA" | "DEA";

/** Catálogo declarado pelo responsável. Combinação ausente aqui não tem sigla. */
export const CODIGOS_DATA: Readonly<Record<CodigoData, { natureza: Natureza; marco: Marco }>> = {
  DLA: { natureza: "limite", marco: "assistencia" },
  DLE: { natureza: "limite", marco: "entrega" },
  DPI: { natureza: "prevista", marco: "inicio" },
  DPT: { natureza: "prevista", marco: "termino" },
  DPE: { natureza: "prevista", marco: "entrega" },
  DPA: { natureza: "prevista", marco: "agendamento" },
  DEI: { natureza: "efetiva", marco: "inicio" },
  DET: { natureza: "efetiva", marco: "termino" },
  DEE: { natureza: "efetiva", marco: "entrega" },
  DEA: { natureza: "efetiva", marco: "agendamento" }
};

const ROTULO_NATUREZA: Record<Natureza, string> = {
  limite: "limite",
  prevista: "prevista",
  efetiva: "efetiva"
};

const ROTULO_MARCO: Record<Marco, string> = {
  inicio: "início",
  termino: "término",
  entrega: "entrega",
  agendamento: "agendamento",
  assistencia: "assistência"
};

export function decompor(codigo: CodigoData): { natureza: Natureza; marco: Marco } {
  return CODIGOS_DATA[codigo];
}

/** Devolve `null` quando a combinação não tem sigla, em vez de inventar uma. */
export function codigoDe(natureza: Natureza, marco: Marco): CodigoData | null {
  const encontrado = (Object.keys(CODIGOS_DATA) as CodigoData[]).find(codigo => {
    const definicao = CODIGOS_DATA[codigo];
    return definicao.natureza === natureza && definicao.marco === marco;
  });
  return encontrado ?? null;
}

/** Texto por extenso: a interface nunca deve exibir a sigla sozinha. */
export function descrever(codigo: CodigoData): string {
  const { natureza, marco } = CODIGOS_DATA[codigo];
  return `Data ${ROTULO_NATUREZA[natureza]} de ${ROTULO_MARCO[marco]}`;
}

// ── Situação do prazo ───────────────────────────────────────────────────────

export type EstadoPrazo =
  | "sem_prazo"
  | "no_prazo"
  | "vence_hoje"
  | "vencido"
  | "concluido_no_prazo"
  | "concluido_com_atraso";

export type SituacaoPrazo = {
  estado: EstadoPrazo;
  diasRestantes?: number;
  diasDeAtraso?: number;
};

const UM_DIA = 86400000;

function emDias(valor: string | null | undefined): number | null {
  if (!valor) return null;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  return Math.floor(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()) / UM_DIA);
}

/**
 * Compara a data prevista com a efetiva, ou com hoje quando ainda está em
 * aberto. "Vence hoje" é estado próprio: tratar como vencido faz o cartão
 * acender vermelho no dia em que ainda dá tempo.
 */
export function situacaoDoPrazo(
  datas: { prevista: string | null | undefined; efetiva: string | null | undefined },
  agora: Date = new Date()
): SituacaoPrazo {
  const prevista = emDias(datas.prevista);
  if (prevista === null) return { estado: "sem_prazo" };

  const efetiva = emDias(datas.efetiva);
  if (efetiva !== null) {
    const atraso = efetiva - prevista;
    return atraso > 0
      ? { estado: "concluido_com_atraso", diasDeAtraso: atraso }
      : { estado: "concluido_no_prazo", diasDeAtraso: 0 };
  }

  const hoje = Math.floor(
    Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()) / UM_DIA
  );
  if (prevista === hoje) return { estado: "vence_hoje", diasRestantes: 0 };
  if (prevista < hoje) return { estado: "vencido", diasDeAtraso: hoje - prevista };
  return { estado: "no_prazo", diasRestantes: prevista - hoje };
}
