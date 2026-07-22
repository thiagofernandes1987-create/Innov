# Inventário canônico — Innovar Platform

**Atualizado em:** 22 de julho de 2026  
**Base estável:** `main`  
**Commit estável analisado:** `55f4d56`  
**Branch de regularização:** `chore/encerramento-etapa-19`  
**PRs funcionais ativos:** nenhum  
**Versão:** 0.19.0

Este documento registra o estado necessário para recuperar, validar e continuar o projeto sem depender do contêiner ou do histórico da conversa.

## 1. Repositório e runtime

- repositório: `thiagofernandes1987-create/Innov`;
- branch estável: `main`;
- gerenciador: `pnpm@11.15.0`;
- Node.js: `>=24`;
- Python no CI: `3.13`;
- Next.js 16, React 19 e TypeScript;
- Supabase Auth, PostgreSQL, RLS e Storage;
- homologação Supabase: `wyeojufebtwblsubkunr`;
- CI da `main`: run `29885340336`, conclusão `success`;
- Vercel: status do commit estável `success`.

## 2. Estado dos aplicativos

| Chave | Aplicativo | Estado | Etapa |
|---|---|---|---|
| `dashboard` | Início | operacional | 12.1 |
| `crm` | CRM e Vendas | implementado, homologado e incorporado | 18 |
| `clientes` | Clientes | Cliente 360 multiobra implementado | 18 |
| `obras` | Obras | operacional | 12 |
| `planejamento` | Planejamento | operacional | 12 |
| `tarefas` | Tarefas | operacional | 12 |
| `diario` | Diário de Obras | operacional | 12 |
| `equipes` | Equipes | operacional | 12 |
| `orcamentos` | Orçamentos | operacional | 9 |
| `propostas` | Propostas | operacional | 9 |
| `contratos` | Contratos | operacional | 9 |
| `aditivos` | Aditivos | operacional | 9 |
| `assinaturas` | Assinaturas | operacional em sandbox; provider jurídico pendente | 9/12.2/20 |
| `documentos` | Documentos | operacional | 12/13 |
| `qualidade` | Qualidade | operacional | 13 |
| `compras` | Compras e Suprimentos | operacional | 14 |
| `estoque` | Estoque, Inventário e Almoxarifado | incorporado e homologado; produção pendente | 17/20 |
| `financeiro` | Financeiro Operacional | operacional | 15 |
| `sac` | Pós-venda e SAC | implementado, homologado e E2E aprovado | 18 |
| `relatorios` | Relatórios e Indicadores | operacional | 16 |
| `auditoria` | Auditoria e Observabilidade | implementado, homologado, CI verde e incorporado | 19 |
| `administracao` | Administração | operacional | 12.1 |

## 3. Documentação canônica

```text
diretrizes/
├── README.md
├── SPEC.md
├── ESTADO-ATUAL.json
├── INVENTARIO.md
├── MODULOS.md
├── ARQUITETURA.md
├── ROADMAP.md
├── RECUPERACAO.md
├── VACINAS.md
├── vacinas/
├── UI-UX-PRO-MAX.md
├── PADRAO-DOCUMENTACAO.md
└── HISTORICO-ETAPAS.md
```

Documentos técnicos atuais:

```text
docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md
docs/RELATORIO-HOMOLOGACAO-ETAPA-17.md
docs/ETAPA-18-CRM-CLIENTES-SAC.md
docs/ETAPA-18-E2E-CONCORRENTE-SUPABASE.md
docs/ETAPA-19-AUDITORIA-OBSERVABILIDADE.md
docs/ETAPA-20-PRONTIDAO-PRODUCAO.md
docs/ETAPA-21-WMS-AVANCADO-AUTOMACAO-LOGISTICA.md
```

## 4. Etapa 17 — Estoque

### Código principal

```text
lib/inventory/domain.ts
lib/inventory/server.ts
app/actions/inventory.ts
app/actions/inventory-extra.ts
app/actions/inventory-stocktake.ts
components/inventory/*
app/app/estoque/**
app/inventory.css
scripts/validate-stage17.mjs
supabase/tests/stage17_inventory_homologation.sql
```

### Estado técnico

- 18 tabelas com RLS;
- seis views `security_invoker=true`;
- saldo físico, reservado e disponível derivados;
- movimentos concluídos imutáveis;
- reversão vinculada;
- advisory locks por posição;
- custos protegidos;
- 14 testes transacionais com `ROLLBACK`;
- migrations locais alinhadas ao ledger remoto.

