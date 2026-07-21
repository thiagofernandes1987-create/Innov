# VACINA-001 — Relações Supabase `objeto | array | null`

## Sintoma

TypeScript `TS2352`, propriedades ausentes ou falhas em runtime quando uma relação retornada pelo Supabase é tratada diretamente como `Record<string, unknown>`.

Exemplo de erro:

```text
Conversion of type '{ ... }[]' to type 'Record<string, unknown>' may be a mistake
```

## Causa raiz

A inferência do PostgREST/Supabase pode representar a mesma relação como:

```text
T | T[] | null | undefined
```

dependendo da cardinalidade inferida, da consulta, da tipagem gerada e da versão da biblioteca. Cast local não altera o valor real e mascara a incerteza.

## Vacina

Usar exclusivamente `lib/supabase/relations.ts`:

- `singleRelation`;
- `relationRecord`;
- `relationRecords`;
- `relationField`;
- `isUnknownRecord`.

Não criar helpers locais equivalentes nem converter array diretamente para `Record`.

## Aplicação transversal

A vacina foi aplicada em:

- SAC interno;
- ocorrências do portal;
- seleção de obras ao abrir ocorrência;
- contratos normalizados do módulo de relacionamento.

Módulos anteriores que já usam `singleRelation` permanecem compatíveis: obras, propostas, contratos, aditivos, planejamento, tarefas, diário, documentos e qualidade.

## Padrões proibidos

```ts
value as Record<string, unknown>
value as Record<string, unknown>[]
Array.isArray(value) ? value[0] : value
function firstRelation(...) { ... }
```

quando o valor é uma relação Supabase e o código não usa o helper canônico.

## Teste preventivo

`pnpm validate:vaccines` verifica:

- existência do helper canônico;
- uso do helper nas páginas de ocorrências;
- ausência dos casts inseguros que causaram o erro;
- ausência de helper local `firstRelation`/`relationValue` no SAC.

## Critério de encerramento

- typecheck verde;
- páginas internas e do cliente usam a mesma normalização;
- nenhuma configuração TypeScript é relaxada;
- nenhuma ocorrência é corrigida com `@ts-ignore` ou cast via `unknown` apenas para silenciar o compilador.
