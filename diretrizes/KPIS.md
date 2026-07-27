# KPIs — indicadores setoriais e individuais, módulo a módulo

**Documento canônico.** Pedido pelo responsável em 27 de julho de 2026:

> "quero que você crie kpis por setor e individual para todos os módulos, isso é
> de extrema importância"

---

## 0. O teste que decide se algo vira KPI

Ditado pelo responsável em 27 de julho:

> "para você saber se uma coisa é um bom kpi ou não, você deve sempre pensar,
> qual tarefa ou atividade que se atrasar, não for realizada geram um grande
> impacto, daí você mede o acerto, quem estiver abaixo precisa acender uma bola
> vermelha de cuidado, depois você mede o geral"

Quatro perguntas, nesta ordem. **Se a primeira falha, não vira KPI** — vira
relatório, que é outra coisa e não acende nada.

1. **Se esta atividade atrasar ou não acontecer, o impacto é grande?**
   Se a resposta é "nem tanto", medir isso só gera ruído que ensina a ignorar
   painel.
2. **Dá para medir o acerto?** Precisa existir um alvo — prazo, meta, padrão —
   contra o qual comparar. Sem alvo não há acerto, há contagem.
3. **Quem fica abaixo é identificável?** Indicador que não aponta responsável não
   gera ação; gera reunião.
4. **Só então: qual é o geral do setor?** O agregado vem depois do individual,
   nunca no lugar dele. Setor bom com uma pessoa afundando é setor que vai piorar
   no mês seguinte.

O sinal vermelho é do passo 3. O passo 4 é o que se leva à direção.

### Aplicando o teste — o que passa e o que não passa

| Candidato | Passa? | Por quê |
|---|---|---|
| Medição não feita na data | **sim** | Atrasa projeto executivo, fabricação e montagem em cascata |
| Vistoria de finalização atrasada | **sim** | Segura o encerramento e a última parcela |
| Primeiro contato com lead novo | **sim** | Depois de 24h a conversão despenca |
| Solicitação de insumo sem resposta | **sim** | Para a obra, e o custo é de todo mundo parado |
| Diário de campo do dia | **sim** | Sem evidência não há defesa em glosa ou disputa |
| Quantidade de observações no cartão | não | Escrever muito não é trabalhar bem |
| Número de acessos ao sistema | não | Mede presença na tela, não resultado |
| Documentos anexados | não | Volume sem consequência |

---

## 0.1 A janela: 6 meses anteriores + 6 meses atuais

Definida pelo responsável: o KPI se constrói sobre **dois semestres**, com
desvio padrão. O ano inteiro é o retrato; a comparação entre as metades é a
tendência.

Exemplo calculado, taxa de conversão mensal de um vendedor:

| Janela | Média | Desvio |
|---|---|---|
| Semestre anterior | 24,8% | 4,3 pp |
| Semestre atual | 32,0% | 2,4 pp |
| **Ano (12 meses)** | **28,4%** | **5,0 pp** |

Tendência: **+7,2 pp** entre semestres — e o desvio caiu de 4,3 para 2,4, o que
significa que além de melhor ficou mais **previsível**. Os dois fatos juntos
valem mais que qualquer um sozinho.

**Desvio padrão amostral (n−1), não populacional.** Seis meses é amostra do
comportamento da pessoa, não a população inteira dos meses dela.

### As faixas saem do próprio histórico, não de palpite

```
faixa esperada = média ± 1 desvio        → 23,4% a 33,4%
bola vermelha  = abaixo de média − 1σ    → menos de 23,4%
```

Isso resolve o problema do alvo arbitrário: o limite de cada pessoa vem do que
ela mesma entrega, e a média de mercado da §0.2 entra como segunda régua, para
o caso de todo mundo estar mal de forma consistente.

### Por que o desvio decide escolha de equipe

Calculado, três equipes na mesma tarefa:

| Equipe | Média | Desvio | Pior caso esperado |
|---|---|---|---|
| A | 6,00 d | 0,00 d | 6,00 d |
| B | 6,00 d | 1,90 d | **7,90 d** |
| C | 5,33 d | 0,52 d | 5,85 d |

