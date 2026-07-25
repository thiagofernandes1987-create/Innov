# 005 — Transactional outbox

**Status:** ACCEPTED

## Decisão

Evento e outbox são gravados na transação do domínio.

## Alternativas

Publicação direta no broker foi rejeitada.

## Consequências

Consumidores devem ser idempotentes.
