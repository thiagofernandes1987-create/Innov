# Auditoria de regressão da `main` — 2026-08-08

**Branch de trabalho:** `audit/regressao-main-20260808`  
**HEAD congelado da main:** `09498a4832087126855243bdd992fdb58f932f64`  
**Estado:** EM ANDAMENTO — não usar este documento como autorização de merge.

## Objetivo

Identificar regressões produzidas pela integração, em 2026-08-05, de módulos funcionais construídos sobre versões antigas da `main`. A auditoria deve distinguir:

- código ativo e coerente;
- código funcional desconectado da rota/UI atual;
- ilha órfã (arquivos que se referenciam internamente, mas não são alcançáveis por nenhuma rota/entrypoint);
- duplicação/implementações concorrentes;
- regressão funcional por restauração de versão antiga;
- conflito/fusão incompleta que deixa símbolos, imports ou contratos incompatíveis;
- código realmente morto/legado.

A `main` não será alterada durante esta fase.

## Linha de integração crítica

| Ordem | Merge | Observação de auditoria |
|---|---|---|
| 1 | PR #33 → `1495ba9` | O próprio PR dizia `Draft — não pronto para merge`. |
| 2 | PR #34 → `8677781` | Campanha visual/launcher; o próprio PR dizia permanecer em rascunho. |
| 3 | PR #38 → `d15f2ab` | Planejamento; o próprio PR proibia merge sem fechar validações restantes. |
| 4 | PR #39 → `821a02a` | WhatsApp; descrição listava bloqueios antes de merge. |
| 5 | PR #41 → `09498a4` | 64 commits / 573 arquivos; descrição começava com `Rascunho` e alertava que a ordem de integração importava. |

No merge de teste do PR #41, o workflow CI falhou no preflight e não chegou ao job de qualidade. O QA modular também bloqueou por inventário não conhecer `modelos` e `whatsapp`.

## Classificação de severidade

- **P0** — impede build/execução de rota central, deixa contrato impossível ou quebra fluxo essencial.
- **P1** — regressão funcional/segurança/integridade relevante, embora o projeto possa compilar após os P0.
- **P2** — código desconectado, duplicação, consulta inútil, cobertura ou documentação divergente.
- **P3** — limpeza/consistência sem efeito funcional imediato.

## Achados confirmados

### R-001 — Launcher contém duas implementações fundidas
**Severidade:** P0  
**Arquivos:** `app/app/page.tsx`, `components/casca/launcher.tsx`, `lib/casca/launcher-metrics.ts`, `lib/casca/indicadores.ts`

O PR #34 conectou o launcher a `loadLauncherSummaries(context)` e ao contrato `resumos`. O PR #41 tentou substituir isso por `carregarIndicadores()`/`indicadores`. A fusão final preservou pedaços das duas arquiteturas.

Estado atual observado:

- `app/app/page.tsx` chama `loadLauncherSummaries(context)` sem importar `loadLauncherSummaries` e sem declarar `context`;
- o resultado `resumos` não é entregue ao `Launcher`;
- `Launcher` recebe `indicadores`, mas ainda lê `resumos` na busca e no destaque;
- `AplicativoCard` é chamado com prop `indicador`, mas sua assinatura exige `resumo`;
- `MiniGrafico` continua sendo chamado, embora sua implementação tenha sido substituída por `FormaDoIndicador`.

**Conclusão:** conflito/fusão incompleta. Não remover nenhum dos dois motores antes de decidir qual contrato será canônico.

### R-002 — Planejamento `schedule.ts` fundiu versão segura e versão antiga
**Severidade:** P0/P1  
**Arquivo:** `app/actions/schedule.ts`

O PR #38 introduziu validações explícitas de escopo e hierarquia (`ensureWbsBelongsToProject`, `validateTaskPlacement`) e mensagens seguras. O PR #41 removeu essas funções ao adicionar numeração automática/modelos de EAP.

Estado atual observado:

- declaração duplicada de `parentId` dentro de `createScheduleWbs`;
- declaração duplicada de `wbsId` dentro de `createScheduleTask`;
- chamada a `optionalNumber`, `registrarValorUsado` e `ESCOPOS` sem definição/import coerente no arquivo observado;
- `updateScheduleTask` continua chamando `validateTaskPlacement`, função removida;
- a criação voltou a expor `error.message` diretamente em caminhos que o PR #38 havia endurecido;
- a numeração automática foi adicionada removendo validações de pertencimento de EAP/tarefa.

**Conclusão:** preservar a funcionalidade nova (numeração/modelos), mas reaplicá-la sobre a implementação segura do PR #38, não sobre a versão antiga.

### R-003 — `projects.ts` perdeu imports de segurança, mas manteve os consumidores
**Severidade:** P0  
**Arquivo:** `app/actions/projects.ts`

O PR #41 removeu os imports de `publicScheduleDatabaseMessage`, `ScheduleDatabaseError` e `createScheduleDependency`, mas a versão resultante ainda contém `failProjectDatabase(...)` usando os dois primeiros e `createDependency()` delegando a `createScheduleDependency(formData)`.

