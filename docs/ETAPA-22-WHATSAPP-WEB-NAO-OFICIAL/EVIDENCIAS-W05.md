# Evidências — Sprint W-05

**Sprint:** W-05 — Esqueleto do gateway  
**Branch:** `feature/etapa-22-provider-whatsapp-web-baileys`  
**PR:** #40  
**Estado:** concluída  
**Data:** 04 de agosto de 2026  
**Head funcional validado:** `9bb75e77dfe0421378d94e6474614fbc7185d03e`  
**Head documental de fechamento:** `fe8f9004b118c0e550bbe253c927533b640d793b`

---

## 1. Checklist concluído

- [x] `apps/messaging-gateway` criado;
- [x] Node.js 24 definido;
- [x] configuração tipada e fail-closed;
- [x] health, readiness e metrics;
- [x] API interna autenticada;
- [x] HMAC de comandos e envelopes de eventos;
- [x] proteção contra replay;
- [x] correlation e causation IDs;
- [x] shutdown gracioso;
- [x] container não-root;
- [x] limites de CPU, memória, PIDs e arquivos;
- [x] isolamento da rede e do banco principal;
- [x] cliente fake sem WhatsApp.

## 2. Artefatos

- `apps/messaging-gateway/package.json`;
- `apps/messaging-gateway/tsconfig.json`;
- `apps/messaging-gateway/src/config.ts`;
- `apps/messaging-gateway/src/contracts.ts`;
- `apps/messaging-gateway/src/security.ts`;
- `apps/messaging-gateway/src/replay-guard.ts`;
- `apps/messaging-gateway/src/metrics.ts`;
- `apps/messaging-gateway/src/fake-client.ts`;
- `apps/messaging-gateway/src/server.ts`;
- `apps/messaging-gateway/src/index.ts`;
- `apps/messaging-gateway/Dockerfile`;
- `apps/messaging-gateway/compose.yaml`;
- `apps/messaging-gateway/README.md`;
- `tests/messaging-gateway.test.ts`;
- `scripts/validate-messaging-gateway.mjs`;
- `scripts/run-messaging-gateway-container-smoke.sh`;
- `.github/workflows/ci.yml`;
- `GATEWAY-W05.md`.

## 3. Gate estrutural

`messaging-gateway-boundary-v2` comprovou:

| Controle | Resultado |
|---|---|
| endpoints | 4 |
| dependências próprias | 0 |
| SDK de WhatsApp | ausente |
| acesso ao banco principal | ausente |
| Node.js | `>=24 <25` |
| usuário runtime | `10001:10001` |
| rede de compose | interna |
| smoke test de container | obrigatório |
| cliente de canal | fake |

## 4. Testes do processo HTTP

A suíte `tests/messaging-gateway.test.ts` confirmou:

1. configuração sem secret ou instance ID falha fechado;
2. limites válidos são carregados;
3. corpo alterado invalida a assinatura;
4. nonce repetido é rejeitado;
5. timestamp fora da janela é rejeitado;
6. health, readiness e metrics respondem;
7. segredo e payload não aparecem nas métricas;
8. comando sem HMAC recebe `401`;
9. comando assinado recebe `202`;
10. correlation e causation IDs são preservados;
11. o cliente fake não devolve conteúdo;
12. replay recebe `409`;
13. corpo acima do limite recebe `413` antes da execução.

## 5. Smoke test do container

O CI construiu a imagem e executou o processo com:

- `--read-only`;
- `--tmpfs /tmp:size=16m,noexec,nosuid,nodev`;
- `--cap-drop ALL`;
- `--security-opt no-new-privileges`;
- `--pids-limit 128`;
- `--memory 256m`;
- `--cpus 0.50`;
- `--ulimit nofile=1024:2048`;
- `--network none`.

O teste comprovou:

- usuário e grupo `10001:10001` na imagem e no processo;
- readiness verde;
- health verde;
- métrica `innov_gateway_ready 1`;
- log de inicialização;
- shutdown concluído após `SIGTERM`.

## 6. Validação do head funcional

### Runs

- CI: `30896714160`;
- Stage 20 File Security E2E: `30896714116`.

### Resultados

| Validação | Resultado |
|---|---|
| preflight e documentação | `PASS` |
| gate `messaging-gateway-boundary-v2` | `PASS` |
| testes do gateway | `PASS` |
| smoke test Docker | `PASS` |
| testes PostgreSQL multiprovider | `PASS` |
| demais testes de banco | `PASS` |
| lint | `PASS` |
| typecheck | `PASS` |
| Vitest completo | `PASS` |
| testes Python | `PASS` |
| build do gateway | `PASS` |
| build Next.js | `PASS` |
| quarentena limpa/EICAR | `PASS` |
| Vercel | `PASS` |

## 7. Itens não executados

- Baileys não foi instalado;
- `BaileysEngineAdapter` não foi criado;
- nenhum socket de canal foi iniciado;
- nenhuma sessão, credencial, QR ou pairing foi criado;
- nenhum banco de sessão foi criado;
- nenhum número real foi utilizado;
- o gateway não foi implantado;
- automação e IA permanecem desabilitadas;
- produção permanece bloqueada.

## 8. Resultado

A W-05 cria uma fronteira executável e testada para o futuro provider, sem converter o esqueleto em uma conexão real. A conclusão autoriza somente a W-06 — adapter Baileys — sob versão exata, confinamento de tipos e testes sem número ou sessão real.
