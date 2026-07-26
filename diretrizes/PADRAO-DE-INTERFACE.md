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
