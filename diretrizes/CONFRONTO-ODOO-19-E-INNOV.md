# Confronto Odoo 19 × INNOV — matriz por módulo, lógica global e governo do inventário

**Documento canônico:** sim. Substitui, como referência de comparação,
`ODOO-PARIDADE-FUNCIONAL-2026-07-28.md` e `APROVEITAMENTO-ODOO-19-2026-08-11.md`,
que continuam válidos como registro histórico das duas passagens anteriores.

**Medido em:** 11/08/2026, contra o commit da reescrita.

---

## 1. Por que este documento existe

O pedido tem duas metades, e a segunda é a que dói:

> *"o que temos com o que o Manual nos oferece... isso módulo por módulo, como
> uma matriz e depois global"*

> *"por que está crescendo desgovernado, a cada coisa que eu informo que você não
> fez sempre adiciona um monte de tarefas e Sprints em lugares aleatórios e a
> lógica de um único módulo fica toda espaçada, um pouco em cada lugar"*

A segunda metade é uma crítica ao método, e ela está certa. Este documento
começa por prová-la com número, porque diagnóstico sem medida vira opinião — e
opinião não sustenta uma reescrita.

### 1.1 A dispersão, medida

Contado sobre `diretrizes/INVENTARIO-DE-EXECUCAO.md` no estado anterior à
reescrita: **51 sprints, 712 tarefas**, e a lógica de cada módulo espalhada por
sprints que não são "sobre" aquele módulo.

| Medida | Valor |
| --- | --- |
| Média de sprints distintas por módulo | **4,5** |
| Módulos espalhados por 4 sprints ou mais | **17 de 25** |
| Módulos espalhados por 6 sprints ou mais | **9 de 25** |
| Pior caso — `dashboard` | 8 sprints: S-08, S-23, S-25, S-27, S-28, S-33, S-37, S-44 |
| Pior caso — `auditoria` | 8 sprints: S-15, S-30, S-31, S-33, S-37, S-44, S-45, S-50 |
| `planejamento` | 7 sprints, 14 tarefas |
| `diario` | 7 sprints, 9 tarefas — e **nenhuma sprint é sobre o diário** |

O caso do `diario` é o retrato exato da queixa. Ele aparece em S-19 (CSP), S-20
(vocabulário), S-25 (janela de fechamento), S-28 (snapshot de progresso), S-29
(portal do cliente), S-49 (travessia) e S-50 (segurança). Sete lugares, nenhum
deles com o título "Diário de Obras". Quem for construir o módulo tem de
garimpar sete sprints para descobrir o que já foi decidido sobre ele.

### 1.2 A causa, nomeada

A regra **R4** do inventário manda que o que é novo vá para o fim. A intenção
era impedir que alguém empurrasse trabalho para o meio da fila e bagunçasse a
ordem de execução. O efeito colateral não foi previsto: **quando a descoberta é
sobre um módulo que já tem trabalho planejado, o fim da fila é o pior lugar
possível** — ela nasce separada de tudo com que se relaciona.

E como quase toda sprint nova nasceu de uma observação sua, e não de desenho, o
arquivo virou o registro cronológico das nossas conversas em vez do plano do
produto. **S-44** nasceu de *"o módulo de RH está sem chamada ativa"*. **S-45 a
S-49** nasceram da análise do Odoo. **S-50 e S-51** nasceram do achado de
segurança de ontem. Sete das últimas oito sprints são reativas.

Isso não é falha da R4 sozinha. É falha de não existir, ao lado da fila de
execução, **um lugar por módulo onde a lógica daquele módulo mora inteira**.

### 1.3 A segunda medida: dez módulos são casca

Contando páginas reais (`page.tsx`, atribuídas ao módulo de prefixo de rota mais
longo) contra os destinos de menu que cada módulo declara, e separando os
destinos **próprios** (que apontam para dentro do próprio módulo) dos **atalhos
para vizinho**:

