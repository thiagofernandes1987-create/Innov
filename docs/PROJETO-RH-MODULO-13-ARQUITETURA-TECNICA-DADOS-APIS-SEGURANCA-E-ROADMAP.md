# Projeto RH — Módulo 13 — Arquitetura Técnica, Dados, APIs, Segurança, Migrações e Roadmap

**Versão:** 0.1.0  
**Estado:** especificação técnica inicial concluída; implementação pendente  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**ADR vinculante:** `PROJETO-RH-ADR-013-MONOLITO-MODULAR-TRANSACOES-E-PROJECOES.md`

---

## 1. Finalidade

Este módulo converte a especificação funcional dos módulos 01 a 12 em uma arquitetura técnica executável, sem ainda autorizar migrations, telas ou integrações de produção.

A finalidade é definir:

- como o Projeto RH entra na arquitetura existente;
- quais fronteiras técnicas serão preservadas;
- como dados temporais e imutáveis serão modelados;
- como comandos, consultas, eventos e jobs serão separados;
- como autorização, RLS e dados sensíveis funcionarão;
- como migrations e backfills serão executados com segurança;
- quais ondas de implementação e gates deverão ser cumpridos;
- quais evidências serão exigidas antes de homologação e produção.

---

## 2. Inventário técnico confirmado

### 2.1 Stack atual

- Next.js 16;
- React 19;
- TypeScript estrito;
- Node.js 24 ou superior;
- pnpm 11.15.0;
- Supabase Auth;
- PostgreSQL e PostgREST;
- Row Level Security;
- Supabase Storage privado;
- Zod 4;
- Vitest 4;
- Playwright;
- scripts Node de validação e workers;
- Python auxiliar para Qualidade.

### 2.2 Arquitetura atual

A plataforma é um monólito modular com:

- App Router;
- Server Components;
- Server Actions;
- Route Handlers;
- RPCs transacionais;
- migrations append-only;
- testes SQL com `ROLLBACK`;
- catálogo de módulos;
- autorização por módulo, nível, capacidade e escopo;
- auditoria transversal;
- observabilidade e health checks;
- buckets privados;
- workers especializados.

### 2.3 Convenções existentes

- UUIDs;
- timestamps UTC;
- `organization_id` como fronteira multi-tenant;
- `project_id` para obra;
- `client_id` para cliente;
- constraints para invariantes locais;
- RPCs para operações multi-tabela;
- índices em FKs e filtros de RLS;
- funções `SECURITY DEFINER` com `search_path` explícito;
- migrations nunca reescritas depois de aplicadas;
- ledger e validação de conteúdo das migrations;
- Service Role somente no servidor;
- ações críticas com idempotência e auditoria.

### 2.4 Gaps atuais para o RH

- não existe módulo `recursos-humanos` no registry;
- não existem rotas, componentes ou contextos `rh`;
- não existem tabelas canônicas do RH;
- não existe catálogo detalhado de capacidades do RH;
- o tipo global atual de capacidade é genérico demais para folha, clínica, SST e obrigações;
- não existe outbox genérica confirmada para integrações do RH;
- não existe fila genérica confirmada para jobs do RH;
- não existe separação física confirmada para dados clínicos e judiciais;
- não existe motor declarativo de folha;
- não existem adapters governamentais do RH;
- não existem projeções analíticas do RH;
- não existem testes SQL, E2E ou fixtures do RH;
- não existe estratégia de migração de `equipes` para trabalhador/vínculo;
- não existe plano de reconciliação de pessoas já presentes em outros módulos.

---

## 3. Arquitetura alvo

```text
Navegador
  → Next.js App Router
    ├─ Server Components para leitura
    ├─ Server Actions para comandos internos
    └─ Route Handlers para APIs, webhooks e downloads
      → lib/rh/*
        ├─ autorização
        ├─ schemas Zod
        ├─ comandos
        ├─ consultas
        ├─ eventos
        └─ adapters
          → Supabase/PostgreSQL
            ├─ tabelas canônicas
            ├─ RLS e grants
            ├─ RPCs transacionais
            ├─ trilhas de domínio
            ├─ outbox
            └─ projeções

Workers Node
  → jobs e integrações externas
    → tentativas, recibos e reconciliação
```

---

## 4. Bounded contexts e ownership

| Contexto | Ownership principal | Dependências de leitura |
|---|---|---|
| `rh_core` | pessoa, trabalhador, vínculo | Auth, organizações |
| `rh_org` | empresa, estabelecimento, estrutura, posição, lotação | core, obras, centros de custo |
| `rh_admission` | casos de admissão, checklists e ativação | core, org, documentos, SST |
| `rh_contracts` | contrato, versões e alterações | core, org, documentos |
| `rh_time` | jornada, escala, marcação, apuração e banco | core, contracts, obras |
| `rh_leave` | férias, ausências, afastamentos e retorno | core, time, SST |
| `rh_benefits` | benefícios, dependentes, pensões e descontos | core, payroll, financeiro |
| `rh_sst` | riscos, exames, ASO, incidentes, EPI e habilitações | core, org, obras, estoque |
| `rh_payroll` | rubricas, parâmetros, cálculo, fechamento | todos os fatos remuneratórios |
| `rh_compliance` | projeções externas, filas e reconciliação | core, payroll, SST, offboarding |
| `rh_offboarding` | desligamento, rescisão e offboarding | core, contracts, payroll, financeiro |
| `rh_analytics` | métricas, observações e cenários | projeções autorizadas de todos os contextos |

Cada tabela terá um contexto proprietário explícito.

---

## 5. Organização do código

Estrutura alvo:

```text
app/
  app/recursos-humanos/
    layout.tsx
    page.tsx
    cadastro/
    estrutura/
    admissoes/
    contratos/
    jornadas/
    afastamentos/
    beneficios/
    sst/
    folha/
    obrigacoes/
    desligamentos/
    analytics/
  actions/rh/
  api/rh/

components/rh/

lib/rh/
  shared/
  core/
  org/
  admission/
  contracts/
  time/
  leave/
  benefits/
  sst/
  payroll/
  compliance/
  offboarding/
  analytics/

scripts/rh/
workers/rh/
supabase/tests/rh_*.sql
```

### 5.1 Conteúdo mínimo por contexto

- `types.ts`;
- `schemas.ts`;
- `commands.ts`;
- `queries.ts`;
- `events.ts`;
- `permissions.ts`;
- `errors.ts`;
- `mappers.ts`;
- `__tests__/`.

Adapters externos ficarão em subpastas próprias e não importarão componentes de UI.

---

## 6. Registro do módulo

O registry deverá receber uma entrada estável:

```text
key: recursos-humanos
routePrefix: /app/recursos-humanos
category: Administrativo
```

Dependências iniciais prováveis:

- `obras`;
- `equipes` durante transição;
- `financeiro`;
- `documentos`;
- `estoque`;
- `relatorios`;
- `auditoria`.

A dependência não autorizará acesso automático ao módulo dependente.

---

## 7. Estratégia de schemas PostgreSQL

### 7.1 Opção inicial recomendada

- objetos de negócio comuns poderão permanecer no schema exposto adotado pela plataforma, sempre com grants mínimos e RLS;
- objetos internos de integração, outbox e jobs deverão ficar fora da exposição direta ou com grants revogados;
- prontuários e dados clínicos detalhados deverão ficar em schema privado;
- dados judiciais altamente sensíveis poderão usar schema privado ou tabela sem grants diretos;
- views de leitura mínima poderão expor somente aptidão, restrição operacional ou status necessário.

### 7.2 Schemas lógicos indicativos

- `public` ou schema de negócio atual: dados operacionais protegidos por RLS;
- `rh_private`: dados clínicos, judiciais e payloads protegidos;
- `rh_internal`: outbox, jobs, checkpoints e detalhes técnicos;
- `analytics`: projeções e observações, caso a governança física seja aprovada.

A decisão final deverá ser tomada após inventário dos schemas e grants atuais.

---

## 8. Convenções de tabela

Campos comuns quando aplicáveis:

```text
id uuid primary key
organization_id uuid not null
created_at timestamptz not null
created_by uuid
updated_at timestamptz
updated_by uuid
version integer not null
status text not null
correlation_id uuid
metadata jsonb
```

Campos temporais quando aplicáveis:

```text
valid_from timestamptz/date
valid_to timestamptz/date
recorded_at timestamptz
supersedes_id uuid
correction_reason text
```

Campos de origem:

```text
source_type text
source_id uuid/text
source_version text
```

`metadata` não armazenará campos estruturais que deveriam possuir coluna, constraint ou FK.

---

## 9. Identidades e chaves

- IDs internos serão UUID;
- códigos humanos serão separados do ID;
- CPF, matrícula, recibo, protocolo e código externo não serão PK;
- identificadores pessoais normalizados terão unicidade com escopo e vigência apropriados;
- valores sensíveis pesquisáveis poderão exigir hash normalizado separado;
- chaves externas terão tabela de mapeamento quando um sistema puder alterar código;
- FKs deverão possuir índice quando usadas em join, RLS ou exclusão.

---

## 10. Temporalidade

### 10.1 Tempos distintos

- tempo do fato;
- tempo de vigência;
- tempo de registro;
- tempo de processamento;
- tempo de publicação externa.

### 10.2 Exclusão temporal

Para condições exclusivas, serão avaliadas:

- exclusion constraints;
- índices parciais;
- triggers de validação;
- RPCs que serializam a aplicação.

### 10.3 Histórico

- versão aplicada não será sobrescrita;
- correção gerará nova versão ou registro compensatório;
- estado atual será derivado de vigência, prioridade e status;
- consultas históricas deverão especificar modalidade temporal.

---

## 11. Máquinas de estado

Estados não serão strings livres controladas apenas pela UI.

A implementação deverá usar uma combinação de:

- constraint de valores válidos;
- tabela de transições permitidas quando configurável;
- RPC para transições críticas;
- registro de estado anterior, novo estado, ator, razão e instante;
- bloqueio otimista por versão.

A UI apresentará somente transições autorizadas, mas o banco continuará validando.

---

## 12. Padrão de comando

Fluxo mínimo:

```text
Server Action ou Route Handler
  → autenticar
  → carregar organização ativa
  → validar módulo e capacidade
  → validar payload com Zod
  → criar correlation_id
  → chamar comando/RPC
  → mapear erro público
  → registrar observabilidade
  → revalidar leitura afetada
```

Comandos críticos receberão `idempotency_key` e, quando aplicável, `expected_version`.

---

## 13. Padrão de consulta

Consultas deverão:

- usar Server Components por padrão;
- aplicar escopo no banco;
- selecionar colunas explicitamente;
- paginar;
- possuir ordenação determinística;
- informar freshness para projeções;
- evitar retorno de payload sensível;
- separar consulta operacional de exportação;
- usar cursor para grandes conjuntos quando apropriado;
- ser testadas contra vazamento entre organizações.

---

## 14. RPCs transacionais

RPCs críticas iniciais previstas:

