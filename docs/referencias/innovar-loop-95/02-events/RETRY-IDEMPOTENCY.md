# Política executável de retry e idempotência

## Idempotência HTTP

- Obrigatória em `POST`, commands e operações externas.
- Escopo: `organization_id + operation_scope + idempotency_key`.
- TTL padrão: 7 dias.
- Hash: SHA-256 do método, rota canônica e corpo JSON canonicalizado.
- Mesma chave + mesmo hash + concluída: retornar status, headers e corpo originais.
- Mesma chave + hash diferente: `409 IDEMPOTENCY_KEY_REUSED`.
- Mesma chave + operação em andamento e lock válido: `409 OPERATION_IN_PROGRESS`.
- Lock expirado: nova tentativa pode assumir a operação com compare-and-swap.

## Retry de workers

```text
delay = min(300s, 2^attempt seconds) * jitter uniforme [0.9, 1.1]
max_attempts = 5
```

- `attempt` inicia em 1.
- Erros 4xx não transitórios não são repetidos.
- 408, 429, 500, 502, 503 e 504 podem ser repetidos.
- `Retry-After` do provider prevalece, limitado a 24 horas.
- Após limite: dead letter.
