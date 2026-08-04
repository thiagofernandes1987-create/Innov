# Auditoria técnica, imparcial e cirúrgica — reinício em quatro loops

## Veredito

**Cobertura defensável: 62.2%**.

A marca anterior de 68,9% foi revogada. Ela misturava presença documental, parsing e contagem de
cenários com evidência executável. A nova nota usa a régua de `audit/EVIDENCE-RUBRIC.md` e registra
explicitamente o que não foi executado.

| Dimensão | Cobertura | Evidência e limite |
|---|---:|---|
| Visão de produto | 90% | Arquitetura consolidada; sem validação por usuários/mercado. |
| Arquitetura lógica | 88% | Context map e boundaries documentados; integração não executada. |
| Decomposição em capacidades | 84% | Catálogo amplo; vários runtimes seguem sem walking slice. |
| Arquitetura física | 55% | Topologia descrita; serviços e cluster não executados. |
| Modelo de dados executável | 70% | DDL, constraints, RLS e testes estáticos; migrations não aplicadas em PostgreSQL. |
| Contratos de API | 68% | OpenAPI parseável, refs e invariantes testados; sem bundle/lint oficial e sem servidor. |
| Contratos de eventos | 56% | AsyncAPI e schemas presentes; sem broker, producer ou consumer executado. |
| Statecharts executáveis | 64% | Máquina TypeScript compilável e persistence formalizada; endpoint não integrado. |
| Validações formais | 72% | Oito testes automatizados executados; escopo ainda limitado. |
| Concorrência formalizada | 58% | ETag/expected version formalizados; sem disputa concorrente real. |
| Idempotência formalizada | 66% | Contrato e cenários existem; sem handler/replay de resposta integrado. |
| Cache e invalidação | 45% | Política e adapter; sem Redis ou invalidação multi-instância. |
| Infraestrutura como código | 42% | Compose/Helm parcial; sem helm template, instalação ou Terraform. |
| Testes de aceitação executáveis | 38% | 136 cenários Gherkin, porém sem step definitions contra API. |
| SDK implementável | 55% | Código TypeScript compila; é manual, não gerado do OpenAPI e sem testes de rede. |
| Runbooks operacionais | 44% | Três runbooks; sem exercícios operacionais ou cobertura de restore/incidentes críticos. |

## Correções comprovadas

- OpenAPI restringido a `JSONB_HYBRID`, única estratégia executável declarada.
- ETags fracos removidos; respostas 412 e 428 formalizadas.
- Transition schema fechado por enum e `reason_code` obrigatório em transições destrutivas/devolutivas.
- RLS `FORCE` e policies tenant-aware adicionadas às tabelas de state machine e DLQ.
- DLQ deduplicada por tenant, consumer e event.
- FKs e índices adicionados ao runtime de statechart.
- Registro passou a referenciar uma versão concreta de objeto.
- Trigger impede UPDATE/DELETE de versão publicada.
- Função de quota ganhou `search_path` controlado e verificação de tenant context.
- Máquina de lifecycle ganhou autorização, version check, reason, schema e breaking-change guards.
- Oito testes automatizados locais foram executados com sucesso.
- TypeScript foi compilado com `tsc` e retornou código 0.

## O que continua não comprovado

- SQL aplicado em PostgreSQL real.
- RLS testada com roles e dois tenants reais.
- OpenAPI/AsyncAPI validados por bundler/linter oficial.
- API HTTP executada.
- Idempotência integrada e replay exato testado.
- Kafka, Redis, outbox worker e DLQ executados.
- Gherkin com step definitions e serviços reais.
- Helm renderizado/instalado.
- Terraform existente/aplicado.
- Restore, carga, caos, RPO/RTO ou SLO medidos.
- Solution Package, Customer Runtime e Marketplace como walking slices.

## Conclusão

A base ficou mais coerente e testável, mas ainda está em maturidade de especificação formal com
implementações de referência parciais. Não está próxima de 95% sob uma régua de produção.
