# Provider WhatsApp Web não oficial — índice de governança

**Status atual:** Sprints W-01 e W-02 concluídas; engine e runtime não iniciados  
**Produção:** bloqueada  
**Próxima sprint:** W-03 — Contrato de engine e matriz de capacidades

---

## Ordem de leitura

1. [`SPEC.md`](./SPEC.md) — constituição técnica do subprojeto.
2. [`INVENTARIO.md`](./INVENTARIO.md) — ledger de marcos, sprints, tarefas e gates.
3. [`ADR-001-PROVIDER-WHATSAPP-WEB-NAO-OFICIAL.md`](./ADR-001-PROVIDER-WHATSAPP-WEB-NAO-OFICIAL.md) — decisão arquitetural e limites da autorização.
4. [`MATRIZ-LICENCAS-E-REAPROVEITAMENTO.md`](./MATRIZ-LICENCAS-E-REAPROVEITAMENTO.md) — permissões, bloqueios e técnicas por projeto/arquivo.
5. [`POLITICA-RISCO-CONSENTIMENTO-E-DESLIGAMENTO.md`](./POLITICA-RISCO-CONSENTIMENTO-E-DESLIGAMENTO.md) — número autorizado, aceite, opt-out, casos proibidos e remoção de sessão.
6. [`CONTRATOS-CANONICOS-V1.md`](./CONTRATOS-CANONICOS-V1.md) — modelo provider-neutral concluído na W-02.
7. [`EVIDENCIAS-W01.md`](./EVIDENCIAS-W01.md) — evidências de governança.
8. [`EVIDENCIAS-W02.md`](./EVIDENCIAS-W02.md) — evidências de código, testes e CI dos contratos canônicos.
9. [`../../THIRD_PARTY_NOTICES.md`](../../THIRD_PARTY_NOTICES.md) — avisos e estado de dependências/adaptações externas.

---

## Decisões já fixadas

- o provider não oficial é opcional e revogável;
- Meta Cloud API permanece o provider oficial e padrão;
- providers compartilham domínio, mas não runtime;
- `channelAccountId` interno e `providerAccountId` externo são campos distintos;
- identidades PN, LID, grupos, newsletters e usuários web possuem namespaces próprios;
- metadata específica do provider não governa o domínio;
- Baileys ficará confinado a um adapter em gateway persistente separado;
- o CI bloqueia imports e tipos Baileys fora dos adapters autorizados;
- nenhum código de projeto sem licença clara será copiado;
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
| THIRD_PARTY_NOTICES preventivo | concluído |
| Contratos canônicos v1 | concluídos — W-02 |
| Compatibilidade Meta | concluída e validada |
| Gate de imports Baileys | concluído e testado |
| CI da W-02 | verde |
| File Security E2E | verde |
| Contratos de engine/capabilities | pendentes — W-03 |
| Baileys instalado | não |
| Gateway criado | não |
| Número autorizado | não |
| Sessão real | não |
| Aceite operacional assinado | não |
| Revisão jurídica | não |
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
