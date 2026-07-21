# Inventário canônico — Innovar Platform

**Atualizado em:** 21 de julho de 2026  
**Base estável:** `main`  
**Branch atual:** `feature/etapa-19-auditoria-observabilidade`  
**PR atual:** `#19`, empilhado sobre o PR `#18`, ambos em rascunho  
**Versão:** 0.19.0

Este documento registra o necessário para recuperar, validar e continuar o projeto sem depender do contêiner ou da conversa.

## 1. Repositório e runtime

- repositório: `thiagofernandes1987-create/Innov`;
- branch estável: `main`;
- gerenciador: `pnpm@11.15.0`;
- Node.js: `>=24`;
- Python no CI: `3.13`;
- Next.js 16, React 19 e TypeScript;
- Supabase Auth, PostgreSQL, RLS e Storage;
- homologação Supabase: `wyeojufebtwblsubkunr`.

## 2. Estado dos aplicativos

| Chave | Aplicativo | Estado | Etapa |
|---|---|---|---|
| `dashboard` | Início | operacional | 12.1 |
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
| `assinaturas` | Assinaturas | operacional em sandbox | 9/12.2 |
| `documentos` | Documentos | operacional | 12/13 |
| `qualidade` | Qualidade | operacional | 13 |
| `compras` | Compras e Suprimentos | operacional | 14 |
| `estoque` | Estoque, Inventário e Almoxarifado | incorporado e homologado | 17 |
| `financeiro` | Financeiro Operacional | operacional | 15 |
| `sac` | Pós-venda e SAC | implementado e homologado | 18 |
| `relatorios` | Relatórios e Indicadores | operacional | 16 |
| `auditoria` | Auditoria e Observabilidade | implementação no PR #19 | 19 |
| `administracao` | Administração | operacional | 12.1 |

## 3. Documentação canônica

```text
diretrizes/
├── README.md
├── SPEC.md
├── INVENTARIO.md
├── MODULOS.md
├── ARQUITETURA.md
├── ROADMAP.md
├── RECUPERACAO.md
├── VACINAS.md
├── vacinas/
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

### Banco

- 18 tabelas com RLS;
- seis views `security_invoker=true`;
- saldo físico, reservado e disponível derivados;
- movimentos concluídos imutáveis;
- reversão vinculada;
- advisory locks por posição;
- custos protegidos;
- 14 testes transacionais com `ROLLBACK`.

### Migrations canônicas

```text
20260720160000_stage17_inventory_schema.sql
20260720160100_stage17_inventory_balances.sql
20260720160200_stage17_inventory_movement_functions.sql
20260720160300_stage17_inventory_procurement_reservations.sql
20260720160400_stage17_inventory_assets_stocktakes_01.sql
20260720160410_stage17_inventory_assets_stocktakes_02.sql
20260720160420_stage17_inventory_assets_stocktakes_03.sql
20260720160430_stage17_inventory_assets_stocktakes_04.sql
20260720160500_stage17_inventory_security.sql
20260720160510_stage17_inventory_dashboard.sql
20260720160520_stage17_inventory_movement_detail.sql
20260720160525_stage17_inventory_item_asset_detail.sql
20260720160530_stage17_inventory_stocktake_found_items.sql
20260720160600_stage17_inventory_module.sql
20260720160650_stage17_inventory_creation_rpcs.sql
20260720160700_stage17_inventory_hardening.sql
20260720160720_stage17_inventory_sensitive_columns.sql
20260720160730_stage17_inventory_sensitive_write_guard.sql
20260720160740_stage17_inventory_state_guards.sql
20260720233052_stage17_inventory_concurrency_locks.sql
20260720233657_stage17_homologation_balance_project_scope.sql
20260720234333_stage17_inventory_performance_indexes.sql
20260720234549_stage17_inventory_rpc_privileges.sql
```

A antiga migration monolítica `20260720160400_stage17_inventory_assets_stocktakes.sql` não existe; a implementação real está dividida em `_01` a `_04`.

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

### Tabelas novas

```text
crm_leads
client_contacts
client_consents
crm_activities
crm_opportunity_stage_history
sac_categories
sac_tickets
sac_ticket_messages
sac_ticket_attachments
sac_ticket_events
```

### Segurança

- pipeline comercial exclusivamente interno;
- cliente vê somente cadastro e chamados próprios;
- portal mostra apenas obras liberadas;
- mensagens, anexos e eventos internos não aparecem ao cliente;
- upload autorizado pela sessão e realizado server-side;
- SHA-256 e bucket privado `crm-sac-attachments`;
- estados críticos somente por RPC;
- conversão e comandos externos idempotentes;
- zero RPC operacional para `anon`.

### Migrations canônicas

```text
20260721012434_stage18_relationship_schema.sql
20260721012505_stage18_relationship_idempotency.sql
20260721012701_stage18_relationship_security.sql
20260721013434_stage18_relationship_invariants.sql
20260721013534_stage18_crm_functions.sql
20260721013547_stage18_sac_client_actors.sql
20260721013654_stage18_sac_functions.sql
20260721013941_stage18_relationship_queries.sql
20260721014030_stage18_relationship_module.sql
20260721014621_stage18_relationship_performance.sql
20260721015350_stage18_sac_portal_release_guard.sql
20260721020003_stage18_workflow_privilege_hardening.sql
```

### E2E concorrente

O PR `#18` contém duas sessões Supabase independentes, operações em paralelo, verificação de RLS e cleanup. A execução funcional permanece bloqueada porque o ambiente GitHub `homologation` não possui os cinco secrets obrigatórios.

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

