# VACINA-027 — Mock aprovado exige QA de fidelidade

**Estado:** aplicada
**Detectada em:** redesign do launcher e relato do responsável em 28/07/2026

## Qual foi o problema

O visual apresentado e aprovado para o launcher não chegou à implementação.
A aplicação recebeu ajustes incrementais, mas continuou com outra hierarquia,
outra densidade e outro cabeçalho.

## Como ocorreu

O mock foi tratado como ilustração do relatório, e não como fonte visual de
verdade para a etapa de construção. A entrega foi validada por testes de código
e capturas isoladas, sem comparar o alvo e a implementação no mesmo viewport.

## Por que aconteceu

Não existia um portão explícito entre “mock aprovado” e “implementação aceita”.
Sem esse contrato, conformidade funcional foi confundida com fidelidade visual.

## Como foi detectado

O responsável comparou as imagens propostas com a tela publicada e relatou a
divergência. A auditoria lado a lado em 1487 × 1058 confirmou ausência do
cabeçalho completo, CRM em destaque, busca global, filtros e indicadores.

## Qual foi a solução

O mock escuro passou a ser fonte versionada de verdade. O launcher e a casca
foram reconstruídos com a mesma hierarquia e os controles principais foram
ativados. A aceitação agora exige captura no mesmo viewport, composição
lado a lado e registro do resultado em `design-qa.md`.

## Varredura e ocorrências equivalentes

Foram reconciliados o launcher real, a amostra pública, o cabeçalho, busca,
seletor de tema, canto do usuário, ícones e o seletor de visualizações do
pipeline. As capturas do Odoo permanecem referência de interação, não de marca.

## Prevenção automática

`tests/visual-target-contract.test.tsx` verifica a presença da fonte visual,
dos elementos estruturais obrigatórios e do resultado final de Design QA.
Typecheck, lint, testes e build continuam obrigatórios no mesmo ciclo.

## Limitações da prevenção

O teste textual impede a remoção silenciosa do contrato, mas não mede pixels.
A avaliação de espaçamento, proporção, contraste e responsividade continua
exigindo comparação visual lado a lado e inspeção em navegador.
