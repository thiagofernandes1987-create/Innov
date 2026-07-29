# Campanha QA — Criação de obras e projetos

**Data:** 29/07/2026  
**Sprint:** S-23 — Fundação de interface  
**PR:** #30 — `fix: protege criação de obras e projetos`  
**Escopo:** `/app/obras/novo`, ações de criação, RPCs, autorização e continuidade operacional

## 1. Estado do recorte

| Dimensão | Estado | Evidência |
|---|---|---|
| Validação e preservação do formulário | PASS | `useActionState`, estado estruturado e erros por campo |
| Entrada livre sem proposta/orçamento/contrato | PASS | RPC `create_independent_project_v3` e formulário por origem |
| Conversão de contrato | PASS | RPC `create_project_from_contract_v2` |
| Coerência temporal e histórica | PASS | validação TypeScript, RPC e constraints |
| Membership do autor e responsável | PASS | cenário PostgreSQL com `ROLLBACK` |
| Papel `ENGENHEIRO` preservado | PASS | associação temporária, duas portas e `ROLLBACK` |
| Revogação das RPCs antigas | PASS após correção | privilégios de `PUBLIC`, `anon` e `authenticated` verificados como `false` |
| CI completo do primeiro passe | PASS | replay, banco, lint, tipos, testes Python/TypeScript e build |
| Preview/navegação visual final | BLOCKED_EXTERNAL | Vercel `build-rate-limit` |
| Dados fictícios persistidos | NÃO | todos os ensaios operacionais usaram `ROLLBACK` |

## 2. Problemas reproduzidos

1. erro do provedor era exibido diretamente na tela;
2. qualquer falha da action redirecionava e apagava o preenchimento;
3. falha de clientes, responsáveis ou perfis era transformada em lista vazia;
4. falha da consulta de contratos aparecia como “nenhum contrato disponível”;
5. projeto independente podia ser criado sem `project_membership` para o autor;
6. conversão por contrato não aceitava Engenharia apesar da interface permitir;
7. a RPC por contrato fixava `GESTOR_OBRAS`, elevando indevidamente o papel;
8. datas, avanço histórico e origem importada não estavam protegidos em todas as camadas;
9. o primeiro `REVOKE` das RPCs antigas retirava acesso de `authenticated`, mas o papel continuava herdando `EXECUTE` de `PUBLIC`.

## 3. Correções implantadas no branch

### 3.1 Interface e actions

- `ProjectEntryForm` e `ContractProjectForm` usam `useActionState`;
- erros por campo ficam próximos ao controle e usam `aria-invalid`;
- o preenchimento permanece no formulário após validação ou falha do provedor;
- somente o sucesso redireciona para a obra criada;
- mensagens conhecidas são classificadas por domínio;
- logs técnicos recebem apenas contexto e código estável;
- clientes, responsáveis, perfis e contratos possuem estados independentes;
- entrada livre continua disponível quando dados opcionais não carregam;
- conversão por contrato fica bloqueada somente quando sua própria dependência falha;
- responsáveis são limitados aos papéis de gestão autorizados.

### 3.2 Domínio PostgreSQL

A migration `20260729211500_safe_project_creation_workflows.sql` criou:

- `create_independent_project_v3`;
- `create_project_from_contract_v2`;
- membership transacional do autor;
- membership opcional do responsável;
- preservação do papel real;
- bloqueio de data de corte futura;
- bloqueio de período invertido;
- bloqueio de obra histórica sem 100%;
- bloqueio de importação sem origem;
- bloqueio de cliente ou responsável fora da organização;
- bloqueio de reutilização de contrato;
- auditoria da origem e do contexto inicial.

A migration complementar `20260729214500_revoke_legacy_project_creation_rpcs.sql` revogou as portas antigas de:

```text
PUBLIC
anon
authenticated
```

Essa segunda migration foi necessária porque `REVOKE ... FROM authenticated` não neutraliza privilégio herdado de `PUBLIC`.

## 4. Cenários PostgreSQL executados

### 4.1 Obra em andamento válida

Entrada:

```text
Origem: IN_PROGRESS
Avanço: 35,5%
Data real de início: 10/01/2026
Data de corte: 20/07/2026
Custo histórico: R$ 125.000,50
Bairro: Capivari
```

Resultado:

```json
{
  "result": "PASS",
  "valid_project": true,
  "creator_membership": true,
  "manager_membership": true,
  "persistence": "ROLLBACK"
}
```

### 4.2 Regras negativas

Foram bloqueados:

- obra histórica com apenas 80% de avanço;
- projeto importado sem identificação da origem;
- data de corte futura;
- usuário sem associação à organização;
- tentativa de continuar usando RPCs antigas.

Após a migration complementar, a inspeção efetiva de privilégios retornou `false` para `PUBLIC`, `anon` e `authenticated`, nas versões v1 e v2 antigas.

### 4.3 Engenharia sem elevação de papel

Foi criada uma associação temporária `ENGENHEIRO` para um usuário de teste já existente, dentro da mesma transação. O ator:

1. criou um projeto independente;
2. recebeu membership como `ENGENHEIRO`;
3. converteu um contrato assinado em obra;
4. recebeu membership como `ENGENHEIRO` novamente;
5. manteve `can_manage_project = true`;
6. vinculou o contrato à obra.

Resultado:

```json
{
  "result": "PASS",
  "independent_role": "ENGENHEIRO",
  "contract_role": "ENGENHEIRO",
  "contract_linked": true,
  "can_manage": true,
  "persistence": "ROLLBACK"
}
```

## 5. Prevenção automática

- `tests/project-creation-contract.test.ts` cobre entradas válidas e inválidas;
- `validate:flexible-workflows` exige:
  - `useActionState` nas duas entradas;
  - separação de dependências;
  - RPCs endurecidas;
  - memberships;
  - papel preservado;
  - revogação completa das RPCs antigas;
- replay limpo aplica toda a cadeia de migrations;
- lint, typecheck, testes TypeScript, testes Python e build são portões do CI;
- VACINA-042 registra a causa raiz e a varredura equivalente.

## 6. Advisor e risco residual

As duas RPCs atuais continuam aparecendo no advisor como funções `SECURITY DEFINER` executáveis por `authenticated`. Isso é uma superfície intencional de mutação, não uma autorização implícita: ambas validam associação, papel, organização, estado e relacionamentos dentro da função. O cenário negativo com usuário não associado confirmou a negação.

O advisor global ainda contém avisos históricos de outros módulos e não foi declarado limpo.

## 7. Limitações honestas

- a Vercel bloqueou os novos builds por limite de taxa;
- portanto, o comportamento visual final em navegador autenticado não foi aprovado nesta rodada;
- foco, autofill, contraste nativo, responsividade e restauração visual dos controles continuam dependentes de preview navegável;
- outras server actions que ainda redirecionam mensagens cruas permanecem fora deste recorte e devem ser tratadas nos próximos microblocos.

## 8. Critério de fechamento

Este recorte pode ser mesclado quando o passe final do CI, incluindo este relatório e a migration complementar, permanecer verde. A publicação em produção continua separada e só pode ser classificada como concluída após a Vercel aceitar um deployment da `main`.
