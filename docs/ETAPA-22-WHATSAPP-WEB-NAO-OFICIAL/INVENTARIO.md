# Inventário de execução — Provider WhatsApp Web não oficial

**Documento:** plano executável do subprojeto de mensageria não oficial  
**Projeto pai:** Etapa 22 — WhatsApp e atendimento omnichannel  
**Branch de planejamento:** `feature/etapa-22-whatsapp-omnichannel`  
**Status:** planejamento concluído; implementação não iniciada  
**Provider inicial planejado:** Baileys 7.x, encapsulado por adapter próprio  
**Última atualização:** 03 de agosto de 2026  
**Documento complementar:** [`SPEC.md`](./SPEC.md)

---

## 1. Objetivo deste inventário

Este documento transforma a análise dos projetos open source em um plano de execução verificável para construir, dentro do ecossistema Innov, um provider de mensagens baseado no WhatsApp Web Multi-Device por API não oficial.

O objetivo não é copiar ou incorporar integralmente qualquer produto analisado. O objetivo é reaproveitar técnicas, invariantes, abstrações, padrões de persistência, estratégias de retry, contratos de eventos, mecanismos de handoff e boas práticas operacionais para desenvolver uma implementação própria.

O provider não oficial será uma extensão do domínio já criado na Etapa 22. Ele não poderá criar um segundo CRM, uma segunda caixa de entrada, uma segunda base de contatos ou uma segunda fonte de mensagens padrão.

Princípio estrutural:

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

## 2. Relação com o PR #39

O PR #39 permanece responsável pela base da Etapa 22:

- rota `/app/whatsapp`;
- inbox e histórico;
- contas, contatos e conversas;
- vínculos com Cliente 360, CRM, obra, contrato, oportunidade e SAC;
- mensagens e eventos de status;
- fontes canônicas e `whatsapp_content_bindings`;
- RLS, auditoria e proteção do histórico;
- provider oficial Meta Cloud API.

Este inventário **não autoriza ampliar silenciosamente o PR #39 com um runtime Baileys**. A implantação do provider não oficial deverá ocorrer em branch própria, criada somente depois da aprovação desta especificação e da conclusão dos pré-requisitos definidos no Marco M-0.

Branch planejada para a execução:

```text
feature/etapa-22-provider-whatsapp-web-baileys
```

---

## 3. Regras obrigatórias de execução

### R1 — Uma sprint ativa

No máximo uma sprint poderá estar em estado `em andamento`. Nenhuma sprint seguinte começa antes do fechamento verificável da anterior.

### R2 — Check exige evidência

Uma tarefa só recebe `[x]` quando houver evidência objetiva, por exemplo:

- caminho de arquivo e commit;
- migration aplicada em banco de teste;
- teste automatizado verde;
- log de execução;
- captura de métrica;
- relatório de ameaça;
- decisão arquitetural registrada.

“Código escrito” não é evidência suficiente de funcionamento.

### R3 — Nenhum segredo no repositório

São proibidos:

- QR Codes persistidos em documentação;
- `creds.json`;
- chaves Signal;
- tokens de sessão;
- cookies;
- números reais de clientes;
- payloads de produção;
- chaves de OpenAI, Meta, Supabase ou outros providers.

### R4 — Reutilizar técnica, não importar produto sem decisão

Nenhum módulo externo poderá ser copiado ou adaptado sem:

1. identificação do arquivo e projeto de origem;
2. verificação da licença;
3. justificativa de vantagem material sobre implementação própria;
4. registro em `THIRD_PARTY_NOTICES.md`, quando aplicável;
5. testes próprios;
6. revisão de segurança;
7. aprovação explícita no PR.

### R5 — O domínio não conhece Baileys

Tipos como `WAMessage`, `BinaryNode`, `WAMessageKey`, `proto.Message` e JIDs específicos ficam confinados ao adapter do engine.

### R6 — Um escritor por sessão

Cada sessão terá somente um runtime escritor ativo. Escala horizontal deverá usar lease, fencing token e reatribuição controlada. Lock sem fencing não é suficiente.

### R7 — Inbound antes de automação

Nenhum evento recebido poderá acionar IA ou workflow antes de:

- ser validado;
- normalizado;
- deduplicado;
- persistido;
- associado à organização correta;
- classificado quanto a mídia e segurança.

### R8 — Determinístico antes de IA

A ordem obrigatória é:

```text
política → consentimento → workflow → regra de negócio → recuperação de fatos → IA → aprovação/handoff
```

### R9 — Sem automação de abuso

