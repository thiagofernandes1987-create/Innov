# Reúso de informação: campos próprios, auto-sugestão e documentos por modelo

Documento canônico. Ditado pelo responsável em 2 de agosto de 2026:

> "no campo que puxa os dados dos usuários eu poder criar mais campos, tipo se
> eu quiser adicionar um campo de estimativa para estar pronta a obra para eu
> retornar, nome de Arquiteto ou Engenheiro de um projeto (…) campos que se
> repetem tipo na estrutura do EAP deveria ter uma auto sugestão de
> preenchimento ou acrescentar novas etapas de auto sugestão e isso deveria se
> repetir para todos os módulos que tem esse tipo de reúso de informações (…)
> na proposta deveríamos ter um editor de texto para criar as propostas em Md ou
> doc, o mesmo deveria servir para orçamento (…) se você cria esse módulo ele
> serve para tudo que tiver documentos e eu só inserir dados como
> `{{Cliente_Nome_Completo}}`, `{{Cliente_tel_pessoal}}` (…) estamos deixando
> muita coisa de lado"

## O que já existe — e o que de fato falta

Levantado antes de desenhar, porque metade do pedido já está no banco:

| Pedido | Situação | Onde |
|---|---|---|
| **Vários seguidores** por cartão | **Pronto e funcionando** | `pipeline_card_followers`, com RLS, ações e interface. Verificado no cartão: *"SEGUIDORES 1 · Deixar de seguir"* |
| Modelo de documento com variáveis | **Modelado, sem motor e preso a contrato** | `contract_templates.body_template` + `variables_schema` existem desde a etapa 9; não há renderizador nem uso fora de contrato |
| Campos próprios por objeto | **Desenhado, não implementado** | [`OBJECT-RUNTIME.md`](OBJECT-RUNTIME.md) tem o modelo completo — tipo de campo, característica, classe, slots, resolver. Nenhuma tabela criada |
| Auto-sugestão de valor repetido | **Não existe** | — |

"Estamos deixando muita coisa de lado" está certo, e o diagnóstico é específico:
**o desenho existe e a construção não.** O Object Runtime é documento canônico
desde antes desta sprint e nunca virou migration.

---

## §1 — Campos próprios: o corte mínimo do Object Runtime

O `OBJECT-RUNTIME.md` descreve o motor completo. Ele não vai ser reescrito aqui;
o que falta é **começar**, e começar pequeno o suficiente para entregar valor
antes de o motor inteiro existir.

Os dois exemplos dados — *"estimativa para estar pronta a obra para eu retornar"*
e *"nome de Arquiteto ou Engenheiro de um projeto"* — são reveladores, porque
são de naturezas diferentes:

| Exemplo | Tipo | Por que o tipo importa |
|---|---|---|
| Estimativa de conclusão | **data** | Precisa entrar em filtro "vence em 30 dias" e em alerta. Texto não ordena |
| Arquiteto do projeto | **pessoa ou texto** | Se for pessoa, vira seguidor e recebe notificação; se for texto, é só rótulo |

A pergunta que o usuário não deve precisar responder é "qual tipo?" na forma
técnica. A tela pergunta **o que a informação faz** — "é uma data?", "é uma
pessoa da equipe?", "é um valor em dinheiro?" — e o tipo sai daí.

### Corte mínimo

1. Campo próprio pertence a **um objeto de negócio** (cliente, projeto, cartão,
   chamado), não à tela.
2. Guardado em camada JSONB com definição versionada — a §3 e a §4 do Object
   Runtime já descrevem isso.
3. **Nasce filtrável.** Campo que não entra na busca vira campo que ninguém lê.
4. Campo do tipo pessoa **inscreve como seguidor** quando preenchido: é a
   integração que faz "arquiteto do projeto" valer alguma coisa além de texto.

### O que quebra

| Imprevisto | O que a ferramenta precisa ter | Fica registrado |
|---|---|---|
| Campo criado por engano, já com dado | Arquivar em vez de excluir, preservando o que foi preenchido | Quem criou e quem arquivou |
| Dois usuários criam "Arquiteto" e "arquiteto" | Sugestão de campo existente **antes** de criar, por nome parecido | Tentativa de duplicação |
| Campo de data preenchido com texto livre importado | Validação na promoção, com o valor original preservado | Valor recusado e o motivo |
| Campo vira obrigatório depois de existirem registros sem ele | Obrigatoriedade vale **para frente**; registro antigo não fica inválido de repente | Data em que passou a ser exigido |

