# Inventário de execução — Provider WhatsApp Web não oficial

**Documento:** plano executável do subprojeto de mensageria não oficial  
**Projeto pai:** Etapa 22 — WhatsApp e atendimento omnichannel  
**Branch de planejamento:** `feature/etapa-22-whatsapp-omnichannel`  
**Branch de execução:** `feature/etapa-22-provider-whatsapp-web-baileys`  
**Status:** W-02 concluída; engine Baileys e runtime ainda não iniciados  
**Provider inicial planejado:** Baileys 7.x, encapsulado por adapter próprio  
**Última atualização:** 03 de agosto de 2026  
**Documento complementar:** [`SPEC.md`](./SPEC.md)

---

## 1. Objetivo deste inventário

Este documento transforma a análise dos projetos open source em um plano de execução verificável para construir, dentro do ecossistema Innov, um provider de mensagens baseado no WhatsApp Web Multi-Device por API não oficial.

O objetivo não é copiar ou incorporar integralmente qualquer produto analisado. O objetivo é reaproveitar técnicas, invariantes, abstrações, padrões de persistência, estratégias de retry, contratos de eventos, mecanismos de handoff e boas práticas operacionais para desenvolver uma implementação própria.

O provider não oficial será uma extensão do domínio já criado na Etapa 22. Ele não poderá criar um segundo CRM, uma segunda caixa de entrada, uma segunda base de contatos ou uma segunda fonte de mensagens padrão.

```text
Baileys / outro engine
        ↓
adapter anticorrupção do Innov
        ↓
modelo canônico de canal e mensagem
        ↓
domínio existente de conversas, CRM, obras, contratos, SAC e documentos
```

---

## 2. Relação com os PRs

O PR #39 permanece responsável pela base da Etapa 22:

- rota `/app/whatsapp`;
- inbox e histórico;
- contas, contatos e conversas;
- vínculos com Cliente 360, CRM, obra, contrato, oportunidade e SAC;
- mensagens e eventos de status;
- fontes canônicas e `whatsapp_content_bindings`;
- RLS, auditoria e proteção do histórico;
- provider oficial Meta Cloud API.

O PR #40 executa a arquitetura multiprovider de forma incremental, tendo a branch do PR #39 como base. Nesta fase contém apenas contratos canônicos, compatibilidade Meta, testes e gates arquiteturais.

Nenhum dos dois PRs autoriza silenciosamente um runtime Baileys, número real ou produção.

---

## 3. Regras obrigatórias de execução

### R1 — Uma sprint ativa

No máximo uma sprint poderá estar em estado `em andamento`.

### R2 — Check exige evidência

Uma tarefa só recebe `[x]` quando houver evidência objetiva: arquivo/commit, migration aplicada, teste verde, log, métrica, relatório ou decisão registrada. “Código escrito” isoladamente não prova funcionamento.

### R3 — Nenhum segredo no repositório

São proibidos QR Codes persistidos, `creds.json`, chaves Signal, tokens, cookies, números reais, payloads de produção ou chaves de providers.

### R4 — Reutilizar técnica, não importar produto sem decisão

Adaptação substancial exige origem, commit, licença, vantagem material, `THIRD_PARTY_NOTICES.md`, testes, segurança e aprovação no PR.

### R5 — O domínio não conhece Baileys

`WAMessage`, `BinaryNode`, `WAMessageKey`, `proto.Message` e JIDs específicos permanecem no adapter.

### R6 — Um escritor por sessão

Escala horizontal exige lease, fencing token e reatribuição controlada.

### R7 — Inbound antes de automação

Nenhum evento aciona workflow ou IA antes de validação, normalização, deduplicação, persistência, tenancy e classificação de segurança.

### R8 — Determinístico antes de IA

```text
política → consentimento → workflow → regra de negócio
→ recuperação de fatos → IA → aprovação/handoff
```

### R9 — Sem automação de abuso

Não implementar evasão, spoofing, spam, cold blast, criação/rotação de contas ou manipulação de fingerprint.

### R10 — Kill switch obrigatório

Deve interromper sessão, organização, provider, automações, IA, mídia e workers.

### R11 — Falha segura

Na dúvida: não enviar, não repetir indefinidamente, preservar evidência e encaminhar para humano.

### R12 — Nada é promovido por “funcionou uma vez”

Homologação exige repetição de reconexão, concorrência, mídia, identidade, retry, upgrade e restauração.

