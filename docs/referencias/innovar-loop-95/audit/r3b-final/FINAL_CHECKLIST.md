# Checklist Final

| ID | Resultado | Atividade seguinte |
|---|---|---|
| ◐ `FFND-R3B-0001` | `PARTIAL` | Incluir dead_letter_id e hash semântico do payload no escopo de idempotência em SQLite e PostgreSQL; criar testes negativos por recurso. |
| ◐ `FFND-R3B-0002` | `PARTIAL` | Assinar versão canônica de method, normalized path/query, body hash, idempotency key, timestamp e nonce; manter cache anti-replay e vínculo de audiência. |
| ◐ `FFND-R3B-0003` | `PARTIAL` | Escolher uma arquitetura canônica: validar JWT/OAuth2 no serviço ou modelar formalmente o trusted proxy e seus headers assinados no contrato e testes. |
| ☑ `FFND-R3B-0004` | `CLOSED` | Manter gate anti-regressão no CI. |
| ☑ `FFND-R3B-0005` | `CLOSED` | Manter gate anti-regressão no CI. |
| ☑ `FFND-R3B-0006` | `CLOSED` | Manter gate anti-regressão no CI. |
| ◐ `FFND-R3B-0007` | `PARTIAL` | Gerar lockfiles confiáveis, fixar imagens por digest e executar build/compose em runner limpo. |
| ◐ `FFND-R3B-0008` | `BLOCKED_EXTERNAL` | Resolver dependências em registries confiáveis, revisar e congelar lockfiles; repetir npm ci e pip --require-hashes. |
| ◐ `FFND-R3B-0009` | `BLOCKED_EXTERNAL` | Resolver digests oficiais, atualizar referências, gerar SBOM, assinatura e provenance. |
| ◐ `FFND-R3B-0010` | `BLOCKED_EXTERNAL` | Executar banco efêmero/real com roles NOBYPASSRLS, matriz cross-tenant, pool reuse e concorrência. |
| ◐ `FFND-R3B-0011` | `BLOCKED_EXTERNAL` | Executar producer/consumer, falhas, replay e dedupe em Redpanda versionado. |
| ◐ `FFND-R3B-0012` | `BLOCKED_EXTERNAL` | Renderizar com Helm oficial/kubeconform e executar testes de tráfego permitido/negado no cluster. |
| ◐ `FFND-R3B-0013` | `BLOCKED_EXTERNAL` | Resolver lockfile confiável e executar testes oficiais de máquinas e migração de snapshots. |
| ◐ `FFND-R3B-0014` | `PARTIAL` | Vincular e executar os cenários restantes nos ambientes PostgreSQL, broker e cluster. |
| ☑ `FFND-R3B-0015` | `CLOSED` | Manter testes e validadores como gates obrigatórios. |
| ☑ `FFND-R3B-0016` | `CLOSED` | Manter testes e validadores como gates obrigatórios. |
| ☑ `FFND-R3B-0017` | `CLOSED` | Manter testes e validadores como gates obrigatórios. |
| ☑ `FFND-R3B-0018` | `CLOSED` | Manter testes e validadores como gates obrigatórios. |
| ☑ `FFND-R3B-0019` | `CLOSED` | Manter testes e validadores como gates obrigatórios. |
| ☑ `FFND-R3B-0020` | `CLOSED` | Manter testes e validadores como gates obrigatórios. |
| ☑ `FFND-R3B-0021` | `CLOSED` | Manter testes e validadores como gates obrigatórios. |
| ☑ `FFND-R3B-0022` | `CLOSED` | Manter testes e validadores como gates obrigatórios. |
| ☑ `FFND-R3B-0023` | `CLOSED` | Manter testes e validadores como gates obrigatórios. |
| ☑ `FFND-R3B-0024` | `SUPERSEDED` | Preservar o handoff PARTIAL e, em futuras R3A, transportar versões semanticamente sanitizadas dos manifests e matrizes atuais. |
| ☐ `FFND-R3B-0025` | `OPEN` | Transformar validate_round2/final validator em gate canônico único, incluir todos os controles e retornar código não zero quando houver FAIL local. |
| ☐ `FFND-R3B-0026` | `OPEN` | Criar handler factory/subclasse por servidor ou injetar dependências na instância/request handler. |
| ☐ `FFND-R3B-0027` | `OPEN` | Aplicar allowlist de tópico e percent-encoding de segmento; rejeitar slash, dot segments, query e fragment. |
| ☐ `FFND-R3B-0028` | `OPEN` | Atualizar as duas referências, revisar evidências históricas e tornar validate_remediation_register obrigatório no orquestrador canônico. |
