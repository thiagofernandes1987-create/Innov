# INNOVAR PLATFORM BLUEPRINT EXECUTÁVEL — AUTO12-R3B-FOLLOWUP

## Propósito e estado

Este é o blueprint canônico da working copy `INNOVAR-AUTO12-R3B-FOLLOWUP`. Ele incorpora a arquitetura consolidada anterior e um adendo técnico pós-reconciliação R3B. O estado permanece **DRAFT**: validações locais não equivalem a integração externa ou prova operacional.

## Alterações canônicas pós-R3B

- Contexto administrativo HMAC v2 vinculado a método, rota/query, corpo, idempotency key, timestamp, nonce e audience.
- Anti-replay de nonce e isolamento do handler por instância de servidor.
- Idempotência DLQ por organização, operação, recurso, chave e hash semântico.
- Migration PostgreSQL `0015_dlq_idempotency_resource_scope.sql`.
- Endpoints administrativos documentados como trusted proxy HMAC no OpenAPI.
- Tópicos do REST Proxy validados e codificados como segmento seguro.
- Orquestrador canônico ampliado e fail-closed: falha local retorna `1`; bloqueio externo retorna `77`.
- Referências do inventário SDK normalizadas para `openapi-operation-inventory.json`.

## Evidência e limites

- Suíte local `tests`: 84 PASS.
- Suíte BDD: 16 PASS.
- TypeScript, SDK drift e contratos: PASS local.
- PostgreSQL, Redpanda, XState oficial, Kubernetes, supply chain e operação: BLOCKED_EXTERNAL ou NOT_CLAIMED.
- SCI global: **NOT_CALCULATED**.
- EEI global: **NOT_CALCULATED**.

---

# Innovar Platform Architecture V3 — Documento Consolidado


---

# Fonte: 00-INDICE-E-STATUS-CANONICO.md

# Innovar Platform Architecture V3 — Índice e Status Canônico

**Versão:** 3.0  
**Status:** arquitetura canônica proposta  
**Substitui:** Blueprint V1 e Blueprint V2 como documentos isolados  
**Origem:** consolidação dos blueprints anteriores e correção das lacunas de horizontalidade, plug-and-play, experiência, empacotamento e extensibilidade.

---

# 1. Decisão documental

Os blueprints anteriores permanecem apenas como histórico:

- `BLUEPRINT_ARQUITETURA_WORK_OS_INNOVAR.md` → `SUPERSEDED`
- `BLUEPRINT_ARQUITETURA_WORK_OS_INNOVAR_V2_REVISADO.md` → `INCORPORATED_IN_V3`

A V3 é dividida em documentos especializados para evitar um arquivo monolítico e reduzir ambiguidades.

---

# 2. Documentos da arquitetura

1. `01-PLATFORM-KERNEL-E-WORK-OS.md`  
   Domínios, commands, eventos, autorização, workers, projeções, Work OS, consistência e operação.

2. `02-METADATA-OBJECT-RUNTIME.md`  
   Objetos customizáveis, campos, relacionamentos, regras, views, formulários, UI metadata, pesquisa e segurança.

3. `03-SOLUTION-PACKAGING-ALM.md`  
   Vertical packs, snapshots, dependências, camadas, instalação, atualização, rollback, promoção entre ambientes e governança.

4. `04-EXPERIENCE-CUSTOMER-RUNTIME.md`  
   Workspaces, UI runtime, portal, self-service, jornadas, omnichannel, white-label, acessibilidade e experiência do cliente.

5. `05-DEVELOPER-EXTENSION-PLATFORM.md`  
   APIs, OAuth, service accounts, webhooks, SDK, extension points, sandbox, quotas, versionamento e marketplace futuro.

6. `06-CONSTRUCTION-VERTICAL-PACK.md`  
   Transformação dos módulos atuais em primeiro vertical pack completo.

7. `07-GAPS-GATES-E-ROADMAP.md`  
   Matriz de cobertura, riscos residuais, gates, entregas e roadmap.

---

# 3. Princípios centrais

```text
Platform Kernel
+ Work OS
+ Metadata/Object Runtime
+ Solution Packaging
+ Experience Runtime
+ Developer Platform
= Plataforma horizontal plug-and-play
```

A construção civil é o primeiro vertical pack, não o núcleo rígido do produto.

---

# 4. Definição de plug-and-play adotada

Um pacote é plug-and-play quando pode:

1. declarar dependências;
2. validar compatibilidade;
3. provisionar objetos, campos, views e workflows;
4. instalar permissões e workspaces;
5. adicionar formulários, documentos, métricas e automações;
6. configurar integrações;
7. executar testes de aceitação;
8. preservar customizações locais;
9. ser atualizado seletivamente;
10. ser desativado sem apagar dados;
11. ser exportado e replicado;
12. produzir histórico e rollback.

---

# 5. Níveis de modularidade

| Nível | Descrição | Meta |
|---|---|---|
| L0 | mostrar ou ocultar módulos | existente |
| L1 | habilitar módulos compilados | existente/parcial |
| L2 | instalar vertical packs configuráveis | V3 obrigatória |
| L3 | criar objetos, páginas e processos por metadata | V3 obrigatória |
| L4 | instalar extensões externas assinadas e isoladas | fase futura |
| L5 | marketplace público com publishers e billing | fase futura |

A meta de médio prazo é atingir **L3 completo**.

---

# 6. Regra de governança

Nenhuma etapa futura deve:

- criar agenda própria em domínio;
- criar aprovação própria em domínio;
- duplicar comunicação;
- duplicar pessoas;
- executar SQL configurável por tenant;
- instalar DDL diferente por organização;
- modificar estado de outro domínio diretamente;
- publicar automação sem teste e limite;
- expor objeto customizado sem política e retenção;
- instalar pacote sem análise de dependência.


---

# Fonte: 01-PLATFORM-KERNEL-E-WORK-OS.md

# Platform Kernel e Work OS

**Objetivo:** estabelecer a infraestrutura comum de execução, consistência, autorização, trabalho e operação da Innovar.

---

# 1. Arquitetura

```text
Experience Layer
→ Work OS
→ Domain Apps
→ Platform Kernel
→ PostgreSQL / Supabase / Workers / Providers
```

## 1.1 Platform Kernel

- identidade;
- organizações;
- estrutura organizacional;
- entitlements;
- module registry;
- autorização;
- resource registry;
- command bus;
- eventos;
- outbox/inbox;
- idempotência;
- auditoria;
- storage;
- integrações;
- feature flags;
- observabilidade;
- lifecycle e retenção.

## 1.2 Work OS

- Work Inbox;
- atividades;
- compromissos;
- calendário;
- recursos;
- colaboração;
- aprovações;
- workflow;
- automações;
- comunicação;
- formulários;
- notificações;
- pesquisa;
- SLA;
- métricas operacionais;
- read models de workspace.

