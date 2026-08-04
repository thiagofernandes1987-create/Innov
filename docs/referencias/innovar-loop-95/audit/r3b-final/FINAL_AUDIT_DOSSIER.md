# Dossiê Final de Auditoria — UTA-R3B

## 1. Escopo e independência

Esta execução conciliou exclusivamente fontes congeladas e evidências primárias. O checkpoint R3B anterior foi excluído da cadeia decisória. Os anexos `*-1.yaml` foram classificados como obsoletos porque contêm a invalidação antiga de prefixos, não a auditoria R3A limpa.

## 2. Inventário e delta

- Material original: 469 arquivos.
- Material atualizado: 578 arquivos.
- Delta: 110 adicionados, 1 removido, 43 modificados e 425 inalterados.
- Remoção relevante: `06-sdk/generated/openapi-operations.json`.
- Substituto atual: `06-sdk/generated/openapi-operation-inventory.json`.

## 3. Reconciliação por achado

### FFND-R3B-0001 — Escopo de idempotência de DLQ continua sem identidade do recurso

- **Fontes:** FND-R1-001, PFND-0004
- **Severidade / prioridade:** `HIGH` / `P0`
- **Reconciliação:** `PARTIALLY_RESOLVED`
- **Desfecho:** `PARTIAL`
- **Condição atual:** O isolamento por organização e operação removeu o vazamento cross-tenant, mas a mesma chave em dois dead_letter_id retorna a resposta do primeiro recurso e não resolve o segundo.
- **Risco residual:** Colisão lógica e resposta associada ao recurso errado dentro do mesmo tenant.
- **Ação exigida:** Incluir dead_letter_id e hash semântico do payload no escopo de idempotência em SQLite e PostgreSQL; criar testes negativos por recurso.
- **Validações:** FVAL-R3B-0031, FVAL-R3B-0008
### FFND-R3B-0002 — Contexto HMAC reduz falsificação direta, mas permanece reutilizável entre requisições

- **Fontes:** FND-R1-002, PFND-0002
- **Severidade / prioridade:** `HIGH` / `P0`
- **Reconciliação:** `PARTIALLY_RESOLVED`
- **Desfecho:** `PARTIAL`
- **Condição atual:** Headers sem assinatura são rejeitados, porém o HMAC cobre apenas organização, ator, scopes e timestamp.
- **Risco residual:** Replay de contexto capturado dentro da janela de 300 segundos em método, rota ou corpo distintos.
- **Ação exigida:** Assinar versão canônica de method, normalized path/query, body hash, idempotency key, timestamp e nonce; manter cache anti-replay e vínculo de audiência.
- **Validações:** FVAL-R3B-0030, FVAL-R3B-0008
### FFND-R3B-0003 — Contrato OAuth2 e runtime administrativo permanecem semanticamente divergentes

- **Fontes:** FND-R1-003, PFND-0003
- **Severidade / prioridade:** `HIGH` / `P0`
- **Reconciliação:** `PARTIALLY_RESOLVED`
- **Desfecho:** `PARTIAL`
- **Condição atual:** Códigos e respostas locais foram alinhados, mas o OpenAPI publica OAuth2 enquanto o serviço só aceita contexto HMAC de proxy.
- **Risco residual:** Clientes e implantações diretas podem assumir autenticação inexistente ou contornar a fronteira de confiança esperada.
- **Ação exigida:** Escolher uma arquitetura canônica: validar JWT/OAuth2 no serviço ou modelar formalmente o trusted proxy e seus headers assinados no contrato e testes.
- **Validações:** FVAL-R3B-0034, FVAL-R3B-0013, FVAL-R3B-0008
### FFND-R3B-0004 — Drift semântico do SDK

- **Fontes:** FND-R1-004
- **Severidade / prioridade:** `HIGH` / `P2`
- **Reconciliação:** `RESOLVED_CONFIRMED`
- **Desfecho:** `CLOSED`
- **Condição atual:** A correção está presente e a validação local correspondente foi reproduzida.
- **Risco residual:** Nenhum risco residual identificado no nível local executado.
- **Ação exigida:** Manter gate anti-regressão no CI.
- **Validações:** FVAL-R3B-0012, FVAL-R3B-0011, FVAL-R3B-0013
### FFND-R3B-0005 — Pipeline de geração do SDK