---

## 4. Estados das sprints

| Estado | Significado |
|---|---|
| `pendente` | ainda não iniciada |
| `em andamento` | sprint atualmente em execução |
| `concluída` | todas as tarefas concluídas com evidência |
| `bloqueada` | impedimento registrado e verificável |
| `cancelada` | removida por decisão arquitetural documentada |

---

## 5. Baseline já existente

- [x] B-01 — Aplicativo `/app/whatsapp` registrado no launcher
- [x] B-02 — Caixa de entrada e histórico iniciais
- [x] B-03 — Contas, contatos e conversas
- [x] B-04 — Mensagens e eventos monotônicos de status
- [x] B-05 — Vínculos com cliente, obra, contrato, oportunidade e SAC
- [x] B-06 — `whatsapp_content_bindings` apontando para fontes canônicas
- [x] B-07 — Resolução de propostas, contratos, aditivos e documentos versionados
- [x] B-08 — Snapshot e SHA-256 da fonte usada no envio
- [x] B-09 — RLS, RPCs e proteção contra exclusão do histórico
- [x] B-10 — Provider Meta Cloud API como implementação inicial
- [x] B-11 — Webhook oficial com HMAC e idempotência
- [x] B-12 — Validador `validate:stage22` no CI

**Evidência:** PR #39 e `docs/ETAPA-22-WHATSAPP-OMNICHANNEL.md`.

---

# Marco M-0 — Governança, decisão e fronteiras

## Sprint W-00 — Pesquisa e consolidação arquitetural

**Estado:** concluída  
**Dependências:** nenhuma

- [x] W-00.1 — Analisar `WhiskeySockets/Baileys`
- [x] W-00.2 — Analisar `rmyndharis/OpenWA`
- [x] W-00.3 — Analisar `tulir/whatsmeow`
- [x] W-00.4 — Reanalisar `ArnasDon/wacrm`
- [x] W-00.5 — Reanalisar `evolution-foundation/evolution-api`
- [x] W-00.6 — Reanalisar `wwebjs/whatsapp-web.js`
- [x] W-00.7 — Reanalisar `sebferreira/WhatsControl`
- [x] W-00.8 — Analisar `wangrongding/wechat-bot`
- [x] W-00.9 — Analisar `lyfe00011/whatsapp-bot`
- [x] W-00.10 — Analisar `mruniquehacker/Knightbot-MD`
- [x] W-00.11 — Analisar `sigalor/whatsapp-web-reveng`
- [x] W-00.12 — Classificar por biblioteca, driver, gateway, CRM, bot e pesquisa
- [x] W-00.13 — Definir Baileys como primeiro engine não oficial estudado
- [x] W-00.14 — Definir técnicas reaproveitáveis sem copiar produtos completos
- [x] W-00.15 — Criar inventário e SPEC

**Evidência:** análise open source, este arquivo e `SPEC.md`.

## Sprint W-01 — ADR, licença e modelo de risco

**Estado:** concluída  
**Dependências:** W-00

- [x] W-01.1 — Criar ADR para adoção do provider não oficial como extensão opcional
- [x] W-01.2 — Registrar que provider oficial e não oficial compartilham domínio, mas não runtime
- [x] W-01.3 — Criar matriz de licença por projeto, arquivo e técnica potencialmente adaptável
- [x] W-01.4 — Criar `THIRD_PARTY_NOTICES.md` antes de qualquer adaptação substancial
- [x] W-01.5 — Definir critérios de número autorizado para homologação
- [x] W-01.6 — Definir termo interno de aceite de risco operacional
- [x] W-01.7 — Definir política de consentimento, opt-out e bloqueio
- [x] W-01.8 — Definir casos proibidos: spam, prospecção indiscriminada, fraude e evasão
- [x] W-01.9 — Definir processo de desligamento e remoção de sessão
- [x] W-01.10 — Registrar critérios que cancelariam o projeto antes da implantação

**Evidências:** ADR-001, matriz de licenças, política de risco, `THIRD_PARTY_NOTICES.md` e `EVIDENCIAS-W01.md`.

**Gate W-G01:** concluído somente em seu escopo documental. Nenhuma sessão real ou produção foi autorizada.

---

# Marco M-1 — Domínio canônico e arquitetura multiprovider

## Sprint W-02 — Modelo canônico de canal, identidade e mensagem

**Estado:** concluída  
**Dependências:** W-01