**A e B têm exatamente a mesma média e não servem para a mesma coisa.** B pode
estourar quase dois dias a mais. Para prazo apertado, ordenar por
`média + desvio` (menor é melhor) — nunca só pela média.

---

## 0.2 Médias de mercado, para saber se está bom

Pesquisadas em julho de 2026. **São faixas direcionais, não notas de corte:**
variam por porte, segmento e origem do lead. Servem para responder "estamos
muito fora?", não para reprovar alguém.

| Indicador | Faixa de mercado | Observação |
|---|---|---|
| MQL → SQL | 12% a 21% típico; 20–35% com follow-up rápido; 40% no topo | O responsável estimou ~10% para qualificado ÷ total — abaixo da faixa citada, o que é plausível para lead de origem aberta |
| SQL → oportunidade | 30% a 50% | Chega a 59% quando prospectado por SDR |
| Contato em até 1 hora | 53% de conversão, contra 17% após 24h | É a evidência mais forte a favor do KPI de tempo até o primeiro contato |
| Obra entregue no prazo | 80% a 90% nas construtoras eficazes | 98% dos projetos na América do Norte estouram o cronograma original |
| Desvio de cronograma | dentro de ±5% do previsto | É o alvo do `TEPr` |
| Retrabalho | 5% a 12% de média; 3% a 5% nos eficientes | Custa de 2% a 6% do valor da obra |
| Defeito em item vistoriado | abaixo de 2% | 90%+ de aprovação de primeira |
| Resolução na primeira visita | acima de 75% é forte; 80%+ nos líderes | Considerado o KPI operacional mais importante de serviço de campo |
| Utilização do técnico | 70% a 80% | Acima disso é sinal de sobrecarga, não de eficiência |
| Cumprimento de SLA | 80% de média; 90% nos líderes | — |
| Prazo médio de recebimento | 60 a 90 dias na construção | O mais alto entre os setores, por retenção e medição |

A taxa de conversão de ~30% que o responsável citou fica dentro da faixa de
`MQL → SQL` com follow-up rápido, e é meta razoável para o funil pós-briefing.

**Uma ressalva honesta:** essas faixas vêm de mercados majoritariamente
norte-americanos de B2B e serviço de campo. Móveis planejados no Brasil tem
ciclo, ticket e sazonalidade próprios. Por isso a régua primária é o **histórico
da própria empresa** (§0.1) e a de mercado é a segunda opinião — não o
contrário.

---

## 1. As cinco regras que todo KPI deste documento obedece

Sem elas, indicador vira número bonito que ninguém sabe de onde veio.

1. **Fórmula explícita.** Numerador e denominador escritos. "Produtividade" não é
   KPI; `m² por dia útil` é.
2. **Fonte no banco.** Toda linha aponta a tabela de onde sai. KPI sem fonte é
   KPI que alguém vai preencher à mão, e o que se preenche à mão se ajusta.
3. **Período declarado.** Mês corrente, últimos 90 dias, últimos 6 meses. Sem
   período, comparação é conversa.
4. **Normalizado quando compara pessoas ou equipes.** Contagem absoluta premia
   quem pegou volume ou tarefa longa. É a mesma correção que o `TEPr` fez ao
   `TEP` em `SERVICO-DE-CAMPO.md`.
5. **Denominador honesto.** Ver a seção 2 — é o erro mais fácil de cometer e o
   mais caro.

---

## 2. O princípio do denominador, com a conta feita

O responsável definiu dois indicadores que parecem o mesmo e não são:

- **Leads Ganhos** — dos leads que **entraram**, quantos viraram contrato;
- **Taxa de Conversão** — dos que **fizeram briefing**, quantos viraram contrato.

Com 200 leads, 90 briefings, 40 pré-projetos e 18 contratos:

| Indicador | Fórmula | Valor |
|---|---|---|
| Conversão de Leads | 90 / 200 | 45,0% |
| Conversão em Projeto | 40 / 90 | 44,4% |
| **Leads Ganhos** | 18 / 200 | **9,0%** |
| **Taxa de Conversão** | 18 / 90 | **20,0%** |

A razão entre os dois — 2,22× — é exatamente `1 / (90/200)`, ou seja, **o filtro
da entrada**. E é aí que está o diagnóstico:

- `C/L` caindo com `C/B` estável → o problema é a **origem do lead**, não o
  vendedor;
- `C/B` caindo com `C/L` estável → o problema é a **condução depois do
  briefing**.

Cobrar o vendedor por `C/L` quando o marketing mudou a fonte dos leads é punir
quem não causou. Por isso os dois convivem: um mede o funil, o outro mede quem
o opera.

---

## 3. De onde os números saem

**`pipeline_card_stage_history` já existe** e grava toda transição de etapa com
cartão, organização, etapa de origem, etapa de destino e instante. Dela saem,
sem tabela nova:

- **toda conversão** — quantos cartões alcançaram a etapa X sobre quantos
  alcançaram a etapa Y;
- **todo tempo de ciclo** — intervalo entre duas transições;
- **toda estagnação** — quanto tempo o cartão está parado na etapa atual;
- **todo retrabalho** — cartão que voltou para etapa anterior.

É o achado que torna a maior parte deste catálogo calculável assim que os funis
por setor da S-24 existirem. As outras fontes recorrentes: `pipeline_cards`,
`pipeline_card_activities`, `sac_tickets`, `projects`, `inventory_movements`,
`financial_entries` e os formulários de qualidade.

**Legenda de estado:** ✅ calculável hoje · ⏳ depende de sprint declarada ·
🔴 exige dado que ninguém coleta ainda.

---

## 4. CRM e Vendas

### Setorial

| KPI | Fórmula | Fonte | Estado |
|---|---|---|---|
| Qualidade de lead | leads aceitos ÷ leads recebidos, por origem | `pipeline_cards` + motivo de descarte | ⏳ S-24 |
| Conversão de leads | chegaram a Briefing ÷ entraram | `pipeline_card_stage_history` | ⏳ S-24 |
| Conversão em projeto | chegaram à 1ª reunião ÷ fizeram briefing | idem | ⏳ S-24 |
| Leads ganhos | contratos ÷ leads entrados | idem | ⏳ S-24 |
| Taxa de conversão | contratos ÷ briefings | idem | ⏳ S-24 |
| Ciclo de venda | mediana de dias entre entrada e ganho | idem | ✅ |
| Valor médio do contrato | soma de `valor` ÷ contratos | `pipeline_cards.valor` | ✅ |
| Funil parado | cartões sem movimento há mais de N dias ÷ total | histórico | ✅ |
| Motivo de perda | distribuição por motivo | 🔴 campo não existe | 🔴 |

**Mediana, não média, no ciclo de venda.** Um contrato que levou dois anos
distorce a média e some na mediana.

### Individual — por vendedor

| KPI | Fórmula | Cuidado |
|---|---|---|
| Taxa de conversão pessoal | contratos ÷ briefings **dele** | Comparar só dentro da mesma origem de lead |
| Ciclo de venda pessoal | mediana de dias dele | — |
| Atividades cumpridas no prazo | concluídas até o prazo ÷ agendadas | `pipeline_card_activities` — ✅ hoje |
| Tempo até o primeiro contato | horas entre entrada do lead e primeira observação | ✅ |
| Carteira parada | cartões dele sem movimento há mais de N dias | ✅ |

---

## 5. Serviço de campo, equipes e planejamento

Detalhado em `SERVICO-DE-CAMPO.md`; aqui a forma de KPI.

### Setorial

| KPI | Fórmula | Estado |
|---|---|---|
| Aderência ao prazo | tarefas com `TEP ≥ 0` ÷ tarefas concluídas | ⏳ S-25 |
| Desvio médio relativo | média de `TEPr` | ⏳ S-25 |
| Obras no prazo | obras sem tarefa com `TEPr < −10%` ÷ obras ativas | ⏳ S-25 |
| Causa raiz do atraso | distribuição por motivo declarado | ⏳ S-25 |
| Acerto do planejador | % de tarefas com `TEP = 0` | ⏳ S-25 |
| Horas em obra ÷ horas apontadas | check-in/out sobre jornada | ⏳ S-25 |

**O KPI do planejador é a face espelhada do KPI do campo.** `TEP` positivo
sistemático não é equipe rápida: é plano folgado. Sem esse indicador, todo desvio
cai no campo — o que é injusto e, pior, esconde a causa.

