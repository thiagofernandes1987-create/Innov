# Histórico técnico das etapas

Os arquivos em `docs/` preservam decisões, migrations, testes, limitações e planos. A especificação vigente permanece em `diretrizes/`.

## Etapas 9 a 11 — Comercial e homologação

- [`docs/ETAPA-09-FINANCEIRO-CONTRATOS.md`](../docs/ETAPA-09-FINANCEIRO-CONTRATOS.md) — orçamentos, propostas, contratos, aditivos e assinatura inicial.
- [`docs/ETAPA-09-TEST-PLAN.md`](../docs/ETAPA-09-TEST-PLAN.md) — plano de testes.
- [`docs/ETAPA-10-HOMOLOGACAO-SUPABASE.md`](../docs/ETAPA-10-HOMOLOGACAO-SUPABASE.md) — preparação do Supabase.
- [`docs/ETAPA-11-HOMOLOGACAO-AUTENTICADA.md`](../docs/ETAPA-11-HOMOLOGACAO-AUTENTICADA.md) — Auth, MFA e assinatura sandbox.

## Etapa 12 — Obras, modularidade e assinatura

- [`docs/ETAPA-12-GESTAO-DE-OBRAS.md`](../docs/ETAPA-12-GESTAO-DE-OBRAS.md) — obras, planejamento, campo e portal.
- [`docs/RELATORIO-HOMOLOGACAO-ETAPA-12.md`](../docs/RELATORIO-HOMOLOGACAO-ETAPA-12.md) — evidências da homologação.
- [`docs/ADENDO-ESCOPO-MULTIOBRA-ASSINATURAS-PERMISSOES.md`](../docs/ADENDO-ESCOPO-MULTIOBRA-ASSINATURAS-PERMISSOES.md) — multiobra e acessos.
- [`docs/DECISAO-ARQUITETURAL-MODULOS-PLUG-AND-PLAY.md`](../docs/DECISAO-ARQUITETURAL-MODULOS-PLUG-AND-PLAY.md) — arquitetura modular.
- [`docs/ETAPA-12-1-NUCLEO-MODULAR-E-ACESSOS.md`](../docs/ETAPA-12-1-NUCLEO-MODULAR-E-ACESSOS.md) — perfis, capacidades e administração.
- [`docs/ETAPA-12-2-ASSINATURA-AVANCADA.md`](../docs/ETAPA-12-2-ASSINATURA-AVANCADA.md) — PDF/DOCX, campos, hashes e evidências.

## Etapas 13 a 16 — Qualidade, compras, financeiro e indicadores

- [`docs/ETAPA-13-QUALIDADE-FORMULARIOS.md`](../docs/ETAPA-13-QUALIDADE-FORMULARIOS.md) — FVS, FVM, documentos e formulários.
- [`docs/ETAPA-14-COMPRAS-SUPRIMENTOS.md`](../docs/ETAPA-14-COMPRAS-SUPRIMENTOS.md) — cotações, pedidos e recebimentos.
- [`docs/ETAPA-15-FINANCEIRO-OPERACIONAL.md`](../docs/ETAPA-15-FINANCEIRO-OPERACIONAL.md) — contas, parcelas, medições e caixa.
- [`docs/ETAPA-16-RELATORIOS-INDICADORES-EXECUTIVOS.md`](../docs/ETAPA-16-RELATORIOS-INDICADORES-EXECUTIVOS.md) — dashboards, metas, snapshots e exportações.

## Etapa 17 — Estoque, Inventário e Almoxarifado

- [`docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md`](../docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md) — contrato técnico, schema, operações e segurança.
- [`docs/RELATORIO-HOMOLOGACAO-ETAPA-17.md`](../docs/RELATORIO-HOMOLOGACAO-ETAPA-17.md) — recuperação, auditoria Supabase, correções e testes transacionais.
- [`docs/ETAPA-21-WMS-AVANCADO-AUTOMACAO-LOGISTICA.md`](../docs/ETAPA-21-WMS-AVANCADO-AUTOMACAO-LOGISTICA.md) — evolução futura para WMS avançado.

Estado: incorporada à `main`, homologada tecnicamente e com concorrência real aprovada na Etapa 20. Permanecem carga prolongada e prontidão produtiva global.

## Etapa 18 — CRM, Clientes e SAC

- [`docs/ETAPA-18-CRM-CLIENTES-SAC.md`](../docs/ETAPA-18-CRM-CLIENTES-SAC.md) — lead, oportunidade, Cliente 360, múltiplas obras, atendimento e portal.
- [`docs/ETAPA-18-E2E-CONCORRENTE-SUPABASE.md`](../docs/ETAPA-18-E2E-CONCORRENTE-SUPABASE.md) — administrador e cliente autenticados acessando simultaneamente o mesmo chamado.

### Evidências finais