---

# 2. Propriedade dos dados

Cada estado possui um único domínio proprietário.

```text
CRM → lead e oportunidade
Projects → obra/projeto
Planning → cronograma e baseline
Tasks → execução e produção
Procurement → solicitação, RFQ e pedido
Inventory → movimentos, reservas e saldos
Finance → títulos, liquidações e caixa
Quality → inspeções e NCR
SAC → caso, diagnóstico e ordem
Calendar → agenda e reservas
Work OS → projeções pessoais, nunca o estado oficial
```

---

# 3. Vocabulário canônico

- **Tarefa:** trabalho com entregável, produção ou progresso.
- **Atividade:** próxima ação curta.
- **Compromisso:** reserva de horário e recursos.
- **Aprovação:** pedido formal de decisão.
- **Alerta:** exceção que exige atenção.
- **Notificação:** entrega de informação.
- **Mensagem:** comunicação persistida.
- **Work item:** projeção pessoal de trabalho.
- **Evento:** fato imutável.

---

# 4. Command boundary

Toda mutação crítica passa por command handler.

```text
Command
→ autenticação
→ tenant
→ entitlement
→ capacidade
→ escopo
→ estado e versão
→ guardas
→ transação
→ evento + outbox
→ auditoria
```

Commands devem receber:

- `expected_version`;
- `idempotency_key`;
- contexto resolvido server-side;
- payload validado;
- motivo quando necessário.

---

# 5. Contrato de eventos

```text
event_id
event_type
event_version
organization_id
aggregate_type
aggregate_id
aggregate_version
actor_id
actor_type
occurred_at
recorded_at
correlation_id
causation_id
request_id
idempotency_key
producer
payload
metadata
pii_classification
retention_class
```

Classes separadas:

- domain event;
- audit event;
- integration event;
- technical log.

---

# 6. Outbox, inbox e workers

A alteração de domínio, o evento e a outbox são persistidos na mesma transação.

Cada consumidor mantém inbox própria para deduplicação.

Workers possuem:

- lease;
- heartbeat;
- concorrência;
- shutdown seguro;
- retry exponencial;
- jitter;
- prioridade;
- limite por tenant;
- dead letter;
- reprocessamento;
- reconciliação;
- métricas.

Semântica:

```text
at-least-once
+ consumidores idempotentes
+ reconciliação externa
```

---

# 7. Autorização

## 7.1 Decisão

```text
identidade
+ organização
+ entitlement
+ capacidade
+ escopo
+ relação
+ estado
+ campo
+ alçada
+ segregação
+ MFA
```

## 7.2 Escopos

```text
OWN
ASSIGNED
FOLLOWING
TEAM
DEPARTMENT
PROJECT
ORGANIZATION
GROUP
SHARED
TEMPORARY
```

## 7.3 Projeções de acesso

```text
user_project_access
user_team_access
user_resource_relationships
effective_approval_limits
active_delegations
```

## 7.4 PEPs

- Server Actions;
- RPCs;
- Route Handlers;
- RLS;
- workers;
- downloads;
- APIs;
- UI.

---

# 8. Party Model

```text
parties
party_people
party_organizations
party_roles
party_relationships
party_contacts
party_addresses
party_identifiers
party_preferences
party_consents
```

Papéis são contextuais e múltiplos.

---

# 9. Estrutura organizacional horizontal

```text
business_groups
legal_entities
business_units
departments
teams
positions
territories
cost_centers
locations
working_calendars
```

Essa estrutura não pertence ao vertical de construção.

---

# 10. Resource Registry

```text
platform_resources
- id
- organization_id
- resource_type
- native_id
- owner_context
- project_id
- client_id
- visibility_class
- lifecycle_state
```

Recursos usados em segurança são registrados na mesma transação do objeto nativo.

FK tipada permanece obrigatória em relações críticas.

---

# 11. Work Inbox

É uma projeção.

```text
work_items
work_item_user_state
workspace_user_summary
workspace_team_summary
workspace_pending_decisions
workspace_risk_feed
workspace_change_feed
workspace_schedule_summary
```

A conclusão de um work item chama o command do domínio.

---

# 12. Calendar e SLA

```text
calendar_events
calendar_participants
calendar_resources
calendar_bookings
calendar_confirmations
calendar_checkins
resource_working_hours
resource_time_off
business_calendars
business_calendar_holidays
sla_clock_events
sla_pause_reasons
```

Todos os horários são armazenados em UTC e interpretados com timezone explícito.

---

# 13. Workflow, Rules e Automation

## Workflow

Controla estados, transições, guardas, motivos, campos obrigatórios e SLA.

## Rules Engine

Executa decisões puras e determinísticas:

- scoring;
- elegibilidade;
- alçada;
- roteamento;
- prioridade;
- garantia;
- seleção de equipe;
- cálculo de SLA.

## Automation

Reage a eventos e chama commands.

A automação nunca atualiza tabela crítica diretamente.

---

# 14. Aprovações

A aprovação referencia:

```text
resource_id
requested_command
requested_payload_hash
requested_state_version
```

Após aprovação, o command revalida versão e invariantes.

---

# 15. Observabilidade

Propagar:

- request;
- correlation;
- causation;
- tenant;
- actor;
- resource;
- event;
- automation run.

Métricas mínimas:

- latência;
- erros;
- retries;
- dead letters;
- queue lag;
- custo por tenant;
- falhas de provider;
- divergência de projeção.

---

# 16. Requisitos não funcionais

Cada subsistema deve declarar:

- p50/p95/p99;
- throughput;
- disponibilidade;
- RPO;
- RTO;
- limites;
- retenção;
- custo;
- degradação aceitável;
- estratégia de cache;
- comportamento em falha.

---

# 17. Testes

- unidade;
- SQL/RLS;
- concorrência;
- idempotência;
- integração;
- workflow;
- offline;
- tempo;
- configuração;
- carga;
- restore;
- E2E por profissão.


---

# Fonte: 02-METADATA-OBJECT-RUNTIME.md

# Metadata e Object Runtime

**Objetivo:** permitir que a Innovar modele novos domínios empresariais sem exigir criação manual de um módulo para cada objeto.

---

# 1. Escopo

O Object Runtime permite criar e versionar:

- objetos;
- campos;
- relacionamentos;
- constraints;
- índices;
- ações;
- eventos;
- permissões;
- views;
- formulários;
- workspaces;
- workflows;
- regras;
- pesquisa;
- retenção;
- APIs.

Ele não substitui domínios compilados quando existirem invariantes críticas.

---

# 2. Tipos de entidade

