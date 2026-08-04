# Inventário de execução — Provider WhatsApp Web não oficial

**Projeto pai:** Etapa 22 — WhatsApp e atendimento omnichannel  
**Branch de execução:** `feature/etapa-22-provider-whatsapp-web-baileys`  
**PR:** #40  
**Status:** W-06 concluída; adapter confinado, runtime e sessão real ainda bloqueados  
**Provider não oficial estudado:** `@whiskeysockets/baileys@7.0.0-rc13`, somente por adapter próprio  
**Produção:** bloqueada  
**Última atualização:** 04 de agosto de 2026  
**Documentos complementares:** [`SPEC.md`](./SPEC.md), [`SCHEMA-W04.md`](./SCHEMA-W04.md), [`GATEWAY-W05.md`](./GATEWAY-W05.md), [`ADAPTER-BAILEYS-W06.md`](./ADAPTER-BAILEYS-W06.md)

---

## 1. Objetivo e fronteira

Este inventário governa a construção incremental de uma arquitetura multiprovider própria para o Innov. O objetivo é reaproveitar técnicas, invariantes, abstrações, padrões de persistência, retries, eventos e handoff estudados em projetos de referência, sem copiar produtos inteiros nem criar um domínio paralelo.

```text
engine de canal
      ↓
adapter anticorrupção
      ↓
contratos canônicos
      ↓
contas, contatos, conversas e mensagens existentes
      ↓
CRM, Cliente 360, obras, contratos, SAC e documentos
```

O PR #39 contém a base oficial Meta Cloud API e o domínio da Etapa 22. O PR #40 adiciona a arquitetura multiprovider de forma incremental. Até a W-06 foram concluídos contratos canônicos, contratos de engine, capabilities, adapter Meta, mock, policy gates, armazenamento técnico durável, gateway isolado com cliente fake e adapter Baileys confinado. O pacote está presente apenas no workspace do gateway, mas não foi registrado como runtime e não possui sessão, credenciais, QR operacional, número real ou autorização de produção.

---

## 2. Regras obrigatórias

1. No máximo uma sprint em andamento.
2. Check exige arquivo, migration, teste, log, métrica ou decisão verificável.
3. Nenhum segredo, QR, cookie, token, número real ou material de sessão no repositório.
4. Técnica externa só pode ser adaptada após licença, origem, vantagem, testes e aviso de terceiros.
5. Tipos nativos do provider não atravessam o adapter.
6. Escala horizontal futura exige single writer, lease e fencing token.
7. Inbound deve ser validado, normalizado, deduplicado e persistido antes de workflow ou IA.
8. Ordem obrigatória: política → consentimento → workflow → regra → fatos → IA → aprovação/handoff.
9. São proibidos spam, evasão, spoofing e rotação de contas.
10. Kill switch será obrigatório antes de qualquer runtime real.
11. Na dúvida, falhar fechado, preservar evidência e encaminhar para humano.
12. Uma execução isolada não prova homologação.
13. Lifecycle scripts de dependências externas permanecem bloqueados salvo revisão específica.
14. Licença do pacote principal não substitui revisão da árvore transitiva.

---

## 3. Baseline da Etapa 22

- [x] B-01 — Aplicativo `/app/whatsapp`
- [x] B-02 — Caixa de entrada e histórico
- [x] B-03 — Contas, contatos e conversas
- [x] B-04 — Mensagens e status monotônicos
- [x] B-05 — Vínculos com cliente, obra, contrato, oportunidade e SAC
- [x] B-06 — `whatsapp_content_bindings` com fontes canônicas
- [x] B-07 — Resolução de documentos versionados
- [x] B-08 — Snapshot e SHA-256 da fonte usada
- [x] B-09 — RLS, RPCs e histórico protegido
- [x] B-10 — Meta Cloud API como implementação oficial inicial
- [x] B-11 — Webhook oficial com HMAC e idempotência
- [x] B-12 — Validador da Etapa 22 no CI