- Etapa 18 incorporada à `main`;
- 10 tabelas com RLS;
- CRM, Cliente 360 e SAC homologados;
- portal restrito às obras liberadas;
- workflow protegido;
- anexos privados com SHA-256;
- E2E com duas sessões, `Promise.all`, RLS e cleanup;
- run `29883182240`: `passed`;
- cleanup: `passed`;
- históricos preservados como `immutable_history`;
- PR `#18` mesclado.

## Etapa 19 — Auditoria e Observabilidade

- [`docs/ETAPA-19-AUDITORIA-OBSERVABILIDADE.md`](../docs/ETAPA-19-AUDITORIA-OBSERVABILIDADE.md) — fluxo unificado, correlação, sanitização, alertas, health checks, diagnósticos, retenção, RLS e interface.

### Linha do tempo consolidada

1. PR `#19` empilhado sobre a Etapa 18.
2. Versão `0.19.0` sincronizada.
3. Seis migrations alinhadas ao ledger.
4. Fluxo unificado de 12 origens homologado.
5. Sanitização recursiva confirmada.
6. Evento idempotente, alerta e seis health checks aprovados.
7. Append-only bloqueado por privilégio e trigger.
8. Isolamento multiempresa confirmado.
9. Diagnósticos globais protegidos.
10. 16 FKs e zero sem índice líder.
11. Advisors revisados.
12. Dados artificiais revertidos.
13. CI verde.
14. PRs `#19` e `#20` mesclados.

## Etapa 20 — Prontidão de Produção

- [`docs/ETAPA-20-PRONTIDAO-PRODUCAO.md`](../docs/ETAPA-20-PRONTIDAO-PRODUCAO.md) — contrato geral de segurança produtiva, recuperação, anexos, provider, telemetria, retenção, incidentes, publicação e UI/UX Pro Max.
- [`docs/ETAPA-20-E2E-CONCORRENCIA-ESTOQUE.md`](../docs/ETAPA-20-E2E-CONCORRENCIA-ESTOQUE.md) — prova real de duas sessões disputando a mesma posição de estoque.
- [`docs/ETAPA-20-BACKUP-RESTAURACAO.md`](../docs/ETAPA-20-BACKUP-RESTAURACAO.md) — dump lógico, restauração isolada, equivalência, RTO e limitações externas.
- [`docs/ETAPA-20-PROTECAO-ANEXOS.md`](../docs/ETAPA-20-PROTECAO-ANEXOS.md) — fundação fail-closed para quarentena e antimalware.

### Fundação UI/UX e CI

- branch `feature/etapa-20-prontidao-producao`;
- PR `#23` em rascunho;
- `UI-UX-PRO-MAX.md` canônica;
- shell e dashboard redesenhados;
- acessibilidade e responsividade consolidadas;
- `validate:stage20` integrado ao CI;
- CI completo verde.

### Concorrência de estoque

- script `run-stage20-inventory-concurrency-e2e.mjs`;
- workflow protegido no ambiente `homologation`;
- saldo inicial `10`;
- saídas concorrentes `6` e `6`;
- uma postagem aprovada e uma rejeitada;
- saldo após disputa `4`;
- saldo após cleanup `0`;
- run `29889168656`: `passed`;
- artefato `8517620520`;
- execuções duplicadas removidas;
- `VACINA-013` criada após o guard de custo sensível bloquear corretamente a primeira fixture.

### Backup e restauração

- Session pooler configurado para origem e destino distintos;
- projetos diferenciados pelo usuário `postgres.<project-ref>`;
- cliente PostgreSQL `17.10` compatível com servidor `17.6`;
- dump custom com `1.812.078` bytes e `2.798` objetos;
- 139 FKs externas para `auth` registradas e omitidas, sem copiar usuários;
- seis `DEFAULT ACLs` de roles gerenciadas registradas e omitidas;
- 144 tabelas, 144 tabelas com RLS, 196 funções e 143 migrations equivalentes;
- RTO observado de `201` segundos;
- smoke tests de módulos, estoque, auditoria e RLS aprovados;
- run `29911179764`: `passed`;
- artefato `8526039714`;
- dump e lista temporária removidos.

### Próxima frente

- proteção real de anexos com provider ClamAV e integração nos uploads;
- depois provider jurídico, telemetria, retenção, Auth/MFA, pentest, carga e publicação controlada.

## Vacinas de engenharia

O catálogo está em [`diretrizes/VACINAS.md`](./VACINAS.md). A Etapa 19 adicionou a `VACINA-011`; o fechamento pós-merge adicionou a `VACINA-012`; a concorrência da Etapa 20 adicionou a `VACINA-013`.

## Planejamento posterior

- Etapa 20 — prontidão de produção em execução incremental;
- Etapa 21 — WMS avançado, RFID, automação logística, fiscal e patrimonial.

## Regra histórica

Documento histórico não substitui SPEC, inventário, arquitetura, módulos, roadmap, manifesto ou vacinas. Toda nova etapa atualiza documentação canônica e relatório próprio no mesmo PR.
