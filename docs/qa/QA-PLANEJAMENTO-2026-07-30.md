# QA do Planejamento — EAP + Gantt

**Data:** 30 de julho de 2026  
**PR:** #38  
**Branch:** `qa/planejamento-iter1`  
**Referência visual:** cronograma profissional com EAP hierárquica, Gantt sincronizado e modal de atividade fornecido pelo responsável.

## Estado executivo

| Superfície | Estado | Motivo |
|---|---|---|
| Integridade das actions | `PASS` | CI completo verde, validação negativa e mensagens seguras |
| Fixture visual do editor | `PARTIAL` | rodada imutável validou a responsividade; correção final dos dois botões de remoção aguarda nova captura do head |
| Persona gestor de obras | `NOT_ASSESSED` | fluxo autenticado ainda não foi executado com credencial real |
| Integração Obras ↔ Planejamento ↔ Tarefas ↔ Diário | `PARTIAL` | contratos e testes de banco passaram; falhas de comunicação e jornada autenticada ainda pendentes |
| Concorrência da rede lógica | `PARTIAL` | proteção na aplicação existe; RPC transacional no PostgreSQL ainda pendente |

O módulo permanece **não aprovado** e o PR continua em rascunho.

## Iteração 1 — integridade da rede e das actions

### Problemas reproduzidos

| Problema | Localização | Severidade | Impacto no gestor de obras |
|---|---|---:|---|
| mensagem técnica do banco podia chegar à URL e à interface | `app/actions/schedule.ts` | crítica | o usuário recebe SQL, constraint ou detalhe sem ação operacional clara |
| dependência confirmava apenas que predecessora e sucessora eram diferentes | criação de relação | crítica | ciclo indireto ou relação cruzada podia corromper a rede lógica |
| atividade superior não era validada contra descendentes | edição da atividade | crítica | a árvore podia se tornar circular |
| duração e defasagem aceitavam meio dia, mas o motor arredondava | formulários e calendário | alta | a data exibida não correspondia ao valor que o usuário acreditava ter informado |
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

A primeira matriz autenticada pelo link compartilhável do deployment confirmou que a aplicação, o Gantt e as duas abas do modal eram renderizados, mas encontrou:

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

### Rodada em deployment imutável

Deployment: `innov-8xrktbeum-apex-method.vercel.app`  
Workflow: `QA Fixture do Planejamento`, run `30554159477`  
Artefato: `8764138717`

Resultados comuns aos seis cenários:

- 375px: 89px úteis de Gantt;
- 768px: 344px úteis de Gantt;
- 1280px: 519px úteis de Gantt;
- sem overflow externo;
- sem console error/warning;
- sem page error;
- sem resposta 5xx;
- modal Geral abriu;
- aba Predecessoras e sucessoras abriu;
- área principal e aba Geral sem alvo inferior a 44px.

O único achado dessa rodada foram os dois botões `×` com 34px de largura na aba de dependências. A correção está no head atual, mas ainda precisa de nova captura em deployment imutável.

## Autocrítica

A matriz automática não substitui a avaliação da persona. Ela confirma geometria, erros técnicos e fluxos básicos, mas não prova:

- que um gestor de obras entende como criar a primeira EAP;
- que datas derivadas e persistidas são interpretadas corretamente entre módulos;
- que a navegação horizontal é suficientemente evidente no celular;
- que alteração de dependência produz o resultado esperado no banco real;
- que Obras, Tarefas e Diário recebem a mesma versão do fato.

Por isso a fixture permanece `PARTIAL`, mesmo com CI verde.

## Vacinas

Aplicadas nesta rodada:

- `VACINA-019` — função equivalente e alvos de 44px nos breakpoints;
- `VACINA-023` — fixture explícita sem alegação de dado de produção;
- `VACINA-024` — conteúdo interno e faixa útil medidos, não apenas overflow global;
- `VACINA-025` — warning de lint não foi aceito;
- `VACINA-027` — captura comparada à referência visual;
- `VACINA-031` — temas e primeiro plano mantidos por tokens;
- `VACINA-043` — reservada no PR #34; a campanha segue o gate de captura do preview;
- `VACINA-044` — nova, estado `parcial`, para integridade da rede lógica.

## Próximos portões

1. obter deployment imutável do head final;
2. repetir os seis cenários e confirmar zero alvo abaixo de 44px;
3. revisar manualmente as novas imagens;
4. revisar runtime logs do deployment;
5. executar o fluxo autenticado como gestor de obras;
6. testar dois cenários pessimistas de falha entre Planejamento e módulos adjacentes;
7. projetar RPC transacional para a rede lógica, sem promover a vacina antes do teste concorrente;
8. somente depois avaliar aprovação e merge.
