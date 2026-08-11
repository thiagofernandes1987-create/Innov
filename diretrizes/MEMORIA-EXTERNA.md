# Memória externa — a base de conhecimento no Notion

**Documento canônico:** não. É o contrato de uso da memória que sobrevive ao
contêiner.

## O problema que isto resolve

O contêiner é reciclado e o chat novo começa sem memória. O repositório já
resolve parte disso — `diretrizes/` é versionado e sobrevive. Mas ler o
repositório para recuperar contexto custa caro: são mais de 30 documentos
canônicos, 64 vacinas, um inventário com 49 sprints e um mapa de código de
1.806 linhas. Uma sessão que começa lendo tudo gasta a janela de contexto antes
de escrever a primeira linha de código.

A base no Notion existe para uma coisa só: **encontrar o fato sem abrir o
arquivo**, e abrir o arquivo já sabendo o que procurar.

## Onde fica

| Página | Para quê |
| --- | --- |
| [INNOV — Base de Conhecimento](https://app.notion.com/p/3b947a93b89681dd8275d2e3c6be84f7) | raiz |
| [Partida a frio — leia isto primeiro](https://app.notion.com/p/3b947a93b8968165b4c1fc0cbf897b47) | o que uma sessão nova lê antes de tudo |
| Conhecimento INNOV (base de dados) | os verbetes, filtráveis por Tipo, Módulo e Estado |

Workspace: `Espaço de Thiago Fernandes`. Acesso pelo conector Notion.

## A regra que mantém isto útil

> **O repositório é a fonte canônica. O Notion é o índice.**

Verbete que **repete** o conteúdo do repositório envelhece e passa a mentir.
Verbete que **aponta** para ele, carregando o número medido e a data da
medição, continua verdadeiro mesmo depois que o código muda — porque declara
*quando* foi medido.

Quando um número da base não bate mais com o repositório, **o repositório
ganha**, e o verbete é atualizado, não apagado. A divergência entre os dois é
informação: diz o que mudou e desde quando.

## O que cada verbete carrega

| Campo | Regra |
| --- | --- |
| Verbete | o fato, não o assunto. "56 páginas de detalhe, 6 com histórico", não "sobre histórico" |
| Tipo | Vacina, Decisão, Módulo, Persona, Portão, Achado, Pendência, Travessia, Métrica, Fonte externa |
| Evidência medida | **o número, com unidade.** Verbete sem número é opinião com aparência de fato |
| Fonte no repo | o caminho onde se confirma |
| Estado | vigente, pendente, bloqueado, superado |
| Medido em | a data — é o que impede o verbete de mentir depois |

## O que **não** entra

- **Cópia de código.** O repositório versiona; cópia diverge em silêncio.
- **Segredo, token, credencial ou dado de cliente.** A base é externa ao
  repositório e ao controle de acesso dele.
- **Texto longo sem número.** Se não dá para medir, provavelmente ainda não é
  conhecimento — é impressão.

## Como uma sessão usa

1. Lê **Partida a frio**.
2. Consulta a base pelo assunto, filtrando por Tipo e Módulo.
3. Diante de erro: procura em `Tipo = Vacina` **antes** de diagnosticar. São 64
   causas-raiz catalogadas; se a sua está lá, a solução também está.
4. Só então abre o arquivo apontado.
5. Ao terminar, volta e registra o que mediu, com data.

## O que foi semeado em 11/08/2026

| Tipo | Quantidade |
| --- | --- |
| Vacina | 64 |
| Achado | 5 |
| Decisão | 5 |
| Pendência | 3 |
| Travessia | 3 |
| Portão | 2 |
| Módulo | 2 |
| Métrica | 1 |
| Fonte externa | 1 |
| **Total** | **86** |

As travessias e os módulos entraram por amostra — 3 das 6 travessias e 2 dos 25
módulos. Completá-los é trabalho de quem passar por eles, não de um mutirão: o
verbete escrito no momento em que se mexe no assunto sai com o número medido de
verdade; o escrito em mutirão sai com o número copiado.

## Limitação honesta

Isto **não é uma rede neural** e não muda o modelo. É um índice com disciplina
de recuperação. O que ele entrega é o que foi pedido — recuperação rápida,
economia de janela de contexto e memória que sobrevive ao contêiner — e entrega
porque é curto, datado e apontado, não porque é inteligente.

O ganho real só aparece se a etapa 5 acontecer. Base que ninguém alimenta vira
retrato de um dia, e retrato de um dia envelhece pior que documento nenhum,
porque parece atual.
