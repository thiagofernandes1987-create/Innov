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

Referências profissionais conferidas na revisão de 28 de julho:

- PMI, *Practice Standard for Scheduling*: modelo de cronograma, CPM, corrente
  crítica, PERT e manutenção do cronograma;
- AACE, *Total Cost Management Framework*: estimativa, planejamento,
  programação, controle de custo e medição de desempenho como sistema único;
- ISO 21502:2020: práticas de gestão de projetos independentes do ciclo de vida;
- ISO 9001:2015 e transição 2026: processo, risco, evidência, competência,
  avaliação de desempenho e melhoria contínua;
- IIA, *Global Internal Audit Standards* 2024, vigentes desde 2025: competência,
  independência, planejamento, evidência, comunicação e monitoramento de ações.

O catálogo executável correspondente está em `lib/personas/catalog.ts`. Ele é
cruzado automaticamente com os 22 aplicativos; um módulo sem profissional,
competência ou cenário reprova `pnpm test`.

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
| P8 Gerente de obras | Integração de escopo, prazo, custo e restrições | Project/ERP, lookahead, reunião de produção | "qual exceção exige decisão hoje?" |
| P9 Comprador | Sourcing, equalização e expediting | Portal de compras, mapa comparativo | "o material certo chega antes da necessidade?" |
| P10 Almoxarife | Saldo, endereço e rastreabilidade | WMS, coletor e inventário cíclico | "o sistema diz que tem; eu encontro onde?" |
| P11 Orçamentista | Quantificação, composição e risco de custo | Software de orçamento, CAD/BIM, planilha | "esse preço paga o escopo e o risco?" |
| P12 Qualidade | Prevenção, inspeção e causa raiz | QMS, FVS/FVM, plano de inspeção | "o requisito foi atendido e a causa fechou?" |
| P13 Diretoria | Portfólio, caixa, margem e governança | BI executivo e controladoria | "onde capital e capacidade geram mais retorno?" |
| P14 Contratos e documentos | Obrigação, versão, vigência e evidência | GED, CLM e assinatura eletrônica | "qual versão autoriza o quê e até quando?" |
| P15 Cliente | Decisão, acompanhamento e aceite | Portal do cliente | "o que depende de mim e qual é a previsão confiável?" |
| P16 Auditoria e compliance | Desenho e eficácia de controles | GRC, trilha e programa de auditoria | "o controle funcionou e a ação resolveu a causa?" |

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

**Quando quebra:** [`FLUXOS-E-RISCOS.md`](FLUXOS-E-RISCOS.md) §P2 — apontamento
que não chega ou chega falso, caminho crítico que mudou de lugar sem ninguém
ver, pedido de antecipação, recurso que não existe na data, e o replanejamento
que apaga a prova do desvio.

---

# P1 — Vendedor / SDR

**Palavra do responsável:** "CRM pode ser um pipeline para SDR, um para pré
venda e outro para venda, depois que esse cliente é ganho ele vai para o pós
venda."

## P1.1 — Competências

| # | Competência | O que significa dominar |
|---|---|---|
| C1 | **Qualificação por critério** | Ter uma régua escrita e usá-la. No móvel planejado a régua tem um item que nenhum manual de CRM traz: **o imóvel está em condição de medir?** É a pergunta que evita o R1.4, que é a origem de 12% de retrabalho na montagem |
| C2 | **Leitura de funil** | Enxergar taxa entre etapas, nunca total. E saber que o denominador muda a resposta: calculado, a mesma venda dá 9,0% ou 20,0% — razão de 2,22× |
| C3 | **Diagnóstico de necessidade** | Traduzir "quero uma cozinha bonita" em escopo, prazo e faixa de investimento, antes de gastar projeto |
| C4 | **Leitura de projeto e viabilidade** | Saber o que cabe, o que a fábrica faz e o que não faz. Vender o que não se fabrica é o defeito mais caro do comercial |
| C5 | **Formação de preço** | Entender BDI, margem e o efeito de desconto sobre a margem, não sobre o preço. 10% de desconto com margem de 25% corta **40% do lucro** |
| C6 | **Negociação de escopo** | Baixar escopo antes de baixar preço. É a competência que separa vendedor de tirador de pedido |
| C7 | **Prazo realista** | Saber a carga de fábrica antes de prometer data. Prazo prometido no impulso vira assistência técnica |
| C8 | **Disciplina de próximo passo** | Todo cartão com data de próxima ação. Cartão sem ela é perda silenciosa |
| C9 | **Contrato e aditivo** | Saber o que está contratado, e que mudança depois da liberação para fabricação **é aditivo**, não gentileza |
| C10 | **Previsão** | Valor ponderado por probabilidade de etapa, com histórico próprio, não com otimismo |

