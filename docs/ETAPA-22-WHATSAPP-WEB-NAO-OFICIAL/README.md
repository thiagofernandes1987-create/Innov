# Provider WhatsApp Web não oficial — índice de governança

**Status atual:** Sprint W-01 concluída documentalmente; implementação não iniciada  
**Produção:** bloqueada  
**Próxima sprint:** W-02 — Modelo canônico de canal, identidade e mensagem

---

## Ordem de leitura

1. [`SPEC.md`](./SPEC.md) — constituição técnica do subprojeto.
2. [`INVENTARIO.md`](./INVENTARIO.md) — ledger de marcos, sprints, tarefas e gates.
3. [`ADR-001-PROVIDER-WHATSAPP-WEB-NAO-OFICIAL.md`](./ADR-001-PROVIDER-WHATSAPP-WEB-NAO-OFICIAL.md) — decisão arquitetural e limites da autorização.
4. [`MATRIZ-LICENCAS-E-REAPROVEITAMENTO.md`](./MATRIZ-LICENCAS-E-REAPROVEITAMENTO.md) — permissões, bloqueios e técnicas por projeto/arquivo.
5. [`POLITICA-RISCO-CONSENTIMENTO-E-DESLIGAMENTO.md`](./POLITICA-RISCO-CONSENTIMENTO-E-DESLIGAMENTO.md) — número autorizado, aceite, opt-out, casos proibidos e remoção de sessão.
6. [`EVIDENCIAS-W01.md`](./EVIDENCIAS-W01.md) — checklist e classificação das evidências da Sprint W-01.
7. [`../../THIRD_PARTY_NOTICES.md`](../../THIRD_PARTY_NOTICES.md) — avisos e estado de dependências/adaptações externas.

---

## Decisões já fixadas

- o provider não oficial é opcional e revogável;
- Meta Cloud API permanece o provider oficial e padrão;
- providers compartilham domínio, mas não runtime;
- Baileys ficará confinado a um adapter em gateway persistente separado;
- nenhum tipo nativo do engine poderá vazar para o domínio;
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
| SPEC e inventário | concluídos |
| ADR | concluída |
| Matriz de licenças | concluída |
| Política de risco/consentimento | concluída |
| THIRD_PARTY_NOTICES preventivo | concluído |
| Contratos canônicos | pendentes — W-02 |
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
