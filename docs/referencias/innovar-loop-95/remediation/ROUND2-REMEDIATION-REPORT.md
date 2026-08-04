# INNOVAR AUTO12-R2 — Relatório formal de remediação

## Sumário
1. Resumo executivo
2. Escopo e método
3. Cadeia de custódia
4. Disposição dos achados
5. Correções por domínio
6. Validação executada
7. Dependências externas
8. Métricas e limites
9. Preparação para a Rodada 3

## 1. Resumo executivo
Foram tratados os 35 achados da auditoria independente da Rodada 1 sem promover documentação a prova operacional. O resultado é dividido por escopo de fechamento, não por um percentual global.

| Disposição | Quantidade |
|---|---:|
| `RESOLVED_LOCAL` | 24 |
| `PARTIAL_EXTERNAL_DEPENDENCY` | 4 |
| `BLOCKED_EXTERNAL` | 6 |
| `DEFERRED_DECISION_REQUIRED` | 1 |

**SCI global:** `NOT_CALCULATED`.  
**EEI global:** `NOT_CALCULATED`.  
**Meta de 95%:** não avaliável sem inventário capability × faceta e evidência versionada.

## 2. Escopo e método
A remediação foi aplicada sobre cópia limpa do ZIP auditado. O original da Rodada 1 permanece preservado. Cada achado possui implementação, comando de validação, evidência e risco remanescente em `REMEDIATION-REGISTER.yaml`.

## 3. Cadeia de custódia
- Fonte: `INNOVAR_EXECUTABLE_SPEC_AUTO12_100_RODADAS_2026-07-22.zip`.
- Auditoria-base: `audit/round1-independent/FINDINGS_REGISTER.yaml`.
- Identidade remediada: `RELEASE-MANIFEST.yaml`.
- Integridade interna: `SHA256SUMS.txt` e `scripts/verify_sha256_manifest.py`.
- Mudanças: `remediation/ROUND2-CHANGE-MANIFEST.json`.

## 4. Disposição dos achados

| ID | Severidade | Status | Validação |
|---|---|---|---|
| AUD-CAN-001 | CRITICAL | `RESOLVED_LOCAL` | `python scripts/validate_canonical_status.py` |
| AUD-CAN-002 | HIGH | `RESOLVED_LOCAL` | `python scripts/validate_canonical_status.py` |
| AUD-INT-001 | CRITICAL | `RESOLVED_LOCAL` | `python scripts/verify_sha256_manifest.py` |
| AUD-HYG-001 | MEDIUM | `RESOLVED_LOCAL` | `python scripts/validate_package_hygiene.py` |
| AUD-EVD-001 | HIGH | `RESOLVED_LOCAL` | `python scripts/validate_evidence_records.py` |
| AUD-EVD-002 | CRITICAL | `RESOLVED_LOCAL` | `python scripts/run_100_round_evidence_campaign.py` |
| AUD-TST-001 | HIGH | `RESOLVED_LOCAL` | `python -m pytest -q -p no:cacheprovider` |
| AUD-TST-002 | MEDIUM | `RESOLVED_LOCAL` | `python scripts/validate_all.py` |
| AUD-BDD-001 | HIGH | `RESOLVED_LOCAL` | `python scripts/validate_bdd_registry.py` |
| AUD-BDD-002 | CRITICAL | `RESOLVED_LOCAL` | `python scripts/validate_bdd_registry.py` |
| AUD-BDD-003 | HIGH | `RESOLVED_LOCAL` | `python scripts/validate_bdd_registry.py` |
| AUD-SQL-001 | CRITICAL | `PARTIAL_EXTERNAL_DEPENDENCY` | `python scripts/validate_tenant_convention.py` |
| AUD-SQL-002 | CRITICAL | `BLOCKED_EXTERNAL` | `TEST_DATABASE_URL=... python scripts/test_postgres_event_transport.py` |
| AUD-API-001 | MEDIUM | `RESOLVED_LOCAL` | `python scripts/validate_openapi_contract.py` |
| AUD-API-002 | HIGH | `RESOLVED_LOCAL` | `python scripts/validate_error_catalog.py` |
| AUD-API-003 | MEDIUM | `RESOLVED_LOCAL` | `python scripts/validate_openapi_contract.py` |
| AUD-EVT-001 | HIGH | `RESOLVED_LOCAL` | `python scripts/validate_asyncapi_operations.py` |
| AUD-EVT-002 | HIGH | `BLOCKED_EXTERNAL` | `REDPANDA_BROKERS=... python scripts/test_redpanda_runtime.py` |
| AUD-STATE-001 | HIGH | `RESOLVED_LOCAL` | `python scripts/validate_statechart_registry.py` |
| AUD-STATE-002 | MEDIUM | `BLOCKED_EXTERNAL` | `python scripts/test_xstate_official_runtime.py` |
| AUD-SDK-001 | HIGH | `PARTIAL_EXTERNAL_DEPENDENCY` | `python scripts/validate_dependency_locks.py` |
| AUD-SDK-002 | MEDIUM | `RESOLVED_LOCAL` | `python scripts/validate_sdk_operation_coverage.py && tsc -p 06-sdk/typescript/tsconfig.json --noEmit` |
| AUD-CI-001 | HIGH | `PARTIAL_EXTERNAL_DEPENDENCY` | `python scripts/validate_workflow_security.py` |
| AUD-SUP-001 | HIGH | `BLOCKED_EXTERNAL` | `python scripts/validate_image_references.py` |
| AUD-INF-001 | HIGH | `BLOCKED_EXTERNAL` | `helm lint 05-infra/helm && helm template ... && kubeconform -strict ...` |
| AUD-INF-002 | MEDIUM | `DEFERRED_DECISION_REQUIRED` | `Architecture decision followed by tofu fmt/validate/plan` |
| AUD-OBS-001 | HIGH | `BLOCKED_EXTERNAL` | `Execute load/game-day against deployed services and telemetry` |
| AUD-SEC-001 | MEDIUM | `RESOLVED_LOCAL` | `Document review against requirements and remediation register` |
| AUD-DATA-001 | MEDIUM | `RESOLVED_LOCAL` | `Document/schema review` |
| AUD-MET-001 | HIGH | `RESOLVED_LOCAL` | `python scripts/validate_metrics_matrix.py` |
| AUD-MET-002 | MEDIUM | `RESOLVED_LOCAL` | `python scripts/validate_metrics_matrix.py` |
| AUD-DOC-001 | HIGH | `RESOLVED_LOCAL` | `python scripts/validate_asyncapi_operations.py` |
| AUD-DOC-002 | MEDIUM | `RESOLVED_LOCAL` | `Verify inventory count and SHA-256 manifest` |
| AUD-LOCK-001 | HIGH | `PARTIAL_EXTERNAL_DEPENDENCY` | `python scripts/validate_dependency_locks.py` |
| AUD-RUN-001 | HIGH | `RESOLVED_LOCAL` | `Review external gate table and evidence schema` |