---

# Marco M-0 — Governança e fronteiras

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
- [x] W-00.12 — Classificar biblioteca, driver, gateway, CRM, bot e pesquisa
- [x] W-00.13 — Selecionar Baileys como primeiro engine não oficial estudado
- [x] W-00.14 — Definir técnicas reaproveitáveis sem copiar produtos completos
- [x] W-00.15 — Criar inventário e SPEC

**Evidência:** análise de referências, `SPEC.md` e este inventário.

## Sprint W-01 — ADR, licença e modelo de risco

**Estado:** concluída  
**Dependências:** W-00

- [x] W-01.1 — ADR do provider opcional
- [x] W-01.2 — Domínio compartilhado e runtimes separados
- [x] W-01.3 — Matriz de licenças
- [x] W-01.4 — `THIRD_PARTY_NOTICES.md`
- [x] W-01.5 — Critérios de número autorizado
- [x] W-01.6 — Termo interno de aceite de risco
- [x] W-01.7 — Consentimento, opt-out e bloqueio
- [x] W-01.8 — Casos proibidos
- [x] W-01.9 — Processo de desligamento e remoção de sessão
- [x] W-01.10 — Critérios de cancelamento do projeto

**Evidência:** ADR-001, matriz de licenças, política de risco e `EVIDENCIAS-W01.md`.

**Gate W-G01:** concluído no escopo documental; nenhum runtime foi autorizado.

---

# Marco M-1 — Domínio canônico e persistência multiprovider

## Sprint W-02 — Modelo canônico de canal, identidade e mensagem

**Estado:** concluída  
**Dependências:** W-01

- [x] W-02.1 — Definir `ChannelProviderType`
  - [x] W-02.1.1 — `META_CLOUD`
  - [x] W-02.1.2 — `WHATSAPP_WEB_BAILEYS`
  - [x] W-02.1.3 — `WEB_CHAT`
  - [x] W-02.1.4 — Providers futuros reservados
- [x] W-02.2 — Definir `CanonicalIdentity`
- [x] W-02.3 — Namespaces PHONE, PN, LID, GROUP, NEWSLETTER e WEB_USER
- [x] W-02.4 — Definir `CanonicalMessage`
- [x] W-02.5 — Definir `CanonicalMedia`
- [x] W-02.6 — Definir `CanonicalReceipt`
- [x] W-02.7 — Definir `CanonicalConversation`
- [x] W-02.8 — Metadata específica separada do domínio
- [x] W-02.9 — Versionamento dos contratos
- [x] W-02.10 — Gate contra imports Baileys fora do adapter
- [x] W-02.11 — Mapear estruturas existentes para o modelo neutro
- [x] W-02.12 — Compatibilidade retroativa com Meta

**Evidência:** `lib/messaging/domain.ts`, compatibilidade, testes, scanner, `CONTRATOS-CANONICOS-V1.md` e `EVIDENCIAS-W02.md`.

**Gate W-G02:** concluído; Baileys ainda não estava instalado nessa sprint.

## Sprint W-03 — Contrato de engine e matriz de capacidades

**Estado:** concluída  
**Dependências:** W-02

- [x] W-03.1 — Criar `MessagingEngine`
- [x] W-03.2 — Criar `SessionEngine`
- [x] W-03.3 — Criar `EngineEventSource`
- [x] W-03.4 — Criar `EngineCapabilityMatrix`
- [x] W-03.5 — Capacidades de texto, mídia, reação, resposta, grupo, presença, histórico e edição
- [x] W-03.6 — Criar `UnsupportedCapabilityError`
- [x] W-03.7 — Encapsular Meta no contrato sem regressão
- [x] W-03.8 — Criar `MockMessagingEngine`
- [x] W-03.9 — Contract tests dos engines
- [x] W-03.10 — Feature flags por provider e organização
- [x] W-03.11 — Ocultar e bloquear ações não suportadas

