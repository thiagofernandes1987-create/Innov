# Projeto RH — Módulo 16 — Contratos de API, Comandos, Consultas, RPCs, Eventos, Jobs e Integrações

**Versão:** 0.1.0  
**Estado:** especificação de contratos concluída; implementação pendente  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**ADR vinculante:** `PROJETO-RH-ADR-016-CONTRATOS-COMANDOS-CONSULTAS-EVENTOS-E-JOBS.md`

---

## 1. Finalidade

Este módulo define como interfaces, banco, workers e integrações trocarão informações e executarão ações no Projeto RH.

O objetivo é impedir que cada tela ou conector invente contratos incompatíveis, transações parciais, erros não estruturados, retries perigosos ou payloads excessivos.

O módulo cobre:

- envelopes de comandos e consultas;
- resultados e erros;
- Server Actions;
- Route Handlers;
- RPCs;
- eventos de domínio e integração;
- outbox e inbox;
- jobs e workers;
- webhooks;
- adapters externos;
- paginação, filtros e arquivos;
- idempotência, concorrência e correlação;
- testes de contrato;
- catálogo inicial por bounded context.

---

## 2. Arquitetura

```text
Usuário interno
  → Server Action
    → contrato tipado
      → autorização
        → RPC transacional
          → estado + auditoria + outbox

Integração externa
  → Route Handler
    → assinatura + replay protection
      → inbox durável
        → job
          → processamento e reconciliação

Leitura
  → consulta autorizada
    → view/RPC/projeção
      → DTO minimizado
```

---

## 3. Convenções de nomes

### 3.1 Comandos

`<Verbo><Agregado>` em código e `<context>.<aggregate>.<action>.vN` em identificador.

Exemplos:

- `CreateWorker` → `rh.core.worker.create.v1`;
- `ApproveAdmission` → `rh.admission.case.approve.v1`;
- `CloseTimePeriod` → `rh.time.period.close.v1`;
- `CalculatePayrollRun` → `rh.payroll.run.calculate.v1`;
- `ApproveTermination` → `rh.offboarding.termination.approve.v1`.

### 3.2 Consultas

- `GetWorkerDetail`;
- `ListAdmissionCases`;
- `SearchContracts`;
- `GetPayrollRunMemory`;
- `ListGovernmentProjectionErrors`.

### 3.3 Eventos

Eventos usam passado e versão:

- `rh.core.worker.created.v1`;
- `rh.contract.version.activated.v1`;
- `rh.time.period.closed.v1`;
- `rh.payroll.run.approved.v1`;
- `rh.compliance.projection.accepted.v1`;
- `rh.termination.closed.v1`.

### 3.4 Jobs

- `rh.documents.generate.v1`;
- `rh.payroll.calculate-batch.v1`;
- `rh.compliance.transmit.v1`;
- `rh.compliance.poll-receipt.v1`;
- `rh.analytics.refresh-metric.v1`;
- `rh.retention.execute.v1`.

---

## 4. Envelopes comuns

### 4.1 CommandEnvelope

```ts
interface CommandEnvelope<TPayload> {
  commandId: string;
  commandType: string;
  organizationId: string;
  actorUserId: string;
  correlationId: string;
  causationId?: string | null;
  idempotencyKey?: string | null;
  expectedVersion?: number | null;
  occurredAt: string;
  scope?: {
    companyId?: string | null;
    establishmentId?: string | null;
    projectId?: string | null;
    workerId?: string | null;
  };
  payload: TPayload;
}
```

`organizationId` e `actorUserId` serão derivados da sessão para comandos de usuário. O cliente poderá enviar apenas identificadores de escopo necessários, sujeitos a validação.

### 4.2 QueryEnvelope

```ts
interface QueryEnvelope<TFilter> {
  queryType: string;
  organizationId: string;
  requesterUserId: string;
  correlationId: string;
  scope?: Record<string, string | null>;
  filter: TFilter;
  page?: {
    cursor?: string | null;
    limit: number;
  };
  sort?: Array<{ field: string; direction: "asc" | "desc" }>;
  asOf?: string | null;
}
```

### 4.3 CommandResult

```ts
interface CommandResult<T> {
  ok: true;
  data: T;
  meta: {
    correlationId: string;
    resourceVersion?: number;
    idempotentReplay: boolean;
    warnings?: string[];
  };
}
```

### 4.4 ErrorResult

```ts
interface ErrorResult {
  ok: false;
  error: {
    code: string;
    message: string;
    retryable: boolean;
    fieldErrors?: Array<{ field: string; code: string; message: string }>;
  };
  meta: { correlationId: string };
}
```

### 4.5 EventEnvelope

```ts
interface EventEnvelope<TPayload> {
  eventId: string;
  eventType: string;
  eventVersion: number;
  organizationId: string;
  aggregateType: string;
  aggregateId: string;
  aggregateVersion: number;
  occurredAt: string;
  recordedAt: string;
  correlationId: string;
  causationId?: string | null;
  actorType: "USER" | "SYSTEM" | "INTEGRATION";
  actorId?: string | null;
  payload: TPayload;
}
```

