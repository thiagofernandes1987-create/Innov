# Qualidade: da causa raiz ao treinamento, e do treinamento à cobrança

Documento canônico. Ditado pelo responsável em 27 de julho de 2026:

> "daí Pareto e Ishikawa entram na qualidade, entendeu como tudo se conecta? daí
> você começa mapear e identificar os erros, se todos realizarem o preenchimento
> dos campos corretamente, daí você começa a pegar custos invisíveis, identificar
> pontos de falha, consegue identificar qual área precisa de maior atenção,
> começa a criar treinamentos para começar a capacitar e corrigir as equipes,
> consegue cobrar as pessoas que estão em nível gerencial"

## O ciclo que fecha

Este documento é o fecho de uma corrente que já estava desenhada em pedaços:

```
FLUXOS-E-RISCOS   →  o imprevisto acontece e é dissecado antes de existir
S-28              →  o campo registra: parada, motivo fechado, de quem era a obrigação
S-29              →  o registro chega a quem precisa, por exceção
QUALIDADE (aqui)  →  Ishikawa classifica a causa · Pareto ordena por perda
                  →  custo invisível vira número
                  →  a área que precisa de atenção aparece, e não é a suposta
                  →  o treinamento vai para a competência certa (PERSONAS)
                  →  a reincidência prova se funcionou
                  →  a gestão é cobrada pelo que é dela, não pelo que é do campo
KPIS              →  tudo isso vira indicador setorial e individual
```

**Nada aqui é análise sobre opinião.** Cada elo consome o campo que o elo
anterior obriga a preencher. É por isso que a lista fechada de motivo e o campo
"de quem era a obrigação" da S-28 não eram burocracia: eram a espinha do
Ishikawa, gravada no momento em que o fato aconteceu.

**Dono da rotina: P12**, o engenheiro ou técnico de qualidade de
[`PERSONAS-E-ROTINAS.md`](PERSONAS-E-ROTINAS.md), cuja matriz já declara
não conformidade com contenção, 8D e 5 porquês, e melhoria com PDCA, auditoria
de processo e verificação de eficácia. Este documento não cria persona nova:
dá a **aritmética** que faltava àquelas técnicas — qual causa atacar primeiro,
quanto ela custa, e como provar que a ação funcionou.

---

## §1 — Ishikawa: a espinha já está no banco

O diagrama de causa e efeito organiza a causa em seis famílias — os 6M. Aplicado
a móvel planejado e obra:

| Espinha | O que entra | Onde já é gravado |
|---|---|---|
| **Medição** | Medida errada, medição condicional não remedida, tolerância mal avaliada | Classificação do R3.1, pré-condição da T-28.2 |
| **Método** | Sequência errada, romaneio não conferido, escopo aceito no local, conflito de equipes | Motivo da parada, T-28.3, T-28.6 |
| **Material** | Ferragem errada, chapa fora de especificação, peça danificada no transporte | Solicitação de insumo, T-28.5 |
| **Máquina** | Ferramenta quebrada, serra desregulada, plotter fora de calibração | Motivo da parada |
| **Mão de obra** | Falta de competência, treinamento ausente, rotatividade | Matriz de competências (`PERSONAS`) |
| **Meio ambiente** | Chuva, acesso, energia, obra de terceiros | Motivo da parada, ficha de acesso T-28.4 |

**O campo "de quem era a obrigação" é a espinha do Ishikawa.** Ele já é exigido
na abertura de toda parada, no momento do fato, por quem estava lá — que é a
única hora em que a resposta é confiável.

### A regra que separa Ishikawa de reunião

> **Ishikawa sem dado é brainstorm.** Um diagrama montado numa sala, de memória,
> produz a causa que o mais influente da sala acredita. O mesmo diagrama montado
> sobre 1.584 dias-montagem de registro produz a causa que existe.

A diferença aparece na §3, e é grande.

---

## §2 — Pareto sobre a causa, nunca sobre o sintoma

O erro clássico é fazer Pareto de **sintoma** — "porta desalinhada" aparece 40
vezes e vira prioridade. Mas "porta desalinhada" não é causa: é o que se vê. A
causa pode ser medida, ferragem ou assentamento do piso, e cada uma leva a um
departamento diferente.

Pareto sobre a causa, com base em 1.584 dias-montagem por ano (6 frentes × 22
dias úteis × 12 meses), custo por ocorrência = horas paradas × R$ 104,00 +
retrabalho médio:

