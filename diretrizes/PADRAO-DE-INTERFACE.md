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
