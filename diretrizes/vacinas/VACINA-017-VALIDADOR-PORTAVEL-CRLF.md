# VACINA-017 — Validador portável entre LF e CRLF

**Estado:** vigente
**Detectada em:** auditoria do ciclo de personas e rotinas, em 28 de julho de 2026

## Qual foi o problema

`pnpm validate:inventory` informava que nenhuma sprint existia, embora o
inventário contivesse 29 sprints.

## Como ocorreu

O checkout no Windows materializou o arquivo com quebras de linha `CRLF`. O
validador separava o conteúdo somente por `\n`, preservando `\r` no fim de cada
linha. A expressão regular do cabeçalho terminava em `(.+)$`; em JavaScript, o
ponto não consome o caractere de quebra `\r`, e nenhum cabeçalho era reconhecido.

## Por que aconteceu

O parser assumia uma representação física específica do arquivo em vez de
normalizar a fronteira de entrada. O contrato é “uma sequência de linhas”, não
“um arquivo obrigatoriamente gravado com LF”.

## Como foi detectado

Na execução local obrigatória dos validadores. O diagnóstico foi confirmado
comparando os pontos de código do cabeçalho e executando a mesma expressão
regular sobre a linha terminada por `\r`.

Não foi detectado antes porque o CI usa checkout Linux com `LF`, e não existia
teste do validador no ambiente Windows nem fixture com `CRLF`.

## Qual foi a solução

O inventário passou a ser dividido por `/\r?\n/`. O teste
`tests/inventory-validator.test.ts` executa o validador contra o arquivo
versionado e impede que a suposição de `LF` seja reintroduzida.

## Varredura e ocorrências equivalentes

A busca transversal encontrou outros usos de `split("\n")`, mas eles tratam
saídas de processos, SQL ou logs sem expressão regular ancorada no fim da linha.
Não apresentaram a mesma causa observável. Novos parsers de documentos
versionados devem normalizar `CRLF` na entrada.

## Prevenção automática

`pnpm test` inclui o teste de regressão, e `pnpm validate:inventory` permanece
como portão direto do contrato estrutural do inventário.

## Limitações da prevenção

O teste cobre `LF` e o `CRLF` real do checkout atual. Outros separadores Unicode
de linha não fazem parte do formato aceito para documentos canônicos.