## 5. Correções por domínio
### Governança e integridade
Fonte canônica única, manifesto de release, ciclo AUTO12-R2, política de lifecycle, higiene e SHA-256 fail-closed.
### Evidências e testes
Evidência bloqueada agora usa `NOT_EXECUTED` e informa o nível requerido. pytest coleta a suíte; parse JSON e meta-schema são separados.
### BDD e rastreabilidade
Os 152 cenários repetidos foram consolidados em 38 comportamentos únicos; todos possuem scenario ID e requisito canônico; somente bindings executados recebem PASS.
### Banco e tenancy
A migration 0013 unifica o modelo final em `organization_id`/`app.current_organization_id`. A prova PostgreSQL permanece externa.
### OpenAPI, AsyncAPI e SDK
OpenAPI possui 13 operações, leitura individual, erros fechados e 401/403 coerentes. AsyncAPI 3 possui 7 canais/14 operações. SDK cobre 13 operationIds.
### Statecharts, segurança e dados
Registry cobre 5/5 máquinas. Threat model, abuse cases, inventário de dados, retenção e DSAR foram formalizados sem alegar pentest ou aprovação jurídica.
### CI, dependências e infraestrutura
Actions foram fixadas por SHA verificado e permissões/timeouts/concurrency adicionados. Locks npm, digests OCI e execução GitHub/Kubernetes permanecem externos.

## 6. Validação executada
O resultado canônico está em `audit/round2/ROUND2-VALIDATION-SUMMARY.json`:

- resultado: `PARTIAL_BLOCKED`;
- gates canônicos PASS: 21;
- gates canônicos FAIL: 0;
- gates canônicos `BLOCKED_EXTERNAL`: 7;
- execuções suplementares independentes: 4, sem falha local;
- controles locais FAIL: 0;
- gates externos BLOCKED_EXTERNAL: 7;
- suíte principal: 70/70 PASS;
- BDD executável: 8/8 PASS;
- pytest: 78/78 PASS, cobrindo as mesmas suítes sem soma artificial;
- TypeScript: compile PASS com o compilador disponível no ambiente;
- SDK drift: PASS.

A campanha de 100 controles foi reclassificada por nível: 8 PASS documentais, 80 PASS estáticos, 2 PASS unitários e 10 bloqueios externos. Não existe PASS de integração externa ou prova operacional.

## 7. Dependências externas
Consulte `remediation/EXTERNAL-DEPENDENCIES.md`. Os bloqueios não são falhas mascaradas: são ausência de ambiente, credencial, lock verificado, registry ou decisão arquitetural.

## 8. Métricas e limites
Nenhum percentual global foi calculado. Valores históricos foram preservados como `SUPERSEDED_HISTORICAL`. A contagem de achados resolvidos não é uma métrica de cobertura arquitetural.

## 9. Preparação para a Rodada 3
A Rodada 3 deve reauditar a árvore final de forma independente, procurar regressões introduzidas pela remediação, validar hashes/inventário e produzir o consolidado definitivo.
