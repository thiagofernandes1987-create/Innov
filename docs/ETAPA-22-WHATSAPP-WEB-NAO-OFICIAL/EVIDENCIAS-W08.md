# Evidências — Sprint W-08

**Sprint:** W-08 — Single writer, lease e lifecycle  
**Branch:** `feature/etapa-22-provider-whatsapp-web-baileys`  
**PR:** #40  
**Estado:** concluída no escopo sintético  
**Data:** 04 de agosto de 2026

## Checklist técnico

- [x] `session_runtime_leases` criado;
- [x] lease com expiração implementado;
- [x] fencing token monotônico implementado;
- [x] segundo writer bloqueado;
- [x] state machine de conexão implementada;
- [x] QR e pairing reduzidos a metadados efêmeros;
- [x] persistência de valor QR/pairing proibida;
- [x] reconnect com backoff e jitter limitados;
- [x] logout, restrição, transitório e ação humana classificados;
- [x] takeover após expiração implementado;
- [x] kill switch global e por sessão implementados;
- [x] processo zumbi testado;
- [x] reinício durante atualização de credenciais testado;
- [x] restauração em nova instância testada.

## Artefatos principais

- `apps/messaging-gateway/src/runtime/contracts.ts`;
- `apps/messaging-gateway/src/runtime/backoff.ts`;
- `apps/messaging-gateway/src/runtime/failure-classification.ts`;
- `apps/messaging-gateway/src/runtime/memory-runtime-lease-repository.ts`;
- `apps/messaging-gateway/src/runtime/lifecycle-supervisor.ts`;
- `apps/messaging-gateway/src/runtime/index.ts`;
- `supabase/migrations/20260804134000_stage22_session_runtime_leases.sql`;
- `supabase/tests/messaging-runtime-leases/lifecycle.test.sql`;
- `scripts/run-messaging-runtime-lease-db-tests.mjs`;
- `scripts/validate-messaging-runtime-lifecycle.mjs`;
- `tests/messaging-runtime-lifecycle.test.ts`;
- `RUNTIME-LIFECYCLE-W08.md`.

## Evidência funcional

**Head funcional validado:** `d7bf69dd4db5e0e0f7be1a6f85a3a685675b8221`

### CI

- workflow: `CI`;
- run: `30914446427`;
- preflight: verde;
- quality: verde;
- `messaging-runtime-lifecycle-boundary-v1`: verde;
- `messaging-storage-boundary-v4`: verde;
- 12 controles PostgreSQL W-08: verdes;
- testes específicos de lifecycle: verdes;
- testes W-04, W-07, gateway e adapter: verdes;
- lint: verde;
- typecheck: verde;
- suíte TypeScript global: verde;
- testes Python: verdes;
- build do messaging gateway: verde;
- smoke test do container sem rede: verde;
- build Next.js: verde.

### File Security E2E

- workflow: `Stage 20 File Security E2E`;
- run: `30914450873`;
- protocolo de quarentena clean/EICAR: verde.

## Provas comportamentais

### PostgreSQL

1. aquisição inicial recebe token 1;
2. segundo writer recebe `LEASE_HELD`;
3. renovação preserva o token;
4. CAS inicial exige fence vigente;
5. lease expirado permite takeover com token 2;
6. processo zumbi recebe `FENCING_TOKEN_STALE`;
7. CAS zumbi não altera a geração;
8. novo writer atualiza credenciais;
9. kill switch por sessão bloqueia renovação;
10. kill switch global bloqueia aquisição;
11. release preserva monotonicidade do próximo token;
12. RLS, privilégio mínimo e auditoria sanitizada são obrigatórios.

### TypeScript

- state machine determinística;
- desafio de pairing nunca aparece no snapshot seguro;
- backoff não permite reconnect antecipado;
- falhas transitórias, logout, restrição e ação humana são separadas;
- takeover fenceia a instância anterior;
- atualização em andamento é abortada antes do commit quando o token muda;
- restore só é aceito pela nova instância;
- kill switch encerra o writer sintético;
- release incrementa o token da próxima aquisição.

## Bloqueios preservados

- runtime Baileys não registrado;
- nenhum socket externo;
- nenhum QR ou pairing real;
- nenhuma credencial real;
- nenhum número real;
- gateway sem acesso operacional ao banco principal;
- nenhum deploy ou piloto;
- produção bloqueada;
- revisão jurídica da árvore transitiva continua externa;
- W-09 não iniciada neste fechamento.

## Observação externa

O status Vercel pode permanecer vermelho por `build-rate-limit`. Essa limitação de conta não substitui nem invalida o build Next.js verde executado no CI do repositório.
