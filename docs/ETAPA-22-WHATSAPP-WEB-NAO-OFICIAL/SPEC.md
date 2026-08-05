# SPEC — Provider WhatsApp Web não oficial e ponte de IA

**Identificador:** `INNOV-MSG-WWEB-SPEC-001`  
**Versão:** `0.1.0`  
**Status:** proposta técnica aprovada para planejamento; implementação não iniciada  
**Projeto pai:** Etapa 22 — WhatsApp e atendimento omnichannel  
**Provider inicial planejado:** Baileys 7.x  
**Documento de execução:** [`INVENTARIO.md`](./INVENTARIO.md)  
**Data:** 03 de agosto de 2026

---

## 1. Autoridade e finalidade

Esta especificação define como o Innov deverá construir uma camada própria de mensagens por API não oficial baseada no WhatsApp Web Multi-Device, usando técnicas e padrões observados em projetos open source sem transformar a plataforma em fork ou instalação embutida desses projetos.

O documento disciplina:

- fronteiras arquiteturais;
- modelo de domínio;
- provider contract;
- runtime persistente;
- armazenamento de sessão;
- pipeline inbound e outbound;
- identidade PN/LID;
- mídia;
- inbox multiatendente;
- playbooks e fontes canônicas;
- ponte de IA;
- segurança;
- observabilidade;
- testes;
- critérios de homologação.

A implementação deverá continuar pertencendo ao Innov. Bibliotecas externas serão dependências ou referências de engenharia, não o centro do domínio.

---

## 2. Contexto atual

A branch `feature/etapa-22-whatsapp-omnichannel` e o PR #39 já implementam a base do aplicativo de WhatsApp:

- rota `/app/whatsapp`;
- contas, contatos e conversas;
- mensagens e histórico;
- vínculos com Cliente 360, CRM, obras, contratos, oportunidades e SAC;
- fontes canônicas para mensagens padrão;
- snapshots e hashes da versão utilizada;
- provider oficial Meta Cloud API;
- webhook, HMAC, idempotência e estados monotônicos;
- RLS e proteção do histórico.

Esta SPEC não substitui o módulo existente. Ela estende a arquitetura para que diferentes engines possam usar o mesmo domínio e a mesma experiência operacional.

---

## 3. Problema a resolver

O Innov precisa de uma camada de mensageria que:

1. permita utilizar uma sessão WhatsApp Web Multi-Device por engine não oficial;
2. preserve o domínio e os controles já existentes;
3. suporte conexão persistente, QR/pairing, reconexão e estado criptográfico;
4. receba e envie mensagens, mídia, receipts e replies;
5. trate identidade de telefone, LID, grupo e outros namespaces;
6. não acople a aplicação ao Baileys;
7. possibilite incluir IA dentro do site e nos canais sem duplicar lógica;
8. mantenha auditabilidade, idempotência, segurança e handoff humano;
9. permita substituir ou adicionar engines no futuro;
10. falhe de forma segura e reversível.

---

## 4. Objetivos

### 4.1 Objetivos funcionais

- conectar uma ou mais contas autorizadas por QR Code ou pairing code;
- preservar e restaurar sessões;
- receber mensagens de texto e mídia;
- enviar mensagens de texto e mídia;
- registrar status e receipts;
- suportar respostas e mensagens citadas;
- identificar contatos e conversas;
- integrar ao aplicativo `/app/whatsapp`;
- integrar às fontes canônicas existentes;
- integrar a workflows, SAC e Cliente 360;
- disponibilizar copiloto e automações de IA governadas;
- permitir atendimento multiagente e handoff.

### 4.2 Objetivos técnicos

- provider-neutral domain;
- adapter anticorrupção;
- runtime persistente separado;
- session store transacional e criptografado;
- single writer por sessão;
- event backbone durável;
- outbox e retry ledger;
- observabilidade ponta a ponta;
- testes de contrato por engine;
- rollout por feature flag.

### 4.3 Objetivos de governança

- nenhuma credencial no GitHub;
- nenhuma adaptação externa sem licença e atribuição;
- nenhuma mensagem contratual reescrita livremente por IA;
- nenhuma automação antes de persistência e política;
- nenhum provider promovido sem homologação repetível;
- nenhuma alegação de estabilidade sem métrica.

---

## 5. Não objetivos

Esta etapa não tem como objetivo:

- substituir o CRM, SAC, contratos ou documentos do Innov;
- criar um segundo banco de clientes;
- copiar integralmente OpenWA, Evolution, wacrm ou outros sistemas;
- construir mecanismos de evasão ou anti-detecção;
- automatizar spam ou prospecção indiscriminada;
- prometer ausência de bloqueios;
- utilizar `useMultiFileAuthState` como armazenamento de produção;
- executar Baileys dentro de função serverless;
- liberar IA autônoma para compromissos contratuais;
- suportar todos os recursos do WhatsApp Web na primeira versão;
- introduzir Kafka, RabbitMQ, Redis ou Kubernetes sem necessidade medida;
- reproduzir funcionalidades de entretenimento observadas em userbots.

---

## 6. Princípios arquiteturais

### P1 — Domínio primeiro

O domínio do Innov representa contas, identidades, contatos, conversas, mensagens, mídia, status, atendimento e fontes. O engine representa somente a comunicação com o provider.

### P2 — Adapter anticorrupção

Nenhum tipo, erro ou identificador específico do Baileys poderá atravessar o adapter.

### P3 — Providers são substituíveis

Meta Cloud API, Baileys e Web Chat implementam contratos comuns, respeitando uma matriz explícita de capacidades.

### P4 — Persistir antes de agir

Eventos recebidos são registrados antes de workflow, IA, notificação ou automação.

