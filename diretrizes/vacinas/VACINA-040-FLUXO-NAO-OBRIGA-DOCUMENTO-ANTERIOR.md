# VACINA-040 — Fluxo não obriga documento anterior

**Estado:** vigente  
**Detectada em:** campanha QA de Planejamento e Propostas, 29 de julho de 2026

## Qual foi o problema

O Planejamento só permitia criar obra a partir de contrato e a Proposta só
permitia nascer de orçamento. Obras anteriores ao Innovar, projetos internos e
propostas por valor fechado ficavam sem porta de entrada.

## Como ocorreu

As colunas `proposals.budget_id` e
`proposal_versions.budget_version_id` eram obrigatórias. A única tela de nova
obra exigia contrato assinado. Uma sequência comercial comum foi transformada
em pré-condição universal do domínio.

## Por que aconteceu

O primeiro caminho implementado foi tratado como o único caminho válido. A
existência de uma conversão `orçamento → proposta → contrato → obra` foi
confundida com a obrigação de toda obra e proposta terem essa origem.

## Como foi detectado

O uso real tentou cadastrar obra em andamento, criar projeto diretamente no
Planejamento e emitir proposta de valor fixo. Os três casos eram impossíveis sem
criar documento fictício.

## Qual foi a solução

- proposta aceita `pricing_mode = BUDGET | FIXED`;
- vínculos de orçamento ficaram opcionais;
- projeto declara `entry_mode`;
- obra existente exige data de corte, avanço e custos históricos quando houver;
- proposta e orçamento podem ser ligados posteriormente;
- bairro e origem são persistidos e pesquisáveis;
- documentos de origem continuam imutáveis quando realmente existem.

## Varredura e ocorrências equivalentes

Foram revisadas as entradas de Orçamentos, Propostas, Contratos, Obras e
Planejamento. Converter documento existente continua disponível, mas deixou de
ser a única porta de entrada.

## Prevenção automática

`pnpm validate:flexible-workflows` reprova:

- FK predecessora novamente obrigatória;
- ausência de modos FIXED/BUDGET;
- retirada dos modos de entrada do projeto;
- formulário sem bairro ou data de corte;
- menu sem porta de entrada para novo projeto.

O cenário PostgreSQL cria projeto sem contrato e propostas com e sem orçamento,
sempre dentro de `ROLLBACK`.

## Limitações da prevenção

A vacina não dispensa contratos, propostas ou orçamentos quando uma política da
empresa realmente os exige. A obrigatoriedade deve ser configurada por tipo de
operação, não embutida na existência da entidade.
