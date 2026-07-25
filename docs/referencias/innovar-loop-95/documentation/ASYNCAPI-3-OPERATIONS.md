# AsyncAPI 3.0 — interpretação canônica

## Regra
No AsyncAPI 3.0, ações de produção e consumo são representadas em `operations` no nível superior, usando `action: send` e `action: receive`. A ausência de chaves `publish`/`subscribe` dentro de `channels` não constitui, por si só, uma falha.

## Estado AUTO12-R2
- Canais: 7.
- Operações top-level: 14.
- Cada canal possui uma operação `send` e uma operação `receive`.
- Cada canal declara address, messages e binding Kafka.
- Tráfego em Redpanda real: `BLOCKED_EXTERNAL`.

Validação: `python scripts/validate_asyncapi_operations.py`.
