# LEIA PRIMEIRO — mapa de recuperação da Innovar Platform

**Documento canônico:** sim
**Finalidade:** este é o **primeiro arquivo** que qualquer sessão assistida lê, antes de responder qualquer coisa.

Nenhuma decisão desta plataforma vive em conversa. Conversa acaba, contêiner é reciclado, chat novo começa sem memória. O que sobrevive é o que está escrito aqui e nos arquivos que este aponta.

Se você é uma sessão nova: leia este arquivo inteiro, depois `diretrizes/INVENTARIO-DE-EXECUCAO.md`, e só então proponha qualquer coisa.

---

## 0. As três regras que antecedem tudo

### 0.1 Decomposição em micro-problemas

> **Sempre decomponha o problema em problemas micro. Procure soluções simples para resolver cada problema individualmente. Depois construa a solução completa baseada nesse conjunto de soluções simples.**

Vale para desenho, correção, revisão e código. Quando houver aritmética, contagem ou dimensionamento, a decomposição é **executada, não narrada** — PoT, escrever e rodar o cálculo. Número afirmado sem execução é chute.

Detalhe completo: [`METODO-DE-TRABALHO.md`](./METODO-DE-TRABALHO.md).

**E dentro de cada micro-problema, dissecar** — §1.5 do método. Fluxo otimista, **todos** os imprevistos com frequência, `P(dia limpo)` calculado, e para cada imprevisto: o que trava, o que a ferramenta precisa ter naquele momento, qual departamento é afetado, a quem se solicita e em que prazo, e o que fica registrado. Decomposição sem dissecação separa só o caminho que dá certo — e calculado, o caminho feliz de um dia de montagem acontece em **52,9%** das vezes.

### 0.2 Evidência antes de afirmação

