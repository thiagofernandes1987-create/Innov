# VACINA-054 — `Escape` fecha uma camada por vez, senão dispensar a sugestão apaga o formulário

## Qual foi o problema

No formulário de nova etapa da EAP, com a lista de sugestões aberta, apertar
`Escape` — o gesto universal para "não quero esta lista" — fechava a lista **e
o formulário inteiro**, descartando tudo o que já tinha sido preenchido: nome,
datas, descrição, sequência.

Medido no navegador, antes:

```
lista aberta   → Escape → lista fechada: sim | formulário ainda aberto: NÃO
```

## Como ocorreu

Duas camadas escutam a mesma tecla, e nenhuma sabe da outra.

O componente de sugestão, no seu próprio `onKeyDown`:

```tsx
if (e.key === "Escape") { setAberta(false); return; }
```

E o planejador, num ouvinte de janela montado uma vez:

```tsx
window.addEventListener("keydown", event => {
  if (event.key === "Escape") { setCreationModal(null); setEditorTaskId(null); }
});
```

Os dois estão certos isoladamente. O `Escape` sobe do campo até `window` e
dispara os dois no mesmo pressionar.

## Por que aconteceu

Porque cada camada foi escrita sabendo apenas de si. O componente de sugestão
nasceu genérico, para servir EAP, funil, marcador, disciplina e unidade — e
justamente por ser genérico não pode assumir o que existe em volta. O
planejador tratou `Escape` como "fecha o modal" porque, quando ele foi escrito,
era verdade: não havia nada dentro do modal que também respondesse à tecla.

O defeito nasce da composição, não de nenhum dos dois. É por isso que revisar
os arquivos separadamente não encontra: cada diff está correto.

E o prejuízo é assimétrico. Fechar a lista sem querer custa um clique; fechar o
formulário sem querer custa todo o preenchimento — e a pessoa que apertou
`Escape` estava justamente sinalizando que queria **continuar** preenchendo.

## Como foi detectado

Pelo passo 5 do roteiro de verificação, que não estava lá para achar isto. Ele
verificava "Escape fecha a lista sem apagar o que foi digitado" e falhou por
timeout procurando o campo — o campo tinha deixado de existir junto com o
formulário.

Vale o registro: a verificação achou um defeito diferente do que ela media. O
roteiro foi então reescrito para afirmar o que importa de verdade — que o
formulário continua aberto — e para exigir que o **segundo** `Escape` feche o
formulário, que é o comportamento esperado.

## Qual foi a solução

```tsx
if (e.key === "Escape") {
  if (aberta) {
    e.preventDefault();
    e.stopPropagation();
    setAberta(false);
    setDestacado(-1);
  }
  return;
}
```

A barreira só existe **enquanto há lista aberta**. Com a lista fechada,
`Escape` volta a ser do formulário — que é o que a pessoa espera ao apertar
duas vezes.

Depois:

```
lista aberta   → Escape → lista fechada: sim | formulário aberto: sim | texto intacto: "imper"
lista fechada  → Escape → formulário fechado: sim
```

## Regra

- **`Escape` fecha uma camada por vez, da mais interna para a mais externa.**
  Camada interna que está aberta consome a tecla e barra a propagação; fechada,
  deixa passar.
- **Componente genérico não assume o que existe em volta, mas assume que existe
  algo.** Ao escrever controle dispensável — lista, popover, menu — barrar a
  propagação enquanto aberto é parte do componente, não da tela que o usa.
- **Defeito de composição não aparece em revisão de arquivo.** Quando duas
  camadas escutam o mesmo gesto, a verificação tem que exercitar as duas
  juntas.

## Prevenção automática

Até 11/08/2026 esta seção afirmava que `verif28.mjs` exercitava a sequência na
tela de cronograma. **Esse arquivo nunca foi versionado aqui**, e o mesmo vale
para a VACINA-051: as duas vacinas de formulário que a S-73 contou como
protegidas eram as duas que citavam um arnês ausente — e são as do defeito mais
caro, o que apaga o que a pessoa acabou de digitar.

`pnpm validate:escape-uma-camada` cobra a regra: **tratador de tecla no elemento
(`onKeyDown` no JSX) que age em `Escape` tem de barrar a propagação nesse ramo.**
Se agiu, consumiu a tecla; deixá-la subir entrega o mesmo gesto a quem está por
fora, e por fora costuma estar o formulário inteiro.

Ouvinte de `document`/`window` **não** é cobrado: ele é a camada externa, o lado
que sofre a propagação. Barrar ali impediria o comportamento correto — que é o
segundo `Escape` fechar o formulário.

Medido ao criar: nove componentes tratam `Escape`, **oito** por ouvinte de
documento e **dois** no elemento. Dos dois, um já barrava; o outro —
`FormularioNovoCartao`, em `components/pipeline/coluna-acoes.tsx` — fechava o
formulário e deixava a tecla seguir para o ouvinte de janela do menu da etapa,
que é a mesma composição desta vacina noutro módulo. Corrigido.

Provado por sabotagem, com o caso legítimo passando: tirar a barreira do
componente de sugestão reprova, desfazer a correção do cartão reprova, e o
ouvinte de documento continua isento.

## Limitações da prevenção

O portão vê o ramo do `Escape`, não a árvore montada. Duas camadas que só se
encontram em runtime — porque uma é renderizada condicionalmente pela outra —
continuam exigindo a conferência na tela, que é onde este defeito nasceu.
