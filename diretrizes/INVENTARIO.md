# Inventário canônico — Innovar Platform

**Atualizado em:** 22 de julho de 2026  
**Base estável:** `main`  
**Commit estável analisado:** `55f4d56`  
**Branch funcional ativa:** `feature/etapa-20-prontidao-producao`  
**PR-base de regularização:** `#22`  
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
- CI estável da `main`: run `29885340336`, conclusão `success`;
- produção: não liberada.

## 2. Estado dos aplicativos

| Chave | Aplicativo | Estado | Etapa |
|---|---|---|---|
| `dashboard` | Início | operacional; fundação visual revisada na Etapa 20 | 12.1/20 |
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
| `documentos` | Documentos | operacional; proteção produtiva pendente | 12/13/20 |
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

### Pendências transferidas à Etapa 20

- duas conexões realmente simultâneas disputando a mesma posição;
- carga e volumetria;
- backup e restauração testados.

## 5. Etapa 18 — CRM, Clientes e SAC

- 10 tabelas novas com RLS;
- pipeline comercial exclusivamente interno;
- Cliente 360 multiobra;
- SAC interno e portal do cliente;
- bucket privado `crm-sac-attachments`;
- anexos com SHA-256;
- estados críticos somente por RPC;
- zero RPC operacional para `anon`;
- E2E concorrente aprovado no run `29883182240`;
- relatório final `status: passed` e `cleanup: passed`;
- históricos imutáveis preservados como `immutable_history`;
- PR `#18` mesclado na `main`.

## 6. Etapa 19 — Auditoria e Observabilidade

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

**Estado:** em implementação na branch funcional ativa.

### Fundação versionada

```text
diretrizes/UI-UX-PRO-MAX.md
docs/ETAPA-20-PRONTIDAO-PRODUCAO.md
scripts/validate-stage20.mjs
app/globals.css
app/app/layout.tsx
app/app/page.tsx
.github/workflows/ci.yml
```

### Entregas da primeira fatia

- UI/UX Pro Max instituída como diretriz permanente;
- identidade visual autoral `Arquitetura em operação`;
- classes ausentes do dashboard implementadas;
- shell com link de salto e contexto organizacional;
- dashboard responsivo sem métricas inventadas;
- foco visível, alvos de 44px e redução de movimento;
- prevenção contra preset rosa/fúcsia;
- `validate:stage20` integrado ao preflight e ao pipeline completo.

### Escopo ainda pendente

- E2E autenticado completo;
- concorrência real de estoque;
- provider jurídico real;
- revisão jurídica, contábil e LGPD;
- proteção e antimalware de anexos;
- pentest;
- backup e restauração testados;
- telemetria externa;
- worker de retenção;
- plano de incidentes;
- proteção contra senhas comprometidas;
- MFA adicional;
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
pnpm validate:stage20
pnpm lint
pnpm typecheck
pnpm test
pnpm test:python
pnpm build
```

## 11. Recuperação

Procedimento oficial: `diretrizes/RECUPERACAO.md`.

Git recupera código, migrations, testes, arquitetura, vacinas e documentação. Não recupera valores de secrets, usuários reais, conteúdo de buckets, dados operacionais, DNS ou backups físicos.
