# VACINA-004 — Privilégios explícitos de RPC PostgreSQL

## Sintoma

Uma função `SECURITY DEFINER` valida permissões internamente, mas ainda aparece executável por `anon` no advisor ou em `has_function_privilege`.

## Causa raiz

Funções PostgreSQL herdam `EXECUTE` de `PUBLIC` quando o privilégio não é revogado explicitamente. Segurança interna não elimina a exposição desnecessária do endpoint.

## Vacina

Toda RPC nova deve declarar explicitamente:

```sql
revoke all on function public.funcao(...) from public,anon;
grant execute on function public.funcao(...) to authenticated,service_role;
```

Helpers, instaladores, triggers e funções auxiliares recebem execução apenas de `service_role` ou do proprietário quando não fazem parte da API autenticada.

## Aplicação transversal

Aplicada em:

- Estoque;
- CRM;
- Clientes;
- SAC;
- assinatura, compras, financeiro e relatórios quando as RPCs foram auditadas.

## Teste preventivo

- auditoria Supabase por `has_function_privilege`;
- migrations específicas de privilégio mínimo;
- validadores de etapa exigem `revoke` e `grant`;
- advisor de segurança revisado antes do encerramento.

## Critério de encerramento

- zero RPC operacional acessível por `anon`;
- `authenticated` possui apenas os contratos necessários;
- autorização interna, RLS e escopo continuam obrigatórios;
- a correção é versionada por migration nova, nunca por edição de migration aplicada.

---

## Portão automático, e a medição que ele produziu — 11/08/2026

A vacina existia desde a etapa 10 e **nunca teve portão**. Era conferida por
auditoria manual no Supabase e por validadores de etapa, que olham funções
nomeadas. Módulo novo não passava por nenhum dos dois, e a lista cresceu em
silêncio por dez meses.

`pnpm validate:execute-revogado` (`scripts/validate-execute-revogado.mjs`), no CI
ao lado do `validate:definer-com-guarda`. O primeiro pergunta se a função
**deveria ser chamável**; o segundo, se ela **confere participação**.

**Medido no estado final das migrations:**

```
funções em public ................................ 407
sem `revoke ... from public` ..................... 120   (29,5%)
  destas, SECURITY DEFINER ....................... 82
  destas, gatilho ................................ 30
  DEFINIDORA e NÃO-gatilho ....................... 77   <- pior caso
```

As 77 são o pior caso porque somam as duas coisas: **ignoram RLS** e
**herdam `EXECUTE` de `PUBLIC`**, que inclui `anon`. Entre elas estão
`run_rh_payroll`, `close_rh_payroll` e `create_rh_worker`.

Conferido antes de afirmar exposição: **não existe** `revoke ... on all functions
in schema public` nem `alter default privileges` para funções. O `alter default
privileges` que existe é da VACINA-059 e trata de **tabelas**.

**Por que não foi corrigido de uma vez.** Revogar em massa quebraria o produto:
das 120, **47 não têm `grant` explícito nenhum** e são chamadas pelo app —
revogar de `public` sem conceder a `authenticated` as tornaria inalcançáveis. As
outras 73 já têm grant, e nessas a revogação é segura porque o grant explícito
sobrevive ao revoke de `public`.

O débito está congelado e datado em `diretrizes/EXECUTE-PUBLIC-ACEITOS.json`,
com as duas listas separadas, e **só pode cair**. A queima é a **S-74**.

### Prova por sabotagem

| Sabotagem | Saída |
| --- | --- |
| base, com o débito congelado | `exit=0` — 407 conferidas, 120 em débito |
| migration nova com função sem `revoke` | `exit=1` — acusa a função nova |
| a mesma função, agora com `revoke` e `grant` | `exit=0` |
| tirar uma entrada do débito sem corrigir a função | `exit=1` — acusa `accept_rh_payroll_shadow` |
| restaurado | `exit=0` |

A segunda linha é a que importa no dia a dia; a quarta é a que impede o débito
de virar esconderijo.