O projeto não implementará mecanismos de evasão, simulação fraudulenta de comportamento humano, spam, cold blast, rotação para contornar bloqueios ou manipulação de fingerprint.

### R10 — Kill switch obrigatório

O sistema deverá conseguir interromper imediatamente:

- uma sessão;
- uma organização;
- todos os envios não oficiais;
- automações;
- respostas de IA;
- downloads de mídia.

### R11 — Falha segura

Na dúvida, o sistema deve:

- não enviar;
- não repetir indefinidamente;
- encaminhar para humano;
- preservar evidência;
- sinalizar ação necessária.

### R12 — Nada é promovido por “funcionou uma vez”

Homologação exige testes repetidos de reconexão, concorrência, mídia, identidade, retry, indisponibilidade, atualização da biblioteca e restauração de sessão.

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

Os itens abaixo pertencem à Etapa 22 e serão reaproveitados, não recriados:

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

Objetivo: impedir que a implementação comece com ambiguidades sobre escopo, licenças, risco, domínio e infraestrutura.

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
- [x] W-00.12 — Classificar os projetos por camada: biblioteca, driver, gateway, CRM, bot e pesquisa
- [x] W-00.13 — Definir Baileys como primeiro engine não oficial a ser estudado e encapsulado
- [x] W-00.14 — Definir que técnicas serão reaproveitadas sem copiar produtos completos
- [x] W-00.15 — Criar este inventário e a especificação complementar

**Evidência:** `docs/ANALISE-REFERENCIAS-WHATSAPP-OPEN-SOURCE-2026-08-03.md`, este arquivo e `SPEC.md`.

## Sprint W-01 — ADR, licença e modelo de risco

**Estado:** pendente  
**Dependências:** W-00

- [ ] W-01.1 — Criar ADR para adoção do provider não oficial como extensão opcional
- [ ] W-01.2 — Registrar que o provider oficial e o não oficial compartilham domínio, mas não runtime
- [ ] W-01.3 — Criar matriz de licença por projeto, arquivo e técnica potencialmente adaptável
- [ ] W-01.4 — Criar `THIRD_PARTY_NOTICES.md` antes de qualquer adaptação substancial
- [ ] W-01.5 — Definir critérios de número autorizado para homologação
- [ ] W-01.6 — Definir termo interno de aceite de risco operacional
- [ ] W-01.7 — Definir política de consentimento, opt-out e bloqueio de contato
- [ ] W-01.8 — Definir casos proibidos: spam, prospecção indiscriminada, fraude e evasão
- [ ] W-01.9 — Definir processo de desligamento e remoção de sessão
- [ ] W-01.10 — Registrar critérios que cancelariam o projeto antes da implantação

**Gate W-G01:** nenhum código Baileys entra no Innov antes da conclusão integral desta sprint.

---

# Marco M-1 — Domínio canônico e arquitetura multiprovider

Objetivo: preparar o domínio do Innov para suportar providers sem expor detalhes do protocolo.

## Sprint W-02 — Modelo canônico de canal, identidade e mensagem

**Estado:** pendente  
**Dependências:** W-01

- [ ] W-02.1 — Definir `ChannelProviderType`
  - [ ] W-02.1.1 — `META_CLOUD`
  - [ ] W-02.1.2 — `WHATSAPP_WEB_BAILEYS`
  - [ ] W-02.1.3 — `WEB_CHAT`
  - [ ] W-02.1.4 — providers futuros sem implementação
- [ ] W-02.2 — Definir `CanonicalIdentity`
- [ ] W-02.3 — Definir namespaces `PHONE`, `WHATSAPP_PN`, `WHATSAPP_LID`, `GROUP`, `NEWSLETTER` e `WEB_USER`
- [ ] W-02.4 — Definir `CanonicalMessage`
- [ ] W-02.5 — Definir `CanonicalMedia`
- [ ] W-02.6 — Definir `CanonicalReceipt`
- [ ] W-02.7 — Definir `CanonicalConversation`
- [ ] W-02.8 — Definir `ProviderMetadata` separado do domínio
- [ ] W-02.9 — Definir versionamento dos contratos
- [ ] W-02.10 — Criar testes que proíbam imports de Baileys fora do adapter
- [ ] W-02.11 — Mapear os objetos atuais da Etapa 22 para o modelo neutro
- [ ] W-02.12 — Garantir compatibilidade retroativa com o provider Meta já existente

**Gate W-G02:** nenhum tipo nativo de engine pode atravessar a fronteira do adapter.

## Sprint W-03 — Contrato de engine e matriz de capacidades

