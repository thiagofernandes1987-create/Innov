# VACINA-026 — Teste não executado não passa

**Estado:** aplicada
**Detectada em:** portão PostgreSQL da S-30 no Windows

## Qual foi o problema

Os scripts de Planejamento e Pipeline imprimiram “NÃO foram executados”, mas
saíram com código zero. O primeiro dependia de `bash`; o segundo, de `psql`
instalado no host. O portão parecia verde sem testar o banco.

## Como ocorreu

Indisponibilidade de ferramenta local era tratada como skip bem-sucedido para
facilitar desenvolvimento. No Windows remoto, nem WSL/bash nem `psql` estavam
presentes, embora Docker e PostgreSQL 16 estivessem disponíveis.

## Por que aconteceu

O runner confundia “ambiente opcional” com “garantia opcional”. A preparação do
banco também estava duplicada entre scripts e cada cópia tinha política própria
de falha.

## Como foi detectado

Ao executar os três portões PostgreSQL: Operações passou com 14 casos em Docker,
enquanto Planejamento e Pipeline retornaram zero em menos de um segundo com
mensagem de skip.

## Qual foi a solução

Um runner compartilhado inicia PostgreSQL 16 efêmero em Docker, espera o
bootstrap real (`VACINA-020`), aplica arquivos por stdin de forma portátil,
exige confirmações dos testes e remove apenas o contêiner nominal criado. Falta
de Docker agora reprova. Planejamento, Pipeline e Operações usam o mesmo
contrato; Pipeline entrou no CI.

## Varredura e ocorrências equivalentes

Os três runners locais de banco que exercitam o trabalho atual foram
reconciliados. E2E contra provedores externos mantém pré-requisitos próprios.

## Prevenção automática

Cada runner exige ao menos a quantidade esperada de `NOTICE` de aprovação. O
processo sai diferente de zero se Docker faltar, um SQL falhar ou os blocos de
teste não rodarem.

## Limitações da prevenção

O contêiner reproduz PostgreSQL, não extensões e serviços gerenciados completos
do Supabase. Replay integral continua sendo um portão separado.
