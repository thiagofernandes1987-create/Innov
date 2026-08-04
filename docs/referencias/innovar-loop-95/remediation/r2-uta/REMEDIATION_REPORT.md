# UTA-R2 — Relatório de Remediação Controlada

## 1. Estado e limites

A working copy foi alterada; o material original permaneceu imutável. Nenhum item bloqueado foi marcado como remediado. O pacote permanece `DRAFT` até R3A/R3B.

## 2. Disposição dos achados

- **14** remediados com validação local.
- **3** parcialmente remediados.
- **6** bloqueados por dependência externa.

## 3. Mudanças materiais

- Idempotência administrativa escopada por organização e operação.
- Contexto autenticado de proxy confiável por HMAC e timestamp.
- OpenAPI, catálogo de erros e SDK semanticamente alinhados.
- Backoff progressivo e operação idempotente no runtime de referência.
- Diff JSON Schema recursivo e baselines com `$id` exclusivos.
- Metadados de ciclo de vida e métricas limitadas pela evidência.
- Campanha separando observação estrutural de execução PASS.
- Docker/Compose endurecido para desenvolvimento local.
- Migration 0014 para resolução idempotente declarativa no PostgreSQL.
- BDD local ampliado para 14/38 cenários.

## 4. Validação

- 78/78 testes da suíte `tests`.
- 16/16 testes em `bdd_steps`.
- 94/94 itens no pytest agregado.
- TypeScript compile e SDK drift: PASS.
- Orquestrador final: 22 PASS, 0 FAIL e 7 BLOCKED_EXTERNAL.
- Campanha: 24 PASS, 66 OBSERVED, 10 BLOCKED_EXTERNAL e 0 FAIL.

## 5. Pendências externas

- lockfiles verificados; digests OCI/SBOM/assinatura/provenance;
- PostgreSQL/RLS/concorrência; Redpanda; XState oficial;
- Helm/kubeconform/Kubernetes/NetworkPolicy;
- GitHub protected workflow/OIDC e evidência operacional.

## 6. Gate de handoff

O pacote R3A cego não pôde ser construído porque o prompt R3A standalone e o neutral core não foram fornecidos. A R2 deve ser interpretada como checkpoint congelado, não como conclusão formal do protocolo.