---

## §2 — Auto-sugestão: o sistema já sabe o que costuma ser digitado

O pedido é explícito sobre a EAP e explícito sobre generalizar: *"isso deveria se
repetir para todos os módulos que tem esse tipo de reúso de informações"*.

**O princípio:** todo campo cujo valor se repete entre registros é um campo com
vocabulário próprio da organização. "Fundação", "alvenaria", "instalações" não
são texto livre — são o vocabulário daquela construtora, e digitar de novo a
cada obra é onde nasce "Fundação", "fundacao" e "Fundação " com espaço no fim.

### Como funciona

Um catálogo por `(organização, escopo, valor)` com **contagem de uso e último
uso**. Ao digitar, sugere-se o que já foi usado, ordenado por frequência
recente. Aceitar sugestão incrementa; valor novo entra no catálogo.

Escopos iniciais, todos com o mesmo mecanismo:

| Escopo | Exemplo de valor |
|---|---|
| Etapa de EAP | Fundação, Alvenaria, Instalações, Acabamento |
| Etapa de funil | Prospecção, Qualificação, Proposta |
| Marcador de cartão | Urgente, Aguardando cliente |
| Disciplina de documento | Arquitetura, Hidráulica, Elétrica |
| Unidade de medida | m², m³, un, vb |
| Motivo de perda | Preço, prazo, concorrente |
| Motivo de parada | Os oito de `FLUXOS-E-RISCOS.md` |

**E a EAP ganha mais que sugestão de palavra:** ganha sugestão de **conjunto**.
Quem cria a etapa "Fundação" pela terceira vez com as mesmas cinco atividades
embaixo deveria poder trazer as cinco. Isso é o modelo de EAP que o atlas mostra
no Odoo como "modelo de projeto" — 3 das 46 telas do capítulo Projetos.

### O que quebra

| Imprevisto | O que a ferramenta precisa ter |
|---|---|
| Sugestão vira ruído com 300 valores | Ordenar por frequência recente e cortar em 8; digitar filtra |
| Erro de digitação antigo vira sugestão para sempre | Valor usado uma vez só, há mais de 6 meses, sai da lista |
| Uma pessoa polui o catálogo da organização inteira | Sugestão é da organização; **limpar o catálogo** é ação de administrador |
| Sugestão engessa quem precisa de valor novo | Sugestão nunca é obrigatória — é campo de texto com apoio, não lista fechada |

---

## §3 — Documentos por modelo: um motor, todos os módulos

O pedido é o mais claro dos três: *"se você cria esse módulo ele serve para tudo
que tiver documentos e eu só inserir dados como `{{Cliente_Nome_Completo}}`"*.

E está certo em ser um só motor. Proposta, orçamento, contrato, laudo,
declaração e ordem de serviço são o mesmo problema: **texto fixo + dados do
registro**.

### Decisões de desenho

**Markdown como corpo, não editor proprietário.** Markdown é texto: versiona em
diff legível, converte para PDF e para DOCX, e sobrevive à plataforma. O editor
é visual, o que grava é Markdown.

**A variável é escolhida, não decorada.** Ninguém deve memorizar
`{{Cliente_tel_pessoal}}`. O editor tem um painel com as variáveis disponíveis
para aquele escopo, com nome legível e valor de exemplo do registro atual;
clicar insere. Decorar nome de variável é a razão de esse tipo de recurso morrer
sem uso.

**Variável não resolvida aparece, nunca some.** Se `{{Cliente_email_comercial}}`
está vazio, o documento mostra a lacuna marcada — e o envio avisa quantas
lacunas existem. Documento assinado com um buraco em branco onde deveria estar o
valor é pior que documento que não gerou.

**Substituição, nunca execução.** O modelo não roda código: resolve nome de
variável contra um dicionário. Sem expressão, sem laço, sem chamada. Modelo é
dado, e dado que executa é o caminho mais curto para alguém extrair o que não
pode ver.

**O dicionário respeita a RLS.** A variável só resolve o que o usuário que
gerou o documento pode ler. Modelo não é caminho para contornar permissão.

### Nomenclatura das variáveis

