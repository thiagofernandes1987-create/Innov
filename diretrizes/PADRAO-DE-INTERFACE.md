# Padrão de interface — Innovar Platform

**Documento canônico:** sim
**Precedência:** abaixo de `UI-UX-PRO-MAX.md`, que define a intenção visual do produto. Este documento define a **estrutura**: quais visualizações existem, como um registro é apresentado e o que um módulo precisa ter para ser considerado pronto.

Motivo de existir: em 26 de julho de 2026 a revisão das telas reais concluiu que os módulos são rascunhos. A conclusão foi verificada, não é impressão. Este documento fixa o alvo para que "pronto" pare de ser opinião.

---

## 1. O diagnóstico que originou este documento

| # | Defeito | Como foi verificado |
|---|---|---|
| D1 | Nenhuma validação de CPF, CNPJ, CEP ou telefone | `app/actions/relationship.ts` grava `optional(data,"taxId")`; o campo é `<input name="taxId"/>`. Em produção passaram CPF de 10 dígitos, telefone `12982#2($($` e CEP `Usushe` |
| D2 | Erro de banco vazando para o usuário | Tela de Documentos exibe erro de embed ambíguo do PostgREST |
| D3 | Erro de configuração disfarçado de credencial inválida | Tela de login |
| D4 | Uma visualização por módulo — sempre tabela | Todos os 20 módulos |
| D5 | Pipeline sem arrastar e soltar | CRM |
| D6 | Planejamento sem cronograma | `work_breakdown_items` e `project_milestones` existem no banco e não têm tela |
| D7 | Orçamento sem entrada de item | Tela abre e permanece zerada |
| D8 | `favicon.ico` 404 | Console do navegador |

---

## 2. Fontes do padrão

Três fontes, todas legítimas e verificáveis:

1. **Documentação oficial do Odoo 19.0**, lida do repositório `odoo/documentation`, arquivo `content/applications/studio/views.rst`. O site `odoo.com` recusa leitura automatizada com 403; o conteúdo veio do fonte.
2. **Repositório companheiro oficial** do *Odoo 19 Development Cookbook, 6ª edição* — `PacktPublishing/Odoo-19-Development-Cookbook-6E`, publicado aberto pela editora. As citações de XML abaixo vêm do capítulo 9, que trata de visualizações.
3. **Cybrosys**, que distribui livros de Odoo gratuitamente.
4. **261 capturas da instância Odoo do próprio responsável** (`innovar1.odoo.com`), entregues em 26 de julho de 2026. Valem mais que a documentação em um ponto específico: mostram o produto configurado para *este* negócio, com as etapas reais — Medição, Projeto Executivo, Assinatura Executivo — e não o exemplo genérico do manual.

Cópias piratas de livros comerciais não foram usadas como fonte.

---

## 3. A regra central

> **Um mesmo registro é apresentado em várias visualizações, e quem escolhe é o usuário.**

É isto que separa um ERP de mercado de uma sequência de tabelas. No Odoo a escolha vive no `view_mode` da ação, e o capítulo 9 do livro oficial mostra a lista crescendo receita a receita até:

```xml
<field name="view_mode">list,kanban,calendar,graph,pivot,cohort,gantt,activity,map,form</field>
```

Cada nome ali é uma tela que o usuário alterna por um seletor, sobre **os mesmos dados e o mesmo filtro**.

### 3.1 Catálogo de visualizações

| Visualização | O que é | Quando é obrigatória |
|---|---|---|
| **Lista** | tabela com ordenação, agrupamento e edição em massa | sempre |
| **Formulário** | edição de um registro | sempre |
| **Kanban** | cartões em colunas por etapa; arrastar move de etapa | quando o registro tem ciclo de vida |
| **Calendário** | registros posicionados por data | quando o registro tem data |
| **Gantt** | barras em escala de tempo, com dependência | planejamento e cronograma |
| **Pivô** | agregação interativa em tabela cruzada | módulos de análise |
| **Gráfico** | barras, linhas, pizza | módulos de análise |
| **Atividade** | o que está agendado e vencendo | quando há acompanhamento |
| **Mapa** | posição geográfica | quando há endereço relevante |

