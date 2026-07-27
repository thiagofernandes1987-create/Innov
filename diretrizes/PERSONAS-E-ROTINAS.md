# Personas e rotinas — o que cada um precisa **saber** para fazer o dia dele

Documento canônico. Pedido em 27 de julho de 2026 e **reescrito no mesmo dia**,
depois da crítica que invalidou a primeira versão:

> "por isso pedi para criar as personas, compreendeu, o cara de planejamento
> deve saber trabalhar com project, como se faz um planejamento, quais
> ferramentas ele usa, quais conhecimentos ele precisa ter? quais ferramentas
> ele precisa usar, isso que é matriz de competências!!! (…) no planejamento, o
> que é curva A, ABC, custo marginal, otimista, pessimista e normal, caminho
> crítico, linha de base, corrente crítica, DSM, Design Structure Matrix, o que
> mais um cara de planejamento precisa saber para o dia dele? assim que se
> constrói uma persona, suas competências, e rotina!!!!"

A crítica está certa e o erro era grande: a primeira versão descrevia **o que
cada persona clica**. Caminho de clique é consequência; competência é causa.
Persona escrita por cliques só sabe validar a tela que já existe — ela nunca
diz que está faltando um campo, porque não conhece a técnica que precisaria do
campo.

## Como se constrói uma persona aqui

Quatro camadas, nesta ordem. Camada de baixo não se inventa a partir da de
cima:

1. **Competência** — o corpo de conhecimento que a pessoa domina. É o que ela
   sabe mesmo sem sistema nenhum, com papel e planilha.
2. **Ferramenta** — o que ela já opera hoje no mercado, e da qual traz hábito e
   expectativa de layout. Contrariar esse hábito sem motivo custa adoção.
3. **Técnica** — o procedimento concreto que ela executa. Cada técnica **declara
   o dado que precisa existir** para ser executável. É aqui que a persona vira
   requisito de banco, e não opinião de tela.
4. **Rotina** — quando, no dia, cada técnica acontece.

A regra que sai disso e que substitui a regra antiga:

> **Toda tela declara qual persona entra, vinda de onde, para executar qual
> técnica, e qual dado essa técnica exige.** Tela que não nomeia a técnica está
> sendo desenhada por dedução.

A regra dos quatro cliques continua valendo, mas agora como consequência —
mede-se atrito depois de saber qual é a tarefa, nunca antes.

## Quadro-resumo

| Persona | Competência central | Ferramenta de referência no mercado | Pergunta do dia |
|---|---|---|---|
| P1 Vendedor / SDR | Qualificação e previsão de fechamento | Pipedrive, HubSpot, Bitrix24 | "quem eu toco hoje e o que entra no mês?" |
| P2 **Planejador** | Rede de precedências, prazo e custo do prazo | MS Project, Primavera P6, planilha | "o que empurra a entrega, e quanto custa trazer de volta?" |
| P3 Montador / produção | Execução, produtividade e evidência | Aplicativo de campo, papel | "onde eu vou hoje, o que levo e quantos dias faltam?" |
| P4 Financeiro | Regime de competência, fluxo e medição | ERP contábil, planilha, extrato | "o que entra e o que sai esta semana?" |
| P5 Assistência | Diagnóstico e tempo de resposta | Service desk, funil | "o que está parado esperando quem?" |
| P6 Administrador | Modelo de acesso e segregação de função | Console de administração | "quem pode o quê, e por quê?" |
| P7 Projetista | Detalhamento executivo e compatibilização | Promob, SketchUp, AutoCAD | "esse projeto fabrica sem retrabalho?" |

---

# P2 — Planejador

É a persona mais exigente da plataforma e a que a versão anterior deste
documento mais deformou. Vai primeiro, e vai inteira.

**O que ele responde:** a data de entrega e o que ela custa. Não é quem executa
nem quem decide — é quem **mostra a consequência** de cada decisão de prazo
antes que ela vire fato consumado.