```text
COMPILED_ENTITY
METADATA_OBJECT
EXTERNAL_RESOURCE
PROJECTION_ONLY
```

## COMPILED_ENTITY

Usada para estoque, financeiro, assinatura, auditoria e outros contextos com invariantes complexas.

## METADATA_OBJECT

Usada para objetos configuráveis como:

- paciente;
- audiência;
- unidade imobiliária;
- matrícula;
- veículo;
- sinistro;
- tratamento;
- reserva.

## EXTERNAL_RESOURCE

Representação local de objeto pertencente a sistema externo.

## PROJECTION_ONLY

Objeto de leitura derivado.

---

# 3. Modelo de metadata

```text
object_definitions
object_versions
object_fields
object_relationships
object_constraints
object_indexes
object_actions
object_events
object_capabilities
object_scopes
object_retention_policies
object_search_config
```

Campos de `object_definitions`:

- key;
- singular;
- plural;
- namespace;
- owner pack;
- storage strategy;
- lifecycle;
- audit class;
- tenancy class;
- API exposure;
- search exposure.

---

# 4. Campos

Tipos permitidos:

- string;
- rich text sanitizado;
- integer;
- decimal;
- money;
- boolean;
- date;
- datetime;
- duration;
- enum;
- multi-enum;
- party reference;
- resource reference;
- typed relationship;
- address;
- phone;
- email;
- URL;
- file;
- image;
- JSON validado;
- calculated field.

Cada campo declara:

- tipo;
- nullable;
- default;
- sensitivity;
- uniqueness;
- searchability;
- filterability;
- sortability;
- masking;
- validation;
- retention;
- localization.

---

# 5. Estratégia de armazenamento

Modelo híbrido:

```text
campos canônicos e críticos → colunas tipadas
campos configuráveis → JSONB validado
campos de consulta frequente → índices controlados
objetos metadata-driven → tabela genérica por família ou tabela provisionada
```

A escolha entre tabela genérica e tabela provisionada deve ser definida por ADR.

Não permitir EAV irrestrito.

---

# 6. Relacionamentos

Tipos:

- one-to-one;
- one-to-many;
- many-to-many;
- parent-child;
- party role;
- resource link.

Cada relacionamento declara:

- cardinalidade;
- ownership;
- cascade;
- required;
- cross-tenant policy;
- inverse name;
- security inheritance;
- lifecycle.

---

# 7. Object Lifecycle

```text
DRAFT
IN_REVIEW
PUBLISHED
DEPRECATED
ARCHIVED
```

Versões publicadas são imutáveis.

Alterações incompatíveis exigem migration plan.

---

# 8. Object Actions

Ações metadata-driven são declarativas e limitadas:

- criar atividade;
- solicitar aprovação;
- emitir evento;
- iniciar workflow;
- gerar documento;
- enviar formulário;
- invocar command permitido.

Não permitir SQL ou script arbitrário.

---

# 9. UI Runtime

Definições:

```text
page_definitions
page_versions
form_definitions
list_definitions
kanban_definitions
timeline_definitions
dashboard_definitions
portal_page_definitions
component_definitions
visibility_rules
responsive_rules
```

Componentes permitidos:

- field;
- section;
- tabs;
- related list;
- activity feed;
- communication panel;
- KPI;
- chart;
- table;
- calendar;
- action bar;
- document panel;
- approval panel;
- timeline;
- custom safe widget.

---

# 10. Workspace Runtime

```text
workspace_definitions
workspace_versions
workspace_role_mappings
workspace_sections
workspace_widgets
workspace_actions
workspace_filters
workspace_visibility_rules
workspace_user_preferences
```

Workspaces são metadata, não rotas hard-coded por profissão.

---

# 11. Rules Engine

```text
rule_definitions
rule_versions
rule_inputs
rule_conditions
rule_decision_tables
rule_outputs
rule_test_cases
rule_executions
```

Regras são:

- puras;
- determinísticas;
- versionadas;
- simuláveis;
- auditáveis;
- sem efeito colateral.

---

# 12. Report e Semantic Layer

```text
semantic_models
semantic_entities
semantic_dimensions
semantic_measures
semantic_relationships
report_definitions
report_versions
report_schedules
report_deliveries
saved_views
```

Usuários não publicam SQL arbitrário.

---

# 13. Document Composer

```text
document_templates
document_template_versions
document_merge_schemas
document_generation_jobs
generated_documents
document_approvals
document_release_rules
document_renderers
document_signing_profiles
```

Recursos:

- campos;
- tabelas;
- blocos condicionais;
- repetição;
- anexos;
- numeração;
- idioma;
- PDF;
- versão;
- hash;
- aprovação;
- assinatura;
- distribuição.

---

# 14. Segurança

Cada objeto declara:

- capabilities;
- scopes;
- relation policies;
- field policies;
- retention;
- export permission;
- API permission;
- search permission.

Nenhum objeto é publicável sem política mínima.

---

# 15. Quotas

Cada tenant possui limites para:

- objetos;
- campos;
- índices;
- relacionamentos;
- layouts;
- workflows;
- automações;
- relatórios;
- tamanho de JSONB;
- volume de registros.

Criação de índice passa por análise de custo e fila administrativa.

---

# 16. Migração

Alterações de metadata suportam:

- preview;
- impact analysis;
- dry-run;
- backfill;
- transformações permitidas;
- rollback lógico;
- versão;
- dependências;
- registros inválidos;
- relatório de migração.


---

# Fonte: 03-SOLUTION-PACKAGING-ALM.md

# Solution Packaging, Blueprints, Snapshots e ALM

**Objetivo:** permitir que soluções horizontais e verticais sejam empacotadas, instaladas, replicadas, atualizadas e governadas.

---

# 1. Conceitos

## App

Unidade compilada de código e domínio.

## Capability Pack

Pacote horizontal reutilizável:

- calendar;
- field service;
- marketing;
- document composer;
- HR foundation.

## Vertical Pack

Pacote de indústria:

- construção;
- clínica;
- imobiliária;
- advocacia;
- oficina.

## Blueprint/Snapshot

Captura seletiva de configurações e componentes de uma organização.

## Solution

Pacote versionado contendo apps, metadata, configurações e testes.

---

# 2. Estrutura de pacote

```text
solution/
  solution.yaml
  dependencies.yaml
  entitlements.yaml
  objects/
  fields/
  relationships/
  roles/
  capabilities/
  workspaces/
  views/
  forms/
  workflows/
  rules/
  automations/
  messages/
  documents/
  reports/
  dashboards/
  integrations/
  seeds/
  translations/
  themes/
  tests/
  configuration-migrations/
```

---

# 3. Manifesto

