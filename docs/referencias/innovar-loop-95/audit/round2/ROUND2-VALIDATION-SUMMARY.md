# Validação da Rodada 2

- Resultado: **PARTIAL_BLOCKED**
- Gates canônicos PASS: 21
- Gates canônicos FAIL: 0
- Gates canônicos BLOCKED_EXTERNAL: 7

| Controle | Tipo | Resultado | Evidência |
|---|---|---|---|
| `canonical_status` | LOCAL | `PASS` | `audit/round2/canonical_status.txt` |
| `openapi_contract` | LOCAL | `PASS` | `audit/round2/openapi_contract.txt` |
| `evidence_records` | LOCAL | `PASS` | `audit/round2/evidence_records.txt` |
| `tenant_convention` | LOCAL | `PASS` | `audit/round2/tenant_convention.txt` |
| `error_catalog` | LOCAL | `PASS` | `audit/round2/error_catalog.txt` |
| `asyncapi_operations` | LOCAL | `PASS` | `audit/round2/asyncapi_operations.txt` |
| `bdd_registry` | LOCAL | `PASS` | `audit/round2/bdd_registry.txt` |
| `statechart_registry` | LOCAL | `PASS` | `audit/round2/statechart_registry.txt` |
| `metrics_matrix` | LOCAL | `PASS` | `audit/round2/metrics_matrix.txt` |
| `workflow_security` | LOCAL | `PASS` | `audit/round2/workflow_security.txt` |
| `sdk_operation_coverage` | LOCAL | `PASS` | `audit/round2/sdk_operation_coverage.txt` |
| `event_compatibility` | LOCAL | `PASS` | `audit/round2/event_compatibility.txt` |
| `traceability` | LOCAL | `PASS` | `audit/round2/traceability.txt` |
| `requirements` | LOCAL | `PASS` | `audit/round2/requirements.txt` |
| `env_contract` | LOCAL | `PASS` | `audit/round2/env_contract.txt` |
| `helm_static` | LOCAL | `PASS` | `audit/round2/helm_static.txt` |
| `remediation_register` | LOCAL | `PASS` | `audit/round2/remediation_register.txt` |
| `pytest` | LOCAL | `PASS` | `audit/round2/pytest.txt` |
| `sdk_drift` | LOCAL | `PASS` | `audit/round2/sdk_drift.txt` |
| `sdk_tsc` | LOCAL | `PASS` | `audit/round2/sdk_tsc.txt` |
| `dependency_locks` | EXTERNAL_GATE | `BLOCKED_EXTERNAL` | `audit/round2/dependency_locks.txt` |
| `image_digests` | EXTERNAL_GATE | `BLOCKED_EXTERNAL` | `audit/round2/image_digests.txt` |
| `postgres_runtime` | EXTERNAL_GATE | `BLOCKED_EXTERNAL` | `audit/round2/postgres_runtime.txt` |
| `redpanda_runtime` | EXTERNAL_GATE | `BLOCKED_EXTERNAL` | `audit/round2/redpanda_runtime.txt` |
| `xstate_official_runtime` | EXTERNAL_GATE | `BLOCKED_EXTERNAL` | `audit/round2/xstate_official_runtime.txt` |
| `networkpolicy_runtime` | EXTERNAL_GATE | `BLOCKED_EXTERNAL` | `audit/round2/networkpolicy_runtime.txt` |
| `external_prerequisites` | EXTERNAL_GATE | `BLOCKED_EXTERNAL` | `audit/round2/external_prerequisites.txt` |
| `package_hygiene_final` | LOCAL | `PASS` | `audit/round2/package_hygiene_final.txt` |

## Execuções suplementares independentes

| Comando | Resultado | Evidência | Observação |
|---|---|---|---|
| `unit_tests` | `PASS` | `audit/round2/unit_tests.txt` | 70 tests; explicit execution retained separately from pytest |
| `bdd_unit_tests` | `PASS` | `audit/round2/bdd_unit_tests.txt` | 8 tests; explicit execution retained separately from pytest |
| `validate_all` | `PASS_WITH_EXTERNAL_BLOCKS` | `audit/round2/validate_all.txt` | aggregate local validation passed; dependency locks and image digests remained blocked externally |
| `release_file_manifest` | `PASS` | `audit/round2/release_file_manifest.txt` | manifesto de arquivos da release validado sem itens ausentes ou divergentes |

> As execuções `unit_tests`, `bdd_unit_tests` e `pytest` se sobrepõem. Seus totais não devem ser somados como cobertura adicional.
