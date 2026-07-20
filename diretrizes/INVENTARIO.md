# Inventário canônico — Innovar Platform

**Atualizado em:** 20 de julho de 2026  
**Base estável:** `main` após a Etapa 16  
**Etapa em execução:** branch `feature/etapa-17-estoque-inventario-almoxarifado`, PR `#14`  
**Versão da branch:** 0.17.0

Este documento registra tudo que precisa existir para recuperar, validar e continuar o projeto. O estado da branch de etapa não é confundido com funcionalidade já incorporada à `main`.

## 1. Repositório e stack

- Repositório: `thiagofernandes1987-create/Innov`;
- Branch estável: `main`;
- Branch da Etapa 17: `feature/etapa-17-estoque-inventario-almoxarifado`;
- PR da Etapa 17: `#14`, rascunho, sem merge;
- Gerenciador: `pnpm@11.15.0`;
- Node.js: `>=24`;
- Python dos testes de Qualidade: `3.13` no CI;
- Banco/Auth/Storage: Supabase;
- Framework: Next.js 16, React 19 e TypeScript.

## 2. Estado dos aplicativos

| Chave | Aplicativo | Estado | Etapa principal | Observação |
|---|---|---:|---:|---|
| `dashboard` | Início | Operacional | 12.1 | Exibe somente módulos autorizados. |
| `crm` | CRM e Vendas | Parcial | anterior | Consolidação prevista na Etapa 18. |
| `clientes` | Clientes | Parcial | 12 | Consolidação prevista na Etapa 18. |
| `obras` | Obras | Operacional | 12 | Carteira multiobra, criação, detalhe e portal. |
| `planejamento` | Planejamento | Operacional | 12 | EAP, cronograma, dependências, marcos e baselines. |
| `tarefas` | Tarefas | Operacional | 12 | Kanban, progresso, bloqueios e responsáveis. |
| `diario` | Diário de Obras | Operacional | 12 | Diário mobile, atividades, ocorrências e mídias. |
| `equipes` | Equipes | Operacional | 12 | Recursos, equipes e integrantes. |
| `orcamentos` | Orçamentos | Operacional | 9 | Versões, custos, BDI, markup, cenários e aprovações. |
| `propostas` | Propostas | Operacional | 9 | Versões, PDF, liberação e aceite. |
| `contratos` | Contratos | Operacional | 9 | Contratos, versões, partes e vigência. |
| `aditivos` | Aditivos | Operacional | 9 | Escopo, valor, prazo e aplicação idempotente. |
| `assinaturas` | Assinaturas | Operacional em sandbox | 9 e 12.2 | Provider jurídico real pendente. |
| `documentos` | Documentos | Operacional | 12 e 13 | Arquivos privados, versões e liberação. |
| `qualidade` | Qualidade | Operacional | 13 | FVS, FVM, formulários, pesquisas e revisão. |
| `compras` | Compras e Suprimentos | Operacional | 14 | Solicitações, cotações, pedidos e recebimentos. |
| `estoque` | Estoque, Inventário e Almoxarifado | Em implementação | 17 | Código e migrations no PR #14; CI e homologação ainda pendentes. |
| `financeiro` | Financeiro Operacional | Operacional | 15 | Lançamentos, parcelas, medições, baixas e caixa. |
| `sac` | Pós-venda e SAC | Parcial | anterior | Consolidação prevista na Etapa 18. |
| `relatorios` | Relatórios e Indicadores | Operacional | 16 | Dashboards, metas, snapshots e CSV auditado. |
| `auditoria` | Auditoria | Parcial sistêmico | transversal | Consolidação prevista na Etapa 19. |
| `administracao` | Administração | Operacional | 12.1 | Aplicativos, perfis, usuários, escopos e overrides. |

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

Documentos de etapa relevantes:

```text
docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md
docs/ETAPA-21-WMS-AVANCADO-AUTOMACAO-LOGISTICA.md
```

A Etapa 21 está apenas planejada e enfileirada após a Etapa 20.

## 4. Rotas da Etapa 17

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

## 5. Arquivos da aplicação da Etapa 17

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

### Estilos e páginas

- `app/inventory.css`;
- páginas sob `app/app/estoque/`;
- `app/layout.tsx` precisa importar `inventory.css`.

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

### Ativos e inventário físico

- `inventory_assets`;
- `inventory_asset_custodies`;
- `inventory_asset_maintenance`;
- `inventory_stocktakes`;
- `inventory_stocktake_lines`;
- `inventory_events`.

Total: 18 tabelas.

## 7. Views derivadas

- `inventory_stock_v` — saldo físico;
- `inventory_reserved_stock_v` — saldo reservado;
- `inventory_available_stock_v` — saldo disponível;
- `inventory_item_totals_v` — consolidação por item;
- `inventory_asset_current_v` — posição/custódia do ativo;
- `inventory_expiry_alerts_v` — validade de lotes.

As views usam `security_invoker=true` e não são concedidas diretamente ao navegador.

## 8. RPCs da Etapa 17

### Consulta segura

- `get_inventory_dashboard`;
- `get_inventory_movement_detail`;
- `get_inventory_item_detail`;
- `get_inventory_asset_detail`.

### Cadastro e movimentos

