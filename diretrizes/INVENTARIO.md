# Inventário canônico — Innovar Platform

**Atualizado em:** 20 de julho de 2026  
**Base:** `main` com Etapa 17 incorporada  
**Branch de consolidação:** `chore/etapa17-homologacao-recuperacao`  
**Versão:** 0.17.0

Este documento registra o que precisa existir para recuperar, validar e continuar o projeto.

## 1. Repositório e runtime

- Repositório: `thiagofernandes1987-create/Innov`;
- branch estável: `main`;
- gerenciador: `pnpm@11.15.0`;
- Node.js: `>=24`;
- Python no CI: `3.13`;
- framework: Next.js 16, React 19 e TypeScript;
- banco/Auth/Storage: Supabase;
- projeto de homologação: identificado externamente, sem credenciais versionadas.

## 2. Estado dos aplicativos

| Chave | Aplicativo | Estado | Etapa principal | Observação |
|---|---|---:|---:|---|
| `dashboard` | Início | Operacional | 12.1 | Exibe módulos autorizados. |
| `crm` | CRM e Vendas | Parcial | anterior | Consolidação prevista na Etapa 18. |
| `clientes` | Clientes | Parcial/operacional | 12 | Cliente pode possuir múltiplas obras. |
| `obras` | Obras | Operacional | 12 | Carteira multiobra e portal. |
| `planejamento` | Planejamento | Operacional | 12 | EAP, cronograma e baselines. |
| `tarefas` | Tarefas | Operacional | 12 | Execução, responsáveis e bloqueios. |
| `diario` | Diário de Obras | Operacional | 12 | Campo, ocorrências e mídias. |
| `equipes` | Equipes | Operacional | 12 | Recursos e integrantes. |
| `orcamentos` | Orçamentos | Operacional | 9 | Custos, BDI, markup e aprovações. |
| `propostas` | Propostas | Operacional | 9 | Versões, PDF, liberação e aceite. |
| `contratos` | Contratos | Operacional | 9 | Partes, versões e vigência. |
| `aditivos` | Aditivos | Operacional | 9 | Valor, prazo e aplicação idempotente. |
| `assinaturas` | Assinaturas | Operacional em sandbox | 9/12.2 | Provider jurídico real pendente. |
| `documentos` | Documentos | Operacional | 12/13 | Storage privado, versões e hashes. |
| `qualidade` | Qualidade | Operacional | 13 | FVS, FVM, formulários e pesquisas. |
| `compras` | Compras e Suprimentos | Operacional | 14 | Solicitações, cotações, pedidos e recebimentos. |
| `estoque` | Estoque, Inventário e Almoxarifado | Implementado/homologado tecnicamente | 17 | 18 tabelas, locks, saldo derivado e 14 testes. |
| `financeiro` | Financeiro Operacional | Operacional | 15 | Lançamentos, parcelas, medições e caixa. |
| `sac` | Pós-venda e SAC | Parcial | anterior | Consolidação prevista na Etapa 18. |
| `relatorios` | Relatórios e Indicadores | Operacional | 16 | Dashboards, metas, snapshots e CSV. |
| `auditoria` | Auditoria | Parcial sistêmico | transversal | Consolidação prevista na Etapa 19. |
| `administracao` | Administração | Operacional | 12.1 | Módulos, perfis, escopos e overrides. |

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

Documentos atuais da Etapa 17:

```text
docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md
docs/RELATORIO-HOMOLOGACAO-ETAPA-17.md
```

Planejamento da fila logística futura:

```text
docs/ETAPA-21-WMS-AVANCADO-AUTOMACAO-LOGISTICA.md
```

## 4. Rotas principais da Etapa 17

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

## 5. Código da Etapa 17

### Domínio e servidor

```text
lib/inventory/domain.ts
lib/inventory/server.ts
```

### Ações

```text
app/actions/inventory.ts
app/actions/inventory-extra.ts
app/actions/inventory-stocktake.ts
```

### Componentes

```text
components/inventory/inventory-navigation.tsx
components/inventory/inventory-metric-card.tsx
components/inventory/inventory-movement-form.tsx
components/inventory/inventory-reservation-form.tsx
components/inventory/inventory-reservation-consume-form.tsx
components/inventory/inventory-receipt-import-form.tsx
components/inventory/inventory-stocktake-count-form.tsx
```

### Estilos

```text
app/inventory.css
```

Importado em `app/layout.tsx`.

## 6. Tabelas da Etapa 17

### Catálogo e estrutura

- `inventory_categories`;
- `inventory_units`;
- `inventory_items`;
- `inventory_warehouses`;
- `inventory_locations`;
- `inventory_lots`;
- `inventory_procurement_item_mappings`.

### Movimentos e reservas

- `inventory_movements`;
- `inventory_movement_lines`;
- `inventory_receipt_imports`;
- `inventory_reservations`;
- `inventory_reservation_lines`.

### Ativos

- `inventory_assets`;
- `inventory_asset_custodies`;
- `inventory_asset_maintenance`.

### Inventário e auditoria

- `inventory_stocktakes`;
- `inventory_stocktake_lines`;
- `inventory_events`.

**Total:** 18 tabelas, todas com RLS no Supabase de homologação.

## 7. Views

- `inventory_stock_v`;
- `inventory_reserved_stock_v`;
- `inventory_available_stock_v`;
- `inventory_item_totals_v`;
- `inventory_asset_current_v`;
- `inventory_expiry_alerts_v`.

Todas foram confirmadas com `security_invoker=true`.

## 8. RPCs e funções principais

### Consulta segura

- `get_inventory_dashboard`;
- `get_inventory_movement_detail`;
- `get_inventory_item_detail`;
- `get_inventory_asset_detail`.

### Cadastro e movimento

