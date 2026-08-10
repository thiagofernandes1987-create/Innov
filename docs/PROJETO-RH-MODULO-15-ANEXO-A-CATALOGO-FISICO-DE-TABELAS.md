# Projeto RH — Módulo 15 — Anexo A — Catálogo Físico de Tabelas

**Versão:** 0.1.0  
**Estado:** catálogo físico proposto; migrations não iniciadas  
**Data:** 6 de agosto de 2026  
**Documento principal:** `PROJETO-RH-MODULO-15-DESIGN-DE-DADOS-CATALOGO-RLS-E-MIGRATIONS.md`

---

## 1. Convenções do catálogo

- `T`: tabela tenant-scoped, com `organization_id` e integridade composta;
- `G`: catálogo global versionado, sem escrita por usuário comum;
- `P`: tabela no schema `rh_private`;
- `O`: tabela no schema `rh_ops`;
- `A`: append-only depois de confirmada;
- `V`: raiz ou conteúdo com versões imutáveis;
- `L`: razão de movimentos;
- `R`: escrita somente por RPC ou worker;
- `S`: contém dados sensíveis;
- `C`: contém dados clínicos;
- `J`: contém dados judiciais;
- `F`: contém dados financeiros.

Toda tabela tenant-scoped deverá possuir `unique (organization_id, id)`. As FKs entre tabelas tenant-scoped deverão incluir `organization_id`, salvo exceção documentada e testada.

---

## 2. Recursos existentes reutilizados

O Projeto RH não criará duplicatas dos seguintes recursos da plataforma:

| Recurso existente | Uso pelo RH |
|---|---|
| `public.organizations` | tenant e fronteira primária de acesso |
| `auth.users` | identidade autenticada e atores de decisão |
| registry de módulos e permissões | ativação do aplicativo e acesso genérico |
| `public.projects` | obras e projetos |
| `public.finance_cost_centers` | centros de custo canônicos |
| tabelas de Financeiro | títulos, pagamentos, contas e conciliações financeiras |
| tabelas de Estoque e Ativos | itens, EPI, ferramentas, ativos e custódias quando aplicável |
| documentos e modelos versionados | geração de contratos, avisos, demonstrativos e documentos |
| Storage privado e quarentena | armazenamento e varredura dos bytes |
| Auditoria e Observabilidade | eventos técnicos, alertas e correlação da plataforma |

A integração será feita por FKs, contratos, RPCs ou outbox. O RH não gravará diretamente nas tabelas internas de outro contexto sem contrato explícito.

---

## 3. Colunas comuns

### 3.1 Entidade mutável tenant-scoped

```text
id uuid PK
organization_id uuid NOT NULL
status text ou enum interno estável
row_version bigint NOT NULL DEFAULT 1
created_by uuid NULL
updated_by uuid NULL
created_at timestamptz NOT NULL
updated_at timestamptz NOT NULL
```

### 3.2 Conteúdo versionado

```text
id uuid PK
organization_id uuid NOT NULL
root_id uuid NOT NULL
version_number integer NOT NULL
previous_version_id uuid NULL
effective_from date ou timestamptz
effective_to date ou timestamptz NULL
status
content_hash text NULL
created_by uuid NULL
created_at timestamptz NOT NULL
approved_by uuid NULL
approved_at timestamptz NULL
```

### 3.3 Evento ou movimento append-only

```text
id uuid PK
organization_id uuid NOT NULL
aggregate_type text
aggregate_id uuid
sequence_number bigint
occurred_at timestamptz
recorded_at timestamptz
actor_user_id uuid NULL
correlation_id uuid
causation_id uuid NULL
metadata jsonb sanitizado
```

---

## 4. `rh_core` — Pessoa, trabalhador e relações

| Tabela | Flags | Finalidade | Colunas centrais | Constraints e RLS |
|---|---|---|---|---|
| `public.rh_people` | T,S | raiz estável da pessoa natural | `display_name`, `birth_date`, `preferred_name`, `nationality_code`, `deceased_at`, `row_version` | leitura minimizada; escrita `rh.person.manage`; sem exclusão após uso |
| `public.rh_person_identifiers` | T,S,V | CPF, RG, CNH, passaporte e outros identificadores | `person_id`, `identifier_type_id`, `normalized_value_ciphertext`, `value_hash`, `issued_at`, `expires_at`, `version_number` | unique parcial por tipo/hash; máscara em views; acesso restrito |
| `public.rh_identifier_types` | G,V | catálogo de tipos de documento | `code`, `name`, `country_code`, `validation_rule`, `effective_from`, `effective_to` | somente leitura autenticada autorizada |
| `public.rh_person_contacts` | T,S,V | telefones e e-mails versionados | `person_id`, `contact_type`, `normalized_value`, `is_primary`, `verified_at`, vigência | no máximo um primário ativo por tipo |
| `public.rh_person_addresses` | T,S,V | endereços versionados | `person_id`, `address_type`, campos normalizados, geografia opcional, vigência | dados minimizados em consultas gerais |
| `public.rh_workers` | T,V | identidade ocupacional dentro da organização | `person_id`, `worker_code`, `worker_type`, `status`, `first_relationship_at`, `last_relationship_at` | unique `(organization_id, person_id)` conforme política; sem vínculo automático |
| `public.rh_worker_user_links` | T,S,V | ligação controlada entre trabalhador e login | `worker_id`, `user_id`, `link_type`, `effective_from`, `effective_to`, `verified_by` | unique ativo por vínculo; não cria emprego |
| `public.rh_person_relationships` | T,S,V | relação entre pessoas | `source_person_id`, `target_person_id`, `relationship_type_id`, vigência | impede self-link inválido e cruzamento de tenant |
| `public.rh_relationship_types` | G,V | parentesco e relações civis | `code`, `name`, `is_symmetric`, vigência | catálogo global versionado |
| `public.rh_person_roles` | T,S,V | papel por finalidade: dependente, alimentando, beneficiário, contato | `relationship_id`, `role_type`, `context_type`, `context_id`, vigência | papel não deriva automaticamente do parentesco |
| `public.rh_person_consents` | T,S,V | consentimentos quando juridicamente aplicáveis | `person_id`, `purpose_code`, `status`, `captured_at`, `withdrawn_at`, `evidence_document_id` | não usado como base universal; histórico preservado |
| `public.rh_person_events` | T,A | eventos cadastrais e correções | `person_id`, `event_type`, `occurred_at`, `correlation_id`, `metadata` | insert por RPC; sem update/delete |

---

## 5. `rh_org` — Empresa, estabelecimento e estrutura

