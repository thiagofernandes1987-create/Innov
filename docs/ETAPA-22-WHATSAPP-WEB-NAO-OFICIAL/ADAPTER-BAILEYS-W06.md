# Adapter Baileys — arquitetura da Sprint W-06

**Componente:** `apps/messaging-gateway/src/engines/baileys`  
**Pacote:** `@whiskeysockets/baileys@7.0.0-rc13`  
**Contrato de engine:** `messaging-engine-boundary-v4`  
**Contrato do gateway:** `messaging-gateway-boundary-v4`  
**Contrato do lockfile:** `messaging-w06-lockfile-v1`  
**Runtime ativo:** `FakeChannelClient`  
**Socket externo:** bloqueado por padrão  
**Sessão real:** inexistente

---

## 1. Objetivo

A W-06 incorpora a biblioteca somente como dependência confinada do gateway e implementa um adapter anticorrupção. O adapter traduz estruturas do provider para contratos próprios sem permitir que `WAMessage`, `WAMessageKey`, `WASocket`, `BinaryNode`, `proto.Message` ou `BaileysEventMap` atravessem a fronteira autorizada.

```text
@whiskeysockets/baileys
        ↓ tipos oficiais confinados
OfficialBaileysSocketFactory
        ↓ BaileysSocketPort próprio
BaileysEngineAdapter
        ↓ contratos normalizados
futuro domínio canônico/pipeline durável
```

O arquivo de inicialização do gateway não importa nem registra `BaileysEngineAdapter`. Portanto, instalar o pacote não tornou o provider operacional.

## 2. Estrutura

| Arquivo | Responsabilidade |
|---|---|
| `contracts.ts` | porta mínima, eventos, comandos, identidades e tipos sanitizados |
| `jid.ts` | PN, LID, grupo e newsletter |
| `content.ts` | texto, mídia, localização, reação e parsing inbound |
| `errors.ts` | taxonomia e retryability |
| `capabilities.ts` | matriz efetivamente encapsulada |
| `official-factory.ts` | import dinâmico e construção autorizada do socket |
| `adapter.ts` | lifecycle, outbound, inbound e receipts |
| `index.ts` | API pública restrita do diretório |

## 3. Fábrica oficial

`createOfficialBaileysSocketFactory` exige três dependências explícitas:

1. resolver de autenticação;
2. gate de autorização de rede;
3. carregador do módulo, injetável em testes.

Estados de autorização:

- `DENIED` — padrão seguro; lança `EXTERNAL_SOCKET_BLOCKED`;
- `AUTHORIZED_TEST_DOUBLE` — permite somente módulo/socket injetado pelo teste;
- `AUTHORIZED_FUTURE_RUNTIME` — reservado para uma etapa posterior, sem uso na W-06.

Configurações fixadas:

- `printQRInTerminal: false`;
- `markOnlineOnConnect: false`;
- `syncFullHistory: false`;
- `emitOwnEvents: false`.

Nenhum socket é criado no construtor do adapter. A fábrica só é chamada por `connect`, e o gateway ativo não chama esse método.

## 4. Identidades

| JID observado | Namespace canônico |
|---|---|
| `*@s.whatsapp.net` | `WHATSAPP_PN` |
| `*@lid` | `WHATSAPP_LID` |
| `*@g.us` | `GROUP` |
| `*@newsletter` | `NEWSLETTER` |

O device suffix de PN, como `:17`, é removido de `normalizedId`, mas o identificador externo observado pode ser preservado para reconciliação futura.

Regras:

- namespace desconhecido falha fechado;
- PN exige 8 a 15 dígitos;
- grupo é bloqueado por padrão;
- newsletter é bloqueada por padrão;
- namespace e servidor JID devem coincidir;
- identidade de outro provider é rejeitada.

## 5. Outbound encapsulado

A W-06 traduz:

- texto;
- documento;
- imagem;
- áudio;
- vídeo;
- sticker;
- localização;
- reação;
- reply/quoted message.

Mídia outbound aceita somente `referenceType: SIGNED_URL` com URL HTTPS. Referência interna de bucket, base64 e caminho local são rejeitados pelo adapter.

Reply exige `BaileysQuotedMessageResolver`. O adapter não inventa ou reconstrói uma mensagem citada quando ela não está disponível.

O `idempotencyKey` do comando é encaminhado como `messageId` do provider, preservando a futura estratégia de outbox/idempotência.

## 6. Inbound encapsulado

Eventos `messages.upsert` são traduzidos para evento próprio com:

- organização e conta de canal;
- provider message ID;
- sender normalizado;
- tipo e conteúdo;
- metadata técnica sanitizada.

