# Evidências — Sprint W-09

**Sprint:** ingress e normalização  
**Estado:** concluída no escopo sintético  
**Data:** 04 de agosto de 2026

## Checklist

- [x] envelope canônico;
- [x] persistência antes do dispatch;
- [x] idempotency key;
- [x] wrappers, efêmeras e view-once normalizados sob política;
- [x] replies e quoted representados no contrato;
- [x] receipts normalizados;
- [x] contatos, grupos e namespaces canônicos;
- [x] organização e conta resolvidas fail-closed;
- [x] estados do ingress;
- [x] DLQ sanitizada;
- [x] replay idempotente com justificativa;
- [x] duplicado e fora de ordem testados;
- [x] payload desconhecido rejeitado;
- [x] IA bloqueada antes de `PERSISTED`.

## Validação funcional

Head funcional: `13676b7d19417c99fae362339da16368bedd9228`.

- CI `30920418607`: verde;
- File Security E2E `30920417917`: verde;
- `messaging-ingress-boundary-v1`: verde;
- 12 controles PostgreSQL W-09: verdes;
- testes TypeScript W-09: verdes;
- lint e typecheck: verdes;
- suíte global e Python: verdes;
- build do gateway e Next.js: verdes;
- container não-root e sem rede: verde.

## Não executado

- socket externo;
- QR ou pairing real;
- sessão ou número real;
- dispatch para provider real;
- automação ou IA;
- deploy, piloto ou produção.