| Tabela | Flags | Finalidade | Colunas centrais | Constraints e RLS |
|---|---|---|---|---|
| `public.rh_legal_entities` | T,S,V | empresa empregadora/declarant | `legal_name`, `trade_name`, `registration_type`, `registration_hash`, `status`, vigência | unique código interno e registro ativo; capacidade administrativa |
| `public.rh_establishments` | T,S,V | estabelecimento da empresa | `legal_entity_id`, `code`, `name`, `registration_type`, `registration_hash`, `address_id`, vigência | FK composta para empresa; unique por empresa/código |
| `public.rh_organizational_units` | T,V | departamentos, diretorias e unidades | `legal_entity_id`, `parent_unit_id`, `code`, `name`, `unit_type`, vigência | prevenção de ciclo; unique ativo por escopo |
| `public.rh_job_titles` | T,V | catálogo de cargos | `code`, `name`, `description`, `classification_code`, vigência | versionado; não equivale a função |
| `public.rh_work_functions` | T,V | função efetivamente exercida | `code`, `name`, `description`, `risk_profile_id`, vigência | ligação opcional com cargo; versionado |
| `public.rh_positions` | T,V | posição autorizada na estrutura | `unit_id`, `job_title_id`, `code`, `capacity`, `employment_type`, `status`, vigência | ocupação derivada; capacidade positiva |
| `public.rh_position_occupancies` | T,V | ocupação temporal de posição | `position_id`, `employment_id`, `allocation_percentage`, vigência | exclusão de sobreposição conforme capacidade |
| `public.rh_lotations` | T,V | lotação contratual/tributária | `employment_id`, `legal_entity_id`, `establishment_id`, `unit_id`, `position_id`, `is_primary`, vigência | uma lotação principal por instante |
| `public.rh_cost_allocations` | T,V | rateio para centro de custo e obra | `employment_id`, `cost_center_id`, `project_id`, `percentage`, vigência | soma por período conforme política; não altera líquido |
| `public.rh_org_hierarchy_events` | T,A | reorganizações e mudanças de hierarquia | `unit_id`, `event_type`, `effective_at`, `metadata` | append-only por RPC |

---

## 6. `rh_admission` — Pré-admissão e ativação

| Tabela | Flags | Finalidade | Colunas centrais | Constraints e RLS |
|---|---|---|---|---|
| `public.rh_admission_cases` | T,S,V | raiz do caso auditável | `candidate_person_id`, `proposed_legal_entity_id`, `proposed_establishment_id`, `case_number`, `status`, `target_start_date`, `row_version` | unique número; transições por RPC |
| `public.rh_admission_case_versions` | T,S,V,A | snapshot de condições propostas | `admission_case_id`, `version_number`, `proposed_contract`, `effective_at`, `content_hash` | imutável após submissão |
| `public.rh_admission_checklist_templates` | T,V | checklist por contexto e vigência | `name`, `worker_category`, `legal_entity_id`, `version_number`, vigência | versão aprovada não editável |
| `public.rh_admission_checklist_items` | T,V | itens do template | `template_id`, `code`, `label`, `requirement_type`, `blocking`, `sort_order` | unique template/código |
| `public.rh_admission_case_tasks` | T,S,V | instância do checklist | `admission_case_id`, `template_item_id`, `status`, `assigned_to`, `completed_at`, `waiver_id` | bloqueio conforme item; histórico |
| `public.rh_admission_documents` | T,S,V | documentos exigidos e recebidos | `admission_case_id`, `document_type_id`, `status`, `current_version_id`, `verified_at` | recebido ≠ verificado |
| `public.rh_admission_approvals` | T,S,A | decisões do caso | `admission_case_id`, `approval_type`, `status`, `decided_by`, `decided_at`, `reason` | insert por comando; sem alteração posterior |
| `public.rh_admission_waivers` | T,S,A | exceções a requisitos | `case_task_id`, `reason`, `evidence_document_id`, `approved_by`, `approved_at`, `expires_at` | capacidade especial e auditoria |
| `public.rh_admission_activation_attempts` | T,A,R | tentativas idempotentes de ativação | `admission_case_id`, `idempotency_key`, `status`, `employment_id`, `error_code` | unique idempotency; escrita por RPC |
| `public.rh_admission_events` | T,A | eventos do caso | `admission_case_id`, `event_type`, `occurred_at`, `correlation_id`, `metadata` | append-only |

---

## 7. `rh_contracts` — Vínculo, contrato e alterações

| Tabela | Flags | Finalidade | Colunas centrais | Constraints e RLS |
|---|---|---|---|---|
| `public.rh_employments` | T,S,V | raiz estável do vínculo | `worker_id`, `legal_entity_id`, `employment_number`, `relationship_type`, `status`, `started_on`, `ended_on` | unique por empresa/número; término não apaga |
| `public.rh_employment_contracts` | T,S,V | raiz do contrato | `employment_id`, `contract_type`, `status`, `current_version_id` | um contrato principal ativo conforme categoria |
| `public.rh_contract_versions` | T,S,F,V,A | condições contratuais | `contract_id`, `version_number`, vigência, remuneração, jornada, cargo, função, sindicato, conteúdo/hash | exclusion de sobreposição; imutável após aplicação |
| `public.rh_contract_change_requests` | T,S,V | solicitação de alteração | `employment_id`, `change_type`, `requested_effective_from`, `status`, `reason`, `row_version` | transições por RPC |
| `public.rh_contract_change_items` | T,S,V | diferenças propostas | `change_request_id`, `field_code`, `old_value`, `new_value`, `sensitivity` | campos críticos tipados ou validados |
| `public.rh_contract_change_impacts` | T,S,A | impactos em folha, ponto, benefícios e obrigações | `change_request_id`, `impact_type`, `period_from`, `period_to`, `status` | não substitui reprocessamento |
| `public.rh_contract_approvals` | T,S,A | aprovações segregadas | `change_request_id`, `approval_type`, `status`, `decided_by`, `decided_at` | histórico imutável |
| `public.rh_contract_documents` | T,S,V | documentos vinculados | `contract_id`, `change_request_id`, `document_type_id`, `current_version_id`, `status` | documento é evidência, não fonte única |
| `public.rh_contract_application_runs` | T,A,R | aplicação transacional da nova versão | `change_request_id`, `idempotency_key`, `created_version_id`, `status`, `error_code` | unique idempotency |
| `public.rh_contract_events` | T,A | eventos de contrato | `employment_id`, `contract_id`, `event_type`, `effective_at`, `correlation_id` | append-only |

---

## 8. `rh_time` — Jornada, marcações e banco de horas

