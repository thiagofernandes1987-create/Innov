# Referências de mercado — Cronograma EAP + Gantt

Data: 30/07/2026  
Aplicação: Innovar Platform  
Tela: `app/app/obras/[id]/cronograma`

## Diagnóstico da versão anterior

A versão anterior possuía cálculo de barras, datas e relações lógicas, porém a experiência estava fragmentada:

- lista lateral plana, sem árvore de EAP;
- formulário de dependências separado do Gantt;
- marcos e baselines ocupando o mesmo nível visual da área principal de planejamento;
- ausência de edição contextual ao clicar na atividade;
- pouco vínculo visual entre a linha da atividade e sua barra no calendário.

O padrão adotado pelo mercado é uma área de trabalho dividida: estrutura hierárquica e campos da atividade à esquerda, calendário e barras do Gantt à direita, com edição contextual da atividade.

## Referências oficiais

### Microsoft Project

1. **Vincular tarefas em um projeto**  
   https://support.microsoft.com/pt-BR/project/link-tasks-in-a-project

   Referências aplicadas:
   - visualização Gráfico de Gantt;
   - colunas Predecessoras e Sucessoras;
   - relações TI, II, TT e IT;
   - defasagem positiva e negativa;
   - caixa Informações da Tarefa para alterar relações.

2. **Predecessors — campo de tarefa**  
   https://support.microsoft.com/en-us/project/predecessors-task-field

   Referências aplicadas:
   - representação compacta da predecessora;
   - tipo de vínculo e lag/lead;
   - atualização do cronograma a partir da rede lógica.

3. **Add new tasks**  
   https://support.microsoft.com/en-US/project/add-new-tasks

   Referências aplicadas:
   - tarefas resumo e subtarefas;
   - duração, datas e predecessoras na mesma área;
   - edição da atividade associada à visualização do Gantt.

### Oracle Primavera P6

4. **Working with Activities**  
   https://docs.oracle.com/cd/G48897_01/p6help/en/6672.htm

   Referências aplicadas:
   - tabela de atividades combinada com Gantt;
   - agrupamento por WBS/EAP;
   - expandir e recolher níveis;
   - painel de detalhes da atividade;
   - relações, datas, duração e campos operacionais.

5. **Edit a Work Breakdown Structure Element**  
   https://docs.oracle.com/cd/G48902_01/English/User_Guides/p6_pro_user/edit_a_work_breakdown_structure_element.htm

   Referências aplicadas:
   - edição de elemento da EAP;
   - organização hierárquica e movimentação entre níveis;
   - detalhes do elemento associados à estrutura.

### Autodesk Construction Cloud

6. **Compare Schedule Versions**  
   https://help.autodesk.com/cloudhelp/ENU/Build-Schedule/files/work-schedule/Schedule_Compare.html

   Referências aplicadas:
   - visualização tabular e Gantt sincronizadas;
   - comparação de início e término;
   - leitura de dependências e caminho crítico;
   - evolução futura por baselines e revisões.

## Arquitetura implementada

### Área principal

- EAP hierárquica fixa à esquerda;
- etapas e subetapas recolhíveis;
- atividades alinhadas linha a linha às barras;
- colunas EAP, nome, duração, início, término e predecessoras;
- calendário rolável à direita;
- barras de tarefas, barras-resumo, progresso e relações gráficas;
- linha da data atual;
- escalas diária, semanal e mensal;
- destaque da cadeia que empurra a entrega.

### Pop-up da atividade

Ao clicar no nome ou na barra:

- código e nome;
- descrição;
- etapa da EAP;
- atividade superior;
- duração em dias úteis;
- início e término planejados;
- percentual de avanço;
- status e prioridade;
- predecessoras;
- sucessoras;
- relações TI, II, TT e IT;
- defasagem positiva ou negativa;
- inclusão e remoção de relações.

### Persistência

A implementação utiliza as estruturas existentes:

- `work_breakdown_items`;
- `project_tasks`;
- `task_dependencies`;
- `project_milestones`;
- `schedule_baselines`.

## Critérios de aceite da tela

- [x] EAP e Gantt exibidos simultaneamente.
- [x] Hierarquia visual de etapa, subetapa e atividade.
- [x] Expandir e recolher a EAP.
- [x] Linha da tabela alinhada à barra correspondente.
- [x] Clique no nome ou barra abre formulário modal.
- [x] Cadastro e edição de duração e datas.
- [x] Cadastro de predecessoras e sucessoras.
- [x] Suporte aos quatro tipos de dependência.
- [x] Suporte a avanço e atraso da relação.
- [x] Setas de dependência no Gantt.
- [x] Linha de hoje.
- [x] Zoom diário, semanal e mensal.
- [x] Etapas-resumo representadas no Gantt.
- [x] Marcos e baselines preservados abaixo da área principal.

## Evoluções recomendadas

1. cálculo CPM completo, com passada para trás, folga livre e folga total;
2. edição por arrastar e redimensionar barras, com confirmação da alteração;
3. reordenação da EAP por drag-and-drop;
4. colunas configuráveis e salvamento de visualizações;
5. exibição de baseline sobreposta às barras atuais;
6. comparação visual entre versões do cronograma;
7. nivelamento de recursos e histograma de mão de obra;
8. importação e exportação compatível com Microsoft Project/Primavera.
