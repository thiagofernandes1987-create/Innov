# Runbook — desconexão e reconnect loop

1. confirmar `session_state`, número de reconnects e último fencing token;
2. ativar kill switch da sessão se houver `ACTION_REQUIRED`, disputa de lease ou crescimento contínuo;
3. verificar que somente uma instância possui lease válido;
4. classificar logout, restrição, falha transitória ou persistência de keys;
5. preservar logs estruturados, trace IDs e snapshots, sem credenciais ou corpos;
6. bloquear novos comandos de egress enquanto a causa não estiver classificada;
7. executar reconciliação de outbox/receipts após estabilização;
8. reabilitar somente após duas janelas sem novo alerta.

Nenhum passo autoriza QR, pairing, reconexão real ou número real nesta etapa.
