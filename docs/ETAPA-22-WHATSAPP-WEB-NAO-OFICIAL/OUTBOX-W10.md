# W-10 — Outbox, comandos e entrega

## Estado

Concluída no escopo sintético, sem provider real.

## Fluxo

```text
mensagem canônica
  -> comando idempotente persistido
  -> outbox durável
  -> claim ordenado por conversa
  -> ledger de tentativa
  -> provider fake/double
  -> sucesso, retry limitado ou DLQ
  -> reconciliação de confirmação ausente
```

## Garantias

- comando canônico versionado;
- persistência anterior ao envio;
- separação entre mensagem, comando, outbox e tentativa;
- sequência monotônica por conversa;
- `FOR UPDATE SKIP LOCKED` e claim por worker;
- idempotência por organização/provider/conta/chave;
- backoff exponencial limitado;
- classificação retryable e terminal;
- circuit breaker por conta;
- rate limit atômico por organização e conta;
- DLQ outbound sanitizada;
- replay exige justificativa e preserva histórico;
- timeout de confirmação é reconciliado;
- status canônico não regride;
- nenhuma tabela paralela de mensagens foi criada.

## Artefatos

- `apps/messaging-gateway/src/outbox/**`;
- migrations `20260804151000`, `20260804151500` e `20260804152000`;
- `supabase/tests/messaging-outbox/outbox.test.sql`;
- `scripts/run-messaging-outbox-db-tests.mjs`;
- `scripts/validate-messaging-outbox.mjs`;
- `tests/messaging-outbox.test.ts`;
- `.github/workflows/messaging-w10.yml`.

## Limites

O worker utiliza doubles. Não registra Baileys no runtime, não abre socket, não envia mensagem real e não habilita produção.
