# Innov Messaging Gateway

Serviço Node.js persistente e isolado criado na Sprint W-05 e ampliado com o adapter confinado da W-06. O processo ativo continua usando somente `FakeChannelClient`.

`@whiskeysockets/baileys@7.0.0-rc13` está instalado exclusivamente no workspace do gateway para tipagem, adapter anticorrupção e contract tests. O bootstrap não importa nem registra o adapter, não conecta WhatsApp e não cria QR, pairing, sessão, credencial ou número real.

## Fronteiras

- recebe comandos apenas em `POST /internal/commands`;
- exige HMAC-SHA256, timestamp, nonce e correlation ID;
- rejeita replay dentro da janela configurada;
- não recebe `DATABASE_URL` nem credenciais do Supabase;
- não acessa o banco principal;
- o runtime HTTP base não importa SDK de canal;
- Baileys fica confinado a `src/engines/baileys/`;
- a fábrica oficial falha com `EXTERNAL_SOCKET_BLOCKED` sem autorização explícita;
- persiste zero material de sessão;
- health, readiness e métricas não expõem segredo ou payload;
- cliente fake devolve somente digest SHA-256 do payload recebido;
- lifecycle scripts de dependências são bloqueados;
- o lockfile regenerado deve corresponder ao SHA-256 aprovado da W-06.

## Runtime ativo

```text
index.ts
  ↓
createGatewayRuntime
  ↓
FakeChannelClient
```

Não existe import de `engines/baileys` no bootstrap. A presença do pacote no workspace não equivale a provider registrado.

## Adapter W-06

O diretório `src/engines/baileys/` contém:

- contratos próprios e porta mínima de socket;
- normalização PN, LID, grupo e newsletter;
- texto, mídia, localização, reação e reply;
- eventos inbound e receipts;
- taxonomia de erros;
- capability matrix;
- fábrica oficial lazy e bloqueada por padrão.

O adapter só é exercitado por doubles nos testes. QR recebido em um double é convertido apenas em `pairingChallengeAvailable: true` e `qrPersisted: false`; o valor não é propagado.

## Endpoints

| Endpoint | Autenticação | Uso |
|---|---|---|
| `GET /health` | rede interna | processo ativo |
| `GET /ready` | rede interna | aceita comandos |
| `GET /metrics` | rede interna | métricas Prometheus de cardinalidade limitada |
| `POST /internal/commands` | HMAC obrigatório | comando interno versionado |

## Assinatura

A assinatura hexadecimal é:

```text
HMAC-SHA256(secret, timestamp.nonce.METHOD.path.sha256(body))
```

Headers obrigatórios:

- `x-innov-timestamp` — epoch em segundos ou milissegundos;
- `x-innov-nonce` — valor único de 8 a 128 caracteres seguros;
- `x-innov-signature` — HMAC hexadecimal de 64 caracteres;
- `x-correlation-id` — identificador interno de 3 a 128 caracteres.

`x-causation-id` é opcional. Quando informado no header e no envelope, os valores devem coincidir.

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

Não existem variáveis para ativar socket, QR ou sessão Baileys nesta etapa.

## Supply chain

Instalação no CI e Docker:

```text
pnpm install --no-frozen-lockfile --ignore-scripts
```

Após a resolução, `scripts/verify-w06-lockfile.mjs` exige:

```text
d681efc5acb88940b5a81f2019808ed5ef9d8cde9fa8d36d178076423dc35ed9
```

Qualquer alteração na árvore requer revisão explícita do lockfile, licença e segurança.

## Container

`compose.yaml` aplica:

- usuário `10001:10001`;
- filesystem somente leitura;
- `cap_drop: ALL`;
- `no-new-privileges`;
- limite de processos, memória, CPU e descritores;
- `/tmp` pequeno, `noexec`, `nosuid` e `nodev`;
- rede Docker `internal`;
- exposição apenas em `127.0.0.1`;
- nenhuma variável de banco principal.

O smoke test executa a imagem com `--network none`, confirma o cliente fake e prova o shutdown por SIGTERM.

O acesso do aplicativo principal deverá ocorrer futuramente por rota interna explicitamente controlada. As W-05 e W-06 não realizam deploy nem conectam esse serviço ao ambiente de produção.
