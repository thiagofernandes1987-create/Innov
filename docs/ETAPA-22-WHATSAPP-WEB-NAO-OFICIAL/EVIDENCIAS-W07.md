# Evidências — Sprint W-07

**Sprint:** W-07 — Armazenamento criptográfico da sessão  
**Branch:** `feature/etapa-22-provider-whatsapp-web-baileys`  
**PR:** #40  
**Estado:** concluída no escopo sintético, sem conexão externa  
**Data:** 04 de agosto de 2026  
**Head funcional validado:** `a13c773ab5d7ad5fd45c4298e2b8a6532164deab`

## Checklist técnico concluído

- [x] `SessionCredentialStore` compilado e testado;
- [x] credenciais, keys e versões validadas;
- [x] transações e rollback validados;
- [x] optimistic concurrency validada;
- [x] envelope encryption validada;
- [x] DEK distinta por sessão validada;
- [x] KEK ausente do banco comprovada;
- [x] logs sem material criptográfico comprovados;
- [x] rotação e rewrap validados;
- [x] backup e restore validados;
- [x] exclusão criptográfica validada;
- [x] auditoria sanitizada validada;
- [x] corrupção, versão e concorrência testadas;
- [x] `useMultiFileAuthState` bloqueado pelo scanner.

## Artefatos implementados

- `apps/messaging-gateway/src/session-store/contracts.ts`;
- `apps/messaging-gateway/src/session-store/envelope-crypto.ts`;
- `apps/messaging-gateway/src/session-store/memory-repository.ts`;
- `apps/messaging-gateway/src/session-store/session-credential-store.ts`;
- `apps/messaging-gateway/src/session-store/index.ts`;
- `apps/messaging-gateway/src/engines/baileys/stored-auth-state.ts`;
- `supabase/migrations/20260804123000_stage22_session_credential_store.sql`;
- `supabase/migrations/20260804123500_stage22_session_credential_store_function_fix.sql`;
- `supabase/tests/messaging-session-credentials/storage.test.sql`;
- `scripts/run-messaging-session-credential-db-tests.mjs`;
- `scripts/validate-messaging-session-store.mjs`;
- `tests/messaging-session-credential-store.test.ts`;
- `SESSION-STORE-W07.md`.

## Evidências executáveis

### Boundaries

- `messaging-session-store-boundary-v1` — verde;
- `messaging-engine-boundary-v5` — verde;
- `messaging-storage-boundary-v3` — verde;
- `messaging-gateway-boundary-v4` — verde;
- lockfile Baileys aprovado e reproduzido sem lifecycle scripts.

### PostgreSQL real

O CI inicializou PostgreSQL local e executou os runners em modo fail-closed.

- 11 controles multiprovider W-04 — verdes;
- 8 controles do session store W-07 — verdes;
- criação transacional e CAS;
- rejeição de geração obsoleta;
- versionamento crescente;
- ausência de chave-mestra e plaintext no schema;
- isolamento por organização, conta e provider;
- auditoria sanitizada;
- RLS forçada e privilégio mínimo;
- exclusão criptográfica preservando somente auditoria.

### Testes TypeScript

- 13 testes específicos do `SessionCredentialStore` e do bridge `AuthenticationState` — verdes;
- escrita e leitura de credenciais;
- concorrência com um único vencedor;
- DEK distinta por sessão;
- batch transacional de keys;
- rollback em entrada inválida;
- rotação completa da DEK;
- rewrap sob nova KEK;
- backup e restore sem plaintext;
- rejeição de backup adulterado;
- falha fechada com KEK incorreta;
- exclusão criptográfica;
- integração Baileys sem arquivo, socket ou QR.

### Pipeline funcional

CI run `30910897339`:

- preflight `91997107333` — verde;
- quality `91997157007` — verde;
- lint — verde;
- typecheck — verde;
- suíte Vitest global — verde;
- testes Python — verdes;
- build do gateway — verde;
- container smoke test não-root e sem rede — verde;
- build Next.js — verde.

File Security E2E run `30910899334`:

- protocolo clean/EICAR — verde;
- evidência de quarentena publicada pelo workflow.

O Vercel não executou novo build por `build-rate-limit`; isso é uma limitação externa de cota. A compilação Next.js equivalente foi executada e aprovada no CI.

## Invariantes comprovadas

- AES-256-GCM com IV de 12 bytes e authentication tag de 16 bytes;
- AAD vincula organização, sessão, conta, provider, tipo lógico e versões;
- uma DEK aleatória de 32 bytes por sessão;
- KEK atrás de `KeyEnvelopeProvider` e fora do banco;
- banco contém somente envelopes e ciphertext em `bytea`;
- nenhuma coluna para QR, pairing, chave-mestra ou credencial em claro;
- CAS por `expectedGeneration`;
- operações sintéticas transacionais e rollback integral;
- backup contém apenas material cifrado e manifesto SHA-256;
- restore valida manifesto, KEK, AAD e tags antes do commit;
- exclusão remove envelope, credenciais e keys;
- auditoria não persiste segredo, ciphertext ou material de chave;
- código do store e bridge não registra material em console;
- `useMultiFileAuthState` possui zero ocorrências fora do laboratório descartável permitido;
- bridge Baileys permanece dentro do diretório autorizado;
- bootstrap continua no `FakeChannelClient`.

## Bloqueios preservados

- nenhuma sessão ou credencial real;
- nenhum socket externo;
- nenhum QR ou pairing operacional;
- nenhuma KEK de produção;
- nenhum número real;
- nenhum lease ou fencing token;
- nenhum reconnect automático;
- nenhum deploy;
- produção bloqueada;
- revisão jurídica/SBOM da árvore transitiva ainda externa.

## Resultado do gate

**Gate W-G07 concluído:** armazenamento criptográfico, CAS, rotação, backup, restore, exclusão e auditoria foram implementados e testados apenas com material sintético. O gate não autoriza lifecycle real, conexão, QR, número, deploy, piloto ou produção.
