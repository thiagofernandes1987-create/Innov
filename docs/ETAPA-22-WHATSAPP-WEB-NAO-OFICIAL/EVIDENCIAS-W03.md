# Evidências — Sprint W-03

**Sprint:** W-03 — Contrato de engine e matriz de capacidades  
**Branch:** `feature/etapa-22-provider-whatsapp-web-baileys`  
**PR:** #40  
**Estado:** concluída  
**Data:** 03 de agosto de 2026  
**Head funcional validado:** `edb80e369f2ffde61f1e558aee5318027a02d7d3`

---

## 1. Checklist e evidências

- [x] **W-03.1 — Criar interface `MessagingEngine`**  
  Evidência: `lib/messaging/engine.ts`, comando e resultado canônicos de envio.

- [x] **W-03.2 — Criar interface `SessionEngine`**  
  Evidência: lifecycle tipado, snapshot de sessão, pairing opcional e implementação determinística no mock.

- [x] **W-03.3 — Criar interface `EngineEventSource`**  
  Evidência: eventos canônicos, listener tipado, unsubscribe e validação de provider.

- [x] **W-03.4 — Criar `EngineCapabilityMatrix`**  
  Evidência: `lib/messaging/capabilities.ts`, níveis `SUPPORTED`, `CONDITIONAL`, `UNSUPPORTED` e `PLANNED`.

- [x] **W-03.5 — Definir capacidades de texto, mídia, reação, resposta, grupo, presença, histórico e edição**  
  Evidência: catálogo `ENGINE_CAPABILITIES`. A matriz Meta declara somente recursos realmente encapsulados pelo Innov.

- [x] **W-03.6 — Definir `UnsupportedCapabilityError`**  
  Evidência: erro explícito e `requireEngineCapability`; não existe fallback silencioso.

- [x] **W-03.7 — Encapsular provider Meta no mesmo contrato sem regressão**  
  Evidência: `MetaCloudMessagingEngine`, factory server e server action roteada por comando canônico. O transporte Graph permanece em `lib/whatsapp/client.ts`.

- [x] **W-03.8 — Criar `MockMessagingEngine`**  
  Evidência: envio determinístico, falhas programáveis, sessão, pairing e event source.

- [x] **W-03.9 — Criar contract tests para todos os engines**  
  Evidência: `tests/messaging-engine.test.ts`, casos compartilhados Meta/Mock e testes específicos. A suíte completa aprovou 278 testes, incluindo 18 da W-03.

- [x] **W-03.10 — Criar feature flags por provider e organização**  
  Evidência: `lib/messaging/feature-flags.ts`, `lib/messaging/policy.server.ts` e `MESSAGING_PROVIDER_FLAGS_JSON`. Configuração inválida falha fechada.

- [x] **W-03.11 — Ocultar ações não suportadas na interface**  
  Evidência: workspace deriva capabilities efetivas; a tela oculta abertura, texto, template, documento e envio quando não suportados. As server actions repetem o gate no backend.

---

## 2. Arquitetura implementada

```text
UI / Server Action
       ↓
Organization Provider Policy
       ↓
Effective Capability Matrix
       ↓
Canonical EngineSendCommand
       ↓
MessagingEngine
       ↓
MetaCloudMessagingEngine
       ↓
MetaCloudTransport
       ↓
Cloud API client existente
```

A UI não é fronteira de segurança. A mesma política é aplicada no servidor antes de criar conversa e antes de enfileirar/enviar mensagem.

---

## 3. Matriz Meta efetivamente suportada

| Capability | Estado |
|---|---|
| Abrir conversa | `SUPPORTED` |
| Enviar texto | `SUPPORTED` |
| Enviar template | `SUPPORTED` |
| Enviar documento | `SUPPORTED` |
| Inbound de mensagens | `SUPPORTED` |
| Inbound de receipts | `SUPPORTED` |
| Imagem, áudio e vídeo outbound | `UNSUPPORTED` nesta versão |
| Reação e resposta citada | `UNSUPPORTED` nesta versão |
| Grupos | `UNSUPPORTED` nesta versão |
| Presença | `UNSUPPORTED` nesta versão |
| History sync | `UNSUPPORTED` nesta versão |
| Edição/exclusão | `UNSUPPORTED` nesta versão |
| Sessão/pairing | `UNSUPPORTED` para Meta Cloud |