| Módulo | Páginas | Menu | Próprios | Vizinhos | % próprio |
| --- | ---: | ---: | ---: | ---: | ---: |
| `planejamento` | 1 | 6 | 1 | 5 | **17%** |
| `tarefas` | 1 | 5 | 1 | 4 | **20%** |
| `diario` | 1 | 5 | 1 | 4 | **20%** |
| `equipes` | 1 | 5 | 1 | 4 | **20%** |
| `whatsapp` | 4 | 5 | 1 | 4 | **20%** |
| `obras` | 10 | 5 | 2 | 3 | 40% |
| `propostas` | 2 | 5 | 2 | 3 | 40% |
| `contratos` | 2 | 5 | 2 | 3 | 40% |
| `aditivos` | 2 | 5 | 2 | 3 | 40% |
| `documentos` | 2 | 5 | 2 | 3 | 40% |
| `orcamentos` | 6 | 5 | 3 | 2 | 60% |
| `modelos`, `sac` | 2–3 | 3 | 2 | 1 | 67% |
| `compras` | 7 | 4 | 3 | 1 | 75% |
| `crm`, `clientes`, `assinaturas`, `qualidade`, `estoque`, `financeiro`, `rh`, `relatorios`, `auditoria`, `administracao` | 3–57 | 2–7 | todos | 0 | **100%** |

Total: **69 destinos próprios contra 41 atalhos para vizinho** — 63% próprio.

O padrão é limpo e não é coincidência: **módulo com uma página tem menu de 17% a
20% próprio**. `planejamento`, `tarefas`, `diario` e `equipes` têm exatamente o
mesmo menu — cada um aponta para si e para os outros três, mais "Relatórios". O
menu deles não é navegação interna do módulo; é um **anel de navegação entre
irmãos**. Quatro módulos do núcleo operacional da obra não têm profundidade
nenhuma, e o menu disfarça isso oferecendo saída para o vizinho.

É a resposta medida para *"está demorando muito para avançar"*. Não estamos
lentos por falta de trabalho: estamos com 180 páginas, das quais **57 são só do
RH** e 17 do estoque. Estamos lentos porque o núcleo da obra — planejar, tarefa,
diário, equipe — soma **4 páginas**.

---

## 2. Método do confronto

O que foi extraído do manual, e como, para que qualquer afirmação abaixo possa
ser reconferida:

| Extraído | Quantidade | De onde |
| --- | ---: | --- |
| Aplicativos com domínio declarado | **61** | marcador `**Domínio:**` na Parte IV |
| Objetos que formam os aplicativos | **421** | seção *Objetos que formam o aplicativo* |
| **Fórmulas/regras quantitativas** | **159** | tabela *Fórmulas/regras quantitativas* |
| **Relatórios/visões** | **146** | tabela *Relatórios/visões do aplicativo* |
| Procedimentos | **880** | cabeçalhos de nível imediatamente abaixo do aplicativo |

O manual tem 14.692.401 caracteres em 140.829 linhas.

**O que é medida e o que é juízo.** As colunas *Páginas*, *Menu*, *% próprio*,
e as contagens do manual são medidas — script executado, número reproduzível.
As colunas *fazemos melhor* / *fazem melhor* são **juízo argumentado**, e cada
uma diz por quê. Onde eu não tinha base para julgar, está escrito que não tinha.

**Nove domínios do manual não têm correspondente e não vão ter.** Sites
(eCommerce, Fórum, Blog, e-Learning), Marketing (7 aplicativos), Ponto de Venda,
Locação, Fabricação, PLM e Almoço. Não é lacuna: é produto diferente. Ficam
fora da matriz para não inflar a conta de "o que falta" com coisa que nunca vai
ser construída.

---

## 3. Matriz módulo a módulo

Legenda da coluna **Trazer**: `⬤` traz agora, `◐` traz depois de pré-requisito,
`○` estudado e recusado, com motivo.

### 3.1 Comercial

#### `crm` — CRM e Vendas · 8 páginas · menu 100% próprio
**Odoo:** CRM (6 procedimentos, 4 fórmulas, 7 relatórios) + Vendas (7 fórmulas).

| | |
| --- | --- |
| **Fazemos melhor** | Motivo de perda como lista gerenciável por empresa, semeada e editável (`managed_list_values`, `negocio.motivo_perda`). No Odoo é campo livre até alguém configurar. Perda com motivo obrigatório é o que torna o funil analisável no primeiro mês, não no sexto. |
| **Fazem melhor** | **Receita rateada** = receita esperada × probabilidade, e o Forecast somando a rateada por coluna. Nós temos valor e etapa; não temos probabilidade por etapa, então não temos previsão — temos lista. |
| **Complementa** | *Leads não atendidos* e *Leads de qualidade* são relatórios de **ausência**: apontam o que não aconteceu. Todo o nosso relatório aponta o que aconteceu. |
| **Trazer** | ⬤ probabilidade por etapa + receita rateada + previsão por período · ⬤ relatório de lead sem acompanhamento · ◐ atribuição de origem/campanha (depende de origem estruturada) |

