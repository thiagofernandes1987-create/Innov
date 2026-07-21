# Etapa 17 — Estoque, Inventário e Almoxarifado

**Estado:** implementada na `main` e homologada tecnicamente  
**Versão:** 0.17.0  
**Módulo:** `estoque` 1.0.0  
**PR original:** #14  
**Data de homologação:** 20 de julho de 2026

## 1. Objetivo

Controlar materiais, consumíveis, ferramentas e ativos desde o recebimento até consumo, devolução, transferência, perda, ajuste ou inventário físico.

```text
recebimento aceito → entrada idempotente → saldo físico
→ reserva → saldo disponível → consumo/devolução/transferência
→ custódia de ativos → inventário físico → ajuste/reversão → auditoria
**Estado:** implementação incorporada à `main`; banco homologado funcionalmente; PR corretivo pronto para revisão  
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

## 2. Princípios implementados

1. saldo não editável diretamente;
2. saldo derivado de um razão de movimentos;
3. movimentos concluídos imutáveis;
4. correção por reversão, sem apagar o original;
5. recebimento de Compras integrado de forma idempotente;
6. transferência atômica;
7. saldo negativo bloqueado por padrão;
8. isolamento multiempresa e multiobra;
9. custos mascarados sem capacidade sensível;
10. documentação, migration e testes preservados no GitHub.

## 3. Escopo entregue

### Catálogo

- categorias hierárquicas;
- unidades de medida;
- materiais, consumíveis, ferramentas e ativos;
- código, SKU e código de barras;
- estoque mínimo;
- lote e validade;
- controle individual por patrimônio ou série;
- custo de referência sensível.

### Estrutura física

- depósito geral;
- depósito por obra;
- depósito móvel ou externo;
- localizações internas;
- responsável;
- ativação/desativação sem perda de histórico.

### Movimentos

- recebimento de Compras;
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

- reserva por obra;
- tarefa opcional;
- depósito, localização, item e lote;
- consumo parcial ou total;
- liberação;
- expiração server-side;
- saldo disponível reduzido sem alterar o físico.

### Ativos

- patrimônio ou número de série;
- entrada física unitária;
- custódia por obra, equipe ou responsável;
- devolução;
- manutenção;
- histórico imutável de custódia.

### Inventário físico

- abertura por depósito;
- posição esperada congelada;
- contagem e recontagem;
- item encontrado com esperado zero;
- revisão e aprovação;
- ajuste após aprovação;
- encerramento sem movimento artificial quando não há divergência.

## 4. Modelo de saldo

```text
saldo físico
  = soma das linhas dos movimentos POSTED
  + linhas dos movimentos originais REVERSED

saldo reservado
  = reservado - consumido - liberado

saldo disponível
  = físico - reservado
```

O movimento de tipo `REVERSAL` neutraliza algebricamente o original. O original permanece no razão com estado `REVERSED`, preservando auditoria e evitando dupla contagem.

## 5. Concorrência

A migration `20260720233052_stage17_inventory_concurrency_locks.sql` implementa advisory lock transacional por:

- organização;
- depósito;
- localização;
- item;
- lote.

Os locks são adquiridos em ordem determinística com `pg_advisory_xact_lock`, reduzindo risco de corrida e deadlock.

Antes da postagem são verificados:

- saldo físico;
- saldo disponível;
- quantidade reservada;
- conservação de transferência;
- lote obrigatório;
- ativo unitário;
- consumo compatível com a reserva.

## 6. Integração com Compras

A entrada usa:

```text
pedido → recebimento aceito → mapeamento → movimento de entrada
```

Regras:

- somente `ACCEPTED` ou `ACCEPTED_WITH_RESTRICTION`;
- somente quantidade aceita;
- quantidade rejeitada não entra;
- fator de conversão explícito;
- lote obrigatório quando configurado;
- uma importação por recebimento;
- repetição devolve o mesmo movimento.

## 7. Isolamento

### Multiempresa

Todos os registros possuem `organization_id`. Triggers validam unidade, item, depósito, lote, fornecedor, pedido, recebimento, equipe, tarefa, movimento, reserva, ativo e inventário.

### Multiobra

Depósito geral pode atender operações autorizadas. Depósito com `project_id` só pode ser usado por operação da mesma obra.

A migration `20260720233657_stage17_homologation_balance_project_scope.sql` aplica essa regra a:

- linhas de movimento;
- reservas;
- importações de recebimento;
- ativos.

## 8. Segurança

- 18 tabelas com RLS;
- seis views com `security_invoker=true`;
- RPCs críticas com autorização interna;
- nenhum RPC de negócio para `anon`;
- funções auxiliares sem execução pública;
- `search_path=public` nas funções privilegiadas;
- colunas de custo sem leitura direta ampla;
- detalhes de item, ativo e movimento por RPC mascarada;
- Service Role ausente das ações do navegador;
- movimentos, inventários e custódias concluídos imutáveis.

Avisos do advisor relativos a RPCs `SECURITY DEFINER` são esperados quando a RPC é a fronteira autorizada do aplicativo. Eles não devem ser eliminados tornando a função permissiva ou removendo a checagem interna.

## 9. Estrutura técnica

### Tabelas

Total: 18.

- `inventory_categories`;
- `inventory_units`;
- `inventory_items`;
- `inventory_warehouses`;
- `inventory_locations`;
- `inventory_lots`;
- `inventory_procurement_item_mappings`;
- `inventory_movements`;
- `inventory_movement_lines`;
- `inventory_receipt_imports`;
- `inventory_reservations`;
- `inventory_reservation_lines`;
- `inventory_assets`;
- `inventory_asset_custodies`;
- `inventory_asset_maintenance`;
- `inventory_stocktakes`;
- `inventory_stocktake_lines`;
- `inventory_events`.

### Views

- `inventory_stock_v`;
- `inventory_reserved_stock_v`;
- `inventory_available_stock_v`;
- `inventory_item_totals_v`;
- `inventory_asset_current_v`;
- `inventory_expiry_alerts_v`.

### Migrations

O ledger homologado contém 18 migrations:

- 16 migrations canônicas originais, de `20260720160000` a `20260720160740`;
- `20260720233052_stage17_inventory_concurrency_locks.sql`;
- `20260720233657_stage17_homologation_balance_project_scope.sql`.

A migration aplicada e homologada nunca deve ser editada. Nova correção exige novo timestamp.

## 10. Rotas
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
- advisors revisados;
- CI integral verde;
- PR `#15` fora do modo rascunho e pronto para revisão.