- ativar vínculo;
- aplicar versão contratual;
- registrar marcação idempotente;
- tratar marcação;
- fechar e reabrir período de ponto;
- postar movimento de banco de horas;
- conceder, cancelar ou corrigir férias;
- concluir caso de afastamento e retorno;
- emitir ASO e decisão de aptidão;
- concluir entrega ou devolução de EPI;
- executar cálculo de folha;
- aprovar e fechar folha;
- reabrir folha;
- reivindicar job;
- registrar tentativa externa;
- concluir reconciliação;
- efetivar término do vínculo;
- registrar reintegração;
- publicar observação analítica.

Cada RPC terá contrato, permissão, testes e política de grants explícitos.

---

## 15. Eventos de domínio

Contrato mínimo:

```text
id
organization_id
context_key
event_type
event_version
aggregate_type
aggregate_id
aggregate_version
actor_user_id
correlation_id
causation_id
occurred_at
payload
classification
```

Regras:

- payload mínimo;
- sem segredo ou prontuário;
- versão explícita;
- evento no passado;
- imutável;
- consumidor idempotente;
- retenção conforme finalidade;
- trilha de domínio não substituída.

---

## 16. Outbox

Tabela indicativa:

```text
rh_internal.outbox_events
```

Campos:

- `id`;
- `organization_id`;
- `event_id`;
- `destination`;
- `status`;
- `available_at`;
- `attempt_count`;
- `locked_at`;
- `locked_by`;
- `last_error_code`;
- `processed_at`.

Estados:

`PENDING`, `PROCESSING`, `RETRY`, `COMPLETED`, `DEAD_LETTER`, `CANCELLED`.

---

## 17. Jobs

Tabela indicativa:

```text
rh_internal.jobs
```

Tipos iniciais:

- geração de documento;
- importação de arquivo;
- cálculo em lote;
- envio governamental;
- polling de retorno;
- reconciliação;
- entrega de relatório;
- backfill;
- retenção;
- materialização analítica.

Workers usarão lease e `SKIP LOCKED` ou mecanismo equivalente validado.

---

## 18. Idempotência

Chave de idempotência terá escopo por:

- organização;
- comando;
- agregado;
- sistema de origem;
- período, quando aplicável.

A repetição deverá:

- retornar o resultado anterior quando equivalente;
- rejeitar payload diferente com mesma chave;
- não duplicar movimento, evento, job ou transmissão;
- registrar correlação.

---

## 19. Concorrência

Casos prioritários:

- duas ativações do mesmo caso;
- duas alterações contratuais para a mesma vigência;
- marcações offline duplicadas;
- fechamento concorrente de ponto;
- consumo simultâneo de banco de horas;
- concessões de férias sobrepostas;
- entrega duplicada de EPI;
- dois cálculos de folha sobre a mesma versão;
- fechamento simultâneo de folha;
- transmissão duplicada;
- dois desligamentos abertos;
- dois workers processando o mesmo job.

Cada caso deverá possuir teste concorrente reproduzível.

---

## 20. Autorização técnica

### 20.1 Camadas

1. sessão;
2. organização ativa;
3. módulo habilitado;
4. acesso básico;
5. capacidade de domínio;
6. escopo;
7. finalidade;
8. sensibilidade;
9. separação de funções;
10. MFA quando exigido;
11. RLS;
12. grant de coluna, view ou função.

### 20.2 Catálogo de capacidades

O banco deverá possuir definições estáveis e relacionamentos com perfis.

Exemplos:

- `rh.core.read`;
- `rh.core.manage`;
- `rh.admission.approve`;
- `rh.contract.apply`;
- `rh.time.adjust`;
- `rh.time.close`;
- `rh.leave.approve`;
- `rh.medical.view_restricted`;
- `rh.medical.record`;
- `rh.aso.issue`;
- `rh.sst.investigate`;
- `rh.payroll.calculate`;
- `rh.payroll.adjust`;
- `rh.payroll.approve`;
- `rh.payroll.close`;
- `rh.compliance.transmit`;
- `rh.termination.approve`;
- `rh.analytics.export`;
- `rh.analytics.view_sensitive`.

### 20.3 Separação de funções

Exemplos:

- calculador da folha não aprova sozinho;
- aprovador não altera a execução aprovada;
- emissor de ASO exige papel médico autorizado;
- investigador não altera evidência original;
- transmissor externo não altera o fato canônico;
- criador de modelo não aprova sozinho modelo de alto risco.

---

## 21. RLS

Toda tabela de negócio multi-tenant deverá:

- habilitar RLS;
- negar por padrão;
- possuir policies separadas por operação quando necessário;
- validar organização ativa;
- aplicar escopo de obra, empresa ou recurso quando aplicável;
- evitar policy excessivamente complexa e não indexada;
- ser testada com usuários de organizações diferentes;
- ter diagnóstico para policy permissiva sobreposta;
- considerar `FORCE ROW LEVEL SECURITY` quando apropriado.

FK e constraints serão analisadas quanto a canais laterais de existência.

---

## 22. Dados clínicos

O domínio clínico será dividido em:

- caso de exame;
- agenda e execução;
- registro clínico restrito;
- decisão médica;
- ASO;
- aptidão e restrições operacionais.

Somente aptidão e restrição mínima necessária serão expostas ao gestor.

Diagnóstico, anamnese, exames complementares e prontuário não entrarão em:

- páginas gerais de RH;
- analytics comum;
- logs;
- eventos de domínio amplos;
- exportação padrão;
- busca global.

---

## 23. Dados judiciais e financeiros

- pensão e ordem judicial terão acesso segregado;
- conta bancária será mascarada em leituras comuns;
- arquivo bancário terá bucket, chave e retenção próprios;
- valores de folha exigirão capacidade específica;
- payload judicial integral não será incluído em eventos;
- documentos terão legal hold quando aplicável;
- exportações financeiras serão auditadas.

