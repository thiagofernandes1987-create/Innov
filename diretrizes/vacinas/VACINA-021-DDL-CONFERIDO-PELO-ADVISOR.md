# VACINA-021 — DDL conferido pelo Database Advisor

**Estado:** aplicada
**Detectada em:** S-30, aplicação das notificações operacionais no Supabase

## Qual foi o problema

A primeira migration operacional estava correta em autorização e isolamento,
mas o Database Advisor encontrou chaves estrangeiras sem índice de cobertura e
políticas RLS que avaliavam `auth.uid()` repetidamente por linha.

## Como ocorreu

As tabelas nasceram com índices orientados às consultas de domínio — objeto,
prazo e caixa de entrada. Alguns índices necessários para manutenção das FKs
não coincidiam com essa ordem de colunas. Nas políticas, a chamada direta a
`auth.uid()` era semanticamente correta, porém não estabilizava o valor como
initplan da instrução.

## Por que aconteceu

O teste PostgreSQL validava integridade, permissão, idempotência e isolamento,
mas não analisava o plano potencial nem o conjunto de índices de suporte às
chaves estrangeiras.

## Como foi detectado

Pelo advisor de performance do projeto Supabase imediatamente depois da
aplicação da migration. Não apareceu antes porque o banco efêmero testa
correção funcional com poucas linhas, não aconselhamento de produção.

## Qual foi a solução

Uma migration posterior:

- envolve `auth.uid()` em `(select auth.uid())` nas quatro políticas;
- adiciona índices de cobertura para usuário, projeto, módulo, tipo de evento e
  relacionamento evento–destinatário;
- preserva as mesmas condições RLS e todos os testes negativos anteriores.

## Varredura e ocorrências equivalentes

O advisor completo foi executado. A correção foi limitada às tabelas
`operational_*`, criadas nesta etapa. Avisos históricos de módulos anteriores
permanecem no backlog próprio e não foram alterados sem sua suíte de regressão.

O aviso de `SECURITY DEFINER` para `create_operational_event` é intencional:
pela `VACINA-004`, a função é a API autenticada do domínio, tem `revoke` de
`PUBLIC`/`anon` e valida organização, persona de origem e projeto internamente.

## Prevenção automática

`tests/personas-db-contract.test.ts` exige a migration de correção, o initplan
de `auth.uid()` e índices de cobertura. Toda aplicação DDL termina com advisors
de segurança e performance.

## Limitações da prevenção

O teste estático garante a presença do padrão, não estima cardinalidade nem
substitui `EXPLAIN ANALYZE` com volume representativo. Índices recém-criados
podem aparecer como “não usados” até o tráfego real executar essas rotas.
