# Relatório de Correções Pós-R3B

## 1. Contexto

A UTA-R3B é uma rodada de reconciliação e, por desenho, não modifica os materiais congelados. O ZIP R3B anterior continha somente o dossiê de auditoria. Este novo ciclo cria uma working copy derivada do material `INNOVAR-AUTO12-R2-UTA-R2` e aplica correções locais aos achados ainda abertos ou parcialmente resolvidos.

## 2. Achados tratados

| Achado R3B | Ação | Estado desta working copy |
|---|---|---|
| `FFND-R3B-0001` | Idempotência vinculada a `dead_letter_id` e hash semântico; migration 0015 | `IMPLEMENTED_LOCALLY_VALIDATED`; PostgreSQL real pendente |
| `FFND-R3B-0002` | HMAC v2 vinculado à requisição e nonce anti-replay | `RESOLVED_LOCAL` |
| `FFND-R3B-0003` | OpenAPI dos endpoints DLQ modelado como trusted proxy HMAC | `RESOLVED_LOCAL`; arquitetura de proxy deve ser implantada externamente |
| `FFND-R3B-0025` | `validate_all.py` inclui gates omitidos e retorna `77` em bloqueio externo | `RESOLVED_LOCAL` |
| `FFND-R3B-0026` | Handler factory por servidor | `RESOLVED_LOCAL` |
| `FFND-R3B-0027` | Allowlist e encoding de tópico | `RESOLVED_LOCAL` |
| `FFND-R3B-0028` | Referências corrigidas para `openapi-operation-inventory.json` | `RESOLVED_LOCAL` |

## 3. Arquivos principais alterados

- `event_admin/server.py`
- `event_admin/postgres_store.py`
- `event_publisher/redpanda_http_publisher.py`
- `01-api/openapi.yaml`
- `01-db/migrations/0015_dlq_idempotency_resource_scope.sql`
- `scripts/validate_all.py`
- `scripts/load_event_admin.py`
- `scripts/run_event_transport_gameday.py`
- `scripts/test_postgres_event_transport.py`
- `scripts/generate_release_file_manifest.py`
- `remediation/REMEDIATION-REGISTER.yaml`
- testes HTTP, BDD e publisher
- `STATUS.md`, `README.md`, `RELEASE-MANIFEST.yaml` e blueprint

## 4. Validação

As evidências finais estão em `audit/post-r3b/VALIDATION-SUMMARY.json` e `audit/post-r3b/VALIDATE-ALL.log`. O orquestrador encerrou com código `77`, contendo 22 gates locais aprovados e 6 gates externos bloqueados. Nenhuma dependência externa foi promovida a PASS.

## 5. Limites

A migration 0015 foi validada estaticamente, mas não executada em PostgreSQL real. Lockfiles, digests OCI, broker, cluster e ambiente operacional permanecem bloqueados externamente.
