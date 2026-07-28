# VACINA-035 — Transição de enum precisa ser tipada

**Estado:** vigente  
**Detectada em:** campanha QA de personas, rodada Compras/Diário, 28 de julho de 2026

## Qual foi o problema

O recebimento de compra falhava ao finalizar com:

```text
column status is of type procurement_receipt_status
but expression is of type text
```

A mesma forma existia na decisão do Diário de Obra.

## Como ocorreu

Funções PL/pgSQL usavam `CASE` com literais textuais para atualizar colunas enum.
Em uma atribuição direta um literal pode ser inferido, mas o resultado comum do
`CASE` foi resolvido como `text` e não convertido para o enum da coluna.

## Por que aconteceu

O código parecia semanticamente correto e validadores estruturais não
executavam a transição real. O caminho foi escrito, mas não atravessado com dado
válido até o estado final.

## Como foi detectado

O cenário P9/P10 finalizou pedido e inseriu o recebimento. A RPC falhou antes de
atualizar recebimento, pedido e solicitação. A varredura de definições encontrou
`decide_daily_log` com o mesmo padrão.

## Qual foi a solução

Cada ramo devolve explicitamente o tipo da coluna, por exemplo:

```sql
case
  when condicao then 'ACCEPTED'::public.procurement_receipt_status
  else 'ACCEPTED_WITH_RESTRICTION'::public.procurement_receipt_status
end
```

Foram corrigidos:

- status do recebimento;
- status do pedido;
- status da solicitação;
- aprovação/rejeição do Diário de Obra.

## Varredura e ocorrências equivalentes

As demais funções com `SET status = CASE` foram inspecionadas. As transições de
Financeiro e Estoque já traziam casts explícitos.

## Prevenção automática

Cenários de banco precisam atravessar cada ramo material da máquina de estados.
Validar apenas a presença da função não detecta erro de resolução de tipo.

## Limitações da prevenção

A vacina cobre enums PostgreSQL. Domínios, tipos compostos e casts de JSON
possuem riscos semelhantes e exigem testes próprios.
