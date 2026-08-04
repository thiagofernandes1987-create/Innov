# INNOVAR EXECUTABLE SPEC AUTO12
## Auditoria Independente de Engenharia — Rodada 1

**Data:** 22/07/2026  
**Objeto:** `INNOVAR_EXECUTABLE_SPEC_AUTO12_100_RODADAS_2026-07-22.zip`  
**SHA-256 do ZIP:** `a38dfbac3ff539c1adc1aa4b1a692f4fc2661b5b0ffa0056faaefe73d03b0fb7`  
**Modo:** somente leitura sobre extração pristina; execução em cópia separada.

## Metodologia e garantia de imparcialidade

- O ZIP original foi preservado e reextraído para reconferência.
- Achados foram classificados como fatos confirmados, não como recomendações presumidas.
- Recomendações sem requisito explícito foram tratadas como melhoria arquitetural, não como não conformidade automática.
- Nível de execução e resultado foram mantidos separados.
- Nenhum percentual global de maturidade foi calculado.

## Resultado da reconferência final

- Inventário pristino: **355/355 arquivos**.
- JSON parse: **46/46 PASS**.
- JSON Schemas identificados: **25/25 meta-schema PASS**.
- YAML/YML puro: **23 PASS**, **9 templates Helm separados**.
- Testes Python: **70 PASS** + **8 PASS em bdd_steps**.
- Achados registrados: **35**, todos com evidência e ação.
- Manifesto interno do pacote: **FAIL** (23 ausências, 5 divergências).