## P2.1 — Competências

| # | Competência | O que significa dominar |
|---|---|---|
| C1 | **EAP / WBS** | Quebrar a obra em entregáveis até o nível em que cada pacote tem um responsável, uma duração e um custo. Pacote que não tem os três ainda não foi quebrado. |
| C2 | **Rede de precedências** | Enxergar a obra como grafo, não como lista. Saber quando a relação é TI, II, TT ou IT, e quando uma folga negativa (antecipação) é legítima. |
| C3 | **Estimativa de duração** | Separar duração de esforço. Saber que 40 homens-hora com 2 pessoas não são 20 dias. Estimar por índice de produtividade, não por sensação. |
| C4 | **Caminho crítico e folga** | Ler folga total e folga livre. Saber que a tarefa crítica não é a mais importante — é a que não tem para onde correr. |
| C5 | **Incerteza** | Três pontos, desvio padrão, e a regra que quase todo mundo erra: **variância soma, desvio padrão não**. |
| C6 | **Linha de base e replanejamento** | Congelar, comparar e explicar. Replanejar sem linha de base é apagar a prova do desvio. |
| C7 | **Curva S e avanço físico** | Ponderar por peso, nunca por contagem de tarefas. |
| C8 | **Custo do prazo** | Custo marginal de acelerar, e onde acelerar dá retorno (só no caminho crítico). |
| C9 | **Calendário e regime** | Dia útil, feriado, jornada, e o efeito de um feriado no meio de uma cadeia TI. |
| C10 | **Restrição de recurso** | Nivelamento e a diferença entre atraso por precedência e atraso por gente faltando. |
| C11 | **Curva ABC / Pareto** | Onde está o dinheiro, para saber onde vale gastar atenção. |
| C12 | **DSM e iteração** | Reconhecer realimentação — o retrabalho previsível que a rede clássica esconde. |
| C13 | **Leitura de campo** | Traduzir diário e apontamento em avanço confiável, e desconfiar de progresso que só sobe. |

## P2.2 — Ferramentas que ele opera hoje

| Ferramenta | O que ele traz de lá |
|---|---|
| **MS Project** | O vocabulário inteiro: predecessora digitada por número de linha, duração com sufixo (`5d`, `2s`), tipo de vínculo com folga (`4TI+2d`), linha de base, agenda de trabalho, nivelamento. |
| **Primavera P6** | Obra grande: agrupamento por EAP com bandas, códigos de atividade, painel inferior por abas para a atividade selecionada. |
| **Planilha** | A verdade incômoda: quando a ferramenta atrapalha, ele exporta. Toda planilha paralela que sobrevive é um recurso que faltou aqui. |

### O layout que essas ferramentas têm em comum

Observado nas três e no que o mercado replica. **É o layout que copiamos
primeiro**, antes de qualquer identidade própria — o hábito do planejador vale
mais que a nossa preferência:

1. **Divisão vertical em dois painéis com divisor arrastável.** Grade à
   esquerda, tempo à direita. Nunca uma tela só de barras: a grade é onde se
   edita.
2. **A grade é planilha, e é editável na célula.** Colunas canônicas: código,
   nome, duração, início, término, **predecessoras**, responsável, % concluída.
   Digitar `12TI+3d` na coluna de predecessora é o gesto mais rápido que existe
   para criar vínculo, e nenhum modal ganha dele.
3. **Escala de tempo em dois níveis** — mês sobre semana, semana sobre dia — com
   zoom. Não-dia útil hachurado, feriado marcado com nome.
4. **Hierarquia com recuo e sanfona**, barra de resumo diferente da barra de
   tarefa.
5. **Linha de hoje** atravessando o quadro inteiro.
6. **Linha de base desenhada abaixo da barra atual**, mais fina — é a comparação
   que se lê sem clicar.
