# VACINA-019 — Navegação responsiva não pode desaparecer

**Estado:** vigente
**Detectada em:** auditoria visual responsiva do ciclo de personas, em 28 de julho de 2026

## Qual foi o problema

Abaixo de 900 px, todos os menus do aplicativo eram ocultados. O nome do módulo
continuava visível, mas os destinos internos deixavam de existir para quem usa
tablet ou celular.

## Como ocorreu

`.barra-menus` mudava de `display: flex` para `display: none` no breakpoint sem
um drawer, seletor ou lista rolável equivalente. A decisão preservava espaço,
mas removia descoberta e navegação.

## Por que aconteceu

O breakpoint foi tratado como problema de encaixe visual, não como mudança de
modo de interação. Esconder o controle resolveu largura e criou uma falha
funcional.

## Como foi detectado

A captura real da branch foi repetida em viewport de 420 px e confrontada com a
auditoria anterior. O teste de componente então demonstrou que o HTML renderizava
somente a navegação desktop.

Não foi detectado antes porque a verificação responsiva conferia estouro,
console e launcher, mas não exigia paridade de destinos por breakpoint.

## Qual foi a solução

`NavegacaoDoModulo` mantém a navegação inline acima de 900 px e renderiza, abaixo
desse ponto, um menu nativo `details/summary` com os mesmos links, estado ativo e
nomes acessíveis. A superfície móvel usa alvos mínimos de 44 px.

Na mesma passagem, mensagens, notificações, avatar e controles de toque
relacionados foram alinhados à regra canônica de 44 × 44 px.

## Varredura e ocorrências equivalentes

Foram revistos os controles da casca, launcher e barra de visualizações. Os
alvos pequenos que dependem de toque receberam ampliação direta ou sob
`pointer: coarse`.

## Prevenção automática

`tests/module-navigation.test.tsx` renderiza uma rota real do CRM e exige:

- menu responsivo presente;
- gatilho nomeado para o módulo;
- os mesmos destinos do catálogo;
- indicação da rota ativa.

A verificação visual mede os alvos pela geometria computada em 420 px.

## Limitações da prevenção

O teste garante contrato e destinos, não posicionamento pixel a pixel. Alteração
de espaçamento, corte ou sobreposição ainda exige captura nos breakpoints
canônicos e inspeção visual.