O adapter suporta parsing de:

- conversation;
- extended text e quoted stanza ID;
- documento, imagem, áudio, vídeo e sticker;
- localização;
- reação.

Mídia inbound não é baixada na W-06. O evento contém somente referência `PROVIDER`, MIME declarado, nome, tamanho e legenda disponíveis. Download, quarentena, antivírus e storage pertencem à W-12.

## 7. Receipts

`message-receipt.update` é normalizado como:

- `SENT`;
- `DELIVERED`;
- `READ`;
- `PLAYED`.

O adapter preserva o provider message ID e tenta normalizar a identidade do receipt sem falhar o evento quando o JID não é reconhecido.

## 8. Lifecycle

Mapeamento implementado:

| Evento provider | Estado do adapter |
|---|---|
| criação da fábrica | `CONNECTING` |
| `connection: connecting` | `CONNECTING` |
| QR recebido | `PAIRING_REQUIRED` |
| `connection: open` | `READY` |
| close retryable | `DEGRADED` |
| close terminal | `ACTION_REQUIRED` |
| disconnect solicitado | `STOPPING` → `DISCONNECTED` |
| falha de fábrica | `FAILED` |

O valor do QR nunca entra no snapshot ou no evento. É emitido somente `pairingChallengeAvailable: true` e `qrPersisted: false`.

A W-06 não implementa o lifecycle operacional completo, reconexão, lease, fencing, takeover ou pairing. Esses itens continuam reservados para W-08.

## 9. Capabilities

Suporte encapsulado:

- início de conversa;
- texto;
- documento, imagem, áudio, vídeo e sticker;
- localização;
- reação;
- reply;
- inbound messages;
- inbound receipts;
- grupo quando explicitamente autorizado;
- sinalização básica de reconnect.

Permanece `UNSUPPORTED` ou `PLANNED`:

- template oficial;
- contato outbound;
- edição e exclusão;
- presença;
- history sync;
- mark read ativo;
- pairing operacional;
- newsletter operacional.

Capability declarada não é sinônimo de runtime registrado. O provider continua ausente de `IMPLEMENTED_CHANNEL_PROVIDER_TYPES`.

## 10. Erros

Taxonomia própria:

- `INVALID_COMMAND`;
- `PROVIDER_MISMATCH`;
- `UNSUPPORTED_IDENTITY`;
- `UNSUPPORTED_MESSAGE`;
- `UNSAFE_MEDIA_REFERENCE`;
- `GROUPS_DISABLED`;
- `NEWSLETTERS_DISABLED`;
- `SOCKET_NOT_CONNECTED`;
- `SOCKET_FACTORY_FAILED`;
- `QUOTED_MESSAGE_NOT_FOUND`;
- `INVALID_PROVIDER_RESPONSE`;
- `PROVIDER_REJECTED`;
- `PROVIDER_UNAVAILABLE`;
- `EXTERNAL_SOCKET_BLOCKED`.

401, 403, 411 e 440 são classificados como não retryable/ação humana. 408, 428, 429, 500, 503 e 515 são classificados como retryable. O erro bruto não é propagado como payload canônico.

## 11. Supply chain

A instalação usa:

```text
pnpm install --no-frozen-lockfile --ignore-scripts
```

O lockfile regenerado deve resultar exatamente em:

```text
d681efc5acb88940b5a81f2019808ed5ef9d8cde9fa8d36d178076423dc35ed9
```

O gate também exige:

- importer `apps/messaging-gateway`;
- versão `7.0.0-rc13`;
- `libsignal@6.0.0`;
- `whatsapp-rust-bridge@0.5.4`;
- ausência de versão flutuante no importer.

O pacote upstream declara scripts `preinstall`, `prepare` e `prepack`; nenhum deles é executado no CI ou Docker.

## 12. Licença

O pacote/tag upstream declara MIT. A árvore transitiva contém `libsignal` e `whatsapp-rust-bridge`. O histórico público de licença envolvendo `libsignal` exige revisão jurídica/SBOM antes de qualquer piloto ou distribuição operacional.

Esta sprint não interpreta MIT do pacote principal como autorização automática de toda a árvore transitiva e não interpreta código aberto como autorização do WhatsApp para cliente não oficial.

## 13. Limites da sprint

Não implementado:

- storage de credenciais;
- envelope encryption;
- optimistic concurrency;
- QR/pairing operacional;
- sessão real;
- reconexão automática;
- lease e fencing;
- outbox worker;
- download de mídia;
- número real;
- deploy;
- feature flag operacional;
- automação ou IA;
- produção.
