# Auditoria de regressão da `main` — 2026-08-08

**Branch de trabalho:** `audit/regressao-main-20260808`  
**HEAD congelado da main:** `09498a4832087126855243bdd992fdb58f932f64`  
**Estado:** EM ANDAMENTO — não usar este documento como autorização de merge.

## Objetivo

Identificar regressões produzidas pela integração, em 2026-08-05, de módulos funcionais construídos sobre versões antigas da `main`. A auditoria distingue:

- código ativo e coerente;
- código funcional desconectado da rota/UI atual;
- ilha órfã (arquivos que se referenciam internamente, mas não são alcançáveis por rota/entrypoint);
- duplicação/implementações concorrentes;
- regressão funcional por restauração de versão antiga;
- conflito/fusão incompleta com símbolos, imports ou contratos incompatíveis;
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

No merge de teste do PR #41, o workflow CI falhou no preflight e não chegou ao job de qualidade. O QA modular também bloqueou porque o inventário antigo não conhecia `modelos` e `whatsapp`.

## Limite de evidência desta sessão

O conector do GitHub permite ler branches, commits, patches e logs de CI, porém o ambiente local desta conversa não conseguiu resolver `github.com` para clonar o repositório. Portanto:

- achados marcados como **confirmados** abaixo são provados diretamente pelo código versionado/patches;
- `typecheck`, `lint`, `build` e testes completos ainda precisam ser reexecutados quando a branch de correção estiver coerente;
- não será alegado que um comando foi executado quando não foi.

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
- `MiniGrafico` continua sendo chamado embora a função não pertença mais à implementação baseada em `Indicador`.

**Conclusão:** conflito/fusão incompleta. Não remover nenhum dos motores antes de escolher o contrato canônico.

### R-002 — Planejamento `schedule.ts` fundiu versão segura e versão antiga
**Severidade:** P0/P1  
**Arquivo:** `app/actions/schedule.ts`

O PR #38 introduziu validações explícitas de escopo e hierarquia (`ensureWbsBelongsToProject`, `validateTaskPlacement`) e mensagens seguras. O PR #41 removeu essas funções ao adicionar numeração automática/modelos de EAP.

Estado atual observado:

- declaração duplicada de `parentId` dentro de `createScheduleWbs`;
- declaração duplicada de `wbsId` dentro de `createScheduleTask`;
- chamada a `optionalNumber`, `registrarValorUsado` e `ESCOPOS` sem definição/import coerente no trecho atual;
- `updateScheduleTask` continua chamando `validateTaskPlacement`, função removida;
- a criação voltou a expor `error.message` em caminhos que o PR #38 havia endurecido;
- a numeração automática foi adicionada removendo validações de pertencimento de EAP/tarefa.

**Conclusão:** preservar numeração automática, catálogo e modelos de EAP, mas reaplicá-los sobre a implementação segura do PR #38.

### R-003 — `projects.ts` perdeu imports de segurança, mas manteve os consumidores
**Severidade:** P0  
**Arquivo:** `app/actions/projects.ts`

O PR #41 removeu os imports de `publicScheduleDatabaseMessage`, `ScheduleDatabaseError` e `createScheduleDependency`, mas a versão resultante ainda contém `failProjectDatabase(...)` usando os dois primeiros e `createDependency()` delegando a `createScheduleDependency(formData)`.

**Conclusão:** conflito de integração, não código morto.

### R-004 — Tarefas perdeu imports do motor de cronograma
**Severidade:** P0  
**Arquivo:** `app/app/obras/[id]/tarefas/page.tsx`

O PR #38 conectou a tela de tarefas ao mesmo motor de datas efetivas do Gantt. O PR #41 removeu o import de `calcular`, `Dependencia` e `TipoDependencia`, mas manteve toda a chamada ao motor.

Estado atual observado:

- `calcular(...)`, `TipoDependencia` e `Dependencia` continuam usados sem import;
- `dependenciesResult` continua carregado e usado;
- existe uma consulta adicional a `profiles` que já não alimenta a renderização, pois a tela passou a usar `nomesDosUsuarios`.

**Conclusão:** restaurar o motor do PR #38 e manter o resolvedor de nomes novo.

### R-005 — CRM: fluxo seguro de criação virou ilha órfã
**Severidade:** P1/P2  
**Arquivos:** `app/app/crm/oportunidades/novo/page.tsx`, `components/relationship/opportunity-form.tsx`, `app/actions/crm-opportunities.ts`

