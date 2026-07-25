# INNOVAR EXECUTABLE SPEC AUTO12
## Limites de Execução e Prova — Rodada 1

## 1. Taxonomia obrigatória

| Nível | Significado |
|---|---|
| DOCUMENTED | Existe descrição, sem validação automática. |
| STATICALLY_VALIDATED | Parse, schema, lint ou inspeção estrutural. |
| UNIT_EXECUTED | Comportamento executado isoladamente/in-memory. |
| LOCAL_INTEGRATION_EXECUTED | Serviços reais integrados no ambiente local. |
| EXTERNAL_INTEGRATION_EXECUTED | Execução em CI/cluster/broker/database externos. |
| OPERATIONALLY_PROVEN | Evidência repetível em ambiente operacional representativo. |

O status PASS/FAIL/BLOCKED deve ser armazenado separadamente do nível.

## 2. Executável integralmente neste ambiente

- inventário e hashes;
- parse JSON/YAML puro;
- meta-validação JSON Schema;
- análise OpenAPI/AsyncAPI;
- testes Python unitários/in-memory;
- SDK drift e compilação TypeScript disponível;
- análise BDD, duplicidade e tags;
- inspeção SQL, RLS, statecharts e manifests;
- geração dos documentos e manifestos da auditoria.

## 3. Executável parcialmente

- workflows GitHub Actions: autoria/validação estática, sem prova no GitHub;
- SDK/XState: código e lock policy, mas resolução oficial depende de registry/cache;
- Helm/Kubernetes: correção de templates, mas render/install dependem de ferramentas/cluster;
- SQL/RLS: correção de scripts, mas propriedades dependem de PostgreSQL real;
- AsyncAPI: contrato corrigível, mas entrega/replay dependem de broker.

## 4. Dependências externas obrigatórias

| Dependência | Prova necessária | Evidência mínima |
|---|---|---|
| PostgreSQL 16.x | migrations, RLS, locks, rollback, concorrência | versão, comandos, logs, roles, hashes, resultados |
| Redpanda/Kafka | publish, consume, retry, DLQ, replay, ordering | config dos tópicos, offsets, payload hashes, logs |
| Helm + kubeconform | lint, render e schema strict | rendered manifests, versões e exit codes |
| Kubernetes | install, policies, probes, HPA/PDB, smoke | events, pod specs, network tests, metrics |
| GitHub Actions | permissions, pins, gates, branch protection | run URL/ID, commit SHA, artifacts, repository settings |
| Registry OCI/OIDC | digest, SBOM, assinatura, provenance | digest, attestations e verification logs |
| Observabilidade | SLIs/SLOs, carga, game day | janela, métricas, dashboards e alert firing |
| Jurídico/organização | LGPD, retenção e DSAR | aprovação, owners, processo e registros |

## 5. Regra de honestidade

Arquivos preparados sem execução externa devem permanecer `IMPLEMENTED_NOT_EXECUTED` ou `BLOCKED_EXTERNAL`. Nunca converter ausência de ferramenta/ambiente em PASS.