7. **Painel inferior de detalhe** da linha selecionada, por abas.
8. **Cabeçalhos fixos**: escala não rola na vertical, nomes não rolam na
   horizontal.

Estado na Innovar: **1, 3, 4 (parcial), 5 e 8 já existem** em
`components/planejamento/gantt.tsx`. Faltam **2 (grade editável), 6 (linha de
base desenhada) e 7 (painel de detalhe)** — e a falta do item 2 é a mais cara,
porque é o gesto que ele repete cem vezes por dia.

## P2.3 — Catálogo de técnicas

Cada uma com a conta **executada**, não descrita, e com o dado que ela exige.

### T1 — Estimativa de três pontos (PERT)

Otimista, mais provável, pessimista. A duração esperada não é a mais provável:

```
TE = (O + 4M + P) / 6          σ = (P − O) / 6

O=15  M=20  P=35
TE = (15 + 80 + 35)/6 = 21,67 dias
σ  = (35 − 15)/6      =  3,33 dias
faixa de 95% (TE ± 2σ): 15,0 a 28,3 dias
```

A estimativa "20 dias" vira 21,7. **O pessimista puxa 1,7 dia** porque a
distribuição é assimétrica — dá para atrasar muito mais do que para adiantar.

E a regra que separa quem sabe de quem decorou — **a variância soma, o desvio
não**:

```
caminho com três tarefas
TE do caminho: 38,17 dias
σ do caminho = √(Σ variâncias) = 3,82 dias
σ somado ingenuamente          = 5,83 dias   → erro de 2,01 dias
```

Quem soma desvio padrão superestima o risco em dois dias e negocia prazo com um
número errado.

> **Exige:** três campos de duração por tarefa. Hoje `project_tasks` tem
> `duration_days`, um só. **Falta migration** —
> `duration_optimistic`, `duration_likely`, `duration_pessimistic`, com
> `duration_days` derivada.

### T2 — Caminho crítico de verdade: passada para trás e folga total

Rede: A(5) → B(8) → D(4), e A → C(3) → D.

```
tarefa  dur   CI   CT   TI   TT  folga
     A    5    0    5    0    5      0   CRÍTICA
     B    8    5   13    5   13      0   CRÍTICA
     C    3    5    8   10   13      5
     D    4   13   17   13   17      0   CRÍTICA
duração do projeto: 17 dias
```

C tem **5 dias de folga**: pode atrasar cinco dias sem mover a entrega. Esse é o
número que decide onde o planejador **não** precisa correr — e é o que a
implementação atual não sabe dizer.

`cadeiaMaisLonga()` em `lib/planejamento/cronograma.ts` acerta A-B-D neste
exemplo, mas só faz a passada para frente: ela devolve a cadeia que empurra o
término e **não calcula folga**. O comentário na função já declara isso; aqui
fica registrado o que falta para o nome "caminho crítico" ser honesto.

> **Exige:** passada para trás sobre a rede que já existe. **Sem migration** —
> é função pura, e as dependências já estão em `task_dependencies` com os quatro
> tipos e `lag_days`.

### T3 — Custo marginal e aceleração (crashing)

Acelerar tem preço. O gradiente é o preço de cada dia comprado:

```
gradiente = (custo acelerado − custo normal) / (duração normal − duração acelerada)

tarefa  dn  da   R$ normal    R$ acel   R$/dia ganho
     A   5   3      10.000     16.000          3.000
     B   8   6      24.000     34.000          5.000
     D   4   3      12.000     13.500          1.500
```

Comprime-se pelo **mais barato do caminho crítico**: D, a R$ 1.500/dia. E
acelerar C seria dinheiro jogado fora — ela tem cinco dias de folga e não empurra
a entrega. Essa é a frase que o planejador usa para dizer não a uma hora extra
pedida no lugar errado.

Cada compressão pode trocar o caminho crítico de lugar: comprimiu, recalcula.

