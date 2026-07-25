# Threat Model — Innovar AUTO12-R2

## Escopo
API, PostgreSQL/RLS, event transport, administração de DLQ, evidence ledger, SDK e pipeline de entrega.

## Fronteiras de confiança
1. Cliente → API; 2. API → PostgreSQL; 3. Outbox → broker; 4. Broker → consumers; 5. CI → registry/cluster.

## Ameaças prioritárias
- **Cross-tenant access:** mitigado estaticamente por `organization_id` e `app.current_organization_id`; prova PostgreSQL real pendente.
- **Privilege escalation:** roles de aplicação devem ser `NOBYPASSRLS`; execução pendente.
- **Replay/duplicate delivery:** outbox/inbox e idempotência especificados; broker real pendente.
- **Evidence tampering:** append-only triggers e ledger; execução PostgreSQL pendente.
- **Supply-chain substitution:** actions fixadas por SHA; imagens OCI ainda sem digest.
- **Secret leakage:** nenhum segredo deve estar no pacote; scanning organizacional não comprovado.
- **DoS/cardinality:** quotas e SLOs documentados; carga operacional pendente.

## Critério de encerramento
Ameaças dependentes de runtime somente fecham com evidência externa assinada e vinculada ao hash do pacote.