**Evidência:** engines, capabilities, policy server, testes, gate v3 e `EVIDENCIAS-W03.md`.

**Gate W-G03:** concluído; apenas Meta possui runtime registrado.

## Sprint W-04 — Evolução do banco sem domínio paralelo

**Estado:** concluída  
**Dependências:** W-02 e W-03

- [x] W-04.1 — Inventariar tabelas `whatsapp_*`
- [x] W-04.2 — Decidir evolução compatível e papel técnico de `channel_*`
- [x] W-04.3 — Adicionar `provider_type` e `provider_account_id`
- [x] W-04.4 — Criar identidades externas sem duplicar Cliente 360
- [x] W-04.5 — Criar aliases e mapeamentos PN/LID
- [x] W-04.6 — Criar comandos e idempotência
- [x] W-04.7 — Criar outbox durável
- [x] W-04.8 — Criar inbox de eventos sanitizados
- [x] W-04.9 — Criar DLQ
- [x] W-04.10 — Criar ledger de tentativas
- [x] W-04.11 — Aplicar RLS forçada e revogar escrita direta
- [x] W-04.12 — Criar testes negativos multiempresa
- [x] W-04.13 — Criar rollback lógico sem perda histórica

**Evidências:**

- `supabase/migrations/20260804011500_stage22_multiprovider_storage.sql`;
- `supabase/tests/messaging-multiprovider/fixture.sql`;
- `supabase/tests/messaging-multiprovider/legacy-seed.sql`;
- `supabase/tests/messaging-multiprovider/storage.test.sql`;
- `scripts/run-messaging-multiprovider-db-tests.mjs`;
- `scripts/validate-messaging-storage.mjs`;
- `SCHEMA-W04.md` e `EVIDENCIAS-W04.md`;
- head funcional `3768aabed65710dd2a9c7684fa2f36956921feb6`;
- CI `30868484609` verde;
- File Security E2E `30868484604` verde;
- Vercel verde.

**Decisões fixadas:**

- as sete relações `whatsapp_*` continuam sendo o domínio operacional único;
- `channel_*` guarda somente aliases, comandos, outbox, inbox, tentativas, DLQ e rollback;
- não existem `channel_contacts`, `channel_conversations` ou `channel_messages`;
- identificadores externos são escopados por organização, provider e conta;
- inbox técnica persiste somente representação sanitizada;
- rollback desativa a conta e cancela trabalho pendente sem apagar histórico.

**Gate W-G04:** concluído. Nenhum contato, conversa, mensagem, documento ou vínculo de negócio foi duplicado por provider.

---

# Marco M-2 — Runtime persistente do gateway

## Sprint W-05 — Esqueleto do gateway

**Estado:** concluída  
**Dependências:** W-03 e W-04

- [x] W-05.1 — Criar `apps/messaging-gateway`
- [x] W-05.2 — Definir Node.js compatível
- [x] W-05.3 — Configuração tipada e validação de environment
- [x] W-05.4 — Health, readiness e metrics
- [x] W-05.5 — API interna autenticada
- [x] W-05.6 — Assinatura HMAC de comandos e eventos
- [x] W-05.7 — Proteção contra replay
- [x] W-05.8 — Correlation e causation IDs
- [x] W-05.9 — Shutdown gracioso
- [x] W-05.10 — Container não-root
- [x] W-05.11 — Limites de CPU, memória e arquivo
- [x] W-05.12 — Isolar rede e banco principal
- [x] W-05.13 — Cliente fake sem WhatsApp

**Evidências:**