#### `clientes` — Clientes · 3 páginas · menu 100% próprio
**Odoo:** não é aplicativo isolado; é o parceiro compartilhado entre CRM, Vendas, Faturamento.

| | |
| --- | --- |
| **Fazemos melhor** | Visão multiobra do cliente — um cliente com várias obras é o caso normal aqui e é exceção lá. Nossa `is_client_owner` / portal do cliente é desenho nativo, não add-on. |
| **Fazem melhor** | **Razão do Parceiro**: saldo e movimentos por cliente, atravessando faturas, pagamentos e créditos. Nosso cliente não tem extrato. |
| **Complementa** | O parceiro único do Odoo é ao mesmo tempo cliente, fornecedor e contato — o que evita cadastro duplicado quando o fornecedor também é cliente. |
| **Trazer** | ⬤ extrato do cliente (razão do parceiro) · ◐ unificação cliente/fornecedor sob um cadastro de pessoa |

#### `propostas` — Propostas · 2 páginas · menu 40% próprio
**Odoo:** Vendas — Cotações.

| | |
| --- | --- |
| **Fazemos melhor** | Versão liberada ao cliente com rastro e alçada (`release_to_client` como capacidade distinta de `update`). No Odoo, enviar cotação é ação sem alçada própria. |
| **Fazem melhor** | **Adiantamento percentual** (`percentual × base elegível`) como parte do ciclo da cotação, e **margem da linha** = (preço − custo) × quantidade. Nossa proposta não conhece a margem que ela carrega. |
| **Complementa** | Cotação que vira pedido sem redigitar; nós já fazemos proposta→contrato, mas não proposta→medição. |
| **Trazer** | ⬤ margem por linha e margem % na proposta · ⬤ adiantamento como cláusula estruturada · ○ conectores de marketplace (não se aplica) |

### 3.2 Operacional — o núcleo que está oco

Os quatro módulos abaixo somam **4 páginas** e têm o mesmo menu-anel. É aqui que
o produto parece parado, e é aqui que o manual tem mais a oferecer.

#### `obras` — Obras · 10 páginas · menu 40% próprio
**Odoo:** Projeto (6 procedimentos, **6 fórmulas**, 3 relatórios).

| | |
| --- | --- |
| **Fazemos melhor** | A obra é entidade de primeira classe com permissão própria por projeto (`can_access_project`, `can_manage_project`). No Odoo, projeto é pasta de tarefas com regras de acesso genéricas. |
| **Fazem melhor** | **Rentabilidade em três colunas**: `Expected` (o que os pedidos existentes prometem), `To Invoice/To Bill` (entregue e não faturado) e `Invoiced/Billed` (faturado). É o desenho mais valioso do manual inteiro para nós: separa promessa, direito e fato. Nossa obra tem custo e receita como dois números, sem esse estágio do meio — e é exatamente no meio que mora a medição não faturada. |
| **Complementa** | Dashboard do projeto com *smart buttons*, marcos e atualizações num só lugar. |
| **Trazer** | ⬤ **rentabilidade em três colunas** — a peça mais importante desta matriz · ⬤ marcos (milestones) como objeto · ⬤ modelos de projeto |

#### `planejamento` — Planejamento · **1 página** · menu **17% próprio**
**Odoo:** Planejamento (7 procedimentos) + Projeto.

| | |
| --- | --- |
| **Fazemos melhor** | EAP e baseline são conceitos declarados no nosso domínio; o Planejamento do Odoo é escala de turno, não estrutura analítica de projeto. Aqui a comparação é injusta com eles. |
| **Fazem melhor** | **Alocação = horas planejadas ÷ capacidade disponível** como KPI de primeira classe, e *Open shifts* / *Auto plan* — o sistema propõe a alocação em vez de esperar o preenchimento. Temos EAP sem alocação e sem capacidade. |
| **Complementa** | *Roles* separados de *Employees*: planeja-se o papel antes de existir a pessoa. É exatamente o que uma obra precisa no início. |
| **Trazer** | ⬤ capacidade e alocação · ⬤ papel antes da pessoa · ⬤ turno aberto e sugestão automática · ◐ itinerário |

#### `tarefas` — Tarefas · **1 página** · menu **20% próprio**
**Odoo:** Projeto/Tasks + Tarefas (To-do).