- `create_inventory_item`;
- `create_inventory_warehouse`;
- `create_inventory_movement`;
- `post_inventory_movement`;
- `reverse_inventory_movement`;
- `create_inventory_asset`.

### Compras e reservas

- `import_procurement_receipt_to_inventory`;
- `create_inventory_reservation`;
- `release_inventory_reservation`;
- `consume_inventory_reservation`;
- `expire_inventory_reservations`.

### Ativos e inventário

- `assign_inventory_asset`;
- `return_inventory_asset`;
- `start_inventory_stocktake`;
- `add_inventory_stocktake_line`;
- `submit_inventory_stocktake`;
- `approve_inventory_stocktake`;
- `post_inventory_stocktake_adjustment`.

### Instalação e concorrência

- `install_inventory_defaults`;
- `organizations_install_inventory_defaults`;
- `inventory_stock_lock_key`;
- `validate_inventory_project_scope`.

A auditoria encontrou 35 funções relacionadas ao domínio de inventário.

## 9. Migrations da Etapa 17

O ledger remoto foi reconciliado com 18 arquivos canônicos:

1. `20260720160000_stage17_inventory_schema.sql`;
2. `20260720160100_stage17_inventory_balances.sql`;
3. `20260720160200_stage17_inventory_movement_functions.sql`;
4. `20260720160300_stage17_inventory_procurement_reservations.sql`;
5. `20260720160400_stage17_inventory_assets_stocktakes.sql`;
6. `20260720160500_stage17_inventory_security.sql`;
7. `20260720160510_stage17_inventory_dashboard.sql`;
8. `20260720160520_stage17_inventory_movement_detail.sql`;
9. `20260720160525_stage17_inventory_item_asset_detail.sql`;
10. `20260720160530_stage17_inventory_stocktake_found_items.sql`;
11. `20260720160600_stage17_inventory_module.sql`;
12. `20260720160650_stage17_inventory_creation_rpcs.sql`;
13. `20260720160700_stage17_inventory_hardening.sql`;
14. `20260720160720_stage17_inventory_sensitive_columns.sql`;
15. `20260720160730_stage17_inventory_sensitive_write_guard.sql`;
16. `20260720160740_stage17_inventory_state_guards.sql`;
17. `20260720233052_stage17_inventory_concurrency_locks.sql`;
18. `20260720233657_stage17_homologation_balance_project_scope.sql`.

As versões originais haviam sido aplicadas em blocos remotos. O ledger foi reparado sem reaplicar ou desfazer DDL.

## 10. Testes e validação

### Validador estrutural

```text
scripts/validate-stage17.mjs
```

### Teste SQL reproduzível

```text
supabase/tests/stage17_inventory_homologation.sql
```

O teste termina com `ROLLBACK` e cobre 14 regras:

- autorização;
- dados padrão;
- instalação do módulo;
- entrada e saída;
- saldo negativo;
- idempotência;
- imutabilidade;
- reversão;
- transferência;
- isolamento multiempresa;
- isolamento multiobra;
- ausência de saldo editável.

## 11. Segurança

- RLS nas 18 tabelas;
- views sem acesso direto amplo;
- custos mascarados por RPC;
- privilégios por coluna;
- Service Role ausente das ações web;
- movimentos postados imutáveis;
- inventários postados imutáveis;
- custódias encerradas imutáveis;
- advisory locks transacionais;
- validação de saldo físico e disponível;
- isolamento de depósito por obra;
- funções privilegiadas com autorização interna.

Tabelas internas sem política de usuário não devem receber política permissiva apenas para remover aviso do advisor.

## 12. Integrações

### Compras

- `procurement_order_items` → mapeamento;
- `procurement_receipts` → importação;
- somente quantidade aceita;
- idempotência por recebimento.

### Obras e equipes

- depósito, movimento, reserva e ativo podem ter obra;
- depósito exclusivo não pode cruzar obra;
- ativo pode ser entregue a equipe/responsável.

### Financeiro

- custo de estoque é informativo;
- não cria lançamento oficial automaticamente.

### Relatórios

- indicadores futuros usam RPC/view autorizada;
- tabelas internas não devem ser consultadas diretamente pela interface.

## 13. Dados padrão

Por organização:

- módulo `estoque` 1.0.0 habilitado;
- oito unidades;
- seis categorias;
- depósito `ALM-GERAL`;
- localização `PADRAO`;
- matriz inicial para perfis canônicos.

## 14. Storage e secrets

A Etapa 17 não adiciona bucket nem secret novo.

Secrets conhecidos permanecem externos:

- `NEXT_PUBLIC_SUPABASE_URL`;
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
- `SUPABASE_SERVICE_ROLE_KEY`;
- `NEXT_PUBLIC_APP_URL`;
- secrets de assinatura;
- senhas de homologação.

## 15. CI

```bash
pnpm validate:docs
pnpm validate:stage17
pnpm lint
pnpm typecheck
pnpm test
pnpm test:python
pnpm build
```

O branch original da Etapa 17 ficou verde antes do merge. A branch corretiva precisa repetir o CI completo.

## 16. Limitações abertas

- zero usuários permanentes no ambiente de homologação durante a auditoria;
- E2E autenticado pós-Etapa 17 pendente;
- teste real com duas conexões concorrentes pendente;
- fluxo completo com recebimento real de homologação pendente;
- proteção contra senhas comprometidas e MFA adicional pendentes no Auth;
- avisos de performance legados serão tratados nas Etapas 19/20;
- índices não devem ser removidos apenas porque o banco está vazio.

## 17. Próxima fila logística

A Etapa 21 está documentada e inclui WMS avançado, endereçamento automatizado, RFID, ressuprimento, roteirização, fiscal de entrada e depreciação contábil. Nada desse escopo está declarado como implementado na versão 0.17.0.
