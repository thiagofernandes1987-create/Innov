# Inventário canônico — Innovar Platform

**Atualizado em:** 22 de julho de 2026  
**Base estável:** `main`  
**Commit estável:** `55f4d56`  
**Branch funcional ativa:** `feature/etapa-20-prontidao-producao`  
**PR funcional:** `#23`, empilhado sobre o PR `#22`  
**Versão:** 0.19.0  
**Produção:** não liberada

## 1. Repositório e runtime

- repositório: `thiagofernandes1987-create/Innov`;
- pnpm `11.15.0`;
- Node.js `>=24`;
- Python `3.13` no CI;
- Next.js 16, React 19 e TypeScript;
- Supabase Auth, PostgreSQL, RLS e Storage;
- projeto de homologação: `wyeojufebtwblsubkunr`;
- CI estável da `main`: run `29885340336`, `success`;
- CI da fundação da Etapa 20: run `29888603943`, `success`.

## 2. Estado dos aplicativos

| Chave | Aplicativo | Estado | Etapa |
|---|---|---|---|
| `dashboard` | Início | operacional; fundação visual revisada | 12.1/20 |
| `crm` | CRM e Vendas | implementado e homologado | 18 |
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
| `assinaturas` | Assinaturas | sandbox; provider jurídico pendente | 9/12.2/20 |
| `documentos` | Documentos | operacional; antimalware pendente | 12/13/20 |
| `qualidade` | Qualidade | operacional | 13 |
| `compras` | Compras e Suprimentos | operacional | 14 |
| `estoque` | Estoque, Inventário e Almoxarifado | homologado; concorrência real aprovada | 17/20 |
| `financeiro` | Financeiro Operacional | operacional | 15 |
| `sac` | Pós-venda e SAC | homologado e E2E aprovado | 18 |
| `relatorios` | Relatórios e Indicadores | operacional | 16 |
| `auditoria` | Auditoria e Observabilidade | homologado e incorporado | 19 |
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
docs/ETAPA-20-E2E-CONCORRENCIA-ESTOQUE.md
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
- saldos físico, reservado e disponível derivados;
- movimentos concluídos imutáveis;
- reversão vinculada;
- advisory locks por posição;
- custos protegidos;
- 14 testes transacionais com `ROLLBACK`;
- migrations alinhadas ao ledger.

### Concorrência de produção homologada na Etapa 20

```text
workflow: 29889168656
status: passed
cleanup: passed
saldo inicial: 10
duas saídas concorrentes: 6 + 6
postagens aprovadas: 1
postagens rejeitadas: 1
saldo após disputa: 4
saldo após cleanup: 0
```

O advisory lock serializou as transações e o banco rejeitou a segunda saída por estoque disponível insuficiente.

### Pendências restantes

- carga e volumetria prolongadas;
- backup e restauração.

## 5. Etapa 18 — CRM, Clientes e SAC

- 10 tabelas com RLS;
- pipeline interno;
- Cliente 360 multiobra;
- SAC interno e portal;
- bucket `crm-sac-attachments` privado;
- anexos com SHA-256;
- estados críticos por RPC;
- zero RPC operacional para `anon`;
- E2E concorrente run `29883182240` aprovado;
- `cleanup: passed`;
- PR `#18` mesclado.

## 6. Etapa 19 — Auditoria e Observabilidade

- seis tabelas com RLS;
- 13 políticas e seis gatilhos não internos;
- 16 FKs e zero sem índice líder;
- fluxo unificado de 12 origens;
- sanitização e idempotência;
- alertas e seis health checks;
- diagnósticos globais protegidos;
- zero função acessível por `anon`;
- teste com `ROLLBACK`;
- CI verde;
- PRs `#19` e `#20` mesclados.

Migrations:

```text
20260721100108_stage19_observability_schema.sql
20260721100159_stage19_observability_security.sql
20260721122302_stage19_observability_functions.sql
20260721122355_stage19_observability_unified_stream.sql
20260721122436_stage19_observability_module_performance.sql
20260721123305_stage19_observability_hardening.sql
```

## 7. Etapa 20 — Prontidão de Produção

**Estado:** em implementação.

### Fundação UI/UX e CI concluída

```text
diretrizes/UI-UX-PRO-MAX.md
docs/ETAPA-20-PRONTIDAO-PRODUCAO.md
scripts/validate-stage20.mjs
app/globals.css
app/stage20.css
app/app/layout.tsx
app/app/page.tsx
.github/workflows/ci.yml
```

- identidade `Arquitetura em operação`;
- azul profundo, cobre e materiais naturais;
- link de salto, foco visível e alvos de 44px;
- dashboard responsivo sem métricas inventadas;
- forced colors e redução de movimento;
- prevenção contra rosa/fúcsia;
- CI completo verde.

### Concorrência real concluída

```text
scripts/run-stage20-inventory-concurrency-e2e.mjs
.github/workflows/stage20-inventory-concurrency-e2e.yml
docs/ETAPA-20-E2E-CONCORRENCIA-ESTOQUE.md
```

- duas sessões independentes;
- uma postagem e uma rejeição;
- saldo não negativo;
- cleanup com saldo zero;
- artefato `8517620520`;
- `VACINA-013` criada.

### Próxima frente

`backup_restore`.

### Escopo pendente

- backup e restauração;
- antimalware;
- provider jurídico;
- telemetria e retenção;
- incidentes;
- proteção contra senhas comprometidas;
- MFA adicional;
- carga prolongada;
- pentest;
- revisão jurídica, contábil e LGPD;
- publicação controlada.

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

## 9. Variáveis conhecidas

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

Somente nomes e finalidades são versionados.

## 10. CI

```bash
pnpm validate:docs
pnpm validate:vaccines
pnpm validate:migrations
pnpm validate:stage17
pnpm validate:stage18
pnpm validate:stage19
pnpm validate:stage20
pnpm lint
pnpm typecheck
pnpm test
pnpm test:python
pnpm build
```

## 11. Recuperação

Procedimento oficial: `diretrizes/RECUPERACAO.md`.

O Git não recupera secrets, usuários reais, dados operacionais, buckets, DNS, credenciais de providers ou backups físicos.
