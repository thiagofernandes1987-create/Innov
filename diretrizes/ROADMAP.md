# Roadmap oficial — Innovar Platform

**Versão atual:** 0.19.0  
**Atualizado em:** 22 de julho de 2026

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
- Etapa 18 — CRM, Clientes e SAC;
- Etapa 19 — Auditoria e observabilidade unificadas.

## Etapa 17 — Estoque, Inventário e Almoxarifado

**Estado:** incorporada à `main` e homologada tecnicamente.  
**Produção:** não liberada; pendências transferidas formalmente à Etapa 20.

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
**E2E concorrente:** concluído e aprovado.  
**PR:** `#18`, mesclado em 22 de julho de 2026.

### Entregas

- lead → oportunidade → cliente → obra → pós-venda;
- Cliente 360 com múltiplas obras abertas ou concluídas;
- atividades, contatos e consentimentos;
- SAC interno e portal do cliente;
- mensagens internas e públicas;
- anexos privados com SHA-256;
- SLA, satisfação e eventos append-only;
- estados críticos alterados somente por RPC;
- RLS interna e do cliente.

### Homologação concorrente concluída

- workflow `29883182240` aprovado;
- login paralelo de administrador e cliente;
- abertura idempotente de chamado;
- mensagem interna invisível ao cliente;
- mensagens públicas consistentes para ambos;
- transição protegida e tentativa direta de alteração bloqueada;
- RLS confirmada;
- `cleanup: passed`;
- mensagens, eventos e ticket preservados como histórico imutável;
- relatório final sem secrets.

## Etapa 19 — Auditoria e observabilidade unificadas

**Estado técnico:** implementada, homologada e incorporada à `main`.  
**PRs:** `#19` e `#20`, mesclados.  
**CI final:** verde.

### Entregas

- painel transversal;
- fluxo unificado de 12 origens sem duplicação;
- correlação por ator, entidade, cliente, obra, recurso, request e `correlation_id`;
- sanitização recursiva de senha, token, authorization, secret, cookie e chaves privadas;
- idempotência por chave de deduplicação;
- eventos e health checks append-only;
- alertas técnicos e operacionais;
- reconhecimento e resolução com motivo;
- seis health checks;
- diagnósticos de FKs, RLS, policies, privilégios e ledger;
- retenção configurável;
- diagnósticos globais protegidos contra cliente e sessão sem membership;
- aplicativo sensível disponível somente a Super Administrador, Direção e Administrador;
- interface em `/app/auditoria`.

### Seis migrations alinhadas ao ledger

```text
20260721100108_stage19_observability_schema.sql
20260721100159_stage19_observability_security.sql
20260721122302_stage19_observability_functions.sql
20260721122355_stage19_observability_unified_stream.sql
20260721122436_stage19_observability_module_performance.sql
20260721123305_stage19_observability_hardening.sql
```

### Homologação concluída

- seis tabelas com RLS;
- 13 políticas e seis gatilhos não internos;
- sanitização recursiva confirmada;
- evento idempotente;
- alerta crítico criado;
- fluxo unificado consultado;
- append-only bloqueado por privilégio e trigger;
- alerta reconhecido e resolvido;
- seis health checks;
- isolamento multiempresa confirmado;
- diagnóstico global: interno autorizado vê 1 e sessão sem membership vê 0;
- 16 FKs e zero FK sem índice;
- zero função da Etapa 19 executável por `anon`;
- advisors de segurança e performance revisados;
- dados artificiais revertidos.

### Definition of Done

- [x] schema e segurança versionados;
- [x] fluxo unificado e sanitização;
- [x] alertas, health checks e diagnósticos;
- [x] interface administrativa;
- [x] teste transacional com `ROLLBACK`;
- [x] validador estrutural;
- [x] documentação atualizada;
- [x] migrations aplicadas e homologadas;
- [x] ledger remoto alinhado;
- [x] zero FK sem índice;
- [x] advisors revisados;
- [x] lint, typecheck, testes e build verdes;
- [x] PRs mesclados e conteúdo consolidado na `main`.

## Etapa 20 — Prontidão de produção

**Estado:** próxima etapa oficial.  
**Estratégia:** execução incremental, com PR em rascunho, evidências por requisito e sem publicação automática.

### Escopo técnico

- E2E autenticado completo dos fluxos críticos;
- teste real de concorrência de estoque;
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

### UI/UX Pro Max adaptada à Innovar

- direção autoral baseada em arquitetura e precisão de obra;
- azul profundo, cobre e materiais naturais;
- interface densa, escaneável e responsiva;
- estados de loading, vazio, erro, offline, sucesso e acesso negado;
- WCAG 2.2 AA, foco visível e alvos mínimos de 44 px;
- status semânticos sem depender apenas de cor;
- motion discreto e suporte a `prefers-reduced-motion`;
- proibição do preset SaaS rosa e de cartões genéricos repetitivos;
- testes de reflow, zoom, teclado e conteúdo real.

### Definition of Done inicial

- [ ] branch e PR de etapa criados;
- [ ] documento técnico e validador versionados;
- [ ] design system canônico versionado e validado no CI;
- [ ] pendências de concorrência da Etapa 17 executadas;
- [ ] backup e restauração comprovados;
- [ ] anexos protegidos e analisados;
- [ ] provider jurídico integrado e homologado;
- [ ] MFA e proteção de credenciais revisados;
- [ ] telemetria, retenção e incidentes operacionais;
- [ ] pentest e revisões externas registrados;
- [ ] publicação controlada aprovada;
- [ ] CI verde.

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
