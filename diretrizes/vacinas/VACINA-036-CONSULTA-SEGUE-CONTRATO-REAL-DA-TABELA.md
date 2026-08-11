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

## Portão automático — desde 11/08/2026

O teste acima cobre **o caminho que ele percorre**, e só ele. Medido por
sabotagem no dia em que o portão nasceu: acrescentar `coluna_que_nao_existe` a
um `.select()` de `daily_logs` **não reprovava nada** — nem `pnpm lint`, nem
`pnpm typecheck`, nem os 45 validadores de então, nem os 1.086 testes.

`pnpm validate:colunas-existentes` reconstrói as colunas de cada tabela a partir
das migrations e confere o que o código pede: cada nome de primeiro nível do
`.select()`, e a coluna de `.eq`, `.neq`, `.gt`, `.gte`, `.lt`, `.lte`, `.like`,
`.ilike`, `.is`, `.in`, `.contains` e `.order`. Na primeira execução: **869
`.select()` com 3.335 colunas e 2.003 filtros sobre 330 tabelas**.

Achou dois casos idênticos ao original — coluna assumida por convenção:

    rh_payroll_runs.created_at      a tabela tem `started_at`
    rh_esocial_events.processed_at  nunca existiu

Quatro sabotagens vistas reprovando, com o caso legítimo passando: coluna
inventada no `.select()`, ordenação por `created_at` inexistente, dívida apagada
por engano e dívida órfã declarada.

## Limitações da prevenção

A execução do teste cobre o caminho com uma linha e sem lote. Múltiplas linhas,
conversão de unidade, lotes, validade, rejeição parcial e concorrência
permanecem cenários dedicados.

O portão, por sua vez, **não confere** o que não sabe: relação que não nasce de
`create table` (view, view materializada, resultado de RPC), string de consulta
montada em tempo de execução, e coluna dentro de embed — esta última é trabalho
do `validate:postgrest-embeds`.

E há uma limitação maior, que ele mediu ao nascer e não resolve: **o repositório
não declara o próprio schema**. 77 tabelas existem no banco de produção e
nenhuma migration as cria; 7 colunas usadas pelo código estão no banco e não nas
migrations, datadas em `diretrizes/COLUNAS-SEM-MIGRATION.json`. Conferir contra
as migrations é conferir contra um contrato incompleto — a reconciliação é a
S-77.