- [x] W-02.1 — Definir `ChannelProviderType`
  - [x] W-02.1.1 — `META_CLOUD`
  - [x] W-02.1.2 — `WHATSAPP_WEB_BAILEYS`
  - [x] W-02.1.3 — `WEB_CHAT`
  - [x] W-02.1.4 — providers futuros sem implementação
- [x] W-02.2 — Definir `CanonicalIdentity`
- [x] W-02.3 — Definir namespaces `PHONE`, `WHATSAPP_PN`, `WHATSAPP_LID`, `GROUP`, `NEWSLETTER` e `WEB_USER`
- [x] W-02.4 — Definir `CanonicalMessage`
- [x] W-02.5 — Definir `CanonicalMedia`
- [x] W-02.6 — Definir `CanonicalReceipt`
- [x] W-02.7 — Definir `CanonicalConversation`
- [x] W-02.8 — Definir `ProviderMetadata` separado do domínio
- [x] W-02.9 — Definir versionamento dos contratos
- [x] W-02.10 — Criar testes que proíbam imports de Baileys fora do adapter
- [x] W-02.11 — Mapear objetos atuais da Etapa 22 para o modelo neutro
- [x] W-02.12 — Garantir compatibilidade retroativa com Meta

**Evidências:**

- `lib/messaging/domain.ts`;
- `lib/messaging/whatsapp-compatibility.ts`;
- `tests/messaging-domain.test.ts`;
- `tests/messaging-boundary.test.ts`;
- `scripts/validate-messaging-boundaries.mjs`;
- `CONTRATOS-CANONICOS-V1.md`;
- `EVIDENCIAS-W02.md`;
- PR #40;
- CI run `30864989008` verde;
- File Security E2E run `30864988991` verde.

**Decisão adicional:** `channelAccountId` identifica a conta interna do Innov; `providerAccountId` identifica a conta externa do provider. A distinção é obrigatória.

**Gate W-G02:** concluído. O scanner e os testes bloqueiam imports ou tipos nativos Baileys fora dos adapters autorizados. Baileys continua não instalado.

## Sprint W-03 — Contrato de engine e matriz de capacidades

**Estado:** pendente  
**Dependências:** W-02

- [ ] W-03.1 — Criar interface `MessagingEngine`
- [ ] W-03.2 — Criar interface `SessionEngine`
- [ ] W-03.3 — Criar interface `EngineEventSource`
- [ ] W-03.4 — Criar `EngineCapabilityMatrix`
- [ ] W-03.5 — Definir capacidades de texto, mídia, reação, resposta, grupo, presença, histórico e edição
- [ ] W-03.6 — Definir `UnsupportedCapabilityError`
- [ ] W-03.7 — Encapsular provider Meta no mesmo contrato sem regressão
- [ ] W-03.8 — Criar `MockMessagingEngine`
- [ ] W-03.9 — Criar contract tests para todos os engines
- [ ] W-03.10 — Criar feature flags por provider e organização
- [ ] W-03.11 — Ocultar ações não suportadas na interface

## Sprint W-04 — Evolução do banco sem domínio paralelo

**Estado:** pendente  
**Dependências:** W-02 e W-03

- [ ] W-04.1 — Inventariar tabelas `whatsapp_*`
- [ ] W-04.2 — Decidir evolução compatível ou futura nomenclatura `channel_*`
- [ ] W-04.3 — Adicionar `provider_type` e `provider_account_id` onde necessário
- [ ] W-04.4 — Criar identidades externas sem duplicar Cliente 360
- [ ] W-04.5 — Criar aliases e mapeamentos PN/LID
- [ ] W-04.6 — Criar comandos e idempotência
- [ ] W-04.7 — Criar outbox durável
- [ ] W-04.8 — Criar inbox de eventos sanitizados
- [ ] W-04.9 — Criar DLQ
- [ ] W-04.10 — Criar ledger de tentativas
- [ ] W-04.11 — Aplicar RLS e revogar escrita direta
- [ ] W-04.12 — Criar testes negativos multiempresa
- [ ] W-04.13 — Criar rollback lógico sem perda histórica

**Gate W-G04:** nenhum contato, conversa, mensagem ou documento duplicado por provider.

---

# Marco M-2 — Runtime persistente do gateway

## Sprint W-05 — Esqueleto do gateway

**Estado:** pendente  
**Dependências:** W-03 e W-04