O PR #33 removeu a entrada livre de UUID e criou `OpportunityForm` + `createCrmOpportunitySafe`, carregando leads/clientes válidos e validando os IDs. O PR #41 restaurou a página antiga, inclusive `<input name="leadId">`, acrescentando apenas o novo campo monetário.

Estado atual observado:

- a rota `/app/crm/oportunidades/novo` não importa `OpportunityForm`;
- `OpportunityForm` ainda existe e importa `createCrmOpportunitySafe`;
- `createCrmOpportunitySafe` continua implementado;
- nenhuma outra rota encontrada importa `OpportunityForm`.

**Conclusão:** ilha órfã funcional. Reconectar a rota ao fluxo seguro e portar `CampoMoeda` para ele; não apagar a ilha.

### R-006 — Equipes possui leitura redundante de perfis
**Severidade:** P2  
**Arquivo:** `app/app/obras/[id]/equipes/page.tsx`

O PR #33 retirou um embed inválido de `profiles` e fez leitura direta de perfis. O PR #41 adicionou `nomesDosUsuarios`, mas deixou a leitura anterior (`profilesResult`) e ainda usa seu erro para bloquear o formulário, embora os nomes apresentados venham de `nomesDosUsuarios`.

**Conclusão:** caminho de dados redundante e potencial bloqueio falso. Consolidar em um único resolvedor.

### R-007 — Mapa canônico do código não representa o HEAD
**Severidade:** P1/P2  
**Arquivo:** `diretrizes/MAPA-DO-CODIGO.md`

O mapa commitado declara 23 aplicativos e não lista `whatsapp`, enquanto o registro modular atual contém WhatsApp. O QA do merge do PR #41 confirmou divergência de inventário (`modelos` e `whatsapp` ausentes no inventário QA).

O detector atual também tem um ponto cego relevante: detecta módulos de `lib/` nunca importados e server actions não referenciadas, mas não mede alcançabilidade completa a partir das rotas. Assim, uma ilha `componente -> server action` como R-005 parece utilizada internamente embora nenhuma página chegue nela.

**Conclusão:** regenerar o mapa depois dos P0 e ampliar o gerador com grafo de alcançabilidade desde entrypoints/rotas.

### R-008 — CSS de campanha/QA governa globalmente a interface
**Severidade:** P1 visual  
**Arquivos:** `app/layout.tsx`, `app/module-validation.css`, `app/module-validation-a11y.css`

O layout raiz importa `module-validation.css` e `module-validation-a11y.css` por último. O primeiro arquivo se identifica como `Campanha de validação visual por módulos — importada por último` e sobrescreve globalmente casca, barra e launcher.

Entre os overrides atuais estão:

- geometria da barra superior;
- grade do launcher com quatro/ três/ duas/ uma colunas por breakpoint;
- destaque do launcher com `min-height: 650px`;
- cards com `min-height: 318px` em desktop;
- responsividade e aparência de indicadores.

O próprio PR #34 descrevia essa camada como isolada para facilitar comparação e reversão.

**Conclusão:** não apagar cegamente. Na correção, comparar regra por regra com a fundação visual atual e promover apenas as decisões aprovadas para CSS canônico; retirar o papel de override global de campanha.

### R-009 — Inventário de QA é de uma branch antiga
**Severidade:** P2/P1 de governança  
**Arquivo:** `diretrizes/qa/VALIDACAO-MODULOS.json`

O arquivo atual ainda declara `branch: fix/module-validation-loop-20260730`, com data de 2026-07-30. Ele descreve a matriz antiga e não contém `modelos` nem `whatsapp`.

**Conclusão:** o QA do merge ficou impedido de medir justamente os módulos novos. Atualizar o inventário após convergir o registro modular; não marcar módulos como aprovados por declaração.

## Módulos verificados como conectados — preservar durante a correção

### Propostas
A rota `app/app/propostas/nova/page.tsx` importa e renderiza `ProposalForm`; o formulário importa `createFlexibleProposal` e `prepareProposalUpload` e mantém o fluxo de upload direto assinado do PDF. Não foi encontrada ilha órfã equivalente ao CRM.

**Classificação atual:** conectado por inspeção estática; preservar. Pendente build/runtime/E2E após P0.

### Modelos
O aplicativo possui rota `/app/modelos`, menu, registro modular e migration específica `20260803220000_semear_modulo_modelos.sql`, que cria/atualiza a chave `modelos` em `app_modules` e habilita o módulo para organizações existentes. A página exige `modelos:read` e carrega a biblioteca/editor.

