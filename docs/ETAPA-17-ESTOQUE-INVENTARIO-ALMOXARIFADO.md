# Etapa 17 — Estoque, Inventário e Almoxarifado

**Estado:** em implementação  
**Versão-alvo:** 0.17.0  
**Início:** 20 de julho de 2026  
**Branch:** `feature/etapa-17-estoque-inventario-almoxarifado`

## 1. Objetivo

Implementar o aplicativo modular `estoque` com rastreabilidade integral do material recebido, armazenado, reservado, transferido, entregue, devolvido, perdido, ajustado ou inventariado.

Fluxo principal:

```text
recebimento de compras aceito
→ entrada idempotente
→ saldo por depósito/localização/obra
→ reserva
→ saída para obra/equipe/responsável
→ devolução ou transferência
→ ajuste/perda
→ inventário físico
→ divergência aprovada
→ indicadores e auditoria
```

## 2. Princípios

1. saldo é derivado de movimentos concluídos, nunca editado diretamente;
2. movimento concluído é imutável;
3. transferência é atômica: saída e entrada pertencem à mesma operação;
4. integração com recebimento de Compras é idempotente;
5. nenhum saldo negativo é permitido sem política explícita futura;
6. ajuste exige motivo, capacidade administrativa e auditoria;
7. itens, depósitos, lotes, ativos e movimentos pertencem à organização;
8. vínculos com obra, fornecedor, pedido, recebimento, equipe e usuário precisam pertencer ao mesmo tenant;
9. ferramentas e ativos controlados não são tratados como consumo comum;
10. documentação, schema, testes e inventário serão atualizados no mesmo PR.

## 3. Escopo incluído

### 3.1 Catálogo

- itens de estoque;
- materiais consumíveis;
- ferramentas controladas;
- ativos/equipamentos;
- categorias hierárquicas;
- unidades de medida;
- código interno e código de barras opcional;
- estoque mínimo;
- controle de lote e validade configurável;
- ativo/inativo;
- custo de referência sem substituir o financeiro oficial.

### 3.2 Estrutura física

- depósitos/almoxarifados;
- localização interna opcional;
- depósito geral;
- depósito por obra;
- localização padrão;
- endereço e responsável;
- ativação/desativação sem perda de histórico.

### 3.3 Movimentos

- entrada por recebimento de compras;
- entrada manual autorizada;
- saída para obra;
- saída para equipe/responsável;
- consumo;
- devolução;
- transferência entre depósitos;
- perda/avaria;
- ajuste positivo ou negativo;
- reversão controlada por novo movimento, sem apagar o original.

### 3.4 Reservas

- reserva por obra;
- reserva por tarefa/EAP opcional;
- quantidade solicitada, reservada e consumida;
- liberação parcial ou total;
- expiração opcional;
- bloqueio de consumo acima do reservado quando a operação exigir reserva.

### 3.5 Lotes e validade

- lote do fornecedor;
- validade;
- quantidade por lote/localização;
- FEFO como recomendação futura, não decisão automática nesta etapa;
- alerta de vencimento configurável.

### 3.6 Ferramentas e ativos

- número patrimonial ou serial;
- estado: disponível, em uso, manutenção, perdido, baixado;
- cautela para equipe ou responsável;
- entrega e devolução;
- histórico de custódia;
- manutenção básica registrada;
- foto/documento opcional em evolução posterior.

### 3.7 Inventário físico

- abertura de contagem por depósito;
- congelamento lógico do escopo contado;
- linhas esperadas;
- quantidade contada;
- divergência;
- segunda contagem opcional;
- aprovação;
- geração de ajuste imutável;
- encerramento auditado.

### 3.8 Indicadores

- saldo atual;
- saldo reservado;
- saldo disponível;
- itens abaixo do mínimo;
- itens sem movimento;
- perdas e ajustes;
- consumo por obra;
- valor estimado por custo de referência;
- ativos em uso, manutenção ou atraso de devolução;
- divergências de inventário.

## 4. Fora do escopo

- WMS avançado;
- RFID ou IoT em tempo real;
- ressuprimento automático sem aprovação humana;
- roteirização logística;
- emissão fiscal de entrada/saída;
- depreciação contábil oficial;
- integração direta com balança;
- picking por onda;
- endereçamento automatizado;
- múltiplas empresas fiscais em uma mesma organização sem modelagem específica.

## 5. Modelo de dados planejado

### Catálogo e estrutura

- `inventory_categories`;
- `inventory_units`;
- `inventory_items`;
- `inventory_warehouses`;
- `inventory_locations`;
- `inventory_lots`.

### Movimentação e saldo

- `inventory_movements`;
- `inventory_movement_lines`;
- `inventory_receipt_imports`;
- view `inventory_stock_v`;
- view `inventory_available_stock_v`.

### Reservas

- `inventory_reservations`;
- `inventory_reservation_lines`.

### Ativos e ferramentas

- `inventory_assets`;
- `inventory_asset_custodies`;
- `inventory_asset_maintenance`.

### Inventário físico

- `inventory_stocktakes`;
- `inventory_stocktake_lines`.

