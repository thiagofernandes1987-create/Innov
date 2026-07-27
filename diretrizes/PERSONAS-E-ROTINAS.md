# Personas e rotinas — quem usa a Innovar e o que faz num dia

Documento canônico. Pedido pelo responsável em 27 de julho de 2026, com a
justificativa que o torna obrigatório:

> "por isso te pedi para criar as personas, rotinas, como elas usariam as
> ferramentas, tudo isso baseado no que fazem em outras plataformas"

## Por que este documento existe antes das telas

Sem persona, cada tela é decidida no gosto de quem escreve. Foi exatamente a
crítica registrada na virada da S-23: telas desenhadas por dedução, não por
observação de como o trabalho acontece.

A regra que este documento impõe: **antes de criar tela, dizer qual persona
entra nela, vinda de onde, para resolver o quê, e em quantos cliques.** Tela que
não responde às quatro perguntas não é construída.

As personas saem de três fontes verificáveis, nunca de suposição:

1. as palavras do responsável sobre níveis de acesso, citadas em cada perfil;
2. as 261 capturas de Odoo, que mostram por onde cada papel entra;
3. o fluxo de móveis planejados já modelado em `pipeline_presets`: medição,
   projeto executivo, apresentação, fabricação, entrega, montagem, vistoria de
   finalização, pós-montagem.

## Quadro-resumo

| Persona | Entra por | Pergunta do dia | Módulos |
|---|---|---|---|
| Vendedor / SDR | Funil do CRM | "quem eu preciso tocar hoje?" | CRM, Clientes, Propostas, Orçamentos |
| Projetista | Funil de projetos | "o que trava a fabricação?" | Projetos, Planejamento, Documentos, Qualidade |
| Montador / produção | Diário de campo, no celular | "onde eu vou hoje e o que levo?" | Diário, Tarefas, Contatos, Planejamento |
| Financeiro | Fluxo de caixa | "o que entra e o que sai esta semana?" | Financeiro, Orçamentos, Contratos, Compras |
| Assistência | Funil de chamados | "o que está parado esperando alguém?" | Chamados, Clientes, Tarefas |
| Administrador | Grade de aplicativos | "quem pode o quê?" | Administração, Auditoria |

---

## P1 — Vendedor / SDR

**Palavra do responsável:** "CRM pode ser um pipeline para SDR, um para pré
venda e outro para venda, depois que esse cliente é ganho ele vai para o pós
venda."

Trabalha por volume: muitos contatos, poucos avançam. Mede o dia pelo que moveu
de coluna, não pelo que leu.

**Rotina.** Abre o funil do CRM logo cedo. Olha a coluna de entrada e o que
venceu — atividade agendada para hoje ou atrasada. Liga, registra, agenda o
próximo toque, arrasta o cartão. Ao ganhar, o cliente precisa nascer no pós-venda
sem ninguém redigitar nada.

**Precisa em três cliques:** ligar para o próximo da fila; registrar o que foi
dito; agendar o retorno.

**O que a plataforma já faz:** funil com etapas configuráveis, cartão com
conversa, WhatsApp registrado, atividade agendada aparecendo nas notificações.

**O que falta (S-24):** os três funis separados — SDR, pré-venda e venda — em vez
de um só; criar cliente de dentro do funil, sem sair para o cadastro; a passagem
automática de ganho para o funil de projeto.

---

## P2 — Projetista / engenheiro

**Palavra do responsável:** "um engenheiro precisa ter acesso a mais módulos."

É quem responde pelo prazo. O trabalho dele é sequência com dependência: não se
fabrica antes de aprovar o executivo, não se monta antes de entregar.

**Rotina.** Abre o funil de projetos e procura o que está fora do prazo. Entra
no projeto, confere as datas do marco — as siglas DLA, DPE, DET existem para
isso — e replaneja quando a medição atrasa. Ao mudar uma data, precisa ver o que
mais se desloca em consequência.

**Precisa em três cliques:** ver o que está atrasado; abrir o cronograma do
cliente; mudar uma data e enxergar o efeito nas seguintes.

**O que a plataforma já faz:** funil de projeto com as nove etapas de móveis
planejados, dez códigos de data com natureza e marco, sinalização de prazo no
cartão.