### 4.6 JobEnvelope

```ts
interface JobEnvelope<TPayload> {
  jobId: string;
  jobType: string;
  version: number;
  organizationId?: string | null;
  correlationId: string;
  causationId?: string | null;
  deduplicationKey?: string | null;
  priority: number;
  availableAt: string;
  payload: TPayload;
}
```

---

## 5. Contrato de erros

| Família | Exemplo | HTTP quando aplicável | Retry |
|---|---|---:|---|
| autenticação | `AUTHENTICATION_REQUIRED` | 401 | não |
| autorização | `RH_PAYROLL_APPROVAL_DENIED` | 403 | não |
| validação | `RH_VALIDATION_FAILED` | 400/422 | não |
| inexistência | `RH_WORKER_NOT_FOUND` | 404 | não |
| estado | `RH_ADMISSION_INVALID_STATE` | 409 | não |
| versão | `RH_VERSION_CONFLICT` | 409 | após nova leitura |
| duplicidade | `RH_DUPLICATE_COMMAND` | 409 ou replay | depende |
| temporal | `RH_TEMPORAL_OVERLAP` | 409 | não |
| privacidade | `RH_PRIVACY_RESTRICTED` | 403 | não |
| externo transitório | `RH_EXTERNAL_UNAVAILABLE` | 503 | sim |
| resposta incerta | `RH_EXTERNAL_RESPONSE_UNCERTAIN` | 202/409 | reconciliar |
| rate limit | `RH_RATE_LIMITED` | 429 | sim |
| rejeição externa | `RH_INTEGRATION_REJECTED` | 422 | após correção |
| interno | `RH_INTERNAL_ERROR` | 500 | conforme classificação |

Erros do PostgreSQL, SDK ou provedor serão traduzidos. A interface não receberá stack trace, SQL, nome de policy, token ou payload bruto.

---

## 6. Server Actions

### 6.1 Fluxo obrigatório

```text
receber FormData/objeto
  → normalizar e validar
    → requireCapability
      → montar comando com contexto confiável
        → chamar RPC/serviço
          → mapear resultado
            → revalidatePath/redirect
```

### 6.2 Regras

- `"use server"` no módulo de actions;
- validação com schema compartilhado;
- autorização antes de leitura sensível ou efeito;
- IDs do tenant e ator derivados do contexto;
- operação crítica via RPC;
- mensagens de erro seguras;
- revalidação somente após sucesso;
- upload com varredura e metadados;
- remoção de arquivo órfão em falha antes da confirmação;
- correlação registrada;
- nenhum segredo no bundle do cliente.

### 6.3 Retorno

Formulários simples poderão usar redirect. Interfaces ricas deverão preferir resultado tipado, sem lançar mensagens técnicas diretamente para o componente.

---

## 7. Route Handlers

### 7.1 Classes

1. webhook externo;
2. callback autenticado;
3. download autorizado;
4. endpoint de parceiro;
5. health check técnico;
6. exportação assíncrona.

### 7.2 Webhook

Fluxo:

```text
limite de tamanho
  → corpo bruto
    → timestamp e assinatura
      → proteção de replay
        → hash e identificador externo
          → inbox idempotente
            → 2xx
              → job assíncrono
```

### 7.3 Autenticação

Conforme integração:

- HMAC com corpo bruto;
- mTLS;
- certificado cliente;
- OAuth2 client credentials;
- JWT assinado com audience/issuer;
- chave de API com rotação;
- assinatura ICP ou certificado governamental quando aplicável.

Query string secreta isolada não será aceita como único mecanismo em endpoints de efeito.

### 7.4 Replay

O contrato deverá verificar:

- tolerância de timestamp;
- nonce ou event ID;
- hash do payload;
- deduplication window;
- ambiente;
- provedor;
- tenant ou conta vinculada.

---

## 8. RPCs

### 8.1 Categorias

- `create_*` para criação transacional;
- `submit_*` para submissão;
- `approve_*` e `reject_*` para decisão;
- `activate_*` para ativação;
- `close_*` e `reopen_*` para períodos;
- `post_*` para movimentos;
- `calculate_*` para execução determinística;
- `queue_*` para outbox/job;
- `lock_*` para lease;
- `complete_*` para finalização de job;
- `reconcile_*` para reconciliação.

### 8.2 Requisitos de função crítica

- `security definer` apenas quando necessário;
- `set search_path` explícito;
- grants revogados de `anon`;
- parâmetros com prefixo `p_`;
- tenant identificado e validado;
- capability verificada dentro da função;
- recurso bloqueado por `FOR UPDATE` ou advisory lock;
- `row_version` conferida;
- transição de estado validada;
- outbox e auditoria gravadas na mesma transação;
- retorno sem conteúdo sensível desnecessário.

### 8.3 RPC de leitura

Será usada quando:

- a consulta exigir agregação protegida;
- o resultado precisar de supressão;
- o usuário consultar dados próprios minimizados;
- a query depender de regras temporais complexas;
- uma view ampla aumentaria exposição.

---

## 9. Eventos

