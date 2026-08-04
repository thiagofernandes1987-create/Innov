# Serviço de campo — execução, apontamento e o ciclo que retroalimenta o planejamento

**Documento canônico.** Ditado pelo responsável em 27 de julho de 2026.

Não é um módulo a mais. É o fechamento do ciclo: hoje o planejamento produz uma
previsão que ninguém confronta com a realidade, e a realidade fica na cabeça de
quem está na obra. Este documento descreve como as duas se encontram.

---

## 1. O ciclo, em uma frase

O planejador diz quanto tempo leva. O profissional de campo diz quanto tempo
**vai** levar. A diferença entre os dois é a métrica que move tudo o mais.

```
Planejador                Campo                     Sistema
    │                       │                          │
    ├─ define a tarefa ────►│                          │
    │  e o prazo            │                          │
    │                       ├─ check-in ──────────────►│ ponto + presença
    │                       ├─ diário de campo ───────►│ evidência
    │                       ├─ solicita insumo ───────►│ notifica almoxarifado
    │                       ├─ atualiza o to-do ──────►│ DEPT
    │                       ├─ check-out ─────────────►│ horas trabalhadas
    │                       │                          │
    │◄──── TEP, sinal amarelo, notificação ────────────┤
```

---

## 2. O que o profissional de campo tem no aplicativo

Perfil de execução: montador, pedreiro, técnico — qualquer papel que trabalhe na
obra. É a persona **P3** de `PERSONAS-E-ROTINAS.md`, que tem poder de veto sobre
desenho móvel: de pé, com uma mão ocupada, tela pequena, sinal ruim.

| O que | Para quê |
|---|---|
| A tarefa designada | O que executar hoje |
| O tempo que tem para executar | Saber se está dentro ou fora antes de o prazo virar |
| Check-in e check-out com localização | Ponto eletrônico e horas trabalhadas para o financeiro |
| Diário de campo | Foto da evolução no meio-dia e na saída |
| Solicitação de insumos | Faltou material: pede pelo aplicativo, notifica o almoxarifado |
| Calendário do dia | O que fazer hoje |
| To-do de campo | No fim do dia informa **quantos dias faltam** para terminar |

O to-do **não é escrito pelo profissional**: é alimentado pelo planejador. O
profissional atualiza um número — dias que faltam — e, quando há atraso, o
motivo. Escrever a própria lista transformaria o apontamento em redação.

### 2.1 O aplicativo interrompe o trabalho — ele não acompanha

Corrigido pelo responsável em 27 de julho: *"ele não é para trabalhar com o
celular na mão, mas durante o trabalho dele, em caso de necessidade ou 15
minutos antes de parar, ele precisa preencher as informações."*

São **três momentos**, e em cada um o profissional parou de trabalhar:

| Momento | O que acontece |
|---|---|
| Chegada | Check-in |
| Necessidade | Falta material → **para a atividade** e solicita |
| 15 min antes de sair | Diário, dias restantes e check-out |

A consequência de projeto: o critério não é "funcionar com uma mão", é
**terminar de primeira**. Fluxo que exige duas tentativas custa duas paradas.

### 2.2 Falta de material abre uma parada, não uma observação

Regra do responsável: **se falta material, ele obrigatoriamente para.** Então a
solicitação de insumo não é só um pedido ao almoxarifado — ela abre uma
**parada com início**, que fecha quando o material chega.

Isso é o que torna três coisas possíveis:

1. o tempo parado é **medido**, não estimado de memória depois;
2. entra no `TEP` como causa declarada, separando "rendeu menos" de "ficou
   esperando" — que são problemas de setores diferentes;
3. alimenta o KPI **parada de obra por falta de material**, o único que liga o
   almoxarifado ao custo real de faltar.

Sem a parada explícita, o atraso apareceria como baixa produtividade de quem
ficou de braços cruzados por decisão de outro setor. É a diferença entre medir e
culpar.

### 2.3 A janela dos 15 minutos é do sistema

O preenchimento do fim do dia acontece em horário conhecido, então quem lembra é
o aplicativo: notificação na janela, com o que falta preencher já listado.

