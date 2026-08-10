# Mapa do código — Innovar Platform

**Documento canônico:** sim
**Gerado por:** `pnpm mapa:codigo` — **não editar à mão**
**Conferido por:** `pnpm validate:code-map`, no CI

Documentação de estrutura escrita à mão envelhece em uma semana. Não por
desleixo: a estrutura muda num arquivo, o documento mora noutro, e nada liga os
dois. Mapa que diverge do código é pior que mapa nenhum — quem confia nele
procura no lugar errado e conclui que a função não existe.

Este mapa é gerado do código e conferido no CI. Mudou a estrutura, regenere:
é parte da mudança, como rodar o teste é parte de mudar comportamento.

## O que este mapa reprova

| Confronto | Por que reprova |
|---|---|
| RPC chamada no código sem `create function` em migration nenhuma | A chamada falha em execução, e nem `typecheck` nem teste unitário veem |
| Módulo de `lib/` exportado e nunca importado | Código morto continua sendo mantido, revisado e migrado junto |
| Server action que nenhuma tela referencia | Idem, com o agravante de ser superfície exposta |

Cobertura de teste por módulo é **medida e publicada**, não exigida: reprovar
tudo o que não tem teste hoje transformaria o validador em ruído que se aprende
a ignorar.

## Números

| | |
|---|---|
| Aplicativos no registro | 24 |
| Rotas | 167 (148 páginas, 19 de API) |
| Server actions | 201 em 38 arquivos |
| Módulos de `lib/` | 126 |
| Funções do banco declaradas | 335 |
| Funções do banco chamadas do código | 135 |
| Suítes de teste | 96, com 937 casos |
| Migrations | 200 |
| Validadores de CI | 53 |
| Módulos de `lib/` citados por algum teste | 78 de 126 |

## 1. Aplicativos

| Chave | Nome | Rota |
|---|---|---|
| `dashboard` | Início | `/app` |
| `crm` | CRM e Vendas | `/app/crm` |
| `clientes` | Clientes | `/app/clientes` |
| `obras` | Obras | `/app/obras` |
| `planejamento` | Planejamento | `/app/planejamento` |
| `tarefas` | Tarefas | `/app/tarefas` |
| `diario` | Diário de Obras | `/app/diario` |
| `equipes` | Equipes | `/app/equipes` |
| `orcamentos` | Orçamentos | `/app/orcamentos` |
| `propostas` | Propostas | `/app/propostas` |
| `contratos` | Contratos | `/app/contratos` |
| `aditivos` | Aditivos | `/app/aditivos` |
| `assinaturas` | Assinaturas | `/app/assinaturas` |
| `documentos` | Documentos | `/app/documentos` |
| `modelos` | Modelos e Documentações | `/app/modelos` |
| `qualidade` | Qualidade | `/app/qualidade` |
| `compras` | Compras e Suprimentos | `/app/compras` |
| `estoque` | Estoque | `/app/estoque` |
| `financeiro` | Financeiro Operacional | `/app/financeiro` |
| `sac` | Pós-venda e SAC | `/app/ocorrencias` |
| `whatsapp` | WhatsApp e Atendimento | `/app/whatsapp` |
| `relatorios` | Relatórios e Indicadores | `/app/relatorios` |
| `auditoria` | Auditoria | `/app/auditoria` |
| `administracao` | Administração | `/app/administracao` |

## 2. Rotas

A coluna **guarda** mostra o que a rota exige antes de responder.

| Rota | Tipo | Guarda | Arquivo |
|---|---|---|---|
| `/acesso-negado` | página | — | `app/acesso-negado/page.tsx` |
| `/amostra-launcher` | página | — | `app/amostra-launcher/page.tsx` |
| `/amostra-planejamento` | página | — | `app/amostra-planejamento/page.tsx` |
| `/api/cep/[cep]` | API | — | `app/api/cep/[cep]/route.ts` |
| `/api/compras/cotacoes/[id]/anexo` | API | — | `app/api/compras/cotacoes/[id]/anexo/route.ts` |
| `/api/contracts/[versionId]/pdf` | API | — | `app/api/contracts/[versionId]/pdf/route.ts` |
| `/api/cost-sources/sinapi/import` | API | — | `app/api/cost-sources/sinapi/import/route.ts` |
| `/api/cron/cost-sources/sinduscon` | API | — | `app/api/cron/cost-sources/sinduscon/route.ts` |
| `/api/documents/signatures/[envelopeId]` | API | — | `app/api/documents/signatures/[envelopeId]/route.ts` |
| `/api/financeiro/anexos/[id]` | API | — | `app/api/financeiro/anexos/[id]/route.ts` |
| `/api/internal/file-security/health` | API | — | `app/api/internal/file-security/health/route.ts` |
| `/api/internal/sinapi-atualizacao` | API | — | `app/api/internal/sinapi-atualizacao/route.ts` |
| `/api/internal/sinapi-leitura-real` | API | — | `app/api/internal/sinapi-leitura-real/route.ts` |
| `/api/internal/sinapi-source-probe` | API | — | `app/api/internal/sinapi-source-probe/route.ts` |
| `/api/internal/sinapi-source-probe-v2` | API | — | `app/api/internal/sinapi-source-probe-v2/route.ts` |
| `/api/proposals/[versionId]/pdf` | API | — | `app/api/proposals/[versionId]/pdf/route.ts` |
| `/api/qualidade/anexos/[id]` | API | — | `app/api/qualidade/anexos/[id]/route.ts` |
| `/api/qualidade/documentos/[id]` | API | — | `app/api/qualidade/documentos/[id]/route.ts` |
| `/api/relatorios/exportar` | API | relatorios:export | `app/api/relatorios/exportar/route.ts` |
| `/api/sac/attachments/[id]` | API | — | `app/api/sac/attachments/[id]/route.ts` |
| `/api/signatures/webhook` | API | — | `app/api/signatures/webhook/route.ts` |
| `/api/webhooks/whatsapp` | API | — | `app/api/webhooks/whatsapp/route.ts` |
| `/app` | página | — | `app/app/page.tsx` |
| `/app/[module]` | página | sessão da organização | `app/app/[module]/page.tsx` |
| `/app/aditivos` | página | sessão da organização | `app/app/aditivos/page.tsx` |
| `/app/aditivos/novo` | página | aditivos:create | `app/app/aditivos/novo/page.tsx` |
| `/app/administracao` | página | administracao:manage | `app/app/administracao/page.tsx` |
| `/app/administracao/aplicativos` | página | administracao:manage | `app/app/administracao/aplicativos/page.tsx` |
| `/app/administracao/modelos` | página | administracao:manage | `app/app/administracao/modelos/page.tsx` |
| `/app/administracao/motivos-de-perda` | página | administracao:manage | `app/app/administracao/motivos-de-perda/page.tsx` |
| `/app/administracao/objetos` | página | administracao:manage | `app/app/administracao/objetos/page.tsx` |
| `/app/administracao/objetos/[id]` | página | administracao:manage | `app/app/administracao/objetos/[id]/page.tsx` |
| `/app/administracao/perfis` | página | administracao:manage | `app/app/administracao/perfis/page.tsx` |
| `/app/administracao/responsabilidades` | página | administracao:manage | `app/app/administracao/responsabilidades/page.tsx` |
| `/app/administracao/usuarios` | página | administracao:manage | `app/app/administracao/usuarios/page.tsx` |
| `/app/administracao/vocabulario` | página | administracao:manage | `app/app/administracao/vocabulario/page.tsx` |
| `/app/assinaturas` | página | assinaturas:read | `app/app/assinaturas/page.tsx` |
| `/app/assinaturas/documentos/[id]` | página | assinaturas:read | `app/app/assinaturas/documentos/[id]/page.tsx` |
| `/app/assinaturas/novo` | página | assinaturas:create | `app/app/assinaturas/novo/page.tsx` |
| `/app/auditoria` | página | — | `app/app/auditoria/page.tsx` |
| `/app/auditoria/alertas` | página | — | `app/app/auditoria/alertas/page.tsx` |
| `/app/auditoria/configuracao` | página | — | `app/app/auditoria/configuracao/page.tsx` |
| `/app/auditoria/eventos` | página | — | `app/app/auditoria/eventos/page.tsx` |
| `/app/auditoria/eventos/[id]` | página | — | `app/app/auditoria/eventos/[id]/page.tsx` |
| `/app/auditoria/saude` | página | — | `app/app/auditoria/saude/page.tsx` |
| `/app/clientes` | página | — | `app/app/clientes/page.tsx` |
| `/app/clientes/[id]` | página | — | `app/app/clientes/[id]/page.tsx` |
| `/app/clientes/novo` | página | clientes:create | `app/app/clientes/novo/page.tsx` |
| `/app/compras` | página | compras:read | `app/app/compras/page.tsx` |
| `/app/compras/fornecedores` | página | compras:read | `app/app/compras/fornecedores/page.tsx` |
| `/app/compras/pedidos` | página | compras:read | `app/app/compras/pedidos/page.tsx` |
| `/app/compras/pedidos/[id]` | página | compras:read | `app/app/compras/pedidos/[id]/page.tsx` |
| `/app/compras/solicitacoes` | página | compras:read | `app/app/compras/solicitacoes/page.tsx` |
| `/app/compras/solicitacoes/[id]` | página | compras:read | `app/app/compras/solicitacoes/[id]/page.tsx` |
| `/app/compras/solicitacoes/nova` | página | compras:create | `app/app/compras/solicitacoes/nova/page.tsx` |
| `/app/contratos` | página | sessão da organização | `app/app/contratos/page.tsx` |
| `/app/contratos/novo` | página | contratos:create | `app/app/contratos/novo/page.tsx` |
| `/app/crm` | página | — | `app/app/crm/page.tsx` |
| `/app/crm/leads` | página | — | `app/app/crm/leads/page.tsx` |
| `/app/crm/leads/[id]` | página | — | `app/app/crm/leads/[id]/page.tsx` |
| `/app/crm/leads/novo` | página | crm:create | `app/app/crm/leads/novo/page.tsx` |
| `/app/crm/oportunidades` | página | — | `app/app/crm/oportunidades/page.tsx` |
| `/app/crm/oportunidades/[id]` | página | — | `app/app/crm/oportunidades/[id]/page.tsx` |
| `/app/crm/oportunidades/novo` | página | crm:create | `app/app/crm/oportunidades/novo/page.tsx` |
| `/app/crm/visao-geral` | página | — | `app/app/crm/visao-geral/page.tsx` |
| `/app/diario` | página | sessão da organização | `app/app/diario/page.tsx` |
| `/app/documentos` | página | sessão da organização | `app/app/documentos/page.tsx` |
| `/app/documentos/novo` | página | documentos:create | `app/app/documentos/novo/page.tsx` |
| `/app/equipes` | página | sessão da organização | `app/app/equipes/page.tsx` |
| `/app/estoque` | página | — | `app/app/estoque/page.tsx` |
| `/app/estoque/ativos` | página | estoque:read | `app/app/estoque/ativos/page.tsx` |
| `/app/estoque/ativos/[id]` | página | estoque:read | `app/app/estoque/ativos/[id]/page.tsx` |
| `/app/estoque/catalogo` | página | estoque:read | `app/app/estoque/catalogo/page.tsx` |
| `/app/estoque/depositos` | página | estoque:read | `app/app/estoque/depositos/page.tsx` |
| `/app/estoque/depositos/[id]` | página | estoque:read | `app/app/estoque/depositos/[id]/page.tsx` |
| `/app/estoque/inventarios` | página | estoque:read | `app/app/estoque/inventarios/page.tsx` |
| `/app/estoque/inventarios/[id]` | página | estoque:read | `app/app/estoque/inventarios/[id]/page.tsx` |
| `/app/estoque/inventarios/novo` | página | estoque:manage | `app/app/estoque/inventarios/novo/page.tsx` |
| `/app/estoque/itens` | página | — | `app/app/estoque/itens/page.tsx` |
| `/app/estoque/itens/[id]` | página | estoque:read | `app/app/estoque/itens/[id]/page.tsx` |
| `/app/estoque/itens/novo` | página | estoque:create | `app/app/estoque/itens/novo/page.tsx` |
| `/app/estoque/movimentos` | página | estoque:read | `app/app/estoque/movimentos/page.tsx` |
| `/app/estoque/movimentos/[id]` | página | estoque:read | `app/app/estoque/movimentos/[id]/page.tsx` |
| `/app/estoque/movimentos/novo` | página | estoque:create | `app/app/estoque/movimentos/novo/page.tsx` |
| `/app/estoque/reservas` | página | estoque:read | `app/app/estoque/reservas/page.tsx` |
| `/app/estoque/reservas/[id]` | página | estoque:read | `app/app/estoque/reservas/[id]/page.tsx` |
| `/app/excecoes` | página | sessão da organização | `app/app/excecoes/page.tsx` |
| `/app/financeiro` | página | financeiro:read | `app/app/financeiro/page.tsx` |
| `/app/financeiro/configuracoes` | página | financeiro:manage | `app/app/financeiro/configuracoes/page.tsx` |
| `/app/financeiro/fluxo-de-caixa` | página | financeiro:read | `app/app/financeiro/fluxo-de-caixa/page.tsx` |
| `/app/financeiro/lancamentos` | página | financeiro:read | `app/app/financeiro/lancamentos/page.tsx` |
| `/app/financeiro/lancamentos/[id]` | página | financeiro:read | `app/app/financeiro/lancamentos/[id]/page.tsx` |
| `/app/financeiro/lancamentos/novo` | página | financeiro:create | `app/app/financeiro/lancamentos/novo/page.tsx` |
| `/app/financeiro/medicoes` | página | financeiro:read | `app/app/financeiro/medicoes/page.tsx` |
| `/app/financeiro/medicoes/[id]` | página | financeiro:read | `app/app/financeiro/medicoes/[id]/page.tsx` |
| `/app/financeiro/medicoes/nova` | página | financeiro:create | `app/app/financeiro/medicoes/nova/page.tsx` |
| `/app/modelos` | página | modelos:read | `app/app/modelos/page.tsx` |
| `/app/modelos/emitir` | página | modelos:read | `app/app/modelos/emitir/page.tsx` |
| `/app/obras` | página | sessão da organização | `app/app/obras/page.tsx` |
| `/app/obras/[id]` | página | sessão da organização | `app/app/obras/[id]/page.tsx` |
| `/app/obras/[id]/cronograma` | página | sessão da organização | `app/app/obras/[id]/cronograma/page.tsx` |
| `/app/obras/[id]/diario` | página | sessão da organização | `app/app/obras/[id]/diario/page.tsx` |
| `/app/obras/[id]/diario/[logId]` | página | sessão da organização | `app/app/obras/[id]/diario/[logId]/page.tsx` |
| `/app/obras/[id]/documentos` | página | sessão da organização | `app/app/obras/[id]/documentos/page.tsx` |
| `/app/obras/[id]/eap` | página | sessão da organização | `app/app/obras/[id]/eap/page.tsx` |
| `/app/obras/[id]/equipes` | página | sessão da organização | `app/app/obras/[id]/equipes/page.tsx` |
| `/app/obras/[id]/tarefas` | página | sessão da organização | `app/app/obras/[id]/tarefas/page.tsx` |
| `/app/obras/novo` | página | sessão da organização | `app/app/obras/novo/page.tsx` |
| `/app/ocorrencias` | página | — | `app/app/ocorrencias/page.tsx` |
| `/app/ocorrencias/[id]` | página | — | `app/app/ocorrencias/[id]/page.tsx` |
| `/app/ocorrencias/novo` | página | sac:create | `app/app/ocorrencias/novo/page.tsx` |
| `/app/orcamentos` | página | sessão da organização | `app/app/orcamentos/page.tsx` |
| `/app/orcamentos/[id]` | página | sessão da organização | `app/app/orcamentos/[id]/page.tsx` |
| `/app/orcamentos/cub/importar` | página | sessão da organização | `app/app/orcamentos/cub/importar/page.tsx` |
| `/app/orcamentos/novo` | página | papéis: SUPER_ADMIN, DIRECAO, ADMINISTRADOR, COMERCIAL, ORCAMENTISTA | `app/app/orcamentos/novo/page.tsx` |
| `/app/orcamentos/sinapi` | página | papéis: SUPER_ADMIN, DIRECAO, ADMINISTRADOR, ORCAMENTISTA, FINANCEIRO | `app/app/orcamentos/sinapi/page.tsx` |
| `/app/orcamentos/sinapi/composicao/[id]` | página | papéis: SUPER_ADMIN, DIRECAO, ADMINISTRADOR, ORCAMENTISTA, FINANCEIRO | `app/app/orcamentos/sinapi/composicao/[id]/page.tsx` |
| `/app/pipeline/[trilha]` | página | — | `app/app/pipeline/[trilha]/page.tsx` |
| `/app/pipeline/[trilha]/[cardId]` | página | — | `app/app/pipeline/[trilha]/[cardId]/page.tsx` |
| `/app/planejamento` | página | sessão da organização | `app/app/planejamento/page.tsx` |
| `/app/propostas` | página | sessão da organização | `app/app/propostas/page.tsx` |
| `/app/propostas/nova` | página | propostas:create | `app/app/propostas/nova/page.tsx` |
| `/app/qualidade` | página | qualidade:read | `app/app/qualidade/page.tsx` |
| `/app/qualidade/documentos` | página | qualidade:read | `app/app/qualidade/documentos/page.tsx` |
| `/app/qualidade/formularios` | página | qualidade:read | `app/app/qualidade/formularios/page.tsx` |
| `/app/qualidade/formularios/[id]` | página | qualidade:read | `app/app/qualidade/formularios/[id]/page.tsx` |
| `/app/qualidade/formularios/novo` | página | qualidade:create | `app/app/qualidade/formularios/novo/page.tsx` |
| `/app/qualidade/preenchimentos` | página | qualidade:read | `app/app/qualidade/preenchimentos/page.tsx` |
| `/app/qualidade/preenchimentos/[id]` | página | qualidade:read | `app/app/qualidade/preenchimentos/[id]/page.tsx` |
| `/app/qualidade/respostas/[id]` | página | qualidade:read | `app/app/qualidade/respostas/[id]/page.tsx` |
| `/app/relatorios` | página | relatorios:read | `app/app/relatorios/page.tsx` |
| `/app/relatorios/compras` | página | — | `app/app/relatorios/compras/page.tsx` |
| `/app/relatorios/financeiro` | página | — | `app/app/relatorios/financeiro/page.tsx` |
| `/app/relatorios/metas` | página | relatorios:read | `app/app/relatorios/metas/page.tsx` |
| `/app/relatorios/obras` | página | — | `app/app/relatorios/obras/page.tsx` |
| `/app/relatorios/obras/[id]` | página | — | `app/app/relatorios/obras/[id]/page.tsx` |
| `/app/relatorios/perdas` | página | relatorios:read | `app/app/relatorios/perdas/page.tsx` |
| `/app/relatorios/qualidade` | página | — | `app/app/relatorios/qualidade/page.tsx` |
| `/app/relatorios/salvos` | página | relatorios:read | `app/app/relatorios/salvos/page.tsx` |
| `/app/relatorios/snapshots` | página | relatorios:read | `app/app/relatorios/snapshots/page.tsx` |
| `/app/tarefas` | página | sessão da organização | `app/app/tarefas/page.tsx` |
| `/app/whatsapp` | página | — | `app/app/whatsapp/page.tsx` |
| `/app/whatsapp/bots` | página | — | `app/app/whatsapp/bots/page.tsx` |
| `/app/whatsapp/bots/[botId]` | página | — | `app/app/whatsapp/bots/[botId]/page.tsx` |
| `/app/whatsapp/inbox` | página | — | `app/app/whatsapp/inbox/page.tsx` |
| `/assinar/[token]` | página | — | `app/assinar/[token]/page.tsx` |
| `/cliente` | página | — | `app/cliente/page.tsx` |
| `/cliente/[module]` | página | — | `app/cliente/[module]/page.tsx` |
| `/cliente/aditivos` | página | — | `app/cliente/aditivos/page.tsx` |
| `/cliente/assinaturas` | página | — | `app/cliente/assinaturas/page.tsx` |
| `/cliente/contratos` | página | — | `app/cliente/contratos/page.tsx` |
| `/cliente/cronograma` | página | — | `app/cliente/cronograma/page.tsx` |
| `/cliente/documentos` | página | — | `app/cliente/documentos/page.tsx` |
| `/cliente/formularios` | página | — | `app/cliente/formularios/page.tsx` |
| `/cliente/formularios/[id]` | página | — | `app/cliente/formularios/[id]/page.tsx` |
| `/cliente/midia` | página | — | `app/cliente/midia/page.tsx` |
| `/cliente/obras` | página | — | `app/cliente/obras/page.tsx` |
| `/cliente/obras/[id]` | página | — | `app/cliente/obras/[id]/page.tsx` |
| `/cliente/ocorrencias` | página | — | `app/cliente/ocorrencias/page.tsx` |
| `/cliente/ocorrencias/[id]` | página | — | `app/cliente/ocorrencias/[id]/page.tsx` |
| `/cliente/ocorrencias/novo` | página | — | `app/cliente/ocorrencias/novo/page.tsx` |
| `/cliente/orcamentos` | página | — | `app/cliente/orcamentos/page.tsx` |
| `/formularios/[token]` | página | — | `app/formularios/[token]/page.tsx` |
| `/fornecedores/cotacoes/[token]` | página | — | `app/fornecedores/cotacoes/[token]/page.tsx` |
| `/login` | página | — | `app/login/page.tsx` |
| `/page.tsx` | página | — | `app/page.tsx` |
| `/selecionar-organizacao` | página | — | `app/selecionar-organizacao/page.tsx` |

