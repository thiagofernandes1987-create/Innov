# Índice das referências visuais

Localizado em 2 de agosto de 2026, a pedido do responsável: *"você consegue
localizar os 261 screenshots? eles são as referências das telas dos apps"*.

## O que foi encontrado — e o que não foi

**193 imagens únicas**, contadas por hash SHA-256 depois de remover duplicatas.
Não são 261. O que existe está listado abaixo; **cerca de 68 referências não
estão neste ambiente** e não foram localizadas em lugar nenhum a que esta sessão
tenha acesso.

| Origem | Únicas | Onde estava |
|---|---:|---|
| Capturas do Odoo | 124 | `Fotos_1.zip`, anexo do chat |
| **Comentadas pelo responsável** | **26** | `comentarios_nos_nomes_das_fotos.zip`, anexo do chat |
| Auditoria já versionada | 30 | `artifacts/odoo-audit-2026-07-28/` |
| Avulsas | 13 | anexos soltos do chat |
| **Total** | **193** | 38,8 MB |

### Por que a diferença até 261 importa

Anexo de chat vive fora do repositório e **o contêiner é reciclado**. As 163 que
vieram por anexo existiam apenas no diretório de uploads desta sessão; as ~68
que faltam provavelmente vieram em sessões anteriores, cujos anexos já não
existem. Referência que só existe em anexo é referência que a plataforma perde.

**É por isso que as 26 comentadas foram versionadas agora**, em
`docs/referencias/odoo-comentadas/`: são as de maior valor por byte, porque
carregam a instrução escrita pelo próprio responsável no nome do arquivo.

As outras 167 continuam disponíveis nesta sessão e podem ser versionadas a
pedido — são mais 35 MB, e essa é uma decisão do responsável, não minha.

## Distribuição por módulo

| Módulo | Referências |
|---|---:|
| Não classificado | 52 |
| SAC / Helpdesk | 44 |
| Assinaturas | 39 |
| Compras | 20 |
| CRM | 10 |
| Obras / Projetos | 7 |
| Transversal (padrão de layout) | 7 |
| Início / Aplicativos | 4 |
| Planejamento | 3 |
| Administração | 2 |
| Autenticação | 2 |
| Clientes | 2 |
| Tarefas | 1 |

O desequilíbrio é informação: **helpdesk e assinaturas concentram 83 das 193**,
porque foram os fluxos percorridos com mais profundidade no Odoo. Módulos com
uma ou duas referências não têm alvo visual suficiente, e para eles a régua é o
padrão transversal, não uma tela específica.

## As 26 comentadas — a instrução está no nome do arquivo

Versionadas em [`odoo-comentadas/`](odoo-comentadas/), com
[`indice.json`](odoo-comentadas/indice.json). O responsável escreveu o que
observar no próprio nome; os comentários que mais governam desenho:

- *"repare que sempre tem os mesmos conteúdos padrão, menus, notificação, ícones
  de tipo de visualização, onde acrescenta arquivos, adicionar mais etapas ao
  pipeline, tipos de cards, todos seguem um padrão de layout em todos os
  módulos"*
- *"repare como tudo é padronizado, todas as visualizações tipo kanban, listas,
  onde tem pipeline segue o mesmo padrão, o que você faz para um se aplica a
  quase todos"*
- *"repare os padrões do card, como eles reaproveitam quase tudo do layout e
  acrescentam alguns objetos, porém tudo é parecido e semelhante, só mudam
  algumas coisas conforme a tarefa da pessoa que realiza a atividade e precisa
  de campos específicos"*
- *"Mensagens, Notificações, studio e usuário, campo de escolha de tema deveria
  ficar aqui"*
- *"Padrão em todos cards, mensagens, atividades, notas, whatsapp e ação"*
- *"kanban, lista, calendário, tabela dinâmica, gráfico, localização, tarefas"*
- *"tela inicial dos aplicativos, olha como é colorida e moderna"*
- *"tela inicial projeto, um card por projeto, o restante segue o mesmo padrão"*
- *"adicionar novos cards às etapas e configuração aparece ao passar o mouse por
  cima"*
- *"Criar e editar etapas pipeline, depois você movimenta segurando e arrastando
  o mouse"*
- *"Padrão de criação de novos inputs, publicar, etc"*

Os três primeiros dizem a mesma coisa por ângulos diferentes, e é a regra que
governa o resto: **o layout é um só, e o módulo só acrescenta o que a tarefa
daquela pessoa exige.** Desenhar cada módulo por conta própria contraria a
referência antes de contrariar qualquer preferência estética.

## Fontes que não são usadas

`Odoo1.zip` contém `_OceanofPDF.com_Odoo_19_Development_Cookbook...pdf` — cópia
pirata de livro comercial. **Não é usada como fonte** e não é versionada. A
documentação oficial do Odoo é pública e serve ao mesmo propósito.