> **Exige:** duração e custo acelerados por tarefa.
> `project_resources.daily_cost` e `hourly_cost` já existem, e
> `task_resource_allocations` já liga recurso a tarefa. **Falta** o par
> acelerado (`crash_duration_days`, `crash_cost`) — migration pequena.

### T4 — Corrente crítica (CCPM) e pulmão

Premissa: cada tarefa já vem com segurança embutida, e a segurança individual é
sempre gasta (síndrome do estudante, lei de Parkinson). Corta-se a segurança de
cada uma e agrega-se num pulmão no fim.

```
prazo com segurança em cada tarefa      : 17,0 dias
prazo agressivo (50% cortado)           :  8,5 dias
segurança retirada (soma)               :  8,5 dias
pulmão pela metade da soma              :  4,2 dias  → entrega 12,8
pulmão por √(Σ dos quadrados)           :  5,12 dias → entrega 13,62
```

O pulmão agregado entrega **3,38 dias antes** da soma das seguranças
individuais, com a mesma proteção — porque nem todas as tarefas atrasam juntas.
E o pulmão consumido vira semáforo: verde até um terço, amarelo até dois terços,
vermelho depois. **É o único indicador de prazo que não mente**, porque não
depende de ninguém julgar se "está no prazo".

> **Exige:** pulmão como objeto de cronograma (projeto e alimentação), e consumo
> medido contra avanço da corrente. Nada disso existe hoje. É sprint própria, e
> **só faz sentido depois de T2** — sem folga calculada não há corrente.

### T5 — Linha de base

Congelar o plano aprovado. Sem ela, replanejar apaga a prova do desvio, e a
reunião de prazo vira memória contra memória.

> **Exige:** já existe. `schedule_baselines` (com status `DRAFT`/`FROZEN`/
> `SUPERSEDED`) e `schedule_baseline_tasks` (com `planned_start`, `planned_end`,
> `duration_days`, `weight`) estão no banco desde a etapa 12, e
> `curvaDeAvanco()` em `lib/planejamento/curvas.ts` **já aceita** a linha de base
> como terceiro argumento. **Falta só** congelar pela tela e desenhar a barra
> fina abaixo da atual. Sem migration.

### T6 — Curva S: planejado, previsto, realizado

As três respondem perguntas diferentes — o que **deveria**, o que **estará**, o
que **está**. Ponderação por dia útil de cada tarefa, nunca por contagem: tarefa
de vinte dias pesa vinte vezes mais que a de um.

> **Exige:** feito hoje, `lib/planejamento/curvas.ts`, com a limitação declarada
> no arquivo — a plataforma guarda o progresso de hoje, não a série diária dele,
> e a curva do passado é reconstruída. O apontamento datado da S-25 substitui a
> reconstrução.

### T7 — Curva ABC

Pareto sobre o orçamento, para saber onde a atenção rende:

```
  A  Estrutura      R$   480.000   43,6%   acum  43,6%
  A  Alvenaria      R$   210.000   19,1%   acum  62,7%
  A  Instalações    R$   165.000   15,0%   acum  77,7%
  B  Esquadrias     R$    92.000    8,4%   acum  86,1%
  B  Revestimento   R$    78.000    7,1%   acum  93,2%
  C  Pintura        R$    41.000    3,7%   acum  96,9%
  C  Louças         R$    23.000    2,1%   acum  99,0%
  C  Ferragens      R$    11.000    1,0%   acum 100,0%
total R$ 1.100.000
```

**3 itens de 8 (38%) concentram 80% do custo.** "Curva A" é essa faixa: os itens
que merecem cotação com três fornecedores, controle de perda e conferência de
medição. Ferragem a 1% do orçamento não merece a mesma reunião — e tratar tudo
igual é como se perde tempo em obra.

> **Exige:** já é calculável. `budget_items` tem `quantity` e `unit_cost`, e
> `loss_rate`/`freight_rate` para o custo cheio. **Falta a visualização** — sem
> migration.

