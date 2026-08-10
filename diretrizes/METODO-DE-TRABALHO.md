# Método de trabalho — Innovar Platform

**Documento canônico:** sim
**Aplica-se a:** toda sessão de desenvolvimento assistido, sem exceção.
**Precedência:** este documento define **como** se trabalha. Os demais documentos canônicos definem **o que** se constrói. Em caso de conflito sobre método, este prevalece.

Este arquivo existe para não depender de memória de conversa. Um chat novo, sem histórico nenhum, lê este arquivo e trabalha do jeito certo.

---

## 1. A regra central — decomposição em micro-problemas

> **Sempre decomponha o problema em problemas micro. Procure soluções simples para resolver cada problema individualmente. Depois construa a solução completa baseada nesse conjunto de soluções simples.**

Não é uma preferência de estilo. É a regra de engenharia desta plataforma, e ela é obrigatória antes de qualquer proposta, desenho, correção ou linha de código.

### 1.1 Por que

Problema complexo não é uma coisa difícil. É um amontoado de coisas simples que ainda não foram separadas. Enquanto permanecem juntas, três coisas ruins acontecem:

- não dá para testar nenhuma parte isoladamente;
- não dá para saber qual parte falhou quando o todo falha;
- a solução tende ao genérico — resolve tudo pela metade e nada bem.

Separadas, cada peça vira um problema pequeno com uma solução simples, testável e reaproveitável. E a solução completa passa a ser a composição dessas peças, não uma invenção nova.

### 1.2 O procedimento

```text
1. enunciar o problema em uma frase
2. listar os micro-problemas independentes que ele contém
3. para CADA micro-problema:
     - solução mais simples que funciona
     - por que ela funciona
     - o que a derruba
4. compor a solução completa a partir das soluções simples
5. verificar: a composição resolve o problema da etapa 1?
6. declarar o que ficou de fora e por quê
```

Nenhuma etapa é opcional. A etapa 6 é a mais fácil de pular e a mais cara de omitir.

### 1.3 Sinais de que a regra não foi aplicada

- A proposta tem uma peça grande que "resolve tudo".
- Não é possível dizer qual parte da solução é responsável por qual requisito.
- A justificativa é "é assim que fulano faz".
- A primeira estimativa de esforço é uma faixa larga — sinal de que o problema ainda não foi separado.

### 1.4 Ferramentas de apoio

Quando o problema tiver aritmética, contagem, dimensionamento ou verificação numérica, a decomposição deve ser executada, não narrada:

- **PoT (Program of Thought)** — escrever e rodar o cálculo em vez de estimar de cabeça. Número afirmado sem execução é chute.
- **Paralelismo (ThreadPool, agentes paralelos)** — quando os micro-problemas forem genuinamente independentes, resolvê-los em paralelo. Dependência entre eles é sinal de que a decomposição está errada e precisa de outro corte.
- **Skill `apex-method`** — para tarefas de várias etapas ou alto risco, dá o pipeline de decompor → validar → verificar → registrar.

Subagente só é acionado mediante pedido explícito do responsável.

---

## 1.5 Dissecação — obrigatória antes de criar qualquer coisa

Ditada pelo responsável em 27 de julho de 2026, com a crítica que a motivou:

> "toda vez que for criar uma coisa se especialize ao máximo que conseguir,
> levante todas hipóteses, como as coisas funcionam na realidade, como seriam os
> fluxos, quais seriam os imprevistos, ou seja um fluxo de trabalho otimista, um
> pessimista (o que pode dar de problema, o que poderia realmente atrapalhar uma
> atividade, e se atrapalhasse o que eu precisaria ter disponível na ferramenta,
> quais departamentos isso afetaria e a quem eu precisaria realizar uma
> solicitação para resolver), isso é dissecar o problema, isso é levantar os
> riscos, você continua sendo muito superficial"

A crítica está certa e o defeito era de método: eu vinha listando **o que falta**
em vez de dissecar **o que quebra**. Lista de lacunas descreve a distância até um
caminho feliz; ela nunca produz o campo que só existe porque alguma coisa deu
errado — e é esse campo que decide se a ferramenta serve ou não.

A decomposição da §1.2 continua valendo e vem antes. A dissecação é o que se faz
**dentro de cada micro-problema**, e sem ela a decomposição separa só o caminho
que dá certo.

