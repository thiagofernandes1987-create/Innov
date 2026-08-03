// A função do documento e o módulo que é dono dele.
//
// A migration de `document_templates` guarda `module_key` e `purpose` na linha,
// e o comentário dela diz por quê: **o módulo é a chave de permissão**, não um
// filtro de tela. A RLS reaproveita `has_module_permission`, que já é o
// mecanismo de toda a plataforma.
//
// Este arquivo é a outra metade dessa decisão: onde cada função mora. O
// critério é **o módulo que emite o documento**, não um depósito comum de
// modelos. Quem trabalha em qualidade vê FVS e FVM; quem trabalha em contratos
// vê contrato. Um depósito comum obrigaria uma segunda régua de acesso só para
// modelos — duas réguas que divergem no primeiro ajuste.

export type FuncaoDeDocumento = {
  /** Valor gravado em `document_templates.purpose`. */
  funcao: string;
  rotulo: string;
  /** Valor gravado em `document_templates.module_key`. Decide quem enxerga. */
  moduleKey: string;
};

export const FUNCOES: readonly FuncaoDeDocumento[] = [
  { funcao: "PROPOSTA", rotulo: "Proposta comercial", moduleKey: "propostas" },
  { funcao: "ORCAMENTO_ENVIO", rotulo: "Envio de orçamento", moduleKey: "orcamentos" },
  { funcao: "CONTRATO", rotulo: "Contrato", moduleKey: "contratos" },
  { funcao: "ADITIVO", rotulo: "Aditivo contratual", moduleKey: "aditivos" },
  { funcao: "FVS", rotulo: "FVS — ficha de verificação de serviço", moduleKey: "qualidade" },
  { funcao: "FVM", rotulo: "FVM — ficha de verificação de material", moduleKey: "qualidade" },
  { funcao: "LAUDO", rotulo: "Laudo técnico", moduleKey: "qualidade" },
  { funcao: "MENSAGEM", rotulo: "Mensagem padrão", moduleKey: "sac" },
  { funcao: "EMAIL", rotulo: "Layout de e-mail", moduleKey: "crm" }
];

const POR_FUNCAO = new Map(FUNCOES.map(f => [f.funcao, f]));

export function moduloDaFuncao(funcao: string): string | null {
  return POR_FUNCAO.get(funcao)?.moduleKey ?? null;
}

export function rotuloDaFuncao(funcao: string): string {
  return POR_FUNCAO.get(funcao)?.rotulo ?? funcao;
}

export function funcoesDoModulo(moduleKey: string): FuncaoDeDocumento[] {
  return FUNCOES.filter(f => f.moduleKey === moduleKey);
}
