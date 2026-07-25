# Execution Evidence Campaign — 2026-07-22

## Regra de fechamento
Um item somente é concluído com comando reproduzível, código de saída, log e artefato rastreável. Ausência de infraestrutura é `BLOCKED`, nunca `PASS`.

## Resultado

| Ordem | Item | Estado | Evidência |
|---:|---|---|---|
| 1 | PostgreSQL real / migrations 0001–0009 | BLOCKED | `audit/EVIDENCE-CAMPAIGN-POSTGRES.txt` |
| 2 | RLS com roles NOBYPASSRLS | BLOCKED | mesmo gate PostgreSQL |
| 3 | Adapter PostgreSQL contra schema | BLOCKED | mesmo gate PostgreSQL |
| 4 | Redpanda real | BLOCKED | ausência de runtime Docker/Podman/Redpanda |
| 5 | Helm + kubeconform | BLOCKED | `audit/EVIDENCE-CAMPAIGN-PREFLIGHT.json` |
| 6 | Kubernetes | BLOCKED | `kubectl`/cluster ausentes |
| 7 | NetworkPolicy contra labels reais | BLOCKED | cluster ausente |
| 8 | XState runtime | BLOCKED | `audit/EVIDENCE-CAMPAIGN-XSTATE-RUNTIME.txt` |
| 9 | SDK drift gate | PASS | `audit/EVIDENCE-CAMPAIGN-SDK-DRIFT.txt` |
| 10 | Game Day distribuído | BLOCKED | infraestrutura distribuída ausente |

## Evidências locais aprovadas
- 49 testes Python: PASS.
- compatibilidade de eventos: PASS.
- validação Helm estática: PASS.
- compilação TypeScript: PASS.
- SDK drift gate determinístico: PASS.
- inventário Gherkin: 140 cenários; 18 indícios lexicais de binding; 122 ainda descritivos/não mapeados. Indício lexical não equivale a execução.

## Correções incorporadas
- `event-transport.machine.ts` com estados e transições explícitas.
- harness XState versionado e ligado ao CI.
- gate fail-closed de drift do SDK.
- auditor de inventário Gherkin.
- três testes anti-regressão para a campanha.
- workflow de integração atualizado para executar XState e SDK drift quando a infraestrutura de CI estiver disponível.

## Cobertura
O SCI Event Transport permanece em **84,4%**. Não foi elevado porque somente o SDK drift recebeu evidência executada nova; os demais gaps operacionais continuam bloqueados. Não há base para declarar cobertura acima de 95%.
