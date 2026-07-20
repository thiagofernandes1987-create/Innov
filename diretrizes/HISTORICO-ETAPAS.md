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

- [`docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md`](../docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md) — implementação funcional e arquitetura do módulo.
- [`docs/ETAPA-17-HOMOLOGACAO-POS-MERGE.md`](../docs/ETAPA-17-HOMOLOGACAO-POS-MERGE.md) — aplicação das migrations, correções pós-merge, auditorias e limitações reais.

### Linha do tempo

1. PR `#14` implementou a Etapa 17 e foi mesclado à `main` antes da homologação final do Supabase.
2. PR `#15` foi aberto para preservar a trilha corretiva sem reescrever migrations incorporadas.
3. O contêiner de trabalho foi perdido, mas o estado foi recuperado pelo GitHub, pelas diretrizes e pelo histórico remoto do Supabase.
4. Toda a sequência da Etapa 17 foi confirmada como aplicada.
5. Foram confirmadas 18 tabelas com RLS, seis views privadas, 101 FKs indexadas, nenhuma RPC anônima e guards de custo/escopo.
6. O CI atual do PR `#15` será considerado concluído somente após a validação deste documento.
7. O ambiente de homologação estava vazio, impedindo E2E autenticado com identidades reais.

### Estado final registrado

A Etapa 17 está incorporada e estruturalmente homologada. O E2E autenticado permanece requisito pré-publicação e deverá usar contas reais provisionadas pelo fluxo oficial.

## Planejamento posterior

- Etapa 18 — consolidação de CRM, Clientes e SAC;
- Etapa 19 — auditoria e observabilidade;
- Etapa 20 — prontidão de produção;
- [`docs/ETAPA-21-WMS-AVANCADO-AUTOMACAO-LOGISTICA.md`](../docs/ETAPA-21-WMS-AVANCADO-AUTOMACAO-LOGISTICA.md) — WMS avançado, RFID, automação logística, fiscal e patrimonial; somente planejamento.

## Regra histórica

Documento histórico não substitui SPEC, inventário, arquitetura, módulos ou roadmap. Toda nova etapa deve atualizar documentação canônica e seu próprio relatório no mesmo PR.