| | |
| --- | --- |
| **Fazemos melhor** | Nada que eu consiga sustentar. Uma página de quadro contra um aplicativo com estágios configuráveis, dependência, subtarefa e análise por estágio/responsável/prazo. |
| **Fazem melhor** | Dependência entre tarefas, subtarefa, estágio configurável por projeto, e **análise de tarefas por estágio, responsável, projeto e prazo**. |
| **Complementa** | A tarefa lá é a mesma entidade que recebe apontamento de hora — o que faz custo de tarefa existir sem integração nova. |
| **Trazer** | ⬤ dependência e subtarefa · ⬤ estágio configurável por obra · ⬤ análise por estágio e prazo |

#### `diario` — Diário de Obras · **1 página** · menu **20% próprio**
**Odoo:** Serviço de Campo (5 procedimentos) + Planilhas de Horas (3 fórmulas).

| | |
| --- | --- |
| **Fazemos melhor** | O diário aprovado como única porta para o cliente, com `client_visible` sendo decisão explícita de quem aprova. Esse cuidado não existe no Odoo e é requisito real do nosso cliente. |
| **Fazem melhor** | **Worksheets** — o formulário da visita é modelo configurável, preenchido em campo e anexado como evidência assinável. E **custo = horas × custo/hora do funcionário**, que transforma o diário em fonte de custo. Nosso diário é registro; o deles é registro **e** apontamento **e** origem de faturamento. |
| **Complementa** | Faturamento por horas, produtos ou preço fixo a partir da mesma visita. |
| **Trazer** | ⬤ **diário como fonte de custo** (hora × custo) · ⬤ worksheet configurável por tipo de serviço · ◐ faturamento a partir do diário |

#### `equipes` — Equipes · **1 página** · menu **20% próprio**
**Odoo:** Funcionários + Planejamento/Roles.

| | |
| --- | --- |
| **Fazemos melhor** | Equipe vinculada à obra com permissão por projeto. |
| **Fazem melhor** | **Custo/hora por funcionário** como campo do cadastro — é a única razão pela qual todas as fórmulas de custo deles funcionam. Sem esse campo, "custo de mão de obra" não é calculável em lugar nenhum. |
| **Complementa** | Capacidade por pessoa e por papel alimenta a alocação do planejamento. |
| **Trazer** | ⬤ **custo/hora por integrante** — pré-requisito de `diario`, `planejamento`, `obras` e `financeiro` · ⬤ capacidade |

### 3.3 Suprimentos

#### `compras` — Compras e Suprimentos · 7 páginas · menu 75% próprio
**Odoo:** Compras (6 procedimentos, 4 fórmulas, 3 relatórios).

| | |
| --- | --- |
| **Fazemos melhor** | Cotação com convite a fornecedor e seleção com alçada e trilha — nossa RFQ tem governança de aprovação que lá é configuração. |
| **Fazem melhor** | **`Expected Arrival = Order Deadline + Vendor Lead Time`**, e o dashboard que marca o pedido como atrasado quando essa data passa. Uma fórmula de uma linha que produz a única visão que importa em suprimentos: o que vai atrasar a obra. Não temos prazo de fornecedor cadastrado, então não temos atraso previsto. |
| **Complementa** | **Comprometido**: PO confirmado e ainda não faturado soma ao realizado do orçamento. É o que impede a obra de gastar duas vezes o mesmo dinheiro. |
| **Trazer** | ⬤ lead time por fornecedor + chegada prevista + atraso · ⬤ **comprometido no orçamento** · ⬤ acordo de preço por fornecedor/quantidade |

#### `estoque` — Estoque · 17 páginas · menu 100% próprio
**Odoo:** Inventário (9 procedimentos, **7 fórmulas**, 6 relatórios).

| | |
| --- | --- |
| **Fazemos melhor** | Saída amarrada à obra, com custo apropriado ao centro certo. O Inventário do Odoo precisa de conta analítica configurada para chegar nisso. |
| **Fazem melhor** | Três coisas, todas fórmula: **quantidade prevista** = em mãos + entradas previstas − saídas previstas; **reposição Min/Max** disparando quando o previsto cruza o mínimo; e **valoração AVCO/FIFO/Standard** explícita. Nosso estoque conhece o presente e não conhece o futuro nem o custo médio. |
| **Complementa** | Relatórios de *dead stock* e *stranded inventory* por local. |
| **Trazer** | ⬤ **quantidade prevista** · ⬤ regra de reposição min/máx · ⬤ escolher e implementar uma valoração (AVCO) · ◐ rastreabilidade por lote/série |