- [ ] W-05.1 — Criar `apps/messaging-gateway`
- [ ] W-05.2 — Definir Node.js compatível
- [ ] W-05.3 — Criar configuração tipada e validação de environment
- [ ] W-05.4 — Criar health, readiness e metrics
- [ ] W-05.5 — Criar API interna autenticada
- [ ] W-05.6 — Criar assinatura HMAC de comandos/eventos
- [ ] W-05.7 — Criar proteção contra replay
- [ ] W-05.8 — Criar correlation e causation IDs
- [ ] W-05.9 — Criar shutdown gracioso
- [ ] W-05.10 — Criar container não-root
- [ ] W-05.11 — Criar limites de CPU, memória e arquivo
- [ ] W-05.12 — Isolar rede e banco principal
- [ ] W-05.13 — Criar cliente fake sem WhatsApp

## Sprint W-06 — Adapter Baileys

**Estado:** pendente  
**Dependências:** W-05

- [ ] W-06.1 — Fixar versão exata; proibir `latest`
- [ ] W-06.2 — Criar `BaileysEngineAdapter`
- [ ] W-06.3 — Encapsular criação do socket
- [ ] W-06.4 — Encapsular eventos de conexão
- [ ] W-06.5 — Encapsular texto
- [ ] W-06.6 — Encapsular mídia
- [ ] W-06.7 — Encapsular receipts
- [ ] W-06.8 — Encapsular replies, reactions e quoted messages
- [ ] W-06.9 — Condicionar grupos à capability matrix
- [ ] W-06.10 — Normalizar erros
- [ ] W-06.11 — Mapear PN/LID/grupo/newsletter
- [ ] W-06.12 — Preservar payload técnico sanitizado
- [ ] W-06.13 — Criar contract tests
- [ ] W-06.14 — Falhar se tipo Baileys escapar do adapter

## Sprint W-07 — Armazenamento criptográfico da sessão

**Estado:** pendente  
**Dependências:** W-05 e W-06

- [ ] W-07.1 — Criar `SessionCredentialStore`
- [ ] W-07.2 — Modelar credenciais, keys e versões
- [ ] W-07.3 — Implementar transações
- [ ] W-07.4 — Implementar optimistic concurrency
- [ ] W-07.5 — Implementar envelope encryption
- [ ] W-07.6 — Separar DEK por sessão
- [ ] W-07.7 — Manter chave-mestra fora do banco
- [ ] W-07.8 — Impedir logs de material criptográfico
- [ ] W-07.9 — Criar rotação/recriptografia
- [ ] W-07.10 — Criar backup e restore testados
- [ ] W-07.11 — Criar exclusão criptográfica
- [ ] W-07.12 — Auditar acesso às credenciais
- [ ] W-07.13 — Testar corrupção, versão e concorrência
- [ ] W-07.14 — Proibir `useMultiFileAuthState` fora de testes descartáveis

## Sprint W-08 — Single writer, lease e lifecycle

**Estado:** pendente  
**Dependências:** W-07

- [ ] W-08.1 — Criar `session_runtime_leases`
- [ ] W-08.2 — Implementar lease com expiração
- [ ] W-08.3 — Implementar fencing token crescente
- [ ] W-08.4 — Impedir duas instâncias escritoras
- [ ] W-08.5 — Criar state machine de conexão
- [ ] W-08.6 — Implementar QR/pairing efêmeros
- [ ] W-08.7 — Proibir persistência de QR
- [ ] W-08.8 — Implementar reconnect com backoff/jitter
- [ ] W-08.9 — Classificar logout, restrição, transitório e ação humana
- [ ] W-08.10 — Implementar takeover após lease expirado
- [ ] W-08.11 — Criar kill switch global e por sessão
- [ ] W-08.12 — Testar processo zumbi
- [ ] W-08.13 — Testar reinício durante atualização de credenciais
- [ ] W-08.14 — Testar restauração em nova instância

**Gate W-G08:** nenhuma escala horizontal antes de single writer e fencing passarem.

---

# Marco M-3 — Pipeline de mensagens

## Sprint W-09 — Ingress e normalização

**Estado:** pendente  
**Dependências:** W-06 e W-08

