# VACINA-011 — Identificadores reservados em scripts Node/Next

## Sintoma

O lint falha com a regra `@next/next/no-assign-module-variable` quando um script declara ou atribui uma variável chamada `module`.

## Causa raiz

`module` é um identificador historicamente associado ao sistema de módulos do Node.js. Mesmo em arquivos ESM, o plugin do Next.js bloqueia sua atribuição para impedir ambiguidade, incompatibilidade entre runtimes e comportamento diferente em ferramentas de build.

## Vacina

Variáveis que representam migrations, aplicativos ou módulos de negócio devem usar nomes semânticos explícitos:

```js
const moduleMigration = read(migrations[4]);
const applicationModule = item;
const moduleDefinition = registryEntry;
```

Não usar em scripts ou código executável:

```js
const module = ...;
let module = ...;
var module = ...;
module = ...;
```

A correção deve preservar o significado da variável e não desabilitar a regra do lint.

## Aplicação transversal

- `scripts/validate-stage19.mjs` passou a usar `moduleMigration`;
- scripts de validação são varridos por `pnpm validate:vaccines`;
- o lint continua sendo a segunda barreira geral para arquivos fora do scanner específico.

## Teste preventivo

`pnpm validate:vaccines` percorre `scripts/*.mjs` e bloqueia declaração ou atribuição direta ao identificador `module`.

`pnpm lint` deve permanecer ativo sem `eslint-disable` para `@next/next/no-assign-module-variable`.

## Critério de encerramento

- nenhum script atribui ao identificador `module`;
- o validador da Etapa 19 passa;
- lint passa sem exceção local;
- futuras ocorrências são bloqueadas antes do typecheck e do build.
