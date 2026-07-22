# Roadmap oficial — Innovar Platform

**Versão atual:** 0.19.0  
**Atualizado em:** 22 de julho de 2026

Planejamento não é tratado como funcionalidade entregue. O estado deve corresponder ao GitHub, Supabase, manifesto e evidências.

## Etapas consolidadas

- Etapa 9 — comercial, orçamentos, propostas, contratos e aditivos;
- Etapa 10 — hardening de homologação;
- Etapa 11 — homologação autenticada;
- Etapa 12 — gestão de obras e campo;
- Etapa 12.1 — núcleo modular e acessos;
- Etapa 12.2 — assinatura avançada;
- Etapa 13 — qualidade e formulários;
- Etapa 14 — compras e suprimentos;
- Etapa 15 — financeiro operacional;
- Etapa 16 — relatórios e indicadores;
- Etapa 17 — Estoque, Inventário e Almoxarifado;
- Etapa 18 — CRM, Clientes e SAC;
- Etapa 19 — Auditoria e observabilidade.

## Etapa 17 — Estoque, Inventário e Almoxarifado

**Estado:** incorporada à `main` e homologada tecnicamente.  
**Produção:** depende da conclusão integral da Etapa 20.

### Entregas

- catálogo, unidades, categorias, depósitos e localizações;
- lotes, validade, movimentos e reversões;
- saldos físico, reservado e disponível derivados;
- recebimento de Compras integrado de forma idempotente;
- reservas e consumo por obra;
- ativos, custódias e manutenção;
- inventário físico e ajustes;
- RLS, custos protegidos e isolamento multiempresa/multiobra;
- advisory locks por posição;
- interface responsiva.

### Homologação estrutural

- 18 tabelas com RLS;
- seis views `security_invoker`;
- migrations alinhadas ao ledger;
- 14 testes transacionais com `ROLLBACK`;
- saldo não editável diretamente;
- movimentos concluídos imutáveis;
- bloqueio de saldo negativo;
- dados artificiais revertidos.

### Concorrência real concluída na Etapa 20

- duas sessões Supabase independentes;
- saldo inicial `10`;
- duas saídas concorrentes de `6`;
- exatamente uma postagem;
- exatamente uma rejeição;
- saldo após disputa `4`;
- saldo após cleanup `0`;
- workflow `29889168656` aprovado;
- artefato `8517620520` preservado.

### Definition of Done adicional

- [x] documentação atualizada no mesmo PR;
- [x] migration aplicada e homologada;
- [x] recebimento de Compras integrado de forma idempotente;
- [x] saldo não editável diretamente;
- [x] movimentos concluídos imutáveis;
- [x] testes de concorrência e saldo;
- [x] isolamento multiempresa e multiobra;
- [x] CI verde;
- [ ] carga e volumetria prolongadas;
- [ ] backup e restauração testados.

## Etapa 18 — CRM, Clientes e SAC

**Estado:** incorporada à `main`.  
**PR:** `#18`, mesclado.  
**E2E concorrente:** aprovado.

### Entregas

- lead → oportunidade → cliente → obra → pós-venda;
- Cliente 360 multiobra;
- atividades, contatos e consentimentos;
- SAC interno e portal;
- mensagens internas e públicas;
- anexos privados com SHA-256;
- SLA e eventos append-only;
- estados críticos por RPC;
- RLS interna e do cliente.

### Evidência

- workflow `29883182240`;
- login paralelo;
- idempotência;
- mensagem interna invisível ao cliente;
- transição protegida;
- RLS confirmada;
- `cleanup: passed`;
- relatório sem secrets.

## Etapa 19 — Auditoria e observabilidade

**Estado:** implementada, homologada e incorporada à `main`.  
**PRs:** `#19` e `#20`, mesclados.  
**CI:** verde.

### Entregas

- fluxo unificado de 12 origens;
- `correlation_id` e request;
- sanitização recursiva;
- idempotência;
- eventos e health checks append-only;
- alertas, reconhecimento e resolução;
- seis health checks;
- diagnósticos de FKs, RLS, policies, privilégios e ledger;
- retenção configurável;
- diagnósticos globais protegidos;
- interface `/app/auditoria`.

### Homologação

- seis tabelas com RLS;
- 13 políticas e seis gatilhos;
- 16 FKs e zero sem índice;
- zero função executável por `anon`;
- dados artificiais revertidos;
- advisors revisados.

### Definition of Done

- [x] schema e segurança;
- [x] fluxo e sanitização;
- [x] alertas, health checks e diagnósticos;
- [x] interface;
- [x] teste com `ROLLBACK`;
- [x] migrations e ledger;
- [x] CI;
- [x] merge na `main`.