### P5 — Outbox antes de envio

A intenção de envio é persistida antes da chamada ao engine.

### P6 — Idempotência em todas as fronteiras

Comandos, eventos, mensagens, status, mídia e replays possuem chaves de idempotência.

### P7 — Single writer

Uma sessão possui um escritor ativo. Escala usa lease e fencing token.

### P8 — Segredos são dados de alta criticidade

Sessões Signal, chaves Noise e demais credenciais são protegidas como segredos, não como configurações comuns.

### P9 — Capability-driven UI

A interface só oferece ações suportadas pelo engine ativo.

### P10 — Determinístico antes de probabilístico

Workflow e regra de negócio têm prioridade sobre IA.

### P11 — Handoff é estado persistente

Transferência para humano não é apenas texto; é mudança auditável de ownership.

### P12 — Degradação graciosa

Falha do engine, mídia ou IA não pode derrubar o domínio de atendimento.

---

## 7. Decisões arquiteturais

### D1 — Baileys será o primeiro engine não oficial

Motivos:

- implementação TypeScript;
- conexão direta por WebSocket;
- menor overhead que um navegador completo;
- eventos tipados;
- suporte ao Multi-Device;
- cobertura de mensagens, mídia, grupos, presença e receipts;
- alinhamento com a stack da plataforma.

A versão deverá ser fixada exatamente após homologação. Dependência `latest`, range amplo ou edge sem aprovação é proibida.

### D2 — Baileys será executado em serviço persistente

O engine ficará em um processo de longa duração, preferencialmente em workspace próprio:

```text
apps/messaging-gateway
```

O serviço web Next.js continuará responsável por interface, ações de domínio e APIs do Innov. O gateway será responsável por sessões e comunicação do engine.

### D3 — Provider oficial e não oficial não compartilham runtime

Eles compartilham:

- modelo canônico;
- contatos;
- conversas;
- mensagens;
- fontes;
- inbox;
- workflows;
- IA;
- auditoria.

Eles não compartilham:

- credenciais;
- lifecycle de conexão;
- payload técnico;
- regras específicas de transporte;
- processos de runtime.

### D4 — Não haverá banco paralelo de CRM

O gateway poderá possuir armazenamento técnico de sessão, filas e cache, mas não será dono de cliente, obra, contrato, oportunidade ou SAC.

### D5 — `whatsapp-web.js` será oracle de laboratório

Poderá ser usado em ambiente descartável para comparar comportamento do cliente Web, mas não fará parte da primeira implementação do engine.

### D6 — OpenWA e Evolution são referências de arquitetura

Não serão incorporados integralmente. Seus padrões de engine, capability, eventos, storage e integrações serão reimplementados no contexto do Innov.

### D7 — IA será independente do canal

O mesmo `AiOrchestrator` atenderá:

- chat interno do site;
- chat autenticado do cliente;
- WhatsApp oficial;
- provider Baileys;
- canais futuros.

---

## 8. Arquitetura lógica

```text
┌──────────────────────────────────────────────────────────────────┐
│                         Innov Web App                            │
│ Next.js / Supabase / CRM / Cliente 360 / Obras / Contratos / SAC│
└──────────────────────────────┬───────────────────────────────────┘
                               │ comandos e eventos assinados
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Messaging Gateway                            │
│                                                                  │
│ API interna ─ Event dispatcher ─ Session manager ─ Outbox worker│
│      │              │                │               │           │
│      │              │                │               │           │
│      └──────────────┴──── Engine Contract ───────────┘           │
│                                  │                               │
│                    ┌─────────────┴─────────────┐                 │
│                    │ Baileys Engine Adapter    │                 │
│                    │ Mock Engine               │                 │
│                    │ engines futuros           │                 │
│                    └─────────────┬─────────────┘                 │
└──────────────────────────────────┼───────────────────────────────┘
                                   │ WebSocket / mídia
                                   ▼
                         WhatsApp Web Multi-Device
```

A Meta Cloud API poderá continuar sendo chamada diretamente pelo módulo atual ou, em evolução futura, também passar pelo contrato comum. A migração deverá ser incremental, sem interromper o PR #39.

---

## 9. Componentes

### 9.1 `MessagingEngine`

Contrato de capacidade de transporte.

Responsabilidades:

- iniciar e parar;
- enviar mensagens;
- emitir eventos normalizados;
- informar capacidades;
- informar saúde;
- expor lifecycle sem detalhes internos.

Contrato conceitual:

```ts
interface MessagingEngine {
  readonly provider: ChannelProviderType
  readonly capabilities: EngineCapabilities

  start(context: EngineStartContext): Promise<void>
  stop(reason: EngineStopReason): Promise<void>
  send(command: CanonicalSendCommand): Promise<ProviderSendResult>
  health(): Promise<EngineHealth>
  subscribe(handler: EngineEventHandler): Unsubscribe
}
```

### 9.2 `SessionEngine`

Responsável por lifecycle de sessões persistentes:

```ts
interface SessionEngine {
  createSession(input: CreateSessionInput): Promise<SessionDescriptor>
  requestPairing(input: PairingRequest): Promise<PairingChallenge>
  startSession(sessionId: string): Promise<void>
  stopSession(sessionId: string): Promise<void>
  logoutSession(sessionId: string): Promise<void>
  rotateSessionSecrets(sessionId: string): Promise<void>
  getSessionState(sessionId: string): Promise<SessionState>
}
```

### 9.3 `SessionCredentialStore`

Responsável por credenciais e keys:

```ts
interface SessionCredentialStore {
  loadCredentials(sessionId: string): Promise<CredentialSnapshot | null>
  compareAndSwapCredentials(input: CredentialWrite): Promise<CredentialVersion>
  getKeys(input: KeyRead): Promise<KeyReadResult>
  setKeys(input: KeyWrite): Promise<KeyWriteResult>
  deleteSessionSecrets(sessionId: string): Promise<void>
}
```

