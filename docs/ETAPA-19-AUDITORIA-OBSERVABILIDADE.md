# Etapa 19 — Auditoria e Observabilidade

**Estado técnico:** implementada, homologada e com CI verde  
**Versão:** `0.19.0`  
**Módulo:** `auditoria` versão `1.0.0`  
**Supabase:** `wyeojufebtwblsubkunr`  
**PR:** `#19`, em rascunho e empilhado sobre o PR `#18`

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

### Diagnósticos globais

A migration de hardening criou `stage19_can_read_global_diagnostics()`:

- membro interno autorizado vê diagnóstico global;
- cliente ou sessão autenticada sem membership vê zero.

Teste homologado: interno `1`, externo `0`.

## 9. RLS, append-only e privilégios

- seis tabelas com RLS;
- 13 políticas;
- seis gatilhos não internos;
- acesso padrão somente a `SUPER_ADMIN`, `DIRECAO` e `ADMINISTRADOR`;
- cliente sem módulo `auditoria`;
- eventos e health checks append-only;
- escrita direta bloqueada por privilégios e triggers;
- nenhuma função da Etapa 19 executável por `anon`;
- RPC `SECURITY DEFINER` autenticada valida organização, módulo, capacidade e escopo internamente.

## 10. Índices

O hardening adicionou sete índices complementares. Resultado:

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

## 12. Seis migrations alinhadas ao ledger

```text
20260721100108_stage19_observability_schema.sql
20260721100159_stage19_observability_security.sql
20260721122302_stage19_observability_functions.sql
20260721122355_stage19_observability_unified_stream.sql
20260721122436_stage19_observability_module_performance.sql
20260721123305_stage19_observability_hardening.sql
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
- diagnósticos globais protegidos;
- nenhum dado artificial persistido.

## 14. Advisors

### Segurança

Os avisos Stage19 de funções `SECURITY DEFINER` autenticadas representam fronteiras intencionais, com `search_path`, autorização interna e zero acesso `anon`.

### Performance

A Etapa 19 ficou com zero FK sem índice. Avisos globais antigos de FKs, `auth_rls_initplan` e múltiplas policies permanecem no backlog transversal das Etapas 19/20.

## 15. CI

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

## 16. Limitações

- não substitui APM externo;
- não armazena corpo bruto de requisição;
- purge automático, telemetria externa e carga pertencem à Etapa 20;
- o E2E concorrente da Etapa 18 continua bloqueado pelos cinco secrets do ambiente GitHub `homologation`.

## 17. Definition of Done

- [x] schema e fluxo transversal;
- [x] sanitização e idempotência;
- [x] RLS e privilégio mínimo;
- [x] eventos append-only;
- [x] alertas e health checks;
- [x] diagnósticos e retenção;
- [x] diagnósticos globais protegidos;
- [x] interface administrativa;
- [x] teste transacional com `ROLLBACK`;
- [x] seis migrations aplicadas e alinhadas ao ledger;
- [x] zero FK sem índice;
- [x] advisors revisados;
- [x] validador estrutural;
- [x] CI final verde;
- [ ] PR pronto para revisão somente após estabilização do PR `#18`.

O PR `#19` permanece em rascunho e não deve ser mesclado automaticamente.
