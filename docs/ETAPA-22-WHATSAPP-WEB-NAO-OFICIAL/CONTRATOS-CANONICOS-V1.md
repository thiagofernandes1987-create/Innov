# Contratos canônicos de mensageria — versão 1.0.0

**Sprint:** W-02  
**Arquivo normativo de código:** `lib/messaging/domain.ts`  
**Compatibilidade Etapa 22:** `lib/messaging/whatsapp-compatibility.ts`  
**Estado:** implementado em branch; sujeito aos gates do PR #40

---

## 1. Objetivo

Definir a linguagem interna de mensageria do Innov antes da introdução de qualquer engine não oficial. O domínio deve compreender pessoas, contas, conversas, mensagens, mídia e receipts sem depender de:

- payload da Graph API;
- tipo do Baileys;
- JID;
- estrutura protobuf;
- navegador/Puppeteer;
- modelo de um provider de IA.

A versão inicial do contrato é `1.0.0`. Mudança incompatível exige nova versão e estratégia explícita de migração.

---

## 2. Fronteira

```text
Meta Cloud payload ─┐
Baileys event ──────┼─> adapter/projeção ─> contrato canônico ─> domínio Innov
Web Chat event ─────┘
```

Tipos nativos só podem existir dentro dos adapters autorizados. O CI verifica essa regra.

---

## 3. Providers

### Implementado

- `META_CLOUD`

### Planejados

- `WHATSAPP_WEB_BAILEYS`
- `WEB_CHAT`

### Reservados, sem implementação

- `WHATSAPP_WEB_WHATSMEOW`
- `WHATSAPP_WEB_PUPPETEER`
- `EMAIL`
- `CUSTOM`

A presença de um identificador no contrato não habilita nem instala o provider.

---

## 4. Conta interna versus conta externa

A W-02 separa dois identificadores que não podem ser confundidos:

| Campo | Significado | Exemplo Meta |
|---|---|---|
| `channelAccountId` | ID interno e estável do Innov | UUID de `whatsapp_accounts.id` |
| `providerAccountId` | ID externo atribuído pelo provider | `phone_number_id` |

Regras:

1. tenancy, RLS e relacionamentos usam `channelAccountId`;
2. chamadas e correlação externa usam `providerAccountId`;
3. nenhum adapter pode armazenar um no campo do outro;
4. engine futuro pode ter múltiplos IDs externos preservados em `providerMetadata`.

---

## 5. Identidade canônica

`CanonicalIdentity` representa uma identidade observada em determinado canal e conta, não necessariamente um Cliente 360 confirmado.

Campos estruturais:

- versão do contrato;
- organização;
- provider;
- conta interna e ID externo opcional;
- namespace;
- ID observado pelo provider;
- ID normalizado;
- telefone opcional;
- device ID opcional;
- nome observado;
- aliases;
- confiança do alias;
- instante de observação.

Namespaces:

| Namespace | Uso |
|---|---|
| `PHONE` | telefone genérico fora de namespace específico |
| `WHATSAPP_PN` | identidade WhatsApp baseada em número |
| `WHATSAPP_LID` | identidade de privacidade LID |
| `GROUP` | grupo |
| `NEWSLETTER` | canal/newsletter |
| `WEB_USER` | usuário autenticado ou sessão do chat web |
| `EMAIL` | endereço de e-mail |
| `CUSTOM` | identidade opaca de provider futuro |

### Chave de identidade

A chave canônica inclui:

```text
organizationId : providerType : channelAccountId : namespace : normalizedId
```

Isso impede colisão entre:

- organizações;
- contas diferentes;
- PN e LID;
- grupos e pessoas;
- providers diferentes.

A união posterior com Cliente 360 será uma confirmação de vínculo, não uma alteração destrutiva do histórico observado.

---

## 6. Mensagem canônica

`CanonicalMessage` contém:

- organização e conversa;
- provider;
- conta interna e externa;
- ID interno, provider message ID e idempotency key;
- direção;
- tipo;
- status;
- remetente e destinatários canônicos;
- conteúdo;
- reply/reaction quando aplicável;
- timestamps;
- fonte canônica e snapshot;
- erro sanitizado;
- metadata do provider isolada.

Tipos previstos:

- texto;
- template;
- documento;
- imagem;
- áudio;
- vídeo;
- sticker;
- localização;
- contato;
- reação;
- interativo;
- evento;
- desconhecido.

A categoria `UNKNOWN` permite receber payload novo sem derrubar a sessão, mas não autoriza envio de tipo desconhecido.

---

## 7. Status de entrega

Status canônicos:

```text
QUEUED
ACCEPTED
SENT
DELIVERED
READ
RECEIVED
FAILED
CANCELLED
```

O schema atual da Etapa 22 suporta:

```text
QUEUED, SENT, DELIVERED, READ, RECEIVED, FAILED
```

`ACCEPTED` e `CANCELLED` não são projetados silenciosamente para o schema legado. A função de compatibilidade lança `INCOMPATIBLE_LEGACY_VALUE`, forçando uma migration ou regra explícita em etapa posterior.

---

## 8. Mídia canônica

`CanonicalMedia` separa metadados da mensagem e a referência ao arquivo.

Referências previstas:

- provider;
- storage privado;
- URL assinada;
- fixture de teste.

Controles previstos no contrato:

- MIME declarado e detectado;
- tamanho;
- SHA-256;
- nome;
- caption;
- expiração;
- estado de quarentena;
- metadata técnica do provider.

O contrato não significa que quarentena e antivírus já estejam implementados. Isso pertence à Sprint W-12.

---

## 9. Receipt canônico

`CanonicalReceipt` normaliza eventos de:

- aceitação;
- envio;
- entrega;
- leitura;
- reprodução de mídia;
- falha.

O receipt preserva:

- mensagem interna;
- provider message ID;
- conta;
- timestamp do provider;
- identidade opcional;
- erro sanitizado;
- metadata técnica isolada.

Status desconhecido não é convertido por aproximação.

---

## 10. Conversa canônica

`CanonicalConversation` mantém:

- participantes;
- uma ou mais contas de canal;
- status operacional;
- responsável;
- não lidas;
- timestamps;
- vínculos com cliente, obra, contrato, oportunidade e SAC.

A conversa não perde seu vínculo de negócio ao trocar de provider. A origem de cada mensagem permanece preservada.

---

## 11. Metadata do provider

`CanonicalProviderMetadata` é uma bolsa opaca e sanitizada para diagnóstico. Ela possui:

- tipo do provider;
- versão do schema do payload;
- tipo bruto do evento;
- timestamp do provider;
- atributos técnicos.

Regras:

1. regra de negócio não pode depender de campo opaco sem promovê-lo formalmente ao contrato;
2. segredo, chave, token, cookie e material criptográfico são proibidos;
3. payload bruto completo não é automaticamente persistido;
4. campos necessários à auditoria devem ser allowlisted.

---

## 12. Projeção do schema atual

A camada `whatsapp-compatibility.ts` transforma:

| Etapa 22 | Contrato canônico |
|---|---|
| `whatsapp_accounts` | `CanonicalChannelAccount` |
| `whatsapp_contacts` | `CanonicalIdentity` |
| `whatsapp_conversations` | `CanonicalConversation` |
| `whatsapp_messages` | `CanonicalMessage` |
| `whatsapp_message_status_events` | `CanonicalReceipt` |

A projeção preserva:

- ID interno;
- `phone_number_id` externo;
- WABA em metadata;
- contato e telefone normalizado;
- direção e status;
- conteúdo;
- fonte, binding, versão e SHA-256;
- provider message ID;
- idempotency key;
- vínculos de negócio;
- erro sanitizado.

Nenhuma tabela foi renomeada ou migrada na W-02.

---

## 13. Compatibilidade retroativa

A W-02 é aditiva:

- `lib/whatsapp/domain.ts` permanece vigente;
- cliente Meta existente não foi alterado;
- webhook existente não foi alterado;
- migrations existentes não foram alteradas;
- UI existente não foi alterada;
- status atuais continuam aceitos;
- projeção canônica pode ser adotada gradualmente nas próximas sprints.

A adaptação do provider Meta à interface `MessagingEngine` pertence à W-03.

---

## 14. Gate de imports

O validador `scripts/validate-messaging-boundaries.mjs` examina `app`, `components`, `lib` e `apps`.

Bloqueia fora dos adapters:

- import de `@whiskeysockets/baileys` ou `baileys`;
- `WAMessage`;
- `WAMessageKey`;
- `BinaryNode`;
- `proto.Message`.

Diretórios futuros autorizados:

```text
lib/messaging/adapters/baileys/
apps/messaging-gateway/src/engines/baileys/
```

Autorizar o diretório não dispensa tradução para contratos canônicos antes da saída do adapter.

---

## 15. Testes

- `tests/messaging-domain.test.ts` valida providers, IDs, namespaces, conversa, mensagem, fonte, status e receipt;
- `tests/messaging-boundary.test.ts` executa o gate de imports;
- testes legados de WhatsApp permanecem ativos e comprovam ausência de regressão funcional.

---

## 16. Limites da W-02

Ainda não existem:

- interface `MessagingEngine`;
- capability matrix;
- adapter Meta na nova interface;
- adapter Baileys;
- dependência Baileys;
- migration multiprovider;
- session store;
- gateway;
- QR/pairing;
- sessão real;
- IA ou auto-reply.

Esses itens permanecem nas sprints seguintes.