A documentação do Odoo descreve o kanban como *"often used to support business flows by moving records across stages"* — é ferramenta de trabalho, não relatório. O pivô é *"used to explore and analyze the data contained in records in an interactive manner"*.

---

## 4. Painel de controle

Toda tela de módulo tem, no topo, a mesma estrutura:

- **caminho de navegação** — onde estou e como volto;
- **seletor de visualização** — alterna entre as visões da seção 3;
- **busca com filtros e agrupamentos**, aplicada por cima de qualquer visualização;
- **painel lateral de filtros** para as facetas de uso frequente. No livro oficial:

```xml
<searchpanel>
  <field name="state" expand="1" select="multi" icon="fa-check-square-o" enable_counters="1"/>
</searchpanel>
```

O `enable_counters` importa: o filtro mostra quantos registros existem em cada opção antes de o usuário clicar.

- **ações em massa** sobre a seleção.

---

## 5. Formulário

Estrutura fixa, de cima para baixo:

```xml
<form>
  <header>
    <field name="state" widget="statusbar"/>   <!-- etapas clicáveis -->
  </header>
  <sheet>
    <div class="oe_button_box">…</div>          <!-- contadores navegáveis -->
    <div class="oe_title">…</div>
    <group>…</group>
    <notebook>
      <page string="…" name="…">…</page>        <!-- abas para seções longas -->
    </notebook>
  </sheet>
  <chatter/>                                    <!-- conversa lateral -->
</form>
```

- **Barra de etapas** no cabeçalho: mostra o ciclo inteiro e permite avançar. `widget="statusbar"` aparece 78 vezes no livro oficial.
- **Botões de estatística** levam do registro para o que se relaciona a ele — contratos, chamados, obras — em vez de exibir um número morto.
- **Abas** quando o formulário passa de uma tela.
- **Conversa lateral** (`<chatter/>`, 19 ocorrências): mensagens, notas internas, atividades agendadas, anexos e seguidores. No Odoo isso não é construído por tela — é herdado por `mail.thread` (31 ocorrências) e `mail.activity.mixin` (22). **Na Innovar deve ser um componente único, reusado por todos os módulos.**

---

## 6. Campos são componentes, não `<input>` cru

Esta é a resposta direta ao defeito D1.

No Odoo, telefone e e-mail não são caixas de texto: são widgets. `widget="phone"` aparece **182 vezes** no livro oficial e `widget="email"` **91 vezes**. O widget formata, valida e oferece a ação — ligar, escrever.

A Innovar adota o mesmo princípio, com os tipos brasileiros:

| Campo | Componente | Regra |
|---|---|---|
| CPF | `<CampoCPF>` | máscara e **dígito verificador**, não só formato |
| CNPJ | `<CampoCNPJ>` | máscara e dígito verificador |
| CPF/CNPJ | `<CampoDocumento>` | alterna conforme pessoa física ou jurídica |
| CEP | `<CampoCEP>` | formato e preenchimento de endereço |
| Telefone | `<CampoTelefone>` | DDD válido, celular e fixo |
| E-mail | `<CampoEmail>` | verificação no servidor, não só `type="email"` |
| Moeda | `<CampoMoeda>` | separador brasileiro, sem perda de precisão |

Três regras inegociáveis:

1. **Validação no servidor também.** O navegador orienta; quem recusa é a ação. Formulário é conveniência, não controle — a mesma lógica pela qual a escrita de registro do Object Runtime passa por RPC.
2. **Erro no campo, não faixa no topo.** A mensagem aparece onde o dado está errado.
3. **Nenhum erro técnico chega ao usuário.** Erro de banco, de rede ou de configuração vira mensagem que orienta. O D2 e o D3 são exatamente isto.

---

## 7. Definition of Done de um módulo

Um módulo só é considerado pronto quando:

- [ ] tem lista **e** ao menos uma segunda visualização adequada ao que ele representa;
- [ ] tem painel de controle com caminho de navegação, seletor de visão e busca com filtros;
- [ ] o formulário segue a estrutura da seção 5, com conversa lateral;
- [ ] todo campo de documento, contato, data ou moeda usa o componente da seção 6;
- [ ] a validação recusa no servidor, com erro no campo;
- [ ] nenhum erro técnico é exibido ao usuário;
- [ ] o estado vazio explica o que fazer, em vez de só dizer que não há nada;
- [ ] a tela funciona em telefone — as capturas que originaram este documento foram tiradas em telefone;
- [ ] `diretrizes/UI-UX-PRO-MAX.md` e a skill `ui-ux-pro-max` foram aplicadas.