## P1.2 — Ferramentas de mercado

Pipedrive — funil como objeto central e atividade obrigatória em todo negócio;
HubSpot — sequência, lembrete e histórico de e-mail; Bitrix24 — funil e
comunicação no mesmo lugar; **WhatsApp**, que no Brasil não é *um* canal, é *o*
canal, e por isso precisa estar registrado no cartão e não no telefone pessoal
de quem vendeu.

## P1.3 — Técnicas

**Conversão por etapa com denominador declarado.** A mesma operação lida de duas
formas dá 9,0% ou 20,0%; discutir meta sem fixar o denominador é discutir nada.
> **Exige:** `pipeline_card_stage_history` **já grava toda transição** — é a
> fonte de quase todo indicador de conversão e tempo de ciclo, sem tabela nova.

**Tempo de permanência por etapa.** Onde o funil realmente trava. Uma etapa com
permanência crescente é gargalo antes de virar queda de faturamento.
> **Exige:** mesma tabela, agregada por etapa. Sem migration.

**Motivo de perda categorizado.** Sem lista fechada não se corrige nada, porque
texto livre não vira indicador.
> **Exige:** campo estruturado. **Falta** — é o único indicador do módulo hoje
> sem dado nenhum.

**Previsão ponderada.** Valor × probabilidade da etapa, com a probabilidade
saindo do histórico da própria operação.
> **Exige:** probabilidade por etapa em `pipeline_stages`. **Falta.**

**Pré-condição de medição conferida.** Contrapiso, revestimento definido, ponto
elétrico e hidráulico, esquadria instalada — e **medição condicional marcada
como tal**, com remedição agendada.
> **Exige:** lista de conferência no cartão e sinalizador de condicional.
> **Falta**, e é o requisito de maior retorno do módulo: previne a maior parte
> do R3.1, que custa 300× mais quando aparece na montagem.

## P1.4 — Rotina, com a competência exercida em cada momento

| Momento | O que faz | Competência |
|---|---|---|
| 08:00 | Atividades vencidas e vencendo hoje, antes de qualquer lead novo | C8 |
| 08:30 | Primeiro toque nos leads da noite — o relógio de primeira resposta corre desde a entrada | C1, C3 |
| Manhã | Qualifica: escopo, faixa, prazo e **condição de medir** | C1, C4, C7 |
| Ao agendar medição | Confere pré-condições com o cliente, por telefone, antes de mandar equipe | C1 |
| Ao propor | Monta escopo e preço; se pedirem desconto, baixa escopo primeiro | C5, C6 |
| Antes de prometer data | Consulta carga de fábrica | C7 |
| Ao ganhar | Confere o contratado e libera para o pós-venda sem redigitar | C9 |
| Sexta | Revisa previsão do mês e motivo de perda da semana | C2, C10 |

**Quando quebra:** [`FLUXOS-E-RISCOS.md`](FLUXOS-E-RISCOS.md) §P1 — lead que
esfria, prazo que a fábrica não cumpre, escopo mudado depois de aprovado, e a
medição feita antes de a obra estar pronta.

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
sessões curtas, em três momentos definidos, e em cada uma o profissional parou o
que estava fazendo para pegar o telefone. A consequência de projeto não é
"funcionar com uma mão" — é **terminar de primeira**, porque o custo de errar é
voltar a parar, e a parada custa R$ 104,00 por hora de equipe.

## P3.1 — Competências

| # | Competência | O que significa dominar |
|---|---|---|
| C1 | **Leitura de projeto executivo** | Ler vista, corte, detalhe e lista de corte; e conferir se a **revisão** que está na mão é a vigente. Montar pela revisão antiga é a lei de custo em ação |
| C2 | **Metrologia de obra** | Prumo, nível, esquadro e diagonal. Saber que parede fora de esquadro é regra, não exceção, e onde a tolerância absorve e onde não |
| C3 | **Sistemas construtivos de móvel** | Corrediça, dobradiça, pistão, perfil, sistema de abertura — e o que cada um exige de folga |
| C4 | **Fixação por substrato** | Alvenaria, bloco vazado, drywall, laje, gesso. Errar a bucha é o defeito que só aparece quando o armário cai, meses depois |
| C5 | **Sequência de montagem** | O que entra antes para não ter que sair depois. É o que distingue 4 dias de 7 no mesmo serviço |
| C6 | **Ferramenta e corte em obra** | Ajuste no local sem estragar acabamento; e saber quando **não** ajustar em obra |
| C7 | **Acabamento e regulagem** | Alinhamento de frentes, folga uniforme, silicone. É o que o cliente enxerga e por onde ele julga o resto |
| C8 | **Instalações** | Reconhecer ponto elétrico, hidráulico e de gás; furar sem atingir tubulação — e a regra de parar quando há dúvida |
| C9 | **Estimativa de dias restantes** | A competência mais valiosa e a mais rara: dizer honestamente quanto falta, inclusive quando a resposta é ruim |
| C10 | **Segurança** | EPI, trabalho em altura, energia. Não é formalidade: é o que não tem correção depois |
| C11 | **Conferência de romaneio** | Comparar o que chegou com o que deveria chegar, **antes** de começar. Meia hora aqui evita o dia inteiro perdido |
| C12 | **Conduta na casa do cliente** | Proteção de piso, limpeza, horário, linguagem. Vira nota de 0 a 5 e entra na matriz |
| C13 | **Registro de evidência** | Fotografar o que importa: antes, o problema, o depois. É o que sustenta o acompanhamento a distância |

