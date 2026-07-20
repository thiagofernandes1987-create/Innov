# Etapa 16 — Relatórios e Indicadores Executivos

## Objetivo

Implementar o aplicativo modular `relatorios` como uma camada analítica segura sobre os módulos existentes:

`dados autorizados → métricas consolidadas → filtros → dashboards → relatórios exportáveis → snapshots auditáveis`.

## Escopo inicial

- painel executivo consolidado;
- indicadores por obra;
- indicadores financeiros;
- indicadores de compras;
- indicadores de qualidade;
- indicadores de prazo e progresso;
- filtros por organização, obra e período;
- metas e faixas de alerta configuráveis;
- relatórios salvos;
- snapshots imutáveis de indicadores;
- exportação CSV;
- eventos de auditoria;
- aplicativo plug-and-play com permissões próprias.

## Indicadores mínimos

### Executivo

- quantidade de obras ativas;
- valor contratado consolidado;
- valor a receber e a pagar;
- necessidade máxima de caixa;
- progresso médio ponderado;
- obras atrasadas;
- aprovações pendentes;
- não conformidades e respostas rejeitadas;
- compras em atraso;
- satisfação média e NPS.

### Por obra

- previsto x realizado;
- avanço físico;
- desvio de prazo;
- orçamento, compromissos e realizado;
- fluxo de caixa;
- compras e recebimentos;
- FVS/FVM e conformidade;
- documentos e pendências.

## Arquitetura

O aplicativo não lê tabelas internas de outros módulos diretamente na interface. As integrações serão feitas por views e RPCs analíticas com `security_invoker`, respeitando RLS e capacidades efetivas.

As métricas persistidas serão snapshots, não duplicações mutáveis dos dados operacionais.

## Segurança

- módulo `relatorios` habilitado por organização;
- acesso por capacidade e escopo de obra;
- indicadores financeiros exigem `can_view_sensitive`;
- exportação exige `can_export`;
- RLS em configurações, relatórios salvos, snapshots e eventos;
- nenhuma RPC analítica acessível ao papel anônimo;
- snapshots imutáveis depois de concluídos;
- auditoria de criação, execução e exportação.

## Fora desta etapa

- data warehouse externo;
- BI de terceiros;
- cubos OLAP;
- IA generativa de recomendações;
- envio agendado por e-mail;
- relatórios fiscais ou contábeis oficiais;
- dashboards públicos.
