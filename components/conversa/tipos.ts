// Contrato da conversa lateral.
//
// A conversa é a mesma em todo módulo: registro, mensagem, WhatsApp, atividade
// agendada e linha do tempo. O que muda de um módulo para o outro é onde isso
// é gravado — e é só isso que entra por `AcoesConversa`. Um componente por
// módulo produziria cinco linhas do tempo que divergem no primeiro ajuste.

export type ResultadoConversa = { ok: true } | { ok: false; erro: string };

/** Item da linha do tempo. `movimento` é evento do sistema, não texto de gente. */
export type EntradaConversa = {
  id: string;
  tipo: "nota" | "mensagem" | "whatsapp" | "movimento";
  corpo: string;
  autor: string | null;
  quando: string;
};

export type AtividadeConversa = {
  id: string;
  tipo: string;
  titulo: string;
  prazo: string | null;
  responsavel: string | null;
  concluida: boolean;
};

export type PessoaConversa = { id: string; nome: string };

export type AcoesConversa = {
  registrarNota: (registroId: string, corpo: string) => Promise<ResultadoConversa>;
  registrarWhatsApp: (
    registroId: string,
    corpo: string,
    telefone: string
  ) => Promise<ResultadoConversa & { link?: string }>;
  agendarAtividade: (
    registroId: string,
    tipo: string,
    titulo: string,
    prazo: string | null,
    responsavelId?: string | null
  ) => Promise<ResultadoConversa>;
  alternarAtividade: (atividadeId: string) => Promise<ResultadoConversa>;
};