- [ ] W-09.1 — Criar envelope canônico
- [ ] W-09.2 — Persistir antes do dispatch
- [ ] W-09.3 — Criar idempotency key
- [ ] W-09.4 — Normalizar wrappers, efêmeras e view-once conforme política
- [ ] W-09.5 — Normalizar replies/quoted
- [ ] W-09.6 — Normalizar receipts
- [ ] W-09.7 — Normalizar contato/grupo
- [ ] W-09.8 — Resolver organização e conta
- [ ] W-09.9 — Criar estados do ingress
- [ ] W-09.10 — Criar DLQ
- [ ] W-09.11 — Criar replay idempotente
- [ ] W-09.12 — Testar duplicado e fora de ordem
- [ ] W-09.13 — Testar payload desconhecido
- [ ] W-09.14 — Impedir IA antes de `PERSISTED`

## Sprint W-10 — Outbox, comandos e entrega

**Estado:** pendente  
**Dependências:** W-09

- [ ] W-10.1 — Criar comando canônico
- [ ] W-10.2 — Persistir antes do envio
- [ ] W-10.3 — Separar mensagem e tentativa
- [ ] W-10.4 — Criar worker de outbox
- [ ] W-10.5 — Ordenar por conversa
- [ ] W-10.6 — Criar idempotência
- [ ] W-10.7 — Criar ledger de tentativas
- [ ] W-10.8 — Classificar retryable/terminal
- [ ] W-10.9 — Implementar backoff limitado
- [ ] W-10.10 — Implementar circuit breaker
- [ ] W-10.11 — Impedir regressão de status
- [ ] W-10.12 — Reconciliar comando sem confirmação
- [ ] W-10.13 — Criar DLQ outbound
- [ ] W-10.14 — Reprocessar com justificativa
- [ ] W-10.15 — Limitar volume por organização/sessão
- [ ] W-10.16 — Testar crash antes/depois do envio

## Sprint W-11 — Identidades, contatos e deduplicação

**Estado:** pendente  
**Dependências:** W-09

- [ ] W-11.1 — Normalizar JIDs
- [ ] W-11.2 — Persistir PN
- [ ] W-11.3 — Persistir LID
- [ ] W-11.4 — Persistir aliases/confiança
- [ ] W-11.5 — Reconciliar LID/telefone sem duplicação
- [ ] W-11.6 — Separar identidade observada de vínculo confirmado
- [ ] W-11.7 — Merge transacional de duplicados
- [ ] W-11.8 — Preservar histórico/aliases
- [ ] W-11.9 — Criar cache com invalidação
- [ ] W-11.10 — Testar mudança de identidade
- [ ] W-11.11 — Testar conflito entre organizações

## Sprint W-12 — Mídia segura

**Estado:** pendente  
**Dependências:** W-09 e W-10

- [ ] W-12.1 — Criar `MediaReference`
- [ ] W-12.2 — Fazer streaming; evitar base64 persistente
- [ ] W-12.3 — Limitar tipo/tamanho
- [ ] W-12.4 — Criar quarentena privada
- [ ] W-12.5 — Criar antivírus/classificação
- [ ] W-12.6 — Validar MIME real
- [ ] W-12.7 — Hash/deduplicação
- [ ] W-12.8 — Thumbnail isolada
- [ ] W-12.9 — Transcrição sob política
- [ ] W-12.10 — OCR sob política
- [ ] W-12.11 — Remover metadados sensíveis quando aplicável
- [ ] W-12.12 — URL assinada
- [ ] W-12.13 — Retry sem duplicar
- [ ] W-12.14 — Testar malware, truncado, enorme e MIME falso

---

# Marco M-4 — Produto, mensagens padrão e IA

## Sprint W-13 — Inbox multiprovider e atendimento

**Estado:** pendente  
**Dependências:** W-09, W-10 e W-11

- [ ] W-13.1 — Exibir provider/estado sem poluir UX
- [ ] W-13.2 — Unificar conversas do mesmo contato
- [ ] W-13.3 — Preservar origem da mensagem
- [ ] W-13.4 — Filtrar por conta, fila, responsável, obra e estado
- [ ] W-13.5 — Atribuição/transferência
- [ ] W-13.6 — Notas internas
- [ ] W-13.7 — Indicadores humano/automação/IA
- [ ] W-13.8 — Presença de operador distinta da presença WhatsApp
- [ ] W-13.9 — Realtime pelo backend Innov
- [ ] W-13.10 — Estados offline/reconnecting/degraded/action required
- [ ] W-13.11 — Desabilitar ações incompatíveis
- [ ] W-13.12 — Validar responsividade
- [ ] W-13.13 — Testar agentes concorrentes