- `apps/messaging-gateway/package.json` e `tsconfig.json`;
- `apps/messaging-gateway/src/config.ts`;
- `apps/messaging-gateway/src/contracts.ts`;
- `apps/messaging-gateway/src/security.ts`;
- `apps/messaging-gateway/src/replay-guard.ts`;
- `apps/messaging-gateway/src/metrics.ts`;
- `apps/messaging-gateway/src/fake-client.ts`;
- `apps/messaging-gateway/src/server.ts` e `index.ts`;
- `apps/messaging-gateway/Dockerfile` e `compose.yaml`;
- `tests/messaging-gateway.test.ts`;
- `scripts/validate-messaging-gateway.mjs`;
- `scripts/run-messaging-gateway-container-smoke.sh`;
- `GATEWAY-W05.md` e `EVIDENCIAS-W05.md`;
- head funcional `9bb75e77dfe0421378d94e6474614fbc7185d03e`;
- CI `30896714160` verde;
- File Security E2E `30896714116` verde;
- Vercel verde.

**Decisões fixadas:**

- o gateway é um processo Node.js 24 separado do Next.js;
- o único cliente disponível na W-05 é `FakeChannelClient`;
- nenhum SDK de WhatsApp ou dependência própria foi incorporado naquela sprint;
- o gateway não recebe credenciais nem acesso ao banco principal;
- comandos internos exigem HMAC-SHA256, timestamp, nonce e correlation ID;
- replay, body excessivo e configuração inválida falham fechado;
- health, readiness e métricas não expõem payload ou segredo;
- o container executa como `10001:10001`, com filesystem somente leitura e capabilities removidas;
- o smoke test executa a imagem com `--network none`, limites de recursos e shutdown por SIGTERM.

**Gate W-G05:** concluído. O serviço isolado, os testes HTTP, o build e o container endurecido foram executados em CI. O gate não autorizou conexão com WhatsApp, sessão, QR, número real, deploy ou produção.

## Sprint W-06 — Adapter Baileys

**Estado:** concluída  
**Dependências:** W-05

- [x] W-06.1 — Fixar versão exata; proibir `latest`
- [x] W-06.2 — Criar `BaileysEngineAdapter`
- [x] W-06.3 — Encapsular criação do socket
- [x] W-06.4 — Encapsular eventos de conexão
- [x] W-06.5 — Encapsular texto
- [x] W-06.6 — Encapsular mídia
- [x] W-06.7 — Encapsular receipts
- [x] W-06.8 — Encapsular replies, reactions e quoted messages
- [x] W-06.9 — Condicionar grupos à capability matrix
- [x] W-06.10 — Normalizar erros
- [x] W-06.11 — Mapear PN, LID, grupo e newsletter
- [x] W-06.12 — Preservar metadata técnica sanitizada
- [x] W-06.13 — Criar contract tests
- [x] W-06.14 — Falhar se tipo Baileys escapar do adapter

**Evidências:**

- `apps/messaging-gateway/package.json` com `@whiskeysockets/baileys@7.0.0-rc13`;
- `apps/messaging-gateway/src/engines/baileys/contracts.ts`;
- `apps/messaging-gateway/src/engines/baileys/jid.ts`;
- `apps/messaging-gateway/src/engines/baileys/content.ts`;
- `apps/messaging-gateway/src/engines/baileys/errors.ts`;
- `apps/messaging-gateway/src/engines/baileys/capabilities.ts`;
- `apps/messaging-gateway/src/engines/baileys/official-factory.ts`;
- `apps/messaging-gateway/src/engines/baileys/adapter.ts`;
- `apps/messaging-gateway/src/engines/baileys/index.ts`;
- `tests/messaging-baileys-adapter.test.ts` — 25 testes;
- `tests/messaging-boundary.test.ts`;
- `scripts/validate-messaging-boundaries.mjs` — `messaging-engine-boundary-v4`;
- `scripts/validate-messaging-gateway.mjs` — `messaging-gateway-boundary-v4`;
- `scripts/validate-messaging-storage.mjs` — `messaging-storage-boundary-v2`;
- `scripts/verify-w06-lockfile.mjs` — `messaging-w06-lockfile-v1`;
- `THIRD_PARTY_NOTICES.md`;
- `ADAPTER-BAILEYS-W06.md` e `EVIDENCIAS-W06.md`;
- head funcional `9e94603cbd9e50dc44e5f848a2aa5e195a8d9a43`;
- CI `30904107383` verde;
- File Security E2E `30904107397` verde.