O responsável escreveu `{{Cliente_Nome_Completo}}`, `{{Cliente_tel_pessoal}}`,
`{{Cliente_orc_valor1}}`, `{{Cliente_email_comercial}}`. O padrão que se lê daí
é `{{Escopo_campo}}`, e ele é bom: diz de onde o dado vem antes de dizer o que
é. Fixado assim, com escopos do vocabulário da plataforma:

```
{{cliente.nome_completo}}      {{cliente.telefone_pessoal}}
{{cliente.email_comercial}}    {{cliente.documento}}
{{obra.codigo}}                {{obra.endereco}}
{{orcamento.valor_total}}      {{orcamento.validade}}
{{proposta.numero}}            {{empresa.razao_social}}
{{hoje}}                       {{autor.nome}}
```

Ponto em vez de sublinhado entre escopo e campo, porque separa os dois níveis
sem ambiguidade — `cliente.email_comercial` é legível, `Cliente_email_comercial`
faz o leitor adivinhar onde termina o escopo. **O editor aceita as duas formas
na colagem** e normaliza, porque o responsável já escreveu documentos com a
primeira.

### O que quebra

| Imprevisto | O que a ferramenta precisa ter |
|---|---|
| Modelo alterado depois de documento emitido | Documento guarda o **texto resolvido**, não a referência ao modelo. Contrato não pode mudar porque alguém editou o molde |
| Variável apagada do modelo de dados | Validação do modelo lista as variáveis inexistentes **antes** de publicar |
| Documento gerado com lacuna | Contagem de lacunas no envio, e bloqueio para documento que vai para assinatura |
| Modelo de outra organização | Modelo é da organização, sempre; biblioteca compartilhada é cópia, não referência |
| Usuário cola HTML no Markdown | Renderização escapa HTML por padrão |

---

## §4 — Ordem, e por que ela mudou

A proposta original era sugestão primeiro. **O responsável inverteu em 2 de
agosto**, e a justificativa decide:

> "o editor tem que ser uma prioridade para continuar a desenvolver os outros
> módulos que utilizam documentações, como propostas, layouts de mensagens
> padrão, orçamentos, FVS, FVM, um monte de apps dependem desse módulo"

O motor de documento **não é funcionalidade do módulo de propostas** — é
infraestrutura de sete módulos:

| Módulo | O que precisa do motor |
|---|---|
| Propostas | Corpo da proposta com dados do cliente e do orçamento |
| Orçamentos | Layout padrão de envio |
| Contratos | Já tem `contract_templates`, sem motor |
| Aditivos | Mesmo corpo, com o que mudou |
| Qualidade | **FVS e FVM** — verificação de serviço e de material |
| Relacionamento | Mensagem padrão, e-mail e WhatsApp |
| SAC | Resposta padrão e laudo |

Construir esses módulos antes do motor é construir **sete editores para desfazer
depois**. Ordem vigente:

1. **Motor de documento por modelo** — destrava sete módulos.
2. **Auto-sugestão** — barata, entrega sozinha, mas não destrava ninguém.
3. **Campos próprios** — a maior, e a que mais se beneficia das outras duas:
   campo novo já nasce com sugestão e já vira variável de documento.

### O que ainda é decisão do responsável

O formato de saída ficou explicitamente em aberto: *"depois decidimos sobre o
formato dos arquivos para contrato, propostas, e-mails, etc"*. O que este
documento fixa é o **corpo** — Markdown — e a substituição de variáveis. A saída
— PDF, DOCX, HTML de e-mail — é conversão a partir dele, e pode ser decidida sem
refazer o motor. É justamente por isso que o corpo é Markdown e não um formato
de saída: escolher a saída depois continua barato.

## §5 — O que este documento obriga

1. **Nada aqui é construído sem antes conferir o que já existe.** Metade deste
   pedido já estava no banco, e seguidores já funcionavam.
2. **Modelo é dado, não código**: substituição, sem execução, com HTML escapado.
3. **Documento emitido guarda o texto resolvido**, nunca a referência ao molde.
4. **Variável não resolvida é visível**, e vira bloqueio antes da assinatura.
5. **Sugestão nunca é lista fechada** — é apoio, e valor novo sempre passa.
6. **Campo próprio nasce filtrável**, e do tipo pessoa vira seguidor.
7. **O dicionário de variáveis respeita a RLS** de quem gera o documento.
