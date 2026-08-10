# Projeto RH — ADR-016 — Contratos, Comandos, Consultas, Eventos e Jobs

**Estado:** decisão técnica registrada; implementação pendente  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**Módulo relacionado:** `PROJETO-RH-MODULO-16-CONTRATOS-API-COMANDOS-CONSULTAS-EVENTOS-E-JOBS.md`

---

## 1. Contexto

Os módulos 01 a 12 definiram os domínios funcionais. Os módulos 13 a 15 definiram arquitetura, backlog e modelo físico. O próximo risco é permitir que cada tela, integração ou worker invente sua própria forma de:

- validar entrada;
- autorizar usuário;
- selecionar tenant e escopo;
- executar transações;
- identificar repetição;
- versionar contratos;
- retornar erros;
- publicar eventos;
- processar jobs;
- reconciliar integrações;
- registrar auditoria;
- lidar com resposta externa incerta.

O repositório já possui Server Actions com `requireCapability`, RPCs transacionais, Route Handlers para webhooks, uso de Service Role no servidor, hashes de payload, idempotência e workers que reivindicam trabalho por RPC. Esses padrões são a base, mas o RH necessita de contratos mais rigorosos devido a folha, dados clínicos, eventos governamentais, desligamentos e decisões com impacto relevante.

---

## 2. Decisão

O Projeto RH adotará a seguinte separação:

```text
Interface interna
  → comando tipado
    → autorização e validação
      → RPC ou transação do contexto
        → fato canônico + auditoria + outbox

Consulta
  → autorização de leitura
    → view/projeção/RPC de leitura
      → DTO minimizado

Evento externo
  → autenticação do remetente
    → inbox idempotente
      → processamento assíncrono
        → fato/projeção/reconciliação

Job
  → lease atômico
    → execução observável
      → conclusão, retry ou dead letter
```

Os conceitos abaixo serão distintos:

1. contrato de entrada;
2. comando;
3. consulta;
4. RPC;
5. evento de domínio;
6. evento de integração;
7. mensagem de outbox;
8. mensagem de inbox;
9. webhook recebido;
10. job;
11. tentativa;
12. resposta externa;
13. recibo;
14. reconciliação;
15. erro de domínio;
16. erro técnico;
17. correlação;
18. idempotência.

---

## 3. Princípios

### 3.1 Comando expressará intenção de negócio

Nomes de comando representarão ações como:

- `RequestAdmission`;
- `ApproveContractChange`;
- `CloseTimePeriod`;
- `GrantVacation`;
- `IssueAso`;
- `CalculatePayroll`;
- `ApprovePayrollRun`;
- `QueueGovernmentProjection`;
- `ApproveTermination`.

Não serão usados comandos genéricos como `UpdateRecord` para transições críticas.

### 3.2 Consulta não alterará estado

Consultas:

- não publicarão eventos;
- não criarão defaults persistidos;
- não atualizarão `last_seen` em tabelas canônicas;
- não executarão correções silenciosas;
- não dispararão cálculo, transmissão ou reconciliação;
- não ampliarão o escopo autorizado.

Telemetria de acesso, quando necessária, será registrada por mecanismo próprio e não mudará o objeto consultado.

### 3.3 Server Action será adaptador, não domínio

Server Actions deverão:

1. obter contexto autenticado;
2. validar contrato de entrada;
3. exigir capacidade e escopo;
4. chamar comando/RPC do contexto;
5. traduzir resultado em navegação, revalidação ou resposta segura.

Não deverão implementar em TypeScript uma sequência crítica de inserts, updates e deletes com compensação manual quando a invariável exigir transação PostgreSQL.

### 3.4 RPC crítica será transacional e autocontida

Uma RPC crítica deverá:

- identificar a organização a partir do contexto e do recurso;
- verificar autorização dentro da função;
- adquirir lock apropriado;
- validar estado e `row_version`;
- aplicar a transição integralmente;
- gravar trilha e outbox na mesma transação;
- retornar resultado mínimo e estável;
- falhar sem deixar estado parcial.

### 3.5 Contrato terá envelope comum

Comandos internos tipados adotarão conceitualmente:

```json
{
  "commandId": "uuid",
  "commandType": "rh.contract.change.approve.v1",
  "organizationId": "uuid",
  "actorUserId": "uuid",
  "scope": { "companyId": "uuid", "projectId": null },
  "occurredAt": "timestamptz",
  "expectedVersion": 7,
  "idempotencyKey": "string",
  "correlationId": "uuid",
  "causationId": "uuid|null",
  "payload": {}
}
```

Campos derivados da sessão não serão aceitos cegamente do cliente.

### 3.6 Resposta terá resultado e erro estruturados

