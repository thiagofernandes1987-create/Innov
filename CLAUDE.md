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

## Memória entre sessões

Um chat novo recupera contexto por: `CLAUDE.md` → `diretrizes/LEIA-PRIMEIRO.md` → `diretrizes/INVENTARIO-DE-EXECUCAO.md` → `diretrizes/METODO-DE-TRABALHO.md` → `diretrizes/SPEC.md` → `diretrizes/ESTADO-ATUAL.json` → `diretrizes/ARQUITETURA.md` → `diretrizes/OBJECT-RUNTIME.md` → `diretrizes/VACINAS.md` → `diretrizes/UI-UX-PRO-MAX.md` → `diretrizes/PERSONAS-E-ROTINAS.md` → `diretrizes/FLUXOS-E-RISCOS.md` → `diretrizes/PADRAO-DE-INTERFACE.md`.

## Antes de criar tela

`diretrizes/PERSONAS-E-ROTINAS.md` e `diretrizes/PADRAO-DE-INTERFACE.md` §12 são pré-requisito, não leitura opcional. Toda tela nova declara **qual persona entra nela, vinda de onde, para resolver o quê e em quantos cliques**; e obedece ao mapa das duas barras, que fixa o que fica em cada posição. Tela que não responde às quatro perguntas não é construída — foi assim que telas passaram a ser decididas por dedução em vez de observação, e é a crítica registrada na virada da S-23.

## Regras do inventário de execução

`diretrizes/INVENTARIO-DE-EXECUCAO.md` governa a sequência do trabalho, e as regras são obrigatórias:

- **ler no início** de toda sessão e a cada reinício de serviço;
- **marcar `[x]` no momento** em que a tarefa ou subtarefa termina, com evidência — não acumular checks para o fim;
- **uma sprint por vez**: não iniciar sprint nova antes de concluir a atual;
- **o que é novo vai para o fim**: sprint, oportunidade ou lacuna descoberta entra no final do inventário, nunca no meio;
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
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:python` e os `pnpm validate:*` devem passar antes de qualquer afirmação de conclusão.
- `.claude/skills` é conteúdo de terceiros, fora do eslint e do tsc. Não é código da plataforma.