| Tabela | Flags | Finalidade | Colunas centrais | Constraints e RLS |
|---|---|---|---|---|
| `public.rh_work_schedule_policies` | T,V | raiz da política de jornada | `code`, `name`, `status`, `current_version_id` | unique código |
| `public.rh_work_schedule_versions` | T,V,A | regras da jornada | `policy_id`, `version_number`, vigência, minutos, tolerâncias, adicionais, conteúdo/hash | imutável após aprovação |
| `public.rh_shift_templates` | T,V | modelo de turno | `policy_version_id`, `code`, `start_local_time`, `end_local_time`, intervalos, `crosses_midnight` | duração e intervalos válidos |
| `public.rh_schedule_assignments` | T,V | política/escala por vínculo | `employment_id`, `policy_version_id`, `shift_template_id`, vigência | sobreposição controlada |
| `public.rh_planned_shifts` | T,V | turno concreto planejado | `employment_id`, `work_date`, `planned_start_at`, `planned_end_at`, `project_id`, `status` | unique conforme escala; não gera presença |
| `public.rh_time_punches` | T,S,A,R | marcação original | `employment_id`, `punch_type`, `occurred_at`, `recorded_at`, `source_id`, `device_event_id`, `location_id`, `content_hash` | append-only; idempotência por fonte/evento |
| `public.rh_time_punch_sources` | T,V | REP, app, importação ou ajuste legal | `code`, `source_type`, `device_id`, `status`, vigência | configuração controlada |
| `public.rh_time_treatment_cases` | T,S,V | caso de tratamento | `employment_id`, `work_date`, `status`, `reason_code`, `row_version` | não altera punch bruto |
| `public.rh_time_treatment_actions` | T,S,A | inclusão, desconsideração ou classificação | `case_id`, `action_type`, `target_punch_id`, `proposed_at`, `reason`, `approved_by` | append-only e aprovado |
| `public.rh_time_calculation_runs` | T,A,R | apuração versionada | `employment_id`, `period_start`, `period_end`, `policy_snapshot`, `input_hash`, `status` | nova execução, sem overwrite |
| `public.rh_time_calculation_lines` | T,A,F | minutos e eventos calculados | `run_id`, `work_date`, `line_type`, `minutes`, `rate_factor`, `source_refs` | valores derivados e imutáveis |
| `public.rh_time_bank_accounts` | T,V | conta de banco de horas | `employment_id`, `agreement_version_id`, `status`, `opened_on`, `closed_on` | uma conta aplicável por acordo |
| `public.rh_time_bank_movements` | T,A,L,F | créditos, débitos e expirações | `account_id`, `movement_type`, `minutes`, `effective_on`, `source_type`, `source_id` | saldo derivado; reversão vinculada |
| `public.rh_time_period_closures` | T,A,R | fechamento por competência | `legal_entity_id`, `competence_date`, `scope_type`, `scope_id`, `status`, `closed_by`, `closed_at` | unique escopo/competência/versão |
| `public.rh_time_reopening_cases` | T,A,R | reabertura controlada | `closure_id`, `reason`, `approved_by`, `opened_at`, `new_closure_id` | preserva fechamento anterior |

---

## 9. `rh_leave` — Férias, ausências e afastamentos

| Tabela | Flags | Finalidade | Colunas centrais | Constraints e RLS |
|---|---|---|---|---|
| `public.rh_vacation_entitlement_periods` | T,V | período aquisitivo | `employment_id`, `accrual_start`, `accrual_end`, `grant_deadline`, `status` | unique por vínculo/período |
| `public.rh_vacation_movements` | T,A,L,F | aquisição, consumo, abono e ajuste | `entitlement_period_id`, `movement_type`, `days`, `effective_on`, `source_id` | saldo derivado e reversões |
| `public.rh_vacation_requests` | T,S,V | solicitação/programação | `employment_id`, `requested_start`, `requested_days`, `sell_days`, `status`, `row_version` | conflitos temporais avaliados |
| `public.rh_vacation_grants` | T,S,F,V | concessão aprovada | `request_id`, `start_on`, `end_on`, `notice_document_id`, `payroll_run_id`, `status` | programação ≠ gozo; alteração controlada |
| `public.rh_vacation_collective_cases` | T,S,V | férias coletivas | `legal_entity_id`, `establishment_id`, `unit_id`, período, `status` | gera casos individuais vinculados |
| `public.rh_absence_occurrences` | T,S,A | ausência detectada | `employment_id`, `planned_shift_id`, `absence_type`, `occurred_on`, `source_type`, `status` | ausência não vira afastamento automaticamente |
| `public.rh_absence_justifications` | T,S,V | justificativa e decisão | `absence_id`, `reason_type_id`, `document_id`, `status`, `decided_by` | documento recebido ≠ aceito |
| `public.rh_leave_cases` | T,S,V | raiz do afastamento | `employment_id`, `leave_type_id`, `started_on`, `expected_end_on`, `actual_end_on`, `status` | matriz de sobreposição |
| `public.rh_leave_periods` | T,S,V,A | períodos e prorrogações | `leave_case_id`, `version_number`, `start_on`, `end_on`, `decision_source` | intervalos válidos e imutáveis após decisão |
| `public.rh_leave_documents` | T,S,V | atestados e evidências | `leave_case_id`, `document_type_id`, `current_version_id`, `status` | conteúdo clínico separado |
| `public.rh_external_benefit_cases` | T,S,F,V | benefício previdenciário externo | `leave_case_id`, `external_system`, `benefit_reference`, `status`, datas | não equivale ao afastamento interno |
| `public.rh_return_to_work_cases` | T,S,V | retorno explícito | `leave_case_id`, `planned_return_on`, `actual_return_on`, `aso_id`, `status` | pode bloquear operação sem expor diagnóstico |
| `public.rh_leave_events` | T,A | eventos e correções | `leave_case_id`, `event_type`, `effective_at`, `metadata` | append-only |

---

## 10. `rh_benefits` — Benefícios, dependentes e descontos

