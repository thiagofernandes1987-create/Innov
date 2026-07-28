# VACINA-030 — Menu desktop sem corte

**Estado:** vigente
**Detectada em:** QA autenticado do preview da branch, em 28 de julho de 2026

## Qual foi o problema

Em 1520 px, aplicativos com muitos destinos exibiam apenas o começo do
primeiro item do menu no cabeçalho. Os links continuavam no DOM, mas ficavam
recortados entre a identidade do módulo e a busca global.

## Como ocorreu

A navegação inline era ativada para qualquer largura acima de 900 px, enquanto
o cabeçalho reservava colunas mínimas para busca, mensagens, tema e conta. A
largura residual não comportava simultaneamente organização, módulo e cinco ou
mais destinos.

## Por que aconteceu

O breakpoint considerava apenas a distinção celular versus desktop. Ele não
considerava a densidade real do cabeçalho em notebooks e sessões remotas, onde
há largura suficiente para a aplicação, mas não para uma barra de menus longa.

## Como foi detectado

Após publicar a branch, a captura autenticada de `Novo aditivo` mostrou apenas
o caractere inicial de `Aditivos` antes da busca. A árvore de acessibilidade
confirmou que todos os destinos existiam, isolando o defeito como corte visual.

## Qual foi a solução

O menu compacto já exigido pela `VACINA-019` passou a permanecer disponível
também na faixa intermediária. A navegação inline só aparece quando o viewport
tem espaço compatível com a composição completa do cabeçalho.

## Varredura e ocorrências equivalentes

A correção foi aplicada na casca compartilhada e, por isso, cobre todos os
aplicativos. Foram conferidos especialmente Aditivos, Documentos, Planejamento,
Compras, Estoque, Financeiro, Relatórios, Administração e Auditoria, que possuem
menus mais densos.

## Prevenção automática

`tests/module-navigation.test.tsx` exige que a faixa de notebook esconda o menu
inline e apresente o menu compacto. A validação autenticada em 1520 px confirma
que nenhum rótulo parcial permanece no cabeçalho.

## Limitações da prevenção

O teste estrutural protege os breakpoints e os destinos. Alterações futuras nas
larguras mínimas das outras colunas ainda precisam de captura visual no viewport
de notebook.
