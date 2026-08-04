# Provider WhatsApp Web não oficial — índice de governança

**Status atual:** Sprints W-01 a W-07 concluídas; store cifrado validado somente com dados sintéticos  
**Produção:** bloqueada  
**Próxima sprint:** W-08 — single writer, lease e lifecycle controlado

---

## Ordem de leitura

1. [`SPEC.md`](./SPEC.md) — constituição técnica do subprojeto.
2. [`INVENTARIO.md`](./INVENTARIO.md) — ledger de marcos, sprints, tarefas e gates.
3. [`ADR-001-PROVIDER-WHATSAPP-WEB-NAO-OFICIAL.md`](./ADR-001-PROVIDER-WHATSAPP-WEB-NAO-OFICIAL.md) — decisão arquitetural e limites da autorização.
4. [`MATRIZ-LICENCAS-E-REAPROVEITAMENTO.md`](./MATRIZ-LICENCAS-E-REAPROVEITAMENTO.md) — permissões, bloqueios e técnicas por projeto/arquivo.
5. [`POLITICA-RISCO-CONSENTIMENTO-E-DESLIGAMENTO.md`](./POLITICA-RISCO-CONSENTIMENTO-E-DESLIGAMENTO.md) — número autorizado, aceite, opt-out, casos proibidos e remoção de sessão.
6. [`CONTRATOS-CANONICOS-V1.md`](./CONTRATOS-CANONICOS-V1.md) — modelo provider-neutral concluído na W-02.
7. [`SCHEMA-W04.md`](./SCHEMA-W04.md) — persistência multiprovider sem domínio paralelo.
8. [`GATEWAY-W05.md`](./GATEWAY-W05.md) — processo isolado, HMAC, replay, lifecycle e container endurecido.
9. [`ADAPTER-BAILEYS-W06.md`](./ADAPTER-BAILEYS-W06.md) — adapter, fábrica, identidades, conteúdo, erros e supply chain.
10. [`SESSION-STORE-W07.md`](./SESSION-STORE-W07.md) — envelope encryption, CAS, rotação, backup, restore e exclusão criptográfica.
11. [`EVIDENCIAS-W01.md`](./EVIDENCIAS-W01.md) — evidências de governança.
12. [`EVIDENCIAS-W02.md`](./EVIDENCIAS-W02.md) — evidências dos contratos canônicos.
13. [`EVIDENCIAS-W03.md`](./EVIDENCIAS-W03.md) — contratos de engine, capabilities, policy gates e CI.
14. [`EVIDENCIAS-W04.md`](./EVIDENCIAS-W04.md) — migration, RLS, testes PostgreSQL e rollback lógico.
15. [`EVIDENCIAS-W05.md`](./EVIDENCIAS-W05.md) — testes HTTP/HMAC, build e smoke test do container.
16. [`EVIDENCIAS-W06.md`](./EVIDENCIAS-W06.md) — versão exata, contract tests, boundaries, lockfile e CI.
17. [`EVIDENCIAS-W07.md`](./EVIDENCIAS-W07.md) — store cifrado, oito controles PostgreSQL, treze testes e builds.
18. [`../../THIRD_PARTY_NOTICES.md`](../../THIRD_PARTY_NOTICES.md) — licença, dependências transitivas e bloqueios jurídicos.

---

## Decisões já fixadas

- Meta Cloud API permanece o provider oficial e o único runtime registrado;
- providers compartilham domínio, mas não runtime;
- contratos canônicos, engines e capabilities são provider-neutral;
- as relações `whatsapp_*` permanecem o domínio operacional único;
- as relações `channel_*` são exclusivamente técnicas;
- o gateway é um processo Node.js separado do Next.js;
- o cliente ativo do gateway continua sendo `FakeChannelClient`;
- `@whiskeysockets/baileys@7.0.0-rc13` existe somente no workspace do gateway;
- tipos nativos Baileys ficam confinados ao adapter autorizado;
- a fábrica oficial permanece bloqueada por padrão;
- QR não é persistido nem propagado como valor;
- lifecycle scripts de dependências externas permanecem bloqueados;
- o lockfile regenerado deve possuir o SHA-256 aprovado;
- o store da W-07 usa AES-256-GCM, AAD e uma DEK aleatória por sessão;
- a KEK é acessada apenas pela porta `KeyEnvelopeProvider` e não pertence ao banco;
- escrita utiliza CAS por geração e transações;
- rotação completa da DEK e rewrap da KEK são operações distintas;
- backup e restore trabalham apenas com envelopes cifrados e manifesto de integridade;
- exclusão criptográfica remove envelope, registros cifrados e keys;
- auditoria é sanitizada e não contém material sensível;
- `useMultiFileAuthState` é bloqueado pelo scanner fora de laboratório descartável;
- o bridge `AuthenticationState` não está ligado ao bootstrap;
- single writer, lease, fencing e lifecycle pertencem à W-08;
- nenhum mecanismo de evasão, spam ou rotação de contas será implementado;
- nenhuma IA será acoplada diretamente ao Baileys;
- produção exige decisão posterior específica.

---

## Estado verificável

| Item | Estado |
|---|---|
| Governança, ADR e licenças | concluídas — W-01 |
| Contratos canônicos | concluídos — W-02 |
| Engines, capabilities e policy gates | concluídos — W-03 |
| Persistência multiprovider aditiva | concluída — W-04 |
| Gateway isolado | concluído — W-05 |
| Adapter Baileys confinado | concluído — W-06 |
| Store cifrado e transacional | concluído com dados sintéticos — W-07 |
| Engine boundary | `v5` verde |
| Storage boundary | `v3` verde |
| Session-store boundary | `v1` verde |
| PostgreSQL W-07 | 8 controles verdes |
| Testes específicos W-07 | 13 verdes |
| Lint e typecheck | verdes |
| Suíte global e testes Python | verdes |
| Build do gateway | verde |
| Container não-root e sem rede | verde |
| Build Next.js | verde |
| File Security E2E | verde |
| Runtime Baileys registrado | não |
| Socket externo aberto | não |
| Dados reais de sessão | não |
| QR/pairing operacional | não |
| Single writer, lease e fencing | não — W-08 |
| Número autorizado | não |
| Deploy do gateway | não |
| Revisão jurídica transitiva | pendente |
| Produção | bloqueada |

---

## Regra de continuidade

Toda nova sessão de trabalho deve:

1. ler este índice;
2. reler `SPEC.md` e `INVENTARIO.md`;
3. localizar a primeira sprint pendente autorizada;
4. executar somente seu escopo;
5. registrar evidências;
6. atualizar checks no mesmo momento;
7. preservar dependências externas como bloqueios, não como conclusões.