**O que falta (S-24):** o Gantt que o responsável descreveu — "como se fosse um
Project, com datas de início e término, dependências de tarefas, Início-Início,
I-Término, T-T, T-I, dias programados"; e a lista por cliente com etapa atual,
% concluída e próxima tarefa.

---

## P3 — Montador / produção

**Palavra do responsável:** "um cara da produção só precisa ter acesso ao módulo
de diário de campo, contatos, tarefas, planejamento, contato, etc."

**É a persona que define o desenho móvel.** Está em obra, de pé, com uma mão
ocupada, em tela de celular e sinal ruim. Nenhuma outra persona tem essas quatro
restrições ao mesmo tempo.

**Rotina.** De manhã, vê onde vai e o que leva. Na obra, registra o que fez, com
foto. Quando falta peça, abre ocorrência ali mesmo. No fim, marca a tarefa.

**Precisa em três cliques:** o endereço de hoje; registrar foto com legenda;
abrir ocorrência.

**O que a plataforma já faz:** diário de campo com evidência, tarefas, contatos.

**O que falta:** o alvo de toque de 44px como regra e não como correção pontual;
a grade de aplicativos que já respeita nível de acesso precisa ser conferida
nesta tela pequena. Registrado para a varredura da T-24.11.

---

## P4 — Financeiro

**Palavra do responsável:** "o financeiro tem que ter acesso ao financeiro,
contato, tarefas, orçamentos, etc."

Trabalha por data, não por etapa. A pergunta é sempre de calendário.

**Rotina.** Abre o fluxo de caixa. Confere o que vence, o que atrasou e o que foi
medido mas não faturado. Lança, concilia, e responde ao comercial se dá para
fechar.

**Precisa em três cliques:** o que vence esta semana; lançar um recebimento;
ver o contrato por trás de uma parcela.

**O que a plataforma já faz:** lançamentos, fluxo de caixa, medições, contratos.

**O que falta:** calendário como visualização — pela régua da §12.3 do padrão de
interface, o financeiro é o candidato mais forte, porque todo registro dele tem
data própria.

---

## P5 — Assistência técnica

**Palavra do responsável:** "Assistência técnica tem o pipeline próprio."

Herda problema de obra já entregue. O tempo de resposta é o produto.

**Rotina.** Abre o funil de chamados. Vê o que está em "aguardando" — o preset já
separa aguardando disponível de indisponível, porque a diferença é quem está
travando. Agenda vistoria, executa, encerra.

**Precisa em três cliques:** o que está parado há mais tempo; agendar vistoria;
avisar o cliente.

**O que a plataforma já faz:** funil de assistência com as nove etapas, conversa
com WhatsApp registrado.

**O que falta:** criar chamado de dentro do funil; calendário de vistorias.

---

## P6 — Administrador

**Palavra do responsável:** "fica mais fácil criar novos perfis, autorizações e
permissões" e, na revisão, "nem vi a sessão para cadastrar usuários ainda".

Não usa a plataforma para trabalhar: usa para deixar os outros trabalharem.

**Rotina.** Cadastra pessoa, dá o perfil, confere o que ela enxerga. Quando
alguém reclama que não vê um módulo, precisa descobrir o porquê sem abrir o
banco.

**Precisa em três cliques:** cadastrar pessoa; dar perfil; ver a grade de
aplicativos como aquela pessoa vê.

**O que a plataforma já faz:** usuários, perfis e aplicativos por organização,
com RLS no banco e não só na tela.

**O que falta:** o caminho até a tela — o responsável não a encontrou, e ela
existia desde a etapa 12.1. Menu criado na T-23.21; a tela em si ainda precisa
ser conferida contra o padrão (T-24.10). Falta também pré-visualizar o acesso de
outra pessoa sem trocar de sessão.

---

## O que este documento obriga

1. Tela nova declara a persona, a origem, a pergunta e a contagem de cliques.
2. Persona sem rotina escrita não vira permissão nem menu.
3. Quando uma rotina mudar na prática, o documento muda antes do código.
4. A persona P3 tem poder de veto sobre desenho móvel: se não funciona de pé,
   com uma mão e sinal ruim, não está pronto.
