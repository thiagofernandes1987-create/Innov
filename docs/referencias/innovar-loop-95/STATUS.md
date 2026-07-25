# Status canônico — INNOVAR-AUTO12-R3B-FOLLOWUP

> Fonte de identidade: `RELEASE-MANIFEST.yaml`. Este pacote reúne a árvore técnica completa, o blueprint executável, o dossiê congelado da R3B e as correções locais posteriores à reconciliação. O estado permanece **DRAFT** porque integrações externas não foram comprovadas.

## Estado

- Release de trabalho: `INNOVAR-AUTO12-R3B-FOLLOWUP`
- Base técnica: `INNOVAR-AUTO12-R2-UTA-R2`
- Reconciliação: `UTA-R3B`, preservada em `audit/r3b-final/`
- Estado: **DRAFT VALIDADO LOCALMENTE; NÃO OPERACIONALMENTE PROVADO**
- O ZIP original e os pacotes congelados R1/R2/R3A/R3B não foram sobrescritos.

## Correções pós-R3B executadas

- HMAC v2 vinculado a método, caminho/query normalizados, hash do corpo, idempotency key, timestamp, nonce e audience.
- Cache anti-replay de nonce com janela temporal controlada.
- Handler factory por servidor, eliminando compartilhamento global entre instâncias.
- Idempotência de replay e resolução vinculada a organização, operação, `dead_letter_id`, chave e hash semântico da requisição.
- Migration `0015_dlq_idempotency_resource_scope.sql` para PostgreSQL.
- Contrato OpenAPI dos endpoints DLQ alinhado ao modelo de trusted proxy HMAC.
- Validação/allowlist de tópico antes de construir URL do Redpanda REST Proxy.
- `validate_all.py` ampliado para incluir gates locais e externos e retornar código `77` quando houver bloqueio externo.
- Referências obsoletas do inventário SDK corrigidas no registro de remediação.
- Scripts de carga e game day atualizados para o contrato HMAC v2.

## Evidência local

- Suíte `tests`: **84 PASS**.
- Suíte `bdd_steps`: **16 PASS**.
- Pytest agregado: executado no fechamento do pacote; consultar `audit/post-r3b/VALIDATION-SUMMARY.json`.
- TypeScript e SDK drift: **PASS**.
- OpenAPI, AsyncAPI, JSON Schema, Helm estático, rastreabilidade e registro de remediação: **PASS local**.
- `validate_all.py`: esperado como `PARTIAL_BLOCKED`/código `77` enquanto gates externos estiverem indisponíveis.

## Métricas globais

- SCI global: **NOT_CALCULATED**.
- EEI global: **NOT_CALCULATED**.
- Meta de 95%: **NOT_EVALUABLE** sem fórmula versionada e evidência executável integral.

## Pendências que permanecem externas

- Lockfiles npm/Python verificados e hashes de dependências.
- Digests OCI, SBOM, assinatura e provenance.
- PostgreSQL/RLS/concorrência e execução da migration 0015.
- Redpanda real.
- XState oficial.
- Helm/kubeconform/Kubernetes/NetworkPolicy runtime.
- GitHub protected workflow/OIDC.
- SLO, carga, RTO/RPO, backup/restore e game day operacional.

## Regra de interpretação

`STATICALLY_VALIDATED`, `UNIT_EXECUTED` e `LOCAL_INTEGRATION: PARTIAL` não equivalem a integração externa nem a prova operacional. O pacote permanece DRAFT.