| Tabela | Flags | Finalidade | Colunas centrais | Constraints e RLS |
|---|---|---|---|---|
| `public.rh_benefit_catalog` | T,V | raiz do benefício | `code`, `name`, `benefit_type`, `status`, `current_policy_version_id` | unique código |
| `public.rh_benefit_policy_versions` | T,V,A | elegibilidade e regras | `benefit_id`, `version_number`, vigência, `eligibility_expression`, `content_hash` | DSL declarativa; sem código arbitrário |
| `public.rh_benefit_plans` | T,V | plano do fornecedor | `benefit_id`, `provider_id`, `code`, `name`, `status`, vigência | unique por fornecedor |
| `public.rh_benefit_price_versions` | T,F,V,A | preços e faixas | `plan_id`, `version_number`, vigência, `pricing_model`, valores | imutável após uso |
| `public.rh_benefit_enrollments` | T,S,V | adesão do trabalhador | `employment_id`, `plan_id`, `started_on`, `ended_on`, `status` | elegibilidade validada na transição |
| `public.rh_benefit_coverages` | T,S,V | pessoa coberta | `enrollment_id`, `person_id`, `coverage_role`, vigência | cobertura não cria papel tributário |
| `public.rh_benefit_movements` | T,S,F,A,L | inclusão, exclusão, cobrança e estorno | `enrollment_id`, `movement_type`, `competence_date`, valores, `source_id` | movimentos compensatórios |
| `public.rh_deduction_authorizations` | T,S,F,V | autorização de desconto | `employment_id`, `deduction_type`, `source_type`, `limit_amount`, vigência, `status` | fonte obrigatória e revogação histórica |
| `public.rh_recurring_deduction_instructions` | T,S,F,V | instrução mensal | `authorization_id`, fórmula/valor, vigência, prioridade | versão por competência |
| `public.rh_judicial_orders` | T,S,J,V | metadados da ordem judicial | `employment_id`, `case_reference_hash`, `order_type`, `status`, vigência | conteúdo integral no privado |
| `rh_private.rh_judicial_order_versions` | P,T,S,J,V,A | conteúdo e fórmula judicial | `judicial_order_id`, `version_number`, conteúdo cifrado, vigência, hash | acesso jurídico/folha segregado |
| `public.rh_benefit_provider_files` | T,S,F,V | arquivo recebido/enviado | `provider_id`, `file_type`, `competence_date`, `document_version_id`, `status` | bytes no Storage; processamento auditado |
| `public.rh_benefit_reconciliation_cases` | T,S,F,V | divergências fornecedor × folha | `provider_file_id`, `status`, totais, tolerância, `row_version` | conclusão por aprovação |
| `public.rh_benefit_reconciliation_items` | T,S,F,A | item divergente | `case_id`, `employment_id`, `coverage_id`, valores interno/externo, motivo | não edita fonte |

---

## 11. `rh_sst` — Segurança e saúde ocupacional

| Tabela | Flags | Finalidade | Colunas centrais | Constraints e RLS |
|---|---|---|---|---|
| `public.rh_work_contexts` | T,V | contexto de trabalho/obra/função | `legal_entity_id`, `establishment_id`, `project_id`, `unit_id`, `function_id`, vigência | composição validada |
| `public.rh_hazard_catalog` | G,V | perigos e agentes de referência | `code`, `name`, `category`, vigência | catálogo global versionado |
| `public.rh_risk_inventories` | T,V | raiz do inventário | `work_context_id`, `status`, `current_version_id` | um inventário aplicável por contexto/período |
| `public.rh_risk_inventory_versions` | T,V,A | versão do inventário | `inventory_id`, `version_number`, vigência, metodologia, hash | imutável após aprovação |
| `public.rh_risk_assessments` | T,V,A | avaliação por perigo | `inventory_version_id`, `hazard_id`, `likelihood`, `severity`, `risk_level`, controles | escalas versionadas |
| `public.rh_control_measures` | T,V | medidas de controle | `risk_assessment_id`, `control_type`, `description`, `status`, prioridade | hierarquia de controle explícita |
| `public.rh_sst_action_plans` | T,V | plano de ação | `source_type`, `source_id`, `owner_id`, `due_on`, `status`, evidência | atraso e conclusão auditados |
| `public.rh_exposure_groups` | T,V | grupo homogêneo de exposição | `code`, `name`, `work_context_id`, vigência | membros por perfil temporal |
| `public.rh_worker_exposure_profiles` | T,S,V | exposição individual operacional | `employment_id`, `exposure_group_id`, vigência, `source_version_id` | sem diagnóstico |
| `public.rh_medical_programs` | T,V | raiz do programa médico | `legal_entity_id`, `establishment_id`, `status`, `current_version_id` | vigência controlada |
| `public.rh_medical_program_versions` | T,S,V,A | regras do PCMSO | `program_id`, `version_number`, vigência, médico responsável, hash | acesso SST restrito |
| `public.rh_exam_requirements` | T,S,V | necessidade de exame | `program_version_id`, `exam_type_id`, gatilho, periodicidade, função/risco | regra versionada |
| `public.rh_exam_requests` | T,S,V | convocação e solicitação | `employment_id`, `requirement_id`, `due_on`, `status`, provider | não contém resultado clínico |
| `public.rh_exam_appointments` | T,S,V | agendamento | `exam_request_id`, `scheduled_at`, `provider_id`, `status` | histórico de reagendamento |
| `public.rh_asos` | T,S,V,A | conclusão ocupacional | `employment_id`, `exam_request_id`, `aso_type`, `fitness_status`, restrições operacionais, datas | sem diagnóstico; versão e assinatura |
| `rh_private.rh_clinical_records` | P,T,S,C,V | prontuário clínico | `person_id`, `provider_id`, conteúdo cifrado, retenção, legal hold | acesso médico somente por RPC |
| `rh_private.rh_clinical_exam_results` | P,T,S,C,V,A | resultado detalhado de exame | `clinical_record_id`, `exam_type_id`, conteúdo cifrado, hash, datas | não exposto à Data API |
| `public.rh_incidents` | T,S,V | incidente e quase acidente | `project_id`, `establishment_id`, `occurred_at`, `incident_type`, `status`, severidade | relato não é conclusão |
| `public.rh_incident_people` | T,S,V | pessoas envolvidas | `incident_id`, `person_id`, `role_type`, dados operacionais | acesso por finalidade |
| `public.rh_incident_investigations` | T,S,V,A | investigação | `incident_id`, `method`, `conclusion`, `approved_by`, `approved_at` | versão aprovada imutável |
| `public.rh_incident_actions` | T,V | ações corretivas | `incident_id`, `action_plan_id`, `status` | integração com plano SST |
| `public.rh_cat_cases` | T,S,V | caso de avaliação de CAT | `incident_id`, `status`, `decision`, `decided_by` | incidente não cria CAT sozinho |
| `public.rh_ppe_requirements` | T,V | EPI requerido por risco/função | `risk_assessment_id`, `inventory_item_id`, `certificate_reference`, vigência | não substitui controle coletivo |
| `public.rh_ppe_deliveries` | T,S,A | entrega e devolução | `employment_id`, `inventory_asset_id`, `delivered_at`, `returned_at`, `document_id` | integra Estoque; append-only/compensação |
| `public.rh_ppe_inspections` | T,S,A | inspeção de EPI | `delivery_id`, `inspected_at`, `result`, `action` | histórico imutável |
| `public.rh_training_courses` | T,V | catálogo de treinamento | `code`, `name`, `regulatory_reference`, carga, vigência | versionado |
| `public.rh_training_requirements` | T,V | requisito por risco/função | `course_id`, `work_context_id`, `validity_days`, vigência | cobertura derivada |
| `public.rh_training_sessions` | T,V | turma/realização | `course_id`, `starts_at`, `ends_at`, `instructor`, `status` | duração válida |
| `public.rh_training_enrollments` | T,S,V | participante e resultado | `session_id`, `employment_id`, `status`, `completed_at`, `score` | conclusão não é habilitação sozinha |
| `public.rh_training_certificates` | T,S,V,A | certificado emitido | `enrollment_id`, `document_version_id`, `issued_on`, `expires_on`, hash | imutável e verificável |
| `public.rh_qualification_types` | T,V | tipo de habilitação | `code`, `name`, requisitos, vigência | catálogo organizacional |
| `public.rh_worker_qualifications` | T,S,V | habilitação individual | `employment_id`, `qualification_type_id`, `source_document_id`, vigência, `status` | suspensão por vencimento |
| `public.rh_work_permits` | T,S,V,A | permissão para atividade crítica | `employment_id`, `project_id`, `activity_type`, `valid_from`, `valid_to`, aprovadores | requisitos avaliados por RPC |