### 1.5.1 O procedimento

```text
1. fluxo otimista: a atividade do começo ao fim, sem nenhum imprevisto,
   com quem faz, quando, e quanto tempo leva cada passo
2. levantar TODOS os imprevistos daquela atividade, com frequência
   estimada — não os prováveis, todos
3. calcular P(nenhum imprevisto). Se for alta, a lista está incompleta
4. para CADA imprevisto:
     a. o que ele trava, e por quanto tempo
     b. o que a ferramenta precisa ter disponível NAQUELE momento
     c. qual departamento é afetado
     d. a quem se faz a solicitação, e qual é o prazo de resposta dela
     e. o que fica registrado — para quem depois vai perguntar por quê
5. dos passos 4b, extrair os requisitos de dado e de tela
6. dos passos 4c e 4d, extrair as integrações entre módulos
7. declarar o que ficou de fora e por quê
```

O passo 3 é o teste de honestidade da lista. Calculado para um dia de montagem
com oito imprevistos independentes de 4% a 12%: **P(dia limpo) = 52,9%**, e uma
montagem de cinco dias corre sem nenhum imprevisto em **4,1%** das vezes. Quem
projeta só o caminho feliz projeta para metade dos dias e para uma montagem em
vinte e cinco.

### 1.5.2 A pergunta que ninguém faz e que decide o desenho

**"E se der errado, a quem eu peço socorro, e o que acontece enquanto espero?"**

As três partes são requisito, e as três costumam faltar:

- **a quem** — a solicitação tem destinatário nominal e departamento, não vai
  para "o sistema";
- **o que acontece enquanto espero** — o tempo de espera é medido, não estimado
  de memória depois. É o que separa "rendeu menos" de "ficou parado por decisão
  de outro setor";
- **o que fica registrado** — evidência produzida no momento, porque reconstruir
  depois é sempre a versão de quem escreve.

### 1.5.3 Sinais de que a dissecação não foi feita

- O documento tem uma seção "o que falta" e nenhuma tabela de imprevisto.
- Nenhum campo do desenho existe por causa de um erro; todos existem por causa
  de um acerto.
- Não há prazo de resposta em nenhuma solicitação.
- Nenhum departamento além do dono da tela aparece no fluxo.
- A palavra "então" aparece mais que a palavra "se".

### 1.5.4 Onde o resultado mora

Em [`FLUXOS-E-RISCOS.md`](FLUXOS-E-RISCOS.md), canônico, uma dissecação por
persona. `PERSONAS-E-ROTINAS.md` diz o que a pessoa **sabe**;
`FLUXOS-E-RISCOS.md` diz o que acontece quando o dia dela **não** corre como o
previsto.

---

## 2. Evidência antes de afirmação

