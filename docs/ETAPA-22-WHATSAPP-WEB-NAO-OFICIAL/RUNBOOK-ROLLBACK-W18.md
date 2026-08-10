# Runbook — rollback do provider opcional

1. ativar kill switch global e da sessão afetada;
2. desabilitar feature flags do provider não oficial;
3. parar claims do outbox e aguardar encerramento gracioso;
4. preservar comandos, tentativas, DLQ, receipts e auditoria;
5. restaurar adapter/runtime da versão previamente validada;
6. validar session store e fencing antes de qualquer retomada;
7. reconciliar mensagens pendentes sem duplicar envio;
8. manter Meta Cloud inalterado como runtime oficial;
9. registrar incidente, causa raiz, métricas e vacina;
10. reabrir tráfego somente após gates e revisão humana.

Rollback lógico não apaga histórico e não autoriza conexão real nesta etapa.