### 9.1 Eventos centrais por contexto

#### `rh_core`

- `rh.person.created.v1`;
- `rh.person.identity-added.v1`;
- `rh.worker.created.v1`;
- `rh.worker.status-changed.v1`;
- `rh.relationship.role-activated.v1`.

#### `rh_org`

- `rh.company.activated.v1`;
- `rh.establishment.activated.v1`;
- `rh.position.authorized.v1`;
- `rh.assignment.activated.v1`;
- `rh.cost-allocation.changed.v1`.

#### `rh_admission`

- `rh.admission.requested.v1`;
- `rh.admission.document-verified.v1`;
- `rh.admission.approved.v1`;
- `rh.admission.cancelled.v1`;
- `rh.employment.activated.v1`.

#### `rh_contracts`

- `rh.contract.created.v1`;
- `rh.contract.version-approved.v1`;
- `rh.contract.version-activated.v1`;
- `rh.contract.change-rejected.v1`.

#### `rh_time`

- `rh.time.mark-received.v1`;
- `rh.time.treatment-approved.v1`;
- `rh.time.period-calculated.v1`;
- `rh.time.period.closed.v1`;
- `rh.time.period.reopened.v1`.

#### `rh_leave`

- `rh.vacation.granted.v1`;
- `rh.vacation.cancelled.v1`;
- `rh.leave.started.v1`;
- `rh.leave.ended.v1`;
- `rh.return.restriction-issued.v1`.

#### `rh_benefits`

- `rh.benefit.enrollment-activated.v1`;
- `rh.benefit.coverage-ended.v1`;
- `rh.deduction.instruction-created.v1`;
- `rh.provider.invoice-reconciled.v1`.

#### `rh_sst`

- `rh.risk.inventory-approved.v1`;
- `rh.exposure.profile-activated.v1`;
- `rh.aso.issued.v1`;
- `rh.incident.reported.v1`;
- `rh.training.completed.v1`;
- `rh.work-permit.authorized.v1`.

#### `rh_payroll`

- `rh.payroll.input-accepted.v1`;
- `rh.payroll.run-calculated.v1`;
- `rh.payroll.run-approved.v1`;
- `rh.payroll.period.closed.v1`;
- `rh.payroll.payment-settled.v1`.

#### `rh_compliance`

- `rh.compliance.projection-generated.v1`;
- `rh.compliance.projection-approved.v1`;
- `rh.compliance.transmission-sent.v1`;
- `rh.compliance.receipt-received.v1`;
- `rh.compliance.projection-accepted.v1`;
- `rh.compliance.reconciliation-divergent.v1`.

#### `rh_offboarding`

- `rh.termination.requested.v1`;
- `rh.termination.approved.v1`;
- `rh.termination.effective.v1`;
- `rh.offboarding.access-revoked.v1`;
- `rh.offboarding.asset-returned.v1`;
- `rh.termination.closed.v1`.

#### `rh_analytics`

- `rh.metric.version-activated.v1`;
- `rh.analytics.run-published.v1`;
- `rh.workforce.scenario-approved.v1`;
- `rh.model.suspended.v1`.

### 9.2 Conteúdo mínimo

Eventos conterão:

- identificador do agregado;
- versão;
- tipo do fato;
- instante;
- IDs de referência necessários;
- código de estado;
- hash ou versão quando relevante.

Conteúdo sensível será substituído por referência autorizada.

---

## 10. Outbox e inbox

### 10.1 Outbox

Campos mínimos:

- `id`;
- `organization_id`;
- `event_type`;
- `event_version`;
- `aggregate_type`;
- `aggregate_id`;
- `aggregate_version`;
- `correlation_id`;
- `causation_id`;
- `payload` minimizado;
- `payload_sha256`;
- `occurred_at`;
- `available_at`;
- `published_at`;
- `attempt_count`;
- `last_error_code`.

### 10.2 Inbox

Campos mínimos:

- provedor e ambiente;
- conta técnica;
- external event ID;
- payload hash;
- assinatura válida;
- corpo bruto cifrado ou referência segura, quando necessário;
- resumo não sensível;
- recebido/processado;
- resultado;
- correlation ID;
- erro sanitizado.

### 10.3 Deduplicação

Prioridade:

1. identificador externo confiável;
2. chave composta do provedor;
3. hash do corpo e janela;
4. regra específica da integração.

---

## 11. Jobs e workers

### 11.1 Estados

`QUEUED`, `LEASED`, `RUNNING`, `SUCCEEDED`, `RETRY_SCHEDULED`, `FAILED_PERMANENT`, `DEAD_LETTER`, `CANCELLED`.

### 11.2 Lease

Reivindicação será atômica e usará:

- `FOR UPDATE SKIP LOCKED` ou RPC equivalente;
- `locked_by`;
- `locked_until`;
- heartbeat para jobs longos;
- recuperação após expiração;
- limite de jobs por execução.

### 11.3 Backoff

Política conceitual:

```text
base × 2^tentativa + jitter
```

Com teto, limite de tentativas e respeito ao `Retry-After`.

### 11.4 Catálogo inicial

