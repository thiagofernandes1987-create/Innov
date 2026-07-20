# Etapa 21 — WMS avançado e automação logística

**Estado:** planejada  
**Posição:** após a Etapa 20  
**Dependências:** Etapas 17, 19 e 20 concluídas  
**Atualização:** 20 de julho de 2026

## Objetivo

Evoluir o estoque operacional da Etapa 17 para gestão avançada de armazéns, rastreamento em tempo real, automação logística e integração fiscal e patrimonial.

## Fila de implantação

### 21.1 — WMS avançado

- recebimento dirigido;
- armazenagem orientada;
- separação, conferência e expedição;
- inventário cíclico;
- FEFO/FIFO configurável;
- produtividade e acuracidade.

### 21.2 — Endereçamento automatizado

- zona, corredor, módulo, nível e posição;
- sugestão automática de endereço;
- capacidade de peso e volume;
- restrições por item, lote e validade;
- reendereçamento auditado.

### 21.3 — RFID em tempo real

- tags, leitores, antenas e zonas;
- eventos de presença e movimentação;
- deduplicação e idempotência;
- tolerância a eventos fora de ordem;
- reconciliação com o razão de estoque;
- alertas de movimentação não autorizada.

### 21.4 — Ressuprimento automático sem aprovação

- políticas por item, depósito e obra;
- mínimo, máximo, ponto de pedido e lead time;
- execução idempotente;
- limites financeiros e operacionais;
- modo simulação;
- circuit breaker e suspensão manual;
- auditoria da decisão.

### 21.5 — Roteirização logística

- transferências e abastecimento de obras;
- janelas de atendimento;
- capacidade de veículo;
- prioridades e múltiplas paradas;
- rota planejada versus realizada;
- prova de entrega.

### 21.6 — Integração fiscal de entrada

- documento fiscal vinculado a pedido e recebimento;
- chave fiscal única;
- importação idempotente;
- validação de fornecedor, quantidade, valor e impostos;
- divergências, aceite e rejeição;
- armazenamento privado e hash;
- revisão fiscal antes de produção.

### 21.7 — Depreciação contábil oficial

- classes patrimoniais;
- vida útil, valor residual e método;
- competências e fechamentos;
- baixas, transferências e reavaliações;
- conciliação patrimonial;
- períodos fechados imutáveis;
- revisão contábil antes de produção.

## Invariantes

- RFID não altera saldo diretamente;
- saldo e posição física são derivados de operações concluídas;
- repetição não pode duplicar estoque, pedido ou documento fiscal;
- movimentos e eventos concluídos são imutáveis;
- falha parcial precisa permitir rollback ou compensação;
- automações respeitam organização, obra e depósito;
- integração fiscal e depreciação exigem aprovação profissional formal.

## Definition of Done adicional

- documentação atualizada no mesmo PR;
- migrations aplicadas e homologadas;
- recebimento de Compras e integração fiscal idempotentes;
- saldo e posição de endereço não editáveis diretamente;
- movimentos e eventos concluídos imutáveis;
- testes de concorrência e saldo;
- testes de endereçamento, capacidade e duplicidade;
- testes de eventos RFID atrasados e fora de ordem;
- testes de falha parcial e recuperação;
- isolamento multiempresa, multiobra e multidepósito;
- reconciliação RFID versus razão de estoque;
- ressuprimento automático com limites e circuit breaker;
- revisão fiscal e contábil formal;
- CI verde;
- homologação E2E registrada;
- plano de rollback e recuperação atualizado.

## Condições de início

- Etapa 17 homologada e incorporada;
- auditoria e observabilidade da Etapa 19 disponíveis;
- prontidão de produção da Etapa 20 concluída;
- estratégia de RFID definida;
- responsáveis fiscais e contábeis formalmente designados.

Este documento registra planejamento. Nenhuma capacidade da Etapa 21 é considerada implementada ou disponível em produção neste momento.
