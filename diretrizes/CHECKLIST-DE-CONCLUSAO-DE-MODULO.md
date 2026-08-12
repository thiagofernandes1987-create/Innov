# Checklist de conclusão de módulo — o mesmo para todos

**Documento canônico:** sim.
**Escrito em:** 11 de agosto de 2026, por crítica do proprietário.
**Relatório:** `pnpm checklist:modulo <chave>`

---

## 1. Por que este documento existe

A crítica foi direta:

> *"nas sprints temos os checklist, e tem coisas que são idênticas para todos,
> exemplo: todos os bancos de dados estão linkados? todas as chamadas foram
> realizadas? todos os campos foram calculados? o app é responsivo e passou no
> teste do QA? todos os menus estão habilitados? alguma chamada ou função
> esquecida ou não referenciada? todos os KPIs e relatórios foram criados? o
> teste de utilização com as personas demonstrou alguma oportunidade de melhoria
> ou correção? (…) por isso não temos os checklist"*

Ela está certa, e o diagnóstico dela é preciso. Ao escrever a definição de
pronto do `equipes`, eu produzi **um texto sob medida para aquele módulo**. O
próximo módulo geraria outro texto, sob medida de novo. Trinta e sete Marcos,
trinta e sete listas escritas do zero — e é exatamente por isso que nunca houve
checklist: **o que se escreve do zero a cada vez não é lista, é redação**.

Existe um esqueleto **idêntico para todo módulo**. Ele é este documento. O que
varia por módulo é pouco, e mora em `MODULOS.md`, no contrato daquele módulo.

**E isto não é perfumaria.** Foi a segunda parte da crítica, e ela também está
certa: cada item deste checklist é uma boa prática que **já tinha sido acordada**
e que eu deixei de aplicar por não estar em lugar nenhum que se lê antes de
trabalhar. Onde o item nasceu de um defeito real, a vacina que o originou está
citada ao lado dele — e é por isso que ele existe. Contraste, objeto sobreposto,
alvo de toque e RLS não estão aqui por elegância: estão porque cada um já passou
por toda a bateria verde e chegou à tela ou ao banco.

Por isso este documento é **canônico** e entra na ordem de leitura de
`LEIA-PRIMEIRO.md` e do `CLAUDE.md`. Boa prática que não é lida antes de
trabalhar não é praticada — e foi exatamente o que aconteceu.

## 2. A segunda razão, que é pior

Metade destas perguntas **já tem portão pronto** no repositório. São 49
validadores. E nenhum deles responde a pergunta que decide um Marco:

> *este módulo está pronto?*

Todos respondem globalmente — *"nenhum export morto no projeto"*, *"todos os
menus têm página"*. Um módulo pode estar oco com a bateria inteira verde, e foi
o que aconteceu: o RH passou por cinco portões verdes sem que nenhum usuário o
alcançasse.

`pnpm checklist:modulo <chave>` faz a pergunta por módulo. Ele **não aprova**
módulo nenhum: responde o que é mecânico e deixa explícito o que ninguém mediu.

---

## 3. O checklist

Cada item diz **quem responde**. `⚙` é medido por ferramenta; `👤` exige alguém
olhando — e item `👤` sem evidência registrada conta como não feito.

### 3.1 Existência — o módulo é alcançável?

| | Item | Quem responde |
| --- | --- | --- |
| ⚙ | Chave declarada no `MODULE_REGISTRY` | `validate:modulos-semeados` |
| ⚙ | Semeado em `app_modules` — sem isto o módulo não existe para nenhum usuário | `checklist:modulo` [1] |
| ⚙ | Pasta de rota existe | `checklist:modulo` [2] |
| ⚙ | Bloco de menu declarado | `validate:modulos-semeados` |
| ⚙ | **Migrations do módulo aplicadas no banco**, não só presentes no repositório | `validate:migrations-applied` |

### 3.2 Dado — os bancos estão ligados?