- `create_inventory_item`;
- `create_inventory_warehouse`;
- `create_inventory_movement`;
- `post_inventory_movement`;
- `reverse_inventory_movement`;
- `create_inventory_asset`.

### Compras, reservas e ativos

- `import_procurement_receipt_to_inventory`;
- `create_inventory_reservation`;
- `release_inventory_reservation`;
- `consume_inventory_reservation`;
- `expire_inventory_reservations`;
- `assign_inventory_asset`;
- `return_inventory_asset`.

### Inventário físico e bootstrap

- `start_inventory_stocktake`;
- `add_inventory_stocktake_line`;
- `submit_inventory_stocktake`;
- `approve_inventory_stocktake`;
- `post_inventory_stocktake_adjustment`;
- `install_inventory_defaults`;
- `organizations_install_inventory_defaults`.

## 9. Migrations da Etapa 17

Aplicação em ordem lexical:

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
16. `20260720160740_stage17_inventory_state_guards.sql`.

Migration aplicada nunca deve ser reescrita; correção de homologação exige nova migration.

## 10. Regras de saldo e imutabilidade

```text
saldo físico = soma das linhas dos movimentos POSTED
saldo reservado = reservado - consumido - liberado
saldo disponível = físico - reservado
```

- saldo não é editável diretamente;
- movimento `DRAFT` não altera saldo;
- movimento `POSTED` é imutável;
- correção ocorre por reversão;
- transferência conserva quantidade;
- saldo negativo é bloqueado por padrão;
- inventário postado é imutável;
- custódia encerrada é imutável;
- importação de recebimento é idempotente.

## 11. Integrações da Etapa 17

### Compras

- item do pedido é mapeado para item de estoque;
- somente quantidade aceita é importada;
- quantidade rejeitada não entra;
- uma importação por recebimento;
- repetição retorna o mesmo movimento.

### Obras e equipes

- depósito pode ser geral ou de obra;
- movimento e reserva podem apontar para obra;
- reserva pode apontar para tarefa;
- ativo pode ser entregue a equipe ou responsável.

### Financeiro e Relatórios

- custo de estoque é informativo;
- não cria lançamento financeiro automaticamente;
- custo sensível é mascarado;
- relatórios devem consumir RPC/view autorizada.

## 12. Segurança da Etapa 17

- RLS nas 18 tabelas;
- RPCs de negócio indisponíveis para `anon`;
- views internas sem acesso direto;
- colunas de custo com privilégios restritos;
- escrita de custo exige capacidade sensível;
- Service Role ausente das ações web;
- vínculos multi-tenant validados;
- movimentos e inventários concluídos imutáveis;
- FKs e filtros críticos indexados;
- eventos sem secrets.

## 13. Dados padrão por organização

- módulo `estoque` versão `1.0.0`;
- unidades `un`, `kg`, `m`, `m2`, `m3`, `l`, `cx`, `pct`;
- categorias iniciais;
- depósito `ALM-GERAL`;
- localização `PADRAO`;
- saldo negativo desabilitado;
- matriz inicial dos perfis canônicos.

## 14. Storage e variáveis

A Etapa 17 não cria bucket ou secret novo.

Variáveis conhecidas:

```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
SIGNATURE_PROVIDER
SIGNATURE_WEBHOOK_SECRET
SIGNATURE_EMAIL_WEBHOOK_URL
DEMO_ADMIN_PASSWORD
DEMO_CLIENT_PASSWORD
```

Valores não pertencem ao repositório.

## 15. Scripts e CI

```text
scripts/validate-documentation.mjs
scripts/validate-stage17.mjs
.github/workflows/ci.yml
```

Comandos obrigatórios:

```bash
pnpm validate:docs
pnpm validate:stage17
pnpm lint
pnpm typecheck
pnpm test
pnpm test:python
pnpm build
```

## 16. Definition of Done da Etapa 17

- documentação atualizada no mesmo PR;
- migration aplicada e homologada;
- recebimento de Compras integrado de forma idempotente;
- saldo não editável diretamente;
- movimentos concluídos imutáveis;
- testes de concorrência e saldo;
- isolamento multiempresa e multiobra;
- CI verde.

## 17. Lacunas e estado real

- PR `#14` permanece em rascunho;
- CI anterior falhou no lint;
- migrations ainda precisam ser aplicadas no Supabase de homologação;
- testes de concorrência, saldo e RLS em banco real ainda precisam de evidência;
- nenhum merge foi realizado;
- Etapa 17 não está disponível na `main`.

## 18. Fila posterior

Após as Etapas 18, 19 e 20, está agendada a:

### Etapa 21 — WMS avançado e automação logística, fiscal e patrimonial

- WMS avançado;
- endereçamento automatizado;
- RFID em tempo real;
- ressuprimento automático sem aprovação;
- roteirização logística;
- integração fiscal de entrada;
- depreciação contábil oficial.

Documento: `docs/ETAPA-21-WMS-AVANCADO-AUTOMACAO-LOGISTICA.md`.

Nenhum item da Etapa 21 é considerado implementado. O início depende da conclusão das Etapas 17, 19 e 20.

## 19. Recuperação

Procedimento oficial: `diretrizes/RECUPERACAO.md`.

O GitHub recupera estrutura, lógica, migrations, documentação, scripts e CI. Secrets, usuários reais, conteúdo dos buckets e dados reais exigem backup/cofre externo.
