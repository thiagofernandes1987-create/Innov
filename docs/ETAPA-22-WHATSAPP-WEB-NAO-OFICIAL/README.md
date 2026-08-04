# Provider WhatsApp Web não oficial — índice de governança

**Status atual:** Sprints W-01 a W-06 concluídas; adapter confinado, runtime e sessão real não iniciados  
**Produção:** bloqueada  
**Próxima sprint:** W-07 — armazenamento criptográfico com fixtures sintéticas e sem conexão real

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
10. [`EVIDENCIAS-W01.md`](./EVIDENCIAS-W01.md) — evidências de governança.
11. [`EVIDENCIAS-W02.md`](./EVIDENCIAS-W02.md) — evidências dos contratos canônicos.
12. [`EVIDENCIAS-W03.md`](./EVIDENCIAS-W03.md) — contratos de engine, capabilities, policy gates e CI.
13. [`EVIDENCIAS-W04.md`](./EVIDENCIAS-W04.md) — migration, RLS, testes PostgreSQL e rollback lógico.
14. [`EVIDENCIAS-W05.md`](./EVIDENCIAS-W05.md) — testes HTTP/HMAC, build e smoke test do container.
15. [`EVIDENCIAS-W06.md`](./EVIDENCIAS-W06.md) — versão exata, 25 contract tests, boundaries, lockfile e CI.
16. [`../../THIRD_PARTY_NOTICES.md`](../../THIRD_PARTY_NOTICES.md) — licença, dependências transitivas e bloqueios jurídicos.

---

## Decisões já fixadas

- o provider não oficial é opcional e revogável;
- Meta Cloud API permanece o provider oficial e o único runtime de canal implementado;
- providers compartilham domínio, mas não runtime;
- `channelAccountId` interno e `providerAccountId` externo são campos distintos;
- identidades PN, LID, grupos, newsletters e usuários web possuem namespaces próprios;
- metadata específica do provider não governa o domínio;
- `MessagingEngine`, `SessionEngine` e `EngineEventSource` são as portas canônicas;
- capabilities descrevem somente recursos efetivamente encapsulados;
- UI e server actions aplicam a mesma policy por organização;
- configuração inválida falha fechada;
- provider sem runtime não pode ser ativado por feature flag;
- Meta Cloud está encapsulada no contrato de engine;
- as sete relações `whatsapp_*` existentes permanecem o domínio operacional único;
- relações `channel_*` guardam somente identidades externas, comandos, outbox, inbox, tentativas, DLQ e rollback;
- não existem tabelas paralelas de contatos, conversas ou mensagens;
- a inbox técnica persiste somente eventos sanitizados;
- tabelas técnicas usam RLS forçada e escrita por portas controladas;
- rollback do provider é lógico e não apaga histórico;
- `apps/messaging-gateway` é um processo Node.js separado do Next.js;
- o gateway exige HMAC, timestamp, nonce, correlation ID e replay guard;
- o gateway não possui acesso ao banco principal;
- health, readiness e métricas não carregam payload ou segredo;
- o container executa como usuário não-root, com filesystem somente leitura e limites operacionais;
- o smoke test do gateway executa com rede desabilitada;
- o cliente ativo do gateway continua sendo `FakeChannelClient`;
- `@whiskeysockets/baileys@7.0.0-rc13` existe somente no workspace do gateway;
- tipos nativos Baileys ficam confinados ao adapter autorizado;
- a fábrica oficial usa import dinâmico e falha fechado sem autorização;
- o adapter não é importado pelo bootstrap do gateway;
- QR não é persistido nem propagado como valor;
- PN, LID, grupo e newsletter possuem tradução explícita;
- grupos e newsletters são bloqueados por padrão;
- mídia outbound exige URL HTTPS assinada;
- mídia inbound não é baixada na W-06;
- lifecycle scripts de dependências são bloqueados;
- o lockfile regenerado deve possuir SHA-256 aprovado;
- a árvore transitiva, incluindo `libsignal`, exige revisão jurídica/SBOM;
- nenhum mecanismo de evasão, spam ou rotação de contas será implementado;
- nenhuma IA será acoplada diretamente ao Baileys;
- primeiro modo de IA será `draft_only`;
- produção exige decisão posterior específica.

---

## Estado verificável

| Item | Estado |
|---|---|
| Análise de referências | concluída |
| SPEC e inventário | concluídos e atualizados |
| ADR | concluída |
| Matriz de licenças | concluída |
| Política de risco/consentimento | concluída |
| THIRD_PARTY_NOTICES | atualizado para dependência instalada |
| Contratos canônicos v1 | concluídos — W-02 |
| Compatibilidade Meta | concluída e validada |
| Contratos de engine | concluídos — W-03 |
| Capability matrix | concluída — W-03 |
| Meta roteada pelo engine | concluída — W-03 |
| Mock engine | concluído — W-03 |
| Feature flags por organização | concluídas — W-03 |
| Gates UI e backend | concluídos — W-03 |
| Engine boundary | `v4` verde — W-06 |
| Evolução aditiva do banco | concluída — W-04 |
| Identidades externas e aliases | concluídos — W-04 |
| Comandos, outbox, inbox e DLQ | fundação persistente concluída — W-04 |
| Ledger de tentativas | fundação persistente concluída — W-04 |
| RLS e testes multiempresa | concluídos — W-04 |
| Rollback lógico | concluído — W-04 |
| Gateway separado do Next.js | concluído — W-05 |
| Configuração, health, readiness e metrics | concluídos — W-05 |
| API HMAC e replay guard | concluídos — W-05 |
| Correlation e causation IDs | concluídos — W-05 |
| Shutdown gracioso | concluído — W-05 |
| Container não-root e limites | concluídos e testados — W-05 |
| Smoke test sem rede externa | verde |
| Cliente fake ativo | sim |
| Baileys instalado | sim, somente no gateway e versão exata |
| Adapter Baileys | concluído — W-06 |
| Fábrica oficial | concluída, bloqueada por padrão |
| Contract tests Baileys | 25 verdes — W-06 |
| Tipos nativos confinados | comprovado pelo boundary v4 |
| Lockfile resolvido | hash aprovado e verificado |
| Lifecycle scripts externos | bloqueados |
| Runtime Baileys registrado | não |
| Socket externo aberto | não |
| Storage de sessão | não |
| QR/pairing operacional | não |
| Número autorizado | não |
| Sessão real | não |
| Aceite operacional assinado | não |
| Revisão jurídica transitiva | pendente |
| Deploy do gateway | não |
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
