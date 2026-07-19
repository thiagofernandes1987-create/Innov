# Etapa 10 — Homologação real no Supabase

**Projeto:** `wyeojufebtwblsubkunr`  
**Região:** `us-east-1`  
**Ambiente:** homologação  
**Data:** 19/07/2026

## 1. Resultado executivo

As seis migrations da Etapa 9 foram aplicadas no projeto Supabase e validadas contra o esquema real.

Resultados confirmados:

- 36 de 36 tabelas esperadas criadas;
- zero tabelas ausentes;
- RLS habilitado nas 36 tabelas;
- 45 políticas RLS no schema `public`;
- três buckets privados;
- funções transacionais financeiras e contratuais disponíveis;
- tipos TypeScript gerados diretamente do banco;
- acesso anônimo removido das RPCs de negócio;
- `search_path` fixado nas funções apontadas pelo advisor;
- extensões temporárias de transporte removidas depois da aplicação.

## 2. Migrations aplicadas

1. `stage9_financial_contracts`
2. `stage9_workflows`
3. `stage9_client_signature_policies`
4. `stage9_frozen_version_rules`
5. `stage9_apply_amendment`
6. `stage9_security_hardening`
7. endurecimentos adicionais da Etapa 10

O arquivo `20260719214500_stage10_homologation_hardening.sql` representa no repositório as alterações permanentes feitas durante a homologação.

## 3. Armazenamento

Buckets confirmados como privados:

- `commercial-documents`;
- `contract-documents`;
- `signature-artifacts`.

Nenhum bucket comercial ou contratual está configurado como público.

## 4. Segurança

### Confirmado

- RLS habilitado em todas as tabelas de domínio;
- cliente e usuário interno possuem políticas separadas;
- RPCs de negócio não podem ser executadas pelo papel `anon`;
- funções auxiliares e gatilhos não são expostos anonimamente;
- `SUPABASE_SERVICE_ROLE_KEY` permanece exclusivamente server-side;
- funções `touch_updated_at` e `is_aal2` possuem `search_path` determinístico.

### Avisos intencionais do advisor

O advisor ainda marca RPCs de negócio `SECURITY DEFINER` disponíveis para `authenticated`. Isso é esperado nesta arquitetura: as funções são os pontos transacionais da aplicação e fazem validação de organização, função, MFA e propriedade antes de modificar dados.

Referência do advisor:

- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

Antes da produção, a evolução recomendada é mover funções núcleo para um schema não exposto e manter wrappers mínimos no schema `public`.

## 5. Desempenho

O advisor encontrou dívida técnica não bloqueante:

- chaves estrangeiras sem índice dedicado;
- quatro políticas com chamadas `auth.*` sem `SELECT` de inicialização;
- políticas permissivas sobrepostas em algumas tabelas comerciais;
- índices recém-criados ainda classificados como não utilizados, o que é normal em banco sem carga real.

Referências:

- https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys
- https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan
- https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies

A otimização deve ser feita após carga piloto e análise dos planos reais, evitando criar dezenas de índices sem evidência de uso.

## 6. Tipos TypeScript

Os tipos foram gerados com sucesso a partir do projeto real. Para atualizar o arquivo local:

```bash
supabase gen types typescript \
  --project-id wyeojufebtwblsubkunr \
  --schema public \
  > lib/supabase/database.types.ts
```

O comando deve ser repetido depois de qualquer migration que altere tabelas, enums ou RPCs.

## 7. Contas de homologação

Contas planejadas:

- `admin@innov.eng.br` — `SUPER_ADMIN`;
- `cliente@cliente.com` — cliente externo.

As contas ainda não foram criadas automaticamente porque o conector de banco não expõe uma operação administrativa segura do Supabase Auth. O script `scripts/provision-homologation-users.mjs` foi adicionado para execução em ambiente controlado com `SUPABASE_SERVICE_ROLE_KEY`.

Execução:

```bash
ALLOW_INSECURE_DEMO_USERS=true \
NEXT_PUBLIC_SUPABASE_URL="https://wyeojufebtwblsubkunr.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="..." \
DEMO_ADMIN_PASSWORD="..." \
DEMO_CLIENT_PASSWORD="..." \
node scripts/provision-homologation-users.mjs
```

Nunca versionar as senhas ou a Service Role. As senhas temporárias devem ser trocadas no primeiro acesso.

## 8. Testes pendentes de ponta a ponta

Dependem do provisionamento das duas contas:

1. login administrativo;
2. login do cliente;
3. isolamento entre usuário interno e cliente;
4. criação e cálculo de orçamento;
5. congelamento de versão;
6. bloqueio de alteração após congelamento;
7. aprovação com alçada e MFA AAL2;
8. geração e liberação de proposta;
9. geração de PDF e verificação SHA-256;
10. conversão para contrato;
11. criação e aplicação de aditivo;
12. assinatura sandbox e replay idempotente;
13. acesso privado aos documentos por URL assinada.

## 9. Critério de conclusão

A infraestrutura do banco da Etapa 10 está homologada. A conclusão integral exige criar as contas de teste e executar a bateria autenticada de ponta a ponta.
