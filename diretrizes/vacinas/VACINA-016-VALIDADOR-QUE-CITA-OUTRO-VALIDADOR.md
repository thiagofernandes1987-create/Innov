# VACINA-016 — Trocar lista fixa por descoberta apaga a citação que outro validador cobra

## Qual foi o problema

`pnpm validate:vaccines` reprovava, e reprovava **no CI**, com uma frase só:

```text
Vacinas inválidas (1 falha(s)):
- Scanner documental sem prevenção: VACINA-007-SCANNER-DE-SEGREDOS.md
```

O scanner de segredos estava inteiro e funcionando. O que faltava era o **nome do
arquivo da vacina** escrito em algum lugar de `scripts/validate-documentation.mjs`.

## Como ocorreu

`validate-documentation.mjs` foi reescrito para descobrir as vacinas varrendo
`diretrizes/vacinas/` — correção legítima, feita porque a versão anterior tinha
uma lista fixa e um laço `id <= 13`, e por isso passava verde com duas vacinas
não registradas.

A lista fixa antiga continha, entre outros, o literal
`"VACINA-007-SCANNER-DE-SEGREDOS.md"`. A descoberta tornou a lista desnecessária
e ela saiu inteira. Com ela saiu a única ocorrência daquele literal no arquivo.

E `validate-vaccines.mjs` procura exatamente por esse literal:

```js
for(const token of["function isSafeSecretPlaceholder","function validateSecrets",
                   "requiredHistorical","VACINA-007-SCANNER-DE-SEGREDOS.md"])
 if(!documentationValidator.includes(token))
  errors.push(`Scanner documental sem prevenção: ${token}`);
```

## Por que aconteceu

Porque **um validador dependia de um dado literal do outro sem que essa
dependência estivesse escrita em lugar nenhum**. O literal existia por dois
motivos ao mesmo tempo — ser item de uma lista de conferência, e ser prova de
procedência da prevenção — e quem removeu a lista só enxergou o primeiro.

É a mesma família da VACINA-014: acoplamento por literal repetido, onde a cópia
de um lado envelhece sem que ninguém veja. A diferença é o sentido do erro. Na
014 a lista desatualizada deixava o portão **verde** contra um esquema velho;
aqui ela deixou o portão **vermelho** contra um código correto. Falso negativo e
falso positivo, mesma causa.

## Como foi detectado

Rodando `pnpm validate:vaccines` antes de commitar. Não foi detectado antes
porque `pnpm validate:docs` **não estava no CI** — de todos os validadores, era o
único fora. O arquivo mais reescrito da série de documentação era justamente o
que não tinha portão próprio, e por isso a reescrita passou.

Nem lint, nem typecheck, nem test, nem build olham para isso: é acordo entre dois
scripts, não tipo nem sintaxe.

## Qual foi a solução

Duas partes, e a segunda é a que impede a repetição.

**1. A citação voltou, agora explicando por que existe.** Não como item de lista,
onde o próximo a limpar o arquivo removeria de novo, mas como comentário de
procedência colado à função que a vacina protege:

```js
// Scanner de segredos — origem: diretrizes/vacinas/VACINA-007-SCANNER-DE-SEGREDOS.md.
// (…)
// A citação do arquivo da vacina acima não é enfeite: `validate-vaccines.mjs`
// procura por ela para provar que esta prevenção continua ligada a quem a pediu.
// Ela sumiu quando este validador passou a descobrir as vacinas por varredura em
// vez de lista fixa, e o portão de vacinas ficou vermelho até esta linha voltar.
function isSafeSecretPlaceholder(rawValue){
```

Comentário que diz "não apague, e aqui está o motivo" é a prevenção mais barata
que existe para acoplamento por literal.

**2. `pnpm validate:docs` entrou no CI**, logo depois de `validate:vaccines`. Era
o buraco que deixou a regressão ser commitada.

## Regra

- **Prevenção executável cita o arquivo da vacina que a pediu**, num comentário
  junto do código protegido — nunca só dentro de uma lista de conferência, que é
  a primeira coisa a ser limpa quando o script é reescrito.
- **Substituir lista fixa por descoberta é mudança de risco, não faxina.** Antes
  de apagar a lista, procurar quem lê cada literal dela: `grep` pelo item mais
  específico, no repositório inteiro, incluindo os outros validadores.
- **Todo validador que roda no repositório roda no CI.** Validador sem portão
  próprio é validador que envelhece — foi exatamente o que aconteceu com
  `validate:docs`.

## Teste negativo

Provado que o portão pega, e não só que passa:

```text
$ pnpm validate:vaccines                       # com a citação removida
Vacinas inválidas (1 falha(s)):
- Scanner documental sem prevenção: VACINA-007-SCANNER-DE-SEGREDOS.md
código de saída 1

$ pnpm validate:vaccines                       # com a citação de volta
Vacinas validadas: 13 causas-raiz documentadas e prevenções executáveis ativas.

$ pnpm validate:docs
Documentação validada: 20 canônicos, 15 vacinas, 23 históricos/planejados
e todos os módulos inventariados.
```

A reprovação foi observada no estado real do repositório, antes da correção — não
foi reproduzida depois para ilustrar.