## Sprint W-14 — Playbooks e fontes canônicas

**Estado:** pendente  
**Dependências:** W-13

- [ ] W-14.1 — Reaproveitar `whatsapp_content_bindings`
- [ ] W-14.2 — Não duplicar mensagens padrão
- [ ] W-14.3 — Criar `communication_playbooks` e versões
- [ ] W-14.4 — Vincular fontes canônicas
- [ ] W-14.5 — Definir schema de variáveis
- [ ] W-14.6 — Validar variáveis
- [ ] W-14.7 — Registrar snapshot/versão/SHA
- [ ] W-14.8 — Classificar autonomia
- [ ] W-14.9 — Bloquear reescrita contratual livre
- [ ] W-14.10 — Aprovação humana para conteúdo sensível
- [ ] W-14.11 — Testar reprodução histórica
- [ ] W-14.12 — Testar atualização sem alterar histórico

## Sprint W-15 — Ponte de IA

**Estado:** pendente  
**Dependências:** W-09, W-13 e W-14

- [ ] W-15.1 — Criar `AiProvider`
- [ ] W-15.2 — Criar `AiOrchestrator` independente do canal
- [ ] W-15.3 — Criar `ContextBuilder` com minimização
- [ ] W-15.4 — Busca lexical
- [ ] W-15.5 — Busca vetorial opcional
- [ ] W-15.6 — Retrieval híbrido/fallback
- [ ] W-15.7 — Filtros de tenancy, obra, versão e validade
- [ ] W-15.8 — Precedência de workflow
- [ ] W-15.9 — Limite atômico por conversa
- [ ] W-15.10 — Limite por organização/custo
- [ ] W-15.11 — Estados persistentes de handoff
- [ ] W-15.12 — Desativar IA quando humano assumir
- [ ] W-15.13 — Resumo de handoff
- [ ] W-15.14 — Citações internas de fontes
- [ ] W-15.15 — Validar números, datas, valores e compromissos
- [ ] W-15.16 — Proteger contra prompt injection em documentos
- [ ] W-15.17 — Auditar modelo, fontes, ferramentas e custo
- [ ] W-15.18 — Iniciar em `draft_only`

## Sprint W-16 — Plugins e automações governadas

**Estado:** pendente  
**Dependências:** W-14 e W-15

- [ ] W-16.1 — Criar `MessagePlugin`
- [ ] W-16.2 — Prioridade/short-circuit
- [ ] W-16.3 — Plugin de consentimento
- [ ] W-16.4 — Plugin anti-spam
- [ ] W-16.5 — Plugin de qualificação
- [ ] W-16.6 — Plugin de status de obra
- [ ] W-16.7 — Plugin de documento
- [ ] W-16.8 — Plugin de SAC
- [ ] W-16.9 — Plugin de handoff
- [ ] W-16.10 — IA como último recurso
- [ ] W-16.11 — Permissões/flags
- [ ] W-16.12 — Testar ordem/conflito

---

# Marco M-5 — Segurança, observabilidade e qualidade

## Sprint W-17 — Segurança e threat model

**Estado:** pendente  
**Dependências:** W-08, W-10, W-12 e W-15

- [ ] W-17.1 — Criar STRIDE
- [ ] W-17.2 — Mapear ativos
- [ ] W-17.3 — Mapear trust boundaries
- [ ] W-17.4 — Controle de replay
- [ ] W-17.5 — Controle de command injection
- [ ] W-17.6 — Controle de prompt injection
- [ ] W-17.7 — Allowlist de ferramentas
- [ ] W-17.8 — Aprovação para escritas críticas
- [ ] W-17.9 — Redaction de logs
- [ ] W-17.10 — Retenção/expurgo
- [ ] W-17.11 — Auditoria de leitura sensível
- [ ] W-17.12 — Teste cross-tenant
- [ ] W-17.13 — Resposta a comprometimento de sessão
- [ ] W-17.14 — Scanner de segredo
- [ ] W-17.15 — SBOM e dependências

## Sprint W-18 — Observabilidade e operação

**Estado:** pendente  
**Dependências:** W-10 e W-17

