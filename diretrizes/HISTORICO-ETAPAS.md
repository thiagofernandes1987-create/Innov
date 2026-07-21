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

- [`docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md`](../docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md) — contrato técnico, schema, operações e segurança do estoque operacional.
- [`docs/RELATORIO-HOMOLOGACAO-ETAPA-17.md`](../docs/RELATORIO-HOMOLOGACAO-ETAPA-17.md) — recuperação pós-interrupção, auditoria do Supabase, defeitos encontrados, correções e 14 testes transacionais.
- [`docs/ETAPA-21-WMS-AVANCADO-AUTOMACAO-LOGISTICA.md`](../docs/ETAPA-21-WMS-AVANCADO-AUTOMACAO-LOGISTICA.md) — fila aprovada de WMS avançado, endereçamento, RFID, ressuprimento, roteirização, fiscal e depreciação.

### Linha do tempo

1. O PR `#14` implementou a Etapa 17 e foi mesclado antes da homologação final do Supabase.
2. O PR `#15` foi aberto para correções append-only e evidências.
3. O contêiner não continha checkout recuperável; o estado foi reconstruído pelo GitHub, diretrizes e histórico remoto do Supabase.
4. Toda a sequência da Etapa 17 foi aplicada.
5. Foram adicionados locks transacionais, índices complementares e privilégio mínimo das RPCs.
6. Foram confirmadas 18 tabelas com RLS, seis views privadas, 49 políticas, 36 gatilhos e 101 FKs indexadas.
7. Bootstrap, saldo, reservas, consumo, reversão, imutabilidade e inventário físico passaram em transações revertidas.
8. RLS foi testada diretamente com duas identidades e organizações temporárias: uma linha própria, zero linha da outra organização e custo direto bloqueado.
9. Nenhuma RPC operacional permanece acessível por `anon`.
10. O teste de duas conexões realmente simultâneas ficou reservado para a Etapa 20 por limitação de credenciais do conector.
11. O PR `#15` aguarda CI final e revisão; merge depende de aprovação explícita.

### Estado registrado

A Etapa 17 está incorporada e homologada funcionalmente no Supabase. Todos os dados artificiais foram revertidos. A única validação operacional adicional é o teste de carga concorrente com conexões realmente simultâneas antes da publicação externa.

## Planejamento posterior

- Etapa 18 — consolidação de CRM, Clientes e SAC;
- Etapa 19 — auditoria e observabilidade;
- Etapa 20 — prontidão de produção e teste concorrente simultâneo;
- [`docs/ETAPA-21-WMS-AVANCADO-AUTOMACAO-LOGISTICA.md`](../docs/ETAPA-21-WMS-AVANCADO-AUTOMACAO-LOGISTICA.md) — WMS avançado, RFID, automação logística, fiscal e patrimonial; somente planejamento.

## Regra histórica

Documento histórico não substitui SPEC, inventário, arquitetura, módulos ou roadmap. Toda nova etapa atualiza documentação canônica e seu próprio relatório no mesmo PR.
