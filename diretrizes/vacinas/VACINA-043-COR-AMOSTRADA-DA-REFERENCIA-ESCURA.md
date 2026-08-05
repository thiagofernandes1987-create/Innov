# VACINA-043 — Cor amostrada da referência escura vira texto invisível no tema claro

## Qual foi o problema

A tela inicial — o launcher, primeira tela de todo usuário — tinha **78
reprovações de contraste WCAG AA no tema claro**, medidas no navegador:

```
  1.62 (min 4.5)  12px    rgb(186,197,210) sobre rgb(248,246,241)  "Comercial"
  1.91 (min 4.5)  12.8px  rgb(169,182,197) sobre rgb(248,246,241)  "Leads, oportunidades, atividades"
  2.17 (min 4.5)  11px    rgb(156,171,188) sobre rgb(248,246,241)  "Permissão no módulo"
  2.74 (min 4.5)  10.24px rgb(133,152,172) sobre rgb(248,246,241)  "Oportunidade · Construtora Alfa"
```

Na captura, as categorias, as descrições dos 22 aplicativos, o bloco "Recentes"
e o "Ver todas no aplicativo" estavam legíveis apenas para quem já sabia o que
estava escrito.

## Como ocorreu

A camada `Redesign visual 2026-07-28` foi construída contra uma referência
visual **escura**, e as cores foram **amostradas da imagem** e escritas como hex
fixo:

```css
.launcher-destaque > p,
.launcher-app > p {
  color: #a9b6c5;   /* ← amostrado do alvo escuro */
}
.launcher-categoria { color: #afbdcb; }
.launcher-recentes small { color: #8598ac; }
```

Nos tokens, o mesmo papel já existia e já era correto nos dois temas:

```css
:root            { --muted: #60717d; }   /* claro  */
[data-tema=escuro] { --muted: #a6b4c5; } /* escuro */
```

`#a9b6c5` sobre o fundo escuro `#071729` dá 8,9:1 — perfeito. **O mesmo hex
sobre o fundo claro `#f8f6f1` dá 1,91:1.** A referência era escura, a revisão
foi feita no escuro, e o tema claro nunca foi aberto.

## Por que aconteceu

Porque **amostrar cor de uma imagem produz um valor, e o que o tema precisa é um
papel**. `--muted` significa "texto secundário sobre a superfície corrente"; o
hex significa "este azul-acinzentado, sempre". No momento em que a superfície
muda, o papel acompanha e o hex não.

A referência visual, que é uma boa prática, vira armadilha quando ela existe em
**um** tema só: ela transmite valores corretos naquele tema e silenciosamente
errados no outro.

## Como foi detectado

Por medição no navegador, dentro do loop de QA visual, com a fórmula de
contraste relativo do WCAG aplicada a todo elemento de texto folha da tela —
não por leitura de código nem por olhar a tela.

Não foi detectado antes porque:

- `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` **passam**: hex
  válido é CSS válido;
- a revisão visual foi feita no tema escuro, onde a cor está certa;
- o tema claro renderiza sem erro nenhum — o texto está lá, só não se lê.

## Qual foi a solução

Trocar as oito cores fixas da camada pelos tokens que já existiam:

```css
.launcher-destaque > p,
.launcher-app > p { color: var(--muted); }   /* era #a9b6c5 */
.launcher-categoria { color: var(--muted); } /* era #afbdcb */
.launcher-recentes b { color: var(--text); } /* era #e9eef5 */
```

Resultado medido nos dois temas, depois da troca:

```
LIGHT: reprovações AA = 78 → 2
DARK : reprovações AA = 2  (inalterado)
```

**A barra superior ficou de fora de propósito:** ela é escura nos dois temas, e
ali o hex claro é o valor certo. Trocar por token teria quebrado o que estava
funcionando — a regra não é "nenhum hex", é "nenhum hex em superfície que muda".

## Regra

- **Cor de texto em superfície que muda de tema usa token, nunca hex.** Se a
  superfície é fixa nos dois temas, hex é aceitável e deve dizer isso num
  comentário.
- **Referência visual em um tema só é meia referência.** Quem aprova um alvo
  escuro precisa abrir o claro antes de fechar, e vice-versa.
- **Contraste é medido, não julgado.** A medição roda no navegador, sobre a tela
  montada, nos dois temas.

## Autocrítica da medição — os falsos positivos que foram descartados

O medidor sobe a árvore procurando fundo opaco, e isso gera dois enganos que
**não** viraram correção:

1. **Fundo em gradiente ou imagem.** O elemento tem fundo, mas não em
   `background-color`. O medidor passou a **ignorar** o elemento quando encontra
   `background-image` diferente de `none`, em vez de reprovar contra um branco
   que não existe. Sem isso, "Todos" — chip selecionado, branco sobre gradiente
   azul — aparecia como 1,08:1, e é perfeitamente legível.
2. **Fundo translúcido sobre barra escura.** `rgba(255,255,255,0.9)` sobre
   `rgba(255,255,255,0.035)` acusa 1:1, mas o fundo efetivo é a barra escura
   embaixo. Continua na lista como resíduo conhecido e **não** é defeito.

Reprovação de contraste sem essa checagem produz correção que piora a tela.

## Prevenção automática

Auditoria de contraste no loop de QA visual, nos dois temas, com o resultado
gravado por módulo em `docs/qa/`. O portão é comparativo: **nenhum módulo pode
aumentar o número de reprovações** em relação à última medição registrada.
