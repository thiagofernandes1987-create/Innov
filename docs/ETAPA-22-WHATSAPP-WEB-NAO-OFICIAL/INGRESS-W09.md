# W-09 — Ingress e normalização

## Estado

Concluída no escopo sintético, sem socket externo ou sessão real.

## Fluxo

```text
EngineEvent
  -> normalização provider-neutral
  -> validação de tenant e conta
  -> envelope canônico sanitizado
  -> persistência idempotente
  -> estado PERSISTED
  -> claim durável
  -> dispatch
  -> DISPATCHED ou DLQ
```

## Garantias

- `CanonicalIngressEnvelope` versionado;
- idempotency key SHA-256 provider/account/event scoped;
- organização e conta resolvidas antes da persistência;
- wrappers normalizados;
- material efêmero e view-once não é persistido como conteúdo bruto;
- replies, receipts, contatos, grupos e eventos de sessão usam contratos próprios;
- `channel_inbox_events` é reutilizada, sem domínio paralelo;
- `FOR UPDATE SKIP LOCKED` no claim;
- DLQ contém somente snapshot sanitizado;
- replay exige justificativa e preserva a mesma identidade do evento;
- eventos fora de ordem são preservados, não sobrescritos;
- workflow, regra e IA são proibidos antes de `PERSISTED`;
- escrita direta por `authenticated` permanece revogada.

## Artefatos

- `apps/messaging-gateway/src/ingress/**`;
- `supabase/migrations/20260804142000_stage22_ingress_normalization.sql`;
- `supabase/tests/messaging-ingress/ingress.test.sql`;
- `scripts/run-messaging-ingress-db-tests.mjs`;
- `scripts/validate-messaging-ingress.mjs`;
- `tests/messaging-ingress.test.ts`.

## Limites

Não registra o runtime Baileys, não abre conexão, não baixa mídia, não executa automação ou IA e não habilita produção.