---

## 12. `rh_payroll` — Folha, cálculo, pagamento e contabilidade

| Tabela | Flags | Finalidade | Colunas centrais | Constraints e RLS |
|---|---|---|---|---|
| `public.rh_payroll_calendars` | T,V | calendário de competências | `legal_entity_id`, `code`, `status` | unique empresa/código |
| `public.rh_payroll_cycles` | T,F,V | ciclo por competência e tipo | `calendar_id`, `competence_date`, `processing_type`, `status`, `row_version` | unique tipo/competência/versão |
| `public.rh_payroll_cycle_populations` | T,S,A | população congelada | `cycle_id`, `employment_id`, `contract_version_id`, `snapshot_hash` | unique ciclo/vínculo |
| `public.rh_payroll_rubrics` | T,V | identidade estável da rubrica | `code`, `name`, `rubric_type`, `status`, `current_version_id` | unique organização/código |
| `public.rh_payroll_rubric_versions` | T,F,V,A | incidências e regras da rubrica | `rubric_id`, `version_number`, vigência, natureza externa, incidências, hash | imutável após uso |
| `public.rh_payroll_formula_versions` | T,F,V,A | DSL declarativa | `formula_key`, `version_number`, vigência, AST/expressão, hash | grafo acíclico e funções permitidas |
| `public.rh_payroll_formula_dependencies` | T,V | dependências entre fórmulas/rubricas | `formula_version_id`, `depends_on_type`, `depends_on_id`, ordem | impede ciclo |
| `public.rh_payroll_parameter_sets` | T,V | conjunto de parâmetros | `code`, `name`, `scope_type`, `status` | versão separada |
| `public.rh_payroll_parameter_versions` | T,F,V,A | valores e tabelas por vigência | `parameter_set_id`, `version_number`, vigência, conteúdo tipado/hash | nenhuma taxa hardcoded |
| `public.rh_payroll_input_contracts` | T,V | contrato de entrada por módulo | `source_module`, `input_type`, schema, vigência | versão e validação |
| `public.rh_payroll_inputs` | T,S,F,A | fatos recebidos | `cycle_id`, `employment_id`, `source_type`, `source_id`, `source_version`, valor, `idempotency_key` | unique idempotency; sem edição |
| `public.rh_payroll_runs` | T,F,A,R | execução de cálculo | `cycle_id`, `run_number`, `engine_version`, `input_hash`, `status`, `is_shadow` | nova execução; sem overwrite |
| `public.rh_payroll_worker_runs` | T,S,F,A | execução individual | `run_id`, `employment_id`, snapshots, totais, `status` | unique run/vínculo |
| `public.rh_payroll_lines` | T,S,F,A | linha calculada por rubrica | `worker_run_id`, `rubric_version_id`, `quantity`, `rate`, `amount`, `line_hash` | precisão decimal; imutável |
| `public.rh_payroll_line_steps` | T,S,F,A | memória intermediária | `payroll_line_id`, `step_order`, `operation`, entradas/saída sanitizadas | explicabilidade; acesso restrito |
| `public.rh_payroll_bases` | T,S,F,A | bases acumuladas | `worker_run_id`, `base_type`, `amount`, `scope`, referência | reconciliável |
| `public.rh_payroll_employer_charges` | T,F,A | encargos patronais | `worker_run_id`, `charge_type`, base, taxa, valor, parâmetro | imutável |
| `public.rh_payroll_adjustments` | T,S,F,V,A | ajuste manual separado | `cycle_id`, `employment_id`, `rubric_id`, `amount`, `reason`, aprovadores | não altera linha automática |
| `public.rh_payroll_review_findings` | T,S,F,V | achados de conferência | `run_id`, `employment_id`, `finding_type`, `severity`, `status` | resolução auditada |
| `public.rh_payroll_approvals` | T,F,A | aprovação vinculada ao hash | `run_id`, `run_hash`, `approval_type`, `status`, `decided_by` | novo cálculo invalida aprovação |
| `public.rh_payroll_closures` | T,F,A,R | fechamento interno | `cycle_id`, `run_id`, `closure_number`, `status`, `closed_at` | unique fechamento vigente; reabertura separada |
| `public.rh_payroll_reopenings` | T,F,A,R | reabertura | `closure_id`, `reason`, `approved_by`, `reopened_at`, `new_cycle_id` | histórico preservado |
| `public.rh_payslips` | T,S,F,V | projeção para trabalhador | `worker_run_id`, `status`, `current_document_version_id` | não é fonte do cálculo |
| `public.rh_payroll_payment_batches` | T,S,F,V | lote de pagamento | `run_id`, `finance_cash_account_id`, `status`, totais, arquivo | aprovação segregada |
| `public.rh_payroll_payment_items` | T,S,F,A | instrução por trabalhador | `batch_id`, `employment_id`, `amount`, `bank_account_token`, `status` | valor devido ≠ pago |
| `public.rh_payroll_payment_returns` | T,S,F,A | retorno bancário | `batch_id`, `item_id`, `provider_reference`, `status`, `processed_at` | append-only e reconciliado |
| `public.rh_payroll_accounting_batches` | T,F,V | lote contábil | `run_id`, `status`, `posting_reference`, totais | não substitui lançamento no Financeiro |
| `public.rh_payroll_accounting_lines` | T,F,A | débito/crédito por conta e centro | `batch_id`, `account_code`, `cost_center_id`, `project_id`, `direction`, `amount` | soma de débitos = créditos |
| `public.rh_payroll_cost_allocations` | T,F,A | rateio de custo calculado | `worker_run_id`, `cost_center_id`, `project_id`, `percentage`, `amount` | não altera líquido |

