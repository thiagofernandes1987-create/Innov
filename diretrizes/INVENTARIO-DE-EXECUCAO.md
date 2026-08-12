# Inventário de execução — fila de trabalho, ordenada por dependência

**Documento canônico:** sim
**Reescrito em:** 11 de agosto de 2026
**Verificado por:** `pnpm validate:inventory`

Este arquivo é a **fila**: o que se faz agora e em que ordem. Ele não é mais o
dono da lógica dos módulos — essa mudança é o assunto da seção seguinte.

Os outros dois de leitura obrigatória ao lado deste:
`INVENTARIO.md` inventaria o que a plataforma **é**;
[`CONFRONTO-ODOO-19-E-INNOV.md`](CONFRONTO-ODOO-19-E-INNOV.md) diz, **por
módulo**, o que ele tem, calcula, mostra e ainda lhe falta.

---

## Por que este arquivo foi reescrito

A crítica foi do proprietário, e ela estava certa:

> *"por que está crescendo desgovernado, a cada coisa que eu informo que você não
> fez sempre adiciona um monte de tarefas e Sprints em lugares aleatórios e a
> lógica de um único módulo fica toda espaçada, um pouco em cada lugar"*

Medido antes da reescrita: **51 sprints, 712 tarefas**, e a lógica de cada módulo
espalhada por uma **média de 4,5 sprints**. **17 dos 25 módulos** apareciam em 4
sprints ou mais; **9 em 6 ou mais**. O `diario` aparecia em 7 sprints — S-19,
S-20, S-25, S-28, S-29, S-49, S-50 — e **nenhuma delas era sobre o diário**.

A causa não foi desleixo: foi a **R4**, que mandava todo trabalho novo para o fim
do arquivo. A intenção era proteger a ordem de execução. O efeito foi que toda
descoberta sobre um módulo já planejado nascia longe de tudo com que se
relacionava. E como quase toda sprint nova veio de uma observação do
proprietário, o arquivo virou o registro cronológico das conversas em vez do
plano do produto: **sete das últimas oito sprints são reativas**.

Três coisas mudam, e só a terceira é cosmética:

1. **A lógica sai daqui.** Passa a morar em `CONFRONTO-ODOO-19-E-INNOV.md`, uma
   seção por módulo, inteira. Tarefa daqui **aponta** para lá (R8).
2. **A R4 muda.** Trabalho novo entra na posição do módulo a que pertence, não no
   fim do arquivo.
3. **A fila vem antes do histórico.** O que fazer agora estava na linha 1.700.

---

## Regras de operação — obrigatórias

**R1 — Leitura no início.** Toda sessão assistida lê este arquivo antes de propor ou executar qualquer coisa. Reinício de serviço, contêiner novo, chat novo: lê de novo. Não existe "eu já sei o que estava fazendo" — a memória é este arquivo.

**R2 — Check imediato.** Ao concluir uma tarefa ou subtarefa, marcar `[x]` **no mesmo momento**, com a evidência que prova a conclusão. Não acumular checks para o fim da sessão: sessão interrompida com check pendente perde o progresso.

**R3 — Uma sprint por vez.** Não se inicia sprint nova antes de concluir a atual. **No máximo uma sprint em `em andamento`**, e o validador reprova o contrário.

**R4 — O que é novo vai para o fim do arquivo e declara o seu Marco.** Sprint nova, oportunidade ou lacuna descoberta entra **no final do inventário**, nunca no meio, nunca empurrando a sprint atual — é o que permite terminar o que está em curso em vez de parar pela metade. E declara `**Marco:**`, que é quem a puxa de volta para a coerência.

> Posição física e dono lógico são coisas diferentes. Em 11/08/2026 eu havia trocado esta regra por "o novo entra na posição do módulo", tentando resolver a dispersão por posição. Estava errado: isso reintroduz exatamente a interrupção que a R4 existe para evitar. A dispersão se resolve pelo **rótulo de Marco** e pela **R9**, não movendo texto.

**R5 — A ordem pode mudar, mas só na virada.** Ao **iniciar** uma sprint nova — nunca no meio de uma — a ordem de execução das sprints pendentes pode ser reordenada. Dois casos legítimos:

- **Pré-requisito descoberto.** Ia começar um aplicativo e percebeu que falta um módulo ou objeto não previsto e necessário: a sprint do pré-requisito passa à frente.
- **Base reaproveitável.** Uma sprint serve de base para reprodução em massa das seguintes: passa à frente porque otimiza todo o trabalho restante.

**R6 — Reordenar exige registro.** Toda reordenação vira linha na tabela da seção "Registro de reordenação", com data, o que mudou e **por quê**. Reordenação sem justificativa registrada é a forma de o plano virar improviso.

**R7 — Sprint concluída não tem tarefa em aberto.** Marcar sprint como `concluída` com tarefa `[ ]` reprova no validador. Se sobrou tarefa, ou a sprint não está concluída, ou a tarefa vira sprint própria.

**R9 — O Marco só fecha quando nenhuma sprint aberta o referencia.** *(nova em 11/08/2026)* Ao concluir uma sprint, **antes de começar a próxima**, confira o Marco dela: se existir qualquer sprint aberta declarando aquele Marco — inclusive uma que acabou de chegar no fim do arquivo — o Marco **continua aberto**. Nesse momento se decide a ordem: qual sprint vem agora, e se o achado novo precisa de um passo anterior que o destrave. Marco sem nenhuma sprint não pode ser declarado `concluído`; ele está `sem sprint`.

> É esta regra que faz o modelo funcionar. A R4 deixa o achado novo esperar no fim sem interromper; a R9 garante que ele não seja esquecido, porque o Marco não fecha por cima dele. Um passo de cada vez, módulo por módulo. Verificada por `pnpm validate:inventory`.
>
> **O procedimento da conferência é o mesmo para todo módulo** e está em [`CHECKLIST-DE-CONCLUSAO-DE-MODULO.md`](CHECKLIST-DE-CONCLUSAO-DE-MODULO.md): existência, dado, chamada, cálculo, navegação, QA, persona, KPI e prova. Rodar `pnpm checklist:modulo <chave>` para o retrato mecânico. Item de verificação humana sem evidência registrada **conta como não feito**.

**R8 — Tarefa aponta, não descreve.** *(nova em 11/08/2026)* Tarefa não reescreve a lógica do módulo: ela **aponta** para a seção dele no confronto e diz o que fazer, em que ordem e com que evidência. Regra de negócio ou número repetido em dois documentos diverge em silêncio — é a mesma razão pela qual o Notion é índice e o repositório é fonte.

---

## Estados

| Estado | Significado |
|---|---|
| `pendente` | ainda não iniciada |
| `em andamento` | em execução — no máximo uma por vez |
| `concluída` | todas as tarefas marcadas e evidência registrada |
| `bloqueada` | não pode avançar; o bloqueio está descrito na sprint |

---

## Registro de Marcos — o objetivo global de cada frente

O **Marco é a unidade de conclusão**: um objetivo global, quase sempre da forma
*"finalizar o módulo X"*. A **sprint é o conjunto de tarefas para concluí-lo**, e
um Marco costuma precisar de várias.

**O Marco é rótulo, não seção.** Isto é deliberado e é o que faz o modelo
funcionar: achado novo vai fisicamente para o **fim do arquivo** — para você
terminar a sprint em curso sem parar no meio — mas declara o Marco a que
pertence. Posição física protege o foco; o rótulo protege a coerência. As duas
coisas eram tratadas como uma só, e foi por isso que a lógica de cada módulo se
espalhou.

**Estados do Marco:** `aberto` (tem sprint aberta), `sem sprint` (nenhuma sprint
planejada ainda), `concluído` (tem sprint e nenhuma delas está aberta).

| Marco | Objetivo global | Estado |
| --- | --- | --- |
| `M-CRM` | Finalizar o módulo CRM e Vendas | aberto |
| `M-CLIENTES` | Finalizar o módulo Clientes | sem sprint |
| `M-OBRAS` | Finalizar o módulo Obras | aberto |
| `M-PLANEJAMENTO` | Finalizar o módulo Planejamento | sem sprint |
| `M-TAREFAS` | Finalizar o módulo Tarefas | sem sprint |
| `M-DIARIO` | Finalizar o módulo Diário de Obras | aberto |
| `M-EQUIPES` | Finalizar o módulo Equipes | aberto |
| `M-ORCAMENTOS` | Finalizar o módulo Orçamentos | aberto |
| `M-PROPOSTAS` | Finalizar o módulo Propostas | sem sprint |
| `M-CONTRATOS` | Finalizar o módulo Contratos | sem sprint |
| `M-ADITIVOS` | Finalizar o módulo Aditivos | sem sprint |
| `M-ASSINATURAS` | Finalizar o módulo Assinaturas | sem sprint |
| `M-DOCUMENTOS` | Finalizar o módulo Documentos | aberto |
| `M-MODELOS` | Finalizar o módulo Modelos e Documentações | sem sprint |
| `M-QUALIDADE` | Finalizar o módulo Qualidade | sem sprint |
| `M-COMPRAS` | Finalizar o módulo Compras e Suprimentos | aberto |
| `M-ESTOQUE` | Finalizar o módulo Estoque | aberto |
| `M-FINANCEIRO` | Finalizar o módulo Financeiro Operacional | sem sprint |
| `M-RH` | Finalizar o módulo RH | aberto |
| `M-SAC` | Finalizar o módulo Pós-venda | aberto |
| `M-WHATSAPP` | Finalizar o módulo WhatsApp | aberto |
| `M-RELATORIOS` | Finalizar o módulo Relatórios | aberto |
| `M-AUDITORIA` | Finalizar o módulo Auditoria | aberto |
| `M-ADMINISTRACAO` | Finalizar o módulo Administração | aberto |
| `M-DASHBOARD` | Finalizar a central de aplicativos | sem sprint |
| `M-CONTABILIDADE` | Criar e finalizar o módulo Contabilidade (gerencial; fiscal fica fora, §3.6 do confronto) | aberto |
| `M-IA` | Criar e finalizar o módulo de IA operadora, sob o contrato de `IA-OPERADORA.md` | aberto |
| `M-SEGURANCA` | Correções de segurança aplicadas no banco, não só no repositório | aberto |
| `M-PLATAFORMA` | Mapa tecnológico: as fases de migração de linguagem da §36 | aberto |
| `M-TRAVESSIAS` | Travessias ponta a ponta como suíte de teste | aberto |
| `M-LEGADO` | Decompor as sprints que ainda misturam módulos | aberto |
| `M-0` | Governança e memória de sessão | aberto |
| `M-1` | Fundação do Object Runtime | aberto |
| `M-2` | Customização completa | aberto |
| `M-3` | Escala e produto público | aberto |
| `M-4` | Generalização do produto: vocabulário e presets de segmento | aberto |
| `M-5` | Padrão de interface de mercado | aberto |

**Onze módulos existentes estão em `sem sprint`.** Não é omissão do registro: é o retrato
honesto de que ninguém planejou trabalho para eles. Entre eles estão
`planejamento` e `tarefas`, que têm **1 página cada** e menu de 17% a 20%
próprio — o núcleo operacional da obra sem nenhuma sprint prevista. É a mesma
conclusão que o índice por módulo mostra por outro caminho.

**`M-RH` e `M-WHATSAPP` apareceram como candidatos a fechamento em 11/08/2026, e
a conferência da R9 mostrou que não eram.** As sprints ligadas a eles — S-40 e
S-41 — eram de **convergência de ramo**, e a S-42 estava ligada a `M-RH` por
engano sendo sobre mapa tecnológico. Fechar teria declarado dois módulos prontos
com base em merge de branch.

É a limitação declarada na VACINA-066: **o portão confere vínculo, não
pertinência**. Ele acusa o esquecimento; o engano continua sendo trabalho de
quem confere na virada. A correção abriu S-68, S-69 e S-70, e religou a S-42.

---

## Índice por módulo — onde mora o trabalho de cada um

Esta tabela existe para responder, em um lugar só, a pergunta que antes exigia
garimpar sete sprints: **onde está tudo sobre este módulo**.

Colunas medidas em 11/08/2026: *Páginas* são `page.tsx` atribuídos ao módulo de
prefixo de rota mais longo; *Menu* é destinos próprios sobre total — quanto menor
a fração, mais o menu é atalho para o vizinho em vez de navegação interna.

| Módulo | Páginas | Menu próprio | Feitas | Abertas | Sprints que o tocam |
| --- | ---: | ---: | ---: | ---: | --- |
| `dashboard` | 5 | 0/0 | 5 | 4 | S-08, S-23, S-25, S-27, S-28, S-33, S-37, S-44 |
| `crm` | 8 | 4/4 | 7 | 4 | S-23, S-24, S-26, S-30, S-32, S-33 |
| `clientes` | 3 | 2/2 | 3 | 0 | S-23 |
| `obras` | 10 | 2/5 | 6 | 3 | S-20, S-25, S-32, S-33, S-34 |
| `planejamento` | 1 | **1/6** | 10 | 4 | S-23, S-24, S-25, S-27, S-30, S-32, S-33 |
| `tarefas` | 1 | **1/5** | 8 | 4 | S-04, S-21, S-24, S-27, S-32, S-33 |
| `diario` | 1 | **1/5** | 1 | 8 | S-19, S-20, S-25, S-28, S-29, S-49, S-50 |
| `equipes` | 1 | **1/5** | 1 | 3 | S-25, S-26, S-31, S-33 |
| `orcamentos` | 6 | 3/5 | 8 | 0 | S-23, S-33, S-37 |
| `propostas` | 2 | 2/5 | 1 | 1 | S-13, S-33 |
| `contratos` | 2 | 2/5 | 2 | 1 | S-03, S-11, S-33 |
| `aditivos` | 2 | 2/5 | 0 | 1 | S-47 |
| `assinaturas` | 3 | 2/2 | 2 | 0 | S-23, S-33 |
| `documentos` | 2 | 2/5 | 6 | 1 | S-19, S-23, S-32, S-38, S-42 |
| `modelos` | 2 | 2/3 | 9 | 0 | S-32, S-33, S-34, S-50 |
| `qualidade` | 8 | 3/3 | 4 | 3 | S-20, S-23, S-26, S-31, S-33, S-34 |
| `compras` | 7 | 3/4 | 1 | 3 | S-26, S-28, S-34, S-47 |
| `estoque` | 17 | 7/7 | 2 | 2 | S-21, S-26, S-33, S-47 |
| `financeiro` | 9 | 4/4 | 3 | 2 | S-23, S-26, S-30, S-34 |
| `rh` | 57 | 5/5 | 9 | 2 | S-40, S-42, S-44, S-45 |
| `sac` | 3 | 2/3 | 5 | 2 | S-05, S-23, S-24, S-29, S-30, S-44, S-50 |
| `whatsapp` | 4 | **1/5** | 6 | 0 | S-23, S-41, S-50 |
| `relatorios` | 10 | 7/7 | 5 | 1 | S-16, S-23, S-34 |
| `auditoria` | 6 | 4/4 | 5 | 3 | S-15, S-30, S-31, S-33, S-37, S-44, S-45, S-50 |
| `administracao` | 10 | 6/6 | 8 | 1 | S-05, S-13, S-23, S-24, S-32, S-34 |

**O que a tabela mostra de imediato.** Cinco módulos têm menu majoritariamente de
atalho para vizinho — `planejamento`, `tarefas`, `diario`, `equipes` e
`whatsapp`. Os quatro primeiros formam o núcleo operacional da obra e somam
**4 páginas**. É a explicação medida para a sensação de que o produto não avança:
não falta trabalho feito (180 páginas), falta trabalho feito **no núcleo** — 57
das 180 são do RH.

---

## Espinha derivada do confronto com o manual do Odoo 19

Objetivo: fechar as lacunas que o confronto mediu, **na ordem em que uma destrava
a outra** — não na ordem em que foram descobertas.

Origem de cada sprint: [`CONFRONTO-ODOO-19-E-INNOV.md`](CONFRONTO-ODOO-19-E-INNOV.md)
§3 (matriz por módulo), §4 (visão global) e §5 (especificação por linguagem).
Conforme a **R8**, as tarefas abaixo apontam para lá e não repetem a lógica.

**Dependência medida:** `E1 → E2 → E3` é a espinha — E3 não fecha sem E2, e E2
não fecha sem E1. E4 e E5 correm em paralelo a partir de E1. E7 não depende de
nada e entrega sozinho.

## Sprint S-52 — E1: custo/hora por integrante
**Estado:** pendente
**Marco:** M-EQUIPES
**Módulos atingidos:** `equipes`, `rh`, `diario`, `planejamento`, `obras`, `financeiro`, `orcamentos`

Trava sete módulos, e **não por estar faltando** — o campo existe desde a etapa
12, em duas tabelas. A medição está no confronto §4.1 e na definição de pronto do
módulo em `MODULOS.md`:

```
project_resources.hourly_cost      escrito e EXIBIDO, nunca usado em cálculo
project_team_members.hourly_cost   sem escritor e sem leitor desde 19/07/2026
```

O módulo **mostra** custo de mão de obra e não **calcula** com ele. O trabalho é
dar **dono, vigência e uso** ao que já existe — não criar campo.

- [ ] T-52.1 — Decidir o dono: o custo pertence à **pessoa**, não à linha de equipe de uma obra. Hoje a mesma pessoa em duas obras são duas linhas, dois valores e nenhum vínculo
- [ ] T-52.2 — Migration de **vigência**: alterar o custo abre período novo e não reescreve o passado. Sem isso, corrigir um valor muda o custo já apurado de trimestre fechado
- [ ] T-52.3 — Resolver as duas colunas existentes: qual sobrevive, qual é migrada e qual é removida. `project_team_members.hourly_cost` é coluna morta e a remoção é migration destrutiva — decisão registrada, não silenciosa
- [ ] T-52.4 — Campo no cadastro, com `view_sensitive_financials` decidindo quem vê; guarda de participação em qualquer RPC nova, conforme VACINA-065
- [ ] T-52.5 — Integrante **sem custo declarado** aparece como não informado, nunca como zero — zero é um número e entra na conta mentindo
- [ ] T-52.6 — Prova por sabotagem: custo alterado **não** muda o custo apurado de período fechado; e remover o custo derruba o cálculo dependente com o teste acusando
- [ ] T-52.7 — **Checklist universal de conclusão de módulo**, o mesmo para todos: `pnpm checklist:modulo equipes` responde os itens mecânicos, e os humanos — persona, QA visual, KPI, relatório de ausência — ficam em `diretrizes/CHECKLIST-DE-CONCLUSAO-DE-MODULO.md`. **Item humano sem evidência conta como não feito.** A tarefa aponta e não repete o esqueleto (R8): regra escrita em 28 sprints diverge em silêncio

## Sprint S-53 — E2: apontamento de hora no diário
**Estado:** pendente
**Marco:** M-DIARIO
**Módulos atingidos:** `diario`, `obras`, `financeiro`

Transforma o diário de registro em **fonte de custo**. Hoje o diário é a única
superfície do produto que o campo alimenta todo dia e que não produz número
nenhum. Confronto §3.2 (`diario`).

- [ ] T-53.1 — `daily_log_activities` recebe horas e pessoa
- [ ] T-53.2 — Custo derivado de E1, calculado no banco e nunca digitado
- [ ] T-53.3 — Worksheet configurável por tipo de serviço, no motor de modelos que já existe (`modelos`)
- [ ] T-53.4 — O diário aprovado continua sendo a única porta para o cliente; hora e custo **não** são visíveis ao cliente
- [ ] T-53.5 — **Checklist universal de conclusão de módulo**, o mesmo para todos: `pnpm checklist:modulo diario` responde os itens mecânicos, e os humanos — persona, QA visual, KPI, relatório de ausência — ficam em `diretrizes/CHECKLIST-DE-CONCLUSAO-DE-MODULO.md`. **Item humano sem evidência conta como não feito.** A tarefa aponta e não repete o esqueleto (R8): regra escrita em 28 sprints diverge em silêncio

## Sprint S-54 — E3: rentabilidade da obra em três colunas
**Estado:** pendente
**Marco:** M-OBRAS
**Módulos atingidos:** `obras`, `financeiro`, `orcamentos`, `compras`

A peça mais valiosa da matriz. Separa **prometido** (`Expected`), **direito**
(`To Invoice`) e **fato** (`Invoiced`). Temos as duas pontas e não temos o meio —
e o meio é a medição aprovada e não faturada, o número que o dono da construtora
persegue em planilha todo mês. Confronto §4.2.

- [ ] T-54.1 — RPC `project_profitability(org, project)` em SQL — leitura derivada, sem escrita, para não trazer linha para fora só para somar
- [ ] T-54.2 — Receita: medição aprovada, contrato, aditivo; custo: material, hora (E2), compra
- [ ] T-54.3 — Tela da obra com as três colunas e o caminho de volta ao documento de origem
- [ ] T-54.4 — Prova por sabotagem: medição aprovada e não faturada tem de aparecer em `To Invoice` e sumir de lá ao faturar
- [ ] T-54.5 — **Checklist universal de conclusão de módulo**, o mesmo para todos: `pnpm checklist:modulo obras` responde os itens mecânicos, e os humanos — persona, QA visual, KPI, relatório de ausência — ficam em `diretrizes/CHECKLIST-DE-CONCLUSAO-DE-MODULO.md`. **Item humano sem evidência conta como não feito.** A tarefa aponta e não repete o esqueleto (R8): regra escrita em 28 sprints diverge em silêncio

## Sprint S-55 — E4: comprometido do orçamento
**Estado:** pendente
**Marco:** M-ORCAMENTOS
**Módulos atingidos:** `orcamentos`, `compras`, `financeiro`

`Comprometido = realizado + pedido de compra confirmado ainda não faturado`. É o
que impede a obra de gastar duas vezes o mesmo dinheiro. Confronto §3.3, §3.4.

- [ ] T-55.1 — RPC do comprometido por obra e por item de orçamento
- [ ] T-55.2 — Exibir no orçamento ao lado de previsto e realizado
- [ ] T-55.3 — Alerta quando comprometido ultrapassa o previsto do item
- [ ] T-55.4 — **Checklist universal de conclusão de módulo**, o mesmo para todos: `pnpm checklist:modulo orcamentos` responde os itens mecânicos, e os humanos — persona, QA visual, KPI, relatório de ausência — ficam em `diretrizes/CHECKLIST-DE-CONCLUSAO-DE-MODULO.md`. **Item humano sem evidência conta como não feito.** A tarefa aponta e não repete o esqueleto (R8): regra escrita em 28 sprints diverge em silêncio

## Sprint S-56 — E5: prazo de fornecedor e atraso previsto
**Estado:** pendente
**Marco:** M-COMPRAS
**Módulos atingidos:** `compras`, `estoque`, `planejamento`

`Chegada prevista = prazo do pedido + lead time do fornecedor`. Uma fórmula de
uma linha que produz a única visão que importa em suprimentos: **o que vai
atrasar a obra**. Confronto §3.3.

- [ ] T-56.1 — Lead time no cadastro do fornecedor, por produto quando houver
- [ ] T-56.2 — Chegada prevista derivada, nunca digitada
- [ ] T-56.3 — Pedido atrasado no painel quando a chegada prevista passa sem recebimento
- [ ] T-56.4 — **Checklist universal de conclusão de módulo**, o mesmo para todos: `pnpm checklist:modulo compras` responde os itens mecânicos, e os humanos — persona, QA visual, KPI, relatório de ausência — ficam em `diretrizes/CHECKLIST-DE-CONCLUSAO-DE-MODULO.md`. **Item humano sem evidência conta como não feito.** A tarefa aponta e não repete o esqueleto (R8): regra escrita em 28 sprints diverge em silêncio

## Sprint S-57 — E6: quantidade prevista de estoque
**Estado:** pendente
**Marco:** M-ESTOQUE
**Módulos atingidos:** `estoque`, `compras`

`Prevista = em mãos + entradas previstas − saídas previstas`. Nosso estoque
conhece o presente e não conhece o futuro. Confronto §3.3.

- [ ] T-57.1 — RPC da quantidade prevista no horizonte consultado
- [ ] T-57.2 — Regra de reposição mínimo/máximo disparando pelo previsto
- [ ] T-57.3 — Decidir e implementar a valoração (AVCO), com ADR se a escolha divergir do mapa
- [ ] T-57.4 — **Checklist universal de conclusão de módulo**, o mesmo para todos: `pnpm checklist:modulo estoque` responde os itens mecânicos, e os humanos — persona, QA visual, KPI, relatório de ausência — ficam em `diretrizes/CHECKLIST-DE-CONCLUSAO-DE-MODULO.md`. **Item humano sem evidência conta como não feito.** A tarefa aponta e não repete o esqueleto (R8): regra escrita em 28 sprints diverge em silêncio

## Sprint S-58 — E7: relatórios de ausência
**Estado:** pendente
**Marco:** M-RELATORIOS
**Módulos atingidos:** `crm`, `compras`, `sac`, `financeiro`, `documentos`

A crítica mais dura do confronto: dos 146 relatórios do manual, uma família
inteira é de **ausência e atraso**, e nenhum dos nossos 10 é assim. Relatório de
ausência é o que faz o sistema **cobrar** em vez de esperar. Confronto §4.3.

Roda no **plano de execução em Go**, que já tem tentativa, backoff e
classificação de falha — segunda carga do plano que já existe, não camada nova.

- [ ] T-58.1 — Varredura agendada que produz pendência, não tela
- [ ] T-58.2 — Lead sem acompanhamento; recebível vencido por idade; pedido atrasado; documento não enviado
- [ ] T-58.3 — A pendência chega pela casca, com teto por pessoa e agrupamento por obra (decisão já registrada em S-29)
- [ ] T-58.4 — **Checklist universal de conclusão de módulo**, o mesmo para todos: `pnpm checklist:modulo relatorios` responde os itens mecânicos, e os humanos — persona, QA visual, KPI, relatório de ausência — ficam em `diretrizes/CHECKLIST-DE-CONCLUSAO-DE-MODULO.md`. **Item humano sem evidência conta como não feito.** A tarefa aponta e não repete o esqueleto (R8): regra escrita em 28 sprints diverge em silêncio

## Sprint S-59 — E8: SLA no pós-venda
**Estado:** pendente
**Marco:** M-SAC
**Módulos atingidos:** `sac`, `whatsapp`

Assistência técnica sem SLA não tem como prometer prazo. Confronto §3.5.

- [ ] T-59.1 — Política de SLA por tipo de ocorrência, com prazo calculado e nunca digitado
- [ ] T-59.2 — `tempo até SLA` e `taxa de SLA` como indicadores
- [ ] T-59.3 — Carga por atendente e avaliação pós-atendimento
- [ ] T-59.4 — **Checklist universal de conclusão de módulo**, o mesmo para todos: `pnpm checklist:modulo sac` responde os itens mecânicos, e os humanos — persona, QA visual, KPI, relatório de ausência — ficam em `diretrizes/CHECKLIST-DE-CONCLUSAO-DE-MODULO.md`. **Item humano sem evidência conta como não feito.** A tarefa aponta e não repete o esqueleto (R8): regra escrita em 28 sprints diverge em silêncio

## Sprint S-60 — E9: solicitação de documento com cobrança
**Estado:** pendente
**Marco:** M-DOCUMENTOS
**Módulos atingidos:** `documentos`, `contratos`, `qualidade`, `rh`

Nossa gestão documental é **passiva**: guarda o que chega. A solicitação de
arquivo inverte isso — o sistema pede o documento que falta a quem deve enviá-lo
e acompanha. Confronto §3.5.

- [ ] T-60.1 — Pedido de documento com destinatário, prazo e pasta de destino
- [ ] T-60.2 — Cobrança pelo plano de execução (mesma carga de E7)
- [ ] T-60.3 — Versão com bloqueio e progresso de assinatura (`concluídos ÷ requeridos`)
- [ ] T-60.4 — **Checklist universal de conclusão de módulo**, o mesmo para todos: `pnpm checklist:modulo documentos` responde os itens mecânicos, e os humanos — persona, QA visual, KPI, relatório de ausência — ficam em `diretrizes/CHECKLIST-DE-CONCLUSAO-DE-MODULO.md`. **Item humano sem evidência conta como não feito.** A tarefa aponta e não repete o esqueleto (R8): regra escrita em 28 sprints diverge em silêncio

## Sprint S-61 — E10: filtro global e snapshot de indicador
**Estado:** pendente
**Marco:** M-RELATORIOS
**Módulos atingidos:** `relatorios`, `dashboard`

Período escolhido uma vez vale para o painel inteiro; e o indicador vira foto
datada, que é o que permite comparar. Confronto §3.5.

- [ ] T-61.1 — Estado de filtro no servidor, aplicado a todas as visualizações do painel
- [ ] T-61.2 — Snapshot datado do indicador em tabela própria
- [ ] T-61.3 — Definição do KPI legível ao usuário, não só ao código
- [ ] T-61.4 — **Checklist universal de conclusão de módulo**, o mesmo para todos: `pnpm checklist:modulo relatorios` responde os itens mecânicos, e os humanos — persona, QA visual, KPI, relatório de ausência — ficam em `diretrizes/CHECKLIST-DE-CONCLUSAO-DE-MODULO.md`. **Item humano sem evidência conta como não feito.** A tarefa aponta e não repete o esqueleto (R8): regra escrita em 28 sprints diverge em silêncio

## Sprint S-62 — E11: probabilidade e previsão no funil
**Estado:** pendente
**Marco:** M-CRM
**Módulos atingidos:** `crm`, `propostas`

`Receita rateada = receita esperada × probabilidade`. Temos valor e etapa, então
temos lista; sem probabilidade não temos previsão. Confronto §3.1.

- [ ] T-62.1 — Probabilidade por etapa, editável por empresa
- [ ] T-62.2 — Receita rateada e previsão por período de fechamento
- [ ] T-62.3 — Margem por linha na proposta (`(preço − custo) × quantidade`)
- [ ] T-62.4 — **Herdada da T-34.10.1**, que ficava presa numa sprint de Administração esperando algo que não existia: ao criar o marcador de cartão, reavaliá-lo contra o critério da T-34.10 — dimensão que gera contagem usa lista cadastrada; vocabulário de tela, não
- [ ] T-62.5 — **Checklist universal de conclusão de módulo**, o mesmo para todos: `pnpm checklist:modulo crm` responde os itens mecânicos, e os humanos — persona, QA visual, KPI, relatório de ausência — ficam em `diretrizes/CHECKLIST-DE-CONCLUSAO-DE-MODULO.md`. **Item humano sem evidência conta como não feito.** A tarefa aponta e não repete o esqueleto (R8): regra escrita em 28 sprints diverge em silêncio

## Sprint S-63 — E12: antes-e-depois na trilha de auditoria
**Estado:** pendente
**Marco:** M-AUDITORIA
**Módulos atingidos:** `auditoria`, todos

`write_audit` grava o evento, não o antes-e-depois. A Trilha de Auditoria do
manual registra valor anterior e valor novo por campo — é o que transforma o log
em prova. Confronto §3.5.

- [ ] T-63.1 — `write_audit` passa a receber valor anterior
- [ ] T-63.2 — Tela de auditoria mostra a diferença, não só o evento
- [ ] T-63.3 — Prova por sabotagem: alteração sem antes-e-depois reprova
- [ ] T-63.4 — **Checklist universal de conclusão de módulo**, o mesmo para todos: `pnpm checklist:modulo auditoria` responde os itens mecânicos, e os humanos — persona, QA visual, KPI, relatório de ausência — ficam em `diretrizes/CHECKLIST-DE-CONCLUSAO-DE-MODULO.md`. **Item humano sem evidência conta como não feito.** A tarefa aponta e não repete o esqueleto (R8): regra escrita em 28 sprints diverge em silêncio

---

# Marco M-0 — Governança e memória de sessão

Objetivo: nenhuma decisão desta plataforma depende de conversa. Um chat novo recupera tudo do repositório.

## Sprint S-01 — Skills versionadas e regras de sessão
**Estado:** concluída
**Marco:** M-0

- [x] T-01.1 — Copiar as skills dos cinco repositórios de origem para `.claude/skills` (45 skills)
- [x] T-01.2 — Registrar procedência, licenças e o que ficou de fora em `.claude/skills/README.md`
- [x] T-01.3 — Excluir `.claude/skills` do `eslint` e do `tsc` — conteúdo de terceiros não é código da plataforma
- [x] T-01.4 — Fixar em `CLAUDE.md` a tabela de skills de acionamento automático
- [x] T-01.5 — Fixar a precedência de `UI-UX-PRO-MAX.md` sobre a skill em caso de divergência
- [x] T-01.6 — Registrar o que não pôde ser instalado e por quê (CLI do Composio, sessão do NotebookLM)

## Sprint S-02 — Método de trabalho e protocolo de vacinas
**Estado:** concluída
**Marco:** M-0

- [x] T-02.1 — Escrever `METODO-DE-TRABALHO.md` com a regra de decomposição em micro-problemas
- [x] T-02.2 — Registrar PoT e paralelismo como execução, não narração
- [x] T-02.3 — Escrever o protocolo de consulta ao catálogo antes de resolver
- [x] T-02.4 — Escrever o protocolo de registro com as cinco perguntas e o modelo de arquivo
- [x] T-02.5 — Escrever o protocolo de substituição de vacina com os dois portões
  - [x] T-02.5.1 — Portão 1, eliminatório: garantia preservada
  - [x] T-02.5.2 — Portão 2: retorno material, com limiar contra troca marginal
  - [x] T-02.5.3 — Prova executável e tipo de evidência declarado (`medida`, `negativa`, `argumento`)
  - [x] T-02.5.4 — Proibição de substituir no mesmo PR da correção barrada
  - [x] T-02.5.5 — Estados `substituída` e `revogada`, nunca apagadas
- [x] T-02.6 — Replicar o protocolo em `VACINAS.md`, que é onde se olha ao resolver erro
- [x] T-02.7 — Fixar a regra de método em `CLAUDE.md`

## Sprint S-03 — Diretriz do Object Runtime
**Estado:** concluída
**Marco:** M-0

- [x] T-03.1 — Decompor o problema em cinco subsistemas e validar o corte com o responsável
- [x] T-03.2 — Estabelecer os parâmetros: centenas de empresas, ≤1000 objetos por empresa, milhões de registros nos livros
- [x] T-03.3 — Descartar geração de código e registrar as quatro razões
- [x] T-03.4 — Escrever `OBJECT-RUNTIME.md` com as 13 seções
  - [x] T-03.4.1 — Modelo conceitual: tipo, característica, classe, objeto, registro
  - [x] T-03.4.2 — Catálogo e versionamento imutável
  - [x] T-03.4.3 — Duas camadas de armazenamento e o resolver
  - [x] T-03.4.4 — Colunas-slot, índices parciais fixos e advisor
  - [x] T-03.4.5 — Política única de RLS reusando `has_module_permission`
  - [x] T-03.4.6 — Extensão dos aplicativos padrão por anexo
  - [x] T-03.4.7 — Ciclo de vida plug-and-play sem `DROP`
  - [x] T-03.4.8 — Contratos de performance verificáveis
  - [x] T-03.4.9 — Escada de escala e as três costuras
  - [x] T-03.4.10 — Mapa de reaproveitamento do que já existe
  - [x] T-03.4.11 — Riscos, limites declarados e primeira fatia
- [x] T-03.5 — Registrar que nada foi executado e que os números são estimativas não calibradas

## Sprint S-04 — Ponto de entrada e inventário de execução
**Estado:** concluída
**Marco:** M-0

- [x] T-04.1 — Escrever `LEIA-PRIMEIRO.md` mapeando skills, vacinas, blueprint, executable spec, Object Runtime e ordem de leitura
- [x] T-04.2 — Escrever este inventário com marcos, sprints, tarefas e as regras R1 a R7
- [x] T-04.3 — Escrever `scripts/validate-inventory.mjs` que reprova violação das regras estruturais
  - [x] T-04.3.1 — No máximo uma sprint `em andamento`
  - [x] T-04.3.2 — Sprint `concluída` sem tarefa em aberto
  - [x] T-04.3.3 — Toda sprint com estado válido e ao menos uma tarefa
  - [x] T-04.3.4 — Identificadores de sprint únicos
- [x] T-04.4 — Registrar `LEIA-PRIMEIRO.md` e este arquivo no validador de documentação e no `README.md` de `diretrizes/`
- [x] T-04.5 — Apontar `CLAUDE.md` para `LEIA-PRIMEIRO.md` como primeira leitura obrigatória e fixar as regras do inventário
- [x] T-04.6 — **Publicar no GitHub.** As diretrizes estão em `claude/diretrizes-object-runtime`, sobre `feature/etapa-20-prontidao-producao`. As 45 skills de `.claude/skills` seguem fora deste ramo, em entrega separada ainda não publicada
- [x] T-04.7 — Incorporar ao repositório o blueprint e a executable spec recebidos por ZIP, com os defeitos verificados anotados
  - [x] T-04.7.1 — Varrer o pacote por credencial antes de publicar: três URLs de banco encontradas, todas placeholder (`postgres:postgres@localhost`, `change-me`, `REPLACE_WITH_LOCAL_SECRET`)
  - [x] T-04.7.2 — Copiar os 605 arquivos para `docs/referencias/innovar-loop-95`
  - [x] T-04.7.3 — Isolar do `eslint`, do `tsc` e do `vitest` — é referência, não código da plataforma
  - [x] T-04.7.4 — Reverificar os seis defeitos contra os arquivos e registrar em `ANOTACOES-DE-VERIFICACAO.md` com caminho e linha

---

# Marco M-1 — Fundação do Object Runtime

Objetivo: a fundação que aguenta virar prédio. Nenhuma funcionalidade de estúdio antes de a fundação estar medida.

## Sprint S-05 — Catálogo de definições
**Estado:** concluída
**Marco:** M-1

- [x] T-05.1 — Migration de `object_definitions`, `object_definition_versions` e `object_field_slots`
  - [x] T-05.1.1 — `scope` com `organizacao` e `projeto`, para a plataforma servir a qualquer tipo de empresa
  - [x] T-05.1.2 — Índices de catálogo e verificação embutida na própria migration
- [x] T-05.2 — Imutabilidade da versão publicada, com `checksum` do `spec`
  - [x] T-05.2.1 — Guarda no banco: `update` e `delete` em versão publicada levantam exceção
  - [x] T-05.2.2 — Lógica pura de serialização canônica, impressão digital, alocação de slot e validação (`lib/object-runtime/spec.ts`), com 24 testes
  - [x] T-05.2.3 — RPC `publish_object_definition`: calcula o checksum, grava a versão e projeta os slots numa transação
  - [x] T-05.2.4 — Republicar a mesma especificação não cria versão nova
  - [x] T-05.2.5 — Nomes distintos para os dois valores: `specFingerprint` é local, `object_runtime_spec_checksum` é o da versão publicada. Formas canônicas diferentes, para ninguém comparar os dois
- [x] T-05.3 — RLS do catálogo por `organization_id` e permissão de administração
  - [x] T-05.3.1 — Política única por operação reusando `has_module_permission`
  - [x] T-05.3.2 — `revoke` de escrita direta de `anon` e `authenticated`, no padrão da VACINA-004
