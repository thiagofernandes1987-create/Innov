# VACINA-037 — Orçamento exige composição e formação de preço

**Estado:** vigente  
**Detectada em:** campanha QA por personas, Rodada 02, 29 de julho de 2026

## Qual foi o problema

O módulo permitia criar e congelar um orçamento sem nenhum item, custo ou preço.
A interface não oferecia escolha entre material e mão de obra, entrada de
metragem, custos fixos, impostos ou margem desejada.

## Como ocorreu

A existência das tabelas e da página foi tratada como capacidade concluída. O
cálculo somava `budget_items`, mas zero linhas resultavam em custo e preço zero
sem validação bloqueante. As tabelas de markup e custos existiam sem porta de
entrada operacional no detalhe do orçamento.

## Por que aconteceu

Rota, schema e RPC foram entregues separadamente. Faltou uma invariável que
ligasse conteúdo mínimo, procedência, data-base, recálculo e formação de preço
antes da aprovação.

## Como foi detectado

Um cenário autenticado criou orçamento e versão sem itens, executou o cálculo e
conseguiu chamar `freeze_budget_version`. O resultado foi:

```json
{
  "status": "APPROVAL_PENDING",
  "sale_price": 0,
  "blocking_validations": 0
}
```

O usuário também confirmou que não encontrava na interface os controles
necessários para executar a rotina real do orçamentista.

## Qual foi a solução

- orçamento vazio gera `BUDGET_WITHOUT_ITEMS` bloqueante;
- itens com custo zero, sem fonte, sem data-base, com fonte futura ou vencida
  também bloqueiam;
- alteração posterior ao último cálculo exige recálculo;
- itens passaram a distinguir material, mão de obra, equipamento, serviço,
  subempreita, custo fixo, referência e outros;
- a tela permite quantidade/metragem, unidade, custo unitário, perda, frete,
  região, fonte e data-base;
- CUB SindusCon-SP pode ser aplicado por m² a partir de snapshot versionado;
- impostos, comissão, despesas variáveis e margem são configurados pelo método
  divisor;
- o solicitante não pode decidir nenhuma aprovação própria.

## Varredura e ocorrências equivalentes

A mesma regra deve ser aplicada a propostas, contratos, medições, pedidos,
lançamentos financeiros e inventários: registro vazio ou sem procedência não é
capacidade funcional.

## Prevenção automática

`pnpm test:db:budgets` reconstrói o domínio em PostgreSQL e exige:

1. orçamento vazio bloqueado;
2. material, mão de obra, custo fixo e administrativo calculados;
3. impostos e margem refletidos no preço;
4. congelamento somente sem validações bloqueantes;
5. autoaprovação recusada;
6. aprovação por ator independente registrada.

## Limitações da prevenção

O teste de banco não substitui QA visual autenticado. Integrações de composições
analíticas SINAPI/TCPO, importação de planilhas, edição em massa, arredondamento
por composição e revisão tributária continuam escopos próprios.
