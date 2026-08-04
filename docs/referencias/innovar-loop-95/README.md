# Innovar Executable Specification — INNOVAR-AUTO12-R3B-FOLLOWUP

Este pacote contém a **árvore técnica completa**, o **blueprint executável**, as correções locais posteriores à reconciliação R3B e o dossiê R3B congelado.

## Fontes canônicas

| Finalidade | Fonte |
|---|---|
| Identidade da release | `RELEASE-MANIFEST.yaml` |
| Estado corrente | `STATUS.md` |
| Blueprint | `INNOVAR_PLATFORM_BLUEPRINT_EXECUTAVEL.md` |
| Requisitos | `00-decisions/requirements.yaml` |
| Achados reconciliados | `audit/r3b-final/FINAL_FINDING_LEDGER_R3B.yaml` |
| Desfechos R3B | `audit/r3b-final/FINAL_OUTCOME_LEDGER_R3B.yaml` |
| Correções pós-R3B | `remediation/r3b-followup/POST-R3B-REMEDIATION-REPORT.md` |
| Validação atual | `audit/post-r3b/VALIDATION-SUMMARY.json` |
| Integridade | `MANIFEST.json` e `SHA256SUMS.txt` |

## Validação

```bash
python scripts/validate_all.py
```

Resultados possíveis:

- `0`: todos os gates, inclusive externos, passaram;
- `1`: existe falha local;
- `77`: gates locais passaram, mas uma ou mais integrações externas estão bloqueadas.

## Limites

O pacote é DRAFT. PostgreSQL, Redpanda, XState oficial, Kubernetes, supply chain e prova operacional dependem dos ambientes descritos em `remediation/r3b-followup/EXTERNAL-PENDING-PLAN.md`.
