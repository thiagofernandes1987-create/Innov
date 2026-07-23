# Etapa 19 — Auditoria e Observabilidade

**Estado técnico:** implementada, homologada, CI verde e incorporada à `main`  
**Versão:** `0.19.0`  
**Módulo:** `auditoria` versão `1.0.0`  
**Supabase:** `wyeojufebtwblsubkunr`  
**PRs:** `#19` e `#20`, mesclados em 22 de julho de 2026

## 1. Objetivo

Consolidar a atividade crítica em um **fluxo unificado**, pesquisável e correlacionado, sem copiar nem substituir as trilhas append-only dos módulos.

```text
eventos de domínio + audit_events
→ normalização por RPC
→ organização, módulo, severidade e correlation_id
→ alertas → health checks → diagnósticos
```

## 2. Banco

Seis tabelas com RLS:

```text
audit_events
observability_alert_rules
observability_alerts
observability_health_checks
observability_diagnostics
observability_retention_policies
```

`audit_events` possui módulo, severidade, origem, tipo do ator, cliente, obra, request ID, deduplication key, hashes de IP/user-agent, data de ocorrência e retenção.

## 3. Fluxo unificado

`get_observability_events` normaliza 12 origens sem duplicar registros:

1. `audit_events`;
2. `permission_change_events`;
3. `signature_events`;
4. `document_access_logs`;
5. `quality_form_events`;
6. `procurement_events`;
7. `finance_events`;
8. `report_events`;
9. `inventory_events`;
10. `sac_ticket_events`;
11. `crm_opportunity_stage_history`;
12. `crm_activities`.

Contrato comum:

```text
id, organization_id, project_id, client_id, module_key,
event_type, severity, source, actor_user_id, actor_type,
resource_type, resource_id, action, result, message,
metadata, correlation_id, occurred_at, origin_table
```

## 4. Sanitização e privacidade

`sanitize_audit_json` percorre objetos e arrays recursivamente. Senha, token, authorization, secret, Service Role, private key, access key, refresh token e cookie recebem `[REDACTED]`.

A homologação confirmou que campos seguros continuam visíveis enquanto dados sensíveis são removidos. IP e user-agent são armazenados somente como SHA-256. Payload bruto do provider de assinatura não é exposto.

## 5. Idempotência e correlação

`record_audit_event` aceita:

- `deduplication_key` única por organização;
- `correlation_id` compartilhada;
- `request_id`;
- obra, cliente, ator e recurso;
- hashes SHA-256.

Repetição da mesma chave retorna o evento existente.

## 6. Alertas

As regras suportam módulo, padrão de evento, severidade mínima, quantidade, janela e cooldown.

```text
OPEN → ACKNOWLEDGED → RESOLVED
```

Evento crítico cria alerta mesmo sem regra. Reconhecimento e resolução exigem motivo e capacidade administrativa; cada transição gera auditoria.

## 7. Health checks

O snapshot registra seis **health checks** append-only:

1. conectividade do banco;
2. conversão de assinatura;
3. entrega de assinatura;
4. geração de relatórios;
5. SLA do SAC;
6. diagnósticos pendentes.

Estados: `HEALTHY`, `DEGRADED`, `UNHEALTHY` e `UNKNOWN`.

## 8. Diagnósticos

São registrados achados de:

- FK sem índice;
- `auth_rls_initplan`;
- policies permissivas sobrepostas;
- privilégios de funções;
- divergência do ledger;
- outros achados técnicos reproduzíveis.

O hardening R3B restringe diagnósticos globais à operação de plataforma:

- sessões `authenticated` visualizam apenas diagnósticos da própria organização, mediante permissão no módulo `auditoria`;
- linhas com `organization_id` nulo não entram em dashboards ou snapshots de tenant;
- acesso global fica reservado ao `service_role`.

## 9. RLS, append-only e privilégios