## P3.2 — Ferramentas

As de trabalho — e o telefone em três momentos, nada mais. Toda ferramenta
digital que exija um quarto momento está competindo com a produção.

## P3.3 — Técnicas

**Check-in e check-out com localização.** Marcação de jornada, definitiva,
confirmada antes de gravar — é dado de folha de pagamento.

**Conferência de romaneio antes de iniciar.** Item a item, com foto de
referência. Calculado: detectar na expedição em vez de na montagem economiza
**4 dias por ocorrência**.

**Diário do dia com evidência.** Executado, quantidade, foto.

**Apontamento de dias restantes (`DEPT`).** Contra o previsto (`DPPT`), gerando
`TEP = DPPT − DEPT`. Negativo abre campo de motivo — obrigatório, em lista
fechada.

**Abertura de parada.** Dois toques, motivo fechado, e **de quem era a
obrigação**. Sem isso, espera vira baixa produtividade de quem estava parado por
decisão de outro setor.

**Solicitação de insumo, que abre parada junto.** Falta material é **parada
obrigatória**, não observação. Três consequências: o tempo parado é medido e não
estimado de memória; entra no `TEP` como causa declarada; e alimenta o indicador
de parada por falta de material, que liga o almoxarifado ao custo real de faltar
— hoje compras é avaliada por preço e prazo próprio, e o custo de parar não
aparece em lugar nenhum.

> **Exige, e boa parte já existe:** `daily_logs` com estado e aprovação,
> `daily_log_activities` com `progress_before`/`progress_after` por tarefa,
> `daily_log_media` com `storage_path`, `sha256`, `captured_at` e
> **`client_visible`** — a foto do campo já nasce com o controle de quem pode
> ver. **Faltam** parada como objeto, motivo em lista fechada, solicitação com
> destinatário e prazo, e o romaneio conferível.

## P3.4 — Rotina, com a competência exercida em cada momento

| Hora | O que faz | Competência |
|---|---|---|
| 07:20 | Chega, avalia acesso e condição do local | C10 |
| 07:30 | **Check-in** | — |
| 07:35 | Abre a tarefa, lê escopo e prazo, confere a **revisão** do desenho | C1, C9 |
| 07:40 | **Confere o romaneio** contra o que chegou | C11 |
| 07:50 | Confere medidas críticas antes de furar qualquer coisa | C2, C8 |
| 08:00 | Monta na sequência planejada | C3, C4, C5 |
| Ao dar problema | Para, registra com foto, abre solicitação nominal | C13, e §P3 dos riscos |
| Tarde | Regulagem e acabamento do que já subiu | C6, C7 |
| Durante o dia | Proteção, limpeza, conduta | C12 |
| **16:45** | **Janela dos 15 min**: diário, fotos, `DEPT` | C9, C13 |
| 17:00 | **Check-out** | — |

A janela dos 15 minutos é do sistema, não da memória: quem lembra é o
aplicativo, com o que falta preencher já listado. Esperar o profissional lembrar
produz diário em branco e `DEPT` desatualizado — que é justamente o dado que
sustenta todo o resto.

**Quando quebra:** [`FLUXOS-E-RISCOS.md`](FLUXOS-E-RISCOS.md) §P3 — os oito
imprevistos dissecados, com prazo de resposta e destinatário de cada solicitação.

---

# P4 — Financeiro

**Palavra do responsável:** "o financeiro tem que ter acesso ao financeiro,
contato, tarefas, orçamentos, etc."

## P4.1 — Competências