---

## 24. Storage

Buckets indicativos:

- documentos de admissão;
- contratos e termos;
- benefícios;
- SST operacional;
- documentos clínicos restritos;
- folha e demonstrativos;
- obrigações e recibos;
- rescisões;
- exports analíticos temporários.

A decisão poderá consolidar buckets quando as políticas forem equivalentes.

Objetos terão:

- path por organização e recurso;
- SHA-256;
- MIME validado;
- tamanho;
- versão;
- classificação;
- status de antivírus;
- retenção;
- legal hold;
- metadados no banco.

---

## 25. APIs e webhooks

### 25.1 Entrada

Webhook deverá validar:

- método;
- assinatura;
- timestamp;
- replay;
- tamanho;
- content-type;
- origem;
- idempotência;
- ambiente;
- schema de payload.

### 25.2 Saída

Adapter deverá possuir:

- timeout;
- retry classificado;
- circuit breaker ou suspensão controlada;
- telemetria;
- idempotência;
- correlação;
- redaction;
- reconciliação posterior.

### 25.3 Resposta incerta

Timeout após envio será estado `UNKNOWN` ou equivalente, exigindo consulta/reconciliação antes de reenvio cego.

---

## 26. Motor de folha

Arquitetura inicial:

```text
fatos e snapshots
  → grafo de rubricas
    → avaliação declarativa
      → linhas e bases
        → validações
          → execução imutável
```

Requisitos técnicos:

- linguagem declarativa limitada;
- parser e AST próprios ou biblioteca restrita validada;
- sem `eval`;
- sem JavaScript livre;
- grafo acíclico;
- tipos numéricos definidos;
- precisão decimal;
- arredondamento explícito;
- sandbox lógico;
- limites de execução;
- memória de cálculo;
- testes de regressão por cenário;
- snapshots de parâmetros;
- cálculo sombra antes de produção.

---

## 27. Analytics

A primeira onda analítica deverá usar projeções controladas no PostgreSQL.

Não será criado data warehouse externo antes de medir:

- volume;
- concorrência;
- latência;
- custo;
- necessidade de retenção histórica;
- impacto no OLTP.

Particionamento, materialized views e eventual armazenamento analítico externo serão decisões baseadas em evidência.

---

## 28. Migrations

### 28.1 Regras

- uma responsabilidade lógica por migration quando possível;
- sem reescrever migration aplicada;
- timestamp único;
- nome estável;
- transação quando compatível;
- locks analisados;
- grants e RLS na mesma onda do objeto;
- índices em FKs;
- comentários para objetos críticos;
- teste SQL correspondente;
- ledger atualizado.

### 28.2 Expandir e contrair

```text
expand
  → dual read/write quando necessário
    → backfill
      → reconciliar
        → cutover
          → bloquear legado
            → contract posterior
```

Nenhuma remoção ocorrerá na mesma onda que introduz o substituto sem justificativa forte.

---

## 29. Backfill e migração de dados existentes

### 29.1 Pessoas existentes

Será necessário identificar possíveis origens em:

- usuários;
- clientes que também sejam trabalhadores;
- equipes de obra;
- responsáveis de tarefas;
- fornecedores pessoa física;
- signatários;
- contatos.

Não haverá fusão automática apenas por nome.

### 29.2 Equipes

`equipes` continuará operacional durante transição.

Estratégia possível:

1. criar trabalhador e vínculo canônicos;
2. criar referência opcional de integrante de equipe para vínculo;
3. backfill de correspondências de alta confiança;
4. fila de revisão para ambiguidades;
5. mudar leituras gradualmente;
6. preservar terceiros e recursos sem vínculo empregatício;
7. remover duplicidade somente após reconciliação.

### 29.3 Centros de custo e obras

O RH deverá referenciar o catálogo financeiro canônico e obras existentes, sem criar tabelas paralelas de centro de custo.

---

## 30. Reconciliação

Cada backfill ou cutover terá consultas de controle:

- contagem por organização;
- registros sem vínculo;
- duplicidades;
- FKs ausentes;
- intervalos sobrepostos;
- diferenças de saldo;
- diferença de valor;
- diferença de estado;
- itens órfãos;
- hashes;
- amostra manual.

Resultado será versionado em relatório de homologação.

---

## 31. Rollback

Rollback será definido por mudança:

- feature flag;
- retorno de leitura ao legado;
- interrupção de worker;
- revogação de grant;
- migration corretiva;
- restauração de snapshot;
- reversão de evento ou movimento;
- replay de projeção;
- desativação de integração.

Rollback não significará apagar fatos válidos gerados durante a operação.

---

## 32. Feature flags

Flags poderão controlar:

- organização piloto;
- contexto;
- rota;
- integração;
- cálculo sombra;
- leitura nova;
- escrita dupla;
- exportação;
- modelo analítico.

Flag não substituirá autorização nem RLS.

---

## 33. Ambientes e dados

### Desenvolvimento

- fixtures sintéticas;
- sem segredos de produção;
- integrações mockadas.

### Homologação

- organização isolada;
- dados sintéticos representativos;
- produção restrita governamental quando disponível;
- certificados próprios de homologação;
- testes concorrentes.

### Produção

- rollout gradual;
- feature flags;
- monitoramento reforçado;
- rollback testado;
- operação assistida.

Dados reais somente serão mascarados ou sintetizados para ambientes inferiores conforme política aprovada.

---

## 34. Observabilidade

Eventos técnicos mínimos:

- comando recebido;
- autorização negada;
- validação falhou;
- conflito de versão;
- RPC falhou;
- job reivindicado;
- retry agendado;
- dead letter;
- integração indisponível;
- reconciliação divergente;
- exportação sensível;
- acesso clínico;
- fechamento iniciado e concluído;
- reabertura;
- backfill checkpoint;
- cutover.

Logs usarão códigos e IDs; não payloads sensíveis.

---

## 35. SLOs iniciais

SLOs deverão ser definidos antes de produção para:

- disponibilidade do portal interno;
- latência de consultas principais;
- duração de cálculo de folha;
- idade máxima de jobs;
- tempo de processamento externo;
- freshness de analytics;
- recuperação de falha;
- restauração de backup;
- resolução de incidentes críticos.

Os valores não serão inventados nesta especificação; serão medidos em piloto.

---

## 36. Testes

### 36.1 Unitários

- regras puras;
- fórmulas;
- estados;
- temporalidade;
- mapeamentos;
- schemas.

### 36.2 Banco

- constraints;
- RLS;
- grants;
- RPCs;
- locks;
- idempotência;
- transições;
- razões;
- rollback por transação.

### 36.3 Integração

- Server Actions;
- Route Handlers;
- Storage;
- workers;
- adapters;
- callbacks;
- observabilidade.

### 36.4 E2E

- admissão;
- alteração contratual;
- fechamento de ponto;
- férias e retorno;
- ASO e habilitação;
- cálculo e fechamento de folha;
- transmissão e reconciliação;
- desligamento;
- analytics com supressão.

### 36.5 Segurança

- acesso entre tenants;
- privilege escalation;
- service role no browser;
- IDOR;
- mass assignment;
- webhook replay;
- exportação indevida;
- inferência de grupo pequeno;
- dados clínicos em logs;
- SQL e fórmula maliciosa.

---

## 37. Validadores a criar

- `validate:rh-module-registry`;
- `validate:rh-capabilities`;
- `validate:rh-migrations`;
- `validate:rh-rls`;
- `validate:rh-sensitive-data`;
- `validate:rh-events`;
- `validate:rh-jobs`;
- `validate:rh-formulas`;
- `validate:rh-external-mappings`;
- `validate:rh-docs-index`;
- `test:db:rh-core`;
- `test:db:rh-security`;
- `test:db:rh-concurrency`;
- `test:e2e:rh-critical`.

Os nomes finais deverão seguir as convenções do repositório.

---

## 38. Gates de implementação

### Gate 0 — Baseline confiável

- CI estrutural da base verde;
- divergência de vacinas resolvida fora do escopo do RH;
- branch atualizada com a base;
- inventário técnico confirmado.

### Gate 1 — Fundação aprovada

- modelo físico da Onda 1;
- capacidades;
- matriz RLS;
- contratos de API;
- testes e rollback.

### Gate 2 — Dados reconciliados

- backfill em dry-run;
- ambiguidades inventariadas;
- reconciliação aprovada;
- nenhuma perda de referência.

### Gate 3 — Piloto interno

- organização piloto;
- operação sem integração externa destrutiva;
- observabilidade;
- suporte;
- treinamento.

### Gate 4 — Cálculo sombra

- ponto, férias e folha comparados com processo atual;
- diferenças explicadas;
- nenhum pagamento gerado automaticamente.

### Gate 5 — Produção restrita

- integrações em ambiente oficial de teste quando disponível;
- certificados;
- contingência;
- reconciliação.

### Gate 6 — Produção gradual

- aprovação executiva;
- DPO, jurídico, SST e contabilidade quando aplicável;
- backup e restore testados;
- rollback;
- operação assistida.

---

## 39. Roadmap por ondas

### Onda 0 — Fundação técnica

- inventário;
- registry;
- capacidades;
- schemas;
- eventos;
- outbox;
- jobs;
- fixtures;
- validadores.

### Onda 1 — Cadastro e estrutura

- módulos 01 e 02;
- migração de integrantes de equipe de alta confiança;
- integração com obras e centros de custo.

### Onda 2 — Admissão e contratos

- módulos 03 e 04;
- documentos;
- ativação;
- versões contratuais.

### Onda 3 — Jornada e ausências

- módulos 05 e 06;
- marcação append-only;
- fechamento;
- férias;
- afastamentos.

### Onda 4 — Benefícios e SST

- módulos 07 e 08;
- dados sensíveis;
- EPI;
- exames;
- habilitações.

### Onda 5 — Folha sombra

- módulo 09;
- rubricas;
- parâmetros;
- cálculo comparativo;
- memória.

### Onda 6 — Obrigações digitais

- módulo 10;
- adapters;
- filas;
- ambiente restrito;
- reconciliação.

### Onda 7 — Folha oficial controlada

- aprovação;
- fechamento;
- pagamento;
- contabilização;
- contingência.

### Onda 8 — Desligamentos

- módulo 11;
- rescisão;
- FGTS;
- offboarding;
- reintegração.

### Onda 9 — Analytics

- módulo 12;
- métricas;
- qualidade;
- dashboards;
- planejamento;
- sem modelos de alto risco inicialmente.

### Onda 10 — Estabilização

- performance;
- retenção;
- particionamento quando comprovado;
- DR;
- pentest;
- documentação operacional.

---

## 40. Requisitos técnicos

### Fundação e modularidade

- **RT-001:** registrar módulo RH no registry com chave estável.
- **RT-002:** definir dependências sem conceder acesso implícito.
- **RT-003:** criar estrutura `lib/rh` por bounded context.
- **RT-004:** proibir importação cíclica entre contextos.
- **RT-005:** declarar ownership de cada tabela.
- **RT-006:** declarar contratos de leitura cruzada.
- **RT-007:** usar TypeScript estrito.
- **RT-008:** usar schemas Zod em entradas externas e comandos.
- **RT-009:** sanitizar erros públicos.
- **RT-010:** preservar `correlation_id` ponta a ponta.

