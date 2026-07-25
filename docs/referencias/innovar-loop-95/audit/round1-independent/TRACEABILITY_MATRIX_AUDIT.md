# INNOVAR EXECUTABLE SPEC AUTO12
## Matriz de Rastreabilidade da Auditoria — Rodada 1

| Achado | Domínio | Severidade | Evidência principal | Classe | Status |
|---|---|---|---|---|---|
| `AUD-CAN-001` | governance | **CRITICAL** | STATUS.md: título "Status canônico — AUTO6" | `LOCAL` | OPEN |
| `AUD-CAN-002` | governance | **HIGH** | README.md: "ciclo de quatro loops" | `LOCAL` | OPEN |
| `AUD-INT-001` | integrity | **CRITICAL** | 331 entradas para 354 arquivos verificáveis (excluído o próprio manifesto) | `LOCAL` | OPEN |
| `AUD-HYG-001` | package-hygiene | **MEDIUM** | 19 arquivos .pyc | `LOCAL` | OPEN |
| `AUD-EVD-001` | evidence | **HIGH** | 15 arquivos .txt de auditoria com 0 byte | `LOCAL` | OPEN |
| `AUD-EVD-002` | evidence | **CRITICAL** | 90 PASS, 10 BLOCKED | `LOCAL` | OPEN |
| `AUD-TST-001` | testing | **HIGH** | python -m pytest -q retorna código 3 | `LOCAL` | OPEN |
| `AUD-TST-002` | testing | **MEDIUM** | scripts/validate_all.py adiciona JSON_SCHEMA_OK para todo *.json | `LOCAL` | OPEN |
| `AUD-BDD-001` | bdd | **HIGH** | 152 cenários, apenas 38 corpos de passos únicos | `LOCAL` | OPEN |
| `AUD-BDD-002` | traceability | **CRITICAL** | 133 tags REQ-* nos features | `LOCAL` | OPEN |
| `AUD-BDD-003` | bdd | **HIGH** | 04-bdd/BINDING-REGISTRY.yaml possui apenas versão, política, status e source_of_truth | `LOCAL` | OPEN |
| `AUD-SQL-001` | database-security | **CRITICAL** | CONVENTIONS.md e 01-db/rls/0001_rls.sql usam organization_id/app.current_organization_id | `LOCAL_PARTIAL` | OPEN |
| `AUD-SQL-002` | database | **CRITICAL** | scripts/test_postgres_event_transport.py retorna BLOCKED sem TEST_DATABASE_URL | `EXTERNAL` | OPEN |
| `AUD-API-001` | openapi | **MEDIUM** | OpenAPI possui PATCH /v1/objects/{objectKey}/records/{recordId} | `LOCAL_PARTIAL` | OPEN |
| `AUD-API-002` | openapi | **HIGH** | 00-decisions/error-catalog.yaml define códigos | `LOCAL` | OPEN |
| `AUD-API-003` | openapi | **MEDIUM** | 8 operações protegidas omitem 401 e/ou 403 | `LOCAL` | OPEN |
| `AUD-EVT-001` | asyncapi | **HIGH** | 7 channels | `LOCAL_PARTIAL` | OPEN |
| `AUD-EVT-002` | event-runtime | **HIGH** | campanha: rpk available BLOCKED | `EXTERNAL` | OPEN |
| `AUD-STATE-001` | statecharts | **HIGH** | machine files: ['approval.machine.ts', 'event-transport.machine.ts', 'object-definition.machine.ts', 'sla.machine.ts', 'workflow.machine.ts'] | `LOCAL` | OPEN |
| `AUD-STATE-002` | statecharts | **MEDIUM** | tools/xstate-runtime/package.json fixa versões, mas não possui package-lock | `EXTERNAL` | OPEN |
| `AUD-SDK-001` | sdk | **HIGH** | 06-sdk/typescript/package.json possui ranges ^5.7.0 e ^2.0.0 | `LOCAL_PARTIAL` | OPEN |
| `AUD-SDK-002` | sdk | **MEDIUM** | tsc global 5.8.3: PASS | `LOCAL_PARTIAL` | OPEN |
| `AUD-CI-001` | ci-cd | **HIGH** | 8 uses sem SHA imutável | `LOCAL_PARTIAL` | OPEN |
| `AUD-SUP-001` | supply-chain | **HIGH** | postgres:16-alpine | `LOCAL_PARTIAL` | OPEN |
| `AUD-INF-001` | infrastructure | **HIGH** | scripts/validate_helm_static.py: PASS | `EXTERNAL` | OPEN |
| `AUD-INF-002` | infrastructure | **MEDIUM** | 0 arquivos .tf/.tofu | `LOCAL_PARTIAL` | OPEN |
| `AUD-OBS-001` | observability | **HIGH** | NFR-SLO-CATALOG.yaml | `EXTERNAL` | OPEN |
| `AUD-SEC-001` | security-governance | **MEDIUM** | nenhum THREAT-MODEL.md/ABUSE-CASES.yaml no inventário | `LOCAL` | OPEN |
| `AUD-DATA-001` | data-governance | **MEDIUM** | retention_class existe no OpenAPI | `LOCAL_PARTIAL` | OPEN |
| `AUD-MET-001` | metrics | **HIGH** | CAPABILITY-FACET-MATRIX possui object_definitions e event_transport com SCI | `LOCAL` | OPEN |
| `AUD-MET-002` | metrics | **MEDIUM** | traceability/CAPABILITY-FACET-MATRIX.yaml: "mas não criação/listagem/leitura: null" | `LOCAL` | OPEN |
| `AUD-DOC-001` | documentation | **HIGH** | DOCUMENTACAO_TECNICA_FINAL capítulo 5 marca Publish/Subscribe = não em 7 canais | `LOCAL` | OPEN |
| `AUD-DOC-002` | documentation | **MEDIUM** | documentação consolidada cobre 189/189 extensões selecionadas | `LOCAL` | OPEN |
| `AUD-LOCK-001` | dependencies | **HIGH** | package-lock.json packages = {} | `LOCAL_PARTIAL` | OPEN |
| `AUD-RUN-001` | operations | **HIGH** | PostgreSQL, Redpanda, Helm/Kubernetes, load e distributed game day BLOCKED | `EXTERNAL` | OPEN |