| # | Competência | O que significa dominar |
|---|---|---|
| C1 | **Competência × caixa** | Medido, faturado e recebido são três datas diferentes. Confundi-las é a origem de metade dos sustos de caixa |
| C2 | **Medição contratual** | O que pode ser medido, com que evidência, e o que é retenção |
| C3 | **Conciliação bancária** | Fechar extrato contra lançamento, e achar a diferença sem refazer o mês |
| C4 | **Fluxo projetado** | Projetar por vencimento, com curva de recebimento realista e não com a prometida |
| C5 | **Aging de recebível** | Faixas de idade, e a régua de cobrança que cada faixa dispara |
| C6 | **Custo por obra** | DRE por obra, não só da empresa. Empresa lucrativa com obra no prejuízo é o padrão que ninguém enxerga sem isso |
| C7 | **Orçado × comprado × medido** | Onde a margem vaza, item a item, priorizando a curva A |
| C8 | **Tributação do serviço** | ISS, retenção, regime, e o efeito no preço |
| C9 | **Alçada e segregação** | Quem lança não aprova. É controle, não burocracia |

## P4.2 — Ferramentas de mercado

ERP contábil, extrato e conciliação do banco, planilha de fluxo, emissor de nota
e boleto, PIX.

## P4.3 — Técnicas

**Fluxo por vencimento**, não por competência. **Aging em faixas** com régua de
cobrança. **Margem por obra** comparando orçado, comprado e medido, com foco nos
itens de curva A — calculado, **3 de 8 itens concentram 80% do custo**, e
acompanhar os oito com o mesmo esforço é como se perde a chance de ver o que
importa. **Ponto de equilíbrio mensal.**

> **Exige:** lançamentos, fluxo, medições e contratos já existem. **Falta**
> calendário como visualização — pela régua da §12.3 do padrão de interface, o
> financeiro é o candidato mais forte, porque todo registro dele tem data
> própria.

## P4.4 — Rotina

| Momento | O que faz | Competência |
|---|---|---|
| Diário | Concilia o dia anterior | C3 |
| Diário | Fila de **medido e não faturado**, com idade | C1, C2 |
| Semanal | Fluxo das próximas 4 semanas | C4 |
| Semanal | Aging e disparo da régua de cobrança | C5 |
| Antes de liberar equipe | Confere situação financeira do cliente | C5, C9 |
| Mensal | Margem por obra e desvio da curva A | C6, C7 |
| Mensal | Fechamento e apuração | C8 |

**Quando quebra:** [`FLUXOS-E-RISCOS.md`](FLUXOS-E-RISCOS.md) §P4 — medido e não
faturado, custo estourado descoberto tarde demais, e o cliente inadimplente
descoberto **depois** de a equipe sair, que custa os R$ 942,40 de um dia
queimado.

---

# P5 — Assistência técnica

**Palavra do responsável:** "Assistência técnica tem o pipeline próprio."

## P5.1 — Competências

| # | Competência | O que significa dominar |
|---|---|---|
| C1 | **Diagnóstico por sintoma** | "Porta desalinhou" pode ser dobradiça, esquadro do móvel, ou piso que assentou. Trocar peça sem diagnóstico é voltar |
| C2 | **Classificação de responsabilidade** | Defeito de fabricação, de montagem, de projeto ou de uso. Decide quem paga, e é o dado que fecha o ciclo com produção |
| C3 | **Garantia e prazo legal** | O que é coberto, por quanto tempo, e o que é cobrável |
| C4 | **Leitura do contratado** | Reclamação sobre o que nunca foi vendido é frequente, e responder isso exige ter o contrato e os aditivos à mão |
| C5 | **Comunicação sob pressão** | Competência técnica, não traço de personalidade: o cliente irritado tem razão sobre o incômodo mesmo quando não tem sobre o fato |
| C6 | **Análise de reincidência** | Ver o padrão entre chamados, que é o que transforma assistência em melhoria de processo em vez de bombeiro permanente |
| C7 | **Prazo real de reposição** | Saber que o ciclo é de **9 dias úteis**, e não prometer 3 |

## P5.2 — Ferramentas de mercado

Service desk com SLA, funil de chamado, base de conhecimento por sintoma.

## P5.3 — Técnicas

**Tempo de primeira resposta e tempo de solução, medidos separado** — o primeiro
é atendimento, o segundo é operação, e juntar os dois esconde qual dos dois está
ruim. **Resolução na primeira visita**, que é o indicador que mais pesa no custo.
**Reincidência por causa raiz.** **Chamados por obra entregue**, o número que
liga o pós-venda a quem executou.

