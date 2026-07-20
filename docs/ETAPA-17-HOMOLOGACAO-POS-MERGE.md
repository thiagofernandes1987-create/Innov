# Etapa 17 — Homologação pós-merge

**Estado:** homologação estrutural concluída; E2E autenticado pendente por ausência de identidades reais  
**Branch:** `fix/etapa-17-homologacao-pos-merge`  
**PR:** `#15`  
**Supabase:** `wyeojufebtwblsubkunr`  
**Atualização:** 20 de julho de 2026

## 1. Contexto

O PR `#14` foi mesclado na `main` antes da homologação Supabase. Este follow-up preserva o histórico já incorporado, aplica correções somente por migrations novas e registra as evidências necessárias para recuperar e continuar o projeto sem depender de contêiner ou conversa.

## 2. Estado recuperado

O contêiner local foi perdido, mas o estado foi reconstruído integralmente por:

- `main` e PRs do GitHub;
- pasta canônica `diretrizes/`;
- migrations versionadas em `supabase/migrations/`;
- histórico remoto de migrations do Supabase;
- CI do PR `#15`.

O CI do commit atual do PR `#15` concluiu com sucesso.

## 3. Migrations aplicadas

A sequência completa da Etapa 17 está aplicada no Supabase, incluindo schema, saldos, movimentos, compras, reservas, ativos, inventário físico, RLS, contratos de consulta, módulo, hardening e privilégios.

Correções pós-merge também aplicadas:

- `stage17_inventory_concurrency_locks`;
- `stage17_homologation_balance_project_scope`;
- `stage17_inventory_performance_indexes`;
- `stage17_inventory_rpc_privileges`.

Migration aplicada não é reescrita. Qualquer ajuste futuro exige novo arquivo com timestamp superior.

## 4. Evidências estruturais

### Banco

- 18 tabelas do domínio;
- 18/18 tabelas com RLS habilitada;
- seis views derivadas;
- 101 chaves estrangeiras do domínio;
- nenhuma chave estrangeira sem índice de cobertura;
- módulo `estoque` ativo, sensível, versão `1.0.0` e habilitado por padrão.

### Views e dados sensíveis

As seis views abaixo não concedem `SELECT` a `anon` nem a `authenticated`:

- `inventory_stock_v`;
- `inventory_reserved_stock_v`;
- `inventory_available_stock_v`;
- `inventory_item_totals_v`;
- `inventory_asset_current_v`;
- `inventory_expiry_alerts_v`.

Colunas de custo não possuem leitura direta pelo navegador. A escrita direta permanece tecnicamente concedida ao papel autenticado para compatibilidade com as tabelas operacionais, porém é bloqueada pelo trigger `enforce_inventory_sensitive_write` quando o usuário não possui capacidade sensível.

### Segurança

- nenhuma RPC do estoque é executável por `anon`;
- RPCs operacionais autenticadas usam `SECURITY DEFINER` com validação interna de organização, obra e capacidade;
- instaladores e helpers internos não são executáveis por usuários autenticados;
- guards de custo não são RPCs públicas;
- triggers de escopo bloqueiam vínculos incompatíveis entre organização, obra, depósito, movimento, reserva, recebimento e ativo;
- views internas não são acessíveis diretamente pelo cliente.

## 5. Regras homologadas pelo schema

- saldo físico deriva somente de movimentos `POSTED`;
- saldo reservado deriva de reservas ativas;
- saldo disponível é físico menos reservado;
- saldo não é coluna editável;
- movimento postado é imutável;
- correção ocorre por reversão vinculada;
- saldo negativo é bloqueado por padrão;
- importação de recebimento de Compras é idempotente;
- somente quantidade aceita alimenta estoque;
- inventário aprovado gera ajuste rastreável;
- custos são mascarados no PostgreSQL;
- concorrência é serializada pelas funções de postagem e reserva.

## 6. Advisors

### Segurança

Os avisos relativos às RPCs autenticadas `SECURITY DEFINER` são intencionais: são contratos públicos do módulo e validam autorização internamente. Não existe execução anônima nas funções do estoque.

Avisos de outras tabelas e módulos são dívida técnica global e não foram atribuídos à Etapa 17.

### Performance

As relações da Etapa 17 possuem cobertura de índice. Avisos de `unused_index` são esperados no ambiente vazio e não justificam remoção antes de existir carga representativa.

## 7. Limitação da homologação

O ambiente conectado não possui:

- usuários em `auth.users`;
- organizações;
- memberships;
- obras.

Por isso não foi possível executar E2E autenticado com identidades reais sem fabricar contas artificiais. O conector também não deve desabilitar constraints de identidade para simular usuários.

O E2E autenticado permanece obrigatório antes da publicação externa e deverá usar contas reais de homologação provisionadas pelo fluxo oficial.

## 8. Definition of Done

- [x] migrations aplicadas;
- [x] migrations corretivas versionadas;
- [x] CI integral verde;
- [x] 18 tabelas e seis views confirmadas;
- [x] RLS confirmada nas 18 tabelas;
- [x] nenhuma RPC anônima;
- [x] views sem leitura direta;
- [x] custos sem leitura direta e com guard de escrita;
- [x] isolamento multiempresa/multiobra presente;
- [x] 101 FKs com cobertura de índice;
- [x] advisors revisados;
- [x] documentação canônica atualizada;
- [ ] E2E autenticado com contas reais de homologação.

## 9. Resultado

A Etapa 17 está incorporada à `main` e homologada estruturalmente no Supabase. O PR `#15` consolida evidências e documentação. A única pendência operacional é o E2E autenticado com identidades reais, que não deve ser falsificado nem omitido.