### Rotas

```text
/app/auditoria
/app/auditoria/eventos
/app/auditoria/eventos/[id]
/app/auditoria/alertas
/app/auditoria/saude
/app/auditoria/configuracao
```

### Tabelas novas

```text
observability_alert_rules
observability_alerts
observability_health_checks
observability_diagnostics
observability_retention_policies
```

A tabela existente `audit_events` recebe módulo, severidade, origem, ator, cliente, hashes, request, deduplicação, ocorrência e retenção.

### RPCs principais

```text
sanitize_audit_json
record_audit_event
write_audit
acknowledge_observability_alert
resolve_observability_alert
run_observability_health_snapshot
get_observability_dashboard
get_observability_events
get_observability_event_detail
record_observability_diagnostic
install_observability_defaults
```

### Fontes do fluxo unificado

```text
audit_events
permission_change_events
signature_events
document_access_logs
quality_form_events
procurement_events
finance_events
report_events
inventory_events
sac_ticket_events
crm_opportunity_stage_history
crm_activities
```

### Segurança

- acesso somente por `auditoria:read`;
- administração para configuração e transições;
- perfis padrão: Super Administrador, Direção e Administrador;
- cliente sem acesso;
- eventos e health checks append-only;
- payloads sanitizados recursivamente;
- IP e user-agent somente como SHA-256;
- RPCs bloqueadas para `anon`;
- payload bruto de assinatura não é exposto.

### Migrations canônicas

```text
20260721093000_stage19_observability_schema.sql
20260721093100_stage19_observability_security.sql
20260721093200_stage19_observability_functions.sql
20260721093300_stage19_observability_unified_stream.sql
20260721093400_stage19_observability_module_performance.sql
```

### Estado de homologação

- validador estrutural implementado;
- teste transacional com `ROLLBACK` implementado;
- migrations ainda não aplicadas no Supabase;
- advisors ainda não revisados;
- PR `#19` permanece em rascunho e empilhado.

## 7. Storage privado

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

A Etapa 19 não cria bucket e não armazena payload bruto ou arquivo de log.

## 8. Variáveis conhecidas

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

## 9. CI

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

## 10. Recuperação

Procedimento oficial: `diretrizes/RECUPERACAO.md`.

Git recupera código, migrations, testes, arquitetura, vacinas e documentação. Não recupera valores de secrets, usuários reais, conteúdo de buckets, dados operacionais, DNS ou backups físicos.
