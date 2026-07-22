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
