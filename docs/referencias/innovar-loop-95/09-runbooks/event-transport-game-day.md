# Game day — Event Transport
## Objetivo
Comprovar atomicidade, recuperação de backlog, idempotência e replay controlado.
## Pré-condições
Ambiente isolado, dois tenants, Redpanda, PostgreSQL, dashboards e auditor identificado.
## Experimentos
1. Forçar rollback após `append_domain_event_and_outbox`; aceitar apenas zero linhas de agregado/evento/outbox.
2. Interromper broker por 10 minutos; confirmar crescimento da outbox e ausência de perda.
3. Restaurar broker; medir tempo até backlog zero. Registrar **RTO observado**.
4. Matar publisher após envio e antes de ack; aceitar duplicata de entrega, mas **duplicatas de efeito = 0**.
5. Injetar evento incompatível, mover à DLQ e executar dry-run/replay por API administrativa.
6. Acionar rollback da release do publisher preservando outbox e contratos.
## Critérios de aprovação
- zero mensagens perdidas;
- duplicatas de efeito = 0;
- nenhuma leitura cross-tenant;
- backlog retorna a zero dentro do SLO aprovado;
- trilha de auditoria contém ator, motivo, correlação e idempotency key.
## Evidência obrigatória
Logs, queries SQL, métricas antes/depois, timestamps, resultado do replay e decisão go/no-go.
