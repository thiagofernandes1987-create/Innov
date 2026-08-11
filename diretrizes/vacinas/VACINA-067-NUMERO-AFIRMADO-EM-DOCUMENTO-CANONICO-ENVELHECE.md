# VACINA-067 — Número afirmado em documento canônico envelhece e passa a mentir com cara de medição

## Qual foi o problema

O proprietário suspeitou:

> *"acredito que dentro do nosso inventário com os Marcos, checklist, sprints,
> tem muita coisa desatualizada ou obsoleto, também deve existir testes e portões
> que garantam que sempre as documentações canônicas (…) sempre estejam
> atualizadas"*

Medido em 11/08/2026, antes do portão existir:

```
"54 validadores"  em 5 documentos, entre eles CLAUDE.md
"43 validadores"  em 1
"42 validadores"  em 2
"41 validadores"  em 1
"17 validadores"  em 1
real, medido em package.json                    : 43
```

O pior é onde: **`CLAUDE.md` é lido no início de toda sessão assistida**. Quem
lê "são 54 validadores", roda a bateria e conta 43, conclui que faltam 11 — e vai
procurar o que não existe.

Dois documentos — `MODULOS.md` e `INVENTARIO.md` — carregavam ainda **duas linhas
"Atualizado em"**, com datas diferentes, porque alguém acrescentou a nova sem
apagar a velha. A mais antiga aparecia primeiro.

## Como ocorreu

Documentação canônica cita quantidade medida, e a quantidade muda com o
trabalho. O texto não muda junto. Nenhuma ferramenta reclamava porque **nenhuma
sabia que aquele número era uma medição** — para o validador de documentação era
prosa.

O número não fica ausente, que seria inofensivo. Ele fica **errado com aparência
de medição**, e aparência de medição é exatamente o que faz alguém confiar sem
conferir.

## Por que aconteceu

Porque o repositório tratava documento como texto e código como estado, e só
media o segundo. Havia 43 validadores conferindo código, esquema, privilégio,
menu e inventário — e **nenhum** conferindo se o que a documentação afirma sobre
o repositório continua verdadeiro.

É a mesma família da VACINA-012 (documentação pós-merge diverge do estado real),
vista pelo lado da quantidade em vez do lado do fato.

## Como foi detectado

Por suspeita do proprietário — *"acredito que tem muita coisa desatualizada ou
obsoleto"* — seguida de varredura executada. A varredura conferiu primeiro o que
**não** estava quebrado, e vale registrar: **0 links internos quebrados** e
**0 comandos `pnpm` citados que não existem** nos 43 documentos. O apodrecimento
não estava na estrutura; estava só nos números.

## Qual foi a solução

`pnpm validate:numeros-afirmados` (`scripts/validate-numeros-afirmados.mjs`), no
CI. Ele confere, em `CLAUDE.md` e em todos os `diretrizes/*.md`, as quantidades
declaradas numa lista curada — validadores, vacinas, módulos no registry — e
acusa documento que se contradiz na própria data.

**A lista é curada de propósito.** O portão não adivinha o que um número no texto
significa; ele confere o que alguém declarou que vale a pena proteger, e cresce
quando outra medição merece proteção.

### Medição datada não envelhece

A isenção que torna o portão utilizável, e que é a parte conceitual:

> Sprint concluída que registra *"os 17 validadores verdes"* é **prova do que
> aconteceu naquele dia**. Corrigir para o número de hoje falsificaria o
> registro — e registro falsificado é pior que registro velho, porque ninguém
> mais sabe o que foi realmente medido.

Citação com data no entorno passa. Sem data, o texto está dizendo *"é assim
agora"*, e aí o número tem de bater. Quem quiser citar número antigo escreve a
data ao lado — e foi assim que as duas citações históricas do inventário foram
resolvidas, sem reescrever o que foi medido.

## Prova por sabotagem

| Sabotagem | Saída |
| --- | --- |
| base, depois das correções | `exit=0` — 15 citações conferidas em 43 documentos |
| `CLAUDE.md` volta a dizer "54 validadores" | `exit=1` — acusa `CLAUDE.md:121`, dizendo o real |
| restaurado | `exit=0` |
| `MODULOS.md` ganha uma segunda linha "Atualizado em" | `exit=1` — acusa a contradição de data |
| restaurado | `exit=0` |

## Limitações da prevenção

- **Só confere o que está na lista.** Três medições hoje. Número não declarado
  passa, e isso é escolha: adivinhar o significado de um número no texto produz
  falso positivo em série e o portão perde a confiança de quem o lê.
- **A isenção por data é grosseira.** Ela procura data num raio de 240
  caracteres. Um parágrafo que menciona uma data por outro motivo isenta o
  número — erra para o lado de deixar passar. Preferi assim: o portão existe
  para pegar o número **esquecido**, não para brigar com quem escreveu direito.
- **Não confere fato, só quantidade.** Documento que afirma um comportamento que
  não existe mais continua passando. Isso é a VACINA-012, e ela segue sem portão.