#### `qualidade` — Qualidade · 8 páginas · menu 100% próprio
**Odoo:** Qualidade (4 procedimentos, 1 fórmula, 2 relatórios).

| | |
| --- | --- |
| **Fazemos melhor** | **Claramente nós.** FVS e FVM com formulário configurável e não conformidade com causa e responsável já existem; o aplicativo do Odoo é o mais raso dos 61 — 4 objetos, 1 fórmula. Construção civil tem exigência de qualidade que ERP genérico não modela. |
| **Fazem melhor** | **Ponto de controle** amarrado à operação: o check dispara no recebimento ou na etapa de produção, não por lembrança de alguém. E **taxa de falha** = falhos ÷ executados × 100. |
| **Complementa** | Alerta de qualidade como objeto próprio, com estágio e causa, separado do check. |
| **Trazer** | ⬤ ponto de controle disparado por evento (recebimento de compra, etapa de obra) · ⬤ taxa de falha como indicador |

### 3.4 Financeiro

#### `orcamentos` — Orçamentos · 6 páginas · menu 60% próprio
**Odoo:** Contabilidade/Orçamentos + Vendas.

| | |
| --- | --- |
| **Fazemos melhor** | **Muito melhor.** SINAPI oficial com procedência e data, composição com custo ausente registrado, BDI e cenários. O Odoo não tem orçamento de obra — tem orçamento contábil de centro de custo. Aqui somos um produto e eles são uma planilha. |
| **Fazem melhor** | **Orçamento comprometido** = realizado + PO confirmado não faturado. É a ponte entre o orçamento e a compra que nós não temos. |
| **Complementa** | Distribuição analítica com percentuais somando a distribuição pretendida — permite um custo pertencer a duas obras. |
| **Trazer** | ⬤ **comprometido** · ◐ rateio percentual de um custo entre obras |

#### `financeiro` — Financeiro Operacional · 9 páginas · menu 100% próprio
**Odoo:** Contabilidade e Faturamento — **11 fórmulas, 16 relatórios**, o aplicativo mais denso do manual.

| | |
| --- | --- |
| **Fazemos melhor** | Medição como objeto do domínio, ligando avanço físico a direito de faturar. Não existe no Odoo e é o coração do financeiro de obra. |
| **Fazem melhor** | A lista é longa e honesta: **A Receber Vencido / A Pagar Vencido por idade**, **Fluxo de Caixa separado em operacional/investimento/financiamento**, **Resumo Executivo** (margem bruta, líquida, ROI, prazo médio), **Razão do Parceiro**, **Trilha de Auditoria contábil** com valor anterior e novo. Temos 9 páginas; eles têm 16 relatórios com pergunta declarada. |
| **Complementa** | **Diferimento por dias/meses** — receita e despesa reconhecidas por competência. Contrato de obra é exatamente isso e nós tratamos por caixa. |
| **Trazer** | ⬤ aging de receber e pagar · ⬤ fluxo de caixa em três atividades · ⬤ resumo executivo · ◐ diferimento por competência · ○ plano de contas completo (não somos contabilidade) |

#### `contratos` · 2 páginas · menu 40% · e `aditivos` · 2 páginas · menu 40%
**Odoo:** Assinaturas (4 fórmulas) + Vendas.

| | |
| --- | --- |
| **Fazemos melhor** | Aditivo como objeto próprio, com efeito em valor, escopo e prazo. No Odoo isso é alteração de pedido. Obra sem aditivo rastreável é obra sem defesa em disputa. |
| **Fazem melhor** | **MRR/ARR e ciclo de renovação** das Assinaturas — recorrência com data de próxima cobrança e churn. Contrato de manutenção predial é assinatura. |
| **Complementa** | Faturamento recorrente automático a partir do contrato. |
| **Trazer** | ◐ contrato recorrente para manutenção · ⬤ vigência com alerta de vencimento |

### 3.5 Documental e transversal

#### `documentos` · 2 páginas · 40% · `modelos` · 2 páginas · 67% · `assinaturas` · 3 páginas · 100%
**Odoo:** Documentos (12 procedimentos), Conhecimento (10), Assinar (5).