- [ ] W-18.1 — Métricas de sessão
- [ ] W-18.2 — Métricas ingress/egress
- [ ] W-18.3 — Métricas retry/DLQ
- [ ] W-18.4 — Métricas de mídia
- [ ] W-18.5 — Métricas de IA/custo
- [ ] W-18.6 — Logs estruturados
- [ ] W-18.7 — Traces
- [ ] W-18.8 — Dashboard
- [ ] W-18.9 — Alerta reconnect loop
- [ ] W-18.10 — Alerta DLQ
- [ ] W-18.11 — Alerta perda de lease
- [ ] W-18.12 — Alerta de persistência de keys
- [ ] W-18.13 — Runbook desconexão
- [ ] W-18.14 — Runbook upgrade Baileys
- [ ] W-18.15 — Runbook rollback

## Sprint W-19 — Testes funcionais, chaos e performance

**Estado:** pendente  
**Dependências:** W-17 e W-18

- [ ] W-19.1 — Unit tests canônicos
- [ ] W-19.2 — Contract tests
- [ ] W-19.3 — Integration tests PostgreSQL
- [ ] W-19.4 — E2E com número de homologação
- [ ] W-19.5 — QR/pairing
- [ ] W-19.6 — Restart durante mensagem
- [ ] W-19.7 — Restart durante key update
- [ ] W-19.8 — Perda de rede
- [ ] W-19.9 — Evento duplicado
- [ ] W-19.10 — Receipt fora de ordem
- [ ] W-19.11 — Mídia corrompida
- [ ] W-19.12 — Banco indisponível
- [ ] W-19.13 — Processo zumbi
- [ ] W-19.14 — Réplicas disputando sessão
- [ ] W-19.15 — Upgrade/downgrade
- [ ] W-19.16 — Restore em infraestrutura nova
- [ ] W-19.17 — Benchmark memória/sessão
- [ ] W-19.18 — Benchmark throughput
- [ ] W-19.19 — Benchmark latência
- [ ] W-19.20 — Registrar limites medidos

**Gate W-G19:** nenhum número real de operação antes dos testes P0 repetidos.

---

# Marco M-6 — Homologação e promoção controlada

## Sprint W-20 — Homologação interna

**Estado:** pendente  
**Dependências:** W-19

- [ ] W-20.1 — Número dedicado/autorizado
- [ ] W-20.2 — Organização de homologação
- [ ] W-20.3 — Usuários autorizados
- [ ] W-20.4 — Campanhas desabilitadas
- [ ] W-20.5 — Auto-reply IA desabilitado
- [ ] W-20.6 — Somente texto/mídia aprovada
- [ ] W-20.7 — Roteiro diário de conexão/envio/recebimento/restart
- [ ] W-20.8 — Validar métricas/alertas
- [ ] W-20.9 — Validar expurgo/exclusão de sessão
- [ ] W-20.10 — Validar handoff/multiagente
- [ ] W-20.11 — Incidentes/vacinas
- [ ] W-20.12 — Relatório de homologação

## Sprint W-21 — Piloto restrito

**Estado:** pendente  
**Dependências:** W-20

- [ ] W-21.1 — Definir escopo/usuários
- [ ] W-21.2 — Definir SLOs/abort criteria
- [ ] W-21.3 — Rollout por feature flag
- [ ] W-21.4 — Rollback de um clique
- [ ] W-21.5 — Monitorar falhas/reconnects/bloqueios/duplicações
- [ ] W-21.6 — Comparar com provider oficial
- [ ] W-21.7 — Medir custo operacional
- [ ] W-21.8 — Validar suporte/runbooks
- [ ] W-21.9 — Revisar riscos jurídicos, contratuais e de privacidade
- [ ] W-21.10 — Decidir promover, restringir ou encerrar

## Sprint W-22 — Encerramento da etapa

**Estado:** pendente  
**Dependências:** W-21

- [ ] W-22.1 — Atualizar `diretrizes/SPEC.md`
- [ ] W-22.2 — Atualizar `diretrizes/INVENTARIO.md`
- [ ] W-22.3 — Atualizar `diretrizes/MODULOS.md`
- [ ] W-22.4 — Atualizar `diretrizes/ARQUITETURA.md`
- [ ] W-22.5 — Atualizar `diretrizes/ROADMAP.md`
- [ ] W-22.6 — Atualizar `diretrizes/RECUPERACAO.md`
- [ ] W-22.7 — Atualizar `diretrizes/VACINAS.md`
- [ ] W-22.8 — Atualizar `diretrizes/ESTADO-ATUAL.json`
- [ ] W-22.9 — Registrar dependências/licenças
- [ ] W-22.10 — Garantir CI/E2E verdes
- [ ] W-22.11 — Registrar decisão final de produção
- [ ] W-22.12 — Encerrar PR após revisão técnica/segurança