- seis tabelas com RLS;
- 13 políticas;
- seis gatilhos não internos;
- acesso padrão somente a `SUPER_ADMIN`, `DIRECAO` e `ADMINISTRADOR`;
- cliente sem módulo `auditoria`;
- eventos e health checks append-only;
- escrita direta bloqueada por privilégios e triggers;
- nenhuma função da Etapa 19 executável por `anon`;
- RPCs genéricas `record_audit_event` e `write_audit` executáveis somente por `service_role`;
- RPCs autenticadas permanecem estreitas por operação e validam organização, módulo, capacidade e escopo internamente.

## 10. Índices

O hardening adicionou sete índices complementares:

```text
FKs do domínio: 16
zero FK sem índice
```

Índices classificados como `unused` foram mantidos porque o ambiente não possui carga representativa.

## 11. Interface

```text
/app/auditoria
/app/auditoria/eventos
/app/auditoria/eventos/[id]
/app/auditoria/alertas
/app/auditoria/saude
/app/auditoria/configuracao
```

A revisão visual transversal e a consolidação do design system foram transferidas à Etapa 20, sob a direção UI/UX Pro Max adaptada à identidade Innovar.

## 12. Sete migrations alinhadas ao ledger

```text
20260721100108_stage19_observability_schema.sql
20260721100159_stage19_observability_security.sql
20260721122302_stage19_observability_functions.sql
20260721122355_stage19_observability_unified_stream.sql
20260721122436_stage19_observability_module_performance.sql
20260721123305_stage19_observability_hardening.sql
20260723104500_r3b_observability_security_hardening.sql
```

## 13. Homologação

Arquivo:

```text
supabase/tests/stage19_observability_homologation.sql
```

O teste usa identidades e organizações temporárias, alterna para `authenticated`, simula JWT e termina com `ROLLBACK`.

Confirmado:

- módulo instalado e duas regras padrão;
- evento idempotente;
- sanitização recursiva;
- alerta crítico;
- fluxo unificado;
- append-only bloqueado;
- alerta reconhecido e resolvido;
- seis health checks;
- isolamento multiempresa;
- diagnósticos globais restritos à plataforma;
- nenhum dado artificial persistido.

## 14. Advisors

Os avisos Stage19 de funções `SECURITY DEFINER` autenticadas representam fronteiras intencionais, com `search_path`, autorização interna e zero acesso `anon`.

A Etapa 19 ficou com zero FK sem índice. Avisos globais antigos de FKs, `auth_rls_initplan` e múltiplas policies foram transferidos ao backlog transversal da Etapa 20.

## 15. CI e merge

A execução final aprovou:

- documentação canônica;
- vacinas de engenharia;
- ledger de migrations;
- validadores das Etapas 17, 18 e 19;
- lint;
- TypeScript;
- testes TypeScript;
- testes Python;
- build de produção.

O PR `#19` foi mesclado sobre a branch da Etapa 18 e o PR `#20` consolidou o conteúdo na `main`. O commit estável analisado é `55f4d56`, cujo CI run `29885340336` terminou com `success`.

## 16. Limitações transferidas à Etapa 20

- APM e telemetria externa;
- purge automático e retenção operacional;
- teste de carga e chaos;
- backup e restauração;
- provider jurídico;
- antimalware de anexos;
- pentest e publicação controlada.

## 17. Definition of Done

- [x] schema e fluxo transversal;
- [x] sanitização e idempotência;
- [x] RLS e privilégio mínimo;
- [x] eventos append-only;
- [x] alertas e health checks;
- [x] diagnósticos e retenção configurável;
- [x] diagnósticos globais restritos à plataforma;
- [x] interface administrativa;
- [x] teste transacional com `ROLLBACK`;
- [x] sete migrations versionadas e alinhadas ao ledger;
- [x] zero FK sem índice;
- [x] advisors revisados;
- [x] validador estrutural;
- [x] CI final verde;
- [x] PRs mesclados e conteúdo incorporado à `main`.