### 9.4 `CanonicalIdentityResolver`

Converte identidades técnicas em identidades canônicas e resolve aliases.

### 9.5 `IngressProcessor`

Executa validação, normalização, persistência, deduplicação e dispatch.

### 9.6 `OutboxDispatcher`

Lê comandos persistidos, reivindica itens, chama engine, registra tentativas e reconcilia estado.

### 9.7 `MediaPipeline`

Responsável por streaming, quarentena, antivírus, MIME, hash, metadados e storage privado.

### 9.8 `AiOrchestrator`

Executa política, contexto, retrieval, modelo, validação, aprovação e handoff.

---

## 10. Modelo canônico

### 10.1 Provider

```ts
type ChannelProviderType =
  | 'META_CLOUD'
  | 'WHATSAPP_WEB_BAILEYS'
  | 'WEB_CHAT'
```

O tipo poderá crescer sem alterar contratos existentes.

### 10.2 Identidade

```ts
interface CanonicalIdentity {
  id: string
  channel: 'WHATSAPP' | 'WEB_CHAT'
  namespace:
    | 'PHONE'
    | 'WHATSAPP_PN'
    | 'WHATSAPP_LID'
    | 'WHATSAPP_GROUP'
    | 'WHATSAPP_NEWSLETTER'
    | 'WEB_USER'
  externalId: string
  normalizedId: string
  phoneNumber?: string
  deviceId?: number
  confidence: 'OBSERVED' | 'RESOLVED' | 'CONFIRMED'
}
```

### 10.3 Mensagem

```ts
interface CanonicalMessage {
  schemaVersion: 1
  id: string
  organizationId: string
  provider: ChannelProviderType
  providerAccountId: string
  providerMessageId: string
  conversationId: string
  direction: 'INBOUND' | 'OUTBOUND' | 'INTERNAL'
  sender: CanonicalIdentity
  recipients: CanonicalIdentity[]
  type: CanonicalMessageType
  text?: string
  media?: CanonicalMediaReference
  replyTo?: CanonicalReplyReference
  occurredAt: string
  receivedAt: string
  providerMetadata?: SanitizedProviderMetadata
}
```

### 10.4 Tipos de mensagem

Primeira versão:

- `TEXT`;
- `IMAGE`;
- `VIDEO`;
- `AUDIO`;
- `VOICE`;
- `DOCUMENT`;
- `STICKER`;
- `LOCATION`;
- `CONTACT`;
- `REACTION`;
- `POLL`;
- `REVOKED`;
- `UNKNOWN`.

Recursos podem existir no engine sem serem habilitados no produto. A capability matrix decide.

### 10.5 Evento

```ts
interface DomainEvent<T> {
  eventId: string
  eventType: string
  eventVersion: number
  organizationId: string
  aggregateId: string
  occurredAt: string
  correlationId: string
  causationId?: string
  idempotencyKey: string
  payload: T
}
```

---

## 11. Capability matrix

Cada engine declara capacidades semânticas, não nomes de métodos da biblioteca.

Exemplo inicial:

```ts
interface EngineCapabilities {
  text: boolean
  image: boolean
  video: boolean
  audio: boolean
  document: boolean
  sticker: boolean
  location: boolean
  contactCard: boolean
  reaction: boolean
  reply: boolean
  edit: boolean
  revoke: boolean
  poll: boolean
  presence: boolean
  historySync: boolean
  groupRead: boolean
  groupWrite: boolean
  communityRead: boolean
  communityWrite: boolean
  newsletterRead: boolean
  newsletterWrite: boolean
  officialTemplates: boolean
}
```

Regras:

- capability não pode ser presumida por provider;
- UI consulta capability;
- API valida capability novamente;
- tentativa incompatível produz erro canônico;
- capability pode variar por versão do engine;
- alteração de capability exige teste e changelog.

---

## 12. Estado da sessão

Estados canônicos:

```text
CREATED
STARTING
PAIRING_REQUIRED
PAIRING_AVAILABLE
AUTHENTICATING
SYNCING
READY
DEGRADED
RECONNECTING
ACTION_REQUIRED
RESTRICTED
LOGGED_OUT
STOPPING
STOPPED
FAILED
```

Transições devem ser explicitamente modeladas e testadas.

Regras:

- `READY` exige lease válido e credenciais persistidas;
- `PAIRING_AVAILABLE` contém challenge efêmero;
- `LOGGED_OUT` exige ação humana para novo vínculo;
- reconnect não pode criar duas instâncias;
- estado observado pelo engine não sobrescreve estado mais crítico sem regra;
- transição e causa são auditadas.

---

## 13. Armazenamento de sessão

### 13.1 Requisitos

O armazenamento deverá preservar, conforme exigência do engine:

- credenciais do dispositivo;
- Noise keys;
- identity keys;
- signed prekeys;
- prekeys;
- sessões Signal;
- sender keys;
- app-state sync keys;
- mappings LID/PN;
- metadados de versão.

### 13.2 Regras

- criptografia por envelope;
- data key separada por sessão;
- chave-mestra fora do banco;
- escrita transacional;
- optimistic concurrency;
- versão crescente;
- nenhuma serialização em log;
- backup criptografado;
- restauração testada;
- exclusão criptográfica;
- acesso somente pelo gateway.

### 13.3 `useMultiFileAuthState`

A estratégia de múltiplos arquivos poderá ser usada apenas em testes locais descartáveis para entender o contrato. É proibida como implementação de produção.

### 13.4 Inspiração do `whatsmeow`

