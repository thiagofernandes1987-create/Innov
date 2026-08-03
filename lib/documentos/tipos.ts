// Catálogo de tipos de documento.
//
// **Correção de rota, 3 de agosto.** A primeira versão prendia cada modelo ao
// módulo que o emite — proposta em `propostas`, FVS em `qualidade` — e usava
// isso como chave de permissão. O responsável recusou, com o caso que derruba o
// desenho:
//
//   "enviar uma proposta para o cliente na etapa de projeto ou o contrato
//    assinado, não teria como se cada documento ficasse preso a um único
//    módulo"
//
// Está certo. Documento circula entre módulos por natureza: a proposta nasce em
// Propostas e é enviada de Projetos; o contrato assinado é anexado num
// atendimento do SAC; a mensagem de boas-vindas do CRM é disparada por uma
// mudança de etapa do funil. Amarrar o modelo ao emissor transforma cada uso
// legítimo numa exceção.
//
// O desenho novo separa três coisas que estavam grudadas:
//
//   **onde mora**   uma tabela só, num aplicativo próprio — Modelos e
//                   Documentações. Todo módulo lê.
//   **o que é**     `document_type`, deste catálogo. É como o módulo organiza.
//   **quem oferece** a Administração marca, por aplicativo, quais tipos ficam
//                   disponíveis. Isso é **disponibilização**, não segurança: a
//                   permissão de ler continua sendo a do aplicativo de modelos.

export type CategoriaDeDocumento =
  | "COMERCIAL"
  | "JURIDICO"
  | "CRM"
  | "MENSAGENS"
  | "QUALIDADE"
  | "TERMOS"
  | "OPERACIONAL";

export type TipoDeDocumento = {
  /** Gravado em `document_templates.document_type`. */
  chave: string;
  rotulo: string;
  categoria: CategoriaDeDocumento;
  /** O que este tipo é, em uma frase — aparece na Administração e no editor. */
  descricao: string;
  /**
   * Escopos de variável que resolvem neste tipo.
   *
   * Uma FVS não tem orçamento; uma mensagem de boas-vindas não tem obra.
   * Oferecer variável que nunca resolve é convidar a lacuna a aparecer na
   * frente de quem recebe.
   */
  escopos: readonly ("cliente" | "obra" | "orcamento" | "proposta" | "empresa" | "sistema")[];
};

export const ROTULO_CATEGORIA: Record<CategoriaDeDocumento, string> = {
  COMERCIAL: "Comercial",
  JURIDICO: "Jurídico",
  CRM: "CRM e relacionamento",
  MENSAGENS: "Mensagens e avisos",
  QUALIDADE: "Qualidade",
  TERMOS: "Termos",
  OPERACIONAL: "Operacional"
};

const TODOS = ["cliente", "obra", "orcamento", "proposta", "empresa", "sistema"] as const;
const SEM_OBRA = ["cliente", "empresa", "sistema"] as const;
const SEM_DINHEIRO = ["cliente", "obra", "empresa", "sistema"] as const;
const SO_OBRA = ["obra", "empresa", "sistema"] as const;