| | |
| --- | --- |
| **Fazemos melhor** | Liberação ao cliente com alçada, e a biblioteca única de modelos (`modelos`) que todo aplicativo lê — desenho melhor que o do Odoo, onde cada app tem seu próprio template. |
| **Fazem melhor** | **Solicitação de arquivo** (*file request*): o sistema pede o documento que falta a quem deve enviá-lo, e acompanha. E **versões com bloqueio**. Nossa gestão documental é passiva: guarda o que chega. |
| **Complementa** | *PDF split/merge* e alias de e-mail por pasta; **progresso de assinatura** = concluídos ÷ requeridos. |
| **Trazer** | ⬤ **solicitação de documento com cobrança e prazo** · ⬤ versão com bloqueio · ⬤ progresso de assinatura |

#### `sac` — Pós-venda · 3 páginas · menu 67% próprio
**Odoo:** Central de Ajuda (9 procedimentos, 3 fórmulas, 3 relatórios).

| | |
| --- | --- |
| **Fazemos melhor** | Ocorrência ligada à obra e ao cliente proprietário, com o portal já existente. |
| **Fazem melhor** | **SLA como política com prazo calculado**, `tempo até SLA` e `taxa de SLA`; **carga por agente** e autoatribuição por carga e especialidade. Assistência técnica sem SLA não tem como prometer prazo. |
| **Complementa** | Avaliação do cliente ligada ao atendimento; *merge* de chamado com CRM. |
| **Trazer** | ⬤ **SLA com prazo e indicador** · ⬤ carga por atendente · ⬤ avaliação pós-atendimento |

#### `rh` — 57 páginas · menu 100% próprio
**Odoo:** 10 aplicativos de RH (Folha 5 fórmulas, Ponto, Folgas, Recrutamento, Avaliações, Frota).

| | |
| --- | --- |
| **Fazemos melhor** | eSocial e a folha brasileira. Os 10 aplicativos deles não resolvem obrigação acessória brasileira sem localização paga. |
| **Fazem melhor** | **Frota** como aplicativo — obra tem veículo e equipamento, e não temos onde pô-los. E **custo/hora** vindo do cadastro do funcionário (o mesmo pré-requisito de `equipes`). |
| **Complementa** | Recrutamento e avaliação; menos urgentes. |
| **Trazer** | ⬤ custo/hora no cadastro · ◐ frota e equipamento · ○ recrutamento (não é gargalo hoje) |

#### `whatsapp` · 4 páginas · menu **20% próprio** · `relatorios` · 10 páginas · 100% · `dashboard` · 5 páginas
**Odoo:** WhatsApp, Dashboards, Planilhas.

| | |
| --- | --- |
| **Fazemos melhor** | A ponte de IA com orçamento diário, trava por conversa e validação de citação é mais governada que a integração do Odoo. |
| **Fazem melhor** | **Filtro global** que altera a consulta de todas as visualizações vinculadas — um período escolhido uma vez vale para o painel inteiro. E o painel montado sobre planilha auditável, com a definição do KPI legível. |
| **Complementa** | *Snapshot* do painel: a foto do indicador na data, que é o que permite comparar. |
| **Trazer** | ⬤ filtro global no painel · ⬤ snapshot datado do indicador · ◐ definição de KPI legível ao usuário |

#### `auditoria` · 6 páginas · `administracao` · 10 páginas — ambos 100% próprio

| | |
| --- | --- |
| **Fazemos melhor** | 65 vacinas com prevenção executável, 43 validadores no CI, e a regra de prova por sabotagem. Não há equivalente no manual — a Parte 1 fala de método de auditoria, mas como disciplina humana, não como portão automático. |
| **Fazem melhor** | **Trilha de Auditoria contábil** com valor anterior e valor novo por campo. Nosso `write_audit` grava o evento, não o antes-e-depois. |
| **Complementa** | O `sudo()` e as *record rules* do mergulho XI.11 já renderam a VACINA-065 ontem — sete funções corrigidas. |
| **Trazer** | ⬤ antes-e-depois no registro de auditoria |

---

## 4. Visão global — o que a matriz diz quando lida de uma vez

Lendo as 25 linhas juntas, três coisas aparecem que nenhuma linha isolada mostra.

### 4.1 Falta um campo, e ele trava sete módulos

**Custo/hora por pessoa.** Aparece como pré-requisito em `equipes`, `diario`,
`planejamento`, `obras`, `financeiro`, `rh` e `orcamentos`. Todas as fórmulas de
custo de mão de obra do manual — Projeto, Planilhas de Horas, Serviço de Campo —
começam nesse campo. Sem ele, "custo da obra" só pode ser material e serviço
contratado, que é o que temos hoje.