---

## 6. Mapa de reaproveitamento

| Projeto | Reaproveitar | Forma no Innov | Não reaproveitar |
|---|---|---|---|
| Baileys | sockets, eventos, auth state, mutexes, retries, PN/LID, mídia | adapter/runtime persistente | storage por arquivos em produção; tipos no domínio |
| OpenWA | engine interface, modelo neutro, capabilities, HMAC/health/audit | contratos internos | gateway/banco paralelo inteiro |
| whatsmeow | SQL session store, migrations, LID map | modelagem transacional TS/PostgreSQL | introduzir Go sem justificativa |
| wacrm | RAG, workflow primeiro, handoff, limites | AI Orchestrator | CRM/contas/visual paralelo |
| Evolution | adapters/eventos/filas/storage | portas substituíveis | instalar todos os brokers antecipadamente |
| whatsapp-web.js | comportamento do Web | oracle/laboratório | engine principal ou Chromium no app |
| wechat-bot | separação canal/IA | `ChannelProvider`/`AiProvider` | segurança simplificada |
| WhatsControl | inbox/multiagente/handoff | UX | código sem licença clara |
| Knightbot/userbots | registry/plugins | contrato governado | plugins inseguros/downloads |
| reveng | história do protocolo | referência | implementação atual |

---

## 7. Artefatos planejados

```text
apps/messaging-gateway/
├── src/config/
├── src/api/
├── src/engines/{contracts,baileys,mock}/
├── src/sessions/
├── src/identity/
├── src/ingress/
├── src/outbox/
├── src/media/
├── src/events/
├── src/security/
├── src/observability/
└── tests/

lib/messaging/
├── domain.ts                  # criado na W-02
├── whatsapp-compatibility.ts  # criado na W-02
├── contracts.ts
├── capabilities.ts
├── events.ts
├── commands.ts
├── identity.ts
├── playbooks.ts
└── ai/

supabase/migrations/
├── *_channel_provider_abstraction.sql
├── *_channel_session_store.sql
├── *_channel_identity_mapping.sql
├── *_channel_outbox_and_dlq.sql
└── *_communication_playbooks_ai.sql
```

---

## 8. Critérios globais de conclusão

- [x] Contratos provider-neutral implementados
- [x] Provider Meta preservado sem regressão
- [ ] Adapter Baileys confinado
- [ ] Runtime separado do Next.js
- [ ] Session store criptografado/transacional
- [ ] Single writer/fencing comprovados
- [ ] Ingress durável/idempotente
- [ ] Outbox/retry ledger comprovados
- [ ] PN/LID sem duplicação
- [ ] Mídia com quarentena/antivírus específica do canal
- [ ] Inbox multiprovider homologada
- [x] Fontes canônicas preservadas na projeção
- [ ] IA independente e inicialmente em rascunho
- [ ] Handoff persistente
- [ ] Threat model aprovado
- [ ] Logs sem segredos
- [ ] Métricas, alertas e runbooks
- [ ] Restart, concorrência e restore verdes
- [ ] Piloto restrito concluído
- [ ] Decisão explícita de promover/restringir/encerrar
- [ ] Documentação canônica final atualizada
- [ ] CI/E2E finais verdes

---

## 9. Registro de reordenação

| Data | Alteração | Justificativa | Aprovado por |
|---|---|---|---|
| — | Nenhuma | Ordem inicial mantida | — |

---

## 10. Registro de bloqueios e dependências externas

| Sprint/controle | Estado | Evidência | Próxima ação |
|---|---|---|---|
| Aceite operacional | não executado | política define o modelo | somente antes de número real |
| Revisão jurídica | dependência externa | ADR declara ausência | executar antes de piloto/produção |
| Número autorizado | não executado | nenhum número registrado | somente W-20 |
| Produção | bloqueada | ADR-001 | exige decisão posterior específica |

---

## 11. Próxima ação autorizada

A próxima sprint autorizada é **W-03 — Contrato de engine e matriz de capacidades**.

É permitido criar interfaces provider-neutral, capability matrix, mock engine, feature flags e adapter Meta. Ainda não está autorizado:

- instalar ou conectar Baileys;
- criar sessão real;
- usar número comercial;
- liberar provider;
- habilitar auto-reply;
- promover para produção.