- **Fontes:** FND-R1-005
- **Severidade / prioridade:** `MEDIUM` / `P2`
- **Reconciliação:** `RESOLVED_CONFIRMED`
- **Desfecho:** `CLOSED`
- **Condição atual:** A correção está presente e a validação local correspondente foi reproduzida.
- **Risco residual:** Nenhum risco residual identificado no nível local executado.
- **Ação exigida:** Manter gate anti-regressão no CI.
- **Validações:** FVAL-R3B-0012, FVAL-R3B-0011
### FFND-R3B-0006 — Backoff do publisher

- **Fontes:** FND-R1-006
- **Severidade / prioridade:** `HIGH` / `P2`
- **Reconciliação:** `RESOLVED_CONFIRMED`
- **Desfecho:** `CLOSED`
- **Condição atual:** A correção está presente e a validação local correspondente foi reproduzida.
- **Risco residual:** Nenhum risco residual identificado no nível local executado.
- **Ação exigida:** Manter gate anti-regressão no CI.
- **Validações:** FVAL-R3B-0008, FVAL-R3B-0009
### FFND-R3B-0007 — Harness Docker Compose permanece apenas parcialmente reproduzível

- **Fontes:** FND-R1-007
- **Severidade / prioridade:** `HIGH` / `P1`
- **Reconciliação:** `PARTIALLY_RESOLVED`
- **Desfecho:** `PARTIAL`
- **Condição atual:** Dockerfile/build local foi adicionado e defaults foram endurecidos, porém imagens e dependências não estão fixadas de forma verificável.
- **Risco residual:** Build pode variar ou permanecer inexequível em ambiente limpo.
- **Ação exigida:** Gerar lockfiles confiáveis, fixar imagens por digest e executar build/compose em runner limpo.
- **Validações:** FVAL-R3B-0028, FVAL-R3B-0029, FVAL-R3B-0007
### FFND-R3B-0008 — Lockfiles verificados ausentes

- **Fontes:** FND-R1-008, PFND-0007
- **Severidade / prioridade:** `HIGH` / `P0`
- **Reconciliação:** `BLOCKED_EXTERNAL_CONFIRMED`
- **Desfecho:** `BLOCKED_EXTERNAL`
- **Condição atual:** Os arquivos package-lock e requirements lock com hashes não existem no material.
- **Risco residual:** Resolução transitiva não determinística e impossibilidade de reproduzir dependências oficiais.
- **Ação exigida:** Resolver dependências em registries confiáveis, revisar e congelar lockfiles; repetir npm ci e pip --require-hashes.
- **Validações:** FVAL-R3B-0028
### FFND-R3B-0009 — Imagens OCI não fixadas por digest

- **Fontes:** FND-R1-009, PFND-0008
- **Severidade / prioridade:** `HIGH` / `P0`
- **Reconciliação:** `BLOCKED_EXTERNAL_CONFIRMED`
- **Desfecho:** `BLOCKED_EXTERNAL`
- **Condição atual:** Tags mutáveis e placeholders continuam presentes em Compose, Kubernetes e workflow.
- **Risco residual:** Supply chain não reprodutível e risco de alteração upstream.
- **Ação exigida:** Resolver digests oficiais, atualizar referências, gerar SBOM, assinatura e provenance.
- **Validações:** FVAL-R3B-0029
### FFND-R3B-0010 — RLS, migrations e concorrência PostgreSQL sem execução real

- **Fontes:** FND-R1-010, PFND-0006
- **Severidade / prioridade:** `CRITICAL` / `P0`
- **Reconciliação:** `BLOCKED_EXTERNAL_CONFIRMED`
- **Desfecho:** `BLOCKED_EXTERNAL`
- **Condição atual:** Migrations 0013/0014 estão presentes, mas nenhuma execução PostgreSQL real foi fornecida.
- **Risco residual:** Isolamento de tenant, locks, assinatura de funções e idempotência SQL permanecem não comprovados.
- **Ação exigida:** Executar banco efêmero/real com roles NOBYPASSRLS, matriz cross-tenant, pool reuse e concorrência.
- **Validações:** FVAL-R3B-0023, FVAL-R3B-0027
### FFND-R3B-0011 — Transporte Redpanda/Kafka sem prova integrada