### Individual — por profissional de execução

| KPI | Fórmula | Cuidado |
|---|---|---|
| Rendimento por tipo de tarefa | unidade ÷ dia útil, por tipo | Só compara dentro do mesmo tipo |
| Regularidade | **desvio padrão** do rendimento, 6 meses | Média igual com desvios diferentes são profissionais diferentes |
| Aderência pessoal ao prazo | `TEPr` médio dele | Normalizado, nunca `TEP` absoluto |
| Pontualidade | check-ins dentro da janela ÷ total | Ver ressalva da §7.1 do serviço de campo |
| Evidência registrada | dias com diário ÷ dias em obra | — |
| Avaliação do cliente | média das 7 notas | Ver ressalva da §7.2 |

**A regularidade vale tanto quanto a média.** Uma equipe que entrega em 4 ou em
8 dias tem a mesma média de outra que entrega sempre em 6, e não serve para
prazo apertado. Para escolha de equipe, ordenar por `média − desvio padrão`.

---

## 6. Projetos e obras

| Nível | KPI | Fórmula | Estado |
|---|---|---|---|
| Setor | Obras entregues no prazo | entregas até a data prevista ÷ entregas | ✅ |
| Setor | Desvio médio de entrega | média de dias entre previsto e efetivo | ✅ — usa DPT/DET |
| Setor | Obras com sinal amarelo | obras com tarefa atrasada ÷ ativas | ⏳ S-25 |
| Setor | Retrabalho de etapa | cartões que voltaram de etapa ÷ total | ✅ |
| Individual | Obras sob responsabilidade no prazo | por `responsavel_id` | ✅ |
| Individual | Tempo médio de resposta a pendência | ⏳ S-25 | ⏳ |

---

## 7. Assistência técnica e SAC

| Nível | KPI | Fórmula | Estado |
|---|---|---|---|
| Setor | Tempo até o primeiro contato | mediana entre abertura e primeira observação | ✅ |
| Setor | Tempo de resolução | mediana entre abertura e encerramento | ✅ |
| Setor | Chamados reabertos | reabertos ÷ encerrados | ✅ |
| Setor | Chamados por obra entregue | chamados ÷ obras — **mede a qualidade da execução** | ✅ |
| Setor | Fila parada | em "aguardando" há mais de N dias | ✅ |
| Individual | Chamados resolvidos no prazo | por responsável | ✅ |
| Individual | Reincidência | chamados dele que reabriram ÷ resolvidos | ✅ |

**"Chamados por obra entregue" é o KPI mais honesto da plataforma:** liga o
pós-venda a quem executou. Assistência alta numa obra não é problema da
assistência.

---

## 8. Qualidade

| Nível | KPI | Fórmula | Estado |
|---|---|---|---|
| Setor | Vistorias no prazo | realizadas até a data prevista ÷ agendadas | ✅ |
| Setor | Índice de não conformidade | itens reprovados ÷ itens vistoriados | ✅ |
| Setor | Reincidência de NC | mesma NC repetida na mesma equipe | ✅ |
| Setor | Tempo de fechamento de NC | mediana entre abertura e resolução | ✅ |
| Individual | NC geradas por profissional | normalizado por volume executado | ✅ com ressalva |
| Individual | Vistorias realizadas | por vistoriador | ✅ |

**NC por profissional só faz sentido normalizada.** Quem executa mais gera mais
NC em números absolutos. O denominador é o volume executado, nunca a contagem.

---

## 9. Financeiro

| Nível | KPI | Fórmula | Estado |
|---|---|---|---|
| Setor | Inadimplência | vencido não recebido ÷ a receber | ✅ |
| Setor | Prazo médio de recebimento | dias entre emissão e recebimento | ✅ |
| Setor | Aderência ao orçamento | realizado ÷ orçado, por obra | ✅ |
| Setor | Margem por obra | (receita − custo) ÷ receita | ✅ |
| Setor | Medição não faturada | medido sem lançamento | ✅ |
| Individual | Lançamentos conciliados no prazo | por operador | ✅ |

---

## 10. Compras e estoque