Esperar o profissional lembrar produz o resultado previsível — diário em branco e
`DEPT` desatualizado. E `DEPT` desatualizado derruba o `TEP`, o sinal amarelo, o
painel e a matriz de competências, nessa ordem. **É o dado mais barato de perder
e o mais caro de não ter.**

---

## 3. As três variáveis

| Sigla | Nome | Quem determina |
|---|---|---|
| **DPPT** | Dias planejados previstos até o término | Planejamento |
| **DEPT** | Dias estimados previstos até o término | Profissional de campo |
| **TEP** | Tarefa executada no prazo | Calculado: `TEP = DPPT − DEPT` |

### Leitura do TEP

| Valor | Significa | O que fazer |
|---|---|---|
| `= 0` | Tarefa bem planejada e executada conforme o plano | Nada |
| `> 0` | Planejamento pessimista, ou o profissional rende acima da média | Rever coeficientes de tempo das próximas tarefas |
| `< 0` | Problema na execução | Abrir campo de motivo e notificar responsáveis e seguidores |

### O exemplo do responsável, conferido por cálculo

100 m² de reboco, 5 dias planejados. No terceiro dia:

```
previsto  = 3/5 × 100 = 60%
DPPT      = 5 − 3 = 2
DEPT      = 3          (o pedreiro informa no fim do dia 3)
TEP       = 2 − 3 = −1 → atraso na execução
novo término = 3 + 3 = 6 dias → estouro de 1 dia
```

### Motivo obrigatório quando TEP fica negativo

Campo de escolha, não texto livre — texto livre não vira métrica:

- choveu;
- faltou material;
- problema de saúde ou atestado;
- tarefa anterior atrasou;
- pendência do cliente;
- outro, com descrição.

O motivo é o que separa "atrasou" de "atrasou por quê", e é ele que permite
decidir rápido: falta de gente resolve-se mandando gente; falta de material
resolve-se no almoxarifado; pendência do cliente resolve-se ligando.

---

## 4. Uma correção necessária ao TEP

**O TEP absoluto não compara tarefas de tamanhos diferentes.** Calculado:

| Prazo planejado | TEP | Estouro relativo |
|---|---|---|
| 5 dias | −1 | 20,0% do prazo |
| 20 dias | −1 | 5,0% do prazo |
| 60 dias | −1 | 1,7% do prazo |

Os três têm o mesmo TEP e gravidades muito diferentes. Um dia perdido numa
tarefa de cinco é quase um quinto da obra; numa de sessenta é ruído.

Por isso o TEP fica como está — é a conta que o responsável definiu e é a que se
explica em voz alta — e ganha um par:

```
TEPr = (DPPT − DEPT) / prazo_planejado × 100
```

Regra de uso, para não haver dois números disputando a mesma decisão:

- **TEP** é o que aparece no cartão e na notificação: "faltam 3, estava previsto 2";
- **TEPr** é o que ordena listas, acende o sinal e compara equipes.

Sem isso, o ranking de equipes premiaria quem pega tarefa longa.

---

## 5. Onde o sinal aparece

Amarelo na obra específica, propagado para cima:

1. **cartão da tarefa** — sinal e dias de desvio;
2. **planner e módulo de projeto** — a obra acende;
3. **painel** — quantas obras no prazo, quantas atrasadas;
4. **notificação** — para o responsável e para quem segue a tarefa, no canto
   direito da barra, que já existe.

---

## 6. O que vira métrica

- desempenho por equipe;
- desempenho do planejador — TEP sistematicamente positivo é planejamento
  frouxo; sistematicamente negativo é planejamento otimista;
- rendimento médio do colaborador **por tipo de tarefa**;
- média histórica dos últimos 6 meses com desvio padrão, para escolher equipe:
  urgente vai para quem rende mais e varia menos; o que não é urgente pode ir
  para quem está aprendendo.

O desvio padrão importa tanto quanto a média: uma equipe que faz em 4 ou em 8
dias tem a mesma média de outra que faz sempre em 6, e não serve para prazo
apertado.

### Avaliação do cliente