| Causa | Ocor./ano | R$/ocor. | R$/ano | % | Acum. | Classe |
|---|---:|---:|---:|---:|---:|:--:|
| Medida diferente do projeto | 190 | 2.036 | **387.003** | 48,1% | 48,1% | **A** |
| Peça faltando ou trocada | 158 | 1.001 | **158.552** | 19,7% | 67,8% | **A** |
| Chuva ou condição | 63 | 832 | **52.716** | 6,5% | 74,3% | **A** |
| Acesso bloqueado | 95 | 520 | 49.421 | 6,1% | 80,5% | B |
| Cliente muda no local | 79 | 568 | 44.986 | 5,6% | 86,1% | B |
| Ferragem errada | 111 | 388 | 43.021 | 5,3% | 91,4% | B |
| Sem energia / andaime | 127 | 312 | 39.537 | 4,9% | 96,3% | C |
| Outra equipe no ambiente | 143 | 208 | 29.652 | 3,7% | 100,0% | C |
| **Total** | | | **804.887** | | | |

**3 causas de 8 (38%) concentram 80% da perda.**

E o detalhe que só o Pareto por **custo** revela: "outra equipe no ambiente"
acontece **143 vezes por ano** — a mais frequente da lista — e responde por 3,7%
da perda. Priorizar por frequência mandaria a empresa trabalhar muito para
economizar pouco. **Frequência ordena o incômodo; custo ordena a prioridade.**

---

## §3 — O achado: a área culpada não é a área causadora

Somando a perda por espinha do Ishikawa:

| Espinha 6M | R$/ano | % |
|---|---:|---:|
| **Medição** | 387.003 | **48,1%** |
| **Método** | 233.190 | 29,0% |
| Meio ambiente | 141.673 | 17,6% |
| Material | 43.021 | 5,3% |
| **Mão de obra** | **0** | **0,0%** |

**Nenhuma das oito causas é mão de obra.** Zero.

E este é o viés que a plataforma existe para corrigir: **sem dado, a
classificação default é "falta de atenção do montador"** — porque o montador é
quem estava lá quando o problema apareceu, e porque é o elo com menos poder de
contestar a classificação. O treinamento vai para quem não causou o problema, o
custo continua, e a conclusão da reunião seguinte é que "o pessoal não aprende".

Com dado, quase metade da perda está em **medição** — que é competência de
projetista e de comercial (P7.C1, P7.C2, P1.C1), não de montador. É outra área,
outro treinamento e outra cobrança.

> É exatamente o que foi pedido: *"identificar qual área precisa de maior
> atenção"*. A resposta muda quando existe dado, e muda para longe de onde a
> intuição aponta.

---

## §4 — Custos invisíveis: o que não tem linha no DRE

| Custo | R$/ano |
|---|---:|
| Equipe parada, todas as causas | 388.777 |
| Retrabalho de peça | 416.110 |
| Hora de gestão apagando incêndio | 147.630 |
| Retorno de assistência evitável | 5.685 |
| Escopo executado e não cobrado | 28.512 |
| **Total** | **986.715** |

Honestidade da conta: as duas primeiras linhas **são** o total de R$ 804.887 da
§2, decomposto — não é soma nova. As outras três acrescentam **R$ 181.827** que a
§2 não capturava.

**Nenhum desses valores aparece no DRE como linha própria.** Aparecem diluídos em
folha, em frete e em "margem menor que a esperada" — que é o nome que se dá ao
custo invisível quando ninguém o mediu. É por isso que a empresa que tem os oito
problemas acima e a que não tem podem parecer iguais na demonstração de
resultado, e serem muito diferentes na conta bancária.

---

## §5 — O retorno de atacar a causa número 1

Se a ação sobre "medida diferente do projeto" — pré-condição conferida,
remedição agendada, conferência antes de liberar fabricação — reduzir a
ocorrência:

| Redução | Economia/ano | Ação de R$ 8.000 | Ação de R$ 25.000 |
|---|---:|---|---|
| 30% | 116.101 | paga em **0,8 mês** | paga em 2,6 meses |
| 50% | 193.501 | paga em **0,5 mês** | paga em 1,6 mês |
| 70% | 270.902 | paga em **0,4 mês** | paga em 1,1 mês |

**Payback abaixo de três meses no pior cenário da tabela.** É o argumento que
transforma "seria bom conferir a medida" em decisão de investimento com número.

E note que a ação da linha 1 é a T-28.2, que já está registrada — este documento
não pede trabalho novo, ele **precifica** o trabalho que já estava na fila e
mostra que ele é o mais rentável de todos.

---

