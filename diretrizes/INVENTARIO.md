# Inventário canônico — Innovar Platform

**Atualizado em:** 20 de julho de 2026  
**Base estável:** `main` com a Etapa 17  
**Follow-up:** PR `#15` — homologação pós-merge  
**Versão:** 0.17.0

Este arquivo registra os elementos necessários para recuperar, validar e continuar o projeto após perda total do ambiente local.

## 1. Repositório e stack

- repositório: `thiagofernandes1987-create/Innov`;
- branch estável: `main`;
- branch de homologação: `fix/etapa-17-homologacao-pos-merge`;
- pacote: `pnpm@11.15.0`;
- Node.js: `>=24`;
- Next.js 16, React 19 e TypeScript;
- PostgreSQL, Auth e Storage no Supabase;
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
| `estoque` | incorporado e homologado estruturalmente |
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

## 4. Rotas do estoque

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

## 6. Tabelas

Catálogo e estrutura:

- `inventory_categories`;
- `inventory_units`;
- `inventory_items`;
- `inventory_warehouses`;
- `inventory_locations`;
- `inventory_lots`;
- `inventory_procurement_item_mappings`.

Movimentos e reservas:

- `inventory_movements`;
- `inventory_movement_lines`;
- `inventory_receipt_imports`;
- `inventory_reservations`;
- `inventory_reservation_lines`.

Ativos, inventário e auditoria:

- `inventory_assets`;
- `inventory_asset_custodies`;
- `inventory_asset_maintenance`;
- `inventory_stocktakes`;
- `inventory_stocktake_lines`;
- `inventory_events`.

**Total:** 18 tabelas, todas com RLS.

## 7. Views internas

- `inventory_stock_v`;
- `inventory_reserved_stock_v`;
- `inventory_available_stock_v`;
- `inventory_item_totals_v`;
- `inventory_asset_current_v`;
- `inventory_expiry_alerts_v`.

Nenhuma possui `SELECT` para `anon` ou `authenticated`.

## 8. RPCs principais

Consulta:

- `get_inventory_dashboard`;
- `get_inventory_movement_detail`;
- `get_inventory_item_detail`;
- `get_inventory_asset_detail`.

Operações:

- criação de item, depósito, movimento e ativo;
- postagem e reversão de movimento;
- importação idempotente de recebimento;
- criação, consumo, liberação e expiração de reserva;
- entrega e devolução de ativo;
- abertura, contagem, submissão, aprovação e ajuste de inventário físico;
- instalação dos padrões organizacionais.

Nenhuma RPC do módulo é executável por `anon`.

## 9. Migrations e correções

A sequência `2026072016*.sql` está aplicada no Supabase. Inclui schema, saldos, funções, segurança, contratos de consulta, módulo, hardening e guards.

Correções pós-merge:

- locks de concorrência;
- escopo de saldo por obra;
- índices de performance;
- privilégios de RPC.

Migration aplicada nunca é alterada.

## 10. Evidências de homologação

- 18/18 tabelas com RLS;
- seis views sem acesso direto;
- 101 FKs com índice de cobertura;
- custos sem leitura direta;
- escrita de custos protegida por `enforce_inventory_sensitive_write`;
- guards de escopo por organização e obra;
- módulo `estoque` ativo, sensível, `1.0.0` e `default_enabled=true`;
- CI do PR `#15` verde;
- advisors revisados.

## 11. Dados padrão

Para cada nova organização:

- unidades `un`, `kg`, `m`, `m2`, `m3`, `l`, `cx`, `pct`;
- categorias iniciais;
- depósito `ALM-GERAL`;
- localização `PADRAO`;
- saldo negativo desabilitado;
- permissões dos perfis canônicos.

O ambiente atual ainda não possui organização; por isso os registros concretos de bootstrap são zero.

## 12. Integrações

### Compras

Somente quantidade aceita é importada. Repetição do recebimento não duplica movimento.

### Obras e equipes

Depósito, movimento, reserva, custódia e inventário podem ser limitados por obra e responsável.

### Financeiro e relatórios

Custos do estoque são informativos e sensíveis; não geram lançamento financeiro automático.

## 13. Limitação atual

O Supabase de homologação não possui usuários, organizações, memberships ou obras. O E2E autenticado deverá ser executado quando contas reais forem provisionadas. Não devem ser fabricadas identidades nem desativadas constraints para simular o teste.

## 14. CI

```bash
pnpm validate:docs
pnpm validate:stage17
pnpm lint
pnpm typecheck
pnpm test
pnpm test:python
pnpm build
```

## 15. Recuperação

Procedimento oficial: `diretrizes/RECUPERACAO.md`.

GitHub recupera código, migrations, arquitetura, documentação e CI. Secrets, usuários, dados reais e conteúdo de buckets dependem de cofre e backup externos.