**Estado:** pendente  
**Dependências:** W-02

- [ ] W-03.1 — Criar interface `MessagingEngine`
- [ ] W-03.2 — Criar interface `SessionEngine`
- [ ] W-03.3 — Criar interface `EngineEventSource`
- [ ] W-03.4 — Criar `EngineCapabilityMatrix`
- [ ] W-03.5 — Definir capacidades de texto, mídia, reação, resposta, grupo, presença, histórico e edição
- [ ] W-03.6 — Definir erro canônico `UnsupportedCapabilityError`
- [ ] W-03.7 — Encapsular o provider Meta atual no mesmo contrato, sem regressão
- [ ] W-03.8 — Criar `MockMessagingEngine` para testes
- [ ] W-03.9 — Criar contract tests executados contra todos os engines
- [ ] W-03.10 — Criar feature flags por provider e por organização
- [ ] W-03.11 — Impedir que a interface exiba ação não suportada pelo engine ativo

**Referência técnica:** interface e capability matrix do OpenWA, reimplementadas segundo o domínio Innov.

## Sprint W-04 — Evolução do banco sem domínio paralelo

**Estado:** pendente  
**Dependências:** W-02 e W-03

- [ ] W-04.1 — Inventariar tabelas atuais `whatsapp_*`
- [ ] W-04.2 — Decidir por evolução compatível ou renomeação futura para `channel_*`
- [ ] W-04.3 — Adicionar `provider_type` e `provider_account_id` onde necessário
- [ ] W-04.4 — Criar tabela de identidades externas sem duplicar Cliente 360
- [ ] W-04.5 — Criar tabela de aliases e mapeamentos PN/LID
- [ ] W-04.6 — Criar tabela de comandos e idempotência
- [ ] W-04.7 — Criar outbox durável
- [ ] W-04.8 — Criar inbox de eventos brutos sanitizados
- [ ] W-04.9 — Criar dead-letter queue
- [ ] W-04.10 — Criar ledger de tentativas de entrega
- [ ] W-04.11 — Aplicar RLS e revogar escrita direta de usuários autenticados
- [ ] W-04.12 — Criar testes negativos multiempresa
- [ ] W-04.13 — Criar migration de rollback lógico, sem perda de histórico

**Gate W-G04:** nenhum contato, conversa, mensagem ou documento poderá existir duplicado apenas porque veio de provider diferente.

---

# Marco M-2 — Runtime persistente do gateway

Objetivo: criar um serviço de conexão longa, isolado do frontend Next.js e do runtime serverless.

## Sprint W-05 — Esqueleto do gateway

**Estado:** pendente  
**Dependências:** W-03 e W-04

- [ ] W-05.1 — Criar workspace/serviço `apps/messaging-gateway`
- [ ] W-05.2 — Definir Node.js compatível com a versão aprovada do Baileys
- [ ] W-05.3 — Criar configuração tipada e validação de environment
- [ ] W-05.4 — Criar servidor de health, readiness e metrics
- [ ] W-05.5 — Criar API interna autenticada entre Innov e gateway
- [ ] W-05.6 — Criar assinatura HMAC de comandos e eventos
- [ ] W-05.7 — Criar proteção contra replay
- [ ] W-05.8 — Criar correlation ID e causation ID
- [ ] W-05.9 — Criar shutdown gracioso
- [ ] W-05.10 — Criar container não-root
- [ ] W-05.11 — Criar limites de CPU, memória e arquivo
- [ ] W-05.12 — Criar configuração de rede sem acesso desnecessário ao banco principal
- [ ] W-05.13 — Criar cliente fake para testes locais sem WhatsApp

**Decisão:** Baileys não será instalado no processo da aplicação web nem em função serverless.

## Sprint W-06 — Adapter Baileys

**Estado:** pendente  
**Dependências:** W-05

- [ ] W-06.1 — Fixar versão exata do Baileys; proibir `latest`
- [ ] W-06.2 — Criar `BaileysEngineAdapter`
- [ ] W-06.3 — Encapsular criação do socket
- [ ] W-06.4 — Encapsular eventos de conexão
- [ ] W-06.5 — Encapsular envio de texto
- [ ] W-06.6 — Encapsular envio e download de mídia
- [ ] W-06.7 — Encapsular receipts
- [ ] W-06.8 — Encapsular replies, reactions e mensagens citadas
- [ ] W-06.9 — Encapsular grupos somente se aprovados na capability matrix
- [ ] W-06.10 — Normalizar erros nativos
- [ ] W-06.11 — Mapear identificadores PN/LID/grupo/newsletter
- [ ] W-06.12 — Preservar payload técnico sanitizado para diagnóstico
- [ ] W-06.13 — Criar contract tests do adapter
- [ ] W-06.14 — Criar teste que falha se um tipo Baileys escapar do diretório do adapter

