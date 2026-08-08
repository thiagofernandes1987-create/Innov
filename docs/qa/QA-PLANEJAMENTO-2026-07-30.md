# QA do Planejamento — EAP + Gantt

**Data:** 30 de julho de 2026  
**PR:** #38  
**Branch:** `qa/planejamento-iter1`  
**Referência visual:** cronograma profissional com EAP hierárquica, Gantt sincronizado e modal de atividade fornecido pelo responsável.

## Estado executivo

| Superfície | Estado | Motivo |
|---|---|---|
| Integridade das actions | `PASS` | validações negativas, escopo e mensagens públicas seguras |
| Fixture visual — iteração 2 | `PASS` | seis cenários, modal Geral e dependências, zero alvo abaixo de 44px, console e servidor limpos |
| Fixture visual — iteração 3 | `PASS` | deployment imutável, matriz automática e revisão manual confirmaram contraste e leitura |
| Persona gestor de obras | `BLOCKED_EXTERNAL` | credencial específica ausente em `QA_PERSONAS_JSON` |
| Planejamento ↔ Tarefas | `PASS_CODE` | mesmo motor de datas, duração inteira e portas equivalentes protegidas; CI consolidado verde |
| Obras ↔ Planejamento ↔ Diário | `PARTIAL` | revalidações e contratos existem; jornada autenticada e falhas de comunicação ainda pendentes |
| Concorrência da rede lógica | `PARTIAL` | proteção na aplicação existe; RPC transacional no PostgreSQL ainda pendente |

O módulo permanece **não aprovado** e o PR continua em rascunho.

## Iteração 1 — integridade da rede e das actions

### Problemas reproduzidos

| Problema | Localização | Severidade | Impacto no gestor de obras |
|---|---|---:|---|
| mensagem técnica do banco podia chegar à URL e à interface | `app/actions/schedule.ts` | crítica | o usuário recebe SQL, constraint ou detalhe sem ação operacional clara |
| dependência confirmava apenas que predecessora e sucessora eram diferentes | criação de relação | crítica | ciclo indireto ou relação cruzada podia corromper a rede lógica |
| atividade superior não era validada contra descendentes | edição da atividade | crítica | a árvore podia se tornar circular |
| duração e defasagem aceitavam meio dia, mas o motor arredondava | formulários e calendário | alta | a data exibida não correspondia ao valor informado |
| alteração e exclusão não confirmavam linha afetada | actions | alta | operação podia parecer concluída sobre registro inexistente ou fora do escopo |
| teste de contrato ainda exigia o componente antigo `Gantt` | CI | alta | evolução real do editor era reprovada por contrato obsoleto |

### Correções

- validação dos tipos `FS`, `SS`, `FF` e `SF`;
- validação de EAP, tarefa superior, predecessora e sucessora no escopo da organização e da obra;
- bloqueio de autorrelação, duplicidade, ciclo indireto e ciclo hierárquico;
- status, prioridade, datas, duração, avanço, sequência e defasagem validados;
- duração e defasagem coerentes com a precisão inteira do motor atual;
- mensagens técnicas registradas no servidor e traduzidas para mensagens públicas;
- atualização e exclusão confirmam o registro afetado;
- testes negativos em `tests/schedule-validation.test.ts`;
- contrato de interface atualizado para `SchedulePlanner`.

## Iteração 2 — responsividade e áreas de interação

### Primeira captura válida

A primeira matriz do editor confirmou a renderização da EAP, Gantt e das duas abas do modal, mas encontrou:

- controles principais com 34px;
- botões de expandir/recolher com 22–32px;
- tabela ocupando quase toda a largura em 375px e 768px;
- faixa do Gantt insuficiente no tablet;
- botões de remoção da relação com 34px.

### Correções

- linhas e controles passaram a respeitar 44px;
- em telas menores, a tabela mantém EAP e nome; duração, datas e predecessoras continuam disponíveis no modal;
- o Gantt mantém largura operacional e rolagem interna intencional;
- a legenda quebra linhas;
- nomes de tarefas possuem hitbox de 44px;
- barras curtas possuem área clicável de 44px sem falsear sua duração gráfica;
- o progresso permanece limitado à largura visual da atividade;
- botões de remoção receberam largura mínima de 44px;
- “Cadeia crítica” foi renomeada para “Cadeia determinante”.

### Matriz final da iteração 2

Deployment: `innov-g79hg3qg6-apex-method.vercel.app`  
Workflow: `QA Fixture do Planejamento`, run `30555440684`  
Artefato: `8764606299`  
Conclusão: `success`

Resultados nos seis cenários, 375px, 768px e 1280px, claro e escuro:

- 375px: 89px úteis de Gantt;
- 768px: 344px úteis de Gantt;
- 1280px: 519px úteis de Gantt;
- sem overflow externo;
- sem console error/warning;
- sem page error;
- sem resposta 5xx;
- zero alvo abaixo de 44px na área principal;
- zero alvo abaixo de 44px no modal Geral;
- zero alvo abaixo de 44px no modal de dependências;
- modal Geral abriu;
- aba Predecessoras e sucessoras abriu.

## Iteração 3 — autocrítica manual e nova captura

O sucesso automático da iteração 2 não encerrou a análise. A inspeção das imagens encontrou:

| Problema | Localização | Severidade | Impacto na persona |
|---|---|---:|---|
| cabeçalho da página no tema escuro sobre gradiente claro | superfície externa do editor | alta | título e descrição perdem contraste e parecem desabilitados |
| nomes centralizados e cortados em telas estreitas | coluna Etapa / atividade | média | o gestor perde o início do nome, geralmente a parte mais útil para identificar a tarefa |

