# Evidências — Sprint W-04

**Sprint:** W-04 — Evolução do banco sem domínio paralelo  
**Branch:** `feature/etapa-22-provider-whatsapp-web-baileys`  
**PR:** #40  
**Estado:** concluída  
**Data:** 03 de agosto de 2026  
**Head funcional validado:** `3768aabed65710dd2a9c7684fa2f36956921feb6`

---

## 1. Artefatos implementados

- `supabase/migrations/20260804011500_stage22_multiprovider_storage.sql`;
- `supabase/tests/messaging-multiprovider/fixture.sql`;
- `supabase/tests/messaging-multiprovider/legacy-seed.sql`;
- `supabase/tests/messaging-multiprovider/storage.test.sql`;
- `scripts/run-messaging-multiprovider-db-tests.mjs`;
- `scripts/validate-messaging-storage.mjs`;
- `package.json`;
- `.github/workflows/ci.yml`;
- `SCHEMA-W04.md`.

## 2. Checklist concluído

- [x] inventário das sete relações `whatsapp_*`;
- [x] decisão de evolução aditiva, mantendo o domínio existente;
- [x] provider e conta externa explícitos onde necessários;
- [x] identidades externas ligadas ao contato existente;
- [x] aliases PN/LID com unicidade por organização, provider e conta;
- [x] comandos idempotentes;
- [x] outbox durável;
- [x] inbox sanitizada e deduplicada;
- [x] DLQ idempotente;
- [x] ledger de tentativas;
- [x] RLS forçada e escrita direta revogada;
- [x] testes negativos multiempresa;
- [x] rollback lógico sem perda histórica.

## 3. Domínio único preservado

A migration não cria:

- `channel_contacts`;
- `channel_conversations`;
- `channel_messages`.

Contatos, conversas, mensagens, bindings, status e vínculos com Cliente 360, obra, contrato, oportunidade e SAC continuam nas relações existentes da Etapa 22.

## 4. Controles de banco executados

A suíte PostgreSQL executou onze confirmações obrigatórias:

1. backfill dos registros Meta legados;
2. identificador de mensagem externo escopado por provider e conta;
3. aliases externos sem criar contato paralelo;
4. comando e outbox idempotentes;
5. RLS e privilégio mínimo;
6. inbox sanitizada e idempotente;
7. claim durável da outbox;
8. ledger de tentativas e próximo retry;
9. DLQ idempotente;
10. rollback lógico sem apagar histórico;
11. ausência de conta ou runtime Baileys.

O runner falha quando não encontra as onze confirmações, impedindo sucesso silencioso.

## 5. Gate estrutural

O contrato `messaging-storage-boundary-v1` validou:

| Controle | Resultado |
|---|---|
| relações legadas preservadas | 7 |
| relações técnicas adicionadas | 7 |
| controles comportamentais | 11 |
| tabelas paralelas de contato/conversa/mensagem | 0 |
| colunas destinadas a evento bruto na inbox | 0 |
| Baileys instalado | não |

## 6. Validação do head funcional

### Runs

- CI: `30868484609`;
- Stage 20 File Security E2E: `30868484604`.

### Resultados

| Validação | Resultado |
|---|---|
| preflight e migration ledger | `PASS` |
| gate `messaging-storage-boundary-v1` | `PASS` |
| testes PostgreSQL W-04 | `PASS` — 11 controles |
| demais testes de banco | `PASS` |
| lint | `PASS` |
| typecheck | `PASS` |
| Vitest | `PASS` |
| testes Python | `PASS` |
| build Next.js | `PASS` |
| quarentena limpa/EICAR | `PASS` |
| Vercel | `PASS` |

## 7. Itens deliberadamente não executados

- Baileys não foi instalado;
- `BaileysEngineAdapter` não foi criado;
- o gateway persistente ainda não foi criado;
- nenhuma sessão, credencial, QR ou pairing foi criado;
- nenhum worker permanente foi iniciado;
- nenhum número real foi usado;
- nenhuma automação ou IA foi habilitada;
- nenhuma produção foi autorizada.

## 8. Resultado do gate W-G04

O gate foi aprovado porque:

- a evolução é aditiva e possui backfill;
- nenhuma entidade de negócio foi duplicada por provider;
- identidades externas são aliases do contato existente;
- comandos, outbox, inbox, DLQ e tentativas são infraestrutura técnica;
- RLS multiempresa e privilégio mínimo foram exercitados em PostgreSQL;
- rollback preserva o histórico;
- Meta continua sendo o único runtime implementado.

A conclusão da W-04 autoriza somente a Sprint W-05 — esqueleto do gateway. Ela não autoriza conexão com WhatsApp Web.