**Reaproveitamento:** composição de sockets, eventos tipados, fluxo de mensagens, mutexes, retries e normalização observados no Baileys. Não copiar o exemplo de produção nem o armazenamento em arquivos.

## Sprint W-07 — Armazenamento criptográfico da sessão

**Estado:** pendente  
**Dependências:** W-05 e W-06

- [ ] W-07.1 — Criar interface `SessionCredentialStore`
- [ ] W-07.2 — Modelar credenciais, keys e versões separadamente
- [ ] W-07.3 — Implementar transações de leitura e escrita
- [ ] W-07.4 — Implementar optimistic concurrency control
- [ ] W-07.5 — Implementar criptografia por envelope
- [ ] W-07.6 — Separar data encryption key por sessão
- [ ] W-07.7 — Definir chave-mestra fora do banco
- [ ] W-07.8 — Impedir logs de material criptográfico
- [ ] W-07.9 — Criar rotação e recriptografia
- [ ] W-07.10 — Criar backup e restauração testados
- [ ] W-07.11 — Criar exclusão criptográfica
- [ ] W-07.12 — Criar auditoria de acesso às credenciais
- [ ] W-07.13 — Criar testes de corrupção, versão e concorrência
- [ ] W-07.14 — Proibir `useMultiFileAuthState` fora de testes descartáveis

**Referências:** contrato de auth state do Baileys e persistência SQL do `whatsmeow`.

## Sprint W-08 — Single writer, lease e lifecycle

**Estado:** pendente  
**Dependências:** W-07

- [ ] W-08.1 — Criar `session_runtime_leases`
- [ ] W-08.2 — Implementar lease com expiração
- [ ] W-08.3 — Implementar fencing token crescente
- [ ] W-08.4 — Impedir duas instâncias escritoras para a mesma sessão
- [ ] W-08.5 — Criar state machine de conexão
- [ ] W-08.6 — Implementar QR e pairing code efêmeros
- [ ] W-08.7 — Proibir persistência permanente de QR
- [ ] W-08.8 — Implementar reconnect com backoff e jitter
- [ ] W-08.9 — Classificar logout, restrição, falha transitória e ação humana
- [ ] W-08.10 — Implementar takeover controlado após lease expirado
- [ ] W-08.11 — Criar kill switch global e por sessão
- [ ] W-08.12 — Criar teste de processo zumbi
- [ ] W-08.13 — Criar teste de reinício durante atualização de credenciais
- [ ] W-08.14 — Criar teste de restauração em nova instância

**Gate W-G08:** nenhuma escala horizontal antes de o teste de single writer e fencing passar.

---

# Marco M-3 — Pipeline de mensagens

Objetivo: receber e enviar com idempotência, persistência, retry classificado e rastreabilidade.

## Sprint W-09 — Ingress e normalização

**Estado:** pendente  
**Dependências:** W-06 e W-08

- [ ] W-09.1 — Criar envelope canônico de eventos
- [ ] W-09.2 — Persistir evento antes de dispatch
- [ ] W-09.3 — Criar idempotency key por provider e mensagem
- [ ] W-09.4 — Normalizar mensagens encapsuladas, efêmeras e view-once conforme política
- [ ] W-09.5 — Normalizar replies e quoted messages
- [ ] W-09.6 — Normalizar receipts
- [ ] W-09.7 — Normalizar alterações de contato e grupo
- [ ] W-09.8 — Resolver organização e conta antes de expor o evento
- [ ] W-09.9 — Criar estados `RECEIVED_RAW`, `NORMALIZED`, `PERSISTED`, `DISPATCHED` e falhas
- [ ] W-09.10 — Criar DLQ para evento impossível de processar
- [ ] W-09.11 — Criar replay administrativo idempotente
- [ ] W-09.12 — Criar testes de evento duplicado e fora de ordem
- [ ] W-09.13 — Criar teste de payload desconhecido sem derrubar a sessão
- [ ] W-09.14 — Impedir IA antes do estado `PERSISTED`

## Sprint W-10 — Outbox, comandos e entrega

**Estado:** pendente  
**Dependências:** W-09

