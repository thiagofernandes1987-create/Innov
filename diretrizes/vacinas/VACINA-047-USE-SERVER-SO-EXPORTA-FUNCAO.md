# VACINA-047 — Módulo `"use server"` só exporta função assíncrona

## Qual foi o problema

A tela de modelos de documento passou a devolver **500 em toda requisição**,
com o mesmo erro:

```
TypeError: Cannot read properties of undefined (reading 'find')
  at EditorDeModelo (components/documentos/editor-de-modelo.tsx:336)
> const erroDoNome = estado.erros.find(e => e.campo === "nome");
```

`estado` vinha do `useActionState`, e o valor inicial dele era `ESTADO_INICIAL`,
exportado do arquivo de server actions. No cliente, `ESTADO_INICIAL` era
`undefined`.

## Como ocorreu

```ts
// app/actions/documentos.ts
"use server";

export type EstadoDoModelo = { ok: boolean; erros: ErroDeCampo[]; /* … */ };
export const ESTADO_INICIAL: EstadoDoModelo = { ok: false, erros: [], /* … */ };
export async function salvarModelo(anterior, formData) { /* … */ }
```

```tsx
import { ESTADO_INICIAL, salvarModelo } from "@/app/actions/documentos";
const [estado, gravar] = useActionState(salvarModelo, ESTADO_INICIAL);
```

Um arquivo marcado com `"use server"` **só pode exportar funções assíncronas**.
Toda exportação vira uma referência remota: o cliente recebe um identificador
que, ao ser chamado, faz a requisição. Uma constante não é chamável, e o que
chega do outro lado não é o objeto — é `undefined`.

## Por que aconteceu

Porque o arquivo parecia um módulo comum. A diretiva `"use server"` não muda a
sintaxe nem a aparência do arquivo, e nada no editor avisa: `import` resolve, o
tipo confere, `tsc --noEmit` passa. A falha só existe em tempo de execução, e só
do lado do cliente.

O tipo, aliás, **passa de verdade** e continua correto — `export type` é apagado
na compilação e nunca vira referência remota. Só o valor quebra. Isso torna o
sintoma pior: o mesmo `import` traz uma coisa que funciona e outra que não.

## Como foi detectado

Pelo log do servidor de desenvolvimento, e só ali. A página devolvia 500 sem
mensagem útil no navegador; foi preciso ler `dev.log` para ver a linha e o
`undefined`.

## Qual foi a solução

Tipo e constante saíram para o módulo puro que já existia, e a action passou a
importá-los:

```ts
// lib/documentos/modelos.ts  — sem diretiva, roda dos dois lados
export type EstadoDoModelo = { /* … */ };
export const ESTADO_INICIAL: EstadoDoModelo = { /* … */ };

// app/actions/documentos.ts
"use server";
import { ESTADO_INICIAL, type EstadoDoModelo } from "@/lib/documentos/modelos";
```

O cliente importa a constante do módulo puro; o servidor importa a mesma. Não há
duas definições para divergir.

## Regra

- **Arquivo com `"use server"` exporta apenas `async function`.** Constante,
  objeto, classe, enum e função síncrona não.
- **O valor inicial de `useActionState` mora no módulo puro**, junto com o tipo
  do estado — é dele que os dois lados leem.
- Quando o tipo vem de um arquivo de action, use `import type`: ele é apagado e
  não deixa rastro. Se o mesmo `import` traz também um valor, o valor quebra e o
  tipo não, e o erro parece não ter relação com a linha do `import`.

## Prevenção automática

`pnpm validate:server-actions` (`scripts/validate-server-actions.mjs`), no CI.
Reprova qualquer `export` de arquivo `"use server"` que não seja
`export async function`; `export type` passa, porque some na compilação.

O validador só existe porque **a vacina escrita não bastou**: no mesmo dia em
que ela foi registrada, eu repeti o erro num segundo arquivo — exportei o estado
inicial de outro `useActionState` do mesmo módulo de ações. Documentar uma
armadilha não desarma a armadilha.

`pnpm typecheck` **não pega**, e é importante que esteja escrito, porque a
primeira reação é confiar nele. Abrir a tela pega: a rota devolve 500 na
primeira renderização, e o loop de QA visual reprova com `status=500`.