### T8 — DSM (Design Structure Matrix)

Matriz N×N: marca na linha *i*, coluna *j* significa "*i* depende de *j*".

```
      1  2  3  4  5  6
 1 Medição        .  .  .  .  .  .
 2 Projeto exec   X  .  X  .  .  .
 3 Aprovação cli  .  X  .  .  .  .
 4 Compra chapa   .  X  .  .  .  .
 5 Fabricação     .  X  .  X  .  .
 6 Montagem       X  .  .  .  X  .
```

Abaixo da diagonal é fluxo normal. **Acima da diagonal é realimentação**: aqui,
projeto executivo depende da aprovação do cliente, que depende do projeto
executivo. Isso é um laço de revisão — retrabalho **previsível**, não acidente.

É o que o Gantt não mostra e o que explica a obra que "sempre atrasa na
aprovação". Com a matriz na mão, decide-se: aceitar a iteração e orçar duas
rodadas, ou quebrar o laço aprovando por partes.

> **Exige:** nada novo. `task_dependencies` **já é** a matriz — ler em N×N e
> ordenar por sequenciamento é visualização pura. Barato e de alto retorno.

### T9 — Calendário, regime e feriado

"20 dias úteis, equipe de segunda a sexta, um feriado no meio": 20 úteis + 8 de
fim de semana + 1 feriado = **29 dias corridos**. E se a sucessora é TI, ela
anda um dia no calendário por causa do feriado.

> **Exige:** feito hoje. `lib/planejamento/calendario.ts` — quatro regimes, os 13
> feriados nacionais (9 fixos + 4 móveis calculados pela Páscoa, algoritmo de
> Meeus/Jones/Butcher), e toda a aritmética do cronograma convertida para dia
> útil. **Falta** o calendário por equipe gravado no banco e feriado
> municipal/estadual por organização.

### T10 — Nivelamento de recurso

Duas tarefas paralelas pedindo o mesmo montador não são paralelas. Sem
nivelamento, o cronograma promete uma simultaneidade que a equipe não tem.

> **Exige:** `project_resources` e `task_resource_allocations` já existem com
> quantidade e horas, planejadas e reais. **Falta** o histograma de uso e o
> deslocamento automático por sobrecarga. Depende de T2 — nivela-se consumindo
> folga primeiro.

### T11 — Referência de preço com data-base (SindusCon)

Insumo tem preço com **data-base e praça**. Orçamento que não guarda as duas não
pode ser reajustado nem defendido.

> **Exige:** o banco **já guarda**: `budget_items.source`, `region` e `base_date`
> estão lá desde a etapa 9. O que falta é a **importação** da tabela e o
> reajuste por índice — é trabalho de integração, não de esquema.

## P2.4 — Rotina

| Momento | Técnica | Onde |
|---|---|---|
| Início do dia | Ler avanço apontado ontem; desconfiar de progresso que só sobe | Diário de campo, apontamento |
| Manhã | Recalcular rede; ver o que mudou de caminho crítico | Gantt |
| Manhã | Comparar com a linha de base; medir o desvio em pontos, não em impressão | Curva S |
| Quando pedem antecipação | Custo marginal: quanto custa o dia, e em qual tarefa | Cronograma + custo |
| Quando falta material | Separar atraso por parada de atraso por rendimento | `TEP` e parada medida |
| Semanal | Publicar avanço, replanejar com linha de base preservada | Cronograma + relatório |
| Mensal | Revisar ABC, checar reajuste por data-base | Orçamento |

## P2.5 — O que este perfil obriga na plataforma

Em ordem de retorno pelo esforço:

1. **Grade editável ao lado do Gantt**, com predecessora digitável (`12TI+3d`).
   É o gesto mais repetido do dia — sem migration.
2. **T2, folga total** — sem ela o produto usa a palavra "caminho crítico" sem
   entregar o que ela promete. Sem migration.
