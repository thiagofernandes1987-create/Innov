# Roadmap oficial — Innovar Platform

**Atualizado em:** 20 de julho de 2026

O roadmap segue o estado real da `main`. Numerações antigas de documentos externos não prevalecem sobre esta sequência.

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

## Próxima etapa

## Etapa 17 — Estoque, Inventário e Almoxarifado

### Objetivo

Implementar o fluxo:

```text
recebimento aceito → entrada → saldo por depósito/obra
→ reserva → saída/entrega → devolução/transferência
→ ajuste/perda → inventário físico → auditoria e indicadores
```

### Escopo obrigatório

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

### Fora da Etapa 17

- WMS avançado;
- endereçamento automatizado;
- RFID em tempo real;
- ressuprimento automático sem aprovação;
- roteirização logística;
- integração fiscal de entrada;
- depreciação contábil oficial.

### Definition of Done adicional

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

## Regra de alteração do roadmap

Mudança de ordem ou escopo exige atualização conjunta de:

- `diretrizes/SPEC.md`;
- `diretrizes/ROADMAP.md`;
- `diretrizes/INVENTARIO.md`;
- `diretrizes/MODULOS.md`;
- documento técnico da etapa.
