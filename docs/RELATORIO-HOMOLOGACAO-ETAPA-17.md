# Relatório de homologação — Etapa 17

**Módulo:** Estoque, Inventário e Almoxarifado  
**Versão da plataforma:** 0.17.0  
**Ambiente:** Supabase de homologação  
**Data:** 20 de julho de 2026  
**Branch corretiva:** `chore/etapa17-homologacao-recuperacao`

## 1. Resumo executivo

A Etapa 17 foi recuperada após interrupção do ambiente de execução, reconciliada entre GitHub e Supabase e homologada estruturalmente e por testes transacionais com rollback.

Resultados:

- CI do branch original aprovado antes do merge;
- PR #14 incorporado à `main`;
- 18 tabelas de estoque encontradas no Supabase;
- RLS habilitada nas 18 tabelas;
- seis views derivadas com `security_invoker=true`;
- 35 funções relacionadas a inventário presentes;
- ledger remoto reconciliado com as migrations canônicas do GitHub;
- migration de advisory locks recuperada do ledger remoto e versionada;
- dois defeitos encontrados e corrigidos por nova migration;
- 14 testes transacionais aprovados;
- testes executados dentro de transação finalizada com `ROLLBACK`;
- nenhum usuário, organização ou dado operacional de teste foi mantido.

## 2. Estado encontrado após a recuperação

O PR #14 já havia sido mesclado à `main`, embora a última documentação visível ainda o descrevesse como rascunho.

O Supabase continha todo o schema da Etapa 17, porém:

- o ambiente não possuía usuários Auth permanentes;
- não havia organizações ou associações permanentes;
- não havia itens, movimentos, reservas, ativos ou inventários permanentes;
- as migrations originais haviam sido aplicadas remotamente em vários blocos menores;
- uma migration de concorrência existia no Supabase, mas não havia sido preservada no GitHub antes da interrupção.

## 3. Auditoria estrutural do banco

### Tabelas

Foram encontradas 18 tabelas do domínio, todas com RLS:

- catálogo, unidades e categorias;
- itens, depósitos, localizações e lotes;
- mapeamentos de Compras;
- movimentos e linhas;
- importações de recebimento;
- reservas e linhas;
- ativos, custódias e manutenção;
- inventários físicos e linhas;
- eventos.

### Views

Foram confirmadas seis views com `security_invoker=true`:

- `inventory_stock_v`;
- `inventory_reserved_stock_v`;
- `inventory_available_stock_v`;
- `inventory_item_totals_v`;
- `inventory_asset_current_v`;
- `inventory_expiry_alerts_v`.

### Funções

Foram encontradas 35 funções relacionadas ao domínio de inventário. As funções críticas `SECURITY DEFINER` possuem `search_path=public` e fazem verificação de autorização dentro do contrato da RPC.

## 4. Defeitos encontrados na primeira execução

### 4.1 Reversão duplicava saldo

Comportamento observado:

```text
entrada +10
saída -3
reversão +3
saldo incorreto: 13
```

Causa:

- o movimento original mudava de `POSTED` para `REVERSED`;
- a view considerava somente `POSTED`;
- o original deixava de compor o razão;
- a contrapartida positiva de reversão permanecia.

Correção:

- `inventory_stock_v` passou a considerar movimentos originais `POSTED` e `REVERSED`;
- o movimento `REVERSAL` neutraliza algebricamente o original;
- o histórico permanece imutável.

Resultado após correção:

```text
entrada +10
saída original -3, estado REVERSED
reversão +3
saldo correto: 10
```

### 4.2 Isolamento multiobra incompleto

Comportamento observado:

- uma operação atribuída à Obra B conseguia usar um depósito exclusivo da Obra A.

Correção:

Foi criada `validate_inventory_project_scope()` e adicionada aos seguintes vínculos:

- linhas de movimentos;
- reservas;
- importações de recebimentos;
- ativos.

Depósito geral continua utilizável conforme autorização. Depósito com `project_id` somente pode participar de operação da mesma obra.

## 5. Concorrência e saldo

A migration recuperada `20260720233052_stage17_inventory_concurrency_locks.sql` implementa:

- chave estável por organização, depósito, localização, item e lote;
- `pg_advisory_xact_lock` transacional;
- aquisição de locks em ordem determinística;
- validação de saldo físico;
- validação de saldo disponível;
- bloqueio de consumo de quantidade reservada por saída comum;
- atualização de reserva dentro da mesma transação.

