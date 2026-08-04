# Evidências — Sprint W-02

**Sprint:** W-02 — Modelo canônico de canal, identidade e mensagem  
**Branch:** `feature/etapa-22-provider-whatsapp-web-baileys`  
**PR:** #40  
**Estado:** implementação concluída; validação CI em andamento  
**Data:** 03 de agosto de 2026

---

## 1. Entregas

| Tarefa | Artefato/evidência | Estado |
|---|---|---|
| W-02.1 — `ChannelProviderType` | `lib/messaging/domain.ts` | implementado |
| W-02.1.1 — `META_CLOUD` | provider implementado declarado | implementado |
| W-02.1.2 — `WHATSAPP_WEB_BAILEYS` | provider planejado, sem dependência | implementado |
| W-02.1.3 — `WEB_CHAT` | provider planejado | implementado |
| W-02.1.4 — providers futuros | whatsmeow, Puppeteer, e-mail e custom reservados | implementado |
| W-02.2 — `CanonicalIdentity` | contrato versionado | implementado |
| W-02.3 — namespaces | PN, LID, grupo, newsletter, web, telefone, e-mail e custom | implementado |
| W-02.4 — `CanonicalMessage` | contrato versionado e validador | implementado |
| W-02.5 — `CanonicalMedia` | referência, MIME, hash, tamanho e quarentena | implementado |
| W-02.6 — `CanonicalReceipt` | receipt e validador | implementado |
| W-02.7 — `CanonicalConversation` | participantes, contas e vínculos de negócio | implementado |
| W-02.8 — `ProviderMetadata` | bolsa opaca/sanitizada separada | implementado |
| W-02.9 — versionamento | `MESSAGING_CONTRACT_VERSION = 1.0.0` | implementado |
| W-02.10 — proibir imports Baileys | script e teste de fronteira | implementado; CI pendente |
| W-02.11 — mapear Etapa 22 | `whatsapp-compatibility.ts` | implementado |
| W-02.12 — compatibilidade Meta | projeção aditiva; cliente/webhook/migrations não alterados | implementado; regressão CI pendente |

---

## 2. Arquivos

### Código

- `lib/messaging/domain.ts`
- `lib/messaging/whatsapp-compatibility.ts`

### Testes e validação

- `tests/messaging-domain.test.ts`
- `tests/messaging-boundary.test.ts`
- `scripts/validate-messaging-boundaries.mjs`
- script `validate:messaging-boundaries` em `package.json`

### Documentação

- `CONTRATOS-CANONICOS-V1.md`
- este arquivo

---

## 3. Decisões técnicas provadas pelo código

### Conta interna e externa

O contrato separa:

- `channelAccountId`: UUID interno usado pelo domínio;
- `providerAccountId`: identificador externo, como `phone_number_id`.

Essa separação foi adicionada antes dos testes para eliminar uma ambiguidade encontrada durante a implementação.

### Identidade não é Cliente 360

`CanonicalIdentity` registra a identidade observada por canal. O vínculo com cliente permanece separado e aparece em `CanonicalConversation.linkedEntities.clientId`.

### Metadata não governa o domínio

Campos específicos do provider ficam em `CanonicalProviderMetadata`. O domínio não acessa diretamente payload Graph ou tipos Baileys.

### Falha explícita de compatibilidade

Status `ACCEPTED` e `CANCELLED`, ainda não existentes no schema legado, lançam `INCOMPATIBLE_LEGACY_VALUE`. Nenhum valor é aproximado silenciosamente.

### Compatibilidade aditiva

Não foram alterados:

- `lib/whatsapp/domain.ts`;
- `lib/whatsapp/client.ts`;
- webhook Meta;
- migrations da Etapa 22;
- ações ou UI atuais.

---

## 4. Testes adicionados

`messaging-domain.test.ts` cobre:

- classificação de providers;
- separação de IDs internos/externos;
- normalização de identidade;
- chave com organização, provider, conta e namespace;
- projeção de conversa e vínculos;
- inbound/outbound;
- preservação de fonte e SHA;
- validação de texto;
- incompatibilidade de status;
- receipt e erros.

`messaging-boundary.test.ts` executa o validador estrutural que examina as raízes de código e reprova imports/tipos Baileys fora dos adapters autorizados.

---

## 5. Validação

Comandos esperados no CI:

```bash
pnpm validate:messaging-boundaries
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

| Validação | Estado | Evidência |
|---|---|---|
| Gate de fronteira | em execução pelo teste/CI | PR #40 |
| Lint | pendente | PR #40 |
| Typecheck | pendente | PR #40 |
| Vitest | pendente | PR #40 |
| Build | pendente | PR #40 |
| Stage 20 File Security E2E | em andamento | PR #40 |

Nenhum check da Sprint W-02 será fechado no inventário antes do resultado verificável do CI.

---

## 6. Itens deliberadamente não executados

- Baileys não instalado;
- nenhum adapter Baileys criado;
- nenhum runtime persistente criado;
- nenhuma migration multiprovider;
- nenhuma sessão;
- nenhum QR ou pairing;
- nenhum número real;
- nenhum auto-reply;
- nenhuma IA;
- nenhuma autorização de produção.

---

## 7. Próxima ação condicionada

Após CI verde e fechamento do inventário, a próxima sprint será:

**W-03 — Contrato de engine e matriz de capacidades.**

A W-03 deverá criar interfaces de execução, mock engine, capability matrix e adaptar a Meta ao contrato sem adicionar Baileys ainda.