# Roadmap oficial — Innovar Platform

**Atualizado em:** 20 de julho de 2026

O roadmap segue o estado real da `main` e das branches de etapa explicitamente identificadas. Numerações antigas de documentos externos não prevalecem sobre esta sequência.

## Concluído e consolidado

### Etapa 9 — Comercial, financeiro de orçamento e contratos

- orçamentos;
- propostas;
- contratos;
- aditivos;
- assinatura sandbox;
- portal comercial do cliente;
- RLS, PDFs e auditoria.

### Etapa 10 — Hardening de homologação

- endurecimento de schema e segurança;
- preparação de provisionamento.

### Etapa 11 — Homologação autenticada

- contas de homologação;
- MFA TOTP;
- fluxo E2E comercial/contratual;
- workflow manual protegido.

### Etapa 12 — Gestão de obras e campo

- carteira multiobra;
- EAP e cronograma;
- tarefas;
- recursos e equipes;
- diário;
- documentos e mídias;
- portal da obra.

### Etapa 12.1 — Núcleo modular e acessos

- catálogo plug-and-play;
- perfis;
- capacidades;
- múltiplos perfis;
- escopos;
- overrides;
- administração.

### Etapa 12.2 — Assinatura avançada

- PDF/DOCX;
- conversão;
- editor de campos;
- assinatura, rubrica, foto e anexos;
- PDF final e evidências;
- entrega ao cliente.

### Etapa 13 — Qualidade e formulários

- biblioteca;
- FVS/FVM;
- formulários;
- pesquisas;
- anexos;
- pontuação e revisão.

### Etapa 14 — Compras e suprimentos

- solicitações;
- fornecedores;
- convites seguros;
- cotações;
- mapa comparativo;
- aprovações;
- pedidos;
- recebimentos;
- integração com FVM.

### Etapa 15 — Financeiro operacional

- contas a pagar/receber;
- parcelas;
- aprovações;
- baixas;
- comprovantes;
- medições;
- fluxo de caixa.

### Etapa 16 — Relatórios e indicadores executivos

- painel executivo;
- multiobra;
- financeiro, compras e qualidade;
- metas;
- relatórios salvos;
- snapshots;
- CSV auditado.

### Marco documental — Diretrizes vivas

- SPEC canônica;
- inventário;
- contratos dos módulos;
- arquitetura;
- recuperação;
- histórico;
- validador obrigatório no CI.

## Em execução

### Etapa 17 — Estoque, Inventário e Almoxarifado

**Branch:** `feature/etapa-17-estoque-inventario-almoxarifado`  
**PR:** `#14` — rascunho, sem merge

#### Objetivo

```text
recebimento aceito → entrada → saldo por depósito/obra
→ reserva → saída/entrega → devolução/transferência
→ ajuste/perda → inventário físico → auditoria e indicadores
```

#### Escopo obrigatório

- catálogo de itens;
- categorias e unidades;
- depósitos e localizações;
- saldo por organização, obra, depósito e item;
- entradas vinculadas a recebimentos;
- entradas manuais autorizadas;
- saídas para obra, equipe ou responsável;
- transferências atômicas;
- devoluções;
- perdas, avarias e ajustes;
- reservas;
- estoque mínimo e alertas;
- lote e validade opcionais por item;
- ferramentas e ativos controlados;
- cautela/responsável;
- inventário físico;
- divergências e aprovação;
- histórico de movimentos;
- relatórios e exportação;
- RLS, índices, RPCs e auditoria.

#### Fora da Etapa 17, mas já agendado

As capacidades abaixo pertencem à Etapa 21 e não devem ser antecipadas nesta branch:

- WMS avançado;
- endereçamento automatizado;
- RFID em tempo real;
- ressuprimento automático sem aprovação;
- roteirização logística;
- integração fiscal de entrada;
- depreciação contábil oficial.

#### Definition of Done adicional da Etapa 17

- documentação atualizada no mesmo PR;
- migration aplicada e homologada;
- recebimento de Compras integrado de forma idempotente;
- saldo não editável diretamente;
- movimentos concluídos imutáveis;
- testes de concorrência e saldo;
- isolamento multiempresa e multiobra;
- CI verde.

## Etapas posteriores previstas

### Etapa 18 — Consolidação de CRM, Clientes e SAC

- auditar o que está efetivamente presente na `main`;
- completar domínio persistido;
- unificar histórico do cliente;
- SLAs e ocorrências;
- integração com qualidade e obra.

### Etapa 19 — Auditoria e observabilidade unificadas

- painel transversal;
- busca por ator/entidade/evento;
- retenção;
- alertas de segurança;
- correlação de eventos.