- **Fontes:** FND-R1-011, PFND-0009
- **Severidade / prioridade:** `HIGH` / `P1`
- **Reconciliação:** `BLOCKED_EXTERNAL_CONFIRMED`
- **Desfecho:** `BLOCKED_EXTERNAL`
- **Condição atual:** Broker e rpk não estão disponíveis.
- **Risco residual:** Retry, deduplicação, ordering, replay e DLQ não estão provados no transporte real.
- **Ação exigida:** Executar producer/consumer, falhas, replay e dedupe em Redpanda versionado.
- **Validações:** FVAL-R3B-0024, FVAL-R3B-0027
### FFND-R3B-0012 — Helm, Kubernetes e NetworkPolicy sem prova em cluster

- **Fontes:** FND-R1-012, PFND-0011
- **Severidade / prioridade:** `HIGH` / `P1`
- **Reconciliação:** `BLOCKED_EXTERNAL_CONFIRMED`
- **Desfecho:** `BLOCKED_EXTERNAL`
- **Condição atual:** Validação Helm estática passa; kubectl/cluster não estão disponíveis.
- **Risco residual:** Seletores, policies, probes e tráfego real podem divergir da análise estática.
- **Ação exigida:** Renderizar com Helm oficial/kubeconform e executar testes de tráfego permitido/negado no cluster.
- **Validações:** FVAL-R3B-0026, FVAL-R3B-0027
### FFND-R3B-0013 — Statecharts sem execução no runtime oficial XState

- **Fontes:** FND-R1-013, PFND-0010
- **Severidade / prioridade:** `HIGH` / `P1`
- **Reconciliação:** `BLOCKED_EXTERNAL_CONFIRMED`
- **Desfecho:** `BLOCKED_EXTERNAL`
- **Condição atual:** Registro estático cobre cinco máquinas, mas o lockfile verificado do runtime XState está ausente.
- **Risco residual:** Semântica real de guards, snapshots e migrações não foi confirmada pelo runtime oficial.
- **Ação exigida:** Resolver lockfile confiável e executar testes oficiais de máquinas e migração de snapshots.
- **Validações:** FVAL-R3B-0025, FVAL-R3B-0019
### FFND-R3B-0014 — Cobertura BDD executada permanece parcial

- **Fontes:** FND-R1-014
- **Severidade / prioridade:** `HIGH` / `P1`
- **Reconciliação:** `PARTIALLY_RESOLVED`
- **Desfecho:** `PARTIAL`
- **Condição atual:** O registro possui 38 comportamentos únicos; a camada BDD unitária reproduzida tem 16 testes, mas cenários dependentes de infraestrutura continuam sem execução integral.
- **Risco residual:** Requisitos de integração e E2E permanecem sem evidência de ambiente.
- **Ação exigida:** Vincular e executar os cenários restantes nos ambientes PostgreSQL, broker e cluster.
- **Validações:** FVAL-R3B-0010, FVAL-R3B-0018, FVAL-R3B-0023, FVAL-R3B-0024, FVAL-R3B-0026
### FFND-R3B-0015 — Claim de integração local sem evidência

- **Fontes:** FND-R1-015
- **Severidade / prioridade:** `MEDIUM` / `P2`
- **Reconciliação:** `RESOLVED_CONFIRMED`
- **Desfecho:** `CLOSED`
- **Condição atual:** A condição original não foi reproduzida no material atualizado e os gates associados passam.
- **Risco residual:** Nenhum risco residual além do limite do método de validação utilizado.
- **Ação exigida:** Manter testes e validadores como gates obrigatórios.
- **Validações:** FVAL-R3B-0017, FVAL-R3B-0016
### FFND-R3B-0016 — Aplicação da política de ciclo de vida

- **Fontes:** FND-R1-016
- **Severidade / prioridade:** `MEDIUM` / `P2`
- **Reconciliação:** `RESOLVED_CONFIRMED`
- **Desfecho:** `CLOSED`
- **Condição atual:** A condição original não foi reproduzida no material atualizado e os gates associados passam.
- **Risco residual:** Nenhum risco residual além do limite do método de validação utilizado.
- **Ação exigida:** Manter testes e validadores como gates obrigatórios.
- **Validações:** FVAL-R3B-0005, FVAL-R3B-0006
### FFND-R3B-0017 — Compatibilidade de eventos aninhada