```text
key
name
version
publisher
license
description
platform_compatibility
dependencies
optional_dependencies
conflicts
requested_capabilities
requested_integrations
components
checksums
signature
sbom
install_policy
upgrade_policy
disable_policy
uninstall_policy
data_retention_policy
```

---

# 4. Camadas e precedência

```text
Platform Core
↓
Horizontal Capability Pack
↓
Vertical Pack
↓
Regional/Legal Pack
↓
Organization Configuration
↓
Business Unit Override
↓
Role Workspace
↓
User Preference
```

A precedência deve ser determinística.

---

# 5. Managed e unmanaged

## Managed component

- pertence ao pack;
- pode ser atualizado pelo publisher;
- não pode ser alterado diretamente;
- aceita overlay controlado.

## Unmanaged component

- pertence à organização;
- não é sobrescrito automaticamente;
- pode derivar de managed component.

## Overlay

Customização local aplicada sobre componente gerenciado.

---

# 6. Instalação

Fluxo:

```text
upload/seleção
→ validar assinatura
→ validar compatibilidade
→ resolver dependências
→ analisar conflitos
→ calcular plano
→ dry-run
→ aprovar
→ provisionar
→ executar configuration migrations
→ executar smoke tests
→ ativar
```

Estados:

```text
AVAILABLE
ANALYZING
READY
INSTALLING
ACTIVE
FAILED
ROLLING_BACK
SUSPENDED
ARCHIVED
```

---

# 7. Atualização

A atualização deve:

- comparar versões;
- listar componentes adicionados, alterados e removidos;
- detectar overlays;
- identificar breaking changes;
- gerar plano;
- permitir exclusão seletiva;
- preservar customizações locais;
- executar testes;
- suportar rollback;
- produzir relatório.

---

# 8. Snapshot Engine

```text
solution_snapshots
snapshot_versions
snapshot_components
snapshot_exports
snapshot_imports
snapshot_import_components
snapshot_conflicts
snapshot_install_history
snapshot_upgrade_plans
snapshot_overlays
```

A captura permite selecionar:

- workflows;
- forms;
- objects;
- fields;
- calendars;
- templates;
- dashboards;
- reports;
- documents;
- workspaces;
- roles;
- automations;
- brand settings.

---

# 9. Identidade estável

Todo componente possui:

```text
component_key
component_type
namespace
publisher
stable_id
version
```

IDs de banco não são usados como identidade de pacote.

---

# 10. Conflitos

Tipos:

- chave existente;
- tipo incompatível;
- dependência ausente;
- overlay local;
- componente removido;
- capacidade indisponível;
- integração ausente;
- limite de plano;
- versão da plataforma.

Resoluções:

- manter local;
- substituir;
- mesclar;
- renomear;
- ignorar;
- bloquear instalação.

---

# 11. Promoção entre ambientes

```text
Development
→ Test
→ Staging
→ Production
```

Recursos:

- environment variables;
- secrets references;
- conexão diferente por ambiente;
- approvals;
- testes;
- freeze;
- release notes;
- promotion history.

---

# 12. Rollback

Rollback pode ser:

- configuração;
- ativação;
- overlay;
- pacote;
- feature flag.

DDL global não é revertida automaticamente em produção; usar expand-and-contract.

---

# 13. Testes de pacote

Cada solução pode incluir:

- schema validation;
- dependency tests;
- permission tests;
- workflow tests;
- automation tests;
- UI smoke tests;
- E2E;
- sample data validation.

---

# 14. Publisher Governance

Fase interna:

- publisher Innovar;
- assinatura interna;
- revisão arquitetural;
- SBOM;
- changelog;
- ownership.

Fase futura:

- publishers externos;
- certificação;
- sandbox;
- segurança;
- classificação;
- suporte;
- cobrança;
- reputação.


---

# Fonte: 04-EXPERIENCE-CUSTOMER-RUNTIME.md

# Experience e Customer Runtime

**Objetivo:** oferecer experiência configurável para profissionais, clientes, fornecedores e parceiros.

---

# 1. Superfícies

- workspace interno;
- app de campo;
- portal do cliente;
- portal do fornecedor;
- portal do subcontratado;
- assinatura;
- formulários públicos;
- central de ajuda;
- white-label.

---

# 2. Experience Shell

Topbar:

```text
Organização
Unidade/contexto
Pesquisa
Criar
Agenda
Meu Trabalho
Notificações
Ajuda
Perfil
```

Sidebar é gerada por pack, papel e capability.

---

# 3. Workspace por metadata

Cada workspace declara:

- público;
- objetivo;
- widgets;
- ações;
- filtros;
- saved views;
- métricas;
- contexto;
- layout responsivo;
- fallback;
- permissões.

Workspaces não são codificados por profissão.

---

# 4. Archetypes

- pipeline;
- transaction;
- project;
- document;
- execution;
- scheduling;
- master data;
- customer case.

Cada archetype possui componentes e comportamento próprios.

---

# 5. Customer Identity

Suportar:

- convite;
- ativação;
- recuperação;
- MFA opcional;
- múltiplos contatos;
- pessoa e empresa;
- acesso delegado;
- representante;
- revogação;
- troca de responsável;
- consentimentos;
- preferências.

---

# 6. Portal configurável

Página inicial pode conter:

- progresso;
- agenda;
- ações pendentes;
- documentos;
- contratos;
- assinaturas;
- pagamentos;
- formulários;
- mensagens;
- chamados;
- garantia;
- atualizações;
- central de ajuda.

---

# 7. Self-service

O cliente pode, conforme autorização:

- confirmar;
- reagendar;
- cancelar;
- enviar documento;
- responder formulário;
- aprovar decisão;
- aceitar proposta;
- assinar;
- pagar;
- abrir chamado;
- acompanhar;
- avaliar;
- atualizar preferências.

---

# 8. Customer Journey Runtime

```text
journey_definitions
journey_versions
journey_stages
journey_touchpoints
journey_actions
journey_messages
journey_slas
journey_metrics
journey_exceptions
```

Cada etapa declara:

- objetivo do cliente;
- objetivo interno;
- responsável;
- canal;
- mensagem;
- SLA;
- decisão;
- documento;
- risco;
- métrica;
- próxima etapa.

---

# 9. Omnichannel

Canais:

- portal;
- e-mail;
- WhatsApp;
- SMS;
- push;
- telefone registrado;
- presencial.

Toda interação gera histórico unificado.

Classificações:

```text
TRANSACTIONAL
OPERATIONAL
SERVICE
MARKETING
LEGAL
```

---

# 10. Consentimento e preferências

```text
communication_preferences
communication_consents
consent_purposes
consent_evidence
quiet_hours
preferred_language
preferred_channel
```

Opt-out de marketing não bloqueia comunicação operacional necessária.

---

# 11. Experiência do cliente