**Classificação atual:** conectado; o defeito observado está no inventário QA antigo, não na descoberta do módulo.

### WhatsApp
A estrutura encontrada possui rota `/app/whatsapp`, actions, `lib/whatsapp/*`, webhook e migrations da Etapa 22; menu e registro modular também apontam para a rota. Portanto não é dead code estrutural.

O PR #39, porém, foi integrado sem passar todos os gates declarados; o CI daquela integração parou no inventário QA antes do job de qualidade.

**Classificação atual:** conectado, mas não homologado na base convergida. Preservar e revalidar E2E/segurança depois dos P0.

### Orçamentos / CUB / SINAPI
A inspeção das rotas principais encontrou encadeamento coerente:

- detalhe do orçamento → `app/actions/budgets.ts`;
- importação manual de CUB → `app/actions/cub.ts`;
- catálogo SINAPI → `app/actions/sinapi.ts` → `lib/sinapi/automatic-update`;
- seleção do CUB segue UF e diferencia referência lida de declaração manual;
- catálogo SINAPI consulta RPC e adiciona referência ao orçamento por action dedicada.

Não foi encontrado, nesses caminhos examinados, o padrão P0 de símbolo removido que permaneceu em uso.

**Classificação atual:** provável núcleo funcional do PR #41; preservar. Ainda requer execução real dos testes e validações específicas.

### Administração / Object Runtime
A página de Administração continua ligada às rotas de Aplicativos, Perfis, Usuários, Responsabilidades, Vocabulário, Motivos de perda e Objetos. `app/actions/objetos.ts` está conectado ao runtime por `lib/object-runtime/*` e às RPCs de criação, rascunho e publicação.

**Classificação atual:** conectado por inspeção estática; preservar e validar depois dos P0.

## Matriz atual por módulo

| Módulo | Estado da auditoria | Prioridade |
|---|---|---:|
| Dashboard / Launcher | QUEBRADO por fusão de arquiteturas | P0 |
| Obras | QUEBRADO por actions compartilhadas | P0 |
| Planejamento | QUEBRADO + regressão de validação | P0/P1 |
| Tarefas | QUEBRADO por imports removidos | P0 |
| Equipes | Conectado, com caminho de dados redundante | P2 |
| CRM | Regressão funcional + ilha órfã segura | P1/P2 |
| Propostas | Conectado; preservar | validação pós-P0 |
| Modelos | Conectado; inventário QA obsoleto | P2 governança |
| WhatsApp | Conectado; integração não homologada | P1 validação |
| Orçamentos | Conectado; preservar | validação pós-P0 |
| CUB | Conectado; preservar | validação pós-P0 |
| SINAPI | Conectado; preservar | validação pós-P0 |
| Administração / Object Runtime | Conectado; preservar | validação pós-P0 |
| Casca / CSS global | Override de campanha ativo | P1 visual |
| Demais módulos | Sem evidência de regressão específica ainda; sujeitos à casca global | auditoria restante |

## Ordem proposta para a futura correção

1. Congelar o contrato canônico do Launcher e corrigir `app/app/page.tsx` + `launcher.tsx`.
2. Reconvergir `schedule.ts`, preservando as validações do PR #38 e os recursos novos do PR #41.
3. Corrigir `projects.ts` e Tarefas; remover leituras redundantes em Equipes.
4. Reconectar o fluxo seguro de CRM e portar apenas as melhorias novas para ele.
5. Separar CSS canônico de CSS de campanha/QA.
6. Atualizar inventários/mapas sem declarar aprovação antecipada.
7. Executar `typecheck`, `lint`, testes, `build`, menus, code-map, migrations, vacinas e validators por etapa.
8. Só depois rodar a análise de alcançabilidade completa e remover dead code real.
9. Revalidar módulos preservados: Propostas, Modelos, WhatsApp, Orçamentos/CUB/SINAPI e Object Runtime.
10. Somente com evidência verde preparar a correção da `main`.

## Regra de segurança da correção

- Não fazer rollback integral do PR #41: ele contém funcionalidades válidas e migrations novas.
- Não restaurar arquivos inteiros cegamente de PRs anteriores: isso apagaria correções posteriores.
- Corrigir por **convergência semântica**: manter a base moderna/canônica de cada contrato e portar para ela a funcionalidade válida construída na base antiga.
- Nenhum arquivo será chamado de dead code apenas porque está sem rota aparente; antes será verificado se faz parte de uma ilha funcional recuperável.