- geração e assinatura de documentos;
- scan e promoção de arquivos;
- apuração de ponto;
- cálculo de férias;
- processamento de fornecedor de benefícios;
- cálculo de folha em lote;
- geração de demonstrativos;
- geração de remessa bancária;
- importação de retorno bancário;
- geração de projeções governamentais;
- transmissão;
- polling de recibos;
- ingestão de totalizadores;
- reconciliação de débitos e pagamentos;
- offboarding programado;
- atualização de métricas;
- exportações;
- retenção;
- backfills.

---

## 12. Integrações

### 12.1 Categorias

- eSocial;
- DCTFWeb;
- FGTS Digital;
- bancos e pagamentos;
- Contabilidade;
- fornecedores de benefícios;
- clínicas e laboratórios;
- assinatura eletrônica;
- Storage e antimalware;
- e-mail e WhatsApp;
- obras, estoque e financeiro internos.

### 12.2 Contrato de adapter

```ts
interface IntegrationAdapter<TRequest, TResponse> {
  validateConfiguration(): Promise<ValidationResult>;
  buildRequest(input: TRequest): Promise<PreparedRequest>;
  send(request: PreparedRequest): Promise<TransportResult<TResponse>>;
  classify(result: TransportResult<TResponse>): IntegrationOutcome;
  reconcile(reference: ExternalReference): Promise<ReconciliationResult>;
}
```

### 12.3 Resultado de transporte

Distinguir:

- não enviado;
- enviado sem resposta;
- resposta HTTP recebida;
- protocolo recebido;
- processamento pendente;
- aceito;
- rejeitado;
- aceito com alertas;
- resultado desconhecido.

### 12.4 Produção restrita

Antes de produção:

- credenciais segregadas;
- certificado válido;
- allowlist de empresa/estabelecimento;
- limites de volume;
- dupla aprovação;
- payload hash;
- runbook;
- reconciliação;
- evidência de teste.

---

## 13. Consultas

### 13.1 Paginação

Padrão:

```json
{
  "items": [],
  "page": {
    "nextCursor": "opaque|null",
    "hasMore": false,
    "limit": 50
  },
  "meta": {
    "asOf": "timestamptz",
    "correlationId": "uuid"
  }
}
```

Cursor deverá codificar ordenação e último identificador, sem expor segredos.

### 13.2 Filtros

- lista branca por consulta;
- datas com limites;
- busca textual normalizada;
- tenant sempre derivado;
- project/company/establishment conforme escopo;
- filtros sensíveis somente com capability específica;
- limite máximo de janela temporal.

### 13.3 Ordenação

Toda lista terá ordenação determinística e desempate por `id`.

### 13.4 `asOf`

Consultas temporais poderão indicar:

- estado vigente agora;
- estado vigente na data;
- estado conhecido na época;
- estado corrigido atual.

A modalidade será explícita.

---

## 14. Arquivos e downloads

Download autorizado seguirá:

1. autenticação;
2. capability e finalidade;
3. validação do recurso e tenant;
4. estado de scan permitido;
5. retenção/legal hold;
6. registro de auditoria;
7. URL assinada curta ou stream;
8. headers seguros.

O caminho de Storage não será retornado como autorização permanente.

---

## 15. Contratos por bounded context

### 15.1 `rh_core`

Comandos:

- criar pessoa;
- adicionar identidade;
- criar trabalhador;
- corrigir dado cadastral;
- vincular usuário;
- ativar papel de relação;
- restringir acesso ao próprio dado.

Consultas:

- localizar pessoa com minimização;
- detalhar trabalhador;
- listar vínculos da pessoa;
- consultar dados próprios.

RPCs críticas:

- `create_rh_person_and_worker`;
- `merge_rh_person_candidate` somente após revisão;
- `link_rh_user_identity`.

### 15.2 `rh_org`

Comandos:

- criar empresa e estabelecimento;
- versionar unidade, cargo e função;
- autorizar posição;
- atribuir lotação;
- alterar rateio.

Consultas:

- árvore vigente;
- posições vagas;
- lotações por trabalhador;
- capacidade por unidade.

RPCs:

- `activate_rh_assignment`;
- `close_rh_assignment`;
- `reorganize_rh_unit`.

### 15.3 `rh_admission`

Comandos:

- solicitar admissão;
- aplicar checklist;
- registrar documento;
- verificar item;
- aprovar/rejeitar;
- ativar vínculo;
- cancelar caso.

RPCs:

- `request_rh_admission`;
- `approve_rh_admission`;
- `activate_rh_employment_from_admission`.

### 15.4 `rh_contracts`

Comandos:

- criar contrato;
- propor alteração;
- aprovar versão;
- ativar versão;
- corrigir erro material;
- cancelar versão futura.

RPCs:

- `create_rh_contract_version`;
- `approve_rh_contract_change`;
- `activate_due_rh_contract_versions`.

### 15.5 `rh_time`

Comandos:

- registrar marcação;
- importar marcações;
- tratar inconsistência;
- aprovar tratamento;
- apurar período;
- fechar/reabrir;
- postar movimento de banco.

