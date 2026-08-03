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
  crm: [
    // O funil é a primeira entrada porque é a tela inicial do módulo — o mesmo
    // endereço do aplicativo. A referência abre o CRM no kanban do funil.
    { rotulo: "Funil", href: "/app/crm" },
    { rotulo: "Leads", href: "/app/crm/leads" },
    { rotulo: "Oportunidades", href: "/app/crm/oportunidades" },
    { rotulo: "Visão geral", href: "/app/crm/visao-geral" }
  ],
  clientes: [
    { rotulo: "Clientes", href: "/app/clientes" },
    { rotulo: "Novo cliente", href: "/app/clientes/novo" }
  ],
  obras: [
    { rotulo: "Projetos", href: "/app/obras" },
    { rotulo: "Nova obra", href: "/app/obras/novo" },
    { rotulo: "Pipeline", href: "/app/pipeline/projeto" },
    { rotulo: "Planejamento", href: "/app/planejamento" },
    { rotulo: "Relatórios", href: "/app/relatorios/obras" }
  ],
  planejamento: [
    { rotulo: "Portfólio", href: "/app/planejamento" },
    { rotulo: "Novo projeto", href: "/app/obras/novo" },
    { rotulo: "Tarefas", href: "/app/tarefas" },
    { rotulo: "Equipes", href: "/app/equipes" },
    { rotulo: "Diário", href: "/app/diario" },
    { rotulo: "Relatórios", href: "/app/relatorios/obras" }
  ],
  tarefas: [
    { rotulo: "Tarefas", href: "/app/tarefas" },
    { rotulo: "Planejamento", href: "/app/planejamento" },
    { rotulo: "Equipes", href: "/app/equipes" },
    { rotulo: "Diário", href: "/app/diario" },
    { rotulo: "Relatórios", href: "/app/relatorios/obras" }
  ],
  diario: [
    { rotulo: "Diários", href: "/app/diario" },
    { rotulo: "Obras", href: "/app/obras" },
    { rotulo: "Tarefas", href: "/app/tarefas" },
    { rotulo: "Qualidade", href: "/app/qualidade" },
    { rotulo: "Relatórios", href: "/app/relatorios/obras" }
  ],
  equipes: [
    { rotulo: "Equipes", href: "/app/equipes" },
    { rotulo: "Planejamento", href: "/app/planejamento" },
    { rotulo: "Tarefas", href: "/app/tarefas" },
    { rotulo: "Obras", href: "/app/obras" },
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
    { rotulo: "Perdas", href: "/app/relatorios/perdas" },
    { rotulo: "Metas", href: "/app/relatorios/metas" },
    { rotulo: "Salvos", href: "/app/relatorios/salvos" }
  ],
  administracao: [
    { rotulo: "Usuários", href: "/app/administracao/usuarios" },
    { rotulo: "Perfis", href: "/app/administracao/perfis" },
    { rotulo: "Aplicativos", href: "/app/administracao/aplicativos" },
    { rotulo: "Vocabulário", href: "/app/administracao/vocabulario" },
    { rotulo: "Motivos de perda", href: "/app/administracao/motivos-de-perda" }
  ],
  orcamentos: [
    { rotulo: "Carteira", href: "/app/orcamentos" },
    { rotulo: "Novo orçamento", href: "/app/orcamentos/novo" },
    { rotulo: "SINAPI", href: "/app/orcamentos/sinapi" },
    { rotulo: "Propostas", href: "/app/propostas" },
    { rotulo: "Relatórios", href: "/app/relatorios" }
  ],
  propostas: [
    { rotulo: "Propostas", href: "/app/propostas" },
    { rotulo: "Nova proposta", href: "/app/propostas/nova" },
    { rotulo: "Orçamentos", href: "/app/orcamentos" },
    { rotulo: "Contratos", href: "/app/contratos" },
    { rotulo: "Relatórios", href: "/app/relatorios" }
  ],
  contratos: [
    { rotulo: "Contratos", href: "/app/contratos" },
    { rotulo: "Novo contrato", href: "/app/contratos/novo" },
    { rotulo: "Aditivos", href: "/app/aditivos" },
    { rotulo: "Assinaturas", href: "/app/assinaturas" },
    { rotulo: "Documentos", href: "/app/documentos" }
  ],
  aditivos: [
    { rotulo: "Aditivos", href: "/app/aditivos" },
    { rotulo: "Novo aditivo", href: "/app/aditivos/novo" },
    { rotulo: "Contratos", href: "/app/contratos" },
    { rotulo: "Assinaturas", href: "/app/assinaturas" },
    { rotulo: "Documentos", href: "/app/documentos" }
  ],
  documentos: [
    { rotulo: "Documentos", href: "/app/documentos" },
    { rotulo: "Enviar arquivo", href: "/app/documentos/novo" },
    { rotulo: "Assinaturas", href: "/app/assinaturas" },
    { rotulo: "Qualidade", href: "/app/qualidade/documentos" },
    { rotulo: "Relatórios", href: "/app/relatorios" }
  ],
  modelos: [
    { rotulo: "Biblioteca", href: "/app/modelos" },
    { rotulo: "Emitir documento", href: "/app/modelos/emitir" },
    { rotulo: "Disponibilização", href: "/app/administracao/modelos" }
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

export function menusDe(moduloChave: string): ItemDeMenu[] {
  return MENUS_DO_MODULO[moduloChave] ?? [];
}
