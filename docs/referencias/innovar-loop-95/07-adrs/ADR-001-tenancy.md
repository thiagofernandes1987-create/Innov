# 001 — Shared-schema tenancy

**Status:** ACCEPTED

## Decisão

Todas as tabelas de negócio usam organization_id e RLS.

## Alternativas

Schema por tenant e banco por tenant foram rejeitados nesta fase por custo operacional.

## Consequências

Exige testes de crossing, cache tenant-aware e contexto server-side.