RPCs:

- `ingest_rh_time_mark`;
- `approve_rh_time_treatment`;
- `calculate_rh_time_period`;
- `close_rh_time_period`.

### 15.6 `rh_leave`

Comandos:

- programar/conceder férias;
- cancelar/remarcar;
- registrar ausência;
- abrir afastamento;
- prorrogar/encerrar;
- confirmar retorno.

RPCs:

- `grant_rh_vacation`;
- `cancel_rh_vacation`;
- `open_rh_leave_case`;
- `confirm_rh_return`.

### 15.7 `rh_benefits`

Comandos:

- criar adesão;
- incluir pessoa coberta;
- encerrar cobertura;
- criar instrução de desconto;
- importar cobrança;
- reconciliar fornecedor.

RPCs:

- `activate_rh_benefit_enrollment`;
- `post_rh_benefit_charge`;
- `reconcile_rh_provider_invoice`.

### 15.8 `rh_sst`

Comandos:

- publicar inventário;
- atribuir exposição;
- convocar exame;
- emitir ASO;
- registrar incidente;
- emitir CAT;
- concluir treinamento;
- autorizar permissão de trabalho.

RPCs:

- `activate_rh_exposure_profile`;
- `issue_rh_aso`;
- `report_rh_incident`;
- `authorize_rh_work_permit`.

Conteúdo clínico será manipulado por RPCs privadas específicas.

### 15.9 `rh_payroll`

Comandos:

- abrir ciclo;
- congelar população;
- aceitar entrada;
- calcular;
- recalcular;
- aprovar;
- fechar/reabrir;
- gerar pagamento;
- reconciliar retorno.

RPCs:

- `open_rh_payroll_cycle`;
- `freeze_rh_payroll_population`;
- `create_rh_payroll_run`;
- `approve_rh_payroll_run`;
- `close_rh_payroll_period`.

### 15.10 `rh_compliance`

Comandos:

- gerar projeção;
- validar;
- aprovar;
- enfileirar transmissão;
- registrar recibo;
- retificar/excluir;
- fechar/reabrir período;
- reconciliar totalizador, declaração, guia e pagamento.

RPCs:

- `generate_rh_government_projection`;
- `approve_rh_government_projection`;
- `queue_rh_government_transmission`;
- `apply_rh_external_receipt`;
- `reconcile_rh_government_obligation`.

### 15.11 `rh_offboarding`

Comandos:

- solicitar desligamento;
- analisar proteção;
- aprovar;
- registrar aviso;
- calcular rescisão;
- confirmar pagamento;
- revogar acesso;
- registrar devolução;
- fechar caso;
- reintegrar.

RPCs:

- `approve_rh_termination`;
- `make_rh_termination_effective`;
- `close_rh_termination_case`;
- `create_rh_reintegration_case`.

### 15.12 `rh_analytics`

Comandos:

- criar versão de métrica;
- aprovar;
- executar;
- publicar;
- criar cenário;
- aprovar cenário;
- suspender modelo.

Consultas:

- catálogo;
- observações agregadas;
- qualidade;
- cenários;
- explicações de modelo.

RPCs:

- `publish_rh_metric_version`;
- `publish_rh_analytics_run`;
- `approve_rh_workforce_scenario`.

---

## 16. Requisitos técnicos

### Contratos e validação

- **RT-001:** manter identificador estável para cada comando.
- **RT-002:** versionar contratos com mudança semântica.
- **RT-003:** validar payload antes de executar domínio.
- **RT-004:** derivar tenant e ator da sessão quando houver usuário.
- **RT-005:** rejeitar campos desconhecidos em comandos críticos.
- **RT-006:** normalizar datas, competência e valores.
- **RT-007:** exigir correlation ID.
- **RT-008:** suportar causation ID.
- **RT-009:** suportar expected version.
- **RT-010:** declarar política de idempotência.
- **RT-011:** retornar resultado tipado.
- **RT-012:** mapear erro para código estável.
- **RT-013:** localizar mensagens sem alterar código.
- **RT-014:** registrar warnings separadamente.
- **RT-015:** impedir payload sensível em mensagem de erro.

### Server Actions e Route Handlers

- **RT-016:** exigir capability antes de comando interno.
- **RT-017:** usar RPC em invariantes multi-tabela.
- **RT-018:** revalidar rota somente após sucesso.
- **RT-019:** proteger uploads por política de arquivo.
- **RT-020:** remover órfão anterior à confirmação quando seguro.
- **RT-021:** limitar tamanho de request.
- **RT-022:** verificar assinatura sobre corpo bruto.
- **RT-023:** verificar timestamp e replay.
- **RT-024:** persistir inbox antes do processamento pesado.
- **RT-025:** responder webhook após aceitação durável.
- **RT-026:** não expor Service Role ao cliente.
- **RT-027:** aplicar rate limit por integração.
- **RT-028:** validar content type.
- **RT-029:** devolver status HTTP coerente.
- **RT-030:** registrar correlação sem payload integral.

### RPCs e transações