- [ ] W-10.1 — Criar comando canônico de envio
- [ ] W-10.2 — Persistir comando antes do envio
- [ ] W-10.3 — Separar criação da mensagem e tentativa de entrega
- [ ] W-10.4 — Criar worker de outbox
- [ ] W-10.5 — Ordenar comandos por conversa quando necessário
- [ ] W-10.6 — Criar idempotência por comando
- [ ] W-10.7 — Criar ledger de tentativas
- [ ] W-10.8 — Classificar falhas retryable e terminal
- [ ] W-10.9 — Implementar backoff limitado
- [ ] W-10.10 — Implementar circuit breaker por sessão
- [ ] W-10.11 — Impedir regressão de status
- [ ] W-10.12 — Criar reconciliação de comando sem confirmação
- [ ] W-10.13 — Criar DLQ de saída
- [ ] W-10.14 — Criar reprocessamento administrativo com justificativa
- [ ] W-10.15 — Criar limite de volume por organização e sessão
- [ ] W-10.16 — Criar testes de crash antes e depois do envio

## Sprint W-11 — Identidades, contatos e deduplicação

**Estado:** pendente  
**Dependências:** W-09

- [ ] W-11.1 — Normalizar JIDs sem expor o formato ao domínio
- [ ] W-11.2 — Persistir identidade PN
- [ ] W-11.3 — Persistir identidade LID
- [ ] W-11.4 — Persistir aliases e confiança do mapeamento
- [ ] W-11.5 — Reconciliar LID com telefone sem duplicar contato
- [ ] W-11.6 — Separar identidade observada de vínculo confirmado com Cliente 360
- [ ] W-11.7 — Criar merge transacional de contatos duplicados
- [ ] W-11.8 — Preservar histórico e aliases após merge
- [ ] W-11.9 — Criar cache de resolução com invalidação
- [ ] W-11.10 — Criar testes de mudança de identidade
- [ ] W-11.11 — Criar testes de conflito entre organizações

## Sprint W-12 — Mídia segura

**Estado:** pendente  
**Dependências:** W-09 e W-10

- [ ] W-12.1 — Criar `MediaReference` canônico
- [ ] W-12.2 — Fazer streaming; evitar base64 persistente como padrão
- [ ] W-12.3 — Aplicar limite por tipo e tamanho
- [ ] W-12.4 — Criar bucket de quarentena privado
- [ ] W-12.5 — Criar antivírus e classificação
- [ ] W-12.6 — Extrair MIME real e comparar com declaração
- [ ] W-12.7 — Gerar hash e deduplicar arquivo
- [ ] W-12.8 — Criar thumbnail de forma isolada
- [ ] W-12.9 — Criar transcrição de áudio somente sob política aprovada
- [ ] W-12.10 — Criar OCR somente sob política aprovada
- [ ] W-12.11 — Remover metadados sensíveis quando aplicável
- [ ] W-12.12 — Criar URL assinada temporária
- [ ] W-12.13 — Criar retry de download sem duplicar arquivo
- [ ] W-12.14 — Criar testes de arquivo malicioso, truncado, enorme e MIME falso

---

# Marco M-4 — Produto, mensagens padrão e IA

Objetivo: integrar o provider ao aplicativo existente e às rotinas reais da Innovar.

## Sprint W-13 — Inbox multiprovider e atendimento

**Estado:** pendente  
**Dependências:** W-09, W-10 e W-11

- [ ] W-13.1 — Exibir provider e estado da sessão sem poluir a experiência
- [ ] W-13.2 — Unificar conversas oficiais e não oficiais quando pertencem ao mesmo contato
- [ ] W-13.3 — Preservar origem de cada mensagem
- [ ] W-13.4 — Criar filtros por conta, fila, responsável, obra e estado
- [ ] W-13.5 — Criar atribuição e transferência
- [ ] W-13.6 — Criar notas internas
- [ ] W-13.7 — Criar indicadores de humano, automação e IA
- [ ] W-13.8 — Criar presença de operador sem confundir com presença do WhatsApp
- [ ] W-13.9 — Criar atualização em tempo real pelo backend do Innov
- [ ] W-13.10 — Criar estados offline, reconnecting, degraded e action required
- [ ] W-13.11 — Desabilitar ações incompatíveis pela capability matrix
- [ ] W-13.12 — Validar mobile, tablet e desktop
- [ ] W-13.13 — Testar dois agentes concorrentes na mesma conversa

**Referência de UX:** WhatsControl e wacrm. A implementação visual deverá seguir `diretrizes/UI-UX-PRO-MAX.md`.

## Sprint W-14 — Playbooks e fontes canônicas

**Estado:** pendente  
**Dependências:** W-13

