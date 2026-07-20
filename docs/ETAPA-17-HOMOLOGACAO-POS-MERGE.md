# Etapa 17 — Homologação pós-merge

**Estado:** em execução  
**Branch:** `fix/etapa-17-homologacao-pos-merge`  
**Base:** merge `60bd076ce2f708b4488ef8606eb9570b01596fe9`  
**Atualização:** 20 de julho de 2026

## 1. Motivo deste follow-up

O PR `#14` da Etapa 17 foi mesclado externamente em `20/07/2026 20:00:52Z`, antes da conclusão da homologação Supabase exigida pelo Definition of Done.

O merge não foi executado pelo assistente. O código incorporado possuía CI integral verde, mas as migrations ainda não haviam sido aplicadas no projeto de homologação.

Este follow-up existe para:

- aplicar as migrations da Etapa 17 exatamente como versionadas;
- criar migrations corretivas novas quando necessário;
- executar testes transacionais, de concorrência, saldo e isolamento;
- auditar RLS, privilégios, índices e advisors;
- atualizar a documentação com evidências reais;
- manter uma trilha formal sem reescrever migrations já incorporadas.

## 2. Estado inicial verificado

Projeto Supabase conectado:

```text
project_id: wyeojufebtwblsubkunr
region: us-east-1
status: ACTIVE_HEALTHY
PostgreSQL: 17.6.1.147
```

A lista remota de migrations termina na Etapa 16:

```text
20260720153613_stage16_module_bootstrap_security
```

Nenhuma migration da Etapa 17 estava aplicada no início deste follow-up.

## 3. CI incorporado

O commit mesclado da Etapa 17 passou por:

- validação documental;
- validador estrutural da Etapa 17;
- validadores das Etapas 9, 12, 12.1, 12.2, 13, 14, 15 e 16;
- ESLint;
- TypeScript estrito;
- testes TypeScript;
- testes Python;
- build de produção.

A branch corretiva publica as migrations `2026072016*.sql` como artefato do GitHub Actions para garantir que a homologação use os bytes versionados no repositório.

## 4. Sequência de homologação

1. baixar o artefato `stage17-migrations` do CI;
2. aplicar as migrations em ordem lexical;
3. interromper na primeira falha;
4. registrar qualquer correção em nova migration;
5. confirmar 18 tabelas e seis views;
6. confirmar RLS nas 18 tabelas;
7. confirmar privilégios de colunas sensíveis;
8. executar testes transacionais com rollback;
9. executar testes de concorrência e saldo;
10. testar idempotência do recebimento de Compras;
11. testar isolamento multiempresa e multiobra;
12. consultar advisors de segurança e performance;
13. atualizar este documento, SPEC, inventário e roadmap;
14. manter o PR de follow-up em rascunho até todas as evidências estarem registradas.

## 5. Definition of Done remanescente

- [x] documentação atualizada no mesmo PR original;
- [x] CI integral verde no commit incorporado;
- [x] saldo modelado como projeção derivada e não editável;
- [x] movimentos concluídos protegidos por imutabilidade;
- [x] recebimento de Compras modelado de forma idempotente;
- [x] isolamento multiempresa e multiobra definido em schema, triggers e RLS;
- [ ] migrations aplicadas e homologadas;
- [ ] testes de concorrência e saldo executados no banco;
- [ ] idempotência validada no banco;
- [ ] RLS validada com identidades de homologação;
- [ ] advisors revisados;
- [ ] documentação final atualizada com resultados reais.

## 6. Regra de correção

Migration já aplicada no Supabase não será alterada. Falhas ou ajustes posteriores serão tratados por novo arquivo com timestamp superior ao último aplicado e documentados neste follow-up.

## 7. Resultado final

Esta seção será preenchida somente após aplicação, testes e auditoria. Até lá, a Etapa 17 permanece incorporada ao código, mas com homologação de banco incompleta.
