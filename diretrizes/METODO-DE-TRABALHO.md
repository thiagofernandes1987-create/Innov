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

## 2. Evidência antes de afirmação

Nenhuma afirmação de "pronto", "corrigido" ou "passando" sem a saída do comando que prova.

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:python` e os `pnpm validate:*` precisam passar.
- Resultado não verificado é declarado como não verificado, com o motivo.
- Limitação de ambiente é registrada, não contornada com afirmação otimista.

Falha reportada honestamente vale mais do que sucesso presumido. Um relatório que esconde uma falha custa muito mais caro do que a falha.

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

**Estado:** aplicada | parcial | proposta
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

Se uma vacina precisa mudar, ela muda de forma transversal — vacina, validador, workflows e documentação no mesmo PR — e a mudança é decisão do responsável, não da sessão assistida.

Precedente registrado: a tentativa de trocar `--no-frozen-lockfile` por `--frozen-lockfile` na Etapa 20 foi revertida porque a VACINA-008 fixa a política transitória. A correção estava tecnicamente certa e mesmo assim foi revertida. Foi a governança funcionando, não falhando.

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