## 3. Server actions

Todo arquivo `"use server"` só exporta função assíncrona (VACINA-047), conferido por `pnpm validate:server-actions`.

### `app/actions/access-control.ts`

| Função | Guarda |
|---|---|
| `assignProfileToUser` | administracao:manage |
| `createAccessProfile` | administracao:manage |
| `revokeProfileFromUser` | administracao:manage |
| `setApplicationState` | administracao:manage |
| `setProfileAccessLevel` | administracao:manage |
| `setUserCapabilityOverride` | administracao:manage |

### `app/actions/advanced-signatures.ts`

| Função | Guarda |
|---|---|
| `addAdvancedSignatureField` | assinaturas:update |
| `createAdvancedEnvelope` | assinaturas:sign |
| `createAdvancedSignatureDocument` | assinaturas:create |
| `finalizeAdvancedEnvelope` | assinaturas:sign |
| `freezeAdvancedSignatureLayout` | assinaturas:sign |
| `queueAdvancedSignatureCopy` | assinaturas:release_to_client |

### `app/actions/auth.ts`

| Função | Guarda |
|---|---|
| `signIn` | — |
| `signOut` | — |

### `app/actions/avisos.ts`

| Função | Guarda |
|---|---|
| `marcarVisto` | sessão da organização |

### `app/actions/budget-versions.ts`

| Função | Guarda |
|---|---|
| `createNextBudgetVersion` | sessão da organização |

### `app/actions/budgets.ts`

| Função | Guarda |
|---|---|
| `addCubReferenceItem` | — |
| `addManualBudgetItem` | — |
| `calculateBudgetVersion` | sessão da organização |
| `decideBudgetApproval` | papéis: SUPER_ADMIN, DIRECAO, ADMINISTRADOR, FINANCEIRO |
| `freezeBudgetVersion` | papéis: SUPER_ADMIN, DIRECAO, ADMINISTRADOR, FINANCEIRO |
| `removeBudgetItem` | sessão da organização |
| `updateBudgetPricing` | — |

### `app/actions/commercial-documents.ts`

| Função | Guarda |
|---|---|
| `createAmendment` | aditivos:create |
| `createContractFromProposal` | contratos:create |

### `app/actions/create-budget.ts`

| Função | Guarda |
|---|---|
| `createBudget` | papéis: SUPER_ADMIN, DIRECAO, ADMINISTRADOR, COMERCIAL, ORCAMENTISTA |

### `app/actions/crm-opportunities.ts`

| Função | Guarda |
|---|---|
| `createCrmOpportunitySafe` | crm:create |

### `app/actions/cub.ts`

| Função | Guarda |
|---|---|
| `registrarCubManual` | sessão da organização |

### `app/actions/documentos.ts`

| Função | Guarda |
|---|---|
| `definirTiposDoAplicativo` | administracao:manage |
| `duplicarModelo` | — |
| `emitirDocumento` | — |
| `excluirModelo` | — |
| `salvarModelo` | — |
| `trazerPadroesDaPlataforma` | — |

### `app/actions/flexible-workflows.ts`

| Função | Guarda |
|---|---|
| `createFlexibleProject` | sessão da organização |
| `createFlexibleProposal` | propostas:create |
| `decideFlexibleProposalDiscount` | papéis: SUPER_ADMIN, DIRECAO |
| `prepareProposalUpload` | propostas:create |

### `app/actions/inventory-extra.ts`

| Função | Guarda |
|---|---|
| `alternarCategoriaDeEstoque` | estoque:update |
| `alternarUnidadeDeEstoque` | estoque:update |
| `createInventoryCategory` | estoque:create |
| `createInventoryLot` | estoque:create |
| `createInventoryMaintenance` | estoque:update |
| `createInventoryUnit` | estoque:create |

### `app/actions/inventory-stocktake.ts`

| Função | Guarda |
|---|---|
| `addInventoryStocktakeLine` | estoque:update |

### `app/actions/inventory.ts`

| Função | Guarda |
|---|---|
| `approveInventoryStocktake` | estoque:approve |
| `assignInventoryAsset` | estoque:update |
| `consumeInventoryReservation` | estoque:update |
| `createInventoryAsset` | estoque:create |
| `createInventoryItem` | estoque:create |
| `createInventoryLocation` | estoque:create |
| `createInventoryMovement` | estoque:create |
| `createInventoryReservation` | estoque:create |
| `createInventoryWarehouse` | estoque:create |
| `importProcurementReceipt` | estoque:update |
| `mapProcurementItemToInventory` | estoque:update |
| `postInventoryMovement` | estoque:update |
| `postInventoryStocktake` | estoque:manage |
| `releaseInventoryReservation` | estoque:update |
| `returnInventoryAsset` | estoque:update |
| `reverseInventoryMovement` | estoque:manage |
| `startInventoryStocktake` | estoque:manage |
| `submitInventoryStocktake` | estoque:update |
| `updateInventoryItem` | estoque:update |

### `app/actions/listas.ts`

| Função | Guarda |
|---|---|
| `alternarItemDeLista` | administracao:manage |
| `criarItemDeLista` | administracao:manage |
| `moverItemDeLista` | administracao:manage |
| `renomearItemDeLista` | administracao:manage |

### `app/actions/messaging-bots.ts`

| Função | Guarda |
|---|---|
| `saveMessagingBotProfile` | whatsapp:manage |
| `setMessagingAiBudget` | whatsapp:manage |
| `testMessagingBotDraft` | whatsapp:update |

### `app/actions/messaging-inbox.ts`

| Função | Guarda |
|---|---|
| `addMessagingConversationNote` | whatsapp:update |
| `assignMessagingConversation` | whatsapp:update |
| `assumeMessagingConversation` | whatsapp:update |
| `refreshMessagingOperatorPresence` | whatsapp:read |
| `updateMessagingOperatorPresence` | whatsapp:read |

### `app/actions/messaging-plugin-policy.ts`

| Função | Guarda |
|---|---|
| `setCanonicalMessagingPluginPolicy` | whatsapp:manage |

### `app/actions/objetos.ts`

| Função | Guarda |
|---|---|
| `acrescentarCampo` | — |
| `alternarArquivoDoCampo` | — |
| `alternarBuscaDoCampo` | — |
| `criarObjeto` | administracao:manage |
| `definirOpcoesDoCampo` | — |
| `publicarObjeto` | — |
| `removerCampo` | — |

### `app/actions/observability.ts`

| Função | Guarda |
|---|---|
| `acknowledgeAlert` | auditoria:manage |
| `createAlertRule` | auditoria:manage |
| `resolveAlert` | auditoria:manage |
| `runHealthSnapshot` | auditoria:manage |
| `updateRetentionPolicy` | auditoria:manage |

### `app/actions/operational-finance.ts`

| Função | Guarda |
|---|---|
| `createFinanceCashAccount` | financeiro:manage |
| `createFinanceCategory` | financeiro:manage |
| `createFinanceCostCenter` | financeiro:manage |
| `createFinanceEntry` | financeiro:create |
| `createFinanceMeasurement` | financeiro:create |
| `decideFinanceApproval` | financeiro:approve |
| `decideFinanceMeasurement` | financeiro:approve |
| `importContractReceivable` | financeiro:create |
| `importProcurementOrderPayable` | financeiro:create |
| `registerFinanceSettlement` | financeiro:update |
| `submitFinanceEntry` | financeiro:update |
| `submitFinanceMeasurement` | financeiro:update |

### `app/actions/operations.ts`

| Função | Guarda |
|---|---|
| `desativarResponsabilidadeOperacional` | administracao:manage |
| `registrarExcecaoOperacional` | sessão da organização |
| `salvarResponsabilidadeOperacional` | administracao:manage |

### `app/actions/organization-context.ts`

| Função | Guarda |
|---|---|
| `selectActiveOrganization` | — |

### `app/actions/pipeline.ts`

| Função | Guarda |
|---|---|
| `agendarAtividade` | sessão da organização |
| `alternarAtividade` | sessão da organização |
| `alternarEtapaRecolhida` | sessão da organização |
| `alternarSeguidor` | sessão da organização |
| `arquivarFunil` | sessão da organização |
| `criarCartao` | sessão da organização |
| `criarChamadoComCartao` | sessão da organização |
| `criarClienteComCartao` | sessão da organização |
| `criarEtapa` | sessão da organização |
| `criarFunil` | sessão da organização |
| `criarProjetoComCartao` | sessão da organização |
| `definirDataDoCartao` | sessão da organização |
| `definirFunilPadrao` | sessão da organização |
| `definirPrioridade` | sessão da organização |
| `definirResponsavel` | sessão da organização |
| `excluirEtapa` | sessão da organização |
| `excluirFunil` | sessão da organização |
| `moverCartao` | sessão da organização |
| `registrarObservacao` | sessão da organização |
| `registrarWhatsApp` | sessão da organização |
| `renomearEtapa` | sessão da organização |
| `renomearFunil` | sessão da organização |

### `app/actions/procurement.ts`

| Função | Guarda |
|---|---|
| `createProcurementReceipt` | compras:update |
| `createProcurementRequest` | compras:create |
| `createProcurementRfq` | compras:update |
| `createProcurementSupplier` | compras:create |
| `decideProcurementApproval` | compras:approve |
| `inviteProcurementSupplier` | compras:update |
| `openProcurementRfq` | compras:update |
| `selectProcurementQuote` | compras:update |
| `submitProcurementRequest` | compras:update |
| `submitSupplierProcurementQuote` | — |

### `app/actions/project-creation.ts`

| Função | Guarda |
|---|---|
| `createProjectFromContractSafe` | sessão da organização |

### `app/actions/project-resource-usage.ts`

| Função | Guarda |
|---|---|
| `createDailyLogResource` | sessão da organização |
| `upsertTaskResourceAllocation` | — |

### `app/actions/projects.ts`