| | Item | Quem responde |
| --- | --- | --- |
| 👤 | Tabelas do módulo **declaradas** em `tabelas-por-modulo.json` — não é dedutível, é decisão de desenho | declaração |
| ⚙ | Toda tabela do módulo tem RLS e isolamento por organização | `validate:stage9`, `validate:migrations` |
| ⚙ | **Nenhuma tabela órfã** — criada e nunca lida | auditoria de superfícies |
| ⚙ | **Nenhuma coluna morta** — sem escritor e sem leitor | `checklist:modulo` [6] |
| ⚙ | Toda função `security definer` que recebe organização confere participação | `validate:definer-com-guarda` |

### 3.3 Chamada — alguma função esquecida?

| | Item | Quem responde |
| --- | --- | --- |
| ⚙ | Toda RPC do módulo tem **chamador** no produto | auditoria de superfícies |
| ⚙ | Toda RPC do módulo tem **teste** | auditoria de superfícies |
| ⚙ | Nenhum export sem importador | `validate:exports-mortos` |
| ⚙ | Nenhuma server action inalcançável | `validate:server-actions`, `audit:reachability` |
| ⚙ | Toda variável de ambiente lida em runtime está documentada | auditoria de superfícies |

### 3.4 Cálculo — os campos foram calculados?

| | Item | Quem responde |
| --- | --- | --- |
| ⚙ | **Nenhum número exibido sem entrar em cálculo nenhum** | `checklist:modulo` [7] |
| 👤 | Todo número derivado tem a **fórmula declarada**, e não é digitado | revisão |
| 👤 | **Ausência é distinguível de zero** — campo não informado nunca vira `0` numa conta | revisão |
| 👤 | Valor que muda no tempo tem **vigência**; corrigir não reescreve período fechado | revisão |

> O item do topo nasceu de um defeito real: `hourly_cost` era digitado, guardado
> e **exibido formatado como moeda** em duas tabelas desde 19/07/2026, sem entrar
> em conta nenhuma. Parecia que o produto tinha custo de mão de obra. Não tinha.

### 3.5 Navegação — os menus estão habilitados?

| | Item | Quem responde |
| --- | --- | --- |
| ⚙ | Todo destino de menu tem página | `validate:menus` |
| ⚙ | **Menu majoritariamente próprio** — não é anel de atalhos para o vizinho | `checklist:modulo` [4] |
| 👤 | Nenhum item de menu foi criado **antes** da página que ele promete | revisão |

> Cinco módulos têm menu com 17% a 20% de destinos próprios. `planejamento`,
> `tarefas`, `diario` e `equipes` têm **o mesmo menu**: cada um aponta para si e
> para os outros três. O menu disfarça a ausência de profundidade oferecendo
> saída para o vizinho.

### 3.6 Interface — passou no QA visual?

**Nada aqui é perfumaria: cada linha existe porque um defeito real passou por
todas as ferramentas e chegou à tela.** A vacina ao lado é o defeito que a
originou.

| | Item | Quem responde | Nasceu de |
| --- | --- | --- | --- |
| ⚙ | **Sem transbordo horizontal** — a página não rola de lado em nenhum dos três breakpoints | `qa:visual` | **VACINA-044**: grade de faixa única sem `minmax(0, …)` não encolhe |
| ⚙ | **Contraste medido nos dois temas**, não amostrado de referência | `qa:contraste` | **VACINA-043**: cor tirada da referência escura virou texto invisível no claro |
| ⚙ | **Alvo de toque** medido no elemento que responde ao toque, não na caixa | `validate:module-qa` | **VACINA-046**: o medidor reprovava a caixa de marcar em vez do rótulo |
| 👤 | **Nenhum objeto sobreposto ou cortado** nos três breakpoints, conferido na captura | captura publicada | VACINA-062 |
| 👤 | **Conteúdo interno não corta** — o pior caso é o que **não** produz rolagem lateral, e por isso nenhuma ferramenta acusa | captura publicada | **VACINA-024**: conteúdo cortava sem causar overflow global |
| 👤 | **Navegação não some** em nenhuma largura sem oferecer modo equivalente | captura publicada | **VACINA-019** e **VACINA-030**: menu escondido e recortado na largura intermediária |
| ⚙ | Estado (foco, erro, selecionado) usa **token de fundo e de primeiro plano juntos**, nunca um fixo com o outro variável | `qa:contraste` | **VACINA-031** |
| 👤 | **Tema claro e escuro** conferidos na captura, no mesmo viewport e persona | VACINA-062 | tom fixo do tema claro deixava número branco sobre fundo claro |
| 👤 | Estados de **vazio, erro e carregamento** existem em toda tela | revisão | tela que só foi desenhada com dado bom |

