# O que aproveitar do Odoo 19 — análise de 11/08/2026

**Documento canônico:** não. É o resultado datado de uma leitura do material de
apoio, com o que foi medido no INNOV para sustentar cada recomendação.

## 0. Método e cobertura — o que foi lido de verdade

O material tem **140.828 linhas, 25.242 títulos e 1,88 milhão de palavras**
(SHA-256 `f8401550…`, conferido no arquivo de validação junto). Não cabe em
leitura integral, e dizer que li tudo seria mentira útil. O que foi feito:

| Camada | Linhas | Tratamento |
| --- | --- | --- |
| Contrato causal, trilhas 0→8, trilhas por papel | 29–102 | **lido integralmente** |
| Fundamentos e método de auditoria | 102–406 | lido em diagonal, com os blocos citados lidos na íntegra |
| Mapas funcionais, matriz de integração, arquitetura, checklists | 406–2.263 | **lido integralmente nas seções 4, 15, 17, 18, 19** |
| Glossário, KPIs, checklists, roteiro de teste | 2.264–2.462 | **lido integralmente** |
| Fundamentos + reconciliações ponta a ponta | 2.477–2.601 | **lido integralmente** |
| Enciclopédia operacional por aplicativo (37 apps × 28 dimensões) | 2.674–59.173 | **amostrado**: gabarito extraído, um app lido na íntegra |
| Arquitetura, cookbook, deep dives | 59.174–61.503 | títulos lidos; **XI.9 lido na íntegra** |
| Camada operacional expandida | 61.504–140.808 | **mapeada, não lida**: repete o gabarito de 28 pontos por app |

Em números: cerca de **1.800 linhas lidas na íntegra** e o restante mapeado por
estrutura. A parte não lida é operação do Odoo — como clicar, onde fica o menu,
qual campo preencher. Ela é referência para quem opera Odoo, não fonte de
decisão para o INNOV, e é por isso que a amostragem não muda as conclusões.

## 1. O diagnóstico que este material ajudou a nomear

Sua percepção é de que a plataforma demora a avançar. A leitura do Odoo dá o
nome do que está acontecendo, e o repositório dá o número.

O Odoo tem uma camada chamada **Essentials**, descrita assim no material:
*"não é um único aplicativo de negócio. É a camada de recursos comuns usada por
praticamente todo o sistema"*. Ela entrega, para **todos** os aplicativos de uma
vez: estágios, atividades, chatter, busca com filtros salvos, visões (lista,
kanban, calendário, gráfico, pivot, gantt), editor rico, contatos, importação e
exportação, paleta de comandos, campos de propriedade.

O INNOV **não tem essa camada**. Ele tem 25 módulos, cada um reconstruindo o
que precisa. Medido no repositório em 11/08/2026:

```
páginas de detalhe (app/app/**/[id]/page.tsx) : 56
dessas, com histórico/linha do tempo          :  6
```

**Cinquenta registros em que o usuário abre a ficha e não vê o que aconteceu
com ela.** Não porque alguém decidiu que não deve ver — porque histórico é
construído módulo a módulo, e só seis chegaram lá.

O mesmo padrão no banco. O "chatter" do INNOV está fatiado em implementações
paralelas do mesmo conceito:

```
notas/mensagens por registro : channel_conversation_notes, pipeline_card_notes, sac_ticket_messages
atividades/próximos passos   : crm_activities, pipeline_card_activities
filtros salvos               : nenhum
paleta de comandos           : nenhuma
visão pivot                  : 1 arquivo
```

Três tabelas para "anotar algo num registro". Duas para "o que fazer em
seguida". Cada módulo novo paga de novo o preço da mesma mobília, e é isso que
faz o avanço parecer — e ser — lento. Não é falta de trabalho: é trabalho
repetido, dividido por 25.