A matriz descreve o adapter atual do Innov, não o catálogo teórico completo do provider.

---

## 4. Feature flags e comportamento fail-closed

A configuração é lida de `MESSAGING_PROVIDER_FLAGS_JSON` por organização e provider.

Controles provados:

- Meta Cloud permanece o único runtime implementado;
- Baileys não se torna ativo mesmo quando solicitado no JSON;
- capabilities podem ser desabilitadas por organização;
- JSON inválido desabilita o provider;
- provider desabilitado remove ações da UI;
- chamadas diretas às server actions também são bloqueadas;
- nenhuma flag instala dependência ou registra runtime.

---

## 5. Roteamento Meta sem regressão

O envio existente continua preservando:

- autorização de módulo/projeto;
- janela de atendimento;
- bindings e fontes canônicas;
- snapshot, versão e SHA-256;
- outbox/RPC de enfileiramento;
- URL assinada temporária para documento;
- conclusão monotônica de status;
- auditoria do envio.

A diferença é que a server action não chama mais diretamente `sendWhatsAppText`, `sendWhatsAppDocument` ou `sendWhatsAppTemplate`. Ela cria um `EngineSendCommand` e usa o `MetaCloudMessagingEngine`.

---

## 6. Gate de fronteira v3

O validador `scripts/validate-messaging-boundaries.mjs` comprova:

- três contratos de engine presentes;
- capability matrix presente;
- policy gate na UI e no backend;
- envio Meta roteado pelo engine;
- feature flags organizacionais presentes;
- ausência de import Baileys no código não autorizado;
- ausência de tipos nativos Baileys fora dos adapters;
- ausência de Baileys no `package.json`;
- lista de runtimes implementados contendo apenas `META_CLOUD`.

O teste `tests/messaging-boundary.test.ts` valida o contrato `messaging-engine-boundary-v3` e seus controles, em vez de apenas comparar a ausência de imports.

---

## 7. Validação executada

### Head validado

`edb80e369f2ffde61f1e558aee5318027a02d7d3`

### Runs

- CI: `30866943997`
- Stage 20 File Security E2E: `30866944005`

### Resultados

| Validação | Resultado |
|---|---|
| Preflight estrutural | `PASS` |
| Documentação e inventário existentes | `PASS` |
| Migrations e validadores das etapas | `PASS` |
| Testes de banco | `PASS` |
| Lint | `PASS` |
| Typecheck | `PASS` |
| Vitest | `PASS` — 278 testes |
| Testes W-03 | `PASS` — 18 testes de engine |
| Testes Python | `PASS` |
| Build Next.js | `PASS` |
| Quarentena limpa/EICAR | `PASS` |
| Vercel | `PASS` |

### Correções produzidas pelo ciclo

1. listener de teste alterado para retornar `void`, conforme `EngineEventListener`;
2. teste do gate atualizado de `messaging-engine-boundary-v1` para `v3`, passando a verificar os controles adicionais.

Nenhum contrato foi enfraquecido para eliminar as falhas.

---

## 8. Itens deliberadamente não executados

- Baileys não foi instalado;
- `BaileysEngineAdapter` não foi criado;
- gateway persistente não foi criado;
- nenhuma sessão, QR ou pairing real foi criado;
- nenhuma migration multiprovider foi criada;
- nenhum número real foi usado;
- nenhum auto-reply ou IA foi habilitado;
- nenhuma produção foi autorizada.

---

## 9. Resultado do gate W-G03

A arquitetura pode avançar para a Sprint W-04 porque:

- o domínio possui contratos neutros;
- engines possuem portas estáveis;
- capabilities são explícitas;
- Meta funciona pelo mesmo contrato;
- mock permite testes sem canal externo;
- UI e backend respeitam policy/capability;
- provider não implementado não pode ser ativado por configuração;
- Baileys continua confinado ao planejamento.

A aprovação da W-03 não autoriza runtime, sessão ou provider não oficial.

---

## 10. Próxima sprint

**W-04 — Evolução do banco sem domínio paralelo**

A próxima etapa deverá criar uma evolução aditiva e reversível do schema, mantendo Cliente 360, conversas, mensagens e fontes canônicas como domínio único. Baileys continuará não instalado durante a W-04.