Nada é declarado pronto, corrigido ou passando sem a saída do comando que prova. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:python` e os `pnpm validate:*`. Limitação de ambiente é registrada, não contornada com otimismo.

Quando a avaliação for de pessoa, rotina, tela, controle ou processo, a evidência segue também [`CONTRATO-AUDITAVEL-DE-PERSONAS.md`](./CONTRATO-AUDITAVEL-DE-PERSONAS.md). Os únicos resultados permitidos são `PASS`, `FAIL`, `PARTIAL`, `NOT_ASSESSED`, `BLOCKED_EXTERNAL` e `NOT_APPLICABLE`. Campo ou botão existente não prova processo executado; teste não executado nunca passa.

### 0.3 Consultar a memória de problemas antes de resolver

Diante de qualquer erro: consultar [`VACINAS.md`](./VACINAS.md) **antes** de propor correção. Se a causa raiz já foi catalogada, aplicar a solução registrada. Se for inédita, resolver e registrar respondendo às cinco perguntas.

---

## 1. Onde cada coisa está

| Assunto | Arquivo | Quando abrir |
|---|---|---|
| **Como se trabalha** | [`METODO-DE-TRABALHO.md`](./METODO-DE-TRABALHO.md) | sempre, antes de propor |
| **Quem usa e o que sabe** | [`PERSONAS-E-ROTINAS.md`](./PERSONAS-E-ROTINAS.md) | antes de criar tela ou permissão |
| **Como provar autoridade, controle e evidência** | [`CONTRATO-AUDITAVEL-DE-PERSONAS.md`](./CONTRATO-AUDITAVEL-DE-PERSONAS.md) | antes de auditar pessoa, rotina, tela, processo ou controle |
| **O que quebra e a quem se pede socorro** | [`FLUXOS-E-RISCOS.md`](./FLUXOS-E-RISCOS.md) | antes de criar qualquer objeto ou fluxo |
| **Quem fica sabendo, e como** | [`ACOMPANHAMENTO-A-DISTANCIA.md`](./ACOMPANHAMENTO-A-DISTANCIA.md) | ao mexer em notificação, alerta, foto de campo ou portal do cliente |
| **Causa raiz, custo invisível e treinamento** | [`QUALIDADE-CAUSA-RAIZ.md`](./QUALIDADE-CAUSA-RAIZ.md) | ao mexer em qualidade, não conformidade, ocorrência ou plano de ação |
| **Campo próprio, sugestão e documento por modelo** | [`REUSO-DE-INFORMACAO.md`](./REUSO-DE-INFORMACAO.md) | ao criar campo, formulário repetitivo ou geração de documento |
| **O que fazer agora** | [`INVENTARIO-DE-EXECUCAO.md`](./INVENTARIO-DE-EXECUCAO.md) | no início de toda sessão e ao terminar cada tarefa |
| **O que o produto é** | [`SPEC.md`](./SPEC.md) | ao mexer em regra de negócio |
| **Onde o projeto está** | [`ESTADO-ATUAL.json`](./ESTADO-ATUAL.json) | ao precisar de estado verificável |
| **Como está construído** | [`ARQUITETURA.md`](./ARQUITETURA.md) | ao mexer em segurança, autorização ou integração |
| **Objetos dinâmicos e customização** | [`OBJECT-RUNTIME.md`](./OBJECT-RUNTIME.md) | ao mexer em estúdio, objeto, armazenamento dinâmico |
| **Problemas já resolvidos** | [`VACINAS.md`](./VACINAS.md) + `vacinas/` | antes de resolver qualquer erro |
| **Interface** | [`UI-UX-PRO-MAX.md`](./UI-UX-PRO-MAX.md) | em toda tela, componente, estado ou navegação |
| **Módulos, rotas, tabelas** | [`INVENTARIO.md`](./INVENTARIO.md) | ao precisar do inventário técnico atual |
| **Sequência oficial de etapas** | [`ROADMAP.md`](./ROADMAP.md) | ao planejar etapa |
| **Regras de documentação** | [`PADRAO-DOCUMENTACAO.md`](./PADRAO-DOCUMENTACAO.md) | antes de fechar entrega |
| **Reconstruir do zero** | [`RECUPERACAO.md`](./RECUPERACAO.md) | em recuperação de ambiente |

---

## 2. Skills — o que está instalado e quando usar

45 skills versionadas em `.claude/skills`, com procedência e licenças em `.claude/skills/README.md`. **Não são código da plataforma** — estão fora do `eslint` e do `tsc`.

Estas são de acionamento **automático**, sem esperar pedido:

| Skill | Momento |
|---|---|
| `brainstorming` | antes de criar funcionalidade, componente ou comportamento novo |
| `writing-plans` | quando a tarefa tiver múltiplas etapas |
| `executing-plans` | ao executar um plano escrito |
| `test-driven-development` | antes de implementar qualquer coisa |
| `systematic-debugging` | diante de qualquer falha, antes de propor correção |
| `verification-before-completion` | antes de afirmar que algo está pronto |
| `requesting-code-review` | ao concluir tarefa relevante ou antes de PR |
| `receiving-code-review` | ao receber feedback — verificar tecnicamente, nunca concordar sem checar |
| `using-git-worktrees` | quando o trabalho precisar de isolamento |
| `dispatching-parallel-agents` | tarefas independentes — **só mediante pedido explícito** |
| `playwright-cli`, `playwright-trace`, `playwright-component-testing` | teste em navegador, depuração de trace, componente isolado |
| **`ui-ux-pro-max`** | **toda criação ou alteração de interface, sem exceção** |
| `apex-method` | tarefa de várias etapas ou alto risco: decompor → validar → verificar → registrar |

`ui-ux-pro-max` é obrigatória porque sem ela o resultado converge para o template SaaS genérico. Em divergência, [`UI-UX-PRO-MAX.md`](./UI-UX-PRO-MAX.md) prevalece — a skill dá vocabulário, o documento define intenção.

**Não instalados:** CLI do Composio (hosts recusados pela política de rede do ambiente) e a sessão autenticada do NotebookLM (exige `NOTEBOOKLM_AUTH_JSON` na configuração do ambiente — credencial nunca passa pelo chat). Detalhes em `.claude/skills/README.md`.

---

## 3. Vacinas — a memória de problemas

Duas metades, ambas obrigatórias.

**Antes de resolver:** reproduzir → separar sintoma de causa raiz → **consultar o catálogo** → aplicar a solução registrada se já existir. Resolver do zero um problema catalogado gera duas soluções para a mesma causa raiz, e é assim que a base fica incoerente.

**Depois de resolver, se for inédito:** registrar respondendo a cinco perguntas — qual foi o problema, como ocorreu, por que aconteceu, como foi detectado, qual foi a solução.

**Substituição.** Uma vacina pode ser substituída por solução melhor, com dois portões nesta ordem: (1) garantia preservada, eliminatório — a nova cobre a mesma causa raiz com garantia igual ou maior; (2) retorno material — ordem de grandeza ou classe de falha eliminada, não ganho marginal. A comparação é script commitado, não número em documento. **Nunca no mesmo PR da correção que a vacina barrou** — sessão assistida propõe, o responsável decide.

**Uma vacina vence a correção tecnicamente melhor.** Contrariá-la reprova o build de propósito. Precedente: a troca de `--no-frozen-lockfile` por `--frozen-lockfile` na Etapa 20 foi revertida pela VACINA-008 mesmo estando tecnicamente certa.

---

## 4. Object Runtime — a direção do produto

O objetivo declarado é transformar a plataforma em produto customizável e escalável, no espírito do Odoo mas sem a dívida dele: estúdio, plug-and-play, extensão por empresa.

A decisão central, em uma frase: **os 20 aplicativos padrão já cobrem o núcleo, então não é preciso um gerador de aplicações — é preciso um motor de extensão.** O motor não gera código; ele compõe características declaradas que já existem e já foram testadas.

Parâmetros que fixaram a arquitetura: centenas de empresas, até 1000 objetos por empresa, milhões de registros nos poucos objetos de alto volume, **quem cria é o administrador**, e customização só sobre aplicativos padrão que já existem.

Peças do desenho, todas detalhadas em [`OBJECT-RUNTIME.md`](./OBJECT-RUNTIME.md):

- duas camadas de armazenamento atrás de um resolver — compartilhada particionada por inquilino, dedicada para os livros de alto volume;
- colunas-slot com índices parciais fixos, no lugar de estrutura física por objeto: **criar objeto não emite DDL**;
- política única de RLS chamando `has_module_permission`, a mesma das 136 tabelas — objeto nasce protegido, zero linha de segurança nova por objeto;
- extensão dos aplicativos padrão por anexo, nunca por `ALTER TABLE`;
- três costuras baratas agora e caríssimas depois: resolver, leitura separada de escrita, nenhuma consulta cruza `organization_id`.

**Nada disso está implementado.** O documento declara os limites, os riscos e a primeira fatia.

---

## 5. Blueprint e executable spec — origem e situação

O desenho do Object Runtime partiu de dois materiais entregues pelo responsável em arquivo ZIP: um **blueprint** de visão e uma **executable spec** com migrations, OpenAPI, campanha de evidências e POC de carga.

**Situação: não estão no repositório.** Chegaram pelo contêiner da sessão e desaparecem com ele. Enquanto não forem commitados, este parágrafo é a única memória de que existiram — e é por isso que a tarefa de incorporá-los está no inventário de execução.

Defeitos verificados nesse material, que **não** devem ser reproduzidos:

| Defeito | Consequência |
|---|---|
| A evidência empacotada não é reproduzível pelo script empacotado — 90 `PASS` declarados contra 23 `PASS`, 65 `OBSERVED` e 2 `FAIL` na execução real | evidência que não reproduz não é evidência |
| Afirmação de `migrations 0001-0014` desatualizada em relação ao próprio pacote | ledger divergente, exatamente a causa raiz da VACINA-003 |
| `NonceCache` em memória de processo com 2 réplicas, enquanto o OpenAPI promete uso único | promessa que o desenho não cumpre |
| `npx tsc` sem versão fixada | build não reprodutível |
| Piso de versão de Python não declarado | ambiente não reprodutível |
| POC de carga mirando 100 mil registros | uma ordem de grandeza abaixo do requisito real de milhões; aprovaria uma arquitetura que quebra |

O desenho registrado em `OBJECT-RUNTIME.md` corrige cada um desses pontos ou os declara como risco aberto.

---

## 6. Estado do trabalho em andamento

Fonte de verdade operacional: [`INVENTARIO-DE-EXECUCAO.md`](./INVENTARIO-DE-EXECUCAO.md) para sprints e tarefas, [`ESTADO-ATUAL.json`](./ESTADO-ATUAL.json) para estado verificável do repositório.

Não confie neste parágrafo para saber o que fazer agora — confie no inventário de execução, que é atualizado a cada tarefa concluída.

---

## 7. Ordem de leitura para um chat novo

1. `CLAUDE.md` na raiz;
2. **este arquivo**;
3. `diretrizes/INVENTARIO-DE-EXECUCAO.md` — o que fazer agora;
4. `diretrizes/METODO-DE-TRABALHO.md`;
5. `diretrizes/SPEC.md` e `diretrizes/ESTADO-ATUAL.json`;
6. `diretrizes/ARQUITETURA.md`;
7. `diretrizes/OBJECT-RUNTIME.md` quando o assunto for customização;
8. `diretrizes/VACINAS.md` antes de resolver erro;
9. `diretrizes/UI-UX-PRO-MAX.md` quando o assunto for interface;
10. `diretrizes/PERSONAS-E-ROTINAS.md`, `diretrizes/CONTRATO-AUDITAVEL-DE-PERSONAS.md` e `diretrizes/FLUXOS-E-RISCOS.md` antes de criar ou auditar qualquer coisa nova.

Nenhum desses passos depende de memória de conversa, de arquivo temporário de contêiner ou de máquina local. É essa a razão de existir deste diretório.