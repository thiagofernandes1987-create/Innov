# VACINA-044 — Grade de faixa única sem `minmax(0, …)` não encolhe, e a página inteira rola de lado

## Qual foi o problema

Em 390px de largura, `/app/crm` tinha **982px de rolagem horizontal**. Todas as
seções da página — cabeçalho, navegação, KPIs, cartões, listas e tabela —
mediam **968px** dentro de uma tela de 390.

Rolagem horizontal em telefone é o defeito que mais atrapalha leitura: metade do
conteúdo fica fora, e o gesto de rolar para o lado compete com o de rolar para
baixo.

## Como ocorreu

```css
.relationship-app { display: grid; gap: 22px }   /* sem grid-template-columns */
```

Grade sem faixa declarada cria **uma faixa `auto`**, e faixa `auto` cresce até o
`max-content` do filho mais largo. O filho mais largo era a tabela de seis
colunas de "Oportunidades recentes", cujo `min-content` é 968px.

O resultado é contraintuitivo e é o que faz o defeito passar: **os filhos que
caberiam herdam a largura do que não cabe.** O cabeçalho da página não tem nada
de largo, e mesmo assim mediu 968px.

## Por que aconteceu

Porque `1fr` e `auto` **não** significam "no máximo o container". O mínimo
implícito de uma faixa de grade é `min-content`, e enquanto o filho tiver
`min-content` maior que o container, a faixa estoura junto.

O par `minmax(0, 1fr)` é o que diz "pode encolher até zero" — e ele já estava
aplicado corretamente em quase todas as grades internas
(`.relationship-navigation`, `.relationship-stats`, `.relationship-launch-grid`
usam `repeat(n, minmax(0, 1fr))`). Faltou justamente no contêiner de cima, onde
não havia colunas para declarar e por isso ninguém pensou em declarar nada.

## Como foi detectado

Medindo `documentElement.scrollWidth > clientWidth` no navegador, a 390px, e
depois subindo a cadeia de pais a partir do primeiro elemento que estourava até
achar quem impõe a largura.

Não é detectável por leitura de CSS: a regra que causa o defeito é a que **não
foi escrita**.

## Qual foi a solução

```css
.relationship-app,
.content > .stack,
main.content {
  grid-template-columns: minmax(0, 1fr);
}

.card:has(> table),
.card-pad:has(> table) { overflow-x: auto; }
.card > table, .card-pad > table { min-width: 100% }
```

A tabela larga passa a **rolar dentro do próprio cartão**, que é o
comportamento certo: tabela de seis colunas não cabe em 390px e não deve caber
— o que ela não pode é arrastar a página junto.

Verificado em 8 rotas a 390px depois da correção — `/app`, `/app/crm`,
`/app/clientes`, `/app/obras`, `/app/estoque`, `/app/financeiro`,
`/app/qualidade` e `/app/compras`: nenhuma transborda.

## Regra

- **Todo contêiner `display: grid` de página declara `grid-template-columns`**,
  e quando é faixa única, `minmax(0, 1fr)`.
- **Conteúdo intrinsecamente largo — tabela, código, cronograma — rola dentro do
  próprio cartão**, nunca na página.
- Transbordo horizontal é medido nos três breakpoints, não julgado por
  aparência: a 390px o defeito é óbvio, a 1366px o mesmo CSS passa despercebido.

## Prevenção automática

Verificação de transbordo horizontal no loop de QA visual, em todos os
breakpoints e nos dois temas, com reprovação quando
`scrollWidth > clientWidth + 1` — já rodando no arnês de captura, que imprime
`transborda=true (982>390)` junto de cada tela.