Métricas:

- tempo de resposta;
- taxa de confirmação;
- no-show;
- abandono;
- conclusão de formulário;
- adoção do portal;
- leitura;
- esforço;
- CSAT;
- NPS;
- reincidência;
- tempo de solução.

---

# 12. Formulários públicos

Devem possuir:

- link seguro;
- expiração;
- autenticação opcional;
- save/resume;
- acessibilidade;
- idioma;
- consentimento;
- proteção antiabuso;
- confirmação;
- versão;
- auditoria.

---

# 13. White-label

```text
brand_definitions
brand_domains
brand_themes
brand_email_senders
brand_portal_settings
brand_legal_documents
brand_localization
brand_asset_library
```

Herança:

```text
Platform Brand
→ Agency Brand
→ Customer Brand
```

---

# 14. Acessibilidade

Meta mínima:

- WCAG 2.2 AA;
- teclado;
- foco;
- contraste;
- 200% zoom;
- reflow;
- leitor de tela;
- redução de movimento;
- formulários acessíveis;
- mensagens de erro claras.

---

# 15. Mobile e offline

Mobile é uma superfície própria.

Recursos:

- fila local criptografada;
- idempotência;
- sincronização;
- conflito;
- anexos;
- câmera;
- voz;
- QR/barcode;
- check-in;
- wipe;
- device registration.

Operações críticas permanecem online.

---

# 16. Onboarding do tenant

```text
Criar organização
→ selecionar vertical
→ selecionar blueprint
→ configurar marca
→ criar unidades
→ conectar canais
→ importar dados
→ criar usuários
→ mapear papéis
→ testar
→ publicar
```

Recursos:

- setup wizard;
- checklist;
- demo data;
- readiness score;
- health check;
- treinamento;
- tours;
- retomada;
- suporte.


---

# Fonte: 05-DEVELOPER-EXTENSION-PLATFORM.md

# Developer e Extension Platform

**Objetivo:** permitir integrações e extensões controladas sem comprometer segurança, isolamento e estabilidade.

---

# 1. API pública

A plataforma deve oferecer APIs versionadas para:

- objects;
- parties;
- work;
- calendar;
- documents;
- forms;
- workflows;
- commands;
- reports;
- events.

Nunca expor tabelas internas diretamente.

---

# 2. Identidade técnica

```text
oauth_applications
oauth_grants
service_accounts
api_credentials
api_scopes
api_sessions
```

Suportar:

- OAuth 2.1;
- client credentials;
- authorization code;
- service accounts;
- scopes;
- expiração;
- rotação;
- revogação.

---

# 3. Webhooks

```text
webhook_subscriptions
webhook_deliveries
webhook_attempts
webhook_secrets
webhook_dead_letters
```

Recursos:

- assinatura;
- timestamp;
- replay protection;
- retry;
- idempotência;
- filtros;
- rate limit;
- logs;
- redelivery.

---

# 4. Versionamento e depreciação

Cada API declara:

- versão;
- status;
- data de depreciação;
- sunset;
- changelog;
- compatibility policy.

---

# 5. Quotas

- requests;
- burst;
- eventos;
- webhooks;
- storage;
- automações;
- exports;
- imports.

Quotas podem depender do plano.

---

# 6. Extension Points

Tipos permitidos:

- provider adapter;
- importer;
- exporter;
- safe widget;
- document renderer;
- communication channel;
- event consumer;
- command integration;
- report connector.

---

# 7. Sandbox

Extensões externas futuras devem executar em ambiente isolado com:

- CPU;
- memória;
- tempo;
- rede;
- secrets;
- filesystem;
- tenant;
- capability allowlist;
- logs;
- kill switch.

Não executar código de terceiro no processo principal.

---

# 8. SDK

SDKs devem fornecer:

- autenticação;
- idempotência;
- retries;
- pagination;
- webhooks;
- schemas;
- errors;
- observability context.

---

# 9. Developer Portal

- documentação;
- API explorer;
- apps;
- credentials;
- webhooks;
- logs;
- quotas;
- sandbox;
- changelog;
- status;
- suporte.

---

# 10. Import e Data Migration

```text
import_jobs
import_sources
import_mappings
import_validations
import_rows
import_errors
import_dedup_rules
import_reconciliation
import_lineage
```

Suportar CSV, XLSX e API.

Fluxo:

```text
upload
→ mapping
→ validation
→ preview
→ dry-run
→ import
→ reconcile
→ report
```

---

# 11. Enterprise Identity

Planejar:

- SSO OIDC;
- SAML;
- SCIM;
- verified domains;
- B2B invites;
- JIT provisioning;
- break-glass;
- access reviews;
- support impersonation controlada;
- device/session policy.

---

# 12. Marketplace futuro

Só iniciar após:

- package signing;
- sandbox;
- publisher governance;
- review pipeline;
- billing;
- entitlement;
- uninstall/retention;
- telemetry;
- support policy;
- vulnerability response.

Estados:

```text
DRAFT
SUBMITTED
IN_REVIEW
APPROVED
PUBLISHED
SUSPENDED
REVOKED
```


---

# Fonte: 06-CONSTRUCTION-VERTICAL-PACK.md

# Construction Vertical Pack

**Objetivo:** representar a construção civil como primeiro pacote vertical completo sobre a plataforma horizontal.

---

# 1. Dependências horizontais

O vertical depende de:

- Parties;
- Structure;
- Work OS;
- Calendar;
- Forms;
- Documents;
- Communication;
- Approvals;
- Workflow;
- Automation;
- Reporting;
- Integration Hub;
- Entitlements.

---

# 2. Apps compilados

- CRM;
- Clientes;
- Obras;
- Planejamento;
- Tarefas;
- Diário;
- Equipes;
- Orçamentos;
- Propostas;
- Contratos;
- Aditivos;
- Assinaturas;
- Documentos;
- Qualidade;
- Compras;
- Estoque;
- Financeiro;
- SAC;
- Relatórios;
- Auditoria;
- Administração.

---

# 3. Módulos adicionais do vertical

- Segurança do Trabalho;
- Subcontratados;
- Equipamentos e Frota;
- Controle Documental;
- RFI e Submittals;
- Riscos;
- Reuniões e decisões;
- Produtividade;
- RH/DP específico;
- Contábil/Fiscal brasileiro.

---

# 4. Personas

- direção;
- gestor comercial;
- vendedor;
- orçamentista;
- jurídico;
- gestor de obras;
- engenheiro residente;
- mestre;
- trabalhador;
- comprador;
- almoxarife;
- qualidade;
- segurança;
- financeiro;
- contábil;
- RH;
- document controller;
- SAC;
- técnico de campo;
- cliente;
- auditor;
- administrador.

---

# 5. Workspaces