## Sumário
- [1. Parecer executivo](#1-parecer-executivo)
- [2. Escopo e limitações](#2-escopo-e-limitações)
- [3. Governança e integridade](#3-governança-e-integridade)
- [4. Evidências e testes](#4-evidências-e-testes)
- [5. Banco de dados e tenancy](#5-banco-de-dados-e-tenancy)
- [6. OpenAPI e erros](#6-openapi-e-erros)
- [7. AsyncAPI e eventos](#7-asyncapi-e-eventos)
- [8. BDD e rastreabilidade](#8-bdd-e-rastreabilidade)
- [9. Statecharts e SDK](#9-statecharts-e-sdk)
- [10. CI, supply chain e infraestrutura](#10-ci-supply-chain-e-infraestrutura)
- [11. Observabilidade, segurança e dados](#11-observabilidade-segurança-e-dados)
- [12. Registro completo dos achados](#12-registro-completo-dos-achados)
- [13. Plano da Rodada 2](#13-plano-da-rodada-2)
- [14. Apêndice de execução](#14-apêndice-de-execução)

## 1. Parecer executivo

O pacote possui boa densidade de contratos, SQL, testes locais e disciplina explícita para manter gaps externos como BLOCKED. Entretanto, não é aceitável como evidência de prontidão operacional. Os defeitos mais graves são integridade do manifesto, inconsistência de tenancy, rastreabilidade BDD artificial, classificação excessiva de PASS na campanha e fonte canônica obsoleta.

## 2. Escopo e limitações

Foram auditados os 355 arquivos do ZIP e os três documentos consolidados fornecidos. PostgreSQL, Redpanda, Kubernetes, GitHub Actions e registry OCI não estavam disponíveis; nesses domínios foram auditados contratos, scripts e limites, não o comportamento operacional.

## 3. Governança e integridade

### AUD-CAN-001 — STATUS.md canônico permanece no ciclo AUTO6

**Severidade:** CRITICAL  
**Confiança:** CONFIRMED  
**Classe de execução:** LOCAL

**Evidência:**

- STATUS.md: título "Status canônico — AUTO6"
- audit/AUTO12-100-ROUND-CAMPAIGN.json: campanha AUTO12 presente

**Impacto:** Consumidores automatizados e humanos podem tomar AUTO6 como verdade atual e ignorar evidências AUTO12.

**Remediação:** Regenerar STATUS.md a partir de manifesto/ciclo único e criar gate que compare ciclo, versão, hashes e artefatos canônicos.

**Critério de validação:** Validador deve falhar quando STATUS, manifesto, nome do pacote e auditoria corrente divergirem.

### AUD-CAN-002 — Narrativa do README não identifica inequivocamente o ciclo AUTO12

**Severidade:** HIGH  
**Confiança:** CONFIRMED  
**Classe de execução:** LOCAL

**Evidência:**

- README.md: "ciclo de quatro loops"
- STATUS.md: AUTO6
- artefatos audit/AUTO12-*

**Impacto:** A fonte de verdade do ciclo é ambígua e permite coexistência de nomenclaturas incompatíveis.

**Remediação:** Substituir o cabeçalho por metadados estruturados de release e marcar documentos históricos como SUPERSEDED/HISTORICAL.

**Critério de validação:** Uma única fonte CANONICAL por domínio; documentos históricos não podem ser referenciados como CURRENT.

### AUD-INT-001 — SHA256SUMS.txt não representa o pacote entregue

**Severidade:** CRITICAL  
**Confiança:** CONFIRMED  
**Classe de execução:** LOCAL

**Evidência:**

- 331 entradas para 354 arquivos verificáveis (excluído o próprio manifesto)
- 23 arquivos ausentes do manifesto
- 5 hashes divergentes
- scan_pristine.json.sha256_manifest

**Impacto:** A integridade do ZIP não pode ser comprovada pelo manifesto interno; arquivos podem ter sido adicionados ou alterados após sua geração.

**Remediação:** Regenerar SHA256SUMS sobre árvore limpa e implementar verificação fail-closed antes do empacotamento.

**Critério de validação:** sha256sum -c SHA256SUMS.txt deve retornar 0 e a contagem deve cobrir todos os arquivos, exceto o próprio manifesto.

### AUD-HYG-001 — Artefatos de cache/temporários foram incluídos no ZIP

**Severidade:** MEDIUM  
**Confiança:** CONFIRMED  
**Classe de execução:** LOCAL

**Evidência:**

- 19 arquivos .pyc
- tests/test_contracts.py.tmp

**Impacto:** Introduz ruído, hashes dependentes de ambiente e risco de confundir fonte com produto derivado.

**Remediação:** Excluir __pycache__, *.pyc e *.tmp; adicionar gate de higiene e política de empacotamento.

**Critério de validação:** Inventário final deve conter zero .pyc, zero __pycache__ e zero .tmp.

### AUD-MET-001 — Matriz de métricas contém contradição de escopo

**Severidade:** HIGH  
**Confiança:** CONFIRMED  
**Classe de execução:** LOCAL

**Evidência:**

- CAPABILITY-FACET-MATRIX possui object_definitions e event_transport com SCI
- portfolio_sci.reason afirma "somente uma capability foi avaliada"

**Impacto:** Leitores não conseguem determinar se uma ou duas capabilities integram o denominador.

**Remediação:** Definir status por capability e fórmula de portfolio; corrigir razão sem calcular score global indevido.

**Critério de validação:** Validador deve contar capabilities elegíveis e confrontar a justificativa.

### AUD-MET-002 — Matriz contém chave YAML textual acidental

**Severidade:** MEDIUM  
**Confiança:** CONFIRMED  
**Classe de execução:** LOCAL

**Evidência:**

- traceability/CAPABILITY-FACET-MATRIX.yaml: "mas não criação/listagem/leitura: null"

**Impacto:** Schemas permissivos aceitam corrupção semântica e cálculos podem ignorá-la silenciosamente.

**Remediação:** Remover chave e aplicar JSON Schema com additionalProperties:false aos objetos controlados.

**Critério de validação:** Validação de schema deve falhar para qualquer campo não previsto.

### AUD-DOC-001 — Consolidado interpreta AsyncAPI 3 como publish/subscribe de canal

**Severidade:** HIGH  
**Confiança:** CONFIRMED  
**Classe de execução:** LOCAL

**Evidência:**

- DOCUMENTACAO_TECNICA_FINAL capítulo 5 marca Publish/Subscribe = não em 7 canais
- AsyncAPI 3 define send/receive em operations top-level para 3 canais

**Impacto:** A documentação transmite ausência total de operações, embora existam seis operações válidas no modelo 3.0.

**Remediação:** Refazer parser/documentação com semântica AsyncAPI 3.0 e listar canais sem operações separadamente.

**Critério de validação:** Tabela deve mostrar action send/receive e operationId por channel.

### AUD-DOC-002 — Consolidado não é inventário completo para auditoria

**Severidade:** MEDIUM  
**Confiança:** CONFIRMED  
**Classe de execução:** LOCAL

**Evidência:**

- documentação consolidada cobre 189/189 extensões selecionadas
- ZIP possui 355 arquivos
- scripts Python, features, shell, evidências txt e caches ficam fora do apêndice canônico

**Impacto:** Uma auditoria séria precisa considerar também executores, testes, logs e artefatos omitidos.

**Remediação:** Manter catálogo técnico detalhado, mas adicionar inventário de 355 arquivos e apêndices por categoria de auditoria.

**Critério de validação:** Manifesto de auditoria deve cobrir 355/355 com hash e classificação.

## 4. Evidências e testes

### AUD-EVD-001 — Arquivos de evidência vazios coexistem com referências formais

**Severidade:** HIGH  
**Confiança:** CONFIRMED  
**Classe de execução:** LOCAL

**Evidência:**

- 15 arquivos .txt de auditoria com 0 byte
- traceability/CAPABILITY-FACET-MATRIX.yaml referencia audit/EVIDENCE-CAMPAIGN-XSTATE-RUNTIME.txt, que está vazio

**Impacto:** A simples existência do caminho pode ser interpretada como evidência apesar de não conter comando, resultado ou contexto.

**Remediação:** Marcar evidência vazia como INVALID, substituir por registro estruturado BLOCKED com comando, motivo, ambiente e timestamp.

**Critério de validação:** Gate deve rejeitar evidence_path inexistente, vazio ou sem status/command/tool_versions/hash.

### AUD-EVD-002 — Campanha de 100 rodadas mistura presença estática com execução

**Severidade:** CRITICAL  
**Confiança:** CONFIRMED  
**Classe de execução:** LOCAL

**Evidência:**

- 90 PASS, 10 BLOCKED
- 58 PASS sem evidence_path
- 40 PASS baseados em token/static/verified/checked
- scripts/run_100_round_evidence_campaign.py

**Impacto:** O número de PASS pode ser interpretado como 90 comportamentos executados, quando grande parte apenas procura strings, arquivos ou ferramentas.

**Remediação:** Separar nível de evidência de resultado: STATICALLY_VALIDATED, UNIT_EXECUTED, LOCAL_INTEGRATION, EXTERNAL_INTEGRATION e OPERATIONAL.

**Critério de validação:** Nenhum PASS deve existir sem evidence_path válido e execution_level explícito; token presence não pode receber status de runtime.

### AUD-TST-001 — pytest não consegue coletar a suíte completa

**Severidade:** HIGH  
**Confiança:** CONFIRMED  
**Classe de execução:** LOCAL

**Evidência:**

- python -m pytest -q retorna código 3
- scripts/test_postgres_event_transport.py executa sys.exit(77) durante importação

**Impacto:** Ferramentas padrão de teste falham antes de executar testes, prejudicando CI, IDEs e auditorias independentes.

**Remediação:** Mover a saída BLOCKED para main() e proteger com if __name__ == "__main__"; separar scripts executáveis de módulos testáveis.

**Critério de validação:** pytest -q deve concluir com resultado explícito, sem INTERNALERROR.

### AUD-TST-002 — Validador rotula JSON comum como JSON_SCHEMA_OK

**Severidade:** MEDIUM  
**Confiança:** CONFIRMED  
**Classe de execução:** LOCAL

**Evidência:**

- scripts/validate_all.py adiciona JSON_SCHEMA_OK para todo *.json
- package-lock.json e relatórios de auditoria aparecem como JSON_SCHEMA_OK

**Impacto:** A saída superestima validação semântica; documentos JSON apenas parseados parecem ter sido validados como schemas.

**Remediação:** Usar rótulos JSON_PARSE_OK e JSON_SCHEMA_META_VALID separadamente; validar instâncias contra schemas designados.

**Critério de validação:** Relatório deve distinguir parse, meta-schema e instance validation.

## 5. Banco de dados e tenancy

### AUD-SQL-001 — Dois modelos de contexto tenant coexistem nas RLS

**Severidade:** CRITICAL  
**Confiança:** CONFIRMED  
**Classe de execução:** LOCAL_PARTIAL

**Evidência:**

- CONVENTIONS.md e 01-db/rls/0001_rls.sql usam organization_id/app.current_organization_id
- migrations 0010 e 0012 usam tenant_id/app.tenant_id
- event_admin/postgres_store.py configura apenas app.current_organization_id

**Impacto:** execution_evidence e runtime_configuration_audit podem não enxergar o mesmo contexto das demais tabelas; há risco de bloqueio indevido ou isolamento inconsistente.

**Remediação:** Escolher um único identificador/contexto, migrar tabelas/policies e atualizar adapters/testes. Recomenda-se organization_id/app.current_organization_id para aderência ao restante.

**Critério de validação:** Executar migrations em PostgreSQL e provar leitura/escrita A, negação B e fail-closed sem contexto.


**Dependência externa:** PostgreSQL real necessário para prova final.

### AUD-SQL-002 — PostgreSQL, concorrência e RLS permanecem não executados

**Severidade:** CRITICAL  
**Confiança:** CONFIRMED  
**Classe de execução:** EXTERNAL

**Evidência:**

- scripts/test_postgres_event_transport.py retorna BLOCKED sem TEST_DATABASE_URL
- audit/AUTO12-POSTGRES-RUNTIME.txt
- REQUIREMENT-EVIDENCE-MAP mantém gaps explícitos

**Impacto:** SQL válido estaticamente não prova migrations, locks, trigger behavior, rollback, performance ou isolamento real.

**Remediação:** Preparar harness limpo com roles NOBYPASSRLS, migrations do zero/upgrade, concorrência, rollback e restore.

**Critério de validação:** Execução deve gerar logs, versões, hashes e resultados em PostgreSQL 16.x.


**Dependência externa:** Requer PostgreSQL acessível e credenciais de teste.

## 6. OpenAPI e erros

### AUD-API-001 — Operação de leitura individual de record não existe

**Severidade:** MEDIUM  
**Confiança:** CONFIRMED  
**Classe de execução:** LOCAL_PARTIAL

**Evidência:**

- OpenAPI possui PATCH /v1/objects/{objectKey}/records/{recordId}
- não possui GET no mesmo path
- CAPABILITY-FACET-MATRIX declara o gap

**Impacto:** Consumidores não têm contrato direto para recuperar um record por ID e validar ETag/versão.

**Remediação:** Definir semântica e adicionar GET individual, responses, ETag, autorização e exemplos; alinhar runtime e SDK.

**Critério de validação:** Lint OpenAPI + contract test + teste contra API implantada.


**Dependência externa:** Semântica final e prova de runtime dependem do serviço.

### AUD-API-002 — Catálogo de erros não está fechado no contrato OpenAPI

**Severidade:** HIGH  
**Confiança:** CONFIRMED  
**Classe de execução:** LOCAL

**Evidência:**

- 00-decisions/error-catalog.yaml define códigos
- components.schemas.Problem.code é string sem enum/$ref
- não há gate catálogo ↔ OpenAPI ↔ SDK

**Impacto:** Códigos e status podem divergir silenciosamente entre contrato, runtime, SDK e runbooks.

**Remediação:** Criar schema canônico de erros gerado do catálogo e gate de consistência bidirecional.

**Critério de validação:** Todo código usado deve existir uma vez, com status idêntico em todas as superfícies.

### AUD-API-003 — Respostas 401/403 são inconsistentes entre operações protegidas

**Severidade:** MEDIUM  
**Confiança:** CONFIRMED  
**Classe de execução:** LOCAL

**Evidência:**

- 8 operações protegidas omitem 401 e/ou 403
- [{'operationId': 'createObjectDefinition', 'missing': ['401', '403']}, {'operationId': 'listObjectDefinitions', 'missing': ['401', '403']}, {'operationId': 'createRecord', 'missing': ['401', '403']}, {'operationId': 'listRecords', 'missing': ['401', '403']}, {'operationId': 'getWorkInbox', 'missing': ['401', '403']}, {'operationId': 'replayDeadLetter', 'missing': ['401', '403']}, {'operationId': 'resolveDeadLetter', 'missing': ['401', '403']}, {'operationId': 'recordExecutionEvidence', 'missing': ['401', '403']}]

**Impacto:** Clientes recebem contrato incompleto de falhas de autenticação/autorização.

**Remediação:** Padronizar responses de segurança por operação ou regra global documentada.

**Critério de validação:** Validador deve exigir 401/403 em toda operação com OAuth2, salvo exceção justificada.

## 7. AsyncAPI e eventos

### AUD-EVT-001 — AsyncAPI 3 possui cobertura operacional incompleta

**Severidade:** HIGH  
**Confiança:** CONFIRMED  
**Classe de execução:** LOCAL_PARTIAL

**Evidência:**

- 7 channels
- 6 operations cobrindo 3 channels
- 4 channels sem operation: metadataObjectPublished, metadataRecordCreated, quotaExceeded, workItemProjected
- servers ausente

**Impacto:** Produtores/consumidores e ambientes de broker não são identificáveis para quatro contratos.

**Remediação:** Adicionar operations send/receive conforme AsyncAPI 3.0, servers e bindings; não usar modelo publish/subscribe de AsyncAPI 2.x.

**Critério de validação:** Validação AsyncAPI 3 + gate que exige ao menos uma operação por canal aplicável.

### AUD-EVT-002 — Broker Redpanda não foi executado

**Severidade:** HIGH  
**Confiança:** CONFIRMED  
**Classe de execução:** EXTERNAL

**Evidência:**

- campanha: rpk available BLOCKED
- Docker/Podman não disponível nesta execução
- REQUIREMENT-EVIDENCE-MAP mantém deduplicação/replay não provados

**Impacto:** Entrega, ordenação, retry, DLQ, lag e replay permanecem hipóteses contratuais.

**Remediação:** Executar compose/cluster efêmero com producer/consumer reais, falhas e replay.

**Critério de validação:** Evidence deve incluir broker version, topic config, offsets, payload hashes e resultados.


**Dependência externa:** Requer Redpanda/Kafka runtime e engine de containers ou cluster.

## 8. BDD e rastreabilidade

### AUD-BDD-001 — Cenários BDD são massivamente duplicados

**Severidade:** HIGH  
**Confiança:** CONFIRMED  
**Classe de execução:** LOCAL

**Evidência:**

- 152 cenários, apenas 38 corpos de passos únicos
- 133 cenários pertencem a grupos duplicados
- 19 grupos de duplicidade

**Impacto:** A contagem de cenários infla cobertura sem ampliar comportamento testado e dificulta manutenção.

**Remediação:** Consolidar variantes idênticas, usar Scenario Outline somente quando exemplos alterarem dados/resultado e registrar comportamento único.

**Critério de validação:** Gate de duplicidade semântica deve impedir cenários com passos idênticos e IDs diferentes sem justificativa.

### AUD-BDD-002 — Tags de requisitos BDD não correspondem ao catálogo canônico

**Severidade:** CRITICAL  
**Confiança:** CONFIRMED  
**Classe de execução:** LOCAL

**Evidência:**

- 133 tags REQ-* nos features
- 0 correspondências com os 19 IDs canônicos
- 133 IDs BDD não canônicos

**Impacto:** Não existe cadeia confiável requisito → cenário; métricas de cobertura por requisito não são demonstráveis.

**Remediação:** Normalizar tags para os IDs de 00-decisions/requirements.yaml ou criar catálogo formal de requisitos filhos com parent_id.

**Critério de validação:** Todo @REQ-* deve existir no catálogo e todo requisito aplicável deve apontar para pelo menos um cenário não duplicado.

### AUD-BDD-003 — Binding registry não contém mapeamento por cenário

**Severidade:** HIGH  
**Confiança:** CONFIRMED  
**Classe de execução:** LOCAL

**Evidência:**

- 04-bdd/BINDING-REGISTRY.yaml possui apenas versão, política, status e source_of_truth
- auditoria local: 123 unmapped/descriptive, 2 executed PASS, 2 BLOCKED

**Impacto:** O registro não prova qual step definition executa cada cenário nem o nível de execução.

**Remediação:** Criar registro por scenario_id com feature, linha, requisito, step_definition, execution_level, status e evidence_path.

**Critério de validação:** Validador deve falhar para cenário sem registro ou para evidence_path inválido.

## 9. Statecharts e SDK

### AUD-STATE-001 — Registry de migração cobre apenas 2 das 5 máquinas

**Severidade:** HIGH  
**Confiança:** CONFIRMED  
**Classe de execução:** LOCAL

**Evidência:**

- machine files: ['approval.machine.ts', 'event-transport.machine.ts', 'object-definition.machine.ts', 'sla.machine.ts', 'workflow.machine.ts']
- registry: ['event-transport', 'metadata.object-definition']

**Impacto:** approval, SLA e workflow não possuem política formal de versão/snapshot no registry.

**Remediação:** Registrar todas as máquinas ou marcar explicitamente NOT_PERSISTED/NOT_APPLICABLE com justificativa.

**Critério de validação:** Gate deve comparar arquivos *.machine.ts com registry e rejeitar omissões.

### AUD-STATE-002 — Execução oficial XState não foi reproduzida nesta auditoria

**Severidade:** MEDIUM  
**Confiança:** CONFIRMED  
**Classe de execução:** EXTERNAL

**Evidência:**

- tools/xstate-runtime/package.json fixa versões, mas não possui package-lock
- instalação npm não concluiu no ambiente
- evidência XState referenciada está vazia

**Impacto:** Comportamento pode divergir da inspeção estática e não há resolução reproduzível de dependências.

**Remediação:** Adicionar lockfile, npm ci e teste oficial createActor; registrar BLOCKED quando dependências não puderem ser resolvidas.

**Critério de validação:** npm ci && npm test com log e hash do lockfile.


**Dependência externa:** Requer acesso ao registry npm ou cache confiável.

### AUD-SDK-001 — SDK não possui lockfile e usa instalação não determinística no CI

**Severidade:** HIGH  
**Confiança:** CONFIRMED  
**Classe de execução:** LOCAL_PARTIAL

**Evidência:**

- 06-sdk/typescript/package.json possui ranges ^5.7.0 e ^2.0.0
- não existe package-lock no diretório
- workflow usa npm install

**Impacto:** Builds futuros podem resolver versões diferentes e produzir resultados divergentes.

**Remediação:** Gerar lockfile revisado e usar npm ci; separar dependências de geração/compile/test.

**Critério de validação:** npm ci, tsc --noEmit e testes devem passar sem alterar lockfile.


**Dependência externa:** Geração inicial do lockfile requer resolução confiável de pacotes.

### AUD-SDK-002 — SDK compila e drift gate passa, mas cobertura herda lacunas do OpenAPI

**Severidade:** MEDIUM  
**Confiança:** CONFIRMED  
**Classe de execução:** LOCAL_PARTIAL

**Evidência:**

- tsc global 5.8.3: PASS
- scripts/check_sdk_drift.sh: PASS
- 06-sdk/generated/openapi-operations.json contém 12 operações
- GET individual ausente no OpenAPI

**Impacto:** Drift zero prova consistência com o contrato atual, não completude funcional.

**Remediação:** Corrigir contrato primeiro, regenerar SDK e adicionar testes de uso por operação.

**Critério de validação:** Cobertura SDK deve ser 1:1 com operationId e exemplos de sucesso/erro.

### AUD-LOCK-001 — Lockfile raiz é vazio e não protege dependências

**Severidade:** HIGH  
**Confiança:** CONFIRMED  
**Classe de execução:** LOCAL_PARTIAL

**Evidência:**

- package-lock.json packages = {}
- pip install no workflow sem requirements lock
- xstate e SDK sem lockfile

**Impacto:** Reprodutibilidade global é inexistente apesar da presença nominal de package-lock.

**Remediação:** Remover lockfile enganoso ou convertê-lo em workspace real; criar locks por ecossistema e política de atualização.

**Critério de validação:** Instalações clean devem ser byte-reprodutíveis e não modificar locks.


**Dependência externa:** Resolução inicial depende dos registries confiáveis.

## 10. CI, supply chain e infraestrutura

### AUD-CI-001 — Workflow não aplica hardening mínimo de supply chain

**Severidade:** HIGH  
**Confiança:** CONFIRMED  
**Classe de execução:** LOCAL_PARTIAL

**Evidência:**

- 8 uses sem SHA imutável
- permissions raiz ausente
- concurrency ausente
- timeout-minutes ausente
- 2 npm install
- pip install sem versões/hashes

**Impacto:** Actions, pacotes e imagens mutáveis podem alterar o resultado ou ampliar privilégios.

**Remediação:** Fixar actions por commit SHA verificado, permissions mínimas, timeouts, concurrency, npm ci e dependências Python com hashes.

**Critério de validação:** Validador estático + execução real em GitHub Actions.


**Dependência externa:** SHAs atuais, OIDC e branch protection exigem GitHub/repositórios oficiais.

### AUD-SUP-001 — Imagens de container não estão fixadas por digest

**Severidade:** HIGH  
**Confiança:** CONFIRMED  
**Classe de execução:** LOCAL_PARTIAL

**Evidência:**

- postgres:16-alpine
- redis:7-alpine
- redpanda:v24.2.18
- innovar/*:1.0.0/local
- ghcr.io/innovar/execution-evidence:sha256-required é placeholder, não digest

**Impacto:** A mesma configuração pode executar bytes diferentes; provenance e SBOM não podem ser vinculados ao artefato.

**Remediação:** Substituir tags por repository@sha256:<digest>, gerar SBOM, assinatura e attestation.

**Critério de validação:** Gate deve rejeitar imagens sem @sha256 e verificar assinatura/provenance.


**Dependência externa:** Digests/assinaturas exigem registry OCI e OIDC/chaves.

### AUD-INF-001 — Helm foi validado apenas por validador estático próprio

**Severidade:** HIGH  
**Confiança:** CONFIRMED  
**Classe de execução:** EXTERNAL

**Evidência:**

- scripts/validate_helm_static.py: PASS
- helm, kubeconform e kubectl indisponíveis
- 9 templates Go não são YAML puro antes de renderização

**Impacto:** Não há prova de helm lint/template, schema Kubernetes, install, selectors, policies ou tráfego real.

**Remediação:** Executar helm lint, helm template, kubeconform strict e instalação em cluster efêmero.

**Critério de validação:** Salvar rendered.yaml, versões das ferramentas, eventos do cluster e smoke tests.


**Dependência externa:** Requer Helm, kubeconform e Kubernetes.

### AUD-INF-002 — Não existe Terraform/OpenTofu

**Severidade:** MEDIUM  
**Confiança:** CONFIRMED  
**Classe de execução:** LOCAL_PARTIAL

**Evidência:**

- 0 arquivos .tf/.tofu
- COVERAGE-CHECKLIST inclui infrastructure_as_code

**Impacto:** A topologia externa não é reprodutível por código; Helm cobre workloads, não provisionamento de infraestrutura.

**Remediação:** Primeiro decidir provider/topologia; então criar módulos e ambientes. Não criar scaffold genérico como prova de completude.

**Critério de validação:** tofu fmt/validate/plan e policy checks; apply somente em ambiente autorizado.


**Dependência externa:** Provider, credenciais, backend e decisões de cloud são externos.

## 11. Observabilidade, segurança e dados

### AUD-OBS-001 — SLOs são metas declaradas, não medições operacionais

**Severidade:** HIGH  
**Confiança:** CONFIRMED  
**Classe de execução:** EXTERNAL

**Evidência:**

- NFR-SLO-CATALOG.yaml
- REQ-NFR-001 permanece PARTIAL
- distributed game day e load execution BLOCKED

**Impacto:** Não é possível afirmar disponibilidade, latência, RTO/RPO ou burn rate reais.

**Remediação:** Definir SLIs computáveis, telemetria, alertas e executar campanha de carga/game day.

**Critério de validação:** Relatórios devem conter janela, população, percentis, erros e fonte de métricas.


**Dependência externa:** Requer serviços implantados e backend de observabilidade.

### AUD-SEC-001 — Threat model formal não está presente

**Severidade:** MEDIUM  
**Confiança:** CONFIRMED  
**Classe de execução:** LOCAL

**Evidência:**

- nenhum THREAT-MODEL.md/ABUSE-CASES.yaml no inventário
- controles estão dispersos em ADRs, RLS e runbooks

**Impacto:** A cobertura de ameaças, trust boundaries e abuse cases não é verificável como conjunto.

**Remediação:** Criar threat model versionado ligado a requisitos e testes; não afirmar pentest.

**Critério de validação:** Checklist STRIDE/abuse cases deve apontar controles, owners e evidências.

### AUD-DATA-001 — Governança de dados pessoais não está formalizada como inventário executável

**Severidade:** MEDIUM  
**Confiança:** CONFIRMED  
**Classe de execução:** LOCAL_PARTIAL

**Evidência:**

- retention_class existe no OpenAPI
- não há DATA-INVENTORY, DSAR workflow ou política canônica de retenção no inventário

**Impacto:** Retenção, exclusão, legal hold e propagação para eventos/backups não são auditáveis.

**Remediação:** Criar inventário/classificação/retention/DSAR ligados a schemas e eventos; submeter a validação jurídica.

**Critério de validação:** Gate documental e testes de retenção; aprovação jurídica/organizacional externa.


**Dependência externa:** Base legal, responsáveis e processo operacional dependem da organização.

### AUD-RUN-001 — Evidências de execução externa permanecem BLOCKED e precisam de runbook único

**Severidade:** HIGH  
**Confiança:** CONFIRMED  
**Classe de execução:** EXTERNAL

**Evidência:**

- PostgreSQL, Redpanda, Helm/Kubernetes, load e distributed game day BLOCKED
- gaps distribuídos em vários relatórios históricos

**Impacto:** A prova externa pode ser executada de forma inconsistente ou deixar de registrar dados mínimos.

**Remediação:** Consolidar runbook de prova externa com pré-requisitos, comandos, critérios, evidências e rollback.

**Critério de validação:** Cada gate externo deve gerar registro assinado/hasheado com PASS/FAIL/BLOCKED.


**Dependência externa:** Requer ambientes externos correspondentes.

## 12. Registro completo dos achados

| ID | Severidade | Domínio | Classe | Status |
|---|---|---|---|---|
| `AUD-CAN-001` | **CRITICAL** | governance | `LOCAL` | OPEN |
| `AUD-CAN-002` | **HIGH** | governance | `LOCAL` | OPEN |
| `AUD-INT-001` | **CRITICAL** | integrity | `LOCAL` | OPEN |
| `AUD-HYG-001` | **MEDIUM** | package-hygiene | `LOCAL` | OPEN |
| `AUD-EVD-001` | **HIGH** | evidence | `LOCAL` | OPEN |
| `AUD-EVD-002` | **CRITICAL** | evidence | `LOCAL` | OPEN |
| `AUD-TST-001` | **HIGH** | testing | `LOCAL` | OPEN |
| `AUD-TST-002` | **MEDIUM** | testing | `LOCAL` | OPEN |
| `AUD-BDD-001` | **HIGH** | bdd | `LOCAL` | OPEN |
| `AUD-BDD-002` | **CRITICAL** | traceability | `LOCAL` | OPEN |
| `AUD-BDD-003` | **HIGH** | bdd | `LOCAL` | OPEN |
| `AUD-SQL-001` | **CRITICAL** | database-security | `LOCAL_PARTIAL` | OPEN |
| `AUD-SQL-002` | **CRITICAL** | database | `EXTERNAL` | OPEN |
| `AUD-API-001` | **MEDIUM** | openapi | `LOCAL_PARTIAL` | OPEN |
| `AUD-API-002` | **HIGH** | openapi | `LOCAL` | OPEN |
| `AUD-API-003` | **MEDIUM** | openapi | `LOCAL` | OPEN |
| `AUD-EVT-001` | **HIGH** | asyncapi | `LOCAL_PARTIAL` | OPEN |
| `AUD-EVT-002` | **HIGH** | event-runtime | `EXTERNAL` | OPEN |
| `AUD-STATE-001` | **HIGH** | statecharts | `LOCAL` | OPEN |
| `AUD-STATE-002` | **MEDIUM** | statecharts | `EXTERNAL` | OPEN |
| `AUD-SDK-001` | **HIGH** | sdk | `LOCAL_PARTIAL` | OPEN |
| `AUD-SDK-002` | **MEDIUM** | sdk | `LOCAL_PARTIAL` | OPEN |
| `AUD-CI-001` | **HIGH** | ci-cd | `LOCAL_PARTIAL` | OPEN |
| `AUD-SUP-001` | **HIGH** | supply-chain | `LOCAL_PARTIAL` | OPEN |
| `AUD-INF-001` | **HIGH** | infrastructure | `EXTERNAL` | OPEN |
| `AUD-INF-002` | **MEDIUM** | infrastructure | `LOCAL_PARTIAL` | OPEN |
| `AUD-OBS-001` | **HIGH** | observability | `EXTERNAL` | OPEN |
| `AUD-SEC-001` | **MEDIUM** | security-governance | `LOCAL` | OPEN |
| `AUD-DATA-001` | **MEDIUM** | data-governance | `LOCAL_PARTIAL` | OPEN |
| `AUD-MET-001` | **HIGH** | metrics | `LOCAL` | OPEN |
| `AUD-MET-002` | **MEDIUM** | metrics | `LOCAL` | OPEN |
| `AUD-DOC-001` | **HIGH** | documentation | `LOCAL` | OPEN |
| `AUD-DOC-002` | **MEDIUM** | documentation | `LOCAL` | OPEN |
| `AUD-LOCK-001` | **HIGH** | dependencies | `LOCAL_PARTIAL` | OPEN |
| `AUD-RUN-001` | **HIGH** | operations | `EXTERNAL` | OPEN |

## 13. Plano da Rodada 2

1. Corrigir fonte canônica e ciclo.
2. Corrigir tenancy `app.tenant_id` versus `app.current_organization_id`.
3. Regenerar manifesto SHA sobre árvore limpa.
4. Reestruturar campanha/evidências com nível separado de resultado.
5. Normalizar BDD, tags e registry.
6. Corrigir OpenAPI, AsyncAPI e catálogo de erros.
7. Completar statechart registry e lock policies.
8. Harden CI e imagens, mantendo itens externos como BLOCKED.
9. Refazer documentação consolidada e manifestos.

## 14. Apêndice de execução

| Comando/controle | Resultado observado |
|---|---|
| validate_all.py | PASS: Retornou 0, resultado interno PARTIAL devido BDD |
| unittest tests | PASS: 70 testes |
| unittest bdd_steps | PASS: 8 testes |
| BDD event transport | PARTIAL: 2 PASS, 2 BLOCKED PostgreSQL |
| SDK drift | PASS: dist corresponde ao gerado |
| TypeScript SDK compile | PASS: tsc global 5.8.3 |
| pytest | FAIL: INTERNALERROR por sys.exit(77) na coleta |
| PostgreSQL | BLOCKED: TEST_DATABASE_URL ausente |
| Helm oficial/kubeconform/Kubernetes | BLOCKED: ferramentas/cluster ausentes |
| XState npm runtime | BLOCKED: dependências não resolvidas no ambiente |

**SHA-256 do documento consolidado recebido:** `0f620526501656d339ab8ad86258198d39a78156427fd53d73dc211cccf659c0` — corresponde ao checksum fornecido. O manifesto consolidado de 189 fontes também foi reconferido sem divergência, mas seu escopo não cobre os 355 arquivos.