### Auditoria

- `inventory_events`.

## 6. Estados planejados

### Movimento

- `DRAFT`;
- `POSTED`;
- `REVERSED`;
- `CANCELED`.

### Reserva

- `DRAFT`;
- `ACTIVE`;
- `PARTIALLY_CONSUMED`;
- `CONSUMED`;
- `RELEASED`;
- `EXPIRED`;
- `CANCELED`.

### Inventário físico

- `DRAFT`;
- `COUNTING`;
- `UNDER_REVIEW`;
- `APPROVED`;
- `POSTED`;
- `CANCELED`.

### Ativo

- `AVAILABLE`;
- `IN_USE`;
- `MAINTENANCE`;
- `LOST`;
- `RETIRED`.

## 7. RPCs planejadas

- `create_inventory_item`;
- `post_inventory_movement`;
- `reverse_inventory_movement`;
- `import_procurement_receipt_to_inventory`;
- `create_inventory_reservation`;
- `release_inventory_reservation`;
- `consume_inventory_reservation`;
- `assign_inventory_asset`;
- `return_inventory_asset`;
- `start_inventory_stocktake`;
- `submit_inventory_stocktake`;
- `approve_inventory_stocktake`;
- `post_inventory_stocktake_adjustment`.

Todas as operações de múltiplas tabelas serão transacionais e idempotentes quando houver fonte externa.

## 8. Integrações

### Compras

- recebimento `ACCEPTED` ou `ACCEPTED_WITH_RESTRICTION` pode originar entrada;
- importação usa chave única do recebimento;
- quantidade rejeitada não entra no estoque;
- repetição da importação devolve o mesmo resultado sem duplicar saldo.

### Obras

- depósitos podem ser gerais ou vinculados a obra;
- saídas e reservas podem apontar para obra;
- consumo por obra alimenta indicadores.

### Equipes

- saída/custódia pode apontar para equipe ou responsável;
- ferramenta deve manter histórico de quem recebeu e devolveu.

### Financeiro

- custo do movimento é informativo e rastreável;
- contabilização oficial permanece no módulo Financeiro;
- nenhuma baixa de estoque altera lançamento financeiro diretamente nesta etapa.

### Relatórios

- indicadores serão expostos por view/RPC autorizada;
- valores estimados exigem capacidade sensível quando aplicável;
- o módulo de Relatórios não consultará tabelas internas diretamente pela interface.

## 9. Segurança

- módulo habilitado por organização;
- RLS em todas as tabelas de domínio;
- leitura por capacidade `read` e escopo;
- criação/edição por `EDIT`;
- ajustes, reversões, aprovação de inventário e administração por capacidades elevadas;
- nenhum RPC acessível a `anon`;
- funções auxiliares com execução revogada;
- `security definer` somente com `search_path` explícito e checagem interna;
- validação multi-tenant em vínculos;
- índices em todas as FKs e filtros críticos;
- eventos sem segredo ou documento integral.

## 10. Imutabilidade e correção

- movimento `POSTED` não pode ser editado ou excluído;
- correção ocorre por movimento de reversão vinculado ao original;
- inventário `POSTED` é imutável;
- custódia encerrada não pode ter responsável ou datas reescritos;
- importação de recebimento não pode ser repetida com novo saldo;
- saldo é soma algébrica de linhas postadas.

## 11. Rotas planejadas

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

## 12. Migrations planejadas

1. schema, enums e tabelas;
2. views de saldo;
3. funções e invariantes;
4. RLS e privilégios;
5. registro modular e padrões;
6. integração com recebimentos;
7. índices e hardening;
8. correções de homologação, se necessárias.

## 13. Testes obrigatórios

- entrada aumenta saldo;
- saída reduz saldo;
- saldo negativo é bloqueado;
- transferência reduz origem e aumenta destino atomicamente;
- falha na entrada da transferência reverte a saída;
- importação de recebimento é idempotente;
- quantidade rejeitada não entra;
- movimento postado é imutável;
- reversão restaura saldo sem apagar histórico;
- reserva reduz disponível, não saldo físico;
- consumo de reserva atualiza estados;
- inventário gera ajuste aprovado;
- vínculo entre organizações é bloqueado;
- usuário sem capacidade não movimenta;
- perfil sem acesso sensível não visualiza valor estimado;
- todas as FKs críticas possuem índice;
- CI e documentação passam.

## 14. Homologação

A homologação deverá utilizar transações revertidas para regras estruturais e contas reais para RLS/capacidades. Não serão persistidos dados artificiais permanentes.

## 15. Documentação obrigatória no PR

- atualizar `diretrizes/SPEC.md`;
- atualizar `diretrizes/INVENTARIO.md`;
- atualizar `diretrizes/MODULOS.md`;
- atualizar `diretrizes/ROADMAP.md`;
- atualizar `diretrizes/RECUPERACAO.md` se houver novo bucket, worker ou variável;
- incluir migrations, rotas, RPCs, testes e limitações neste documento;
- atualizar `diretrizes/HISTORICO-ETAPAS.md`;
- incluir `validate:stage17` no CI.