Definidos por metadata:

- Direção;
- Comercial;
- Orçamentação;
- Gestão de Obras;
- Campo;
- Suprimentos;
- Almoxarifado;
- Qualidade;
- Segurança;
- Financeiro;
- SAC;
- Marketing.

---

# 6. Objetos específicos

Compilados ou metadata-driven conforme risco:

- obra;
- EAP;
- atividade de cronograma;
- tarefa de campo;
- diário;
- medição;
- composição;
- proposta;
- contrato;
- aditivo;
- inspeção;
- NCR;
- solicitação;
- RFQ;
- pedido;
- movimento;
- reserva;
- caso SAC;
- vistoria;
- diagnóstico;
- OS;
- garantia.

---

# 7. SAC como piloto

O SAC valida:

- Work Inbox;
- Calendar;
- Customer Portal;
- Messaging;
- Forms;
- Workflow;
- Rules;
- Automation;
- Approvals;
- Inventory;
- Mobile;
- KPI;
- Audit.

Agregados:

- Caso;
- Vistoria;
- Diagnóstico;
- Ordem;
- Agendamento;
- Material;
- Aceite;
- Garantia.

---

# 8. CRM e briefing

O pacote deve incluir:

- pipeline;
- distribuição;
- SLA;
- cadências;
- briefing “cinco respostas de ouro”;
- decisores;
- investimento;
- prazo;
- impedimentos;
- agenda;
- proposta;
- forecast;
- motivos de perda.

---

# 9. Automação de obra

Exemplos:

```text
fundação concluída
→ validar qualidade
→ selecionar fotos liberadas
→ gerar atualização
→ enviar ao cliente
→ registrar leitura
```

```text
material crítico indisponível
→ alertar gestor
→ criar ação de compras
→ recalcular risco do lookahead
```

---

# 10. Conteúdo do pack

O pacote deve conter:

- roles;
- capabilities;
- workspaces;
- workflows;
- forms;
- templates;
- documents;
- dashboards;
- metrics;
- automation recipes;
- seeds;
- demo data;
- acceptance tests;
- brand defaults;
- portal pages.

---

# 11. Não acoplar ao core

Nenhum conceito específico de construção deve ser obrigatório no Platform Kernel.

Exemplos que permanecem no vertical:

- obra;
- EAP;
- FVS;
- FVM;
- medição de obra;
- BDI;
- SINAPI;
- diário de obra;
- RFI;
- submittal.


---

# Fonte: 07-GAPS-GATES-E-ROADMAP.md

# Gaps, Gates e Roadmap

---

# 1. Cobertura após a V3

| Objetivo | Cobertura arquitetural estimada |
|---|---:|
| Work OS | 94% |
| ERP vertical de construção | 94% |
| Horizontalidade de processos | 95% |
| Horizontalidade de dados | 88% |
| Plug-and-play interno | 90% |
| Vertical packs | 90% |
| Experiência interna | 92% |
| Experiência do cliente | 88% |
| Developer platform | 82% |
| Marketplace público | 45% |

Percentuais são avaliação documental, não métricas de teste.

---

# 2. Lacunas residuais

Ainda dependem de ADR, POC e implementação:

- estratégia física do Object Runtime;
- performance real da RLS;
- custo de índices customizados;
- ergonomia do UI Composer;
- merge de overlays;
- atualização seletiva de snapshots;
- conflito offline;
- sandbox de extensões;
- localization internacional;
- billing real;
- publisher marketplace.

---

# 3. Roadmap

## Etapa 22A — Architecture Hardening

- context map;
- taxonomia;
- ADRs;
- Party Model;
- Resource Registry;
- entitlements;
- NFRs.

## Etapa 22B — Commands, Events e Workers

- command layer;
- event envelope;
- outbox/inbox;
- idempotência;
- worker runtime;
- observabilidade.

## Etapa 23 — Work OS Minimum

- activities;
- collaboration;
- notifications;
- Work Inbox;
- workspace runtime;
- search.

## Etapa 24 — Object Runtime POC

- object definitions;
- fields;
- relationships;
- forms;
- lists;
- permissions;
- API;
- migration.

## Etapa 25 — SAC Walking Skeleton

- caso;
- vistoria;
- agenda;
- mensagem;
- OS;
- aceite;
- portal;
- KPI.

## Etapa 26 — Solution Packaging POC

- manifest;
- dependencies;
- snapshot;
- import/export;
- conflicts;
- overlays;
- upgrade.

## Etapa 27 — Experience Runtime

- workspace composer;
- portal composer;
- self-service;
- journey;
- white-label.

## Etapa 28 — Workflow, Rules e Automation Studio

## Etapa 29 — Construction Pack 1.0

## Etapa 30 — CRM, Marketing e Social

## Etapa 31 — Developer Platform

## Etapa 32 — People, Safety, Accounting e Fiscal

## Etapa 33 — Marketplace Readiness

---

# 4. Gates

## Gate A — Domain and Metadata

- ownership;
- compiled versus metadata entity;
- migration;
- security;
- quotas.

## Gate B — Package Lifecycle

- dependencies;
- conflicts;
- install;
- upgrade;
- rollback;
- overlays.

## Gate C — Experience

- workspace;
- portal;
- journey;
- accessibility;
- mobile.

## Gate D — Developer

- API;
- scopes;
- webhooks;
- quotas;
- sandbox.

## Gate E — Production

- load;
- restore;
- RPO/RTO;
- security;
- incident response;
- cost.

---

# 5. POCs obrigatórias

1. Objeto metadata-driven com 100 mil registros.
2. Campo customizado indexado e filtrado com RLS.
3. Vertical pack instalado em organização vazia.
4. Atualização preservando overlay local.
5. Snapshot exportado e importado.
6. Workspace renderizado integralmente por metadata.
7. Portal do cliente configurado por pack.
8. Worker duplicado sem efeito duplicado.
9. API externa com OAuth e webhook assinado.
10. Restore de banco e Storage.
11. SAC end-to-end.
12. Tenant crossing test.

---

# 6. Definition of Done da arquitetura horizontal

Uma capability somente está completa quando possui:

- contrato;
- ownership;
- metadata;
- versionamento;
- segurança;
- lifecycle;
- instalação;
- atualização;
- rollback;
- observabilidade;
- quota;
- documentação;
- testes;
- experiência;
- API;
- retenção;
- migração.

---

# 7. Veredito

Com a V3, a Innovar passa a ter uma arquitetura coerente para:

```text
Platform Kernel
+ Work OS
+ Object Runtime
+ Solution Packaging
+ Experience Runtime
+ Developer Platform
+ Vertical Packs
```