A presença dos advisory locks foi validada estruturalmente e o fluxo sequencial foi exercitado pelo smoke test. Um teste com duas sessões simultâneas reais ainda deve ser incluído antes da prontidão de produção.

## 6. Testes transacionais aprovados

O arquivo reproduzível é:

```text
supabase/tests/stage17_inventory_homologation.sql
```

Os 14 testes aprovados foram:

1. `authorization_super_admin`;
2. `balance_not_direct_column`;
3. `defaults_categories`;
4. `defaults_units`;
5. `entry_increases_balance`;
6. `issue_reduces_balance`;
7. `module_installation`;
8. `movement_idempotency`;
9. `multi_company_isolation`;
10. `multi_project_isolation`;
11. `negative_stock_block`;
12. `posted_movement_immutable`;
13. `reversal_restores_balance`;
14. `transfer_atomic_conservation`.

Todos passaram após a migration corretiva. O script termina com `ROLLBACK`.

## 7. Migrations recuperadas e corretivas

### Concorrência recuperada

```text
20260720233052_stage17_inventory_concurrency_locks.sql
```

O SQL foi recuperado integralmente do ledger remoto e passou a existir no GitHub.

### Correção de homologação

```text
20260720233657_stage17_homologation_balance_project_scope.sql
```

Corrige:

- semântica de reversão no razão;
- isolamento de depósitos por obra.

## 8. Reconciliação do ledger de migrations

O schema original havia sido aplicado em 28 versões remotas fracionadas. Para tornar a recuperação compatível com o repositório:

- as versões fracionadas foram removidas apenas da tabela de histórico;
- nenhum DDL original foi revertido ou reaplicado;
- as 16 versões canônicas existentes no GitHub foram registradas no ledger;
- as versões `20260720233052` e `20260720233657` foram preservadas com seus números remotos reais.

Estado final do ledger da Etapa 17:

- 16 migrations canônicas originais;
- uma migration de locks de concorrência;
- uma migration corretiva de homologação;
- total de 18 migrations.

## 9. Advisors do Supabase

### Segurança

O advisor atual não aponta mais o erro anterior de view `SECURITY DEFINER`.

Classificação dos avisos restantes:

- RPCs `SECURITY DEFINER` acessíveis a `authenticated`: intencionais quando representam operações do aplicativo e validam autorização internamente;
- `app_module_dependencies`, `organization_modules`, `signature_access_tokens` e `signature_conversion_jobs` com RLS sem política: tabelas internas, administradas por RPC, trigger ou worker; não devem receber política permissiva apenas para remover aviso;
- proteção contra senhas comprometidas e opções adicionais de MFA: configuração externa do Supabase Auth, pendente antes de produção.

Referências do advisor:

- `https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy`;
- `https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable`.

### Performance

O ambiente vazio gera muitos avisos de índices não utilizados. Eles não justificam remoção, pois ainda não existe tráfego operacional.

Também foram observados avisos históricos de:

- FKs sem índice em módulos anteriores;
- políticas RLS com avaliação repetida de funções de Auth;
- múltiplas políticas permissivas em tabelas legadas.

Esses itens serão tratados na etapa planejada de Auditoria e Observabilidade/Prontidão de Produção. Índices de estoque não serão removidos por falta de uso em banco vazio.

## 10. Limitações atuais

Ainda não foram concluídos:

- E2E no navegador com usuários permanentes de homologação;
- teste real com duas conexões concorrentes disputando o mesmo saldo;
- teste completo de recebimento de Compras com pedido e fornecedor reais de homologação;
- teste completo de reservas, custódias e inventário físico em todas as transições;
- configuração de proteção contra senhas vazadas;
- configuração de mais opções de MFA;
- análise de carga e volumetria.

## 11. Conclusão

A Etapa 17 está:

- implementada na `main`;
- aplicada no Supabase de homologação;
- com ledger reconciliado;
- com CI aprovado no branch original;
- estruturalmente validada;
- homologada em 14 regras transacionais com rollback;
- corrigida quanto a reversão e isolamento multiobra;
- recuperável integralmente pelo GitHub.

Ela ainda não deve ser considerada pronta para produção enquanto as limitações da seção 10 permanecerem abertas.
