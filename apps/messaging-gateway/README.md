# Innov Messaging Gateway

Serviço Node.js persistente e isolado criado na W-05, ampliado com o adapter confinado da W-06, o armazenamento criptográfico da W-07 e a biblioteca de lifecycle fenced da W-08. O processo ativo continua usando somente `FakeChannelClient`.

`@whiskeysockets/baileys@7.0.0-rc13` está instalado exclusivamente no workspace do gateway para tipagem, adapter anticorrupção e testes. O bootstrap não importa nem registra o adapter, o session store ou o supervisor W-08; não conecta WhatsApp e não cria QR, pairing, sessão ou número real.

## Fronteiras

- recebe comandos apenas em `POST /internal/commands`;
- exige HMAC-SHA256, timestamp, nonce e correlation ID;
- rejeita replay dentro da janela configurada;
- não recebe `DATABASE_URL` nem credenciais do Supabase;
- não acessa o banco principal no runtime ativo;
- Baileys fica confinado a `src/engines/baileys/`;
- o store provider-neutral fica em `src/session-store/`;
- contratos de lease e lifecycle ficam em `src/runtime/` sem importar o SDK Baileys;
- a fábrica oficial falha com `EXTERNAL_SOCKET_BLOCKED` sem autorização explícita;
- health, readiness e métricas não expõem segredo ou payload;
- lifecycle scripts de dependências permanecem bloqueados;
- o lockfile regenerado deve corresponder ao SHA-256 aprovado.

## Runtime ativo

```text
index.ts
  ↓
createGatewayRuntime
  ↓
FakeChannelClient
```

Não existe import do adapter, do store ou do supervisor no bootstrap. A presença dessas bibliotecas testadas não equivale a provider registrado ou sessão operacional.

## Adapter W-06

O diretório `src/engines/baileys/` contém:

- contratos próprios e porta mínima de socket;
- normalização PN, LID, grupo e newsletter;
- texto, mídia, localização, reação e reply;
- eventos inbound e receipts;
- taxonomia de erros;
- capability matrix;
- fábrica oficial lazy e bloqueada por padrão;
- bridge `AuthenticationState` para o store cifrado, ainda sem bootstrap.

## Session store W-07

O diretório `src/session-store/` contém:

- `SessionCredentialStore` provider-neutral;
- contratos de credenciais, keys, versões e auditoria;
- AES-256-GCM com AAD;
- DEK aleatória por sessão;
- porta `KeyEnvelopeProvider` para KEK externa;
- compare-and-swap por geração;
- transações e rollback;
- rotação completa da DEK;
- rewrap sob nova KEK;
- backup e restore cifrados;
- exclusão criptográfica;
- repositório em memória exclusivo para testes sintéticos.

A persistência SQL da W-07 guarda somente envelopes e ciphertext. O gateway ativo continua sem conexão ao banco principal.

## Runtime lifecycle W-08

O diretório `src/runtime/` contém:

- `SessionRuntimeLeaseRepository`;
- lease com expiração;
- fencing token monotônico;
- bloqueio de dois writers;
- `SessionLifecycleSupervisor` com state machine explícita;
- pairing reduzido a metadados efêmeros com `persisted: false`;
- reconnect com backoff exponencial limitado e jitter;
- classificação de falha transitória, logout, restrição e ação humana;
- kill switch global e por sessão;
- operações de credenciais protegidas por `runFencedCredentialMutation`;
- takeover e restore testados com nova instância;
- repositório em memória exclusivo para doubles.

A migration W-08 adiciona leases e uma porta de CAS fenced no PostgreSQL. Um token obsoleto não consegue gravar credenciais mesmo se o processo antigo continuar executando. O supervisor não está registrado no bootstrap e nenhum desafio de pairing real foi criado.

## Endpoints

| Endpoint | Autenticação | Uso |
|---|---|---|
| `GET /health` | rede interna | processo ativo |
| `GET /ready` | rede interna | aceita comandos |
| `GET /metrics` | rede interna | métricas Prometheus de cardinalidade limitada |
| `POST /internal/commands` | HMAC obrigatório | comando interno versionado |

## Assinatura

```text
HMAC-SHA256(secret, timestamp.nonce.METHOD.path.sha256(body))
```

Headers obrigatórios:

- `x-innov-timestamp`;
- `x-innov-nonce`;
- `x-innov-signature`;
- `x-correlation-id`.

`x-causation-id` é opcional e deve coincidir entre header e envelope quando presente.

## Environment

| Variável | Obrigatória | Padrão/limite |
|---|---|---|
| `GATEWAY_HMAC_SECRET` | sim | mínimo de 32 bytes |
| `GATEWAY_INSTANCE_ID` | sim | 3–128 caracteres seguros |
| `GATEWAY_HOST` | não | `127.0.0.1` |
| `GATEWAY_PORT` | não | `8787` |
| `GATEWAY_REPLAY_WINDOW_SECONDS` | não | `300`, entre 30 e 900 |
| `GATEWAY_MAX_REPLAY_ENTRIES` | não | `10000` |
| `GATEWAY_MAX_BODY_BYTES` | não | `65536` |
| `GATEWAY_SHUTDOWN_TIMEOUT_MS` | não | `10000` |
| `GATEWAY_REQUEST_TIMEOUT_MS` | não | `15000` |
| `GATEWAY_HEADERS_TIMEOUT_MS` | não | `10000` |

Não existem variáveis para ativar socket, QR, sessão Baileys, lease SQL ou KEK de produção nesta etapa.

## Supply chain

```text
pnpm install --no-frozen-lockfile --ignore-scripts
```

`scripts/verify-w06-lockfile.mjs` exige o SHA-256 aprovado da árvore resolvida. Qualquer alteração requer revisão explícita do lockfile, licença e segurança.

## Container

`compose.yaml` aplica usuário `10001:10001`, filesystem somente leitura, capabilities removidas, `no-new-privileges`, limites de recursos, `/tmp` restrito e rede interna. O smoke test executa a imagem com `--network none`, confirma o cliente fake e prova shutdown por SIGTERM.

As W-05 a W-08 não realizam deploy nem conectam o serviço ao ambiente de produção.