A plataforma ainda não deve ser declarada pronta. Ela passa a estar **arquiteturalmente preparada** para atingir horizontalidade e plug-and-play, desde que as POCs e gates sejam cumpridas.

---

# Caderno Executável Consolidado — Correção em 4 Loops

## 1. Governança da fonte única

Este arquivo é o blueprint mestre. Alterações futuras devem editar esta versão e preservar um snapshot
imutável apenas após validação. Precedência: SQL → OpenAPI/AsyncAPI/JSON Schema → statecharts → testes
→ ADRs → narrativa.

## 2. Context Map executável

O Context Map formal está em `00-decisions/CONTEXT-MAP.md`. Escrita cross-context é proibida;
integração ocorre por command/API/event. Object Runtime publica linguagem para Work OS e Experience.
Solution Packaging usa uma camada anticorrupção para aplicar componentes.

## 3. Invariantes e enforcement

O catálogo em `00-decisions/INVARIANTS.yaml` liga tenancy, metadata, eventos, idempotência,
concorrência e packages aos mecanismos de enforcement. Uma afirmação sem enforcement não é considerada
capability integrada.

## 4. Object Definition lifecycle

Contrato formal:

```text
DRAFT → IN_REVIEW → PUBLISHED → DEPRECATED → ARCHIVED
           └────────→ DRAFT
```

- endpoint: `POST /v1/objects/{objectKey}/transitions`;
- request: `01-api/schemas/transition-request.schema.json`;
- machine: `03-statecharts/xstate/object-definition.machine.ts`;
- event: `metadata.object.transitioned.v1`;
- persistence: `platform.state_machine_instances` e `platform.state_machine_transitions`;
- acceptance: `04-bdd/features/object-lifecycle.feature`.

Versões publicadas são imutáveis. Transições exigem versão esperada. Versões desconhecidas da machine
interrompem processamento e geram alerta.

## 5. DLQ e falhas terminais

Falhas terminais são armazenadas por tenant em `platform.dead_letter_messages`, sem apagar histórico.
Replay conserva `source_event_id` para deduplicação. Operação segue `05-infra/runbooks/dlq.md`.

## 6. SLOs

`00-decisions/NFR-SLO-CATALOG.yaml` define metas arquiteturais. Elas não são resultados medidos.
Produção exige telemetria por 30 dias, testes de restore e evidência de tenant isolation.

## 7. Rastreabilidade

`traceability/MATRIX.md` é a matriz canônica. Estados aceitos:

- DESCRIBED;
- FORMALIZED;
- IMPLEMENTED;
- TESTED;
- INTEGRATED.

Nenhum item desta rodada foi promovido a `INTEGRATED`, pois não houve stack real disponível.

## 8. Gaps mantidos abertos

- runtime HTTP não executado;
- SQL não aplicado em PostgreSQL;
- OpenAPI/AsyncAPI não processados por bundler/linter externo;
- Kafka/Redis não executados;
- BDD sem step definitions contra serviços reais;
- Helm não instalado;
- Terraform ausente;
- SDK não gerado automaticamente do OpenAPI;
- Package Runtime, Customer Runtime e Marketplace sem walking slice.

## 9. Regra para a meta de 95%

A meta só é atingida com média ≥95%, nenhuma dimensão <90%, CI verde, contratos bundled/lintados,
DDL aplicado em banco limpo, BDD real, SDK gerado/testado, Helm instalado, Terraform aplicado e
walking slices de Package Runtime e Customer Runtime.
# Reinício imparcial — Loops 5 a 8

## Cobertura revisada

A cobertura de 68,9% foi revogada após revisão da qualidade da evidência. Parsing de YAML/JSON,
contagem de Gherkin e presença de templates não equivalem a integração executada.

**Cobertura histórica declarada naquele reinício: 62,2% — SUPERSEDED.**

## Correções incorporadas à fonte única

- contrato HTTP alinhado a ETag forte e à estratégia `JSONB_HYBRID` realmente suportada;
- transition request restrito aos eventos canônicos e reasons obrigatórios;
- enforcement SQL de imutabilidade de versões publicadas;
- FK de records para object version concreta;
- tenant-aware constraints, FKs, índices e RLS no runtime de statecharts e DLQ;
- quota function endurecida contra contexto de tenant divergente;
- lifecycle reference implementation com guards explícitos;
- testes automatizados locais e compilação TypeScript.

## Evidência disponível

- `audit/VALIDATION-RESULT-RESTART.txt`;
- `audit/SDK-TSC-RESULT-RESTART.txt`;
- `tests/test_contracts.py`;
- `audit/AUDITORIA-IMPARCIAL-RESTART-4-LOOPS.md`;
- `traceability/MATRIX.md`.

## Limite da rodada

Não houve PostgreSQL, Kafka, Redis, Docker, Helm ou Terraform disponíveis para execução. Portanto,
SQL, RLS, eventos, cache e IaC permanecem no máximo formalizados/testados localmente, não integrados.


# Ciclo independente atual — evidência local ampliada

## Regra de medição

O checklist `00-decisions/COVERAGE-CHECKLIST.yaml` é obrigatório. Contagem de arquivos, linhas, cenários ou templates não é evidência de execução. A matriz deve registrar contrato, enforcement, evidência reproduzida e gap aberto.

## Correções incorporadas

- runtime de referência em memória para lifecycle, isolamento lógico por tenant e idempotência;
- sete testes de aceitação locais correspondentes a comportamentos únicos;
- validador ampliado para executar toda a suíte `test_*.py`;
- classificação explícita dos 136 cenários Gherkin como descritivos, pois há variantes repetidas;
- matriz de rastreabilidade atualizada e relatórios conflitantes movidos para histórico.

## Cobertura atual

A evidência local adicionada permite avanço limitado em testes de aceitação e idempotência, sem promoção a integração.

**Cobertura histórica declarada naquele ciclo: 62,8% — SUPERSEDED.**

A meta de 95% permanece não atingida. PostgreSQL, HTTP integrado, broker, Redis, Helm e Terraform continuam sem execução comprovada.


# Registro histórico — reinício cirúrgico (SUPERSEDED)

A cobertura de 62,8% foi revogada após detecção de drift entre API, evento, SDK, SQL e Helm. As correções desta rodada foram validadas por 19 testes locais e compilação TypeScript, porém não houve execução integrada.

**Cobertura histórica declarada naquele ciclo: 59,3% — SUPERSEDED.**

A matriz `traceability/MATRIX.md` contém a justificativa por dimensão. Permanecem abertos PostgreSQL real, API HTTP, broker, Redis, BDD integrado, Helm renderizado/instalado, Terraform, SDK gerado e exercícios operacionais.


# Adendo canônico — reauditoria cirúrgica 2026-07-22

