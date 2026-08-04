# Plano de Pendências Externas

1. Resolver e revisar lockfiles em registries confiáveis; executar `npm ci` e `pip --require-hashes`.
2. Fixar imagens por digest, gerar SBOM, assinar e publicar provenance.
3. Subir PostgreSQL 16 limpo; aplicar migrations `0001` a `0015`; testar RLS com duas roles `NOBYPASSRLS`, pool reuse, concorrência e idempotência por recurso.
4. Executar Redpanda/Kafka e REST Proxy com tópicos reais, replay, deduplicação, DLQ e falhas.
5. Executar XState oficial após lockfile verificado.
6. Renderizar Helm, validar com kubeconform, instalar em cluster e testar NetworkPolicies.
7. Executar GitHub Actions com branch protection, environments e OIDC.
8. Produzir SLO, carga, backup/restore, RTO/RPO e game day operacional.