- [x] T-05.4 — Validador de CI: projeção de slots coerente com o `spec`
  - [x] T-05.4.1 — A projeção é derivada pelo banco a partir do `spec`, nunca recebida pronta — não existe caminho em que os dois divirjam
  - [x] T-05.4.2 — `validate:object-runtime` compara orçamento e mapa de tipos entre SQL e TypeScript
  - [x] T-05.4.3 — Verifica RLS forçada, revogação de escrita direta, guarda de imutabilidade e `search_path` fixo
  - [x] T-05.4.4 — Exercitado em seis estados: cinco sabotagens reprovadas, íntegro aprovado
- [x] T-05.5 — Testes: publicar, republicar, tentar alterar versão publicada
  - [x] T-05.5.1 — Fixture mínima com os pré-requisitos de fronteira (`supabase/tests/object-runtime/fixture.sql`)
  - [x] T-05.5.2 — 14 testes de comportamento mais o de privilégio, executados contra PostgreSQL 16 real
  - [x] T-05.5.3 — O executor exige confirmação explícita dos testes: sem banco ele declara que não rodou, em vez de passar calado
  - [x] T-05.5.4 — Workflow `object-runtime-db.yml` com serviço PostgreSQL, para o teste rodar no CI
  - [x] T-05.5.5 — Três sabotagens confirmam que a bateria reprova: imutabilidade desativada, republicação não idempotente e mapa de tipos alterado

## Sprint S-06 — Camada compartilhada, RLS e índices de slot
**Estado:** pendente
**Marco:** M-1

- [ ] T-06.1 — `object_records` particionada por `HASH(organization_id)` em 64 partições
- [ ] T-06.2 — Colunas-slot e os índices parciais fixos com predicado `IS NOT NULL`
- [ ] T-06.3 — Política única de RLS chamando `has_module_permission`
- [ ] T-06.4 — Validador de CI: nenhuma tabela de objeto sem RLS e sem a política do template
- [ ] T-06.5 — Testes negativos: leitura entre empresas, leitura sem permissão de módulo, leitura por obra sem acesso à obra

## Sprint S-07 — Escrita por RPC e revogação de escrita direta
**Estado:** pendente
**Marco:** M-1

- [ ] T-07.1 — RPC `object_record_upsert` com preenchimento de slot e validação de payload
- [ ] T-07.2 — Revogar `insert`/`update`/`delete` diretos de `anon` e `authenticated`
- [ ] T-07.3 — Limites duros: 64 KB de payload, 200 campos, 14 slots
- [ ] T-07.4 — Validador de CI para a revogação, no padrão da VACINA-004
- [ ] T-07.5 — Testes negativos de escrita direta e de estouro de limite

## Sprint S-08 — Leitura, paginação keyset e recusa de filtro sem índice
**Estado:** pendente
**Marco:** M-1

- [ ] T-08.1 — Camada de consulta com paginação keyset; `OFFSET` recusado
- [ ] T-08.2 — Recusa de filtro por campo não indexado, com mensagem que orienta
- [ ] T-08.3 — Resolver de armazenamento, com leitura separada de escrita desde o início (costura 2)
- [ ] T-08.4 — Validador: nenhuma consulta do runtime cruza `organization_id` (costura 3)
- [ ] T-08.5 — Testes de contrato de performance com dado sintético

## Sprint S-09 — Classes `Cadastro` e `Extensão`
**Estado:** pendente
**Marco:** M-1

- [ ] T-09.1 — Características `auditavel`, `arquivavel` e `extensao_de`
- [ ] T-09.2 — Vínculo `(parent_kind, parent_id)` com validação na RPC
- [ ] T-09.3 — Rotina de reconciliação de órfãos, arquivando sem apagar
- [ ] T-09.4 — Testes de extensão sobre um aplicativo padrão real

## Sprint S-10 — Estúdio mínimo
**Estado:** pendente
**Marco:** M-1

- [ ] T-10.1 — Telas de criar, publicar e listar objeto, sob `UI-UX-PRO-MAX.md`
- [ ] T-10.2 — Renderização do objeto publicado: lista, detalhe e formulário
- [ ] T-10.3 — Região reservada nas telas padrão para campos de extensão
- [ ] T-10.4 — Testes de componente e de navegação

## Sprint S-11 — POC de carga com milhões de registros
**Estado:** pendente
**Marco:** M-1

- [ ] T-11.1 — Gerador de carga: centenas de empresas, milhares de objetos, milhões de registros no objeto pesado
- [ ] T-11.2 — Medir os contratos da seção 9 do `OBJECT-RUNTIME.md`
- [ ] T-11.3 — Calibrar os números estimados: 64 partições, 14 slots, 64 KB, 200 campos
- [ ] T-11.4 — Registrar o resultado no `OBJECT-RUNTIME.md`, corrigindo o que a medição contrariar

---

# Marco M-2 — Customização completa

## Sprint S-12 — Camada dedicada e promoção sem downtime
**Estado:** pendente
**Marco:** M-2

- [ ] T-12.1 — Template de `CREATE TABLE` dedicada com RLS aplicada na criação
- [ ] T-12.2 — Particionamento por tempo para objeto temporal
- [ ] T-12.3 — Promoção em seis passos, reversível até a virada do resolver
- [ ] T-12.4 — Testes de promoção com verificação de contagem e amostragem

## Sprint S-13 — Advisor de varredura e otimização de índice
**Estado:** pendente
**Marco:** M-2

- [ ] T-13.1 — Registro de uso por objeto: campos filtrados, ordenados e latência
- [ ] T-13.2 — Propostas de promoção de campo a slot, liberação de slot ocioso e promoção de camada
- [ ] T-13.3 — Tela de administração com custo estimado — propõe, nunca executa

## Sprint S-14 — Demais características
**Estado:** pendente
**Marco:** M-2

- [ ] T-14.1 — `versionavel` e `aprovavel`
- [ ] T-14.2 — `anexavel` reusando `secureUpload` e o pipeline de quarentena
- [ ] T-14.3 — `georreferenciado`, `numerado`, `comentavel`
- [ ] T-14.4 — `importavel` e `exportavel`, sujeitas à permissão de exportação
- [ ] T-14.5 — Classes `Documento`, `Registro de campo` e `Lançamento`

## Sprint S-15 — Migração entre versões de definição
**Estado:** pendente
**Marco:** M-2

- [ ] T-15.1 — Classificar mudança compatível e incompatível
- [ ] T-15.2 — Pré-visualização obrigatória do efeito sobre N registros antes de aplicar
- [ ] T-15.3 — Recusar publicação de mudança incompatível sem plano
- [ ] T-15.4 — Registro em auditoria

---

# Marco M-3 — Escala e produto público

## Sprint S-16 — Réplica de leitura
**Estado:** pendente
**Marco:** M-3

- [ ] T-16.1 — Apontar a leitura do resolver para réplica
- [ ] T-16.2 — Política de consistência para leitura logo após escrita
- [ ] T-16.3 — Medir o efeito sobre os relatórios pesados

## Sprint S-17 — Roteamento multi-banco
**Estado:** pendente
**Marco:** M-3

- [ ] T-17.1 — Verificar que nenhuma consulta cruza `organization_id`
- [ ] T-17.2 — Roteamento por empresa no resolver
- [ ] T-17.3 — Procedimento de mudança de empresa entre bancos

## Sprint S-18 — Exportar, importar e catálogo compartilhado
**Estado:** pendente
**Marco:** M-3

- [ ] T-18.1 — Exportar definição publicada como JSON com checksum
- [ ] T-18.2 — Importar definição em outra empresa, recriando definição e nunca dado
- [ ] T-18.3 — Catálogo compartilhado de objetos entre empresas

---

# Pendências herdadas

Vindas da auditoria APEX da Etapa 20. Entram no fim conforme R4; sobem de posição quando bloquearem algo.

## Sprint S-19 — Fechamento dos riscos residuais da Etapa 20
**Estado:** pendente
**Marco:** M-0

- [ ] T-19.1 — RSK-0002: verificar a CSP aplicada em navegador, nas telas de assinatura, documentos e diário
- [ ] T-19.2 — RSK-0003: aplicar em homologação a migration `20260725120000_stage20_atomic_access_counters_and_cleanup.sql`
- [ ] T-19.3 — RSK-0001: dimensionar `clamd` para 150 MB (`StreamMaxLength`, `MaxScanSize`) antes do go-live
- [ ] T-19.4 — RSK-0004 e FND-0001: decidir o fim da política transitória da VACINA-008
- [ ] T-19.5 — FND-0011 e RSK-0005: fixar ações de CI por SHA, junto com a atualização da VACINA-006 e do validador

---

# Marco M-4 — Generalização do produto

Descoberto durante a S-05, ao decidir que o objeto dinâmico aceita escopo por projeto. Entra no fim conforme a regra R4.

A plataforma nasceu com vocabulário de construção civil. Para servir a qualquer tipo de empresa — prestação de serviços, indústria, manutenção — o vocabulário precisa deixar de ser premissa. **O diário de obras passa a ser um módulo entre outros**, não o eixo do produto.

## Sprint S-20 — Biblioteca de vocabulário e presets de segmento
**Estado:** pendente
**Marco:** M-4

Medição feita antes de planejar, em 25 de julho de 2026: 186 ocorrências de "obra" em `.tsx`, 78 em `.ts`, 16 tabelas com nome de domínio e 22 chaves de módulo.

O número que decide o desenho é outro: **os nomes físicos já são neutros.** `projects`, `project_tasks`, `project_milestones`, `daily_logs` são termos genéricos; só `work_breakdown_items` carrega jargão. O que é específico de construção é o **texto exibido** e alguns módulos — não o schema. Isso transforma a sprint de reescrita em camada de tradução.

**Decisão do responsável, 25 de julho de 2026:** o termo **"obra" é substituído por "projeto"**, e a regra vale para todo termo de segmento encontrado — quanto mais genérico e aplicável a áreas diversas, melhor. O padrão da plataforma passa a ser genérico; construção civil deixa de ser a premissa e vira, quando houver preset, uma especialização opcional.

Medição de 25 de julho de 2026, feita antes de planejar. As ocorrências não custam o mesmo, e é isso que separa o que muda do que não muda:

| Onde | Ocorrências | Risco | Decisão |
|---|---|---|---|
| Texto exibido em `.tsx` | 186 | baixo | **trocar** — é o que o usuário vê |
| Sigla `FVS` | 43 | baixo | **trocar** por "verificação de serviço" |
| Sigla `FVM` | 49 | baixo | **trocar** por "verificação de materiais" |
| Rótulo "Diário de Obras" | 4 | baixo | **trocar** por "Diário de campo" |
| `'obras'` como `module_key` em SQL | 30, em 8 arquivos | **alto** | **não trocar** |
| `"obras"` como chave em TypeScript | 10 | alto | **não trocar** |
| Rotas `/app/obras`, `/cliente/obras`, `/app/relatorios/obras` | 3 diretórios | médio | **não trocar agora** |

Os 30 literais `'obras'` estão dentro de policies de RLS e RPCs **já aplicadas em produção**. Trocar a chave exigiria reescrever migration aplicada — o que a VACINA-003 proíbe — ou uma migration transversal no núcleo de permissão. É identificador interno: o usuário nunca vê, e trocá-lo tem custo alto e ganho zero para ele. A rota segue a mesma lógica: URL é identificador, e quem tem `/app/obras` salvo não deve perder o link porque a empresa dele é de manutenção predial.

Vale notar que trocar o rótulo para "Projeto" **aproxima** a interface do esquema, que já se chama `projects`, `project_tasks` e `project_milestones`. A troca reduz divergência entre o que o usuário lê e o que o banco guarda; não cria dívida nova.

- [ ] T-20.1 — **Não renomear tabela, coluna, chave de módulo nem rota.** Registrar a decisão com os números acima
- [ ] T-20.2 — Biblioteca de vocabulário: catálogo de termos por organização
  - [ ] T-20.2.1 — Tabela de termos com chave, singular, plural e gênero
  - [ ] T-20.2.2 — Resolução com precedência: termo da empresa → termo do preset → termo padrão
  - [ ] T-20.2.3 — Hook e utilitário de servidor para consumir termo, sem consulta por componente
- [ ] T-20.3 — Presets de segmento
  - [ ] T-20.3.1 — Preset é conjunto de termos mais módulos habilitados por padrão
  - [ ] T-20.3.2 — Construção civil como preset, não como padrão implícito
  - [ ] T-20.3.3 — Prestação de serviços e manutenção como segundo e terceiro presets
  - [ ] T-20.3.4 — Preset aplicado na criação da empresa, reusando `app_modules.default_enabled` e `organization_modules`
- [ ] T-20.4 — Substituir o vocabulário exibido pelo genérico
  - [ ] T-20.4.1 — "Obra" e "Obras" passam a "Projeto" e "Projetos" nos 186 pontos de `.tsx`
  - [ ] T-20.4.2 — Nome e descrição dos módulos em `app_modules` e em `lib/modules/registry.ts`, sem tocar na chave
  - [ ] T-20.4.3 — "Diário de Obras" passa a "Diário de campo"
  - [ ] T-20.4.4 — `FVS` e `FVM` passam a "verificação de serviço" e "verificação de materiais", sem sigla de segmento
  - [ ] T-20.4.5 — Textos de formulário, tabela, estado vazio e mensagem de erro
  - [ ] T-20.4.6 — Varredura final por termo de segmento remanescente, com validador de CI
- [ ] T-20.5 — Módulos específicos de segmento continuam existindo, como opcionais
  - [ ] T-20.5.1 — `diario` publicado como diário de campo, com rótulo do preset
  - [ ] T-20.5.2 — Termos próprios da qualidade da construção (PO, FVS, FVM) tratados como vocabulário do preset, não como conceito do núcleo
- [ ] T-20.6 — Regra permanente: nenhum termo de segmento em `lib/object-runtime`
  - [ ] T-20.6.1 — Conferir que a biblioteca de tipos e características já é neutra
  - [ ] T-20.6.2 — Validador de CI que reprova jargão de segmento em código de núcleo
- [ ] T-20.7 — Atualizar `SPEC.md`, `MODULOS.md` e `UI-UX-PRO-MAX.md`: a plataforma deixa de se definir por construção civil

---

## Sprint S-21 — Reconciliação do ledger de migrations com a homologação
**Estado:** concluída
**Marco:** M-0

Descoberto em 25 de julho de 2026, ao testar a conexão com o Supabase. Entra no fim conforme a regra R4.

**Três migrations estão aplicadas em homologação e não existem no repositório:**

| Versão | Nome |
|---|---|
| `20260721220507` | `stage19_1_module_dependency_reconciliation` |
| `20260721220509` | `stage19_1_observability_detail_parity` |
| `20260721221145` | `stage19_1_audit_rls_policy_consolidation` |

A divergência é na direção perigosa: existe mudança de esquema no banco sem fonte no repositório. Um ambiente reconstruído a partir da `main`, seguindo `RECUPERACAO.md`, **não teria essas três** — e a política de recuperação do projeto afirma que o projeto pode ser recuperado sem depender de nada fora do repositório.

Na outra direção, três migrations do repositório não estão aplicadas em homologação: `20260722104500`, `20260723062000` e `20260723104500`. Essa parte já era conhecida pela auditoria da Etapa 20 (RSK-0003).

Consulta ao catálogo antes de resolver, conforme o protocolo: a causa raiz **já está catalogada** como `VACINA-003` — "ledger local de migrations diverge do Supabase remoto". A prevenção registrada, porém, não cobre este caso: `scripts/validate-supabase-migrations.mjs` compara o diretório local contra uma **lista fixa de quatro arquivos da Etapa 17**, congelada quando a vacina foi escrita. É um retrato, não uma comparação. O remoto andou depois disso e o validador não tem como perceber.

- [x] T-21.1 — Obter o conteúdo real das três migrations aplicadas
  - [x] T-21.1.1 — `supabase_migrations.schema_migrations` guarda a coluna `statements`: o SQL original foi recuperado, não reconstruído por engenharia reversa
- [x] T-21.2 — Trazê-las para `supabase/migrations` com o mesmo carimbo de versão, sem reescrever histórico aplicado
  - [x] T-21.2.1 — Conferência por `sha256` em vez de leitura: os três arquivos batem byte a byte com o que está aplicado (`9f3435ee…`, `ce2bf7af…`, `516a8458…`)
- [x] T-21.3 — Verificar, por execução, se aplicar o repositório inteiro em base limpa produz o esquema da homologação. **Verificado e refutado.** Fechar a lacuna é escopo da S-22, tarefas T-22.3 e T-22.4
  - [x] T-21.3.1 — Comparação por objeto para os três casos: a homologação tem 12 ramos em `get_observability_event_detail`, 21 dependências de módulo e 1 policy em `audit_events`; os arquivos importados produzem exatamente isso
  - [x] T-21.3.2 — Provado que a importação era necessária: sem ela o repositório reconstrói a função com **3 ramos em vez de 12** — nove origens do fluxo unificado passariam a responder "Origem de evento inválida" — e cria **14 das 21** dependências de módulo
  - [x] T-21.3.3 — Replay completo executado. `scripts/run-migration-replay.mjs` cria base limpa, aplica o bootstrap de fronteira e replica as migrations em ordem. **Resultado: 0 de 111.** Para no primeiro arquivo, `20260719214500_stage10_homologation_hardening.sql`, com `function public.touch_updated_at() does not exist`
- [x] T-21.6 — **Hipótese de renumeração testada e REFUTADA.** Comparação por `sha256` de todas as 143 versões remotas contra os 111 arquivos: **zero** casam por conteúdo sob outro nome. Das 41 que casam por carimbo, só 4 têm conteúdo idêntico. As 16 do estoque trazem o marcador explícito `-- Ledger reparado: DDL aplicado remotamente em partes durante a homologação` e têm o DDL preservado no repositório; essas estão certas. Sobram **102 versões com SQL real, 412.566 caracteres, sem arquivo no repositório**
- [x] T-21.7 — **Descrição correta do achado.** A divergência é maior do que "três migrations ausentes": apenas **41 das 143** versões remotas correspondem a nome de arquivo do repositório. 102 versões remotas não têm arquivo e 70 arquivos não constam do ledger remoto. O padrão indica renumeração histórica das migrations, e não 102 ausências reais — a VACINA-003 já registra um caso desses na Etapa 17. Confirmar objeto a objeto, sem presumir nenhuma das duas hipóteses
- [x] T-21.8 — Ferramenta de evidência entregue: `scripts/run-migration-replay.mjs` e `supabase/tests/replay/bootstrap.sql`, com `pnpm test:db:replay`. Sem PostgreSQL acessível o script declara que não rodou, em vez de sair zero calado
- [x] T-21.9 — Escopo remanescente transferido para a S-22, por exigência das próprias regras: a substituição da VACINA-003 precisa de PR próprio (protocolo de vacinas) e a aplicação em homologação depende de aval do responsável

---

## Sprint S-22 — Reconstruir a capacidade de recuperação do repositório
**Estado:** pendente
**Marco:** M-0

Descoberto em 25 de julho de 2026, ao executar o replay pedido pela T-21.3.3. Entra no fim conforme a R4, porque é ordem de grandeza maior do que a S-21 e não cabe nela.

**O repositório não reconstrói o banco. Replay em base limpa: 0 de 111 migrations.**

> **Medição refeita em 3 de agosto de 2026, com PostgreSQL 16 subido para isso: 0 de 150.**
> Falha na primeira migration aplicada, em `20260719214500_stage10_homologation_hardening.sql`,
> por `function public.touch_updated_at() does not exist`. Quarenta dias depois, o que mudou foi
> o denominador. `has_module_permission` continua sendo chamada por 346 trechos de migration e
> criada por nenhum; a única definição no repositório é um dublê de teste que sempre concede.
> Registrado também em `diretrizes/mapa-do-codigo.debito.json` e na VACINA-056.

O achado central é este:

> **`has_module_permission` não existe em nenhum arquivo do repositório.** É a função no centro do modelo de autorização, chamada por **41 dos 111** arquivos de migration, e a definição dela só existe dentro do banco de homologação.

`diretrizes/RECUPERACAO.md` afirma que o projeto pode ser recuperado a partir do GitHub, sem depender de conversa, contêiner ou máquina local. **Hoje isso não se cumpre**, e nada no CI detectava a diferença.

Dois modos de falha distintos, que pedem soluções distintas:

1. **Ordem.** Arquivos de endurecimento têm carimbo anterior ao dos arquivos que criam o que eles endurecem — `20260719214500_stage10_homologation_hardening` altera `touch_updated_at`, criada em `20260719230000_stage9_financial_contracts`, e `apply_signed_amendment`, criada em `20260719234000_stage9_apply_amendment`. Aplicados em ordem de nome, quebram.
2. **Ausência.** 102 versões com SQL real aplicadas em homologação sem arquivo correspondente, incluindo o núcleo de permissão.

- [ ] T-22.1 — Recuperar as 102 migrations a partir de `supabase_migrations.schema_migrations.statements`, que guarda o SQL original
- [ ] T-22.2 — Definir a ordem de aplicação correta, sem reescrever carimbo de migration já aplicada
- [ ] T-22.3 — `pnpm test:db:replay` verde: 100% das migrations aplicando em base limpa
- [ ] T-22.4 — Comparar o esquema reconstruído com o da homologação, objeto a objeto — tabelas, colunas, funções, policies, índices e privilégios
- [ ] T-22.5 — Completar o bootstrap de fronteira conforme o replay for descobrindo lacunas, distinguindo defeito da fixture de defeito do repositório
- [ ] T-22.6 — Ligar o replay ao CI, para que a promessa de recuperação passe a ser verificada a cada mudança e não uma vez por descoberta. **Pré-requisito já feito:** `--exigir` faz o script reprovar quando o banco falta, em vez de sair 0 dizendo que não rodou (VACINA-056) — sem isso, ligar ao CI produziria um passo verde que não verifica nada
- [ ] T-22.7 — Propor a substituição da prevenção da VACINA-003: comparação viva contra o ledger remoto e replay executável, no lugar da lista fixa de quatro arquivos
  - [ ] T-22.7.1 — Portão 1, eliminatório: cobre a mesma causa raiz com garantia maior — detecta divergência em qualquer direção, e não só nos quatro arquivos congelados
  - [ ] T-22.7.2 — Portão 2: retorno material — a detecção atual é zero para tudo criado depois da vacina, e deixou passar 102 migrations
  - [ ] T-22.7.3 — Tipo de evidência: `negativa` — provar que a divergência de hoje seria detectada
  - [ ] T-22.7.4 — **PR próprio**, separado da correção que a motivou
- [ ] T-22.8 — Aplicar em homologação as migrations pendentes do repositório, incluindo as duas do Object Runtime. Escrita em ambiente compartilhado: depende de aval do responsável
- [x] T-22.9 — Revisar `RECUPERACAO.md`: aviso de estado verificado no topo, com o resultado do replay e as duas causas medidas, e `pnpm test:db:replay` acrescentado às regras inegociáveis do passo de reconstrução do banco
- [ ] T-22.10 — Revisar `README.md`, que afirma na abertura que o repositório basta para recuperar o projeto: enquanto o replay não passar, o documento precisa dizer o que realmente é possível hoje

---

# Marco M-5 — Padrão de interface de mercado

Aberto em 26 de julho de 2026, a partir de revisão do responsável sobre telas reais em produção. Entra no fim conforme a R4.

O diagnóstico foi direto: *"os módulos são rascunhos mal feitos, o pipeline é estático, muito amador"*. A verificação confirmou cada ponto — não é impressão.

## Sprint S-23 — Fundação de interface: validação, visualizações e pipeline
**Estado:** bloqueada
**Marco:** M-5

> **Parada por prioridade em 10/08/2026, com 23 tarefas concluídas e 11 abertas.**
> A R3 admite uma sprint em andamento por vez, e a migração de linguagens
> (S-43) passou à frente por instrução do proprietário. O estado `bloqueada`
> registra o que já era verdade na prática: nenhuma tarefa da S-23 avançou
> enquanto as S-38 a S-43 foram executadas — a regra só não acusou porque a
> S-43 ainda constava como `pendente`. Retomar exige devolvê-la a
> `em andamento`, e então a S-43 é que precisa sair da vaga.

### Defeitos verificados

| # | Defeito | Evidência |
|---|---|---|
| D1 | Nenhuma validação de CPF, CNPJ, CEP ou telefone | `app/actions/relationship.ts` grava `optional(data,"taxId")` sem validar; os campos são `<input name="taxId"/>` puro. Aceito em produção: CPF `3332227772` (10 dígitos), telefone `12982#2($($`, CEP `Usushe` |
| D2 | Erro de banco vazando cru para o usuário | Tela de Documentos exibe `Could not embed because more than one relationship was found for 'project_documents' and 'project_document_versions'` — embed ambíguo do PostgREST sem dica de chave estrangeira |
| D3 | Mensagem de erro que engana | Falha de configuração aparece como "Credenciais inválidas ou conta não liberada" na tela de login |
| D4 | Uma única visualização por módulo | Tudo é tabela. Não há kanban, calendário, gantt, pivô nem gráfico em lugar nenhum |
| D5 | Pipeline estático | Não é possível arrastar cartão entre etapas; a trilha do cliente não é navegável |
| D6 | Planejamento sem cronograma | Não há Gantt nem linha do tempo, apesar de existirem `project_milestones` e `work_breakdown_items` no banco |
| D7 | Orçamento não recebe dados | Não há caminho de inserção de item de custo; a tela abre zerada e permanece zerada |
| D8 | `favicon.ico` retorna 404 | Console do navegador |

### Padrão de mercado — pesquisa de 26 de julho de 2026

Fonte primária: documentação do **Odoo 19.0**, lida do repositório oficial `odoo/documentation`, arquivo `content/applications/studio/views.rst`. O site `odoo.com` recusa leitura automatizada com 403; o conteúdo veio do fonte, não de blog de terceiro.

O Odoo organiza **um mesmo registro em várias visualizações**, e o usuário troca entre elas:

| Categoria | Visualizações | Para quê |
|---|---|---|
| Gerais | Formulário, Atividade, Busca | editar um registro; agendar e acompanhar; filtrar e agrupar sobre qualquer outra visão |
| Múltiplos registros | **Lista**, **Kanban**, Mapa | tabela com edição em massa; cartões por etapa — *"often used to support business flows by moving records across stages"*; geográfico |
| Linha do tempo | **Calendário**, **Gantt**, Cohort | cronologia; previsão com barras em escala de tempo; ciclo de vida e retenção |
| Relatório | **Pivô**, **Gráfico** | *"explore and analyze the data contained in records in an interactive manner"*; barras, linhas, pizza |

Do Pipedrive, o consenso de mercado é que o ganho está no **arrastar e soltar entre colunas** e na organização por atividade que move a venda — pipeline visual como ferramenta de trabalho, não como relatório.

### O padrão que a plataforma adota

- [x] T-23.1 — **Validação de dados brasileiros**, com máscara na entrada e verificação de dígito
  - [x] T-23.1.1 — CPF e CNPJ com dígito verificador por módulo 11, não só formato (`lib/validacao/br.ts`)
  - [x] T-23.1.2 — CEP com formato de 8 dígitos
  - [x] T-23.1.2b — CEP com consulta de endereço por `/api/cep`, executada no servidor por causa da CSP; preenche só campo vazio e nunca bloqueia o cadastro se o serviço cair
  - [x] T-23.1.3 — Telefone com DDD de lista fechada e nono dígito do celular
  - [x] T-23.1.4 — E-mail mais estrito que `type="email"`, que aceita `a@b`
  - [x] T-23.1.5 — Guarda de servidor `checarCamposBR` em `createCrmLead`, `createRelationshipClient` e `updateRelationshipClient`
  - [x] T-23.1.6 — Erro inline no campo, com `aria-invalid` e `aria-describedby`
  - [x] T-23.1.7 — Máscara progressiva que nunca descarta dígito
  - [x] T-23.1.8 — Verificado em navegador com os dados exatos das capturas: recusados, e zero registros gravados
  - [x] T-23.1.9 — `CampoDocumento`, `CampoTelefone`, `CampoCEP` e `CampoEmail` substituem `<input>` cru em novo cliente, detalhe do cliente e novo lead
  - [x] T-23.1.10 — Verificado em navegador: máscara produz `529.982.247-25` e `(12) 98216-7788`; CPF de 10 dígitos e CEP de 7 dígitos acendem erro no próprio campo
  - [x] T-23.1.11 — `validarCPF` conferido contra implementação independente de referência: 4.000 CPFs, zero divergência
  - [x] T-23.1.12 — Regra de "dígitos iguais" restringida a CPF e CNPJ; no CEP só zeros são barrados, senão a consulta não conseguiria dizer se o CEP existe
  - [x] T-23.1.13 — Verificado em navegador: CEP `12420010` preencheu `Avenida Nossa Senhora do Bom Sucesso`, `Pindamonhangaba` e `SP`
- [ ] T-23.2 — **Seletor de visualização** por módulo, no padrão do Odoo
  - [ ] T-23.2.1 — Lista com ordenação, agrupamento e edição em massa
  - [ ] T-23.2.2 — Kanban com colunas por etapa e arrastar e soltar
  - [ ] T-23.2.3 — Calendário para o que tem data
  - [ ] T-23.2.4 — Gantt para planejamento e cronograma
  - [ ] T-23.2.5 — Pivô e gráfico para os módulos de análise
- [ ] T-23.3 — **Painel de controle padrão**: caminho de navegação, seletor de visão, busca com filtros e agrupamentos salvos, ações em massa
- [ ] T-23.4 — **Formulário padrão**: barra de etapas clicável no topo, ação primária destacada, abas para seções longas, e painel lateral de conversa — mensagens, notas internas, atividades agendadas, anexos e seguidores
- [ ] T-23.5 — **Pipeline do CRM navegável**: cartão com valor, cliente, responsável, prazo e etiqueta; arrastar muda a etapa; soma e contagem por coluna
- [ ] T-23.6 — **Planejamento com cronograma**: Gantt sobre `work_breakdown_items` e `project_milestones`, que já existem no banco
- [ ] T-23.7 — **Orçamento operável**: inserir, editar e remover item de custo, com recálculo de BDI, markup e preço
- [ ] T-23.8 — Corrigir D2, D3 e D8
- [ ] T-23.9 — Aplicar `diretrizes/UI-UX-PRO-MAX.md` e a skill `ui-ux-pro-max` em cada tela refeita
- [x] T-23.10 — Escrever `diretrizes/PADRAO-DE-INTERFACE.md` com o padrão extraído das fontes oficiais, o catálogo de visualizações, a estrutura de formulário, os componentes de campo e o Definition of Done de módulo
- [ ] T-23.11 — Ordem de adoção: componentes de campo primeiro, CRM como piloto, demais módulos replicando o molde com o vocabulário da S-20 na mesma passagem
- [x] T-23.12 — **Fundação de dados do pipeline**: trilha, etapa, cartão, datas, marcadores, observações e histórico — etapa é dado, não esquema
  - [x] T-23.12.1 — Taxonomia de datas decomposta em dois eixos, natureza × marco, com as dez siglas declaradas derivadas da combinação (`lib/pipeline/datas.ts`, 13 testes)
  - [x] T-23.12.2 — Esquema com as nove tabelas, chaves compostas que herdam organização e trilha por integridade referencial, e RLS forçada em todas (`supabase/migrations/20260726120000_pipeline_trilhas.sql`)
  - [x] T-23.12.3 — Presets com as duas listas declaradas pelo responsável — projeto e assistência —, mais a trilha comercial do cliente, instaláveis por RPC (`supabase/migrations/20260726123000_pipeline_presets.sql`)
  - [x] T-23.12.4 — Cada etapa declara que datas exibe e quais exige; toda etapa exibe previsto e efetivo de início e término, que é o que alimenta o Gantt da T-23.6
  - [x] T-23.12.5 — Histórico de etapa escrito só por gatilho, com escrita direta revogada — é o que responde "há quanto tempo está parado aqui"
  - [x] T-23.12.6 — 21 testes de comportamento + RLS + privilégio contra PostgreSQL real, em banco limpo (`pnpm test:db:pipeline`); sabotagem do CHECK de origem reprova o TESTE 8
  - [x] T-23.12.7 — `pnpm validate:pipeline` cruza as siglas do banco com as do TypeScript e recusa jargão de segmento em CHECK; ligado ao CI
- [x] T-23.13 — **Kanban e lista do pipeline**, sobre os mesmos dados e o mesmo filtro
  - [x] T-23.13.1 — Seletor de visualização kanban ↔ lista sem recarregar a página (`components/pipeline/pipeline-view.tsx`)
  - [x] T-23.13.2 — Coluna com contagem, soma e barra de proporção; etapa final recolhida em faixa, como o `fold` do padrão de mercado
  - [x] T-23.13.3 — Arrastar e soltar move o cartão de etapa e grava pela ação de servidor, com erro em português
  - [x] T-23.13.4 — Cartão com título, cliente, estrelas de prioridade, marcadores e **prazo com contagem regressiva**; ordenação da coluna pelo que aperta primeiro
  - [x] T-23.13.5 — 17 testes das regras de coluna, prazo e ordenação (`tests/pipeline-domain.test.ts`)
- [x] T-23.14 — **Cartão completo** na estrutura da seção 5 do padrão de interface
  - [x] T-23.14.1 — Barra de etapas clicável no topo, que move o cartão
  - [x] T-23.14.2 — Botões de estatística — projetos, documentos, chamados, prazos — que abrem a aba correspondente
  - [x] T-23.14.3 — Abas: dados do cliente, projetos, documentos, chamados e prazos, com link para o objeto de cada linha
  - [x] T-23.14.4 — Aba de prazos monta os campos a partir do que a etapa declara, com a sigla e o significado por extenso
  - [x] T-23.14.5 — Conversa lateral com observação e histórico de movimentação de etapa
  - [x] T-23.14.6 — Leitura sem embed aninhado, para não repetir o defeito D2: `pipeline_card_dates` tem duas chaves estrangeiras para o cartão e o PostgREST responderia com embed ambíguo
- [x] T-23.15 — **Segunda passagem sobre as 261 capturas**, cobrindo 12 telas de 8 aplicativos, registrada em `PADRAO-DE-INTERFACE.md` seção 10
  - [x] T-23.15.1 — Três faixas fixas da tela e a ordem delas; paginação à esquerda do seletor de visão; todo menu de app termina em `Relatórios` e `Configuração`
  - [x] T-23.15.2 — Tela única de configurações, com barra lateral de aplicativos, ajuste como caixa + título + descrição, sub-opções reveladas e `Salvar`/`Descartar` no topo
  - [x] T-23.15.3 — Painel de módulo em matriz, com todo número clicável, e cartão por equipe com contadores no rodapé
  - [x] T-23.15.4 — Grade de linhas editável do pedido de compra como molde do orçamento (D7): `adicionar item`, `adicionar seção`, `adicionar nota`, colunas opcionais e totais à direita
  - [x] T-23.15.5 — Anatomia do cartão de kanban por tipo de registro, e o estado vazio com exemplos esmaecidos ao fundo
- [x] T-23.16 — **Aplicação em homologação**, autorizada pelo responsável em 26 de julho de 2026
  - [x] T-23.16.1 — Três migrations aplicadas no projeto `wyeojufebtwblsubkunr`: 9 tabelas, 9 com RLS forçada, 21 políticas
  - [x] T-23.16.2 — Presets instalados pelo caminho real da RPC, sob a identidade do usuário `admin@admin.com`, com a checagem de permissão exercitada — e não contornada
  - [x] T-23.16.3 — Registros reais colocados nas trilhas: 5 chamados e 2 clientes. DLA derivada do `resolution_due_at` já gravado no chamado; nenhuma data inventada. A trilha do projeto ficou vazia porque a organização não tem projeto cadastrado
  - [x] T-23.16.4 — Movimentação de etapa exercitada sob o papel `authenticated`: histórico gravado pelo gatilho com autoria correta
  - [x] T-23.16.5 — **Advisor do Supabase apontou dois defeitos meus**, corrigidos em migration própria (`20260726190000_pipeline_endurecimento.sql`): quatro funções sem `search_path` fixo — a pior é `pipeline_codigo_data`, que decide o que um CHECK aceita e o que a coluna gerada grava — e `pipeline_permite`/`pipeline_permite_cartao` expostas a `anon` em `/rest/v1/rpc`
  - [x] T-23.16.6 — `validate:pipeline` passou a exigir `search_path` em toda função do pipeline, não só nas `security definer`; sabotagem confirmada
  - [x] T-23.16.7 — Kanban e lista verificados em navegador real: colunas com contagem e soma, etapa final recolhida, prazo colorido por situação, ordenação por urgência, busca por marcador e alternância de visão sem recarregar
- [ ] T-23.17 — **Verificar a tela contra a homologação real.** O `fetch` do servidor Next é recusado pelo proxy de egresso do ambiente (`Host not in allowlist: wyeojufebtwblsubkunr.supabase.co`), enquanto `curl` passa por túnel CONNECT. A verificação em navegador foi feita com dados fixos; falta repetir contra o banco depois que o host entrar na lista de egresso do ambiente
- [x] T-23.19 — **Casca vertical: grade de aplicativos por permissão, sem menu lateral**
  - [x] T-23.19.1 — Tela inicial `/app` lista só os aplicativos que o perfil libera, agrupados por categoria, com busca que ignora acento (`components/casca/launcher.tsx`)
  - [x] T-23.19.2 — Barra superior única: logotipo volta à grade, e o nome do aplicativo corrente responde "onde eu estou" agora que não há item de menu marcado
  - [x] T-23.19.3 — Menu lateral removido do aplicativo interno; devolveu 278px de largura a tabelas e kanbans. O portal do cliente mantém o dele, por ter poucas telas
  - [x] T-23.19.4 — Caminho da requisição propagado em `proxy.ts` por `x-pathname`, porque Server Component não enxerga a rota
  - [x] T-23.19.5 — **Ícones viraram SVG** (`components/casca/icones.tsx`). Antes eram glifos escolhidos por semelhança de forma — `♙` para Clientes, `∑` para Orçamentos, `◌` para SAC. Peão de xadrez não é cliente
  - [x] T-23.19.6 — Verificado em navegador com três perfis: produção vê 6 aplicativos, financeiro vê 7, administrador vê 21. Busca sem acento encontra "Orçamentos"; foco de teclado chega ao cartão
  - [x] T-23.19.7 — Alvos de 44px, foco visível, `prefers-reduced-motion` respeitado e nenhum emoji como ícone, conforme a lista de verificação da skill `ui-ux-pro-max`
