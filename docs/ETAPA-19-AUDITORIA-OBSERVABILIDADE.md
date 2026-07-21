# Etapa 19 — Auditoria e Observabilidade

## Estado

Implementação em branch empilhada sobre o PR `#18`.

## Objetivo

Consolidar a atividade crítica da plataforma em um **fluxo unificado**, pesquisável e correlacionado, sem substituir nem duplicar as trilhas append-only dos aplicativos de domínio.

## Arquitetura

```text
eventos dos módulos
+ audit_events transversal
→ normalização por RPC
→ filtros por organização, módulo, severidade e correlation_id
→ painel de auditoria
→ regras de alerta
→ health checks e diagnósticos
```

A tabela `audit_events` existente foi ampliada com:

- módulo;
- severidade;
- origem;
- tipo do ator;
- cliente e obra;
- mensagem e metadata sanitizada;
- request ID;
- chave de deduplicação;
- hashes SHA-256 de IP e user-agent;
- data real de ocorrência;
- data de retenção.

IP e user-agent nunca são armazenados em texto puro.

## Fluxo unificado

A RPC `get_observability_events` normaliza, sem copiar registros, as fontes:

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

Cada item expõe contrato comum:

```text
id
organization_id
project_id
client_id
module_key
event_type
severity
source
actor_user_id
actor_type
resource_type
resource_id
action
result
message
metadata
correlation_id
occurred_at
origin_table
```

Payloads brutos de assinatura não são expostos. O fluxo mostra somente identificadores do provedor e hashes.

## Sanitização

`sanitize_audit_json` percorre objetos e arrays recursivamente. Chaves compatíveis com senha, token, authorization, secret, Service Role, private key, access key, refresh token ou cookie recebem `[REDACTED]`.

A sanitização ocorre no banco, antes da persistência e antes da leitura de eventos de domínio.

## Idempotência e correlação

`record_audit_event` aceita:

- `deduplication_key` por organização;
- `correlation_id` compartilhado por uma operação distribuída;
- `request_id` técnico;
- obra e cliente opcionais;
- hash de IP e user-agent.

Repetição da mesma chave retorna o evento existente.

## Alertas

Tabelas:

- `observability_alert_rules`;
- `observability_alerts`.

Regras suportam:

- módulo opcional;
- padrão de evento;
- severidade mínima;
- quantidade mínima;
- janela temporal;
- cooldown;
- ativação.

Eventos críticos geram alerta mesmo sem regra específica. Estados:

```text
OPEN → ACKNOWLEDGED → RESOLVED
```

Reconhecimento e resolução exigem motivo, usuário autenticado e capacidade administrativa no módulo `auditoria`. Cada transição gera novo evento de auditoria.

## Health checks

`run_observability_health_snapshot` registra seis verificações:

1. conectividade do banco;
2. conversão de documentos de assinatura;
3. entrega de cópias assinadas;
4. geração de relatórios;
5. SLA do SAC;
6. diagnósticos técnicos pendentes.

Os resultados são append-only em `observability_health_checks`.

Estados:

```text
HEALTHY
DEGRADED
UNHEALTHY
UNKNOWN
```

## Diagnósticos

`observability_diagnostics` recebe achados reproduzíveis dos advisors e do ledger:

- FKs sem índice;
- avaliação repetida em RLS;
- políticas permissivas sobrepostas;
- privilégios de funções;
- divergência de migrations;
- outros diagnósticos estruturados.

`record_observability_diagnostic` é idempotente por organização, tipo, objeto e código.

## Retenção

`observability_retention_policies` define retenção entre 30 e 3650 dias. A política inicial de `audit_events` é 365 dias e preserva eventos críticos.

A Etapa 19 registra `retention_until`, mas não implementa exclusão automática. O worker de purge fica reservado para a prontidão de produção da Etapa 20, com dry-run, exportação e preservação legal.

## RLS e privilégios

- leitura somente com `has_module_permission(...,'auditoria','READ',...)`;
- cliente não recebe acesso ao aplicativo;
- apenas `SUPER_ADMIN`, `DIRECAO` e `ADMINISTRADOR` recebem acesso padrão;
- `audit_events`, health checks e diagnósticos não aceitam escrita direta de usuários;
- eventos e health checks são append-only;
- regras e retenção exigem administração;
- RPCs não são executáveis por `anon`;
- Service Role é permitida somente nas operações técnicas explicitamente concedidas.

## Interface

Rotas:

```text
/app/auditoria
/app/auditoria/eventos
/app/auditoria/eventos/[id]
/app/auditoria/alertas
/app/auditoria/saude
/app/auditoria/configuracao
```

A tela inicial mostra atividade, alertas, componentes degradados, diagnósticos e distribuição por módulo.

## Migrations

```text
20260721093000_stage19_observability_schema.sql
20260721093100_stage19_observability_security.sql
20260721093200_stage19_observability_functions.sql
20260721093300_stage19_observability_unified_stream.sql
20260721093400_stage19_observability_module_performance.sql
```

## Homologação

Arquivo:

```text
supabase/tests/stage19_observability_homologation.sql
```

Testes:

- instalação do módulo;
- regras padrão;
- idempotência;
- sanitização recursiva;
- alerta crítico;
- fluxo unificado;
- append-only;
- workflow do alerta;
- health checks;
- isolamento multiempresa.

A bateria usa identidades autenticadas, RLS real e termina com `ROLLBACK`.

## Limitações

- a Etapa 19 não substitui um APM externo;
- não armazena conteúdo bruto de requisições;
- métricas de infraestrutura do runner/Vercel dependem de integração futura;
- purge automático e teste de carga pertencem à Etapa 20;
- o E2E concorrente da Etapa 18 continua bloqueado pelos secrets do ambiente `homologation`.

## Definition of Done

- [x] schema transversal criado;
- [x] fluxo unificado sem duplicação;
- [x] sanitização recursiva;
- [x] idempotência e correlation_id;
- [x] RLS e privilégio mínimo;
- [x] eventos append-only;
- [x] regras e alertas;
- [x] health checks;
- [x] diagnósticos de banco;
- [x] retenção configurável;
- [x] interface administrativa;
- [x] teste transacional com ROLLBACK;
- [x] validador estrutural;
- [ ] migrations aplicadas na homologação;
- [ ] advisors revisados;
- [ ] CI verde;
- [ ] PR pronto para revisão.