É um campo. Ele destrava sete módulos. É o melhor retorno por esforço da matriz
inteira, e é a resposta técnica para *"está demorando muito para avançar"*.

### 4.2 Falta um estágio, e ele é onde mora o dinheiro da obra

A **rentabilidade em três colunas** do aplicativo Projeto — `Expected`,
`To Invoice`, `Invoiced` — separa o que foi prometido, o que virou direito e o
que virou fato. Nós temos duas pontas e não temos o meio.

O meio é a medição aprovada e não faturada. É o número que o dono da construtora
persegue em planilha todo mês. Hoje ele não existe em lugar nenhum do INNOV, e
não existe porque nunca foi modelado como estágio — só como transição.

### 4.3 Nossos relatórios respondem "o que aconteceu"; os deles também respondem "o que não aconteceu"

Dos 146 relatórios extraídos, uma família inteira é de ausência e atraso:
*Leads não atendidos*, *A Receber Vencido por idade*, *Atrasos no dashboard de
compras*, *Status de SLA*, *dead stock*. Nenhum dos nossos 10 relatórios é assim.

Relatório de ausência é o que faz o sistema **cobrar**, em vez de esperar. É a
diferença entre uma ferramenta que registra e uma que conduz — e é a crítica
mais dura que o manual faz ao que construímos.

---

## 5. Especificação de execução, com o mapa de linguagens

Conforme `MAPA-TECNOLOGICO.md` §36 (fases) e §37 (nenhuma linguagem nova sem
ADR). Nada aqui introduz linguagem nova.

| # | Peça | Linguagem / camada | Módulos atingidos | Integra por |
| --- | --- | --- | --- | --- |
| E1 | Custo/hora por integrante | SQL (migration) + TS (form) | equipes, rh, diario, planejamento, obras, financeiro, orcamentos | coluna em `team_members`/`employees`, lida por RPC de custo |
| E2 | Apontamento de hora no diário | SQL + TS | diario, obras, financeiro | `daily_log_activities` ganha horas e pessoa; custo derivado de E1 |
| E3 | Rentabilidade em três colunas | **SQL (view/RPC)** + TS | obras, financeiro, orcamentos, compras | RPC `project_profitability(org, project)` — leitura, sem escrita |
| E4 | Comprometido do orçamento | SQL (RPC) | orcamentos, compras, financeiro | soma PO confirmado não faturado na dimensão da obra |
| E5 | Lead time e chegada prevista | SQL + TS | compras, estoque, planejamento | campo no fornecedor; data derivada, não digitada |
| E6 | Quantidade prevista de estoque | SQL (RPC) | estoque, compras | em mãos + entradas − saídas, no horizonte |
| E7 | Relatórios de ausência | **Go (plano de execução)** + SQL | crm, compras, sac, financeiro, documentos | varredura agendada que produz pendência, não tela |
| E8 | SLA com prazo e indicador | SQL + TS | sac, whatsapp | política por tipo; prazo calculado, nunca digitado |
| E9 | Solicitação de documento | SQL + TS + Go (cobrança) | documentos, contratos, qualidade, rh | pedido com prazo; cobrança pelo plano de execução |
| E10 | Filtro global e snapshot de painel | TS | relatorios, dashboard | estado de filtro no servidor; snapshot datado em tabela |
| E11 | Probabilidade e receita rateada | SQL + TS | crm, propostas | probabilidade por etapa; previsão por período |
| E12 | Antes-e-depois na auditoria | SQL | auditoria, todos | `write_audit` passa a receber valor anterior |

**Por que Go em E7 e E9.** São varreduras periódicas que produzem pendência sem
usuário na frente — exatamente o que `apps/execution-plane` já faz para a fila de
mensageria, com a mesma disciplina de tentativa, backoff e classificação de
falha. Não é linguagem nova nem camada nova; é a segunda carga do plano que já
existe.

**Por que SQL em E3, E4 e E6.** São leituras derivadas de dado que já está no
banco. Calcular no TypeScript significaria trazer as linhas para fora para somar
— e é assim que nasce a página lenta. A `PROVA-POR-SABOTAGEM` vale: cada uma
precisa de um teste que reprove antes de valer.

**Ordem de execução, por dependência medida:** E1 → E2 → E3 é a espinha, porque
E3 não fecha sem E2 e E2 não fecha sem E1. E4 e E5 podem correr em paralelo com
E2. E7 depende de nada e entrega sozinho.

---

## 6. Como o inventário passa a ser governado

