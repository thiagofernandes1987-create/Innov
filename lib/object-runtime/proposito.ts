// O que a informação **faz** — a pergunta que a tela faz no lugar de "qual tipo?".
//
// A biblioteca de tipos do motor (`spec.ts`) é vocabulário de engenharia:
// `texto_longo`, `selecao_multipla`, `referencia`, `usuario`. Quem cria um
// campo é o administrador da empresa cliente, e a pergunta que ele sabe
// responder não é "qual tipo?" — é "o que essa informação é?". Ele sabe que
// vai anotar o responsável pela vistoria; não tem por que saber que isso é um
// `usuario` que ocupa um slot da família `ref`.
//
// Este módulo é a tradução entre as duas linguagens, e é lógica pura: não
// importa `server-only`, para poder ser exercitado em teste — a lição do
// achado FND-0004 da Etapa 20.
//
// **Limite consciente do primeiro corte:** um propósito por tipo. O campo
// gravado guarda o tipo, não o propósito, então dois propósitos apontando para
// o mesmo tipo tornariam a reabertura do campo um chute sobre qual pergunta
// foi respondida. Quando o spec passar a guardar o propósito, "é um telefone?"
// e "é um nome?" podem conviver sobre `texto`.

import { slotFamilyFor, type FieldType, type ObjectFieldSpec } from "./spec";

export type Proposito = {
  id: string;
  /** A pergunta na língua de quem declara o campo. */
  pergunta: string;
  /** Um caso concreto de obra, para a escolha ser por reconhecimento. */
  exemplo: string;
  /** O que passa a ser possível com o campo — e o que não passa. */
  efeito: string;
  tipo: FieldType;
  /** Nasce entrando na busca e na ordenação, quando o tipo permite. */
  filtravelPorPadrao: boolean;
};

/**
 * O catálogo de propósitos.
 *
 * A ordem é a de uso, não a da tabela de tipos: nome e descrição primeiro
 * porque quase todo campo declarado é um dos dois; assinatura por último
 * porque é o mais raro.
 */
export const PROPOSITOS: readonly Proposito[] = [
  {
    id: "nome",
    pergunta: "É um nome ou um título curto",
    exemplo: "Nome do equipamento, título da vistoria",
    efeito: "Entra na busca e na ordenação da listagem.",
    tipo: "texto",
    filtravelPorPadrao: true
  },
  {
    id: "descricao",
    pergunta: "É um texto longo, uma observação",
    exemplo: "Descrição da não conformidade, relato do inspetor",
    efeito: "Aparece no registro e no relatório. Não entra no filtro — texto longo não se filtra, se lê.",
    tipo: "texto_longo",
    filtravelPorPadrao: false
  },
  {
    id: "quantidade",
    pergunta: "É uma quantidade ou uma medida",
    exemplo: "Área em m², peças recebidas, espessura",
    efeito: "Entra no filtro por faixa e na ordenação, e pode ser somada no relatório.",
    tipo: "numero",
    filtravelPorPadrao: true
  },
  {
    id: "dinheiro",
    pergunta: "É dinheiro",
    exemplo: "Valor do aditivo, custo do material",
    efeito: "Entra no filtro por faixa, soma no relatório e é exibido com a moeda.",
    tipo: "moeda",
    filtravelPorPadrao: true
  },
  {
    id: "percentual",
    pergunta: "É um percentual",
    exemplo: "Avanço físico da etapa, retenção contratual",
    efeito: "Entra no filtro por faixa e é exibido com o sinal de porcentagem.",
    tipo: "percentual",
    filtravelPorPadrao: true
  },
  {
    id: "data",
    pergunta: "É uma data",
    exemplo: "Data da vistoria, prazo de entrega",
    efeito: "Entra no filtro por período e na ordenação por tempo.",
    tipo: "data",
    filtravelPorPadrao: true
  },
  {
    id: "data_hora",
    pergunta: "É um momento, com hora",
    exemplo: "Chegada do caminhão, início da concretagem",
    efeito: "Entra no filtro por período e guarda a hora, não só o dia.",
    tipo: "data_hora",
    filtravelPorPadrao: true
  },
  {
    id: "sim_nao",
    pergunta: "É sim ou não",
    exemplo: "Liberado para concretagem? Houve retrabalho?",
    efeito: "Entra no filtro como duas opções e serve de corte no relatório.",
    tipo: "booleano",
    filtravelPorPadrao: true
  },
  {
    id: "escolha",
    pergunta: "É uma escolha entre opções que você define",
    exemplo: "Situação: aprovado, aprovado com ressalva, reprovado",
    efeito: "Entra no filtro como lista fechada — é o que faz a contagem por opção existir.",
    tipo: "selecao",
    filtravelPorPadrao: true
  },
  {
    id: "escolha_multipla",
    pergunta: "São várias escolhas ao mesmo tempo",
    exemplo: "Equipamentos usados na frente de serviço",
    efeito: "Aparece no registro. Não entra no filtro nesta camada: várias respostas por linha não cabem numa coluna filtrável.",
    tipo: "selecao_multipla",
    filtravelPorPadrao: false
  },
  {
    id: "pessoa",
    pergunta: "É uma pessoa da equipe",
    exemplo: "Responsável pela vistoria, encarregado da frente",
    efeito: "Entra no filtro por pessoa e acompanha quem foi apontado — é o que faz valer mais que texto.",
    tipo: "usuario",
    filtravelPorPadrao: true
  },
  {
    id: "registro",
    pergunta: "É um registro de outro cadastro",
    exemplo: "O fornecedor, a obra, o material do catálogo",
    efeito: "Entra no filtro e leva ao registro apontado, em vez de repetir o nome dele por escrito.",
    tipo: "referencia",
    filtravelPorPadrao: true
  },
  {
    id: "arquivo",
    pergunta: "É um arquivo ou uma foto",
    exemplo: "Foto da não conformidade, certificado do lote",
    efeito: "Passa pela quarentena e pela varredura antimalware, como todo anexo da plataforma. Não entra no filtro.",
    tipo: "anexo",
    filtravelPorPadrao: false
  },
  {
    id: "lugar",
    pergunta: "É um lugar no mapa",
    exemplo: "Ponto da sondagem, local da ocorrência",
    efeito: "Guarda a posição com a precisão do aparelho. Não entra no filtro nesta camada.",
    tipo: "geolocalizacao",
    filtravelPorPadrao: false
  },
  {
    id: "assinatura",
    pergunta: "É uma assinatura",
    exemplo: "Aceite do cliente no recebimento",
    efeito: "Guarda a evidência da assinatura junto ao registro. Não entra no filtro.",
    tipo: "assinatura",
    filtravelPorPadrao: false
  }
];

