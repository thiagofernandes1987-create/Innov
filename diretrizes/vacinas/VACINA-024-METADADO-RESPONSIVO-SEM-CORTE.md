# VACINA-024 — Metadado responsivo sem corte

**Estado:** aplicada
**Detectada em:** S-30, inspeção visual da notificação pessimista em 420 px

## Qual foi o problema

O painel cabia integralmente no viewport, mas o prazo “escalada · até
28/07/2026” era cortado à direita quando dividia a mesma linha com um título
longo.

## Como ocorreu

O topo do item usava `display: flex`, título flexível e metadado com
`white-space: nowrap`. A soma das larguras mínimas excedia a área interna do
painel, mesmo sem overflow global da página.

## Por que aconteceu

O teste anterior media apenas `document.scrollWidth`. Overflow contido dentro
de um card não altera o scroll global e pode passar mesmo com texto ilegível.

## Como foi detectado

Comparação visual da fixture pessimista em 420×900, depois de confirmar por
medição que o painel terminava em `x=408` e a página mantinha `scrollWidth=420`.

## Qual foi a solução

Em telas até 860 px, apenas o topo das notificações operacionais empilha título
e prazo e permite quebra do metadado. Desktop preserva a leitura horizontal
compacta.

## Varredura e ocorrências equivalentes

Mensagens e atividades curtas mantêm o padrão horizontal. A correção foi
aplicada à classe semântica `operacional`, onde título e SLA são variáveis e
podem crescer.

## Prevenção automática

A homologação visual mobile precisa conferir conteúdo interno, não apenas
overflow global: título, prazo, origem e corpo devem aparecer por inteiro.

## Limitações da prevenção

Capturas não substituem teste com zoom de 200% e textos traduzidos maiores; essa
varredura segue como requisito de acessibilidade geral.