Resultado conceitual:

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "correlationId": "uuid",
    "resourceVersion": 8,
    "idempotentReplay": false
  }
}
```

Erro conceitual:

```json
{
  "ok": false,
  "error": {
    "code": "RH_CONTRACT_VERSION_CONFLICT",
    "message": "O contrato foi alterado por outro usuário.",
    "retryable": false,
    "fieldErrors": []
  },
  "meta": { "correlationId": "uuid" }
}
```

Detalhes internos, SQL, stack traces, tokens, payloads pessoais e mensagens brutas do provedor não serão devolvidos ao cliente.

### 3.7 Erros terão taxonomia estável

Famílias mínimas:

- `AUTHENTICATION_REQUIRED`;
- `AUTHORIZATION_DENIED`;
- `VALIDATION_FAILED`;
- `RESOURCE_NOT_FOUND`;
- `STATE_CONFLICT`;
- `VERSION_CONFLICT`;
- `DUPLICATE_COMMAND`;
- `DEPENDENCY_BLOCKED`;
- `TEMPORAL_CONFLICT`;
- `PRIVACY_RESTRICTED`;
- `EXTERNAL_UNAVAILABLE`;
- `EXTERNAL_RESPONSE_UNCERTAIN`;
- `RATE_LIMITED`;
- `INTEGRATION_REJECTED`;
- `INTERNAL_ERROR`.

Código é estável; mensagem pode ser localizada.

### 3.8 Idempotência será definida por operação

Toda operação com risco de repetição deverá definir:

- chave;
- escopo da chave;
- duração;
- fingerprint do payload;
- resultado preservado;
- comportamento em payload divergente;
- comportamento após falha incerta.

A mesma chave com payload diferente será conflito, não reaproveitamento silencioso.

### 3.9 Concorrência otimista e locks terão papéis distintos

- `expectedVersion` detectará edição concorrente;
- lock de linha protegerá transição pontual;
- advisory lock protegerá agregado ou período;
- unique garantirá exclusão estrutural;
- idempotency key impedirá repetição lógica.

Um mecanismo não substituirá os demais.

### 3.10 Evento de domínio será fato passado

Eventos usarão nomes no passado:

- `rh.worker.created.v1`;
- `rh.employment.activated.v1`;
- `rh.time.period.closed.v1`;
- `rh.leave.granted.v1`;
- `rh.aso.issued.v1`;
- `rh.payroll.run.approved.v1`;
- `rh.termination.effective.v1`.

Evento não será pedido para executar ação futura. Pedidos serão comandos ou jobs.

### 3.11 Evento não transportará dados sensíveis desnecessários

Eventos publicarão identificadores, versão, tipo, datas e atributos mínimos. Não transportarão por padrão:

- CPF completo;
- conta bancária;
- diagnóstico;
- prontuário;
- conteúdo de ordem judicial;
- salário detalhado;
- payload governamental integral;
- documento em base64.

Consumidor buscará dados autorizados no contexto proprietário ou receberá projeção minimizada.

### 3.12 Outbox será gravada com o fato

Toda integração decorrente de transação crítica será registrada em `rh_ops` na mesma transação do fato canônico. Um worker publicará ou processará a mensagem posteriormente.

Não será permitido:

```text
confirmar fato
  → chamar provedor
  → somente depois tentar registrar que chamou
```

### 3.13 Inbox será a porta de eventos externos

Webhook ou retorno externo será primeiro persistido com:

- provedor;
- ambiente;
- hash do corpo;
- identificador externo;
- cabeçalhos permitidos;
- instante de recebimento;
- verificação de assinatura;
- estado de processamento;
- erro sanitizado.

Processamento posterior deverá ser repetível e idempotente.

### 3.14 Webhook responderá rapidamente

Route Handler deverá:

1. limitar tamanho;
2. capturar corpo bruto;
3. verificar assinatura e timestamp;
4. validar replay;
5. identificar ambiente/tenant quando possível;
6. persistir inbox;
7. responder `2xx` após aceitação durável;
8. delegar processamento pesado a job.

Não deverá executar fluxo longo de múltiplas entidades antes de confirmar recebimento quando o provedor possuir timeout curto.

### 3.15 Service Role não decidirá autorização de negócio

Service Role poderá:

- persistir inbox autenticada;
- reivindicar jobs;
- processar outbox;
- executar backfill aprovado;
- acessar schema privado em operação técnica.

Ela não poderá transformar qualquer payload recebido em alteração canônica sem validações de tenant, versão, estado e contrato.

### 3.16 Job terá lease e tentativa

Um job possuirá:

- tipo e versão;
- tenant;
- prioridade;
- payload mínimo ou referência;
- estado;
- `available_at`;
- `locked_by`;
- `locked_until`;
- número de tentativas;
- limite;
- política de backoff;
- correlação;
- deduplication key;
- erro sanitizado;
- resultado resumido.

O lease permitirá recuperação após morte do worker.

### 3.17 Retry dependerá da classe do erro

- validação: não retry;
- autorização: não retry;
- rejeição definitiva externa: não retry automático;
- timeout/conexão: retry com backoff e jitter;
- resposta incerta após envio: reconciliar antes de reenviar;
- rate limit: respeitar `Retry-After` quando disponível;
- conflito de versão: voltar para análise ou replanejamento.

### 3.18 Dead letter não encerrará obrigação

Mover job para dead letter:

- encerra tentativas automáticas;
- preserva evidências;
- gera alerta;
- exige decisão humana;
- não marca obrigação como cumprida;
- não apaga o fato ou o prazo.

### 3.19 Contratos externos serão adapters versionados

Cada integração terá interface de domínio e adapter por fornecedor/versão. Exemplo:

```text
GovernmentEventGateway
  ├─ buildProjection
  ├─ validateProjection
  ├─ transmit
  ├─ queryReceipt
  └─ reconcile