**Decisões fixadas:**

- o pacote existe somente no workspace do gateway;
- a versão é exata e sem faixa flutuante;
- lifecycle scripts externos permanecem bloqueados;
- o lockfile regenerado deve possuir SHA-256 `d681efc5acb88940b5a81f2019808ed5ef9d8cde9fa8d36d178076423dc35ed9`;
- tipos nativos permanecem confinados ao diretório do adapter;
- a fábrica oficial usa import dinâmico e autorização explícita;
- `DENIED` é o estado padrão e lança `EXTERNAL_SOCKET_BLOCKED`;
- o gateway ativo continua usando `FakeChannelClient`;
- Baileys não está registrado em `IMPLEMENTED_CHANNEL_PROVIDER_TYPES`;
- QR recebido é reduzido a `pairingChallengeAvailable: true` e `qrPersisted: false`; o valor não é propagado;
- mídia outbound exige URL HTTPS assinada;
- mídia inbound permanece referência do provider, sem download;
- grupos e newsletters são bloqueados por padrão;
- a licença MIT do pacote principal não elimina revisão da árvore transitiva;
- `libsignal` e `whatsapp-rust-bridge` permanecem sob revisão jurídica/SBOM antes de piloto ou produção.

**Gate W-G06:** concluído no escopo de adapter e testes sem rede. Nenhum socket oficial foi aberto, nenhuma autenticação foi resolvida e nenhum material de sessão foi criado. A conclusão não autoriza runtime, QR/pairing, número real, deploy, piloto ou produção.

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
- [ ] W-07.9 — Criar rotação e recriptografia
- [ ] W-07.10 — Criar backup e restore testados
- [ ] W-07.11 — Criar exclusão criptográfica
- [ ] W-07.12 — Auditar acesso às credenciais
- [ ] W-07.13 — Testar corrupção, versão e concorrência
- [ ] W-07.14 — Proibir `useMultiFileAuthState` fora de testes descartáveis

## Sprint W-08 — Single writer, lease e lifecycle

**Estado:** pendente  
**Dependências:** W-07

- [ ] W-08.1 — Criar `session_runtime_leases`
- [ ] W-08.2 — Lease com expiração
- [ ] W-08.3 — Fencing token crescente
- [ ] W-08.4 — Impedir duas instâncias escritoras
- [ ] W-08.5 — State machine de conexão
- [ ] W-08.6 — QR e pairing efêmeros
- [ ] W-08.7 — Proibir persistência de QR
- [ ] W-08.8 — Reconnect com backoff e jitter
- [ ] W-08.9 — Classificar logout, restrição, transitório e ação humana
- [ ] W-08.10 — Takeover após lease expirado
- [ ] W-08.11 — Kill switch global e por sessão
- [ ] W-08.12 — Testar processo zumbi
- [ ] W-08.13 — Testar reinício durante atualização de credenciais
- [ ] W-08.14 — Testar restauração em nova instância

**Gate W-G08:** escala horizontal somente após single writer e fencing aprovados.

---

# Marco M-3 — Pipeline de mensagens

## Sprint W-09 — Ingress e normalização

**Estado:** pendente  
**Dependências:** W-06 e W-08

- [ ] W-09.1 — Criar envelope canônico
- [ ] W-09.2 — Persistir antes do dispatch
- [ ] W-09.3 — Criar idempotency key
- [ ] W-09.4 — Normalizar wrappers, efêmeras e view-once conforme política
- [ ] W-09.5 — Normalizar replies e quoted
- [ ] W-09.6 — Normalizar receipts
- [ ] W-09.7 — Normalizar contato e grupo
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
- [ ] W-10.8 — Classificar retryable e terminal
- [ ] W-10.9 — Backoff limitado
- [ ] W-10.10 — Circuit breaker
- [ ] W-10.11 — Impedir regressão de status
- [ ] W-10.12 — Reconciliar comando sem confirmação
- [ ] W-10.13 — DLQ outbound
- [ ] W-10.14 — Reprocessar com justificativa
- [ ] W-10.15 — Limitar volume por organização e sessão
- [ ] W-10.16 — Testar crash antes e depois do envio