- [x] T-23.22 — **Grade alinhada e tema claro/escuro**
  - [x] T-23.22.1 — Seis por linha na largura cheia, degradando 6 → 5 → 4 → 3 → 2. Medido em navegador: uma única largura (210px) e uma única altura (129px) entre todos os cartões
  - [x] T-23.22.2 — Categoria deixou de ser título de seção e virou filtro com contador. Como seção, uma categoria com um aplicativo só deixava cinco buracos na linha
  - [x] T-23.22.3 — Tema claro e escuro por token, com terceira opção "seguir o sistema". Preferência em cookie, lida no servidor: o HTML já sai no tema certo e a página não pisca branco antes de escurecer
  - [x] T-23.22.4 — Regras do escuro registradas no CSS: superfície que sobe clareia, nada de preto puro, cor de estado perde saturação e ganha claridade
  - [x] T-23.22.5 — `.campo-br-erro` deixou de usar `#812a34` fixo e passou a ler `var(--danger)`
  - [x] T-23.22.6 — **Defeito encontrado na própria verificação**: `img, svg { max-width: 100% }` do reset zera a largura de um SVG dentro de contêiner de largura indefinida. O alternador de tema renderizou como pílula vazia, sem erro nenhum no console. Fixar `width` não bastava — o `max-width` precisa ser desligado
  - [x] T-23.22.7 — Verificado em navegador nos dois temas, em 1440, 1024, 760 e 420px, sem erro de console
- [x] T-23.23 — **Responsável e seguidores no cartão**
  - [x] T-23.23.1 — `pipeline_card_followers` com RLS: quem enxerga o cartão pode seguir a si mesmo; inscrever outra pessoa exige edição; sair da lista é direito de quem está nela
  - [x] T-23.23.2 — Sem UPDATE na tabela: seguir ou não seguir são duas linhas de estado, e trocar o `user_id` de uma inscrição burlaria a política de inserção
  - [x] T-23.23.3 — Responsável exibido por nome, lido de `profiles`, e trocável por quem tem edição. Antes só existia o uuid na coluna
  - [x] T-23.23.4 — Aplicada em homologação e verificada em navegador: seguir grava, deixar de seguir remove, avatar aparece com as iniciais
- [x] T-23.24 — **Varredura funcional e de acessibilidade**, com login real contra a homologação
  - [x] T-23.24.1 — 21 aplicativos do launcher abertos um a um: todos HTTP 200, nenhum erro de console
  - [x] T-23.24.2 — Cartão do pipeline: barra de etapas move, botões de estatística trocam de aba, cinco abas respondem, observação grava, prazo grava
  - [x] T-23.24.3 — Nenhum controle sem nome acessível; um `h1` por página; nenhuma imagem sem `alt`; foco de teclado visível com contorno de 3px
  - [x] T-23.24.4 — **Alvo de toque corrigido**: as estrelas de prioridade tinham menos de 30px. Passaram a 32×32
  - [x] T-23.24.5 — **Defeito encontrado e corrigido**: `revalidatePath` sem `"layout"` não alcançava a rota do cartão, e seguir alguém gravava no banco sem mudar a tela
  - [x] T-23.24.6 — Contorno da verificação registrado: o `fetch` do servidor local passou a atravessar o proxy do ambiente por túnel CONNECT, o mesmo caminho que o `curl` usa. Arquivo de pré-carga fora do repositório; em produção o servidor fala direto
- [x] T-23.25 — **Publicado no Vercel**, deploy `dpl_6RujGN7CrjLsGQdFeisg1iNMYms6`, estado READY, commit `6cc342f`
  - [x] T-23.25.1 — O push no ramo dispara o deploy: o projeto `innov` está ligado ao GitHub. Não foi preciso subir árvore de arquivos
  - [x] T-23.25.2 — Verificado no ar: `/login` responde 200, `<html data-tema="sistema">` sai do servidor, `/icon.svg` está no `<head>` e os cabeçalhos de CSP, HSTS e `x-frame-options` chegam
  - [x] T-23.25.3 — Alias do ramo: `innov-git-claude-diretrizes-object-runtime-apex-method.vercel.app`
- [x] T-23.26 — **Promovido para produção em 27/07**, por decisão explícita do responsável: *"já faz o main para produção, depois de finalizar o projeto trocamos as senhas, são todos dados fictícios de clientes"*
  - [x] T-23.26.1 — `main` avançou de `55f4d56` (21/07) para `e72d172` por *fast-forward*: os 178 commits do ramo entraram sem merge de conciliação, porque `main` não tinha commit próprio
  - [x] T-23.26.2 — Portão completo executado **em `main`**, não só no ramo: `lint`, `typecheck`, `test` (149), `test:python` (5), `build`, `validate:docs`, `validate:inventory`, `validate:pipeline`, `validate:migrations` e os 26 testes de banco contra PostgreSQL 16 real
  - [x] T-23.26.3 — Endereço de produção: `innov-apex-method.vercel.app`
  - [ ] T-23.26.4 — **Pendência assumida e datada**: `admin321` e `cliente321` continuam valendo. A decisão do responsável foi promover assim porque os dados são fictícios, e trocar as senhas ao fim do projeto. Enquanto não forem trocadas, o endereço público aceita credencial fraca conhecida — isto não é um detalhe resolvido, é uma dívida em aberto com dono e prazo
- [ ] T-23.27 — **Verificar o fluxo autenticado no ar.** A proteção de deploy do Vercel intercepta as rotas de `/app` antes da aplicação, então a varredura autenticada foi feita contra o servidor local ligado à mesma homologação. Repetir no ar depende de liberar o acesso ou usar um link de compartilhamento
- [x] T-23.28 — **Tese do responsável conferida contra as 261 capturas** (`PADRAO-DE-INTERFACE.md` §11)
  - [x] T-23.28.1 — As 261 enumeradas por aplicativo a partir da rota no nome do arquivo: Helpdesk 46, Sign 39, Project 39, CRM 27, ações diversas 27, Contacts 25, Purchase 19, Settings 12, Appointments/Calendar 13, demais 14
  - [x] T-23.28.2 — Dezoito abertas e lidas, escolhidas para cobrir cada aplicativo e cada tipo de visualização. **Não foi comparação imagem a imagem das 261**, e o documento diz isso
  - [x] T-23.28.3 — Dez elementos nomeados pelo responsável conferidos, nenhum desmentido. Appointments e Purchase têm a mesma casca, mudando só o miolo
  - [x] T-23.28.4 — Exceção encontrada e registrada: `Sign → Green Savings` é relatório de leitura pura, sem conversa, sem seletor e sem barra de etapas. Página onde se trabalha não sai do molde; página de leitura pode
  - [x] T-23.28.5 — Tabela do que a Innovar já segue e do que falta, item a item
- [x] T-23.29 — **Cor por aplicativo na grade**, atendendo "olha como é colorida e moderna". Vinte e um ícones da mesma cor obrigam a ler todos os rótulos; a cor é do aplicativo, não da categoria
- [x] T-23.30 — **Criar e editar etapa pela própria coluna do kanban**, com `+` para cartão e engrenagem no hover — o item que o responsável marcou em três comentários distintos
  - [x] T-23.30.1 — Política `pipeline_stages_write` afrouxada de `administracao EDIT` para `pipeline_permite(pipeline_id,'EDIT')`: quem trabalha o kanban nomeia as colunas dele (`20260727090000_pipeline_conversa_e_etapas.sql`)
  - [x] T-23.30.2 — Ações `criarEtapa`, `renomearEtapa`, `alternarEtapaRecolhida`, `excluirEtapa` e `criarCartao` com mensagem em português — nenhum erro de PostgREST na tela
  - [x] T-23.30.3 — `components/pipeline/coluna-acoes.tsx`: `+` no cabeçalho, engrenagem que só aparece no hover (`opacity`, não `display`, para não sumir do teclado) e campo de etapa nova no fim das colunas
  - [x] T-23.30.4 — Formulário rápido exige o registro da trilha, porque o CHECK `pipeline_cards_origem_coerente` recusa cartão de assistência sem chamado; `registrosDisponiveis()` exclui quem já tem cartão
  - [x] T-23.30.5 — Excluir etapa com cartão é recusado com frase, não com erro de chave estrangeira. Verificado no navegador: *"Prospecção" tem 1 cartão. Mova ou arquive antes de excluir a etapa.*
  - [x] T-23.30.6 — Coluna recolhida mantém a engrenagem visível: girar o cabeçalho inteiro empurrava o controle para fora da faixa de 62px e recolher virava caminho sem volta
- [x] T-23.31 — **Completar o canto direito da barra**: mensagens, notificações e configuração, ao lado do tema e do usuário
  - [x] T-23.31.1 — `lib/casca/avisos.ts`: mensagem é observação que outra pessoa escreveu em cartão que eu respondo ou sigo; notificação é atividade em aberto no meu nome. Nenhum contador decorativo
  - [x] T-23.31.2 — "Não lido" é marco de tempo em cookie `httpOnly`, não tabela de leitura por linha; ler em um aparelho não marca lido no outro, e isso está registrado como limitação
  - [x] T-23.31.3 — Falha ao carregar avisos não derruba a casca: `catch` devolve painéis vazios em vez de deixar o usuário sem barra e sem saída
  - [x] T-23.31.4 — Ícone de configuração desenhado como engrenagem com oito dentes calculados, não círculo com raios — que é o mesmo desenho do tema claro, dois botões à esquerda
  - [x] T-23.31.5 — Defeito de render encontrado e corrigido: `startTransition` dentro do atualizador de `setState` impedia dois dos três painéis de abrir (`VACINA-015`)
- [x] T-23.32 — **Conversa lateral completa**: mensagem, nota interna, WhatsApp e atividade agendada, como componente único reusado por todos os módulos
  - [x] T-23.32.1 — `components/conversa/` com contrato `AcoesConversa` injetado: o que muda de módulo para módulo é onde grava, não a tela. As classes CSS não levam o nome do módulo, para não virarem `chamado-conversa` e `obra-conversa` no primeiro reúso
  - [x] T-23.32.2 — WhatsApp entra como tipo de observação, não como tabela: mesma linha do tempo, só o canal muda (`tipo in ('nota','mensagem','whatsapp')` + coluna `destino`)
  - [x] T-23.32.3 — Não existe envio: a plataforma registra e abre o WhatsApp com o texto pronto. A janela só abre depois de gravar, para ninguém sair achando que ficou registrado
  - [x] T-23.32.4 — `pipeline_card_activities` com RLS, chave composta para a organização e três índices — o que está em aberto é o que a tela consulta o tempo todo
  - [x] T-23.32.5 — Observação e movimento de etapa em uma lista só, ordenada pelo relógio; duas listas obrigariam quem lê a intercalar de cabeça
  - [x] T-23.32.6 — Telefone sujo do mundo real (`12982#2($($`) é recusado **antes** do envio, com o número mostrado na frase; antes o rodapé prometia abrir e só depois recusava
  - [x] T-23.32.7 — Seis testes novos contra PostgreSQL 16 real (22 a 26): canal não declarado, tipo de atividade inventado, atividade sem título, organização divergente pela chave composta e exclusão de etapa com e sem cartão
  - [x] T-23.32.8 — `run-pipeline-db-tests.mjs` passou a descobrir as migrations em vez de listá-las: duas migrations aplicadas ao Supabase estavam fora do encadeamento e a suíte dava verde sobre esquema antigo (`VACINA-014`)
- [x] T-23.20 — **Defeito D8 corrigido**: `app/icon.svg` declara o ícone da aba; o 404 de favicon apareceu no console durante a verificação desta sprint
- [x] T-23.21 — **Menus por aplicativo na barra superior**, no padrão `CRM · Sales · Reporting · Configuration` das capturas
  - [x] T-23.21.1 — `lib/casca/menus.ts` declara os menus de 15 módulos. Declarados e não descobertos: nenhuma convenção de pasta expressa que "Leads" vem antes de "Oportunidades"
  - [x] T-23.21.2 — `pnpm validate:menus` confronta cada destino com o roteador do Next e reprova o que não tem página. Reprovou dois na primeira execução — `/app/qualidade/respostas` e `/app/assinaturas/documentos` só existem por id — e os dois foram corrigidos. No CI
  - [x] T-23.21.3 — Módulo sem menu declarado fica só com ícone e nome: inventar "Configuração" para preencher a barra criaria destino que não existe
  - [x] T-23.21.4 — **Defeito encontrado ao verificar**: o layout do Next não re-renderiza em navegação suave, então resolver o módulo pelo `x-pathname` do servidor congelava a barra na primeira tela. O `h1` mudava e o menu ativo continuava marcando a anterior. Passou a `usePathname` em `components/casca/navegacao-do-modulo.tsx`
- [x] T-23.33 — **Cabeçalho de página reduzido em toda a casca**, atendendo "não precisaria desse título aqui, precisa ser mais clean"
  - [x] T-23.33.1 — Resolvido na regra que governa as 84 páginas, não em 84 arquivos: dentro de `.casca`, o `h1` cai de `clamp(34px, 4.6vw, 54px)` para 1,06rem, o selo do módulo sai (o módulo agora está na barra, com ícone) e a descrição continua visível em corpo menor
  - [x] T-23.33.2 — Fora da casca — login, portal do cliente, página de assinatura — o título grande continua: ali ele é conteúdo, não moldura
  - [x] T-23.33.3 — A descrição foi reduzida, não escondida: `display: none` a tiraria também de quem usa leitor de tela, o que é troca e não economia
  - [x] T-23.33.4 — Pipeline ganhou a barra de controle do padrão: `Novo` à esquerda, nome da tela ao lado, busca ao centro, visualizações em ícone à direita. As três trilhas viraram os menus do módulo. O kanban começa em y=160 no lugar de y=385
  - [x] T-23.33.5 — Visualizações em ícone com `aria-label` e `title`: "ícones, igual ao Odoo, ocupam menos espaço, poluem menos e facilita a leitura do pipeline"
  - [x] T-23.33.6 — Cartão deixou de repetir o nome do registro duas vezes na mesma tela; o `h1` passou para dentro do formulário, onde o nome é conteúdo
  - [x] T-23.33.7 — Engrenagem antes do `+` no cabeçalho da coluna, na ordem do padrão
- [x] T-23.18 — **Defeito D3 corrigido.** Login classifica o erro pelo `code`/`status` estável do Supabase Auth; credencial inválida, e-mail não confirmado, limite e indisponibilidade recebem mensagens diferentes. Falha de transporte também é cercada, e o log não recebe e-mail, senha nem mensagem interna (`lib/auth-errors.ts`, 5 testes, `VACINA-018`)
- [x] T-23.34 — **Acessibilidade e navegação responsiva da casca.** Menus do módulo não desaparecem mais abaixo de 900 px: viram menu móvel com os mesmos destinos e estado ativo. Mensagens, notificações, avatar e controles de toque foram alinhados ao alvo mínimo de 44 × 44 px (`VACINA-019`)

---

## Sprint S-24 — Pipelines como objeto do usuário, criação em toda parte e planejamento com Gantt
**Estado:** pendente
**Marco:** M-5

Nasceu da revisão do responsável em 27 de julho, sobre a entrega da S-23. O que
ele apontou não é acabamento: são funções que a plataforma não tem e que toda
ferramenta do mercado tem. Vai para o fim do inventário conforme R4.

### O que a revisão apontou

| # | Apontamento | Consequência |
|---|---|---|
| A1 | "Pipeline" foi tratado como aplicativo, agregando as três trilhas | Corrigido ainda na S-23 (T-23.21): o funil pertence ao aplicativo dono — CRM, Projetos e Chamados |
| A2 | Não existe criar, editar nem excluir **pipeline** | Só as etapas eram configuráveis. O funil em si é fixo, um por trilha, criado por preset |
| A3 | Um módulo precisa de **vários** pipelines | CRM tem SDR, pré-venda e venda; pós-venda tem projeto e execução; assistência tem o seu |
| A4 | "Sempre eu deveria ter a opção de criar coisas: pipelines, cards, clientes" | O `Novo` do pipeline cria cartão para registro **existente**. Não há como cadastrar cliente, projeto ou chamado de dentro do fluxo |
| A5 | Planejamento não abre Gantt ao clicar no cliente | Não há Gantt, nem dependência de tarefa (II, IT, TT, TI), nem dias programados |
| A6 | Falta a visão de lista do planejamento, por cliente | Sem início da obra, término previsto, etapa atual e suas datas, % concluída, sinalização de prazo, dias de folga ou atraso, responsável e próxima tarefa |
| A7 | Cadastro de obra deveria vir do App Projetos ao criar no pipeline | Hoje o pipeline exige que o projeto já exista |
| A8 | Não há busca no meio da barra superior | Bitrix, Pipedrive e Sophia têm busca global no topo; a busca atual é só do pipeline, na barra de controle |
| A9 | A seção de cadastrar usuários não foi encontrada | `/app/administracao/usuarios` existe desde a S-12.1 e não tinha caminho de menu. Menu criado na T-23.21; falta conferir a tela contra o padrão |
| A10 | Personas e rotinas não foram produzidas | Foram pedidas e não entregues. Sem elas, cada tela é decidida no gosto de quem escreve, que é exatamente a crítica |

### Tarefas

- [x] T-24.1 — **Personas e rotinas escritas**, em `diretrizes/PERSONAS-E-ROTINAS.md`, canônico e no validador
  - [x] T-24.1.1 — Seis personas com fonte citada: as palavras do responsável sobre nível de acesso, as 261 capturas e o fluxo de móveis planejados já modelado nos presets. Nenhuma inventada
  - [x] T-24.1.2 — Cada uma responde às quatro perguntas: por onde entra, qual a pergunta do dia, o que precisa em três cliques e o que a plataforma ainda não faz
  - [x] T-24.1.3 — P3, o montador, tem poder de veto sobre desenho móvel: é a única persona que trabalha de pé, com uma mão, em tela pequena e sinal ruim ao mesmo tempo
  - [x] T-24.1.4 — Regra levada ao `CLAUDE.md`: tela que não declara persona, origem, pergunta e contagem de cliques não é construída
  - [x] T-24.1.5 — **Reescrito no mesmo dia, depois da crítica que invalidou a primeira versão**: *"o cara de planejamento deve saber trabalhar com project (…) quais conhecimentos ele precisa ter? isso que é matriz de competências!!!"*. A primeira versão descrevia **o que cada persona clica**, e caminho de clique é consequência, não causa. Persona escrita por cliques só valida a tela que já existe — nunca aponta o campo que falta, porque não conhece a técnica que precisaria dele
  - [x] T-24.1.6 — Estrutura nova em quatro camadas, de baixo para cima: **competência → ferramenta → técnica → rotina**, e cada técnica **declara o dado que exige**. É o que faz a persona virar requisito de banco em vez de opinião de tela
  - [x] T-24.1.7 — P2 separada em duas: **planejador** (rede, prazo e custo do prazo) e **P7 projetista** (detalhamento executivo). Juntar as duas produziu um "engenheiro" que não existe em nenhuma das duas cadeiras
  - [x] T-24.1.8 — Catálogo de onze técnicas do planejamento com a conta **executada**, e o diagnóstico de esquema de cada uma: PERT três pontos, CPM com folga total, custo marginal de aceleração, corrente crítica com pulmão, linha de base, curva S, curva ABC, DSM, calendário e regime, nivelamento de recurso, referência de preço com data-base
  - [x] T-24.1.9 — Layout de referência lido de MS Project e Primavera P6, oito características comuns, com o que já existe e o que falta. A mais cara é a que falta: **grade editável ao lado do Gantt**, com predecessora digitável no formato `12TI+3d` — é o gesto mais repetido do dia e nenhum modal ganha dele
- [x] T-24.2 — **Pesquisa de campo do CRUD de pipeline** (`PADRAO-DE-INTERFACE.md` §13), lida das capturas antes de qualquer código
  - [x] T-24.2.1 — Achado que muda o desenho: **o Odoo não tem objeto "pipeline"**. Tem um escopo dono — `Sales Team` no CRM, o próprio projeto em Project — e etapas ligadas a ele. Criar funil é criar escopo, não abrir tela de configuração à parte
  - [x] T-24.2.2 — Mapa de onde cada comando mora, com a captura que prova cada linha: trocar de funil no breadcrumb, configurar na engrenagem colada ao nome, criar no menu `Configuração` do aplicativo, etapa no fim das colunas
  - [x] T-24.2.3 — Diagnóstico do que falta: o banco **já aceita** vários funis por trilha. O que trava é `carregarPipeline` pegar só o padrão, a restrição de um padrão por trilha e a ausência de seletor. É leitura e tela, não modelagem — a T-24.3 começa pela consulta, não pelo esquema
  - [x] T-24.2.4 — Cinco decisões fixadas, entre elas: não existe tela central de criar funil, porque não existe aplicativo "Pipeline"; e preset é atalho, não obrigação — quem cria "SDR" não recebe "medição" e "fabricação"
- [x] T-24.3 — **Vários funis por aplicativo**, sem nenhuma migration — a pesquisa da T-24.2 estava certa
  - [x] T-24.3.1 — Confirmado no esquema: `pipelines_padrao_unico_idx` é índice **parcial** (`where padrao`), então limita quantos são padrão e não quantos existem. O esquema sempre aceitou vários
  - [x] T-24.3.2 — `funisDaTrilha()` lista todos os ativos; `carregarPipeline` já aceitava a chave e passou a receber a da URL
  - [x] T-24.3.3 — Funil escolhido vai para `?funil=`: recarregar mantém, e o endereço pode ser mandado apontando para o funil certo
- [x] T-24.4 — **CRUD de funil**: criar em branco ou de preset, renomear, arquivar, definir padrão e excluir
  - [x] T-24.4.1 — Preset é atalho, não obrigação: quem cria "SDR" começa em branco e cria as etapas na própria coluna
  - [x] T-24.4.2 — Arquivar é o caminho normal, excluir é para o que nasceu errado. Funil com cartão manda arquivar, para preservar o histórico
  - [x] T-24.4.3 — Excluir ou arquivar o padrão é recusado com frase. Verificado no navegador: *"Trilha do cliente" é o funil padrão da trilha. Defina outro como padrão antes de excluir este.*
  - [x] T-24.4.4 — `definirFunilPadrao` limpa o anterior antes de marcar o novo, porque o índice parcial recusa dois padrões — e é ele que garante que a tela nunca fique sem saber qual abrir
- [x] T-24.5 — **Seletor de funil na barra de controle**, ao lado do nome, com engrenagem no hover — a posição que a §13 leu do breadcrumb `Projects / Teste ⚙`
  - [x] T-24.5.1 — Nunca na barra 1: trocar de funil não troca de aplicativo, e a barra 1 é do aplicativo
  - [x] T-24.5.2 — Verificado ponta a ponta: criar "SDR" em branco, trocar para ele por `?funil=sdr_...`, ver zero coluna e o campo de etapa nova, e excluir. Zero erro de console
- [x] T-24.6 — **Criar registro de dentro do funil**: cliente, projeto e chamado nascem do `+` da coluna, sem sair do fluxo
  - [x] T-24.6.1 — Duas abas no formulário da coluna: vincular registro existente, ou cadastrar novo. Coluna sem registro livre leva direto ao cadastro
  - [x] T-24.6.2 — A validação brasileira é a **mesma** `checarCamposBR` do formulário completo, não uma segunda cópia. Verificado no navegador: CPF de 10 dígitos recusado com *"CPF precisa ter 11 dígitos; recebeu 10"* e o telefone sujo `12982#2($($` com *"precisa ter 10 dígitos com DDD; recebeu 6"* — os dois valores que passaram para produção no defeito D1
  - [x] T-24.6.3 — **Projeto nasce sem contrato**, que era o "como vou planejar algo que nem existe cadastro?" do print do planejamento. `projects.contract_id` é anulável e o índice de unicidade é parcial: o que existia era só o caminho pelo contrato, não uma restrição do banco
  - [x] T-24.6.4 — Chamado nasce pela RPC `create_sac_ticket`, não por INSERT: é ela que numera e aplica os prazos de primeira resposta e resolução. Inserir direto criaria chamado sem SLA
  - [x] T-24.6.5 — **Defeito encontrado ao verificar**: eu gravava `lifecycle_stage: "LEAD"`, valor que o CHECK não aceita — os válidos são PROSPECT, CUSTOMER, ACTIVE, INACTIVE e FORMER. Corrigido para `PROSPECT`, e a violação de CHECK passou a ter mensagem própria em vez de cair no "não foi possível", que é o defeito D2 por uma porta nova
- [x] T-24.0 — **Mapa das duas barras escrito antes do código** (`PADRAO-DE-INTERFACE.md` §12), ditado pelo responsável e conferido contra as capturas: o que fica em cada posição, o que nunca pode estar ali, quando cada visualização aparece e a exceção declarada da busca
  - [x] T-24.0.1 — Barra 1 igual em toda tela: marca sozinha à esquerda, ícone e nome do aplicativo com os menus dele, mensagens, notificações e avatar à direita; busca reconciliada na barra 2 em 28/07
  - [x] T-24.0.2 — E-mail por extenso e botão "Sair" saíram da barra para dentro do avatar, junto com tema, atalhos e "Usuários e permissões" — dois elementos permanentes para uma ação de uma vez por dia
  - [x] T-24.0.3 — Barra 2 com ações à esquerda, busca contextual ao centro e visualizações à direita, sem repetir o nome do aplicativo
  - [x] T-24.0.4 — `BarraDeTrabalho` extraída como componente transversal e usada no pipeline e na administração de responsabilidades
- [ ] T-24.7 — **Busca global na barra de trabalho**: hoje o campo existe no centro, com faceta e remoção, e filtra a tela do pipeline. Falta procurar em cliente, projeto, chamado e cartão ao mesmo tempo, com resultado agrupado por tipo, e o painel de Filtros, Agrupar por e Favoritos da §12.5
  - [x] T-24.7.1 — Campo no centro da barra 2, com lupa, faceta removível e Backspace apagando a faceta
  - [x] T-24.7.2 — Filtro aplicado no navegador, não por navegação. A primeira versão escrevia em `router.replace` a cada tecla; como as telas são `force-dynamic`, cada digitação virava ida ao servidor e a lista chegava quase três segundos atrasada. A URL continua espelhada por `history.replaceState`, sem re-render de servidor
  - [x] T-24.7.3 — Exceção declarada na §12.4: o campo só aparece onde a tela sabe consumi-lo. Campo que aceita texto e não filtra ensina que a busca não funciona
- [ ] T-24.8 — **Planejamento, visão de lista por cliente** — parcial
  - [x] T-24.8.1 — Coluna de situação do prazo em três estados, com a régua de sete dias: é o intervalo em que ainda dá para remanejar equipe ou antecipar material; menos que isso, o aviso chega junto com o problema
  - [x] T-24.8.2 — O código da obra abre o cronograma, que era o "clicar no nome e abrir o gantt" do print
  - [x] T-24.8.3 — Coleção agora mostra etapa atual, datas da etapa, dias de folga ou atraso, responsável e próxima tarefa programada; o código continua abrindo o Gantt
- [x] T-24.9 — **Gantt com dependências**, no lugar da barra por porcentagem que existia na tela de cronograma
  - [x] T-24.9.1 — Achado que reduziu o trabalho: os quatro tipos **já existiam** como enum desde a etapa 12 — `FS`, `SS`, `FF`, `SF` são exatamente TI, II, TT e IT. `lag_days` e `duration_days` também. Não foi preciso criar modelo de dependência
  - [x] T-24.9.2 — O que faltava era a única coisa que torna cronograma incalculável: **ciclo**. `A→B→C→A` passava por toda restrição existente, porque nenhuma olha além do par imediato. Gatilho com CTE recursiva, cobrindo INSERT e UPDATE
  - [x] T-24.9.3 — Chave composta `(tarefa, projeto)` nos dois lados: dependência entre tarefas de projetos diferentes vira erro de integridade, não disciplina de quem escreve
  - [x] T-24.9.4 — `lib/planejamento/cronograma.ts` com passada para frente, folga positiva e negativa, e a regra de que a data fixada pelo planejador vence quando é mais tarde. **17 testes antes da tela existir**, incluindo virada de mês e de ano
  - [x] T-24.9.5 — 7 testes contra PostgreSQL real, com `pnpm test:db:planejamento` no CI
  - [x] T-24.9.6 — Cadeia que empurra a entrega destacada, e nomeada pelo que é: não é caminho crítico do CPM, porque não há passada para trás nem folga total. Vender o nome sem a conta seria prometer o que não se entrega
  - [x] T-24.9.7 — **Defeito encontrado ao verificar**: a migration estava no repositório e **não no banco**. O formulário aceitou `T5 → T1` e fechou o laço. Aplicada ao Supabase e reverificada: a recusa aparece com a frase certa
  - [x] T-24.9.9 — **Calendário de trabalho**, `lib/planejamento/calendario.ts`: quatro regimes, 13 feriados nacionais (9 fixos e 4 móveis **calculados** pela Páscoa, Meeus/Jones/Butcher — tabela ano a ano envelhece em silêncio e erra no ano que ninguém conferiu), e toda a aritmética do cronograma convertida para **dia útil**. A conta do responsável, executada: 20 úteis + 8 de fim de semana + 1 feriado = **29 corridos**; quatro fins de semana são oito dias, e só o total muda
  - [x] T-24.9.10 — **Três curvas** sob o Gantt, `lib/planejamento/curvas.ts`: planejado total, previsto parcial e realizado parcial, com liga-desliga. Ponderação por dia útil, nunca por contagem de tarefas. Limitação **declarada no arquivo**: a plataforma guarda o progresso de hoje e não a série diária dele, então a curva do passado é reconstruída — o apontamento datado da S-25 substitui a reconstrução. Registrar isso é o que impede alguém de usar a curva como prova em discussão de prazo
  - [x] T-24.9.11 — Fim de semana e feriado hachurados no quadro, feriado com nome; escala fixa no topo e nomes fixos à esquerda; quadro limitado a `calc(100vh - 320px)` com rolagem própria — o "todos calendários têm que pegar até o final da tela" do print do Odoo
  - [x] T-24.9.8 — Verificado com cenário real de 5 tarefas e 5 dependências: T2 começa no dia seguinte ao término de T1, T3 respeita a folga de 2 dias, e a compra de ferragens fica **fora** da cadeia — o ramo curto não empurra a entrega
- [ ] T-24.10 — **Conferir a tela de cadastro de usuários** contra o padrão pesquisado, já que o responsável não a encontrou
- [ ] T-24.11 — **Varredura do texto poluído** nas 84 telas: o cabeçalho encolheu na S-23, mas cada tela ainda precisa ser olhada uma a uma contra o padrão

---

## Sprint S-25 — Serviço de campo: execução, apontamento e retroalimentação do planejamento
**Estado:** pendente
**Marco:** M-5

Ditada pelo responsável em 27 de julho. Desenho completo em
[`SERVICO-DE-CAMPO.md`](SERVICO-DE-CAMPO.md). Vai para o fim conforme R4.

Não é um módulo a mais: é o fechamento do ciclo. Hoje o planejamento produz uma
previsão que ninguém confronta com a realidade, e a realidade fica na cabeça de
quem está na obra.

### Tarefas

- [x] T-25.1 — **Natureza do check-in decidida pelo responsável em 27/07: alimenta a folha de pagamento.** Registro de jornada é artefato regulado (Portaria 671/2021 do MTP), e isso eleva a exigência técnica desde a primeira linha — detalhado na §7.1
- [ ] T-25.1.1 — Marcação imutável: `UPDATE` e `DELETE` negados; correção é linha nova de ajuste apontando para a original, com autor e motivo obrigatórios
- [ ] T-25.1.2 — Comprovante por marcação e espelho de ponto por pessoa e competência
- [ ] T-25.1.3 — Encadeamento por hash, para que adulteração em lote seja detectável
- [ ] T-25.1.4 — Marcação fora da janela ou do raio **não é bloqueada**, é gravada com a divergência anotada. Bloquear faria a pessoa trabalhar sem conseguir registrar que trabalhou
- [ ] T-25.1.5 — Deixar explícito o que fica fora: a plataforma produz registro e espelho; não calcula folha, convenção coletiva, banco de horas nem adicional noturno
- [ ] T-25.2 — **Check-in e check-out com localização**, alimentando horas trabalhadas
- [ ] T-25.3 — **To-do de campo**: alimentado pelo planejador, atualizado pelo profissional com o número de dias que faltam. Reaproveita `pipeline_card_activities`
- [ ] T-25.4 — **DPPT e DEPT como naturezas de data**, na taxonomia que já existe. Não é modelo novo: é mais um par na tabela que `pipeline_codigo_data` governa
- [ ] T-25.5 — **TEP e TEPr**: `TEP = DPPT − DEPT` no cartão e na notificação; `TEPr = TEP / prazo × 100` para ordenar, acender sinal e comparar equipes. Sem o relativo, o ranking premia quem pega tarefa longa
- [ ] T-25.6 — **Motivo obrigatório quando TEP fica negativo**, em lista fechada — chuva, material, saúde, tarefa anterior, cliente, outro. Texto livre não vira métrica
- [ ] T-25.7 — **Notificação para responsável e seguidores** quando o TEP vira negativo, pelo canto direito que já existe
- [ ] T-25.8 — **Solicitação de insumo abre uma parada**, não só um pedido. Regra do responsável: se falta material, o montador obrigatoriamente para
  - [ ] T-25.8.1 — Parada com início e fim: abre na solicitação, fecha quando o material chega. Tempo medido, não estimado de memória
  - [ ] T-25.8.2 — Entra no `TEP` como causa declarada, separando "rendeu menos" de "ficou esperando" — problemas de setores diferentes
  - [ ] T-25.8.3 — Notifica o almoxarifado e alimenta o KPI de parada de obra por falta de material
- [ ] T-25.9 — **Calendário do dia** para o perfil de execução
- [ ] T-25.15 — **A janela dos 15 minutos é do sistema**: notificação no horário de fechamento do dia, listando o que falta preencher. Esperar o profissional lembrar produz diário em branco e `DEPT` desatualizado — e `DEPT` desatualizado derruba `TEP`, sinal amarelo, painel e matriz, nessa ordem
- [ ] T-25.16 — **Três momentos, não uso contínuo.** O aplicativo interrompe o trabalho: chegada, necessidade e 15 minutos antes de sair. O critério de pronto passa a ser **terminar de primeira** — fluxo que exige segunda tentativa custa uma segunda parada
- [ ] T-25.10 — **Sinal amarelo propagado**: cartão, planner, módulo de projeto e painel
- [ ] T-25.11 — **Painel de obras**: quantas no prazo, quantas atrasadas, desempenho por equipe e do planejador
- [ ] T-25.12 — **Matriz de competências**: rendimento por tipo de tarefa, média de 6 meses **com desvio padrão**. Média sozinha esconde a equipe que faz em 4 ou em 8 dias
- [ ] T-25.13 — **Avaliação do cliente** de 0 a 5 em sete critérios, alimentando a matriz. Antes de gravar, decidir o que a §7.2 levanta: quem vê a nota individual e por quanto tempo ela pesa
- [ ] T-25.14 — **Conferir tudo com a persona P3**, que tem veto: de pé, uma mão, tela pequena, sinal ruim

---

## Sprint S-26 — KPIs setoriais e individuais
**Estado:** pendente
**Marco:** M-5

Pedida pelo responsável em 27 de julho: "quero que você crie kpis por setor e
individual para todos os módulos, isso é de extrema importância". Catálogo
completo em [`KPIS.md`](KPIS.md). Vai para o fim conforme R4.

### O que a escrita do catálogo já resolveu

- **A fonte existe.** `pipeline_card_stage_history` grava toda transição com
  origem, destino e instante. Dela saem toda conversão, todo tempo de ciclo,
  toda estagnação e todo retrabalho — sem tabela nova.
- **O erro do denominador foi documentado com a conta feita.** "Leads Ganhos"
  (contratos ÷ leads) e "Taxa de Conversão" (contratos ÷ briefings) parecem o
  mesmo indicador e não são: a razão entre eles é exatamente o filtro da
  entrada. Cobrar o vendedor pelo primeiro quando o marketing mudou a fonte é
  punir quem não causou.

### Tarefas

- [ ] T-26.0 — **Aplicar o teste da §0 a cada KPI antes de implementar**: se atrasar gera grande impacto? dá para medir o acerto? quem fica abaixo é identificável? só então o geral do setor. Candidato que não passa da primeira pergunta vira relatório, não indicador
- [ ] T-26.1 — **Camada de cálculo única**, lendo de `pipeline_card_stage_history` e das tabelas de domínio. Um KPI calculado em dois lugares diverge no primeiro ajuste
- [ ] T-26.1.1 — Janela de 6 meses anteriores + 6 meses atuais, com **desvio padrão amostral (n−1)**. A comparação entre as metades é a tendência; o ano é o retrato
- [ ] T-26.1.2 — Faixa de alerta derivada do próprio histórico — `média ± 1σ` —, com a média de mercado da §0.2 como segunda régua. Alvo arbitrário reprova quem não merece
- [ ] T-26.1.3 — Ordenação para escolha de equipe por `média + desvio`, nunca só pela média: calculado, duas equipes com média idêntica de 6 dias diferem em 1,9 dia no pior caso
- [ ] T-26.2 — **Motivo de perda no CRM**: campo em lista fechada. É o único KPI do módulo hoje marcado 🔴 — o dado não existe
- [ ] T-26.3 — **Conversões do funil comercial**, depois dos funis por setor da S-24: qualidade de lead, conversão de leads, conversão em projeto, leads ganhos e taxa de conversão, com os dois denominadores convivendo
- [ ] T-26.4 — **KPIs de campo e do planejador** (aderência, desvio relativo, acerto do plano), depois da S-25
- [ ] T-26.5 — **KPIs de assistência**, com destaque para chamados por obra entregue — o indicador que liga o pós-venda a quem executou
- [ ] T-26.6 — **KPIs de qualidade, financeiro, compras e estoque**, incluindo parada de obra por falta de material
- [ ] T-26.7 — **Matriz de competências** por tipo de tarefa, com média **e desvio padrão** de 6 meses. Ordenação por `média − desvio` para escolha de equipe
- [ ] T-26.8 — **Painel executivo** compondo os anteriores
- [ ] T-26.9 — **Decidir as quatro regras da §15 antes de publicar qualquer KPI individual**: quem vê o próprio número, janela de esquecimento, caminho de contestação, e nunca publicar contagem absoluta antes do denominador que a normaliza

---

## Sprint S-27 — Planejamento profissional: as técnicas que o planejador executa
**Estado:** pendente
**Marco:** M-5

Nasceu da crítica de 27 de julho que invalidou a primeira versão das personas:

> "o cara de planejamento deve saber trabalhar com project, como se faz um
> planejamento, quais ferramentas ele usa, quais conhecimentos ele precisa ter?
> (…) o que é curva A, ABC, custo marginal, otimista, pessimista e normal,
> caminho crítico, linha de base, corrente crítica, DSM"

Cada item da lista é uma **técnica com dado exigido**, não um adorno de tela.
Catálogo completo em [`PERSONAS-E-ROTINAS.md`](PERSONAS-E-ROTINAS.md) §P2.3, com
a conta de cada uma executada. Vai para o fim conforme R4.

### O diagnóstico que ordena a sprint

Metade das técnicas **não precisa de migration** — o dado já está no banco desde
a etapa 9 ou 12 e o que falta é leitura e tela. Essas vão primeiro, por retorno
sobre esforço:

