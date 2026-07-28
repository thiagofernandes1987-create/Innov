# Auditoria funcional do Odoo — referência para a Innovar

**Data:** 28 de julho de 2026
**Fonte:** instância autenticada `innovar1.odoo.com`, percorrida no Chrome
**Evidência:** [`artifacts/odoo-audit-2026-07-28/`](../artifacts/odoo-audit-2026-07-28/)

## O que foi verificado

Foram abertas e capturadas 17 superfícies reais: grade de aplicativos, CRM,
Contatos, Vendas, Projetos, Planejamento, Apontamentos, Documentos, Assinaturas,
Compras, Estoque, Qualidade, Contabilidade, Helpdesk, Dashboards, Configurações
e Aprovações.

As capturas foram inspecionadas em cinco folhas de contato. Elas são evidência
de interação e densidade, não licença para copiar a marca do Odoo.

## Padrão transversal confirmado

1. A barra superior identifica o aplicativo e expõe seus menus próprios.
2. A barra de trabalho reúne `Novo`, `Enviar`, `Publicar` ou `Upload` à esquerda,
   busca no centro e visualizações à direita.
3. Coleções oferecem mais de uma visão quando o dado suporta: lista, kanban,
   calendário, Gantt, mapa, tabela dinâmica, gráfico e atividades.
4. Documentos e Assinaturas não escondem o upload em um detalhe: ele é ação
   primária da coleção.
5. Planejamento abre na superfície temporal e permite publicar, filtrar por
   recurso/papel/pedido e alternar visualização.
6. Todo aplicativo operacional oferece caminho para relatório; configuração
   aparece somente quando existe algo real para ajustar.
7. Estados vazios dizem o que criar e mantêm a ação disponível.

## Inventário observado

| Aplicativo Odoo | Menus e funções confirmados |
|---|---|
| CRM | pipeline, atividades, cotações, equipes, clientes, forecast, leads, relatórios e configuração |
| Contatos | lista, kanban, mapa, hierarquia, atividades, etiquetas, segmentos e localidades |
| Vendas | cotações, pedidos, faturamento, produtos, equipes, clientes e relatórios |
| Projetos | projetos, minhas tarefas, todas as tarefas, margens, avaliações, modelos e papéis |
| Planejamento | publicar, Gantt, mapa, lista, kanban, recurso, papel, pedido, análise e configuração |
| Apontamentos | grade, lista, calendário, kanban, tabela dinâmica, gráfico e validação |
| Documentos | upload/arrastar, pastas, kanban/lista, etiquetas, grupos e modelos |
| Assinaturas | upload PDF, modelos, meus/todos documentos, relatórios e campos |
| Compras | nova solicitação, upload, pedidos, fornecedores, produtos, análise e configuração |
| Estoque | recebimento, entrega, fabricação, inventário, sucata, reposição, movimentos e análise |
| Qualidade | visão geral, pontos de controle, inspeções, alertas e análises |
| Contabilidade | clientes, fornecedores, conciliação, auditoria, caixa, demonstrativos e configuração |
| Helpdesk | painel, meus/todos chamados, SLA, equipes, respostas prontas e análises |
| Dashboards | painéis, seções e links de compartilhamento |
| Configurações | usuários, empresas e ajustes agrupados por aplicativo |
| Aprovações | minhas solicitações, fila gerencial, todas, categorias e produtos |

## Lacuna encontrada na Innovar

A Innovar já possuía cronograma, upload documental por obra e assinatura
avançada, porém:

- Planejamento, Tarefas, Diário e Equipes não tinham menu interno;
- Documentos só aceitava upload entrando antes em uma obra;
- Propostas, Contratos e Aditivos eram listas sem ação de criação;
- a rotina automatizada ensaiava cada persona em apenas um aplicativo, embora
  ela utilizasse vários.

O efeito observável era coerente com o relato: a capacidade existia no código,
mas o usuário não conseguia encontrá-la ou completar o fluxo.

## Correção aplicada neste ciclo

| Fluxo | Porta de entrada | Regra de domínio |
|---|---|---|
| Orçamento → proposta | `Propostas > Nova proposta` | orçamento congelado e aprovado; PDF obrigatório; hash SHA-256; liberação opcional ao portal |
| Proposta → contrato | `Contratos > Novo contrato` | somente proposta aceita; preço e origem preservados |
| Contrato → aditivo | `Aditivos > Novo aditivo` | motivo, delta de escopo, valor e prazo antes da execução |
| Arquivo → obra | `Documentos > Enviar arquivo` | obra, código, disciplina, categoria, versão e hash |
| PDF/DOCX → assinatura | `Assinaturas > Novo envio` | arquivo original preservado; PDF processável; signatários, campos e evidências |
| Portfólio → cronograma | `Planejamento > Portfólio` | código da obra abre Gantt, dependências, marcos e baselines |

## Não equivalências deliberadas

- A Innovar não cria uma cópia genérica dos 16 aplicativos do Odoo.
- Ícones de visão só aparecem quando a visão funciona.
- Configuração não é adicionada como link decorativo.
- Contrato não nasce sem aceite; aditivo não altera silenciosamente o original;
  documento não é publicado ao cliente por padrão.

Essas diferenças preservam o vocabulário de obra, a segregação de funções e a
trilha contratual da Innovar.

## Evidência automatizada

- 333 cenários persona × aplicativo;
- 88 destinos de menu, todos resolvidos pelo roteador;
- migration e validadores do estágio 9 aprovados;
- PostgreSQL 16 real confirmou proposta com PDF/hash, privilégio mínimo,
  aceite do cliente, contrato derivado e aditivo encadeado.

## Repetição do loop no preview publicado

A branch publicada foi aberta com sessão autenticada e percorreu os 21
aplicativos operacionais, sem erro de renderização. Em seguida, foram conferidos
os seis fluxos mais críticos: nova proposta, novo contrato, novo aditivo, envio
de documento, novo documento para assinatura e planejamento.

O QA visual encontrou dois defeitos adicionais antes do encerramento:

1. o menu de módulo era recortado no viewport de notebook; corrigido pela
   `VACINA-030`, mantendo todos os destinos no menu compacto;
2. o aviso de formato da assinatura tinha baixo contraste no tema escuro;
   corrigido pela `VACINA-031`, com tokens semânticos de estado.

As capturas `17-innov-proposta-nova.png` a `23-innov-launcher.png` registram o
estado dos fluxos no preview. A transação remota da nova proposta depende da
aplicação da migration no projeto Supabase; o encadeamento foi comprovado
localmente em PostgreSQL 16 e permanece pendente de homologação remota.
