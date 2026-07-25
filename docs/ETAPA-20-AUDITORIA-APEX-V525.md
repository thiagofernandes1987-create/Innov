# Etapa 20 — Auditoria APEX Adaptive Audit OS V5.2.5

## Estado

**Auditoria executada integralmente sobre `feature/etapa-20-prontidao-producao` no commit `30937ed6aba10d40f24641e9158bb686ab94876d`. Todos os portões locais executáveis passaram; nenhuma afirmação de runtime foi produzida.**

Protocolo: `APEX-ADAPTIVE-AUDIT-OS-V5.2.5` (base `APEX-AUDIT-V4` 4.0.0), rodadas R1 → R2 → R3A → R3B → R4.
Integridade do próprio instrumento: 740/740 arquivos conferidos contra `CONTENT_MANIFEST.sha256`; o YAML executável recebido é byte a byte idêntico ao contido no pacote (`63bca2d1…`).

Ledgers congelados e manifestos de hash em `docs/auditoria-apex-v525/`.

## Objetivo

Auditar a branch com evidência rastreável, remediar apenas o que pode ser provado localmente e devolver, sem maquiagem, o que depende de decisão do responsável ou de ambiente indisponível.

## Custódia e capacidades

| Item | Valor |
| --- | --- |
| Artefatos indexados | 441 |
| Impressão digital do original selado | `7fbc2e9a01ed66201e192402ef6ea829f71a7e17320c920a9ff0de9dd79574d0` |
| Artefatos lidos integralmente | 45 |
| Artefatos em análise agregada (`LIMITED`) | 396 |
| `PYTHON_LOCAL`, `FILESYSTEM_*`, `SUBPROCESS_LOCAL` | disponíveis |
| `REMOTE_SANDBOX` | indisponível |
| `FRESH_MODEL_CONTEXT` | indisponível |

Dimensões avaliadas: 16. Treze `APPLICABLE`, duas `NOT_ASSESSED` (acessibilidade e desempenho sob carga) e uma `BLOCKED_EXTERNAL` (comportamento em produção). Nenhuma foi convertida em `NOT_APPLICABLE`.

## O que a auditoria confirmou como correto

- **RLS**: 136 de 136 tabelas com `enable row level security`, incluindo as habilitadas por laços `foreach ... execute format`. Duas tabelas (`signature_access_tokens`, `signature_conversion_jobs`) ficam deliberadamente sem policy e com `revoke` para `anon` e `authenticated`, o que é negação por padrão e não lacuna.
- **Funções `security definer`**: 159 de 159 declaram `set search_path`; nenhuma concede execução a `anon`.
- **Concorrência de estoque**: `post_inventory_movement` adquire `pg_advisory_xact_lock` por posição, em ordem determinística.
- **Idempotência monetária**: `apply_signed_amendment` retorna cedo quando `applied_at` não é nulo, impedindo reaplicação de valor.
- **Baseline verde**: 19 de 19 verificações do próprio repositório passaram no commit auditado e voltaram a passar após as mudanças.

## Achados e desfecho final

| ID | Achado | Sev. | Desfecho |
| --- | --- | --- | --- |
| FND-0001 | Lockfile ausente com instalação não congelada no CI | HIGH | PARCIALMENTE REMEDIADO |
| FND-0002 | CSP apenas em `Report-Only`, sem coletor de relatórios | MEDIUM | PENDÊNCIA PLANEJADA (Fase 20.8) |
| FND-0003 | Gateway bufferizava até 25 MB antes de autenticar | MEDIUM | REMEDIADO |
| FND-0004 | Controles de segurança sem teste automatizado | MEDIUM | PARCIALMENTE REMEDIADO |
| FND-0005 | Antimalware cobre apenas o SAC; sete uploads sem análise | HIGH | FORA DO ESCOPO DECLARADO DA FATIA |
| FND-0006 | Sem controle de vazão em superfícies não autenticadas | MEDIUM | PENDÊNCIA PLANEJADA (Fase 20.8) |
| FND-0007 | Webhook de assinatura aceita transição regressiva | LOW | REPORTADO, NÃO REMEDIADO |
| FND-0008 | Contadores de acesso em leitura-modificação-escrita | LOW | REPORTADO, NÃO REMEDIADO |
| FND-0009 | Variáveis de provedor declaradas e nunca consumidas | LOW | REMEDIADO |
| FND-0010 | Função de diagnóstico global sem referência | LOW | REPORTADO, NÃO REMEDIADO |
| FND-0011 | Ações de CI fixadas por tag mutável | LOW | REPORTADO, NÃO REMEDIADO |
| FND-0012 | `tsconfig.tsbuildinfo` e `__pycache__` fora do `.gitignore` | LOW | REMEDIADO APÓS O CONGELAMENTO (ver adendo) |

`FND-0012` foi descoberto pela rodada cega, depois do congelamento do R1, e entrou como achado novo em vez de retroalimentar uma rodada congelada.

## Duas correções que a própria auditoria fez em si mesma

1. **FND-0006 estava errado na formulação.** O R1 afirmou que nenhum documento canônico registrava a decisão sobre controle de vazão. A rodada cega encontrou `rate limiting` como item pendente da Fase 20.8 em `diretrizes/ROADMAP.md:243`. O fato técnico — ausência de implementação — permanece; a classificação passou a pendência planejada. Pelo mesmo motivo, `FND-0002` foi reclassificado: `headers e cookies` também é item aberto da Fase 20.8.
2. **A remediação do FND-0001 contrariava uma decisão registrada.** Congelar a instalação nos quatro workflows reprovou em `validate:vaccines` e `validate:stage20`: a `VACINA-008` fixa a política transitória `--no-frozen-lockfile` até que a Etapa 20 conclua a regeneração e a verificação integral do lockfile, e exige que a volta ao modo congelado seja transversal e acompanhada da atualização da própria vacina. A alteração foi revertida; permaneceu apenas a criação do lockfile.