## §6 — Reincidência: o único número que prova que a ação funcionou

```
ocorrências da causa nos 6 meses anteriores : 158
nos 6 meses seguintes à ação                :  47
redução                                     : 70,3%
```

**Ação sem medição de reincidência é reunião, não correção.** A janela é a mesma
6+6 já fixada em [`KPIS.md`](KPIS.md), pelo mesmo motivo: comparar as metades diz
a tendência, e o ano inteiro diz o retrato.

E a regra que evita o autoengano mais comum de programa de qualidade: **a queda
de ocorrências só conta se a cobertura de apontamento não caiu junto**. Causa que
some do relatório porque as pessoas pararam de registrar parece exatamente igual
a causa resolvida — e é o oposto. Por isso a T-28.10, cobertura de apontamento,
é pré-requisito deste documento inteiro.

---

## §7 — Da causa ao treinamento: quem capacitar, e em quê

Aqui o ciclo encontra a matriz de competências de
[`PERSONAS-E-ROTINAS.md`](PERSONAS-E-ROTINAS.md). Cada causa aponta uma
competência nomeada, e a competência aponta a pessoa:

| Causa | Competência que falhou | Quem treinar | Nível alvo |
|---|---|---|---|
| Medida diferente do projeto | P7.C1 metrologia e tolerância, P7.C2 pré-condição de medição | Projetista | 3 → 4 |
| Medição feita cedo demais | P1.C1 qualificação inclui "dá para medir?" | Vendedor / SDR | 2 → 3 |
| Peça faltando ou trocada | P3.C11 conferência de romaneio; e o método de expedição | Montador **e** expedição | 2 → 3 |
| Ferragem errada | P7.C3 especificar o que existe, com código | Projetista | 3 → 4 |
| Cliente muda no local | P3.C12 conduta e limite de autoridade; P1.C9 aditivo | Montador e vendedor | 2 → 3 |
| Acesso bloqueado | P7.C1 ficha de acesso preenchida na medição | Projetista / medidor | 2 → 3 |
| Outra equipe no ambiente | P2 sequenciamento | Planejador | 3 → 4 |

**Treinamento sem causa medida é palestra.** A tabela acima só existe porque a
causa foi classificada no momento do fato — e é o que transforma "precisamos
treinar a equipe" em "três projetistas precisam subir de nível 3 para 4 em
metrologia, e isso vale R$ 193.501 por ano".

Os níveis são os quatro já definidos em `PERSONAS-E-ROTINAS.md`, e a subida de
nível se afirma com evidência: reincidência da causa associada, não certificado
de presença.

---

## §8 — Cobrar o nível gerencial pelo que é dele

O pedido foi explícito: *"consegue cobrar as pessoas que estão em nível
gerencial"*. E aqui a regra da §1 de
[`ACOMPANHAMENTO-A-DISTANCIA.md`](ACOMPANHAMENTO-A-DISTANCIA.md) vale ao
contrário: **gerente não é cobrado pelo número do campo. É cobrado pelo que só
ele controla.**

| Indicador do gestor | O que mede | Por que é dele |
|---|---|---|
| **Tempo de resposta à solicitação do campo** | Prazo prometido × cumprido, por tipo | Os prazos de 1 a 4 h da S-28 são compromisso da gestão, não do campo |
| **Cobertura de apontamento da equipe** | Dias-equipe com diário ÷ esperados | Se a equipe não aponta, é gestão, não é montador |
| **Reincidência das causas sob sua alçada** | 6 meses anteriores × 6 atuais | Ação corretiva é atribuição gerencial |
| **Plano de ação com dono e prazo** | Causas de classe A com ação aberta | Causa A sem ação é decisão de não agir |
| **Nível da matriz de competências da equipe** | Distribuição e evolução | Formar equipe é função de quem gere |
| **Custo invisível da carteira** | R$ das causas da §2, por obra | É o número que ele existe para reduzir |

Um gestor cuja equipe tem `TEP` ruim **e** tempo de resposta de três dias tem um
problema de gestão, não de equipe. Um gestor cuja equipe tem `TEP` ruim e tempo
de resposta de 40 minutos tem um problema de competência ou de recurso — e é
outra conversa inteira.

**Sem separar os dois, toda reunião de resultado termina cobrando quem estava na
obra.**

---

## §9 — Dissecação: o que quebra num programa de qualidade

### RQ1 — Tudo é classificado como "mão de obra" · alta

**O que trava.** A correção, e permanentemente: se a causa registrada é sempre a
mesma, o Pareto aponta sempre para o mesmo lugar e nada melhora.