3. **T5, congelar linha de base pela tela** e desenhar a barra fina. O banco já
   está pronto.
4. **T8, matriz DSM** — leitura nova de dado que já existe.
5. **T7, curva ABC** no orçamento — dado que já existe.
6. **T1, três pontos** — migration pequena, muda a conversa de prazo.
7. **T3, aceleração** — migration pequena, depois de T2.
8. **T10, nivelamento** e **T4, corrente crítica** — sprints próprias, ambas
   dependem de T2.

---

# P1 — Vendedor / SDR

**Palavra do responsável:** "CRM pode ser um pipeline para SDR, um para pré
venda e outro para venda, depois que esse cliente é ganho ele vai para o pós
venda."

**Competências.** Qualificação por critério explícito (orçamento, autoridade,
necessidade, prazo — e no nosso caso também *medida tirada?*); leitura de funil
como taxa entre etapas, não como total; previsão ponderada por etapa;
negociação de escopo sem mover preço; disciplina de próximo passo — cartão sem
data de próxima ação é cartão perdido.

**Ferramentas de mercado.** Pipedrive (funil como objeto central, atividade
obrigatória), HubSpot (sequência e lembrete), Bitrix24 (funil e comunicação no
mesmo lugar), WhatsApp — que no Brasil **é** o canal, não um canal.

**Técnicas.** Taxa de conversão por etapa com denominador declarado (a mesma
venda dá 9,0% ou 20,0% conforme o denominador — razão de 2,22× entre as duas
leituras, e discutir meta sem fixar o denominador é discutir nada); tempo médio
de permanência por etapa, que é onde o funil realmente trava; motivo de perda
categorizado, sem o qual não se corrige nada; valor ponderado por probabilidade
de etapa.

> **Exige:** `pipeline_card_stage_history` **já grava toda transição** — é a
> fonte de quase todo KPI de conversão e tempo de ciclo sem tabela nova. Falta
> motivo de perda como campo estruturado e a probabilidade por etapa.

**Rotina.** Abre o funil cedo, ataca vencido e vencendo hoje, liga, registra,
agenda o próximo toque, arrasta. Ao ganhar, o cliente nasce no pós-venda sem
redigitar nada.

---

# P3 — Montador / produção

**Palavra do responsável:** "um cara da produção só precisa ter acesso ao módulo
de diário de campo, contatos, tarefas, planejamento, contato, etc."

**É a persona que define o desenho móvel** — mas não pelo motivo que a primeira
versão supôs. Corrigido pelo responsável:

> "ele não é para trabalhar com o celular na mão, mas durante o trabalho dele,
> em caso de necessidade ou 15 minutos antes de parar, ele precisa preencher as
> informações do aplicativo"

**O aplicativo não acompanha o trabalho: ele interrompe o trabalho.** São
sessões curtas, em três momentos definidos, e em cada uma o profissional parou
o que estava fazendo para pegar o telefone. A consequência de projeto não é
"funcionar com uma mão" — é **terminar de primeira**, porque o custo de errar é
voltar a parar.

**Competências.** Leitura de projeto executivo e de lista de corte; prumo,
nível e esquadro; ferramenta elétrica e fixação por tipo de substrato
(alvenaria, drywall, laje); sequência de montagem — o que entra antes para não
ter que sair depois; acabamento e regulagem; **estimativa honesta de dias
restantes**, que é a competência mais valiosa e a mais rara; segurança e uso de
EPI; conduta na casa do cliente, que vira nota de 0 a 5.

**Ferramentas.** As de trabalho, e o telefone em três momentos. Nada mais.

### Os três momentos, e só eles

| Quando | O que faz | Regra |
|---|---|---|
| Início do turno | Check-in ao chegar na obra | Marcação de jornada — definitiva, confirmada antes de gravar |
| **Em caso de necessidade** | Falta material → **para a atividade** e solicita | A parada é obrigatória e registrada junto com a solicitação |
| **15 minutos antes de parar** | Diário do dia, dias que faltam, check-out | Janela conhecida: o sistema avisa, não espera ser lembrado |

