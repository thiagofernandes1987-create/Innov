# Etapa 17 — Estoque, Inventário e Almoxarifado

**Estado:** implementação incorporada à `main`; banco homologado funcionalmente  
**Versão:** 0.17.0  
**Módulo:** `estoque` versão `1.0.0`  
**Implementação:** PR `#14`  
**Homologação e correções:** PR `#15`

## 1. Objetivo

Rastrear integralmente material recebido, armazenado, reservado, transferido, entregue, devolvido, perdido, ajustado ou inventariado.

```text
recebimento aceito → entrada idempotente
→ saldo por depósito/localização/obra
→ reserva → consumo/devolução/transferência
→ ativos e custódias
→ inventário físico → ajuste/reversão → auditoria
```

## 2. Princípios

1. saldo é derivado de movimentos `POSTED`;
2. saldo não é editável diretamente;
3. movimento concluído é imutável;
4. correção ocorre por reversão;
5. transferência conserva quantidade;
6. recebimento de Compras é idempotente;
7. saldo negativo é bloqueado por padrão;
8. vínculos pertencem à mesma organização e obra compatível;
9. ativo individualizado não é consumo comum;
10. custo é sensível e informativo;
11. operações críticas são transacionais;
12. migrations e documentação são append-only e recuperáveis.

## 3. Escopo implementado

### Catálogo e estrutura

- itens consumíveis, ferramentas e ativos;
- categorias e unidades;
- códigos internos e opcionais de barras;
- estoque mínimo;
- controle de lote e validade;
- depósitos gerais ou por obra;
- localizações internas;
- responsável e endereço.

### Movimentos

- entrada de Compras;
- entrada manual;
- saída;
- devolução;
- transferência;
- perda/avaria;
- ajuste;
- reversão.

### Reservas

- organização, obra, tarefa, depósito, localização, item e lote;
- quantidade reservada, consumida e liberada;
- consumo parcial;
- liberação e expiração;
- bloqueio acima do restante.

### Ativos

- patrimônio/serial;
- disponível, em uso, manutenção, perdido ou baixado;
- entrega a obra, equipe ou responsável;
- devolução e histórico de custódia;
- manutenção básica.

### Inventário físico

- abertura por depósito;
- posição esperada congelada;
- contagem e recontagem;
- item encontrado com esperado zero;
- revisão e aprovação;
- ajuste rastreável;
- estado final imutável.

## 4. Fora do escopo

Pertencem à Etapa 21:

- WMS avançado;
- endereçamento automatizado;
- RFID/IoT em tempo real;
- ressuprimento automático sem aprovação;
- roteirização logística;
- integração fiscal oficial;
- depreciação contábil oficial;
- picking por onda.

## 5. Modelo de dados

18 tabelas:

```text
inventory_categories
inventory_units
inventory_items
inventory_warehouses
inventory_locations
inventory_lots
inventory_procurement_item_mappings
inventory_movements
inventory_movement_lines
inventory_receipt_imports
inventory_reservations
inventory_reservation_lines
inventory_assets
inventory_asset_custodies
inventory_asset_maintenance
inventory_stocktakes
inventory_stocktake_lines
inventory_events
```

Seis views:

```text
inventory_stock_v
inventory_reserved_stock_v
inventory_available_stock_v
inventory_item_totals_v
inventory_asset_current_v
inventory_expiry_alerts_v
```

As views usam `security_invoker=true` e não possuem leitura direta pelo navegador.

## 6. Razão e concorrência

```text
saldo físico = soma das linhas de movimentos POSTED
saldo reservado = reservado - consumido - liberado
saldo disponível = físico - reservado
```

`post_inventory_movement` adquire `pg_advisory_xact_lock` por posição:

```text
organização + depósito + localização + item + lote
```

As chaves são ordenadas antes da aquisição. Depois do lock, a função reavalia saldo, disponível, reserva, sinal, lote, ativo e conservação de transferência.

## 7. RPCs

Consulta:

- `get_inventory_dashboard`;
- `get_inventory_movement_detail`;
- `get_inventory_item_detail`;
- `get_inventory_asset_detail`.

Operações:

- `create_inventory_item`;
- `create_inventory_warehouse`;
- `create_inventory_movement`;
- `post_inventory_movement`;
- `reverse_inventory_movement`;
- `import_procurement_receipt_to_inventory`;
- `create_inventory_reservation`;
- `release_inventory_reservation`;
- `consume_inventory_reservation`;
- `expire_inventory_reservations`;
- `create_inventory_asset`;
- `assign_inventory_asset`;
- `return_inventory_asset`;
- `start_inventory_stocktake`;
- `add_inventory_stocktake_line`;
- `submit_inventory_stocktake`;
- `approve_inventory_stocktake`;
- `post_inventory_stocktake_adjustment`.

Nenhuma RPC operacional é executável por `anon`.

## 8. Segurança

- RLS em 18/18 tabelas;
- isolamento multiempresa e multiobra;
- custo sem `SELECT` direto;
- escrita de custo exige capacidade sensível;
- Service Role ausente das ações web;
- RPC `SECURITY DEFINER` com `search_path` explícito e autorização interna;
- movimento e inventário concluídos imutáveis;
- 101 FKs com índice líder;
- eventos sem segredo.

## 9. Integrações

### Compras

Somente quantidade aceita entra. A importação usa chave idempotente do recebimento e repetição devolve o mesmo movimento.

### Obras e equipes

Depósito, movimento, reserva, custódia e inventário podem ter escopo de obra. Ativo pode ser entregue a equipe ou responsável.

### Financeiro e relatórios

Custo de estoque é informativo e não cria lançamento automaticamente. Relatórios consomem contratos autorizados.

## 10. Homologação

Executada no Supabase `wyeojufebtwblsubkunr` com dados temporários revertidos.

Confirmado:

- bootstrap de 12 perfis, 21 módulos, oito unidades e seis categorias;
- entrada, reserva, consumo e reversão idempotentes;
- saída acima do disponível bloqueada;
- segunda saída sobre saldo insuficiente recusada;
- movimento postado imutável;
- inventário contado, aprovado e contabilizado;
- saldo final do cenário coerente;
- vínculos entre organizações e obras incompatíveis bloqueados;
- RLS direto com duas identidades: dados próprios visíveis, dados alheios ocultos;
- custo direto bloqueado;
- zero RPC anônima;
- 101 FKs indexadas;
- advisors revisados.

Limitação: não foi possível abrir duas sessões simultâneas pelo conector sem credenciais explícitas. O teste de carga concorrente real permanece para a Etapa 20.

Detalhes: `docs/ETAPA-17-HOMOLOGACAO-POS-MERGE.md`.

## 11. Migrations finais

A lista integral está em `diretrizes/INVENTARIO.md`. As últimas correções versionadas são:

```text
20260720160800_stage17_inventory_concurrency_locks.sql
20260720160900_stage17_inventory_performance_indexes.sql
20260720161000_stage17_inventory_rpc_privileges.sql
```

## 12. Definition of Done

- [x] implementação incorporada;
- [x] documentação atualizada;
- [x] migrations aplicadas e homologadas;
- [x] recebimento de Compras idempotente;
- [x] saldo não editável;
- [x] movimentos concluídos imutáveis;
- [x] testes de concorrência e saldo no limite do conector;
- [x] isolamento multiempresa e multiobra;
- [x] RLS e custos protegidos;
- [x] advisors revisados;
- [ ] CI final do PR `#15`;
- [ ] PR `#15` pronto para revisão;
- [ ] teste de carga simultâneo antes de produção.
