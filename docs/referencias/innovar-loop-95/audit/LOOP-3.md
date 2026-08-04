# Loop 3 — Dados, runtime e operação

## Correções

- DDL de persistência de statecharts e DLQ;
- RLS forçada nas novas tabelas;
- SDK de lifecycle com idempotency key e ETag;
- feature BDD específica;
- Service, NetworkPolicy e ServiceAccount Helm;
- runbook operacional de DLQ;
- requisitos e catálogo de erros atualizados.

## Auditoria

A infraestrutura continua baseline: não há Helm CLI, Docker ou PostgreSQL disponíveis neste ambiente.
Consequentemente, YAML/SQL foram validados estaticamente, não instalados/executados.
