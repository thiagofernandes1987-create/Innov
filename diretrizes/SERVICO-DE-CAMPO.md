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

### 7.1 O check-in é ponto eletrônico de verdade?

O responsável descreveu como "tipo um ponto eletrônico para o financeiro
realizar o pagamento das horas trabalhadas". Registro de jornada para fim de
pagamento é artefato regulado no Brasil — a Portaria 671/2021 do MTP trata dos
sistemas de registro eletrônico e do REP-P, com exigências próprias de
integridade, espelho de ponto e não alteração de marcação.

Há duas leituras possíveis, e elas geram bancos diferentes:

- **apontamento de produção** — mede tempo em obra para custo e produtividade,
  e não substitui o controle de jornada da empresa;
- **registro de jornada** — alimenta folha e precisa atender à regulação.

A diferença prática: no segundo caso, marcação **não pode ser editada** — só
corrigida por ajuste rastreável com autor e justificativa, e o comprovante
precisa ser entregue ao trabalhador. Isso é imutabilidade, e imutabilidade se
projeta no início.

**Recomendação:** construir como apontamento de produção, com a imutabilidade e
a trilha de ajuste desde já. Fica correto para custo, e se depois virar registro
de jornada o caminho está aberto sem refazer.

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