- **RT-031:** definir search path explícito.
- **RT-032:** revogar execução de `anon`.
- **RT-033:** verificar tenant dentro da RPC.
- **RT-034:** verificar capability dentro da RPC crítica.
- **RT-035:** validar estado atual.
- **RT-036:** validar row version.
- **RT-037:** aplicar lock adequado.
- **RT-038:** gravar auditoria na transação.
- **RT-039:** gravar outbox na transação.
- **RT-040:** retornar dados mínimos.
- **RT-041:** falhar atomicamente.
- **RT-042:** impedir update direto quando RPC for obrigatória.
- **RT-043:** usar movimento compensatório em razão.
- **RT-044:** impedir replay divergente.
- **RT-045:** testar concorrência.

### Eventos e mensageria

- **RT-046:** usar nome no passado.
- **RT-047:** incluir versão do evento.
- **RT-048:** incluir agregado e versão.
- **RT-049:** minimizar payload.
- **RT-050:** incluir correlation e causation.
- **RT-051:** calcular hash do payload.
- **RT-052:** preservar ordem quando necessária.
- **RT-053:** tornar consumidor idempotente.
- **RT-054:** registrar publicação.
- **RT-055:** suportar republish controlado.
- **RT-056:** manter compatibilidade de eventos publicados.
- **RT-057:** declarar owner do evento.
- **RT-058:** declarar consumidores conhecidos.
- **RT-059:** impedir documento/base64 em evento.
- **RT-060:** testar schema de evento.

### Jobs e workers

- **RT-061:** reivindicar job atomicamente.
- **RT-062:** usar lease com expiração.
- **RT-063:** suportar heartbeat.
- **RT-064:** contar tentativas.
- **RT-065:** aplicar backoff e jitter.
- **RT-066:** respeitar Retry-After.
- **RT-067:** classificar erro retryable.
- **RT-068:** reconciliar resposta incerta.
- **RT-069:** suportar dead letter.
- **RT-070:** gerar alerta de dead letter.
- **RT-071:** permitir cancelamento seguro.
- **RT-072:** registrar duração e resultado.
- **RT-073:** limitar lote por execução.
- **RT-074:** recuperar lease expirado.
- **RT-075:** sanitizar erro persistido.

### Integrações

- **RT-076:** criar interface de adapter.
- **RT-077:** versionar configuração.
- **RT-078:** separar ambientes.
- **RT-079:** validar credencial/certificado.
- **RT-080:** classificar resposta de transporte.
- **RT-081:** distinguir enviado de aceito.
- **RT-082:** preservar request hash.
- **RT-083:** preservar identificador externo.
- **RT-084:** preservar recibo/protocolo.
- **RT-085:** suportar polling idempotente.
- **RT-086:** suportar webhook e polling sem duplicar resultado.
- **RT-087:** reconciliar contra fonte externa.
- **RT-088:** limitar produção restrita.
- **RT-089:** proteger segredos em logs.
- **RT-090:** documentar runbook.

### Consultas e arquivos

- **RT-091:** usar paginação por cursor em alto volume.
- **RT-092:** ordenar deterministicamente.
- **RT-093:** limitar tamanho de página.
- **RT-094:** usar lista branca de filtros.
- **RT-095:** suportar as-of explícito.
- **RT-096:** minimizar DTO.
- **RT-097:** aplicar supressão em analytics.
- **RT-098:** auditar leitura sensível.
- **RT-099:** separar visualização de exportação.
- **RT-100:** proteger download por autorização atual.
- **RT-101:** usar URL assinada curta ou stream.
- **RT-102:** verificar estado de scan.
- **RT-103:** registrar download sensível.
- **RT-104:** impedir caminho de Storage como autorização.
- **RT-105:** expirar exportação.

### Testes e governança

- **RT-106:** testar schemas de comando.
- **RT-107:** testar códigos de erro.
- **RT-108:** testar replay idempotente.
- **RT-109:** testar replay divergente.
- **RT-110:** testar concorrência de RPC.
- **RT-111:** testar assinatura inválida.
- **RT-112:** testar replay de webhook.
- **RT-113:** testar morte de worker.
- **RT-114:** testar lease expirado.
- **RT-115:** testar rate limit.
- **RT-116:** testar timeout após envio.
- **RT-117:** testar dead letter e reprocessamento.
- **RT-118:** testar compatibilidade de evento.
- **RT-119:** documentar contrato e owner.
- **RT-120:** bloquear implementação sem Gate G00.

---

## 17. Regras técnicas