| Função | Guarda |
|---|---|
| `addDailyLogActivity` | sessão da organização |
| `createBaseline` | sessão da organização |
| `createDailyLog` | sessão da organização |
| `createMilestone` | sessão da organização |
| `createProjectResource` | sessão da organização |
| `createTask` | — |
| `createTeam` | sessão da organização |
| `createWbsItem` | sessão da organização |
| `decideDailyLog` | sessão da organização |
| `moveTask` | sessão da organização |
| `releaseProjectDocument` | sessão da organização |
| `releaseProjectToClient` | sessão da organização |
| `submitDailyLog` | sessão da organização |
| `updateDailyLog` | sessão da organização |
| `uploadDailyLogMedia` | sessão da organização |
| `uploadProjectDocument` | sessão da organização |

### `app/actions/public-signing.ts`

| Função | Guarda |
|---|---|
| `completePublicSignatureField` | — |
| `finishPublicSignature` | — |

### `app/actions/quality.ts`

| Função | Guarda |
|---|---|
| `createQualityAssignment` | qualidade:assign_users |
| `createQualityTemplate` | qualidade:create |
| `createQualityTemplateVersion` | qualidade:update |
| `publishQualityTemplate` | qualidade:approve |
| `reviewQualityResponse` | qualidade:approve |
| `submitClientQualityForm` | — |
| `submitInternalQualityForm` | qualidade:create |
| `submitPublicQualityForm` | — |
| `uploadQualityDocument` | qualidade:create |

### `app/actions/relationship.ts`

| Função | Guarda |
|---|---|
| `addClientContact` | clientes:update |
| `addSacTicketMessage` | sac:update |
| `assignSacTicket` | sac:update |
| `convertCrmLead` | crm:update |
| `createClientSacTicket` | sac:update |
| `createCrmLead` | crm:create |
| `createRelationshipClient` | clientes:create |
| `createSacTicket` | sac:create |
| `moveCrmLeadStage` | crm:update |
| `moveCrmOpportunityStage` | crm:update |
| `rateSacTicket` | sac:update |
| `recordClientConsent` | clientes:update |
| `recordRelationshipActivity` | sac:create |
| `transitionSacTicket` | sac:update |
| `updateRelationshipClient` | clientes:update |
| `uploadClientSacTicketAttachment` | — |
| `uploadSacTicketAttachment` | — |

### `app/actions/reports.ts`

| Função | Guarda |
|---|---|
| `archiveReportView` | relatorios:delete |
| `generateReportSnapshot` | relatorios:update |
| `saveReportTarget` | relatorios:manage |
| `saveReportView` | relatorios:create |

### `app/actions/schedule.ts`

| Função | Guarda |
|---|---|
| `createScheduleDependency` | sessão da organização |
| `createScheduleTask` | sessão da organização |
| `createScheduleWbs` | sessão da organização |
| `deleteScheduleDependency` | sessão da organização |
| `updateScheduleTask` | — |

### `app/actions/sinapi.ts`

| Função | Guarda |
|---|---|
| `addSinapiBudgetItem` | sessão da organização |
| `updateSinapiAutomatically` | sessão da organização |

### `app/actions/sugestoes.ts`

| Função | Guarda |
|---|---|
| `limparValorDoCatalogo` | administracao:manage |

### `app/actions/tema.ts`

| Função | Guarda |
|---|---|
| `definirTema` | — |

### `app/actions/whatsapp.ts`

| Função | Guarda |
|---|---|
| `createWhatsAppContentBinding` | whatsapp:manage |
| `saveWhatsAppAccount` | whatsapp:manage |
| `sendWhatsAppMessage` | whatsapp:update |
| `startWhatsAppConversation` | whatsapp:create |

## 4. Módulos de `lib/`

**T** = citado por alguma suíte de teste.

| Módulo | T | Exportados |
|---|---|---|
| `@/lib/auth-errors` | sim | `dadosSegurosDoErroDeLogin`, `mensagemPublicaDeErroDeLogin` |
| `@/lib/auth` | não | `requireClientContext`, `requireOrganizationContext`, `requireUser` |
| `@/lib/authorization` | não | `getEffectiveApplications`, `hasCapability`, `requireAccessAdministration`, `requireCapability` |
| `@/lib/casca/avisos` | não | `COOKIE_VISTO_ATIVIDADES`, `COOKIE_VISTO_MENSAGENS`, `carregarAvisos` |
| `@/lib/casca/launcher-domain` | não | `clampProgress`, `formatCompactCurrency`, `formatCompactNumber`, `unavailableSummary` |
| `@/lib/casca/launcher-metrics` | não | `loadLauncherSummaries` |
| `@/lib/casca/menus` | sim | `MENUS_DO_MODULO`, `menusDe` |
| `@/lib/cost-sources/cub-fonte` | sim | `PAGINA_DO_CUB`, `buscarSerieHistoricaDoCub`, `encontrarLinkDaSerie` |
| `@/lib/cost-sources/cub-serie-historica` | sim | `TIPOLOGIAS_CUB`, `TOLERANCIA_DA_SERIE`, `dataDoSerial`, `familiaDaTipologia`, `lerSerieHistoricaDoCub`, `padraoDeAcabamento` |
| `@/lib/cost-sources/sinduscon` | sim | `SINDUSCON_CUB_FEED_URL`, `SINDUSCON_CUB_SOURCE_KEY`, `fetchLatestSindusconCub`, `findLatestCubArticleUrl`, `parseSindusconCubPublication` |
| `@/lib/documentos/biblioteca` | sim | `modelosDisponiveis`, `porTipo`, `tiposDoAplicativo` |
| `@/lib/documentos/dicionario` | sim | `ROTULO_ESCOPO`, `VARIAVEIS`, `dicionarioDeExemplo`, `variaveisDoTipo` |
| `@/lib/documentos/docx` | sim | `destinosDeLink`, `docxParaMarkdown`, `listasNumeradas`, `niveisDeTitulo` |
| `@/lib/documentos/edicao` | sim | `contarPalavras`, `envolver`, `inserir`, `inserirLink`, `inserirTabela`, `linhaEColuna`, `numerarLinhas`, `prefixarLinhas` |
| `@/lib/documentos/importar` | sim | `celulasDaLinha`, `colunaDaReferencia`, `csvParaMarkdown`, `extensaoDe`, `importarParaMarkdown`, `planilhaParaMarkdown`, `separadorDoCsv` |
| `@/lib/documentos/markdown` | sim | `escaparHTML`, `markdownParaHTML` |
| `@/lib/documentos/modelo` | sim | `escaparValor`, `extrairVariaveis`, `normalizarNome`, `renderizar`, `variaveisInexistentes` |
| `@/lib/documentos/modelos` | sim | `EMISSAO_INICIAL`, `ESTADO_INICIAL`, `LIMITE_DO_NOME`, `nomeSugerido`, `traduzirFalhaDoBanco`, `validarModelo` |
| `@/lib/documentos/resolucao` | não | `resolverDicionario` |
| `@/lib/documentos/tipos` | sim | `ROTULO_CATEGORIA`, `SUGESTAO_POR_APLICATIVO`, `TIPOS`, `categoriaDoTipo`, `categorias`, `rotuloDoTipo`, `tipo`, `tiposDaCategoria` |
| `@/lib/documentos/xml` | sim | `analisarXML`, `desescapar`, `filhos`, `primeiro`, `todos` |
| `@/lib/documentos/zip` | não | `lerZip`, `lerZipComoTexto` |
| `@/lib/domain` | não | `budgetStatusLabels`, `budgetStatuses`, `contractStatuses`, `formatCurrency`, `formatPercent`, `proposalStatuses`, `signatureStatuses` |
| `@/lib/errors/data-access` | não | `DATA_LOAD_ERROR_MESSAGE`, `mensagemDeFalha`, `reportDataAccessError` |
| `@/lib/file-security/domain` | sim | `FILE_SECURITY_ALLOWED_MIME_TYPES`, `FILE_SECURITY_MAX_BYTES`, `FILE_SECURITY_SAC_MIME_TYPES`, `FILE_SECURITY_STATUS_LABELS`, `assertFileContentSignature`, `assertFileSecurityInput`, `fileSecurityMessage`, `hasKnownContentSignature`, `parseClamAvResponse`, `sanitizeFileName` |
| `@/lib/file-security/gateway-auth` | sim | `FILE_SECURITY_GATEWAY_MAX_SKEW_SECONDS`, `FILE_SECURITY_GATEWAY_PATH`, `buildFileSecurityGatewayPayload`, `createFileSecurityGatewaySignature`, `verifyFileSecurityGatewaySignature` |
| `@/lib/file-security/health-auth` | sim | `FILE_SECURITY_HEALTH_MAX_SKEW_SECONDS`, `FILE_SECURITY_HEALTH_PATH`, `createFileSecurityHealthSignature`, `verifyFileSecurityHealthSignature` |
| `@/lib/file-security/server` | não | `checkFileSecurityProvider`, `secureUpload` |
| `@/lib/financial/cash-flow` | não | `cashFlowRisk`, `formatMoney`, `summarizeCashFlow` |
| `@/lib/forms/project-creation-state` | não | `INITIAL_PROJECT_CREATION_STATE`, `projectCreationError` |
| `@/lib/forms/report-action-state` | não | `INITIAL_REPORT_ACTION_STATE`, `reportActionError` |
| `@/lib/inventory/domain` | não | `formatInventoryCurrency`, `formatInventoryQuantity`, `movementLabel`, `movementRequiresNegative`, `movementRequiresPositive`, `normalizeInventoryDashboard` |
| `@/lib/inventory/server` | não | `loadInventoryDashboard` |
| `@/lib/listas/servidor` | sim | `listaDoEscopo`, `pertenceALista` |
| `@/lib/messaging/ai` | sim | `AI_AUTONOMY_MODES`, `validateDraftClaims` |
| `@/lib/messaging/bots.server` | não | `loadMessagingBotsWorkspace` |
| `@/lib/messaging/bots` | sim | `BOT_ALLOWED_TOOLS`, `deriveBotReadiness`, `normalizeBotTools`, `validateBotProfile` |
| `@/lib/messaging/canonical-retrieval.server` | não | — |
| `@/lib/messaging/canonical-retrieval` | sim | `BOT_TEST_IMPLEMENTED_TOOLS`, `createCanonicalMessageAiSource`, `createProjectStatusAiSource`, `rankCanonicalAiSources` |
| `@/lib/messaging/capabilities` | sim | `BAILEYS_PLANNED_CAPABILITY_MATRIX`, `CAPABILITY_SUPPORT_LEVELS`, `ENGINE_CAPABILITIES`, `META_CLOUD_CAPABILITY_MATRIX`, `WEB_CHAT_PLANNED_CAPABILITY_MATRIX`, `applyCapabilityOverrides`, `capabilityState`, `deriveMessagingUiCapabilities`, `hasEngineCapability`, `requireEngineCapability` |
| `@/lib/messaging/domain` | sim | `CANONICAL_CONVERSATION_STATUSES`, `CANONICAL_DELIVERY_STATUSES`, `CANONICAL_IDENTITY_NAMESPACES`, `CANONICAL_MESSAGE_DIRECTIONS`, `CANONICAL_MESSAGE_TYPES`, `CANONICAL_RECEIPT_TYPES`, `CHANNEL_PROVIDER_TYPES`, `IMPLEMENTED_CHANNEL_PROVIDER_TYPES`, `MESSAGING_CONTRACT_VERSION`, `PLANNED_CHANNEL_PROVIDER_TYPES`, `RESERVED_CHANNEL_PROVIDER_TYPES`, `assertCanonicalIdentity`, `assertCanonicalMessage`, `assertCanonicalReceipt`, `canonicalIdentityKey`, `createCanonicalPhoneIdentity`, `isChannelProviderType`, `normalizeCanonicalPhone` |
| `@/lib/messaging/engine` | sim | `ENGINE_SESSION_STATES`, `assertEngineCommand`, `capabilityForSendCommand` |
| `@/lib/messaging/engines/meta-cloud.server` | não | `createMetaCloudMessagingEngine` |
| `@/lib/messaging/engines/meta-cloud` | sim | — |
| `@/lib/messaging/engines/mock` | sim | — |
| `@/lib/messaging/feature-flags` | sim | `parseOrganizationProviderOverrides`, `resolveOrganizationProviderPolicies`, `resolveProviderPolicy` |
| `@/lib/messaging/homologation` | sim | `HOMOLOGATION_DAILY_RUNBOOK`, `HOMOLOGATION_REQUIREMENTS`, `assessHomologation`, `buildCurrentHomologationAssessment` |
| `@/lib/messaging/inbox.server` | não | `loadMultiproviderInbox` |
| `@/lib/messaging/inbox` | sim | `buildUnifiedInbox`, `channelStateLabel`, `deriveInboxActionAvailability`, `filterUnifiedInbox`, `messagingProviderLabel`, `resolveEffectiveOperatorPresence` |
| `@/lib/messaging/observability` | sim | `MESSAGING_METRICS`, `MESSAGING_OPERATIONS_DASHBOARD`, `METRIC_LABEL_ALLOWLIST`, `evaluateMessagingAlerts`, `structuredMessagingLog` |
| `@/lib/messaging/openai-responses-provider` | sim | `openAiMessagingEnvironmentStatus` |
| `@/lib/messaging/pilot` | sim | `CURRENT_PILOT_LIMITS`, `DEFAULT_PILOT_SLIS`, `PILOT_ABORT_CRITERIA`, `PILOT_DAILY_INCIDENT_REVIEW`, `PILOT_INSTANT_ROLLBACK`, `SYNTHETIC_PROVIDER_COMPARISON`, `assessPilotReadiness`, `currentPilotAssessment` |
| `@/lib/messaging/playbooks` | sim | `PLAYBOOK_AUTONOMY_LEVELS`, `PLAYBOOK_SENSITIVITY_LEVELS`, `assertPlaybookPolicy`, `createPlaybookExecutionSnapshot`, `reproducePlaybookExecution`, `validatePlaybookVariables` |
| `@/lib/messaging/plugin-policy` | sim | `CANONICAL_MESSAGE_PLUGIN_POLICIES`, `canonicalMessagePluginPolicy`, `normalizeMessagePluginPolicyRequest` |
| `@/lib/messaging/plugins` | sim | `createAiFallbackPlugin`, `createAntiSpamPlugin`, `createConsentPlugin`, `createDefaultMessagePlugins`, `createDocumentPlugin`, `createHandoffPlugin`, `createProjectStatusPlugin`, `createQualificationPlugin`, `createSacPlugin` |
| `@/lib/messaging/policy.server` | não | `requireMetaCloudCapability`, `resolveMetaCloudRuntimePolicy` |
| `@/lib/messaging/security` | sim | `CRITICAL_WRITES`, `MESSAGING_SECURITY_ASSETS`, `MESSAGING_STRIDE_THREATS`, `MESSAGING_TOOL_ALLOWLIST`, `MESSAGING_TRUST_BOUNDARIES`, `assertCriticalApproval`, `assertTenantScope`, `assertToolAllowed`, `buildSessionCompromisePlan`, `retentionDeadline`, `sanitizeSecurityLog` |
| `@/lib/messaging/verification` | sim | `SYNTHETIC_CHAOS_SCENARIOS`, `createSyntheticRuntimeState`, `runSyntheticBenchmark`, `runSyntheticChaosScenario` |
| `@/lib/messaging/whatsapp-compatibility` | sim | `canonicalStatusToLegacyWhatsApp`, `legacyWhatsAppAccountToCanonical`, `legacyWhatsAppContactToCanonicalIdentity`, `legacyWhatsAppConversationToCanonical`, `legacyWhatsAppMessageToCanonical`, `legacyWhatsAppStatusEventToCanonical`, `legacyWhatsAppStatusToCanonical` |
| `@/lib/modules/registry` | sim | `MODULE_BY_KEY`, `MODULE_REGISTRY`, `capabilitiesForLevel`, `moduleForPath`, `toDatabaseAccessLevel`, `toUiAccessLevel` |
| `@/lib/object-runtime/estudio` | não | `definicaoPorId`, `definicoesDaOrganizacao` |
| `@/lib/object-runtime/parecidos` | sim | `camposParecidos`, `distancia` |
| `@/lib/object-runtime/proposito` | sim | `PROPOSITOS`, `campoDoProposito`, `chaveDeCampo`, `proposito`, `propositoDoTipo` |
| `@/lib/object-runtime/spec` | sim | `FIELD_TYPES`, `MAX_FIELDS`, `OBJECT_CLASSES`, `OBJECT_SCOPES`, `SLOT_BUDGET`, `TRAITS`, `allocateSlots`, `canonicalSpecJson`, `slotFamilyFor`, `slotUsage`, `specFingerprint`, `validateSpec` |
| `@/lib/observability/domain` | não | `dateTime`, `healthLabel`, `nullableText`, `number`, `parseDashboard`, `parseEvents`, `record`, `records`, `severityLabel`, `text` |
| `@/lib/observability/server` | não | `loadObservabilityAlerts`, `loadObservabilityDashboard`, `loadObservabilityEvent`, `loadObservabilityEvents`, `loadObservabilityHealth`, `loadObservabilitySettings` |
| `@/lib/operations/notifications` | sim | `agruparNotificacoesOperacionais`, `descreverNotificacaoOperacional`, `planejarNotificacoesOperacionais` |
| `@/lib/operations/routines` | sim | `ROTINAS_OPERACIONAIS`, `executarCenariosDasPersonas` |
| `@/lib/orcamentos/composicao` | sim | `TOLERANCIA_DA_CONTA`, `motivoDoItem`, `reconciliacaoDaComposicao`, `situacaoDaPlanilhaEmPortugues` |
| `@/lib/orcamentos/cub-manual` | sim | `lerDeclaracaoDeCub` |
| `@/lib/orcamentos/cub-por-uf` | sim | `UFS_DO_BRASIL`, `UF_PADRAO`, `referenciasDaUf`, `ufDaReferencia` |
| `@/lib/orcamentos/cub` | sim | `linhasDoCub` |
| `@/lib/orcamentos/naturezas` | sim | `custoDoItem`, `rotuloDaNatureza`, `totaisPorNatureza` |
| `@/lib/organization-context` | sim | `ACTIVE_ORGANIZATION_COOKIE`, `safeInternalReturnPath` |
| `@/lib/pdf` | não | `generateCommercialPdf`, `sha256Hex` |
| `@/lib/personas/catalog` | não | `PERSONAS_OPERACIONAIS` |
| `@/lib/personas/runtime` | sim | `PERSONAS_OPERACIONAIS` |
| `@/lib/pessoas/nomes` | sim | `nomesDosUsuarios` |
| `@/lib/pipeline/atividades` | não | `ROTULO_ATIVIDADE`, `ROTULO_OBSERVACAO`, `TIPOS_ATIVIDADE`, `TIPOS_OBSERVACAO`, `ehTipoAtividade`, `saiDaCasa` |
| `@/lib/pipeline/datas` | sim | `CODIGOS_DATA`, `MARCOS`, `NATUREZAS`, `codigoDe`, `decompor`, `descrever`, `situacaoDoPrazo` |
| `@/lib/pipeline/domain` | sim | `ROTULO_TRILHA`, `TRILHAS`, `formatarData`, `formatarMoeda`, `montarColunas`, `ordenarCodigos`, `ordenarPorUrgencia`, `prazoPrincipal`, `rotuloSituacao` |
| `@/lib/pipeline/server` | não | `carregarCartao`, `carregarPipeline`, `funisDaTrilha`, `registrosDisponiveis`, `trilhasDisponiveis` |
| `@/lib/planejamento/calendario` | sim | `DIA_MS`, `REGIMES`, `REGIME_PADRAO`, `avancarDiasUteis`, `contarDias`, `diaUtilAnterior`, `ehDiaUtil`, `feriadosNaFaixa`, `feriadosNacionais`, `paraDia`, `paraIso`, `pascoa`, `proximoDiaUtil`, `regimePorChave`, `terminoPorDiasUteis` |
| `@/lib/planejamento/cronograma` | sim | `ROTULO_DEPENDENCIA`, `SIGLA_PT`, `TIPOS_DEPENDENCIA`, `cadeiaMaisLonga`, `calcular`, `ordenar` |
| `@/lib/planejamento/eap` | sim | `compararCodigos`, `diferencas`, `partes`, `proximoCodigo`, `renumerar` |
| `@/lib/planejamento/modelos-de-eap` | sim | `MINIMO_DE_OCORRENCIAS`, `modeloPara`, `modelosDeEtapa` |
| `@/lib/planejamento/modelos-servidor` | não | `modelosDeEap` |
| `@/lib/planejamento/schedule-validation` | sim | `SCHEDULE_DEPENDENCY_TYPES`, `isScheduleDependencyType`, `publicScheduleDatabaseMessage`, `wouldCreateScheduleCycle`, `wouldCreateTaskHierarchyCycle` |
| `@/lib/planilhas/pdf-texto` | sim | `LIMITES_PDF`, `decodificarAscii85`, `lerTextoDoPdf` |
| `@/lib/planilhas/xlsx` | não | `LIMITES_XLSX`, `extractZipEntry`, `listZipEntries`, `parseWorkbook` |
| `@/lib/procurement/comparison` | não | `compareProcurementQuotes`, `formatCurrency` |
| `@/lib/projects/project-creation` | sim | `PROJECT_ENTRY_MODES`, `PROJECT_STATUSES_BY_MODE`, `classifyProjectCreationProviderError`, `validateContractProject`, `validateFlexibleProject` |
| `@/lib/public-errors` | sim | `mapPublicOperationError` |
| `@/lib/quality/database` | não | `isIsoExpired`, `relationFrom`, `singleRelation` |
| `@/lib/quality/forms` | não | `evaluateQualityResponse`, `parseQualityFormSchema`, `schemaSummary` |
| `@/lib/relationship/domain` | não | `LEAD_STAGE_LABELS`, `OPPORTUNITY_STAGE_LABELS`, `TICKET_PRIORITY_LABELS`, `TICKET_STATUS_LABELS`, `formatRelationshipCurrency`, `formatRelationshipDate`, `formatRelationshipDateTime`, `normalizeClient360`, `normalizeCrmPipeline`, `normalizeSacDashboard`, `normalizeSacTicketDetail`, `safeText` |
| `@/lib/relationship/server` | não | `loadClient360`, `loadClientDirectory`, `loadClientPortalRelationship`, `loadClientSacTicket`, `loadCrmDashboard`, `loadLead`, `loadOpportunity`, `loadRelationshipOptions`, `loadSacDashboard`, `loadSacTicket` |
| `@/lib/relatorios/perdas` | sim | `MINIMO_PARA_CLASSIFICAR`, `SEM_MOTIVO`, `classificacaoUtil`, `motivosSemUso`, `pareto`, `totalPerdido` |
| `@/lib/reports/metrics` | não | `buildProjectCsv`, `evaluateMetric`, `formatReportNumber`, `normalizeReportDashboard`, `targetFor` |
| `@/lib/reports/server` | não | `defaultReportPeriod`, `loadReportDashboard` |
| `@/lib/signatures/crypto` | não | `createSigningToken`, `hashCanonical`, `sha256` |
| `@/lib/signatures/format` | sim | `canonicalJson`, `safeFileName` |
| `@/lib/signatures/webhook-state` | sim | `SIGNATURE_STATUS_BY_EVENT`, `shouldApplySignatureStatus` |
| `@/lib/sinapi/archive-layout-diagnostic` | não | `inspectSinapiArchiveLayout` |
| `@/lib/sinapi/automatic-update` | sim | `discoverLatestSinapiXlsxSource`, `discoverLatestSinapiXlsxUrl`, `inspectLatestSinapiOfficialPackage`, `runSinapiAutomaticUpdate` |
| `@/lib/sinapi/official-reference-parser` | sim | `parseSinapiOfficialReferencePackage` |
| `@/lib/sinapi/relatorio-oficial` | sim | `ABA_ANALITICA`, `UFS`, `abaDoRelatorio`, `cabecalhoDeComposicoes`, `cabecalhoDeInsumos`, `codigoDaCelula`, `codigosDaAba`, `lerAnalitico`, `lerComposicoes`, `lerInsumos`, `naturezaDaClassificacao`, `normalizar`, `precoDaCelula`, `situacaoDaPlanilha` |
| `@/lib/sinapi/source-catalog` | sim | `parseSinapiBaseDate`, `selectLatestSinapiXlsxFile` |
| `@/lib/sinapi/xlsx-parser` | sim | `parseSinapiZipPackage`, `parseWorksheetXml` |
| `@/lib/stage12` | não | `dailyLogStatusLabels`, `daysBetween`, `formatDate`, `formatPercent`, `statusBadge`, `taskColumns`, `taskStatusLabels` |
| `@/lib/sugestoes/catalogo` | sim | `ESCOPOS`, `LIMITE_DE_SUGESTOES`, `chaveDeUnidade`, `chaveDoEscopo`, `chaveNormalizada`, `comPadroes`, `mesmoValor`, `ordenarSugestoes`, `pontuacao`, `situacaoDoValor` |
| `@/lib/sugestoes/escopos` | sim | `ESCOPOS_DESCRITOS`, `PADROES_POR_ESCOPO`, `descreverEscopo`, `padroesDoEscopo` |
| `@/lib/sugestoes/servidor` | não | `registrarValorUsado`, `sugestoesDoEscopo` |
| `@/lib/supabase/admin` | não | `createSupabaseAdminClient` |
| `@/lib/supabase/browser` | não | `createSupabaseBrowserClient` |
| `@/lib/supabase/relations` | não | `isUnknownRecord`, `relationField`, `relationRecord`, `relationRecords`, `singleRelation` |
| `@/lib/supabase/server` | não | `createSupabaseServerClient` |
| `@/lib/tema` | não | `COOKIE_TEMA`, `TEMAS`, `temaValido` |
| `@/lib/validacao/br` | sim | `formatarCEP`, `formatarCNPJ`, `formatarCPF`, `formatarDocumento`, `formatarTelefone`, `normalizarEmail`, `somenteDigitos`, `validarCEP`, `validarCNPJ`, `validarCPF`, `validarDocumento`, `validarEmail`, `validarTelefone` |
| `@/lib/validacao/cep` | sim | `buscarCEP`, `interpretarRespostaViaCEP` |
| `@/lib/validacao/formulario` | sim | `checarCamposBR` |
| `@/lib/validacao/moeda` | sim | `formatarDecimal`, `formatarMoeda`, `lerMoeda`, `mascararMoeda` |
| `@/lib/whatsapp/client` | não | `registerWhatsAppPhoneNumber`, `sendWhatsAppDocument`, `sendWhatsAppTemplate`, `sendWhatsAppText`, `subscribeWhatsAppBusinessAccount`, `verifyWhatsAppPhoneNumber` |
| `@/lib/whatsapp/domain` | sim | `SOURCE_FIELDS`, `WHATSAPP_DELIVERY_STATUSES`, `WHATSAPP_SOURCE_TYPES`, `canAdvanceWhatsAppDeliveryStatus`, `hashCanonicalSource`, `isSupportWindowOpen`, `normalizePhone`, `orderedTemplateParameters`, `parseSourceToken`, `parseVariables`, `renderCanonicalText`, `verifyMetaWebhookSignature` |
| `@/lib/whatsapp/server` | não | `loadWhatsAppWorkspace` |
| `@/lib/whatsapp/source-resolver` | não | `loadWhatsAppBinding`, `resolveWhatsAppBinding` |

