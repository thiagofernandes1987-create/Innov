# VACINA-045 — Numeração de linha contada por `\n` erra assim que a linha quebra

## Qual foi o problema

No editor de modelo de documento, a coluna de números à esquerda do campo de
texto **saía do lugar**: o número 9 aparecia ao lado da linha 8, o 15 ao lado da
13, e o erro crescia para baixo.

Junto com isso, dois defeitos da mesma família:

- mudar o tamanho da fonte na barra de ferramentas desalinhava tudo, porque a
  coluna de números tinha tamanho fixo em `0.82rem` e o campo usava o tamanho
  escolhido;
- rolar o texto deixava os números parados, porque quem rolava era o `textarea`
  e a coluna era um irmão dele.

## Como ocorreu

```tsx
<pre className="editor-linhas">
  {corpo.split("\n").map((_, i) => `${i + 1}\n`).join("")}
</pre>
<textarea value={corpo} />
```

```css
.editor-area { display: grid; grid-template-columns: auto minmax(0, 1fr) }
.editor-linhas { font: 400 0.82rem/1.65 "IBM Plex Mono", monospace }
.editor-texto  { line-height: 1.65 }   /* font-size vem do estado da barra */
```

Uma linha por `\n`, uma altura por linha. Mas o campo tem quebra automática:
uma linha lógica longa ocupa **duas ou três alturas** na tela, e a coluna de
números continua reservando uma. A partir da primeira quebra, tudo abaixo está
deslocado.

## Por que aconteceu

Porque "linha" tem dois significados e o código usou o errado. A numeração
serve para localizar a **linha lógica** — o que está entre dois `\n` —, mas
precisa ser desenhada na cadência das **linhas visuais**, que é o que o motor de
quebra decidiu.

A quebra não é calculável por contagem de caracteres: depende da fonte, do
tamanho, da largura de conteúdo e de onde há oportunidade de quebra. Só o
próprio motor de layout sabe onde ela cai.

E o defeito é fácil de não ver: no texto de exemplo, a 1440px, nenhuma linha
quebrava e a coluna parecia certa. **A largura útil do campo a 1366px é de
474px**, onde quase todo parágrafo de proposta quebra.

## Como foi detectado

Comparando, no navegador, o topo de cada linha do espelho com o topo do número
correspondente, depois de digitar de propósito uma linha longa:

```
linhas: 1@406 h23   2@429 h69   3@499 h23   4@522 h23
a linha 2 realmente quebrou: true (69px vs 23px)
número 3 abaixo do fim da linha 2: true
```

Antes da correção o número 3 caía a 452 — dentro da linha 2, que vai de 429 a
498.

## Qual foi a solução

Espelho: cada linha lógica é repetida **invisível**, com a mesma fonte, o mesmo
`line-height`, a mesma largura de conteúdo e as mesmas regras de quebra do
campo. O número é posicionado dentro da sua própria linha do espelho, então
ele acompanha a altura que a quebra produziu.

```tsx
<div className="editor-espelho" ref={espelho} aria-hidden="true"
     style={{ fontFamily: fonte, fontSize: `${tamanho}px` }}>
  {corpo.split("\n").map((linha, i) => <p key={i}><b>{i + 1}</b>{linha || "​"}</p>)}
</div>
<textarea style={{ fontFamily: fonte, fontSize: `${tamanho}px` }}
          onScroll={e => { espelho.current.scrollTop = e.currentTarget.scrollTop }} />
```

```css
.editor-area     { position: relative }
.editor-espelho  { position: absolute; inset: 0; overflow: hidden;
                   padding: 14px 14px 14px 62px; line-height: 1.65;
                   user-select: none; pointer-events: none }
.editor-espelho p { position: relative; margin: 0; color: transparent;
                    white-space: pre-wrap; overflow-wrap: break-word }
.editor-espelho b { position: absolute; left: -54px; width: 40px; text-align: right }
.editor-texto    { position: relative; padding: 14px 14px 14px 62px;
                   background: transparent; overflow-wrap: break-word }
```

Três condições, e falha se qualquer uma soltar: **mesma métrica de fonte**
(tamanho vem do mesmo estado), **mesma largura de conteúdo** (mesmo `padding`
sobre a mesma caixa) e **mesma rolagem** (`onScroll` do campo empurra o
espelho). Linha vazia recebe um espaço de largura zero, senão o parágrafo não
gera caixa de linha e o número some.

## Regra

- **Numeração de linha em campo com quebra automática se desenha por espelho**,
  nunca por contagem de `\n` com altura fixa.
- **Espelho e campo compartilham fonte, tamanho, largura de conteúdo e
  rolagem**; qualquer um dos quatro divergindo desalinha.
- O alinhamento é verificado **com uma linha que comprovadamente quebra**, e a
  prova é a altura medida — `h69` contra `h23` —, não a aparência de um texto de
  exemplo que por acaso coube.

## Prevenção automática

Medido no navegador a 1366px, que é onde a quebra acontece: igualdade de
`font-size`, `line-height` e largura de conteúdo entre campo e espelho; altura
de uma linha que quebra contra a de uma que não quebra; posição do número
seguinte em relação ao fim da linha quebrada; e igualdade de `scrollTop` depois
de `Control+End`.

O arnês visual — `pnpm qa:visual documentos-modelos /app/documentos/modelos` —
cobre a mesma tela nos três breakpoints e nos dois temas, com transbordo, alvo
de toque e console; o alinhamento em si é verificação de tela e não tem
validador que o reprove sozinho no CI.