- **Fontes:** FND-R1-017
- **Severidade / prioridade:** `HIGH` / `P2`
- **Reconciliação:** `RESOLVED_CONFIRMED`
- **Desfecho:** `CLOSED`
- **Condição atual:** A condição original não foi reproduzida no material atualizado e os gates associados passam.
- **Risco residual:** Nenhum risco residual além do limite do método de validação utilizado.
- **Ação exigida:** Manter testes e validadores como gates obrigatórios.
- **Validações:** FVAL-R3B-0015
### FFND-R3B-0018 — Força de evidência nas métricas SCI

- **Fontes:** FND-R1-018
- **Severidade / prioridade:** `MEDIUM` / `P2`
- **Reconciliação:** `RESOLVED_CONFIRMED`
- **Desfecho:** `CLOSED`
- **Condição atual:** A condição original não foi reproduzida no material atualizado e os gates associados passam.
- **Risco residual:** Nenhum risco residual além do limite do método de validação utilizado.
- **Ação exigida:** Manter testes e validadores como gates obrigatórios.
- **Validações:** FVAL-R3B-0017
### FFND-R3B-0019 — Defaults de desenvolvimento inseguros

- **Fontes:** FND-R1-019
- **Severidade / prioridade:** `MEDIUM` / `P2`
- **Reconciliação:** `RESOLVED_CONFIRMED`
- **Desfecho:** `CLOSED`
- **Condição atual:** A condição original não foi reproduzida no material atualizado e os gates associados passam.
- **Risco residual:** Nenhum risco residual além do limite do método de validação utilizado.
- **Ação exigida:** Manter testes e validadores como gates obrigatórios.
- **Validações:** FVAL-R3B-0007, FVAL-R3B-0008
### FFND-R3B-0020 — Campanha de 100 controles com falso PASS

- **Fontes:** FND-R1-020
- **Severidade / prioridade:** `MEDIUM` / `P2`
- **Reconciliação:** `RESOLVED_CONFIRMED`
- **Desfecho:** `CLOSED`
- **Condição atual:** A condição original não foi reproduzida no material atualizado e os gates associados passam.
- **Risco residual:** Nenhum risco residual além do limite do método de validação utilizado.
- **Ação exigida:** Manter testes e validadores como gates obrigatórios.
- **Validações:** FVAL-R3B-0017
### FFND-R3B-0021 — operation_scope na idempotência em memória

- **Fontes:** FND-R1-021
- **Severidade / prioridade:** `HIGH` / `P2`
- **Reconciliação:** `RESOLVED_CONFIRMED`
- **Desfecho:** `CLOSED`
- **Condição atual:** A condição original não foi reproduzida no material atualizado e os gates associados passam.
- **Risco residual:** Nenhum risco residual além do limite do método de validação utilizado.
- **Ação exigida:** Manter testes e validadores como gates obrigatórios.
- **Validações:** FVAL-R3B-0008
### FFND-R3B-0022 — Limite de body e sanitização de exceções HTTP

- **Fontes:** FND-R1-022
- **Severidade / prioridade:** `MEDIUM` / `P2`
- **Reconciliação:** `RESOLVED_CONFIRMED`
- **Desfecho:** `CLOSED`
- **Condição atual:** A condição original não foi reproduzida no material atualizado e os gates associados passam.
- **Risco residual:** Nenhum risco residual além do limite do método de validação utilizado.
- **Ação exigida:** Manter testes e validadores como gates obrigatórios.
- **Validações:** FVAL-R3B-0008
### FFND-R3B-0023 — Colisão de $id entre baseline e schemas atuais

- **Fontes:** FND-R1-023
- **Severidade / prioridade:** `MEDIUM` / `P2`
- **Reconciliação:** `RESOLVED_CONFIRMED`
- **Desfecho:** `CLOSED`
- **Condição atual:** A condição original não foi reproduzida no material atualizado e os gates associados passam.
- **Risco residual:** Nenhum risco residual além do limite do método de validação utilizado.
- **Ação exigida:** Manter testes e validadores como gates obrigatórios.
- **Validações:** FVAL-R3B-0015
### FFND-R3B-0024 — Incompletude do pacote cego R3A

