# Innov Messaging Gateway

Serviço Node.js persistente e isolado criado na Sprint W-05. Nesta etapa ele usa somente `FakeChannelClient`: não contém Baileys, não conecta WhatsApp, não cria QR, sessão, credencial ou número real.

## Fronteiras

- recebe comandos apenas em `POST /internal/commands`;
- exige HMAC-SHA256, timestamp, nonce e correlation ID;
- rejeita replay dentro da janela configurada;
- não recebe `DATABASE_URL` nem credenciais do Supabase;
- não acessa o banco principal;
- não possui SDK de canal;
- persiste zero material de sessão;
- health, readiness e métricas não expõem segredo ou payload;
- cliente fake devolve somente digest SHA-256 do payload recebido.

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
- nenhuma rede ou variável de banco principal.

O acesso do aplicativo principal deverá ocorrer futuramente por rota interna explicitamente controlada. A W-05 não realiza deploy nem conecta esse serviço ao ambiente de produção.
