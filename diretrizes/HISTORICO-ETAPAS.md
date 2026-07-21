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

### Evidências

- Etapa 18 incorporada à `main` pelo PR `#17`;
- 10 tabelas novas com RLS;
- CRM, Cliente 360 e SAC homologados com transações revertidas;
- portal restrito às obras liberadas;
- workflow de estados protegido;
- bucket privado e anexos com SHA-256;
- E2E concorrente implementado com duas sessões, `Promise.all`, RLS e cleanup;
- execução do E2E ainda bloqueada pelos secrets ausentes no ambiente GitHub `homologation`.

## Etapa 19 — Auditoria e Observabilidade

- [`docs/ETAPA-19-AUDITORIA-OBSERVABILIDADE.md`](../docs/ETAPA-19-AUDITORIA-OBSERVABILIDADE.md) — fluxo unificado, correlação, sanitização, alertas, health checks, diagnósticos, retenção, RLS e interface administrativa.

### Linha do tempo

1. PR `#19` criado como branch empilhada sobre o PR `#18`.
2. Versão `0.19.0` sincronizada entre `package.json` e SPEC.
3. Seis migrations aplicadas no Supabase e renomeadas para os timestamps exatos do ledger remoto.
4. Fluxo unificado de 12 origens homologado sem copiar as trilhas dos módulos.
5. Sanitização recursiva confirmou `[REDACTED]` em senha, token, authorization e secret.
6. Evento idempotente, alerta crítico, reconhecimento, resolução e seis health checks passaram.
7. Append-only foi bloqueado por privilégio e trigger.
8. Isolamento multiempresa foi confirmado.
9. Hardening protegeu diagnósticos globais: interno autorizado vê; sessão sem membership não vê.
10. Sete índices complementares eliminaram todas as FKs sem índice do novo domínio.
11. Advisors foram revisados; avisos globais antigos permanecem no backlog das Etapas 19/20.
12. Todos os dados artificiais foram revertidos.
13. PR `#19` permanece em rascunho por depender do PR `#18`.

### Estado atual

- seis tabelas com RLS;
- 13 políticas e seis gatilhos não internos;
- zero função da Etapa 19 acessível por `anon`;
- 16 FKs, zero sem índice líder;
- seis migrations alinhadas ao ledger;
- teste transacional oficial com `ROLLBACK`;
- documentação e validador atualizados;
- CI final do commit documental ainda precisa ser confirmado.

## Vacinas de engenharia

O catálogo está em [`diretrizes/VACINAS.md`](./VACINAS.md), com documentos individuais em `diretrizes/vacinas/`. Toda correção recorrente deve consultar, aplicar ou ampliar esse catálogo. A Etapa 19 adicionou a `VACINA-011` para identificadores reservados do Node/Next.

## Planejamento posterior

- Etapa 20 — prontidão de produção, retenção automatizada e teste de carga ampliado;
- Etapa 21 — WMS avançado, RFID, automação logística, fiscal e patrimonial.

## Regra histórica

Documento histórico não substitui SPEC, inventário, arquitetura, módulos, roadmap ou vacinas. Toda nova etapa atualiza documentação canônica e seu próprio relatório no mesmo PR.