## Sprint W-11 — Identidades, contatos e deduplicação

**Estado:** pendente  
**Dependências:** W-09

- [ ] W-11.1 — Normalizar JIDs
- [ ] W-11.2 — Persistir PN
- [ ] W-11.3 — Persistir LID
- [ ] W-11.4 — Persistir aliases e confiança
- [ ] W-11.5 — Reconciliar LID e telefone sem duplicação
- [ ] W-11.6 — Separar identidade observada de vínculo confirmado
- [ ] W-11.7 — Merge transacional de duplicados
- [ ] W-11.8 — Preservar histórico e aliases
- [ ] W-11.9 — Cache com invalidação
- [ ] W-11.10 — Testar mudança de identidade
- [ ] W-11.11 — Testar conflito entre organizações

## Sprint W-12 — Mídia segura

**Estado:** pendente  
**Dependências:** W-09 e W-10

- [ ] W-12.1 — Criar `MediaReference`
- [ ] W-12.2 — Streaming; evitar base64 persistente
- [ ] W-12.3 — Limitar tipo e tamanho
- [ ] W-12.4 — Quarentena privada
- [ ] W-12.5 — Antivírus e classificação
- [ ] W-12.6 — Validar MIME real
- [ ] W-12.7 — Hash e deduplicação
- [ ] W-12.8 — Thumbnail isolada
- [ ] W-12.9 — Transcrição sob política
- [ ] W-12.10 — OCR sob política
- [ ] W-12.11 — Remover metadata sensível quando aplicável
- [ ] W-12.12 — URL assinada
- [ ] W-12.13 — Retry sem duplicar
- [ ] W-12.14 — Testar malware, truncado, enorme e MIME falso

---

# Marco M-4 — Produto, conteúdo e IA

## Sprint W-13 — Inbox multiprovider e atendimento

**Estado:** pendente  
**Dependências:** W-09, W-10 e W-11

- [ ] W-13.1 — Exibir provider e estado sem poluir UX
- [ ] W-13.2 — Unificar conversas do mesmo contato
- [ ] W-13.3 — Preservar origem da mensagem
- [ ] W-13.4 — Filtrar por conta, fila, responsável, obra e estado
- [ ] W-13.5 — Atribuição e transferência
- [ ] W-13.6 — Notas internas
- [ ] W-13.7 — Indicadores humano, automação e IA
- [ ] W-13.8 — Presença do operador distinta da presença do canal
- [ ] W-13.9 — Realtime pelo backend Innov
- [ ] W-13.10 — Estados offline, reconnecting, degraded e action required
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
- [ ] W-14.7 — Registrar snapshot, versão e SHA
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
- [ ] W-15.3 — `ContextBuilder` com minimização
- [ ] W-15.4 — Busca lexical
- [ ] W-15.5 — Busca vetorial opcional
- [ ] W-15.6 — Retrieval híbrido e fallback
- [ ] W-15.7 — Filtros de tenancy, obra, versão e validade
- [ ] W-15.8 — Precedência de workflow
- [ ] W-15.9 — Limite atômico por conversa
- [ ] W-15.10 — Limite por organização e custo
- [ ] W-15.11 — Handoff persistente
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
- [ ] W-16.2 — Prioridade e short-circuit
- [ ] W-16.3 — Plugin de consentimento
- [ ] W-16.4 — Plugin anti-spam
- [ ] W-16.5 — Plugin de qualificação
- [ ] W-16.6 — Plugin de status de obra
- [ ] W-16.7 — Plugin de documento
- [ ] W-16.8 — Plugin de SAC
- [ ] W-16.9 — Plugin de handoff
- [ ] W-16.10 — IA como último recurso
- [ ] W-16.11 — Permissões e flags
- [ ] W-16.12 — Testar ordem e conflito

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
- [ ] W-17.10 — Retenção e expurgo
- [ ] W-17.11 — Auditoria de leitura sensível
- [ ] W-17.12 — Teste cross-tenant
- [ ] W-17.13 — Resposta a comprometimento de sessão
- [ ] W-17.14 — Scanner de segredo
- [ ] W-17.15 — SBOM e dependências

