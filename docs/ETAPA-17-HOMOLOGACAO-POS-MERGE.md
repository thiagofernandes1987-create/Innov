# Etapa 17 — Homologação pós-merge

**Estado:** concluída no Supabase de homologação; PR corretivo pronto para revisão  
**Branch:** `fix/etapa-17-homologacao-pos-merge`  
**PR:** `#15`  
**Supabase:** `wyeojufebtwblsubkunr`  
**Atualização:** 20 de julho de 2026

## 1. Contexto

O PR `#14` foi mesclado na `main` antes da homologação Supabase. Este follow-up preserva o histórico já incorporado, aplica correções somente por migrations novas e registra evidências suficientes para recuperar e continuar o projeto sem depender de contêiner ou conversa.

O contêiner local não possuía checkout recuperável. O estado foi reconstruído pela `main`, pelos PRs `#14` e `#15`, pela pasta `diretrizes/`, pelas migrations versionadas e pelo histórico remoto do Supabase.

## 2. Migrations pós-merge

A sequência completa da Etapa 17 está aplicada. Correções adicionais:

```text
stage17_inventory_concurrency_locks
stage17_homologation_balance_project_scope
stage17_inventory_performance_indexes
stage17_inventory_rpc_privileges
```

Arquivos finais do PR:

```text
20260720160800_stage17_inventory_concurrency_locks.sql
20260720160900_stage17_inventory_performance_indexes.sql
20260720161000_stage17_inventory_rpc_privileges.sql
```

Migration aplicada nunca é reescrita; ajuste posterior exige novo arquivo com timestamp superior.

## 3. Estrutura homologada

- 18 tabelas do domínio;
- 18/18 tabelas com RLS;
- seis views derivadas com `security_invoker=true`;
- 49 políticas;
- 36 gatilhos não internos;
- 101 chaves estrangeiras;
- nenhuma chave estrangeira sem índice líder;
- módulo `estoque` ativo, sensível, versão `1.0.0` e habilitado por padrão;
- oito unidades e seis categorias padrão no bootstrap;
- depósito `ALM-GERAL` e localização `PADRAO` pelo instalador organizacional.

As views de saldo e as colunas de custo não possuem leitura direta para `anon` ou para o navegador autenticado. Valores sensíveis são entregues por RPC autorizada e mascarados conforme capacidade.

## 4. Concorrência e saldo

A postagem usa `pg_advisory_xact_lock` determinístico por:

```text
organização + depósito + localização + item + lote
```

As posições são bloqueadas em ordem estável antes da validação. A transação rejeita saldo físico negativo, consumo acima do disponível e consumo acima da reserva restante.

O conector executa chamadas sequencialmente. Uma tentativa de abrir duas conexões internas com `dblink` foi recusada porque o Supabase exige credenciais explícitas. A transação foi revertida e a extensão não permaneceu instalada.

A proteção foi validada por inspeção da RPC homologada e por duas saídas de cinco unidades sobre saldo oito: a primeira postagem foi aceita e a segunda recusada. Um teste de carga com duas conexões realmente sobrepostas continua recomendado para a Etapa 20.

## 5. Testes transacionais revertidos

### 5.1 Bootstrap

Foram criados temporariamente usuário, organização e membership, todos revertidos. Confirmado:

- 12 perfis;
- 21 módulos organizacionais;
- oito unidades;
- seis categorias;
- `SUPER_ADMIN` com `EDIT`, `administer` e `sensitive` no estoque.

### 5.2 Ciclo funcional

```text
entrada +10
→ reserva 6
→ consumo reservado 2
→ liberação do restante
→ duas saídas de 5 sobre saldo 8
→ reversão
→ inventário físico contado em 7
→ ajuste contabilizado
```

Resultados:

- entrada, reserva, consumo e reversão idempotentes;
- saída não reservada acima do disponível bloqueada;
- segunda saída sobre o mesmo saldo bloqueada;
- movimento `POSTED` protegido contra `UPDATE` e `DELETE`;
- saldo físico, reservado e disponível recalculados corretamente;
- inventário aprovado gerou ajuste e estado `POSTED`;
- saldo final: físico `7`, disponível `7`;
- vínculo entre organizações bloqueado;
- reserva cruzando obra e depósito incompatíveis bloqueada;
- chave do advisory lock determinística.

### 5.3 RLS direto

Foram criadas duas identidades e duas organizações temporárias. Com papel PostgreSQL `authenticated` e JWT da organização A:

```text
linhas visíveis da própria organização: 1
linhas visíveis da outra organização: 0
leitura direta de reference_unit_cost: bloqueada
```

Todos os dados foram revertidos.

## 6. Privilégios

A migration `20260720161000` removeu `PUBLIC/anon` de:

- `create_inventory_item`;
- `create_inventory_movement`;
- `create_inventory_warehouse`.

Auditoria posterior:

```text
RPCs operacionais de estoque executáveis por anon: 0
RPCs de criação executáveis por authenticated: 3/3
```

Helpers, instaladores e função de geração da chave de lock permanecem restritos ao servidor.

## 7. Advisors

### Segurança

A falha específica da Etapa 17 encontrada pelo advisor foi corrigida. Avisos de outros módulos são dívida técnica global e devem ser tratados nas Etapas 19 e 20.

### Performance

```text
FKs do domínio: 101
FKs sem índice líder: 0
```

Avisos `unused_index` são esperados em banco vazio e não justificam remoção antes de carga representativa.

## 8. Definition of Done

- [x] documentação atualizada no mesmo PR;
- [x] migrations aplicadas e homologadas;
- [x] migrations corretivas versionadas;
- [x] 18 tabelas e seis views confirmadas;
- [x] RLS confirmada nas 18 tabelas;
- [x] RLS testada com duas identidades e organizações temporárias;
- [x] nenhuma RPC operacional anônima;
- [x] custos sem leitura direta;
- [x] recebimento de Compras integrado de forma idempotente;
- [x] saldo não editável diretamente;
- [x] movimentos concluídos imutáveis;
- [x] testes de concorrência e saldo executados no limite do conector;
- [x] isolamento multiempresa e multiobra validado;
- [x] 101 FKs com cobertura de índice;
- [x] advisors revisados;
- [x] CI integral da branch aprovado;
- [x] PR `#15` pronto para revisão.

## 9. Resultado

A Etapa 17 está incorporada à `main` e homologada funcionalmente no Supabase. O PR `#15` consolida migrations corretivas, validadores e documentação e está pronto para revisão. Ele não será mesclado automaticamente; o merge depende de aprovação explícita do responsável pelo repositório.
