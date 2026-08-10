# Sprint W-21 — Piloto limitado

## Decisão atual

`HOLD`

Nenhum piloto real foi iniciado. O Gate W-G20 permanece bloqueado, a revisão jurídica interna/externa não foi aprovada e não existe autorização para selecionar equipe ou conversas reais.

## Limites técnicos definidos

- equipe máxima: 5 pessoas;
- conversas máximas: 20;
- mensagens máximas: 100/dia;
- horário: 09:00–17:00, segunda a sexta, `America/Sao_Paulo`;
- campanhas: desativadas;
- IA: `DRAFT_ONLY`;
- feature flags por organização e sessão;
- kill switch obrigatório.

## SLIs e SLOs

- disponibilidade ≥ 99%;
- sucesso de entrega ≥ 98%;
- duplicidade = 0%;
- handoff ≤ 300 s;
- incidentes de segurança = 0;
- custo ≤ 500.000 micros por conversa.

Os objetivos são critérios propostos; não foram medidos em tráfego real.

## Critérios de aborto

Rollback imediato para restrição/logout, duplicidade, cross-tenant, falha de keys, split-brain/lease ou objeção jurídica. Crescimento de DLQ e duas janelas de SLO violadas exigem HOLD e análise.

## Rollback instantâneo

Kill switch, flags desligadas, parada do outbox, preservação de evidência, reconciliação sem reenvio, purge/desativação após aprovação e roteamento integral a humanos.

## Comparação de providers

Meta Cloud permanece oficial, com menor risco político-operacional. Baileys permanece opcional, não registrado e com risco/complexidade altos. A comparação atual é apenas arquitetural e sintética; disponibilidade, sucesso e custo reais permanecem desconhecidos.

## Revisão jurídica

`PENDING`. Nenhuma conclusão jurídica foi inventada.

## Gate W-G21

Não liberado. Decisão: `HOLD`, piloto real `NOT_EXECUTED`, produção `NOT_AUTHORIZED`.
