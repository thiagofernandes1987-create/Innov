# Inventário canônico — Innovar Platform

**Atualizado em:** 20 de julho de 2026  
**Base estável:** `main` com o código da Etapa 17  
**Follow-up:** branch `fix/etapa-17-homologacao-pos-merge`, PR `#15`  
**Versão:** 0.17.0

Este documento registra os elementos necessários para recuperar, validar e continuar o projeto após perda total do ambiente local.

## 1. Repositório e stack

- repositório: `thiagofernandes1987-create/Innov`;
- branch estável: `main`;
- branch corretiva: `fix/etapa-17-homologacao-pos-merge`;
- Node.js `>=24` e `pnpm@11.15.0`;
- Next.js 16, React 19 e TypeScript;
- Supabase Auth, PostgreSQL, RLS e Storage;
- projeto de homologação: `wyeojufebtwblsubkunr`.

## 2. Estado dos módulos

| Chave | Estado |
|---|---|
| `dashboard` | operacional |
| `crm` | parcial; consolidação na Etapa 18 |
| `clientes` | parcial; consolidação na Etapa 18 |
| `obras` | operacional |
| `planejamento` | operacional |
| `tarefas` | operacional |
| `diario` | operacional |
| `equipes` | operacional |
| `orcamentos` | operacional |
| `propostas` | operacional |
| `contratos` | operacional |
| `aditivos` | operacional |
| `assinaturas` | operacional em sandbox |
| `documentos` | operacional |
| `qualidade` | operacional |
| `compras` | operacional |
| `estoque` | código incorporado e banco homologado; PR #15 aguardando revisão |
| `financeiro` | operacional |
| `sac` | parcial; consolidação na Etapa 18 |
| `relatorios` | operacional |
| `auditoria` | parcial transversal |
| `administracao` | operacional |

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

Documentos da Etapa 17:

```text
docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md
docs/ETAPA-17-HOMOLOGACAO-POS-MERGE.md
```

## 4. Rotas de estoque

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

## 5. Arquivos centrais

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
```

## 6. Banco da Etapa 17

### Tabelas

- catálogo: `inventory_categories`, `inventory_units`, `inventory_items`;
- estrutura: `inventory_warehouses`, `inventory_locations`, `inventory_lots`, `inventory_procurement_item_mappings`;
- razão: `inventory_movements`, `inventory_movement_lines`, `inventory_receipt_imports`;
- reservas: `inventory_reservations`, `inventory_reservation_lines`;
- ativos: `inventory_assets`, `inventory_asset_custodies`, `inventory_asset_maintenance`;
- inventário: `inventory_stocktakes`, `inventory_stocktake_lines`;
- auditoria: `inventory_events`.

**Total:** 18 tabelas, todas com RLS.

### Views internas

```text
inventory_stock_v
inventory_reserved_stock_v
inventory_available_stock_v
inventory_item_totals_v
inventory_asset_current_v
inventory_expiry_alerts_v
```

As seis usam `security_invoker=true` e não concedem `SELECT` a `anon` ou `authenticated`.

### RPCs principais

Consulta segura:

- `get_inventory_dashboard`;
- `get_inventory_movement_detail`;
- `get_inventory_item_detail`;
- `get_inventory_asset_detail`.

Operações:

- criação de item, depósito, movimento e ativo;
- postagem e reversão;
- importação idempotente de recebimento;
- criação, consumo, liberação e expiração de reserva;
- entrega e devolução de ativo;
- abertura, contagem, submissão, aprovação e ajuste de inventário;
- instalação dos padrões organizacionais.

Nenhuma RPC operacional é executável por `anon`.

## 7. Migrations da Etapa 17

Aplicação lexical final:

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
20260720160800_stage17_inventory_concurrency_locks.sql
20260720160900_stage17_inventory_performance_indexes.sql
20260720161000_stage17_inventory_rpc_privileges.sql
```

O histórico remoto também registra a correção `stage17_homologation_balance_project_scope`. Migration aplicada nunca é alterada.

## 8. Invariantes

```text
saldo físico = soma de linhas de movimentos POSTED
saldo reservado = reservado - consumido - liberado
saldo disponível = físico - reservado
```

- saldo não é editável;
- movimento postado é imutável;
- reversão referencia o movimento original;
- transferência conserva quantidade;
- saldo negativo é bloqueado por padrão;
- postagem usa advisory lock transacional por posição;
- recebimento de Compras é idempotente;
- somente quantidade aceita entra;
- inventário aprovado gera ajuste rastreável;
- custo é mascarado no PostgreSQL.

## 9. Evidências de homologação

- 18/18 tabelas com RLS;
- seis views sem acesso direto;
- 49 políticas e 36 gatilhos não internos;
- 101 FKs, nenhuma sem índice líder;
- zero RPC operacional executável por `anon`;
- três RPCs de criação disponíveis para `authenticated`;
- bootstrap: 12 perfis, 21 módulos, oito unidades e seis categorias;
- entrada, reserva, consumo e reversão idempotentes;
- saldo disponível respeitado;
- segunda saída sobre saldo insuficiente bloqueada;
- movimento postado bloqueado para alteração e exclusão;
- inventário físico contabilizado;
- vínculos multiempresa e multiobra bloqueados;
- RLS direto: uma linha própria, zero linha da outra organização;
- leitura direta de `reference_unit_cost` bloqueada;
- dados de teste revertidos;
- advisors de segurança e performance revisados.

Limitação: o conector não conseguiu abrir duas sessões simultâneas sem credenciais de banco. O lock foi homologado por inspeção e cenário sequencial de disputa. Teste de carga simultâneo permanece na Etapa 20.

## 10. Dados padrão

Por organização:

- unidades `un`, `kg`, `m`, `m2`, `m3`, `l`, `cx`, `pct`;
- seis categorias iniciais;
- depósito `ALM-GERAL`;
- localização `PADRAO`;
- saldo negativo desabilitado;
- permissões dos perfis canônicos.

## 11. Integrações

- Compras: quantidade aceita gera entrada idempotente;
- Obras: depósito, movimento, reserva e inventário podem ter escopo de obra;
- Equipes: ativo pode ser entregue a equipe ou responsável;
- Financeiro: custo de estoque não cria lançamento automaticamente;
- Relatórios: consumo por contratos autorizados.

## 12. Variáveis e Storage

A Etapa 17 não cria bucket ou secret. Variáveis conhecidas permanecem descritas em `.env.example` e `diretrizes/RECUPERACAO.md`; valores nunca são versionados.

## 13. CI

```bash
pnpm validate:docs
pnpm validate:stage17
pnpm lint
pnpm typecheck
pnpm test
pnpm test:python
pnpm build
```

## 14. Recuperação

Procedimento oficial: `diretrizes/RECUPERACAO.md`. Git recupera código, migrations, arquitetura, documentação e CI. Secrets, usuários, dados reais, conteúdo de buckets e backups dependem de cofres e inventários externos.
