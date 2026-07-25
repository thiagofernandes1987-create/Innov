# Runbook — Dead Letter Queue

## Alertas

- DLQ recebeu mensagem;
- taxa terminal acima de 0,1%;
- mesma causa em três tenants;
- backlog sem resolução por 30 minutos.

## Triage

1. congelar replays automáticos;
2. identificar consumer, event type/version e tenant;
3. confirmar se o erro é determinístico ou transitório;
4. verificar compatibilidade de schema e deploy;
5. avaliar impacto e classificação de dados.

## Recuperação

- corrigir causa;
- executar replay em ambiente controlado;
- usar o mesmo event ID para preservar dedupe;
- registrar operador, motivo e resultado;
- resolver a row sem apagá-la.

## Escalonamento

Possível tenant crossing, corrupção, perda de dados ou segredo exposto é incidente de segurança/P1.