> **Exige:** o funil de assistência com as nove etapas já existe, e a RPC
> `create_sac_ticket` já numera e aplica os prazos de primeira resposta e
> resolução — inserir direto criaria chamado sem SLA. **Faltam** a classificação
> de responsabilidade em lista fechada e o rastro até quem mediu, projetou,
> fabricou e montou.

## P5.4 — Rotina

| Momento | O que faz | Competência |
|---|---|---|
| 08:00 | Chamados sem primeira resposta, por idade | C5 |
| Manhã | Diagnostica por telefone antes de mandar alguém | C1 |
| Manhã | Separa o que é garantia do que é cobrável | C2, C3, C4 |
| Ao agendar | Confere se a peça existe, antes de prometer data | C7 |
| Ao encerrar | Classifica causa raiz — encerramento sem classificação não fecha | C2 |
| Semanal | Reincidência e devolutiva para produção e projetos | C6 |

**Quando quebra:** [`FLUXOS-E-RISCOS.md`](FLUXOS-E-RISCOS.md) §P5 — escopo nunca
contratado, impossibilidade de saber quem executou, e o ciclo de 9 dias contra o
prazo que foi prometido.

---

# P6 — Administrador

**Palavra do responsável:** "fica mais fácil criar novos perfis, autorizações e
permissões" e, na revisão, "nem vi a sessão para cadastrar usuários ainda".

## P6.1 — Competências

| # | Competência | O que significa dominar |
|---|---|---|
| C1 | **Acesso por papel** | Permissão pertence ao papel, não à pessoa. Permissão individual não sobrevive à segunda contratação |
| C2 | **Segregação de função** | Quem lança não aprova; quem compra não recebe |
| C3 | **Menor privilégio** | Começar fechado e abrir com motivo, não o contrário |
| C4 | **Ciclo de vida do acesso** | Entrada, mudança de função e **desligamento**. O terceiro é onde todo sistema falha |
| C5 | **Leitura de auditoria** | Reconstruir quem fez o quê a partir de `audit_events`, sem abrir o banco |
| C6 | **Diagnóstico de permissão** | Responder "por que ele não vê esse módulo?" em minutos |

## P6.2 — Técnicas

**Revisão periódica de acesso**, com data da última conferência visível.
**Pré-visualizar o que outra pessoa enxerga sem trocar de sessão** — é a técnica
que resolve o C6 sem ninguém pedir senha emprestada, que é como isso costuma
acabar. **Desligamento como evento que revoga**, não como tarefa que alguém
lembra.

> **Exige:** usuários, perfis e aplicativos por organização já existem, com RLS
> no banco e não só na tela, e `audit_events` já grava ator, recurso, ação e o
> antes e depois. **Faltam** a pré-visualização de acesso e o desligamento como
> evento.

## P6.3 — Rotina

| Momento | O que faz | Competência |
|---|---|---|
| Ao contratar | Cria pessoa, atribui papel, confere pela pré-visualização | C1, C3 |
| Ao mudar de função | Remove o antigo **antes** de dar o novo | C1, C4 |
| Ao desligar | Revoga no mesmo dia | C4 |
| Quando reclamam de acesso | Diagnostica pela pré-visualização | C6 |
| Trimestral | Revisão de acesso e leitura de auditoria | C2, C5 |

**Quando quebra:** [`FLUXOS-E-RISCOS.md`](FLUXOS-E-RISCOS.md) §P6.

---

# P7 — Projetista / detalhamento executivo

Separado de P2 nesta revisão. Projetista desenha o produto; planejador planeja a
obra. Juntar os dois fez a versão anterior descrever um "engenheiro" que não
existe em nenhuma das duas cadeiras.

## P7.1 — Competências

| # | Competência | O que significa dominar |
|---|---|---|
| C1 | **Medição e tolerância** | Medir com o desvio da obra em mente, e saber onde a folga de fabricação absorve o fora de esquadro |
| C2 | **Pré-condição de medição** | Reconhecer que a obra **não** está pronta para medir, e ter coragem de dizer isso — evita o erro de 300× |
| C3 | **Sistemas e ferragens** | Especificar o que existe, com código, e não o que seria bom existir |
| C4 | **Lista de corte e plano de chapa** | Aproveitamento como métrica, não como consequência |
| C5 | **Compatibilização** | Hidráulica, elétrica, gás, esquadria, ar. É onde nasce o retrabalho caro |
| C6 | **Detalhamento suficiente** | A fábrica não pode precisar telefonar. Pergunta da fábrica é falha de detalhamento |
| C7 | **Controle de revisão** | Revisão sem versão é a origem do móvel fabricado pelo desenho errado |
| C8 | **Apresentação ao cliente** | Render e explicação que evitam a mudança de ideia no dia da montagem |
| C9 | **Custo do que se desenha** | Saber que uma decisão de projeto move a curva A do orçamento |

