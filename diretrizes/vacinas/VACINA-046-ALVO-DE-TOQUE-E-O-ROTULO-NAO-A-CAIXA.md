# VACINA-046 — O alvo de toque de uma caixa de marcar é o rótulo, e o medidor precisa saber disso

## Qual foi o problema

O arnês de QA visual reprovou a tela do editor de modelo em **todos os seis
cortes** — três larguras × dois temas — com `alvos<44px=1`. O culpado era
sempre o mesmo elemento:

```
{'tag': 'input', 'txt': '', 'w': 16, 'h': 16}
```

A caixa de marcar "Tempo real", de 16×16.

## Como ocorreu

A caixa está dentro do rótulo:

```tsx
<label className="editor-tempo-real">
  <input type="checkbox" checked={tempoReal} onChange={...} />
  Tempo real
</label>
```

O rótulo mede **109×44** e é ele que recebe o toque: rótulo com controle dentro
tem associação implícita, e clicar no texto marca a caixa. O alvo real sempre
teve 44px de altura.

O medidor olhava só o `getBoundingClientRect` do `input`, e a sonda de área
efetiva por `elementFromPoint` não salvava o caso: o ponto acima e abaixo da
caixa devolve o `<label>`, que **não é** o elemento medido, então a sonda parava
no primeiro passo.

## Por que aconteceu

Porque o medidor confundiu **quem responde ao toque** com **quem foi
desenhado**. Nos casos anteriores a diferença vinha de `::after` esticando a
região clicável, e por isso a sonda foi escrita comparando identidade de
elemento. Aqui a diferença vem de outro lugar — associação de formulário —, e a
mesma sonda passa reto.

É a terceira vez que este instrumento erra, e sempre pela mesma raiz: **a
régua foi construída para o defeito que eu tinha em mãos**, não para a
definição. Antes ela reprovava um título dentro de cartão clicável; depois
reprovava um cartão de 91px porque sondava só 12px para cada lado.

Um medidor que reprova o que está certo custa o mesmo que um que aprova o que
está errado: nos dois casos o resultado deixa de ser lido.

## Como foi detectado

Lendo o `relatorio.json` do arnês em vez do resumo: `pequenos` trazia um único
`input` de 16×16 sem texto, e a medição do rótulo no navegador devolvia
`109×44`.

## Qual foi a solução

No medidor, antes da sonda de área efetiva:

```js
const rotulo = el.closest("label") ||
  (el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null);
if (rotulo && (el.type === "checkbox" || el.type === "radio")) {
  const rr = rotulo.getBoundingClientRect();
  if (rr.height >= 44 && rr.width >= 44) continue;
}
```

Cobre as duas formas de associação — implícita, com o controle dentro do
rótulo, e explícita, por `for`/`id` — e só dispensa quando **o rótulo em si**
alcança os 44px. Caixa solta, sem rótulo, continua reprovando.

Na tela, o que faltava era garantir que o rótulo realmente tem 44px, já que a
regra global de formulário dá `min-height: 44px` e `width: 100%` a todo
`input` — o que transformava a caixa num quadrado azul do tamanho de um botão:

```css
.editor-tempo-real { min-height: 44px; cursor: pointer; white-space: nowrap }
.editor-tempo-real input { width: 16px; min-width: 16px; height: 16px;
                           min-height: 16px; padding: 0 }
```

Depois: `alvos<44px=0` nos seis cortes. `/app/crm`, rodado com o medidor
corrigido, manteve o mesmo resultado de antes — 1 a 390px, 0 nas demais —, o
que mostra que a mudança não passou a aprovar o que reprovava.

## Regra

- **O alvo de toque é a região que responde ao toque**, não o retângulo do
  elemento: rótulo associado, `::after` estendido e área do cartão contam.
- **Toda correção do medidor é verificada nos dois sentidos**: some o falso
  positivo, e uma tela já medida continua com o mesmo número.
- Caixa de marcar dentro de rótulo **não é aumentada para 44px**. Aumentar a
  caixa por causa do medidor é deixar a régua desenhar a tela.

## Prevenção automática

Regra aplicada em `scripts/qa/harness.mjs` — `pnpm qa:visual <modulo> <rota>` —,
que é o medidor usado em todos os módulos do loop de QA.

O medidor grava, para cada tela, um relatório em `.qa/<modulo>/` com a lista
`pequenos` — tag, texto e medidas —, para o resultado poder ser conferido em vez
de acreditado. **Esse relatório é saída, não artefato do repositório:** ele é
gerado por quem roda o QA e `.qa/` não é versionado. Quem procurar por ele num
checkout limpo não vai achar, e é por isso que o artefato citado aqui é o
medidor, não o que ele escreve — corrigido em 11/08/2026, quando o
`validate:prevencao-declarada` reprovou esta seção no CI e passou na máquina
local, que é exatamente a diferença entre as duas coisas.

O arnês passou a ser versionado nesta correção. Antes vivia no diretório
temporário da sessão, que o contêiner recicla: instrumento que se perde não
previne nada na sessão seguinte, e as três versões erradas do medidor de
contraste e as duas do medidor de alvo teriam sido refeitas do zero.
