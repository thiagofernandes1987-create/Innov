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

Verificado em navegador na tela do editor: salvar e conferir que o selo passa a
`Salvo · v1`, e que digitar uma tecla o tira de novo. É o teste que reprova a
regressão, porque o selo só fica verde se os dois textos forem idênticos byte a
byte.
