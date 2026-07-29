# VACINA-042 — Falha de formulário não apaga contexto

**Estado:** vigente  
**Detectada em:** S-23, criação de obras e projetos, PR #30

## Qual foi o problema

Ao falhar a criação de uma obra ou projeto, a server action redirecionava com a
mensagem técnica do provedor. O usuário perdia todo o preenchimento e precisava
recomeçar sem saber qual campo corrigir. Na mesma tela, falhas de clientes,
responsáveis e contratos eram confundidas com listas vazias.

## Como ocorreu

Os formulários chamavam actions que usavam `redirect` para qualquer erro. O
texto de `error.message` era colocado na URL, e as consultas auxiliares eram
consumidas por `data ?? []` sem preservar o estado de falha. A mutação de banco
também criava a entidade sem garantir o acesso posterior do próprio autor.

## Por que aconteceu

O fluxo foi modelado como uma navegação de sucesso ou fracasso, não como uma
interação recuperável. Validação, indisponibilidade de dependência, autorização
e conflito concorrente foram reduzidos à mesma saída. Além disso, criar o
registro principal foi tratado como suficiente, sem verificar os vínculos de
acesso necessários para continuar o trabalho.

## Como foi detectado

A revisão da fronteira S-23 encontrou `error.message` na tela de nova obra,
consultas auxiliares ignoradas e actions que apagavam o formulário. A inspeção
da RPC mostrou que `GESTOR_OBRAS` e `ENGENHEIRO` podiam criar projetos sem
receber `project_membership`; na conversão de contrato, um engenheiro era
gravado artificialmente como `GESTOR_OBRAS`.

O teste negativo posterior encontrou uma segunda causa: `REVOKE` aplicado apenas
a `authenticated` não removia o `EXECUTE` herdado de `PUBLIC`, portanto as RPCs
antigas continuavam chamáveis apesar da migration aparentar bloqueá-las.

## Qual foi a solução

- formulários passaram a usar `useActionState` e estado estruturado;
- validações por campo acontecem antes da mutação;
- falhas conhecidas recebem mensagens de domínio, sem SQL ou nomes internos;
- o preenchimento permanece no DOM após erro;
- clientes, responsáveis, perfis e contratos têm estados independentes;
- uma dependência indisponível bloqueia apenas a capacidade que depende dela;
- a RPC cria membership para autor e responsável;
- o papel real do ator é preservado, sem elevação implícita;
- regras temporais e de origem também foram protegidas por constraints/RPC;
- portas antigas perderam `EXECUTE` de `PUBLIC`, `anon` e `authenticated`.

## Varredura e ocorrências equivalentes

Foram corrigidas as duas entradas de `/app/obras/novo`: projeto independente e
conversão de contrato. Outras server actions que ainda redirecionam
`error.message` foram inventariadas e permanecem para microblocos posteriores
da S-23; não foram declaradas resolvidas neste PR.

## Prevenção automática

- `tests/project-creation-contract.test.ts` valida entradas normais e negativas;
- `validate:flexible-workflows` exige estado preservado, RPC endurecida,
  membership, separação de dependências e revogação completa das portas antigas;
- replay completo garante que as migrations antigas e novas coexistem;
- teste vivo com associação temporária confirmou `ENGENHEIRO` preservado nas
  duas portas, vínculo do contrato e `can_manage_project`, sempre com `ROLLBACK`;
- lint, typecheck, testes e build são portões obrigatórios do PR.

## Limitações da prevenção

O teste estrutural e os cenários PostgreSQL comprovam contratos de interface,
autorização e banco, mas não substituem um navegador autenticado para conferir
foco, autofill, contraste final e comportamento dos controles nativos. A
validação visual continua dependente de preview navegável; nesta rodada a
Vercel bloqueou novos builds por limite de taxa, e isso deve ser tratado como
bloqueio externo, não como aprovação visual.