export const TIPOS: readonly TipoDeDocumento[] = [
  // Comercial
  { chave: "PROPOSTA", rotulo: "Proposta comercial", categoria: "COMERCIAL", descricao: "Proposta técnica e comercial enviada ao cliente.", escopos: TODOS },
  { chave: "ORCAMENTO", rotulo: "Orçamento", categoria: "COMERCIAL", descricao: "Planilha ou carta de orçamento.", escopos: TODOS },
  { chave: "CARTA_APRESENTACAO", rotulo: "Carta de apresentação", categoria: "COMERCIAL", descricao: "Apresentação da empresa e do portfólio.", escopos: SEM_DINHEIRO },

  // Jurídico
  { chave: "CONTRATO", rotulo: "Contrato", categoria: "JURIDICO", descricao: "Instrumento contratual de prestação de serviço ou obra.", escopos: TODOS },
  { chave: "ADITIVO", rotulo: "Aditivo contratual", categoria: "JURIDICO", descricao: "Alteração de valor, prazo ou escopo do contrato.", escopos: TODOS },
  { chave: "DISTRATO", rotulo: "Distrato", categoria: "JURIDICO", descricao: "Encerramento consensual do contrato.", escopos: SEM_DINHEIRO },
  { chave: "PROCURACAO", rotulo: "Procuração", categoria: "JURIDICO", descricao: "Outorga de poderes para representação.", escopos: SEM_DINHEIRO },

  // CRM e relacionamento
  { chave: "CRM_QUALIFICACAO", rotulo: "Qualificação de lead", categoria: "CRM", descricao: "Roteiro de perguntas para qualificar quem chegou.", escopos: SEM_OBRA },
  { chave: "CRM_GATILHO", rotulo: "Gatilho de retomada", categoria: "CRM", descricao: "Mensagem para reativar quem parou de responder.", escopos: SEM_DINHEIRO },
  { chave: "CRM_BOAS_VINDAS", rotulo: "Boas-vindas", categoria: "CRM", descricao: "Primeira mensagem depois do cadastro do lead.", escopos: SEM_OBRA },
  { chave: "CRM_CONFIRMACAO_REUNIAO", rotulo: "Confirmação de reunião", categoria: "CRM", descricao: "Confirmação de data, hora e participantes.", escopos: SEM_DINHEIRO },
  { chave: "CRM_LGPD", rotulo: "Consentimento LGPD", categoria: "CRM", descricao: "Pedido de consentimento para tratamento de dados pessoais.", escopos: SEM_OBRA },
  { chave: "CRM_AGRADECIMENTO", rotulo: "Agradecimento", categoria: "CRM", descricao: "Agradecimento por visita, reunião ou indicação.", escopos: SEM_DINHEIRO },
  { chave: "CONTATO", rotulo: "Roteiro de contato", categoria: "CRM", descricao: "Roteiro de ligação ou visita.", escopos: SEM_DINHEIRO },

  // Mensagens e avisos
  { chave: "MENSAGEM_ETAPA", rotulo: "Mensagem por etapa do funil", categoria: "MENSAGENS", descricao: "Disparada quando o cartão muda de etapa.", escopos: TODOS },
  { chave: "LEMBRETE", rotulo: "Lembrete", categoria: "MENSAGENS", descricao: "Aviso de prazo, pendência ou vencimento.", escopos: SEM_DINHEIRO },
  { chave: "AGENDAMENTO", rotulo: "Agendamento", categoria: "MENSAGENS", descricao: "Marcação de visita, medição ou montagem.", escopos: SEM_DINHEIRO },
  { chave: "EMAIL", rotulo: "E-mail", categoria: "MENSAGENS", descricao: "Layout de e-mail transacional.", escopos: TODOS },
  { chave: "EMAIL_MARKETING", rotulo: "E-mail marketing", categoria: "MENSAGENS", descricao: "Campanha para base de contatos.", escopos: SEM_OBRA },
  { chave: "COBRANCA", rotulo: "Cobrança", categoria: "MENSAGENS", descricao: "Aviso de parcela ou medição em aberto.", escopos: TODOS },

  // Qualidade
  { chave: "FVS", rotulo: "FVS — verificação de serviço", categoria: "QUALIDADE", descricao: "Ficha de verificação de serviço executado.", escopos: SO_OBRA },
  { chave: "FVM", rotulo: "FVM — verificação de material", categoria: "QUALIDADE", descricao: "Ficha de verificação de material recebido.", escopos: SO_OBRA },
  { chave: "PROCEDIMENTO", rotulo: "Procedimento operacional", categoria: "QUALIDADE", descricao: "PO com fluxo, responsáveis e prazos.", escopos: SO_OBRA },
  { chave: "LAUDO", rotulo: "Laudo técnico", categoria: "QUALIDADE", descricao: "Parecer técnico com evidências.", escopos: SEM_DINHEIRO },
  { chave: "NAO_CONFORMIDADE", rotulo: "Não conformidade", categoria: "QUALIDADE", descricao: "Registro de desvio, causa e ação.", escopos: SEM_DINHEIRO },

  // Termos
  { chave: "TERMO_ABERTURA", rotulo: "Termo de abertura", categoria: "TERMOS", descricao: "Abertura de obra, projeto ou frente de serviço.", escopos: SEM_DINHEIRO },
  { chave: "TERMO_CIENCIA", rotulo: "Termo de ciência", categoria: "TERMOS", descricao: "Registro de que a parte foi informada.", escopos: SEM_DINHEIRO },
  { chave: "TERMO_CONSCIENTIZACAO", rotulo: "Termo de conscientização", categoria: "TERMOS", descricao: "Conscientização de segurança, qualidade ou meio ambiente.", escopos: SEM_DINHEIRO },
  { chave: "TERMO_TREINAMENTO", rotulo: "Termo de treinamento", categoria: "TERMOS", descricao: "Comprovação de treinamento com lista de presença.", escopos: SEM_DINHEIRO },
  { chave: "TERMO_ENCERRAMENTO", rotulo: "Termo de encerramento", categoria: "TERMOS", descricao: "Encerramento de etapa, obra ou contrato.", escopos: SEM_DINHEIRO },
  { chave: "TERMO_ENTREGA", rotulo: "Termo de entrega", categoria: "TERMOS", descricao: "Entrega de obra, chave, equipamento ou documento.", escopos: SEM_DINHEIRO },

  // Operacional
  { chave: "ORDEM_SERVICO", rotulo: "Ordem de serviço", categoria: "OPERACIONAL", descricao: "Autorização de execução com escopo e prazo.", escopos: SEM_DINHEIRO },
  { chave: "RELATORIO_VISITA", rotulo: "Relatório de visita", categoria: "OPERACIONAL", descricao: "Registro do que foi observado em campo.", escopos: SEM_DINHEIRO },
  { chave: "ATA_REUNIAO", rotulo: "Ata de reunião", categoria: "OPERACIONAL", descricao: "Decisões, responsáveis e prazos combinados.", escopos: SEM_DINHEIRO },
  { chave: "DECLARACAO", rotulo: "Declaração", categoria: "OPERACIONAL", descricao: "Declaração avulsa assinada pela empresa.", escopos: SEM_DINHEIRO }
];

