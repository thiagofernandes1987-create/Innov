# Capability: Object Definitions

## Objetivo e escopo
Define, versiona, publica, deprecia e arquiva metadados de objetos configuráveis da plataforma. Esta capability não provisiona tabelas físicas nesta release; a única estratégia executável é `JSONB_HYBRID`.

## Ownership e boundaries
- Owner lógico: Metadata Runtime.
- Escrita: serviço Metadata API.
- Leitura: Metadata API, Record Runtime e indexadores autorizados.
- Fora do escopo: edição de registros, provisionamento de tabelas dedicadas e migração automática de dados.

## Invariantes
- `organization_id + namespace + object_key` é único.
- versões publicadas são imutáveis;
- toda transição incrementa a versão otimista;
- publicação exige schema válido e ausência de breaking changes não aprovadas;
- mutações exigem tenant, autorização, idempotency key e ETag forte;
- `PROVISIONED_TABLE` permanece proibido nesta release.

## Modelo de dados
Entidades canônicas: `metadata.object_definitions`, `metadata.object_versions`, `metadata.object_fields`. A definição mantém identidade e estado; versões e campos preservam histórico técnico.

## Comandos e queries
- `CreateObjectDefinition`
- `ListObjectDefinitions`
- `GetObjectDefinition`
- `TransitionObjectDefinition`

Queries retornam somente dados do tenant corrente. Comandos devem registrar outbox no mesmo commit da alteração.

## Lifecycle
`DRAFT -> IN_REVIEW -> PUBLISHED -> DEPRECATED -> ARCHIVED`, com retorno permitido de `IN_REVIEW -> DRAFT`.

## Erros canônicos
- `OBJECT_ALREADY_EXISTS`
- `OBJECT_NOT_FOUND`
- `VERSION_CONFLICT`
- `INVALID_TRANSITION`
- `REASON_REQUIRED`
- `SCHEMA_INVALID`
- `BREAKING_CHANGE_UNAPPROVED`
- `PUBLISHED_VERSION_IMMUTABLE`
- `FORBIDDEN`

## Configuração
- `OBJECT_DEFINITION_MAX_FIELDS` — limite inteiro positivo.
- `OBJECT_SCHEMA_MAX_BYTES` — tamanho máximo do schema serializado.
- `OBJECT_PUBLISH_REQUIRE_REVIEW` — exige passagem por `IN_REVIEW`.
- `OBJECT_BREAKING_CHANGE_POLICY` — `DENY` ou `REQUIRE_APPROVAL`.

## Observabilidade
Métricas mínimas:
- `innovar_object_definition_commands_total{command,result}`
- `innovar_object_transition_total{from,to,result}`
- `innovar_object_publish_validation_seconds`
- `innovar_object_idempotency_replay_total`

Logs estruturados devem incluir `request_id`, `organization_id`, `object_key`, `command`, `expected_version`, `result_code` e nunca incluir schema integral quando classificado como sensível.

## Operação e rollback
O runbook canônico é `09-runbooks/object-definitions.md`. Rollback de publicação cria nova versão corretiva ou executa transição permitida; nunca altera versão publicada em lugar.

## Evidências relacionadas
OpenAPI, AsyncAPI, JSON Schemas, SQL, statechart, BDD e SDK são apontados em `traceability/CAPABILITY-FACET-MATRIX.yaml`.
