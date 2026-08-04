# Evidências — Sprint W-13

**Estado:** concluída no escopo sintético  
**Data:** 04 de agosto de 2026

## Checklist

- [x] inbox multiprovider sobre o domínio `whatsapp_*` existente;
- [x] origem de cada thread preservada;
- [x] agrupamento por contato canônico sem mesclar históricos;
- [x] filtros por provider, conta, fila, responsável, obra, estado e não lidas;
- [x] provider e estado do canal visíveis;
- [x] atribuição, assumir atendimento e transferência com optimistic concurrency;
- [x] notas internas sanitizadas;
- [x] presença do operador separada do estado do canal;
- [x] indicadores de humano, automação, sistema e IA;
- [x] estados `ONLINE`, `OFFLINE`, `RECONNECTING`, `DEGRADED` e `ACTION_REQUIRED`;
- [x] ações bloqueadas por capability e estado;
- [x] layout responsivo;
- [x] eventos de workspace sanitizados e consumidos somente pelo backend Innov;
- [x] concorrência de agentes testada;
- [x] nenhuma tabela paralela de contatos, conversas ou mensagens.

## Evidência executável

Head funcional: `eddba98499d20fd55f6df403be37032f1efb8e7b`.

- Messaging Incremental Loop `30933651497`: verde;
- CI `30933650796`: preflight e quality verdes;
- File Security E2E `30933648320`: verde;
- `messaging-multiprovider-inbox-boundary-v1`: verde;
- 13 controles PostgreSQL W-13: verdes;
- suíte global: 384 testes verdes;
- lint e typecheck: verdes;
- build do gateway e smoke test do container: verdes;
- build Next.js: verde.

## Fronteiras preservadas

- Meta Cloud permanece o único runtime de canal registrado;
- Baileys permanece confinado e sem socket externo;
- nenhuma sessão, QR, pairing, conta ou número real foi utilizado;
- nenhum deploy, piloto ou produção foi habilitado;
- indicadores de IA não executam IA e não autorizam envio autônomo.