---

## 8. Ordem de adoção

Refazer 20 módulos de uma vez é como se perde o controle da qualidade. A ordem é:

1. **Componentes de campo** da seção 6 — servem a todos os módulos e resolvem o defeito mais grave.
2. **Um módulo piloto: CRM.** É onde o problema mais aparece — pipeline estático, cadastro sem validação. Ele vira o molde.
3. **Os demais**, replicando o molde, com o vocabulário genérico da sprint S-20 aplicado na mesma passagem — para não refazer a mesma tela duas vezes.

Detalhe da execução em `INVENTARIO-DE-EXECUCAO.md`, sprint S-23.

---

## 9. Pipeline: o que as capturas mostram e o que a plataforma copia

Leitura das 261 capturas da instância do responsável. Não é impressão geral: cada item abaixo aparece em captura identificada.

### 9.1 Estrutura da tela

| Faixa | O que tem | Captura |
|---|---|---|
| Barra do aplicativo | Nome do app à esquerda e **menus do app ao lado dele** — `Projects · Tasks · Reporting · Configuration`; à direita, atividades, conversas, relógio e usuário | `odoo-project-1-tasks` |
| Painel de controle | `New` à esquerda, **caminho de navegação** (`Projects / Teste`) com engrenagem de configuração, busca ao centro, **seletor de visualização à direita** | idem |
| Seletor | Ícones lado a lado — kanban, lista, mapa, calendário, mapa, atividade, pivô, gráfico. Sete a nove por módulo | `odoo-crm` |
| Painel lateral de busca | No app de Aplicativos, `APPS` e `CATEGORIES` **com contador por categoria** | `odoo-apps` |

### 9.2 Coluna do kanban

- Título, **barra de progresso** e **total da coluna** (`R$ 0` no CRM, contagem no Projeto).
- `+` no cabeçalho para criar cartão **direto na etapa**, sem sair da tela.
- Engrenagem da coluna com `Fold · Edit · Automations · Delete` — a etapa é configurável pelo usuário, inclusive **recolhida** (`Fold`).
- Ao fim das colunas, um campo `Stage…` que **cria etapa nova ali mesmo**.

Consequência para a plataforma: etapa é dado, não esquema. Uma etapa que se cria digitando o nome não pode exigir migration. É por isso que `pipeline_stages` é tabela e as listas do responsável são *preset*, não `CHECK`.

### 9.3 Cartão

Título, subtítulo com o cliente, **estrelas de prioridade (0 a 3)**, relógio de atividade, faixa de cor da etiqueta e avatar do responsável. No Helpdesk, o cartão mostra ainda o **código do chamado** e a **contagem regressiva do prazo** — `In 3 days`, `13d`, `42d`.

É o lugar de DLA e DLE: prazo que só aparece ao abrir o registro é prazo que ninguém cumpre.

### 9.4 Formulário

- **Barra de etapas em galhardetes** no topo, clicável, com o **tempo na etapa corrente** ao lado do nome (`New 9m`).
- Botões de estatística no topo do cadastro de contato — `Opportunities · Sales · Invoiced · Subscriptions · Meetings · Tasks · Tickets · More` — cada um abre os registros relacionados.
- Abas para seções longas: `Contacts · Sales & Purchase · Accounting · Notes`.
- **Conversa como coluna à direita**, não como rodapé: `Send message · Log note · WhatsApp · Activity`, com histórico datado.
- `Schedule Activity` como diálogo, com tipos `To-Do · Email · Call · Meeting · Document · Request Signature`.

O pedido do responsável — *"ao clicar no card resumido abre o card completo do cliente… uma aba com dados, outra com os projetos, outra com os documentos, e ao clicar abre o objeto referente"* — é exatamente isto: abas para o que é do próprio registro, botões de estatística para o que é de outro objeto.

### 9.5 Datas: dois eixos, não dez colunas

As dez siglas declaradas não são dez campos. São duas dimensões:

| | Início | Término | Entrega | Agendamento | Assistência |
|---|---|---|---|---|---|
| **Prevista** | DPI | DPT | DPE | DPA | — |
| **Efetiva** | DEI | DET | DEE | DEA | — |
| **Limite** | — | — | DLE | — | DLA |

Guardadas como `(natureza, marco)`, a sigla é derivada e a combinação que ainda não existe — data limite de início, por exemplo — nasce sem migration. O catálogo vive em dois lugares, `lib/pipeline/datas.ts` e a função `pipeline_codigo_data`, e `pnpm validate:pipeline` reprova qualquer divergência entre eles.

Cada etapa declara **que datas exibe e quais exige** (`pipeline_stage_date_codes`). Toda etapa exibe previsto e efetivo de início e término: é dessas quatro que o Gantt é feito.

### 9.6 O que a plataforma faz diferente

| Odoo | Innovar | Por quê |
|---|---|---|
| Etapa por app (`crm.stage`, `project.task.type`, `helpdesk.stage`) | Uma tabela, com `trilha` distinguindo cliente, projeto e assistência | Três tabelas quase iguais é três vezes a mesma correção |
| Cartão *é* o registro | Cartão **aponta** para cliente, projeto ou chamado | Kanban que copia dado envelhece: o cadastro muda e o cartão segue mostrando o telefone antigo |
| Prazo como campo solto | Prazo como `(natureza, marco, data)` com sigla derivada | Dez colunas fixas exigiriam migration na primeira data nova |

---

## 10. Anatomia das telas — leitura das 261 capturas

Segunda passagem sobre o material do responsável, agora cobrindo **12 telas de 8 aplicativos**: Aplicativos, Configurações, CRM, Projeto, Helpdesk, Contatos, Compras e Agendamentos. Cada item abaixo tem captura de origem identificada. O que a seção 9 descreveu do pipeline, esta descreve do resto da casca.

### 10.1 Três faixas fixas, sempre na mesma ordem

```
┌ barra do aplicativo ─ ícone · nome do app · MENUS DO APP · … · notificações · empresa · usuário
├ painel de controle ─ [Novo] caminho/de/navegação ⚙ · busca · paginação · seletor de visão
└ conteúdo ─────────── a visualização escolhida
```

O que muda de app para app é só o conteúdo. **Os menus do aplicativo ficam na barra de cima, ao lado do nome** — `Projects · Tasks · Reporting · Configuration`, `Orders · Products · Reporting · Configuration`, `Overview · Tickets · Reporting · Configuration`. Repare no padrão: **todo app termina com `Reporting` e `Configuration`**. Um app sem esses dois é um app que não se mede nem se ajusta.

A paginação (`1-2 / 2` com setas) fica **à esquerda do seletor de visão**, no mesmo canto. Não no rodapé.

### 10.2 Configurações

Uma tela para todos os aplicativos, não uma tela por aplicativo:

- **Barra lateral esquerda** listando os apps instalados; clicar rola até a seção dele.
- **Faixas de seção** com o nome do bloco (`CRM`, `Lead Generation`).
- Cada ajuste é **caixa de seleção + título + descrição em uma frase**. A descrição não é enfeite: é ela que faz o ajuste ser compreensível sem manual.
- Ajuste ligado **revela sub-opções** logo abaixo (`Enrich leads on demand only` / `Enrich all leads automatically`).
- **`Salvar` e `Descartar` no painel de controle**, não no fim da página: a tela é longa e a mudança pode estar em qualquer altura.

### 10.3 Painel do módulo (`Overview`)

O Helpdesk abre em painel, não em lista. A estrutura é uma **matriz**: rótulos de linha à esquerda, métricas como colunas.

| | Chamados | Alta prioridade | Urgente |
|---|---|---|---|
| **Em aberto** | 10 | 3 | 2 |
| **Horas médias em aberto** | 30h | 10h | 15h |
| **Estourados** | 4 | 2 | 1 |

Abaixo, **um cartão por equipe** com nome, e-mail, botão primário e um rodapé de quatro contadores — `Em aberto · Sem responsável · Urgente · Estourado`. **Todo número é um link.** Número que não abre nada é número que ninguém confere.

Detalhe de honestidade que vale copiar: dado de demonstração vem com **faixa diagonal escrito `SAMPLE`** no canto. Ninguém confunde ensaio com operação.

