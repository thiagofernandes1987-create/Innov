# VACINA-060 — Leitor que não entende o arquivo responde zero, e zero é um número plausível

## Qual foi o problema

O botão "sincronizar SINAPI" da tela de orçamento respondia **"somente 0 insumos
válidos foram encontrados"**. Não era erro de rede, nem de credencial: o pacote
baixava inteiro, o ZIP abria, as planilhas eram lidas — e o leitor não
reconhecia nada dentro delas.

A CAIXA mudou o formato do pacote. O leitor procurava **um arquivo por UF e por
regime**, com UF, regime e tipo escritos no nome do arquivo:

```
SINAPI_Preço_Ref_Insumos_SP_202606_NaoDesonerado.xlsx
```

O pacote publicado não tem nada disso. Medido, baixando o ZIP oficial
(`SINAPI-2026-06-formato-xlsx.zip`, 15.715.816 bytes):

```
├── SINAPI_familias_e_coeficientes_2026_06.xlsx
├── SINAPI_Manutenções_2026_06.xlsx
├── SINAPI_mao_de_obra_2026_06.xlsx
└── SINAPI_Referência_2026_06.xlsx   ← tudo o que interessa, em 10 abas
```

A UF virou **coluna**; o regime virou **aba** (ISD/ICD para insumos, CSD/CCD
para composições, mais ISE/CSE sem encargos e a aba Analítico).

Corrigida a seleção, o arquivo cobrou mais quatro pedágios — todos capazes de
gravar número errado **sem erro nenhum aparecer**:

1. **O código da composição está dentro de uma fórmula.** A célula é
   `HYPERLINK("#"&CELL("address";OFFSET(Analítico!$B$1;MATCH(104658;…)));104658)`
   com valor em cache `<v>0</v>`. Quem lê o valor importa 8.403 composições com
   o código zero.
2. **Preço em branco não é preço zero.** A própria planilha avisa: célula vazia
   significa que não houve coleta mínima naquele estado. Em SP, das 4.876 linhas
   de insumo, **1.996 estão em branco** — 41%. Gravar zero transformaria
   ausência de pesquisa em insumo de graça.
3. **A UF das composições é posicional.** Só `AC` aparece rotulado acima do
   cabeçalho; os outros 26 estados não têm rótulo e não há `mergeCells`. O que
   existe é a estrutura: 27 colunas `Custo (R$)`, cada uma seguida de um `%AS`,
   em ordem alfabética.
4. **Sub-composição tem custo, e ele estava sendo descartado.** Dos 43.923 itens
   analíticos de SP sem desoneração, **26.773 (61%) não são insumo: são outra
   composição** — e 26.771 delas têm custo publicado na aba CSD. O leitor
   gravava `unitCost: 0` em todas.

O item 4 é o que esta vacina acrescenta aos três já documentados no cabeçalho de
`lib/sinapi/relatorio-oficial.ts`: não era formato mal lido, era dado disponível
deixado na mesa. A composição analítica chegaria à tela com 61% dos seus itens
custando nada.

## Como ocorreu

Por acúmulo de defaults silenciosos, todos da mesma família — `?? 0`, `|| 0`,
`coalesce(...,0)`:

```ts
const custoUnitario = filho.tipo === "INSUMO" ? precoPorCodigo.get(filho.codigo) ?? 0 : 0;
```

A sub-composição nem chegava a ser consultada: o ternário já decidia zero. E do
outro lado, no banco, `import_sinapi_compositions_chunk` faz
`greatest(coalesce(nullif(v_item ->> 'unitCost','')::numeric, 0), 0)` — de modo
que mesmo um `null` honesto vindo do leitor viraria zero na gravação.

Nenhuma das duas camadas mente. Cada uma escolhe um valor de fallback razoável
para si, e a composição das duas produz um catálogo inteiro de itens gratuitos.

## Por que aconteceu

Porque **zero é um número plausível**, e todo o resto do sistema o aceita: soma,
arredonda, exibe e fecha o orçamento. Ausência de dado, se fosse representada
como ausência, apareceria — uma coluna vazia numa tabela chama atenção. Zero
não; zero parece resposta.

A falha da seleção de arquivos ficou **quarenta dias invisível** pelo mesmo
motivo em outra escala: a suíte tinha testes do leitor, mas todos sobre exemplo
sintético. Eles provavam que o leitor entendia o formato que o próprio teste
escrevia. Nenhum abria o arquivo publicado.

Vale o parentesco com a **VACINA-057**: lá, o validador conferia o artefato e
não o efeito, e três tabelas passaram 40 dias ausentes do banco com o CI verde.
Aqui, o teste conferia o leitor contra a fixture e não contra a publicação.

## Como foi detectado

Pelo usuário, na tela, pedindo a validação do orçamento analítico — não pelo CI.

Depois, medindo. A sonda `/api/internal/sinapi-leitura-real` baixa o pacote
publicado e roda o leitor inteiro até a fronteira da gravação. Foi ela que
mostrou os 2.880 insumos e as 8.403 composições, e foi a reconciliação
(somatório dos itens contra o custo oficial da composição) que expôs o item 4:

| | composições elegíveis | fecham dentro de 1% | desvio mediano |
|---|---|---|---|
| antes, só insumos com preço | 510 | 438 (86%) | 0,009% |
| depois, sub-composição resolvida | 5.544 | 5.433 (**98%**) | 0,02% |

## Qual foi a solução

**No leitor**, o custo da sub-composição passa a vir da aba de composições, que
já estava carregada:

```ts
const custoPorComposicao = new Map(composicoes.map(item => [item.codigo, item.custoUnitario]));
const custoUnitario =
  filho.tipo === "INSUMO"
    ? precoPorCodigo.get(filho.codigo) ?? 0
    : custoPorComposicao.get(filho.codigo) ?? 0;
```

**No formato**, três recusas em vez de três adivinhações: código da composição
lido do argumento do `MATCH`; preço vazio devolvendo `null` e o insumo ficando
de fora do catálogo; e o mapeamento posicional das UFs **conferido** — se a
contagem de colunas de custo não for exatamente 27, a leitura é recusada.

**Na verificação**, `pnpm sinapi:layout` baixa o pacote publicado hoje e cobra
o contrato de layout: nove conferências, entre elas a reconciliação do somatório
dos itens. Provado que morde, quebrando o leitor de propósito:

| sabotagem | o que reprova |
|---|---|
| ler o valor em cache em vez da fórmula | código zerado; composições sem itens |
| preço vazio virando zero | preço zerado no catálogo |
| deslocar a UF em uma coluna | reconciliação cai de 98% para **45,1%** |

O `prebuild` deixou de rodar o teste do leitor antigo e passou a rodar os do
leitor em uso. E `automatic-update-v2.ts` foi removido: existia porque a sonda
foi corrigida sem o botão, e os dois módulos divergiram falhando em pontos
diferentes pelo mesmo motivo.

**Fica em aberto, com tarefa própria no inventário:** os 4.677 itens (10,6%)
cujo insumo não tem preço na UF. Ali o número não existe na fonte, e representar
isso como ausência — em vez de zero — exige coluna nova no banco, porque hoje o
`coalesce` da migration converte qualquer `null` em zero.
