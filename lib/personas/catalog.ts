export type PersonaId =
  | "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7" | "P8"
  | "P9" | "P10" | "P11" | "P12" | "P13" | "P14" | "P15" | "P16";

export type CompetenciaOperacional = {
  name: string;
  techniques: readonly string[];
  requiredData: readonly string[];
};

export type PersonaOperacional = {
  id: PersonaId;
  role: string;
  profession: string;
  mission: string;
  modules: readonly string[];
  competencies: readonly CompetenciaOperacional[];
  scenarios: {
    optimistic: string;
    normal: string;
    pessimistic: {
      description: string;
      event: string;
      notify: readonly PersonaId[];
      systemResponse: string;
    };
  };
};

// Catálogo executável da matriz canônica em PERSONAS-E-ROTINAS.md.
//
// Não descreve "quem clica onde". Declara o profissional, a competência que
// ele exerce no mundo real, a técnica e o dado que a plataforma precisa
// fornecer. Os testes cruzam este catálogo com todos os módulos instaláveis.
export const PERSONAS_OPERACIONAIS = [
  {
    id: "P1",
    role: "Vendedor / SDR",
    profession: "Executivo comercial de obras e móveis planejados",
    mission: "Qualificar demanda, manter próximo passo e transformar oportunidade em contrato defendível.",
    modules: ["dashboard", "crm", "clientes", "propostas", "tarefas", "documentos", "modelos", "relatorios"],
    competencies: [
      { name: "Qualificação", techniques: ["BANT", "SPIN", "critérios de aderência"], requiredData: ["origem", "necessidade", "orçamento", "autoridade", "prazo"] },
      { name: "Gestão de funil", techniques: ["probabilidade por etapa", "aging", "forecast"], requiredData: ["etapa", "valor", "probabilidade", "dias na etapa", "previsão de fechamento"] },
      { name: "Cadência", techniques: ["próxima atividade", "follow-up", "SLA de resposta"], requiredData: ["último contato", "próximo contato", "canal", "responsável"] },
      { name: "Proposta de valor", techniques: ["escopo comparável", "objeções", "versionamento"], requiredData: ["necessidades", "versão da proposta", "itens incluídos", "exclusões"] }
    ],
    scenarios: {
      optimistic: "Lead qualificado responde no prazo, proposta é aprovada sem ressalvas e segue para contratação.",
      normal: "O vendedor alterna contatos, atualiza objeções, agenda o próximo passo e revisa a previsão do mês.",
      pessimistic: {
        description: "Proposta fica sem resposta, prazo comercial vence e o cliente pede desconto fora da alçada.",
        event: "commercial.proposal_stalled",
        notify: ["P11", "P13", "P14"],
        systemResponse: "Sinaliza aging, preserva a versão enviada, abre atividade e solicita decisão nominal de margem e condição."
      }
    }
  },
  {
    id: "P2",
    role: "Planejador",
    profession: "Planejador de obras e controle de projetos",
    mission: "Construir e manter um modelo de prazo tecnicamente calculável e ligado a custo, recurso e progresso.",
    modules: ["dashboard", "obras", "planejamento", "tarefas", "relatorios", "orcamentos"],
    competencies: [
      { name: "Estruturação do escopo", techniques: ["EAP/WBS", "pacote de trabalho", "dicionário da EAP"], requiredData: ["código EAP", "entrega", "responsável", "critério de aceite"] },
      { name: "Rede de precedências", techniques: ["CPM", "II/IT/TT/TI", "lag e lead", "DSM"], requiredData: ["predecessora", "tipo de vínculo", "defasagem", "duração", "calendário"] },
      { name: "Incerteza e compromisso", techniques: ["PERT três pontos", "corrente crítica", "buffer"], requiredData: ["otimista", "provável", "pessimista", "pulmão", "consumo do pulmão"] },
      { name: "Controle integrado", techniques: ["linha de base", "curva S", "físico x financeiro", "EVM"], requiredData: ["baseline", "progresso físico", "custo planejado", "custo real", "data de status"] },
      { name: "Recuperação de prazo", techniques: ["folga total e livre", "crashing", "nivelamento"], requiredData: ["caminho crítico", "custo normal", "custo acelerado", "recursos", "capacidade"] }
    ],
    scenarios: {
      optimistic: "Frentes liberadas cumprem durações prováveis, buffers não são consumidos e a linha de base permanece estável.",
      normal: "O planejador recebe apontamentos, recalcula rede, compara baseline e atualiza a previsão com restrições conhecidas.",
      pessimistic: {
        description: "Uma atividade crítica atrasa, consome o pulmão e conflita com equipe e material já comprometidos.",
        event: "planning.critical_path_at_risk",
        notify: ["P8", "P9", "P10", "P13"],
        systemResponse: "Recalcula impacto, mostra custo marginal de alternativas e abre solicitações com prazo aos donos das restrições."
      }
    }
  },
  {
    id: "P3",
    role: "Montador / campo",
    profession: "Montador de móveis e profissional de execução em campo",
    mission: "Executar com segurança, registrar avanço e pedir remoção de impedimentos sem abandonar a frente.",
    modules: ["dashboard", "tarefas", "diario", "equipes", "documentos", "qualidade", "estoque"],
    competencies: [
      { name: "Leitura executiva", techniques: ["revisão vigente", "detalhe construtivo", "tolerância"], requiredData: ["desenho aprovado", "revisão", "cotas", "materiais"] },
      { name: "Execução e produtividade", techniques: ["sequência de montagem", "check-in/out", "apontamento"], requiredData: ["tarefa", "local", "duração prevista", "avanço", "horas"] },
      { name: "Controle de qualidade", techniques: ["autocontrole", "checklist", "evidência fotográfica"], requiredData: ["critério", "foto", "resultado", "não conformidade"] },
      { name: "Gestão de impedimento", techniques: ["parada", "andon", "solicitação nominal"], requiredData: ["motivo", "início", "obrigação", "destinatário", "prazo"] }
    ],
    scenarios: {
      optimistic: "Ambiente liberado, material completo e desenho vigente permitem concluir e aprovar a tarefa na primeira passagem.",
      normal: "A equipe executa, registra fotos e progresso, confere itens e encerra o dia com pendências identificadas.",
      pessimistic: {
        description: "Falta ferragem ou a medida não confere e a equipe precisa parar antes de fabricar retrabalho.",
        event: "field.blocked",
        notify: ["P8", "P9", "P10", "P7", "P2"],
        systemResponse: "Abre parada em dois toques, preserva evidência, identifica obrigação e escalona a solicitação pelo SLA correto."
      }
    }
  },
  {
    id: "P4",
    role: "Financeiro",
    profession: "Analista financeiro de projetos e obras",
    mission: "Garantir liquidez, competência, conciliação e vínculo entre obrigação financeira e fato operacional.",
    modules: ["dashboard", "financeiro", "orcamentos", "contratos", "aditivos", "compras", "estoque", "relatorios"],
    competencies: [
      { name: "Contas a pagar e receber", techniques: ["competência x caixa", "aging", "baixa"], requiredData: ["vencimento", "competência", "liquidação", "contraparte", "centro de custo"] },
      { name: "Fluxo de caixa", techniques: ["projeção", "cenário", "necessidade de capital"], requiredData: ["saldo", "entradas previstas", "saídas previstas", "probabilidade"] },
      { name: "Medição", techniques: ["físico x financeiro", "retenção", "glosa"], requiredData: ["quantidade medida", "preço contratual", "evidência", "aprovação"] },
      { name: "Conciliação", techniques: ["three-way match", "extrato x razão", "anexo fiscal"], requiredData: ["pedido", "recebimento", "documento fiscal", "valor pago"] }
    ],
    scenarios: {
      optimistic: "Medições aprovadas e recebimentos pontuais cobrem as obrigações sem necessidade de remanejamento.",
      normal: "O analista concilia pedidos, recebimentos e títulos, atualiza o caixa e cobra aprovações pendentes.",
      pessimistic: {
        description: "Medição é glosada ou cliente atrasa e o caixa não cobre fornecedor e folha na mesma semana.",
        event: "finance.cash_gap",
        notify: ["P8", "P9", "P13", "P14"],
        systemResponse: "Projeta o déficit por data, bloqueia compromisso sem alçada e oferece cenários auditáveis de priorização."
      }
    }
  },
  {
    id: "P5",
    role: "Assistência técnica",
    profession: "Analista de pós-venda e assistência técnica",
    mission: "Diagnosticar ocorrência, restaurar serviço no SLA e transformar reincidência em melhoria de origem.",
    modules: ["dashboard", "sac", "clientes", "tarefas", "documentos", "qualidade", "relatorios"],
    competencies: [
      { name: "Triagem", techniques: ["severidade", "impacto x urgência", "SLA"], requiredData: ["categoria", "prioridade", "cliente", "obra", "prazo"] },
      { name: "Diagnóstico", techniques: ["5 porquês", "árvore de falhas", "reprodução"], requiredData: ["sintoma", "evidência", "revisão", "histórico", "causa provável"] },
      { name: "Gestão de atendimento", techniques: ["fila", "aging", "escalonamento"], requiredData: ["estado", "responsável", "dependência", "última resposta"] },
      { name: "Fechamento", techniques: ["confirmação do cliente", "causa raiz", "recorrência"], requiredData: ["solução", "aceite", "causa", "custo", "reincidência"] }
    ],
    scenarios: {
      optimistic: "Chamado chega com fotos e revisão, a causa é conhecida e a correção é concluída na primeira visita.",
      normal: "A assistência tria, pede evidência, agenda técnico, informa previsão e confirma o aceite do cliente.",
      pessimistic: {
        description: "Ocorrência crítica reincide, o SLA vence e depende de peça sem disponibilidade imediata.",
        event: "service.sla_breached",
        notify: ["P8", "P9", "P10", "P12", "P13", "P15"],
        systemResponse: "Escalona por severidade, vincula a causa à origem e mantém cliente e responsáveis em recortes adequados."
      }
    }
  },
  {
    id: "P6",
    role: "Administrador",
    profession: "Administrador de sistemas e identidades",
    mission: "Manter acesso mínimo, segregação de função e continuidade operacional sem virar superusuário invisível.",
    modules: ["dashboard", "administracao", "auditoria", "modelos", "relatorios"],
    competencies: [
      { name: "Identidade e acesso", techniques: ["RBAC", "menor privilégio", "ciclo de vida"], requiredData: ["usuário", "papel", "organização", "vigência"] },
      { name: "Segregação de função", techniques: ["SoD", "matriz de conflito", "dupla aprovação"], requiredData: ["capacidade", "conflito", "alçada", "aprovador"] },
      { name: "Administração de aplicação", techniques: ["catálogo", "dependência", "feature enablement"], requiredData: ["módulo", "versão", "dependências", "estado"] },
      { name: "Resposta operacional", techniques: ["triagem técnica", "correlation id", "rollback"], requiredData: ["evento", "ambiente", "versão", "correlação"] }
    ],
    scenarios: {
      optimistic: "Admissão e desligamento seguem perfis aprovados, sem exceções nem acessos órfãos.",
      normal: "O administrador revisa solicitações, aplica papéis, monitora saúde e registra mudanças sensíveis.",
      pessimistic: {
        description: "Usuário recebe capacidade incompatível ou uma dependência indisponível impede acesso ao trabalho.",
        event: "security.access_conflict",
        notify: ["P16", "P13"],
        systemResponse: "Recusa conflito, registra evidência imutável, revoga a exceção e abre análise com dono e prazo."
      }
    }
  },
  {
    id: "P7",
    role: "Projetista",
    profession: "Projetista de móveis e detalhamento executivo",
    mission: "Entregar documentação fabricável, montável e compatibilizada com a condição real do local.",
    modules: ["dashboard", "documentos", "modelos", "obras", "tarefas", "qualidade", "relatorios"],
    competencies: [
      { name: "Modelagem e detalhamento", techniques: ["CAD/CAM", "cotas funcionais", "lista de peças"], requiredData: ["geometria", "material", "ferragem", "tolerância"] },
      { name: "Compatibilização", techniques: ["clash check", "interface disciplina", "DSM"], requiredData: ["arquitetura", "elétrica", "hidráulica", "dependências"] },
      { name: "Controle de revisão", techniques: ["revisão", "aprovação", "obsolescência"], requiredData: ["versão", "autor", "aprovador", "vigência"] },
      { name: "Projetar para fabricar e montar", techniques: ["DFMA", "sequência de montagem", "poka-yoke"], requiredData: ["processo fabril", "acesso", "ordem", "restrições de campo"] }
    ],
    scenarios: {
      optimistic: "Medição estável e interfaces validadas permitem liberar fabricação sem revisão tardia.",
      normal: "O projetista detalha, compatibiliza, submete revisão e responde dúvidas antes da fabricação.",
      pessimistic: {
        description: "A medida muda após liberação ou a montagem encontra revisão obsoleta no telefone.",
        event: "design.revision_invalid",
        notify: ["P2", "P3", "P8", "P12", "P14"],
        systemResponse: "Bloqueia uso da revisão obsoleta, identifica itens afetados e exige nova aprovação antes de fabricar ou montar."
      }
    }
  },
  {
    id: "P8",
    role: "Gerente de obras",
    profession: "Gerente de projetos e coordenador de obras",
    mission: "Integrar escopo, prazo, custo, qualidade, suprimento e comunicação com decisão por exceção.",
    modules: ["dashboard", "obras", "planejamento", "tarefas", "diario", "equipes", "documentos", "qualidade", "compras", "estoque", "financeiro", "sac", "relatorios", "aditivos"],
    competencies: [
      { name: "Integração do projeto", techniques: ["plano integrado", "governança", "change control"], requiredData: ["escopo", "baseline", "riscos", "decisões", "mudanças"] },
      { name: "Coordenação de frentes", techniques: ["lookahead", "restrições", "reunião de produção"], requiredData: ["tarefas liberadas", "impedimentos", "equipe", "material"] },
      { name: "Gestão de desempenho", techniques: ["EVM", "curva S", "forecast"], requiredData: ["PV", "EV", "AC", "prazo previsto", "custo final"] },
      { name: "Gestão de stakeholders", techniques: ["RACI", "plano de comunicação", "escalonamento"], requiredData: ["responsável", "informado", "prazo de resposta", "decisão"] }
    ],
    scenarios: {
      optimistic: "Frentes, caixa e suprimentos permanecem sincronizados e exceções são resolvidas antes de afetar a entrega.",
      normal: "O gerente consolida restrições, decide prioridades, aprova mudanças e comunica previsões por público.",
      pessimistic: {
        description: "Atraso crítico, falta de material e glosa financeira ocorrem juntos e exigem decisão de portfólio.",
        event: "project.multi_constraint_crisis",
        notify: ["P2", "P4", "P9", "P10", "P13"],
        systemResponse: "Agrupa os fatos em um incidente, mostra impacto integrado e distribui ações nominais sem duplicar alertas."
      }
    }
  },
  {
    id: "P9",
    role: "Comprador",
    profession: "Comprador de materiais e serviços para construção",
    mission: "Atender especificação, prazo e custo total com concorrência, alçada e rastreabilidade.",
    modules: ["dashboard", "compras", "estoque", "qualidade", "financeiro", "obras", "relatorios"],
    competencies: [
      { name: "Sourcing", techniques: ["RFI/RFQ", "mapa de fornecedores", "homologação"], requiredData: ["categoria", "fornecedor", "capacidade", "documentos"] },
      { name: "Equalização", techniques: ["mapa comparativo", "TCO", "condição equivalente"], requiredData: ["preço", "frete", "prazo", "impostos", "garantia"] },
      { name: "Negociação", techniques: ["BATNA", "alçada", "trade-off"], requiredData: ["meta", "limite", "alternativa", "condições"] },
      { name: "Expediting", techniques: ["follow-up", "OTIF", "gestão de exceção"], requiredData: ["pedido", "promessa", "confirmação", "entrega", "desvio"] }
    ],
    scenarios: {
      optimistic: "Cotação competitiva fecha dentro da alçada e o fornecedor entrega completo antes da necessidade.",
      normal: "O comprador equaliza propostas, obtém aprovação, emite pedido e acompanha marcos de entrega.",
      pessimistic: {
        description: "Fornecedor atrasa item crítico ou entrega material divergente da especificação aprovada.",
        event: "procurement.critical_supply_risk",
        notify: ["P2", "P8", "P10", "P12", "P4"],
        systemResponse: "Aciona expediting, bloqueia recebimento divergente e compara alternativas pelo custo total da parada."
      }
    }
  },
  {
    id: "P10",
    role: "Almoxarife",
    profession: "Almoxarife e estoquista de obra",
    mission: "Preservar saldo confiável, localização, rastreabilidade e disponibilidade no momento da execução.",
    modules: ["dashboard", "estoque", "compras", "tarefas", "obras", "relatorios"],
    competencies: [
      { name: "Recebimento", techniques: ["conferência cega", "pedido x nota x físico", "quarentena"], requiredData: ["pedido", "item", "quantidade", "lote", "condição"] },
      { name: "Armazenagem", techniques: ["endereçamento", "FIFO/FEFO", "5S"], requiredData: ["depósito", "localização", "lote", "validade"] },
      { name: "Movimentação", techniques: ["entrada/saída", "reserva", "rastreabilidade"], requiredData: ["origem", "destino", "tarefa", "responsável", "quantidade"] },
      { name: "Acuracidade", techniques: ["inventário cíclico", "recontagem", "análise de divergência"], requiredData: ["saldo sistema", "contagem", "diferença", "causa"] }
    ],
    scenarios: {
      optimistic: "Recebimento confere, estoque está endereçado e a separação chega à frente no horário combinado.",
      normal: "O almoxarife recebe, armazena, reserva, separa e reconcilia divergências por contagem.",
      pessimistic: {
        description: "Sistema mostra saldo, mas o item não é encontrado ou o lote recebido está danificado.",
        event: "inventory.stock_unavailable",
        notify: ["P3", "P8", "P9", "P4", "P12"],
        systemResponse: "Bloqueia consumo, abre recontagem e ocorrência de recebimento, e informa impacto na tarefa dependente."
      }
    }
  },
  {
    id: "P11",
    role: "Orçamentista",
    profession: "Orçamentista e engenheiro de custos",
    mission: "Converter escopo em custo, preço e risco comparáveis, com composição e data-base defendíveis.",
    modules: ["dashboard", "orcamentos", "propostas", "documentos", "clientes", "relatorios"],
    competencies: [
      { name: "Levantamento quantitativo", techniques: ["takeoff", "memória de cálculo", "EAP de custo"], requiredData: ["escopo", "unidade", "quantidade", "fonte"] },
      { name: "Composição de custos", techniques: ["insumo", "produtividade", "custo direto/indireto"], requiredData: ["coeficiente", "preço unitário", "perda", "encargos"] },
      { name: "Formação de preço", techniques: ["BDI", "markup", "margem de contribuição"], requiredData: ["tributos", "despesas", "risco", "lucro", "preço"] },
      { name: "Análise de risco", techniques: ["três pontos", "sensibilidade", "Curva ABC"], requiredData: ["otimista", "provável", "pessimista", "classe ABC", "contingência"] }
    ],
    scenarios: {
      optimistic: "Escopo completo e referências atuais produzem orçamento aprovado com margem e risco previstos.",
      normal: "O orçamentista quantifica, compõe, revisa BDI, documenta premissas e emite versão comparável.",
      pessimistic: {
        description: "Escopo omisso ou preço sem data-base reduz margem depois que a proposta já foi enviada.",
        event: "budget.margin_at_risk",
        notify: ["P1", "P4", "P8", "P13", "P14"],
        systemResponse: "Preserva a versão, identifica itens de maior impacto e exige aprovação de exceção ou aditivo."
      }
    }
  },
  {
    id: "P12",
    role: "Qualidade",
    profession: "Engenheiro ou técnico de qualidade de obras",
    mission: "Prevenir não conformidade, verificar requisitos e fechar causa raiz com eficácia comprovada.",
    modules: ["dashboard", "qualidade", "diario", "documentos", "modelos", "obras", "compras", "estoque", "tarefas", "relatorios"],
    competencies: [
      { name: "Planejamento da qualidade", techniques: ["plano de inspeção", "FVS/FVM", "ponto de espera"], requiredData: ["requisito", "critério", "amostra", "responsável"] },
      { name: "Inspeção", techniques: ["checklist", "medição", "rastreabilidade"], requiredData: ["resultado", "instrumento", "evidência", "lote", "data"] },
      { name: "Não conformidade", techniques: ["contenção", "8D", "5 porquês"], requiredData: ["desvio", "impacto", "causa", "ação", "prazo"] },
      { name: "Melhoria", techniques: ["PDCA", "auditoria de processo", "eficácia"], requiredData: ["indicador", "recorrência", "verificação", "lição"] }
    ],
    scenarios: {
      optimistic: "Material e serviço passam na primeira inspeção e a evidência fecha o ponto de espera sem retrabalho.",
      normal: "A qualidade planeja amostra, inspeciona, registra desvios e verifica a eficácia das ações.",
      pessimistic: {
        description: "Não conformidade é encontrada depois de encoberta ou reaparece em outra obra com a mesma causa.",
        event: "quality.systemic_nonconformity",
        notify: ["P7", "P8", "P9", "P10", "P13", "P16"],
        systemResponse: "Bloqueia lote ou etapa, rastreia ocorrências equivalentes e exige causa raiz e eficácia antes da liberação."
      }
    }
  },
  {
    id: "P13",
    role: "Diretoria",
    profession: "Diretor executivo e controller de empresa de obras",
    mission: "Alocar capital e capacidade por risco, margem, prazo e impacto no cliente sem microgerenciar eventos normais.",
    modules: ["dashboard", "relatorios", "financeiro", "obras", "planejamento", "orcamentos", "compras", "qualidade", "sac", "auditoria"],
    competencies: [
      { name: "Gestão de portfólio", techniques: ["priorização", "capacidade", "cenários"], requiredData: ["margem", "caixa", "risco", "prazo", "capacidade"] },
      { name: "Controladoria", techniques: ["orçado x realizado", "forecast", "resultado por obra"], requiredData: ["receita", "custo", "comprometido", "EAC", "variação"] },
      { name: "Governança", techniques: ["alçada", "segregação", "apetite a risco"], requiredData: ["decisão", "limite", "exceção", "autor"] },
      { name: "Gestão por exceção", techniques: ["KPI", "threshold", "resumo executivo"], requiredData: ["tendência", "desvio", "causa", "plano", "dono"] }
    ],
    scenarios: {
      optimistic: "Portfólio mantém caixa, margem e capacidade dentro das faixas e só exceções materiais chegam à diretoria.",
      normal: "A diretoria revisa tendências, aprova exceções e acompanha planos sem consumir detalhe operacional.",
      pessimistic: {
        description: "Duas obras disputam caixa e equipe enquanto um cliente estratégico entra em risco de prazo.",
        event: "portfolio.executive_decision_required",
        notify: ["P4", "P8", "P2", "P1"],
        systemResponse: "Apresenta cenários comparáveis, impacto marginal e decisão auditável com responsáveis e data de revisão."
      }
    }
  },
  {
    id: "P14",
    role: "Contratos e documentos",
    profession: "Analista de contratos, documentos e assinaturas",
    mission: "Manter obrigação, versão, vigência, aprovação e evidência documental ligadas ao fato que autorizam.",
    modules: ["dashboard", "propostas", "contratos", "aditivos", "assinaturas", "documentos", "modelos", "clientes", "obras", "relatorios"],
    competencies: [
      { name: "Gestão contratual", techniques: ["obrigações", "marcos", "vigência"], requiredData: ["parte", "objeto", "valor", "prazo", "obrigação"] },
      { name: "Controle de mudanças", techniques: ["change log", "aditivo", "impacto"], requiredData: ["origem", "escopo", "prazo", "custo", "aprovação"] },
      { name: "Gestão documental", techniques: ["metadados", "revisão", "retenção"], requiredData: ["tipo", "versão", "estado", "acesso", "validade"] },
      { name: "Assinatura e evidência", techniques: ["ordem de assinatura", "integridade", "trilha"], requiredData: ["signatário", "hash", "instante", "IP", "artefato final"] }
    ],
    scenarios: {
      optimistic: "Documento aprovado circula na ordem correta, todas as partes assinam e a obrigação passa a ser acompanhada.",
      normal: "O analista controla versões, coleta aprovações, monitora vigências e vincula aditivos ao contrato.",
      pessimistic: {
        description: "Equipe executa mudança solicitada sem aditivo aprovado ou usa documento contratual desatualizado.",
        event: "contract.unapproved_change",
        notify: ["P1", "P4", "P8", "P13", "P16"],
        systemResponse: "Suspende liberação, preserva a solicitação e conduz aprovação, assinatura e comunicação da versão vigente."
      }
    }
  },
  {
    id: "P15",
    role: "Cliente",
    profession: "Cliente contratante de obra ou móveis planejados",
    mission: "Compreender compromisso, decidir o que depende dele e acompanhar evidência aprovada sem ruído interno.",
    modules: ["dashboard", "clientes", "obras", "planejamento", "orcamentos", "propostas", "contratos", "aditivos", "assinaturas", "documentos", "sac"],
    competencies: [
      { name: "Decisão de escopo", techniques: ["aceite", "priorização", "trade-off"], requiredData: ["alternativas", "impacto em prazo", "impacto em custo", "prazo da decisão"] },
      { name: "Acompanhamento", techniques: ["marco", "evidência aprovada", "previsão"], requiredData: ["progresso", "próximo marco", "fotos aprovadas", "desvio explicado"] },
      { name: "Gestão financeira contratual", techniques: ["parcela", "medição", "aditivo"], requiredData: ["vencimento", "evento de cobrança", "valor", "documento"] },
      { name: "Comunicação de ocorrência", techniques: ["abertura de chamado", "evidência", "aceite de solução"], requiredData: ["assunto", "foto", "prioridade", "previsão", "resolução"] }
    ],
    scenarios: {
      optimistic: "Decisões e pagamentos ocorrem no prazo, e o cliente acompanha marcos aprovados sem precisar cobrar por mensagem.",
      normal: "O cliente consulta andamento, aprova documentos, paga parcelas e abre ocorrências pelo portal.",
      pessimistic: {
        description: "Mudança urgente é pedida fora do fluxo ou o cliente recebe imagem interna sem contexto e entende como defeito.",
        event: "client.decision_or_context_risk",
        notify: ["P1", "P5", "P8", "P14"],
        systemResponse: "Registra decisão com impacto, mostra apenas evidência aprovada e mantém uma previsão única de resposta."
      }
    }
  },
  {
    id: "P16",
    role: "Auditoria e compliance",
    profession: "Auditor interno e analista de controles",
    mission: "Avaliar desenho e eficácia dos controles com independência, evidência íntegra e plano de ação monitorado.",
    modules: ["dashboard", "auditoria", "administracao", "relatorios", "documentos", "contratos", "financeiro", "compras", "estoque", "qualidade"],
    competencies: [
      { name: "Planejamento de auditoria", techniques: ["risk assessment", "escopo", "programa de trabalho"], requiredData: ["universo", "risco", "controle", "amostra"] },
      { name: "Teste de controle", techniques: ["walkthrough", "amostragem", "reexecução"], requiredData: ["critério", "evidência", "população", "exceção"] },
      { name: "Investigação", techniques: ["trilha de auditoria", "segregação", "análise de padrão"], requiredData: ["autor", "instante", "antes/depois", "correlação"] },
      { name: "Comunicação e follow-up", techniques: ["achado", "causa", "plano de ação", "eficácia"], requiredData: ["impacto", "recomendação", "dono", "prazo", "estado"] }
    ],
    scenarios: {
      optimistic: "Controles operam como desenhados e as poucas exceções são corrigidas antes do fechamento.",
      normal: "A auditoria seleciona amostra, testa evidência, discute achados e acompanha planos de ação.",
      pessimistic: {
        description: "A trilha está incompleta ou a mesma pessoa solicita, aprova e liquida uma operação sensível.",
        event: "audit.control_failure",
        notify: ["P6", "P13", "P4"],
        systemResponse: "Preserva evidência, bloqueia conflito de função e abre achado com causa, risco, dono e prazo monitorado."
      }
    }
  }
] as const satisfies readonly PersonaOperacional[];