## P7.2 — Ferramentas de mercado

Promob, SketchUp, AutoCAD, e o otimizador de plano de corte.

## P7.3 — Técnicas

**Conferência de medida antes de liberar fabricação** — calculado, é a trava
mais barata do sistema: meia hora que evita quarenta. **Aproveitamento de chapa
em percentual, com histórico** — medir já muda o comportamento. **Controle de
revisão com liberação amarrada à revisão aprovada**, de modo que desenho
superado não possa virar ordem de produção.

> **Exige:** `project_documents` já tem `DRAFT`/`REVIEW`/`APPROVED`/`RELEASED`/
> `ARCHIVED` e `project_document_versions` já versiona. **Falta** a amarração
> entre liberação de fabricação e revisão aprovada — hoje é disciplina, e
> disciplina falha a 100× de custo.

## P7.4 — Rotina

| Momento | O que faz | Competência |
|---|---|---|
| Antes de ir medir | Confere pré-condições com o comercial | C2 |
| Na medição | Mede, fotografa, registra o que ainda vai mudar na obra | C1, C5 |
| Executivo | Detalha até a fábrica não precisar perguntar | C3, C6 |
| Antes de liberar | Confere medida × projeto, e a revisão vigente | C1, C7 |
| Plano de corte | Mede aproveitamento e compara com o histórico | C4 |
| Ao apresentar | Explica o que muda e o que não muda depois de aprovado | C8 |
| Quando o campo aciona | Responde em até 4 h — a equipe está parada a R$ 104/hora | C1, C5 |

**Quando quebra:** [`FLUXOS-E-RISCOS.md`](FLUXOS-E-RISCOS.md) §P7 — fabricação
pela revisão errada, e o plano de corte que desperdiça sem ninguém medir.

---

# P8 a P16 — cobertura profissional dos demais aplicativos

As sete personas originais não cobriam profissionais que, no mundo real,
respondem por Obras, Compras, Estoque, Orçamentos, Qualidade, Contratos,
Diretoria e Auditoria. Usar “administrador” ou “financeiro” para representar
todos eles apagaria competência e segregação de função. A revisão acrescenta
nove cadeiras reais; nenhuma é um “usuário genérico”.

## P8 — Gerente de obras / gerente de projetos

**Profissional real:** gerente de projetos ou coordenador de obras. Integra
especialistas; não substitui planejador, comprador, financeiro nem qualidade.

| Competência | Técnicas | Dados que a técnica exige |
|---|---|---|
| Integração | plano integrado, governança, controle de mudanças | escopo, baseline, risco, decisão, mudança |
| Coordenação de frentes | lookahead, restrições, reunião de produção | tarefa liberada, impedimento, equipe, material |
| Desempenho | EVM, curva S, forecast | PV, EV, AC, previsão de prazo e custo final |
| Stakeholders | RACI, comunicação por recorte, escalonamento | responsável, informado, SLA, decisão |

**Rotina:** abre portfólio por exceção; trata restrições; decide prioridades;
aprova mudanças; encerra a semana com previsão única de prazo e custo.

**Quando quebra:** atraso crítico, falta de material e glosa financeira viram
um incidente integrado; notifica P2, P4, P9, P10 e P13, com uma ação nominal por
restrição.

## P9 — Comprador

**Profissional real:** comprador de materiais e serviços de construção. Não é o
almoxarife: o primeiro compromete fornecedor e condição; o segundo recebe,
guarda e movimenta.

| Competência | Técnicas | Dados que a técnica exige |
|---|---|---|
| Sourcing | RFI/RFQ, mapa e homologação | categoria, fornecedor, capacidade, documentos |
| Equalização | mapa comparativo, TCO, condição equivalente | preço, frete, prazo, tributo, garantia |
| Negociação | BATNA, alçada, trade-off | meta, limite, alternativa, condição |
| Expediting | follow-up, OTIF, gestão por exceção | pedido, promessa, confirmação, entrega, desvio |

**Rotina:** recebe solicitação vinculada à necessidade; coteja comparáveis;
obtém alçada; emite pedido; acompanha marcos; entrega o fato ao estoque e ao
financeiro.

**Quando quebra:** atraso ou divergência crítica notifica P2, P8, P10, P12 e P4;
o app compara alternativa pelo custo total da parada, não só pelo preço.

## P10 — Almoxarife / estoquista

**Profissional real:** almoxarife de obra ou estoquista. Responde pela
materialidade do saldo e pela rastreabilidade física.