## 5. Funções do banco

Declaradas em migration e chamadas por `.rpc()`.

| Função | Declarada em | Chamada de |
|---|---|---|
| `accept_proposal` | `supabase/migrations/20260728232000_accept_proposal_client_audit.sql` | — (só por SQL ou trigger) |
| `acknowledge_channel_operational_alert` | `supabase/migrations/20260804230000_stage22_messaging_observability.sql` | — (só por SQL ou trigger) |
| `acknowledge_observability_alert` | `supabase/migrations/20260721122302_stage19_observability_functions.sql` | `app/actions/observability.ts` |
| `acquire_session_runtime_lease` | `supabase/migrations/20260804134000_stage22_session_runtime_leases.sql` | — (só por SQL ou trigger) |
| `add_advanced_signature_field` | `supabase/migrations/20260720054200_stage12_2_document_layout_workflow.sql` | `app/actions/advanced-signatures.ts` |
| `add_channel_conversation_note` | `supabase/migrations/20260804180000_stage22_multiprovider_inbox.sql` | `app/actions/messaging-inbox.ts` |
| `add_inventory_stocktake_line` | `supabase/migrations/20260720160530_stage17_inventory_stocktake_found_items.sql` | `app/actions/inventory-stocktake.ts` |
| `add_sac_ticket_message` | `supabase/migrations/20260721013654_stage18_sac_functions.sql` | `app/actions/relationship.ts` |
| `add_sinapi_reference_to_budget` | `supabase/migrations/20260729185000_sinapi_authenticated_rpcs_invoker_internal_audit.sql` | `app/actions/sinapi.ts` |
| `apply_signed_amendment` | `supabase/migrations/20260719234000_stage9_apply_amendment.sql` | — (só por SQL ou trigger) |
| `approve_channel_critical_write` | `supabase/migrations/20260804220000_stage22_security_hardening.sql` | — (só por SQL ou trigger) |
| `approve_inventory_stocktake` | `supabase/migrations/20260720160420_stage17_inventory_assets_stocktakes_03.sql` | `app/actions/inventory.ts` |
| `assert_channel_media_clean` | `supabase/migrations/20260804170000_stage22_secure_media.sql` | — (só por SQL ou trigger) |
| `assert_procurement_quote_item_parent_chain` | `supabase/migrations/20260723062000_r2_stage14_procurement_parent_chain.sql` | — (só por SQL ou trigger) |
| `assert_procurement_receipt_item_parent_chain` | `supabase/migrations/20260723062000_r2_stage14_procurement_parent_chain.sql` | — (só por SQL ou trigger) |
| `assert_runtime_not_killed` | `supabase/migrations/20260804134000_stage22_session_runtime_leases.sql` | — (só por SQL ou trigger) |
| `assert_session_runtime_fence` | `supabase/migrations/20260804134000_stage22_session_runtime_leases.sql` | — (só por SQL ou trigger) |
| `assign_channel_conversation` | `supabase/migrations/20260804180000_stage22_multiprovider_inbox.sql` | `app/actions/messaging-inbox.ts` |
| `assign_inventory_asset` | `supabase/migrations/20260720160400_stage17_inventory_assets_stocktakes_01.sql` | `app/actions/inventory.ts` |
| `assign_sac_ticket` | `supabase/migrations/20260721013654_stage18_sac_functions.sql` | `app/actions/relationship.ts` |
| `assign_user_access_profile` | `supabase/migrations/20260720043100_stage12_1_permission_resolution.sql` | `app/actions/access-control.ts` |
| `begin_channel_delivery_attempt` | `supabase/migrations/20260804151000_stage22_outbox_delivery.sql` | — (só por SQL ou trigger) |
| `begin_channel_media_scan` | `supabase/migrations/20260804170000_stage22_secure_media.sql` | — (só por SQL ou trigger) |
| `bump_channel_identity_cache` | `supabase/migrations/20260804160000_stage22_identity_reconciliation.sql` | — (só por SQL ou trigger) |
| `calculate_budget_version` | `supabase/migrations/20260729010000_budget_readiness_and_cost_sources.sql` | `app/actions/budgets.ts` |
| `calculate_budget_version_core` | `supabase/migrations/20260808135000_converge_budget_pricing_to_markup.sql` | — (só por SQL ou trigger) |
| `can_access_project` | `supabase/migrations/20260719223100_stage12_planning_functions.sql` | — (só por SQL ou trigger) |
| `can_access_sac_ticket` | `supabase/migrations/20260721012701_stage18_relationship_security.sql` | — (só por SQL ou trigger) |
| `can_manage_project` | `supabase/migrations/20260719223100_stage12_planning_functions.sql` | — (só por SQL ou trigger) |
| `can_write_daily_log` | `supabase/migrations/20260719223100_stage12_planning_functions.sql` | — (só por SQL ou trigger) |
| `channel_ai_immutable_invocation` | `supabase/migrations/20260804200000_stage22_ai_bridge.sql` | — (só por SQL ou trigger) |
| `channel_ai_scope_guard` | `supabase/migrations/20260804200000_stage22_ai_bridge.sql` | — (só por SQL ou trigger) |
| `channel_bot_profile_scope_guard` | `supabase/migrations/20260805003000_stage22_governed_bot_profiles.sql` | — (só por SQL ou trigger) |
| `channel_homologation_evidence_immutable` | `supabase/migrations/20260805001000_stage22_homologation_assessments.sql` | — (só por SQL ou trigger) |
| `channel_message_plugin_decision_immutable` | `supabase/migrations/20260804210000_stage22_message_plugins.sql` | — (só por SQL ou trigger) |
| `channel_message_plugin_scope_guard` | `supabase/migrations/20260804210000_stage22_message_plugins.sql` | — (só por SQL ou trigger) |
| `channel_pilot_evidence_immutable` | `supabase/migrations/20260805002000_stage22_limited_pilot.sql` | — (só por SQL ou trigger) |
| `channel_pilot_scope_guard` | `supabase/migrations/20260805002000_stage22_limited_pilot.sql` | — (só por SQL ou trigger) |
| `channel_runtime_observation_immutable` | `supabase/migrations/20260804230000_stage22_messaging_observability.sql` | — (só por SQL ou trigger) |
| `channel_security_immutable_event` | `supabase/migrations/20260804220000_stage22_security_hardening.sql` | — (só por SQL ou trigger) |
| `channel_verification_run_immutable` | `supabase/migrations/20260804235900_stage22_verification_runs.sql` | — (só por SQL ou trigger) |
| `claim_channel_ai_conversation` | `supabase/migrations/20260804200000_stage22_ai_bridge.sql` | `app/actions/messaging-bots.ts` |
| `claim_channel_ingress_events` | `supabase/migrations/20260804142000_stage22_ingress_normalization.sql` | — (só por SQL ou trigger) |
| `claim_channel_outbox_events` | `supabase/migrations/20260804011500_stage22_multiprovider_storage.sql` | — (só por SQL ou trigger) |
| `claim_ordered_channel_outbox_events` | `supabase/migrations/20260804151000_stage22_outbox_delivery.sql` | — (só por SQL ou trigger) |
| `claim_whatsapp_outbound_dispatch` | `supabase/migrations/20260805004000_stage22_whatsapp_dispatch_claim.sql` | `app/actions/whatsapp.ts` |
| `commit_channel_ai_budget` | `supabase/migrations/20260804200000_stage22_ai_bridge.sql` | `app/actions/messaging-bots.ts` |
| `compare_and_swap_channel_session_credentials` | `supabase/migrations/20260804123500_stage22_session_credential_store_function_fix.sql` | — (só por SQL ou trigger) |
| `compare_and_swap_channel_session_credentials_fenced` | `supabase/migrations/20260804134000_stage22_session_runtime_leases.sql` | — (só por SQL ou trigger) |
| `complete_channel_delivery_attempt` | `supabase/migrations/20260804151000_stage22_outbox_delivery.sql` | — (só por SQL ou trigger) |
| `complete_channel_ingress_event` | `supabase/migrations/20260804142000_stage22_ingress_normalization.sql` | — (só por SQL ou trigger) |
| `complete_channel_media_scan` | `supabase/migrations/20260804170000_stage22_secure_media.sql` | — (só por SQL ou trigger) |
| `complete_signature_business_state` | `supabase/migrations/20260728234000_signature_business_completion.sql` | `app/api/signatures/webhook/route.ts` |
| `complete_signature_conversion_job` | `supabase/migrations/20260720054100_stage12_2_tokens_and_conversion_jobs.sql` | — (só por SQL ou trigger) |
| `complete_signature_copy_delivery` | `supabase/migrations/20260810012500_sanitize_persisted_provider_errors.sql` | `app/actions/advanced-signatures.ts` |
| `complete_whatsapp_outbound_dispatch` | `supabase/migrations/20260805004000_stage22_whatsapp_dispatch_claim.sql` | `app/actions/whatsapp.ts` |
| `complete_whatsapp_outbound_message` | `supabase/migrations/20260810012500_sanitize_persisted_provider_errors.sql` | — (só por SQL ou trigger) |
| `confirm_channel_identity_alias` | `supabase/migrations/20260804160000_stage22_identity_reconciliation.sql` | — (só por SQL ou trigger) |
| `consume_channel_critical_write_approval` | `supabase/migrations/20260804220000_stage22_security_hardening.sql` | — (só por SQL ou trigger) |
| `consume_inventory_reservation` | `supabase/migrations/20260720160300_stage17_inventory_procurement_reservations.sql` | `app/actions/inventory.ts` |
| `convert_crm_lead` | `supabase/migrations/20260721013534_stage18_crm_functions.sql` | `app/actions/relationship.ts` |
| `create_advanced_signature_document` | `supabase/migrations/20260720054200_stage12_2_document_layout_workflow.sql` | `app/actions/advanced-signatures.ts` |
| `create_advanced_signature_envelope` | `supabase/migrations/20260720054200_stage12_2_document_layout_workflow.sql` | `app/actions/advanced-signatures.ts` |
| `create_amendment` | `supabase/migrations/20260719231500_stage9_workflows.sql` | `app/actions/commercial-documents.ts` |
| `create_budget` | `supabase/migrations/20260719231500_stage9_workflows.sql` | `app/actions/create-budget.ts` |
| `create_budget_version` | `supabase/migrations/20260719231500_stage9_workflows.sql` | — (só por SQL ou trigger) |
| `create_channel_outbox_for_command` | `supabase/migrations/20260804151500_stage22_outbox_delivery_compat.sql` | — (só por SQL ou trigger) |
| `create_channel_pilot_plan` | `supabase/migrations/20260805002000_stage22_limited_pilot.sql` | — (só por SQL ou trigger) |
| `create_channel_security_incident` | `supabase/migrations/20260804220000_stage22_security_hardening.sql` | — (só por SQL ou trigger) |
| `create_commercial_proposal` | `supabase/migrations/20260729163500_flexible_projects_proposals_discounts.sql` | `app/actions/flexible-workflows.ts` |
| `create_communication_playbook_version` | `supabase/migrations/20260804190000_stage22_communication_playbooks.sql` | — (só por SQL ou trigger) |
| `create_contract_from_proposal` | `supabase/migrations/20260719231500_stage9_workflows.sql` | `app/actions/commercial-documents.ts` |
| `create_crm_lead` | `supabase/migrations/20260721013534_stage18_crm_functions.sql` | `app/actions/relationship.ts` |
| `create_crm_opportunity` | `supabase/migrations/20260721013534_stage18_crm_functions.sql` | `app/actions/crm-opportunities.ts` |
| `create_finance_entry_from_contract` | `supabase/migrations/20260720123100_stage15_finance_security.sql` | `app/actions/operational-finance.ts` |
| `create_finance_entry_from_procurement_order` | `supabase/migrations/20260720123100_stage15_finance_security.sql` | `app/actions/operational-finance.ts` |
| `create_independent_project` | `supabase/migrations/20260729163500_flexible_projects_proposals_discounts.sql` | — (só por SQL ou trigger) |
| `create_independent_project_v2` | `supabase/migrations/20260729170500_project_district_and_flexible_rpc_v2.sql` | — (só por SQL ou trigger) |
| `create_independent_project_v3` | `supabase/migrations/20260729211500_safe_project_creation_workflows.sql` | `app/actions/flexible-workflows.ts` |
| `create_inventory_asset` | `supabase/migrations/20260720160650_stage17_inventory_creation_rpcs.sql` | `app/actions/inventory.ts` |
| `create_inventory_item` | `supabase/migrations/20260720160650_stage17_inventory_creation_rpcs.sql` | `app/actions/inventory.ts` |
| `create_inventory_movement` | `supabase/migrations/20260720160650_stage17_inventory_creation_rpcs.sql` | `app/actions/inventory.ts` |
| `create_inventory_reservation` | `supabase/migrations/20260720160300_stage17_inventory_procurement_reservations.sql` | `app/actions/inventory.ts` |
| `create_inventory_warehouse` | `supabase/migrations/20260720160650_stage17_inventory_creation_rpcs.sql` | `app/actions/inventory.ts` |
| `create_modular_access_profile` | `supabase/migrations/20260720043100_stage12_1_permission_resolution.sql` | `app/actions/access-control.ts` |
| `create_next_budget_version` | `supabase/migrations/20260808135000_converge_budget_pricing_to_markup.sql` | `app/actions/budget-versions.ts` |
| `create_object_definition` | `supabase/migrations/20260804001000_object_runtime_acao_de_permissao_valida.sql` | `app/actions/objetos.ts` |
| `create_operational_event` | `supabase/migrations/20260728150000_operational_client_event_origin.sql` | `app/actions/operations.ts` |
| `create_project_from_contract` | `supabase/migrations/20260729211500_safe_project_creation_workflows.sql` | — (só por SQL ou trigger) |
| `create_project_from_contract_v2` | `supabase/migrations/20260729211500_safe_project_creation_workflows.sql` | `app/actions/project-creation.ts` |
| `create_proposal_from_budget_version` | `supabase/migrations/20260728162026_workflow_documental_descobrivel.sql` | — (só por SQL ou trigger) |
| `create_report_snapshot` | `supabase/migrations/20260810012500_sanitize_persisted_provider_errors.sql` | `app/actions/reports.ts` |
| `create_sac_ticket` | `supabase/migrations/20260721015350_stage18_sac_portal_release_guard.sql` | `app/actions/pipeline.ts`, `app/actions/relationship.ts` |
| `create_sandbox_signature_envelope` | `supabase/migrations/20260719231500_stage9_workflows.sql` | — (só por SQL ou trigger) |
| `create_schedule_baseline` | `supabase/migrations/20260719223100_stage12_planning_functions.sql` | `app/actions/projects.ts` |
| `decide_budget_approval` | `supabase/migrations/20260729010000_budget_readiness_and_cost_sources.sql` | `app/actions/budgets.ts` |
| `decide_communication_playbook_version` | `supabase/migrations/20260804190000_stage22_communication_playbooks.sql` | — (só por SQL ou trigger) |
| `decide_daily_log` | `supabase/migrations/20260729000500_typed_enum_state_transitions.sql` | `app/actions/projects.ts` |
| `decide_finance_approval` | `supabase/migrations/20260720123300_stage15_finance_hardening.sql` | `app/actions/operational-finance.ts` |
| `decide_finance_measurement` | `supabase/migrations/20260720123100_stage15_finance_security.sql` | `app/actions/operational-finance.ts` |
| `decide_procurement_approval` | `supabase/migrations/20260728235500_procurement_segregation_of_duties.sql` | `app/actions/procurement.ts` |
| `decide_proposal_discount` | `supabase/migrations/20260729171500_discount_decision_preserves_proposal_readiness.sql` | `app/actions/flexible-workflows.ts` |
| `delete_channel_session_secrets` | `supabase/migrations/20260804123000_stage22_session_credential_store.sql` | — (só por SQL ou trigger) |
| `effective_module_permissions` | `supabase/migrations/20260720043100_stage12_1_permission_resolution.sql` | — (só por SQL ou trigger) |
| `enforce_inventory_direct_write_rules` | `supabase/migrations/20260720160700_stage17_inventory_hardening.sql` | — (só por SQL ou trigger) |
| `enforce_inventory_sensitive_write` | `supabase/migrations/20260720160730_stage17_inventory_sensitive_write_guard.sql` | — (só por SQL ou trigger) |
| `enqueue_channel_command` | `supabase/migrations/20260804151500_stage22_outbox_delivery_compat.sql` | — (só por SQL ou trigger) |
| `ensure_organization_module_defaults` | `supabase/migrations/20260720043100_stage12_1_permission_resolution.sql` | — (só por SQL ou trigger) |
| `ensure_organization_module_defaults_trigger` | `supabase/migrations/20260720043100_stage12_1_permission_resolution.sql` | — (só por SQL ou trigger) |
| `expire_inventory_reservations` | `supabase/migrations/20260720160300_stage17_inventory_procurement_reservations.sql` | — (só por SQL ou trigger) |
| `fail_channel_delivery_attempt` | `supabase/migrations/20260804151000_stage22_outbox_delivery.sql` | — (só por SQL ou trigger) |
| `fail_signature_conversion_job` | `supabase/migrations/20260810012500_sanitize_persisted_provider_errors.sql` | — (só por SQL ou trigger) |
| `finalize_advanced_signature_envelope` | `supabase/migrations/20260720054220_stage12_2_finalization_delivery.sql` | `app/actions/advanced-signatures.ts` |
| `finalize_procurement_quote` | `supabase/migrations/20260720103100_stage14_procurement_security.sql` | `app/actions/procurement.ts` |
| `finalize_procurement_receipt` | `supabase/migrations/20260729000500_typed_enum_state_transitions.sql` | `app/actions/procurement.ts` |
| `finance_create_installments` | `supabase/migrations/20260720123100_stage15_finance_security.sql` | — (só por SQL ou trigger) |
| `finish_sinapi_import` | `supabase/migrations/20260810012500_sanitize_persisted_provider_errors.sql` | `app/api/cost-sources/sinapi/import/route.ts`, `lib/sinapi/automatic-update.ts` |
| `fonte_de_custo_oficial` | `supabase/migrations/20260804080000_cub_registrado_a_mao_com_procedencia.sql` | — (só por SQL ou trigger) |
| `freeze_advanced_signature_layout` | `supabase/migrations/20260720054200_stage12_2_document_layout_workflow.sql` | `app/actions/advanced-signatures.ts` |
| `freeze_budget_version` | `supabase/migrations/20260729010000_budget_readiness_and_cost_sources.sql` | `app/actions/budgets.ts` |
| `freeze_quality_form_version` | `supabase/migrations/20260720080150_stage13_quality_forms_hardening.sql` | — (só por SQL ou trigger) |
| `get_advanced_signing_context` | `supabase/migrations/20260720054210_stage12_2_external_signing.sql` | `app/actions/public-signing.ts`, `app/assinar/[token]/page.tsx` |
| `get_client_360` | `supabase/migrations/20260721013941_stage18_relationship_queries.sql` | `lib/relationship/server.ts` |
| `get_client_portal_relationship` | `supabase/migrations/20260721013941_stage18_relationship_queries.sql` | `lib/relationship/server.ts` |
| `get_crm_pipeline` | `supabase/migrations/20260721013941_stage18_relationship_queries.sql` | `lib/relationship/server.ts` |
| `get_inventory_asset_detail` | `supabase/migrations/20260720160525_stage17_inventory_item_asset_detail.sql` | `app/app/estoque/ativos/[id]/page.tsx` |
| `get_inventory_dashboard` | `supabase/migrations/20260720160510_stage17_inventory_dashboard.sql` | `lib/inventory/server.ts` |
| `get_inventory_item_detail` | `supabase/migrations/20260720160525_stage17_inventory_item_asset_detail.sql` | `app/app/estoque/itens/[id]/page.tsx` |
| `get_inventory_movement_detail` | `supabase/migrations/20260720160520_stage17_inventory_movement_detail.sql` | `app/app/estoque/movimentos/[id]/page.tsx` |
| `get_observability_dashboard` | `supabase/migrations/20260723104500_r3b_observability_security_hardening.sql` | `lib/observability/server.ts` |
| `get_observability_event_detail` | `supabase/migrations/20260721220509_stage19_1_observability_detail_parity.sql` | `lib/observability/server.ts` |
| `get_observability_events` | `supabase/migrations/20260721122355_stage19_observability_unified_stream.sql` | `lib/observability/server.ts` |
| `get_procurement_invitation_by_token` | `supabase/migrations/20260720103300_stage14_procurement_hardening.sql` | `app/fornecedores/cotacoes/[token]/page.tsx` |
| `get_report_dashboard` | `supabase/migrations/20260720143100_stage16_reports_security.sql` | `app/api/relatorios/exportar/route.ts`, `app/app/relatorios/page.tsx`, `lib/reports/server.ts` |
| `get_sac_dashboard` | `supabase/migrations/20260721013941_stage18_relationship_queries.sql` | `lib/relationship/server.ts` |
| `get_sac_ticket_detail` | `supabase/migrations/20260722104500_stage20_sac_attachment_security.sql` | `lib/relationship/server.ts` |
| `guard_channel_command_scope` | `supabase/migrations/20260804011500_stage22_multiprovider_storage.sql` | — (só por SQL ou trigger) |
| `guard_channel_contact_identity_scope` | `supabase/migrations/20260804011500_stage22_multiprovider_storage.sql` | — (só por SQL ou trigger) |
| `guard_channel_delivery_account_scope` | `supabase/migrations/20260804151000_stage22_outbox_delivery.sql` | — (só por SQL ou trigger) |
| `guard_channel_identity_alias_scope` | `supabase/migrations/20260804160000_stage22_identity_reconciliation.sql` | — (só por SQL ou trigger) |
| `guard_channel_ingress_scope` | `supabase/migrations/20260804142000_stage22_ingress_normalization.sql` | — (só por SQL ou trigger) |
| `guard_channel_media_scope` | `supabase/migrations/20260804170000_stage22_secure_media.sql` | — (só por SQL ou trigger) |
| `guard_channel_media_state_transition` | `supabase/migrations/20260804170000_stage22_secure_media.sql` | — (só por SQL ou trigger) |
| `guard_channel_queue_scope` | `supabase/migrations/20260804180000_stage22_multiprovider_inbox.sql` | — (só por SQL ou trigger) |
| `guard_channel_session_secret_scope` | `supabase/migrations/20260804123000_stage22_session_credential_store.sql` | — (só por SQL ou trigger) |
| `guard_communication_playbook_immutable` | `supabase/migrations/20260804190000_stage22_communication_playbooks.sql` | — (só por SQL ou trigger) |
| `guard_official_cost_reference` | `supabase/migrations/20260804080000_cub_registrado_a_mao_com_procedencia.sql` | — (só por SQL ou trigger) |
| `guard_session_runtime_scope` | `supabase/migrations/20260804134000_stage22_session_runtime_leases.sql` | — (só por SQL ou trigger) |
| `guard_whatsapp_message_delivery_status` | `supabase/migrations/20260803192000_stage22_whatsapp_status_guard.sql` | — (só por SQL ou trigger) |
| `has_org_role` | `supabase/migrations/20260719230000_stage9_financial_contracts.sql` | — (só por SQL ou trigger) |
| `import_procurement_receipt_to_inventory` | `supabase/migrations/20260729001500_inventory_receipt_line_order.sql` | `app/actions/inventory.ts` |
| `import_sinapi_compositions_chunk` | `supabase/migrations/20260804040000_composicao_registra_custo_ausente.sql` | `app/api/cost-sources/sinapi/import/route.ts`, `lib/sinapi/automatic-update.ts` |
| `import_sinapi_inputs_chunk` | `supabase/migrations/20260729020000_sinapi_official_catalog.sql` | `app/api/cost-sources/sinapi/import/route.ts`, `lib/sinapi/automatic-update.ts` |
| `install_finance_defaults` | `supabase/migrations/20260720123200_stage15_finance_module.sql` | — (só por SQL ou trigger) |
| `install_finance_defaults_after_organization` | `supabase/migrations/20260720123200_stage15_finance_module.sql` | — (só por SQL ou trigger) |
| `install_inventory_defaults` | `supabase/migrations/20260720160600_stage17_inventory_module.sql` | — (só por SQL ou trigger) |
| `install_observability_defaults` | `supabase/migrations/20260721122436_stage19_observability_module_performance.sql` | — (só por SQL ou trigger) |
| `install_procurement_defaults` | `supabase/migrations/20260720103300_stage14_procurement_hardening.sql` | — (só por SQL ou trigger) |
| `install_procurement_defaults_after_organization` | `supabase/migrations/20260720103300_stage14_procurement_hardening.sql` | — (só por SQL ou trigger) |
| `install_quality_default_templates` | `supabase/migrations/20260720080210_stage13_quality_default_template_installer.sql` | — (só por SQL ou trigger) |
| `install_quality_defaults_after_organization` | `supabase/migrations/20260720080210_stage13_quality_default_template_installer.sql` | — (só por SQL ou trigger) |
| `install_report_defaults` | `supabase/migrations/20260720143500_stage16_reports_installer_fix.sql` | — (só por SQL ou trigger) |
| `install_stage18_relationship_defaults` | `supabase/migrations/20260721014030_stage18_relationship_module.sql` | — (só por SQL ou trigger) |
| `install_whatsapp_defaults` | `supabase/migrations/20260803190000_stage22_whatsapp_omnichannel.sql` | — (só por SQL ou trigger) |
| `install_whatsapp_defaults_after_organization` | `supabase/migrations/20260803190000_stage22_whatsapp_omnichannel.sql` | — (só por SQL ou trigger) |
| `inventory_stock_lock_key` | `supabase/migrations/20260720233052_stage17_inventory_concurrency_locks.sql` | — (só por SQL ou trigger) |
| `is_aal2` | `supabase/migrations/20260719230000_stage9_financial_contracts.sql` | — (só por SQL ou trigger) |
| `is_client_owner` | `supabase/migrations/20260721012701_stage18_relationship_security.sql` | — (só por SQL ou trigger) |
| `is_internal_member` | `supabase/migrations/20260719234500_stage9_security_hardening.sql` | — (só por SQL ou trigger) |
| `is_org_member` | `supabase/migrations/20260719230000_stage9_financial_contracts.sql` | — (só por SQL ou trigger) |
| `is_project_client` | `supabase/migrations/20260719223100_stage12_planning_functions.sql` | — (só por SQL ou trigger) |
| `limpar_valor_do_catalogo` | `supabase/migrations/20260803200000_catalogo_de_valores_usados.sql` | `app/actions/sugestoes.ts` |
| `list_advanced_signer_fields` | `supabase/migrations/20260720054210_stage12_2_external_signing.sql` | `app/actions/public-signing.ts`, `app/assinar/[token]/page.tsx` |
| `lock_signature_conversion_job` | `supabase/migrations/20260720054100_stage12_2_tokens_and_conversion_jobs.sql` | — (só por SQL ou trigger) |
| `lock_signature_delivery_event` | `supabase/migrations/20260720054341_stage12_2_delivery_worker_lock.sql` | — (só por SQL ou trigger) |
| `mark_advanced_signer_complete` | `supabase/migrations/20260720054210_stage12_2_external_signing.sql` | `app/actions/public-signing.ts` |
| `mark_quality_response_submitted` | `supabase/migrations/20260720080150_stage13_quality_forms_hardening.sql` | `app/actions/quality.ts` |
| `merge_channel_contacts` | `supabase/migrations/20260804160000_stage22_identity_reconciliation.sql` | — (só por SQL ou trigger) |
| `move_channel_failure_to_dlq` | `supabase/migrations/20260804011500_stage22_multiprovider_storage.sql` | — (só por SQL ou trigger) |
| `move_channel_ingress_to_dlq` | `supabase/migrations/20260804142000_stage22_ingress_normalization.sql` | — (só por SQL ou trigger) |
| `move_crm_lead_stage` | `supabase/migrations/20260721020003_stage18_workflow_privilege_hardening.sql` | `app/actions/relationship.ts` |
| `move_crm_opportunity_stage` | `supabase/migrations/20260803230000_motivo_de_perda_separado_da_observacao.sql` | `app/actions/relationship.ts` |
| `move_project_task` | `supabase/migrations/20260719223100_stage12_planning_functions.sql` | `app/actions/projects.ts` |
| `normalize_profile_module_permission_booleans` | `supabase/migrations/20260720143150_stage16_permission_boolean_guard.sql` | — (só por SQL ou trigger) |
| `object_definition_versions_exige_campo_ativo` | `supabase/migrations/20260804002000_object_runtime_campo_arquivado.sql` | — (só por SQL ou trigger) |
| `object_definition_versions_freeze` | `supabase/migrations/20260726090000_object_runtime_definition_catalog.sql` | — (só por SQL ou trigger) |
| `object_record_upsert` | `supabase/migrations/20260804003000_object_runtime_registros.sql` | — (só por SQL ou trigger) |
| `object_runtime_active_field_count` | `supabase/migrations/20260804002000_object_runtime_campo_arquivado.sql` | — (só por SQL ou trigger) |
| `object_runtime_allocate_slots` | `supabase/migrations/20260804002000_object_runtime_campo_arquivado.sql` | — (só por SQL ou trigger) |
| `object_runtime_slot_budget` | `supabase/migrations/20260726093000_object_runtime_publication.sql` | — (só por SQL ou trigger) |
| `object_runtime_slot_family` | `supabase/migrations/20260726093000_object_runtime_publication.sql` | — (só por SQL ou trigger) |
| `object_runtime_spec_checksum` | `supabase/migrations/20260726093000_object_runtime_publication.sql` | — (só por SQL ou trigger) |
| `observe_channel_contact_identity` | `supabase/migrations/20260804160000_stage22_identity_reconciliation.sql` | — (só por SQL ou trigger) |
| `open_channel_delivery_circuit_on_terminal_attempt` | `supabase/migrations/20260804152000_stage22_outbox_terminal_circuit.sql` | — (só por SQL ou trigger) |
| `open_procurement_rfq` | `supabase/migrations/20260720103100_stage14_procurement_security.sql` | `app/actions/procurement.ts` |
| `operational_protect_event` | `supabase/migrations/20260728103000_operational_events_notifications.sql` | — (só por SQL ou trigger) |
| `operational_validate_responsibility_persona` | `supabase/migrations/20260728150000_operational_client_event_origin.sql` | — (só por SQL ou trigger) |
| `organizations_install_inventory_defaults` | `supabase/migrations/20260720160600_stage17_inventory_module.sql` | — (só por SQL ou trigger) |
| `organizations_install_observability_defaults` | `supabase/migrations/20260721122436_stage19_observability_module_performance.sql` | — (só por SQL ou trigger) |
| `organizations_install_report_defaults` | `supabase/migrations/20260720143200_stage16_reports_module.sql` | — (só por SQL ou trigger) |
| `organizations_install_stage18_relationship_defaults` | `supabase/migrations/20260721014030_stage18_relationship_module.sql` | — (só por SQL ou trigger) |
| `persist_channel_ingress_event` | `supabase/migrations/20260804142000_stage22_ingress_normalization.sql` | — (só por SQL ou trigger) |
| `pipeline_cards_congelar_origem` | `supabase/migrations/20260726190000_pipeline_endurecimento.sql` | — (só por SQL ou trigger) |
| `pipeline_cards_registrar_etapa` | `supabase/migrations/20260726120000_pipeline_trilhas.sql` | — (só por SQL ou trigger) |
| `pipeline_codigo_data` | `supabase/migrations/20260726190000_pipeline_endurecimento.sql` | — (só por SQL ou trigger) |
| `pipeline_criar_do_preset` | `supabase/migrations/20260726123000_pipeline_presets.sql` | `app/actions/pipeline.ts` |
| `pipeline_permite` | `supabase/migrations/20260726120000_pipeline_trilhas.sql` | — (só por SQL ou trigger) |
| `pipeline_permite_cartao` | `supabase/migrations/20260726120000_pipeline_trilhas.sql` | — (só por SQL ou trigger) |
| `pipeline_preset_estagios` | `supabase/migrations/20260726190000_pipeline_endurecimento.sql` | — (só por SQL ou trigger) |
| `pipeline_presets` | `supabase/migrations/20260726190000_pipeline_endurecimento.sql` | — (só por SQL ou trigger) |
| `post_inventory_movement` | `supabase/migrations/20260720233052_stage17_inventory_concurrency_locks.sql` | `app/actions/inventory.ts` |
| `post_inventory_stocktake_adjustment` | `supabase/migrations/20260720160420_stage17_inventory_assets_stocktakes_03.sql` | `app/actions/inventory.ts` |
| `prevent_frozen_baseline_mutation` | `supabase/migrations/20260719223100_stage12_planning_functions.sql` | — (só por SQL ou trigger) |
| `prevent_frozen_budget_item_mutation` | `supabase/migrations/20260719231500_stage9_workflows.sql` | — (só por SQL ou trigger) |
| `prevent_frozen_budget_version_mutation` | `supabase/migrations/20260808135000_converge_budget_pricing_to_markup.sql` | — (só por SQL ou trigger) |
| `prevent_released_document_mutation` | `supabase/migrations/20260719223100_stage12_planning_functions.sql` | — (só por SQL ou trigger) |
| `protect_completed_report_snapshot` | `supabase/migrations/20260720143000_stage16_reports_schema.sql` | — (só por SQL ou trigger) |
| `protect_inventory_asset_custody` | `supabase/migrations/20260720160740_stage17_inventory_state_guards.sql` | — (só por SQL ou trigger) |
| `protect_inventory_movement` | `supabase/migrations/20260720160200_stage17_inventory_movement_functions.sql` | — (só por SQL ou trigger) |
| `protect_inventory_movement_line` | `supabase/migrations/20260720160200_stage17_inventory_movement_functions.sql` | — (só por SQL ou trigger) |
| `protect_inventory_receipt_import` | `supabase/migrations/20260720160200_stage17_inventory_movement_functions.sql` | — (só por SQL ou trigger) |
| `protect_inventory_stocktake` | `supabase/migrations/20260720160400_stage17_inventory_assets_stocktakes_01.sql` | — (só por SQL ou trigger) |
| `protect_inventory_stocktake_line` | `supabase/migrations/20260720160400_stage17_inventory_assets_stocktakes_01.sql` | — (só por SQL ou trigger) |
| `protect_signature_document_version` | `supabase/migrations/20260720054220_stage12_2_finalization_delivery.sql` | — (só por SQL ou trigger) |
| `protect_signature_field_layout` | `supabase/migrations/20260720054220_stage12_2_finalization_delivery.sql` | — (só por SQL ou trigger) |
| `publish_object_definition` | `supabase/migrations/20260804001000_object_runtime_acao_de_permissao_valida.sql` | `app/actions/objetos.ts` |
| `publish_quality_form_version` | `supabase/migrations/20260720080100_stage13_quality_forms_security.sql` | `app/actions/quality.ts` |
| `quality_client_matches` | `supabase/migrations/20260720080100_stage13_quality_forms_security.sql` | — (só por SQL ou trigger) |
| `queue_signature_copy_delivery` | `supabase/migrations/20260720054220_stage12_2_finalization_delivery.sql` | `app/actions/advanced-signatures.ts` |
| `queue_whatsapp_outbound_message` | `supabase/migrations/20260803190000_stage22_whatsapp_omnichannel.sql` | `app/actions/whatsapp.ts` |
| `rate_sac_ticket` | `supabase/migrations/20260721013654_stage18_sac_functions.sql` | `app/actions/relationship.ts` |
| `recalculate_inventory_reservation_from_line` | `supabase/migrations/20260720160740_stage17_inventory_state_guards.sql` | — (só por SQL ou trigger) |
| `recalculate_inventory_reservation_status` | `supabase/migrations/20260720160700_stage17_inventory_hardening.sql` | — (só por SQL ou trigger) |
| `recalculate_project_progress` | `supabase/migrations/20260719223100_stage12_planning_functions.sql` | — (só por SQL ou trigger) |
| `reconcile_unconfirmed_channel_commands` | `supabase/migrations/20260804151000_stage22_outbox_delivery.sql` | — (só por SQL ou trigger) |
| `record_advanced_signature_field_value` | `supabase/migrations/20260720054210_stage12_2_external_signing.sql` | `app/actions/public-signing.ts` |
| `record_audit_event` | `supabase/migrations/20260721122302_stage19_observability_functions.sql` | — (só por SQL ou trigger) |
| `record_channel_ai_invocation` | `supabase/migrations/20260804200000_stage22_ai_bridge.sql` | `app/actions/messaging-bots.ts` |
| `record_channel_delivery_attempt` | `supabase/migrations/20260804011500_stage22_multiprovider_storage.sql` | — (só por SQL ou trigger) |
| `record_channel_homologation_assessment` | `supabase/migrations/20260805001000_stage22_homologation_assessments.sql` | — (só por SQL ou trigger) |
| `record_channel_homologation_rehearsal` | `supabase/migrations/20260805001000_stage22_homologation_assessments.sql` | — (só por SQL ou trigger) |
| `record_channel_message_plugin_decision` | `supabase/migrations/20260804210000_stage22_message_plugins.sql` | — (só por SQL ou trigger) |
| `record_channel_pilot_assessment` | `supabase/migrations/20260805002000_stage22_limited_pilot.sql` | — (só por SQL ou trigger) |
| `record_channel_pilot_daily_review` | `supabase/migrations/20260805002000_stage22_limited_pilot.sql` | — (só por SQL ou trigger) |
| `record_channel_runtime_observation` | `supabase/migrations/20260804230000_stage22_messaging_observability.sql` | — (só por SQL ou trigger) |
| `record_channel_sensitive_access` | `supabase/migrations/20260804220000_stage22_security_hardening.sql` | — (só por SQL ou trigger) |
| `record_channel_verification_run` | `supabase/migrations/20260804235900_stage22_verification_runs.sql` | — (só por SQL ou trigger) |
| `record_crm_activity` | `supabase/migrations/20260721013534_stage18_crm_functions.sql` | `app/actions/relationship.ts` |
| `record_observability_diagnostic` | `supabase/migrations/20260721122436_stage19_observability_module_performance.sql` | — (só por SQL ou trigger) |
| `record_report_export` | `supabase/migrations/20260720143100_stage16_reports_security.sql` | `app/api/relatorios/exportar/route.ts` |
| `refresh_budget_readiness_validations` | `supabase/migrations/20260729010000_budget_readiness_and_cost_sources.sql` | — (só por SQL ou trigger) |
| `refresh_finance_overdue_statuses` | `supabase/migrations/20260720123100_stage15_finance_security.sql` | `app/app/financeiro/page.tsx` |
| `register_channel_inbox_event` | `supabase/migrations/20260804011500_stage22_multiprovider_storage.sql` | — (só por SQL ou trigger) |
| `register_channel_media_reference` | `supabase/migrations/20260804170000_stage22_secure_media.sql` | — (só por SQL ou trigger) |
| `register_communication_playbook_execution` | `supabase/migrations/20260804190000_stage22_communication_playbooks.sql` | — (só por SQL ou trigger) |
| `register_finance_settlement` | `supabase/migrations/20260720123300_stage15_finance_hardening.sql` | — (só por SQL ou trigger) |
| `register_finance_settlement_with_attachment` | `supabase/migrations/20260720123500_stage15_finance_atomic_attachments.sql` | `app/actions/operational-finance.ts` |
| `register_procurement_invitation_access` | `supabase/migrations/20260725120000_stage20_atomic_access_counters_and_cleanup.sql` | `app/actions/procurement.ts` |
| `register_quality_public_link_access` | `supabase/migrations/20260725120000_stage20_atomic_access_counters_and_cleanup.sql` | `app/actions/quality.ts` |
| `register_sac_ticket_attachment` | `supabase/migrations/20260722104500_stage20_sac_attachment_security.sql` | `app/actions/relationship.ts` |
| `registrar_cub_manual` | `supabase/migrations/20260804080000_cub_registrado_a_mao_com_procedencia.sql` | `app/actions/cub.ts` |
| `registrar_mensagem_recebida_whatsapp` | `supabase/migrations/20260805010000_stage22_contador_de_nao_lidas_atomico.sql` | `app/api/webhooks/whatsapp/route.ts` |
| `registrar_valor_usado` | `supabase/migrations/20260803200000_catalogo_de_valores_usados.sql` | `lib/sugestoes/servidor.ts` |
| `release_channel_ai_budget` | `supabase/migrations/20260805003000_stage22_governed_bot_profiles.sql` | `app/actions/messaging-bots.ts` |
| `release_channel_ai_conversation` | `supabase/migrations/20260804200000_stage22_ai_bridge.sql` | `app/actions/messaging-bots.ts` |
| `release_inventory_reservation` | `supabase/migrations/20260720160300_stage17_inventory_procurement_reservations.sql` | `app/actions/inventory.ts` |
| `release_project_document_version` | `supabase/migrations/20260719223100_stage12_planning_functions.sql` | `app/actions/projects.ts` |
| `release_proposal_version` | `supabase/migrations/20260719231500_stage9_workflows.sql` | — (só por SQL ou trigger) |
| `release_session_runtime_lease` | `supabase/migrations/20260804134000_stage22_session_runtime_leases.sql` | — (só por SQL ou trigger) |
| `renew_session_runtime_lease` | `supabase/migrations/20260804134000_stage22_session_runtime_leases.sql` | — (só por SQL ou trigger) |
| `replay_channel_ingress_event` | `supabase/migrations/20260804142000_stage22_ingress_normalization.sql` | — (só por SQL ou trigger) |
| `replay_channel_outbox_event` | `supabase/migrations/20260804151000_stage22_outbox_delivery.sql` | — (só por SQL ou trigger) |
| `request_channel_ai_handoff` | `supabase/migrations/20260804200000_stage22_ai_bridge.sql` | — (só por SQL ou trigger) |
| `reserve_channel_ai_budget` | `supabase/migrations/20260804200000_stage22_ai_bridge.sql` | `app/actions/messaging-bots.ts` |
| `reserve_channel_delivery_capacity` | `supabase/migrations/20260804151000_stage22_outbox_delivery.sql` | — (só por SQL ou trigger) |
| `resolve_channel_operational_alert` | `supabase/migrations/20260804230000_stage22_messaging_observability.sql` | — (só por SQL ou trigger) |
| `resolve_observability_alert` | `supabase/migrations/20260721122302_stage19_observability_functions.sql` | `app/actions/observability.ts` |
| `return_inventory_asset` | `supabase/migrations/20260720160410_stage17_inventory_assets_stocktakes_02.sql` | `app/actions/inventory.ts` |
| `reverse_inventory_movement` | `supabase/migrations/20260720160200_stage17_inventory_movement_functions.sql` | `app/actions/inventory.ts` |
| `review_quality_response` | `supabase/migrations/20260720080100_stage13_quality_forms_security.sql` | `app/actions/quality.ts` |
| `revoke_user_access_profile` | `supabase/migrations/20260720043100_stage12_1_permission_resolution.sql` | `app/actions/access-control.ts` |
| `rollback_channel_provider_projection` | `supabase/migrations/20260804011500_stage22_multiprovider_storage.sql` | — (só por SQL ou trigger) |
| `run_observability_health_snapshot` | `supabase/migrations/20260723104500_r3b_observability_security_hardening.sql` | `app/actions/observability.ts` |
| `sandbox_signature_event` | `supabase/migrations/20260719234500_stage9_security_hardening.sql` | — (só por SQL ou trigger) |
| `sandbox_signature_event_core` | `supabase/migrations/20260728234000_signature_business_completion.sql` | — (só por SQL ou trigger) |
| `sanitize_audit_json` | `supabase/migrations/20260721122302_stage19_observability_functions.sql` | — (só por SQL ou trigger) |
| `save_object_definition_draft` | `supabase/migrations/20260804001000_object_runtime_acao_de_permissao_valida.sql` | `app/actions/objetos.ts` |
| `search_sinapi_references` | `supabase/migrations/20260729020000_sinapi_official_catalog.sql` | `app/app/orcamentos/sinapi/page.tsx` |
| `select_procurement_quote` | `supabase/migrations/20260720103100_stage14_procurement_security.sql` | `app/actions/procurement.ts` |
| `semear_modelos_da_empresa` | `supabase/migrations/20260803160000_semear_modelos_da_empresa.sql` | `app/actions/documentos.ts` |
| `semear_motivos_de_perda` | `supabase/migrations/20260803235000_listas_cadastradas_por_escopo.sql` | — (só por SQL ou trigger) |
| `set_channel_ai_daily_budget` | `supabase/migrations/20260805003000_stage22_governed_bot_profiles.sql` | `app/actions/messaging-bots.ts` |
| `set_channel_conversation_actor` | `supabase/migrations/20260804180000_stage22_multiprovider_inbox.sql` | — (só por SQL ou trigger) |
| `set_channel_conversation_state` | `supabase/migrations/20260804180000_stage22_multiprovider_inbox.sql` | — (só por SQL ou trigger) |
| `set_channel_message_plugin_policy` | `supabase/migrations/20260805005000_stage22_plugin_policy_canonical_order.sql` | `app/actions/messaging-plugin-policy.ts` |
| `set_channel_operator_presence` | `supabase/migrations/20260804180000_stage22_multiprovider_inbox.sql` | `app/actions/messaging-inbox.ts` |
| `set_global_messaging_runtime_kill_switch` | `supabase/migrations/20260804134000_stage22_session_runtime_leases.sql` | — (só por SQL ou trigger) |
| `set_organization_module_status` | `supabase/migrations/20260720043100_stage12_1_permission_resolution.sql` | `app/actions/access-control.ts` |
| `set_project_module_capability_override` | `supabase/migrations/20260720043300_stage12_1_project_capability_override.sql` | `app/actions/access-control.ts` |
| `set_session_runtime_kill_switch` | `supabase/migrations/20260804134000_stage22_session_runtime_leases.sql` | — (só por SQL ou trigger) |
| `set_user_module_capability_override` | `supabase/migrations/20260720043100_stage12_1_permission_resolution.sql` | `app/actions/access-control.ts` |
| `stage18_generate_code` | `supabase/migrations/20260721013434_stage18_relationship_invariants.sql` | — (só por SQL ou trigger) |
| `stage18_normalize_digits` | `supabase/migrations/20260721013434_stage18_relationship_invariants.sql` | — (só por SQL ou trigger) |
| `stage18_protect_append_only` | `supabase/migrations/20260721013434_stage18_relationship_invariants.sql` | — (só por SQL ou trigger) |
| `stage18_protect_workflow_state` | `supabase/migrations/20260721020003_stage18_workflow_privilege_hardening.sql` | — (só por SQL ou trigger) |
| `stage18_validate_links` | `supabase/migrations/20260721013434_stage18_relationship_invariants.sql` | — (só por SQL ou trigger) |
| `stage19_can_read_global_diagnostics` | `supabase/migrations/20260723104500_r3b_observability_security_hardening.sql` | — (só por SQL ou trigger) |
| `stage19_protect_append_only` | `supabase/migrations/20260721100159_stage19_observability_security.sql` | — (só por SQL ou trigger) |
| `stage19_severity_rank` | `supabase/migrations/20260721122302_stage19_observability_functions.sql` | — (só por SQL ou trigger) |
| `start_inventory_stocktake` | `supabase/migrations/20260720160410_stage17_inventory_assets_stocktakes_02.sql` | `app/actions/inventory.ts` |
| `start_sinapi_import` | `supabase/migrations/20260729104500_sinapi_automatic_update_guard.sql` | `app/api/cost-sources/sinapi/import/route.ts`, `lib/sinapi/automatic-update.ts` |
| `submit_daily_log` | `supabase/migrations/20260719223100_stage12_planning_functions.sql` | `app/actions/projects.ts` |
| `submit_finance_entry` | `supabase/migrations/20260720123100_stage15_finance_security.sql` | `app/actions/operational-finance.ts` |
| `submit_finance_measurement` | `supabase/migrations/20260720123100_stage15_finance_security.sql` | `app/actions/operational-finance.ts` |
| `submit_inventory_stocktake` | `supabase/migrations/20260720160420_stage17_inventory_assets_stocktakes_03.sql` | `app/actions/inventory.ts` |
| `submit_procurement_request` | `supabase/migrations/20260720103100_stage14_procurement_security.sql` | `app/actions/procurement.ts` |
| `task_dependency_cria_ciclo` | `supabase/migrations/20260727180000_planejamento_ciclo_dependencia.sql` | — (só por SQL ou trigger) |
| `task_dependency_sem_ciclo` | `supabase/migrations/20260727180000_planejamento_ciclo_dependencia.sql` | — (só por SQL ou trigger) |
| `tg_semear_modelos_da_empresa` | `supabase/migrations/20260803160000_semear_modelos_da_empresa.sql` | — (só por SQL ou trigger) |
| `tg_semear_motivos_de_perda` | `supabase/migrations/20260803235000_listas_cadastradas_por_escopo.sql` | — (só por SQL ou trigger) |
| `tipologias_do_cub` | `supabase/migrations/20260804080000_cub_registrado_a_mao_com_procedencia.sql` | — (só por SQL ou trigger) |
| `touch_updated_at` | `supabase/migrations/20260719230000_stage9_financial_contracts.sql` | — (só por SQL ou trigger) |
| `transition_sac_ticket` | `supabase/migrations/20260721013654_stage18_sac_functions.sql` | `app/actions/relationship.ts` |
| `ufs_do_brasil` | `supabase/migrations/20260804080000_cub_registrado_a_mao_com_procedencia.sql` | — (só por SQL ou trigger) |
| `upsert_channel_bot_profile` | `supabase/migrations/20260805003000_stage22_governed_bot_profiles.sql` | `app/actions/messaging-bots.ts` |
| `upsert_channel_operational_alert` | `supabase/migrations/20260804230000_stage22_messaging_observability.sql` | — (só por SQL ou trigger) |
| `validate_finance_child_organization` | `supabase/migrations/20260720123300_stage15_finance_hardening.sql` | — (só por SQL ou trigger) |
| `validate_finance_entry_links` | `supabase/migrations/20260720123300_stage15_finance_hardening.sql` | — (só por SQL ou trigger) |
| `validate_finance_measurement_links` | `supabase/migrations/20260720123300_stage15_finance_hardening.sql` | — (só por SQL ou trigger) |
| `validate_inventory_links` | `supabase/migrations/20260720160200_stage17_inventory_movement_functions.sql` | — (só por SQL ou trigger) |
| `validate_inventory_project_scope` | `supabase/migrations/20260720233657_stage17_homologation_balance_project_scope.sql` | — (só por SQL ou trigger) |
| `validate_inventory_stocktake_adjustment_link` | `supabase/migrations/20260720160700_stage17_inventory_hardening.sql` | — (só por SQL ou trigger) |
| `validate_report_links` | `supabase/migrations/20260720143700_stage16_report_link_guard_fix.sql` | — (só por SQL ou trigger) |
| `write_audit` | `supabase/migrations/20260721122302_stage19_observability_functions.sql` | — (só por SQL ou trigger) |
| `write_sinapi_budget_item_audit` | `supabase/migrations/20260729184000_sinapi_authenticated_rpcs_invoker_audit_bridge.sql` | — (só por SQL ou trigger) |