**A segunda causa é diferente e já está registrada:** as 68 migrations `rh_*` e
as 25 `stage22_*` não estão aplicadas. Um módulo inteiro pode estar pronto no
código e invisível para quem usa — foi exatamente o caso do RH, e virou a
`VACINA-064`. Parte da sensação de "não avança" é coisa construída que ninguém
consegue ver.

## 2. O que aproveitar, em ordem de retorno

### 2.1 A camada transversal única — o maior ganho, de longe

Um registro polimórfico de **eventos por objeto** (comentário, nota, mudança de
campo, anexo, atividade agendada, seguidor), com um componente único que
qualquer ficha monta. Uma tabela, uma política de acesso, um componente.

Retorno: as 50 fichas sem histórico ganham histórico de uma vez, e o próximo
módulo nasce com ele. O Odoo é a prova de que isso escala para 37 aplicativos.

Cuidado que o próprio material registra, e que vale copiar junto: *"Chatter
guarda mensagens… são evidência contextual, não substituem campos estruturados.
Uma alteração contratual descrita em mensagem mas não refletida no campo
continua sendo inconsistência."* Histórico não é desculpa para campo frouxo.

### 2.2 Rentabilidade por obra, com as três maturidades separadas

O deep dive XI.9 descreve a armadilha: **Expected**, **To Invoice** e
**Invoiced** são estágios do mesmo fluxo, e somar os três *"duplica
economicamente o fato"*. O que se acompanha é a **migração entre colunas**.

Medido no INNOV: existe `finance_cost_centers`, e a palavra "margem" aparece só
em orçamento (BDI/markup). **Não existe visão de rentabilidade por obra** —
nada que compare custo consumido com receita reconhecida em uma obra viva. Para
uma plataforma de construção, essa é a tela que o dono da empresa abre primeiro.

Traduzido para o vocabulário da obra: **Previsto** (contrato + aditivos),
**A medir** (executado e ainda não medido), **Medido** (boletim aprovado),
**Faturado** e **Recebido**. Cinco colunas, nunca somadas entre si.

O material também dá o teste de auditoria pronto: procurar registros
economicamente ligados à obra **sem** vínculo analítico — são o que some do
painel. No INNOV, é o custo lançado sem centro de custo.

### 2.3 A ficha de definição de relatório

*"Todo relatório precisa de uma ficha de definição: modelo-fonte, medida,
dimensão, data, estados, empresa, moeda, filtros, transformação e drill-down.
Dois relatórios podem divergir legitimamente se um usa data da fatura e outro
data do pagamento. O auditor primeiro compara definições e só depois números."*

Isto resolve a discussão que toda plataforma tem quando dois painéis mostram
números diferentes. É barato: um bloco de metadados junto de cada relatório, e
uma regra de que relatório sem ficha não entra.

### 2.4 O gabarito de 28 pontos por módulo

A enciclopédia repete, para cada um dos 37 aplicativos, a mesma anatomia: por
que existe, quando usar, **quando não usar**, pré-requisitos, configuração,
caminho exato do menu, descrição da tela, cada campo, regras, cálculos,
exemplos, registros envolvidos, **efeitos em outros módulos**, lançamento
gerado, relatórios, filtros, drill-down, segurança, exceções, erros,
**reversão**, auditoria, evidências, testes, perguntas de domínio.

O INNOV já exige quatro perguntas antes de criar tela (`PADRAO-DE-INTERFACE`
§12). Este gabarito é a versão completa, e três itens dele são justamente os que
o INNOV mais sente falta: **quando não usar**, **efeitos em outros módulos** e
**reversão**.

### 2.5 As reconciliações ponta a ponta como suíte de teste

O material define seis: Order-to-Cash, Procure-to-Pay, Inventory-to-Accounting,
Plan-to-Produce, Hire-to-Pay, Project-to-Cash — cada uma com walkthrough e
**testes de exceção** nomeados (entrega parcial, faturamento parcial, pagamento
parcial, devolução, desconto não autorizado, moeda estrangeira, cancelamento
depois de etapa derivada).

