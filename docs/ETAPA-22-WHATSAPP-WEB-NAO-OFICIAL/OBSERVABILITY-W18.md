# Sprint W-18 — Observabilidade e operação

## Sinais

Métricas de baixa cardinalidade cobrem:

- estado e reconnect de sessão;
- ingress, egress e latência;
- retry e DLQ;
- mídia e scan;
- IA, tokens e custo;
- conflitos de lease;
- falhas de persistência de keys.

Labels aceitos são classes estáveis como provider, direção, estado, resultado, tipo de mídia e classe de motivo. IDs de organização, conversa, contato ou mensagem não são labels.

## Logs e traces

Logs estruturados reutilizam a redação W-17. Correlation e causation IDs atravessam ingress, persistência, plugins, IA, outbox e receipts. Spans rejeitam atributos com corpo, conteúdo, token, segredo ou credencial.

## Alertas

- `RECONNECT_LOOP`;
- `DLQ_GROWTH`;
- `LEASE_CONFLICT`;
- `KEY_PERSISTENCE_FAILURE`.

Alertas são deduplicados enquanto ativos, possuem runbook, acknowledgment e resolução auditável.

## Dashboard

Painéis: sessões, tráfego, confiabilidade, mídia e IA/custo.

## Limites

Os sinais são comprovados com snapshots sintéticos. Nenhuma sessão, conta, número ou tráfego real foi observado.
