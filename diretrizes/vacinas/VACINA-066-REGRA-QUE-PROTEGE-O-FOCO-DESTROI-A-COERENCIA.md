# VACINA-066 — Regra que protege o foco destrói a coerência quando posição física e dono lógico são a mesma coisa

## Qual foi o problema

O relato veio do proprietário:

> *"por que está crescendo desgovernado, a cada coisa que eu informo que você não
> fez sempre adiciona um monte de tarefas e Sprints em lugares aleatórios e a
> lógica de um único módulo fica toda espaçada, um pouco em cada lugar"*

Medido em `diretrizes/INVENTARIO-DE-EXECUCAO.md` antes da correção:

```
sprints                                 : 51
tarefas                                 : 712
média de sprints distintas por módulo   : 4,5
módulos espalhados por 4 sprints ou mais: 17 de 25
módulos espalhados por 6 sprints ou mais:  9 de 25
```

O pior caso é o mais ilustrativo: o módulo `diario` aparecia em **7 sprints** —
S-19, S-20, S-25, S-28, S-29, S-49, S-50 — e **nenhuma delas era sobre o diário**.
Estava em CSP, vocabulário, janela de fechamento, snapshot de progresso, portal
do cliente, travessia e segurança. Quem fosse construir o módulo precisava
garimpar sete sprints para saber o que já tinha sido decidido sobre ele.

## Como ocorreu

Pela regra **R4**, que dizia: *"o que é novo vai para o fim"*.

A regra existia por um motivo bom e continua válida: impedir que um achado novo
empurre a sprint em curso e faça o trabalho parar pela metade. Achado novo
esperando no fim é achado que não interrompe.

O efeito colateral não foi previsto. Quando a descoberta é **sobre um módulo que
já tem trabalho planejado**, o fim do arquivo é o pior lugar possível: ela nasce
separada de tudo com que se relaciona, e nada a liga de volta.

E como quase toda sprint nova nasceu de uma observação do proprietário e não de
desenho, o arquivo virou o registro cronológico das conversas em vez do plano do
produto: **sete das últimas oito sprints eram reativas**.

## Por que aconteceu

Porque a regra tratava **posição física** e **dono lógico** como a mesma coisa.

"Onde o texto fica no arquivo" e "a que objetivo isto pertence" são duas
perguntas diferentes, e a R4 respondia às duas com a mesma resposta. Toda vez que
se otimizava uma, quebrava-se a outra:

| Se o novo vai para… | Protege | Quebra |
| --- | --- | --- |
| o **fim do arquivo** | o foco — a sprint em curso termina | a coerência — o módulo se espalha |
| a **posição do módulo** | a coerência | o foco — para-se no meio para atender o que chegou |

Não existe posição que resolva as duas, porque o problema não é de posição.

**E eu errei exatamente aqui, na primeira tentativa de corrigir.** Em 11/08/2026
troquei a R4 por *"o novo entra na posição do módulo"*, o que apenas moveu o
prejuízo de lado — reintroduzindo a interrupção que a R4 original existia para
impedir. A correção veio do proprietário, que separou as duas preocupações em vez
de escolher entre elas.

## Como foi detectado

Por medição executada depois do relato: script que cruza as 25 chaves do
`MODULE_REGISTRY` contra os títulos e tarefas de todas as sprints, com
normalização de acento.

A primeira medição saiu **errada e mais otimista** — 3,2 sprints por módulo, e
`diario` com zero — porque o regex era sensível a acento e não casava "diário".
Corrigido, o número piorou para 4,5 e `diario` apareceu em 7. Vale o registro:
**medida que confirma a hipótese com folga merece ser reconferida antes de virar
argumento.**

## Qual foi a solução

Separar as duas preocupações em três mecanismos, cada um com um alvo:

| Preocupação | Mecanismo | Regra |
| --- | --- | --- |
| Não interromper o que está em curso | achado novo vai para o **fim do arquivo** | R4 (restaurada) |
| Não perder de vista a que objetivo pertence | a sprint declara **`Marco:`** | R4 |
| Não dar por concluído o que ficou pendurado | o Marco **não fecha** com sprint aberta apontando para ele | **R9** (nova) |

O **Marco passa a ser rótulo, não seção** — é o que permite que a sprint fique
fisicamente no fim e logicamente no lugar certo. O Marco é a unidade de
conclusão, quase sempre *"finalizar o módulo X"*; a sprint é o conjunto de
tarefas para chegar lá.

O momento de reavaliação é a **virada de sprint**: terminou uma, confere-se o
Marco dela antes de começar a próxima. Se sobrou sprint aberta ligada a ele,
o Marco continua aberto, e decide-se ali a ordem — inclusive se o achado novo
precisa de um passo anterior que o destrave.

## Prova por sabotagem

`pnpm validate:inventory`, estendido:

| Sabotagem | Saída |
| --- | --- |
| base | `exit=0` — 63 sprints, 35 Marcos, candidatos a fechamento apontados |
| Marco `M-OBRAS` marcado `concluído` com 2 sprints abertas | `exit=1` — acusa R9, nomeando S-54 e S-47 |
| sprint sem `**Marco:**` declarado | `exit=1` — acusa R4 |
| sprint declara `M-INVENTADO`, ausente do registro | `exit=1` — acusa registro |
| **cenário real, em dois passos:** fechar `M-RH`, que tem 0 sprints abertas | `exit=0` — fechamento legítimo passa |
| …e então chega um achado novo **no fim do arquivo** declarando `M-RH` | `exit=1` — acusa R9 |
| restaurado | `exit=0` |

O penúltimo par é o que prova a regra: o portão **não** impede fechar um Marco
concluído de verdade, e **impede** fechá-lo por cima de um achado que chegou
depois. Portão que só sabe reprovar não serviria — ele precisa deixar passar o
caso legítimo.

## Limitações da prevenção

- **O portão confere vínculo, não pertinência.** Sprint declarando o Marco errado
  passa. Ele impede o esquecimento, não o engano.
- **Uma sprint tem um Marco só.** Trabalho que atravessa módulos — como a espinha
  E1, que destrava sete — é ligado ao Marco onde a peça mora, e a relação com os
  outros vive como dependência entre sprints, não como segundo Marco. Foi escolha
  deliberada: dois donos é o mesmo que nenhum.
- **Onze módulos estão `sem sprint`** e o portão não reclama disso, porque não
  planejar é decisão legítima. Mas o registro mostra quais são — entre eles
  `planejamento` e `tarefas`, com 1 página cada.
- **As sprints herdadas ainda misturam módulos.** S-20, S-23, S-25, S-27, S-28,
  S-29 e S-31 somam mais de 100 tarefas abertas atravessando vários módulos.
  Estão sob o Marco `M-LEGADO`, cujo objetivo é justamente decompô-las — a
  dívida está nomeada e gated, não escondida.
