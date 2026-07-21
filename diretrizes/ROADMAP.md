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

- documentos, FVS e FVM;
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

**Estado:** código incorporado à `main`; banco homologado funcionalmente; CI integral verde; PR `#15` pronto para revisão e aguardando decisão explícita de merge.

Entregas:

- catálogo, unidades, categorias, depósitos, localizações e lotes;
- razão imutável de movimentos;
- saldos físico, reservado e disponível derivados;
- recebimento de Compras integrado de forma idempotente;
- reservas e consumo por obra;
- ativos, custódias e manutenção;
- inventário físico e ajustes;
- RLS, isolamento multiempresa e multiobra e custos mascarados;
- advisory locks por posição de estoque;
- 18 tabelas, seis views e 101 FKs indexadas;
- zero RPC operacional acessível por `anon`.

Evidências concluídas:

- bootstrap organizacional;
- entrada, reserva, consumo e reversão idempotentes;
- saldo disponível e bloqueio de saldo negativo;
- segunda saída sobre saldo insuficiente recusada;
- imutabilidade de movimentos postados;
- inventário físico contabilizado;
- RLS com duas identidades e organizações temporárias;
- dados da outra organização ocultos;
- leitura direta de custo bloqueada;
- dados artificiais revertidos;
- advisors revisados;
- CI verde e PR liberado para revisão.

Pendência antes da publicação externa:

- teste de carga com duas conexões realmente simultâneas. O conector não conseguiu abrir a segunda sessão sem credenciais explícitas; a arquitetura de lock e o cenário de disputa sequencial foram validados.

#### Definition of Done adicional

- documentação atualizada no mesmo PR;
- migration aplicada e homologada;
- recebimento de Compras integrado de forma idempotente;
- saldo não editável diretamente;
- movimentos concluídos imutáveis;
- testes de concorrência e saldo;
- isolamento multiempresa e multiobra;
- CI verde.

## Próxima etapa funcional

### Etapa 18 — Consolidação de CRM, Clientes e SAC

Objetivos planejados:

- consolidar cadastro e histórico do cliente;
- tratar lead → oportunidade → cliente → obra → pós-venda;
- unificar ocorrências, chamados e comunicação;
- eliminar duplicidade entre CRM, clientes e SAC;
- aplicar as mesmas regras de módulos, acesso, auditoria e documentação.

A Etapa 18 só deve iniciar após decisão explícita sobre o merge do PR `#15`. Nenhum merge será executado automaticamente.

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
- teste concorrente simultâneo do estoque;
- checklist de publicação.

### Etapa 21 — WMS avançado e automação logística

Planejado, não implementado:

- WMS avançado;
- endereçamento automatizado;
- RFID em tempo real;
- ressuprimento automático sem aprovação;
- roteirização logística;
- integração fiscal de entrada;
- depreciação contábil oficial.

## Regra de avanço

Nenhuma etapa é concluída sem:

- código e migrations versionados;
- documentação canônica atualizada;
- CI verde;
- homologação aplicável;
- evidências e limitações registradas;
- recuperação possível exclusivamente pelo repositório e backups declarados.
