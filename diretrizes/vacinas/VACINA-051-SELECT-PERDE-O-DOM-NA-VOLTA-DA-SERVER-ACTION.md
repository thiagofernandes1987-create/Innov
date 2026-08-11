# VACINA-051 — `select` controlado perde o DOM na volta da server action, e é o DOM que o formulário envia

## Qual foi o problema

Na tela de emissão de documento, o fluxo é: escolher cliente e obra → **Gerar
prévia** → conferir o texto → **Emitir**. Os dois botões enviam o mesmo
formulário, e a promessa da tela é que *o que você vê na prévia é exatamente o
que vai ser gravado*.

Não era. Medido:

```
prévia:   7 lacunas
emitido: 11 lacunas
```

Entre um clique e o outro, o cliente e a obra sumiram do envio. O documento
gravado — que é imutável, porque documento emitido não se corrige — saiu sem o
cliente que a pessoa tinha escolhido.

## Como ocorreu

```tsx
const [clienteId, setClienteId] = useState("");
<select name="clienteId" value={clienteId} onChange={e => setClienteId(e.target.value)}>
```

Campo controlado, do jeito certo. E mesmo assim, logo depois da prévia o campo
mostrava "— sem cliente —".

## Por que aconteceu

A resposta de uma server action **re-renderiza a árvore do servidor**. Nesse
commit o navegador perde a seleção do `<select>`, e o React não a repõe: do
ponto de vista dele nada mudou — o estado continua com o id do cliente, então
não há por que tocar no DOM.

A prova de que o estado estava intacto é o que separa este defeito de um
"perdeu o estado" comum:

```
antes:                    "6db6ad90-…"
depois do round trip:     ""            ← DOM
após re-render local:     "6db6ad90-…"  ← o valor volta sozinho
```

Qualquer renderização seguinte traz o valor de volta, porque o estado nunca
mudou. **Divergiram o estado e o DOM** — e o formulário envia o DOM.

É por isso que o defeito é traiçoeiro: não há erro, não há aviso, o formulário
não some. Um campo mostra a coisa errada por alguns instantes, e o que sai é o
que estava na tela naquele instante.

## Como foi detectado

Comparando a contagem de lacunas da prévia com a do documento emitido. Foi um
número contra outro número — a tela não dava nenhum sinal, e a prévia estava
correta.

Sem essa comparação, o defeito só apareceria quando alguém abrisse um contrato
emitido e encontrasse `⟦cliente.nome_completo: sem valor⟧` no lugar do nome.

## Qual foi a solução

Reencostar o DOM no estado depois de cada renderização:

```tsx
const campos = useRef<Record<string, HTMLSelectElement | null>>({});
const escolhas = { clienteId, obraId, orcamentoId, propostaId, modeloId };
useEffect(() => {
  for (const [nome, valor] of Object.entries(escolhas)) {
    const campo = campos.current[nome];
    if (campo && campo.value !== valor) campo.value = valor;
  }
});
```

Sem lista de dependências, de propósito: a correção precisa rodar **depois de
toda renderização**, porque é justamente a renderização que não veio do estado
que estraga o DOM.

É uso legítimo de efeito — sincronizar com um sistema externo, que aqui é o
próprio elemento — e não `setState` disfarçado, que a regra de lint do
repositório proíbe com razão.

Depois: prévia com 7 lacunas, documento emitido com 7.

## Regra

- **Em formulário que passa por server action mais de uma vez, o campo de
  seleção é reencostado no estado após cada renderização.** Vale para `select`,
  e vale conferir para qualquer controle cujo valor viva no DOM.
- **Quando um fluxo tem "conferir" e depois "gravar", os dois passos são
  comparados por número**, não por aparência: contagem de lacunas, de itens, de
  linhas. Igualdade de aparência não prova igualdade de envio.
- Ao investigar "o campo perdeu o valor", **distinga estado de DOM** antes de
  propor correção: force uma renderização local e veja se o valor volta. Se
  voltar, o estado está bom e o problema é sincronização — trocar a forma de
  guardar o estado não resolveria nada.

## Prevenção automática

**Nenhuma, e a correção deste texto é parte do achado.**

Até 11/08/2026 esta seção afirmava: *"`verif26.mjs` no arnês compara, na tela de
emissão, a contagem de lacunas da prévia com a do documento emitido"*. **Esse
arquivo não existe neste repositório** — veio de um arnês que nunca foi
versionado aqui. A varredura da S-73, que contou quantas vacinas tinham portão
para decidir onde investir, classificou esta como tendo. Contou errado por causa
desta frase.

Prevenção declarada e ausente é pior que prevenção nenhuma: quem lê para de
procurar. Hoje a conferência é **humana**, e `pnpm validate:prevencao-declarada`
existe para impedir que a próxima afirmação dessas volte a passar.

A prevenção executável é a **T-73.3** do inventário, e o que ela precisa cobrir
está medido: no repositório inteiro há **um** `<select name=…>` controlado por
estado dentro de componente com `useActionState` — o desta vacina, já corrigido.
Os outros 16 usam `defaultValue`, e campo não controlado não diverge do DOM
porque o DOM é a verdade dele. O portão, portanto, não é para o que existe: é
para o próximo `value={estado}` que alguém escrever.