- [ ] W-14.1 — Reaproveitar `whatsapp_content_bindings`
- [ ] W-14.2 — Garantir que mensagens padrão não sejam duplicadas no provider
- [ ] W-14.3 — Criar `communication_playbooks` e versões quando necessário
- [ ] W-14.4 — Vincular playbooks a modelos, propostas, contratos, aditivos e documentos
- [ ] W-14.5 — Definir schema de variáveis
- [ ] W-14.6 — Validar variável ausente, extra e incompatível
- [ ] W-14.7 — Registrar snapshot, versão e SHA-256 no envio
- [ ] W-14.8 — Classificar conteúdo em determinístico, assistido e autônomo limitado
- [ ] W-14.9 — Bloquear reescrita livre de conteúdo contratual
- [ ] W-14.10 — Criar aprovação humana para conteúdo sensível
- [ ] W-14.11 — Criar teste de reprodução histórica de mensagem
- [ ] W-14.12 — Criar teste de atualização de modelo sem alterar histórico

## Sprint W-15 — Ponte de IA

**Estado:** pendente  
**Dependências:** W-09, W-13 e W-14

- [ ] W-15.1 — Criar interface `AiProvider`
- [ ] W-15.2 — Criar `AiOrchestrator` independente do canal
- [ ] W-15.3 — Criar `ContextBuilder` com minimização de dados
- [ ] W-15.4 — Criar busca lexical
- [ ] W-15.5 — Criar busca vetorial opcional com pgvector
- [ ] W-15.6 — Criar retrieval híbrido e fallback
- [ ] W-15.7 — Filtrar por organização, cliente, obra, documento, versão e validade
- [ ] W-15.8 — Criar precedência de workflow determinístico
- [ ] W-15.9 — Criar limite atômico por conversa
- [ ] W-15.10 — Criar limite por organização e custo
- [ ] W-15.11 — Criar estados de handoff persistente
- [ ] W-15.12 — Desativar IA quando humano assumir
- [ ] W-15.13 — Criar resumo de handoff
- [ ] W-15.14 — Criar citações internas das fontes recuperadas
- [ ] W-15.15 — Criar validação de números, datas, valores e compromissos
- [ ] W-15.16 — Impedir que documento recuperado se torne instrução do sistema
- [ ] W-15.17 — Criar audit log de execução, modelo, fontes, ferramentas e custo
- [ ] W-15.18 — Criar modo `draft_only` antes de qualquer auto-reply

**Referências:** `wacrm` para RAG, limite, handoff e prioridade de workflow; `wechat-bot` para separar canal e provider de IA.

## Sprint W-16 — Plugins e automações governadas

**Estado:** pendente  
**Dependências:** W-14 e W-15

- [ ] W-16.1 — Criar contrato `MessagePlugin`
- [ ] W-16.2 — Criar prioridade e short-circuit explícitos
- [ ] W-16.3 — Criar plugin de consentimento
- [ ] W-16.4 — Criar plugin anti-spam
- [ ] W-16.5 — Criar plugin de qualificação de lead
- [ ] W-16.6 — Criar plugin de status de obra
- [ ] W-16.7 — Criar plugin de solicitação de documento
- [ ] W-16.8 — Criar plugin de abertura de SAC
- [ ] W-16.9 — Criar plugin de handoff humano
- [ ] W-16.10 — Criar plugin de IA como último recurso
- [ ] W-16.11 — Criar permissões e feature flags por plugin
- [ ] W-16.12 — Criar testes de ordem e conflito

**Referência conceitual:** registries de comandos observados nos bots Baileys. Nenhum plugin de entretenimento ou download externo será incorporado.

---

# Marco M-5 — Segurança, observabilidade e qualidade

Objetivo: provar que o sistema falha de forma controlada e pode ser operado sem depender de conhecimento tácito.

## Sprint W-17 — Segurança e threat model

**Estado:** pendente  
**Dependências:** W-08, W-10, W-12 e W-15

- [ ] W-17.1 — Criar threat model STRIDE
- [ ] W-17.2 — Mapear ativos: sessão, chaves, mensagens, mídia, contatos e IA
- [ ] W-17.3 — Mapear fronteiras de confiança
- [ ] W-17.4 — Criar controles contra replay
- [ ] W-17.5 — Criar controles contra command injection
- [ ] W-17.6 — Criar controles contra prompt injection
- [ ] W-17.7 — Criar allowlist de ferramentas de IA
- [ ] W-17.8 — Criar aprovação para escritas críticas
- [ ] W-17.9 — Criar redaction de logs
- [ ] W-17.10 — Criar retenção e expurgo
- [ ] W-17.11 — Criar auditoria de leitura de conversa sensível
- [ ] W-17.12 — Criar teste de acesso cruzado entre organizações
- [ ] W-17.13 — Criar plano de resposta a comprometimento de sessão
- [ ] W-17.14 — Criar scanner de segredo no CI
- [ ] W-17.15 — Criar SBOM e verificação de dependências

