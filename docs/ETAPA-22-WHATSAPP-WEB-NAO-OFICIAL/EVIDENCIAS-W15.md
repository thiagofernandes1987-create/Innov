# Evidências — Sprint W-15

**Estado:** concluída no escopo sintético e `draft_only`  
**Data:** 04 de agosto de 2026

## Entregas

- [x] `AiProvider`;
- [x] `AiOrchestrator` independente do canal;
- [x] `ContextBuilder` minimizado;
- [x] retrieval lexical;
- [x] retrieval vetorial opcional;
- [x] fallback híbrido;
- [x] filtros de tenancy, obra, versão e validade;
- [x] precedência de workflow;
- [x] lock atômico por conversa;
- [x] orçamento por organização;
- [x] handoff persistente e resumo;
- [x] IA desativada quando humano assume;
- [x] citações internas;
- [x] validação de números, datas, valores e compromissos;
- [x] proteção contra prompt injection;
- [x] auditoria de modelo, fontes, ferramentas e custo;
- [x] modo inicial `DRAFT_ONLY`.

## Evidência executável

Head funcional: `e8d05fa13a68caf91cbe8ef92bfdea0cb765cb92`.

- Messaging Incremental Loop `30938665414`: verde;
- CI `30938663741`: preflight e quality verdes;
- File Security E2E `30938664486`: verde;
- `messaging-governed-ai-bridge-boundary-v1`: verde;
- 12 controles PostgreSQL W-15: verdes;
- suíte global, lint, typecheck, Python, gateway, container e Next.js: verdes.

## Não executado

Nenhum provider externo de IA, envio automático, conta, sessão, QR, número real, piloto, deploy ou produção foi utilizado.
