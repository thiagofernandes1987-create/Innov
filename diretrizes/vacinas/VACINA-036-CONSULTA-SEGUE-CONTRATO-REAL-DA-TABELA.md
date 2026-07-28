# VACINA-036 — Consulta segue o contrato real da tabela

**Estado:** vigente  
**Detectada em:** campanha QA de personas, rodada Estoque, 28 de julho de 2026

## Qual foi o problema

A importação de um recebimento aceito para o estoque falhava porque ordenava as
linhas por `procurement_receipt_items.created_at`, coluna inexistente.

## Como ocorreu

`import_procurement_receipt_to_inventory` criou o movimento corretamente, mas o
`INSERT ... SELECT` das linhas referenciava uma propriedade que nunca fez parte
do contrato da tabela.

## Por que aconteceu

A consulta foi construída por expectativa de convenção (`created_at` em toda
tabela), e não a partir do schema real. O fluxo anterior não atravessava compras
até o saldo físico e, portanto, não executava esse trecho.

## Como foi detectado

O cenário integrado P9 → P10 → P4 concluiu compra, aprovação e recebimento e
então chamou a importação. O PostgreSQL abortou a transação na coluna ausente.

## Qual foi a solução

A ordem das linhas passou a usar a fonte de negócio correta:

```text
procurement_request_items.line_number
→ procurement_receipt_items.id como desempate
```

A consulta agora junta item recebido, item do pedido e linha original da
solicitação. Depois da correção, o movimento ficou `POSTED` e o dashboard mostrou
saldo físico 24.

## Varredura e ocorrências equivalentes

Foram comparadas as colunas usadas pela RPC com
`information_schema.columns`. A ordenação por linha da solicitação também
preserva a sequência compreensível para comprador e almoxarife.

## Prevenção automática

O teste não termina em “recebimento aceito”. Ele exige:

```text
recebimento aceito
→ importação idempotente
→ movimento POSTED
→ saldo visível pelo dashboard seguro
```

## Limitações da prevenção

A execução cobre o caminho com uma linha e sem lote. Múltiplas linhas, conversão
de unidade, lotes, validade, rejeição parcial e concorrência permanecem cenários
dedicados.