Traduzidas para construção, são as travessias que o INNOV precisa provar:

| Odoo | INNOV |
| --- | --- |
| Order-to-Cash | Proposta → Contrato → Medição → Fatura → Recebimento |
| Procure-to-Pay | Solicitação → Cotação → Pedido → Recebimento → Pagamento |
| Inventory-to-Accounting | Entrada → Saída para obra → Custo apropriado |
| Plan-to-Produce | EAP → Cronograma → Diário → Avanço físico → Medição |
| Hire-to-Pay | Admissão → Ponto → Folha → eSocial → Pagamento |
| Project-to-Cash | Obra → Custo → Receita → Rentabilidade |

Hoje o INNOV testa por módulo. Testar por travessia é o que pega o defeito que
mora **entre** dois módulos — que é onde ele costuma morar.

### 2.6 A matriz de integração — o que trafega entre módulos

O `MODULE_REGISTRY` do INNOV declara `dependencies`, mas dependência não diz
**o que** atravessa. A matriz do Odoo diz: de CRM para Vendas trafega
"oportunidade, cliente, contexto comercial"; de Ponto para Folha trafega
"horas/entradas de trabalho".

É documentação barata e de alto valor de manutenção: quando alguém muda o que
sai de um módulo, a matriz mostra quem quebra.

### 2.7 As quatro perguntas de segurança, com teste negativo

*"1. O usuário consegue abrir o menu? 2. O usuário possui CRUD no model? 3. A
record rule permite esse registro específico? 4. Uma API/server action consegue
contornar a limitação? **Teste negativo é obrigatório. Ver apenas que o menu
'sumiu' não prova segurança.**"*

O INNOV chegou nisso pelo caminho da dor — `VACINA-053` e `VACINA-064` são
exatamente as perguntas 1 e 3 falhando em silêncio. O que falta é a **quarta**:
conferir sistematicamente que a server action não contorna o que a RLS nega.

### 2.8 Trilhas por papel

O INNOV tem `PERSONAS-E-ROTINAS.md`, que descreve quem é cada persona. O Odoo
adiciona a **trilha**: a sequência de aplicativos pela qual aquele papel entra
no sistema. "Suprimentos: Produtos → Compras → Estoque → Qualidade" é ao mesmo
tempo currículo de treinamento, ordem de implantação e teste de navegação.

## 3. O que **não** copiar, e por quê

Imparcialidade exige a outra lista. Cada item abaixo é bom no Odoo e seria ruim
no INNOV agora:

| Não copiar | Por quê |
| --- | --- |
| **Studio** (customização low-code na base) | O INNOV já tem Object Runtime parado por falta de tela; abrir uma segunda via de customização multiplica o que ninguém usa. |
| **Contabilidade de dupla entrada completa** | Plano de contas, diários, conciliação bancária e declarações são um produto inteiro. O INNOV precisa de custo por obra, não de ser um ERP contábil. |
| **Multiempresa plena** | O material avisa: *"compartilhar ou separar dados entre empresas tem efeitos contábeis, fiscais, de acesso e operacionais"*. O INNOV já tem organização e RLS; multiempresa completa reabre todas as políticas. |
| **eCommerce, Marketing, PDV, e-Learning, Eventos, Fórum** | Não há persona de construção que entre por aí. |
| **PLM** | Revisão de engenharia de produto não é revisão de projeto de obra; a semelhança é superficial. |
| **IAP / créditos** | Modelo de cobrança do Odoo, não funcionalidade. |
| **Enciclopédia de 28 pontos × 37 apps como documento** | O gabarito é ótimo; gerar 79 mil linhas de manual é o oposto do que resolve a lentidão. |

## 4. O que isso vira no inventário

Quatro sprints, no fim da fila conforme a R4, na ordem de retorno medido:

- **S-46 — Camada transversal única.** Registro de eventos por objeto, com
  componente único; migrar as 6 fichas que já têm histórico e ligar as 50 que
  não têm. Consolidar as 3 tabelas de nota e as 2 de atividade.