Limitação: não foi possível abrir duas sessões simultâneas pelo conector sem credenciais explícitas. O teste de carga concorrente real permanece para a Etapa 20.

Detalhes: `docs/ETAPA-17-HOMOLOGACAO-POS-MERGE.md`.

## 11. Migrations finais

A lista integral está em `diretrizes/INVENTARIO.md`. As últimas correções versionadas são:

```text
20260720160800_stage17_inventory_concurrency_locks.sql
20260720160900_stage17_inventory_performance_indexes.sql
20260720161000_stage17_inventory_rpc_privileges.sql
```

## 11. Homologação

O teste reproduzível está em:

```text
supabase/tests/stage17_inventory_homologation.sql
```

Ele cria identidade, organizações, obras e dados efêmeros dentro de uma transação e termina com `ROLLBACK`.

Os 14 testes aprovados foram:

- autorização do Super Admin;
- saldo sem coluna editável;
- categorias padrão;
- unidades padrão;
- entrada aumenta saldo;
- saída reduz saldo;
- instalação do módulo;
- idempotência de movimento;
- isolamento multiempresa;
- isolamento multiobra;
- bloqueio de saldo negativo;
- imutabilidade de movimento postado;
- reversão restaura saldo;
- transferência conserva saldo.

Relatório completo:

```text
docs/RELATORIO-HOMOLOGACAO-ETAPA-17.md
```

## 12. Definition of Done adicional

- documentação atualizada no mesmo PR — atendida na branch corretiva;
- migration aplicada e homologada — atendida;
- recebimento de Compras integrado de forma idempotente — implementado e protegido estruturalmente;
- saldo não editável diretamente — atendido;
- movimentos concluídos imutáveis — atendido;
- testes de concorrência e saldo — locks implementados, saldo testado; disputa real com duas conexões permanece pendente;
- isolamento multiempresa e multiobra — atendido pelos testes;
- CI verde — branch original aprovada; branch corretiva precisa permanecer verde antes do merge.

## 13. Limitações

- ambiente não possui contas permanentes de homologação;
- E2E de navegador ainda não foi repetido após a Etapa 17;
- teste simultâneo com duas sessões reais ainda está pendente;
- fluxo completo de recebimento com fornecedor/pedido real permanece pendente;
- carga, volumetria e operação offline não foram homologadas;
- proteção contra senhas comprometidas e MFA adicional dependem da configuração do Supabase Auth.

## 14. Fora do escopo desta etapa

Os itens abaixo foram movidos para a Etapa 21, não descartados:

- WMS avançado;
- endereçamento automatizado;
- RFID em tempo real;
- ressuprimento automático sem aprovação;
- roteirização logística;
- integração fiscal de entrada;
- depreciação contábil oficial.

## 15. Estado final

A Etapa 17 está implementada, aplicada no Supabase, com ledger reconciliado, advisory lock preservado no GitHub, dois defeitos de homologação corrigidos e 14 testes transacionais aprovados.

Ela está tecnicamente homologada, mas não liberada para produção enquanto as limitações da seção 13 permanecerem abertas.
