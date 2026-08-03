// Como cada escopo de vocabulário se chama para quem administra.
//
// A chave técnica — `eap.etapa` — não serve na tela: quem limpa o catálogo é o
// administrador da construtora, não quem escreveu o código. E o rótulo sozinho
// também não basta: "Etapa da EAP" não diz *de onde os valores vêm*, e sem
// isso não dá para julgar se um valor está ali por engano ou por uso legítimo.
//
// Por isso cada escopo declara as três coisas: nome, origem e o campo onde a
// sugestão aparece.

import { ESCOPOS } from "./servidor";

export type DescricaoDeEscopo = {
  chave: string;
  nome: string;
  /** De onde os valores entram no catálogo. */
  origem: string;
  /** Se a sugestão já está ligada em alguma tela. */
  emUso: boolean;
};

export const ESCOPOS_DESCRITOS: readonly DescricaoDeEscopo[] = [
  {
    chave: ESCOPOS.etapaDaEap,
    nome: "Etapa da EAP",
    origem: "Gravada ao criar uma etapa no cronograma da obra.",
    emUso: true
  },
  {
    chave: ESCOPOS.atividadeDaEap,
    nome: "Atividade do cronograma",
    origem: "Gravada ao criar uma atividade no cronograma da obra.",
    emUso: true
  },
  {
    chave: ESCOPOS.etapaDoFunil,
    nome: "Etapa do funil",
    origem: "Etapas do funil comercial.",
    emUso: false
  },
  {
    chave: ESCOPOS.marcador,
    nome: "Marcador de cartão",
    origem: "Marcadores usados nos cartões do CRM.",
    emUso: false
  },
  {
    chave: ESCOPOS.disciplina,
    nome: "Disciplina de documento",
    origem: "Disciplina informada ao enviar documento da obra.",
    emUso: false
  },
  {
    chave: ESCOPOS.unidade,
    nome: "Unidade de medida",
    origem: "Unidades digitadas em orçamento e medição.",
    emUso: false
  },
  {
    chave: ESCOPOS.motivoDePerda,
    nome: "Motivo de perda",
    origem: "Motivo informado ao marcar um negócio como perdido.",
    emUso: false
  },
  {
    chave: ESCOPOS.motivoDeParada,
    nome: "Motivo de parada",
    origem: "Motivo informado ao registrar parada de obra.",
    emUso: false
  }
];

const POR_CHAVE = new Map(ESCOPOS_DESCRITOS.map(e => [e.chave, e]));

/**
 * A descrição de um escopo, mesmo quando ele não está no catálogo.
 *
 * Escopo gravado por uma versão anterior do código continua no banco depois de
 * o código mudar. Devolver `undefined` faria a tela esconder valores que
 * existem — e vocabulário invisível é exatamente o que o administrador não
 * consegue limpar.
 */
export function descreverEscopo(chave: string): DescricaoDeEscopo {
  return (
    POR_CHAVE.get(chave) ?? {
      chave,
      nome: chave,
      origem: "Escopo sem descrição no código atual — provavelmente de uma versão anterior.",
      emUso: false
    }
  );
}
