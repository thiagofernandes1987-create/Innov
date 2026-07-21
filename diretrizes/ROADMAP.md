# Roadmap oficial — Innovar Platform

**Versão atual:** 0.19.0  
**Atualizado em:** 21 de julho de 2026

O roadmap segue o estado real do repositório, dos PRs e do Supabase. Planejamento não é tratado como funcionalidade entregue.

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
- Etapa 16 — relatórios e indicadores executivos;
- Etapa 17 — Estoque, Inventário e Almoxarifado;
- Etapa 18 — CRM, Clientes e SAC.

## Etapa 17 — Estoque, Inventário e Almoxarifado

**Estado:** incorporada à `main` e homologada tecnicamente.  
**Produção:** não liberada.

### Entregas

- catálogo, unidades, categorias, depósitos e localizações;
- lotes, validade, movimentos e reversões;
- saldos físico, reservado e disponível derivados;
- recebimento de Compras integrado de forma idempotente;
- reservas e consumo por obra;
- ativos, custódias e manutenção;
- inventário físico e ajustes;
- RLS, custos mascarados e isolamento multiempresa e multiobra;
- advisory locks por posição;
- interface responsiva e documentação de recuperação.

### Homologação

- 18 tabelas com RLS;
- seis views `security_invoker`;
- migrations alinhadas ao ledger remoto;
- 14 testes transacionais com `ROLLBACK`;
- saldo não editável diretamente;
- movimentos concluídos imutáveis;
- bloqueio de saldo negativo;
- dados artificiais revertidos.

### Definition of Done adicional

- documentação atualizada no mesmo PR;
- migration aplicada e homologada;
- recebimento de Compras integrado de forma idempotente;
- saldo não editável diretamente;
- movimentos concluídos imutáveis;
- testes de concorrência e saldo;
- isolamento multiempresa e multiobra;
- CI verde.

### Pendência de produção

- duas conexões realmente simultâneas disputando a mesma posição de estoque;
- carga e volumetria;
- backup e restauração testados.

## Etapa 18 — CRM, Clientes e SAC

**Estado funcional:** incorporada à `main`.  
**E2E concorrente:** PR `#18` em rascunho.

### Entregas

- lead → oportunidade → cliente → obra → pós-venda;
- Cliente 360 com múltiplas obras abertas ou concluídas;
- atividades, contatos e consentimentos;
- SAC interno e portal do cliente;
- mensagens internas e públicas;
- anexos privados com SHA-256;
- SLA, pesquisa de satisfação e eventos append-only;
- estados críticos alterados somente por RPC;
- RLS interna e do cliente.

### Bloqueio atual

O E2E de administrador e cliente simultâneos está implementado, mas não inicia enquanto estes secrets estiverem ausentes no ambiente GitHub `homologation`:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
DEMO_ADMIN_PASSWORD
DEMO_CLIENT_PASSWORD
```

Nenhum valor será hardcodado no repositório.

## Etapa 19 — Auditoria e observabilidade unificadas

**Estado:** implementação no PR `#19`, empilhado sobre o PR `#18`.  
**Merge:** proibido automaticamente.

### Escopo

- painel transversal;
- fluxo unificado de eventos sem duplicação;
- correlação por ator, entidade, cliente, obra, recurso, request e `correlation_id`;
- sanitização recursiva de senha, token, authorization, secret, cookie e chaves privadas;
- idempotência por chave de deduplicação;
- eventos e health checks append-only;
- alertas técnicos e operacionais;
- reconhecimento e resolução com motivo;
- health checks de banco, assinatura, relatórios e SAC;
- diagnósticos de FKs sem índice, RLS, políticas permissivas, privilégios e ledger;
- retenção configurável;
- RLS e aplicativo sensível para Super Administrador, Direção e Administrador;
- interface em `/app/auditoria`.

### Migrations

```text
20260721093000_stage19_observability_schema.sql
20260721093100_stage19_observability_security.sql
20260721093200_stage19_observability_functions.sql
20260721093300_stage19_observability_unified_stream.sql
20260721093400_stage19_observability_module_performance.sql
```

### Definition of Done

- [x] schema e segurança versionados;
- [x] fluxo unificado e sanitização;
- [x] alertas, health checks e diagnósticos;
- [x] interface administrativa;
- [x] teste transacional com `ROLLBACK`;
- [x] validador estrutural;
- [x] documentação atualizada no mesmo PR;
- [ ] lint, typecheck, testes e build verdes no commit final;
- [ ] migrations aplicadas e homologadas;
- [ ] advisors revisados;
- [ ] relatório de homologação registrado;
- [ ] PR pronto para revisão.

## Etapa 20 — Prontidão de produção

- E2E autenticado completo;
- teste real de concorrência;
- provider jurídico real;
- revisão jurídica, contábil e LGPD;
- proteção e antimalware de anexos;
- pentest;
- backup e restauração testados;
- integração com telemetria externa;
- worker de retenção com dry-run e preservação legal;
- plano de incidentes;
- proteção contra senhas comprometidas;
- MFA adicional;
- publicação controlada.

## Etapa 21 — WMS avançado e Automação Logística

**Estado:** fila aprovada após a Etapa 20.  
**Não implementada na versão 0.19.0.**

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
- Auditoria e observabilidade da Etapa 19;
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

Nenhuma etapa é concluída sem código, migrations, testes, documentação canônica, vacinas aplicáveis, homologação e CI compatíveis com o estado declarado. Nenhum merge é realizado automaticamente.
