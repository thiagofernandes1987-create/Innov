# Integração SINAPI — CAIXA/IBGE

**Estado:** domínio, importação normalizada, consulta e uso no orçamento implementados  
**Carga oficial automática do ZIP XLSX:** pendente de parser validado contra o arquivo oficial  
**Fonte canônica:** CAIXA — relatórios mensais SINAPI

## 1. Objetivo

Disponibilizar no módulo de Orçamentos:

- insumos SINAPI;
- composições SINAPI;
- coeficientes e componentes;
- preços por UF;
- data-base mensal;
- base com ou sem desoneração;
- cópia rastreável da referência para o orçamento.

O SINAPI não substitui cotações locais nem decide sozinho o preço de venda. Ele
fornece referências técnicas que ainda podem receber perda, frete, custos
indiretos, impostos, comissão e margem conforme o orçamento.

## 2. Origem oficial

A CAIXA publica, a partir de 2025, dois pacotes mensais:

- ZIP em XLSX, com famílias e coeficientes, manutenções, percentual de mão de
  obra e relatórios de insumos e composições de todas as UFs;
- ZIP em PDF, com relatórios analíticos, custos de composições e preços de
  insumos.

O IBGE coleta, apura e calcula os preços. A CAIXA mantém os aspectos de
engenharia, composições e publicação dos relatórios.

A fonte operacional aceita pelo importador deve pertencer a:

```text
https://caixa.gov.br/...
https://*.caixa.gov.br/...
```

Qualquer outro domínio é recusado.

## 3. Modelo de dados

### 3.1 Lote

`sinapi_import_batches` registra:

- organização;
- UF;
- mês de referência;
- desoneração;
- URL oficial;
- SHA-256 do arquivo;
- quantidades importadas/rejeitadas;
- estado e erro;
- metadados e horários.

### 3.2 Insumos

`cost_catalog_items` recebeu:

```text
source_key = SINAPI_CAIXA
source_record_id = código SINAPI
tax_relief
source_url
source_sha256
raw_payload
import_batch_id
```

O código interno inclui UF, mês e regime para impedir colisão entre snapshots.

### 3.3 Composições

- `cost_compositions`: identidade estável da composição por UF/regime/código;
- `cost_composition_versions`: custo e publicação de cada mês;
- `cost_composition_items`: insumos, composições auxiliares, coeficientes e
  custos parciais.

Cada versão importada fica `FROZEN`.

## 4. Contrato normalizado de importação

A rota é:

```text
POST /api/cost-sources/sinapi/import
Authorization: Bearer <CRON_SECRET>
```

### 4.1 Iniciar lote

```json
{
  "action": "start",
  "organizationId": "uuid",
  "region": "SP",
  "baseDate": "2026-06-01",
  "taxRelief": false,
  "sourceUrl": "https://www.caixa.gov.br/.../arquivo-oficial.zip",
  "sourceSha256": "64 caracteres hexadecimais",
  "metadata": {
    "fileName": "arquivo-oficial.zip",
    "parserVersion": "1"
  }
}
```

### 4.2 Importar insumos

Máximo de 1.000 linhas por chamada:

```json
{
  "action": "inputs",
  "batchId": "uuid",
  "rows": [
    {
      "code": "000001",
      "description": "Descrição oficial",
      "unit": "UN",
      "itemType": "MATERIAL",
      "unitCost": 10.25
    }
  ]
}
```

Tipos aceitos:

```text
MATERIAL
LABOR
EQUIPMENT
SERVICE
OTHER
```

### 4.3 Importar composições

Máximo de 250 composições por chamada:

```json
{
  "action": "compositions",
  "batchId": "uuid",
  "rows": [
    {
      "code": "100001",
      "description": "Serviço oficial",
      "unit": "M2",
      "unitCost": 150.00,
      "items": [
        {
          "code": "000001",
          "description": "Insumo oficial",
          "unit": "UN",
          "itemType": "INPUT",
          "coefficient": 1.5,
          "unitCost": 10.25,
          "totalCost": 15.375
        }
      ]
    }
  ]
}
```

### 4.4 Finalizar

```json
{
  "action": "finish",
  "batchId": "uuid",
  "errorMessage": null
}
```

Se o parser identificar estrutura inesperada, deve finalizar com mensagem de
erro. O lote fica `FAILED`; nenhuma tela pode apresentá-lo como base concluída.

## 5. Consulta no aplicativo

Rota:

```text
/app/orcamentos/sinapi
```

Filtros:

- código ou descrição;
- insumo/composição;
- UF;
- desoneração;
- data-base.

A página mostra apenas lotes `COMPLETED`. Quando não há lote oficial, apresenta
bloqueio explícito em vez de criar dados demonstrativos.

## 6. Inclusão no orçamento

Ao adicionar uma referência:

1. a versão precisa estar editável;
2. o usuário precisa ter perfil autorizado;
3. quantidade deve ser positiva;
4. código, descrição, unidade, preço, UF, data-base e regime são copiados;
5. o vínculo ao insumo ou à versão da composição é preservado;
6. o orçamento é recalculado;
7. a auditoria registra `ADD_SINAPI_REFERENCE`.

Atualizações futuras da base não modificam o custo copiado.

## 7. Segurança

- importação: apenas `service_role` e segredo forte;
- consulta: membro interno;
- composição do orçamento: perfis de orçamento/gestão/financeiro;
- referência oficial: imutável para usuário comum;
- orçamento congelado: imutável;
- fonte fora de domínio CAIXA: recusada;
- arquivo sem SHA-256: recusado.

## 8. Evidência executada

Foi realizado um cenário reversível com fixture explicitamente não oficial:

```json
{
  "result": "PASS",
  "batch_status": "COMPLETED",
  "inputs": 2,
  "compositions": 1,
  "components": 2,
  "search_results": 1,
  "budget_item_code": "100001",
  "budget_quantity": 10,
  "budget_unit_cost": 150,
  "budget_direct_cost": 1500,
  "invalid_source_blocked": true,
  "authenticated_import_blocked": true,
  "manual_edit_blocked": true,
  "frozen_budget_blocked": true
}
```

A transação foi revertida com `ROLLBACK`.

## 9. Pendência para carga oficial automática

O núcleo não tenta adivinhar o formato do XLSX. Para considerar a carga
automática pronta, ainda é obrigatório:

1. baixar um ZIP XLSX real da CAIXA;
2. conferir nomes e tipos de todas as planilhas;
3. mapear cabeçalhos reais por versão;
4. validar totais e quantidade mínima de registros;
5. comparar uma amostra com os PDFs oficiais;
6. implementar parser fail-closed;
7. executar a carga em homologação;
8. registrar hash, contagens e rejeições;
9. só então ativar o cron.

Enquanto isso, a integração é classificada como:

```yaml
catalogo_e_orcamento: IMPLEMENTED
endpoint_normalizado: IMPLEMENTED
carga_oficial_xlsx: PARTIAL
cron_oficial: BLOCKED_SOURCE_FORMAT
```

## 10. Arquivos

```text
supabase/migrations/20260729020000_sinapi_official_catalog.sql
app/api/cost-sources/sinapi/import/route.ts
app/actions/sinapi.ts
app/app/orcamentos/sinapi/page.tsx
supabase/tests/budgets/sinapi.test.sql
scripts/run-budget-db-tests.mjs
diretrizes/vacinas/VACINA-039-FONTE-MENSAL-NAO-ALTERA-ORCAMENTO-HISTORICO.md
```