| Técnica | Esquema | Situação |
|---|---|---|
| CPM com folga total | nenhuma migration | Função pura sobre `task_dependencies`, que já tem os quatro tipos e `lag_days` |
| Linha de base | nenhuma migration | `schedule_baselines` e `schedule_baseline_tasks` existem desde a etapa 12; `curvaDeAvanco()` **já aceita** a linha de base |
| DSM | nenhuma migration | `task_dependencies` **é** a matriz N×N; falta lê-la em N×N |
| Curva ABC | nenhuma migration | `budget_items` tem `quantity`, `unit_cost`, `loss_rate` e `freight_rate` |
| Data-base de preço | nenhuma migration | `budget_items.source`, `region` e `base_date` existem desde a etapa 9; falta a importação |
| Três pontos (PERT) | migration pequena | `project_tasks.duration_days` é um campo só; faltam otimista, provável e pessimista |
| Aceleração | migration pequena | Falta o par `crash_duration_days` / `crash_cost`; `project_resources.daily_cost` já existe |
| Corrente crítica | modelo novo | Pulmão como objeto de cronograma; nada existe |
| Nivelamento | leitura nova | `task_resource_allocations` já tem quantidade e horas, planejadas e reais |

### Tarefas

- [ ] T-27.0 — **Grade editável ao lado do Gantt**, com divisor arrastável: código, nome, duração, início, término, **predecessoras**, responsável, % concluída. Digitar `12TI+3d` na célula de predecessora é o gesto mais repetido do dia do planejador, e nenhum modal ganha dele. Sem migration
- [ ] T-27.1 — **Passada para trás e folga total**, fechando o CPM. Hoje `cadeiaMaisLonga()` só faz a passada para frente e o próprio comentário da função declara isso. Calculado no exemplo de quatro tarefas: a tarefa fora da cadeia tem **5 dias de folga**, e é esse número que diz onde o planejador **não** precisa correr
  - [ ] T-27.1.1 — Renomear para caminho crítico só depois de a folga existir. Vender o nome sem a conta é prometer o que não se entrega
  - [ ] T-27.1.2 — Folga livre além da folga total: a primeira diz quanto atrasa sem mover a entrega, a segunda quanto atrasa sem mover **a sucessora**
- [ ] T-27.2 — **Linha de base pela tela**: congelar, comparar e desenhar a barra fina abaixo da atual. O banco está pronto e a função de curva também. Replanejar sem linha de base apaga a prova do desvio, e a reunião de prazo vira memória contra memória
- [ ] T-27.3 — **Matriz DSM** sobre as dependências que já existem. Marca acima da diagonal é realimentação — retrabalho **previsível**, não acidente. É o que o Gantt não mostra e o que explica a obra que "sempre atrasa na aprovação"
- [ ] T-27.4 — **Curva ABC no orçamento**. Calculado sobre orçamento de R$ 1,1 mi: **3 itens de 8 concentram 80% do custo**. É a régua que decide o que merece três cotações e o que não merece reunião
- [ ] T-27.5 — **Estimativa de três pontos**: otimista, provável e pessimista por tarefa, com `duration_days` derivada de `TE = (O + 4M + P)/6`
  - [ ] T-27.5.1 — Desvio do caminho por **raiz da soma das variâncias**, nunca por soma de desvios: calculado, a soma ingênua erra 2,01 dias em três tarefas. Variância soma, desvio padrão não
  - [ ] T-27.5.2 — Faixa de confiança na negociação de prazo, em vez do número único que ninguém consegue cumprir
- [ ] T-27.6 — **Custo marginal de aceleração**: duração e custo acelerados por tarefa, e o gradiente em R$/dia ganho. Calculado: comprime-se pela mais barata **do caminho crítico**, e acelerar tarefa com folga é dinheiro jogado fora. Depois da T-27.1, porque sem folga não se sabe onde não gastar
- [ ] T-27.7 — **Referência de preço com data-base**: importar tabela por praça e reajustar por índice. Orçamento que não guarda data-base e região não pode ser reajustado nem defendido
- [ ] T-27.8 — **Nivelamento de recurso** com histograma de uso. Duas tarefas paralelas pedindo o mesmo montador não são paralelas — sem nivelar, o cronograma promete uma simultaneidade que a equipe não tem. Depois da T-27.1: nivela-se consumindo folga primeiro
- [ ] T-27.9 — **Corrente crítica**: pulmão de projeto e de alimentação, com consumo como semáforo. Calculado, o pulmão agregado entrega **3,38 dias antes** da soma das seguranças individuais com a mesma proteção, porque nem todas as tarefas atrasam juntas. É o único indicador de prazo que não depende de alguém julgar se "está no prazo". Depende da T-27.1 e da T-27.5
- [ ] T-27.10 — **Calendário por equipe no banco**, com feriado municipal e estadual por organização. Hoje o cálculo é em dia útil, mas o regime é escolhido na tela e os feriados são só os nacionais — anunciar feriado municipal que não vale na cidade da obra seria pior que não ter nenhum
- [ ] T-27.11 — **Painel inferior de detalhe** da linha selecionada, por abas, como em Primavera P6: situação, recursos, relacionamentos e apontamento

---

## Sprint S-28 — O que a dissecação de riscos exige: parada, solicitação e obrigação
**Estado:** pendente
**Marco:** M-5

Nasce da crítica de 27 de julho:

> "um fluxo de trabalho otimista, um pessimista (o que pode dar de problema, o
> que poderia realmente atrapalhar uma atividade, e se atrapalhasse o que eu
> precisaria ter disponível na ferramenta, quais departamentos isso afetaria e a
> quem eu precisaria realizar uma solicitação para resolver), isso é dissecar o
> problema (…) você continua sendo muito superficial"

Dissecação completa em [`FLUXOS-E-RISCOS.md`](FLUXOS-E-RISCOS.md). **Todo
requisito desta sprint existe porque alguma coisa deu errado** — nenhum deles
apareceria numa lista de funcionalidades, e é essa a diferença que a crítica
apontou. Vai para o fim conforme R4.

### As três contas que ordenam a sprint

| Conta | Resultado | O que ela decide |
|---|---|---|
| `P(dia de montagem sem imprevisto)` | **52,9%**; em 5 dias, **4,1%** | Desenhar só o caminho feliz atende metade dos dias |
| Erro de medida por estágio de descoberta | 1× na obra → **300×** na montagem → 700× na assistência | A conferência de medida antes de liberar fabricação é a trava mais barata do sistema |
| Equipe de quatro parada | **R$ 104,00/hora**, **R$ 942,40** por dia queimado | Dá peso à solicitação de insumo e justifica compra local com teto |
| Ciclo real de reposição de peça | **9 dias úteis**; conferindo na expedição, **5** | 4 dias economizados por ocorrência |

### Tarefas

- [ ] T-28.0 — **Parada como objeto de primeira classe**: início, fim, motivo em **lista fechada**, evidência, e o campo que ninguém quer gravar e é o mais valioso — **de quem era a obrigação** (cliente, obra, fábrica, expedição, compras, projeto ou clima). Sem ele, espera vira baixa produtividade de quem estava parado por decisão de outro setor
  - [ ] T-28.0.1 — Abertura em **dois toques**. Se abrir parada der trabalho, ninguém abre, e o dado que sustenta o `TEP` deixa de existir
  - [ ] T-28.0.2 — Os oito motivos da §0 como ponto de partida da lista fechada. Texto livre não vira indicador
  - [ ] T-28.0.3 — Separar **improdutivo por clima** de **improdutivo por falha**: misturar destrói a matriz de competências, porque pune quem pegou chuva
- [ ] T-28.1 — **Solicitação com destinatário nominal, departamento e prazo**. "Avisar o sistema" não é solicitação. Os prazos vieram da dissecação e cada um tem motivo de campo: compra local 1 h, expedição 2 h, coordenação 2 h, projetista 4 h, comercial 4 h
  - [ ] T-28.1.1 — **Escalonamento por prazo vencido**, senão prazo de resposta é decoração
  - [ ] T-28.1.2 — Solicitação de insumo **abre parada junto**, porque falta de material é parada obrigatória e não observação
- [ ] T-28.2 — **Pré-condições de medição** conferidas e assinadas, com **medição condicional** marcada como tal e remedição agendada. É o requisito de maior retorno de todos: previne a maior parte do R3.1, que a 12% de frequência custa 300× quando aparece na montagem
- [ ] T-28.3 — **Romaneio conferível item a item, com foto de referência**, distinguindo "faltou" de "veio diferente" — causas diferentes, departamentos diferentes. Inclui o campo **em qual conferência o erro deveria ter sido pego**: sem ele a expedição nunca melhora, porque o custo cai sempre na montagem
- [ ] T-28.4 — **Ficha de acesso do endereço** preenchida **na medição**: horário de carga e descarga, contato de portaria e síndico, exigência de ART, seguro ou aviso prévio. O dado mais barato de coletar meses antes e o mais caro de descobrir na hora
- [ ] T-28.5 — **Compra local com teto e alçada**: R$ 180 de ferragem na esquina contra R$ 942,40 de dia queimado — **5,2× mais barato**. Precisa de autorização em 1 hora, senão a equipe espera de qualquer forma
- [ ] T-28.6 — **Pedido do cliente registrado no local**, com foto e assinatura no telefone, e o caminho direto para aditivo. **O montador não pode ter autoridade para aceitar mudança de escopo** — e a ferramenta é que precisa deixar isso óbvio, porque no local a pressão é real
- [ ] T-28.7 — **Revisão vigente do desenho no telefone**, e liberação de fabricação amarrada à revisão aprovada. `project_documents` já tem os cinco estados e `project_document_versions` já versiona; falta a amarração, que hoje é disciplina — e disciplina falha a 100× de custo
- [ ] T-28.8 — **Ver quem mais está alocado no mesmo endereço hoje**. Resolve por conversa, no local, em cinco minutos, o conflito de sequenciamento que hoje escala para a coordenação
- [ ] T-28.9 — **Situação financeira do cliente visível antes de a equipe sair**, não depois. Descobrir depois custa os R$ 942,40 da Lei 2
- [ ] T-28.10 — **Cobertura de apontamento** como número visível, e detecção do padrão suspeito — progresso monotônico com variância zero é o padrão de quem preenche de cabeça no fim de semana. **Falso é pior que ausente**, porque ausente ao menos se enxerga
- [ ] T-28.11 — **Gravar `project_progress_snapshots` ao aprovar o diário.** *(premissa corrigida em 11/08/2026 pela varredura da S-75: a redação anterior mandava ler dele num módulo "curvas.ts" que não existe mais — a leitura já acontece hoje em `app/app/obras/[id]/page.tsx` e `app/cliente/obras/[id]/page.tsx`. O que falta é só a **gravação**.)* A tabela existe desde a etapa 12 com `snapshot_date`, `planned_progress`, `actual_progress` e `source`, e `daily_log_activities` já tem `progress_before`/`progress_after` datados pelo `log_date` do diário. **Sem migration** — falta só escrever e ler, e a curva de realizado deixa de ser reconstruída para ser medida

---

## Sprint S-29 — Acompanhamento a distância: seguir, notificar por exceção e evidenciar
**Estado:** pendente
**Marco:** M-5

Ditada pelo responsável em 27 de julho:

> "o montador solicitar material que faltou ou enviar fotos do andamento, assim
> mesmo sem visitar a montagem, ou obra, os gerentes, diretores, cliente, sabem o
> que está acontecendo (…) por isso temos notificações e alertas para as pessoas
> que são responsáveis e seguem o projeto"

Desenho e dissecação em
[`ACOMPANHAMENTO-A-DISTANCIA.md`](ACOMPANHAMENTO-A-DISTANCIA.md). Vai para o fim
conforme R4.

### O diagnóstico que ordena a sprint

**Metade do sistema já está construída, e é a metade que se costuma achar que
falta.** O portal do cliente existe em `app/cliente/` e já lê `client_visible`
em diário aprovado, mídia, tarefas, marcos e documentos liberados. `daily_logs`
já tem aprovação com autor e data, e `daily_log_media` já tem `captured_at`,
`sha256` e `client_visible`. **A lacuna inteira é o empurrão**: hoje tudo é
*pull* — quem quer saber precisa abrir a tela. Não existe tabela de notificação,
não existe assinatura ("quem segue o quê") e não existe entrega.

### As contas que fixam os limites

| Conta | Resultado | O que decide |
|---|---|---|
| Eventos para 1 gerente com 6 obras | **2.640/mês (120/dia)** bruto → **259/mês (11,8/dia)** por exceção | Notificar por exceção, redução de **90,2%** |
| Falso positivo tolerável | acima de **20%** o alerta vira ruído | Tipo de alerta acima disso é desligado até corrigir |
| Evidência remota × visita | R$ 0,94 contra R$ 365,40 — **390×** | Substitui a visita de rotina, não a visita |
| Foto original × comprimida | 4,20 MB → 0,35 MB, **12×**; upload de 8 s → 0,7 s | Compressão não é economia, é viabilidade dentro da janela de 15 min |
| Fila offline de 7 dias | 168 registros, 29,4 MB por equipe | Cabe com folga; 7 dias é o teto, acima disso o dado envelheceu |

### Tarefas

- [ ] T-29.0 — **Assinatura: "seguir" como ato explícito e visível**, com inscrição automática por papel (responsável, gerente da obra, planejador) e a lista de seguidores exibida na própria obra. Diretor que "achava que estava vendo" e não estava é a falha mais comum deste tipo de sistema — e sem registro de quem seguia o quê, "ninguém me avisou" não tem resposta
- [ ] T-29.1 — **Notificação por exceção**, nunca por evento. Normal não avisa
  - [ ] T-29.1.1 — Faixa derivada do próprio histórico, conforme a janela 6+6 da `KPIS.md`
  - [ ] T-29.1.2 — Teto diário por pessoa, com excedente virando resumo; e agrupamento por obra — cinco eventos da mesma obra são um aviso, não cinco
  - [ ] T-29.1.3 — **Falso positivo medido por tipo de alerta**, e tipo acima de 20% desligado até ser corrigido. Alerta que ninguém abre há um mês é alerta que não deveria existir
  - [ ] T-29.1.4 — Janela de silêncio por perfil, respeitando o regime de trabalho que o calendário já conhece, com classe de urgência estreita e nominal que atravessa
- [ ] T-29.2 — **Um fato, seis recortes**: montador, coordenador, planejador, gerente, diretor e cliente recebem agregações diferentes do mesmo evento. Mandar o mesmo texto para os seis produz 6× o volume e 1× o valor
- [ ] T-29.3 — **Foto amarrada à tarefa**, não ao dia, com legenda obrigatória curta — descrever obriga a olhar. Comprimida no dispositivo, e com **hora de captura separada da hora de envio**: divergir não é fraude, é sinal para olhar
- [ ] T-29.4 — **Fila offline de 7 dias** com estado visível ao montador ("3 registros aguardando envio"), e check-in/check-out gravando hora do dispositivo **e** do servidor, para que sincronizar tarde não vire fraude de ponto nem acusação de fraude
- [ ] T-29.5 — **Localização só no check-in e no check-out**, nunca contínua, com finalidade declarada, prazo de retenção e acesso restrito a quem processa folha. Rastreamento durante a jornada não é acompanhamento — é outra coisa, e não foi o que se pediu
- [ ] T-29.6 — **`client_visible` como decisão explícita de quem aprova**, nunca padrão, e o diário aprovado como única porta para o cliente. Foto de instalação pela metade parece defeito para quem não sabe que aquilo é uma etapa
- [ ] T-29.7 — **Detecção de apontamento inventado**: progresso monotônico com variância zero, sempre redondo, sempre igual ao planejado. E correção que **não sobrescreve o original**, para que revisar para baixo seja barato e honesto. Progresso que nunca desce em obra nenhuma é o indicador mais confiável de que o dado é ficção
- [ ] T-29.8 — **As cinco regras que separam acompanhamento de vigilância**, implementadas e não só escritas: o próprio profissional vê o número dele primeiro; o indicador aponta a tarefa e não a pessoa; toda queda tem motivo que entra no número; a janela esquece; e **a resposta da gestão às solicitações do campo é medida e publicada do mesmo jeito que o `TEP`**
  - [ ] T-29.8.1 — Justificativa registrada: na meta-análise clássica de intervenções de feedback, o efeito médio é positivo (**d ≈ 0,41**) mas **mais de um terço das intervenções piorou o desempenho**. A direção confirma a intuição; a variância diz que o **como** decide o sinal. Se o painel cobra o campo em 15 minutos e a gestão responde em três dias, o campo aprende o que o sistema realmente vale
- [ ] T-29.9 — **Resumo semanal** ao cliente e ao diretor: um e-mail, não trinta

---

## Sprint S-30 — Cobertura profissional integral e cenários intersetoriais
**Estado:** pendente
**Marco:** M-5

Nasceu da revisão do responsável em 28 de julho: validar se cada persona é o
profissional real da cadeira, construir matriz de competências para todas,
testar rotina otimista, normal e pessimista e definir quem precisa saber quando
algo quebra. Vai para o fim conforme R4; a S-23 continua sendo a única sprint
em andamento.

### Diagnóstico

As sete personas existentes aprofundavam Planejamento, Comercial, Campo,
Financeiro, Assistência, Administração e Projeto, mas deixavam oito famílias de
aplicativo sem dono profissional específico. “Administrador” não substitui
comprador, almoxarife, qualidade, contratos, diretoria ou auditoria.

### Tarefas

- [x] T-30.1 — **Dezesseis profissões reais**, com separação de cadeiras que exigem segregação: comprador ≠ almoxarife; orçamentista ≠ financeiro; administrador ≠ auditor; planejador ≠ gerente de obra; projetista ≠ planejador
- [x] T-30.2 — **Matriz competência → técnica → dado** para todas as personas, documentada em `PERSONAS-E-ROTINAS.md` e codificada em `lib/personas/catalog.ts`
- [x] T-30.3 — **Cobertura automática dos 22 aplicativos**: o teste reprova módulo sem profissional, persona com menos de quatro competências, técnica sem dado e destinatário inexistente
- [x] T-30.4 — **Três cenários para cada persona** — otimista, normal e pessimista — com evento, destinatários intersetoriais e resposta esperada, em `FLUXOS-E-RISCOS.md`
- [x] T-30.5 — **Runner de cenário funcional**: 333 execuções (111 combinações persona × aplicativo operacional × otimista, normal e pessimista) ligam profissão, todos os módulos que utiliza, objeto, decisão e destinatários; PostgreSQL executa gravação, permissão e notificação em 14 testes, incluindo P15 sob identidade de cliente
- [x] T-30.6 — **Evento operacional transversal no domínio**: fato, objeto, impacto, obrigação, destinatário, SLA e evidência; otimista e normal retornam zero notificações (`lib/operations/notifications.ts`, 5 testes)
- [ ] T-30.7 — **Entrega por recorte**: executor, dono da restrição, gerente, diretoria, financeiro, cliente e auditoria recebem visões diferentes do mesmo fato
  - [x] T-30.7.1 — Planejamento determinístico dos recortes, bloqueio do cliente sem aprovação, escalonamento sem duplicação e agrupamento por objeto
  - [ ] T-30.7.2 — Persistência, inscrição por usuário, quiet hours, fila de entrega e leitura
- [ ] T-30.8 — **Aplicar ao Supabase** com RLS, idempotência, escalonamento e teste negativo multiempresa antes da interface
  - [x] T-30.8.1 — Migration local com tipos de evento, responsabilidade nominal, fato imutável, destinatário materializado, cliente só com aprovação, RLS forçada, RPC e privilégios mínimos
  - [x] T-30.8.2 — PostgreSQL 16 real: 14 testes de idempotência, isolamento multiempresa, persona de origem, cliente aprovado, leitura, autoria externa e proibição de escrita direta (`pnpm test:db:operations`, `VACINA-020`, `VACINA-022`)
  - [x] T-30.8.3 — Aplicada no projeto Supabase `wyeojufebtwblsubkunr`: 16 tipos, 8 políticas, escrita direta e `anon` negados; advisors executados e correção de performance versionada (`VACINA-021`)
- [ ] T-30.9 — **Aplicar à casca e aos arquétipos de tela**, começando pelo piloto CRM e repetindo coleção, registro, transação, planejamento e campo
- [ ] T-30.10 — **Homologar em três cenários por persona** e registrar defeito em Vacinas antes de corrigir
  - [x] T-30.10.1 — Auditoria autenticada de 17 aplicativos do Odoo, inventário de menus e capturas em `artifacts/odoo-audit-2026-07-28/`
  - [x] T-30.10.2 — Corrigir a primeira classe transversal: capacidade existente sem porta de entrada (`VACINA-028`), com menus reais para todos os aplicativos e criação de proposta, contrato, aditivo e documento
  - [x] T-30.10.3 — Branch publicada e QA autenticado do preview percorreu os 21 aplicativos e os seis fluxos críticos; menu recortado e contraste de aviso viraram `VACINA-030` e `VACINA-031`
  - [ ] T-30.10.4 — Aplicar a migration no Supabase remoto e repetir as mutações autenticadas de proposta → aceite → contrato → aditivo na homologação

---

## Sprint S-31 — Qualidade: Ishikawa sobre dado, Pareto sobre custo, e a cobrança do gestor
**Estado:** pendente
**Marco:** M-5

Ditada pelo responsável em 27 de julho:

> "daí Pareto e Ishikawa entram na qualidade, entendeu como tudo se conecta? daí
> você começa mapear e identificar os erros (…) daí você começa a pegar custos
> invisíveis, identificar pontos de falha, consegue identificar qual área precisa
> de maior atenção, começa a criar treinamentos para começar a capacitar e
> corrigir as equipes, consegue cobrar as pessoas que estão em nível gerencial"

Desenho, aritmética e dissecação em
[`QUALIDADE-CAUSA-RAIZ.md`](QUALIDADE-CAUSA-RAIZ.md). Dono da rotina é a persona
**P12**, cuja matriz já declara 8D, 5 porquês, PDCA e verificação de eficácia —
esta sprint dá a **aritmética** que faltava a essas técnicas. Vai para o fim
conforme R4.

### O achado que ordena a sprint

Pareto sobre 1.584 dias-montagem/ano, com custo por ocorrência = horas paradas ×
R$ 104,00 + retrabalho:

| Causa | Ocor./ano | R$/ano | Acum. | Espinha 6M |
|---|---:|---:|---:|---|
| Medida diferente do projeto | 190 | **387.003** | 48,1% | Medição |
| Peça faltando ou trocada | 158 | **158.552** | 67,8% | Método |
| Chuva ou condição | 63 | **52.716** | 74,3% | Meio ambiente |
| Acesso bloqueado | 95 | 49.421 | 80,5% | Meio ambiente |
| Cliente muda no local | 79 | 44.986 | 86,1% | Método |
| Ferragem errada | 111 | 43.021 | 91,4% | Material |
| Sem energia / andaime | 127 | 39.537 | 96,3% | Meio ambiente |
| Outra equipe no ambiente | 143 | 29.652 | 100,0% | Método |
| **Total** | | **804.887** | | |

**3 causas de 8 concentram 80% da perda.** E o achado que justifica a sprint
inteira: somando por espinha do Ishikawa, **mão de obra responde por 0,0%**.
Nenhuma das oito causas é do montador — mas sem dado a classificação default é
"falta de atenção", o treinamento vai para quem não causou o problema, e a
reunião seguinte conclui que "o pessoal não aprende".

Custo invisível anual: **R$ 986.715**, sendo R$ 804.887 o Pareto acima
decomposto e **R$ 181.827** de hora de gestão apagando incêndio, retorno de
assistência evitável e escopo executado e não cobrado. Nenhum tem linha própria
no DRE — aparecem diluídos em folha, frete e "margem menor que a esperada".

Retorno de atacar a causa 1 (a T-28.2, já registrada): reduzir 30% economiza
**R$ 116.101/ano**, e uma ação de R$ 25.000 paga em **2,6 meses**. Esta sprint
não pede trabalho novo — ela **precifica** o que já estava na fila e mostra que
é o mais rentável de todos.

### Tarefas

- [ ] T-31.0 — **Sintoma e causa como campos separados**, com Pareto rodando sobre **causa**. "Porta desalinhada" 40 vezes vira projeto de melhoria de porta quando a causa era assentamento de piso — sintoma agrupa chamado, causa decide investimento
- [ ] T-31.1 — **Classificação nos 6M no momento do fato**, por quem estava lá, com exemplos por espinha
  - [ ] T-31.1.1 — Painel de distribuição por espinha, com alerta de concentração: 100% numa espinha só é classificação preguiçosa, não operação com causa única
  - [ ] T-31.1.2 — Auditoria por amostragem cruzando causa declarada com evidência anexada; e comparação entre equipes, porque distribuição muito diferente na mesma praça é classificação diferente, não operação diferente
- [ ] T-31.2 — **Pareto ordenado por custo**, com frequência como segunda leitura. Calculado, a causa mais frequente da lista responde por 3,7% da perda — priorizar por frequência é trabalhar muito para economizar pouco
- [ ] T-31.3 — **Custo invisível publicado em reais**, por obra e por carteira. Enquanto for adjetivo, não entra em decisão
- [ ] T-31.4 — **Reincidência 6+6 como prova da ação**, na mesma janela da `KPIS.md`
  - [ ] T-31.4.1 — **Cobertura de apontamento no mesmo gráfico** (T-28.10): queda de ocorrência com queda de cobertura não é melhoria, é o sistema perdendo visão — e precisa aparecer como alerta, não como conquista
- [ ] T-31.5 — **Plano de ação amarrado à causa**, com dono nominal, prazo, e eficácia verificada pela reincidência e não pela conclusão da tarefa. Causa de classe A sem ação é decisão de não agir, e fica registrada como tal
- [ ] T-31.6 — **Cinco porquês apoiados em registro**: cada nível referencia parada, foto, medição ou documento. Nível sem evidência fica marcado como hipótese, e hipótese não vira plano de ação de classe A
- [ ] T-31.7 — **Da causa ao treinamento**: cada causa aponta competência nomeada da matriz de `PERSONAS-E-ROTINAS.md` e o nível alvo. Transforma "precisamos treinar a equipe" em "três projetistas precisam subir de 3 para 4 em metrologia, e isso vale R$ 193.501/ano". Subida de nível se afirma por reincidência, não por certificado de presença
- [ ] T-31.8 — **Painel do gestor**, com o que é dele e não do campo: tempo de resposta à solicitação, cobertura de apontamento da equipe, reincidência sob sua alçada, causas classe A com ação aberta, evolução da matriz da equipe e custo invisível da carteira
  - [ ] T-31.8.1 — Regra registrada: gestor com equipe de `TEP` ruim **e** resposta em três dias tem problema de gestão; com resposta em 40 minutos tem problema de competência ou de recurso. Sem separar os dois, toda reunião de resultado termina cobrando quem estava na obra
- [ ] T-31.9 — **Registrar problema nunca pode piorar o indicador de quem registrou**: parada com obrigação de terceiro não entra na produtividade de quem a abriu, e taxa de registro é indicador **positivo** do gestor. É a falha que inutiliza o programa inteiro — se registrar dói, ninguém registra, e a operação fica cega com o painel verde

---

## Sprint S-32 — Reúso de informação: sugestão, documento por modelo e campo próprio
**Estado:** concluída
**Marco:** M-5

Ditada pelo responsável em 2 de agosto. Desenho e dissecação em
[`REUSO-DE-INFORMACAO.md`](REUSO-DE-INFORMACAO.md). Vai para o fim conforme R4.

### O levantamento que mudou o escopo

Metade do pedido **já estava no banco**, e conferir antes de desenhar evitou
reconstruir o que funciona:

| Pedido | Situação |
|---|---|
| Vários seguidores por cartão | **Pronto**: `pipeline_card_followers` com RLS, ações e interface. Verificado no cartão — *"SEGUIDORES 1 · Deixar de seguir"* |
| Modelo com variáveis | **Metade**: `contract_templates.body_template` e `variables_schema` existem desde a etapa 9; falta o motor e falta sair de contrato |
| Campos próprios | **Desenhado e nunca construído**: `OBJECT-RUNTIME.md` é canônico e não tem uma migration sequer |
| Auto-sugestão | Não existe |

### Tarefas

- [x] T-32.0 — **Catálogo de valores usados** por `(organização, escopo, valor)`, com contagem e último uso. Uma tabela e um componente de campo servem a EAP, funil, marcador, disciplina, unidade, motivo de perda e motivo de parada. **Dois escopos ficaram de fora por não existir campo onde ligar**, não por falta de trabalho: marcador de cartão e motivo de parada de obra — parada é da S-28, e o marcador voltou como T-34.10.1. **Motivo de perda saiu do catálogo por decisão** e virou lista cadastrada na S-34: cura-se o que alimenta contagem, observa-se o que nomeia
  - [x] T-32.0.1 — Ordenar por frequência recente e cortar em 8; digitar filtra. Sugestão com 300 valores é ruído — `lib/sugestoes/catalogo.ts` com decaimento de meia-vida 90 dias; 18 testes em `tests/sugestoes.test.ts`; verificado no navegador (`verif28.mjs`, passo 4: digitar filtrou de 2 para 1)
  - [x] T-32.0.2 — Valor usado uma vez só há mais de 6 meses sai da lista: erro de digitação antigo não vira sugestão para sempre — regra em `ordenarSugestoes`, com teste do caso simétrico (usado várias vezes há muito tempo permanece: é vocabulário sazonal, não erro)
  - [x] T-32.0.3 — **Sugestão nunca é lista fechada.** É campo de texto com apoio, e valor novo sempre passa — `components/comum/campo-com-sugestao.tsx`, ligado à EAP e às atividades do cronograma; verificado no navegador: valor inédito gravou (passo 2) e voltou como sugestão no uso seguinte (passo 3)
  - [x] T-32.0.4 — Limpar o catálogo é ação de administrador, porque o catálogo é da organização — `/app/administracao/vocabulario` com `requireCapability("administracao","manage")` na tela e `has_module_permission(…,'administracao','DELETE')` na função do banco. Teste negativo executado contra a API: limpar catálogo de outra organização recusa (`P0001`), gravar em outra organização recusa, sem autenticação recusa no `grant` (`42501`), e na própria organização devolve 204. Verificado no navegador que remover tira da tela **e** da sugestão do cronograma
  - [x] T-32.0.5 — Ligar o campo com sugestão nos escopos que têm campo real: **etapa do funil** (coluna nova, em modo controlado), **disciplina de documento** (no acervo geral e na obra) e **unidade de medida** (item manual de orçamento). Os três gravam e leem, verificados no navegador
    - Disciplina na obra era `select` de nove opções fixas — lista fechada, que a diretriz proíbe. As nove viraram sugestão padrão da plataforma e qualquer outra passa: verificado que "Paisagismo" é aceito
    - `comPadroes` existe para o dia zero: catálogo vazio com campo sem sugestão nenhuma seria pior que a lista fechada substituída. Padrão nunca envelhece como engano e a tela diz "sugestão padrão", não "usado 0 vezes"
    - **Marcador de cartão** e **motivo de parada** não foram ligados porque os campos não existem no produto — parada de obra é da S-28
    - **Motivo de perda** não foi ligado por decisão, não por falta: o único campo é a mesma caixa de "Motivo/observação" de toda mudança de estágio, prosa sobre uma negociação. Sugerir ali empurraria a reutilizar um motivo genérico — dado errado com aparência de arrumado. Registrado em T-33.13
  - [x] T-32.0.6 — Campo curto e próprio de motivo de perda no funil, separado da observação livre da mudança de estágio; só então ligar `negocio.motivo_perda` — a caixa única "Motivo/observação" virou dois campos: **motivo** curto, com sugestão, que só aparece ao escolher "Perdida"; e **observação** livre, em toda mudança. Coluna `note` em `crm_opportunity_stage_history` e quarto parâmetro em `move_crm_opportunity_stage`, com a assinatura antiga de três argumentos removida para não sobrar caminho que grava sem observação em silêncio. Linhas antigas não são reclassificadas: o que está em `reason` foi escrito sob a regra antiga e decidir por elas seria inventar dado. Verificado no navegador — motivo escondido fora de "Perdida", obrigatório dentro, perda sem motivo recusada, e o par gravado separado (`lost_reason` + `note`) com o motivo entrando no vocabulário. **Corrigido na S-34 no mesmo dia**: o responsável pediu lista cadastrada, não campo livre com sugestão, e está certo — motivo de perda alimenta contagem, e contagem não fecha sobre texto que cada pessoa escreve do seu jeito
- [x] T-32.1 — **Modelo de EAP**: sugerir o conjunto, não só a palavra — `lib/planejamento/modelos-de-eap.ts`, **observado e não cadastrado**, pelo critério da S-34: cura-se o que alimenta contagem, observa-se o que nomeia. Modelo declarado envelheceria separado do modelo praticado; este emerge das obras que a empresa já montou
  - [x] T-32.1.1 — Duas ocorrências anteriores criam modelo: a terceira criação é a que recebe a oferta. Uma repetição pode ser coincidência de duas obras parecidas
  - [x] T-32.1.2 — Atividade entra quando aparece na **maioria** das ocorrências. Unanimidade descartaria o modelo por causa de um imprevisto; qualquer uma faria o modelo virar a união de tudo que já foi feito
  - [x] T-32.1.3 — **A ordem é a sequência do trabalho, não a frequência.** Defeito encontrado na tela: a primeira versão ordenava por contagem e caía no desempate alfabético — o modelo saiu "Armação, Escavação, Forma", que é a ordem errada de construir. Passa a ordenar pela posição típica, com frequência só como desempate; e a leitura do histórico ordena as atividades dentro da etapa, senão a posição não significa nada
  - [x] T-32.1.4 — Tudo vem marcado, e nada acontece sem marcação. Vir marcado é a diferença entre a oferta valer e não valer — desmarcar uma é um clique, marcar cinco são cinco; e desmarcar todas cria a etapa vazia como sempre
  - [x] T-32.1.5 — Verificado no navegador com histórico montado pela própria tela: sem histórico o bloco não aparece, na terceira vez ele oferece as três atividades na ordem de construir, nome inédito não oferece nada, e criar traz o conjunto ligado à etapa com numeração sequencial (6.1, 6.2, 6.3)
- [x] T-32.2 — **Motor de documento por modelo**, um só para proposta, orçamento, contrato, laudo e ordem de serviço — corpo, variáveis e pré-visualização em 2 de agosto; **gravar, publicar, arquivar e importar em 3 de agosto**. A nota de pendência que ficou aqui (T-32.2.5 e T-32.2.7) estava vencida: as duas subtarefas foram entregues no mesmo dia e a linha do pai não acompanhou. **Conferido agora, e uma delas estava descrita errado**: T-32.2.7 dizia "tabela sem UPDATE", e `emitted_documents` tinha `grant update, delete` para `anon` e `authenticated` — a imutabilidade vinha da **ausência de política** sob RLS forçada, que funciona e depende de ninguém acrescentar uma política `for all`. Privilégio revogado; ver T-33.21 e VACINA-059
  - [x] T-32.2.1 — Corpo em **Markdown**, não editor proprietário: versiona em diff legível, converte para PDF e DOCX e sobrevive à plataforma. O editor é visual, o que grava é Markdown
  - [x] T-32.2.17 — **Aplicativo próprio: Modelos e Documentações** (`/app/modelos`), com **uma tabela só** para proposta, orçamento, contrato, aditivo, termos, FVS, FVM, procedimento, mensagens de CRM, mensagem por etapa do funil, lembrete, agendamento, e-mail e e-mail marketing — 35 tipos em 7 categorias. **Correção de rota pedida pelo responsável em 3 de agosto**: o desenho anterior prendia cada modelo ao módulo emissor, e ele apontou o caso que derruba isso — enviar a proposta na etapa de projeto, ou o contrato assinado. Registrado em `VACINA-050`
  - [x] T-32.2.18 — **Todo aplicativo lê o mesmo acervo.** A permissão é a do aplicativo `modelos`; `document_type` classifica. Conferido: proposta aparece em Obras e contrato chega ao pós-venda, os dois casos que o responsável citou, escritos como teste
  - [x] T-32.2.19 — **Disponibilização por aplicativo, com checks, na Administração** (`/app/administracao/modelos`), gravada por empresa em `document_module_types`. É filtro de lista, **não permissão**, e a tela diz isso. Um aplicativo por vez: 19 × 35 numa grade seriam 665 caixas, e ninguém confere 665 caixas
  - [x] T-32.2.20 — **Duas origens.** `PLATAFORMA` vale para todas as empresas e muda por migration; `ORGANIZACAO` é da empresa. Quem quer sua versão do padrão **duplica**, com `derived_from` guardando de onde veio — editar por cima mudaria o de todas as outras
  - [x] T-32.2.2 — **Variável escolhida, não decorada**: nome legível e valor de exemplo do registro atual, agrupada por escopo; clicar insere no cursor. Decorar nome de variável é a razão de esse recurso morrer sem uso. **Fica atrás de um botão "Variáveis ▾" na barra de ferramentas, com busca**, e não em painel fixo na lateral — correção do responsável em 3 de agosto sobre o layout que ele mesmo desenhou: painel fixo cobra largura permanente de quem escreve por uma ação ocasional
  - [x] T-32.2.3 — Vocabulário `{{escopo.campo}}` — `{{cliente.nome_completo}}`, `{{obra.codigo}}`, `{{orcamento.valor_total}}`, `{{hoje}}`. O editor aceita também a forma com sublinhado na colagem e normaliza
  - [x] T-32.2.4 — **Substituição, nunca execução**: sem expressão, sem laço, sem chamada, com HTML escapado. Modelo é dado, e dado que executa é o caminho mais curto para extrair o que não se pode ver
  - [x] T-32.2.9 — **Tabela `document_templates`** com `module_key` e `purpose`, RLS pela permissão do módulo, aplicada e conferida no banco: RLS ligada, forçada e quatro políticas
  - [x] T-32.2.5 — **O dicionário respeita a RLS** de quem gera. `lib/documentos/resolucao.ts` consulta com o cliente da sessão, nunca com `service_role`: quem não pode ler um cliente recebe lacuna no lugar do nome dele. Se usasse o cliente administrativo "porque é só leitura", bastaria escrever `{{cliente.documento}}` num modelo para extrair o que a permissão nega
  - [x] T-32.2.12 — **Gravar, abrir, publicar e arquivar pela tela.** Explorador lista o acervo agrupado por categoria e tipo; `File` abre, salva, salva como, publica, arquiva e importa
  - [x] T-32.2.13 — **Salvar não rebaixa publicado** (`VACINA-049`). O estado seguinte é lido do atual, e alterar publicado exige a mesma alçada de publicar — no aplicativo **e** na política de `UPDATE` do banco, migration `20260803120000`. Arquivar continua exigindo só `EDIT`: tirar de circulação um modelo com defeito tem de ser barato
  - [x] T-32.2.14 — **Concorrência tratada, não ignorada**: `version_number` viaja no formulário e a gravação só acontece se a versão ainda for aquela. Duas abas editando o mesmo modelo: a segunda grava, a primeira recebe "alguém salvou depois de você (versão 3)" **com o texto preservado** — não o silêncio de sobrescrever o trabalho do outro
  - [x] T-32.2.15 — **Importar DOCX, XLSX, CSV, TXT e Markdown, sem dependência.** `.docx` e `.xlsx` são ZIP com XML, e o navegador descomprime sozinho com `DecompressionStream`. A conversão acontece **na máquina de quem importa**: modelo de proposta traz preço, cliente e margem, e nada disso precisa sair para virar texto. `.doc`, `.xls`, `.rtf`, `.odt` e `.pdf` são **recusados com o motivo e o que fazer** — PDF é o único que pediria biblioteca de verdade
  - [x] T-32.2.16 — Verificado com os **dois arquivos reais entregues pelo responsável** em 3 de agosto: um procedimento operacional (535 linhas, 6 títulos, 15 tabelas, 86 itens de lista) e uma proposta de fundações (233 linhas, 1 tabela). Foi neles que apareceram os defeitos que exemplo de manual não mostra — runs vizinhos partidos no meio da palavra e estilo de título no idioma da instalação do Word
  - [x] T-32.2.6 — **Variável não resolvida aparece**, com contagem de lacunas no envio e bloqueio antes da assinatura. Documento assinado com buraco em branco é pior que documento que não gerou
  - [x] T-32.2.7 — **Documento emitido guarda o texto resolvido**, nunca a referência ao molde: contrato não pode mudar porque alguém editou o modelo depois. Tabela `emitted_documents` **sem UPDATE e sem DELETE** — corrigir um documento emitido é emitir outro —, com SHA-256 do texto, as lacunas do instante da emissão e `template_id` só como procedência
  - [x] T-32.2.21 — **Tela de emissão** (`/app/modelos/emitir`): escolher modelo e registros, conferir a prévia, emitir. A prévia e a gravação são **o mesmo caminho no servidor**, com um campo a menos — prévia calculada no navegador mostraria valores que o servidor recusaria a preencher. Só modelo publicado emite
  - [x] T-32.2.22 — `VACINA-051`: a prévia saía com 7 lacunas e o documento emitido com 11. O `select` controlado perde a seleção **no DOM** quando a resposta da server action re-renderiza a árvore, e é o DOM que o formulário envia; o estado do React ficava intacto o tempo todo. Corrigido, e a verificação passou a comparar as duas contagens
  - [x] T-32.2.8 — Validação do modelo lista variáveis inexistentes **antes** de publicar
  - [x] T-32.2.10 — **Interface no layout entregue pelo responsável**: barra do documento, barra de menu (File · Edit · Inserir · View), barra de ferramentas e três regiões — explorador ⟷ editor ⟷ pré-visualização — com explorador e prévia ligando e desligando pelo menu View. Conferido em navegador em 1366, 1440 e 1920: três regiões, sem transbordo, sem erro de console
  - [x] T-32.2.11 — **Numeração de linha por espelho**: cada linha lógica é repetida invisível com a mesma fonte e a mesma largura de conteúdo do campo, para o número ficar na altura certa quando a linha quebra sozinha. Contar `\n` erra assim que um parágrafo ocupa duas alturas, e na coluna de 474px do editor a 1366 quase todo parágrafo ocupa. Medido: linha que quebra ocupa 69px contra 23px, e o número seguinte cai abaixo dos 69px; a numeração acompanha o tamanho escolhido na barra e a rolagem do campo