### Banco e temporalidade

- **RT-011:** usar UUID em entidades internas.
- **RT-012:** usar timestamps UTC.
- **RT-013:** incluir `organization_id` em dados multi-tenant.
- **RT-014:** indexar FKs e filtros de RLS.
- **RT-015:** modelar vigência separada de registro.
- **RT-016:** impedir sobreposição quando a regra exigir exclusividade.
- **RT-017:** preservar versões históricas.
- **RT-018:** implementar razões append-only para saldos críticos.
- **RT-019:** usar movimento compensatório em correções financeiras ou de saldo.
- **RT-020:** impedir delete físico comum em fatos auditáveis.

### Comandos e transações

- **RT-021:** autenticar toda mutação.
- **RT-022:** validar organização ativa.
- **RT-023:** validar capacidade de domínio.
- **RT-024:** validar payload no servidor.
- **RT-025:** usar RPC para mutação multi-tabela crítica.
- **RT-026:** validar autorização dentro de RPC privilegiada.
- **RT-027:** definir `search_path` em `SECURITY DEFINER`.
- **RT-028:** revogar execução de `anon` em RPC operacional.
- **RT-029:** suportar `expected_version` quando aplicável.
- **RT-030:** retornar conflito explícito em concorrência.

### Eventos, jobs e integrações

- **RT-031:** gravar outbox na mesma transação do fato.
- **RT-032:** versionar evento de domínio.
- **RT-033:** manter payload mínimo e classificado.
- **RT-034:** tornar consumidor idempotente.
- **RT-035:** implementar lease de job.
- **RT-036:** registrar tentativas append-only.
- **RT-037:** suportar retry classificado.
- **RT-038:** suportar dead letter.
- **RT-039:** tratar timeout externo como resultado incerto quando necessário.
- **RT-040:** reconciliar antes de reenvio cego.

### Segurança

- **RT-041:** habilitar RLS em tabela de negócio multi-tenant.
- **RT-042:** aplicar default deny.
- **RT-043:** configurar grants explicitamente.
- **RT-044:** testar isolamento entre organizações.
- **RT-045:** separar cliente de sessão e cliente privilegiado.
- **RT-046:** impedir chave privilegiada no browser.
- **RT-047:** não registrar segredo em log.
- **RT-048:** classificar dados.
- **RT-049:** auditar acesso clínico, judicial e exportação sensível.
- **RT-050:** aplicar MFA e segregação em ações de alto risco quando definido.

### Storage

- **RT-051:** usar bucket privado.
- **RT-052:** usar path com organização e recurso.
- **RT-053:** validar MIME e tamanho.
- **RT-054:** calcular hash.
- **RT-055:** registrar metadados no banco.
- **RT-056:** impedir objeto órfão sempre que possível.
- **RT-057:** aplicar retenção e legal hold.
- **RT-058:** usar URL assinada curta ou rota autenticada.
- **RT-059:** isolar documentos clínicos.
- **RT-060:** registrar estado de varredura antimalware.

### Folha e cálculo

- **RT-061:** usar expressão declarativa restrita.
- **RT-062:** proibir `eval` e código arbitrário.
- **RT-063:** detectar ciclo de rubrica.
- **RT-064:** usar decimal com precisão definida.
- **RT-065:** persistir arredondamento.
- **RT-066:** congelar parâmetros e fatos.
- **RT-067:** produzir execução imutável.
- **RT-068:** produzir memória por linha.
- **RT-069:** suportar cálculo sombra.
- **RT-070:** testar regressão com casos dourados.

### APIs externas

- **RT-071:** usar adapter por sistema externo.
- **RT-072:** versionar mapeamento.
- **RT-073:** separar payload interno e externo.
- **RT-074:** validar assinatura de webhook.
- **RT-075:** proteger contra replay.
- **RT-076:** aplicar limite de tamanho.
- **RT-077:** registrar ambiente.
- **RT-078:** preservar resposta bruta em zona protegida quando necessária.
- **RT-079:** normalizar retorno.
- **RT-080:** reconciliar recibo, totalizador, guia e pagamento separadamente.

### Analytics

- **RT-081:** manter métricas fora do código de widget.
- **RT-082:** versionar definição e execução.
- **RT-083:** manter lineage.
- **RT-084:** registrar freshness.
- **RT-085:** bloquear publicação por qualidade impeditiva.
- **RT-086:** aplicar política de supressão.
- **RT-087:** separar visualização e exportação.
- **RT-088:** reconstruir projeção.
- **RT-089:** impedir escrita de usuário em projeção.
- **RT-090:** evitar data warehouse externo sem evidência de necessidade.

### Migrations e entrega

- **RT-091:** criar migration append-only.
- **RT-092:** validar ledger.
- **RT-093:** criar teste SQL correspondente.
- **RT-094:** analisar lock de DDL.
- **RT-095:** usar expand/contract.
- **RT-096:** criar backfill idempotente.
- **RT-097:** suportar dry-run e checkpoint.
- **RT-098:** produzir reconciliação antes do cutover.
- **RT-099:** definir rollback operacional.
- **RT-100:** usar feature flag no rollout.

### Qualidade e operação

- **RT-101:** criar fixture sintética por cenário.
- **RT-102:** testar RLS por perfil.
- **RT-103:** testar concorrência crítica.
- **RT-104:** testar idempotência.
- **RT-105:** testar migration replay.
- **RT-106:** testar E2E de jornadas críticas.
- **RT-107:** monitorar filas e retries.
- **RT-108:** monitorar freshness.
- **RT-109:** executar backup/restore drill.
- **RT-110:** criar runbook de incidente.

