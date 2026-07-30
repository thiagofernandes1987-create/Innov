# QA do Planejamento — EAP + Gantt

**Data:** 30 de julho de 2026  
**PR:** #38  
**Branch:** `qa/planejamento-iter1`  
**Referência visual:** cronograma profissional com EAP hierárquica, Gantt sincronizado e modal de atividade fornecido pelo responsável.

## Estado executivo

| Superfície | Estado | Motivo |
|---|---|---|
| Integridade das actions | `PASS` | CI completo verde, validações negativas e mensagens públicas seguras |
| Fixture visual — iteração 2 | `PASS` | seis cenários, modal Geral e dependências, zero alvo abaixo de 44px, console e servidor limpos |
| Fixture visual — iteração 3 | `PARTIAL` | contraste escuro e alinhamento dos nomes corrigidos; nova captura do deployment ainda pendente |
| Persona gestor de obras | `BLOCKED_EXTERNAL` | credencial específica ausente em `QA_PERSONAS_JSON` |
| Integração Obras ↔ Planejamento ↔ Tarefas ↔ Diário | `PARTIAL` | contratos e testes de banco passaram; jornadas de falha e leitura intermodular ainda pendentes |
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

### Evidência de CI

Run `30554458398`:

- preflight: `success`;
- validações de banco: `success`;
- lint: `success`;
- typecheck: `success`;
- testes TypeScript: `success`;
- testes Python: `success`;
- build: `success`.

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

## Iteração 3 — autocrítica manual

O sucesso automático não encerrou a análise. A inspeção das imagens encontrou:

| Problema | Localização | Severidade | Impacto na persona |
|---|---|---:|---|
| cabeçalho da página no tema escuro sobre gradiente claro | superfície externa do editor | alta | título e descrição perdem contraste e parecem desabilitados |
| nomes centralizados e cortados em telas estreitas | coluna Etapa / atividade | média | o gestor perde o início do nome, geralmente a parte mais útil para identificar a tarefa |

### Correções

- o fundo global deixou de usar cores claras fixas e passou a derivar de tokens de tema;
- nomes das atividades passaram a alinhar à esquerda;
- `title` exibe código e nome completos;
- `aria-label` descreve a ação e a atividade sem depender do texto cortado.

A nova captura de preview dessa iteração ainda é obrigatória.

## Persona real

Workflow: `QA Planejamento por Persona`, run `30555693107`  
Artefato: `8764708777`  
Resultado: `BLOCKED_EXTERNAL`

O runner carregou o contrato P8 — gerente de obras/projetos — e recusou substituir a persona por administrador. O relatório registrou:

> Credencial específica da persona `gestor_de_obras` não está disponível em `QA_PERSONAS_JSON`.

Nenhuma captura autenticada foi produzida e nenhuma aprovação foi inferida.

## Autocrítica

A fixture confirma geometria, temas, erros técnicos e abertura dos fluxos básicos, mas não prova:

- que um gestor de obras entende como criar a primeira EAP;
- que datas derivadas e persistidas são interpretadas corretamente entre módulos;
- que alteração de dependência produz o resultado esperado no banco real;
- que Obras, Tarefas e Diário recebem a mesma versão do fato;
- que duas gravações concorrentes não fecham ciclo.

## Vacinas

Aplicadas nesta rodada:

- `VACINA-019` — função equivalente e alvos de 44px nos breakpoints;
- `VACINA-023` — fixture explícita sem alegação de dado de produção;
- `VACINA-024` — conteúdo interno e faixa útil medidos, não apenas overflow global;
- `VACINA-025` — warning de lint não foi aceito;
- `VACINA-027` — captura comparada à referência visual;
- `VACINA-031` — temas e primeiro plano mantidos por tokens;
- `VACINA-043` — captura do preview como gate obrigatório;
- `VACINA-044` — nova, estado `parcial`, para integridade da rede lógica.

## Próximos portões

1. publicar a iteração 3 em deployment imutável;
2. repetir os seis cenários e revisar manualmente as imagens;
3. revisar runtime logs do deployment;
4. executar o fluxo autenticado quando a credencial específica da persona existir;
5. testar dois cenários pessimistas de falha entre Planejamento e módulos adjacentes;
6. projetar RPC transacional para a rede lógica e teste concorrente;
7. somente depois avaliar aprovação e merge.