---

## 13. `rh_compliance` — Obrigações digitais e reconciliação

| Tabela | Flags | Finalidade | Colunas centrais | Constraints e RLS |
|---|---|---|---|---|
| `public.rh_obligation_systems` | G,V | eSocial, FGTS Digital, DCTFWeb e outros | `code`, `name`, `environment_types`, vigência | catálogo global |
| `public.rh_obligation_types` | G,V | obrigação, periodicidade e escopo | `system_id`, `code`, `name`, periodicidade, vigência | global versionado |
| `public.rh_external_event_types` | G,V | catálogo de eventos | `system_id`, `code`, `name`, `family`, vigência | não usar enum para códigos externos |
| `public.rh_external_schema_versions` | G,V,A | leiaute/XSD/schema | `event_type_id`, `version`, vigência, hash, fonte | imutável |
| `public.rh_external_rule_versions` | G,V,A | regras oficiais | `event_type_id`, `version`, vigência, hash, conteúdo | imutável |
| `public.rh_fact_event_mappings` | T,V | mapeamento fato → evento | `source_type`, `event_type_id`, condição, vigência | DSL controlada |
| `public.rh_obligation_periods` | T,V | período e prazo | `legal_entity_id`, `obligation_type_id`, `competence_date`, `due_at`, `status` | unique escopo/período/versão |
| `public.rh_external_event_instances` | T,S,V | identidade do evento interno | `event_type_id`, `source_type`, `source_id`, `source_version`, `status`, `correlation_id` | fato ≠ evento; chave estável |
| `rh_ops.rh_external_payload_versions` | O,T,S,A,R | payload gerado e assinado | `event_instance_id`, `version_number`, schema/rule versions, hash, payload cifrado, status | acesso worker; imutável após aprovação |
| `public.rh_external_validation_runs` | T,S,A,R | validação do payload | `event_instance_id`, `payload_version_id`, `status`, `started_at`, `completed_at` | nova execução |
| `public.rh_external_validation_findings` | T,S,A | erro/aviso | `validation_run_id`, `rule_code`, `severity`, `path`, mensagem sanitizada | append-only |
| `public.rh_external_submission_batches` | T,S,V | lote de envio | `system_id`, `environment`, `status`, `batch_hash`, totais | produção e restrita segregadas |
| `public.rh_external_submission_batch_items` | T,S,A | evento no lote | `batch_id`, `event_instance_id`, `payload_version_id`, ordem | unique lote/evento |
| `rh_ops.rh_external_submission_attempts` | O,T,S,A,R | tentativa técnica | `batch_item_id`, `attempt_number`, `idempotency_key`, `sent_at`, `transport_status`, `protocol_reference` | append-only |
| `public.rh_external_receipts` | T,S,A | recibo/protocolo | `event_instance_id`, `attempt_id`, `receipt_type`, `external_reference`, `received_at`, hash | recibo não é quitação |
| `rh_ops.rh_external_processing_returns` | O,T,S,A,R | retorno bruto | `receipt_id`, `return_type`, payload cifrado, hash, `received_at` | privado operacional |
| `public.rh_external_rejections` | T,S,V | rejeição tratável | `event_instance_id`, `return_id`, código, mensagem, `status`, owner | não apaga tentativa |
| `public.rh_external_rectification_cases` | T,S,V | retificação | `original_event_id`, `replacement_event_id`, `reason`, `status` | preserva original |
| `public.rh_external_exclusion_cases` | T,S,V | exclusão | `original_event_id`, `reason`, `status`, `approval_id` | distinta de retificação |
| `public.rh_external_period_closures` | T,S,A,R | fechamento externo | `system_id`, `legal_entity_id`, `competence_date`, `event_id`, `status` | interno ≠ externo |
| `public.rh_external_period_reopenings` | T,S,A,R | reabertura externa | `closure_id`, `event_id`, `reason`, `status` | histórico preservado |
| `public.rh_external_totalizers` | T,S,F,A | totalizador oficial | `system_id`, `legal_entity_id`, `competence_date`, `totalizer_type`, dimensões, valor, recibo | não altera folha |
| `public.rh_government_liabilities` | T,S,F,V | débito constituído | `system_id`, `legal_entity_id`, `competence_date`, `liability_type`, valor, `status` | totalizador ≠ débito |
| `public.rh_government_guides` | T,S,F,V | guia/documento | `liability_id`, `guide_reference`, `issued_at`, `due_on`, valor, `document_version_id`, `status` | guia ≠ pagamento |
| `public.rh_government_payment_links` | T,S,F,A | ligação com pagamento financeiro | `guide_id`, `finance_entry_id`, `finance_settlement_id`, valores | reconciliação explícita |
| `public.rh_government_reconciliation_cases` | T,S,F,V | reconciliação em camadas | `system_id`, `legal_entity_id`, `competence_date`, `reconciliation_type`, `status`, tolerância | eventos, totais, débitos e pagamentos separados |
| `public.rh_government_reconciliation_items` | T,S,F,A | divergência por dimensão | `case_id`, `dimension_type`, `dimension_id`, valor interno/externo, diferença, motivo | sem edição de fonte |
| `public.rh_digital_certificates` | T,S,V | metadados de certificado | `legal_entity_id`, `certificate_type`, `serial_hash`, `valid_from`, `valid_to`, `status`, `secret_reference` | chave privada fora do banco |
| `public.rh_external_procurations` | T,S,V | procurações e autorizações | `legal_entity_id`, `grantee_reference`, escopo, vigência, `status`, documento | acesso administrativo restrito |

---

## 14. `rh_offboarding` — Desligamento, rescisão e offboarding

