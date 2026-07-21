# Etapa 19 — Auditoria e Observabilidade

**Estado:** implementada e homologada tecnicamente no Supabase; PR empilhado sobre o PR `#18`  
**Versão da plataforma:** `0.19.0`  
**Módulo:** `auditoria` versão `1.0.0`  
**Projeto Supabase:** `wyeojufebtwblsubkunr`

## 1. Objetivo

Consolidar a atividade crítica da plataforma em um **fluxo unificado**, pesquisável e correlacionado, sem substituir nem duplicar as trilhas append-only dos aplicativos de domínio.

```text
eventos dos módulos + audit_events
→ normalização por RPC
→ organização, módulo, severidade e correlation_id
→ painel de auditoria
→ regras e alertas
→ health checks
→ diagnósticos estruturados
```

## 2. Estrutura

A Etapa 19 utiliza seis tabelas com RLS:

```text
audit_events
observability_alert_rules
observability_alerts
observability_health_checks
observability_diagnostics
observability_retention_policies
```

`audit_events` foi ampliada com módulo, severidade, origem, tipo de ator, cliente, mensagem, metadata sanitizada, request ID, chave de deduplicação, hashes de IP/user-agent, data real de ocorrência e retenção.

IP, user-agent, senha, token e segredo nunca são armazenados em texto puro.

## 3. Fluxo unificado

`get_observability_events` consulta sem copiar registros de 12 origens:

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

Payload bruto de assinatura não é exposto; somente identificadores e hashes necessários.

## 4. Sanitização

`sanitize_audit_json` percorre objetos e arrays recursivamente. Chaves relacionadas a senha, token, authorization, secret, Service Role, private key, access key, refresh token ou cookie recebem `[REDACTED]`.

A homologação confirmou:

```json
{
  "password": "[REDACTED]",
  "nested": {"token": "[REDACTED]", "safe": "ok"},
  "authorization": "[REDACTED]",
  "items": [{"secret": "[REDACTED]", "visible": 1}]
}
```

## 5. Idempotência e correlação

`record_audit_event` aceita:

- `deduplication_key` única por organização;
- `correlation_id` compartilhada;
- `request_id`;
- obra e cliente opcionais;
- SHA-256 de IP e user-agent.

Repetir a mesma chave retorna o evento existente.

## 6. Alertas

Regras suportam módulo, padrão de evento, severidade mínima, quantidade, janela, cooldown e ativação.

```text
OPEN → ACKNOWLEDGED → RESOLVED
```

Eventos críticos criam alerta mesmo sem regra. Reconhecimento e resolução exigem motivo, usuário autenticado e capacidade administrativa. Cada transição cria novo evento.

## 7. Health checks

`run_observability_health_snapshot` registra seis verificações append-only:

1. conectividade do banco;
2. conversão de assinatura;
3. entrega de assinatura;
4. geração de relatórios;
5. SLA do SAC;
6. diagnósticos pendentes.

Estados:

```text
HEALTHY | DEGRADED | UNHEALTHY | UNKNOWN
```

## 8. Diagnósticos

`observability_diagnostics` recebe achados reproduzíveis:

- FK sem índice;
- `auth_rls_initplan`;
- políticas permissivas sobrepostas;
- privilégios de funções;
- divergência de ledger;
- outros achados técnicos.

`record_observability_diagnostic` é idempotente por organização, tipo, objeto e código.

### Diagnósticos globais

A homologação identificou que `organization_id is null` poderia ser visto por qualquer sessão autenticada. A migration de hardening criou `stage19_can_read_global_diagnostics()` e substituiu a política:

- membro interno autorizado: vê diagnóstico global;
- sessão autenticada sem membership, incluindo cliente: não vê;
- resultado do teste: interno `1`, externo `0`.

## 9. Retenção

`observability_retention_policies` aceita 30 a 3650 dias. A política inicial de `audit_events` é 365 dias e preserva críticos.

A Etapa 19 registra `retention_until`, mas não executa purge automático. O purge pertence à Etapa 20 e deverá possuir dry-run, exportação e retenção legal.

## 10. RLS e privilégios

