# Documentação Técnica Consolidada — Estado Pós-R2 Reconciliado

## Arquitetura e contratos

- OpenAPI 3: 13 operações, validação local PASS.
- AsyncAPI 3: 7 canais e 14 operações, validação local PASS.
- JSON Schema compatibility: checker recursivo e fixture negativa PASS.
- SDK TypeScript: compilação e drift PASS.

## Persistência e tenancy

- Migrations 0001–0014 presentes.
- Convenção final documentada: `organization_id` e `app.current_organization_id`.
- RLS/migrations reais continuam sem prova PostgreSQL.

## Eventing

- Worker outbox local e backoff executado por testes.
- Redpanda/Kafka real sem prova.
- REST Proxy topic precisa de allowlist e encoding.

## Runtime administrativo

- Isolamento cross-tenant por organização foi melhorado.
- HMAC de proxy não é request-bound.
- Idempotência de resolução omite `dead_letter_id`.
- Dependências do handler são globais por classe.
- Contrato OAuth2 não corresponde ao mecanismo runtime.

## BDD e statecharts

- Registry BDD: 38 comportamentos únicos.
- Execução local: 16 testes BDD PASS.
- Registry statechart: 5 máquinas PASS estático.
- XState oficial bloqueado por lockfile.

## Infraestrutura e supply chain

- Helm estático PASS.
- Cluster/NetworkPolicy bloqueados.
- Lockfiles verificados ausentes.
- Imagens por digest ausentes.

## Governança

- R1, R2 e R3A congelados e reconciliados.
- `validate_all.py` não é um gate final completo.
- `REMEDIATION-REGISTER.yaml` possui duas referências obsoletas e falha no validador.
