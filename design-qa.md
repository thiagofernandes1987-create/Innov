# Design QA — redesign do launcher

**Fonte visual:** `docs/referencias/visual/launcher-dark-target-2026-07-28.png`
**Implementação:** `/amostra-launcher?perfil=admin&cenario=problema`
**Viewport principal:** 1487 × 1058
**Viewport responsivo:** 420 × 900

## Comparação

A fonte e a implementação foram capturadas no mesmo viewport e inspecionadas
lado a lado em `artifacts/design-qa-redesign/07-final-lado-a-lado.png`.

## Achados corrigidos

- P1 — a casca anterior não implementava o mock aprovado: corrigido.
- P1 — faltavam busca global, organização, mensagens, atividades e tema no topo: corrigido.
- P1 — launcher era uma grade uniforme sem CRM em destaque: corrigido.
- P1 — controles centrais de busca, categoria e personalização não formavam uma jornada funcional: corrigido.
- P1 — pipeline oferecia somente Kanban e lista: corrigido com calendário,
  tabela dinâmica, gráfico, localização e atividades sobre os mesmos dados.
- P2 — densidade da primeira linha de cards estava abaixo da referência: corrigido.
- P2 — seletor de tema ativo produzia contraste branco excessivo: corrigido.
- P2 — quebra responsiva poderia gerar navegação incompleta: verificada em
  420 px, sem overflow horizontal e preservando busca e ações.

## Diferenças residuais aceitas

- P3 — avatar usa iniciais porque a aplicação não possui foto de perfil confiável.
- P3 — indicadores usam dados e barras nativas; ilustrações do mock não foram
  convertidas em gráficos fictícios nem em assets recortados.

## Evidências

- captura principal: `artifacts/design-qa-redesign/06-final-1487x1058.png`;
- comparação final: `artifacts/design-qa-redesign/07-final-lado-a-lado.png`;
- captura responsiva: `artifacts/design-qa-redesign/05-mobile-420x900.png`;
- largura responsiva: `scrollWidth 405`, `innerWidth 420`;
- portões de código: typecheck e lint aprovados antes do fechamento.

Resultado final: passed