O diagnóstico da §1 aponta a correção, e ela não é "escrever melhor": é **separar
duas coisas que hoje estão no mesmo arquivo**.

| Documento | Responde | Ordenado por |
| --- | --- | --- |
| `MODULOS.md` (ampliado) | *o que este módulo é, tem, calcula, mostra e ainda lhe falta* | módulo |
| `INVENTARIO-DE-EXECUCAO.md` | *o que se faz agora, e em que ordem* | dependência |

A lógica de um módulo passa a morar **inteira** na página daquele módulo, com
seu estado medido, seus cálculos, seus relatórios, seus menus e sua lacuna
contra o manual. O inventário deixa de ser o dono da lógica e passa a ser a fila:
cada tarefa **aponta** para a seção do módulo, em vez de reescrevê-la.

### 6.1 O Marco é a unidade de conclusão, e é rótulo — não seção

*(corrigido em 11/08/2026, depois de eu ter errado o desenho)*

A primeira versão desta seção dizia que a correção era mover o achado novo para
junto do módulo a que pertence. **Estava errado**, e o erro é instrutivo: isso
resolve a coerência quebrando o foco — você para a sprint em curso para atender o
que acabou de chegar, que é exatamente o que a R4 original existia para impedir.

Posição física e dono lógico são coisas **diferentes**, e o desenho certo separa
as duas:

| Preocupação | Mecanismo | Protege |
| --- | --- | --- |
| Não interromper o que está em curso | achado novo vai para o **fim do arquivo** (R4) | o foco |
| Não perder de vista a que módulo pertence | a sprint declara **`Marco:`** | a coerência |
| Não dar por concluído o que ficou pendurado | o Marco **não fecha** com sprint aberta apontando para ele (R9) | a conclusão |

O **Marco é o objetivo global** — quase sempre *"finalizar o módulo X"*. A
**sprint é o conjunto de tarefas** para chegar lá, e um Marco costuma precisar de
várias. Ao terminar uma sprint, **antes de começar a próxima**, confere-se o
Marco: se sobrou sprint aberta ligada a ele — inclusive uma que acabou de chegar
no fim do arquivo —, o Marco continua aberto, e é nesse momento que se decide a
ordem e se o achado novo precisa de um passo anterior que o destrave.

Um passo de cada vez, módulo por módulo.

**A R9 tem portão, e ele foi provado por sabotagem.** `pnpm validate:inventory`
reprova Marco `concluído` com sprint aberta, sprint sem `Marco:` declarado, e
`Marco:` que não existe no registro. O cenário exato — fechar um Marco legítimo e
depois receber um achado novo no fim ligado a ele — foi executado: fecha com
`exit=0`, e a sprint nova derruba para `exit=1`. O validador também **avisa**
quais Marcos podem ser fechados na virada, sem fechá-los: isso é decisão de quem
conduz.

**Regra nova (R8), que faltava:**

> Tarefa de inventário não descreve a lógica do módulo. Ela **aponta** para a
> seção do módulo e diz o que fazer, em que ordem e com que evidência. Lógica
> repetida em dois lugares diverge em silêncio — é a mesma razão pela qual o
> Notion é índice e o repositório é fonte.

**A R8 ainda não tem portão, e isso está declarado.** O que é mecanicamente
verificável — que toda sprint da espinha cite o documento de origem — é pouco;
a regra real, *nenhuma tarefa introduz número ou regra de negócio que não exista
na seção do módulo*, exige comparar prosa com prosa, e eu não sei fazer isso
reprovar de forma honesta hoje. Fica como disciplina escrita, não como proteção,
até alguém provar um portão por sabotagem. Regra sem portão é acordo entre
pessoas — vale enquanto for lembrada, e o histórico deste repositório mostra que
não é muito tempo.

---

## 7. O que este documento não resolve

- **Não mediu o Odoo rodando.** Tudo aqui é confronto contra o manual, que é
  descrição. Onde o manual diz que um relatório existe, eu registrei que existe;
  não vi a tela.
- **Não há esforço estimado.** Nenhuma das 12 peças tem prazo, porque estimativa
  sem decomposição executada é chute — e a decomposição é a primeira tarefa de
  cada uma.
- **Os juízos de "fazemos melhor" são meus.** Estão argumentados e podem ser
  contestados um a um. Os que eu não consegui sustentar estão escritos como não
  sustentados — o caso de `tarefas`.
- **A aplicação das migrations da VACINA-065 continua pendente** (S-51), e é
  anterior a tudo isto em prioridade de risco.
