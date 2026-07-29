# Campanha QA por personas — Rodada 02

**Data:** 29 de julho de 2026  
**Branch:** `main`  
**Foco desta rodada:** orçamento utilizável, procedência dos custos e formação de preço  
**Estado da campanha geral:** em andamento

## 1. Relato que reabriu o fluxo

O usuário conseguia criar o cabeçalho do orçamento, mas não executar a rotina
real do orçamentista:

- não havia escolha entre material e mão de obra;
- não havia entrada prática de metragem/quantidade;
- custos fixos não tinham porta de entrada;
- impostos e margem não podiam ser configurados;
- o banco aceitava congelar orçamento vazio com custo e preço iguais a zero.

## 2. Reprodução anterior à correção

Cenário autenticado e reversível:

```json
{
  "result": "FAIL",
  "status": "APPROVAL_PENDING",
  "frozen_at": "2026-07-29T00:24:03.836629+00:00",
  "sale_price": 0,
  "blocking_validations": 0,
  "empty_budget_blocked": false
}
```

O defeito não era apenas visual. A máquina de estados permitia que uma versão
sem itens chegasse à aprovação.

## 3. Correções de domínio

### 3.1 Prontidão do orçamento

A função `refresh_budget_readiness_validations` passou a bloquear:

| Código | Condição |
|---|---|
| `BUDGET_WITHOUT_ITEMS` | versão sem nenhum item |
| `BUDGET_ZERO_COST` | itens sem custo calculável |
| `ITEM_WITHOUT_SOURCE` | custo direto/indireto sem procedência |
| `ITEM_WITHOUT_BASE_DATE` | custo direto/indireto sem data-base |
| `ITEM_SOURCE_IN_FUTURE` | fonte posterior à data-base do orçamento |
| `STALE_COST_SOURCE` | fonte com mais de 60 dias de defasagem |
| `CALCULATION_STALE` | item alterado depois do último cálculo |

`freeze_budget_version` executa novamente essas validações antes de congelar.

### 3.2 Natureza operacional do item

`budget_items.item_category` distingue:

```text
MATERIAL
LABOR
EQUIPMENT
SERVICE
SUBCONTRACT
FIXED_COST
REFERENCE
OTHER
```

A classificação contábil continua separada:

```text
DIRECT
INDIRECT
FIXED
ADMINISTRATIVE
```

Assim, “mão de obra direta”, “serviço administrativo” e “material indireto” são
representáveis sem misturar natureza e apropriação contábil.

### 3.3 Formação de preço

A tela passou a configurar um modelo divisor dedicado à versão:

```text
preço de venda = custo-base ÷
(1 − impostos − comissão − despesas variáveis − margem desejada)
```

A soma dos percentuais precisa ser menor que 100%. O usuário pode reduzir a
margem, salvar e recalcular. Capital investido também pode ser informado para o
ROI.

### 3.4 Segregação de aprovação

Qualquer aprovação de orçamento exige justificativa e ator diferente do
solicitante. A restrição deixou de valer somente para exceções de margem/ROI e
passou a valer para todas as aprovações.

## 4. Correções de interface

O detalhe do orçamento agora oferece:

1. **CUB SindusCon-SP por m²** — referência global aplicada à metragem;
2. **Composição manual** — material, mão de obra, equipamento, serviço,
   subempreita, custo fixo ou outro;
3. unidade, quantidade/metragem, custo unitário, perda e frete;
4. fonte, região e data-base obrigatórias;
5. remoção de item antes do congelamento;
6. impostos, comissão, despesas variáveis, margem desejada e capital investido;
7. resumo financeiro recalculado;
8. bloqueios explícitos quando a versão não está pronta.

Versão congelada permanece imutável.

## 5. Evidências executadas

### 5.1 Orçamento vazio

Depois da correção:

```json
{
  "result": "PASS",
  "blocked": true,
  "error": "Existem validações bloqueantes pendentes",
  "codes": ["BUDGET_WITHOUT_ITEMS"]
}
```

### 5.2 CUB por metragem

Cenário com 100 m² e CUB R8-N sem desoneração de junho de 2026:

```json
{
  "result": "PASS",
  "direct_cost": 222144,
  "sale_price": 222144,
  "blocking": 0,
  "status": "APPROVAL_PENDING"
}
```

O preço coincide com o custo porque o cenário não aplicou impostos ou margem.

### 5.3 Composição completa

Itens inseridos:

| Natureza | Apropriação | Cálculo | Subtotal |
|---|---|---:|---:|
| Material | Direto | 10 × R$ 100 | R$ 1.000 |
| Mão de obra | Direto | 20 h × R$ 50 | R$ 1.000 |
| Custo fixo | Fixo | 2 meses × R$ 500 | R$ 1.000 |
| Serviço administrativo | Administrativo | 1 × R$ 300 | R$ 300 |

