# Índice das referências visuais

Localizado em 2 de agosto de 2026, a pedido do responsável: *"você consegue
localizar os 261 screenshots? eles são as referências das telas dos apps"*.

## As 261 estão no atlas, não soltas

Primeira resposta desta sessão foi **errada por busca incompleta**: eu contei
193 imagens únicas espalhadas em anexos e disse que ~68 não existiam. O
responsável corrigiu — *"está nos zips"* — e estavam: as 261 são os objetos de
imagem embutidos em **`Odoo19_Atlas_Visual_Comentado.pdf`**, dentro de
`Ebook_Odoo_2.zip`.

O próprio atlas se descreve: *"Menus, funcionalidades e 261 telas reais
explicadas uma por uma"*, *"12 módulos organizados por capítulo"*, *"telas
fornecidas pelo usuário + documentação oficial Odoo 19"*.

**Lição de método:** contar o que está solto e concluir que o resto não existe é
concluir a partir da própria varredura, não a partir do material. Arquivo
composto — PDF, zip aninhado — precisa ser aberto antes de qualquer contagem.

## O que foi versionado

| Conjunto | Telas | Onde |
|---|---:|---|
| **Atlas comentado, completo** | **261** | [`atlas-odoo/`](atlas-odoo/) + [`catalogo.json`](atlas-odoo/catalogo.json) |
| Comentadas no nome do arquivo | 26 | [`odoo-comentadas/`](odoo-comentadas/) |
| Auditoria anterior | 30 | `artifacts/odoo-audit-2026-07-28/` |

O atlas tem 13,3 MB e substitui a contagem anterior como fonte canônica. As 26
comentadas continuam porque trazem instrução escrita pelo responsável que o
atlas não tem.

## Cada tela vem com o que observar

O atlas não é álbum: cada captura tem módulo, caminho de menu, quando usar, o
que observar e a ação típica. **As 261 têm os quatro campos preenchidos.**
Exemplo, de `catalogo.json`:

```json
{
  "arquivo": "crm-001.jpg",
  "modulo_innovar": "crm",
  "onde_fica": "CRM > Vendas > Meu funil",
  "o_que_observar": "Kanban, busca, filtros e indicadores ajudam a organizar o funil."
}
```

Isso muda o loop de QA: cada módulo passa a ter alvo visual **com critério
escrito**, em vez de "parecer com a captura".

## Distribuição por módulo da Innovar

| Módulo | Telas |
|---|---:|
| Assinaturas | 52 |
| Obras / Projetos | 46 |
| Administração (Studio e Configurações) | 39 |
| Clientes / Contatos | 29 |
| CRM | 27 |
| Compras | 25 |
| SAC / Central de Ajuda | 24 |
| Tarefas / Compromissos | 14 |
| Transversal (Discuss, Calendário) | 4 |
| Início / Aplicativos | 1 |

O desequilíbrio é informação. **Assinaturas, Obras e Administração concentram
137 das 261** — são os fluxos percorridos com mais profundidade. Módulos sem
tela própria — Financeiro, Estoque, Orçamentos, Propostas, Qualidade, Diário,
Relatórios, Auditoria, Equipes — **não têm alvo visual**, e para eles a régua é
o padrão transversal, nunca uma tela inventada.

## A regra que as referências repetem

Três capturas comentadas dizem a mesma coisa por ângulos diferentes:

- *"repare que sempre tem os mesmos conteúdos padrão, menus, notificação, ícones
  de tipo de visualização, onde acrescenta arquivos, adicionar mais etapas ao
  pipeline, tipos de cards, todos seguem um padrão de layout em todos os
  módulos"*
- *"repare como tudo é padronizado (…) o que você faz para um se aplica a quase
  todos"*
- *"reaproveitam quase tudo do layout e acrescentam alguns objetos (…) só mudam
  algumas coisas conforme a tarefa da pessoa que realiza a atividade"*

**O layout é um só; o módulo acrescenta apenas o que a tarefa daquela pessoa
exige.** Desenhar cada módulo por conta própria contraria a referência antes de
contrariar qualquer preferência estética.

Outras que fixam decisão: *"Mensagens, Notificações, studio e usuário, campo de
escolha de tema deveria ficar aqui"*; *"kanban, lista, calendário, tabela
dinâmica, gráfico, localização, tarefas"*; *"Padrão em todos cards: mensagens,
atividades, notas, whatsapp e ação"*.

## Fontes que não são usadas

`Odoo1.zip` contém `_OceanofPDF.com_Odoo_19_Development_Cookbook...pdf` — cópia
pirata de livro comercial. **Não é usada como fonte e não é versionada.** A
documentação oficial do Odoo é pública e serve ao mesmo propósito. O atlas é
outra coisa: foi montado sobre as telas do próprio responsável.