**Conclusão:** outro conflito de integração, não código morto.

### R-004 — Tarefas perdeu imports do motor de cronograma
**Severidade:** P0  
**Arquivo:** `app/app/obras/[id]/tarefas/page.tsx`

O PR #38 conectou a tela de tarefas ao mesmo motor de datas efetivas do Gantt, importando `calcular`, `Dependencia` e `TipoDependencia`. O PR #41 removeu esse import ao adicionar resolução de nomes de usuários, mas manteve toda a chamada ao motor.

Estado atual observado:

- `calcular(...)`, `TipoDependencia` e `Dependencia` continuam usados sem import;
- `dependenciesResult` continua sendo carregado e usado;
- existe uma consulta adicional a `profiles` que já não alimenta a renderização, pois a tela passou a usar `nomesDosUsuarios`.

**Conclusão:** restauração do import/contrato do PR #38 e remoção da consulta redundante, mantendo `nomesDosUsuarios`.

### R-005 — CRM: fluxo seguro de criação virou ilha órfã
**Severidade:** P1/P2  
**Arquivos:** `app/app/crm/oportunidades/novo/page.tsx`, `components/relationship/opportunity-form.tsx`, `app/actions/crm-opportunities.ts`

O PR #33 removeu a entrada livre de UUID e criou `OpportunityForm` + `createCrmOpportunitySafe`, carregando leads/clientes válidos e validando os IDs. O PR #41 restaurou a página antiga, incluindo `<input name="leadId">`, acrescentando apenas o campo monetário novo.

Estado atual observado:

- a rota `/app/crm/oportunidades/novo` não importa `OpportunityForm`;
- `OpportunityForm` ainda existe e importa `createCrmOpportunitySafe`;
- `createCrmOpportunitySafe` continua implementado;
- busca de referências não encontrou outra rota importando `OpportunityForm`.

**Conclusão:** ilha órfã funcional. O correto é reconectar a rota ao fluxo seguro e portar `CampoMoeda` para o formulário novo; não apagar a ilha.

### R-006 — Equipes possui leitura redundante de perfis
**Severidade:** P2  
**Arquivo:** `app/app/obras/[id]/equipes/page.tsx`

O PR #33 retirou um embed inválido de `profiles` e fez leitura direta de perfis. O PR #41 adicionou `nomesDosUsuarios`, mas deixou a leitura anterior (`profilesResult`) e ainda usa seu erro para bloquear o formulário, mesmo que os nomes apresentados venham de `nomesDosUsuarios`.

**Conclusão:** não é dead code de arquivo, mas é caminho de dados redundante e pode causar bloqueio falso. Consolidar em um único resolvedor de nomes.

### R-007 — Mapa canônico do código não representa o HEAD
**Severidade:** P1/P2  
**Arquivo:** `diretrizes/MAPA-DO-CODIGO.md`

O mapa commitado declara 23 aplicativos e não lista `whatsapp`, enquanto `lib/modules/registry.ts` já registra o aplicativo WhatsApp. O QA do merge do PR #41 confirmou divergência de inventário (`modelos` e `whatsapp` ausentes no inventário QA).

**Conclusão:** números de dead code do mapa atual não são evidência suficiente sobre o HEAD. O mapa deve ser regenerado apenas depois de corrigidos os P0, e o gerador deve ganhar análise de alcançabilidade de componentes/entrypoints para detectar ilhas como R-005.

## Matriz inicial por módulo

| Módulo | Estado inicial | Prioridade | Evidência principal |
|---|---|---:|---|
| Dashboard / Launcher | QUEBRADO | P0 | R-001 |
| Obras | QUEBRADO por actions compartilhadas | P0 | R-003 |
| Planejamento | QUEBRADO + regressão de validação | P0/P1 | R-002 |
| Tarefas | QUEBRADO | P0 | R-004 |
| Equipes | Parcial / redundância | P2 | R-006 |
| CRM | Regressão + ilha órfã | P1/P2 | R-005 |
| Propostas | Em auditoria | — | PRs #33/#34/#41 tocaram a rota |
| WhatsApp | Em auditoria | — | PR #39 funcional; integração global posterior pode afetar descoberta/QA |
| Modelos | Em auditoria | — | ausente no inventário QA do merge #41 |
| Orçamentos / SINAPI / CUB | Em auditoria | — | núcleo do PR #41, provável código funcional; validar integração com casca atual |
| Demais módulos | Em auditoria | — | cruzamento de rotas/imports/actions pendente |

## Regra para a futura correção

1. Não fazer rollback integral do PR #41: ele contém funcionalidades válidas e dados/migrations novos.
2. Não restaurar arquivos inteiros cegamente de PRs anteriores: isso apagaria correções novas.
3. Corrigir por **convergência semântica**: escolher a versão moderna/canônica de cada contrato e portar para ela as funcionalidades adicionadas pela branch antiga.
4. Após P0: rodar/revalidar `typecheck`, `lint`, testes, build, menus, code-map, migrations, vacinas e QA visual.
5. Somente após o grafo estar coerente classificar arquivos como dead code para remoção.
