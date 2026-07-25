# Instruções para desenvolvimento assistido — Innovar Platform

Este arquivo é lido no início de toda sessão assistida neste repositório. As skills citadas estão versionadas em `.claude/skills` (procedência e licenças no README de lá).

## Regra de método — antecede tudo

> **Sempre decomponha o problema em problemas micro. Procure soluções simples para resolver cada problema individualmente. Depois construa a solução completa baseada nesse conjunto de soluções simples.**

Vale para desenho, correção, revisão e código. Problema complexo é um amontoado de coisas simples que ainda não foram separadas; enquanto seguem juntas, nenhuma parte é testável isoladamente, nenhuma falha é atribuível, e a solução converge para o genérico.

Quando houver aritmética, contagem ou dimensionamento, a decomposição é **executada, não narrada**: PoT — escrever e rodar o cálculo. Número afirmado sem execução é chute. Micro-problemas genuinamente independentes podem ser resolvidos em paralelo; dependência entre eles indica que o corte está errado.

O procedimento completo, o protocolo de vacinas e a ordem de leitura para um chat novo estão em [`diretrizes/METODO-DE-TRABALHO.md`](diretrizes/METODO-DE-TRABALHO.md).

## Memória entre sessões

Nenhuma decisão vive em conversa. Um chat novo recupera contexto por: `CLAUDE.md` → `diretrizes/METODO-DE-TRABALHO.md` → `diretrizes/SPEC.md` → `diretrizes/ESTADO-ATUAL.json` → `diretrizes/ARQUITETURA.md` → `diretrizes/OBJECT-RUNTIME.md` → `diretrizes/VACINAS.md` → `diretrizes/UI-UX-PRO-MAX.md`.

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