## 6. Testes

| Suíte | Casos | O que cobre |
|---|---|---|
| `tests/access-control-security.test.ts` | 2 | administração de acesso |
| `tests/all-app-workflows.test.ts` | 2 | descoberta funcional de todos os aplicativos |
| `tests/auth-errors.test.ts` | 5 | mensagemPublicaDeErroDeLogin |
| `tests/busca-cobre-funis.test.ts` | 2 | busca da barra cobre as telas de funil |
| `tests/cep-busca.test.ts` | 11 | interpretarRespostaViaCEP; buscarCEP |
| `tests/commercial-documents-security.test.ts` | 2 | segurança das actions comerciais |
| `tests/crm-opportunity-input-guard.test.ts` | 3 | criação segura de oportunidade |
| `tests/cronograma.test.ts` | 24 | vocabulário; Término-Início (TI); Início-Início (II); Término-Término (TT) |
| `tests/cub-fonte.test.ts` | 6 | o link da série histórica é descoberto, não fixado |
| `tests/cub-serie-historica.test.ts` | 12 | o serial do Excel vira data; as tipologias da NBR 12721; leitura da série histórica |
| `tests/documentos-edicao.test.ts` | 18 | negrito, itálico e afins; prefixo por linha; inserções; barra de status |
| `tests/documentos-importacao.test.ts` | 32 | analisador de XML; estilos do Word; DOCX para Markdown; CSV |
| `tests/documentos-modelo.test.ts` | 25 | nome da variável; extração de variáveis; renderização; markdown para HTML |
| `tests/documentos-modelos.test.ts` | 26 | catálogo de tipos; o mesmo documento serve a mais de um aplicativo; variáveis por tipo; validação antes de gravar |
| `tests/eap.test.ts` | 15 | numeração da EAP; renumeração da árvore |
| `tests/file-security-gateway-auth.test.ts` | 3 | autenticação do gateway de arquivos |
| `tests/file-security-gateway-preconditions.test.ts` | 5 | pré-condições do gateway de análise de arquivos |
| `tests/file-security-health-auth.test.ts` | 4 | file security provider health authentication |
| `tests/file-security.test.ts` | 10 | file security domain |
| `tests/golden-pdf-publicado.test.ts` | 1 | golden do extrator de PDF contra o publicado |
| `tests/interface-foundation-contract.test.ts` | 11 | S-23 — fundação de interface |
| `tests/inventory-validator.test.ts` | 1 | validador do inventário de execução |
| `tests/listas.test.ts` | 6 | motivo escolhido pertence à lista |
| `tests/messaging-ai.test.ts` | 12 | ContextBuilder W-15; AiOrchestrator W-15; claim validation W-15 |
| `tests/messaging-baileys-adapter.test.ts` | 16 | Baileys W-06 dependency boundary; Baileys W-06 identity mapping; BaileysEngineAdapter outbound; BaileysEngineAdapter inbound and lifecycle |
| `tests/messaging-bots.test.ts` | 8 | perfis de bot governados; OpenAI Responses provider |
| `tests/messaging-boundary.test.ts` | 1 | Messaging engine boundary |
| `tests/messaging-canonical-retrieval.test.ts` | 10 | retrieval canônico escopado; readiness do bot |
| `tests/messaging-domain.test.ts` | 10 | Messaging canonical domain |
| `tests/messaging-engine.test.ts` | 16 | capability matrix; organization provider flags; MetaCloudMessagingEngine; MockMessagingEngine |
| `tests/messaging-gateway.test.ts` | 9 | messaging gateway W-05 |
| `tests/messaging-homologation.test.ts` | 8 | homologação W-20 |
| `tests/messaging-identities.test.ts` | 8 | Messaging identities W-11 |
| `tests/messaging-inbox.test.ts` | 9 | Messaging inbox W-13 |
| `tests/messaging-ingress.test.ts` | 9 | Messaging ingress W-09 |
| `tests/messaging-media.test.ts` | 10 | Messaging secure media W-12 |
| `tests/messaging-observability.test.ts` | 9 | observabilidade W-18 |
| `tests/messaging-outbox.test.ts` | 10 | Messaging outbox W-10 |
| `tests/messaging-pilot.test.ts` | 12 | piloto limitado W-21 |
| `tests/messaging-playbooks.test.ts` | 8 | Communication playbooks W-14 |
| `tests/messaging-plugin-policy.test.ts` | 5 | políticas canônicas de plugins |
| `tests/messaging-plugins.test.ts` | 13 | MessagePluginPipeline W-16 |
| `tests/messaging-runtime-lifecycle.test.ts` | 12 | W-08 runtime lease and lifecycle |
| `tests/messaging-security.test.ts` | 8 | threat model W-17 |
| `tests/messaging-session-credential-store.test.ts` | 13 | SessionCredentialStore W-07 |
| `tests/messaging-verification.test.ts` | 14 | W-19 chaos sintético; W-19 benchmark sintético |
| `tests/modelos-de-eap.test.ts` | 20 | o caso que a tarefa descreve; o que entra no modelo; grafia; achar o modelo do que está sendo digitado |
| `tests/module-navigation.test.tsx` | 2 | NavegacaoDoModulo |
| `tests/moeda.test.ts` | 15 | leitura de valor digitado; máscara de digitação, no padrão de caixa; exibição |
| `tests/object-runtime-error-safety.test.ts` | 3 | segurança do Estúdio de Objetos |
| `tests/object-runtime-parecidos.test.ts` | 12 | o caso que a tarefa descreve; parecido sem ser igual; o que não atrapalha quem está declarando; distância entre dois nomes |
| `tests/object-runtime-proposito.test.ts` | 17 | o vocabulário cobre a biblioteca de tipos; o que a informação faz decide o tipo; nasce filtrável quando o tipo permite; o campo que sai da resposta é publicável |
| `tests/object-runtime-spec.test.ts` | 31 | canonicalSpecJson; specFingerprint; slotFamilyFor; allocateSlots |
| `tests/operational-exception-flow-integration.test.ts` | 4 | fluxo de exceções operacionais |
| `tests/operational-notifications.test.ts` | 5 | notificações operacionais por exceção |
| `tests/operational-routines.test.ts` | 3 | runner das rotinas profissionais |
| `tests/orcamento-composicao.test.ts` | 11 | por que o custo de um item falta; a soma dos itens fecha com o custo publicado? |
| `tests/orcamento-cub-manual.test.ts` | 11 | a declaração que sai do formulário |
| `tests/orcamento-cub-por-uf.test.ts` | 9 | qual UF a tela oferece; o que a tela mostra para a UF escolhida |
| `tests/orcamento-cub.test.ts` | 14 | as tipologias semeadas da série histórica decompõem; o CUB entra decomposto quando a publicação traz a decomposição; sem decomposição publicada, nada é inventado; decomposição que não fecha não é usada |
| `tests/orcamento-naturezas.test.ts` | 12 | o custo de um item é o mesmo que o banco calcula; totais por natureza; rótulo em português |
| `tests/personas-catalog.test.ts` | 5 | catálogo operacional de personas |
| `tests/personas-db-contract.test.ts` | 4 | contrato de personas no banco |
| `tests/pipeline-datas.test.ts` | 13 | catálogo de códigos; situacaoDoPrazo |
| `tests/pipeline-domain.test.ts` | 17 | montarColunas; prazoPrincipal; ordenarPorUrgencia; ordenarCodigos |
| `tests/planilhas-pdf-texto.test.ts` | 17 | ASCII85 do PDF; texto de dentro do PDF; o que o leitor recusa |
| `tests/planning-task-integration.test.ts` | 6 | Planejamento ↔ Tarefas |
| `tests/project-creation-contract.test.ts` | 6 | criação segura de projetos |
| `tests/project-membership-resolution.test.ts` | 2 | resolução de responsáveis de projeto |
| `tests/project-resource-usage-integration.test.ts` | 3 | recursos operacionais da obra |
| `tests/proposal-direct-upload.test.ts` | 4 | upload de PDF da proposta |
| `tests/qa-contraste.test.ts` | 19 | aritmética de cor; v4 — notação color(srgb …) lida como preto; opacidade nas três notações; mínimo exigido — 3:1 só para texto grande |
| `tests/qa-persona-provisioning.test.ts` | 3 | provisionamento de personas QA |
| `tests/relatorio-perdas.test.ts` | 20 | Pareto ordena por valor, não por contagem; fatia e acumulado; casos que quebrariam a divisão; perda sem motivo entra na conta |
| `tests/report-actions-contract.test.ts` | 4 | ações seguras de relatórios |
| `tests/schedule-validation.test.ts` | 5 | schedule validation |
| `tests/security-controls.test.ts` | 11 | safeInternalReturnPath; mapPublicOperationError |
| `tests/signature-format.test.ts` | 9 | safeFileName; canonicalJson |
| `tests/signature-webhook-state.test.ts` | 7 | shouldApplySignatureStatus |
| `tests/sinapi-layout-publicado.test.ts` | 10 | — |
| `tests/sinapi-official-reference-parser.test.ts` | 15 | leitor do relatório oficial, no formato publicado hoje |
| `tests/sinapi-relatorio-oficial.test.ts` | 20 | qual aba responde por cada relatório; o código da composição está dentro da fórmula; preço em branco não é preço zero; insumos: UF é coluna |
| `tests/sinapi-source-catalog.test.ts` | 4 | catálogo oficial SINAPI da CAIXA |
| `tests/sinapi-xlsx-parser.test.ts` | 4 | parser automático do pacote SINAPI |
| `tests/sinduscon-cub.test.ts` | 3 | SindusCon-SP CUB |
| `tests/stage20-validator.test.ts` | 2 | validador semântico da Etapa 20 |
| `tests/sugestoes-unidade.test.ts` | 13 | m² e m2 são a mesma unidade; a fusão vale por escopo, não globalmente; o efeito na lista de sugestão |
| `tests/sugestoes.test.ts` | 30 | chave normalizada — o que faz três grafias serem um valor só; frequência recente; o que entra na lista; situação de um valor — o que a administração precisa distinguir |
| `tests/supabase-surface-auditor.test.ts` | 1 | auditor de superfícies Supabase |
| `tests/theme-contrast-contract.test.ts` | 1 | contrato de contraste dos estados |
| `tests/vaccine-validator.test.ts` | 1 | validador de vacinas |
| `tests/validacao-br.test.ts` | 33 | somenteDigitos; validarCPF; validarCNPJ; validarDocumento |
| `tests/validacao-cpf-referencia.test.ts` | 3 | validarCPF conferido contra a implementação de referência |
| `tests/visual-qa-capture-protocol.test.ts` | 4 | protocolo de QA visual por capturas |
| `tests/visual-target-contract.test.tsx` | 4 | contrato do alvo visual aprovado |
| `tests/whatsapp-domain.test.ts` | 9 | WhatsApp domain |