Formação de preço:

```text
custo-base = R$ 3.300,00
impostos = 10%
margem desejada = 20%
markup divisor = 1 / (1 - 0,10 - 0,20) = 1,42857143
preço de venda = R$ 4.714,29
```

Resultado consultado:

```json
{
  "result": "PASS",
  "direct_cost": 2000,
  "fixed_cost": 1000,
  "administrative_fee": 300,
  "base_cost": 3300,
  "markup_factor": 1.42857143,
  "sale_price": 4714.29,
  "blocking": 0,
  "status": "APPROVAL_PENDING"
}
```

Todos os dados do ensaio foram revertidos com `ROLLBACK`.

## 6. Referência SindusCon-SP

Foram versionados snapshots do CUB R8-N de junho de 2026:

| Situação | Valor |
|---|---:|
| Sem desoneração | R$ 2.221,44/m² |
| Com desoneração | R$ 2.146,08/m² |
| Materiais — desonerado | R$ 892,29/m² |
| Mão de obra — desonerado | R$ 1.192,01/m² |
| Despesas administrativas — desonerado | R$ 61,78/m² |

Cada snapshot preserva:

- fonte e URL oficial;
- região e referência;
- data-base e data de publicação;
- situação de desoneração;
- valores e variações disponíveis;
- SHA-256 do payload canônico;
- instante de obtenção.

### 6.1 Sincronização automática

Foi implementado:

```text
feed oficial SindusCon-SP
→ descoberta da publicação mais recente do CUB
→ download HTTPS sem redirecionamento
→ extração e validações fail-closed
→ upsert de snapshot versionado
→ registro do sync run
```

O cron está agendado para o dia 5 de cada mês às 10:00 UTC.

A publicação é recusada quando:

- não pertence ao domínio oficial;
- não comprova a data-base;
- contém custo não positivo;
- o CUB sem desoneração aparece menor que o desonerado;
- componentes publicados não fecham o total;
- a data-base retrocede em relação ao último snapshot.

A ativação operacional depende da variável `CRON_SECRET` forte no Vercel. A
conexão não é declarada ativa enquanto essa configuração não for comprovada.

## 7. CUB não é composição analítica

O CUB é indicador global por metro quadrado. Ele serve para:

- estudo preliminar;
- comparação de ordem de grandeza;
- controle de coerência do preço global;
- atualização de cenários iniciais.

Ele não substitui:

- coeficientes de insumo por serviço;
- produtividade de equipe;
- composições SINAPI/SICRO/TCPO;
- cotação real de material;
- frete, perda, logística, tributação e condições locais.

Por isso a interface identifica o CUB como **referência global**. Composições
analíticas continuarão sendo adicionadas manualmente ou por importador oficial
específico. Nenhum coeficiente foi inventado a partir do CUB.

## 8. Prevenção permanente

Foram adicionados:

```text
pnpm test:db:budgets
tests/sinduscon-cub.test.ts
```

O CI agora executa o runner PostgreSQL de orçamento e a cadeia documental. O
teste de orçamento exige:

1. bloqueio de versão vazia;
2. cálculo de material, mão de obra, fixo e administrativo;
3. impostos e margem refletidos no preço;
4. congelamento somente sem bloqueios;
5. autoaprovação recusada;
6. aprovação independente aceita.

## 9. Deployments e falhas encontradas

A primeira versão do sincronizador falhou no typecheck do Vercel porque um campo
literal foi ampliado para `string`. A correção preservou os tipos literais do
snapshot. O deployment final do commit
`0bf7bfe1a9542f0dc19cadc0c27ede7eaf183bd2` ficou `READY`.

A tela funcional já havia sido publicada no commit
`84a97d764b1b9bcb244efcee826b735b91036163` e também ficou `READY`.

Nenhum erro de runtime foi encontrado no recorte de 30 minutos posterior ao
deployment final.

## 10. Limitações e próximos ciclos

Esta rodada corrigiu a incapacidade relatada no módulo de Orçamentos, mas a
campanha geral continua aberta. Permanecem:

- comprovar `CRON_SECRET` e executar a primeira sincronização real do cron;
- importar composições analíticas de fonte oficial/licenciada;
- edição em massa e importação XLSX/CSV;
- EAP/seções editáveis pela interface;
- bancos de BDI e markup reutilizáveis entre orçamentos;
- múltiplos cenários e comparação lado a lado;
- curva ABC de insumos e serviços;
- cotação automática integrada a Compras;
- histórico de atualização dos itens já usados em orçamento congelado;
- QA visual autenticado em celular, tablet e notebook;
- continuação dos módulos ainda `NOT_ASSESSED` da Rodada 01.

A Rodada 02 é concluída somente para o recorte **composição básica e formação de
preço do orçamento**. Não representa aprovação integral da plataforma.
