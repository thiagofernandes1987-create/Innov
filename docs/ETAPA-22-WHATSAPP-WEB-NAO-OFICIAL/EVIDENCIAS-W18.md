# Evidências — Sprint W-18

**Estado:** concluída no escopo sintético  
**Data:** 04 de agosto de 2026

## Checklist

- [x] métricas de sessão;
- [x] métricas ingress e egress;
- [x] métricas retry e DLQ;
- [x] métricas de mídia;
- [x] métricas de IA e custo;
- [x] logs estruturados e sanitizados;
- [x] traces ponta a ponta;
- [x] dashboard operacional;
- [x] alerta de reconnect loop;
- [x] alerta de DLQ;
- [x] alerta de perda de lease;
- [x] alerta de persistência de keys;
- [x] runbook de desconexão;
- [x] runbook de upgrade Baileys;
- [x] runbook de rollback.

## Evidência executável

Head funcional: `4c0d988f5268d8b7dfd7718b642c4822260cdea8`.

- Messaging Incremental Loop `30942325656`: verde;
- CI `30942325531`: preflight e quality verdes;
- File Security E2E `30942325553`: verde;
- `messaging-observability-operations-boundary-v1`: verde;
- 10 controles PostgreSQL W-18: verdes;
- suíte global, lint, typecheck, Python, gateway, container e Next.js: verdes.

## Não executado

Nenhuma métrica ou alerta foi coletado de sessão, conta, número ou tráfego real. Os snapshots e alertas usados são sintéticos.