## Mudanças aplicadas nesta branch

| Transação | Arquivo | Achado |
| --- | --- | --- |
| CHG-0001 | `pnpm-lock.yaml` (novo) | FND-0001 |
| CHG-0002 | `services/file-security-gateway/server.mjs` | FND-0003 |
| CHG-0003 | `tests/file-security-gateway-preconditions.test.ts` (novo) | FND-0003 |
| CHG-0004 | `tests/security-controls.test.ts` (novo) | FND-0004 |
| CHG-0005 | `.env.example` | FND-0009 |

Revertida: `CHG-R01`, que trocava `--no-frozen-lockfile` por `--frozen-lockfile` em `ci.yml`, `stage11-homologation.yml`, `stage18-concurrent-e2e.yml` e `stage20-inventory-concurrency-e2e.yml`.

O gateway passou a rejeitar antes de ler o corpo quando faltam cabeçalhos de autenticação, quando a assinatura ou o hash declarado não são hexadecimais de 64 caracteres, quando o timestamp está fora da janela de cinco minutos e quando o `Content-Length` declarado excede o limite. A verificação HMAC continua exatamente onde estava. A política de instalação dos workflows não foi tocada.

Testes: 48 → 64, com 10 → 12 arquivos. Verificações do repositório: 19/19 na cópia de trabalho e 19/19 na branch.

## Riscos residuais

| ID | Risco | Sev. | Referência |
| --- | --- | --- | --- |
| RSK-0001 | Uploads não autenticados de assinatura externa e portal de fornecedor seguem sem antimalware | HIGH | Fase 20.5 |
| RSK-0002 | Borda sem CSP aplicada e sem controle de vazão | MEDIUM | Fase 20.8 |
| RSK-0003 | Instalação segue não congelada; fechamento depende de mudança transversal | MEDIUM | VACINA-008 |
| RSK-0004 | `safeFileName` sem teste por causa da importação de `server-only` | LOW | — |
| RSK-0005 | Nenhuma afirmação de runtime foi produzida | MEDIUM | DIM-14, DIM-15, DIM-16 |

## Limitações declaradas

- O contexto do modelo auditor **não** é fisicamente novo. A cegueira do R3A foi garantida por detectores determinísticos executados em processos `python -I` isolados e pela ausência comprovada de qualquer ledger de R1/R2 no pacote — não por um segundo modelo sem memória (`R3A_PHYSICAL_FRESH_CONTEXT_NOT_CLAIMED_LOCALLY`).
- Sem banco, navegador ou ambiente de carga: RLS, CSP e concorrência foram avaliadas por código-fonte e por execução local de testes, nunca por comportamento observado em produção.
- Node local 22 contra Node 24 do CI; a divergência está registrada nos ledgers de validação.
- Dois detectores cegos produziram falso positivo e estão marcados como tal: `D08` (não reconhece o comentário de reserva já presente no `.env.example`) e `D14` (considera órfã qualquer função SQL sem chamada dentro do próprio SQL, ignorando invocação por RPC).

## Cristalização (R4)

- **VAC-0001** — autenticar antes de alocar recurso em serviço público: separar as pré-condições verificáveis sem corpo e rejeitar cedo, mantendo a verificação de assinatura. Teste preventivo: `tests/file-security-gateway-preconditions.test.ts`.
- **VAC-0002 recusado pelo runtime** (`outcome_not_closed_or_remediated`): a lição sobre precedência de decisão registrada sobre remediação automática fica documentada aqui, sem status de vacina, porque o desfecho do achado é parcial.
- Padrões de sucesso confirmados: RLS por laço declarativo, `security definer` com `search_path`, lock advisory ordenado, idempotência do aditivo.

## Adendo pós-congelamento — FND-0012

Registrado depois do freeze do R3B, sem reescrever ledger congelado (`FreezePolicy.after_freeze.silent_rewrite: false`).

O `.gitignore` passou a cobrir `tsconfig.tsbuildinfo` e `__pycache__/`, e os artefatos correspondentes foram removidos da árvore de trabalho. O desfecho de `FND-0012` no `FINAL_OUTCOME_LEDGER_R3B.yaml` permanece `REPORTED_NOT_REMEDIATED`, que era verdade no instante do congelamento; este adendo é a correção posterior, com evidência própria.

Motivo da mudança de posição: no R3B a remediação foi adiada por ser decisão do responsável. A execução local de `pnpm typecheck` e `pnpm test:python` produz exatamente esses artefatos, que reapareceram como não rastreados e obrigariam a escolher entre versionar saída de build ou conviver com ruído permanente. Ignorá-los é o que o próprio `.gitignore` já faz com `node_modules`, `.next` e `coverage`.

Validação após o adendo: 19/19 verificações do repositório.

## Como reproduzir

```bash
pnpm install --no-frozen-lockfile --reporter=append-only
pnpm validate:vaccines && pnpm validate:stage20
pnpm lint && pnpm typecheck && pnpm test && pnpm test:python
```

Os manifestos de congelamento em `docs/auditoria-apex-v525/*/`*`_FREEZE_MANIFEST.json` permitem reconferir o hash de cada ledger citado neste relatório.