### Governança

- **RT-111:** manter mapa de ownership.
- **RT-112:** manter catálogo de capacidades.
- **RT-113:** manter catálogo de eventos.
- **RT-114:** manter catálogo de jobs.
- **RT-115:** manter catálogo de integrações e versões.
- **RT-116:** manter inventário de dados sensíveis.
- **RT-117:** manter matriz de retenção.
- **RT-118:** manter decisões arquiteturais.
- **RT-119:** atualizar documentação após cada onda.
- **RT-120:** não declarar implementação concluída sem evidência executável.

---

## 41. Regras técnicas

- **RNT-001:** o Projeto RH permanecerá no monólito modular nesta fase.
- **RNT-002:** microserviço exigirá evidência de escala, isolamento ou operação.
- **RNT-003:** contexto não gravará tabela de outro contexto diretamente.
- **RNT-004:** mutação cruzada usará contrato explícito.
- **RNT-005:** auditoria não será barramento de eventos.
- **RNT-006:** outbox não será fonte canônica.
- **RNT-007:** projeção não aceitará mutação de negócio.
- **RNT-008:** Server Action não será barreira de segurança isolada.
- **RNT-009:** Route Handler será usado quando houver contrato HTTP explícito.
- **RNT-010:** UI não protegerá invariantes sozinha.
- **RNT-011:** operação crítica multi-tabela será transacional.
- **RNT-012:** RPC privilegiada validará autorização internamente.
- **RNT-013:** função privilegiada usará privilégio mínimo.
- **RNT-014:** Service Role não será usada em fluxo comum quando RLS for suficiente.
- **RNT-015:** segredo não será persistido em tabela de negócio.
- **RNT-016:** erro público não exibirá SQL, stack ou segredo.
- **RNT-017:** política sem índice será revista antes de produção.
- **RNT-018:** ausência de policy significará negação.
- **RNT-019:** owner ou `BYPASSRLS` não representará usuário comum.
- **RNT-020:** dados de organizações diferentes nunca compartilharão consulta sem autorização explícita.
- **RNT-021:** prontuário não será exposto pela Data API comum.
- **RNT-022:** gestor não verá diagnóstico.
- **RNT-023:** evento não conterá prontuário.
- **RNT-024:** log não conterá CPF integral, conta completa ou dado clínico.
- **RNT-025:** exportação sensível exigirá capacidade própria.
- **RNT-026:** bucket privado não dispensará autorização de metadados.
- **RNT-027:** objeto de Storage não será registro canônico único.
- **RNT-028:** upload sem metadado confirmado será limpo ou reconciliado.
- **RNT-029:** arquivo rejeitado não será liberado.
- **RNT-030:** legal hold prevalecerá sobre retenção automática.
- **RNT-031:** fato e evento de outbox serão confirmados juntos.
- **RNT-032:** entrega externa será considerada pelo menos uma vez.
- **RNT-033:** consumidor será idempotente.
- **RNT-034:** mesma chave com payload diferente será conflito.
- **RNT-035:** retry não criará nova obrigação.
- **RNT-036:** dead letter exigirá ação auditada.
- **RNT-037:** timeout após envio não será rejeição automática.
- **RNT-038:** recibo externo não atualizará fato canônico silenciosamente.
- **RNT-039:** reconciliação produzirá diferença explícita.
- **RNT-040:** mapeamento externo terá vigência.
- **RNT-041:** versão histórica não será alterada por regra futura.
- **RNT-042:** intervalos exclusivos não se sobreporão.
- **RNT-043:** correção preservará conhecimento anterior.
- **RNT-044:** saldo derivará de movimentos válidos.
- **RNT-045:** reversão não apagará movimento original.
- **RNT-046:** cálculo aprovado será imutável.
- **RNT-047:** recálculo gerará nova execução.
- **RNT-048:** fórmula não executará código arbitrário.
- **RNT-049:** precisão e arredondamento serão persistidos.
- **RNT-050:** cálculo sombra não gerará pagamento.
- **RNT-051:** migration aplicada não será reescrita.
- **RNT-052:** backfill será retomável.
- **RNT-053:** backfill não inventará autoria humana.
- **RNT-054:** ambiguidade de identidade irá para revisão.
- **RNT-055:** nome igual não será fusão automática.
- **RNT-056:** terceiro não será convertido em empregado automaticamente.
- **RNT-057:** centro de custo não será duplicado no RH.
- **RNT-058:** feature flag não substituirá RLS.
- **RNT-059:** rollback não apagará fatos válidos.
- **RNT-060:** mudança destrutiva virá após período de coexistência.
- **RNT-061:** teste SQL terminará com rollback quando aplicável.
- **RNT-062:** fixture não usará dado pessoal real.
- **RNT-063:** E2E concorrente usará organização isolada.
- **RNT-064:** CI bloqueará migration divergente.
- **RNT-065:** CI bloqueará capability desconhecida.
- **RNT-066:** CI bloqueará RPC operacional para `anon`.
- **RNT-067:** CI verificará FK sem índice.
- **RNT-068:** CI verificará objeto sensível exposto.
- **RNT-069:** CI verificará documento fora do índice.
- **RNT-070:** build verde não substituirá homologação funcional.
- **RNT-071:** SLO será medido antes de ser fixado.
- **RNT-072:** observabilidade não registrará payload desnecessário.
- **RNT-073:** correlação atravessará job e integração.
- **RNT-074:** health check não executará mutação destrutiva.
- **RNT-075:** alerta técnico não será fato trabalhista.
- **RNT-076:** data warehouse externo dependerá de análise de carga.
- **RNT-077:** materialized view terá estratégia de refresh.
- **RNT-078:** particionamento dependerá de volume comprovado.
- **RNT-079:** modelo analítico não será implementado antes da governança.
- **RNT-080:** produção somente ocorrerá após todos os gates aplicáveis.

