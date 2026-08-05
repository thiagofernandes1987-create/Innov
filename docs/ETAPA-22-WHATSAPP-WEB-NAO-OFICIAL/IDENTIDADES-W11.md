# W-11 — Identidades, contatos e deduplicação

## Estado

Concluída com fixtures sintéticas.

## Princípios

- `whatsapp_contacts` continua sendo o contato canônico do Cliente 360;
- PN, LID, grupo, newsletter e web user são identidades observadas;
- observação não equivale a confirmação;
- conflito não move automaticamente uma identidade;
- alias PN/LID exige o mesmo contato e confirmação explícita;
- merge exige optimistic concurrency e motivo;
- contato fonte é inativado, nunca apagado;
- conversas e aliases migram transacionalmente;
- identidades duplicadas são supersedidas, preservando histórico;
- cache é invalidado por versão da organização;
- cross-tenant e cross-account falham fechados.

## Artefatos

- `apps/messaging-gateway/src/identities/**`;
- migration `20260804160000_stage22_identity_reconciliation.sql`;
- `supabase/tests/messaging-identities/**`;
- `scripts/run-messaging-w11-identities-db-tests.mjs`;
- `scripts/validate-messaging-w11-identities.mjs`;
- `tests/messaging-identities.test.ts`.

## Validação

- `messaging-identities-boundary-v1`;
- 11 controles PostgreSQL;
- testes TypeScript incluídos na suíte global;
- lint, typecheck e build do gateway verdes no workflow incremental.
