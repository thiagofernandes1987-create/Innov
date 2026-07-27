// Menus do módulo na barra superior.
//
// É o segundo elemento do padrão que o responsável apontou nas capturas: no
// Odoo, no Bitrix, no Pipedrive e no Sophia a barra do topo mostra o ícone do
// aplicativo, o nome dele e os menus **daquele** aplicativo — `Project ·
// Projects · Tasks · Reporting · Configuration`. Sem menu lateral, é por aqui
// que se anda dentro do módulo; sem isto, a barra dizia só "Aplicativos" e a
// pergunta na captura era exatamente essa: "cadê as configurações e os campos
// de relatórios referentes ao CRM?".
//
// A lista é declarada, não descoberta: rota que existe no repositório entra,
// rota que não existe não entra. Menu que leva a 404 é pior que menu ausente.
// Cada entrada é conferida por `pnpm validate:menus`, que reprova destino sem
// página correspondente.

export type ItemDeMenu = { rotulo: string; href: string };

export const MENUS_DO_MODULO: Record<string, ItemDeMenu[]> = {
  // Pipeline não é aplicativo: é a visão de funil **de cada** aplicativo.
  //
  // A primeira versão criou um módulo "Pipeline" com as três trilhas dentro, e
  // o responsável riscou isso na captura: CRM é venda, o funil de projeto
  // pertence a Projetos e o de assistência pertence a Chamados. Um aplicativo
  // "Pipeline" obrigaria o vendedor a atravessar o funil de obra para chegar no
  // dele, e é o oposto do que o padrão de mercado faz.
  crm: [
    { rotulo: "Pipeline", href: "/app/pipeline/cliente" },
    { rotulo: "Leads", href: "/app/crm/leads" },
    { rotulo: "Oportunidades", href: "/app/crm/oportunidades" }
  ],
  clientes: [
    { rotulo: "Clientes", href: "/app/clientes" },
    { rotulo: "Novo cliente", href: "/app/clientes/novo" }
  ],
  obras: [
    { rotulo: "Projetos", href: "/app/obras" },
    { rotulo: "Pipeline", href: "/app/pipeline/projeto" },
    { rotulo: "Planejamento", href: "/app/planejamento" },
    { rotulo: "Relatórios", href: "/app/relatorios/obras" }
  ],
  compras: [
    { rotulo: "Solicitações", href: "/app/compras/solicitacoes" },
    { rotulo: "Pedidos", href: "/app/compras/pedidos" },
    { rotulo: "Fornecedores", href: "/app/compras/fornecedores" },
    { rotulo: "Relatórios", href: "/app/relatorios/compras" }
  ],
  estoque: [
    { rotulo: "Itens", href: "/app/estoque/itens" },
    { rotulo: "Movimentos", href: "/app/estoque/movimentos" },
    { rotulo: "Depósitos", href: "/app/estoque/depositos" },
    { rotulo: "Inventários", href: "/app/estoque/inventarios" },
    { rotulo: "Reservas", href: "/app/estoque/reservas" },
    { rotulo: "Ativos", href: "/app/estoque/ativos" }
  ],
  financeiro: [
    { rotulo: "Lançamentos", href: "/app/financeiro/lancamentos" },
    { rotulo: "Fluxo de caixa", href: "/app/financeiro/fluxo-de-caixa" },
    { rotulo: "Medições", href: "/app/financeiro/medicoes" },
    { rotulo: "Configuração", href: "/app/financeiro/configuracoes" }
  ],
  qualidade: [
    { rotulo: "Formulários", href: "/app/qualidade/formularios" },
    // `respostas` e `assinaturas/documentos` só existem por id: são telas de
    // detalhe sem índice. Menu para elas abriria 404 — o validador recusou os
    // dois destinos na primeira execução, que é o motivo de ele existir.
    { rotulo: "Preenchimentos", href: "/app/qualidade/preenchimentos" },
    { rotulo: "Documentos", href: "/app/qualidade/documentos" }
  ],
  assinaturas: [
    { rotulo: "Documentos", href: "/app/assinaturas" },
    { rotulo: "Novo envio", href: "/app/assinaturas/novo" }
  ],
  auditoria: [
    { rotulo: "Eventos", href: "/app/auditoria/eventos" },
    { rotulo: "Alertas", href: "/app/auditoria/alertas" },
    { rotulo: "Saúde", href: "/app/auditoria/saude" },
    { rotulo: "Configuração", href: "/app/auditoria/configuracao" }
  ],
  relatorios: [
    { rotulo: "Obras", href: "/app/relatorios/obras" },
    { rotulo: "Compras", href: "/app/relatorios/compras" },
    { rotulo: "Financeiro", href: "/app/relatorios/financeiro" },
    { rotulo: "Qualidade", href: "/app/relatorios/qualidade" },
    { rotulo: "Metas", href: "/app/relatorios/metas" },
    { rotulo: "Salvos", href: "/app/relatorios/salvos" }
  ],
  administracao: [
    { rotulo: "Usuários", href: "/app/administracao/usuarios" },
    { rotulo: "Perfis", href: "/app/administracao/perfis" },
    { rotulo: "Aplicativos", href: "/app/administracao/aplicativos" }
  ],
  orcamentos: [
    { rotulo: "Orçamentos", href: "/app/orcamentos" },
    { rotulo: "Novo orçamento", href: "/app/orcamentos/novo" }
  ],
  ocorrencias: [
    { rotulo: "Ocorrências", href: "/app/ocorrencias" },
    { rotulo: "Nova ocorrência", href: "/app/ocorrencias/novo" }
  ],
  sac: [
    { rotulo: "Chamados", href: "/app/ocorrencias" },
    { rotulo: "Pipeline", href: "/app/pipeline/assistencia" },
    { rotulo: "Novo chamado", href: "/app/ocorrencias/novo" }
  ]
};

/**
 * Módulo sem menu declarado não ganha menu falso.
 *
 * Aditivos, contratos, diário, documentos, equipes, planejamento, propostas e
 * tarefas hoje são tela única: inventar "Configuração" para preencher a barra
 * criaria um destino que não existe. A barra fica só com ícone e nome, que é o
 * que o padrão faz nesses casos.
 */
export function menusDe(moduloChave: string): ItemDeMenu[] {
  return MENUS_DO_MODULO[moduloChave] ?? [];
}