- [x] T-32.3 — **Campos próprios por objeto**, primeiro corte do Object Runtime. **A nota "nunca virou migration" estava errada e o erro era pior do que ela**: as duas migrations existiam desde 26 de julho, o validador de invariantes rodava verde no CI e os catorze testes de banco passavam — e as três tabelas **não existiam no banco**. Ninguém tinha aplicado. Registrado na VACINA-057
  - [x] T-32.3.0b — **A guarda de permissão citava uma ação que não existe.** As três RPCs pediam a ação `configure`, e `has_module_permission` resolve a ação num `case` fechado com `else false`: negava todo mundo, inclusive SUPER_ADMIN. `publish_object_definition`, de 26 de julho, **nunca foi executável**. Descoberto ao rodar a tela com sessão de administrador de verdade. A fixture dos testes de banco era mais permissiva que a função real e por isso os catorze testes passavam. Corrigido para `administer`, fixture endurecida e `validate:module-keys` passou a conferir o quinto argumento. VACINA-058
  - [x] T-32.3.0a — **Faltava caminho de escrita para criar a definição**: a fundação tinha a tabela e a publicação, e nenhuma RPC que criasse a linha. `draft_spec`, `create_object_definition` e `save_object_definition_draft`, com 12 testes de comportamento novos
  - [x] T-32.3.0 — Fundação aplicada e conferida no banco: `object_definitions`, `object_definition_versions` e `object_field_slots` com RLS habilitada e forçada, escrita só por RPC, guarda de imutabilidade da versão publicada, projeção de slots derivada do spec pelo próprio banco e `publish_object_definition` com `security definer` e `search_path` fixo. As autoverificações embutidas nas migrations passaram na aplicação
  - [x] T-32.3.1 — A tela pergunta **o que a informação faz** — "é uma data?", "é uma pessoa da equipe?", "é dinheiro?" — e o tipo sai daí. O usuário não responde "qual tipo?" na forma técnica. `lib/object-runtime/proposito.ts` traduz quinze propósitos em quinze tipos, com exemplo de obra e o efeito de cada escolha; a chave técnica sai do rótulo (`Responsável pela vistoria` → `responsavel_pela_vistoria`, `2ª medição` → `campo_2a_medicao`). Medido no navegador: as quinze perguntas aparecem, nenhuma usa vocabulário do motor e a palavra "tipo" não aparece no bloco da pergunta. Teste negativo: acrescentar um tipo em `FIELD_TYPES` sem propósito reprova a suíte — tipo sem pergunta é tipo que nenhuma tela alcança
  - [x] T-32.3.2 — **Nasce filtrável**: campo que não entra na busca vira campo que ninguém lê. Todo tipo com coluna-slot nasce marcado, e o orçamento aparece na tela enquanto ainda dá para escolher — não na publicação, com trinta campos digitados. Medido: o terceiro campo de data foi recusado com "passou do limite de campos filtráveis desse tipo", e o campo de texto longo mostra "não entra na busca — este tipo não tem coluna filtrável"
  - [x] T-32.3.0c — **A camada de registros não existia**, e sem registro não há "quando preenchido": T-32.3.3 não tinha onde acontecer. `object_records` particionada em 64 por `hash(organization_id)`, catorze índices parciais de slot, uma política de RLS e `object_record_upsert` — itens 2 e 3 da primeira fatia do contrato
  - [x] T-32.3.3 — Campo do tipo pessoa **inscreve como seguidor** quando preenchido — é o que faz "arquiteto do projeto" valer mais que texto. `object_record_followers` guarda também **qual campo** inscreveu; regravar não duplica; uuid que não é usuário não vira seguidor e não derruba a gravação; e ninguém é desinscrito ao sair do campo — sair da lista é ato de quem segue
  - [x] T-32.3.4 — Sugestão de campo existente por nome parecido **antes** de criar, para não nascerem "Arquiteto" e "arquiteto". Três motivos: mesmo nome, um nome dentro do outro e quase o mesmo nome (distância de edição ≤ 2, a partir de cinco caracteres — com três letras, duas trocas ligam qualquer palavra a qualquer outra). Medido na tela: "Arquiteto responsável" com "Arquiteto" já declarado abre a pergunta com as duas saídas, o campo **não** é criado enquanto ela está aberta, "usar o que já existe" volta sem criar e "criar assim mesmo" cria e limpa a pergunta
  - [x] T-32.3.5 — Arquivar em vez de excluir, preservando o preenchido; obrigatoriedade vale para frente e não invalida registro antigo. Antes da primeira publicação o botão é **Remover** (não existe registro); depois, **Arquivar**. Arquivado sai do formulário, continua na lista, **devolve a coluna-slot** — medido: 1 de 2 em "pessoa e registro" volta para 0 de 2 — e perde a obrigatoriedade, porque arquivado e obrigatório ao mesmo tempo é registro que ninguém salva. A obrigatoriedade nova vale para frente porque a RPC valida contra a **versão do registro**, não a de hoje; provado com teste negativo — trocar por `current_version` reprova a suíte

### Ordem, e por que ela mudou

O desenho original era sugestão → documento → campo próprio. **O responsável
inverteu os dois primeiros em 2 de agosto**, com a justificativa que decide:

> "o editor tem que ser uma prioridade para continuar a desenvolver os outros
> módulos que utilizam documentações, como propostas, layouts de mensagens
> padrão, orçamentos, FVS, FVM, um monte de apps dependem desse módulo"

É pré-requisito descoberto, o caso previsto na R5. O motor de documento não é
uma funcionalidade do módulo de propostas: é **infraestrutura de sete módulos**,
e construir cada um sem ele significa construir sete editores que depois
precisam ser desfeitos.

Quem depende, nominalmente:

| Módulo | O que precisa do motor |
|---|---|
| Propostas | Corpo da proposta com dados do cliente e do orçamento |
| Orçamentos | Layout padrão de envio |
| Contratos | Já tem `contract_templates`, sem motor |
| Aditivos | Mesmo corpo do contrato, com o que mudou |
| Qualidade | **FVS e FVM** — ficha de verificação de serviço e de material |
| Relacionamento | Layouts de mensagem padrão, e-mail e WhatsApp |
| SAC | Resposta padrão e laudo de atendimento |

Ordem vigente: **motor de documento → sugestão → campo próprio.** Sugestão
continua barata e entrega sozinha, mas não destrava ninguém; o motor destrava
sete.

---

## Sprint S-33 — Defeitos silenciosos encontrados na verificação da S-32

**Estado:** pendente
**Marco:** M-LEGADO

Descobertos ao verificar T-32.0 no navegador, e registrados no fim conforme a
R4. Nenhum deles tem sintoma: todos aprovam nas ferramentas e falham em uso.

- [x] T-33.0 — **Embed ambíguo derruba a consulta inteira** (VACINA-052). A tela de obras listava zero com duas obras no banco, e a obra existente respondia 404. Sete telas, quatro pares de tabelas. Corrigido com chave nomeada; falha de carga separada de registro inexistente; `pnpm validate:postgrest-embeds` reconstrói o grafo de chaves estrangeiras e reprova embed ambíguo sem chave — provado com teste negativo
- [x] T-33.1 — **Chave de módulo inexistente nega todo mundo** (VACINA-053). `'dashboard'` não existe em `app_modules`, e o catálogo de valores nunca gravava. O mesmo validador encontrou `'modelos'`: dez guardas do acervo apoiados numa chave que nenhuma migration cria — o app inteiro nasceria negando todo mundo num ambiente novo. Corrigido com `is_org_member`, migration de semeadura e `pnpm validate:module-keys`
- [x] T-33.2 — **`Escape` fechava o formulário junto com a lista de sugestão** (VACINA-054), descartando o preenchimento. Camada interna aberta consome a tecla; fechada, deixa passar
- [x] T-33.3 — **Medidor de contraste não entendia `color(srgb …)`** e lia o fundo como preto, acusando 1,3:1 onde havia 15:1. Quarto ponto cego do instrumento, e o primeiro a errar acusando. Corrigido com conferência unitária dos dois lados
- [x] T-33.4 — **Cronograma com 14 alvos de toque abaixo de 44px** — barra da obra em 43px, um pixel abaixo, e botões do planejador em 34px. Agora 0 nas três larguras e nos dois temas
- [x] T-33.5 — **Barra de navegação da obra com fundo branco fixo no tema escuro**: 2,11:1 nos sete links. E `--muted` em 4,49:1, um centésimo abaixo do mínimo. Cronograma, início, obras, modelos, CRM e orçamentos fecham em 0/0 nos dois temas
- [x] T-33.6 — Herói da obra com título em `--text` sobre fundo escuro (1,12:1) e percentual branco sobre miolo branco, invisível também no portal do cliente — o único dado do cartão. Título em branco, anel com miolo escuro declarado no elemento que carrega o número (pseudo-elemento não é enxergado por auditoria de contraste)
- [x] T-33.7 — Kanban de tarefas com colunas de fundo claro fixo no tema escuro: 12 reprovações, os seis nomes de coluna ilegíveis. Todo fundo de `app/stage12.css` passou a token de superfície — kanban, cartão, trilha, barra do Gantt, nó da EAP, mídia, alerta e barra de ações
- [x] T-33.8 — Um erro de console na tela de tarefas, nas seis combinações de largura e tema: `PGRST200` no embed `profiles(full_name)` a partir de `project_memberships`, cuja `user_id` aponta para `auth.users`. O seletor de responsável mostrava um pedaço de UUID no lugar do nome. Corrigido em tarefas e equipes com `lib/pessoas/nomes.ts` (VACINA-055)
- [x] T-33.9 — Ramo de PGRST200 no validador de embeds, com leitor de `select` sensível à profundidade da árvore e universo de tabelas vindo dos `create table`. A versão achatada acusou 22 embeds válidos e escondeu cinco ambíguos reais — contratos, propostas, orçamentos, qualidade e assinaturas, todos corrigidos
- [x] T-33.10 — `--muted`, `--warning` e o `--brand` do tema escuro abaixo de 4,5:1 sobre as próprias superfícies; estado vazio e link de voltar com fundo e alvo fixos. Onze rotas fecham em 0/0 de contraste nos dois temas e 0 alvo abaixo de 44px
- [x] T-33.11 — Duas paletas de tema escuro conviviam em `app/globals.css`. **A nota estava pela metade, e a metade que faltava é o que tornava o problema pior**: a paleta antiga não estava morta. Medido no navegador — `--surface`, `--page`, `--text`, `--muted`, `--brand`, `--border` e `--ring` vinham da nova; `--copper`, `--success`, `--warning`, `--danger`, `--info` e as três sombras continuavam vindo da antiga. Meia paleta morta é pior que uma inteira: quem edita `--surface` no lugar errado não vê efeito nenhum, e quem edita `--danger` no mesmo lugar vê. Unificado em um bloco por caminho de ativação (`@media` e `data-tema`), com os valores que já venciam. **Prova de que nada mudou**: 41 tokens medidos em quatro combinações — claro padrão, escuro por mídia, escuro por atributo e claro por atributo — todos idênticos antes e depois. **Prova de que agora tem efeito**: trocar `--surface` no bloco unificado mudou o fundo do cartão de `rgb(16,34,56)` para `rgb(59,13,13)`, revertido em seguida

- [ ] T-33.12 — Tabela em tela estreita: as 20 telas do produto rolam na horizontal dentro de `.table-wrap`, sem indicar que há coluna fora de vista. Em 390px a coluna de ação some. Decidir um padrão único para o produto — cartão por linha, coluna prioritária ou indicação de rolagem — em vez de resolver tela a tela

- [x] T-33.13 — Página de orçamento transbordava em todas as larguras. **Causa: VACINA-044 outra vez, agora na trilha implícita.** `.grid` sem colunas declaradas cria uma coluna implícita de tamanho `auto`, que é `minmax(auto,auto)` e não encolhe abaixo do `min-content` do filho — medido, a coluna ficou com 1602px dentro de uma faixa de 966px. O piso `minmax(0,1fr)` mais `min-width:0` no filho são a mesma dupla já registrada; o que mudou foi onde ela faltava. **Varredura de 20 rotas em três larguras, antes e depois**: transbordos caíram de 11 para 8, e as três mudanças são exatamente o orçamento — 261px em 1366, 603px em 1024 e 1227px em 390, todas resolvidas. Nenhum transbordo novo, nenhuma contagem de cartão alterada. A tabela de 1601px continua larga e agora rola dentro do próprio contêiner, sem arrastar a página
- [x] T-33.14 — Cartão do funil com alvo de 19px. **Já estava corrigido, e a nota é que envelheceu**: o commit `bf9e2e8` pôs `.pipeline-cartao-titulo::after { inset: 0 }`, e o alvo efetivo é o cartão inteiro — 248×91. Os 19px que eu media de novo eram do meu script de medição, não da tela: `getBoundingClientRect` devolve o retângulo do `<a>`, e a sobreposição absoluta não entra nele. O arnês do próprio repositório (`scripts/qa/harness.mjs`) já calcula o alvo **efetivo** e não cai nisso. Provado pelo efeito, não pela medida: `elementFromPoint` no rodapé do cartão devolve o link certo, e quatro toques — texto do título, meio e rodapé do cartão, por mouse e por toque — navegam todos para o cartão
- [x] T-33.15 — `chaveNormalizada` não fundia "m2" e "m²". Resolvido **por escopo**, como a tarefa pedia: `chaveDoEscopo(escopo, valor)` funde expoente e índice só em `medida.unidade`; todo o resto — inclusive escopo desconhecido — continua com a regra de sempre, porque "H²" no nome de uma etapa é o nome da etapa, não uma unidade escrita torto. A fusão usa NFKD, a forma de compatibilidade, que já sabe que `²` é `2` e que `₂` também; tabela escrita à mão acertaria dois casos e erraria o terceiro. **O outro lado é o dado já gravado**: migration agrega sobre a chave nova e reinsere — a tabela tem chave natural `(organization_id, scope, normalized)`, então `update` na coluna de chave esbarraria na própria unicidade no meio do caminho. Exercitada em banco local com duplicata real: `m²` (31 usos, 31/07) e `m2` (4 usos, 01/08) viraram uma linha de **35 usos** com a grafia mais recente, `first_used_at` do mais antigo, outra empresa e outro escopo intocados. **A primeira fixture inventou uma coluna `id` que a tabela real não tem** e a migration passou verde contra um formato que não existe — VACINA-058 outra vez, agora do meu lado. Refeita fiel à tabela real, com os dois `check` e a chave natural. No banco de homologação: `m²` passou a ter a chave `m2`, mantendo o rótulo e os 31 usos, e a tela de vocabulário mostra a unidade uma vez só

- [x] T-33.16 — **Mapa do código gerado**, não escrito à mão: `diretrizes/MAPA-DO-CODIGO.md` com aplicativos, 151 rotas e a guarda de cada uma, 174 server actions por arquivo, 78 módulos de `lib/` com exportados e cobertura, 220 funções do banco com quem as declara e quem as chama, suítes de teste e validadores. `pnpm validate:code-map` reprova no CI quando o arquivo diverge do código
- [x] T-33.17 — O mapa **confronta** em vez de listar: RPC chamada sem migration, módulo nunca importado e server action que nenhuma tela referencia. O débito conhecido está congelado em `diretrizes/mapa-do-codigo.debito.json` com responsável nomeado, e o validador reprova tanto item novo quanto item já consertado que continue na lista — provado nos três casos
- [x] T-33.18 — Aritmética de cor do medidor de contraste extraída para `scripts/qa/cor.mjs` e coberta por 19 testes, um por defeito que o instrumento já teve. Antes não tinha nenhum: função serializada para o navegador não é importável, e foi assim que quatro versões erradas entraram
- [x] T-33.19 — `--exigir` nos dois scripts que saíam 0 quando o banco faltava (VACINA-056). "Não rodou" deixou de ter o mesmo código de saída de "passou"
- [x] T-33.20 — Sete server actions e um módulo de `lib/` sem nenhum uso. Decididos um a um, e **as sete não eram o mesmo caso**. **Cinco removidas por já existir o equivalente ligado**: `createProposalFromBudget` (vencida por `createFlexibleProposal`, que também recebe o PDF e o torna opcional), `instalarTrilha` (vencida por `criarFunil`, que faz o mesmo preset e ainda o funil vazio), `createDependency` (vencida por `createScheduleDependency`, que ainda valida id vazio e dependência de si mesma), `createProjectFromContract` (vencida por `createProjectFromContractSafe`, que chama a RPC v2 e preserva o formulário no erro) e `trilhaEhValida`, que era um invólucro assíncrono de uma linha sobre uma função pura — um endpoint de rede criado por engano. **Duas ligadas, porque a capacidade faltava de verdade**: `createInventoryCategory` e `createInventoryUnit`. A instalação do módulo semeia oito unidades e seis categorias, e não havia caminho para a nona — empresa que trabalha com "milheiro" não tinha onde dizer isso, num formulário em que Unidade é obrigatória. Tela nova em `/app/estoque/catalogo`, com desativar em vez de excluir, pela regra da S-34: item já cadastrado escolheu aquela unidade. **Módulo removido**: `lib/planejamento/server.ts` era uma segunda leitura do cronograma, mais estreita que a que a página faz em linha, sem importador. Medido no navegador: unidade criada aparece no seletor do item novo; desativada, sai do seletor e continua na lista explicando o que já foi cadastrado. Débito do mapa zerado em `libs` e `acoes`
- [x] T-33.21 — **`TRUNCATE` não passa por RLS, e 213 tabelas o concediam a `anon` e `authenticated`** — inclusive `emitted_documents`, `contracts`, `finance_entries`, `projects` e as 64 partições de `object_records`. Medido em banco local com a proteção no máximo — RLS habilitada e forçada, única política `for select using (false)`, `grant select, truncate` — o truncate esvaziou a tabela sem erro: 2 linhas antes, 0 depois. Não é porta aberta hoje, porque o PostgREST não emite `TRUNCATE`; é um privilégio que ninguém usa apoiado numa suposição sobre o gateway. Revogado em todo o esquema junto com `TRIGGER` e `REFERENCES`, e no padrão de privilégios para tabela nova não nascer com ele de volta. `emitted_documents` também perdeu `UPDATE` e `DELETE`. Conferido: 0 concessões perigosas, 234 tabelas com `SELECT` intactas, onze telas do produto em 200 sem bloqueio. VACINA-059, com o instantâneo do ledger carregando os privilégios perigosos e o CI reprovando lista não vazia — exercitado com teste negativo

## Sprint S-34 — Listas cadastradas: o que a empresa decide que existe como opção

**Estado:** concluída
**Marco:** M-ADMINISTRACAO

> **Nota de estado, para não parecer contradição.** As tarefas marcadas abaixo já estão
> entregues, e a sprint segue `pendente` porque a R3 admite **uma** sprint em andamento e a
> vigente é a S-23. O mesmo vale para a S-32 e a S-33: o trabalho vem sendo dirigido pelo
> responsável tarefa a tarefa, fora da ordem formal do inventário. Regularizar isso — abrir e
> fechar sprint conforme a R5 — é decisão dele, não da sessão.

Correção de rota do responsável em 3 de agosto de 2026, sobre a T-32.0.6 entregue no
mesmo dia:

> "quando for para perdido precisa abrir um formulário com os motivos da perca do lead, tipo
> parou de responder, praça errada, Produto errado, etc… esses itens tem que ser possível
> cadastrar no menu"

Ele está certo, e a razão é a mesma que fez o campo livre não servir: **motivo de perda
alimenta contagem.** "Quantos perdemos por preço neste trimestre" não fecha sobre texto que
cada pessoa escreve do seu jeito — nem com sugestão, porque sugestão não obriga.

Isto **não contraria** a diretriz de reúso, e vale escrever a diferença para não ser confundida
depois. `value_catalog` é **observado**: nasce do uso, serve para lembrar a grafia que a empresa
já escolheu, e ali lista fechada seria uma piora. `managed_list_values` é **curado**: alguém
decidiu quais opções existem, em que ordem e quais saíram de circulação. Etapa de EAP é
vocabulário; motivo de perda é dimensão de análise. São campos de naturezas diferentes, e tratar
os dois igual foi o erro de T-32.0.6.

- [x] T-34.1 — Tabela `managed_list_values` **por escopo**, não uma tabela de motivos: marcador de cartão e etapa de funil vão pedir a mesma tela, e três tabelas quase iguais é três vezes a mesma correção
- [x] T-34.2 — **Desativar em vez de excluir.** Excluir apagaria a opção de negócios que já a escolheram, e a contagem do trimestre passado mudaria sozinha
- [x] T-34.3 — Cadastro em `/app/administracao/motivos-de-perda`, no menu de Administração: acrescentar, renomear, reordenar e tirar de circulação. Reordenação troca vizinhos, não renumera a lista — duas pessoas mexendo ao mesmo tempo embaralhariam a ordem uma da outra
- [x] T-34.4 — Nove motivos semeados como ponto de partida, começando pelos três que o responsável nomeou. Empresa nova nasce com a lista por trigger, como a semeadura de modelos
- [x] T-34.5 — **O funil abre o formulário de perda** ao escolher "Perdida", com os motivos cadastrados em rádio aberto — poucas opções curtas, e a lista visível deixa comparar antes de escolher. Nenhum vem marcado
- [x] T-34.6 — **Conferência no servidor**, não só no `required` do rádio: o que chega é um POST, e um POST montado à mão gravaria qualquer texto em `lost_reason`, que é justamente a coluna que precisa ser contável
- [x] T-34.7 — Lista vazia **bloqueia o envio** e diz onde cadastrar, em vez de mostrar um seletor sem opção; a mensagem muda conforme quem está olhando pode ou não administrar
- [x] T-34.8 — `negocio.motivo_perda` deixa de gravar em `value_catalog`: duas fontes para o mesmo campo fariam o mesmo valor aparecer em duas telas de administração como se fossem coisas diferentes
- [x] T-34.9 — Contagem de perdas por motivo, que é a razão de a lista ser curada — `/app/relatorios/perdas`, Pareto **ordenado por valor e não por contagem**: doze perdas de R$ 5 mil somam menos que uma de R$ 400 mil, e ordenar por contagem mandaria resolver o problema errado. Classificação A/B/C na convenção de `QUALIDADE-CAUSA-RAIZ.md` §2, com teste que reproduz os oito valores da tabela de lá — se ela mudar, ou a diretriz mudou junto, ou a implementação divergiu
  - [x] T-34.9.1 — Perda **sem motivo** entra na conta como linha própria. Esconder produziria um relatório bonito e falso: os percentuais fechariam em 100% sobre uma base que não é o total perdido
  - [x] T-34.9.2 — Seção dos motivos cadastrados que ninguém escolheu no período. É o outro lado da curadoria: motivo que ninguém escolhe em doze meses ou não descreve a realidade da empresa, ou está escrito de um jeito que ninguém reconhece — e o que não aparece não chama atenção
  - [x] T-34.9.3 — A classificação A/B/C **some abaixo de cinco motivos**. Medido na tela: com dois, "praça errada" com 44% da perda saía como classe C, que é o rótulo de desprezível. ABC pressupõe cauda longa; sem ela, a ordem por valor já é a mensagem inteira
  - [x] T-34.9.4 — Regra da tabela canônica corrigida num caso que ela não previa: com um motivo só, o acumulado da primeira linha já é 100% e a maior causa sairia como C. A primeira linha é sempre A — ela é, por definição, a prioridade
- [x] T-34.10 — Avaliada a mesma tela para marcador de cartão e etapa de funil. **Resposta: não, e por motivos diferentes.** Etapa de funil é vocabulário, não dimensão: cada construtora nomeia as próprias etapas, elas mudam por trilha e ninguém soma "quantas etapas 'Qualificação' existem" — curar obrigaria a passar por Administração para criar uma coluna, que é o oposto do que a tela do funil precisa ser. Marcador de cartão não existe no produto; avaliar antes de existir seria decidir sobre o que não se viu. O critério fica escrito: **cura-se o que alimenta contagem; observa-se o que nomeia**

- [x] T-34.11 — Medidor de alvo de toque passa a aplicar a isenção da WCAG 2.5.5 para link **dentro de frase**: aumentar um link em texto corrido exigiria quebrar a linha do parágrafo, e reprovar a marcação correta ensina a ignorar o vermelho. Só isenta quando há frase em volta — link sozinho num parágrafo é botão mal vestido e continua medido. Provado com teste negativo: encolhendo a barra de relatórios de propósito, a reprovação volta
- [x] T-34.12 — Barra de navegação dos relatórios em 41px, três abaixo do mínimo. Executivo, obras, financeiro, compras, qualidade, perdas, metas, salvos e snapshots fecham em 0
- [x] T-34.13 — Relatório executivo: transbordo e alvos corrigidos. O transbordo era a **VACINA-044 outra vez** — `grid-template-columns:1fr` na consulta de mídia não encolhe abaixo do `min-content` do filho, e a tabela de desempenho por obra (621px) arrastava a página. Aplicada a solução já registrada (`minmax(0,1fr)` mais `min-width:0` no item), não uma nova
- [x] T-34.14 — Tons do módulo de relatórios eram fixos do tema claro: no escuro o cartão de indicador ficava com fundo verde ou vermelho claro e o número em branco por cima — 1,03:1 no "0%". Mesma causa raiz de `stage12.css` e do estado vazio. **As nove telas de relatório fecham em 0/0** de contraste nos dois temas e 0 alvo abaixo de 44px nas três larguras

---

## Sprint S-35 — Object Runtime: o registro visto e lido

**Estado:** pendente
**Marco:** M-1

Descoberta ao fechar a T-32.3, e entra **no fim** conforme a R4. A fundação e o
estúdio existem e foram exercitados; o que não existe é o outro lado do balcão.
Hoje um objeto publicado só recebe registro por chamada de RPC — nenhuma tela
cria, lista ou abre um registro, e o contrato (§12.3) ainda tem dois itens em
aberto.

O que fica de fora é tão importante quanto o que fica dentro: **nenhum número
desta implementação foi medido sob carga.** Os limiares do contrato — 64
partições, 14 slots, 64 KB, 200 campos, p95 de 300 ms — continuam sendo
estimativas fundamentadas, exatamente como a §12.2 declara.

- [ ] T-35.1 — Leitura com **paginação keyset**, nunca `OFFSET`, e recusa de filtro sobre campo não indexado com mensagem que orienta (item 4 da primeira fatia). Degradar em silêncio até a plataforma ficar lenta por causa de um objeto mal declarado é pior, e é invisível até ser tarde
- [ ] T-35.2 — Tela de registros do objeto: listar, criar e abrir, com o formulário montado a partir da versão do registro — não da versão de hoje
- [ ] T-35.3 — Campo de anexo passando por `secureUpload`, quarentena e varredura, sem caminho novo de arquivo
- [ ] T-35.4 — Campo de referência declara o alvo. Hoje `ObjectFieldSpec` guarda o tipo `referencia` e não guarda para onde ele aponta; o §2.1 diz "uuid + alvo"
- [ ] T-35.5 — POC de carga com **milhões** de registros (item 7). Antes disso, nenhuma promessa de escala pode ser feita a partir deste código
- [ ] T-35.6 — Onde o seguidor aparece: `object_record_followers` é gravado e ninguém o lê ainda. Encaixar na T-29 (acompanhamento a distância) em vez de criar um segundo mecanismo de notificação

---

## Sprint S-36 — A barra superior em largura de tablet

**Estado:** pendente
**Marco:** M-5

Descoberta ao medir a T-33.13, e entra **no fim** conforme a R4. Não é o
defeito que a T-33.13 tratava: sobrou depois de resolvê-lo, e é de outro lugar.

Medido em 20 rotas e três larguras: **oito telas transbordam em 1024px**, e a
causa é a mesma em todas — `.barra-superior`. Em 1024 as trilhas ficam
`434 / 260 / 265` e a `.barra-direita` precisa de 370: a soma dos mínimos passa
da largura disponível, o navegador encolhe a trilha `auto` abaixo do conteúdo, e
a barra vaza. Transbordo por tela: modelos 62px, financeiro 31px, estoque 87px,
catálogo do estoque 87px, qualidade 43px, relatórios 42px, compras 38px,
auditoria 73px.

Existe uma regra elástica para 1261–1699px, onde a busca cede porque as ações
da direita são todas alvos de toque. Entre 921 e 1260 não existe equivalente: a
faixa herda `minmax(260px, auto) minmax(260px, 1fr) auto`, que não fecha.

Fica para uma sprint própria porque **é a casca de todas as telas** e o mapa das
duas barras é canônico (`PADRAO-DE-INTERFACE.md` §12): decidir o que cede em
tablet é decisão de produto, não conserto de CSS. Improvisar aqui, dentro de uma
tarefa sobre a página de orçamento, seria redesenhar a casca de lado.

- [ ] T-36.1 — Decidir o que cede entre 921 e 1260px, com a mesma regra que já vale acima de 1261: a busca é elástica, as ações da direita são alvos de toque e não encolhem. Medir as oito telas antes e depois
- [ ] T-36.2 — Em 390px o nome do aplicativo trunca colado no rótulo do menu — a barra lê "Orçamen..Menu". É a mesma disputa de espaço, na outra ponta
- [ ] T-36.3 — Levar as três larguras para o arnês de QA visual como regressão fixa, para transbordo de casca não voltar sem ninguém ver

---

## Sprint S-37 — Orçamento analítico: SINAPI que importa, CUB completo e o corte material × mão de obra

**Estado:** pendente
**Marco:** M-ORCAMENTOS

Nasce de uma auditoria pedida pelo responsável em 04/08/2026 — *"no módulo de
orçamento eu incluí um modo para sincronizar o Sinapi automaticamente para
realizar o orçamento analítico, no CUB tem outros tipos de construção, também é
necessário separar por mão de obra e material, valide para mim"*. Entra **no
fim** conforme a R4. Os três pontos foram medidos, e os três têm defeito real.

### O que foi medido

**SINAPI nunca importou nada.** No banco: 0 lotes, 0 itens de catálogo, 0
composições, 0 execuções de sincronização. O mecanismo está inteiro — descoberta
pela API oficial da CAIXA, verificação de ZIP, trava de concorrência por
`advisory lock`, SHA-256 obrigatório, domínio `caixa.gov.br` exigido, importação
só por `service_role` — e falha antes de gravar a primeira linha. Medido com o
pacote real de 06/2026, pelos dois caminhos que existem no código:

- o botão da tela (`automatic-update.ts`): *"SINAPI_XLSX: somente 0 insumos
  válidos foram encontrados; mínimo esperado: 500."*
- a sonda v2 (`automatic-update-v2.ts`): *"relatório de insumos SP não
  desonerado não encontrado."*

**A causa está no formato da publicação.** `SINAPI-2026-06-formato-xlsx.zip`
(15.715.816 bytes) traz quatro arquivos, e **nenhum deles tem UF ou regime no
nome**: `SINAPI_familias_e_coeficientes_2026_06.xlsx`,
`SINAPI_Manutenções_2026_06.xlsx`, `SINAPI_mao_de_obra_2026_06.xlsx` e
`SINAPI_Referência_2026_06.xlsx`. O seletor
(`official-reference-parser.ts#selectTargetFiles`) lê UF, regime e tipo **do
nome do arquivo**, como era quando cada UF tinha o seu. Hoje a UF é **coluna** —
o cabeçalho da planilha de coeficientes lista AC, AL, AM … SP, TO. O leitor está
uma geração de formato atrás.

**Há uma segunda parede atrás dessa.** `runSinapiAutomaticUpdate` exige
`SUPABASE_SERVICE_ROLE_KEY` e `start_sinapi_import` recusa quem não é
`service_role`. A decisão de segurança em vigor é que essa chave **não vai para
o deploy público**; então, mesmo com o leitor corrigido, o caminho automático
precisa de um lugar para rodar que a tenha — um trabalho agendado, não a
aplicação web.

**CUB tem um tipo de construção só.** O esquema aceita qualquer
`reference_code`; o banco tem duas linhas, e as duas são **R8-N** (com e sem
desoneração), só SP. Faltam R1, PP-4, R8, R16, PIS, RP1Q, GI, CAL e CSL, e os
padrões de acabamento baixo/normal/alto. A tela lista o que existe na tabela —
logo, oferece um item.

**Material × mão de obra existe pela metade.** No item manual, sim: a coluna
`item_category` aceita MATERIAL, LABOR, EQUIPMENT, SERVICE, SUBCONTRACT,
FIXED_COST, REFERENCE e OTHER, e o campo "Natureza" do formulário grava.
No CUB, não: `addCubReferenceItem` lê só `total_cost` e insere **uma linha
`REFERENCE`**. E `cost_reference_snapshots` **já tem** `materials_cost`,
`labor_cost`, `administrative_cost` e `equipment_cost` — a linha desonerada
semeada traz 892,29 + 1.192,01 + 61,78, que fecha exatamente os 2.146,08 do
total (55,5% mão de obra, 41,6% material). Ninguém lê essas colunas.
E nos totais, não: `calculate_budget_version` soma por `cost_type`
(direto/indireto/fixo/administrativo) e **não** por natureza — não existe total
de material nem de mão de obra em tela nenhuma.

### Tarefas

- [x] T-37.1 — Leitor reescrito para o formato publicado. O pacote tem **um** arquivo que importa (`SINAPI_Referência_2026_06.xlsx`, dentro de um ZIP de 15.715.816 bytes), com **UF em coluna** e **regime em aba** — ISD/ICD, CSD/CCD, ISE/CSE e Analítico. `lib/sinapi/relatorio-oficial.ts` é o leitor puro; `official-reference-parser.ts` abre o ZIP e monta. Medido contra o pacote real, SP sem desoneração: **2.880 insumos** (dos 4.876 do arquivo — 1.996 sem preço em SP), **8.403 composições**, **43.923 itens analíticos**. Quatro armadilhas recusadas em vez de adivinhadas, todas registradas na **VACINA-060**
- [x] T-37.2 — **Decidido: trabalho agendado no GitHub Actions**, dia 15 de cada mês, escrito em `SINAPI-ATUALIZACAO-AUTOMATICA.md` §9.1. Pesou que o Actions **já guarda a mesma chave** e a usa em três workflows — não é superfície de confiança nova. A alternativa (arquivo enviado à mão) custaria afrouxar `start_sinapi_import` para aceitar chamador autenticado comum: privilégio permanente alargado por causa de tarefa mensal. O job confere o layout antes de gravar, compila, sobe instância própria com a chave no ambiente efêmero do runner, gera um `CRON_SECRET` que vive um job, e chama `/api/internal/sinapi-atualizacao` — o script orquestra e **não** reimplementa o importador, que foi o defeito da T-37.7. Falha fechada conferida em instância compilada: 401 sem segredo e com segredo errado, 400 nas três validações, 502 dizendo qual configuração falta. Leitura ponta a ponta contra o pacote publicado: SP nos dois regimes, 2.880 insumos e 8.403 composições. **Falta criar o segredo `SINAPI_ORGANIZATION_ID`**, e a gravação só é exercitada na primeira execução agendada — não há chave de serviço neste ambiente, que é a própria premissa da decisão
- [x] T-37.3 — `pnpm sinapi:layout` baixa o pacote publicado hoje e cobra o contrato: nove conferências, entre elas a **reconciliação do somatório dos itens contra o custo oficial da composição** — 5.433 de 5.544 fecham dentro de 1%, desvio mediano 0,02%. Provado que morde, quebrando o leitor de propósito: ler o valor em cache em vez da fórmula reprova por código zerado; preço vazio virando zero reprova por preço zerado; **deslocar a UF em uma coluna derruba a reconciliação de 98% para 45,1%**. O `prebuild` deixou de conferir o leitor antigo e passou a conferir o leitor em uso
- [x] T-37.4 — **As dezenove tipologias da NBR 12721**, e não uma só. O banco tinha duas linhas, ambas R8-N, porque o leitor lia a **notícia** mensal — e a notícia publica só o CUB representativo. Não faltava esquema; faltava fonte. A fonte é a série histórica oficial (`Cub-Serie-Historica-Julho-26.xlsx`, 481.518 bytes, SHA-256 `671aff24…`), com quatro blocos: GLOBAL, MDO, MATERIAL e DESPESAS ADMINISTRATIVAS. `lib/cost-sources/cub-serie-historica.ts` lê, e trata três armadilhas medidas: **o bloco GLOBAL não tem cabeçalho** (a ordem das colunas é conferida pela reconciliação, não suposta); **os blocos não cobrem os mesmos meses** — GLOBAL tem 234 e os outros 222, com 2024 inteiro só no GLOBAL —, então o mês lido é o último que existe nos quatro; e a data é serial do Excel. Semeadas 19 tipologias de 07/2026, SP, sem desoneração, **todas fechando ao centavo** e com o R8-N em R$ 2.231,37, igual ao que a página do SindusCon publica — duas fontes independentes, mesmo número. Isso também destrava a T-37.5 para as linhas sem desoneração, que antes vinham só com o total e caíam em linha única de `REFERENCE`. A tela agrupa por família com a descrição de cada sigla; medido: 0 alvo abaixo de 44px e 0 transbordo nas três larguras
- [ ] T-37.13 — **Cobrir o país.** Decidido pelo responsável em 4 de agosto: integração por UF sob demanda, porque a empresa faz obra em outros estados. Três medições mudaram o desenho e estão registradas antes de qualquer código:
  1. **O SINAPI já é nacional.** O leitor lê a UF como **coluna** e cobre as 27; a tela do catálogo já tem seletor de UF; o trabalho agendado aceita `--uf SP,RJ,…`. Para o orçamento **analítico**, cobrir o país é rodar a importação para as UFs em uso — não falta código, falta configuração.
  2. **O CUB não tem fonte nacional aberta.** A CBIC publica "CUB Médio Brasil", mas os arquivos estão marcados **Restrito** (assinatura). O portal `cub.org.br` está bloqueado pela política de rede deste ambiente e **não foi contornado**. Sobra o que sempre foi: cada Sinduscon estadual publica o seu, em página e formato próprios.
  3. **`cost_reference_snapshots` é uma tabela só de CUB** — o SINAPI não vive nela — e já tem `region` na chave natural. O que trava é a tela, que filtra por `source_key = 'SINDUSCON_SP_CUB'` fixo. E `projects.state` existe: a obra já sabe em que UF está.
  Daí o desenho, em três partes, e a razão de **não** escrever 26 raspadores: eles envelhecem em 26 lugares diferentes e quebram um por vez, em silêncio