### Correções

- o fundo global deixou de usar cores claras fixas e passou a derivar de tokens de tema;
- nomes das atividades passaram a alinhar à esquerda;
- `title` exibe código e nome completos;
- `aria-label` descreve a ação e a atividade sem depender do texto cortado.

### Evidência final

Deployment imutável: `innov-pk16rmqx8-apex-method.vercel.app`  
Workflow: `QA Planejamento iter3 imutável`, run `30558579631`  
Artefato: `8765881259`  
Conclusão: `success`

A matriz repetiu 375px, 768px e 1280px nos temas claro e escuro e confirmou:

- as mesmas faixas úteis de Gantt: 89px, 344px e 519px;
- zero alvo abaixo de 44px;
- ausência de overflow global, console error/warning, page error e 5xx;
- abertura do modal Geral e da aba de dependências.

A revisão manual confirmou:

- contraste consistente no tema escuro;
- início dos nomes preservado em telas estreitas;
- texto completo disponível em `title` e `aria-label`;
- modal rolável no mobile;
- relações, remoção e formulários continuam legíveis.

Textos longos continuam truncados intencionalmente na coluna estreita, sem ocultar o início e sem remover a alternativa acessível.

## Iteração 4 — convergência com Tarefas

### Problema reproduzido

O Kanban de Tarefas usava apenas `planned_start` e `planned_end` persistidos, enquanto o Gantt calculava datas efetivas a partir da rede de dependências. A mesma atividade poderia aparecer com datas diferentes. A tela Tarefas também aceitava duração de `0,5` dia, embora o motor trabalhasse com dias úteis inteiros.

### Correções

- Tarefas passou a consultar as dependências da obra;
- usa a mesma função `calcular(...)` do Gantt;
- exibe início e término efetivos;
- identifica datas derivadas com o selo `Calculada`;
- duração passou a `min="1"` e `step="1"`;
- criação de tarefa valida datas, duração inteira, sequência, peso, status, prioridade, EAP e responsável;
- falhas de banco usam mensagens públicas seguras;
- `tests/planning-task-integration.test.ts` protege a convergência e a data efetiva de uma sucessora TI.

## Iteração 5 — portas equivalentes e cenários pessimistas

### Cenário A — action antiga contorna a proteção nova

A action histórica `createDependency` ainda gravava diretamente em `task_dependencies`. Ela passou a delegar para `createScheduleDependency`, preservando validação de escopo, duplicidade e ciclo.

A mesma varredura protegeu:

- criação de EAP e etapa superior;
- movimentação de tarefa;
- criação de marco;
- congelamento de baseline;
- mensagens públicas seguras em todos esses fluxos.

### Cenário B — formulário mistura obra e tarefa

Um formulário poderia enviar `projectId` de uma obra e `taskId` de outra. Antes de chamar `move_project_task`, a action agora confirma o registro por:

- `id = taskId`;
- `project_id = projectId`;
- `organization_id = organizationId`.

Sem correspondência, a operação termina com `A tarefa não pertence a esta obra.` O teste estrutural exige que essa validação apareça antes da RPC.

### Laboratório de QA

Os workflows visuais e de persona deixaram de disparar em todo commit. Agora são manuais e exigem uma URL imutável compartilhável. Alias de branch é rejeitado para impedir capturas stale e consumo inútil de builds.

## CI consolidado

Run `30558166350`:

- preflight: `success`;
- documentação, personas e vacinas: `success`;
- testes de banco do cronograma e demais domínios: `success`;
- lint: `success`;
- typecheck: `success`;
- testes TypeScript: `success`;
- testes Python: `success`;
- build: `success`.

## Persona real

Workflow: `QA Planejamento por Persona`, run `30555693107`  
Artefato: `8764708777`  
Resultado: `BLOCKED_EXTERNAL`

O runner carregou o contrato P8 — gerente de obras/projetos — e recusou substituir a persona por administrador. O relatório registrou:

> Credencial específica da persona `gestor_de_obras` não está disponível em `QA_PERSONAS_JSON`.

Nenhuma captura autenticada foi produzida e nenhuma aprovação foi inferida.

## Logs

Nos deployments imutáveis validados, as requisições de `/amostra-planejamento` retornaram `200`; as matrizes não registraram console error/warning, page error ou resposta 5xx.

## Autocrítica

A fixture confirma geometria, temas, erros técnicos e abertura dos fluxos básicos, mas não prova:

- que um gestor de obras entende como criar a primeira EAP;
- que uma alteração real de dependência persiste e recalcula corretamente no banco;
- que Obras e Diário exibem todas as consequências operacionais do mesmo fato;
- que duas gravações concorrentes não fecham ciclo.

## Vacinas

Aplicadas nesta rodada:

- `VACINA-019` — função equivalente e alvos de 44px nos breakpoints;
- `VACINA-023` — fixture explícita sem alegação de dado de produção;
- `VACINA-024` — conteúdo interno e faixa útil medidos, não apenas overflow global;
- `VACINA-025` — warning de lint não foi aceito;
- `VACINA-027` — captura comparada à referência visual;
- `VACINA-031` — temas e primeiro plano mantidos por tokens;
- `VACINA-062` — captura do preview como gate obrigatório;
- `VACINA-063` — estado `parcial`, para integridade da rede lógica.

## Próximos portões

1. executar o fluxo autenticado quando a credencial específica da persona existir;
2. testar persistência real de EAP, atividade e dependência na obra de QA;
3. validar as consequências em Obras e Diário com a mesma persona;
4. implementar RPC transacional e teste concorrente da rede lógica;
5. somente depois avaliar aprovação e merge.