### Falta de material é parada, não observação

Quando falta insumo, o montador **não continua trabalhando**. A solicitação
**abre uma parada**, com início; a parada fecha quando o material chega. Três
consequências:

1. o tempo parado é medido, não estimado depois de memória;
2. entra no `TEP` como causa declarada, separando "rendeu menos" de "ficou
   esperando";
3. alimenta o KPI **parada de obra por falta de material**, que liga o
   almoxarifado ao custo real de faltar — hoje compras é avaliada por preço e
   prazo próprio, e o custo de parar não aparece em lugar nenhum.

Sem a parada explícita, o atraso aparece como baixa produtividade de quem estava
de braços cruzados por decisão de outro setor.

### A janela dos 15 minutos é do sistema, não da memória

Quem lembra é o aplicativo: notificação na janela, com o que falta preencher já
listado. Esperar o profissional lembrar produz diário em branco e `DEPT`
desatualizado — que é justamente o dado que sustenta todo o resto.

---

# P4 — Financeiro

**Palavra do responsável:** "o financeiro tem que ter acesso ao financeiro,
contato, tarefas, orçamentos, etc."

**Competências.** Competência × caixa — saber que medido, faturado e recebido
são três datas diferentes e que confundi-las é a origem de metade dos sustos;
conciliação bancária; medição contratual e retenção; DRE por obra, não só da
empresa; inadimplência por idade de título; tributo sobre a nota do serviço.

**Ferramentas.** ERP contábil, extrato bancário, planilha de fluxo, boleto e
PIX.

**Técnicas.** Fluxo de caixa projetado por data de vencimento, não por
competência; *aging* de recebíveis em faixas; margem por obra comparando
orçado × comprado × medido; ponto de equilíbrio mensal.

> **Exige:** lançamentos, fluxo, medições e contratos já existem. Falta
> **calendário como visualização** — pela régua da §12.3 do padrão de interface,
> o financeiro é o candidato mais forte, porque todo registro dele tem data
> própria.

---

# P5 — Assistência técnica

**Palavra do responsável:** "Assistência técnica tem o pipeline próprio."

**Competências.** Diagnóstico por sintoma; separar defeito de fabricação, de
montagem e de uso — é o que decide quem paga; noção de garantia e prazo legal;
comunicação com cliente irritado, que é competência técnica e não traço de
personalidade.

**Técnicas.** Tempo de primeira resposta e tempo de solução, medidos separado;
taxa de resolução na primeira visita; reincidência por causa raiz — o número que
transforma assistência em melhoria de processo em vez de bombeiro permanente;
classificação por responsabilidade, que fecha o ciclo com produção.

**Rotina.** Abre o funil, vê o que está em "aguardando" — o preset já separa
aguardando disponível de indisponível, porque a diferença é quem está travando.
Agenda vistoria, executa, encerra, classifica a causa.

---

# P6 — Administrador

**Palavra do responsável:** "fica mais fácil criar novos perfis, autorizações e
permissões" e, na revisão, "nem vi a sessão para cadastrar usuários ainda".

**Competências.** Modelo de acesso por papel; segregação de função — quem lança
não aprova; princípio do menor privilégio; leitura de trilha de auditoria;
ciclo de vida de acesso, e principalmente o **desligamento**, que é onde todo
sistema falha.

**Técnicas.** Revisão periódica de acesso; **pré-visualizar o que outra pessoa
enxerga sem trocar de sessão** — é o que responde "por que ele não vê esse
módulo?" sem abrir o banco.

> **Exige:** usuários, perfis e aplicativos por organização já existem, com RLS
> no banco e não só na tela. Falta o caminho até a tela (menu criado na T-23.21,
> tela a conferir na T-24.10) e a pré-visualização de acesso.

