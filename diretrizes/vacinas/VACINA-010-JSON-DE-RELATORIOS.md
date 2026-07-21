# VACINA-010 — Relatórios JSON gerados por serializador

## Sintoma

O artefato foi criado, mas o campo `missingNames` ficou inválido:

```text
["NOME_1"NOME_2"NOME_3"]
```

## Causa raiz

Uma lista shell foi interpolada manualmente dentro de uma string JSON. Regras de `IFS`, expansão de arrays, aspas e escaping não equivalem a um serializador JSON.

## Vacina

Nunca construir JSON por concatenação manual em shell.

Usar uma implementação que execute `JSON.stringify`, por exemplo Node.js:

```js
fs.writeFileSync(path,JSON.stringify(payload,null,2)+"\n");
```

Dados vindos do shell devem ser transferidos por variáveis simples ou argumentos e convertidos em arrays dentro do programa serializador.

## Aplicação transversal

Aplicada em:

- relatório inicial do E2E concorrente;
- relatório de secrets ausentes;
- futuros relatórios estruturados de CI e homologação.

Logs humanos podem continuar usando `printf`, mas artefatos `.json` não.

## Teste preventivo

`pnpm validate:vaccines` verifica:

- presença de `JSON.stringify` no workflow/script responsável;
- ausência de `printf '{` direcionado para arquivo `.json`;
- relatório baixado pode ser processado por `JSON.parse`;
- arrays preservam vírgulas, aspas e caracteres especiais.

## Critério de encerramento

- artefato é JSON válido em sucesso e falha;
- lista de nomes ausentes é um array verdadeiro;
- nenhum valor de secret é incluído;
- parsers podem consumir o relatório sem correção manual.