## 7. Validadores de CI

| Script |
|---|
| `scripts/validate-assercoes.mjs` |
| `scripts/validate-documentation.mjs` |
| `scripts/validate-exports-mortos.mjs` |
| `scripts/validate-extension-functions.mjs` |
| `scripts/validate-flexible-commercial-workflows.mjs` |
| `scripts/validate-inventory.mjs` |
| `scripts/validate-menus.mjs` |
| `scripts/validate-messaging-boundaries.mjs` |
| `scripts/validate-messaging-gateway.mjs` |
| `scripts/validate-messaging-ingress.mjs` |
| `scripts/validate-messaging-outbox.mjs` |
| `scripts/validate-messaging-runtime-lifecycle.mjs` |
| `scripts/validate-messaging-session-store.mjs` |
| `scripts/validate-messaging-storage.mjs` |
| `scripts/validate-messaging-w11-identities.mjs` |
| `scripts/validate-messaging-w12-media.mjs` |
| `scripts/validate-messaging-w13-inbox.mjs` |
| `scripts/validate-messaging-w14-playbooks.mjs` |
| `scripts/validate-messaging-w15-ai.mjs` |
| `scripts/validate-messaging-w16-plugins.mjs` |
| `scripts/validate-messaging-w17-security.mjs` |
| `scripts/validate-messaging-w18-observability.mjs` |
| `scripts/validate-messaging-w19-verification.mjs` |
| `scripts/validate-messaging-w20-homologation.mjs` |
| `scripts/validate-messaging-w21-pilot.mjs` |
| `scripts/validate-messaging-w22-bot-edit.mjs` |
| `scripts/validate-messaging-w22-bots-ux.mjs` |
| `scripts/validate-messaging-w22-closure.mjs` |
| `scripts/validate-messaging-w22-send-boundary.mjs` |
| `scripts/validate-migrations-applied.mjs` |
| `scripts/validate-module-keys.mjs` |
| `scripts/validate-module-qa.mjs` |
| `scripts/validate-object-runtime.mjs` |
| `scripts/validate-operational-qa-guards.mjs` |
| `scripts/validate-personas-audit.mjs` |
| `scripts/validate-pipeline.mjs` |
| `scripts/validate-postgrest-embeds.mjs` |
| `scripts/validate-server-actions.mjs` |
| `scripts/validate-stage12-1.mjs` |
| `scripts/validate-stage12-2.mjs` |
| `scripts/validate-stage12.mjs` |
| `scripts/validate-stage13.mjs` |
| `scripts/validate-stage14.mjs` |
| `scripts/validate-stage15.mjs` |
| `scripts/validate-stage16.mjs` |
| `scripts/validate-stage17.mjs` |
| `scripts/validate-stage18.mjs` |
| `scripts/validate-stage19.mjs` |
| `scripts/validate-stage20.mjs` |
| `scripts/validate-stage22.mjs` |
| `scripts/validate-stage9.mjs` |
| `scripts/validate-supabase-migrations.mjs` |
| `scripts/validate-vaccines.mjs` |