O modelo SQL do `whatsmeow` será usado como referência de disciplina:

- dispositivo como agregado;
- migrations próprias;
- chaves separadas;
- múltiplas sessões;
- suporte a LID;
- persistência explícita.

A implementação será própria e em conformidade com a arquitetura do Innov.

---

## 14. Single writer e coordenação

### 14.1 Lease

Tabela conceitual:

```text
channel_session_runtime_leases
├── session_id
├── owner_instance_id
├── fencing_token
├── acquired_at
├── renewed_at
├── expires_at
├── generation
└── state
```

### 14.2 Fencing

Toda escrita crítica deverá carregar o fencing token. Uma instância antiga que recupere execução após perder o lease não poderá sobrescrever credenciais ou estado.

### 14.3 Regras

- lease renovado periodicamente;
- timeout menor que a janela de detecção operacional;
- novo owner incrementa token;
- processos verificam token antes de persistir keys;
- shutdown libera lease quando possível;
- expiração permite takeover;
- sessão nunca é iniciada sem lease.

### 14.4 Testes obrigatórios

- duas instâncias iniciadas ao mesmo tempo;
- pausa longa da instância antiga;
- perda de banco durante renovação;
- restart no meio de `creds.update`;
- takeover após expiração;
- escrita com token antigo rejeitada.

---

## 15. Comunicação Innov ↔ Gateway

### 15.1 Princípios

- API interna, não pública;
- autenticação de serviço;
- HMAC ou assinatura assimétrica;
- timestamp e nonce;
- proteção contra replay;
- idempotency key;
- payload versionado;
- timeouts curtos para comando e processamento assíncrono.

### 15.2 Endpoints conceituais

```text
POST /internal/v1/sessions
POST /internal/v1/sessions/{id}/start
POST /internal/v1/sessions/{id}/pairing
POST /internal/v1/sessions/{id}/stop
POST /internal/v1/sessions/{id}/logout
GET  /internal/v1/sessions/{id}/state
POST /internal/v1/commands/messages
POST /internal/v1/events/ack
GET  /health
GET  /ready
GET  /metrics
```

O endpoint de envio registra o comando; não deve bloquear esperando todo o ciclo de entrega.

### 15.3 Eventos publicados pelo gateway

```text
channel.session.state_changed.v1
channel.session.pairing_available.v1
channel.session.credentials_updated.v1
channel.message.received.v1
channel.message.accepted.v1
channel.message.status_changed.v1
channel.message.failed.v1
channel.contact.observed.v1
channel.identity.mapping_observed.v1
channel.media.available.v1
channel.engine.health_changed.v1
```

---

## 16. Pipeline inbound

```text
Evento nativo do engine
        ↓
validação básica
        ↓
normalização pelo adapter
        ↓
envelope canônico
        ↓
persistência do ingress
        ↓
deduplicação
        ↓
resolução de conta e organização
        ↓
resolução de identidade e conversa
        ↓
persistência da mensagem
        ↓
mídia em quarentena, se houver
        ↓
dispatch de eventos de domínio
        ↓
workflow / notificação / IA
```

### 16.1 Estados

- `RECEIVED_RAW`;
- `NORMALIZED`;
- `DUPLICATE`;
- `PERSISTED`;
- `MEDIA_PENDING`;
- `DISPATCHED`;
- `FAILED_RETRYABLE`;
- `FAILED_TERMINAL`.

### 16.2 Idempotência

A chave deve considerar provider, conta, sessão e identificador de mensagem. Eventos de receipt possuem chave própria.

### 16.3 Payload bruto

Payloads completos podem conter dados desnecessários. A política inicial é:

- preservar somente campos técnicos necessários;
- sanitizar identificadores sensíveis;
- limitar tamanho;
- aplicar retenção curta;
- não persistir material criptográfico;
- permitir diagnóstico por hash e campos selecionados.

### 16.4 Mensagens desconhecidas

Tipos não reconhecidos serão persistidos como `UNKNOWN`, com metadata sanitizada. Não podem derrubar a sessão.

---

## 17. Pipeline outbound

```text
Ação humana / workflow / IA aprovada
        ↓
validação de política e capability
        ↓
resolução de fonte canônica
        ↓
criação da mensagem de domínio
        ↓
criação do comando na outbox
        ↓
claim transacional
        ↓
envio pelo engine
        ↓
registro da tentativa
        ↓
provider message id
        ↓
receipts e reconciliação
```

### 17.1 Outbox

Campos mínimos:

```text
id
organization_id
provider_type
provider_account_id
session_id
conversation_id
message_id
command_type
payload_version
payload
idempotency_key
state
priority
available_at
claimed_at
claimed_by
attempt_count
created_at
```

### 17.2 Tentativas

Cada tentativa registra:

- número;
- início e término;
- engine e versão;
- session generation;
- fencing token;
- classe de falha;
- código sanitizado;
- retryable;
- próxima tentativa;
- resultado.

### 17.3 Classes de falha

```text
TRANSIENT_NETWORK
SESSION_NOT_READY
SESSION_LOST
RATE_LIMITED
IDENTITY_UNRESOLVED
ENCRYPTION_SESSION_MISSING
MEDIA_UPLOAD_FAILED
PROVIDER_REJECTED
ACCOUNT_RESTRICTED
INVALID_COMMAND
UNSUPPORTED_CAPABILITY
UNKNOWN_ENGINE_FAILURE
```

### 17.4 Retry

- retries limitados;
- backoff exponencial com jitter;
- nenhuma repetição infinita;
- falha terminal vai para DLQ;
- reprocessamento humano exige justificativa;
- comando idempotente não pode enviar duas vezes por simples retry;
- cenário de envio concluído e confirmação perdida precisa de reconciliação específica.