const POR_ID = new Map(PROPOSITOS.map(p => [p.id, p]));
const POR_TIPO = new Map(PROPOSITOS.map(p => [p.tipo, p]));

/** O propósito pelo identificador, ou `null` — resposta desconhecida não quebra a tela. */
export function proposito(id: string): Proposito | null {
  return POR_ID.get(String(id ?? "")) ?? null;
}

/** O propósito que criou um campo já gravado, a partir do tipo dele. */
export function propositoDoTipo(tipo: FieldType): Proposito | null {
  return POR_TIPO.get(tipo) ?? null;
}

/** Comprimento máximo da chave, espelhando o identificador aceito em `spec.ts`. */
const MAXIMO_DA_CHAVE = 63;

/**
 * A chave técnica do campo, derivada do rótulo.
 *
 * O usuário digita "Responsável pela vistoria"; a chave `responsavel_pela_vistoria`
 * é consequência, não uma segunda pergunta. Pedir as duas coisas seria pedir
 * que ele resolvesse um problema de identificador que é nosso.
 *
 * Usa NFKD, e não NFD: "2ª medição" precisa virar `2a_medicao`, e o indicador
 * ordinal só se decompõe em `a` na forma de compatibilidade. Rótulo que começa
 * com dígito ganha prefixo em vez de ser recusado — "2ª medição" é rótulo
 * legítimo de obra, e transformar a regra de identificador em problema do
 * usuário é o defeito que este módulo existe para evitar.
 */
export function chaveDeCampo(rotulo: string): string {
  const base = String(rotulo ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!base) return "";
  const comInicioValido = /^[a-z]/.test(base) ? base : `campo_${base}`;
  return comInicioValido.slice(0, MAXIMO_DA_CHAVE).replace(/_+$/g, "");
}

/**
 * O campo declarado que sai da resposta.
 *
 * Devolve `null` quando a resposta não dá um campo utilizável — propósito
 * desconhecido ou rótulo que não sobrevive à normalização. Devolver um campo
 * de chave vazia empurraria o erro para a publicação, longe de onde ele
 * nasceu, e quem vê a mensagem não seria quem digitou o rótulo.
 */
export function campoDoProposito(
  propositoId: string,
  rotulo: string,
  opcoes?: { obrigatorio?: boolean }
): ObjectFieldSpec | null {
  const escolhido = proposito(propositoId);
  if (!escolhido) return null;

  const key = chaveDeCampo(rotulo);
  if (!key) return null;

  const campo: ObjectFieldSpec = {
    key,
    label: String(rotulo).trim(),
    type: escolhido.tipo,
    indexed: escolhido.filtravelPorPadrao && slotFamilyFor(escolhido.tipo) !== null
  };

  if (opcoes?.obrigatorio) campo.required = true;
  // Nasce com a lista vazia, e não sem a chave: o campo de seleção precisa
  // pedir as opções na cara de quem o criou, em vez de publicar mudo.
  if (escolhido.tipo === "selecao" || escolhido.tipo === "selecao_multipla") campo.options = [];

  return campo;
}