| Nível | KPI | Fórmula | Estado |
|---|---|---|---|
| Setor | Prazo de atendimento de solicitação | mediana entre pedido e entrega | ⏳ S-25 |
| Setor | Ruptura | solicitações sem item disponível ÷ total | ⏳ S-25 |
| Setor | Economia em cotação | melhor preço ÷ preço de referência | ✅ |
| Setor | Giro de estoque | saídas ÷ saldo médio | ✅ |
| Setor | Acuracidade de inventário | itens conferidos sem divergência ÷ contados | ✅ |
| Setor | **Parada de obra por falta de material** | tarefas com atraso de motivo "faltou material" | ⏳ S-25 |
| Individual | Pedidos no prazo | por comprador | ✅ |

**O último é o que liga o almoxarifado ao campo.** Sem ele, compras é avaliada
por preço e prazo próprio, e o custo de parar uma obra não aparece em lugar
nenhum.

---

## 11. Orçamentos, propostas, contratos e assinaturas

| Nível | KPI | Fórmula | Estado |
|---|---|---|---|
| Setor | Tempo de elaboração de orçamento | mediana entre pedido e entrega | ✅ |
| Setor | Desvio orçado × realizado | por obra concluída — **mede o orçamentista** | ✅ |
| Setor | Proposta aceita | aceitas ÷ enviadas | ✅ |
| Setor | Revisões por proposta | média de versões até aceitar | ✅ |
| Setor | Tempo até assinatura | mediana entre envio e assinatura | ✅ |
| Setor | Aditivos por contrato | aditivos ÷ contratos — **mede o escopo inicial** | ✅ |
| Individual | Precisão do orçamentista | desvio médio dele | ✅ |

**Aditivo por contrato é indicador de escopo mal fechado**, não de venda extra.
Muitos aditivos com margem estável significa que o orçamento inicial estava
incompleto.

---

## 12. Diário de campo, tarefas e documentos

| Nível | KPI | Fórmula | Estado |
|---|---|---|---|
| Setor | Cobertura do diário | dias com registro ÷ dias de obra | ✅ |
| Setor | Tarefas concluídas no prazo | ÷ com prazo definido | ✅ |
| Setor | Documento pendente de aprovação | acima de N dias | ✅ |
| Individual | Registros por profissional | normalizado por dias em obra | ✅ |
| Individual | Tarefas atrasadas em aberto | por responsável | ✅ |

---

## 13. Administração e auditoria

| Nível | KPI | Fórmula | Estado |
|---|---|---|---|
| Setor | Usuários sem acesso há 60 dias | licença paga e não usada | ✅ |
| Setor | Permissão concedida acima do perfil | exceções ativas | ✅ |
| Setor | Eventos de auditoria sem tratamento | alertas abertos | ✅ |
| Individual | Ações sensíveis por usuário | exclusões, alterações de permissão | ✅ |

Este bloco não avalia desempenho: avalia **risco**. Misturá-lo com produtividade
transformaria auditoria em vigilância de trabalho, que é outra coisa e tem outras
regras.

---

## 14. Painel executivo

O que a direção olha, composto dos anteriores:

| KPI | Composição |
|---|---|
| Obras no prazo × atrasadas | §6 |
| Margem da carteira | §9 |
| Funil por etapa e por valor | §4 |
| Chamados abertos por obra entregue | §7 |
| Desempenho por equipe | §5 |
| Acerto do planejamento | §5 |

---

## 15. O que precisa ser decidido antes de medir pessoas

Os KPIs individuais deste documento são avaliação de desempenho de pessoas
identificadas. Três decisões, nenhuma técnica, todas mais baratas agora:

1. **Quem vê o individual.** O próprio avaliado deveria ver o dele — indicador
   que a pessoa não conhece não corrige comportamento, só gera surpresa.
2. **Janela de esquecimento.** Quanto tempo um resultado ruim pesa. Sem isso, a
   matriz de competências vira condenação permanente.
3. **Contestação.** Todo número individual precisa de caminho para "este número
   está errado, e aqui está o porquê" — porque alguns vão estar.

E uma quarta, técnica: **KPI individual só entra em produção junto com o
denominador que o normaliza.** Publicar contagem absoluta primeiro e normalizar
depois cria uma primeira leitura injusta que ninguém esquece.