A migration `0006_tenancy_and_function_signature_hardening.sql` corrige uma incompatibilidade de assinatura que poderia preservar a versão insegura de `reserve_quota`. Em PostgreSQL, `varchar` e `text` formam assinaturas distintas para resolução de funções; por isso foi necessária a remoção explícita da sobrecarga legada.

As tabelas `domain_events`, `outbox_messages` e `consumer_inbox` passam a possuir RLS e policies tenant-aware na especificação. Essa evidência permanece **formalizada e testada estaticamente**, pois o banco não foi executado.

Naquele ciclo histórico, a cobertura permaneceu em **59,3%**. Esse valor está `SUPERSEDED` e não representa a release atual.

---

## Rodada vertical 1 — Metadata Runtime / Object Definitions (2026-07-22)

Esta rodada inaugura a medição por capability × 18 facetas. O SCI da plataforma permanece **não calculado**; apenas `Object Definitions` foi avaliada.

- SCI da capability `Object Definitions`: **77,2%**.
- EEI histórico global: **59,3%**, sem promoção nesta rodada.
- Resultado anti-regressão: nenhuma regressão contratual detectada nos indicadores automatizados.

Evidência canônica: `traceability/CAPABILITY-FACET-MATRIX.yaml`.

Gaps prioritários mantidos: endpoint individual de leitura; schemas internos de command/query; SDK incompleto; BDD sem step definitions; ausência de PostgreSQL real; ausência de IaC específica do Metadata Runtime; restore e rollback não exercitados.


## Walking slice — Event Transport execution hardening (2026-07-22)
Fonte: `capabilities/event-transport/SPEC.md`.

Foram especificados e implementados como artefatos: função atômica de evento+outbox, lifecycle SQL completo de outbox/inbox, publisher Redpanda HTTP executável, API administrativa de DLQ/replay, worker Helm com HPA por backlog, gate de compatibilidade e game day.

**Evidência executada nesta estação:** suíte Python, validação de contratos, compilação TypeScript, publisher contra broker HTTP de contrato e gate de compatibilidade.  
**Evidência não executada:** PostgreSQL real, Redpanda real, render/install Helm e BDD por step definitions. Esses itens permanecem abertos e não podem ser contabilizados como execução.


## Walking slice — Event Transport game day e replay executável (2026-07-22)

Foram implementados handlers HTTP de referência para listagem da DLQ, replay idempotente e resolução, com isolamento por organização, ator obrigatório e trilha de replay. Foram adicionados step definitions executáveis e um game day local que injeta indisponibilidade do broker, restaura o serviço, executa replay, verifica idempotência e registra RTO.

**Resultados executados:** 31 testes principais aprovados; 3 testes BDD executáveis aprovados; compatibilidade de eventos aprovada; validação estática Helm aprovada; RTO local observado de **2,975 ms**.

**Limites:** o broker usado no game day é controlado em processo e não Redpanda; PostgreSQL não foi executado; Helm não foi renderizado nem instalado por ausência do binário; o RTO observado não representa ambiente produtivo.

**SCI da capability Event Transport: 82,2%.** Esse valor mede apenas a completude das 18 facetas da capability e não deve ser extrapolado para a plataforma inteira.

## Ciclo Event Transport — binding BDD e consumo local

O SCI da capability permanece **82,2%**. A rodada adicionou evidência local sem promover integração externa: 34 testes principais aprovados; 2 cenários Gherkin executados e aprovados; 2 bloqueados por ausência de PostgreSQL; 0 cenários sem binding na feature específica; game day local com 1 mensagem publicada e 1 consumida, sem perda ou duplicidade. PostgreSQL, Redpanda e Helm oficial continuam não executados.

---

## Atualização canônica — reconstrução AUTO5 (22/07/2026)

Esta atualização recompõe sobre o pacote AUTO4 as alterações do ciclo AUTO5 cujo artefato anterior expirou. O blueprint permanece a fonte canônica; relatórios anteriores são históricos.

### Event Transport — hardening incorporado

- migrations `0008_event_transport_security_and_retry_hardening.sql` e `0009_dlq_admin_runtime.sql`;
- validação explícita de tenant, worker, erro, hash, lease e limite de 100 tentativas;
- retorno `DUPLICATE_BUSY_OR_EXHAUSTED` para claim não concedido;
- replay de DLQ idempotente por `(organization_id, idempotency_key)`;
- RLS obrigatória para auditoria de replay;
- adapter PostgreSQL de referência com `SET LOCAL` via `set_config`;
- handlers administrativos exigindo o escopo `events.admin`;
- hardening do publisher Helm: `runAsNonRoot`, seccomp, filesystem somente leitura, capabilities removidas, probes e período de encerramento;
- NetworkPolicy explícita para DNS, PostgreSQL e broker.

### Evidências desta reconstrução

- 41 testes locais da suíte principal aprovados;
- 4 testes BDD executáveis aprovados;
- compatibilidade de eventos aprovada;
- validação Helm estática aprovada;
- SDK TypeScript compilado;
- game day local aprovado com 1 mensagem publicada, 1 consumida, zero perdas e zero duplicidades.

### Limites não promovidos

PostgreSQL, Redpanda e Helm oficial não foram executados neste ambiente. O RTO observado do game day é local e não pode ser tratado como RTO distribuído ou produtivo.

**SCI da capability Event Transport: 84,4%.** Não extrapolar para cobertura global da plataforma.

---
## Ciclo AUTO6 — prontidão de evidência integrada

### Alterações canônicas
- O gate PostgreSQL agora aplica migrations `0001–0009`, aplica RLS, executa `gen_random_uuid()`, verifica UUID v4, cria duas roles `NOBYPASSRLS`, verifica funções, concorrência de claim e executa o adapter PostgreSQL.
- Código 77 representa `BLOCKED` e jamais pode ser convertido em PASS ou aumento de cobertura.
- NetworkPolicies deixaram de depender de labels literais ocultas: namespaces, labels e portas são parâmetros do chart e possuem contrato em `05-infra/contracts/dependency-label-contract.yaml`.
- Workflow reproduzível foi adicionado para contratos, PostgreSQL e `helm lint` + `helm template` + kubeconform estrito.
- O runbook `integration-evidence-gate.md` define cadeia de custódia, versões, timestamps, exit codes e SHA-256.

### Evidência desta rodada
- 46 testes locais: PASS.
- OpenAPI, AsyncAPI, JSON Schema, SQL estático, statecharts, BDD local, IaC estático, SDK e runbooks: PASS nos gates locais.
- Gate externo: BLOCKED por ausência de Docker, Helm, kubeconform, kubectl, PostgreSQL e `TEST_DATABASE_URL`.
- SCI Event Transport permanece 84,4%; prontidão aumentou, mas evidência integrada não foi produzida.
