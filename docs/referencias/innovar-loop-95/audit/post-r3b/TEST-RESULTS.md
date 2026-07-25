# Resultados de Validação Pós-R3B

| Validação | Resultado |
|---|---:|
| Unittest `tests` | 84/84 PASS |
| Unittest `bdd_steps` | 16/16 PASS |
| Pytest agregado | 100/100 PASS |
| Game day HTTP local | PASS |
| TypeScript | PASS |
| SDK drift | PASS |
| OpenAPI | 13 operações — PASS |
| AsyncAPI | 7 canais / 14 operações — PASS |
| Compatibilidade de eventos | PASS |
| Helm estático | PASS |
| Registro de remediação | PASS |
| Orquestrador canônico | 22 PASS locais / 6 BLOCKED_EXTERNAL / código 77 |

As contagens de unittest e pytest se sobrepõem e não devem ser somadas como cobertura independente.

O game day utiliza um broker controlado em processo e não representa Redpanda real.

A saída integral do orquestrador está em `audit/post-r3b/VALIDATE-ALL.log`.
