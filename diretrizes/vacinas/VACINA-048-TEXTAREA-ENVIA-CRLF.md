# VACINA-048 — `textarea` enviado por formulário chega com CRLF, e a comparação com o que está na tela nunca bate

## Qual foi o problema

No editor de modelo, o selo dizia **"Não salvo" logo depois de salvar com
sucesso**. A mensagem confirmava "Modelo salvo.", o modelo aparecia no
explorador, a versão subia — e o selo continuava vermelho.

## Como ocorreu

O selo é derivado, não assumido: o servidor devolve o corpo que gravou e o
editor compara com o que está na tela.

```tsx
const salvo = estado.ok && estado.corpoSalvo === corpo && estado.nome === nome;
```

O corpo viaja num `<textarea name="corpo">`. E a especificação de HTML manda
**normalizar a quebra de linha para CRLF na hora de montar o corpo do envio** —
o valor lido por `elemento.value` usa `\n`, o valor enviado usa `\r\n`.

O corpo com 24 linhas voltava com 23 caracteres a mais do que o da tela. A
comparação nunca dava verdadeiro.

## Por que aconteceu

Porque `textarea.value` e o valor enviado **são coisas diferentes** e ninguém
espera que sejam: o mesmo elemento, o mesmo atributo, dois resultados. A
diferença é invisível em qualquer inspeção casual — `console.log` mostra o texto
igual, o tamanho é que muda.

O defeito também é silencioso do lado do banco. Nada quebra: o Markdown com CRLF
renderiza igual. O que se perde aparece depois — o `diff` entre a versão 1 e a
versão 2 marca **todas** as linhas como alteradas, mesmo quando só uma mudou, e
a razão de guardar Markdown era justamente versionar em diff legível.

## Como foi detectado

Comparando o comprimento dos dois no navegador, depois de o selo não mudar. O
corpo da tela tinha 530 caracteres e o que voltou tinha 553.

## Qual foi a solução

Normalizar na entrada da server action, uma vez, antes de qualquer uso:

```ts
const corpo = String(formData.get("corpo") ?? "").replace(/\r\n/g, "\n");
```

Na entrada e não na comparação: o que se quer é **gravar** com `\n`. Corrigir só
a comparação deixaria o selo certo e o banco com CRLF — o defeito visível
sumiria e o do diff ficaria.

## Regra

- **Todo texto multilinha vindo de `FormData` é normalizado para `\n` na
  entrada**, antes de gravar, comparar ou versionar.
- **Estado de "salvo" se prova comparando com o que o servidor devolveu**, nunca
  com um instantâneo tirado no cliente antes do envio — que daria "salvo"
  também quando a gravação falhou na volta.
- Quando um valor "igual" não bate numa comparação, comparar o **tamanho** antes
  de suspeitar da lógica: diferença de caractere invisível é a causa mais comum
  e a que menos aparece na leitura.

## Prevenção automática

**Até 11/08/2026 era humana**, e a medição desse dia mostrou o preço: a regra
acima valia em **um** lugar do repositório. `app/actions` tinha **62 arquivos**
com a sua própria cópia de `String(dados.get(chave) ?? "").trim()`, nenhuma
delas normalizando — e o `.trim()` não resolve, porque tira espaço das pontas e
o `\r\n` está no meio.

Hoje são duas peças, e a segunda é a que faltava:

- **`lib/forms/campos.ts`** — a leitura normalizada, num lugar só. As 65
  leituras genéricas de `app/actions` passaram a delegar para ela;
- **`tests/formulario-campos.test.ts`** — a conferência do editor virou teste,
  incluindo a ida e volta pelo transporte, que prova que o multipart devolve o
  CRLF byte a byte e que quem tem de normalizar é o servidor;
- **`pnpm validate:crlf-normalizado`** — o portão que prova que *todo mundo*
  passa pela função. Confere duas coisas: nenhum leitor genérico lendo cru (a
  63ª cópia do helper reprova), e todo campo que alguma tela manda como
  `<textarea>` normalizado na leitura por chave literal.

O par tela→ação é medido pelo `<form action={…}>`, resolvendo o apelido do
`useActionState`, **e não pelo nome do campo**. Medir por nome erra: `reason` é
`<input>` numa tela e `<textarea>` noutra, e a primeira versão desta medição
acusou duas ações por causa disso — as duas falsas.

Provado por sabotagem, com o caso legítimo passando: o editor de modelo lendo
cru reprova, a leitura literal de `objetos.ts` reprova, e uma cópia nova do
helper genérico reprova. Três sabotagens no teste, também vistas reprovando:
sem normalizar, normalizando só `\r\n` e aparando espaço por conta própria.

## Limitações da prevenção

O portão cobre `app/actions`. Rota de API que leia `FormData` por conta própria
fica de fora, e um campo multilinha montado por JavaScript sem `<textarea>` no
JSX também. Está declarado aqui e não resolvido às escondidas.
