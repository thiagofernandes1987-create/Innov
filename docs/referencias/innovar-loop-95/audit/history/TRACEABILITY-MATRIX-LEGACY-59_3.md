# Matriz de cobertura e evidências — reauditoria cirúrgica

Data: 2026-07-22. Estados seguem `00-decisions/COVERAGE-CHECKLIST.yaml`.

| Dimensão | Nota | Evidência reproduzida | Limite/gap aberto |
|---|---:|---|---|
| Visão de produto | 90 | blueprint consolidado e limites explícitos | sem validação de mercado/operacional |
| Arquitetura lógica | 86 | context map, ownership, ADRs e invariantes | decisões ainda sem enforcement integrado |
| Decomposição em capacidades | 82 | kernel, Work OS, runtimes e vertical separados | dependências não executadas como grafo |
| Arquitetura física | 50 | Docker/Helm parciais e adapters | nenhum ambiente instalado; topologia incompleta |
| Modelo de dados executável | 68 | DDL, FKs, triggers e RLS inspecionados | migrations nunca aplicadas em PostgreSQL |
| Contratos de API | 64 | OpenAPI 3.1 parseado, refs e checks semânticos | sem lint oficial, bundle ou servidor |
| Contratos de eventos | 50 | AsyncAPI e schemas coerentes localmente | sem broker, compatibilidade ou consumer tests |
| Statecharts executáveis | 60 | TypeScript compila e registry existe | não integrados a persistência/handlers |
| Validações formais | 70 | 22 testes locais e JSON Schema Draft 2020-12 | validação majoritariamente estática |
| Concorrência | 55 | expected version/If-Match e teste em memória | sem corrida transacional real |
| Idempotência | 62 | replay e divergência testados em memória | sem persistência/lock/replay HTTP |
| Cache e invalidação | 40 | ADR, policy e interface | Redis e invalidação ausentes |
| Infraestrutura como código | 38 | Helm corrigido estaticamente | Helm não renderizado; Terraform ausente |
| Testes de aceitação | 42 | 7 comportamentos únicos em runtime de referência | sem step definitions ou serviços reais |
| SDK implementável | 52 | TypeScript compila; ETag corrigido | manual, sem geração/drift/integration test |
| Runbooks operacionais | 40 | três procedimentos documentados | nenhum exercício, restore ou tempo medido |
| **Média global** | **59,3** | média aritmética de 16 dimensões | meta não atingida |

## Correções comprovadas nesta rodada

- schema de evento alinhado à única estratégia de storage implementável (`JSONB_HYBRID`);
- migration de hardening de quota criada com validação positiva e revogação de `PUBLIC`;
- SDK corrigido para ETag forte;
- labels, selector, porta nomeada e ServiceAccount do Helm alinhados;
- ConfigMap Helm adicionado;
- sete testes contratuais acumulados desde o primeiro baseline; total local 22/22 nesta rodada.

## Regra de interpretação

Teste estrutural não equivale a integração. Runtime em memória não prova PostgreSQL, HTTP, broker, cache ou Kubernetes.


## Evidências novas desta reauditoria

| Item | Evidência | Estado | Limite |
|---|---|---|---|
| Assinatura de quota | `0006_tenancy_and_function_signature_hardening.sql` remove overload `varchar` e mantém assinatura `text` | formalizado/testado localmente | migration não aplicada em PostgreSQL |
| RLS do transporte | policies para domain events, outbox e inbox | formalizado/testado localmente | isolamento não exercitado com roles reais |
| Storage strategy | constraint de banco limita a `JSONB_HYBRID` | formalizado/testado localmente | migration não aplicada |
| Regressão estática | 22 testes locais aprovados | testado localmente | não equivale a integração |


---

# Modelo de medição vigente

A tabela histórica acima representa a régua anterior de evidência de execução e não mede integralmente a completude da especificação.

## Indicadores canônicos

| Indicador | Estado | Interpretação |
|---|---|---|
| SCI — Specification Completeness Index | NOT_CALCULATED | Aguarda inventário por capability × 18 facetas com evidência individual |
| EEI — Execution Evidence Index | 59,3% LEGACY_BASELINE | Linha histórica; não equivale à completude do blueprint |
| RQI — Regression Quality Index | baseline criada | Compara testes, falhas, referências, fonte canônica, conflitos e rastreabilidade |

A próxima medição de SCI não pode usar contagem de arquivos. Cada célula deverá apontar para contrato, SQL, trigger, variável, API, evento, statechart, teste, IaC, SDK ou runbook aplicável, além do gap remanescente.
