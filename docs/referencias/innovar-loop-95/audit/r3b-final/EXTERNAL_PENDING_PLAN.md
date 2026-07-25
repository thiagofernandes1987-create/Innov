# Plano de Pendências Externas

| ID | Ambiente requerido | Procedimento de aceite |
|---|---|---|
| `FFND-R3B-0008` | Registries npm/Python confiáveis | Resolver dependências em registries confiáveis, revisar e congelar lockfiles; repetir npm ci e pip --require-hashes. |
| `FFND-R3B-0009` | Registry OCI com digests, assinatura e attestations | Resolver digests oficiais, atualizar referências, gerar SBOM, assinatura e provenance. |
| `FFND-R3B-0010` | PostgreSQL 16+, duas roles NOBYPASSRLS, pool de conexão | Executar banco efêmero/real com roles NOBYPASSRLS, matriz cross-tenant, pool reuse e concorrência. |
| `FFND-R3B-0011` | Redpanda/Kafka e rpk | Executar producer/consumer, falhas, replay e dedupe em Redpanda versionado. |
| `FFND-R3B-0012` | Helm, kubeconform, kubectl e cluster isolado | Renderizar com Helm oficial/kubeconform e executar testes de tráfego permitido/negado no cluster. |
| `FFND-R3B-0013` | Registry npm confiável e runtime XState oficial | Resolver lockfile confiável e executar testes oficiais de máquinas e migração de snapshots. |