## 8. Lacunas medidas

| Lacuna | Quantidade |
|---|---|
| RPC chamada sem declaração em migration | 3 |
| Módulo de `lib/` nunca importado | 0 |
| Server action nunca referenciada | 0 |
| Módulo de `lib/` sem teste que o cite | 48 de 126 |

### Módulos sem teste que os cite

Medido, não exigido. A lista existe para escolher onde o próximo teste rende mais.

- `@/lib/auth`
- `@/lib/authorization`
- `@/lib/casca/avisos`
- `@/lib/casca/launcher-domain`
- `@/lib/casca/launcher-metrics`
- `@/lib/documentos/resolucao`
- `@/lib/documentos/zip`
- `@/lib/domain`
- `@/lib/errors/data-access`
- `@/lib/file-security/server`
- `@/lib/financial/cash-flow`
- `@/lib/forms/project-creation-state`
- `@/lib/forms/report-action-state`
- `@/lib/inventory/domain`
- `@/lib/inventory/server`
- `@/lib/messaging/bots.server`
- `@/lib/messaging/canonical-retrieval.server`
- `@/lib/messaging/engines/meta-cloud.server`
- `@/lib/messaging/inbox.server`
- `@/lib/messaging/policy.server`
- `@/lib/object-runtime/estudio`
- `@/lib/observability/domain`
- `@/lib/observability/server`
- `@/lib/pdf`
- `@/lib/personas/catalog`
- `@/lib/pipeline/atividades`
- `@/lib/pipeline/server`
- `@/lib/planejamento/modelos-servidor`
- `@/lib/planilhas/xlsx`
- `@/lib/procurement/comparison`
- `@/lib/quality/database`
- `@/lib/quality/forms`
- `@/lib/relationship/domain`
- `@/lib/relationship/server`
- `@/lib/reports/metrics`
- `@/lib/reports/server`
- `@/lib/signatures/crypto`
- `@/lib/sinapi/archive-layout-diagnostic`
- `@/lib/stage12`
- `@/lib/sugestoes/servidor`
- `@/lib/supabase/admin`
- `@/lib/supabase/browser`
- `@/lib/supabase/relations`
- `@/lib/supabase/server`
- `@/lib/tema`
- `@/lib/whatsapp/client`
- `@/lib/whatsapp/server`
- `@/lib/whatsapp/source-resolver`
