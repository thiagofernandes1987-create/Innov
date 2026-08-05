# Gateway persistente — arquitetura da Sprint W-05

**Serviço:** `apps/messaging-gateway`  
**Contrato estrutural:** `messaging-gateway-boundary-v2`  
**Runtime:** Node.js 24  
**Cliente de canal:** somente `FakeChannelClient`  
**Baileys:** não instalado  
**Conexão externa:** inexistente

---

## 1. Objetivo

A W-05 separa o futuro runtime persistente de mensageria do processo Next.js/Vercel. O gateway é um serviço Node.js independente, sem acesso ao banco principal, sem SDK de WhatsApp e sem material de sessão.

```text
aplicativo Innov futuro
        ↓ comando interno assinado
API HMAC do gateway
        ↓ envelope versionado
FakeChannelClient
        ↓
evento correlacionado sem payload sensível
```

## 2. Endpoints

| Endpoint | Resultado |
|---|---|
| `GET /health` | processo ativo, instance ID e uptime |
| `GET /ready` | `200` somente quando aceita comandos |
| `GET /metrics` | métricas Prometheus de cardinalidade limitada |
| `POST /internal/commands` | comando interno autenticado e validado |

Nenhum endpoint aceita sessão, QR, credencial de provider ou número real.

## 3. Autenticação

O comando interno exige:

- `x-innov-timestamp`;
- `x-innov-nonce`;
- `x-innov-signature`;
- `x-correlation-id`;
- `x-causation-id`, quando aplicável.

A assinatura é:

```text
HMAC-SHA256(secret, timestamp.nonce.METHOD.path.sha256(body))
```

A comparação usa `timingSafeEqual`. O nonce somente é armazenado após a assinatura ser aprovada.

## 4. Replay guard

O `ReplayGuard`:

- aceita epoch em segundos ou milissegundos;
- rejeita timestamp fora da janela;
- rejeita nonce repetido;
- limita o número máximo de nonces em memória;
- remove registros expirados;
- falha fechado quando a capacidade é atingida.

A proteção atual é local ao processo. Coordenação distribuída pertence às sprints de lease/single writer e não foi simulada como concluída.

## 5. Contratos internos

Os envelopes usam `schemaVersion: 1.0.0` e carregam:

- organização;
- command/event ID;
- ação;
- correlation ID;
- causation ID;
- timestamp;
- payload tipado ou sanitizado.

O cliente fake não devolve o conteúdo recebido. Ele registra somente metadados mínimos e `payloadSha256`.

## 6. Lifecycle

Na inicialização:

1. todo environment é validado;
2. o servidor abre a porta;
3. o cliente fake é iniciado;
4. readiness passa para verde.

No `SIGTERM` ou `SIGINT`:

1. readiness é retirada;
2. novos comandos são bloqueados;
3. o cliente fake é interrompido;
4. conexões idle são fechadas;
5. o servidor aguarda o prazo configurado;
6. conexões restantes são encerradas;
7. o evento de shutdown concluído é registrado.

## 7. Container

A imagem:

- compila em estágio separado;
- executa como `10001:10001`;
- não contém dependências runtime próprias;
- recebe `SIGTERM` como stop signal.

O `compose.yaml` aplica:

- filesystem somente leitura;
- `/tmp` limitado e `noexec`;
- remoção de todas as capabilities;
- `no-new-privileges`;
- limite de PIDs, memória, CPU e descritores;
- rede Docker `internal`;
- exposição somente em loopback;
- nenhuma variável de banco principal.

O smoke test de CI endurece ainda mais a execução com `--network none`.

## 8. Métricas

Foram implementadas métricas de baixa cardinalidade para:

- processo ativo;
- readiness;
- requests HTTP;
- comandos autenticados;
- falhas de autenticação;
- rejeições de replay;
- comandos do cliente fake;
- requests em voo;
- horário de inicialização.

Payload, número, organização e correlation ID não são labels.

## 9. Limites desta sprint

A W-05 não implementa:

- adapter Baileys;
- socket WhatsApp;
- sessão ou credenciais;
- QR ou pairing;
- banco de sessão;
- lease ou fencing;
- worker de outbox;
- deploy;
- número real;
- automação ou IA;
- liberação de produção.