---

## 18. Identidade PN, LID e contato

### 18.1 Problema

No protocolo Multi-Device, uma pessoa pode aparecer com número telefônico, LID, identificador de dispositivo ou aliases observados em momentos diferentes. O domínio não pode criar contatos independentes automaticamente para cada representação.

### 18.2 Modelo

```text
channel_contact_identities
├── id
├── organization_id
├── contact_id
├── provider_type
├── provider_account_id
├── namespace
├── external_id
├── normalized_id
├── phone_number
├── device_id
├── confidence
├── first_seen_at
├── last_seen_at
├── superseded_by
└── metadata
```

### 18.3 Regras

- identidade observada não equivale a cliente confirmado;
- LID pode existir sem telefone resolvido;
- mapeamento PN/LID pode ser atualizado;
- mapeamento nunca cruza organização;
- merge de contato é transacional;
- histórico não é reescrito de forma destrutiva;
- aliases permanecem para lookup;
- conflitos são enviados para reconciliação humana.

---

## 19. Mídia

### 19.1 Pipeline

```text
download stream
  ↓
limite de tamanho
  ↓
hash
  ↓
quarentena privada
  ↓
MIME real
  ↓
antivírus
  ↓
metadados
  ↓
thumbnail / OCR / transcrição opcional
  ↓
storage definitivo
  ↓
URL assinada
```

### 19.2 Requisitos

- streaming preferencial;
- memória limitada;
- timeout;
- controle de concorrência;
- filename sanitizado;
- extensão não confiável;
- MIME declarado comparado ao real;
- hash de conteúdo;
- deduplicação;
- bucket privado;
- nenhum download automático por navegador do agente;
- conteúdo reprovado permanece inacessível;
- OCR e transcrição seguem política de dados.

### 19.3 Estados

- `PENDING_DOWNLOAD`;
- `DOWNLOADING`;
- `QUARANTINED`;
- `SCANNING`;
- `APPROVED`;
- `REJECTED`;
- `FAILED_RETRYABLE`;
- `FAILED_TERMINAL`;
- `EXPIRED`.

---

## 20. Caixa de entrada e atendimento

A interface existente será evoluída, não substituída.

### 20.1 Painéis

1. lista de conversas;
2. histórico e compositor;
3. Cliente 360 e contexto operacional.

### 20.2 Informações necessárias

- conta e provider;
- saúde da sessão;
- fila;
- responsável;
- estado humano/bot/IA;
- não lidas;
- SLA;
- cliente;
- obra;
- contrato;
- oportunidade;
- SAC;
- tags;
- última mensagem;
- capabilities relevantes.

### 20.3 Multiagente

- claim de conversa;
- atribuição explícita;
- transferência;
- notas internas;
- optimistic UI com reconciliação;
- prevenção de respostas simultâneas;
- indicador de outro agente compondo;
- auditoria de ownership.

### 20.4 Estados visuais de sessão

- pronta;
- sincronizando;
- reconectando;
- degradada;
- QR necessário;
- ação humana;
- restrita;
- desconectada.

A interface deve seguir `diretrizes/UI-UX-PRO-MAX.md` e não reproduzir visualmente os projetos de referência.

---

## 21. Mensagens padrão e playbooks

### 21.1 Fonte única

O provider não oficial reutilizará `whatsapp_content_bindings` e o resolvedor de fontes criado na Etapa 22.

Fontes iniciais:

- modelos contratuais;
- propostas versionadas;
- contratos versionados;
- aditivos versionados;
- documentos de obra;
- playbooks versionados autorizados.

### 21.2 Regra

Nenhum texto padrão será duplicado dentro do engine ou gateway.

O gateway recebe conteúdo já resolvido ou referência interna segura, conforme a decisão da sprint de segurança. O histórico conserva:

- tipo de fonte;
- ID;
- versão;
- campo;
- SHA-256;
- variáveis;
- aprovador;
- data da resolução.

### 21.3 Classificação de autonomia

#### A — Determinístico e protegido

- cláusulas;
- prazos contratuais;
- aceite;
- autorização;
- termos de entrega;
- responsabilidades;
- custos e valores;
- documentos oficiais.

A IA não reescreve livremente.

#### B — Assistido

- primeira abordagem;
- follow-up;
- solicitação de referência;
- convite para reunião;
- esclarecimento de pendência;
- pós-venda.

A IA sugere e humano aprova.

#### C — Autônomo limitado

- confirmação de recebimento;
- horário;
- endereço;
- status factual já registrado;
- FAQ de baixo risco;
- roteamento.

Sempre com handoff disponível.

---

## 22. Ponte de IA

### 22.1 Separação

O canal não chama diretamente o modelo.

```text
mensagem persistida
   ↓
policy engine
   ↓
workflow engine
   ↓
context builder
   ↓
knowledge retrieval
   ↓
AI provider
   ↓
output validator
   ↓
aprovação ou handoff
   ↓
outbox
```

### 22.2 Contrato do provider

```ts
interface AiProvider {
  readonly provider: string
  generate(request: AiGenerationRequest): Promise<AiGenerationResult>
  embed?(request: EmbeddingRequest): Promise<EmbeddingResult>
  health(): Promise<AiProviderHealth>
}
```

### 22.3 Modos

- `INTERNAL_ASSISTANT`;
- `DRAFT_ONLY`;
- `APPROVAL_REQUIRED`;
- `AUTO_REPLY_LIMITED`;
- `ANALYSIS_ONLY`.

A implantação começa em `DRAFT_ONLY`.

### 22.4 Retrieval

Estratégia:

