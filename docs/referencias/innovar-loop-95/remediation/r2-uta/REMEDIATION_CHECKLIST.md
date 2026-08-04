# UTA-R2 — Checklist de Remediação

- Remediados: **14**
- Parciais: **3**
- Bloqueados externamente: **6**

| Estado | ID | Severidade | Achado | Resultado |
|---|---|---|---|---|
| ☑ `REMEDIATED` | `FND-R1-001` | `CRITICAL` | Idempotência global permite colisão e exposição cross-tenant no runtime administrativo | Tenant- and operation-scoped replay/resolution idempotency; negative cross-tenant tests pass. |
| ☑ `REMEDIATED` | `FND-R1-002` | `HIGH` | Contexto de autenticação do runtime administrativo é falsificável por headers | Unsigned identity headers are rejected; trusted proxy context requires timestamped HMAC signature. |
| ◐ `PARTIAL` | `FND-R1-003` | `HIGH` | Runtime administrativo diverge do OpenAPI em idempotência, códigos e respostas | SQLite reference runtime, OpenAPI, SDK and error catalog were aligned; PostgreSQL function 0014 was added statically. |
| ☑ `REMEDIATED` | `FND-R1-004` | `HIGH` | SDK apresenta drift semântico apesar do gate de cobertura por operationId | SDK gate now checks source hash, response types and required idempotency options; TypeScript compiles and drift gate passes. |
| ☑ `REMEDIATED` | `FND-R1-005` | `MEDIUM` | Pipeline denominado geração de SDK produz apenas inventário de operações | Generator now emits generated-contract.ts and operation inventory tied to the OpenAPI digest. |
| ☑ `REMEDIATED` | `FND-R1-006` | `HIGH` | Backoff do publisher não cresce com tentativas | OutboxMessage carries attempts and retry delay grows with a cap; directed unit test passes. |
| ◐ `PARTIAL` | `FND-R1-007` | `HIGH` | Harness Docker Compose não é autocontido nem reproduzível | Event-admin has a local Dockerfile/build context and loopback-only development defaults. |
| ☒ `BLOCKED_EXTERNAL` | `FND-R1-008` | `HIGH` | Lockfiles verificados estão ausentes | One controlled offline attempt per ecosystem confirmed absence of a complete trusted cache. |
| ☒ `BLOCKED_EXTERNAL` | `FND-R1-009` | `HIGH` | Imagens OCI não estão fixadas por digest | Image reference gate preserved all mutable/placeholder references as blocked. |
| ☒ `BLOCKED_EXTERNAL` | `FND-R1-010` | `CRITICAL` | Isolamento RLS e migration 0013 não foram provados em PostgreSQL real | SQL repair artifacts exist, including migration 0014, but no PostgreSQL execution occurred. |
| ☒ `BLOCKED_EXTERNAL` | `FND-R1-011` | `HIGH` | Transporte Redpanda/Kafka permanece sem prova integrada | Broker gate returned the reserved external-block code. |
| ☒ `BLOCKED_EXTERNAL` | `FND-R1-012` | `HIGH` | Helm/Kubernetes/NetworkPolicy permanecem sem prova oficial | Static Helm checks pass; official tools and cluster are absent. |
| ☒ `BLOCKED_EXTERNAL` | `FND-R1-013` | `HIGH` | Statecharts não foram executados no runtime oficial XState | Official XState gate is blocked by missing verified lockfile. |
| ◐ `PARTIAL` | `FND-R1-014` | `HIGH` | Cobertura BDD executada é minoritária: 6 de 38 cenários | Executed BDD scenarios increased from 6 to 14 of 38. |
| ☑ `REMEDIATED` | `FND-R1-015` | `MEDIUM` | Claim local_integration PARTIAL não possui registro explícito de execução local integrada | Unsupported local integration claim was retracted to NOT_CLAIMED. |
| ☑ `REMEDIATED` | `FND-R1-016` | `MEDIUM` | Política de ciclo de vida de artefatos é declarativa e não aplicada | Artifact metadata and lifecycle coverage gate now enforce identity, release, status, date and SHA-256. |
| ☑ `REMEDIATED` | `FND-R1-017` | `HIGH` | Gate de compatibilidade de eventos pode aprovar mudanças quebradoras aninhadas | Recursive compatibility checker covers nested required/properties, allOf/$ref, enums, constraints and additionalProperties; negative fixture test passes. |
| ☑ `REMEDIATED` | `FND-R1-018` | `MEDIUM` | SCI por capability é validado aritmeticamente, não quanto à força da evidência | Capability scores are capped by evidence strength and global SCI/EEI remain NOT_CALCULATED. |
| ☑ `REMEDIATED` | `FND-R1-019` | `MEDIUM` | Defaults de desenvolvimento expõem serviços e credenciais fracas | Development services bind to 127.0.0.1 and require explicit secrets/profile. |
| ☑ `REMEDIATED` | `FND-R1-020` | `MEDIUM` | Campanha de 100 controles mede presença e tokens como PASS, não maturidade | Campaign classifies inventory/string checks as OBSERVED; final run: 24 PASS, 66 OBSERVED, 10 BLOCKED_EXTERNAL, 0 FAIL. |
| ☑ `REMEDIATED` | `FND-R1-021` | `HIGH` | Runtime em memória não inclui operation_scope na idempotência | In-memory idempotency scope is now (organization, operation_scope, key), with unit tests. |
| ☑ `REMEDIATED` | `FND-R1-022` | `MEDIUM` | Runtime HTTP não limita body e devolve detalhes brutos de exceção | HTTP body limit, JSON validation and sanitized error mapping are implemented and tested. |
| ☑ `REMEDIATED` | `FND-R1-023` | `MEDIUM` | Baseline e schemas atuais reutilizam os mesmos $id JSON Schema | Baseline $id values are unique and collision test passes. |
