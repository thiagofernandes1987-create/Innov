# VACINA-032 — Função de extensão sempre qualificada

**Estado:** vigente  
**Detectada em:** campanha QA de personas, 28 de julho de 2026

## Qual foi o problema

O fluxo de assinatura sandbox e a geração de snapshots de relatório falhavam com
`function digest(text, unknown) does not exist`, embora `pgcrypto` estivesse
instalada.

## Como ocorreu

As funções `sandbox_signature_event_core` e `create_report_snapshot` foram
endurecidas com `SECURITY DEFINER` e `search_path` restrito a `public`. Ambas
continuaram chamando `digest()` sem schema. No Supabase, `pgcrypto` está no
schema `extensions`, que deixou de participar da resolução do nome.

## Por que aconteceu

A segurança do `search_path` foi tratada separadamente da procedência das
funções utilizadas. Restringir o caminho foi correto; presumir que funções de
extensão pertenciam a `public` foi incorreto.

## Como foi detectado

O cenário normal P11 → P1 → P15 → P14 executou orçamento, proposta, aceite,
contrato e assinatura. O primeiro evento do envelope reproduziu a falha. A
varredura de `pg_get_functiondef` encontrou a mesma referência não qualificada
em Relatórios.

## Qual foi a solução

- `extensions.digest(...)` é usado explicitamente;
- o `search_path` permanece mínimo e não inclui o schema inteiro de extensões;
- as duas ocorrências equivalentes foram corrigidas em migration nova;
- privilégios mínimos das RPCs foram reaplicados após `CREATE OR REPLACE`.

## Varredura e ocorrências equivalentes

Ocorrências encontradas e corrigidas:

1. `sandbox_signature_event_core(uuid,text,text)`;
2. `create_report_snapshot(uuid,report_kind,uuid,date,date,uuid,jsonb)`.

## Prevenção automática

`pnpm validate:extension-functions` reconstrói a última definição versionada de
cada função PostgreSQL e reprova `digest()` não qualificado em função
`SECURITY DEFINER`.

## Limitações da prevenção

A prevenção cobre `digest`, que foi a função de extensão reproduzida. Novas
funções de extensões precisam ser adicionadas ao catálogo do validador quando
forem introduzidas; a regra arquitetural continua sendo qualificar sempre o
schema da extensão.