| Competência | Técnicas | Dados que a técnica exige |
|---|---|---|
| Recebimento | conferência cega, pedido × nota × físico, quarentena | pedido, item, quantidade, lote, condição |
| Armazenagem | endereçamento, FIFO/FEFO, 5S | depósito, localização, lote, validade |
| Movimentação | entrada, saída, reserva, rastreabilidade | origem, destino, tarefa, responsável, quantidade |
| Acuracidade | inventário cíclico, recontagem, causa de divergência | saldo, contagem, diferença, causa |

**Rotina:** recebe; confere; endereça; reserva por tarefa; separa; entrega;
reconta classes de maior risco.

**Quando quebra:** saldo virtual ou lote danificado bloqueia consumo, abre
recontagem e informa P3, P8, P9, P4 e P12 com a tarefa afetada.

## P11 — Orçamentista / engenheiro de custos

**Profissional real:** orçamentista, analista de custos ou engenheiro de custos.
É diferente de P4: P11 estima e forma preço; P4 registra obrigação e caixa.

| Competência | Técnicas | Dados que a técnica exige |
|---|---|---|
| Quantificação | takeoff, memória de cálculo, EAP de custo | escopo, unidade, quantidade, fonte |
| Composição | insumo, produtividade, direto/indireto | coeficiente, preço, perda, encargo |
| Preço | BDI, markup, margem de contribuição | tributo, despesa, risco, lucro, preço |
| Risco | três pontos, sensibilidade, Curva ABC | O/M/P, classe ABC, contingência |

**Rotina:** lê escopo; quantifica; compõe; atualiza referência e data-base;
simula risco; revisa margem; emite versão com premissas e exclusões.

**Quando quebra:** omissão ou preço sem data-base congela a versão, identifica
os itens A e notifica P1, P4, P8, P13 e P14 antes de prometer margem inexistente.

## P12 — Engenheiro / técnico de qualidade

**Profissional real:** profissional de qualidade de obras, responsável por
planejar verificação, inspecionar e fechar causa raiz.

| Competência | Técnicas | Dados que a técnica exige |
|---|---|---|
| Planejamento | plano de inspeção, FVS/FVM, ponto de espera | requisito, critério, amostra, responsável |
| Inspeção | checklist, medição, rastreabilidade | resultado, instrumento, evidência, lote, data |
| Não conformidade | contenção, 8D, 5 porquês | desvio, impacto, causa, ação, prazo |
| Melhoria | PDCA, auditoria de processo, eficácia | indicador, recorrência, verificação, lição |

**Rotina:** planeja pontos de espera; inspeciona material e serviço; contém
desvio; aprova liberação; verifica eficácia; varre ocorrências equivalentes.

**Quando quebra:** desvio encoberto ou recorrente bloqueia lote/etapa e notifica
P7, P8, P9, P10, P13 e P16.

## P13 — Diretoria / controladoria

**Profissional real:** diretor executivo ou controller. Recebe síntese por
exceção; não é destinatário de cada foto ou atividade.

| Competência | Técnicas | Dados que a técnica exige |
|---|---|---|
| Portfólio | priorização, capacidade, cenários | margem, caixa, risco, prazo, capacidade |
| Controladoria | orçado × realizado, forecast, resultado por obra | receita, custo, comprometido, EAC, variação |
| Governança | alçada, segregação, apetite a risco | decisão, limite, exceção, autor |
| Exceção | KPI, threshold, resumo executivo | tendência, desvio, causa, plano, dono |

**Rotina:** revisa tendência e capacidade; decide exceções materiais; confirma
plano, dono e data de revisão; acompanha resultado agregado.

**Quando quebra:** conflito entre obras vira comparação de cenários e notifica
P4, P8, P2 e P1; o app registra a decisão e o impacto aceito.

## P14 — Analista de contratos, documentos e assinaturas

**Profissional real:** analista contratual/documental. Não é advogado virtual;
organiza obrigações e evidência sem interpretar direito fora da alçada.

| Competência | Técnicas | Dados que a técnica exige |
|---|---|---|
| Gestão contratual | obrigação, marco, vigência | parte, objeto, valor, prazo, obrigação |
| Mudança | change log, aditivo, impacto | origem, escopo, prazo, custo, aprovação |
| Documento | metadado, revisão, retenção | tipo, versão, estado, acesso, validade |
| Assinatura | ordem, integridade, trilha | signatário, hash, instante, artefato final |

**Rotina:** recebe versão; confere metadados e aprovadores; circula assinatura;
ativa obrigações; monitora vigência; liga mudança a aditivo.