## Sprint W-18 — Observabilidade e operação

**Estado:** pendente  
**Dependências:** W-10 e W-17

- [ ] W-18.1 — Métricas de sessão
- [ ] W-18.2 — Métricas ingress e egress
- [ ] W-18.3 — Métricas retry e DLQ
- [ ] W-18.4 — Métricas de mídia
- [ ] W-18.5 — Métricas de IA e custo
- [ ] W-18.6 — Logs estruturados
- [ ] W-18.7 — Traces
- [ ] W-18.8 — Dashboard
- [ ] W-18.9 — Alerta de reconnect loop
- [ ] W-18.10 — Alerta de DLQ
- [ ] W-18.11 — Alerta de perda de lease
- [ ] W-18.12 — Alerta de persistência de keys
- [ ] W-18.13 — Runbook de desconexão
- [ ] W-18.14 — Runbook de upgrade Baileys
- [ ] W-18.15 — Runbook de rollback

## Sprint W-19 — Testes funcionais, chaos e performance

**Estado:** pendente  
**Dependências:** W-17 e W-18

- [ ] W-19.1 — Unit tests canônicos
- [ ] W-19.2 — Contract tests
- [ ] W-19.3 — Integration tests PostgreSQL
- [ ] W-19.4 — E2E com número de homologação
- [ ] W-19.5 — QR e pairing
- [ ] W-19.6 — Restart durante mensagem
- [ ] W-19.7 — Restart durante key update
- [ ] W-19.8 — Perda de rede
- [ ] W-19.9 — Evento duplicado
- [ ] W-19.10 — Receipt fora de ordem
- [ ] W-19.11 — Mídia corrompida
- [ ] W-19.12 — Banco indisponível
- [ ] W-19.13 — Processo zumbi
- [ ] W-19.14 — Réplicas disputando sessão
- [ ] W-19.15 — Upgrade e downgrade
- [ ] W-19.16 — Restore em infraestrutura nova
- [ ] W-19.17 — Benchmark memória por sessão
- [ ] W-19.18 — Benchmark throughput
- [ ] W-19.19 — Benchmark latência
- [ ] W-19.20 — Registrar limites medidos

**Gate W-G19:** nenhum número real antes da repetição dos testes P0.

---

# Marco M-6 — Homologação e promoção controlada

## Sprint W-20 — Homologação interna

**Estado:** pendente  
**Dependências:** W-19

- [ ] W-20.1 — Número dedicado e autorizado
- [ ] W-20.2 — Organização de homologação
- [ ] W-20.3 — Usuários autorizados
- [ ] W-20.4 — Campanhas desabilitadas
- [ ] W-20.5 — Auto-reply IA desabilitado
- [ ] W-20.6 — Somente texto e mídia aprovada
- [ ] W-20.7 — Roteiro diário de conexão, envio, recebimento e restart
- [ ] W-20.8 — Validar métricas e alertas
- [ ] W-20.9 — Validar expurgo e exclusão de sessão
- [ ] W-20.10 — Validar handoff e multiagente
- [ ] W-20.11 — Registrar incidentes e vacinas
- [ ] W-20.12 — Relatório de homologação

## Sprint W-21 — Piloto restrito

**Estado:** pendente  
**Dependências:** W-20