### 3.6.1 Segurança do dado — a RLS existe mesmo?

Separado do resto de propósito: é o item cujo defeito **não aparece na tela**, e
por isso é o que mais passa despercebido.

| | Item | Quem responde | Nasceu de |
| --- | --- | --- | --- |
| ⚙ | Toda tabela do módulo tem `enable row level security` **e** `force row level security` | `validate:stage9` | política que existia e não era forçada para o dono |
| ⚙ | Privilégio perigoso revogado — `truncate`, `trigger`, `references` | `validate:migrations-applied` | **VACINA-059**: 213 tabelas concediam `TRUNCATE` a `anon` e `authenticated`, e `TRUNCATE` **não passa por RLS** |
| ⚙ | `security definer` que recebe organização confere participação | `validate:definer-com-guarda` | **VACINA-065**: sete funções escreviam em empresa alheia |
| 👤 | Guarda de imutabilidade olha o que a linha **é**, não só o valor novo | revisão | **VACINA-061**: trocar `source_key` tornava editável o custo oficial da CAIXA |

### 3.6.2 Formulário — o que a pessoa digitou sobrevive?

**Este bloco não existia até 11/08/2026, e a ausência dele era o maior buraco do
checklist.** Todo módulo tem formulário, e três causas-raiz distintas já foram
catalogadas sobre exatamente a mesma coisa: o formulário perdendo o que alguém
acabou de digitar. Nenhuma tem portão.

| | Item | Quem responde | Nasceu de |
| --- | --- | --- | --- |
| 🤖 | **Texto longo volta igual ao que foi digitado** — sem CRLF, sem diferença invisível | `pnpm validate:crlf-normalizado` + `tests/formulario-campos.test.ts` | **VACINA-048**: `textarea` chega com CRLF e nunca bate com o que está na tela |
| 🤖 | **Seleção sobrevive à volta da server action** — é o DOM que o formulário envia, não o estado do React | `pnpm validate:campo-controlado` | **VACINA-051**: `select` controlado perde a seleção na volta |
| 🤖 | **`Escape` fecha o menor contexto aberto**, nunca o formulário inteiro | `pnpm validate:escape-uma-camada` | **VACINA-054**: `Escape` com sugestão aberta descartava o preenchimento todo |
| 👤 | **Falha de gravação preserva o que foi preenchido** e diz o que corrigir | revisão | **VACINA-042**: falha de formulário apagava o contexto |
| 👤 | Campo obrigatório é conferido **no servidor**, não só no `required` | revisão | POST montado à mão grava qualquer coisa |

### 3.6.3 Schema e tipo — a consulta bate com o banco?

| | Item | Quem responde | Nasceu de |
| --- | --- | --- | --- |
| ⚙ | Nenhuma consulta pede coluna que não existe no schema real | tipos gerados do Supabase | **VACINA-036**: consulta presumia coluna convencional ausente |
| 👤 | Valor textual não alimenta coluna `enum` sem tipo explícito | revisão | **VACINA-035**: `CASE` textual em coluna enum |
| ⚙ | Nenhuma função herda `EXECUTE` de `PUBLIC`/`anon` | `validate:stage9` | **VACINA-004** |

### 3.6.4 Alçada e procedência — quem pode, e de onde veio o número?

| | Item | Quem responde | Nasceu de |
| --- | --- | --- | --- |
| 👤 | **Quem aprova não é quem executou** — permissão de aprovar não é independência | revisão | **VACINA-034** |
| ⚙ | Alçada existe no **servidor**, não só na interface | `validate:operational-qa` | **VACINA-041** |
| 👤 | Todo dado de fonte externa carrega **origem, data-base e coerência conferida** | revisão | **VACINA-038** |
| 👤 | Atualização de referência externa **não altera o histórico** já apurado | revisão | **VACINA-039** |

