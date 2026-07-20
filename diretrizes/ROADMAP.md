# Roadmap oficial — Innovar Platform

**Atualizado em:** 20 de julho de 2026

O roadmap segue o estado real da `main`, do Supabase e das branches explicitamente documentadas.

## Concluído e consolidado

### Etapas 9 a 11 — Comercial, contratos e homologação inicial

- orçamentos, propostas, contratos e aditivos;
- assinatura inicial e portal comercial;
- preparação do Supabase e homologação autenticada da base.

### Etapa 12 — Gestão de obras

- clientes e múltiplas obras;
- EAP, cronograma, tarefas e baselines;
- equipes, diário, documentos e portal do cliente.

### Etapa 12.1 — Núcleo modular

- catálogo plug-and-play;
- perfis, capacidades, escopos e overrides;
- administração e dashboard por acesso.

### Etapa 12.2 — Assinatura avançada

- PDF/DOCX;
- campos de assinatura, rubrica, nome, data, foto e anexos;
- hashes, evidências e entrega.

### Etapa 13 — Qualidade

- documentos;
- FVS e FVM;
- formulários internos e para clientes;
- pesquisas, anexos e revisão.

### Etapa 14 — Compras e Suprimentos

- fornecedores convidados;
- solicitações, cotações e mapa comparativo;
- aprovações, pedidos, recebimentos e FVM.

### Etapa 15 — Financeiro Operacional

- contas a pagar e receber;
- parcelas, aprovações e liquidações;
- medições, comprovantes e fluxo de caixa.

### Etapa 16 — Relatórios Executivos

- dashboards multiobra;
- metas e alertas;
- snapshots e exportação auditada.

### Etapa 17 — Estoque, Inventário e Almoxarifado

**Estado:** incorporada à `main` e homologada estruturalmente no Supabase.

Entregas:

- catálogo, unidades, categorias, depósitos, localizações e lotes;
- razão imutável de movimentos;
- saldos físico, reservado e disponível derivados;
- integração idempotente com recebimentos de Compras;
- reservas e consumo por obra;
- ativos, custódias e manutenção;
- inventário físico e ajustes;
- RLS, isolamento multiempresa/multiobra e custos mascarados;
- 18 tabelas, seis views e 101 FKs indexadas.

Pendência antes da publicação externa:

- E2E autenticado com contas reais de homologação. O ambiente atual está vazio e o teste não será falsificado com identidades artificiais.

## Próxima etapa funcional

### Etapa 18 — Consolidação de CRM, Clientes e SAC

Objetivos planejados:

- consolidar cadastro e histórico do cliente;
- tratar lead → oportunidade → cliente → obra → pós-venda;
- unificar ocorrências, chamados e comunicação;
- eliminar duplicidade entre CRM, clientes e SAC;
- aplicar as mesmas regras de módulos, acesso, auditoria e documentação.

A Etapa 18 só deve iniciar após o PR `#15` registrar e consolidar a homologação da Etapa 17.

## Fila posterior

### Etapa 19 — Auditoria e observabilidade unificadas

- trilha transversal;
- correlação de eventos;
- alertas técnicos e operacionais;
- health checks e diagnóstico.

### Etapa 20 — Prontidão de produção

- segurança e LGPD;
- backups e restauração;
- provider jurídico real;
- antimalware;
- pentest e observabilidade;
- checklist de publicação.

### Etapa 21 — WMS avançado e automação logística

Planejado, não implementado:

- endereçamento automatizado;
- RFID;
- ressuprimento automático;
- roteirização;
- integração fiscal;
- depreciação patrimonial oficial.

## Regra de avanço

Nenhuma etapa é concluída sem:

- código e migrations versionados;
- documentação canônica atualizada;
- CI verde;
- homologação aplicável;
- evidências e limitações registradas;
- recuperação possível exclusivamente pelo repositório e backups declarados.