- seis tabelas, todas com RLS;
- 13 políticas;
- seis gatilhos não internos;
- leitura somente por módulo `auditoria`;
- cliente não recebe o aplicativo;
- acesso padrão somente para `SUPER_ADMIN`, `DIRECAO` e `ADMINISTRADOR`;
- `audit_events`, health checks e diagnósticos não aceitam escrita direta do navegador;
- eventos e health checks são append-only;
- regras e retenção exigem administração;
- nenhuma função da Etapa 19 é executável por `anon`;
- helpers e instaladores permanecem internos;
- RPCs `SECURITY DEFINER` autenticadas validam organização, módulo, capacidade e escopo internamente.

## 11. Índices

A auditoria encontrou sete FKs sem índice líder. A migration de hardening adicionou:

```text
audit_events_actor_user_idx
observability_alert_rules_created_by_idx
observability_alerts_acknowledged_by_idx
observability_alerts_audit_event_idx
observability_alerts_resolved_by_idx
observability_alerts_rule_idx
observability_retention_policies_created_by_idx
```

Resultado final:

```text
FKs do domínio: 16
zero FK sem índice
```

Avisos `unused_index` foram preservados porque o ambiente não possui carga representativa.

## 12. Interface

```text
/app/auditoria
/app/auditoria/eventos
/app/auditoria/eventos/[id]
/app/auditoria/alertas
/app/auditoria/saude
/app/auditoria/configuracao
```

A página inicial mostra atividade, alertas, componentes degradados, diagnósticos e distribuição por módulo.

## 13. Seis migrations alinhadas ao ledger

```text
20260721100108_stage19_observability_schema.sql
20260721100159_stage19_observability_security.sql
20260721122302_stage19_observability_functions.sql
20260721122355_stage19_observability_unified_stream.sql
20260721122436_stage19_observability_module_performance.sql
20260721123305_stage19_observability_hardening.sql
```

Os arquivos usam exatamente os timestamps registrados em `supabase_migrations.schema_migrations`.

## 14. Homologação

Arquivo reproduzível:

```text
supabase/tests/stage19_observability_homologation.sql
```

O teste cria identidades e organizações temporárias, alterna para o papel `authenticated`, simula JWT e termina com `ROLLBACK`.

Resultados confirmados:

- módulo instalado: `1`;
- regras padrão: `2`;
- evento idempotente;
- sanitização recursiva;
- alerta crítico criado;
- fluxo unificado retornando evento;
- append-only bloqueado por privilégio e trigger;
- alerta reconhecido e resolvido;
- seis health checks;
- acesso a outra organização negado;
- diagnóstico global visível somente para membro interno autorizado;
- nenhum dado artificial persistido.

## 15. Advisors

### Segurança

Os avisos específicos da Etapa 19 para funções `SECURITY DEFINER` autenticadas são intencionais: representam fronteiras transacionais, possuem `search_path` explícito, autorização interna e zero acesso `anon`.

Os avisos globais de tabelas internas antigas sem policy de usuário, funções de módulos anteriores e políticas permissivas duplicadas permanecem registrados para a continuidade da Etapa 19 e para a Etapa 20. Nenhuma policy permissiva artificial foi criada apenas para silenciar o advisor.

### Performance

- zero FK sem índice na Etapa 19;
- índices `unused` mantidos até existir carga real;
- alertas legados de `auth_rls_initplan`, múltiplas policies e FKs de módulos antigos permanecem no backlog de hardening transversal.

## 16. Limitações

- não substitui APM externo;
- não armazena corpo bruto de requisição;
- métricas de runner/Vercel dependem de integração futura;
- purge automático e carga pertencem à Etapa 20;
- E2E concorrente da Etapa 18 continua bloqueado pelos cinco secrets do ambiente GitHub `homologation`.

## 17. Definition of Done

- [x] schema transversal;
- [x] fluxo unificado sem duplicação;
- [x] sanitização recursiva;
- [x] idempotência e `correlation_id`;
- [x] RLS e privilégio mínimo;
- [x] eventos append-only;
- [x] regras e alertas;
- [x] health checks;
- [x] diagnósticos de banco;
- [x] diagnósticos globais protegidos;
- [x] retenção configurável;
- [x] interface administrativa;
- [x] teste transacional com `ROLLBACK`;
- [x] seis migrations aplicadas e alinhadas ao ledger;
- [x] zero FK sem índice;
- [x] advisors revisados;
- [x] validador estrutural atualizado;
- [ ] CI final após os últimos commits;
- [ ] PR pronto para revisão após desbloqueio da dependência do PR `#18`.