## Sprint W-18 — Observabilidade e operação

**Estado:** pendente  
**Dependências:** W-10 e W-17

- [ ] W-18.1 — Definir métricas de sessão
- [ ] W-18.2 — Definir métricas de ingress e egress
- [ ] W-18.3 — Definir métricas de retry e DLQ
- [ ] W-18.4 — Definir métricas de mídia
- [ ] W-18.5 — Definir métricas de IA e custo
- [ ] W-18.6 — Criar logs estruturados
- [ ] W-18.7 — Criar traces distribuídos
- [ ] W-18.8 — Criar dashboard operacional
- [ ] W-18.9 — Criar alertas de reconnect loop
- [ ] W-18.10 — Criar alerta de crescimento de DLQ
- [ ] W-18.11 — Criar alerta de perda de lease
- [ ] W-18.12 — Criar alerta de falha de persistência de keys
- [ ] W-18.13 — Criar runbook de sessão desconectada
- [ ] W-18.14 — Criar runbook de atualização do Baileys
- [ ] W-18.15 — Criar runbook de rollback

## Sprint W-19 — Testes funcionais, chaos e performance

**Estado:** pendente  
**Dependências:** W-17 e W-18

- [ ] W-19.1 — Unit tests dos modelos canônicos
- [ ] W-19.2 — Contract tests de engines
- [ ] W-19.3 — Integration tests com PostgreSQL real
- [ ] W-19.4 — E2E com número exclusivo de homologação
- [ ] W-19.5 — Teste de QR e pairing code
- [ ] W-19.6 — Teste de restart durante mensagem
- [ ] W-19.7 — Teste de restart durante atualização de key
- [ ] W-19.8 — Teste de perda de rede
- [ ] W-19.9 — Teste de evento duplicado
- [ ] W-19.10 — Teste de receipt fora de ordem
- [ ] W-19.11 — Teste de mídia corrompida
- [ ] W-19.12 — Teste de banco temporariamente indisponível
- [ ] W-19.13 — Teste de processo zumbi
- [ ] W-19.14 — Teste de duas réplicas disputando sessão
- [ ] W-19.15 — Teste de upgrade e downgrade do engine
- [ ] W-19.16 — Teste de restore de sessão em infraestrutura nova
- [ ] W-19.17 — Benchmark de memória por sessão
- [ ] W-19.18 — Benchmark de throughput sustentável
- [ ] W-19.19 — Benchmark de latência ponta a ponta
- [ ] W-19.20 — Registrar limites observados, sem extrapolação não medida

**Gate W-G19:** nenhum número real de operação antes de todos os testes P0 passarem repetidamente.

---

# Marco M-6 — Homologação e promoção controlada

Objetivo: liberar de forma reversível, restrita e observável.

## Sprint W-20 — Homologação interna

**Estado:** pendente  
**Dependências:** W-19

- [ ] W-20.1 — Usar número dedicado e autorizado
- [ ] W-20.2 — Habilitar somente organização de homologação
- [ ] W-20.3 — Habilitar somente usuários autorizados
- [ ] W-20.4 — Desabilitar campanhas
- [ ] W-20.5 — Desabilitar auto-reply de IA inicialmente
- [ ] W-20.6 — Habilitar apenas texto e mídia aprovada
- [ ] W-20.7 — Executar roteiro diário de conexão, envio, recebimento e restart
- [ ] W-20.8 — Validar métricas e alertas
- [ ] W-20.9 — Validar expurgo e exclusão de sessão
- [ ] W-20.10 — Validar handoff e atendimento multiagente
- [ ] W-20.11 — Registrar incidentes e criar vacinas
- [ ] W-20.12 — Produzir relatório de homologação

## Sprint W-21 — Piloto restrito

**Estado:** pendente  
**Dependências:** W-20

