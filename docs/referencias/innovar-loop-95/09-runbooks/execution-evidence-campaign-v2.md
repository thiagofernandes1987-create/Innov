# Execution Evidence Campaign v2

A gate is complete only when command, UTC timestamp, tool versions, exit code, logs and SHA-256 artifacts are preserved. `BLOCKED` is not `PASS`.

## Ordered gates
1. Apply migrations 0001–0012 to clean PostgreSQL.
2. Confirm UUID v4 generation and trigger installation.
3. Execute RLS with two `NOBYPASSRLS` roles and `FORCE ROW LEVEL SECURITY`.
4. Execute the PostgreSQL adapter against the migrated schema.
5. Start a three-node Redpanda cluster and validate with `rpk cluster health --exit-when-healthy`.
6. Run `helm lint`, `helm template`, kubeconform strict and API-server dry run.
7. Install in an ephemeral Kubernetes namespace and capture rollout evidence.
8. Validate NetworkPolicy selectors and deny/allow probes from dedicated pods.
9. Install and execute the pinned official XState runtime.
10. Generate the SDK manifest twice and enforce clean git diff.
11. Execute load tests and distributed game day, preserving RTO, p50, p95, loss, duplicate effects and backlog recovery.

## Required variables
`TEST_DATABASE_URL`, `KUBECONFIG`, `INNOVAR_NAMESPACE`, `REDPANDA_BROKERS`, `EVIDENCE_DIR`, `GAMEDAY_RTO_TARGET_SECONDS`.
