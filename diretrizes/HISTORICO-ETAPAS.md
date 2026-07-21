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

## Etapa 18 — CRM, Clientes e SAC

- [`docs/ETAPA-18-CRM-CLIENTES-SAC.md`](../docs/ETAPA-18-CRM-CLIENTES-SAC.md) — lead, oportunidade, Cliente 360, múltiplas obras, atendimento e portal.
- [`docs/ETAPA-18-E2E-CONCORRENTE-SUPABASE.md`](../docs/ETAPA-18-E2E-CONCORRENTE-SUPABASE.md) — administrador e cliente autenticados acessando simultaneamente o mesmo chamado no Supabase.

### Evidências registradas

- Etapa 18 incorporada à `main` pelo PR `#17`;
- 10 tabelas novas com RLS;
- CRM, Cliente 360 e SAC homologados com transações revertidas;
- portal restrito às obras liberadas;
- workflow de estados protegido;
- bucket privado e anexos com SHA-256;
- E2E concorrente usa duas sessões reais, operações em `Promise.all`, verificação de RLS e cleanup obrigatório;
- catálogo canônico de vacinas criado para impedir repetição das causas-raiz encontradas.

## Vacinas de engenharia

O catálogo atual está em [`diretrizes/VACINAS.md`](./VACINAS.md), com documentos individuais em `diretrizes/vacinas/`. Toda correção recorrente deve consultar, aplicar ou ampliar esse catálogo.

## Planejamento posterior

- Etapa 19 — auditoria e observabilidade;
- Etapa 20 — prontidão de produção e teste de carga ampliado;
- Etapa 21 — WMS avançado, RFID, automação logística, fiscal e patrimonial.

## Regra histórica

Documento histórico não substitui SPEC, inventário, arquitetura, módulos, roadmap ou vacinas. Toda nova etapa atualiza documentação canônica e seu próprio relatório no mesmo PR.