## Requisitos canônicos e situação de prova

| Requisito | Status original | Gap declarado | Achados relacionados |
|---|---|---|---|
| `REQ-TEN-001` | PARTIAL | PostgreSQL runtime proof remains blocked. | `AUD-SQL-001`, `AUD-SQL-002` |
| `REQ-RLS-001` | PARTIAL | Two NOBYPASSRLS roles were not executed against a real database. | `AUD-SQL-001`, `AUD-SQL-002` |
| `REQ-IDEMP-001` | SPECIFIED | Deployed API behavior is not proven. | `AUD-API-002`, `AUD-API-003` |
| `REQ-IDEMP-002` | PARTIAL | Integrated replay behavior is not proven. | `AUD-SQL-002`, `AUD-EVT-002` |
| `REQ-IDEMP-003` | PARTIAL | Conflict behavior is not proven against a deployed API. | `AUD-API-002` |
| `REQ-CONC-001` | PARTIAL | Concurrent PostgreSQL execution remains blocked. | `AUD-SQL-002` |
| `REQ-EVT-001` | PARTIAL | Atomicity is statically specified but not executed in PostgreSQL. | `AUD-SQL-002` |
| `REQ-EVT-002` | PARTIAL | Real broker consumer deduplication remains unproven. | `AUD-EVT-001`, `AUD-EVT-002` |
| `REQ-META-001` | PARTIAL | Trigger behavior is not executed in PostgreSQL. | `AUD-SQL-002` |
| `REQ-META-002` | SPECIFIED | Runtime enforcement is incomplete. | `AUD-API-001` |
| `REQ-QUOTA-001` | SPECIFIED | Transactional quota enforcement has no runtime implementation evidence. | `AUD-SQL-002` |
| `REQ-CACHE-001` | SPECIFIED | Cache invalidation integration is not executed. | `AUD-EVT-001`, `AUD-EVT-002` |
| `REQ-WF-001` | PARTIAL | Official XState runtime execution remains blocked. | `AUD-STATE-001`, `AUD-STATE-002` |
| `REQ-APP-001` | SPECIFIED | Approval execution runtime is outside the currently proven capabilities. | `AUD-STATE-001` |
| `REQ-SLA-001` | SPECIFIED | Business-calendar implementation is not executable in this package. | `AUD-STATE-001` |
| `REQ-META-003` | PARTIAL | Persistence and event emission are not integrated against PostgreSQL. | `AUD-API-001`, `AUD-SQL-002` |
| `REQ-STATE-001` | PARTIAL | Runtime stop-and-alert behavior is not executed with official XState. | `AUD-STATE-001`, `AUD-STATE-002` |
| `REQ-DLQ-001` | PARTIAL | Distributed retention and replay are not proven. | `AUD-EVT-002`, `AUD-SQL-002` |
| `REQ-NFR-001` | PARTIAL | Production SLO measurements remain unavailable. | `AUD-OBS-001` |
