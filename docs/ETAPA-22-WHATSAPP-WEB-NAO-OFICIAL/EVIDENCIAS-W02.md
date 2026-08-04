# Evidências — Sprint W-02

**Sprint:** W-02 — Modelo canônico de canal, identidade e mensagem  
**Branch:** `feature/etapa-22-provider-whatsapp-web-baileys`  
**PR:** #40  
**Estado:** concluída com validação executável  
**Data:** 03 de agosto de 2026

---

## 1. Entregas

| Tarefa | Artefato/evidência | Estado |
|---|---|---|
| W-02.1 — `ChannelProviderType` | `lib/messaging/domain.ts` | concluído |
| W-02.1.1 — `META_CLOUD` | provider implementado declarado | concluído |
| W-02.1.2 — `WHATSAPP_WEB_BAILEYS` | provider planejado, sem dependência | concluído |
| W-02.1.3 — `WEB_CHAT` | provider planejado | concluído |
| W-02.1.4 — providers futuros | whatsmeow, Puppeteer, e-mail e custom reservados | concluído |
| W-02.2 — `CanonicalIdentity` | contrato versionado | concluído |
| W-02.3 — namespaces | PN, LID, grupo, newsletter, web, telefone, e-mail e custom | concluído |
| W-02.4 — `CanonicalMessage` | contrato versionado e validador | concluído |
| W-02.5 — `CanonicalMedia` | referência, MIME, hash, tamanho e quarentena | concluído |
| W-02.6 — `CanonicalReceipt` | receipt e validador | concluído |
| W-02.7 — `CanonicalConversation` | participantes, contas e vínculos de negócio | concluído |
| W-02.8 — `ProviderMetadata` | bolsa opaca e sanitizada separada | concluído |
| W-02.9 — versionamento | `MESSAGING_CONTRACT_VERSION = 1.0.0` | concluído |
| W-02.10 — proibir imports Baileys | script e teste de fronteira | concluído |
| W-02.11 — mapear Etapa 22 | `whatsapp-compatibility.ts` | concluído |
| W-02.12 — compatibilidade Meta | projeção aditiva; cliente, webhook e migrations preservados | concluído |

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

A separação elimina a ambiguidade entre a chave interna de tenancy e o identificador usado para chamadas ao provider.

### Identidade não é Cliente 360

`CanonicalIdentity` registra a identidade observada por canal. O vínculo confirmado com cliente permanece separado em `CanonicalConversation.linkedEntities.clientId`.

### Metadata não governa o domínio

Campos específicos do provider ficam em `CanonicalProviderMetadata`. O domínio não acessa diretamente payload Graph nem tipos Baileys.

### Falha explícita de compatibilidade

Status `ACCEPTED` e `CANCELLED`, ainda ausentes no schema legado, lançam `INCOMPATIBLE_LEGACY_VALUE`. Nenhum valor é aproximado silenciosamente.

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
- separação de IDs internos e externos;
- normalização de identidade;
- chave com organização, provider, conta e namespace;
- projeção de conversa e vínculos;
- inbound e outbound;
- preservação de fonte e SHA-256;
- validação de texto;
- incompatibilidade de status;
- receipts e erros.

`messaging-boundary.test.ts` executa o validador estrutural que examina as raízes de código e reprova imports ou tipos Baileys fora dos adapters autorizados.

---

## 5. Validação executável

### CI

- workflow: `CI`;
- run: `30864989008`;
- job `preflight`: sucesso;
- job `quality`: sucesso;
- commit validado: `66a261189f5a3f16e8e8aaf5919f732dcc677728`.

### File Security E2E

- workflow: `Stage 20 File Security E2E`;
- run: `30864988991`;
- job `Quarantine scanner protocol`: sucesso;
- cenário limpo e EICAR: aprovados.

| Validação | Resultado |
|---|---|
| Documentação canônica | sucesso |
| Validação Etapa 22 | sucesso |
| Inventário geral | sucesso |
| Testes de banco existentes | sucesso |
| Lint sem advertências | sucesso |
| Typecheck | sucesso |
| Testes TypeScript | sucesso |
| Testes Python | sucesso |
| Build Next.js | sucesso |
| Gate de fronteira Baileys | sucesso, exercitado pelo Vitest |
| E2E de quarentena de arquivos | sucesso |

### Comandos cobertos

```bash
pnpm validate:messaging-boundaries
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

---

## 6. Gate W-G02

O gate foi satisfeito por:

- contratos provider-neutral versionados;
- projeção Meta sem alteração destrutiva;
- scanner estrutural de imports;
- teste que executa o scanner no CI;
- ausência da dependência Baileys no `package.json`;
- ausência de tipos Baileys no domínio.

O resultado autoriza iniciar a W-03. Não autoriza engine Baileys, sessão real ou produção.

---

## 7. Itens deliberadamente não executados

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

## 8. Próxima ação autorizada

**W-03 — Contrato de engine e matriz de capacidades.**

A W-03 deverá criar interfaces de execução, mock engine, capability matrix, feature flags e o adapter Meta para o novo contrato, sem adicionar Baileys ainda.