---

## 42. Critérios de aceite técnico

- **CAT-001:** o módulo RH aparece no registry sem liberar acesso automático.
- **CAT-002:** usuário sem módulo é redirecionado para acesso negado.
- **CAT-003:** capability de domínio desconhecida falha de forma segura.
- **CAT-004:** acesso entre organizações retorna zero dados ou negação.
- **CAT-005:** RPC privilegiada não é executável por `anon`.
- **CAT-006:** Service Role não aparece em bundle ou log.
- **CAT-007:** tabela de negócio possui RLS e policies testadas.
- **CAT-008:** FK usada por RLS possui índice apropriado.
- **CAT-009:** duas ativações concorrentes produzem um único vínculo.
- **CAT-010:** mesma idempotency key com mesmo payload retorna resultado anterior.
- **CAT-011:** mesma chave com payload diferente retorna conflito.
- **CAT-012:** versão esperada divergente impede sobrescrita.
- **CAT-013:** alteração temporal sobreposta é rejeitada.
- **CAT-014:** correção cria nova versão e preserva anterior.
- **CAT-015:** movimento compensatório preserva movimento original.
- **CAT-016:** comando multi-tabela falha atomicamente.
- **CAT-017:** fato e outbox aparecem na mesma confirmação.
- **CAT-018:** dois workers não processam o mesmo lease simultaneamente.
- **CAT-019:** job expirado pode ser reivindicado com segurança.
- **CAT-020:** dead letter preserva tentativas.
- **CAT-021:** webhook repetido não duplica fato.
- **CAT-022:** assinatura inválida é rejeitada antes do processamento.
- **CAT-023:** replay fora da janela é rejeitado.
- **CAT-024:** timeout externo gera estado incerto e reconciliação.
- **CAT-025:** payload externo não altera diretamente entidade canônica.
- **CAT-026:** prontuário não é retornado por consulta geral.
- **CAT-027:** gestor vê apenas aptidão e restrição mínima.
- **CAT-028:** acesso clínico aparece na auditoria.
- **CAT-029:** dado clínico não aparece em log.
- **CAT-030:** exportação financeira exige capability específica.
- **CAT-031:** arquivo privado não é acessível por URL pública permanente.
- **CAT-032:** upload inválido não fica disponível.
- **CAT-033:** documento possui hash e metadados.
- **CAT-034:** legal hold impede purge.
- **CAT-035:** fórmula com código arbitrário é rejeitada.
- **CAT-036:** ciclo de rubricas é detectado antes do cálculo.
- **CAT-037:** execução de folha preserva snapshots e memória.
- **CAT-038:** cálculo sombra não cria pagamento ou evento oficial.
- **CAT-039:** migration aplicada permanece inalterada.
- **CAT-040:** replay de migrations cria schema equivalente.
- **CAT-041:** backfill em dry-run não modifica dados.
- **CAT-042:** backfill retomado não duplica registros.
- **CAT-043:** ambiguidade de pessoa é enviada para revisão.
- **CAT-044:** terceiro permanece distinto de vínculo empregatício.
- **CAT-045:** reconciliação demonstra contagens antes e depois.
- **CAT-046:** cutover pode retornar leitura ao legado por flag.
- **CAT-047:** projeção analítica pode ser reconstruída.
- **CAT-048:** projeção informa freshness.
- **CAT-049:** usuário não grava diretamente em projeção.
- **CAT-050:** CI executa validadores, lint, tipos, testes e build.
- **CAT-051:** E2E crítico usa dados sintéticos e organização isolada.
- **CAT-052:** backup e restore reproduzem dados críticos.
- **CAT-053:** runbook identifica responsáveis e rollback.
- **CAT-054:** PR não declara produção sem evidências de homologação.
- **CAT-055:** aprovação desta especificação não cria migration ou código produtivo.

---

## 43. Evidências exigidas por onda

- ADRs atualizadas;
- diagramas de contexto e dados;
- migrations e ledger;
- testes SQL;
- matriz RLS;
- matriz de capacidades;
- resultados de concorrência;
- relatório de reconciliação;
- relatório de segurança;
- relatório de homologação;
- screenshots ou evidências E2E;
- plano de rollback;
- runbook;
- aceite funcional.

---

## 44. Estado honesto

Este documento não implementa:

- registry do RH;
- rotas;
- componentes;
- tabelas;
- schemas privados;
- RLS;
- RPCs;
- outbox;
- fila de jobs;
- workers;
- motor de folha;
- adapters externos;
- migrations;
- backfills;
- dashboards;
- feature flags;
- CI adicional.

A branch permanece documental.

---

## 45. Próximo bloco lógico

**Módulo 14 — Backlog Executável, Épicos, Sprints, Dependências, Gates e Plano de Homologação.**

O Módulo 14 deverá converter as ondas técnicas em tarefas ordenadas, com Definition of Ready, Definition of Done, testes, evidências, dependências e critérios de bloqueio.

---

## 46. Conclusão

O Projeto RH será implementado sobre a arquitetura real da Innovar Platform, preservando o monólito modular, as transações PostgreSQL, o modelo de autorização, migrations append-only e a recuperação por repositório. A complexidade será introduzida apenas onde os riscos funcionais exigem: temporalidade, imutabilidade, dados sensíveis, integrações, jobs, idempotência e reconciliação.