- [ ] W-21.1 — Definir escopo e usuários do piloto
- [ ] W-21.2 — Definir SLOs e critérios de abortar
- [ ] W-21.3 — Criar rollout por feature flag
- [ ] W-21.4 — Criar rollback de um clique
- [ ] W-21.5 — Monitorar falhas, reconnects, bloqueios e duplicações
- [ ] W-21.6 — Comparar operação com provider oficial
- [ ] W-21.7 — Medir custo operacional real
- [ ] W-21.8 — Validar suporte e runbooks
- [ ] W-21.9 — Revisar riscos jurídicos, contratuais e de privacidade
- [ ] W-21.10 — Decidir promover, manter restrito ou encerrar

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
- [ ] W-22.9 — Registrar dependências e licenças
- [ ] W-22.10 — Garantir CI e E2E verdes
- [ ] W-22.11 — Registrar decisão final de produção
- [ ] W-22.12 — Encerrar PR somente após revisão técnica e de segurança

---

## 6. Mapa de reaproveitamento

| Projeto | Técnica ou padrão a reaproveitar | Forma de uso no Innov | Não reaproveitar |
|---|---|---|---|
| Baileys | composição de sockets, eventos, auth state, mutexes, retries, PN/LID e mídia | adapter próprio e runtime persistente | exemplo com arquivos como storage de produção; tipos vazando ao domínio |
| OpenWA | engine interface, modelo neutro, capability matrix, HMAC, health e audit | contratos internos e testes de conformidade | gateway inteiro e banco paralelo sem necessidade |
| whatsmeow | session store SQL, migrations, múltiplos dispositivos e LID map | modelagem transacional equivalente em TypeScript/PostgreSQL | introduzir Go sem justificativa operacional |
| wacrm | RAG híbrido, precedência de workflows, handoff, limite atômico e rate limit | AI Orchestrator e base de conhecimento do Innov | CRM, contas ou identidade visual paralelos |
| Evolution API | adapters de eventos, filas, storage e integrações | portas substituíveis e event publishers | instalar todos os brokers e integrações por antecipação |
| whatsapp-web.js | comportamento do cliente Web e cobertura funcional | laboratório/oracle de compatibilidade | engine principal do Innov ou Chromium dentro do app web |
| wechat-bot | separação entre canal e provider de IA, allowlists | interfaces `ChannelProvider` e `AiProvider` | persistência e segurança simplificadas |
| WhatsControl | inbox, multiagente e bot-humano | pesquisa de UX | backend e código sem licença clara |
| Knightbot/userbots | command registry e plugins | contrato governado de plugins | plugins de downloads, entretenimento e sessões inseguras |
| whatsapp-web-reveng | entendimento histórico de protocolo e criptografia | referência educacional | dependência ou implementação atual |

---

## 7. Artefatos planejados

```text
apps/messaging-gateway/
├── src/config/
├── src/api/
├── src/engines/
│   ├── contracts/
│   ├── baileys/
│   └── mock/
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
├── domain.ts
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

Os caminhos definitivos devem respeitar a arquitetura existente e podem ser ajustados na Sprint W-02, desde que a decisão seja registrada.

---

## 8. Critérios globais de conclusão

O subprojeto não estará concluído até que todos os itens abaixo estejam marcados:

- [ ] Contratos provider-neutral implementados
- [ ] Provider Meta preservado sem regressão
- [ ] Adapter Baileys confinado
- [ ] Runtime persistente separado do Next.js
- [ ] Session store criptografado e transacional
- [ ] Single writer com fencing comprovado
- [ ] Ingress durável e idempotente
- [ ] Outbox e retry ledger comprovados
- [ ] Identidade PN/LID sem duplicação de contatos
- [ ] Mídia com quarentena e antivírus
- [ ] Inbox multiprovider homologada
- [ ] Fontes canônicas preservadas
- [ ] IA independente do canal, inicialmente em modo rascunho
- [ ] Handoff humano persistente
- [ ] Threat model aprovado
- [ ] Logs sem segredos
- [ ] Métricas, alertas e runbooks ativos
- [ ] Testes de restart, concorrência e restore verdes
- [ ] Piloto restrito concluído
- [ ] Decisão explícita de promover, restringir ou encerrar
- [ ] Documentação canônica atualizada
- [ ] CI e E2E verdes

---

## 9. Registro de reordenação

| Data | Alteração | Justificativa | Aprovado por |
|---|---|---|---|
| — | Nenhuma | Ordem inicial do plano | — |

---

## 10. Registro de bloqueios

| Sprint | Bloqueio | Evidência | Próxima ação |
|---|---|---|---|
| — | Nenhum bloqueio registrado | — | — |

---

## 11. Próxima ação autorizada

A próxima sprint autorizada é **W-01 — ADR, licença e modelo de risco**.

Nenhuma dependência Baileys deve ser adicionada antes do fechamento desse gate.