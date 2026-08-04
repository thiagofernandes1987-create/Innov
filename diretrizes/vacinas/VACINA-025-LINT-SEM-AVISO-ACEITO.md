# VACINA-025 — Lint sem aviso aceito

**Estado:** aplicada
**Detectada em:** portão final da S-30

## Qual foi o problema

`pnpm lint` retornava código zero apesar de três avisos. Um deles revelou que a
lista preparada para sanitizar senhas decodificadas no drill de backup não era
usada no tratamento de erro.

## Como ocorreu

O ESLint foi chamado sem limite de avisos. O CI arquivava o relatório, mas
considerava a etapa aprovada mesmo com dívida nova ou existente.

## Por que aconteceu

Aviso foi tratado como informação estética, embora regras como variável não
usada possam revelar lógica de segurança incompleta.

## Como foi detectado

No portão completo: 198 testes e typecheck passaram, porém o lint listou três
avisos com saída zero.

## Qual foi a solução

- `lint` agora usa `--max-warnings=0`;
- import não usado foi removido;
- mock não nomeia argumento descartado;
- o drill promoveu `secrets` ao escopo do `catch` e realmente sanitiza URL e
  senha decodificada.

## Varredura e ocorrências equivalentes

O lint completo foi repetido em todo o repositório, sem exceções locais nem
desativação de regra.

## Prevenção automática

Qualquer aviso futuro faz `pnpm lint` e o CI falharem.

## Limitações da prevenção

Lint não prova comportamento nem segurança semântica; testes, scanners e
revisão de fronteiras continuam obrigatórios.
