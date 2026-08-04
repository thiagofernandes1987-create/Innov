// Vocabulário da conversa lateral.
//
// Fica fora de `app/actions/pipeline.ts` porque arquivo `"use server"` só pode
// exportar função assíncrona: exportar uma constante dali derruba a compilação
// inteira, e o erro aponta para o arquivo, não para a linha. Já custou um
// deploy uma vez, com `TEMAS`.

export const TIPOS_ATIVIDADE = ["tarefa", "ligacao", "reuniao", "email", "whatsapp", "documento"] as const;

export type TipoAtividade = (typeof TIPOS_ATIVIDADE)[number];

export const ROTULO_ATIVIDADE: Record<TipoAtividade, string> = {
  tarefa: "Tarefa",
  ligacao: "Ligação",
  reuniao: "Reunião",
  email: "E-mail",
  whatsapp: "WhatsApp",
  documento: "Documento"
};

export function ehTipoAtividade(valor: string): valor is TipoAtividade {
  return (TIPOS_ATIVIDADE as readonly string[]).includes(valor);
}

// ── Canais da conversa ──────────────────────────────────────────────────────
// O tipo da observação é o canal por onde ela saiu. Nota fica em casa;
// mensagem e WhatsApp saem. A distinção existe para a tela poder avisar quando
// o texto vai chegar ao cliente.

export const TIPOS_OBSERVACAO = ["nota", "mensagem", "whatsapp"] as const;

export type TipoObservacao = (typeof TIPOS_OBSERVACAO)[number];

export const ROTULO_OBSERVACAO: Record<TipoObservacao, string> = {
  nota: "Nota interna",
  mensagem: "Mensagem",
  whatsapp: "WhatsApp"
};

/** Se sai da organização, o rótulo precisa dizer isso antes de alguém clicar. */
export function saiDaCasa(tipo: string): boolean {
  return tipo === "mensagem" || tipo === "whatsapp";
}