**O que a ferramenta precisa ter.** Classificação **no momento do fato**, por
quem estava lá, com a lista dos 6M e exemplos por espinha; e o painel de
distribuição por espinha visível — 100% em uma espinha só é sinal de
classificação preguiçosa, não de operação com uma causa única.

**Afeta.** Qualidade, RH (treinamento errado), Campo (culpado indevidamente).

**A quem se solicita.** Qualidade audita por amostragem. **Prazo: mensal.**

**Fica registrado.** Distribuição por espinha, e quem classificou.

### RQ2 — Pareto sobre sintoma em vez de causa · alta

**O que trava.** A prioridade. "Porta desalinhada" 40 vezes vira projeto de
melhoria de porta, quando a causa era assentamento de piso.

**O que a ferramenta precisa ter.** Sintoma e causa como **campos separados**, e
o Pareto rodando sobre causa. O sintoma serve para agrupar chamado; a causa serve
para decidir investimento.

### RQ3 — Pareto por frequência em vez de custo · média

**O que trava.** O retorno. Calculado, a causa mais frequente da lista responde
por **3,7%** da perda.

**O que a ferramenta precisa ter.** As duas ordenações lado a lado, com o custo
como padrão e a frequência como segunda leitura.

### RQ4 — A causa some do relatório porque pararam de registrar · alta

**O que trava.** Tudo, e do jeito pior: parece sucesso.

**O que a ferramenta precisa ter.** **Cobertura de apontamento no mesmo gráfico
da reincidência.** Queda de ocorrência com queda de cobertura não é melhoria — é
o sistema perdendo visão, e precisa aparecer como alerta e não como conquista.

### RQ5 — Registrar problema passa a ser ruim para quem registra · alta, e a mais cara

**O que trava.** A veracidade. Se registrar parada piora o indicador de quem
registrou, ninguém registra — e a operação fica cega enquanto o painel fica
verde.

**O que a ferramenta precisa ter.** Parada com obrigação de terceiro **não entra**
no indicador de produtividade de quem a registrou; e taxa de registro tratada
como indicador **positivo** do gestor.

**Afeta.** Todos. É a falha que inutiliza o programa inteiro.

### RQ6 — Ação sem dono e sem prazo · média

**O que trava.** A execução. Causa de classe A discutida e não atribuída volta no
Pareto do trimestre seguinte, idêntica.

**O que a ferramenta precisa ter.** Plano de ação amarrado à causa, com dono
nominal, prazo e verificação de eficácia pela reincidência — não pela conclusão
da tarefa.

### RQ7 — Cinco porquês vira ficção · média

**O que trava.** A qualidade da causa raiz. Os cinco porquês encadeados de
memória chegam onde quem conduz quer chegar.

**O que a ferramenta precisa ter.** Cada nível do encadeamento apoiado num
registro — parada, foto, medição, documento. Nível sem evidência fica marcado
como hipótese, e hipótese não vira plano de ação de classe A.

### RQ8 — O indicador vira meta e a classificação se adapta · alta

**O que trava.** A veracidade da classificação — Goodhart de novo. Se "meio
ambiente" não é culpa de ninguém, tudo vira chuva.

**O que a ferramenta precisa ter.** Auditoria por amostragem cruzando causa
declarada com a evidência anexada; e comparação entre equipes — uma equipe com
distribuição de causas muito diferente das outras, na mesma cidade, está
classificando diferente, não operando diferente.

---

## §10 — O que este documento obriga

1. **Sintoma e causa são campos separados.** Pareto roda sobre causa.
2. **Pareto ordena por custo**, com frequência como segunda leitura.
3. **Causa é classificada no momento do fato**, por quem estava lá, nos 6M.
4. **Distribuição por espinha é monitorada**: concentração em uma só é sinal de
   classificação preguiçosa.
5. **Reincidência é a prova**, e só vale com cobertura de apontamento estável.
6. **Toda causa de classe A tem plano de ação com dono e prazo.** Sem ação é
   decisão de não agir, e ela fica registrada como tal.
7. **Treinamento aponta competência nomeada** da matriz, e sobe de nível por
   evidência de reincidência, não por presença.
8. **Gestor é cobrado pelo que é dele**: tempo de resposta, cobertura,
   reincidência, plano de ação, evolução da equipe e custo invisível da carteira.
9. **Registrar problema nunca pode piorar o indicador de quem registrou.**
10. **Custo invisível é publicado em reais.** Enquanto for adjetivo, não entra em
    decisão.