De 0 a 5 estrelas, alimentando a matriz de competências: organização, educação,
pontualidade, acabamento, limpeza, identificação, uniforme.

---

## 7. Dois pontos a decidir antes de construir

Nenhum bloqueia o desenho. Os dois mudam o que precisa ser gravado, e sair
descobrindo depois custa migration.

### 7.1 O check-in alimenta a folha de pagamento — decidido

Decisão do responsável em 27 de julho: *"o check in para folha de pagamento e o
checkout pode já idealizar."*

Isso fecha a dúvida e **eleva a exigência técnica**. Registro de jornada para
fim de pagamento é artefato regulado no Brasil — a Portaria 671/2021 do MTP
trata dos sistemas de registro eletrônico de ponto e do REP-P, com exigências
próprias de integridade, espelho de ponto e não alteração de marcação.

O que isso impõe ao banco, desde a primeira linha:

| Exigência | Consequência de projeto |
|---|---|
| Marcação não se altera | `UPDATE` e `DELETE` negados na tabela de marcação; correção é **linha nova** de ajuste apontando para a original |
| Todo ajuste tem autor e motivo | Colunas obrigatórias, sem valor padrão |
| O trabalhador recebe comprovante | Cada marcação gera um identificador entregável |
| Espelho de ponto por período | Consulta consolidada por pessoa e competência |
| Integridade verificável | Encadeamento por hash da marcação anterior, para que adulteração em lote seja detectável |

**Isto é o oposto de "grava e depois a gente ajusta".** É o mesmo princípio já
aplicado em `pipeline_card_stage_history`, cuja escrita direta é recusada por
privilégio e verificada em teste — só que aqui a razão é legal, não só de
higiene.

**Duas consequências que mudam o que o campo vê:**

1. A tela precisa deixar claro que a marcação é definitiva antes de confirmar.
   Botão que grava jornada sem confirmação vira pedido de ajuste no dia seguinte.
2. Marcação fora da janela ou fora do raio da obra **não é bloqueada** — é
   gravada com a divergência anotada. Bloquear cria a pior consequência
   possível: a pessoa trabalha e não consegue registrar que trabalhou.

**O que continua fora de escopo, e precisa ser dito:** esta plataforma produz o
registro e o espelho. Ela não calcula folha, não aplica convenção coletiva, não
trata banco de horas nem adicional noturno. O financeiro recebe horas apuradas
com rastro; o cálculo trabalhista permanece onde já está.

### 7.2 Avaliação por estrelas é dado pessoal de desempenho

A nota do cliente identifica uma pessoa e serve para decidir quem trabalha onde.
Vale definir, antes de gravar: quem vê a nota individual, se o profissional
enxerga a própria, e por quanto tempo ela pesa na matriz — uma nota ruim de dois
anos atrás não deveria decidir a escala de hoje.

Não é impedimento; é uma decisão de produto que fica mais barata agora do que
depois de acumular histórico.

---

## 8. O que já existe e pode ser reaproveitado

Boa parte da fundação está feita, e este módulo é mais composição que construção:

| Peça | Estado |
|---|---|
| Diário de campo com evidência | Existe |
| Tarefas | Existe |
| Notificações no canto direito | Existe (T-23.31) |
| Conversa com atividade agendada | Existe (T-23.32) |
| `pipeline_card_activities` com prazo e responsável | Existe — é a base do to-do de campo |
| Estoque, para a solicitação de insumo | Existe |
| Códigos de data com natureza e marco | Existe — DPPT e DEPT entram como duas naturezas |
| Gantt com dependência | **Falta** — S-24 |
| Check-in e check-out com localização | **Falta** |
| TEP, TEPr e o motivo do atraso | **Falta** |
| Painel de obras no prazo e atrasadas | **Falta** |
| Matriz de competências | **Falta** |

O ponto mais importante: **DPPT e DEPT cabem na taxonomia de datas que já
existe** — natureza `planejada` e `estimada` sobre o mesmo marco. Não é modelo
novo, é mais um par de siglas na tabela que o `pipeline_codigo_data` já governa.
