# VACINA-049 — Salvar não pode mudar o estado de publicação em silêncio

## Qual foi o problema

Um modelo de proposta **publicado** — portanto valendo para todo mundo que emite
proposta na organização — voltava a ser rascunho quando qualquer pessoa clicava
em **Salvar**. Sem aviso, sem confirmação, sem registro.

Efeito prático: quem fosse emitir a proposta seguinte não encontraria o modelo.
E ninguém saberia por quê, porque quem clicou em Salvar tinha certeza de ter
apenas salvado.

## Como ocorreu

```ts
const linha = {
  body_markdown: corpo,
  status: publicar ? "PUBLISHED" : "DRAFT",   // ← aqui
  // …
};
```

Um botão, duas decisões. "Salvar" foi lido como "gravar o texto", mas o mesmo
objeto carregava o estado de publicação, e o `else` do ternário rebaixava.

Foi detectado durante um teste de conflito de versão, em que a segunda aba
gravou o modelo e o menu **File** da primeira passou a oferecer "Excluir" em vez
de "Arquivar" — o que só acontece com rascunho.

## Por que aconteceu

Porque gravar conteúdo e mudar situação foram tratados como a mesma operação. A
tabela tem `status` e `body_markdown` na mesma linha, então gravar a linha
gravou os dois; nada no código separava "o que o autor mexeu" de "o que a
organização decidiu".

É a mesma raiz de VACINA-041 sob outra forma: **alçada não é campo**. Ali o
desconto virava número numa tela; aqui a publicação virava efeito colateral de
um botão. Nos dois casos uma decisão de negócio foi codificada como consequência
de outra ação.

## Como foi detectado

Pelo teste de conflito: `item do menu File: Excluir modelo`, quando o modelo
tinha sido publicado três passos antes. O rótulo do item é derivado do estado, e
foi o rótulo errado que denunciou o estado errado.

## Qual foi a solução

O estado atual é lido antes de decidir o próximo, e **salvar preserva o que
está**:

```ts
const { data: atual } = await supabase
  .from("document_templates").select("status").eq("id", modeloId).maybeSingle();
const jaPublicado = atual?.status === "PUBLISHED";
const publicado = publicar || jaPublicado;   // salvar nunca rebaixa
```

E, como editar o publicado é editar o que a organização usa, passou a exigir a
mesma alçada de publicar — nos dois lugares:

- no aplicativo, com mensagem que diz o que fazer ("use Salvar como… para
  trabalhar numa cópia sua");
- na política de `UPDATE` do banco, que só aceita linha `PUBLISHED` de quem tem
  `DELETE` no módulo — porque regra que só existe na tela é contornável por API.

Tirar de circulação continua barato: arquivar exige apenas `EDIT`. Dificultar a
retirada de um modelo com defeito seria proteger a coisa errada.

## Regra

- **Gravar conteúdo nunca altera situação.** Publicar, arquivar e despublicar
  são ações próprias, com botão próprio e confirmação própria.
- **O estado seguinte é decidido a partir do estado atual lido do banco**, nunca
  a partir de qual botão foi clicado.
- **Mudança de situação que vale para a organização exige a alçada mais alta do
  módulo, e a exigência mora na política do banco** — a da tela é conforto.
- **Desfazer é mais barato que fazer**: retirar de circulação exige menos do que
  colocar.

## Prevenção automática

Verificado em navegador: publicar, salvar em seguida por outra aba e conferir
que o selo "Publicado" continua e que o menu **File** continua oferecendo
"Arquivar modelo". A política do banco foi conferida em
`pg_policies` depois de aplicada — `with_check` da `UPDATE` contém a condição
`status <> 'PUBLISHED' or has_module_permission(…, 'DELETE', …)`.