const POR_CHAVE = new Map(TIPOS.map(t => [t.chave, t]));

export function tipo(chave: string): TipoDeDocumento | null {
  return POR_CHAVE.get(chave) ?? null;
}

export function rotuloDoTipo(chave: string): string {
  return POR_CHAVE.get(chave)?.rotulo ?? chave;
}

export function categoriaDoTipo(chave: string): CategoriaDeDocumento | null {
  return POR_CHAVE.get(chave)?.categoria ?? null;
}

/** Tipos de uma categoria, na ordem do catálogo. */
export function tiposDaCategoria(categoria: CategoriaDeDocumento): TipoDeDocumento[] {
  return TIPOS.filter(t => t.categoria === categoria);
}

/** Categorias na ordem em que aparecem no catálogo, sem repetir. */
export function categorias(): CategoriaDeDocumento[] {
  return [...new Set(TIPOS.map(t => t.categoria))];
}

/**
 * Sugestão inicial de quais tipos cada aplicativo oferece.
 *
 * É **sugestão**, não regra: quem decide é a Administração de cada empresa, com
 * os checks. Isto existe só para a organização nova não começar com todos os
 * aplicativos vazios — e é semeado uma vez, não reaplicado.
 *
 * Repare que o mesmo tipo aparece em vários aplicativos de propósito: a
 * proposta é oferecida em Propostas, em CRM e em Obras, porque é de lá que ela
 * costuma ser enviada. Era exatamente isso que o desenho anterior impedia.
 */
export const SUGESTAO_POR_APLICATIVO: Record<string, readonly string[]> = {
  crm: ["CRM_QUALIFICACAO", "CRM_GATILHO", "CRM_BOAS_VINDAS", "CRM_CONFIRMACAO_REUNIAO", "CRM_LGPD", "CRM_AGRADECIMENTO", "CONTATO", "MENSAGEM_ETAPA", "EMAIL", "EMAIL_MARKETING", "PROPOSTA", "CARTA_APRESENTACAO"],
  clientes: ["CARTA_APRESENTACAO", "CRM_LGPD", "EMAIL", "CONTATO", "TERMO_CIENCIA"],
  obras: ["ORDEM_SERVICO", "RELATORIO_VISITA", "ATA_REUNIAO", "TERMO_ABERTURA", "TERMO_ENCERRAMENTO", "TERMO_ENTREGA", "PROPOSTA", "CONTRATO", "AGENDAMENTO", "LEMBRETE"],
  planejamento: ["ATA_REUNIAO", "RELATORIO_VISITA", "LEMBRETE", "AGENDAMENTO", "TERMO_ABERTURA"],
  tarefas: ["LEMBRETE", "AGENDAMENTO", "ORDEM_SERVICO"],
  diario: ["RELATORIO_VISITA", "NAO_CONFORMIDADE", "TERMO_CIENCIA"],
  equipes: ["TERMO_TREINAMENTO", "TERMO_CONSCIENTIZACAO", "LEMBRETE"],
  orcamentos: ["ORCAMENTO", "PROPOSTA", "EMAIL"],
  propostas: ["PROPOSTA", "ORCAMENTO", "CARTA_APRESENTACAO", "EMAIL"],
  contratos: ["CONTRATO", "ADITIVO", "DISTRATO", "PROCURACAO", "TERMO_ENCERRAMENTO"],
  aditivos: ["ADITIVO", "CONTRATO"],
  assinaturas: ["CONTRATO", "ADITIVO", "PROCURACAO", "TERMO_CIENCIA", "TERMO_ENTREGA"],
  documentos: ["DECLARACAO", "PROCURACAO", "ATA_REUNIAO"],
  qualidade: ["FVS", "FVM", "PROCEDIMENTO", "LAUDO", "NAO_CONFORMIDADE", "TERMO_CONSCIENTIZACAO", "TERMO_TREINAMENTO"],
  compras: ["ORDEM_SERVICO", "EMAIL", "COBRANCA"],
  estoque: ["FVM", "TERMO_ENTREGA"],
  financeiro: ["COBRANCA", "EMAIL", "LEMBRETE"],
  sac: ["CRM_AGRADECIMENTO", "EMAIL", "ATA_REUNIAO", "NAO_CONFORMIDADE", "CONTRATO", "TERMO_ENTREGA"],
  modelos: TIPOS.map(t => t.chave)
};