### Pendências de produção transferidas à Etapa 20

- duas conexões realmente simultâneas disputando a mesma posição;
- carga e volumetria;
- backup e restauração testados.

## 5. Etapa 18 — CRM, Clientes e SAC

### Código principal

```text
lib/relationship/domain.ts
lib/relationship/server.ts
app/actions/relationship.ts
components/relationship/*
app/app/crm/**
app/app/clientes/**
app/app/ocorrencias/**
app/cliente/ocorrencias/**
app/api/sac/attachments/[id]/route.ts
app/relationship.css
scripts/validate-stage18.mjs
supabase/tests/stage18_relationship_homologation.sql
scripts/run-stage18-concurrent-e2e.mjs
.github/workflows/stage18-concurrent-e2e.yml
```

### Estado concluído

- 10 tabelas novas com RLS;
- pipeline comercial exclusivamente interno;
- Cliente 360 multiobra;
- SAC interno e portal do cliente;
- mensagens, anexos e eventos internos ocultos do cliente;
- bucket privado `crm-sac-attachments`;
- anexos com SHA-256;
- estados críticos somente por RPC;
- zero RPC operacional para `anon`;
- E2E concorrente aprovado no run `29883182240`;
- relatório final `status: passed` e `cleanup: passed`;
- históricos imutáveis preservados como `immutable_history`;
- PR `#18` mesclado na `main`.

## 6. Etapa 19 — Auditoria e Observabilidade

### Código principal

```text
lib/observability/domain.ts
lib/observability/server.ts
app/actions/observability.ts
components/observability/observability-navigation.tsx
app/app/auditoria/**
app/observability.css
scripts/validate-stage19.mjs
supabase/tests/stage19_observability_homologation.sql
```

### Estado concluído

- seis tabelas com RLS;
- 13 políticas e seis gatilhos não internos;
- 16 FKs e zero FK sem índice líder;
- fluxo unificado de 12 origens;
- sanitização recursiva e idempotência;
- alertas, reconhecimento e resolução;
- seis health checks;
- diagnósticos globais protegidos;
- zero função da Etapa 19 executável por `anon`;
- teste oficial com `ROLLBACK`;
- advisors revisados;
- CI final verde;
- PR `#19` mesclado e conteúdo consolidado na `main` pelo PR `#20`.

### Migrations canônicas

```text
20260721100108_stage19_observability_schema.sql
20260721100159_stage19_observability_security.sql
20260721122302_stage19_observability_functions.sql
20260721122355_stage19_observability_unified_stream.sql
20260721122436_stage19_observability_module_performance.sql
20260721123305_stage19_observability_hardening.sql
```

## 7. Etapa 20 — Prontidão de Produção

**Estado:** preparação iniciada em branch própria após o fechamento documental da Etapa 19.

Escopo operacional:

- E2E autenticado completo;
- concorrência real de estoque;
- provider jurídico real;
- revisão jurídica, contábil e LGPD;
- proteção e antimalware de anexos;
- pentest;
- backup e restauração testados;
- telemetria externa;
- worker de retenção com dry-run e preservação legal;
- plano de incidentes;
- proteção contra senhas comprometidas;
- MFA adicional;
- publicação controlada;
- consolidação do design system UI/UX Pro Max adaptado à Innovar.

## 8. Storage privado

```text
commercial-documents
contract-documents
project-documents
daily-log-media
signature-artifacts
quality-documents
quality-form-attachments
procurement-attachments
finance-attachments
crm-sac-attachments
```

A Etapa 19 não cria bucket nem armazena payload bruto ou arquivo de log.

## 9. Variáveis conhecidas

Somente nomes são versionados:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
SIGNATURE_PROVIDER=
SIGNATURE_WEBHOOK_SECRET=
SIGNATURE_EMAIL_WEBHOOK_URL=
DEMO_ADMIN_PASSWORD=
DEMO_CLIENT_PASSWORD=
```

## 10. CI

```bash
pnpm validate:docs
pnpm validate:vaccines
pnpm validate:migrations
pnpm validate:stage17
pnpm validate:stage18
pnpm validate:stage19
pnpm lint
pnpm typecheck
pnpm test
pnpm test:python
pnpm build
```

## 11. Recuperação

Procedimento oficial: `diretrizes/RECUPERACAO.md`.

Git recupera código, migrations, testes, arquitetura, vacinas e documentação. Não recupera valores de secrets, usuários reais, conteúdo de buckets, dados operacionais, DNS ou backups físicos.
