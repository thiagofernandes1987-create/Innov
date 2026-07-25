# Runbook — fila parada

1. Confirmar `queue_lag_seconds` e quantidade de leases expirados.
2. Verificar banco, Redis e provider.
3. Pausar autoscaling se houver tempestade de retry.
4. Revogar leases expirados:
   `UPDATE platform.outbox_messages SET locked_by=NULL, locked_until=NULL WHERE published_at IS NULL AND locked_until < now();`
5. Reiniciar apenas workers não saudáveis.
6. Reprocessar em lotes.
7. Validar idempotência e efeitos externos.
8. Registrar incidente e postmortem.
