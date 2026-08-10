# Evidências — Sprint W-06

**Sprint:** W-06 — Adapter Baileys  
**Branch:** `feature/etapa-22-provider-whatsapp-web-baileys`  
**PR:** #40  
**Estado:** concluída no escopo de adapter sem conexão externa  
**Data:** 04 de agosto de 2026  
**Head funcional validado:** `9e94603cbd9e50dc44e5f848a2aa5e195a8d9a43`  
**Head documental validado antes do registro final:** `61a633425dcd1a355d8859e880b10b8cdb917c6e`

---

## 1. Checklist concluído

- [x] versão exata fixada, sem `latest`;
- [x] `BaileysEngineAdapter` criado;
- [x] criação de socket encapsulada por fábrica;
- [x] eventos de conexão encapsulados;
- [x] texto encapsulado;
- [x] mídia encapsulada;
- [x] receipts encapsulados;
- [x] replies, reactions e quoted messages encapsulados;
- [x] grupos condicionados à capability matrix;
- [x] erros normalizados;
- [x] PN, LID, grupo e newsletter mapeados;
- [x] metadata técnica sanitizada;
- [x] contract tests criados;
- [x] scanner bloqueia tipos Baileys fora do adapter.

## 2. Dependência

| Controle | Resultado |
|---|---|
| pacote | `@whiskeysockets/baileys` |
| versão | `7.0.0-rc13` |
| localização | somente `apps/messaging-gateway/package.json` |
| pacote raiz | sem Baileys |
| versão flutuante | não |
| lifecycle scripts | bloqueados |
| runtime registrado | não |
| socket externo | bloqueado por padrão |
| sessão real | não |

## 3. Artefatos

- `apps/messaging-gateway/src/engines/baileys/contracts.ts`;
- `apps/messaging-gateway/src/engines/baileys/jid.ts`;
- `apps/messaging-gateway/src/engines/baileys/content.ts`;
- `apps/messaging-gateway/src/engines/baileys/errors.ts`;
- `apps/messaging-gateway/src/engines/baileys/capabilities.ts`;
- `apps/messaging-gateway/src/engines/baileys/official-factory.ts`;
- `apps/messaging-gateway/src/engines/baileys/adapter.ts`;
- `apps/messaging-gateway/src/engines/baileys/index.ts`;
- `tests/messaging-baileys-adapter.test.ts`;
- `tests/messaging-boundary.test.ts`;
- `scripts/validate-messaging-boundaries.mjs`;
- `scripts/validate-messaging-gateway.mjs`;
- `scripts/validate-messaging-storage.mjs`;
- `scripts/verify-w06-lockfile.mjs`;
- `ADAPTER-BAILEYS-W06.md`;
- `THIRD_PARTY_NOTICES.md`.

## 4. Contract tests do adapter

A suíte dedicada executou **25 testes** e comprovou:

1. versão exata somente no gateway;
2. fábrica oficial bloqueada por padrão;
3. módulo/socket injetável sem rede;
4. PN;
5. LID;
6. grupo;
7. newsletter;
8. remoção de device ID do PN;
9. bloqueio padrão de grupo/newsletter;
10. criação lazy do socket;
11. texto outbound;
12. documento por URL assinada;
13. imagem por URL assinada;
14. áudio por URL assinada;
15. vídeo por URL assinada;
16. sticker por URL assinada;
17. bloqueio de referência de mídia insegura;
18. localização e reação;
19. quoted/reply com resolver explícito;
20. grupo somente com autorização;
21. QR descartado do evento;
22. mensagem inbound e metadata sanitizada;
23. mídia inbound sem download;
24. receipt e disconnect;
25. classificação retryable/não retryable.

## 5. Boundary gates

### `messaging-engine-boundary-v4`

Comprovou:

- imports e tipos nativos confinados;
- pacote instalado apenas no gateway;
- versão exata;
- adapter implementado;
- runtime não registrado;
- socket externo bloqueado;
- QR descartado;
- nenhuma persistência de sessão;
- nenhum número real;
- produção desabilitada;
- Meta Cloud permanece o único provider implementado.

### `messaging-gateway-boundary-v4`

Comprovou:

- gateway continua com cliente ativo fake;
- base HTTP/HMAC não importa SDK de canal;
- Baileys não está no `index.ts` do runtime;
- Docker e CI bloqueiam lifecycle scripts;
- lockfile resolvido possui hash obrigatório;
- container continua não-root, sem banco principal e com rede desabilitada no smoke test.

### `messaging-storage-boundary-v2`

Comprovou separadamente:

- pacote presente no gateway;
- runtime Baileys ausente;
- storage de sessão ausente;
- lease de sessão ausente;
- material real de sessão ausente;
- domínio operacional `whatsapp_*` preservado.

## 6. Lockfile e supply chain

O CI regenerou o lockfile sem lifecycle scripts.

| Evidência | Valor |
|---|---|
| artefato | `pnpm-lock-w06` |
| artifact ID inicial | `8890309340` |
| SHA-256 do lockfile | `d681efc5acb88940b5a81f2019808ed5ef9d8cde9fa8d36d178076423dc35ed9` |
| SHA-256 do ZIP inicial | `4261c27746f362710344c066cf919fd9b15bd6932b894052782ad3c4e065baed` |
| lifecycle scripts | não executados |

O gate falha se o hash, importer, versão, `libsignal@6.0.0` ou `whatsapp-rust-bridge@0.5.4` divergirem. O head documental validado executou esse gate no CI e no build Docker.

## 7. Validação final registrada

### Runs

- CI: `30905550656`;
- Stage 20 File Security E2E: `30905550643`.

### Resultados

| Validação | Resultado |
|---|---|
| preflight e documentação | `PASS` |
| lockfile SHA-256 | `PASS` |
| engine boundary v4 | `PASS` |
| gateway boundary v4 | `PASS` |
| storage boundary v2 | `PASS` |
| testes do adapter — 25 | `PASS` |
| testes do gateway — 9 | `PASS` |
| suíte Vitest global — 312 | `PASS` |
| lint | `PASS` |
| typecheck com tipos oficiais | `PASS` |
| testes Python | `PASS` |
| build do gateway | `PASS` |
| smoke test Docker sem rede | `PASS` |
| build Next.js | `PASS` |
| quarentena limpa/EICAR | `PASS` |
| Vercel | bloqueado por cota `build-rate-limit`, não por erro de compilação |

## 8. Licença e bloqueio jurídico

O pacote principal/tag declara MIT. A árvore upstream declara `libsignal` e `whatsapp-rust-bridge`. O risco de licença transitiva foi registrado em `THIRD_PARTY_NOTICES.md`.

A conclusão técnica da W-06 não substitui:

- SBOM final;
- revisão jurídica da árvore resolvida;
- autorização contratual/operacional;
- decisão de piloto;
- decisão de produção.

## 9. Itens não executados

- runtime Baileys não foi registrado;
- socket oficial não foi aberto;
- nenhuma autenticação foi resolvida;
- credenciais e keys não foram persistidas;
- QR e pairing não foram operacionalizados;
- nenhuma sessão real foi criada;
- nenhum número real foi utilizado;
- nenhuma reconexão automática foi ativada;
- gateway não foi implantado;
- automação e IA permanecem desabilitadas;
- produção permanece bloqueada.

## 10. Resultado

A W-06 prova o adapter e sua fronteira, não uma integração operacional. A próxima sprint autorizada é W-07 — armazenamento criptográfico da sessão — ainda com testes/doubles e sem conexão, QR, pairing, número real ou deploy.