- **RN-001:** consulta não altera estado canônico.
- **RN-002:** comando crítico não será expresso como update genérico.
- **RN-003:** Server Action não substituirá transação PostgreSQL.
- **RN-004:** tenant recebido do cliente não será confiado.
- **RN-005:** actor recebido do cliente não será confiado.
- **RN-006:** payload desconhecido será rejeitado em comando crítico.
- **RN-007:** mesma idempotency key e mesmo payload retorna resultado anterior quando aplicável.
- **RN-008:** mesma chave com payload diferente gera conflito.
- **RN-009:** expected version divergente impede gravação.
- **RN-010:** erro técnico não vaza ao cliente.
- **RN-011:** código de erro não muda por tradução.
- **RN-012:** warning não será tratado como sucesso irrestrito.
- **RN-013:** RPC crítica verifica autorização internamente.
- **RN-014:** Service Role não substitui autorização do domínio.
- **RN-015:** transição inválida falha sem estado parcial.
- **RN-016:** fato e outbox são gravados juntos.
- **RN-017:** provedor não será chamado dentro da transação longa.
- **RN-018:** evento descreve fato passado.
- **RN-019:** evento publicado não muda de significado.
- **RN-020:** evento não contém dado sensível desnecessário.
- **RN-021:** consumidor é idempotente.
- **RN-022:** inbox precede processamento pesado.
- **RN-023:** webhook sem assinatura válida não gera efeito.
- **RN-024:** replay conhecido não duplica efeito.
- **RN-025:** corpo bruto é preservado apenas conforme necessidade e retenção.
- **RN-026:** Route Handler responde após persistência durável.
- **RN-027:** job usa lease, não flag booleana sem expiração.
- **RN-028:** job retryable não perde correlação.
- **RN-029:** erro definitivo não entra em retry infinito.
- **RN-030:** timeout após envio exige reconciliação.
- **RN-031:** dead letter não marca obrigação cumprida.
- **RN-032:** reprocessamento de dead letter exige autorização.
- **RN-033:** backoff possui teto.
- **RN-034:** worker não registra segredo.
- **RN-035:** integração distingue transporte de processamento.
- **RN-036:** recibo não equivale a aceite.
- **RN-037:** aceite não equivale a reconciliação.
- **RN-038:** ambiente de produção é segregado.
- **RN-039:** certificado expirado bloqueia transmissão.
- **RN-040:** adapter externo não altera fato sem comando de domínio.
- **RN-041:** consulta de alto volume usa cursor.
- **RN-042:** cursor não amplia escopo.
- **RN-043:** ordenação possui desempate estável.
- **RN-044:** filtro não contorna RLS.
- **RN-045:** as-of declara semântica temporal.
- **RN-046:** DTO não replica tabela automaticamente.
- **RN-047:** dado clínico não aparece em DTO geral.
- **RN-048:** exportação exige permissão própria.
- **RN-049:** download valida autorização no instante da emissão.
- **RN-050:** URL assinada tem curta duração.
- **RN-051:** arquivo não limpo não é entregue.
- **RN-052:** Storage path não é autorização.
- **RN-053:** auditoria de negócio é separada de log técnico.
- **RN-054:** correlação liga comando, RPC, evento e job.
- **RN-055:** logs não armazenam payload pessoal integral.
- **RN-056:** comando de cálculo referencia snapshots.
- **RN-057:** cálculo repetido cria nova execução quando a semântica exigir.
- **RN-058:** fechar período usa lock de agregado.
- **RN-059:** reabrir período cria evento e trilha.
- **RN-060:** pagamento e transmissão são jobs separados.
- **RN-061:** worker de transmissão não aprova projeção.
- **RN-062:** aprovação não transmite automaticamente sem política explícita.
- **RN-063:** produção restrita usa allowlist.
- **RN-064:** polling e webhook convergem idempotentemente.
- **RN-065:** external ID globalmente ambíguo inclui provedor/conta.
- **RN-066:** resposta 2xx do provedor não implica aceite de negócio.
- **RN-067:** rate limit externo será respeitado.
- **RN-068:** erro 4xx definitivo requer correção, não retry cego.
- **RN-069:** erro 5xx pode ser retryable conforme operação.
- **RN-070:** contrato externo tem owner e versão.
- **RN-071:** mudança incompatível exige nova versão.
- **RN-072:** campo opcional novo não quebra consumer antigo.
- **RN-073:** remoção de campo exige descontinuação planejada.
- **RN-074:** API pública só existe para consumidor real.
- **RN-075:** health check não expõe configuração secreta.
- **RN-076:** endpoint técnico tem autenticação ou isolamento.
- **RN-077:** bulk preserva isolamento por item.
- **RN-078:** falha de um item não corrompe os demais.
- **RN-079:** contratos são documentados junto ao código futuro.
- **RN-080:** nenhum contrato será implementado antes do Gate G00.

---

## 18. Critérios de aceite

