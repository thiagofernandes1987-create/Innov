# Inventário canônico — Innovar Platform

**Atualizado em:** 21 de julho de 2026  
**Base estável:** `main`  
**Branch atual:** `feature/etapa-18-crm-clientes-sac`  
**PR:** `#17`, em rascunho  
**Versão:** 0.18.0

Este documento registra o que precisa existir para recuperar, validar e continuar o projeto sem depender do contêiner ou da conversa.

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
| `crm` | CRM e Vendas | implementado e homologado no banco; interface em revisão | 18 |
| `clientes` | Clientes | Cliente 360 multiobra implementado; interface em revisão | 18 |
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
| `sac` | Pós-venda e SAC | implementado e homologado no banco; interface em revisão | 18 |
| `relatorios` | Relatórios e Indicadores | operacional | 16 |
| `auditoria` | Auditoria | parcial transversal | 19 planejada |
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
├── PADRAO-DOCUMENTACAO.md
└── HISTORICO-ETAPAS.md
```

Documentos técnicos atuais:

```text
docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md
docs/ETAPA-17-HOMOLOGACAO-POS-MERGE.md
docs/RELATORIO-HOMOLOGACAO-ETAPA-17.md
docs/ETAPA-18-CRM-CLIENTES-SAC.md
docs/ETAPA-21-WMS-AVANCADO-AUTOMACAO-LOGISTICA.md
```

## 4. Etapa 17 — Estoque

### Código

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

### Rotas

```text
/app/estoque
/app/estoque/itens
/app/estoque/itens/novo
/app/estoque/itens/[id]
/app/estoque/depositos
/app/estoque/depositos/[id]
/app/estoque/movimentos
/app/estoque/movimentos/novo
/app/estoque/movimentos/[id]
/app/estoque/reservas
/app/estoque/reservas/[id]
/app/estoque/ativos
/app/estoque/ativos/[id]
/app/estoque/inventarios
/app/estoque/inventarios/novo
/app/estoque/inventarios/[id]
```

### Banco

- 18 tabelas com RLS;
- seis views `security_invoker=true` sem leitura direta;
- saldo físico, reservado e disponível derivados;
- movimentos concluídos imutáveis;
- reversão vinculada;
- advisory locks por posição;
- custos protegidos;
- 14 testes transacionais com `ROLLBACK`.

### Migrations canônicas da Etapa 17

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

A antiga migration monolítica `20260720160400_stage17_inventory_assets_stocktakes.sql` não existe. A implementação real está dividida em quatro partes `_01` a `_04`. O validador foi corrigido para reconhecer a estrutura real.

## 5. Etapa 18 — CRM, Clientes e SAC

### Código

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
```

### Rotas internas

```text
/app/crm
/app/crm/leads
/app/crm/leads/novo
/app/crm/leads/[id]
/app/crm/oportunidades
/app/crm/oportunidades/novo
/app/crm/oportunidades/[id]
/app/clientes
/app/clientes/novo
/app/clientes/[id]
/app/ocorrencias
/app/ocorrencias/novo
/app/ocorrencias/[id]
```

### Portal do cliente

```text
/cliente/ocorrencias
/cliente/ocorrencias/novo
/cliente/ocorrencias/[id]
/api/sac/attachments/[id]
```

### Tabelas existentes evoluídas

- `clients`;
- `opportunities`.

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

**Total:** 10 tabelas novas, todas com RLS.

### RPCs principais

CRM:

- `create_crm_lead`;
- `move_crm_lead_stage`;
- `create_crm_opportunity`;
- `convert_crm_lead`;
- `move_crm_opportunity_stage`;
- `record_crm_activity`;
- `get_crm_pipeline`;
- `get_client_360`.

SAC e portal:

- `create_sac_ticket`;
- `add_sac_ticket_message`;
- `register_sac_ticket_attachment`;
- `assign_sac_ticket`;
- `transition_sac_ticket`;
- `rate_sac_ticket`;
- `get_sac_dashboard`;
- `get_sac_ticket_detail`;
- `get_client_portal_relationship`.

Nenhuma RPC operacional da Etapa 18 é executável por `anon`.

### Segurança e invariantes

- pipeline comercial exclusivamente interno;
- cliente vê apenas o próprio cadastro e chamados;
- portal mostra apenas obras com `client_released_at`;
- mensagens `INTERNAL`, anexos internos e eventos não aparecem no portal;
- upload do portal é autorizado pela sessão e executado no servidor;
- arquivo recebe SHA-256;
- download usa URL assinada de 60 segundos;
- consentimentos, mensagens, eventos e histórico de estágio são append-only;
- estados críticos mudam somente por RPC;
- duplicidade de lead por documento, e-mail e telefone;
- conversão e comandos externos idempotentes;
- vínculos entre organizações, clientes, obras e contratos incompatíveis são bloqueados;
- 43 FKs, nenhuma sem índice líder.

### Bucket

```text
crm-sac-attachments
```

Privado, até 25 MB, tipos permitidos: PDF, DOCX, JPEG, PNG e WebP.

### Migrations canônicas da Etapa 18

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

Os timestamps correspondem exatamente ao ledger remoto do Supabase.

### Evidências de homologação

- bootstrap: 12 perfis, três módulos, 33 permissões e seis categorias;
- lead idempotente e duplicidade bloqueada;
- conversão idempotente em cliente e oportunidade;
- cliente com duas obras no Cliente 360;
- funil protegido e perda com motivo obrigatório;
- chamado idempotente;
- mensagens internas e públicas filtradas;
- anexos internos e públicos filtrados;
- mudança direta de status bloqueada;
- histórico imutável;
- obra não liberada bloqueada no portal;
- cliente de uma organização não vê outra;
- pipeline oculto do cliente;
- dados artificiais revertidos.

## 6. Storage privado

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

## 7. Variáveis conhecidas

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

## 8. CI

```bash
pnpm validate:docs
pnpm validate:migrations
pnpm validate:stage17
pnpm validate:stage18
pnpm lint
pnpm typecheck
pnpm test
pnpm test:python
pnpm build
```

## 9. Recuperação

Procedimento oficial: `diretrizes/RECUPERACAO.md`.

Git recupera código, migrations, testes, arquitetura e documentação. Não recupera valores de secrets, usuários reais, conteúdo de buckets, dados operacionais, DNS ou backups físicos.