- **Fontes:** PFND-0001
- **Severidade / prioridade:** `HIGH` / `P2`
- **Reconciliação:** `SUPERSEDED_CONFIRMED`
- **Desfecho:** `SUPERSEDED`
- **Condição atual:** O achado é válido para o material sanitizado R3A, mas não para o material atualizado integral usado pela R3B, que contém os artefatos requeridos.
- **Risco residual:** Nenhum risco do produto; permanece como limitação histórica do desenho da auditoria cega.
- **Ação exigida:** Preservar o handoff PARTIAL e, em futuras R3A, transportar versões semanticamente sanitizadas dos manifests e matrizes atuais.
- **Validações:** FVAL-R3B-0003, FVAL-R3B-0005, FVAL-R3B-0006
### FFND-R3B-0025 — Orquestrador validate_all omite gates críticos e não representa o estado final

- **Fontes:** PFND-0005
- **Severidade / prioridade:** `HIGH` / `P0`
- **Reconciliação:** `NEW_FINDING`
- **Desfecho:** `OPEN`
- **Condição atual:** validate_all retorna sucesso parcial e não chama PostgreSQL, Redpanda, XState, Kubernetes, remediation register, release manifest nem SHA manifest.
- **Risco residual:** Um pipeline pode aceitar o pacote apesar de falha local registrada ou ausência de integração crítica.
- **Ação exigida:** Transformar validate_round2/final validator em gate canônico único, incluir todos os controles e retornar código não zero quando houver FAIL local.
- **Validações:** FVAL-R3B-0022, FVAL-R3B-0021, FVAL-R3B-0023, FVAL-R3B-0024, FVAL-R3B-0025, FVAL-R3B-0026
### FFND-R3B-0026 — Estado do AdminHandler é global entre instâncias

- **Fontes:** PFND-0012
- **Severidade / prioridade:** `MEDIUM` / `P1`
- **Reconciliação:** `NEW_FINDING`
- **Desfecho:** `OPEN`
- **Condição atual:** Store, publisher, secret e body limit são atributos de classe; a segunda chamada serve sobrescreve o estado usado pela primeira instância.
- **Risco residual:** Interferência entre servidores/testes e possível uso de tenant store ou segredo incorreto em implantação multi-instância no mesmo processo.
- **Ação exigida:** Criar handler factory/subclasse por servidor ou injetar dependências na instância/request handler.
- **Validações:** FVAL-R3B-0032
### FFND-R3B-0027 — Tópico do REST Proxy é interpolado sem validação ou encoding

- **Fontes:** PFND-0013
- **Severidade / prioridade:** `MEDIUM` / `P1`
- **Reconciliação:** `NEW_FINDING`
- **Desfecho:** `OPEN`
- **Condição atual:** O tópico é concatenado diretamente à URL. Prova direcionada construiu /topics/../admin?x=1.
- **Risco residual:** Alteração de rota/query no REST Proxy se o tópico armazenado não for confiável; incompatibilidade com nomes fora do conjunto esperado.
- **Ação exigida:** Aplicar allowlist de tópico e percent-encoding de segmento; rejeitar slash, dot segments, query e fragment.
- **Validações:** FVAL-R3B-0033
### FFND-R3B-0028 — Registro de remediação aponta para artefato SDK removido

- **Fontes:** Novo na R3B
- **Severidade / prioridade:** `MEDIUM` / `P0`
- **Reconciliação:** `NEW_FINDING`
- **Desfecho:** `OPEN`
- **Condição atual:** Duas entradas ainda referenciam 06-sdk/generated/openapi-operations.json, removido e substituído por openapi-operation-inventory.json.
- **Risco residual:** O gate de remediação falha e a rastreabilidade documental não corresponde ao pacote.
- **Ação exigida:** Atualizar as duas referências, revisar evidências históricas e tornar validate_remediation_register obrigatório no orquestrador canônico.
- **Validações:** FVAL-R3B-0021

## 4. Limitações

- Nenhum PostgreSQL, Redpanda ou cluster Kubernetes foi fornecido.
- Dependências oficiais não puderam ser resolvidas de registries confiáveis.
- PASS local não foi promovido a prova operacional.
- Os testes podem gerar caches e artefatos; verificações de integridade foram executadas em extração fresca antes dos testes.

## 5. Conclusão

A reconciliação está congelada e rastreável, mas o fechamento do processo é bloqueado pelos itens OPEN/PARTIAL/BLOCKED_EXTERNAL.
