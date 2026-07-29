# Rodada 02 — Adendo: continuidade de versões congeladas

**Data:** 29 de julho de 2026  
**Branch:** `main`  
**Estado:** correção aplicada e testada no banco

## Problema encontrado após a correção da composição

A organização possuía seis orçamentos sem itens. Dois haviam sido congelados
antes da VACINA-037:

| Código | Versão | Estado | Preço | Itens |
|---|---:|---|---:|---:|
| `ORC-002` | V1 | `APPROVAL_PENDING`, congelada | R$ 0,00 | 0 |
| `ASDASD` | V1 | `APPROVAL_PENDING`, congelada | R$ 0,00 | 0 |

Os novos campos de material, mão de obra, metragem, custos fixos, impostos e
margem apareciam desabilitados nesses registros porque versões congeladas são
imutáveis por desenho.

Descongelar ou editar a V1 destruiria a trilha histórica. A solução correta não
é remover a imutabilidade, e sim criar uma V2 editável.

## Solução

Foi criada a RPC:

```text
create_next_budget_version(budget_id, change_summary)
```

Ela:

1. exige perfil autorizado;
2. bloqueia o orçamento para evitar duas versões simultâneas;
3. exige que a versão atual esteja congelada;
4. cria o próximo número de versão;
5. clona o modelo de markup para não compartilhar configuração mutável com a
   versão histórica;
6. copia EAP/seções preservando a hierarquia;
7. copia itens, classificações, fontes, datas-base e composições vinculadas;
8. copia cenários;
9. mantém a versão antiga congelada;
10. torna a nova versão a versão atual em `DRAFT`;
11. exige recálculo e reaplica validações de prontidão;
12. grava auditoria `CREATE_NEXT_VERSION`.

## Portas de entrada

- na carteira de Orçamentos, versões congeladas exibem **Criar nova versão**;
- dentro do orçamento congelado, um aviso exibe **Criar nova versão editável**;
- versões ainda editáveis exibem **Compor custos**.

## Evidência executada

A função foi executada sobre `ORC-002` dentro de transação com `ROLLBACK`:

```json
{
  "result": "PASS",
  "new_number": 2,
  "old_frozen_at": "2026-07-29T00:24:39.789692+00:00",
  "new_frozen_at": null,
  "blocking_codes": [
    "BUDGET_WITHOUT_ITEMS",
    "CALCULATION_STALE"
  ]
}
```

A V1 permaneceu congelada; a V2 nasceu editável e não pôde ser aprovada vazia.
Nenhum dado do ensaio permaneceu no banco.

## Prevenção

`supabase/tests/budgets/next-version.test.sql` exige:

- preservação da versão congelada;
- V2 em `DRAFT` e editável;
- troca segura da versão atual;
- cópia de seção e item;
- preservação de `item_category`;
- markup clonado, não compartilhado;
- validação `CALCULATION_STALE` até recálculo.

O teste foi incluído em `pnpm test:db:budgets`.