1. filtro de autorização;
2. filtro temporal e de versão;
3. busca vetorial opcional;
4. busca lexical;
5. complementação híbrida;
6. deduplicação de trechos;
7. limite de contexto;
8. referências das fontes.

Filtros mínimos:

- `organization_id`;
- `client_id`;
- `project_id`;
- `contract_id`;
- `document_type`;
- `document_version`;
- `valid_from`;
- `valid_until`;
- `confidentiality_level`.

### 22.5 Prioridade

Workflows e automações determinísticas têm prioridade. A IA não responde quando:

- humano está responsável;
- conversa está em handoff;
- limite foi atingido;
- há conflito documental;
- conteúdo é protegido;
- política exige aprovação;
- retrieval não possui evidência suficiente;
- ferramenta necessária não está autorizada.

### 22.6 Handoff

Estados:

```text
AI_INACTIVE
AI_DRAFTING
AI_ACTIVE_LIMITED
HUMAN_REQUESTED
HUMAN_ASSIGNED
HUMAN_ACTIVE
AI_RETURN_ELIGIBLE
CLOSED
```

Handoff deve registrar:

- motivo;
- resumo;
- mensagens relevantes;
- fontes consultadas;
- ações já tomadas;
- responsável;
- instante.

### 22.7 Tool gateway

Ferramentas de leitura:

- cliente;
- obra;
- cronograma;
- contrato;
- documento;
- ticket;
- status.

Escritas de baixo risco:

- criar follow-up;
- preparar rascunho;
- criar ticket;
- atribuir responsável, quando autorizado.

Escritas críticas exigem aprovação:

- alterar prazo;
- registrar aceite;
- enviar contrato;
- alterar situação contratual;
- criar aditivo;
- assumir compromisso financeiro.

### 22.8 Prompt injection

Conteúdo de usuário, mensagem, arquivo e documento recuperado é dado não confiável. O sistema deve separar:

- política do sistema;
- política da organização;
- instrução do workflow;
- evidência recuperada;
- mensagem do usuário;
- resultado de ferramenta.

Texto recuperado nunca recebe autoridade de instrução.

---

## 23. Dados e tabelas

A nomenclatura definitiva será decidida depois do inventário das tabelas existentes. O modelo conceitual inclui:

```text
channel_provider_accounts
channel_sessions
channel_session_runtime_leases
channel_session_secret_versions
channel_session_key_records
channel_contact_identities
channel_identity_mappings
channel_ingress_events
channel_commands
channel_outbox
channel_delivery_attempts
channel_dead_letters
channel_media_objects
channel_engine_capabilities
communication_playbooks
communication_playbook_versions
ai_provider_configs
ai_runs
ai_usage_events
ai_handoffs
```

### 23.1 Regras de banco

- `organization_id` em todo dado de negócio;
- RLS forçada onde exposto ao Supabase;
- gateway técnico usa credencial mínima própria;
- escrita operacional por RPC ou serviço autorizado;
- histórico append-only quando aplicável;
- FKs indexadas;
- timestamps UTC;
- enumerações controladas;
- payload com tamanho máximo;
- JSON técnico não substitui colunas essenciais;
- retenção definida por classe de dado.

### 23.2 Banco do gateway

A decisão entre usar o PostgreSQL existente com schema técnico separado ou banco operacional separado deverá considerar:

- blast radius;
- latência;
- RLS;
- credenciais;
- backup;
- disponibilidade;
- restauração;
- observabilidade.

A decisão deverá ser registrada em ADR. O gateway não receberá `service_role` do Supabase por conveniência.

---

## 24. Segurança

### 24.1 Ativos críticos

- chaves e sessão do WhatsApp;
- mensagens;
- anexos;
- identidades;
- dados do cliente;
- documentos;
- chaves de IA;
- comandos;
- outbox;
- audit log.

### 24.2 Controles obrigatórios

- criptografia em trânsito;
- criptografia por envelope para secrets;
- autenticação mútua ou assinatura entre serviços;
- proteção contra replay;
- RBAC e RLS;
- princípio do menor privilégio;
- rate limit;
- circuit breaker;
- redaction de logs;
- scanner de segredo;
- SBOM;
- dependências fixadas;
- atualização controlada;
- kill switch;
- retenção e expurgo;
- audit trail.

### 24.3 QR e pairing

- challenge efêmero;
- exibido somente a administrador autorizado;
- expiração curta;
- não gravado em log;
- não enviado por canais externos;
- auditado sem armazenar seu conteúdo;
- modal fechado ao concluir, expirar ou parar a sessão.

### 24.4 Logs

Nunca registrar:

- conteúdo de keys;
- credential snapshots;
- QR;
- pairing code;
- tokens;
- cookies;
- payload integral de mídia;
- chave de IA;
- service role;
- documentos privados.

### 24.5 Acesso de IA

- dados mínimos;
- filtros por organização;
- ferramentas allowlisted;
- saída validada;
- aprovação para ação crítica;
- custo limitado;
- provider e modelo auditados.

---

## 25. Observabilidade

### 25.1 Métricas de sessão

- sessões por estado;
- tempo em reconnect;
- reconexões por período;
- perda de lease;
- falhas de persistência de credentials;
- tempo desde último evento;
- geração da sessão.

### 25.2 Métricas de mensagens

- inbound por tipo;
- outbound por tipo;
- latência de persistência;
- latência de envio;
- receipts;
- duplicações evitadas;
- retries;
- DLQ;
- falha por classe.

### 25.3 Métricas de mídia

- bytes;
- tempo de download;
- quarentena;
- reprovação;
- timeout;
- concorrência;
- storage.

### 25.4 Métricas de IA

- execuções;
- modo;
- modelo;
- tokens;
- custo;
- latência;
- retrieval vazio;
- handoff;
- rejeição pelo validator;
- aprovação humana.

