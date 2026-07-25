# 002 — JSONB hybrid metadata records

**Status:** ACCEPTED

## Decisão

Metadata records usam colunas canônicas + values JSONB; objetos críticos permanecem compilados.

## Alternativas

EAV foi rejeitado; tabela por objeto fica disponível como estratégia futura.

## Consequências

GIN apenas para consultas autorizadas e quotas de índices.