Nenhuma afirmação de "pronto", "corrigido" ou "passando" sem a saída do comando que prova.

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:python` e os `pnpm validate:*` precisam passar.
- Resultado não verificado é declarado como não verificado, com o motivo.
- Limitação de ambiente é registrada, não contornada com afirmação otimista.

Falha reportada honestamente vale mais do que sucesso presumido. Um relatório que esconde uma falha custa muito mais caro do que a falha.

### 2.1 Portão só existe depois de reprovar

Para **teste, validador ou verificação de CI**, a saída verde não é evidência suficiente — teste que nunca reprovou pode estar medindo nada. Antes de declarar qualquer portão como proteção, quebre de propósito o comportamento protegido e mostre a reprovação, com a diferença medida. O procedimento completo, o que sabotar por tipo de portão e o número que motivou a regra estão em [`PROVA-POR-SABOTAGEM.md`](PROVA-POR-SABOTAGEM.md).

---

## 3. Protocolo de vacinas — memória de problemas

`diretrizes/VACINAS.md` e `diretrizes/vacinas/` não são histórico. São **memória operacional consultável**. O ciclo é obrigatório e tem duas metades.

### 3.1 Antes de resolver — consultar

Diante de qualquer erro, teste quebrado ou comportamento inesperado, **antes** de propor correção:

1. reproduzir o problema;
2. separar sintoma de causa raiz;
3. **consultar o catálogo de vacinas**: essa causa raiz já apareceu?
4. se já apareceu, **aplicar a mesma solução**. Não inventar uma nova. Não "melhorar" a solução registrada sem discutir;
5. se a solução registrada não serve mais, isso é informação relevante — registrar por que deixou de servir.

Pular a consulta e resolver do zero um problema já catalogado é retrabalho e é divergência: duas soluções diferentes para a mesma causa raiz é como a base fica incoerente.

### 3.2 Depois de resolver — registrar

Se o problema for inédito, resolver e então registrar. O registro responde **cinco perguntas**, todas obrigatórias:

| Campo | Pergunta |
|---|---|
| **Qual foi o problema** | o que quebrou, em termos observáveis |
| **Como ocorreu** | a sequência concreta que levou até a falha |
| **Por que aconteceu** | a causa raiz, não o sintoma |
| **Como foi detectado** | teste, CI, auditoria, uso, relato — e por que não foi detectado antes |
| **Qual foi a solução** | o que se fez, e o que impede a reincidência |

E, quando aplicável, os passos que a `VACINA` já exige: varredura dos módulos suscetíveis, correção das ocorrências equivalentes, teste negativo ou validador automático no CI.

### 3.3 Modelo de registro

Arquivo novo em `diretrizes/vacinas/VACINA-NNN-<ASSUNTO>.md`, linha nova na tabela de estado de `diretrizes/VACINAS.md`, no **mesmo PR** da correção.

```markdown
# VACINA-NNN — <assunto>

**Estado:** vigente | parcial | proposta | substituída | revogada
**Detectada em:** <etapa / PR / auditoria>

## Qual foi o problema
## Como ocorreu
## Por que aconteceu
## Como foi detectado
## Qual foi a solução
## Varredura e ocorrências equivalentes
## Prevenção automática
## Limitações da prevenção
```

### 3.4 A vacina vence a correção tecnicamente melhor

Uma vacina é decisão verificada por CI. Contrariá-la reprova o build **mesmo quando a mudança parece tecnicamente correta**. Isso é deliberado.

Precedente registrado: a tentativa de trocar `--no-frozen-lockfile` por `--frozen-lockfile` na Etapa 20 foi revertida porque a VACINA-008 fixa a política transitória. A correção estava tecnicamente certa e mesmo assim foi revertida. Foi a governança funcionando, não falhando.

### 3.5 Substituição de vacina — quando a solução nova é melhor

Catálogo congelado apodrece. Uma vacina pode ter sido a melhor solução com o que se sabia na época e ser a pior hoje. Substituir é permitido — e é assim que se faz.

#### 3.5.1 Os dois portões, nesta ordem

**Portão 1 — garantia preservada. Eliminatório.**

> A solução nova precisa cobrir a **mesma causa raiz** com garantia igual ou maior.

Só quem passa aqui chega ao portão 2. Este portão existe porque o raciocínio de retorno sobre investimento, aplicado a proteção, produz a conclusão errada com aparência de maturidade: *"o risco é baixo, o custo de manter é alto, então vale abrir mão"*. É assim que quase todo incidente evitável nasce. Vacina não é otimização; é a promessa de que uma classe de falha não volta.

**Portão 2 — retorno material.**

Passado o portão 1, decide-se por desempenho, custo, complexidade e manutenção. Com um limiar: **o ganho precisa ser material, não apenas mensurável.** Ordem de grandeza, ou eliminação de uma classe inteira de falha, ou redução real de superfície. Trocar por 5% custa retreino, redocumentação e risco de regressão — a rotatividade tem custo próprio e ele raramente entra na conta de quem propõe a troca.

#### 3.5.2 A prova

Comparar as duas soluções é obrigatório, e o resultado não é um número em documento — é um **script commitado** que qualquer pessoa roda de novo. "Medimos e melhorou 40%" vira folclore em três meses. Mesma cultura dos `validate:*` que já existem no repositório.

O **tipo de evidência** é declarado, porque nem toda vacina é mensurável:

| Tipo | Quando | O que se entrega |
|---|---|---|
| **medida** | há métrica comparável (tempo, custo, consumo, taxa de erro) | bancada comparativa executável, com as duas soluções no mesmo cenário |
| **negativa** | não se pode rodar a versão vulnerável para comparar | teste que prova que a causa raiz continua bloqueada pela solução nova |
| **argumento** | as duas anteriores são impossíveis | raciocínio explícito e revisado — e o peso da decisão sobe, porque não há prova executável |

Exigir medição onde ela é impossível não aumenta o rigor: ensina a fabricar número.

#### 3.5.3 Quando a substituição **não** pode acontecer

> **Nunca no mesmo PR da correção que motivou a vontade de substituir.**

O valor da vacina está em ela vencer o julgamento do momento. Se ela puder ser substituída por quem está sendo barrado por ela, no instante em que está sendo barrado, o guarda-corpo deixa de existir — não por má-fé, mas porque no meio de uma tarefa, sob pressão de terminar, todo mundo acha que a própria solução é melhor, e a justificativa sai convincente.

Portanto: a correção sai conforme a vacina vigente, e a substituição vai para PR próprio, decidido pelo responsável. Sessão assistida **propõe**; não substitui por conta própria.

#### 3.5.4 O registro da substituição

Arquivo novo, com número novo, referenciando a vacina que substitui. A antiga passa a `substituída` e **permanece no repositório** — quem ler daqui a um ano precisa saber por que a cerca estava ali antes de concluir que podia ser removida.

```markdown
# VACINA-NNN — <assunto> (substitui VACINA-MMM)

