# 003 — Optimistic concurrency by default

**Status:** ACCEPTED

## Decisão

Agregados usam version e expected_version; locks pessimistas apenas para reservas críticas.

## Alternativas

Last-write-wins foi rejeitado.

## Consequências

Clientes devem tratar 409 VERSION_CONFLICT.
