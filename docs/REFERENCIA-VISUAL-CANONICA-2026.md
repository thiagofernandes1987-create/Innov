# Referência visual canônica — Innovar 2026

**Estado:** vigente  
**Fonte visual:** capturas fornecidas pelo responsável em 30/07/2026  
**Resolução de referência:** 1536 × 1152  
**Superfícies:** launcher de aplicativos e CRM/Pipeline

## 1. Finalidade

Estas duas capturas são o padrão visual obrigatório para a revisão dos módulos. Elas não são inspiração genérica: definem a direção de layout, densidade, hierarquia, contraste, navegação, cartões, micro-resumos e comportamento esperado da casca.

Toda captura futura do preview deve ser comparada contra este documento e contra a imagem correspondente no mesmo viewport, tema e nível de zoom.

## 2. Contrato visual da casca global

A barra superior deve manter uma única linha, sem sobreposição e sem rótulos cortados:

1. marca Innovar;
2. organização ativa;
3. nome do aplicativo atual e seus menus internos, quando aplicável;
4. busca global central;
5. mensagens, atividades e calendário;
6. alternador de tema;
7. avatar, nome e papel do usuário.

### Regras obrigatórias

- Nenhum menu pode ocupar a área da busca.
- Nenhum dropdown pode permanecer aberto depois de clique externo, `Escape`, mudança de rota ou seleção.
- A busca deve permanecer legível e utilizável em 1536 px, 1366 px e 390 px.
- A barra não pode criar overflow horizontal na página.
- O item ativo deve ser perceptível por cor, fundo e/ou linha inferior.
- O tema escuro usa fundo azul-marinho profundo, superfícies azuladas, bordas discretas e texto claro; branco puro só em texto de destaque.

## 3. Launcher de aplicativos

### Estrutura

- Cabeçalho "Aplicativos" abaixo da barra global.
- Filtros por categoria em chips horizontais.
- Ação de personalização à direita.
- Primeiro aplicativo em destaque, com largura maior e borda azul luminosa.
- Demais aplicativos em grade modular e densa.
- Cartões inferiores podem ocupar mais colunas quando o conteúdo exigir.

### Conteúdo obrigatório dos cartões

Cada aplicativo deve mostrar mais que título e descrição. Precisa de pelo menos um micro-resumo operacional coerente com o módulo:

- KPI principal;
- variação ou tendência;
- sparkline, barra, donut, linha do tempo ou histograma;
- itens recentes ou próximos marcos;
- status ou estágio;
- ação de acesso quando o cartão estiver destacado.

### Padrões por módulo

- **CRM e Vendas:** resumo do pipeline, valor total, oportunidades, propostas, negociações, ganhos e recentes.
- **Clientes:** clientes ativos, segmentos e distribuição.
- **Obras:** obras em andamento, estágio e valor em execução.
- **Planejamento:** cronogramas ativos, mini-Gantt e próximos marcos.
- **Tarefas:** quantidade por situação, donut e taxa de conclusão.
- **Diário de Obras:** registros do mês, histograma e último registro.
- **Equipes:** pessoas alocadas, avatares e equipes ativas.
- **Orçamentos:** em análise, tendência e valor orçado.
- **Propostas:** enviadas, etapas e conversão.
- **Contratos:** contratos ativos, valor contratado e aditivos pendentes.
- **Documentos:** quantidade, armazenamento e arquivos recentes.
- **Qualidade:** não conformidades, inspeções e taxa de conformidade.

### Critérios de fidelidade

- Cards não podem parecer blocos vazios com números soltos.
- Título, descrição, KPI e gráfico precisam formar hierarquia clara.
- Todos os números devem usar formatação `pt-BR`.
- Nenhum gráfico pode ser meramente decorativo; deve corresponder ao KPI exibido.
- O launcher deve permanecer visualmente equilibrado mesmo quando um módulo não possui dados: usar estado vazio informativo, nunca zeros quase invisíveis.

## 4. CRM e Vendas — Pipeline

### Barra do aplicativo

A navegação interna deve estar explícita no cabeçalho do módulo:

- Vendas;
- Pipeline;
- Relatórios;
- Configuração.

O item ativo recebe linha inferior azul e contraste reforçado.

### Barra de ações da página

A segunda faixa contém:

1. botão `Novo`;
2. breadcrumb;
3. busca específica de oportunidades;
4. filtros;
5. agrupar por;
6. favoritos;
7. contador de oportunidades;
8. seletores de visualização.

Nenhum elemento dessa faixa pode ser coberto pela barra global.

### Kanban

- Colunas: Prospecção, Qualificação, Proposta, Negociação e Ganho.
- Cada coluna mostra quantidade, valor total e barra de progresso/ênfase.
- Cartões apresentam nome da oportunidade, empresa, valor, data, prioridade, imagem opcional, próxima atividade, responsável e ações rápidas.
- O cartão deve ser legível sem abrir detalhes.
- A coluna deve oferecer criação contextual de oportunidade.
- O Kanban usa a largura disponível sem provocar overflow global; rolagem horizontal, quando necessária, ocorre somente dentro da área de trabalho.

### Painel lateral

O painel de Atividades/Detalhes deve:

- permanecer dentro da grade, sem cobrir Kanban;
- listar próximas atividades com prioridade, data, conta e responsável;
- separar atividades concluídas;
- manter a ação `Registrar atividade` visível;
- recolher ou mover para baixo em telas menores.

## 5. Tipografia, cores e densidade

- Família sans-serif limpa, compacta e legível.
- Títulos de cartões entre 16 e 20 px no desktop de referência.
- Texto auxiliar visível, sem cinza escuro sobre azul escuro.
- Espaçamentos regulares, com alta densidade de informação sem colisões.
- Bordas finas e discretas; brilho azul apenas para seleção, foco e destaque.
- Verde indica ganho/sucesso; vermelho, alta prioridade/atraso; laranja, atenção; azul, navegação e ação principal.

## 6. Estados obrigatórios

Toda superfície deve ser capturada e validada em:

- carregando;
- vazia;
- com dados;
- erro recuperável;
- ação desabilitada;
- item selecionado;
- hover;
- foco por teclado;
- dropdown aberto e fechado;
- tema claro e escuro.

Estados vazios não podem parecer falha de carregamento. Estados de erro não podem expor SQL, UUID, PGRST, constraint, stack trace ou mensagem bruta do provedor.

## 7. Checklist por captura

Cada comparação deve responder:

- A hierarquia visual corresponde à referência?
- A casca mantém a mesma ordem e densidade?
- O módulo utiliza de fato seus menus internos?
- Os cartões possuem micro-resumos úteis?
- Há qualquer sobreposição, corte ou overflow?
- Texto e controles mantêm contraste suficiente?
- Valores, percentuais e datas estão formatados?
- Algum número parece impossível, enganoso ou fora de escala?
- A persona encontra a ação principal sem hesitação?
- O estado observado é funcional, não apenas visualmente semelhante?

## 8. Regra de aprovação

Um módulo só pode ser aprovado quando:

1. o fluxo funcional principal passa com a persona correta;
2. a captura do preview foi feita nos viewports exigidos;
3. a comparação com esta referência não possui desvio aberto de severidade alta ou média;
4. os logs de navegador e servidor estão limpos para o fluxo exercitado;
5. os aprendizados foram registrados em vacina ou regra de prevenção;
6. o resultado final foi documentado no inventário de homologação do módulo.