### 3.7 Persona — o teste de uso apontou algo?

| | Item | Quem responde |
| --- | --- | --- |
| ⚙ | Contrato de persona registrado | `validate:personas-audit` |
| 👤 | Cada tela responde às **quatro perguntas**: qual persona, vinda de onde, para resolver o quê, em quantos cliques | `PERSONAS-E-ROTINAS.md` |
| 👤 | **Teste de utilização executado**, com os achados registrados — inclusive os que viraram tarefa | evidência |
| 👤 | Fluxo de exceção percorrido, não só o caminho feliz | `FLUXOS-E-RISCOS.md` |

### 3.8 Leitura — os KPIs e relatórios foram criados?

| | Item | Quem responde |
| --- | --- | --- |
| 👤 | KPIs do módulo declarados, cada um com **a pergunta que responde** | `KPIS.md` |
| 👤 | Definição do número **legível ao usuário**, não só ao código | revisão |
| 👤 | Existe ao menos um **relatório de ausência** — o que *não* aconteceu, não só o que aconteceu | `CONFRONTO-ODOO-19-E-INNOV.md` §4.3 |

### 3.9 Prova — dá para confiar?

| | Item | Quem responde |
| --- | --- | --- |
| ⚙ | Bateria completa verde: `lint`, `typecheck`, `test`, `test:python`, **todos** os `validate:*` | CI |
| 👤 | Todo portão novo **visto reprovando** e restaurado | `PROVA-POR-SABOTAGEM.md` |
| 👤 | Vacina registrada para toda causa-raiz inédita encontrada no caminho | `VACINAS.md` |
| ⚙ | Documentação atualizada no mesmo PR | `validate:docs` |

---

## 4. Como usar

1. Ao **abrir** o Marco de um módulo: rodar `pnpm checklist:modulo <chave>` e
   declarar as tabelas dele. O relatório é o retrato do ponto de partida.
2. Ao **escrever a definição de pronto** em `MODULOS.md`: registrar apenas o que
   é **específico daquele módulo**. Conforme a **R8**, não repetir nada deste
   documento — regra repetida em dois lugares diverge em silêncio.
3. Ao **conferir o Marco** na virada de sprint (**R9**): percorrer este checklist
   inteiro. Item `👤` sem evidência conta como não feito.

---

## 5. De onde vieram os itens — a varredura das vacinas

Este checklist não foi inventado. Ele saiu de uma pergunta do proprietário —
*"o que das vacinas ou erros que cometemos são comuns em todos os Marcos e
poderiam virar testes ou checklist?"* — respondida por varredura executada sobre
o catálogo inteiro em 11/08/2026.

**A medição:**

| | Quantidade |
| --- | ---: |
| Vacinas catalogadas | **67** |
| Já com portão citado (validador, CI ou `qa:*`) | **33** |
| **Sem portão nenhum** | **33** |

**A classificação das 33 sem portão** — e esta parte é juízo, não medição:

| | Quantidade | O que são |
| --- | ---: | --- |
| **Universais** | **20** | reaparecem em qualquer módulo, porque a causa é um padrão de raciocínio e não uma funcionalidade |
| Específicas | 12 | presas a um contexto — SINAPI, login, bootstrap, runner Python, assinatura |

As 20 universais, por família, e onde cada uma entrou:

| Família | Vacinas | Onde entrou |
| --- | --- | --- |
| **Formulário** | V048, V051, V054 | **§3.6.2 — bloco que não existia** |
| Interface | V019, V024, V030, V031, V043, V044, V046, V062 | §3.6 |
| Banco e schema | V004, V035, V036, V061 | §3.6.1 e §3.6.3 |
| Regra de negócio | V034, V038, V063 | §3.6.4 |
| Processo | V022, V027 | §3.7 e §3.9 |

**O maior buraco era o formulário.** Todo módulo tem formulário, e **três
causas-raiz distintas** já haviam sido catalogadas sobre exatamente a mesma
coisa — o formulário perdendo o que a pessoa acabou de digitar — sem que
nenhuma virasse item de conferência de módulo. Era o único grupo com três
ocorrências e zero cobertura.