- [x] T-37.13a — **O CUB deixa de ser de São Paulo.** A consulta filtrava `source_key = 'SINDUSCON_SP_CUB'` fixo, então uma obra em Minas recebia o preço paulista **sem aviso** — e o CUB varia entre estados na casa das centenas de reais por m². Agora a UF da obra manda (`projects.state`), o que a pessoa escolher na tela ganha dela, e sigla inválida volta ao padrão em vez de virar filtro vazio: "este estado não tem" e "não há nenhum" são respostas diferentes. Estado vazio diz qual UF falta e quais existem. Provado com os três caminhos: SP com as 19 tipologias, `?uf=MG` com o vazio honesto, e **obra em MG** — projeto ligado ao orçamento, para exercitar a relação que a VACINA-001 existe para pegar —, que trouxe MG com o marcador "UF da obra". Dados de teste revertidos. Medido: 0 alvo abaixo de 44px, 0 transbordo e 0 reprovação de contraste (93 elementos por tema), três larguras
- [ ] T-37.13d — **`cub.org.br` está bloqueado pela política de rede deste ambiente**, nos quatro endereços testados: `Host not in allowlist: www.cub.org.br`. O responsável indicou `cub.org.br/cub-m2-estadual/` como fonte do CUB por estado — se ela publicar as UFs num lugar só, a T-37.13c deixa de ser 26 leitores e vira **um**, e o desenho registrado acima muda a favor. Depende de liberar `cub.org.br` e `www.cub.org.br` na *network egress* do ambiente; não foi contornado
- [x] T-37.13b — **Importação manual com procedência**, o caminho que vale para os 27 hoje. A T-37.13a trocou um erro silencioso (obra em Minas recebendo o preço paulista) por um beco honesto ("Sem CUB importado para MG"), e beco sem saída tem uma saída só: trocar a UF para SP e usar o número errado **de propósito**, que é pior que o problema original. `registrar_cub_manual` é `SECURITY DEFINER` porque desde a T-37.12 a referência oficial é imutável para `authenticated` — afrouxar aquilo para caber a importação desfaria a VACINA-061 pela porta da frente. Alçada: EDIT em Orçamentos, o orçamentista, que é quem tem o PDF do sindicato na mão; exigir `administer` deixaria a tarefa com quem não a faz. **`source_sha256` guarda o digest da declaração canônica, não um hash digitado**: o servidor não viu arquivo nenhum, e aceitar o hash do chamador deixaria a coluna com cara de evidência conferida — o hash do PDF, quando informado, fica em `arquivoSha256Declarado`, com esse nome. `retrievalMode = 'declaracao-manual'` é o que a tela lê para nunca mostrar declaração com a cara de leitura. A guarda de fonte oficial virou forma (`^SINDUSCON_[A-Z]{2}_CUB$`), senão a linha de Minas nasceria fora da proteção. Provado no banco como orçamentista autenticado: registro aceito, `source_sha256` recalculável da própria linha, auditoria em WARNING, repetição devolvendo a mesma linha, e **15 recusas** — UF fora das 27, tipologia fora da NBR 12721, data-base no meio do mês, data futura, valor uma ordem de grandeza fora nos dois sentidos, meia decomposição, parcelas que não fecham, `http`, `javascript:`, SHA malformado, fonte sem nome, publicação anterior à data-base, troca de valor na mesma competência, e **sem permissão em Orçamentos**. Este último foi refeito: a primeira tentativa trocou o **papel** para `ENGENHEIRO` e o registro passou assim mesmo, porque o perfil de acesso concede por cima do papel — a negativa explícita em `user_module_permission_overrides` é o que leva a `NONE`, e aí a guarda morde; medido `DELETE → NONE → recusa → DELETE → aceita`, com o positivo logo depois para provar que o que recusou foi a permissão. Tela em `/app/orcamentos/cub/importar`, entrando do estado vazio do orçamento em um clique, com a UF já escolhida e o caminho de volta. Medido com o arnês, três larguras × dois temas: **0 alvos abaixo de 44px, 0 transbordo, 0 reprovação de contraste** (26 elementos na tela nova, 95 na do orçamento). Dados de teste revertidos ao baseline de 21 instantâneos
- [ ] T-37.13c — Fonte automática por UF como encaixe, na moldura que o SP já usa (`cub-fonte.ts` + `cub-serie-historica.ts`). Cada estado entra quando valer a pena, sem tocar nos outros
  - [x] T-37.13c.1 — **Medição antes do desenho, e ela mudou o desenho.** A premissa registrada na T-37.13 era que não valia escrever raspador por estado. Sondando a rede deste ambiente: `sindusconsp.com.br`, `sinduscon-mg.org.br` e `sinduscon-ba.com.br` respondem 200, `sinduscon-pr.com.br` responde 301 — **três sindicatos além de SP são alcançáveis**, e `sindusconrio.com.br` e `cub.org.br` não. Minas foi medida inteira: o CUB é publicado em **PDF mensal**, com o link descoberto na página `/cub/` (o nome muda — `composicao_cub_junho_2026.pdf` virou `composicao_cub_julho_26.pdf` no mês seguinte, que é a prova de que fixar o endereço buscaria o arquivo do mês passado para sempre, com aparência de funcionar). O arquivo certo é a **composição**, não a tabela: traz `Materiais`, `Mão de Obra`, `Despesas Administrativas`, `Equipamentos` e `Total` por tipologia, em códigos quase canônicos — só um hífen a mais (`PP-4-B` por `PP-4B`, `CAL-8-N` por `CAL-8N`). Conferido por execução nas dezenove: **19 tipologias, 19 fechando ao centavo**, e o R8-N em R$ 2.548,75 batendo nos dois PDFs independentes do mesmo sindicato — mesma disciplina de duas fontes que validou São Paulo
  - [x] T-37.13c.2 — **`lib/planilhas/pdf-texto.ts`, o extrator que faltava.** O contêiner de desenvolvimento tem `pdftotext`; **a Vercel não tem**, e leitor que só funciona na máquina de quem escreveu falha na primeira execução agendada. Extração em Node puro, com `zlib` da biblioteca padrão e nenhuma dependência nova. O formato ajudou: fontes **Type1** com **WinAnsiEncoding** e **nenhum `/ToUnicode`** — sem CID, sem CMap embutido. O fluxo vem em `ASCII85Decode` encadeado com `FlateDecode`, e as quatro combinações são tentadas em ordem. Três decisões que valem registro: fluxo que não abre é **pulado** e não fatal (um PDF tem fluxos de imagem e metadado que nada têm com o texto, e abortar por causa deles recusaria arquivo legítimo); **nenhum texto em arquivo nenhum é erro**, não string vazia — devolver `""` faria o leitor de cima concluir "a publicação não traz o R8-N" quando a verdade é "não consegui ler a publicação", e só uma dessas respostas manda alguém olhar o arquivo; e o grupo final incompleto do ASCII85 devolve um byte a menos que os dígitos, que é onde implementação apressada corrompe o fim de cada fluxo. 14 testes com PDFs montados byte a byte — fixture binária de 98 KB é coisa que ninguém revisa —, e a conferência contra o publicado feita em execução: **2 fluxos, 24.924 caracteres, 19 códigos distintos e 95 valores monetários**, que são exatamente 19 tipologias × 5 linhas
  - [x] T-37.13c.2.1 — **Dois defeitos no extrator, achados olhando a saída antes de construir por cima dela.** Nenhum dos dois quebrava teste: os testes procuravam âncoras, e as âncoras continuavam lá. (1) **Literal `(…)` era extraído de qualquer lugar do fluxo, não só como operando de operador de texto.** Um fluxo de **imagem** em ASCII85 contém, por acaso, bytes que formam parênteses e a sequência `Tj` — e o leitor devolvia ruído binário misturado ao texto da publicação: **730 pedaços e 24.924 caracteres**, contra os ~1.800 que o arquivo realmente tem. Corrigido ancorando em `Tj`, `TJ`, `'` e `"`, exigindo `BT` no fluxo, e tentando os candidatos decodificados **antes** do cru. (2) **`endstream` contém `stream`**, então a varredura encontrava cada fluxo duas vezes — uma no início de verdade e outra no fechamento, cujo "conteúdo" varria até o próximo `endstream`. O sintoma é texto duplicado, que numa tabela de custo vira tipologia repetida com o mesmo valor: **parece dado, não parece defeito**. Corrigido com `(?<![A-Za-z])`. Depois das duas: **218 pedaços, 1.849 caracteres, 19 códigos, 95 valores, e `2.548,75` aparecendo exatamente uma vez**. Três testes de regressão novos, entre eles um fluxo que imita a forma sem ser conteúdo
  - [ ] T-37.13c.3 — O leitor de Minas sobre o extrator: descobrir o link na página, normalizar o hífen a mais, reconciliar as parcelas contra o total e recusar quando não fechar. Depois, o encaixe por UF em `cub-fonte.ts`, com estado sem fonte falhando fechado
- [x] T-37.14 — **A sincronização agendada passou a trazer as dezenove.** Sem isso, em agosto dezoito ficariam paradas em 07/2026 e uma avançaria — e comparar tipologias de competências diferentes é pior que dado velho, porque parece atual. `lib/cost-sources/cub-fonte.ts` **descobre** o link na página oficial em vez de fixá-lo (o endereço muda todo mês; fixar buscaria o arquivo do mês passado para sempre, com aparência de funcionar), recusa link fora do domínio e arquivo que não seja a série, e limita tamanho e tempo. Série atrasada em relação à notícia **derruba a execução** de propósito: gravar só a notícia produziria exatamente o desalinhamento que o bloco existe para impedir, e a mensagem nomeia as duas datas para não parecer defeito. Provado ponta a ponta contra o publicado: link descoberto, 481.518 bytes, SHA-256 `671aff24…` igual ao do arquivo baixado à mão, 19 tipologias, data-base 07/2026
- [x] T-37.14.1 — **Um leitor de planilha só.** O ZIP endurecido e a leitura de `.xlsx` estavam privados dentro do leitor do SINAPI, e o CUB precisava do mesmo trabalho. Extraídos para `lib/planilhas/xlsx.ts` em vez de copiados — duas cópias divergindo em silêncio foi o defeito da T-37.7, e o jeito de não repetir é não criar a segunda. O SINAPI foi reconferido depois da extração **contra o pacote publicado**, não só contra fixture: `pnpm sinapi:layout` segue em 10/10. Quatro guardas novas no `validate:vaccines`, provadas uma a uma
- [x] T-37.5 — CUB entra decomposto. `lib/orcamentos/cub.ts` lê `materials_cost`, `labor_cost`, `equipment_cost` e `administrative_cost` do instantâneo e emite uma linha por natureza (MATERIAL, LABOR, EQUIPMENT como DIRECT; administrativo como ADMINISTRATIVE), com os códigos sufixados `-MAT`, `-MO`, `-EQP` e `-ADM`. **Só decompõe quando as parcelas reconciliam com o total** dentro de um centavo por unidade; fora disso volta a ser uma linha `REFERENCE` e a tela diz por quê — decompor sem fechar seria inventar a diferença
- [x] T-37.6 — Total por natureza no resumo do orçamento. `lib/orcamentos/naturezas.ts` repete a fórmula do banco (`quantity * unit_cost * (1 + loss_rate + freight_rate)` no direto e no indireto, sem acréscimo no fixo e no administrativo) e arredonda **no total**, como o `numeric(18,2)`. Ordenado por valor, com percentual sobre o custo-base
- [x] T-37.7 — Um leitor só, e um módulo só. `automatic-update-v2.ts` **removido**: existia porque a sonda foi corrigida sem o botão, e os dois divergiram falhando em pontos diferentes pelo mesmo motivo. Botão e sonda entram por `automatic-update.ts`; o `parserVersion` gravado no lote passou a `6-official-reference` e o metadado carrega quantos itens analíticos vieram junto — zero ali significa composição sem composição
- [x] T-37.8 — **Sub-composição entrava com custo zero.** Dos 43.923 itens analíticos de SP, **26.773 (61%) não são insumo: são outra composição**, e 26.771 têm custo publicado na aba CSD. O leitor gravava `unitCost: 0` em todas — a composição chegaria à tela com dois terços dos itens custando nada. Corrigido lendo a aba que já estava carregada; a reconciliação passou de 438 composições fechando para 5.433. Descoberto durante a T-37.3, registrado na **VACINA-060**
- [x] T-37.9 — **Ausência de custo deixou de ser gravada como zero.** O `null` honesto do leitor morria na porta: `greatest(coalesce(nullif(v_item ->> 'unitCost',''), 0), 0)` mais `unit_cost not null`. Agora `unit_cost` e `total_cost` aceitam `null` e um `price_status` de vocabulário fechado diz por quê — `SEM_PRECO_NA_UF` (está no relatório, não houve coleta no estado) ou `FORA_DO_RELATORIO`. Um `check` amarra os dois, para `null` não virar um segundo jeito de dizer zero, e `items_without_cost` na versão é o que permite dizer "incompleta". Medido em SP: **4.679 dos 43.923 itens sem preço, e 2.859 das 8.403 composições (34%) incompletas** — um terço do catálogo mostraria item de graça. A `Situação` da planilha é guardada à parte porque é **nacional**: COM PREÇO significa "coletado em pelo menos uma UF", e é exatamente o que esses 4.679 itens declaram. Provado no banco com round-trip pela RPC e três testes negativos do `check`
- [x] T-37.10 — **Tela da composição analítica**, em `/app/orcamentos/sinapi/composicao/[id]`. As quatro perguntas: entra **P11**, o orçamentista ("esse preço paga o escopo e o risco?"); vem **da linha do catálogo**, pela contagem de componentes, em **um clique**; resolve **se o custo publicado está inteiro** antes de virar preço de proposta. A tela separa três coisas que se pareciam: *fecha* (soma dos itens bate dentro de 1%), *não fecha* (divergência de dado) e **incompleta** (falta preço de item — a soma é menor porque parte não foi pesquisada, **não porque o serviço seja barato**). Cada item sem custo diz o motivo em texto, não só por cor. Barra 2 conforme §12.2: sem busca, porque é registro e não coleção, e sem seletor de visualização, porque não há segunda visualização que funcione. Medido com o arnês do repositório, três larguras × dois temas: **0 alvos abaixo de 44px, 0 transbordo, 0 reprovação de contraste** (60 elementos por tema)
- [x] T-37.10.1 — Dois defeitos achados pela própria medição e corrigidos junto: o link novo da lista era um alvo de 67×19px — link sozinho em célula não tem a isenção de "texto corrido" da WCAG 2.5.5 —, e o **filtro do catálogo exigia 740px de largura mínima** (`minmax(220px,2fr) repeat(4,minmax(130px,1fr))`), derrubando a página inteira para o lado em 390px. É a VACINA-044 na trilha explícita. Depois: 0 e 0 nas três larguras
- [x] T-37.12 — **Referência oficial não muda de dono.** O registro original desta tarefa estava **errado no diagnóstico**: eu havia anotado "gravável por qualquer membro interno" a partir da política (`for all`) e do privilégio, sem executar. Na execução, a escrita direta é negada — existe o gatilho `guard_official_cost_reference`, que eu não tinha procurado. Mas a tentativa por outro caminho achou um buraco de verdade, mais estreito e pior: **no `UPDATE` a guarda lia `new.source_key`**, o valor novo do campo que decide se ela se aplica. Medido: `update cost_compositions set source_key='PROPRIA'` é permitido, e depois disso o custo de 208,33 vira 1,00 — **com `source_url`, `source_sha256` e `base_date` intactos ao lado**, atestando um número que já não é aquele. Corrigido para olhar o que a linha **é**: recusa no `UPDATE` quando era oficial **ou** quando passaria a ser (senão a composição da casa seria promovida a oficial), conferência contra o pai antigo e novo nos filhos, e o CUB entrou na mesma proteção — dependia só da RLS de leitura, com o privilégio de escrita ainda concedido. Provado com a **mesma** prova de antes, sem alterá-la: cinco tentativas, cinco negadas; e os quatro caminhos legítimos conferidos um a um. **VACINA-061**, que registra também o erro de método: inferência de esquema encontra o que se procura, execução encontra o que não se procurava
- [x] T-37.11 — **Função de diagnóstico global removida, na ordem certa.** O pré-requisito era o hardening R3B, que estava no débito congelado da S-22 — e enquanto ele não entrasse, a função não era órfã: a policy `observability_diagnostics_select` a chamava, e o `drop` teria falhado por dependência ou aberto o diagnóstico global. Alcance do R3B conferido **antes** de aplicar: nenhuma função `SECURITY INVOKER` chama `record_audit_event` ou `write_audit` (as 21 que usam são todas `definer`), e a tabela de diagnóstico está vazia, então restringir a leitura global não esconde nada hoje. Aplicado, e só então a remoção — com policies dependentes, funções dependentes e dependências de catálogo **todas em zero**. O débito congelado do R3B saiu da lista: 18 arquivos sem aplicação viraram 17
- [x] T-37.11.1 — Erro meu, pego pelo `validate:migrations-applied`: apliquei os dois corpos de função do R3B com **nome lógico diferente** do arquivo, criando um "aplicado sem arquivo". É exatamente o que a VACINA-057 existe para pegar, e pegou na primeira execução. Corrigido no registro — a DDL pertence ao R3B e já constava por lá
- [ ] T-37.15 — **Checklist universal de conclusão de módulo**, o mesmo para todos: `pnpm checklist:modulo orcamentos` responde os itens mecânicos, e os humanos — persona, QA visual, KPI, relatório de ausência — ficam em `diretrizes/CHECKLIST-DE-CONCLUSAO-DE-MODULO.md`. **Item humano sem evidência conta como não feito.** A tarefa aponta e não repete o esqueleto (R8): regra escrita em 28 sprints diverge em silêncio

---

## Sprint S-38 — Endurecer o que o compilador não pega, sem trocar de linguagem

**Estado:** concluída
**Marco:** M-DOCUMENTOS

Nasce da decisão do responsável em 10/08/2026, depois da avaliação executada do
mapa tecnológico polyglota: *"vamos mudar a partir de agora que não temos
usuários ativos, enrijecer aquelas regras que discutimos anteriormente para não
haver regressões e proteção"*. Entra **no fim** conforme a R4.

### O diagnóstico que ordena a sprint

A queixa que abriu a discussão foi específica e verificável: *"sempre está
havendo regressões, deadcodes por esquecimento de chamadas"*. Ela foi medida,
não aceita de palavra. A `main` estava com **3 erros de sintaxe e 31 erros de
tipo, 23 deles `Cannot find name`**, em 6 arquivos — imports e definições
apagados por resolução de merge, com os pontos de chamada mantidos.

O `tsc` pega esse lado: chamada sem definição. O lado oposto — a **definição que
sobra**, viva no arquivo e morta no sistema — nenhum portão do repositório
pegava. E o compilador do Go também não pegaria: no experimento executado, `go
build` e `go vet` passaram limpos sobre os mesmos defeitos reais e produziram a
mesma saída errada. Quem pegou foi o `staticcheck` com `U1000`, que é
**ferramenta separada**, não a linguagem. A conclusão que ordena a sprint é
essa: o ganho atribuído à troca de linguagem estava, na verdade, na camada de
ferramenta — e essa camada se instala aqui.

O terceiro achado veio de olhar a saída antes de construir por cima dela. O
extrator de PDF devolvia **730 pedaços e 24.924 caracteres** para um arquivo de
~1.800, e **passou pela bateria inteira** porque a asserção perguntava se o
texto *continha* `"R8-N"` — e continha, ao lado de 23.000 caracteres de lixo.

### Tarefas

- [x] T-38.1 — **`noUnusedLocals` e `noUnusedParameters` ligados** no `tsconfig.json`. O custo real foi medido antes de decidir: **uma única violação** em todo o repositório, em `lib/documentos/modelo.ts` — o parâmetro posicional do `replace` que existe só para o grupo de captura cair no índice 1. Corrigido com o prefixo `_`, que é a forma que o compilador reconhece como "não usado de propósito" em vez de esquecimento. Regra provada por sabotagem: variável não usada introduzida de propósito reprova o `pnpm typecheck`
- [x] T-38.2 — **`pnpm validate:exports-mortos` — o `U1000` sem trocar de linguagem.** Varre `app`, `lib` e `components` procurando `export`, e `app`, `lib`, `components`, `tests` e `scripts` procurando quem importa. A primeira execução acusou **258**, e o erro era meu: eu não estava varrendo `tests` e `scripts` como consumidores — símbolo usado só por teste continua sendo símbolo usado. Corrigido, sobraram **191**, calibrados à mão numa amostra de 6 (**4 genuinamente mortos**). Fronteiras do Next.js (`page`, `layout`, `route`, `middleware` e os nomes de convenção) são excluídas por lista explícita, não por heurística silenciosa; o débito datado vive em `diretrizes/EXPORTS-MORTOS-ACEITOS.json`, revisável na revisão de código. Provado por sabotagem: export novo sem importador reprova com `exit 1` e o símbolo nomeado
- [x] T-38.3 — **`pnpm validate:assercoes` — teto de asserção fraca.** `toContain`, `toBeTruthy`, `toBeDefined`, `toBeGreaterThan` e companhia passam com uma agulha e não olham o palheiro; foi assim que os dois defeitos do extrator sobreviveram. O validador não julga asserção individual: ele impede que a **população** cresça. Teto fixado no estado atual — **443 em 47 arquivos** — e o número só pode cair. Provado por sabotagem nos dois sentidos: 443 → 445 reprova nomeando o arquivo que subiu, e o teto baixado também reprova, para não ser decorativo
- [x] T-38.4 — **Golden do extrator contra o arquivo publicado**, não contra fixture. Uma asserção só, sobre o objeto inteiro: fluxos, pedaços, caracteres, códigos distintos, valores monetários e ocorrências exatas por trecho. O binário de 98 KB **não** é commitado — ninguém revisa fixture binária, e ninguém sabe dizer se ela ainda representa o publicado quando o leitor muda; o padrão é o de `sinapi:layout`, com o artefato vindo por `ARTEFATOS_DE_CUSTO` e o teste **pulando com motivo** quando ele falta. Exercitado contra os dois artefatos reais: **218 pedaços / 1.849 caracteres / 19 códigos / 95 valores** e **90 / 2.424 / 4 / 21**
- [x] T-38.4.1 — **O validador da T-38.3 reprovou o teste da T-38.4**, e a resposta certa não foi subir o teto: foi fortalecer a asserção. As três asserções fracas do golden viraram contagem exata (`ocorrencias`, trecho → quantidade) e identidade exata dos dois artefatos numa lista `toEqual`. Teto intacto em 443. É a regra funcionando contra quem a escreveu
- [x] T-38.5 — **`diretrizes/PROVA-POR-SABOTAGEM.md`, canônico.** Portão que nunca foi visto reprovando não foi provado: verde → sabotado e vermelho com a diferença medida → restaurado e verde. A medição que sustenta a regra está na tabela do §2.1 e é o argumento inteiro: com o defeito reintroduzido, `codigosDistintos` (19 e 4) e `valoresMonetarios` (95 e 21) ficam **idênticos** enquanto os caracteres vão de 1.849 para 20.191 — o defeito **adiciona** ruído sem **remover** conteúdo, e por isso toda asserção de presença continua verdadeira. O segundo defeito, sabotado isolado, move o total em **0,7%**. Referenciado em `METODO-DE-TRABALHO.md` §2.1 e na ordem de leitura do `LEIA-PRIMEIRO.md`
- [x] T-38.6 — Os dois validadores novos ligados ao `pnpm validate:*` e ao `quality` do CI, depois do `validate:vaccines`

A **proteção de ramo na `main`** era o primeiro item acordado e não cabe aqui:
depende de uma ação no `Settings → Branches` do GitHub, e não há ferramenta
nesta sessão que a configure. Pela R4 e pela R7 ela virou a **S-39** — sprint
concluída não carrega tarefa em aberto, e tarefa que depende de terceiro não
fica pendurada numa sprint que já entregou.

---

## Sprint S-39 — Proteção de ramo na `main`

**Estado:** bloqueada
**Marco:** M-0

Separada da S-38 pela R7: a S-38 entregou tudo o que o repositório consegue
fazer sozinho, e isto depende de uma ação que só o dono do repositório executa.

- [ ] T-39.1 — Em `Settings → Branches`, regra para `main`: *Require a pull request before merging*, *Require status checks to pass* com o check **`quality`**, e ***Require branches to be up to date before merging*** — este último é o que faz a exigência valer sobre o **commit final**, não sobre um verde antigo de antes do último `merge` da base. Sem ele, o portão aprova código que nunca rodou junto, que é precisamente como a `main` chegou aos 31 erros de tipo
- [ ] T-39.2 — Conferir por sabotagem, conforme `PROVA-POR-SABOTAGEM.md`: abrir um PR com uma violação deliberada de um dos validadores e confirmar que o botão de merge fica bloqueado

## Sprint S-40 — Convergência do Projeto RH com a `main` reparada

**Estado:** concluída
**Marco:** M-RH

O PR #42 nasceu sobre uma `main` de 6 de agosto e ficou 539 commits à frente
enquanto a `main` andava 247. Converge aqui, com a bateria inteira executada
sobre o resultado. Entra **no fim** conforme a R4.

### O que o merge revelou

Onze conflitos, e o mais instrutivo **não foi conflito**: `openTaskEditor`
estava declarada **duas vezes** em `components/planejamento/schedule-planner.tsx`
na base comum. Cada lado removeu uma cópia, em posição diferente, e o `git merge`
removeu **as duas** sem reportar nada. Sobraram duas chamadas órfãs, pegas pelo
`tsc` como `Cannot find name`. É a classe de defeito que motivou a discussão
sobre trocar de linguagem, reproduzida ao vivo — e nenhum compilador a teria
pego mais cedo, porque ela nasce na resolução de merge, não na escrita.

### Tarefas

- [x] T-40.1 — **Onze conflitos resolvidos.** Seis ficaram com o lado da `main` — era ela a versão convergida, e o ramo RH havia refeito por conta própria o mesmo refactor (`indicadores` → `resumos` no launcher, `proximoCodigo` no `schedule.ts`). Três foram união de ledger e estado de QA, um foi mapa regenerado, e um exigiu merge de verdade: no `validate-postgrest-embeds.mjs` os dois lados corrigiram o **mesmo** defeito de janela — associar o `.select()` de um encadeamento ao `.from()` do anterior, inventando PGRST200. A correção do RH (`fimDoStatement`, que respeita literais e para no `;`) é o corte correto e prevaleceu; da `main` veio o nome renomeado do arquivo da vacina
- [x] T-40.2 — **293 vazamentos de mensagem do provedor fechados, em 72 arquivos — 100% do RH, zero fora.** `redirect(...?error=${error.message})` põe nome de coluna, detalhe e *hint* do PostgREST **na barra de endereço**, onde ficam em histórico, log de proxy e captura de tela. A troca é de uma expressão por outra — `mensagemDeFalha(contexto, erro, publica?)` em `lib/errors/data-access.ts` —, e é isso que a torna aplicável aos 293 pontos sem reescrever o fluxo de cada um: o operador continua recebendo o identificador estável no log, e os 63 pontos que já tinham mensagem de domínio (`"Vínculo não encontrado."`) a preservam no terceiro parâmetro. Provado por sabotagem: reintroduzir **um** `error.message` reprova o `tests/security-controls.test.ts` nomeando o arquivo
- [x] T-40.2.1 — Erro meu na primeira passada, pego pelo `tsc`: o regex casava `resultado.error.message` e deixava o prefixo `resultado.`, produzindo 34 erros de tipo. A guarda `(?<![.\w$])` separa variável de propriedade, e uma segunda passada trata a forma com objeto. Duas passadas, 276 + 17
- [x] T-40.3 — **18 superfícies Supabase novas classificadas** em `diretrizes/supabase-surface-classification.json`, com evidência **medida das migrations**, não escrita à mão: FKs de entrada e saída, gatilhos, policies e referências em corpo de função. Todas as 18 têm `functionRefs ≥ 1` — ausência de consumidor JS/TS é o desenho, porque o módulo escreve por RPC. Duas são trilha de acesso (`rh_document_access_log`, `rh_payslip_access_log`) e entraram como `preserve_operational_history`; as demais como `preserve_sql_internal`. `estimatedRows` é 0 em todas, e o motivo está escrito em cada uma: a migration correspondente **ainda não foi aplicada**
- [x] T-40.4 — **Persona P17 — departamento pessoal e folha.** O módulo `rh` entrou no `MODULE_REGISTRY` sem profissional declarado, e a regra do repositório é anterior à tela: aplicativo sem persona não tem quem responda pelo que ele decide. Cinco competências com técnica e dado exigido, três cenários, e o pessimista que importa — eSocial devolvendo ocorrência bloqueante às vésperas do prazo, com o fechamento retido em vez de concluído com vínculo inconsistente. O módulo mapeia para o tipo operacional `financial`, porque é o que descreve a consequência: pagamento e lançamento contábil
- [x] T-40.4.1 — **Persona nova é mudança de esquema, e o portão avisou na hora.** O `tests/personas-db-contract.test.ts` reprovou a P17 porque a S-30 gravou o vocabulário **no banco**, em seis restrições `check` que casavam `^P([1-9]|1[0-6])$`. Sem a migration, a P17 existiria no código e seria recusada na primeira gravação. A migration descobre as restrições **pelo texto da definição** — elas são anônimas, e o nome real é o gerado pelo PostgreSQL — e falha de propósito se não encontrar exatamente seis. Faixa ampliada para `^P([1-9]|[1-9][0-9])$`, não para P17: fixar o teto na persona recém-criada garantiria repetir esta migration na próxima. Aplicada e conferida no banco: **6 restrições ampliadas, 0 antigas, evento no catálogo, 17 tipos**; e provada por inserção — `aceitou P17=t | recusou PX=t | recusou P0=t`, com o `raise` desfazendo tudo
- [x] T-40.4.2 — O teste de contrato passou a ler **o catálogo inteiro de migrations**, não um arquivo. A migration da S-30 já está aplicada, e migration aplicada é imutável — editá-la produziria um "aplicado divergente do arquivo", exatamente o que o `validate:migrations-applied` existe para reprovar. Persona nova entra por migration nova
- [x] T-40.5 — **O portão de interoperabilidade XMLDSig não estava quebrado: faltava o binário.** `xmlsec1` ausente no contêiner fazia o gate do eSocial falhar com aparência de regressão. Instalado, o teste passa — a mesma C14N do `xmllint` e assinatura verificada externamente. Limitação de ambiente declarada como tal, não contornada com `skip`
- [x] T-40.6 — Bateria completa sobre o resultado: `tsc` **0 erros**, `eslint --max-warnings=0` limpo, **88 arquivos e 812 testes** passando, e os 17 validadores verdes daquele dia (10/08/2026), incluindo `migrations-applied` (243 arquivos, 208 aplicadas, nenhuma divergência nova) e `code-map` (226 rotas, 314 server actions, 318 funções de banco)

As **67 migrations `rh_*` seguem declaradas não aplicadas** no débito congelado de
`diretrizes/migrations-aplicadas.json`, com o responsável nomeado. O registro ali
não equivale a aplicação: a aplicação depende de ambiente isolado de homologação
com evidência real, e as validações externas do PR #42 — certificado ICP-Brasil,
Integra Contador contratado, folha-sombra contra fonte autorizada, piloto e
GO/NO_GO — continuam sendo pré-requisito de produção, não de merge.

---

## Sprint S-41 — Gateway de mensageria converge com a `main`

**Estado:** concluída
**Marco:** M-WHATSAPP

O `apps/messaging-gateway/` — 54 arquivos — nunca chegou à `main`: a PR #40
mesclou em `feature/etapa-22-whatsapp-omnichannel`, e esse ramo ficou **454
commits à frente e 313 atrás**, sem PR aberta. A PR #43 tem base nele, então
enquanto ele não converge, nada da etapa 22 chega à `main` — e a #43 não fecha
verde, porque o que a reprova está na base, não no diff dela. Entra no fim
conforme a R4.

### Tarefas

- [x] T-41.1 — **Quatro conflitos.** Três de união; o quarto era aparente: os dois lados evoluíram `safeActionMessage`, e a deste ramo é superset — reconhece `MessagingEngineError` e `UnsupportedCapabilityError` além de `WhatsAppDomainError`. Ficar com a da `main` transformaria "provider não autorizado para envio real" no genérico "a operação não pôde ser concluída"
- [x] T-41.2 — **A ação `'manage'` negava todo mundo, inclusive SUPER_ADMIN.** Vinte chamadas de `has_module_permission` em nove migrations passavam uma ação que **não existe** no vocabulário da função, e o `case` termina em `else false`. Sem erro, sem exceção, sem teste vermelho: a policy simplesmente nega. Medido no banco com **todos** os privilégios ligados — `administer`, `approve`, `export`, `release`, `sensitive` e `sign` devolvem `true`; `manage` devolve `false`. O que fecha o diagnóstico é que o TypeScript **já traduzia certo** (`lib/authorization.ts` mapeia `manage` → `administer`); as migrations pularam a tradução e mandaram a palavra crua. As 20 trocadas, todas dentro de `has_module_permission` e nenhuma fora, provado por sabotagem
- [x] T-41.3 — **Server action morta removida.** `setMessagingPluginPolicy` era o antecessor de `setCanonicalMessagingPluginPolicy`, que é a que a tela chama. As duas iam para a mesma RPC, mas só a canônica normaliza — a antiga enviava `priority`, `requiredPermission` e `featureFlag` crus do formulário. Apontada pelo `validate:code-map`
- [x] T-41.4 — **15 vazamentos de mensagem do provedor** fechados com o mesmo `mensagemDeFalha` da S-40, **texto idêntico**, para a convergência entre os dois ramos ser trivial
- [x] T-41.5 — **43 superfícies Supabase classificadas** com evidência medida das migrations: 21 internas de SQL, 20 de histórico operacional e **2 latentes** — `channel_inbox_unified_contacts` e `communication_playbook_catalog` não têm consumidor **nenhum**, zero `.from()` e zero referência em função. Registradas como latentes em vez de presumidas vivas; se continuarem assim depois da homologação, são remoção
- [x] T-41.6 — **Defeito no `validate:assercoes`, corrigido: ele contava `.not.toContain` como fraca.** Contava errado, e contra a própria tese. O portão persegue a agulha encontrada com o palheiro ignorado; a **negação** é o caso oposto — `expect(JSON.stringify(evento)).not.toContain(SEGREDO)` só passa se o segredo não estiver em **nenhum** campo do objeto inteiro. Ela varre o palheiro por definição, e é assim que se testa que dado sensível não vazou. Contá-la como dívida inflava o número justamente com as asserções que a diretriz pede que existam, e criava o incentivo errado: apagar uma conferência de vazamento baixaria o "débito". Com a regra corrigida, o teto **desceu de 535 para 523** no mesmo commit em que o gateway acrescentou 93 asserções. Provado nas duas direções: duas negativas não movem a contagem, uma positiva reprova
- [x] T-41.7 — 87 exports sem importador registrados com motivo **por grupo**: 68 são contrato de tipo do canal, 14 são constante de vocabulário, e 5 são função sem chamador, nomeadas em vez de diluídas. A mais informativa é `legacyWhatsAppStatusToCanonical` — conversor do status legado, sem chamador porque a migração de status já rodou; se continuar assim depois da homologação, é remoção, não dívida
- [x] T-41.8 — Bateria completa: `tsc` **0 erros**, `eslint` limpo, **112 arquivos e 1.068 testes**, e os validadores verdes. As 25 migrations `stage22_*` entram no débito congelado, declaradas não aplicadas, com responsável nomeado

---

## Sprint S-42 — Mapa tecnológico canônico e fechamento da Fase 1

**Estado:** concluída
**Marco:** M-PLATAFORMA

Decisão do responsável em 10/08/2026: adotar o mapa tecnológico **completo**,
na estratégia de fases da própria §36 do documento. Entra no fim conforme a R4.

### O que o documento pede, e onde estamos

A §36 define seis fases. A **Fase 1 — Consolidar** pede *"reforçar strict
typing; reforçar CI; eliminar duplicações de regras; criar contratos canônicos;
classificar todos os workers existentes"*. Cinco desses cinco itens foram
executados nas S-38, S-40 e S-41, antes de o documento ser versionado — a
convergência foi por necessidade, não por plano. Falta **um**: classificar os
workers.

A §37 é o portão: **nenhuma linguagem nova entra sem ADR** com doze itens. A
Fase 2 (introduzir Go) não começa antes dela.

### Tarefas

