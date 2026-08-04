# 004 — Replay original response

**Status:** ACCEPTED

## Decisão

A chave persiste hash e resposta por 7 dias.

## Alternativas

Retornar 409 para toda repetição foi rejeitado.

## Consequências

Mesmo payload recebe replay; payload diferente recebe conflito.