### 25.5 Logs e traces

Campos comuns:

```text
trace_id
correlation_id
causation_id
organization_id
provider_type
provider_account_id
session_id
conversation_id
message_id
event_id
command_id
attempt_id
engine_version
```

Conteúdo sensível deverá ser redigido.

---

## 26. Resiliência

### 26.1 Backoff

Reconnect e retry usarão backoff com jitter e teto.

### 26.2 Circuit breaker

Circuit breaker por sessão e por classe de operação impedirá loops agressivos.

### 26.3 Dead-letter

Itens terminais permanecem disponíveis para diagnóstico e reprocessamento autorizado.

### 26.4 Restore

A restauração deverá ser validada em infraestrutura nova, não apenas no mesmo processo.

### 26.5 Upgrade do engine

Processo obrigatório:

1. ler changelog e breaking changes;
2. atualizar em branch própria;
3. executar contract tests;
4. executar testes com sessão descartável;
5. testar restore;
6. testar mídia e identidade;
7. canary em sessão de homologação;
8. promover por feature flag;
9. manter rollback possível.

---

## 27. Estratégia de testes

### 27.1 Unitários

- modelos canônicos;
- state machines;
- normalização de identidade;
- capability;
- retry classification;
- redaction;
- policy engine;
- AI output validator.

### 27.2 Contract tests

A mesma bateria será executada contra:

- `MockEngine`;
- `MetaCloudEngine`;
- `BaileysEngine`.

### 27.3 Integração

- PostgreSQL real;
- migrations;
- transactions;
- lease;
- fencing;
- outbox;
- idempotência;
- DLQ;
- RLS.

### 27.4 E2E

- pairing;
- reconnect;
- texto inbound/outbound;
- mídia;
- reply;
- reaction, se habilitada;
- receipt;
- contato PN;
- contato LID;
- handoff;
- fonte canônica;
- IA draft-only.

### 27.5 Chaos

- kill no meio do envio;
- kill no `creds.update`;
- perda de rede;
- banco indisponível;
- storage indisponível;
- instância zumbi;
- duas réplicas;
- evento duplicado;
- receipt fora de ordem;
- mídia truncada;
- engine atualizado com incompatibilidade simulada.

### 27.6 Performance

Medir:

- memória por sessão;
- CPU por sessão;
- latência de inbound;
- latência de outbound;
- throughput por sessão;
- throughput da outbox;
- tamanho do session store;
- custo de mídia;
- custo de IA.

Nenhum número de terceiros será adotado como capacidade garantida do Innov.

---

## 28. Deployment

### 28.1 Ambientes

- desenvolvimento local com mock;
- laboratório com sessão descartável;
- homologação com número dedicado;
- piloto restrito;
- produção somente após decisão explícita.

### 28.2 Processo

O gateway deverá rodar em ambiente com:

- processo persistente;
- disco apenas quando necessário;
- container não-root;
- health e readiness;
- secrets manager;
- rede restrita;
- logs centralizados;
- métricas;
- graceful shutdown;
- rollback.

### 28.3 Serverless

O socket Baileys não será mantido em função serverless. APIs serverless poderão criar comandos e ler estado, mas o runtime de sessão ficará em serviço persistente.

---

## 29. Feature flags

Flags mínimas:

```text
messaging.provider.baileys.enabled
messaging.session.pairing.enabled
messaging.outbound.enabled
messaging.media.download.enabled
messaging.groups.enabled
messaging.ai.draft.enabled
messaging.ai.autoreply.enabled
messaging.plugins.enabled
```

Escopos:

- global;
- organização;
- provider account;
- sessão;
- usuário;
- conversa.

A flag global de saída é o kill switch operacional.

---

## 30. Reaproveitamento dos projetos analisados

### 30.1 Baileys

Reaproveitar:

- composição de camadas de socket;
- event model;
- contrato de auth state;
- tratamento de sessões Signal;
- mutexes e controle de concorrência;
- device discovery;
- PN/LID mapping;
- retries e placeholder recovery;
- mídia e receipts;
- state updates.

Construir de forma própria:

- adapter;
- session store;
- lease;
- outbox;
- domínio;
- APIs;
- segurança;
- observabilidade.

Não usar:

- armazenamento de arquivos em produção;
- exemplos como arquitetura final;
- tipos nativos fora do adapter;
- versão edge sem gate.

### 30.2 OpenWA

Reaproveitar como padrão:

- interface neutra de engine;
- normalização de identidade;
- capability matrix;
- HMAC;
- API key scopes;
- health/readiness;
- audit e plugin boundary.

Não instalar o produto inteiro sem decisão específica.

### 30.3 whatsmeow

Reaproveitar como padrão:

- session store SQL;
- migrations;
- dispositivo como agregado;
- múltiplas sessões;
- LID mapping;
- consistência transacional.

### 30.4 wacrm

Reaproveitar como padrão:

- workflow antes de IA;
- RAG híbrido;
- fallback lexical;
- limite por conta e conversa;
- atomic claim;
- handoff persistente;
- IA que não derruba webhook;
- BYO provider com secrets protegidos.

### 30.5 Evolution API

Reaproveitar como padrão:

- provider adapters;
- publishers de eventos;
- filas substituíveis;
- integrações como consumidores;
- storage adapters;
- isolamento por instância.

Não introduzir todos os brokers por antecipação.

### 30.6 whatsapp-web.js

Usar como:

- oracle comportamental;
- comparação de recursos;
- laboratório visual;
- teste de diferenças entre cliente real e protocolo direto.

### 30.7 wechat-bot

Reaproveitar como padrão:

- canal separado de AI provider;
- allowlists;
- regras por tipo de chat;
- modelos locais e remotos intercambiáveis.