**Quais dessas dariam teste automatizado**, e não só item de conferência:

| Vacina | Teste que a fixaria |
| --- | --- |
| V048 | enviar `textarea` com `\r\n` e afirmar que volta normalizado — **feito na T-73.2**, com portão em `validate:crlf-normalizado` |
| V051 | campo controlado ancorado no DOM — **feito na T-73.3**, em `validate:campo-controlado` |
| V054 | `Escape` no elemento barra a propagação — **feito na T-73.4**, em `validate:escape-uma-camada` |
| V036 | consultas conferidas contra as colunas reais — **feito na T-73.5**, em `validate:colunas-existentes` |
| V004 | validador SQL de `EXECUTE` herdado, irmão do `validate:definer-com-guarda` — **feito na T-73.1**, em `validate:execute-revogado` |

Os quatro primeiros valem por módulo; o último é global e vale uma vez.

**Feitos na S-73, e os quatro respondem por módulo.** Cada portão ganhou
`--escopo <caminhos>` e `--json`, e `pnpm checklist:modulo <chave>` chama **o
mesmo arquivo que o CI chama** — a detecção não é reimplementada em lugar
nenhum, porque regra escrita em dois lugares diverge em silêncio.

O escopo de um módulo é a pasta da rota **mais o que as páginas dela importam**,
um salto: server action, componente e `lib`. É aresta de import, não palpite.
Sem isso o CRM — que tem `<textarea>` em três telas — respondia *"nada a
conferir"* nos portões de formulário, porque a ação que recebe o texto mora em
`app/actions/relationship.ts`. Responder "nada" sobre um módulo cheio do
construto é pior que não responder: aprova por ausência de medição.

A saída distingue três estados, e a distinção é o ponto:

| O que aparece | O que significa |
| --- | --- |
| `N conferido(s), sem pendência` | o módulo tem o construto e ele está coberto |
| `nada a conferir neste módulo` | o módulo não tem o construto — não é aprovação, é ausência |
| `N PENDÊNCIA(S)` | com arquivo e linha, e o portão global reprova junto |

Provado por sabotagem: tirar a âncora de um campo do formulário de proposta
aparece em `propostas`, **não** aparece em `crm`, e reprova o portão global no
mesmo commit.

## 6. O que este documento ainda não faz

- **Não reprova.** É relatório e disciplina, não portão. Transformar os itens `⚙`
  em reprovação por módulo exige a declaração de tabelas de todos os módulos, e
  ela é preenchida um módulo por vez — em mutirão sairia chutada.
- **O item [7] tem imprecisão conhecida.** A busca por uso em cálculo é pelo
  **nome da coluna** em todo o código, não por tabela. Duas tabelas com a mesma
  coluna se confundem, e o resultado erra para o lado de **acusar demais**, nunca
  de menos. Preferi assim: falso positivo incomoda até alguém olhar; falso
  negativo é silêncio que parece aprovação.
- **Só `equipes` tem tabelas declaradas** em 11/08/2026. Os outros 24 saem com os
  itens de dado como "não apurável", que é a verdade, e não como aprovados.


---

## 9. Como o checklist chega às sprints — desde 12/08/2026

O documento existia e **não era cobrado de ninguém**. Medido no dia em que o
proprietário perguntou: **28 sprints apontavam para um Marco de módulo e zero
citavam o checklist**.

A cobrança entrou no `validate:inventory`, e é por **ponteiro, não por cópia**:
toda sprint aberta cujo Marco é de módulo carrega uma tarefa com
`pnpm checklist:modulo <chave>` e o link para este arquivo. Repetir os nove
blocos em 28 sprints seria a R8 ao contrário — regra escrita em 28 lugares
diverge em silêncio.

Sprint `concluída` é isenta: fechou antes de o checklist existir, e reabrir
tarefa em sprint fechada reprovaria a R7. Falsificar o passado para satisfazer
uma regra nova é pior que registrar que ela nasceu depois — quatro sprints estão
nessa condição (S-34, S-38, S-40 e S-41).

Provado por sabotagem: sprint de módulo sem a tarefa reprova, sprint nova de
módulo nasce reprovando, e sprint que não é de módulo continua isenta.