**Quando quebra:** execução sem aditivo ou versão obsoleta suspende liberação e
notifica P1, P4, P8, P13 e P16.

## P15 — Cliente contratante

**Profissional real:** contratante da obra ou dos móveis. Usa o portal, não a
casca interna, e vê apenas evidência aprovada.

| Competência | Técnicas | Dados que a técnica exige |
|---|---|---|
| Decisão de escopo | aceite, priorização, trade-off | alternativa, impacto em prazo/custo, prazo da decisão |
| Acompanhamento | marco, evidência aprovada, previsão | progresso, próximo marco, foto aprovada, desvio explicado |
| Financeiro contratual | parcela, medição, aditivo | vencimento, evento de cobrança, valor, documento |
| Ocorrência | chamado, evidência, aceite da solução | assunto, foto, prioridade, previsão, resolução |

**Rotina:** consulta marcos; decide pendências; aprova/assina; acompanha cobrança;
abre ocorrência; confirma solução.

**Quando quebra:** pedido urgente fora do fluxo ou imagem sem contexto notifica
P1, P5, P8 e P14; a plataforma transforma pedido em decisão com impacto e
mantém uma previsão única.

## P16 — Auditor interno / compliance

**Profissional real:** auditor interno ou analista de controles, separado de P6
para preservar independência entre operar e avaliar o controle.

| Competência | Técnicas | Dados que a técnica exige |
|---|---|---|
| Planejamento | avaliação de risco, escopo, programa | universo, risco, controle, amostra |
| Teste | walkthrough, amostragem, reexecução | critério, evidência, população, exceção |
| Investigação | trilha, segregação, análise de padrão | autor, instante, antes/depois, correlação |
| Follow-up | achado, causa, plano, eficácia | impacto, recomendação, dono, prazo, estado |

**Rotina:** seleciona risco; define amostra; testa; discute causa; emite achado;
acompanha ação até provar eficácia.

**Quando quebra:** trilha incompleta ou conflito de função preserva evidência,
bloqueia a combinação e notifica P6, P13 e P4.

---

# Cobertura de aplicativos por profissão

| Aplicativo | Persona primária | Personas que precisam ser informadas |
|---|---|---|
| Início | P13 para visão executiva; cada profissional para sua fila | conforme exceção |
| CRM e Clientes | P1 | P11, P14, P8 |
| Obras | P8 | P2, P3, P4, P13, P15 |
| Planejamento | P2 | P8, P3, P9, P10, P13 |
| Tarefas, Diário e Equipes | P3/P8 | P2, P12, P13 |
| Orçamentos | P11 | P1, P4, P8, P13 |
| Propostas | P1/P11 | P14, P15 |
| Contratos, Aditivos, Assinaturas e Documentos | P14 | P1, P4, P7, P8, P15, P16 |
| Qualidade | P12 | P3, P7, P8, P9, P10, P16 |
| Compras | P9 | P2, P4, P8, P10, P12 |
| Estoque | P10 | P3, P4, P8, P9, P12 |
| Financeiro | P4 | P8, P13, P14 |
| SAC | P5 | P8, P12, P13, P15 |
| Relatórios | P13 | donos de cada indicador |
| Auditoria | P16 | P6, P13 e dono do controle |
| Administração | P6 | P16 e aprovador de alçada |

O teste `tests/personas-catalog.test.ts` cruza esta responsabilidade com
`MODULE_REGISTRY`. Cobertura declarada em prosa e ausente no catálogo, ou o
contrário, é divergência documental e deve ser corrigida na mesma passagem.

O runner `lib/operations/routines.ts` não escolhe mais um “aplicativo
representativo” por pessoa. Ele materializa as **111 combinações
persona × aplicativo operacional** declaradas no catálogo e executa os três
cenários em cada uma: **333 ensaios determinísticos**. Assim, P14 é testada em
Propostas, Contratos, Aditivos, Assinaturas e Documentos; não apenas em
Contratos.

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
7. **Persona sem dissecação não está pronta.** Competência diz o que a pessoa
   sabe; só o fluxo pessimista de [`FLUXOS-E-RISCOS.md`](FLUXOS-E-RISCOS.md) diz
   o que a ferramenta precisa ter quando o que ela sabe não basta. Os dois
   documentos são um só requisito partido em dois arquivos, e nenhuma persona
   está descrita enquanto o segundo estiver vazio para ela.
8. **Toda rotina mapeia competência a momento.** Tabela de rotina que lista
   passos sem dizer qual habilidade cada passo exige volta a ser caminho de
   clique com outro nome — que é o defeito que este documento existe para
   corrigir.