```

O domínio não dependerá diretamente do formato HTTP específico do provedor.

### 3.20 Consulta seguirá minimização e paginação por cursor

Consultas de alto volume utilizarão cursor estável, ordenação determinística e limite máximo. `offset` poderá ser usado em pequenas configurações, mas não será padrão para movimentos, eventos, cálculos e históricos extensos.

### 3.21 API externa será excepcional

A maior parte do RH será interface interna do monólito. API HTTP pública ou para parceiros somente será criada quando houver consumidor real, autenticação, rate limit, escopo e versionamento definidos.

### 3.22 Versionamento seguirá compatibilidade

- mudança compatível: mantém versão;
- novo campo opcional: compatível;
- alteração de semântica: nova versão;
- remoção ou mudança obrigatória: nova versão;
- evento publicado nunca muda de significado;
- consumers deverão declarar versões aceitas.

### 3.23 Logs usarão correlação sem PII

Todos os fluxos críticos registrarão:

- `correlationId`;
- `causationId`;
- tipo do comando/evento/job;
- tenant;
- recurso técnico;
- resultado;
- duração;
- código de erro.

Não registrarão payload integral por padrão.

### 3.24 Auditoria de negócio não será log técnico

Auditoria de negócio registrará quem decidiu, o quê, quando, versão anterior, versão nova, fundamento e evidência. Log técnico registrará execução e falha. Ambos poderão compartilhar correlação, mas terão retenção e acesso diferentes.

---

## 4. Superfícies

### 4.1 Server Actions

Uso:

- formulários internos;
- comandos simples ou coordenação de RPC;
- navegação e revalidação.

Não uso:

- webhook;
- processamento em lote longo;
- stream;
- callback externo;
- cron/worker;
- API de parceiro.

### 4.2 Route Handlers

Uso:

- webhooks;
- endpoints de integração;
- downloads autorizados;
- callbacks;
- health checks técnicos restritos;
- APIs explicitamente versionadas.

### 4.3 RPCs

Uso:

- transições de estado;
- invariantes multi-tabela;
- fechamento;
- cálculo e publicação de snapshots;
- lock e reivindicação de job;
- reconciliação atômica;
- comandos append-only.

### 4.4 Workers

Uso:

- outbox;
- transmissões;
- geração de documentos;
- cálculo em lote;
- importações;
- reconciliação;
- retenção;
- analytics;
- backfills.

---

## 5. Consequências positivas

- contratos consistentes;
- menor lógica de domínio em telas;
- transações completas;
- repetição segura;
- webhooks recuperáveis;
- jobs resilientes;
- erros estáveis e localizáveis;
- observabilidade ponta a ponta;
- menor vazamento de dados;
- adapters substituíveis;
- eventos compatíveis;
- reconciliação explícita;
- testes de contrato possíveis.

---

## 6. Custos aceitos

- catálogo de contratos;
- schemas e validadores compartilhados;
- tabelas de outbox, inbox e jobs;
- mais RPCs;
- workers e runbooks;
- testes de contrato;
- governança de versões;
- disciplina de erro e correlação;
- adapters por integração;
- reconciliação e dead-letter.

---

## 7. Alternativas rejeitadas

### 7.1 Toda lógica em Server Actions

Rejeitada por dificultar transação, concorrência, reuso e testes.

### 7.2 Toda operação via REST pública

Rejeitada por ampliar superfície sem necessidade no monólito interno.

### 7.3 Eventos contendo o registro completo

Rejeitada por acoplamento, privacidade e incompatibilidade futura.

### 7.4 Retry cego de qualquer erro

Rejeitado por duplicidade, bloqueios e risco de transmissão repetida.

### 7.5 Chamar provedor dentro da transação do banco

Rejeitado por locks longos, timeout e estado incerto.

### 7.6 Service Role como bypass universal

Rejeitada por eliminar autorização e fronteiras de domínio.

### 7.7 Mensagens de erro do PostgreSQL diretamente na interface

Rejeitada por segurança, instabilidade e experiência inadequada.

---

## 8. Regra de implementação

Esta ADR não cria:

- endpoint;
- Server Action;
- RPC;
- evento;
- tabela de outbox;
- tabela de inbox;
- worker;
- adapter;
- fila;
- integração;
- contrato OpenAPI;
- código executável.

A implementação depende do Gate G00, do pacote de migration correspondente e da aprovação dos contratos detalhados do Módulo 16.

---

## 9. Decisão final

O Projeto RH adotará contratos tipados e versionados, comandos explícitos, consultas sem efeitos, RPCs transacionais, eventos mínimos, outbox/inbox duráveis, jobs com lease e integrações reconciliáveis. Nenhuma camada poderá usar conveniência técnica para contornar autorização, temporalidade, privacidade ou integridade do domínio.