### Etapa 20 — Prontidão de produção

- E2E autenticado completo;
- provider jurídico real;
- revisão jurídica, contábil e LGPD;
- antivírus de anexos;
- pentest;
- backup e restauração testados;
- observabilidade;
- plano de incidentes;
- publicação controlada.

### Etapa 21 — WMS avançado e automação logística, fiscal e patrimonial

**Posição na fila:** após a conclusão da Etapa 20.  
**Dependências:** Etapas 17, 19 e 20 concluídas e estáveis.  
**Documento de planejamento:** `docs/ETAPA-21-WMS-AVANCADO-AUTOMACAO-LOGISTICA.md`.

#### Objetivo

Evoluir o estoque operacional da Etapa 17 para uma camada avançada de gestão de armazéns, automação logística, rastreamento em tempo real e integração fiscal/contábil oficial.

#### Subetapas planejadas

##### 21.1 — WMS avançado

- recebimento dirigido;
- put-away;
- separação;
- conferência;
- expedição;
- ondas e prioridades;
- inventário cíclico;
- regras FEFO/FIFO configuráveis;
- indicadores de produtividade e acuracidade.

##### 21.2 — Endereçamento automatizado

- estrutura zona → corredor → módulo → nível → posição;
- sugestão automática de endereço;
- capacidade volumétrica e peso;
- restrições por item, lote, validade e risco;
- bloqueio de incompatibilidades;
- reendereçamento auditado.

##### 21.3 — RFID em tempo real

- cadastro e ciclo de vida de tags;
- leitores, antenas e zonas;
- eventos de presença e movimentação;
- reconciliação entre leitura física e razão de estoque;
- deduplicação e tolerância a eventos fora de ordem;
- alertas de saída não autorizada.

##### 21.4 — Ressuprimento automático sem aprovação

- políticas explícitas por item, depósito e obra;
- estoque mínimo, máximo, ponto de pedido e lead time;
- execução automática idempotente;
- limites financeiros e operacionais;
- circuit breaker e suspensão manual;
- auditoria integral de cada decisão.

##### 21.5 — Roteirização logística

- coletas e entregas entre depósitos e obras;
- janelas de atendimento;
- capacidade de veículo;
- prioridade e restrições;
- rota planejada versus executada;
- prova de entrega;
- integração futura com telemetria.

##### 21.6 — Integração fiscal de entrada

- importação e validação fiscal de documentos de entrada;
- vínculo entre documento fiscal, pedido, recebimento e movimento;
- idempotência por chave fiscal;
- divergências de quantidade, valor, imposto e fornecedor;
- armazenamento privado do documento;
- trilha de aceite, rejeição e correção;
- revisão fiscal obrigatória antes de produção.

##### 21.7 — Depreciação contábil oficial

- classes patrimoniais;
- vida útil e valor residual;
- métodos de depreciação aprovados pela contabilidade;
- competências e fechamentos;
- baixas, transferências e reavaliações;
- conciliação com o razão patrimonial;
- imutabilidade após fechamento;
- revisão contábil obrigatória.

#### Definition of Done adicional da Etapa 21

- documentação atualizada no mesmo PR;
- migrations aplicadas e homologadas;
- recebimento de Compras e integração fiscal idempotentes;
- saldo e posição de endereço não editáveis diretamente;
- movimentos e eventos concluídos imutáveis;
- testes de concorrência, saldo, endereçamento e duplicidade de eventos;
- testes de falha parcial e recuperação;
- isolamento multiempresa, multiobra e multidepósito;
- reconciliação RFID versus razão de estoque;
- ressuprimento automático com limites, circuit breaker e auditoria;
- revisão fiscal e contábil formal antes de produção;
- CI verde;
- homologação E2E registrada;
- plano de rollback e recuperação atualizado.

#### Restrições de implantação

- não iniciar antes da Etapa 20;
- não habilitar ressuprimento sem aprovação até existirem limites, circuit breaker e testes de concorrência;
- não declarar integração fiscal oficial sem validação legal/fiscal;
- não declarar depreciação oficial sem aprovação contábil;
- RFID não pode substituir o razão imutável de movimentos: eventos físicos alimentam reconciliação e operações autorizadas.

## Regra de alteração do roadmap

Mudança de ordem ou escopo exige atualização conjunta de:

- `diretrizes/SPEC.md`;
- `diretrizes/ROADMAP.md`;
- `diretrizes/INVENTARIO.md`;
- `diretrizes/MODULOS.md`;
- documento técnico da etapa;
- validador documental quando a nova fila ou Definition of Done se tornar obrigatória.
