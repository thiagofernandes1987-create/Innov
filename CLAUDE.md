# Instruções para desenvolvimento assistido — Innovar Platform

Este arquivo é lido no início de toda sessão assistida neste repositório.

As skills citadas mais abaixo ainda **não estão versionadas neste ramo**: a cópia com procedência e licenças vive em `.claude/skills` e chega por entrega separada. Até lá, a tabela vale como contrato de quando acionar cada skill, não como garantia de que ela está instalada.

## Antes de responder qualquer coisa

Leia, nesta ordem, **antes** de propor ou executar:

1. [`diretrizes/LEIA-PRIMEIRO.md`](diretrizes/LEIA-PRIMEIRO.md) — mapa de tudo: skills, vacinas, blueprint, executable spec, Object Runtime e ordem de leitura.
2. [`diretrizes/INVENTARIO-DE-EXECUCAO.md`](diretrizes/INVENTARIO-DE-EXECUCAO.md) — marcos, sprints e tarefas. É onde está **o que fazer agora**.

Isto não é sugestão de cortesia. Nenhuma decisão desta plataforma vive em conversa: contêiner é reciclado e chat novo começa sem memória. Quem não lê esses dois arquivos trabalha sem contexto e refaz o que já foi decidido.

## Regra de método — antecede tudo

> **Sempre decomponha o problema em problemas micro. Procure soluções simples para resolver cada problema individualmente. Depois construa a solução completa baseada nesse conjunto de soluções simples.**

Vale para desenho, correção, revisão e código. Problema complexo é um amontoado de coisas simples que ainda não foram separadas; enquanto seguem juntas, nenhuma parte é testável isoladamente, nenhuma falha é atribuível, e a solução converge para o genérico.

Quando houver aritmética, contagem ou dimensionamento, a decomposição é **executada, não narrada**: PoT — escrever e rodar o cálculo. Número afirmado sem execução é chute. Micro-problemas genuinamente independentes podem ser resolvidos em paralelo; dependência entre eles indica que o corte está errado.

O procedimento completo, o protocolo de vacinas e a ordem de leitura para um chat novo estão em [`diretrizes/METODO-DE-TRABALHO.md`](diretrizes/METODO-DE-TRABALHO.md).

## Regra de método — dissecação, dentro de cada micro-problema

> **Antes de criar qualquer coisa: fluxo otimista, todos os imprevistos com frequência, e para cada um — o que trava, o que a ferramenta precisa ter naquele momento, qual departamento é afetado, a quem se solicita e em que prazo, e o que fica registrado.**

Decomposição sem dissecação separa só o caminho que dá certo. Lista de "o que falta" descreve a distância até um caminho feliz; ela nunca produz o campo que só existe porque alguma coisa deu errado — e é esse campo que decide se a ferramenta serve.

Teste de honestidade da lista de imprevistos: calcular `P(nenhum imprevisto)`. Se der alto, a lista está incompleta. Calculado para um dia de montagem: **52,9%**; para uma montagem de cinco dias, **4,1%**.

Procedimento em [`diretrizes/METODO-DE-TRABALHO.md`](diretrizes/METODO-DE-TRABALHO.md) §1.5; resultado por persona em [`diretrizes/FLUXOS-E-RISCOS.md`](diretrizes/FLUXOS-E-RISCOS.md).

## Regra de método — portão só existe depois de reprovar

> **Teste, validador ou verificação de CI que nunca foi visto reprovando não foi provado. Antes de declarar qualquer portão como proteção: quebre de propósito o comportamento protegido, mostre a reprovação com a diferença medida, restaure e mostre a aprovação.**

Verde não é evidência de que o portão mede alguma coisa. O extrator de PDF devolvia **730 pedaços e 24.924 caracteres** para um arquivo de ~1.800 e passava pela bateria inteira, porque a asserção perguntava se o texto *continha* uma âncora — e continha, ao lado de 23.000 caracteres de lixo.

Procedimento, o que sabotar por tipo de portão e os números que motivaram a regra em [`diretrizes/PROVA-POR-SABOTAGEM.md`](diretrizes/PROVA-POR-SABOTAGEM.md).

## Linguagens — nenhuma entra sem ADR

[`diretrizes/MAPA-TECNOLOGICO.md`](diretrizes/MAPA-TECNOLOGICO.md) é canônico e normativo: define qual linguagem responde por qual camada, para que módulo novo não nasça na linguagem que parecer conveniente. A execução segue a **estratégia de fases da §36**, não big bang.