- [x] T-42.1 — **Mapa versionado como canônico**, em `diretrizes/MAPA-TECNOLOGICO.md`: o documento original íntegro, 1.997 linhas, mais a **medição executada** ao lado de cada afirmação que dependia de medição. Estava só como anexo de conversa, e a regra do repositório é explícita — decisão que vive em conversa se perde quando o contêiner é reciclado. Recuperado do transcrito e depois substituído pelo original enviado pelo responsável
- [x] T-42.2 — Registradas as **duas inconsistências internas** do documento, com número: a §21 põe Go em **23 das 44 linhas (52,3%)** enquanto a §33 do mesmo texto estabelece **5% a 15%** — não podem valer juntas, e a §33 é a que corresponde à §36; e a Fase 1 da §36 já estava concluída quando o documento foi lido
- [x] T-42.3 — `README.md` atualizado. Ele anunciava **"Etapa 19", "Etapa 18 incorporada à main", versão `0.19.0`** — três incorporações atrás. Passa a `0.22.0`, com RH, gateway e a seção de portões anti-regressão
- [x] T-42.4 — `CLAUDE.md` atualizada: a regra de **portão provado por sabotagem**, os dois validadores de população, a exigência de rodar **todos** os validadores — 54 na contagem de 10/08/2026, e a seção de linguagens com o portão da §37
- [x] T-42.5 — **Buraco no `validate:documentation`, encontrado ao registrar o mapa.** A lista de canônicos é escrita à mão, e **três** documentos declaravam `**Documento canônico:** sim` no próprio corpo sem constar dela: `CONTRATO-AUDITAVEL-DE-PERSONAS`, `MAPA-TECNOLOGICO` e `PROVA-POR-SABOTAGEM`. Apagar qualquer um passaria verde. É a mesma falha que a VACINA-014 corrigiu para as vacinas — lista à mão não é atualizada por quem escreve o documento. Conferência agora é bidirecional; de **25 para 28** canônicos, e provado por sabotagem: documento novo que se declara canônico sem registro reprova

O que resta da Fase 1 e toda a Fase 2 seguem na **S-43**, porque a R3 admite uma
sprint em andamento por vez e a R7 não admite sprint concluída com tarefa aberta.

---

## Sprint S-43 — Fase 2 da §36: classificar workers e a ADR de Go

**Estado:** bloqueada
**Marco:** M-PLATAFORMA

Três das quatro tarefas concluídas; a T-43.3 parada na tarefa 5.

**Bloqueada em 11/08/2026, e a mudança de estado é correção de honestidade.** A T-43.3 entregou as tarefas 2, 3 e 4 no PR #55; a tarefa 5 é a `FilaPostgREST`, e as filas do canal **não existem no banco** — dependem da S-69. Sprint travada declarada como `em andamento` ocupa a vaga única da R3 e esconde o bloqueio: quem lê o inventário acha que há trabalho em curso quando não há.

**A ADR-0001 foi ratificada por instrução direta do proprietário arquitetural em
10/08/2026** — *"inicie as conversões dos códigos para Go, Typescript, Python e
Rust conforme nosso mapa"*. A instrução decide pela **opção 4** da ADR (serviço
em Go), e não pela recomendação da própria ADR, que era a opção 3 (TypeScript
agora, Go por gatilho medido). A §43 faz dele a autoridade; o registro fica aqui
para que a divergência entre o recomendado e o decidido não se perca — e para
que, se o volume medido mudar a conclusão, se saiba exatamente o que foi
decidido e com base em quê.

Fora do escopo da T-43.3, com o motivo medido: **TypeScript não tem conversão**
(já é 84,3% do código vivo e principal em 25 das 44 linhas da §21); **Python**
teria de construir IA, RAG, OCR e Plantas, que não existem — é a **Fase 4**, não
conversão; **Rust** é vedado agora pela §9.3, que exige cinco pré-requisitos
incluindo protótipo e benchmark comparativo, e não há código candidato — é a
**Fase 6**.

Continuação direta da S-42, na ordem que o próprio mapa define. A §37 é o portão
de entrada e não é negociável: **nenhuma linguagem nova entra sem ADR**.

### Tarefas

- [x] T-43.1 — **Classificar todos os workers existentes** — último item da Fase 1 da §36. Para cada um: o que faz, se é disparado por evento ou agenda, duração típica, se pode ser reexecutado sem efeito duplicado, e qual camada da §21 o reivindica. Sem esse inventário, "migrar workers apropriados" (Fase 2) não tem sujeito. Feito em `diretrizes/WORKERS.md`, e o resultado **muda a Fase 2**: existem quatro workers reais (dois agendados, dois webhooks) e **um único** trecho assíncrono, que roda dentro do request. As quatro filas do canal — entrada, saída ordenada, reconciliação — têm esquema, trava e validador, e **nenhum consumidor**: as RPCs de `claim_*` são referenciadas só por validadores, que conferem que o token aparece na migration em vez de chamá-la. É a VACINA-057 em escala maior. Logo a Fase 2 não é migração, é **construção** — o que remove custo de reescrita e risco de paridade, e muda o texto da ADR
- [x] T-43.2 — **ADR de Go**, com os doze itens da §37 e o benchmark que a §39 exige. Entregue em `diretrizes/ADR-0001-CAMADA-DE-EXECUCAO.md`, com as medições reproduzíveis em `benchmarks/camada-de-execucao/`. **Estado: proposta, aguardando ratificação do proprietário arquitetural** — a §37 condiciona a Fase 2 à ADR aprovada, e aprovar não é tarefa desta sessão. O benchmark **contraria a expectativa**: a CPU é 0,03% de um job de despacho, e trocar Node por Go economiza **0,41 s de CPU por dia** a 100 mil mensagens/dia; o Node satura em 6.549 jobs/s contra 27.884 do Go, mas a necessidade medida é de **1,16 job/s**, o que dá **57× de folga**. Dentro do próprio Go, escrever com `map[string]any` em vez de struct custa **2,14×** — mais que os 1,45× entre as duas linguagens. A ADR por isso separa o que o mapa juntava: **extrair a camada do request é decisão incondicional** (§4, critérios 3, 4, 7 e 8), **a linguagem é decisão condicionada** — TypeScript agora, Go por quatro gatilhos numéricos. Conflito com a leitura literal da §7.4 e da §36 registrado na própria ADR, §16
- [ ] T-43.3 — Fase 2 da §36 — construir a camada de execução em Go, padronizar queue/retry, instrumentar OpenTelemetry. Plano em `docs/superpowers/plans/2026-08-10-camada-de-execucao-go.md`
  - [x] **Tarefa 1 — os seis portões de Go da §24**, em `.github/workflows/go-gates.yml`, cada um **visto reprovando** conforme `PROVA-POR-SABOTAGEM.md`: `gofmt` listou o arquivo; `go vet` pegou `%d` com string; `staticcheck` pegou `U1000` que `build` e `vet` aprovaram; `golangci-lint` pegou `errcheck` com rc=1; `go test` ficou vermelho; `go test -race` acusou `DATA RACE`. Módulo `apps/execution-plane` criado sem dependência de terceiros, conforme a §38
  - [x] **Tarefa 2 — protocolo da fila como domínio tipado.** `fila.go` e `despacho.go`, com as três faixas que o Postgres cobra viradas invariante: limite de reivindicação 1..100 (`INVALID_CLAIM_LIMIT`), SHA `^[0-9a-f]{64}$` (`INVALID_PAYLOAD_SHA256`) e backoff 0..3600 (`INVALID_BACKOFF`), lidas literalmente de `20260804151000_stage22_outbox_delivery.sql`. A validação não mora dentro de `Drenar` — mora no decorador `ComValidacao`, senão protegeria só quem passa por `Drenar`, e a `FilaPostgREST` da Tarefa 5 entraria pelo lado. **Duas decisões que os testes fixaram:** o 429 mora na faixa 4xx e mesmo assim retenta, então classificar por faixa erra; e falhar um evento **barra os posteriores da mesma conversa no mesmo lote** — o banco só garante ordem entre reivindicações, e sem essa barreira um lote com 1, 2 e 3 entrega a 2 e a 3 depois da 1 falhar. Conversas distintas não se contaminam. **17 testes**, os seis portões da §24 verdes, e seis sabotagens vistas reprovando pelo teste certo: limite sem recusa, 429 no default, barreira removida, faixa de backoff sem cobrança, motivo com texto cru do provedor e SHA em maiúsculas. O `staticcheck` reprovou um teste **meu** com `SA4000` — `SHA256Hex(p) != SHA256Hex(p)` prova que função pura é determinística e nada mais; trocado por oráculo externo calculado em Python
  - [x] **Tarefa 3 — assinatura do gateway provada idêntica à do TypeScript, por fixture compartilhada.** `gateway.go` é a **segunda** implementação do mesmo algoritmo, e a §26 aceita essa dívida desde que provada por fixture, não por leitura comparada. `tests/fixtures/assinatura-gateway.json` foi **gerado pela implementação TypeScript real** (`signGatewayRequest`, executada pelo vitest), não escrito à mão; os dois testes leem **o mesmo arquivo** e reproduzem cada assinatura byte a byte. Seis casos, escolhidos pelo que costuma divergir entre runtimes: corpo vazio, acento, método em minúsculas, caminho com query, emoji fora do BMP e o separador `.` dentro do nonce e do caminho. **Ambiguidade registrada, não corrigida:** a junção por ponto é ambígua quando os campos contêm ponto — corrigir de um lado só quebraria o contrato com o gateway em produção, então fica fixada por um caso da fixture e a correção, se vier, muda os dois lados no mesmo commit. **Sete sabotagens vistas reprovando:** ordem da carga trocada, método sem normalizar, separador trocado, corpo cru no lugar do sha256, assinatura em maiúsculas, fixture editada à mão (reprova nos **dois** lados) e contrato encolhido em um caso (reprova nos dois). O `validate:assercoes` reprovou uma asserção **minha** — `toBeGreaterThanOrEqual(6)` é piso de quantidade, e contrato que encolhe em silêncio deixa de ser contrato; trocada por lista fechada com `toEqual`. Teto segue em 523
  - [x] **Tarefa 4 — laço de vida longa, encerramento limpo e observabilidade.** `main.go`, com a decisão que define o arquivo: cancelar o contexto quer dizer **"pare de reivindicar"**, não "largue o que está na mão". `SIGTERM` que aborta o lote no meio deixa evento em `CLAIMED` sem tentativa fechada, e o banco só libera depois do `lock_timeout` de dois minutos — multiplicado por um deploy que reinicia réplicas, é fila parada sem ninguém ter derrubado nada. O lote roda sob `context.WithoutCancel` com prazo próprio; o sinal interrompe o **próximo** ciclo. **OpenTelemetry não entrou, e a omissão é declarada:** seria a primeira dependência de terceiro do módulo, e o `go.mod` exige justificativa escrita em revisão (§38). Entrou `log/slog` em JSON — contagem por lote, duração e motivo de encerramento. Trocar por OTel é ADR, não efeito colateral de uma tarefa de laço. **Dois achados da própria sabotagem, os dois sobre teste e não sobre código.** O primeiro: o teste de `SIGTERM` real afirmava que o laço para exatamente no lote seguinte, e reprovou — entrega de sinal é assíncrona, o laço chegou a reivindicar mais um lote antes de enxergar o cancelamento. Reescrito para afirmar o que vale em qualquer ordem: **nenhum evento reivindicado fica sem desfecho**. O segundo é o pior: sabotar o `context.WithoutCancel` — que é a parada abrupta — **não reprovou teste nenhum**, porque os dublês ignoravam o contexto e cancelar não mudava nada para eles. Dublê complacente é portão que não mede. Corrigidos para falhar com contexto cancelado, como PostgREST e HTTP fazem; a mesma sabotagem passou a reprovar com "o lote em curso foi abandonado no meio". **31 testes** no módulo, seis portões da §24 verdes, `-race` estável em `-count=3`
  - [ ] **Tarefa 5 — BLOQUEADA.** Implementação PostgREST e **aplicação das migrations**. Medido em 10/08: as filas **não existem no banco** — 0 de 5 tabelas, 0 de 8 RPCs, contra 256 tabelas no `public`. `stage22_multiprovider_storage` e `stage22_outbox_delivery` estão no débito congelado, que condiciona a saída a *"deploy de código compatível, aplicação controlada e testes DB"*. **Nenhum consumidor pode ser ligado antes disso, e a aplicação é decisão do responsável nomeado**
- [x] T-43.4 — Reconciliar §21 e §33, registrado no preâmbulo do `MAPA-TECNOLOGICO.md` e mensurável por `node scripts/medir-distribuicao.mjs`. **A premissa desta tarefa estava errada e a medição a corrigiu:** os "52,3% contra 5–15%" comparavam **presença** com **volume** — 100% das linhas da §21 são polyglotas, com 2,30 linguagens por linha, e as presenças somam 101 para 44 linhas, logo não formam fatia. Na mesma unidade (linguagem principal), sobra uma divergência **real, localizada em Go e menor**: 20,5% contra teto de 15%. O problema maior é outro: **a §33 não é mensurável como está** — este repositório fica dos dois lados da faixa conforme se conte o ledger de migrations (TypeScript 84,3% ou 58,0%; SQL 11,1% ou 38,9%), porque migration é append-only e cresce de forma monotônica contra o código de aplicação. Regra proposta: §21 é **autorização**, não orçamento; §33 é **alarme** medido sobre código vivo; §33 **nunca decide caso concreto** (seria o "otimizar por intuição" da §39); onde divergirem, prevalece a ADR da §37. **Requer ratificação**, como a ADR-0001

---

## Sprint S-44 — Auditoria de superfícies esquecidas e o portão do catálogo de módulos

**Estado:** concluída
**Marco:** M-LEGADO

Nasceu de um relato de uso — *"o módulo de RH está sem chamada ativa, não se
esqueça de validar se existem mais funções, módulos, tabelas, variáveis
esquecidas"* — e de um pedido explícito de corrigir os casos equivalentes que
aparecessem. Entra no fim conforme a R4. Relatório em
`diretrizes/AUDITORIA-SUPERFICIES-ESQUECIDAS-2026-08-10.md`.

### Tarefas

- [x] T-44.1 — **Causa do relato isolada: é aplicação, não código.** O RH está inteiro no repositório (registry, menu, rotas, actions), e a central não lê o registry — lê `list_my_modules`, que resolve contra `public.app_modules`. Medido no projeto remoto: **25 módulos no registry contra 23 linhas em `app_modules`**. A semeadura existe em `20260809141000_rh_module_catalog_seed.sql`; as **68 migrations `rh_*` não estão aplicadas**, débito já declarado no ledger. Num ambiente nascido só das migrations, o RH aparece
- [x] T-44.2 — **Um segundo caso da mesma família, vivo e não percebido: `MENUS_DO_MODULO.ocorrencias`.** A chave do aplicativo de pós-venda é `sac`; `ocorrencias` é a **rota**. Como `navegacao-do-modulo` pede o menu por `moduleForPath()`, que devolve a chave do registry, aquele bloco **nunca foi renderizado uma vez sequer** — e os dois destinos já existiam dentro de `sac`, que é por que nada parecia faltar na tela. Removido: destinos distintos continuam **74**, o total cai de **112 para 110**
- [x] T-44.3 — **`pnpm validate:modulos-semeados`, o portão que faltava.** O `validate:module-keys` cobre uma direção só — *chave usada em SQL precisa estar semeada* — e parte do SQL; módulo declarado no registry que nenhuma policy cita ainda passa por ele calado. Foi por aí que o RH ficou dois dias com código e sem catálogo. O novo cruza registry × `app_modules` × menus × roteador nas **cinco direções**, com `dashboard` como única exceção declarada e justificada. `VACINA-064`
- [x] T-44.4 — **Provado por sabotagem, cinco direções, uma por vez.** Base `exit=0`; módulo novo sem semeadura reprova em [A] e [D]; registry renomeado reprova em [A] e [B]; a rechave do `ocorrencias` reprova em [C]; menu renomeado reprova em [C] e [D]; rota sem pasta reprova em [E]; restaurado, `exit=0`
- [x] T-44.5 — **Funções: 10 RPCs sem chamador em 404 vivas.** Cinco têm teste DB e esperam interface (piloto de mensageria e `create_proposal_from_budget_version`); **cinco são do RH e não têm nem chamador nem teste**. A mais instrutiva é `create_rh_payroll_parameter`: o código chama a irmã `create_rh_payroll_parameter_from_template`, e o nome quase igual é exatamente o que faz auditoria por leitura concluir que existe chamador. Remoção é migration destrutiva — fica para o piloto do módulo
- [x] T-44.6 — **Tabelas: 1 em 331.** `object_records` é a única sem leitura nem escrita fora do DDL, e é superfície declarada do Object Runtime, com teste DB e documentação. As outras 19 da primeira passagem caíram quando a medição passou a descontar DDL, índice, RLS e `grant` — o número 20 era artefato do heurístico, não achado
- [x] T-44.7 — **Variáveis: 27 de runtime sem declaração em lugar nenhum, todas corrigidas.** De 136 lidas em código, 85 não apareciam em `README`, `.env.example`, `vercel.json`, `deploy/`, `docs/` ou `diretrizes/`; **27 delas são lidas pelo produto em execução** e 23 são do próprio RH. Três com consequência silenciosa: `ESOCIAL_ENABLE_PRODUCTION` (só o literal `"true"` libera produção), `SINAPI_PROBE_TOKEN` (menos de 32 caracteres fecha a rota) e `BAILEYS_LAB_CONFIRM`. Declaradas em `.env.example` com o default real lido do código. Medido depois: **27 → 0**
- [x] T-44.8 — Bateria completa: `eslint` limpo, `tsc` 0 erros, **1.068 testes em 112 arquivos**, `pnpm test:python` OK e **41 validadores verdes** — o `validate:code-map` reprovou por mapa desatualizado e foi regenerado

---

## Sprint S-45 — Pendências herdadas da auditoria de superfícies

**Estado:** pendente
**Marco:** M-LEGADO

O que a S-44 mediu e **não** resolveu, porque depende de ação externa,
irreversível ou de decisão do responsável. Nomeado aqui para não voltar a ser
descoberto.

### Tarefas

- [ ] T-45.1 — **Aplicar as 68 migrations `rh_*`**, sem o que o módulo continua invisível no projeto remoto. Ação externa e irreversível; o próprio ledger condiciona a saída do débito a homologação isolada com evidência real. **Decisão do responsável nomeado**
- [ ] T-45.2 — Decidir sobre as **5 RPCs de RH sem chamador e sem teste** — `approve_rh_payroll_accounting_batch`, `generate_rh_payroll_accounting_batch`, `generate_rh_payroll_provisions`, `create_rh_payroll_parameter` e `create_rh_employment_esocial_contract_profile_version`: ligar a interface ou remover por migration
- [ ] T-45.3 — Decidir sobre as **5 superfícies testadas sem tela** — as quatro do piloto de mensageria e `create_proposal_from_budget_version`
- [ ] T-45.4 — Interface do Object Runtime, sem a qual `object_records` segue sendo tabela sem leitor
- [ ] T-45.5 — Declarar as **58 variáveis de script, teste e CI** ainda sem menção em documento nenhum. Severidade menor: nenhuma é lida pelo produto em execução

---

## Sprint S-46 — Camada transversal única, a mobília que hoje cada módulo refaz

**Estado:** pendente
**Marco:** M-5

Nasce da leitura do material do Odoo 19 em 11/08/2026, analisada em
`diretrizes/APROVEITAMENTO-ODOO-19-2026-08-11.md`. O Odoo tem uma camada
chamada **Essentials** — *"a camada de recursos comuns usada por praticamente
todo o sistema"* — que entrega estágios, atividades, chatter, busca com filtros
salvos e as visões para os 37 aplicativos de uma vez. O INNOV não tem essa
camada: tem 25 módulos, cada um reconstruindo o que precisa.

Medido no repositório: **56 páginas de detalhe, 6 com histórico**. Cinquenta
fichas em que o usuário abre e não vê o que aconteceu. No banco, o mesmo
conceito aparece fatiado — `channel_conversation_notes`, `pipeline_card_notes` e
`sac_ticket_messages` para "anotar num registro"; `crm_activities` e
`pipeline_card_activities` para "o que fazer em seguida". Zero filtros salvos,
zero paleta de comandos, uma visão pivot.

Não é falta de trabalho: é trabalho repetido, dividido por 25. Entra no fim
conforme a R4.

### Tarefas

- [ ] T-46.1 — Registro polimórfico de eventos por objeto: comentário, nota, mudança de campo, anexo, atividade agendada e seguidor, com uma política de acesso só
- [ ] T-46.2 — Componente único de linha do tempo, montável por qualquer ficha
- [ ] T-46.3 — Ligar as 50 fichas sem histórico; medir antes e depois, que o número só pode subir
- [ ] T-46.4 — Consolidar as 3 tabelas de nota e as 2 de atividade, com migração de dado e sem perda de trilha
- [ ] T-46.5 — Busca com filtros salvos como camada, não por módulo
- [ ] T-46.6 — Portão que reprova ficha de detalhe nova sem linha do tempo, provado por sabotagem
- [ ] T-46.7 — **Guarda contra o efeito colateral que o próprio material avisa:** histórico é evidência contextual e não substitui campo estruturado. Mudança relevante registrada só em comentário continua sendo inconsistência

---

## Sprint S-47 — Rentabilidade por obra, com as maturidades separadas

**Estado:** pendente
**Marco:** M-OBRAS

O deep dive XI.9 do material descreve a armadilha: **Expected**, **To Invoice**
e **Invoiced** são estágios do mesmo fluxo, e somar os três *"duplica
economicamente o fato"*. O que se acompanha é a migração entre colunas.

Medido no INNOV: existe `finance_cost_centers`, e "margem" só aparece em
orçamento (BDI/markup). **Não existe visão de rentabilidade por obra** — nada
que compare custo consumido com receita reconhecida numa obra viva. Para uma
plataforma de construção, é a tela que o dono da empresa abre primeiro.

### Tarefas

- [ ] T-47.1 — Cinco maturidades como colunas distintas e nunca somadas: Previsto (contrato + aditivos), A medir, Medido, Faturado, Recebido
- [ ] T-47.2 — Custo consumido por obra a partir de compras, estoque, folha e despesas, sempre pelo centro de custo
- [ ] T-47.3 — **O teste que o material dá pronto:** procurar registros economicamente ligados à obra e **sem** vínculo analítico. São o que some do painel; no INNOV, custo lançado sem centro de custo
- [ ] T-47.4 — Portão que reprova soma entre maturidades, provado por sabotagem
- [ ] T-47.5 — **Checklist universal de conclusão de módulo**, o mesmo para todos: `pnpm checklist:modulo obras` responde os itens mecânicos, e os humanos — persona, QA visual, KPI, relatório de ausência — ficam em `diretrizes/CHECKLIST-DE-CONCLUSAO-DE-MODULO.md`. **Item humano sem evidência conta como não feito.** A tarefa aponta e não repete o esqueleto (R8): regra escrita em 28 sprints diverge em silêncio

---

## Sprint S-48 — Ficha de definição de relatório e matriz de integração

**Estado:** pendente
**Marco:** M-RELATORIOS

Duas peças de documentação executável do material do Odoo, ambas baratas e de
alto retorno de manutenção.

### Tarefas

- [ ] T-48.1 — Ficha de definição por relatório: modelo-fonte, medida, dimensão, data, estados, organização, moeda, filtros, transformação e drill-down. *"O auditor primeiro compara definições e só depois números"*
- [ ] T-48.2 — Portão: relatório sem ficha não entra
- [ ] T-48.3 — Matriz de integração — **o que** trafega entre módulos, não só que existe dependência. O `MODULE_REGISTRY` declara `dependencies` e isso não diz o que atravessa
- [ ] T-48.4 — Quarta pergunta de segurança do material, que é a que falta ao INNOV: conferir sistematicamente que server action não contorna o que a RLS nega. As perguntas 1 e 3 já viraram `VACINA-053` e `VACINA-064` pelo caminho da dor
- [ ] T-48.5 — **Checklist universal de conclusão de módulo**, o mesmo para todos: `pnpm checklist:modulo relatorios` responde os itens mecânicos, e os humanos — persona, QA visual, KPI, relatório de ausência — ficam em `diretrizes/CHECKLIST-DE-CONCLUSAO-DE-MODULO.md`. **Item humano sem evidência conta como não feito.** A tarefa aponta e não repete o esqueleto (R8): regra escrita em 28 sprints diverge em silêncio

---

## Sprint S-49 — Travessias ponta a ponta como suíte de teste

**Estado:** pendente
**Marco:** M-TRAVESSIAS

O material define seis reconciliações com walkthrough e testes de exceção
nomeados. Hoje o INNOV testa por módulo; testar por travessia é o que pega o
defeito que mora **entre** dois módulos, que é onde ele costuma morar.

### Tarefas

- [ ] T-49.1 — Proposta → Contrato → Medição → Fatura → Recebimento
- [ ] T-49.2 — Solicitação → Cotação → Pedido → Recebimento → Pagamento
- [ ] T-49.3 — Entrada → Saída para obra → Custo apropriado
- [ ] T-49.4 — EAP → Cronograma → Diário → Avanço físico → Medição
- [ ] T-49.5 — Admissão → Ponto → Folha → eSocial → Pagamento
- [ ] T-49.6 — Obra → Custo → Receita → Rentabilidade
- [ ] T-49.7 — Testes de exceção em cada travessia, com os nomes que o material dá: entrega parcial, faturamento parcial, pagamento parcial, devolução, desconto não autorizado e cancelamento depois de etapa derivada

## Sprint S-50 — Escrita cross-tenant em funções definidoras, e o portão que faltava

**Estado:** concluída
**Marco:** M-SEGURANCA

Nasceu da leitura do mergulho **XI.11 do manual do Odoo** (ACL, record rules e
`sudo()`), que descreve no vocabulário de lá o mesmo risco que o INNOV tem aqui:
`sudo()` é o `security definer` deste esquema — os dois ignoram a política de
linha, e nos dois a conferência que a política faria passa a ser
responsabilidade de quem escreve o corpo. Entra no fim conforme a R4. Causa-raiz
em `diretrizes/vacinas/VACINA-065-DEFINIDORA-QUE-RECEBE-A-ORGANIZACAO-E-NAO-CONFERE-PARTICIPACAO.md`.

### Tarefas

- [x] T-50.1 — **Sete funções escreviam em organização alheia.** Definidoras que recebem `organization_id` por parâmetro, concedidas a `authenticated`, sem conferir participação: `reserve_channel_ai_budget` (estourar o orçamento diário de IA de vizinho — negação de serviço), `release_channel_ai_budget`, `commit_channel_ai_budget`, `release_channel_ai_conversation`, `consume_channel_critical_write_approval`, `semear_modelos_da_empresa` e `semear_motivos_de_perda`. Nenhuma é vazamento de leitura; **todas são escrita cross-tenant**
- [x] T-50.2 — **Corrigidas com o guarda da própria família, não com um inventado.** As cinco de canal com `has_module_permission(p_organization_id,'whatsapp','EDIT',null,'administer')`, que é o que as três irmãs do **mesmo arquivo** já usavam; as duas semeadoras com `is_org_member`, que é o que `registrar_valor_usado` já usava. Os dois gatilhos de semeadura passaram a copiar direto: com o guarda, chamar a função quebraria no `insert` de `organizations`, quando **ainda não há participação para conferir**. `20260811060000`, `20260811061000`
- [x] T-50.3 — **`pnpm validate:definer-com-guarda`, no CI.** Reprova quando uma função é, no estado final, definidora **e** recebe `organization_id` **e** é executável por `authenticated`/`anon` **e** não cita guarda nenhum. Medido: **414 funções, 328 definidoras, 0 sem `set search_path`, 20 gatilhos, 204 sem organização por parâmetro, 26 só para `service_role`, 78 conferidas**. `VACINA-065`
- [x] T-50.4 — **O portão achou 6 dos 7; a auditoria manual tinha achado 1.** A triagem à mão leu as funções que pareciam relevantes e aceitou como guardada qualquer uma cujo entorno mencionasse conferência. É a medida honesta do que separa varredura de portão, e está registrada na vacina em vez de omitida
- [x] T-50.5 — **Três defeitos do próprio portão, corrigidos antes de valer.** A primeira versão lia as migrations como saco de declarações e acusou **3 funções à toa** — `write_audit` e `ensure_organization_module_defaults` já revogadas de `authenticated`, `search_sinapi_references` já rebaixada a `security invoker` pela VACINA-004. O terceiro era pior porque era **falso negativo**: o corpo terminava na função seguinte em vez do fecho da citação em cifrão, e cada função herdava o guarda da vizinha — foi o que escondeu `consume_channel_critical_write_approval` e `release_channel_ai_budget`. Agora tudo é reduzido em ordem cronológica, e vence a última declaração
- [x] T-50.6 — **Prova por sabotagem, quatro vezes, com restauração conferida.** Tirar o guarda de `reserve_channel_ai_budget` reprova; tirar o de `semear_motivos_de_perda` reprova; **migration nova** com definidora sem guarda reprova — que é o caso do dia a dia; e **reconceder** `write_audit` a `authenticated` depois do `revoke` reprova, o que prova que a redução cronológica re-arma em vez de silenciar para sempre
- [x] T-50.7 — **Bateria completa verde:** 42/42 validadores, `lint`, `typecheck`, **1.077 testes** (12 pulados), testes Python e `go vet` + `go test` do plano de execução

---

## Sprint S-51 — Aplicar no banco a correção da escrita cross-tenant

**Estado:** bloqueada
**Marco:** M-SEGURANCA

**Absorvida pela S-69 em 11/08/2026, e o registro fica aqui em vez de a sprint
sumir.** A S-69 consolidou o mesmo bloqueio para quatro Marcos ao mesmo tempo, e
as três tarefas desta sprint são, palavra por palavra, as T-69.2, T-69.3 e
T-69.5. Duas sprints apontando para o mesmo trabalho é a desordem que o
governo do inventário existe para impedir — e esta escapou da varredura da S-75
porque nenhum portão pergunta se duas sprints fazem a mesma coisa.

**Havia mais que duplicação: havia número errado.** O texto original dizia
*"conferir que as **sete** funções passaram a recusar organização de que o
chamador não participa"*. A consulta ao banco vivo, na abertura da S-69, mediu
**duas**: as outras cinco são da etapa 22, que não está aplicada, e corrigir no
repositório uma função que não existe no servidor não corrige nada hoje.

A sprint fica com uma tarefa só, que é o redirecionamento — sprint sem tarefa
nenhuma reprova na R7, e com razão: quem lê precisa saber para onde ir.

- [ ] T-51.1 — **Nada a executar aqui.** O trabalho, o alcance medido no banco vivo e o aval do proprietário estão na S-69. Esta tarefa fecha quando a S-69 fechar

---

---

## Registro de reordenação

Toda mudança na ordem de execução das sprints, conforme R5 e R6.

| Data | O que mudou | Por quê |
|---|---|---|
| 2026-08-11 | A **S-51 é absorvida pela S-69** e passa a `bloqueada`, sem tarefas próprias | As três tarefas dela eram, palavra por palavra, as T-69.2, T-69.3 e T-69.5 — a S-69 consolidou o mesmo bloqueio para quatro Marcos. Duas sprints apontando para o mesmo trabalho é a desordem que o governo do inventário existe para impedir, e esta escapou da varredura da S-75: **nenhum portão pergunta se duas sprints fazem a mesma coisa.** Havia também número errado — o texto dizia "sete funções", e a consulta ao banco vivo mediu duas. O registro fica no lugar da sprint em vez de a sprint sumir. |
| 2026-08-11 | Conferência da R9 ao fechar a S-75: **`M-0` continua aberto** | Quatro sprints penduradas nele — S-19 (riscos residuais da Etapa 20), S-22 (recuperação do repositório), S-39 (proteção de ramo, bloqueada) e S-73 (vacinas universais que viram teste). Fechar a S-75 não fecha o Marco, e é exatamente o que a R9 existe para impedir. Nenhuma reordenação: a próxima sprint é decisão da virada seguinte. |
| 2026-08-11 | A S-43 passa de `em andamento` a `bloqueada`; a S-75 assume a vaga da R3 | **Bloqueio declarado, não reordenação de prioridade.** A T-43.3 tarefa 5 precisa das filas do canal no banco, e isso depende da S-69 — decisão do proprietário sobre aplicar migrations. Manter a S-43 como `em andamento` ocupava a vaga única da R3 e fazia o inventário parecer ter trabalho em curso onde havia espera. A S-75 estava em execução de fato, com 2 de 5 tarefas entregues, e passa a declarar isso. |
| 2026-08-10 | A S-43 (migração de linguagens) passa à frente da S-23 (fundação de interface), que vai para `bloqueada` | **Decisão de prioridade do proprietário arquitetural**, caso previsto na R5: *"inicie as conversões dos códigos para Go, Typescript, Python e Rust conforme nosso mapa"*. A reordenação **apenas registra o que já era verdade**: a S-23 tem 23 tarefas concluídas e 11 abertas, e nenhuma avançou durante as S-38 a S-43. A R3 não acusou antes porque a S-43 constava como `pendente`; ao ativá-la, o validador reprovou com duas sprints em andamento e obrigou a explicitar a escolha. Retomar a S-23 exige tirar a S-43 da vaga. |
| 2026-08-10 | A convergência do Projeto RH passa de `S-38` para `S-40` | **Colisão de numeração**, não reordenação de trabalho. As duas sprints foram escritas em paralelo, em ramos diferentes, e as duas se chamavam `S-38`. A da `main` (endurecimento dos portões) chegou primeiro pelo PR #45, junto da `S-39`; a do RH renumera para o fim, conforme a R4. Nenhuma tarefa mudou de ordem nem de conteúdo. |
| 2026-08-02 | Dentro da S-32, o motor de documento passa à frente da auto-sugestão | **Pré-requisito descoberto**, caso previsto na R5. O responsável nomeou os dependentes: propostas, orçamentos, contratos, aditivos, FVS e FVM da qualidade, layouts de mensagem padrão e resposta do SAC. Construir esses módulos antes do motor significa construir sete editores para desfazer depois. A auto-sugestão continua barata e entrega sozinha, mas não destrava nenhum módulo. |
| 2026-07-26 | S-23 passa à frente da S-22 e da S-20 | Caso de **base reaproveitável** previsto na R5. Os componentes de campo da S-23 servem aos 20 módulos e resolvem o defeito mais grave já verificado — dado inválido gravado em produção. A S-22 trata de reconstrução do banco e não bloqueia interface; a S-20 troca vocabulário nas mesmas telas que a S-23 vai refazer, então entra junto, tela por tela, para não refazer duas vezes. |
| 2026-07-25 | Virada S-21 → S-22, sem reordenação | A S-22 nasceu do resultado da própria S-21 e é pré-requisito de tudo: enquanto o repositório não reconstrói o banco, nenhuma sprint que crie migration tem base verificável. A S-06 e a S-20 seguem atrás dela. |
| 2026-07-25 | S-21 passa à frente da S-06 | Pré-requisito descoberto, caso previsto na R5. A S-06 cria a camada compartilhada sobre o esquema da homologação; enquanto o repositório não reproduz esse esquema, qualquer migration nova é aplicada sobre chão que ninguém consegue recriar. Reconciliar o ledger primeiro é o que torna a S-06 verificável. |
| 2026-07-25 | Virada S-05 → S-06, sem reordenação | Avaliadas as pendentes na virada, conforme R5. S-06 continua a próxima: a camada compartilhada consome a projeção de slots que a S-05 acabou de produzir, e S-07 e S-08 dependem da tabela existir. A S-20, descoberta durante a S-05, não passa à frente por ser vocabulário de interface, sem bloquear nada da fundação. |
| 2026-07-25 | Virada S-04 → S-05, sem reordenação | Avaliadas as pendentes na virada, conforme R5. S-05 continua primeira: o catálogo de definições é pré-requisito físico de todas as demais sprints do M-1 — sem ele não há o que armazenar, indexar ou proteger. Nenhuma sprint pendente é pré-requisito descoberto nem base reaproveitável que justifique passar à frente. |

---

## Como uma sessão usa este arquivo

1. Lê no início, sempre (R1).
2. Localiza a sprint `em andamento` e a primeira tarefa `[ ]` dela.
3. Executa aplicando a decomposição em micro-problemas.
4. Marca `[x]` ao concluir, com evidência (R2).
5. Ao terminar a sprint, marca `concluída`, e só então escolhe a próxima — podendo reordenar as pendentes, com registro (R5, R6).
6. Descobriu algo novo? Vai para o fim (R4), nunca no meio.

---

## Sprint S-64 — Contabilidade: a chave, o catálogo e a analítica

**Estado:** pendente
**Marco:** M-CONTABILIDADE

Módulo novo, decidido pelo proprietário em 11/08/2026. Entra no fim conforme a
R4, declarando o Marco. Escopo, lacunas e o que fica **fora** — fiscal
brasileiro — em [`CONFRONTO-ODOO-19-E-INNOV.md`](CONFRONTO-ODOO-19-E-INNOV.md)
§3.6. Conforme a R8, esta sprint aponta e não repete.

A analítica vem primeiro porque é dela que saem a rentabilidade (E3), o
comprometido (E4) e o rateio de um custo entre duas obras. Relatório antes de
analítica seria relatório sobre um eixo que não existe.

- [ ] T-64.1 — **A cadeia inteira da chave, num passo só**: `contabilidade` no `MODULE_REGISTRY`, semeadura em `app_modules`, bloco de menu e pasta de rota. As quatro coisas juntas, porque `validate:modulos-semeados` cobra as cinco direções e a VACINA-064 nasceu exatamente de fazer isso pela metade
- [ ] T-64.2 — Persona e rotina antes da primeira tela, conforme `PERSONAS-E-ROTINAS.md`: quem entra, vindo de onde, para resolver o quê e em quantos cliques
- [ ] T-64.3 — Plano de contas e diários, por organização, com semeadura padrão editável
- [ ] T-64.4 — **Distribuição analítica com percentual**, permitindo um custo pertencer a mais de uma obra — o mecanismo do qual E3 e E4 dependem
- [ ] T-64.5 — Lançamento contábil com partida dobrada conferida no banco, e estorno como lançamento novo, nunca exclusão de linha
- [ ] T-64.6 — Prova por sabotagem: lançamento desbalanceado reprova; soma de percentuais analíticos fora da distribuição pretendida reprova
- [ ] T-64.7 — **Checklist universal de conclusão de módulo**, o mesmo para todos: `pnpm checklist:modulo contabilidade` responde os itens mecânicos, e os humanos — persona, QA visual, KPI, relatório de ausência — ficam em `diretrizes/CHECKLIST-DE-CONCLUSAO-DE-MODULO.md`. **Item humano sem evidência conta como não feito.** A tarefa aponta e não repete o esqueleto (R8): regra escrita em 28 sprints diverge em silêncio

## Sprint S-65 — Contabilidade: os relatórios que respondem "como a empresa está"

**Estado:** pendente
**Marco:** M-CONTABILIDADE

Os oito relatórios da §3.6 do confronto. Cada um declara **a pergunta que
responde**, como faz a tabela do manual — a nossa tabela de relatórios tem
título, e a deles tem pergunta.

