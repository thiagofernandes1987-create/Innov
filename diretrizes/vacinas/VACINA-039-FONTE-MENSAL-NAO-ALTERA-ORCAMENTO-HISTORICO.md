# VACINA-039 — Fonte mensal não altera orçamento histórico

**Estado:** vigente  
**Detectada em:** integração SINAPI da Rodada 02, 29 de julho de 2026

## Qual foi o problema

Uma fonte mensal de custos pode atualizar milhares de insumos e composições. Se
o orçamento consultar o registro "atual" por referência, uma atualização de
mês, UF ou regime pode mudar silenciosamente uma proposta já calculada.

## Como ocorreu

O domínio original possuía catálogo e composições, mas não registrava de forma
completa:

- origem canônica;
- código da fonte;
- UF;
- data-base;
- desoneração;
- hash do arquivo;
- lote de importação;
- custo congelado da versão da composição.

## Por que aconteceu

Catálogo editável e referência oficial mensal foram tratados como o mesmo tipo
de dado. Eles têm ciclos de vida diferentes: o primeiro pode ser mantido pela
empresa; o segundo precisa ser importado, versionado e imutável.

## Como foi detectado

Ao acrescentar o SINAPI, a análise mostrou que `budget_items` já possuía links
para catálogo e composição, mas o catálogo não conseguia provar exatamente qual
publicação mensal originou o preço usado.

## Qual foi a solução

A integração passou a preservar:

```text
fonte + URL oficial + SHA-256
→ UF + data-base + regime de desoneração
→ lote de importação
→ insumo ou versão congelada da composição
→ cópia do custo e da procedência no budget_item
```

O orçamento não calcula olhando o preço mais recente. Ao adicionar uma
referência, ele copia código, descrição, unidade, custo, UF, data-base e regime
para a versão editável. A atualização mensal seguinte cria outro snapshot e não
altera o orçamento existente.

## Varredura e ocorrências equivalentes

A regra se aplica a:

- SINAPI;
- SICRO;
- tabelas estaduais;
- CUB;
- índices de reajuste;
- cotações versionadas;
- tabelas licenciadas como TCPO.

Nenhuma dessas fontes deve atualizar retroativamente contratos, propostas ou
orçamentos congelados.

## Prevenção automática

`supabase/tests/budgets/sinapi.test.sql` exige:

1. fonte fora do domínio oficial recusada;
2. importação disponível apenas ao `service_role`;
3. catálogo oficial imutável para usuários;
4. busca por código e descrição;
5. composição com coeficientes preservados;
6. custo copiado para o orçamento;
7. cálculo recalculado;
8. versão congelada recusando nova inclusão.

O teste utiliza fixture identificada como não oficial e executa `ROLLBACK`.

## Limitações da prevenção

A vacina protege domínio e persistência. O parser do XLSX precisa ser validado
sempre que a CAIXA alterar nomes de arquivos, abas, cabeçalhos ou convenções. Uma
mudança estrutural deve falhar fechada, registrar o lote como `FAILED` e nunca
publicar linhas parcialmente interpretadas como se fossem oficiais.
