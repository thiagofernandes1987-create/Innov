import { CODIGOS_DATA, situacaoDoPrazo, type CodigoData, type Marco, type Natureza, type SituacaoPrazo } from "./datas";

// Modelo de leitura do pipeline. Puro: nenhuma chamada de banco, para que as
// regras de coluna e de prazo sejam testáveis sem subir nada.
//
// Contrato em `diretrizes/PADRAO-DE-INTERFACE.md`, seção 9.

export const TRILHAS = ["cliente", "projeto", "assistencia"] as const;
export type Trilha = (typeof TRILHAS)[number];

export const ROTULO_TRILHA: Record<Trilha, string> = {
  cliente: "Trilha do cliente",
  projeto: "Trilha do projeto",
  assistencia: "Assistência"
};

export type CategoriaEtapa = "aberto" | "ganho" | "perdido";

export type EtapaPipeline = {
  id: string;
  key: string;
  name: string;
  posicao: number;
  categoria: CategoriaEtapa;
  recolhida: boolean;
  cor: number;
  prazoDias: number | null;
};

export type DataDoCartao = {
  natureza: Natureza;
  marco: Marco;
  codigo: CodigoData;
  data: string;
};

export type MarcadorCartao = { id: string; nome: string; cor: number };

export type CartaoPipeline = {
  id: string;
  stageId: string;
  trilha: Trilha;
  titulo: string;
  descricao: string | null;
  clientId: string | null;
  projectId: string | null;
  ticketId: string | null;
  subtitulo: string | null;
  responsavel: string | null;
  prioridade: number;
  valor: number | null;
  cor: number;
  posicao: number;
  datas: DataDoCartao[];
  marcadores: MarcadorCartao[];
  criadoEm: string;
};

export type ColunaPipeline = {
  etapa: EtapaPipeline;
  cartoes: CartaoPipeline[];
  quantidade: number;
  valor: number;
};

/**
 * Distribui os cartões nas colunas declaradas.
 *
 * Cartão cuja etapa não está na lista não é descartado em silêncio: some da
 * tela sem explicação é como um registro vira prejuízo. Ele volta em
 * `orfaos`, para a tela poder dizer que existe.
 */
export function montarColunas(
  etapas: EtapaPipeline[],
  cartoes: CartaoPipeline[]
): { colunas: ColunaPipeline[]; orfaos: CartaoPipeline[] } {
  const porEtapa = new Map<string, CartaoPipeline[]>();
  for (const etapa of etapas) porEtapa.set(etapa.id, []);

  const orfaos: CartaoPipeline[] = [];
  for (const cartao of cartoes) {
    const destino = porEtapa.get(cartao.stageId);
    if (destino) destino.push(cartao);
    else orfaos.push(cartao);
  }

  const colunas = [...etapas]
    .sort((a, b) => a.posicao - b.posicao)
    .map(etapa => {
      const lista = (porEtapa.get(etapa.id) ?? []).sort((a, b) => a.posicao - b.posicao);
      return {
        etapa,
        cartoes: lista,
        quantidade: lista.length,
        valor: lista.reduce((total, cartao) => total + (cartao.valor ?? 0), 0)
      };
    });

  return { colunas, orfaos };
}

// ── Prazo do cartão ─────────────────────────────────────────────────────────

/**
 * Ordem de precedência do prazo exibido no cartão.
 *
 * Limite antes de previsto: data limite é compromisso com o cliente, previsão
 * é planejamento interno. Quando as duas existem, quem manda no vermelho do
 * cartão é a que gera consequência.
 */
const PRECEDENCIA: ReadonlyArray<{ prazo: CodigoData; efetiva: CodigoData }> = [
  { prazo: "DLA", efetiva: "DET" },
  { prazo: "DLE", efetiva: "DEE" },
  { prazo: "DPA", efetiva: "DEA" },
  { prazo: "DPE", efetiva: "DEE" },
  { prazo: "DPT", efetiva: "DET" },
  { prazo: "DPI", efetiva: "DEI" }
];

export type PrazoDoCartao = { codigo: CodigoData; data: string; situacao: SituacaoPrazo };

/** Devolve `null` quando o cartão não tem nenhuma data de prazo declarada. */
export function prazoPrincipal(cartao: CartaoPipeline, agora: Date = new Date()): PrazoDoCartao | null {
  const porCodigo = new Map(cartao.datas.map(item => [item.codigo, item.data]));

  for (const par of PRECEDENCIA) {
    const prazo = porCodigo.get(par.prazo);
    if (!prazo) continue;
    return {
      codigo: par.prazo,
      data: prazo,
      situacao: situacaoDoPrazo({ prevista: prazo, efetiva: porCodigo.get(par.efetiva) ?? null }, agora)
    };
  }
  return null;
}

/** Ordem de leitura de uma coluna: o que aperta primeiro aparece primeiro. */
export function ordenarPorUrgencia(cartoes: CartaoPipeline[], agora: Date = new Date()): CartaoPipeline[] {
  const peso: Record<string, number> = {
    vencido: 0,
    vence_hoje: 1,
    no_prazo: 2,
    concluido_com_atraso: 3,
    concluido_no_prazo: 4,
    sem_prazo: 5
  };
  return [...cartoes].sort((a, b) => {
    const pa = prazoPrincipal(a, agora);
    const pb = prazoPrincipal(b, agora);
    const diferenca = peso[pa?.situacao.estado ?? "sem_prazo"] - peso[pb?.situacao.estado ?? "sem_prazo"];
    if (diferenca !== 0) return diferenca;
    if (pa && pb && pa.data !== pb.data) return pa.data < pb.data ? -1 : 1;
    return b.prioridade - a.prioridade;
  });
}

/** Datas que a etapa pede, na ordem em que o formulário deve exibi-las. */
export function ordenarCodigos(codigos: CodigoData[]): CodigoData[] {
  const ordemNatureza: Record<Natureza, number> = { limite: 0, prevista: 1, efetiva: 2 };
  const ordemMarco: Record<Marco, number> = {
    inicio: 0,
    termino: 1,
    entrega: 2,
    agendamento: 3,
    assistencia: 4
  };
  return [...codigos].sort((a, b) => {
    const ea = CODIGOS_DATA[a];
    const eb = CODIGOS_DATA[b];
    return ordemMarco[ea.marco] - ordemMarco[eb.marco] || ordemNatureza[ea.natureza] - ordemNatureza[eb.natureza];
  });
}

// ── Apresentação ────────────────────────────────────────────────────────────

export function rotuloSituacao(situacao: SituacaoPrazo): string {
  switch (situacao.estado) {
    case "vencido":
      return situacao.diasDeAtraso === 1 ? "1 dia de atraso" : `${situacao.diasDeAtraso} dias de atraso`;
    case "vence_hoje":
      return "Vence hoje";
    case "no_prazo":
      return situacao.diasRestantes === 1 ? "Falta 1 dia" : `Faltam ${situacao.diasRestantes} dias`;
    case "concluido_no_prazo":
      return "Concluído no prazo";
    case "concluido_com_atraso":
      return situacao.diasDeAtraso === 1 ? "Concluído 1 dia atrasado" : `Concluído ${situacao.diasDeAtraso} dias atrasado`;
    default:
      return "Sem prazo";
  }
}

export function formatarData(valor: string | null | undefined): string {
  if (!valor) return "—";
  const [ano, mes, dia] = valor.slice(0, 10).split("-");
  if (!ano || !mes || !dia) return "—";
  return `${dia}/${mes}/${ano}`;
}

export function formatarMoeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