- **S-47 — Rentabilidade por obra.** As cinco maturidades separadas, sem soma,
  com o teste de custo sem centro de custo.
- **S-48 — Ficha de definição de relatório e matriz de integração.**
- **S-49 — Travessias ponta a ponta como suíte.** Seis travessias, com os
  testes de exceção nomeados.

O gabarito de 28 pontos (§2.4), as quatro perguntas de segurança (§2.7) e as
trilhas por papel (§2.8) não viram sprint: entram como alteração nos documentos
canônicos que já existem — `PADRAO-DE-INTERFACE.md`, `PROVA-POR-SABOTAGEM.md` e
`PERSONAS-E-ROTINAS.md`.

## 4.1 Segundo passe — a estrutura real do manual, medida

A primeira leitura tratou o material como texto e extraiu conceito. O segundo
passe mediu a **estrutura**, e ela é mais útil do que o conceito:

```
procedimentos documentados         : 438
dimensões por procedimento         :  28
títulos H3 distintos               : 356
```

Os 438 batem exatamente com as 438 ocorrências de `Status V7` que o arquivo de
validação declara — ou seja, cada procedimento passou pelo mesmo confronto com
a fonte oficial. Não é uma enciclopédia solta: é um **gabarito aplicado 438
vezes**.

Das 28 dimensões, duas são as que o INNOV nunca escreve, e por isso foram as
extraídas:

| Dimensão | O que ela obriga a responder |
| --- | --- |
| **4. Quando não usar** | o caso em que a ferramenta certa é outra |
| **24. Reversão** | como desfazer **sem apagar** |

Filtrando os 438 por domínio equivalente no INNOV e exigindo as duas dimensões
preenchidas, sobram **255**. Destes, **18** carregam regra de reversão forte —
proibição explícita de apagar, exigência de estorno, ou preservação de trilha —
e **11** sem duplicata de regra.

### O padrão que se repete nos 11

Sempre a mesma forma, em domínios diferentes:

> **Reverta pelo evento de origem, não pelo valor. Nunca apague o que já
> produziu efeito; emita o documento contrário e preserve os dois.**

Aplicado a conta contábil: *"não corrija histórico renomeando a conta supondo
que a classificação original desapareceu"*. A estoque: *"reverta o evento de
origem — devolução para recebimento, nota de crédito para fatura; mudança de
custo sem trilha destrói a auditabilidade"*. A folha: *"não apague holerite
pago; preserve o original, o documento de reversão e a autorização"*.

O INNOV já chegou nessa regra por um caminho só, e por dor: a `VACINA-039`
(atualização mensal de referência não altera orçamento histórico) e a
`VACINA-049` (salvar não muda estado de publicação) são casos particulares
dela. O que falta é a **regra geral escrita**, e um lugar onde ela seja
consultada antes de cada módulo novo.

### Onde isso ficou

Base [Referência Odoo — quando não usar e como reverter](https://app.notion.com/p/0783cadd2ab94274bbf9c684e543f576),
com 6 procedimentos semeados, cada um com o julgamento de aplicabilidade
(`adotar`, `adaptar`, `não se aplica`) e o motivo de importar aqui.

Não semeei os 255 nem os 438. Verbete copiado em massa entra sem julgamento, e
julgamento é justamente o que separa referência de entulho. O que semeei foi o
**padrão** e os casos que o INNOV vai encontrar nas travessias da S-49.

## 5. Uma ressalva honesta sobre prioridade

Nada disto muda o fato de que **68 migrations do RH e 25 da mensageria não estão
aplicadas**. Construir a camada transversal por cima de módulos que o usuário
não consegue abrir aumenta o estoque de coisa pronta e invisível, que é o outro
lado da mesma lentidão.

A ordem que eu defendo, e que é decisão sua: **aplicar o que está pronto antes
de construir o que falta**. A S-45 já está no inventário para isso.