| Tabela | Flags | Finalidade | Colunas centrais | Constraints e RLS |
|---|---|---|---|---|
| `public.rh_termination_cases` | T,S,V | raiz auditável | `employment_id`, `case_number`, `termination_type`, `status`, datas, `row_version` | solicitação não encerra vínculo |
| `public.rh_termination_case_versions` | T,S,V,A | fundamento e condições | `termination_case_id`, `version_number`, reason, legal basis, dates, hash | imutável após submissão |
| `public.rh_termination_protection_checks` | T,S,A | estabilidade e impedimentos | `case_id`, `protection_type`, `result`, `rule_version`, `checked_at` | achado ≠ decisão jurídica automática |
| `public.rh_notice_periods` | T,S,F,V | aviso prévio | `case_id`, `notice_type`, `notified_on`, `worked_until`, `projected_end_on`, `status` | datas distintas e validadas |
| `public.rh_termination_calculation_requests` | T,S,F,V | solicitação de cálculo | `case_id`, `requested_at`, `input_cutoff`, `status` | vincula snapshots |
| `public.rh_termination_runs` | T,S,F,A,R | execução rescisória | `request_id`, `run_number`, `engine_version`, `input_hash`, `status` | nova execução |
| `public.rh_termination_lines` | T,S,F,A | verba rescisória | `run_id`, `rubric_version_id`, base, quantidade, valor, memória | imutável |
| `public.rh_termination_approvals` | T,S,F,A | aprovação jurídica/folha | `case_id`, `run_id`, `approval_type`, `status`, `decided_by` | segregação de funções |
| `public.rh_termination_documents` | T,S,V | TRCT, aviso e demais documentos | `case_id`, `document_type_id`, `current_version_id`, `status` | documento ≠ término |
| `public.rh_termination_payments` | T,S,F,V | obrigação de pagamento | `case_id`, `run_id`, `amount_due`, `finance_entry_id`, `status` | devido ≠ pago |
| `public.rh_offboarding_templates` | T,V | checklist por perfil | `code`, `name`, `version_number`, vigência | versionado |
| `public.rh_offboarding_tasks` | T,S,V | tarefa de acesso, ativo ou responsabilidade | `case_id`, `template_item_code`, `task_type`, `owner_id`, `status`, `due_at` | pendência pode bloquear conclusão |
| `public.rh_offboarding_asset_items` | T,S,V | ativos a devolver | `task_id`, `inventory_asset_id`, `status`, `returned_at`, `deduction_case_id` | ausência não gera desconto automático |
| `public.rh_access_revocation_requests` | T,S,V | solicitação de revogação | `case_id`, `system_code`, `urgency`, `requested_at`, `status` | emergência não altera vínculo |
| `public.rh_access_revocation_results` | T,S,A | execução da revogação | `request_id`, `attempted_at`, `result`, `external_reference` | append-only |
| `public.rh_responsibility_handoffs` | T,S,V | transferência de responsabilidades | `case_id`, `source_type`, `source_id`, `target_user_id`, `status` | conclusão com evidência |
| `public.rh_reinstatement_cases` | T,S,V | reintegração | `original_termination_case_id`, `employment_id`, `effective_on`, `status` | não apaga desligamento original |
| `public.rh_termination_events` | T,A | eventos e correções | `case_id`, `event_type`, `effective_at`, `correlation_id` | append-only |

---

## 15. `rh_analytics` — Métricas e planejamento

| Tabela | Flags | Finalidade | Colunas centrais | Constraints e RLS |
|---|---|---|---|---|
| `public.rh_metric_definitions` | T,V | identidade da métrica | `metric_key`, `name`, `purpose`, `owner_id`, `status`, `current_version_id` | unique chave |
| `public.rh_metric_versions` | T,V,A | fórmula, população e granularidade | `metric_id`, `version_number`, vigência, DSL/SQL controlado, hash, sensibilidade | aprovação antes de uso |
| `public.rh_analytics_dimensions` | T,V | dimensão conformada | `dimension_key`, `name`, `source_contract_id`, `sensitivity`, vigência | dimensões proibidas por métrica |
| `public.rh_analytics_source_contracts` | T,V | contrato da fonte | `source_context`, `source_name`, schema, watermark rule, SLA, vigência | ownership explícito |
| `public.rh_analytics_quality_rules` | T,V | qualidade de dados | `source_contract_id`, `rule_type`, threshold, blocking, vigência | versionado |
| `public.rh_analytics_runs` | T,A,R | execução analítica | `metric_version_id`, `cutoff_at`, filtros/hash, watermark, status | nova execução |
| `public.rh_analytics_run_quality_results` | T,A | resultado de qualidade | `run_id`, `rule_id`, observed_value, `status` | bloqueio conforme regra |
| `public.rh_analytics_observations` | T,S,A | valor por dimensões | `run_id`, `period_start`, `period_end`, `dimension_hash`, valor, população | publicação após privacy check |
| `public.rh_analytics_privacy_policies` | T,V | supressão e generalização | `purpose_code`, `sensitivity`, `minimum_group_size`, regras, vigência | política versionada |
| `public.rh_analytics_suppression_events` | T,S,A | supressão aplicada | `observation_id`, `policy_id`, `reason`, `applied_at` | impede inferência |
| `public.rh_analytics_reports` | T,V | identidade do relatório | `report_key`, `name`, `report_type`, `purpose`, `status`, `current_version_id` | operacional ≠ estatístico |
| `public.rh_analytics_report_versions` | T,V,A | widgets, métricas e filtros | `report_id`, `version_number`, configuração/hash | somente métricas aprovadas |
| `public.rh_analytics_exports` | T,S,A,R | exportação auditada | `report_version_id`, `requested_by`, finalidade, filtros, `expires_at`, `storage_document_id` | permissão distinta e expiração |
| `public.rh_analytics_models` | T,S,V | caso de uso do modelo | `model_key`, `purpose`, `risk_class`, `status`, `current_version_id` | nenhum score universal |
| `public.rh_analytics_model_versions` | T,S,V,A | artefato e governança | `model_id`, `version_number`, dataset/hash, features, métricas, limitações | modo sombra e aprovação |
| `public.rh_analytics_predictions` | T,S,A | previsão | `model_version_id`, `subject_scope`, `input_hash`, output, incerteza | não executa decisão |
| `public.rh_analytics_recommendations` | T,S,V | recomendação | `prediction_id`, `recommendation_type`, explicação, `status` | revisão humana |
| `public.rh_analytics_human_decisions` | T,S,A | decisão humana | `recommendation_id`, `decision`, `decided_by`, `reason`, `decided_at` | preserva divergência |
| `public.rh_workforce_plans` | T,V | plano de força de trabalho | `plan_key`, `scope_type`, `scope_id`, `horizon_start`, `horizon_end`, `status` | não cria vaga |
| `public.rh_workforce_scenarios` | T,F,V,A | cenário e premissas | `plan_id`, `version_number`, `scenario_type`, assumptions/hash, `status` | aprovado é imutável |
| `public.rh_workforce_demand_lines` | T,F,A | demanda prevista | `scenario_id`, período, função, competência, localização, quantidade/FTE | unidade explícita |
| `public.rh_workforce_capacity_lines` | T,F,A | capacidade prevista | `scenario_id`, período, função, competência, localização, quantidade/FTE | indisponibilidades consideradas |
| `public.rh_workforce_gap_lines` | T,F,A | lacuna derivada | `scenario_id`, período, dimensão, demanda, capacidade, gap | resultado, não ação |
| `public.rh_workforce_plan_proposals` | T,S,F,V | proposta para módulo canônico | `scenario_id`, `proposal_type`, `target_context`, payload minimizado, `status` | não executa automaticamente |