- **CA-001:** comando recebe correlation ID.
- **CA-002:** tenant do cliente não substitui tenant da sessão.
- **CA-003:** usuário sem capability recebe erro seguro.
- **CA-004:** payload inválido não grava dados.
- **CA-005:** expected version divergente gera conflito.
- **CA-006:** replay idempotente retorna mesmo resultado.
- **CA-007:** replay com payload diferente é rejeitado.
- **CA-008:** erro SQL não aparece na interface.
- **CA-009:** transação crítica não deixa linhas parciais.
- **CA-010:** auditoria e outbox são gravadas com o fato.
- **CA-011:** evento contém aggregate version.
- **CA-012:** evento não contém CPF completo ou diagnóstico.
- **CA-013:** consumer repetido não duplica efeito.
- **CA-014:** webhook inválido recebe 401/403 e não cria inbox válida.
- **CA-015:** replay de webhook não duplica processamento.
- **CA-016:** webhook aceito permanece processável após reinício.
- **CA-017:** processamento pesado ocorre fora da resposta do webhook.
- **CA-018:** job é reivindicado por um worker por lease.
- **CA-019:** worker morto libera job após expiração.
- **CA-020:** retry aplica backoff.
- **CA-021:** rate limit respeita espera informada.
- **CA-022:** timeout após envio entra em reconciliação.
- **CA-023:** erro definitivo termina em dead letter.
- **CA-024:** dead letter gera alerta e não cumpre obrigação.
- **CA-025:** reprocessamento mantém histórico de tentativas.
- **CA-026:** recibo externo fica separado do aceite.
- **CA-027:** polling e webhook não duplicam resultado.
- **CA-028:** credencial de produção não é usada em homologação.
- **CA-029:** certificado expirado bloqueia transmissão.
- **CA-030:** adapter troca sem alterar contrato de domínio.
- **CA-031:** consulta não publica evento.
- **CA-032:** lista de alto volume usa cursor estável.
- **CA-033:** mudança de página não repete ou perde item em cenário estável.
- **CA-034:** filtro não expõe outro tenant.
- **CA-035:** DTO de gestor não contém prontuário.
- **CA-036:** consulta própria retorna somente dados do titular.
- **CA-037:** exportação é bloqueada sem capability específica.
- **CA-038:** arquivo não limpo não é baixado.
- **CA-039:** URL assinada expira.
- **CA-040:** download sensível gera auditoria.
- **CA-041:** log técnico possui correlation ID.
- **CA-042:** log não contém token ou conta bancária completa.
- **CA-043:** comando, evento e job são rastreáveis.
- **CA-044:** contrato incompatível usa nova versão.
- **CA-045:** consumer antigo ignora campo opcional novo.
- **CA-046:** função `security definer` possui search path explícito.
- **CA-047:** `anon` não executa RPC do RH.
- **CA-048:** bulk registra resultado individual.
- **CA-049:** falha individual não deixa estado parcial nos demais itens.
- **CA-050:** cálculo referencia snapshot e versão do motor.
- **CA-051:** fechamento concorrente produz uma confirmação.
- **CA-052:** aprovação não é confundida com transmissão.
- **CA-053:** aceite não é confundido com pagamento ou reconciliação.
- **CA-054:** documentação identifica owner e consumidores.
- **CA-055:** nenhuma API, RPC, evento ou worker é criado apenas pela aprovação deste documento.

---

## 19. Testes obrigatórios

### 19.1 Contrato

- validação positiva e negativa;
- campos desconhecidos;
- compatibilidade de versão;
- serialização;
- códigos de erro;
- payload minimizado.

### 19.2 Transação

- sucesso integral;
- falha no meio;
- rollback;
- outbox atômica;
- expected version;
- estado inválido.

### 19.3 Idempotência

- primeira execução;
- replay igual;
- replay divergente;
- replay após timeout;
- concorrência da mesma chave.

### 19.4 Webhooks

- assinatura válida/inválida;
- timestamp expirado;
- replay;
- corpo excessivo;
- JSON inválido;
- conta desconhecida;
- persistência antes de resposta;
- retomada após falha.

### 19.5 Workers

- dois workers;
- lease;
- expiração;
- heartbeat;
- retry;
- backoff;
- dead letter;
- cancelamento;
- shutdown seguro.

### 19.6 Integrações

- timeout antes do envio;
- timeout depois do envio;
- 4xx definitivo;
- 5xx;
- rate limit;
- recibo assíncrono;
- divergência externa;
- reconciliação.

### 19.7 Consultas

- isolamento tenant;
- escopo;
- paginação;
- ordenação;
- as-of;
- minimização;
- supressão;
- exportação.

---

## 20. Sequência de implementação

1. schemas compartilhados de envelope e erro;
2. catálogo de códigos de erro;
3. helper de correlação;
4. helper de autorização de comando;
5. tabelas de outbox/inbox/jobs do pacote autorizado;
6. RPCs de lease e conclusão;
7. worker genérico controlado;
8. primeiro fluxo vertical do `rh_core`;
9. testes de contrato e concorrência;
10. adapters por onda;
11. produção restrita;
12. expansão por bounded context.

Nenhum item começará antes do Gate G00.

---

## 21. Estado honesto

Este documento contém especificação de contratos.

Não foram criados:

- tipos TypeScript;
- schemas Zod;
- Server Actions;
- Route Handlers;
- RPCs;
- tabelas de outbox/inbox/jobs;
- eventos;
- workers;
- adapters;
- endpoints;
- OpenAPI;
- integrações.

---

## 22. Conclusão

O Módulo 16 estabelece contratos coerentes entre interface, banco, processamento assíncrono e sistemas externos. A plataforma poderá implementar incrementos verticais com autorização, atomicidade, idempotência, privacidade, observabilidade e reconciliação sem acoplar o domínio às particularidades de uma tela ou fornecedor.
