# Sprint W-15 — Ponte de IA governada

## Decisão arquitetural

A IA permanece independente do canal e limitada a `DRAFT_ONLY`. O provider recebe contexto minimizado e fontes tratadas como dados não confiáveis. O resultado nunca é enviado automaticamente.

Fluxo obrigatório:

```text
evento persistido
  -> workflow determinístico
  -> política e humano responsável
  -> lock atômico por conversa
  -> orçamento da organização
  -> retrieval lexical/híbrido filtrado
  -> provider de IA
  -> validação de números, datas, valores e compromissos
  -> auditoria e rascunho para revisão humana
```

## Contratos

- `AiProvider`: provider-neutral;
- `AiOrchestrator`: independente de Meta/Baileys;
- `ContextBuilder`: minimização, filtros e proteção contra prompt injection;
- `AiConversationLock`: uma geração por conversa;
- `AiBudgetLedger`: limite diário por organização;
- `AiHandoffStore`: handoff persistente;
- `AiAuditSink`: modelo, fontes, ferramentas, custo e validação de claims.

## Retrieval

- busca lexical obrigatória;
- busca vetorial opcional;
- fallback lexical quando a camada vetorial falha;
- filtros por organização, obra, versão e validade;
- citações internas com `sourceId`, versão, título e SHA-256;
- conteúdo recuperado limitado e sanitizado.

## Persistência

A migration `20260804200000_stage22_ai_bridge.sql` adiciona somente estruturas técnicas:

- `channel_ai_conversation_locks`;
- `channel_ai_budget_daily`;
- `channel_ai_handoffs`;
- `channel_ai_invocations`.

Invocações são imutáveis, RLS é forçada e usuários autenticados não possuem escrita direta.

## Limites

Não existe provider real configurado, envio automático, socket externo, número real, QR, pairing, piloto, deploy ou produção. `AUTONOMOUS` não é um modo aceito.
