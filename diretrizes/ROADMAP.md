# Roadmap oficial — Innovar Platform

**Versão atual:** 0.17.0  
**Atualizado em:** 20 de julho de 2026

O roadmap segue o estado real do repositório e do Supabase. Planejamento não é tratado como funcionalidade entregue.

## Etapas consolidadas

- Etapa 9 — comercial, orçamentos, propostas, contratos e aditivos;
- Etapa 10 — hardening de homologação;
- Etapa 11 — homologação autenticada da base comercial;
- Etapa 12 — gestão de obras e campo;
- Etapa 12.1 — núcleo modular e acessos;
- Etapa 12.2 — assinatura avançada;
- Etapa 13 — qualidade, FVS, FVM e formulários;
- Etapa 14 — compras e suprimentos;
- Etapa 15 — financeiro operacional;
- Etapa 16 — relatórios e indicadores executivos.

## Etapa 17 — Estoque, Inventário e Almoxarifado

**Estado:** implementada na `main` e homologada tecnicamente.  
**Produção:** não liberada.

### Entregas

- catálogo e unidades;
- depósitos e localizações;
- lotes e validade;
- movimentos e reversões;
- saldo físico, reservado e disponível derivados;
- importação idempotente de recebimentos;
- reservas e consumo;
- ativos, custódias e manutenção;
- inventário físico;
- RLS e custos mascarados;
- advisory locks;
- isolamento multiempresa e multiobra;
- interface responsiva;
- documentação e recuperação.

### Homologação concluída

- 18 tabelas com RLS;
- seis views `security_invoker`;
- 18 migrations alinhadas ao ledger remoto;
- 14 testes transacionais aprovados com `ROLLBACK`;
- correção de reversão de saldo;
- correção de depósito exclusivo por obra;
- CI do branch original verde.

### Definition of Done adicional

- documentação atualizada no mesmo PR;
- migration aplicada e homologada;
- recebimento de Compras integrado de forma idempotente;
- saldo não editável diretamente;
- movimentos concluídos imutáveis;
- testes de concorrência e saldo;
- isolamento multiempresa e multiobra;
- CI verde.

Estado do DoD:

- atendido para documentação, migration, idempotência, saldo, imutabilidade e isolamento;
- advisory locks implementados e saldo homologado;
- teste concorrente com duas conexões simultâneas ainda obrigatório antes de produção;
- branch corretiva precisa permanecer com CI verde antes do merge.

### Pendências de prontidão

- E2E autenticado pós-Etapa 17;
- duas conexões concorrentes disputando o mesmo saldo;
- recebimento completo com pedido/fornecedor de homologação;
- carga e volumetria;
- proteção contra senhas comprometidas;
- opções adicionais de MFA;
- auditoria global de performance e segurança.

## Etapa 18 — Consolidação de CRM, Clientes e SAC

- inventariar migrations e rotas existentes;
- completar domínio persistido;
- unificar histórico do cliente;
- consolidar SLAs e ocorrências;
- integrar CRM, obra, qualidade e pós-venda.

## Etapa 19 — Auditoria e observabilidade unificadas

- painel transversal;
- correlação por ator, entidade e evento;
- retenção e alertas;
- revisão de FKs sem índice;
- revisão de políticas RLS com avaliação repetida;
- revisão de múltiplas políticas permissivas;
- telemetria e trilha operacional.

## Etapa 20 — Prontidão de produção

- E2E autenticado completo;
- teste real de concorrência;
- provider jurídico real;
- revisão jurídica, contábil e LGPD;
- proteção/antimalware de anexos;
- pentest;
- backup e restauração testados;
- observabilidade;
- plano de incidentes;
- proteção contra senhas comprometidas;
- MFA adicional;
- publicação controlada.

## Etapa 21 — WMS avançado e Automação Logística

**Estado:** fila aprovada após a Etapa 20.  
**Não implementada na versão 0.17.0.**

### Escopo aprovado

- WMS avançado;
- endereçamento automatizado;
- RFID em tempo real;
- ressuprimento automático sem aprovação;
- roteirização logística;
- integração fiscal de entrada;
- depreciação contábil oficial.

### Dependências

- Etapa 17 estabilizada em produção;
- auditoria e observabilidade da Etapa 19;
- prontidão de produção da Etapa 20;
- revisão fiscal e contábil;
- seleção de hardware/provider para RFID;
- definição de níveis de estoque e política de ressuprimento;
- segregação de funções para automações sem aprovação humana.

### Definition of Done adicional da Etapa 21

- documentação atualizada no mesmo PR;
- migration aplicada e homologada;
- integração fiscal validada por especialista;
- rastreabilidade de endereço e RFID auditável;
- ressuprimento automático idempotente e com limites;
- roteirização reproduzível;
- depreciação reconciliada com o modelo contábil aprovado;
- testes de concorrência, falha e recuperação;
- isolamento multiempresa e multiobra;
- CI verde.

## Regra de alteração

Mudança de ordem ou escopo exige atualização conjunta de:

- `diretrizes/SPEC.md`;
- `diretrizes/ROADMAP.md`;
- `diretrizes/INVENTARIO.md`;
- `diretrizes/MODULOS.md`;
- documentação técnica da etapa;
- validações do CI.
