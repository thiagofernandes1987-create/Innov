# VACINA-002 — Validadores semânticos, não acoplados à sintaxe

## Sintomas observados

- CI exigia uma migration monolítica que havia sido corretamente dividida em quatro partes;
- validação do portal procurava `href:"/cliente/ocorrencias"`, embora a rota estivesse declarada em uma tupla e renderizada por `map`;
- funcionalidade existente era reportada como ausente.

## Causa raiz

O validador verificava uma representação textual específica em vez do contrato funcional ou estrutural que precisava existir.

## Vacina

Validadores devem confirmar invariantes sem depender de formatação, minificação, ordem de propriedades ou estilo JSX.

Exemplos:

- validar rótulo e rota separadamente;
- validar todos os arquivos reais de uma migration dividida;
- usar regex ou parser para contratos, sem exigir um trecho literal acidental;
- registrar a lista canônica de arquivos no próprio validador;
- produzir mensagem que diferencie arquivo ausente, token ausente e contrato inválido.

## Aplicação transversal

Aplicada em:

- `validate-stage17.mjs`;
- `validate-stage18.mjs`;
- `validate-stage20.mjs`, reconciliado com a casca e o Launcher atuais;
- validação da navegação do portal;
- validação das migrations fracionadas de ativos/inventário.

## Teste preventivo

`pnpm validate:vaccines` verifica que:

- o validador da Etapa 18 não procura a forma rígida `href:"/cliente/ocorrencias"`;
- a navegação exige semanticamente o rótulo e a rota;
- a Etapa 17 referencia os quatro arquivos `_01` a `_04` e não o arquivo monolítico removido.

## Critério de encerramento

A mesma funcionalidade escrita com formatação equivalente deve continuar passando. O validador deve falhar apenas quando o contrato real estiver ausente ou inválido.