---

## 16. Documentos compartilhados do RH

| Tabela | Flags | Finalidade | Colunas centrais | Constraints e RLS |
|---|---|---|---|---|
| `public.rh_document_types` | T,V | tipo e classificação | `code`, `name`, `sensitivity`, retenção, finalidade, vigência | unique código |
| `public.rh_documents` | T,S,V | raiz do documento | `document_type_id`, `owner_type`, `owner_id`, `status`, `current_version_id` | owner validado por RPC |
| `public.rh_document_versions` | T,S,V,A | metadados e Storage | `document_id`, `version_number`, `storage_path`, MIME, tamanho, hash, scan status, retenção | bytes privados; imutável após aceitação |
| `public.rh_document_signatures` | T,S,A | assinatura e evidência | `document_version_id`, `signer_type`, `signer_id`, `signed_at`, provider, evidence hash | append-only |
| `public.rh_document_access_events` | T,S,A | acesso e download sensível | `document_version_id`, `user_id`, `purpose`, `accessed_at`, `result` | auditoria reforçada |
| `public.rh_retention_holds` | T,S,J,V | legal hold | `resource_type`, `resource_id`, `reason`, `started_at`, `ended_at`, aprovador | bloqueia descarte |

---

## 17. `rh_ops` — Outbox, jobs, inbox e backfills

| Tabela | Flags | Finalidade | Colunas centrais | Constraints e acesso |
|---|---|---|---|---|
| `rh_ops.outbox_events` | O,T,A,R | evento confirmado com o fato | `aggregate_type`, `aggregate_id`, `event_type`, `sequence_number`, payload sanitizado/cifrado, `published_at` | unique agregado/sequência; worker somente |
| `rh_ops.inbox_events` | O,T,A,R | webhook ou mensagem recebida | `source_system`, `external_id`, hash, payload cifrado, `received_at`, `processed_at` | unique fonte/id/hash |
| `rh_ops.jobs` | O,T,V,R | unidade de trabalho | `job_type`, `status`, `priority`, `available_at`, `lease_until`, `attempt_count`, payload | claim concorrente por RPC |
| `rh_ops.job_attempts` | O,T,A,R | tentativa de job | `job_id`, `attempt_number`, `started_at`, `finished_at`, resultado/erro sanitizado | append-only |
| `rh_ops.dead_letters` | O,T,A,R | falha definitiva | `job_id`, `reason_code`, `moved_at`, snapshot | reprocessamento explícito |
| `rh_ops.idempotency_records` | O,T,V,R | resultado de comando idempotente | `scope`, `idempotency_key`, `request_hash`, `resource_type`, `resource_id`, `expires_at` | unique escopo/chave |
| `rh_ops.backfill_runs` | O,T,V,R | execução de backfill | `backfill_key`, `version`, `status`, contagens, hashes, `started_at`, `finished_at` | uma execução ativa por chave/tenant |
| `rh_ops.backfill_checkpoints` | O,T,A,R | checkpoint por lote | `run_id`, `partition_key`, `cursor_value`, contagens, hash | retomada idempotente |
| `rh_ops.reconciliation_runs` | O,T,V,R | reconciliação técnica | `reconciliation_key`, `scope`, `cutoff_at`, `status`, totais | resultado preservado |
| `rh_ops.feature_flag_evaluations` | O,T,A,R | evidência de rollout crítico | `flag_key`, `subject_type`, `subject_id`, `evaluated_value`, `evaluated_at` | sem dados desnecessários |

---

## 18. Perfis de RLS

| Perfil | Exemplo | Regra de leitura | Regra de escrita |
|---|---|---|---|
| `RH_STANDARD` | unidades, cargos | organização + módulo + capacidade | create/update específicos |
| `RH_SCOPED` | obra, estabelecimento | organização + capacidade + escopo | escopo validado por FK e policy |
| `RH_SELF_SERVICE` | demonstrativo próprio | view/RPC minimizada ligada ao trabalhador | comandos específicos, nunca CRUD amplo |
| `RH_SENSITIVE` | documentos, dependentes | finalidade + capacidade sensível | RPC e auditoria |
| `RH_CLINICAL` | prontuário | não exposto; função médica restrita | função restrita e auditada |
| `RH_JUDICIAL` | ordem judicial | jurídico/folha por finalidade | dupla aprovação quando aplicável |
| `RH_FINANCIAL` | folha e pagamentos | capacidade financeira segregada | RPC, approval hash e SoD |
| `RH_APPEND_ONLY` | eventos e movimentos | leitura autorizada | insert por RPC; update/delete revogados |
| `RH_WORKER_ONLY` | portal do trabalhador | projeção própria do titular | ações limitadas ao titular |
| `RH_OPS` | jobs e payloads | service/worker e auditor técnico | worker; sem Data API |

---

## 19. Constraints transversais obrigatórias

1. `unique (organization_id, id)` em toda tabela tenant-scoped.
2. FKs compostas entre entidades tenant-scoped.
3. `effective_to > effective_from` quando fim não nulo.
4. competências normalizadas para o primeiro dia do mês.
5. valores financeiros em `numeric`, nunca ponto flutuante.
6. percentuais dentro do intervalo definido pela unidade.
7. hashes SHA-256 em hexadecimal quando aplicável.
8. idempotency key única por escopo.
9. version number positivo e único por raiz.
10. status coerente com timestamps finais.
11. registros aprovados/usados não editáveis.
12. movimentos não deletáveis e reversões vinculadas.
13. uma condição principal por vigência quando exigido.
14. referências de empresa, estabelecimento, obra e centro de custo pertencentes ao mesmo tenant.
15. campos clínicos e judiciais fora de metadados genéricos e logs.
16. `created_by` e `approved_by` referenciam `auth.users` quando o ator for usuário.
17. aprovação não pode ser do mesmo ator em fluxos com segregação obrigatória.
18. documentos aceitos exigem hash, tamanho, MIME detectado e status de scan compatível.
19. função `SECURITY DEFINER` com `search_path` explícito.
20. views expostas com `security_invoker=true`.

---

## 20. Estado honesto

Este catálogo é um desenho físico proposto. Nenhuma tabela, schema, tipo, função, policy, view, índice, bucket ou migration deste anexo foi criada.

Nomes e agrupamentos somente poderão ser transformados em SQL depois do Gate G00, da verificação do ledger e da reconciliação com o schema efetivamente existente no ambiente de homologação.
