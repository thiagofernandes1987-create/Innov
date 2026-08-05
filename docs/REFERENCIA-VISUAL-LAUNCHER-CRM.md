# Referência visual canônica — Launcher e CRM

**Origem:** capturas fornecidas pelo responsável do produto em 30/07/2026.  
**Aplicação:** campanha transversal de QA visual e funcional.  
**Status:** referência obrigatória para aprovação.

## 1. Launcher de aplicativos

A tela inicial deve seguir a composição visual fornecida como referência:

- tema escuro em azul-marinho profundo, sem superfícies brancas desconectadas;
- header horizontal com marca, organização ativa, busca global, mensagens, atividades, tema e perfil;
- título `Aplicativos` e filtros por categoria em uma faixa clara e estável;
- grid denso, alinhado e responsivo;
- card principal de CRM com destaque visual, CTA, resumo do pipeline, série histórica, indicadores e itens recentes;
- demais cards com micro-resumos funcionais, não meras caixas de navegação;
- cada aplicativo deve apresentar um gadget coerente com seu domínio, por exemplo:
  - Clientes: total, variação e distribuição por segmento;
  - Obras: quantidade, fase e valor em execução;
  - Planejamento: cronogramas, Gantt resumido e marcos próximos;
  - Tarefas: distribuição por prazo e conclusão;
  - Diário de Obras: registros recentes e mini-histograma;
  - Equipes: pessoas, avatares, equipes ativas e disponibilidade;
  - Orçamentos: quantidade, variação, série e valor orçado;
  - Propostas: funil e conversão;
  - Contratos: ativos, valor contratado e aditivos pendentes;
  - Documentos: uso de armazenamento e arquivo recente;
  - Qualidade: não conformidades, inspeções e taxa de conformidade;
- cards com hierarquia clara: ícone, categoria, título, descrição, indicador principal, microvisualização e ação;
- nenhuma informação deve ficar invisível por baixo contraste;
- nenhum card pode parecer vazio quando houver dado disponível;
- estado vazio deve explicar a ação seguinte.

### Critérios visuais específicos

- alinhamento vertical consistente entre cards da mesma linha;
- gutters e bordas coerentes em toda a grade;
- destaque de hover/foco sem deslocar o layout;
- números e moedas em `pt-BR`;
- gráficos compactos legíveis, sem legenda cortada;
- texto secundário com contraste suficiente;
- categoria e estado com chips discretos;
- ausência de overflow horizontal global em desktop e notebook;
- no mobile, cards empilhados sem perder os indicadores principais.

## 2. CRM e Vendas — Pipeline

A tela interna do CRM deve seguir a segunda referência:

- header próprio do aplicativo, com marca, nome `CRM e Vendas` e navegação interna;
- menu principal visível e efetivamente usado: `Vendas`, `Pipeline`, `Relatórios`, `Configuração`;
- busca e toolbar em faixa separada do menu, sem qualquer sobreposição;
- botão `Novo` com ação clara;
- breadcrumb e contexto do aplicativo;
- filtros, agrupamento, favoritos, contagem e seletor de visualização na mesma barra funcional;
- Kanban com colunas bem delimitadas: Prospecção, Qualificação, Proposta, Negociação e Ganho;
- cabeçalho de coluna com quantidade, total financeiro e ações;
- cards de oportunidade contendo:
  - oportunidade;
  - empresa/cliente;
  - valor em reais;
  - data;
  - prioridade;
  - próxima atividade;
  - responsável;
  - ícones de ação;
- painel lateral de Atividades/Detalhes integrado ao grid, sem flutuar sobre o Kanban;
- atividades futuras, concluídas e ação de registro;
- barra inferior de atualização/data sem cobrir conteúdo;
- menu abre por clique e fecha por clique externo, `Escape`, seleção ou mudança de rota;
- nenhum dropdown permanece aberto por perda de foco;
- nenhum painel força rolagem horizontal da página inteira;
- cards e colunas preservam legibilidade em 1366×768.

### Critérios funcionais específicos

- busca por oportunidade, cliente, contato, telefone, e-mail, cidade e bairro;
- filtros combináveis com chips visíveis;
- movimentação de oportunidade entre etapas com persistência;
- registro de atividade a partir do card e do painel lateral;
- valores agregados por coluna atualizados após alteração;
- nenhum UUID, SQL, PGRST ou erro técnico exposto ao usuário;
- estados vazios permitem criar a primeira oportunidade;
- permissões por persona respeitadas.

## 3. Regras de comparação por captura

Cada captura do preview deve ser comparada com esta referência nos pontos:

1. composição geral;
2. hierarquia visual;
3. densidade informacional;
4. consistência de cards;
5. contraste;
6. uso real dos menus;
7. ausência de sobreposição;
8. legibilidade de números e estados;
9. responsividade;
10. clareza da próxima ação.

A captura não precisa ser uma cópia pixel a pixel, mas qualquer desvio que reduza clareza, densidade, consistência, navegabilidade ou aparência premium deve ser registrado como problema.