A §37 é inegociável: **nenhuma linguagem nova entra no repositório sem uma ADR** com os doze itens que ela lista — problema, alternativas, por que a stack atual não atende, impacto operacional, de CI/CD, de segurança, de manutenção e de vibecoding, estratégia de testes, de rollback, proprietário arquitetural e critério de remoção.

O documento traz, ao lado do texto original, a **medição executada** contra cada afirmação que dependia de medição, incluindo as duas inconsistências internas dele (§21 contra §33) e o estado de cada fase.

## Memória entre sessões

**Antes de abrir arquivo, consulte o índice.** A base de conhecimento no Notion
existe para achar o fato sem gastar janela de contexto lendo `diretrizes/`
inteiro — [Partida a frio](https://app.notion.com/p/3b947a93b8968165b4c1fc0cbf897b47)
primeiro, depois a base `Conhecimento INNOV`, filtrando por Tipo e Módulo.
Diante de erro, procure em `Tipo = Vacina` **antes** de diagnosticar.

O contrato de uso está em [`diretrizes/MEMORIA-EXTERNA.md`](diretrizes/MEMORIA-EXTERNA.md),
e a regra que o governa é uma só: **o repositório é a fonte canônica, o Notion é
o índice**. Quando os dois divergirem, o repositório ganha e o verbete é
atualizado. Quem mede algo novo registra lá, com o número e a data.

Um chat novo recupera contexto por: `CLAUDE.md` → `diretrizes/LEIA-PRIMEIRO.md` → `diretrizes/INVENTARIO-DE-EXECUCAO.md` → `diretrizes/CHECKLIST-DE-CONCLUSAO-DE-MODULO.md` → `diretrizes/CONFRONTO-ODOO-19-E-INNOV.md` → `diretrizes/IA-OPERADORA.md` → `diretrizes/METODO-DE-TRABALHO.md` → `diretrizes/SPEC.md` → `diretrizes/ESTADO-ATUAL.json` → `diretrizes/ARQUITETURA.md` → `diretrizes/OBJECT-RUNTIME.md` → `diretrizes/VACINAS.md` → `diretrizes/UI-UX-PRO-MAX.md` → `diretrizes/PERSONAS-E-ROTINAS.md` → `diretrizes/FLUXOS-E-RISCOS.md` → `diretrizes/PADRAO-DE-INTERFACE.md` → `diretrizes/MAPA-TECNOLOGICO.md` → `diretrizes/PROVA-POR-SABOTAGEM.md`.

## Antes de criar tela

`diretrizes/PERSONAS-E-ROTINAS.md` e `diretrizes/PADRAO-DE-INTERFACE.md` §12 são pré-requisito, não leitura opcional. Toda tela nova declara **qual persona entra nela, vinda de onde, para resolver o quê e em quantos cliques**; e obedece ao mapa das duas barras, que fixa o que fica em cada posição. Tela que não responde às quatro perguntas não é construída — foi assim que telas passaram a ser decididas por dedução em vez de observação, e é a crítica registrada na virada da S-23.

## Regras do inventário de execução

`diretrizes/INVENTARIO-DE-EXECUCAO.md` governa a sequência do trabalho, e as regras são obrigatórias:

- **ler no início** de toda sessão e a cada reinício de serviço;
- **marcar `[x]` no momento** em que a tarefa ou subtarefa termina, com evidência — não acumular checks para o fim;
- **uma sprint por vez**: não iniciar sprint nova antes de concluir a atual;
- **o Marco é a unidade de conclusão** — quase sempre *"finalizar o módulo X"* — e a **sprint é o conjunto de tarefas** para chegar lá;
- **o que é novo vai para o fim do arquivo e declara o seu `Marco:`**. A posição física protege o foco (não se para a sprint em curso); o rótulo protege a coerência. Tratar as duas como a mesma coisa foi a causa medida da dispersão: **4,5 sprints por módulo em média**, 17 de 25 módulos em 4 sprints ou mais;
- **o Marco não fecha com sprint aberta apontando para ele**: ao terminar uma sprint, antes de começar a próxima, confere-se o Marco — se sobrou algo pendurado nele, decide-se a ordem e o que precisa ser destravado. Um passo de cada vez, módulo por módulo;
- **a conferência do Marco segue um checklist único**, igual para todos os módulos, em `diretrizes/CHECKLIST-DE-CONCLUSAO-DE-MODULO.md` — existência, dado, chamada, cálculo, navegação, QA, persona, KPI e prova. `pnpm checklist:modulo <chave>` responde os itens mecânicos; item humano sem evidência conta como não feito. Definição de pronto de módulo **não repete** esse esqueleto: registra só o que é específico dele;
- **tarefa aponta, não descreve**: a lógica do módulo mora em `diretrizes/CONFRONTO-ODOO-19-E-INNOV.md`, e a tarefa aponta para lá. Regra repetida em dois documentos diverge em silêncio;
- **a ordem pode mudar apenas na virada de sprint**, e toda reordenação é registrada com justificativa — pré-requisito descoberto ou sprint que vira base reaproveitável para as seguintes.

`pnpm validate:inventory` reprova sprint concluída com tarefa em aberto e mais de uma sprint em andamento.

Antes de resolver qualquer erro, consultar `diretrizes/VACINAS.md`: se a causa raiz já foi catalogada, aplicar a solução registrada. Se for inédita, resolver e registrar respondendo às cinco perguntas — qual foi o problema, como ocorreu, por que aconteceu, como foi detectado e qual foi a solução.

## Skills de uso obrigatório

Estas não são sugestões. Devem ser acionadas nos momentos indicados, sem esperar pedido.

| Skill | Quando |
| --- | --- |
| `brainstorming` | Antes de criar funcionalidade, componente ou comportamento novo. Explorar intenção e requisito antes de escrever código. |
| `writing-plans` | Quando a tarefa tiver múltiplas etapas. O plano fica escrito e revisável antes de tocar em código. |
| `executing-plans` | Ao executar um plano escrito, com pontos de revisão. |
| `test-driven-development` | Antes de implementar funcionalidade ou correção. Teste primeiro. |
| `systematic-debugging` | Diante de qualquer falha, teste quebrado ou comportamento inesperado — antes de propor correção. |
| `verification-before-completion` | Antes de afirmar que algo está pronto, corrigido ou passando. Rodar o comando e mostrar a saída. Evidência antes da afirmação. |
| `requesting-code-review` | Ao concluir tarefa relevante ou antes de abrir PR. |
| `receiving-code-review` | Ao receber feedback de revisão. Verificar tecnicamente antes de implementar; concordar sem checar não é aceitável. |
| `using-git-worktrees` | Quando o trabalho precisar de isolamento da árvore atual. |
| `dispatching-parallel-agents` e `subagent-driven-development` | Quando houver tarefas independentes — respeitando a regra de só usar subagente mediante pedido explícito. |
| `playwright-cli` e `playwright-trace` | Ao testar a aplicação em navegador ou depurar teste E2E a partir de trace. |
| `playwright-component-testing` | Ao testar componentes React isolados. |
| **`ui-ux-pro-max`** | **Em toda criação ou alteração de interface: página, componente, estado, navegação, formulário, tabela, dashboard ou portal.** |

## Precedência da diretriz de interface

`ui-ux-pro-max` é obrigatória para impedir que a plataforma pareça um template SaaS genérico — sem ela, o resultado converge para o default de mercado.

Em caso de divergência, **`diretrizes/UI-UX-PRO-MAX.md` prevalece**. Ele é documento canônico do produto e define os princípios: precisão de engenharia, organização de obra, confiança operacional, rastreabilidade e acabamento de alto padrão. A skill entra para dar vocabulário concreto — paleta, tipografia, espaçamento, movimento — ao que o documento define como intenção.

`ui-styling` e `design-system` complementam quando o trabalho envolver componentes `shadcn`/Radix ou arquitetura de tokens.

## Regras do repositório que antecedem qualquer skill

- `diretrizes/` é fonte canônica. `diretrizes/vacinas/` registra decisões verificadas por CI: contrariar uma vacina reprova o build, mesmo quando a mudança parece tecnicamente correta. Consultar antes de alterar configuração de CI, instalação de dependência ou privilégio de banco.
- Nenhuma etapa é concluída sem código, migrations, testes, documentação, vacinas, homologação e CI compatíveis.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:python` e **todos** os `pnpm validate:*` devem passar antes de qualquer afirmação de conclusão. São 51 validadores; rodar um subconjunto e declarar a bateria verde já custou caro — foi um dos 46 não executados que pegou o defeito.
- Dois deles medem população, não caso isolado, e por isso o número só pode cair: `pnpm validate:exports-mortos` (export sem nenhum importador — o equivalente ao `U1000` do `staticcheck`, sem trocar de linguagem) e `pnpm validate:assercoes` (teto de asserção fraca). Débito aceito vive datado em `diretrizes/EXPORTS-MORTOS-ACEITOS.json` e `diretrizes/ASSERCOES-FRACAS-ACEITAS.json`, com motivo — nunca em regex silenciosa.
- `.claude/skills` é conteúdo de terceiros, fora do eslint e do tsc. Não é código da plataforma.
