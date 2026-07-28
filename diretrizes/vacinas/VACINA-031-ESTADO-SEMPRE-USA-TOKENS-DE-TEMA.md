# VACINA-031 — Estado sempre usa tokens de tema

**Estado:** vigente
**Detectada em:** QA visual autenticado do fluxo de assinatura, em 28 de julho de 2026

## Qual foi o problema

O aviso “Tratamento por formato” ficava praticamente ilegível no tema escuro:
o fundo respeitava o token escuro, mas o texto mantinha um marrom fixo pensado
para o tema claro.

## Como ocorreu

O componente compartilhado `.validation` misturava `var(--warning-soft)` com
cores hexadecimais fixas para texto e borda. Ao trocar o tema, apenas parte da
composição mudava.

## Por que aconteceu

O estado visual foi tratado como uma cor isolada, e não como um conjunto
semântico de primeiro plano, fundo e borda. A captura do tema claro não expunha
o conflito.

## Como foi detectado

A captura autenticada de `/app/assinaturas/novo` no preview publicado mostrou
contraste muito baixo. A inspeção do CSS confirmou a combinação de token
adaptativo com primeiro plano fixo.

## Qual foi a solução

Avisos e bloqueios passaram a usar exclusivamente os tokens semânticos
`--warning`, `--warning-soft`, `--danger` e `--danger-soft`, inclusive na borda
derivada por `color-mix`.

## Varredura e ocorrências equivalentes

A classe é compartilhada por formulários e fluxos públicos. A correção cobre
assinaturas, documentos, contratos, qualidade e qualquer nova tela que reutilize
`.validation`.

## Prevenção automática

`tests/theme-contrast-contract.test.ts` reprova a reintrodução de cores fixas
nas regras de aviso e bloqueio.

## Limitações da prevenção

O teste protege a composição por tokens; contraste final continua sendo
confirmado visualmente nos temas claro e escuro.