### 30.8 WhatsControl

Reaproveitar como pesquisa de UX:

- inbox;
- multiagente;
- bot/humano;
- painel de contato;
- atualização em tempo real.

### 30.9 Bots e userbots

Reaproveitar apenas o conceito de registry e middleware. Plugins inseguros, downloaders e sessões serializadas não serão utilizados.

### 30.10 whatsapp-web-reveng

Usar somente como referência histórica da evolução do protocolo e da engenharia reversa.

---

## 31. Licenciamento e atribuição

Antes de adaptar código:

- registrar origem;
- verificar licença no commit usado;
- preservar avisos;
- registrar modificações quando exigido;
- adicionar notice;
- confirmar compatibilidade com distribuição do Innov.

Pontos conhecidos:

- Baileys: MIT no repositório analisado;
- OpenWA: MIT no repositório analisado;
- wacrm: MIT;
- whatsapp-web.js: Apache 2.0;
- whatsmeow: MPL 2.0;
- Evolution: Apache 2.0 com condições adicionais declaradas no arquivo de licença;
- WhatsControl: licença não localizada na raiz durante a análise;
- bots: revisar individualmente antes de qualquer adaptação.

Esta SPEC não substitui revisão jurídica.

---

## 32. Critérios de aceite por camada

### Domínio

- [ ] nenhum tipo Baileys fora do adapter
- [ ] mensagens oficiais e não oficiais usam o mesmo modelo
- [ ] identidade PN/LID modelada
- [ ] nenhuma duplicação de Cliente 360
- [ ] capability matrix testada

### Gateway

- [ ] runtime persistente separado
- [ ] API interna autenticada
- [ ] health, readiness e metrics
- [ ] graceful shutdown
- [ ] versão do engine fixada

### Sessão

- [ ] store criptografado
- [ ] optimistic concurrency
- [ ] lease
- [ ] fencing
- [ ] restore testado
- [ ] logout e exclusão testados

### Mensagens

- [ ] ingress durável
- [ ] outbox
- [ ] idempotência
- [ ] retry ledger
- [ ] DLQ
- [ ] status monotônico

### Mídia

- [ ] streaming
- [ ] quarentena
- [ ] antivírus
- [ ] MIME real
- [ ] storage privado
- [ ] URLs temporárias

### Produto

- [ ] inbox multiprovider
- [ ] atribuição e transferência
- [ ] notas internas
- [ ] estados de sessão
- [ ] capability-driven UI
- [ ] responsividade e acessibilidade

### Fontes

- [ ] bindings existentes reutilizados
- [ ] conteúdo não duplicado
- [ ] snapshot e hash
- [ ] conteúdo protegido não reescrito
- [ ] reprodução histórica validada

### IA

- [ ] provider-neutral
- [ ] RAG híbrido
- [ ] workflow primeiro
- [ ] draft-only inicial
- [ ] limite atômico
- [ ] handoff persistente
- [ ] output validation
- [ ] audit e custo

### Segurança

- [ ] threat model
- [ ] segredo scan
- [ ] redaction
- [ ] HMAC/replay protection
- [ ] RLS e RBAC
- [ ] kill switch
- [ ] SBOM
- [ ] runbook de comprometimento

### Operação

- [ ] métricas
- [ ] alertas
- [ ] traces
- [ ] runbooks
- [ ] chaos tests
- [ ] benchmarks próprios
- [ ] rollback

---

## 33. Definition of Done

O provider não oficial só será considerado concluído quando:

1. todas as sprints do inventário estiverem concluídas;
2. o provider Meta existente continuar verde;
3. o engine Baileys estiver encapsulado;
4. o session store tiver restore comprovado;
5. single writer e fencing passarem em chaos test;
6. inbound, outbound, mídia e identidade passarem em E2E;
7. as fontes canônicas permanecerem únicas;
8. a IA operar inicialmente em modo rascunho com handoff;
9. segurança, observabilidade e runbooks estiverem ativos;
10. o piloto restrito possuir relatório;
11. a promoção tiver decisão explícita;
12. documentação canônica e CI estiverem verdes.

---

## 34. Questões ainda abertas

As decisões abaixo não podem ser inventadas durante a implementação; devem virar ADR:

- [ ] PostgreSQL técnico no mesmo cluster ou banco separado?
- [ ] KMS/provider de chave-mestra?
- [ ] ambiente de execução persistente?
- [ ] Redis será necessário para lease ou PostgreSQL advisory/row lease será suficiente?
- [ ] número máximo inicial de sessões?
- [ ] capacidades habilitadas na primeira versão?
- [ ] grupos e comunidades entram no MVP?
- [ ] retenção de payload técnico?
- [ ] política de mensagens efêmeras e view-once?
- [ ] provider inicial de IA?
- [ ] embeddings locais ou remotos?
- [ ] critérios jurídicos e operacionais para promoção?

---

## 35. Fontes técnicas analisadas

- https://github.com/WhiskeySockets/Baileys
- https://github.com/rmyndharis/OpenWA
- https://github.com/tulir/whatsmeow
- https://github.com/ArnasDon/wacrm
- https://github.com/evolution-foundation/evolution-api
- https://github.com/wwebjs/whatsapp-web.js
- https://github.com/sebferreira/WhatsControl
- https://github.com/wangrongding/wechat-bot
- https://github.com/lyfe00011/whatsapp-bot
- https://github.com/mruniquehacker/Knightbot-MD
- https://github.com/sigalor/whatsapp-web-reveng

As referências suportam a análise de técnicas e padrões. Requisitos específicos do Innov, fronteiras, estados, tabelas e gates definidos nesta SPEC são decisões arquiteturais próprias derivadas dessa análise.