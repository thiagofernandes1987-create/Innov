# Sprint W-19 — Testes funcionais, chaos e performance

## Escopo executado

Foram executados unit tests, contract tests, integração PostgreSQL local, chaos sintético e benchmark local para:

- restart durante mensagem;
- restart durante atualização de keys;
- perda de rede;
- evento duplicado;
- receipt fora de ordem;
- mídia corrompida;
- banco indisponível;
- processo zumbi;
- réplicas disputando sessão;
- upgrade/downgrade do contrato canônico;
- restore em infraestrutura sintética nova;
- memória por sessão sintética, throughput e latência.

## Limites do benchmark

Os gates locais usam:

- throughput mínimo: 1.000 operações sintéticas/s;
- p95 máximo: 5 ms por operação sintética em memória;
- máximo: 1 MB adicional por sessão sintética.

Esses limites detectam regressões do harness e não representam capacidade produtiva, rede real, provider externo ou SLA.

## Itens bloqueados e não executados

- W-19.4 — E2E com número de homologação: `BLOCKED_NOT_EXECUTED`;
- W-19.5 — QR e pairing: `BLOCKED_NOT_EXECUTED`.

O Gate W-G19 permanece fechado para qualquer número real. Nenhuma conclusão de homologação ou produção pode ser inferida destes testes.