**Estado:** vigente
**Substitui:** VACINA-MMM — <assunto anterior>
**Tipo de evidência:** medida | negativa | argumento
**Decidida por:** <responsável> em <PR>

## Solução vigente e o que ela garante
## Solução proposta
## Onde começa e onde termina
   Fronteira exata do que muda e do que não muda.
## Como a oportunidade foi detectada
## Por que é melhor
   Mecanismo, não opinião: o que a nova faz que a antiga não fazia.
## Garantia preservada
   Obrigatório. Como se prova que a mesma causa raiz continua coberta.
## Comparação executada
   Script commitado, cenário, dados e resultado das duas soluções.
## Impacto
   Desempenho, custo, complexidade, superfície de segurança, esforço de manutenção.
## O que ela afeta
   Módulos, migrations, workflows, validadores e outras vacinas.
## Custo e plano de migração
## Critério de reversão
   O que faria voltar atrás.
## Limitações da prevenção nova
```

#### 3.5.5 Estados

```text
proposta → vigente → substituída
                   → revogada        (causa raiz deixou de existir; exige justificativa)
```

`substituída` e `revogada` nunca são apagadas. O catálogo é memória, e memória com lacuna é pior do que memória longa.

---

## 4. Skills obrigatórias

O acionamento é automático, no momento indicado, sem esperar pedido. A tabela vive em `CLAUDE.md`, na raiz. Os pontos que não se negociam:

- `brainstorming` antes de qualquer criação de funcionalidade ou comportamento novo;
- `test-driven-development` antes de implementar;
- `systematic-debugging` diante de qualquer falha, antes de propor correção;
- `verification-before-completion` antes de qualquer afirmação de conclusão;
- **`ui-ux-pro-max` em toda criação ou alteração de interface**, sem exceção — é o que impede a plataforma de convergir para o template SaaS genérico. Em divergência, `diretrizes/UI-UX-PRO-MAX.md` prevalece.

---

## 5. Ordem de leitura para um chat novo

Uma sessão sem histórico recupera o contexto nesta ordem:

1. `CLAUDE.md` — skills obrigatórias e regras que antecedem tudo;
2. `diretrizes/METODO-DE-TRABALHO.md` — este arquivo, como se trabalha;
3. `diretrizes/SPEC.md` — o que o produto é;
4. `diretrizes/ESTADO-ATUAL.json` — onde o projeto está agora;
5. `diretrizes/ARQUITETURA.md` — como está construído;
6. `diretrizes/OBJECT-RUNTIME.md` — o motor de objetos dinâmicos, quando o assunto for customização;
7. `diretrizes/VACINAS.md` — o que já deu errado antes;
8. `diretrizes/UI-UX-PRO-MAX.md` — quando o assunto for interface.

Nenhum desses passos depende de memória de conversa, de arquivo temporário de contêiner ou de máquina local. É essa a razão de existir deste diretório.