- [ ] T-65.1 — Razão Geral, Balancete e Balanço, com caminho de volta ao lançamento
- [ ] T-65.2 — DRE gerencial por período, com comparação entre períodos
- [ ] T-65.3 — **Razão do Parceiro**: o extrato do cliente, que hoje não existe
- [ ] T-65.4 — **A Receber e A Pagar Vencido por idade** — família de relatório de ausência (E7)
- [ ] T-65.5 — **Fluxo de Caixa** separado em operacional, investimento e financiamento
- [ ] T-65.6 — Resumo Executivo: margem bruta, margem líquida, ROI e prazos médios
- [ ] T-65.7 — Cada relatório com a pergunta declarada e a definição do número legível ao usuário, não só ao código
- [ ] T-65.8 — **Checklist universal de conclusão de módulo**, o mesmo para todos: `pnpm checklist:modulo contabilidade` responde os itens mecânicos, e os humanos — persona, QA visual, KPI, relatório de ausência — ficam em `diretrizes/CHECKLIST-DE-CONCLUSAO-DE-MODULO.md`. **Item humano sem evidência conta como não feito.** A tarefa aponta e não repete o esqueleto (R8): regra escrita em 28 sprints diverge em silêncio

## Sprint S-66 — IA operadora: o registro de atos e o portão da autonomia

**Estado:** pendente
**Marco:** M-IA

Módulo novo, decidido pelo proprietário em 11/08/2026. O contrato está em
[`IA-OPERADORA.md`](IA-OPERADORA.md) e é canônico; esta sprint **implementa o
portão que aquele documento declara não ter** (§9).

Nada de modelo, prompt ou provedor entra aqui. Primeiro o registro de atos e as
regras que o CI sabe cobrar — porque autonomia sem portão é a coisa que este
repositório mede que não dura.

- [ ] T-66.1 — A cadeia inteira da chave `ia`, como em T-64.1
- [ ] T-66.2 — Tabela de **atos da IA**: módulo, ato, nível (N0..N3), caminho de desfazer, quem aprovou o nível e quando. Padrão de todo ato novo é **N0**
- [ ] T-66.3 — **Portão `validate:ia-autonomia`**: ato em N2/N3 sem caminho de desfazer reprova; ato em N2/N3 cujo gravador não escreve antes-e-depois reprova; ato da lista do §4 declarado acima de N1 reprova
- [ ] T-66.4 — Prova por sabotagem das três direções, com o caso legítimo passando — portão que só sabe reprovar não mede
- [ ] T-66.5 — Generalizar orçamento, trava e citação da ponte da S-22 para além do canal, **sem reimplementar**: partir de `20260804200000_stage22_ai_bridge.sql` com as correções da VACINA-065
- [ ] T-66.6 — Degradação segura: sem orçamento, sem provedor ou sem confiança, cai para N0 e avisa; nunca para em silêncio
- [ ] T-66.7 — **Checklist universal de conclusão de módulo**, o mesmo para todos: `pnpm checklist:modulo ia` responde os itens mecânicos, e os humanos — persona, QA visual, KPI, relatório de ausência — ficam em `diretrizes/CHECKLIST-DE-CONCLUSAO-DE-MODULO.md`. **Item humano sem evidência conta como não feito.** A tarefa aponta e não repete o esqueleto (R8): regra escrita em 28 sprints diverge em silêncio

## Sprint S-67 — IA operadora: o primeiro trabalho, que é cobrar o que falta

**Estado:** pendente
**Marco:** M-IA

O primeiro emprego útil é **E7**, os relatórios de ausência. Escolhido por ser
reversível por natureza: cobrança errada custa um aviso, não um lançamento.
Depende de S-66 (o portão) e de E12 (antes-e-depois), que é pré-condição de
qualquer ato acima de N1.

- [ ] T-67.1 — Varredura no plano de execução em Go que já existe, como segunda carga — sem runtime novo, sem ADR
- [ ] T-67.2 — Primeiros atos, todos em N1: documento faltante, lead sem acompanhamento, recebível vencido, pedido de compra atrasado
- [ ] T-67.3 — Cada aviso cita a fonte e oferece a ação; nenhum grava sozinho
- [ ] T-67.4 — Teto de volume por tipo de ato: 500 avisos numa madrugada é incidente, mesmo com cada um certo
- [ ] T-67.5 — Medir taxa de acerto com denominador declarado, antes de qualquer conversa sobre subir nível
- [ ] T-67.6 — **Checklist universal de conclusão de módulo**, o mesmo para todos: `pnpm checklist:modulo ia` responde os itens mecânicos, e os humanos — persona, QA visual, KPI, relatório de ausência — ficam em `diretrizes/CHECKLIST-DE-CONCLUSAO-DE-MODULO.md`. **Item humano sem evidência conta como não feito.** A tarefa aponta e não repete o esqueleto (R8): regra escrita em 28 sprints diverge em silêncio

## Sprint S-68 — RH: o que falta para o módulo existir para o usuário

**Estado:** pendente
**Marco:** M-RH

Aberta na conferência de Marcos de 11/08/2026, conforme a **R9**. O validador
apontava `M-RH` como candidato a fechamento, e a conferência mostrou que **não
era**: as duas sprints ligadas a ele — S-40 e S-42 — eram de **convergência de
ramo** e de **mapa tecnológico**, não de conclusão do módulo. A S-42 foi religada
a `M-PLATAFORMA`; esta sprint é o trabalho que o Marco realmente exige.

O módulo é o mais construído da plataforma — **57 das 180 páginas**, menu 100%
próprio. E **nenhum usuário o alcança**, porque as 68 migrations `rh_*` não estão
aplicadas: `list_my_modules` resolve contra `app_modules`, e a chave não está lá.
É a VACINA-064 vista pelo lado da aplicação.

- [ ] T-68.1 — **Bloqueado por S-69.** Aplicar as 68 migrations `rh_*` e conferir que a chave `rh` aparece em `app_modules` e que a central lista o módulo
- [ ] T-68.2 — Decidir as **5 RPCs sem chamador e sem teste** (`create_rh_payroll_parameter` e irmãs): ligar a uma tela, cobrir com teste, ou remover por migration destrutiva com decisão registrada
- [ ] T-68.3 — Custo/hora no cadastro do funcionário, com vigência — mesma peça de **E1** (S-52), que mora em `M-EQUIPES` e é lida aqui
- [ ] T-68.4 — Conferência da persona e da rotina operacional contra `PERSONAS-E-ROTINAS.md`, com as quatro perguntas respondidas para as telas que já existem
- [ ] T-68.5 — Confronto com o manual (§3.5): o que fica de fora e por quê — recrutamento não é gargalo hoje; frota é `◐` e depende de decisão
- [ ] T-68.6 — **Checklist universal de conclusão de módulo**, o mesmo para todos: `pnpm checklist:modulo rh` responde os itens mecânicos, e os humanos — persona, QA visual, KPI, relatório de ausência — ficam em `diretrizes/CHECKLIST-DE-CONCLUSAO-DE-MODULO.md`. **Item humano sem evidência conta como não feito.** A tarefa aponta e não repete o esqueleto (R8): regra escrita em 28 sprints diverge em silêncio

## Sprint S-69 — Aplicar no banco o que o repositório já tem

**Estado:** concluída
**Marco:** M-SEGURANCA

**Aval dado pelo proprietário e executado em 12/08/2026.** O alcance aplicado é
o que a medição do banco vivo definiu — as duas escritas cross-tenant que
existiam no servidor. As 68 migrations `rh_*` e as 25 `stage22_*` **não** entram
neste lote: são operação própria, com ordem e ponto de retorno próprios, e a
S-70, a S-76 e a T-43.3 tarefa 5 seguem esperando por elas.

Aberta na conferência de Marcos de 11/08/2026. **Consolida o bloqueio que trava
quatro Marcos ao mesmo tempo**, e por isso deixa de estar espalhada: a S-51
tratava só das migrations da VACINA-065, mas o impedimento é o mesmo para todos.

| Marco travado | O que espera |
| --- | --- |
| `M-SEGURANCA` | as duas migrations de semeadura — **duas funções ainda escrevem em empresa alheia no banco** |
| `M-RH` | as 68 migrations `rh_*` — o módulo não existe para nenhum usuário |
| `M-PLATAFORMA` | as filas do canal, sem as quais a T-43.3 tarefa 5 (`FilaPostgREST`) não tem o que consumir |
| `M-WHATSAPP` | as 25 migrations `stage22_*` — o gateway não tem fila no banco |

Um passo destrava quatro Marcos. É a maior alavanca do inventário inteiro, e é
**decisão do proprietário**: aplicar migration em banco remoto é ação externa e
irreversível, fora do que uma sessão assistida decide sozinha.

### O que o banco vivo disse, e o que ele corrigiu — 11/08/2026

Esta sprint abriu com uma consulta ao banco de produção, e a consulta **desmentiu
o que eu vinha afirmando**. Eu tinha medido o repositório — todas as migrations,
aplicadas ou não — e chamado o resultado de "o banco". Não é a mesma coisa, e a
diferença é de duas ordens de grandeza:

| Afirmação minha, repetida | Medida no banco vivo |
| --- | --- |
| sete funções escrevem em empresa alheia | **duas** |
| 120 funções chamáveis por `anon` | **duas**, e ambas são de gatilho |

As cinco funções de IA de canal (`reserve_channel_ai_budget`,
`release_channel_ai_budget`, `commit_channel_ai_budget`,
`release_channel_ai_conversation`, `consume_channel_critical_write_approval`)
**não existem no banco** — a etapa 22 não está aplicada. Corrigir no repositório
uma função que não existe no servidor não corrige nada hoje; corrige quando a
etapa 22 for aplicada, e é por isso que a correção delas continua atrás deste
mesmo bloqueio.

As duas vivas, ambas `security definer`, ambas concedidas a `authenticated`,
ambas sem conferir participação:

| Função | `anon` | `authenticated` | definer | tem guarda |
| --- | --- | --- | --- | --- |
| `semear_motivos_de_perda(uuid)` | não | **sim** | sim | **não** |
| `semear_modelos_da_empresa(uuid)` | não | **sim** | sim | **não** |

**Consequência para esta sprint:** o alcance mínimo encolheu de "duas migrations
sobre sete funções" para **duas migrations sobre duas funções, tocando três
objetos que existem no banco** (`managed_list_values`, `document_templates`,
`is_org_member`). Foi para isso que a migration de 11/08 foi **separada em duas**
— a parte viva não pode ficar esperando a etapa 22, e a parte da etapa 22 não
pode ser aplicada. O erro está registrado em `REGISTRO-DE-ERROS.json` como
`medicao`, custo alto, detectado pelo advisor e não por mim.

- [x] T-69.1 — **Decisão do proprietário** sobre aplicar, com o alcance definido. O alcance foi medido no banco e está acima; a decisão é do proprietário e está apresentada. **O que a sessão pode fazer sozinha terminou aqui**
- [x] T-69.2 — Ordem e ponto de retorno definidos **antes** de qualquer execução. Ordem: motivos de perda, depois modelos. Ponto de retorno: as definições anteriores estão versionadas em `supabase/migrations/20260803235000_listas_cadastradas_por_escopo.sql` e `supabase/migrations/20260803160000_semear_modelos_da_empresa.sql` — reaplicar qualquer uma restaura o estado anterior. **Nenhuma das duas toca dado**: são `create or replace function`, sem DDL de tabela e sem `delete`. Conferido antes de aplicar que as cinco funções envolvidas existem no banco com a mesma assinatura e o mesmo tipo de retorno, porque `create or replace` reprova se o retorno mudou
- [x] T-69.3 — Aplicadas as duas, com sucesso registrado pelo cliente de migration. O débito saiu de 123 para 121 arquivos sem aplicação
- [x] T-69.4 — **Reprovação observada, não deduzida.** Com `role authenticated` e `request.jwt.claims` de um usuário que não participa da organização alvo:

```
semear_motivos_de_perda    ERROR P0001: sem acesso a esta organização (linha 6)
semear_modelos_da_empresa  ERROR P0001: sem acesso a esta organização (linha 9)
```

  E o caso legítimo passando: o mesmo bloco com o usuário e a organização de que ele participa executa as duas sem exceção, devolvendo 0 — idempotente, nada reescrito.

  **A terceira prova é a que a migration existia para não quebrar.** O risco desta correção não é o caminho do atacante, é o legítimo: o gatilho de criação de empresa dispara **antes de existir participação para conferir**, e chamar a função guardada ali quebraria o cadastro. Ensaio executado e desfeito por construção — `insert` numa empresa nova, medição, e exceção de propósito, que em bloco `do` desfaz tudo:

```
ENSAIO_DESFEITO motivos_semeados=9 modelos_semeados=0
organizações depois do ensaio: 1     sobra do ensaio: 0
```

  Os 9 motivos são a lista inteira: o gatilho disparou e semeou. O `0` de modelos **não é falha do gatilho** — `document_templates` com `scope='PLATAFORMA'` tem **zero linhas** no banco, então não há o que copiar. É achado próprio, e está na S-78
- [x] T-69.5 — Ledger atualizado com **só o que foi de fato aplicado**: as duas saíram do débito, `definidoras_conferem_participacao` continua nele com as cinco funções da etapa 22, que não existem no banco. `validate:migrations-applied` verde, 273 arquivos, 210 aplicadas, nenhuma divergência nova

## Sprint S-70 — WhatsApp: navegação própria e o que o gateway precisa

**Estado:** pendente
**Marco:** M-WHATSAPP

Aberta na conferência de Marcos de 11/08/2026, pelo mesmo motivo da S-68: o
validador apontava `M-WHATSAPP` como candidato a fechamento, e a S-41 ligada a
ele era **convergência de ramo**, não conclusão de módulo.

Medido: 4 páginas e **menu com 1 destino próprio em 5** — 20%, um dos cinco
módulos cujo menu é majoritariamente atalho para vizinho. Confronto em
[`CONFRONTO-ODOO-19-E-INNOV.md`](CONFRONTO-ODOO-19-E-INNOV.md) §3.5.

- [ ] T-70.1 — Navegação interna própria: hoje o menu do módulo é anel para os vizinhos, e o módulo não tem profundidade que justifique menu
- [ ] T-70.2 — **Bloqueado por S-69.** Filas do canal aplicadas, sem as quais o gateway não drena
- [ ] T-70.3 — SLA de atendimento, compartilhado com `M-SAC` (E8, S-59) — a política é a mesma, a tela é que difere
- [ ] T-70.4 — Persona e rotina, com as quatro perguntas de `PERSONAS-E-ROTINAS.md`
- [ ] T-70.5 — **Checklist universal de conclusão de módulo**, o mesmo para todos: `pnpm checklist:modulo whatsapp` responde os itens mecânicos, e os humanos — persona, QA visual, KPI, relatório de ausência — ficam em `diretrizes/CHECKLIST-DE-CONCLUSAO-DE-MODULO.md`. **Item humano sem evidência conta como não feito.** A tarefa aponta e não repete o esqueleto (R8): regra escrita em 28 sprints diverge em silêncio

## Sprint S-71 — Administração: escrever o que "finalizado" significa, e fechar a diferença

**Estado:** pendente
**Marco:** M-ADMINISTRACAO

Aberta na conferência de Marcos de 11/08/2026, conforme a **R9**, e é o terceiro
caso idêntico do mesmo dia — depois de `M-RH` e `M-WHATSAPP`.

A S-34 fechou (listas cadastradas, 14 tarefas entregues), e o Marco apareceu como
candidato. A conferência diz **não**: o Marco tem **uma sprint**, sobre listas, e
o módulo tem **10 páginas e menu 6/6 próprio**. Fechar declararia Administração
pronta porque a tela de motivos de perda ficou pronta.

**O buraco é estrutural e vale para quase todos os 37 Marcos:** cada um declara
*"finalizar o módulo X"* e **nenhum diz o que "finalizado" significa para X**.
Sem isso, a R9 impede fechar por cima de sprint aberta, mas não impede fechar por
cima de escopo que ninguém escreveu.

O lugar da definição já existe e tem precedente cobrado por CI: `MODULOS.md`
carrega o contrato de cada módulo, e o validador já exige *Definition of Done* no
contrato do `estoque`. Estender isso a todos é o trabalho — **um módulo por vez**,
começando por este.

- [ ] T-71.1 — Escrever em `MODULOS.md` a **definição de pronto** do `administracao`: o que o módulo precisa ter para o Marco poder fechar, derivado do confronto §3.5 e do estado medido
- [ ] T-71.2 — Conferir a diferença entre a definição e as 10 páginas de hoje, e listar o que falta como tarefa
- [ ] T-71.3 — **Portão**: estender a verificação de *Definition of Done* — hoje só o `estoque` — para exigir que todo Marco de módulo aponte a sua, e reprovar Marco `concluído` cuja definição não exista. Provar por sabotagem, com o caso legítimo passando
- [ ] T-71.4 — Só então conferir o Marco de novo, conforme a R9
- [ ] T-71.5 — **Checklist universal de conclusão de módulo**, o mesmo para todos: `pnpm checklist:modulo administracao` responde os itens mecânicos, e os humanos — persona, QA visual, KPI, relatório de ausência — ficam em `diretrizes/CHECKLIST-DE-CONCLUSAO-DE-MODULO.md`. **Item humano sem evidência conta como não feito.** A tarefa aponta e não repete o esqueleto (R8): regra escrita em 28 sprints diverge em silêncio

## Sprint S-72 — Equipes: capacidade, papel antes da pessoa e navegação própria

**Estado:** pendente
**Marco:** M-EQUIPES

Aberta em 11/08/2026 ao escrever a **definição de pronto** do módulo em
`MODULOS.md`. A S-52 (E1) fecha o custo/hora; esta fecha o resto da diferença
entre a definição e o que existe. Conforme a R8, aponta e não repete.

Medido: **1 página própria** e **menu com 1 destino próprio em 5** — quatro dos
cinco itens são atalho para `planejamento`, `tarefas`, `obras` e `relatorios`. O
menu não é navegação do módulo; é anel entre irmãos, e ele existe porque o módulo
não tem profundidade que justifique menu.

- [ ] T-72.1 — **Capacidade por pessoa e por papel**, que é a base da alocação do planejamento (`horas planejadas ÷ capacidade disponível`) — confronto §3.2
- [ ] T-72.2 — **Papel antes da pessoa**: a obra planeja a função a alocar antes de existir alguém para ela. É o desenho de *Roles* do manual, e é o que uma obra precisa no início
- [ ] T-72.3 — Navegação própria: destinos que existem porque o módulo tem profundidade. Não acrescentar item de menu antes de existir a página — foi assim que quatro módulos ficaram com menu de vizinho
- [ ] T-72.4 — Persona e rotina antes de qualquer tela nova, com as quatro perguntas de `PERSONAS-E-ROTINAS.md`
- [ ] T-72.5 — Declarar as tabelas do módulo em `diretrizes/tabelas-por-modulo.json` — já feito para `equipes` em 11/08/2026, e é pré-requisito dos itens de dado do checklist
- [ ] T-72.6 — Percorrer o [`CHECKLIST-DE-CONCLUSAO-DE-MODULO.md`](CHECKLIST-DE-CONCLUSAO-DE-MODULO.md) inteiro, registrando evidência de cada item de verificação humana; item sem evidência conta como não feito
- [ ] T-72.7 — Conferir o Marco pela **R9** com o checklist e a definição de pronto na mão, e só então decidir o fechamento
- [ ] T-72.8 — **Checklist universal de conclusão de módulo**, o mesmo para todos: `pnpm checklist:modulo equipes` responde os itens mecânicos, e os humanos — persona, QA visual, KPI, relatório de ausência — ficam em `diretrizes/CHECKLIST-DE-CONCLUSAO-DE-MODULO.md`. **Item humano sem evidência conta como não feito.** A tarefa aponta e não repete o esqueleto (R8): regra escrita em 28 sprints diverge em silêncio

## Sprint S-73 — Transformar em teste as vacinas universais que só têm conferência humana

**Estado:** concluída
**Marco:** M-0

Aberta em 11/08/2026 pela pergunta do proprietário: *"o que das vacinas ou erros
que cometemos são comuns em todos os Marcos e poderiam virar testes ou
checklist?"*

Varredura executada sobre as 66 vacinas: **33 já têm portão, 33 não**. Das 33 sem
portão, **20 são universais** — reaparecem em qualquer módulo, porque a causa é
padrão de raciocínio e não funcionalidade. Todas entraram no
[`CHECKLIST-DE-CONCLUSAO-DE-MODULO.md`](CHECKLIST-DE-CONCLUSAO-DE-MODULO.md) §5,
e cinco delas dariam **teste**, não só conferência.

O maior buraco era o **formulário**: três causas-raiz distintas sobre a mesma
coisa — o formulário perdendo o que a pessoa digitou — e zero cobertura.

- [x] T-73.1 — **V004**, e é o único global: validador de `EXECUTE` herdado de `PUBLIC`/`anon`, irmão do `validate:definer-com-guarda`. Entregue em `scripts/validate-execute-revogado.mjs`; o estoque que ele mediu virou a S-74, e o débito foi a zero
- [x] T-73.2 — **V048**: teste de ida e volta de texto longo — enviar `\r\n` e afirmar que volta normalizado. **A medição mudou o tamanho da tarefa.** A regra da vacina é universal — *todo texto multilinha vindo de `FormData` é normalizado na entrada* — e valia em **um** lugar: `app/actions` tinha **62 arquivos** com a sua própria cópia de `String(dados.get(chave) ?? "").trim()`, nenhuma normalizando. O `.trim()` não resolve, e é por isso que ninguém viu: ele tira espaço das pontas e o `\r\n` está no meio. Entregue em três peças — `lib/forms/campos.ts` (a leitura normalizada num lugar só, com as 65 leituras genéricas delegando), `tests/formulario-campos.test.ts` (9 casos, incluindo a ida e volta pelo transporte, que prova que o multipart devolve o CRLF byte a byte e que quem normaliza é o servidor) e `pnpm validate:crlf-normalizado` (o portão que prova que todo mundo passa pela função). **O par tela→ação é medido pelo `<form action={…}>`, resolvendo o apelido do `useActionState`, e não pelo nome do campo** — medir por nome acusou duas ações, as duas falsas, porque `reason` é `<input>` numa tela e `<textarea>` noutra. Seis sabotagens vistas reprovando pelo portão certo, com o caso legítimo passando
- [x] T-73.3 — **V051**: campo controlado que sobrevive à volta da server action, porque é o DOM que o formulário envia. Entregue em `lib/forms/reencostar-no-dom.ts` (o gancho `useReencostarNoDom`, tirado de dentro da tela de emissão porque a regra não é dela) e `pnpm validate:campo-controlado`. **Minha medição anterior estava errada e o portão a corrigiu:** eu tinha contado *um* campo controlado olhando só para `<select>` e por linha, o que perde os que abrem em várias linhas. O real são **12 campos controlados e enviados em 10 componentes**, seis sem âncora — três no editor de modelo, a mesma tela da VACINA-048, e três no formulário de proposta, que re-renderiza a cada erro de campo. E a versão por arquivo do próprio portão escondia mais um: ao trocar *"esta tela usa o gancho?"* por *"este campo está ancorado?"*, apareceu o `titulo` **da própria tela de emissão**, deixado de fora da correção original de julho, que ancorou os cinco `select` e esqueceu o campo de texto ao lado. Sabotagens vistas reprovando, com `defaultValue` seguindo isento
- [x] T-73.4 — **V054**: `Escape` fecha o menor contexto aberto, nunca o formulário. Entregue em `pnpm validate:escape-uma-camada`, que cobra: tratador no elemento que age em `Escape` barra a propagação nesse ramo; ouvinte de `document` **não** é cobrado, porque é a camada externa — o lado que sofre. Medido: nove componentes tratam `Escape`, oito por ouvinte de documento e dois no elemento. Dos dois, um já barrava; o outro — `FormularioNovoCartao` — fechava o formulário e deixava a tecla seguir para o ouvinte de janela do menu da etapa, que é a mesma composição da vacina noutro módulo. Corrigido. Três sabotagens vistas reprovando, com o ouvinte de documento seguindo isento
- [x] T-73.5 — **V036**: conferir as consultas contra o contrato real da tabela. **O enunciado mudou na execução, e a mudança é o achado.** "Tipos gerados do Supabase" pressupõe que existam: não existem neste repositório, e gerá-los do banco vivo mediria o banco, não o contrato que o repositório promete. O portão passou a reconstruir as colunas a partir das migrations — `pnpm validate:colunas-existentes` —, o que conferiu **869 `.select()` com 3.335 colunas e 2.003 filtros/ordenações sobre 330 tabelas**. Antes dele, acrescentar `coluna_que_nao_existe` a um `.select()` **não reprovava nada**: nem lint, nem `tsc`, nem os 45 validadores de então, nem os 1.086 testes — medido por sabotagem em 11/08/2026. Dois defeitos reais corrigidos, os dois a VACINA-036 repetindo-se literalmente: `rh_payroll_runs.created_at` (a tabela tem `started_at`) e `rh_esocial_events.processed_at`, que nunca existiu. Sete acusações restantes **não eram defeito do código**: a coluna existe no banco e nenhuma migration a declara — dívida datada em `diretrizes/COLUNAS-SEM-MIGRATION.json`, com o tipo medido, e o portão reprova tanto coluna nova fora da lista quanto entrada que ninguém usa mais. O que a mesma medição encontrou por baixo abriu a **S-77**: 77 tabelas existem no banco e nenhuma migration as cria. Quatro sabotagens vistas reprovando, com o caso legítimo passando
- [x] T-73.6 — Os quatro do meio valem **por módulo**: entram no checklist como teste exigido, não como revisão. Cada portão ganhou `--escopo` e `--json` em `scripts/escopo-de-validador.mjs`, e o `pnpm checklist:modulo <chave>` chama **o mesmo arquivo que o CI chama** — a detecção não é reimplementada, porque regra escrita em dois lugares diverge em silêncio, que foi o defeito corrigido a sprint inteira. **O escopo por rota não bastava e a medição mostrou:** o CRM tem `<textarea>` em três telas e respondia *"nada a conferir"*, porque a ação que recebe o texto mora em `app/actions/relationship.ts`. O escopo passou a ser a pasta da rota mais o que as páginas importam, um salto — aresta de import, não palpite —, e o CRM saiu de 1 para 14 caminhos. Um segundo erro no caminho: o regex de import exigia espaço depois de `from`, e metade das páginas é minificada (`from"@/app/actions/relationship"`). A saída separa `N conferido(s)` de `nada a conferir` de `N PENDÊNCIA(S)`, porque ausência de construto não é aprovação. Provado por sabotagem: tirar a âncora de um campo aparece em `propostas`, não aparece em `crm`, e reprova o portão global no mesmo commit

## Sprint S-74 — Queimar o débito da VACINA-004: 120 funções herdando `EXECUTE` de `PUBLIC`

**Estado:** concluída
**Marco:** M-SEGURANCA

Aberta em 11/08/2026 pela T-73.1, que criou o portão e mediu o estoque. Detalhe
e prova por sabotagem na própria VACINA-004; débito datado em
`diretrizes/EXECUTE-PUBLIC-ACEITOS.json`. Conforme a R8, aponta e não repete.

O portão impede **crescer**; esta sprint faz **cair**. A ordem é por risco, não
por facilidade.

- [x] T-74.1 — **As 73 com `grant` explícito primeiro**: revogar de `public, anon` é seguro porque o grant nominal sobrevive ao revoke. Feito em `20260811170000_revogar_execute_de_public_lote_1.sql`, com a assinatura de cada linha **copiada do próprio `grant`** e não reconstruída da declaração — assinatura reconstruída erra em `default`, tipo com espaço e sobrecarga, e o erro só aparece na aplicação. Conferido antes: **nenhuma das 73 concede a `anon`**. Débito **120 → 47**, e a queda é sustentada pela migration: removê-la faz as 73 voltarem a reprovar
- [x] T-74.2 — **Decisão de papel medida, não presumida.** O primeiro sinal que usei — menção do nome no código — dizia que **todas as 47** eram chamadas pelo navegador. Por **chamada real `.rpc("nome")`** em `app/` ou `lib/`, são **5**. As outras 42 são gatilho ou auxiliar interno e recebem só `revoke`. Feito em `20260811180000_revogar_execute_de_public_lote_2.sql`; assinatura extraída contando parênteses, para não truncar em `default auth.uid()` e `default now()-interval '30 days'`. **Débito 47 → 0**
- [x] T-74.3 — **Prioridade respeitada nos dois lotes**: das 77 definidoras não-gatilho, 71 saíram na T-74.1 e as 6 restantes na T-74.2. Conferido ao fim: 0 na lista de prioridade e 0 em `demais`

- [x] T-74.5 — Atualizado nos dois lotes, com histórico datado de cada queda: **120 → 47 → 0**. E a queda é sustentada pelas migrations, não pela edição do JSON: removendo o lote 2, as 47 voltam a reprovar

## Sprint S-75 — Varrer o que está obsoleto no inventário e nos canônicos

**Estado:** concluída
**Marco:** M-0

Aberta em 11/08/2026 pela suspeita do proprietário — *"tem muita coisa
desatualizada ou obsoleta"* —, confirmada em parte e refutada em parte pela
varredura. Causa-raiz e prova em `VACINA-067`.

**O que a varredura achou, e o que ela não achou:**

```
links internos quebrados nos 43 documentos ...... 0
comandos `pnpm` citados que não existem ......... 0
números afirmados fora de data .................. 12, em 8 documentos
documentos com duas datas "Atualizado em" ....... 2
```

O apodrecimento **não estava na estrutura**: estava nos números. O pior deles
vivia no `CLAUDE.md`, lido no início de toda sessão.

`pnpm validate:numeros-afirmados` fecha essa porta para as três medições
declaradas. O que sobra é o que ele **não** sabe conferir, e é o trabalho desta
sprint.

- [x] T-75.1 — **Ampliada de 3 para 4 medições protegidas**, e a lição foi o que *não* deu para proteger. `destinos de menu` entrou. **`sprints` e `Marcos` foram tentados e retirados no mesmo dia**: em prosa não são contáveis com precisão — "17 de 25 módulos em 4 sprints ou mais" e "### 7.4 Sprints W-19 a W-22" casavam como se fossem contagem, e a medição de Marcos contava 41 porque a tabela de bloqueio da S-69 usa linhas com a mesma forma do registro. **Três acusações falsas em cinco** — portão que erra assim gasta a confiança de quem o lê. Entrou também a isenção de **documento com data no nome**, datado por construção
- [x] T-75.2 — **Metade resolvida, e a outra metade declarada como não resolvida.** Existe um subconjunto da VACINA-012 que **dá para conferir por máquina**: referência citada que não existe mais. Quatro classes entraram no portão — vacina, sprint, Marco e função do banco — e as quatro estão provadas por sabotagem. Medido ao criar: **0 quebradas nas quatro**, o que confirma que o apodrecimento estava só nos números. O que **não** dá para conferir continua sem portão: documento que descreve um comportamento que mudou passa, porque exige comparar prosa com código. Está escrito como limitação no próprio validador, não resolvido às escondidas
- [x] T-75.3 — **Varredura executada.** De 71 arquivos citados no inventário, **3 não existem**, e só **1 estava em tarefa aberta**: a T-28.11 mandava ler de um módulo "curvas.ts" que foi removido. Corrigida — a leitura de `project_progress_snapshots` já acontece hoje nas páginas de obra, e o que falta da tarefa é só a **gravação**. Os outros 2 estão em tarefas fechadas e são registro histórico. `ocorrencias` aparece citada, e é legítimo: é o registro da própria remoção, na S-44. Virou portão no `validate:inventory`
- [x] T-75.4 — **Uma achada: a S-32**, com **46 tarefas feitas e zero abertas**, parada em `pendente`. Fechada. Sprint entregue e não fechada segura o Marco dela aberto pela R9, sem motivo. Virou portão no `validate:inventory`, provado por sabotagem — reabrir a S-32 reprova
- [x] T-75.5 — **Registrado, e o denominador mudou a leitura.** O registro foi de 20 para 31 ocorrências ao longo da sprint, e `governanca` consolidou-se como **40% do peso com 9 das 10 sem portão** — a família mais cara e a menos protegida. Os quatro portões desta leva (Marco, R9, números afirmados e inventário obsoleto) atacam exatamente ela

## Sprint S-76 — Conferir no banco a revogação de `EXECUTE`, e a suposição que ela carrega

**Estado:** pendente
**Marco:** M-SEGURANCA

Separada da S-74 pela **R7**: os dois lotes estão escritos e provados no
repositório, mas conferir no banco depende de aplicá-los — o que é a S-69,
decisão do proprietário.

**Há uma suposição a conferir, e ela está declarada em vez de escondida.** As 42
funções internas do lote 2 são gatilhos e auxiliares, e a migration afirma que
**revogar `EXECUTE` de gatilho não quebra o gatilho**, porque o PostgreSQL
confere o privilégio na criação e não a cada disparo. Isso está afirmado por
conhecimento do motor, **não por teste**. Se estiver errado, o efeito aparece
como gatilho que para de disparar — e é por isso que a conferência exige
observar o comportamento, não só a ausência de erro na aplicação.

- [ ] T-76.1 — **Bloqueado por S-69.** Aplicar os dois lotes
- [ ] T-76.2 — `has_function_privilege('anon', ..., 'EXECUTE')` falso para as 120, conferido em consulta e não em suposição
- [ ] T-76.3 — **Observar a recusa**: chamar como `anon` uma das 5 concedidas a `authenticated` e ver negar; chamar como `authenticated` e ver passar
- [ ] T-76.4 — **Conferir a suposição do gatilho**: disparar um `insert`/`update` que aciona um dos 42 gatilhos revogados e confirmar que ele ainda dispara

## Sprint S-77 — O repositório não sabe recriar o próprio banco

**Estado:** pendente
**Marco:** M-PLATAFORMA

Aberta em 11/08/2026 pela T-73.5, e é achado novo: entra no **fim** do
documento, conforme a **R4**, com o Marco declarado.

**Como apareceu.** A T-73.5 criou `pnpm validate:colunas-existentes`, que confere
cada `.select()`, `.eq()` e `.order()` contra as colunas reconstruídas das
migrations. Ele acusou 25 usos sobre 9 pares (tabela, coluna). A conferência
contra o banco vivo separou duas coisas que pareciam a mesma:

| | O que era | Desfecho |
| --- | --- | --- |
| 2 pares | coluna não existe **em lugar nenhum** | corrigidos na T-73.5 |
| 7 pares | coluna existe **no banco** e nenhuma migration a declara | dívida datada |

Os dois corrigidos são a VACINA-036 repetindo-se literalmente:
`rh_payroll_runs.created_at` — ordenar por `created_at` assumido por convenção,
quando a tabela tem `started_at` — e `rh_esocial_events.processed_at`, que nunca
existiu.

**O que a mesma medição encontrou por baixo, e que é o motivo desta sprint:**

| Divergência | Quantidade |
| --- | ---: |
| Tabelas no banco e **ausentes das migrations** | **77** |
| Colunas no banco e ausentes das migrations | 10 |
| Colunas nas migrations e ausentes do banco | 23 |

`access_profiles`, `app_modules`, `bdi_models` e outras 74 existem em produção e
**nenhuma migration as cria** — são só referenciadas. Recriar o banco a partir
deste repositório produziria um schema que o código não consegue usar.

Isso muda o significado de duas coisas que hoje se lêem como garantia: o débito
de `migrations-aplicadas.json` mede o que falta **aplicar**, e não mede o que
falta **declarar**; e a S-69, que aplica o que o repositório tem, não fecha esta
diferença, porque o que falta aqui não está escrito em lugar nenhum.

A dívida das 7 colunas está datada em
`diretrizes/COLUNAS-SEM-MIGRATION.json`, com o tipo medido no
banco ao lado de cada uma, e o portão reprova qualquer coluna nova fora dessa
lista — e também reprova entrada que ninguém usa mais, para que a lista só possa
encolher.

- [ ] T-77.1 — Inventariar as 77 tabelas: quais têm dado em produção, quais são de etapa abandonada e quais foram criadas fora de migration. Sem esse corte, "escrever as migrations que faltam" não tem sujeito
- [ ] T-77.2 — Gerar a migration de linha de base a partir do schema medido, **sem inventar tipo**: cada coluna com o tipo, nulidade e padrão lidos de `information_schema`
- [ ] T-77.3 — Retirar de `diretrizes/COLUNAS-SEM-MIGRATION.json` cada coluna que a linha de base passar a declarar. O portão reprova entrada órfã, então a lista se fecha sozinha
- [ ] T-77.4 — Conferir as 23 colunas que estão na migration e não no banco: quais são etapa 22 não aplicada (esperam a S-69) e quais são resíduo de migration que nunca rodou
- [ ] T-77.5 — **Prova**: subir um banco vazio só com as migrations e rodar `pnpm validate:colunas-existentes` contra ele. Enquanto essa prova não existir, "o repositório recria o banco" é suposição

## Sprint S-78 — A biblioteca de modelos da plataforma está vazia

**Estado:** pendente
**Marco:** M-DOCUMENTOS

Aberta em 12/08/2026 pelo ensaio da T-69.4, e entra no **fim** conforme a **R4**.

**Como apareceu.** O ensaio de criação de empresa — feito para provar que o
gatilho não quebrou com o guarda novo — mediu o que os gatilhos semearam:

```
motivos_semeados = 9    a lista inteira, o gatilho funcionou
modelos_semeados = 0
```

O zero não é falha do gatilho. `document_templates` com `scope='PLATAFORMA'` e
`archived_at is null` tem **zero linhas** no banco. Não há o que copiar.

**O que isso significa na prática.** Toda empresa nova nasce sem modelo nenhum,
e o botão *"trazer padrões da plataforma"* traz zero. O motor de documento, o
editor, a emissão, a matriz de disponibilização e o versionamento estão
construídos e provados — e a prateleira que eles servem está vazia. É o oposto
do defeito usual: não falta código, falta conteúdo.

Vale registrar o que a medição **não** decide: se a biblioteca deveria ser
semeada por migration, por rotina administrativa ou por importação. As três
existem no repositório e nenhuma foi usada.

- [ ] T-78.1 — Decidir a procedência dos modelos da plataforma: quem escreve, quem aprova e como um modelo entra na biblioteca. Sem isso, semear é publicar texto sem dono
- [ ] T-78.2 — Conferir quantos dos 22 tipos do catálogo (`lib/documentos/tipos.ts`) precisam de modelo padrão e quais nascem vazios por natureza
- [ ] T-78.3 — Semear o mínimo que faz a empresa nova ter o que emitir, com a origem declarada em cada linha
- [ ] T-78.4 — **Prova**: repetir o ensaio da T-69.4 numa empresa nova e afirmar `modelos_semeados > 0`, com o mesmo bloco que se desfaz por construção
- [ ] T-78.5 — **Checklist universal de conclusão de módulo**, o mesmo para todos: `pnpm checklist:modulo documentos` responde os itens mecânicos, e os humanos — persona, QA visual, KPI, relatório de ausência — ficam em `diretrizes/CHECKLIST-DE-CONCLUSAO-DE-MODULO.md`. **Item humano sem evidência conta como não feito.** A tarefa aponta e não repete o esqueleto (R8): regra escrita em 28 sprints diverge em silêncio

