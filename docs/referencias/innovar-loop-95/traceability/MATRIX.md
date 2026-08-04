# Matriz vigente de cobertura e evidência — INNOVAR AUTO12-R2

> A matriz numérica anterior foi preservada em `audit/history/TRACEABILITY-MATRIX-LEGACY-59_3.md` e está `SUPERSEDED`.

## Estado do portfólio

- SCI global: **NOT_CALCULATED**.
- Percentual global: **não publicado**.
- Motivo: não existe inventário completo de todas as capabilities × facetas, com pesos versionados e evidência por célula.
- Resultado local da Rodada 2: consulte `traceability/COVERAGE-MATRIX-R2.yaml`.
- Achados e desfechos: consulte `remediation/REMEDIATION-REGISTER.yaml`.

## Regra de interpretação

`DOCUMENTED`, `STATICALLY_VALIDATED`, `UNIT_EXECUTED`, `LOCAL_INTEGRATION_EXECUTED`, `EXTERNAL_INTEGRATION_EXECUTED` e `OPERATIONALLY_PROVEN` são estados distintos. Um artefato presente ou parseado não prova integração nem operação.

## Pendências impeditivas de prova externa

PostgreSQL/RLS, Redpanda, XState oficial com lock verificado, Helm/kubeconform/Kubernetes, digests OCI, GitHub protected workflow e SLO operacional permanecem sem prova externa neste ambiente.
