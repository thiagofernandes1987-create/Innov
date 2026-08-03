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
    origem: "Gravada ao criar uma coluna nova em qualquer trilha do funil.",
    emUso: true
  },
  {
    chave: ESCOPOS.marcador,
    nome: "Marcador de cartão",
    origem: "Não há marcador de cartão no produto ainda — o escopo existe reservado.",
    emUso: false
  },
  {
    chave: ESCOPOS.disciplina,
    nome: "Disciplina de documento",
    origem: "Gravada ao enviar documento, na obra ou no acervo geral.",
    emUso: true
  },
  {
    chave: ESCOPOS.unidade,
    nome: "Unidade de medida",
    origem: "Gravada ao incluir item manual no orçamento.",
    emUso: true
  },
  {
    chave: ESCOPOS.motivoDePerda,
    nome: "Motivo de perda",
    // Deliberadamente não ligado. O único campo existente é a mesma caixa de
    // "Motivo/observação" usada em toda mudança de estágio — prosa sobre uma
    // negociação, não vocabulário repetido. Sugerir ali empurraria a pessoa a
    // reaproveitar um motivo genérico, que é o defeito que a diretriz nomeia:
    // dado errado com aparência de arrumado. Ligar depende de existir um campo
    // curto e próprio de motivo de perda.
    origem: "Campo próprio ainda não existe: hoje o motivo é prosa livre da mudança de estágio.",
    emUso: false
  },
  {
    chave: ESCOPOS.motivoDeParada,
    nome: "Motivo de parada",
    origem: "Parada de obra ainda não existe no produto — é da S-28.",
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

/**
 * Sugestões que a plataforma oferece antes de a empresa ter histórico.
 *
 * Existem só onde o campo **já tinha uma lista fixa** e ela foi trocada por
 * campo com sugestão: sem elas, a troca seria uma piora no primeiro dia — de
 * nove opções para nenhuma. Onde o campo sempre foi livre, não há padrão: a
 * plataforma não tem opinião sobre como uma construtora nomeia as etapas dela.
 *
 * São ponto de partida, não preferência: a primeira vez que a empresa usa um
 * valor próprio, ele passa à frente.
 */
export const PADROES_POR_ESCOPO: Readonly<Record<string, readonly string[]>> = {
  [ESCOPOS.disciplina]: [
    "Arquitetura",
    "Estrutural",
    "Elétrica",
    "Hidráulica",
    "Climatização",
    "Interiores",
    "Planejamento",
    "Qualidade",
    "Administrativo"
  ],
  [ESCOPOS.unidade]: ["m²", "m³", "m", "un", "h", "kg", "vb", "cj", "mês"]
};

/** Os padrões de um escopo, ou nada quando a plataforma não tem opinião. */
export function padroesDoEscopo(chave: string): readonly string[] {
  return PADROES_POR_ESCOPO[chave] ?? [];
}