### 10.4 Formulário com linhas — a resposta ao defeito D7

O pedido de cotação de Compras é o molde do que falta no Orçamento:

- **Cabeçalho:** ações primárias à esquerda (`Enviar · Confirmar · Imprimir · Cancelar`), barra de etapas em galhardetes à direita (`RFQ › Purchase Order`).
- **Título:** rótulo pequeno do tipo de documento, estrela de favorito, e o nome em corpo grande e editável.
- **Grupo em duas colunas**, com `?` de ajuda ao lado do rótulo do campo.
- **Grade de linhas editável** com colunas `Produto · Quantidade · Preço unitário · Impostos · Valor`, e **três ações inline logo abaixo do cabeçalho da grade**:
  - `Adicionar produto` — a linha de item;
  - `Adicionar seção` — título que agrupa as linhas seguintes;
  - `Adicionar nota` — texto livre entre as linhas.
- **Engrenagem no canto da grade** liga e desliga colunas opcionais.
- **Alternador `Sem imposto` / `Com imposto`** acima da grade.
- **Totais alinhados à direita**, abaixo da grade; termos e condições à esquerda, na mesma faixa.

Seção e nota dentro da grade são exatamente o que um orçamento precisa — e `budget_sections` já existe no banco desde a etapa 12, sem tela.

### 10.5 Cartões de kanban, por tipo de registro

| Registro | O que o cartão mostra |
|---|---|
| Oportunidade | título, cliente, estrelas, relógio de atividade, avatar, **valor por coluna somado no cabeçalho** |
| Tarefa | título, cliente, estrelas, relógio, faixa de cor da etiqueta, avatar |
| Chamado | **código do chamado**, cliente, etiquetas, estrelas, **contagem regressiva do prazo** |
| Projeto | estrela de favorito, responsável, **intervalo de datas com seta** (`Aug 30 → Aug 15`), e-mail, etiqueta, rodapé com contagem de tarefas |
| Contato | nome, e-mail com ícone, cidade com ícone, contador, logo à direita |

O intervalo com seta no cartão de projeto resolve em uma linha o que uma tabela gastaria duas colunas.

### 10.6 Estado vazio

Ilustração, frase de ação (`No projects found. Let's create one!`) e uma linha explicando para que serve o registro. Ao fundo, **os cartões de exemplo aparecem esmaecidos** — a pessoa vê a forma do que vai criar antes de criar.

### 10.7 O que isto muda no plano da S-23

| Defeito | O que a leitura das capturas define |
|---|---|
| D4 — uma visão por módulo | Seletor no canto direito do painel de controle, com paginação à esquerda dele; `Reporting` e `Configuration` em todo menu de app |
| D5 — pipeline estático | Resolvido em `T-23.13`: coluna com contagem e soma, cartão com prazo, arrastar entre etapas |
| D6 — planejamento sem cronograma | Intervalo previsto × efetivo já está em `pipeline_card_dates`; o Gantt lê DPI/DPT/DEI/DET |
| D7 — orçamento não recebe dados | Grade editável com `adicionar item`, `adicionar seção` e `adicionar nota`, totais à direita, colunas opcionais por engrenagem |
| — | Painel de módulo em matriz, com todo número clicável, antes da lista |
| — | Tela única de Configurações, com barra lateral de apps e `Salvar`/`Descartar` no topo |

---

## 11. A tese do responsável, conferida contra o conjunto

Em 26 de julho de 2026 o responsável renomeou 26 capturas com comentários e enunciou a tese:

> *"repare como tudo é padronizado, todas as visualizações tipo kanban, listas, onde tem pipeline segue o mesmo padrão, **o que você faz para um se aplica a quase todos**"*
>
> *"repare os padrões do card, como eles reaproveitam quase tudo do layout e acrescentam alguns objetos, porém tudo é parecido e semelhante, **só mudam algumas coisas conforme a tarefa da pessoa** que realiza a atividade e precisa de campos específicos"*

### 11.1 Como a conferência foi feita — e o que ela não é

As 261 capturas foram **enumeradas por aplicativo a partir da rota no nome do arquivo**, o que cobre o conjunto inteiro:

| Aplicativo | Capturas |
|---|---|
| Helpdesk | 46 |
| Sign | 39 |
| Project | 39 |
| CRM | 27 |
| Ações diversas (`action-N`) | 27 |
| Contacts | 25 |
| Purchase | 19 |
| Settings | 12 |
| Appointments / Calendar | 13 |
| Discuss, Users, Companies, Apps, Tasks | 5 |
| Avulsas | 9 |

**Dezoito** foram abertas e lidas em detalhe, escolhidas para cobrir ao menos uma tela de cada aplicativo e cada tipo de visualização. **Não foi uma comparação imagem a imagem das 261** — dizer o contrário seria inventar rigor. A enumeração é completa; a leitura é por amostra dirigida.

### 11.2 A tese confere

Cada elemento que o responsável nomeou, e em que aplicativo foi confirmado:

| Elemento | Onde foi confirmado | Confere? |
|---|---|---|
| Barra do app com menus próprios, terminando em Relatórios e Configuração | CRM, Project, Helpdesk, Purchase, Sign, Calendar, Contacts | **sim**, sem exceção |
| Canto direito com mensagens, notificações, estúdio e usuário | todos os aplicativos | **sim** |
| Seletor de visualização à direita, com paginação à esquerda dele | CRM, Project, Helpdesk, Contacts | **sim** |
| Coluna de kanban com `+` para criar cartão e engrenagem no hover | CRM, Project, Helpdesk | **sim** |
| Criar etapa digitando o nome no fim das colunas | CRM, Project | **sim** |
| Barra de etapas em galhardetes, com tempo na etapa | Helpdesk, CRM, Project, Purchase | **sim** |
| Conversa lateral: mensagem, nota, WhatsApp, atividade | Helpdesk, CRM, Project, Contacts, Appointments | **sim** |
| Abas para seções longas | Contacts, Purchase, Project, Appointments | **sim** |
| Botões de estatística que abrem objetos relacionados | Contacts, Project, Appointments | **sim** |
| Grade de linhas editável com item, seção e nota | Purchase, Appointments (`Add a line`) | **sim** |

Dez elementos, nenhum desmentido. A frase *"o que você faz para um se aplica a quase todos"* é literal: o Appointments, que é um aplicativo de agenda, tem a **mesma** casca do Purchase, que é de compras — muda o miolo do formulário, não a estrutura.

### 11.3 Onde a tese tem exceção

O responsável escreveu "quase todos", e a ressalva dele está certa. Uma tela do conjunto quebra o padrão: **Sign → Green Savings** (`action-479`) é um relatório de fundo claro, sem conversa lateral, sem seletor de visualização e sem barra de etapas — seis cartões de indicador e um link.

O que isso ensina: **página de leitura pura pode sair do molde**; página onde se trabalha, não. A exceção é a confirmação da regra, e vale registrá-la para ninguém usar o Green Savings como argumento para quebrar o padrão em uma tela operacional.

### 11.4 O que a Innovar já segue, e o que falta

| Elemento | Innovar hoje |
|---|---|
| Barra do app com logotipo que volta à grade | **feito** |
| Canto direito com usuário e tema | **parcial** — falta mensagens, notificações e configuração |
| Grade de aplicativos por permissão | **feito** |
| Cor por aplicativo na grade | **feito** |
| Seletor de visualização | **só no pipeline**, e com duas visões das nove |
| Kanban com contagem, soma e coluna recolhida | **feito** |
| Criar etapa e cartão pela própria coluna | **falta** |
| Barra de etapas com tempo na etapa | **parcial** — move, mas não mostra o tempo |
| Conversa lateral com mensagem, nota, WhatsApp e atividade | **parcial** — só observação e histórico |
| Botões de estatística | **feito** no cartão do pipeline |
| Abas | **feito** no cartão do pipeline |
| Grade de linhas com item, seção e nota | **falta** — é o defeito D7 do orçamento |
| Menus por aplicativo na barra superior | **falta** (T-23.21) |

### 11.5 A consequência de método

Se o que se faz para um se aplica a quase todos, então **construir por módulo é o erro**. O certo é construir o molde uma vez — casca, painel de controle, seletor de visão, cartão, formulário, conversa — e cada módulo declarar só o que tem de específico.

É a mesma regra do Object Runtime, aplicada à interface: composição de características declaradas, não vinte telas escritas à mão que precisam ser corrigidas vinte vezes.