---

# P7 — Projetista / detalhamento executivo

Separado de P2 nesta revisão. Projetista desenha o produto; planejador planeja a
obra. Juntar os dois foi o que fez a versão anterior descrever um "engenheiro"
que não existe em nenhuma das duas cadeiras.

**Competências.** Medição em obra e tolerância de fábrica; sistemas
construtivos de móvel — ferragem, corrediça, dobradiça, sistema de abertura;
lista de corte e plano de chapa, com aproveitamento como métrica; compatibilização
com hidráulica, elétrica e gás, que é onde nasce o retrabalho caro;
detalhamento suficiente para a fábrica não perguntar nada.

**Ferramentas.** Promob, SketchUp, AutoCAD, e o otimizador de corte.

**Técnicas.** Conferência de medida contra o executivo antes de liberar
fabricação; aproveitamento de chapa em percentual; controle de revisão do
desenho — revisão sem versão é a origem do móvel fabricado pelo desenho errado.

> **Exige:** `project_documents` já tem status
> `DRAFT`/`REVIEW`/`APPROVED`/`RELEASED`/`ARCHIVED`. Falta amarrar liberação de
> fabricação à revisão aprovada, para que o desenho errado **não possa** virar
> ordem de produção.

---

# Matriz de competências — a leitura que o responsável pediu

Duas coisas com o mesmo nome, e as duas valem:

**A matriz de conhecimento** (este documento): por persona, quais competências
existem e em que nível a pessoa está. Quatro níveis, e o nível se afirma com
evidência, não com autoavaliação:

| Nível | Significa | Evidência aceita |
|---|---|---|
| 1 Conhece | Sabe o que é e para que serve | — |
| 2 Executa com apoio | Faz seguindo procedimento, revisado por outro | Trabalho revisado |
| 3 Executa sozinho | Responde pelo resultado | Histórico de 6 meses |
| 4 Ensina e decide método | Define como a equipe faz | Padrão adotado por outros |

**A matriz de desempenho** (`SERVICO-DE-CAMPO.md` e `KPIS.md`): rendimento
medido por tipo de tarefa, com **média e desvio padrão de 6 meses**. As duas se
encontram numa regra só:

> Competência declarada que não aparece no desempenho medido é competência
> presumida. Desempenho medido sem competência declarada é sorte.

E o cuidado já registrado em `KPIS.md`: a janela é móvel, 6 meses anteriores
mais 6 atuais. **Sem janela móvel, a matriz vira condenação permanente** — quem
teve um trimestre ruim há dois anos carregaria isso para sempre, e ninguém
melhora num sistema que não esquece.

A ordenação para escolha de equipe é por **média − desvio**, não por média: a
equipe que faz em 6 dias com desvio 0,4 é melhor que a que faz em 6 com desvio
1,9, porque o pior caso da segunda é 7,9 dias e é o pior caso que quebra
cronograma.

---

# O que este documento obriga

1. Tela nova declara **a persona, a técnica que ela executa e o dado que a
   técnica exige** — nessa ordem. Contagem de cliques mede atrito depois, nunca
   define o desenho.
2. Técnica nova entra no catálogo com a conta **executada**, não descrita, e
   dizendo se exige migration ou não. Número afirmado sem execução é chute.
3. Persona sem competência escrita não vira permissão nem menu.
4. Antes de inventar layout, **copiar o layout que a ferramenta de referência
   daquela persona já usa**. Identidade própria vem depois da adoção, não antes.
5. A persona P3 tem veto sobre desenho móvel, com o critério corrigido: **se não
   termina de primeira, não está pronto.** O montador parou de trabalhar para
   usar o aplicativo — fluxo que exige segunda tentativa custa uma segunda
   parada, e é assim que se ensina alguém a preencher no fim de semana, de
   cabeça.
6. Quando uma rotina mudar na prática, o documento muda **antes** do código.