- [ ] W-21.1 — Definir escopo e usuários
- [ ] W-21.2 — Definir SLOs e abort criteria
- [ ] W-21.3 — Rollout por feature flag
- [ ] W-21.4 — Rollback de um clique
- [ ] W-21.5 — Monitorar falhas, reconnects, bloqueios e duplicações
- [ ] W-21.6 — Comparar com provider oficial
- [ ] W-21.7 — Medir custo operacional
- [ ] W-21.8 — Validar suporte e runbooks
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
- [ ] W-22.9 — Registrar dependências e licenças
- [ ] W-22.10 — Garantir CI e E2E verdes
- [ ] W-22.11 — Registrar decisão final de produção
- [ ] W-22.12 — Encerrar PR após revisão técnica e de segurança

---

## 4. Critérios globais de conclusão

- [x] Contratos provider-neutral
- [x] Meta preservado sem regressão
- [x] Contratos de engine e capability matrix
- [x] Policy gates na UI e backend
- [x] Mock engine sem provider real
- [x] Storage multiprovider aditivo sem domínio paralelo
- [x] RLS forçada e escrita técnica controlada
- [x] Rollback lógico sem perda histórica
- [x] Adapter Baileys confinado
- [x] Runtime separado do Next.js
- [ ] Session store criptografado e transacional
- [ ] Single writer e fencing comprovados
- [ ] Ingress operacional durável e idempotente
- [ ] Worker de outbox e retry operacional comprovados
- [ ] Reconciliação PN/LID completa
- [ ] Mídia específica do canal protegida
- [ ] Inbox multiprovider homologada
- [x] Fontes canônicas preservadas
- [ ] IA independente e inicialmente em rascunho
- [ ] Handoff persistente
- [ ] Threat model aprovado
- [ ] Logs sem segredos
- [ ] Métricas, alertas e runbooks
- [ ] Restart, concorrência e restore verdes
- [ ] Piloto restrito concluído
- [ ] Decisão explícita de produção
- [ ] Documentação canônica final atualizada
- [ ] CI e E2E finais verdes

---

## 5. Dependências externas

| Controle | Estado | Próxima ação |
|---|---|---|
| Revisão transitiva/SBOM Baileys | pendente | antes de piloto ou distribuição operacional |
| Aceite operacional | não executado | antes de número real |
| Revisão jurídica | dependência externa | antes de piloto ou produção |
| Número autorizado | não executado | somente W-20 |
| Produção | bloqueada | decisão específica posterior |

---

## 6. Próxima ação autorizada

A próxima sprint autorizada é **W-07 — Armazenamento criptográfico da sessão**.

É permitido:

- criar a porta `SessionCredentialStore` sem conectar o provider;
- modelar credenciais, signal keys, versões e metadata mínima;
- criar migration aditiva para storage técnico, sem duplicar contatos, conversas ou mensagens;
- aplicar RLS forçada, privilégios mínimos e funções controladas;
- implementar envelope encryption com DEK por sessão;
- manter KEK/chave-mestra fora do banco e fora do repositório;
- implementar transações e optimistic concurrency;
- criar rotação, recriptografia e exclusão criptográfica;
- criar auditoria de acesso sem registrar material secreto;
- criar backup/restore e testes de corrupção, concorrência e versão somente com fixtures sintéticas;
- criar adapter de auth-state contra a porta, usando doubles e sem abrir socket;
- ampliar scanners para bloquear logs, dumps, QR e `useMultiFileAuthState` produtivo.

Ainda não está autorizado:

- abrir socket externo;
- chamar autenticação real do WhatsApp;
- gerar ou exibir QR/pairing;
- utilizar credenciais ou keys reais;
- usar número real;
- registrar Baileys como runtime implementado;
- criar lease, fencing ou reconexão operacional antes da W-08;
- implantar o gateway;
- habilitar automação ou IA;
- promover para piloto ou produção.
