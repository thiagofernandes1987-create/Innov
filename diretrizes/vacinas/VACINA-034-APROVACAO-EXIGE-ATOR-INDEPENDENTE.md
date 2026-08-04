# VACINA-034 — Aprovação exige ator independente

**Estado:** vigente  
**Detectada em:** campanha QA de personas, rodada Compras, 28 de julho de 2026

## Qual foi o problema

A mesma pessoa conseguia solicitar uma compra, selecionar a cotação e aprovar a
própria seleção. O pedido era emitido normalmente.

## Como ocorreu

`decide_procurement_approval` validava capacidade de aprovação, mas não
comparava `auth.uid()` com o solicitante da compra nem com quem pediu a
aprovação da cotação.

## Por que aconteceu

Permissão foi tratada como suficiente para aprovação. A segregação de função
estava documentada nas personas, mas não havia sido materializada como
invariável no banco.

## Como foi detectado

O cenário negativo P9 executou solicitação, RFQ, cotação e seleção com o mesmo
usuário e tentou aprovar. O pedido de R$ 474,60 foi criado, portanto o teste
retornou `FAIL` antes da correção.

## Qual foi a solução

A RPC recusa a decisão quando o ator:

- solicitou a compra; ou
- selecionou a cotação e originou a aprovação.

A aprovação independente foi repetida com outro membro ativo e concluiu pedido,
recebimento, estoque e financeiro.

## Varredura e ocorrências equivalentes

A regra vale para aprovar e rejeitar: a pessoa que montou a decisão não atua
como verificador independente. Financeiro, qualidade, documentos e acessos
devem ser avaliados com o mesmo padrão em rodadas próprias.

## Prevenção automática

O cenário operacional exige, na mesma transação:

1. autoaprovação bloqueada;
2. aprovação por usuário diferente;
3. pedido emitido uma única vez;
4. trilha com `requested_by` e `decided_by` distintos.

## Limitações da prevenção

Duas contas diferentes não provam independência organizacional quando pertencem
à mesma pessoa física. A organização precisa cadastrar responsáveis reais e
revisar conflitos de função periodicamente.