## Etapa 20 — Prontidão de Produção

**Estado:** em implementação no PR `#23`.  
**Publicação:** proibida até conclusão e aprovação explícita.

### Fase 20.1 — Governança pós-merge

- [x] `ESTADO-ATUAL.json`;
- [x] fechamento das Etapas 18 e 19 no PR `#22`;
- [x] `VACINA-012`;
- [x] documentação canônica reconciliada.

### Fase 20.2 — UI/UX Pro Max

- [x] diretriz permanente `UI-UX-PRO-MAX.md`;
- [x] identidade `Arquitetura em operação`;
- [x] azul profundo, cobre e materiais naturais;
- [x] shell e dashboard revisados;
- [x] classes ausentes implementadas;
- [x] WCAG 2.2 AA como meta;
- [x] foco visível e alvos de 44 px;
- [x] breakpoints, reflow e forced colors;
- [x] `prefers-reduced-motion`;
- [x] prevenção contra preset SaaS rosa/fúcsia;
- [x] CI completo verde.

### Fase 20.3 — Concorrência real do estoque

- [x] duas conexões independentes;
- [x] mesma posição de estoque;
- [x] duas saídas cuja soma excede o saldo;
- [x] uma postagem e uma rejeição;
- [x] saldo nunca negativo;
- [x] cleanup com saldo zero;
- [x] artefato auditável;
- [x] `VACINA-013` para fixtures sensíveis.

### Fase 20.4 — Backup e restauração

- [ ] estratégia e scripts versionados;
- [ ] secret de conexão dedicado configurado;
- [ ] dump íntegro;
- [ ] armazenamento protegido;
- [ ] restauração em ambiente isolado;
- [ ] ledger e smoke tests após restauração;
- [ ] RPO e RTO medidos;
- [ ] evidência preservada.

### Fase 20.5 — Anexos protegidos

- [ ] quarentena;
- [ ] antimalware;
- [ ] liberação/bloqueio;
- [ ] tipos e limites;
- [ ] download autenticado;
- [ ] remoção de órfãos;
- [ ] health check e incidentes.

### Fase 20.6 — Assinatura jurídica

- [ ] provider real;
- [ ] webhook autenticado e idempotente;
- [ ] hashes e evidências;
- [ ] retry e reconciliação;
- [ ] revisão jurídica;
- [ ] fallback.

### Fase 20.7 — Telemetria, retenção e incidentes

- [ ] APM sem dados sensíveis;
- [ ] alertas externos;
- [ ] worker de retenção com dry-run;
- [ ] preservação legal;
- [ ] plano de incidentes;
- [ ] post-mortem e vacinas.

### Fase 20.8 — Auth e segurança externa

- [ ] proteção contra senhas comprometidas;
- [ ] MFA adicional;
- [ ] rate limiting;
- [ ] headers e cookies;
- [ ] pentest;
- [ ] revisão jurídica, contábil e LGPD.

### Fase 20.9 — Carga e publicação

- [ ] carga e volumetria prolongadas;
- [ ] limites documentados;
- [ ] checklist de go-live;
- [ ] rollback comprovado;
- [ ] decisão `GO`, `NO_GO` ou `CONDITIONAL_GO`;
- [ ] publicação controlada;
- [ ] CI final verde.

## Etapa 21 — WMS avançado e Automação Logística

**Estado:** fila aprovada após a Etapa 20.  
**Não implementada na versão 0.19.0.**

### Escopo aprovado

- WMS avançado;
- Endereçamento automatizado;
- RFID em tempo real;
- Ressuprimento automático sem aprovação;
- Roteirização logística;
- Integração fiscal de entrada;
- Depreciação contábil oficial.

### Dependências

- Etapa 17 estabilizada em produção;
- Etapa 19 incorporada;
- Etapa 20 concluída;
- revisão fiscal e contábil;
- hardware/provider RFID;
- níveis de estoque e política de ressuprimento;
- segregação de funções.

### Definition of Done adicional

- documentação atualizada no mesmo PR;
- migration aplicada e homologada;
- integração fiscal validada;
- rastreabilidade auditável;
- ressuprimento idempotente e limitado;
- roteirização reproduzível;
- depreciação reconciliada;
- testes de concorrência, falha e recuperação;
- isolamento multiempresa e multiobra;
- CI verde.

## Regra de alteração

Nenhuma etapa é concluída sem código, migrations, testes, documentação, vacinas, homologação e CI compatíveis. Nenhum merge ou publicação ocorre automaticamente.
