# Projeto RH — Módulo 18 — Estratégia de Qualidade, Testes, Observabilidade, Segurança Operacional e Evidências

**Versão:** 0.1.0  
**Estado:** especificação de qualidade concluída; execução pendente  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**ADR vinculante:** `PROJETO-RH-ADR-018-EVIDENCIA-RISCO-OBSERVABILIDADE-E-LIBERACAO.md`  
**Anexo vinculante:** `PROJETO-RH-MODULO-18-ANEXO-A-MATRIZ-DE-TESTES-E-EVIDENCIAS.md`

---

## 1. Finalidade

Este módulo define como o Projeto RH demonstrará, de forma reproduzível, que uma alteração:

- atende ao requisito;
- preserva invariantes;
- respeita autorização e isolamento multi-tenant;
- calcula corretamente;
- suporta falhas e concorrência;
- protege dados pessoais e sensíveis;
- pode ser observada e operada;
- pode ser migrada, revertida ou reconciliada;
- e possui evidência suficiente para avançar de gate.

Este documento não executa testes, não altera o CI e não declara prontidão produtiva.

---

## 2. Estado atual da plataforma

O repositório já possui uma base relevante de qualidade:

- Vitest em ambiente Node;
- cobertura com reporters `text` e `json-summary`;
- Playwright;
- lint com zero warnings;
- typecheck sem emissão;
- build Next.js;
- testes Python;
- testes SQL e scripts de banco;
- replay de migrations;
- validadores de documentação, migrations, menus, módulos, server actions e etapas;
- E2E concorrente;
- QA visual em três viewports e dois temas;
- coleta de console, page errors e request failures;
- teste de alvos mínimos e overflow horizontal;
- observabilidade com eventos, alertas, health checks e diagnósticos;
- drill de backup e restauração;
- artifacts de CI.

A base será reutilizada, mas não contém testes do RH.

### 2.1 Gaps identificados

1. não existem thresholds de cobertura obrigatórios no Vitest;
2. o CI usa `pnpm install --no-frozen-lockfile`;
3. artifacts estruturais possuem retenção curta de sete dias;
4. a telemetria existente não possui fontes do RH;
5. não existe matriz ASVS específica do RH;
6. não existe catálogo de SLIs/SLOs do RH;
7. não existe dataset dourado de folha, ponto, férias ou rescisão;
8. não existe teste de carga representativo do fechamento de folha;
9. não existe pentest do RH;
10. não existe evidence store próprio para gates críticos.

Esses gaps são backlog; não serão corrigidos por alterações documentais silenciosas.

---

## 3. Modelo operacional de qualidade

```text
Requisito
  → risco
    → critério de aceite
      → teste ou análise
        → execução
          → artifact
            → evidência
              → revisão
                → gate
                  → monitoramento
```

### 3.1 Estados da evidência

```text
PLANNED
  → IMPLEMENTED
    → EXECUTED
      → COLLECTED
        → VERIFIED
          → ACCEPTED
```

Estados alternativos:

```text
FAILED
INCONCLUSIVE
EXPIRED
INVALIDATED
WAIVED
REJECTED
```

`WAIVED` exigirá responsável, justificativa, risco residual, prazo e condição de encerramento.

---

## 4. Estratégia por risco

### Q0 — documental ou visual sem efeito de negócio

Evidência típica:

- validação documental;
- lint quando aplicável;
- inspeção visual;
- acessibilidade básica;
- revisão por pares.

### Q1 — operação comum reversível

Além de Q0:

- unit tests;
- testes de consulta;
- validação de entrada;
- autorização;
- E2E principal;
- erro e estado vazio.

### Q2 — regra de negócio relevante

Além de Q1:

- invariantes de banco;
- RPC transacional;
- concorrência;
- idempotência;
- temporalidade;
- auditoria;
- rollback lógico.

### Q3 — dado sensível, cálculo ou integração

Além de Q2:

- matriz de privacidade;
- testes RLS negativos;
- datasets dourados;
- contracts e adapters;
- retry e estado incerto;
- redaction;
- análise ASVS;
- revisão independente.

### Q4 — efeito legal, financeiro ou difícil de reverter

Além de Q3:

- cálculo sombra;
- reconciliação;
- homologação funcional formal;
- carga e resiliência;
- recuperação;
- pentest ou revisão de segurança definida;
- piloto restrito;
- Go/No-Go;
- operação assistida.

---

## 5. Pirâmide de verificação

### 5.1 Camada 0 — estática e estrutural

Inclui:

- lint;
- typecheck;
- build;
- validação de exports de Server Actions;
- validação de menus e module keys;
- validação de migrations e ledger;
- validação de documentação e inventário;
- análise de dependências proibidas;
- verificação de contratos e schemas.

### 5.2 Camada 1 — unidade e propriedades

Usada para:

- regras puras;
- fórmulas;
- calendários;
- datas e competências;
- arredondamentos;
- matrizes de sobreposição;
- state machines;
- serialização e sanitização.

Testes baseados em propriedades serão priorizados quando houver grandes espaços de combinação.

### 5.3 Camada 2 — banco, constraints, RLS e RPCs

Testará:

- FKs compostas por tenant;
- exclusões e sobreposições;
- append-only;
- estados permitidos;
- autorização interna da RPC;
- `search_path`;
- atomicidade;
- locks;
- `expected_version`;
- idempotência;
- auditoria e outbox na mesma transação.

Testes SQL deverão usar organizações e identidades artificiais e terminar com `ROLLBACK` quando possível.

### 5.4 Camada 3 — contratos

Abrange:

- schemas Zod;
- tipos TypeScript;
- RPC signatures;
- envelopes de comando, consulta, evento e job;
- compatibility tests;
- consumer-driven contracts quando aplicável;
- payload minimization;
- versionamento de evento;
- taxonomia de erros.

### 5.5 Camada 4 — integração

Abrange:

- outbox e inbox;
- adapters externos;
- webhooks;
- Storage;
- assinatura;
- bancos;
- benefícios;
- clínicas;
- sistemas governamentais;
- Financeiro, Obras e Estoque.

Providers reais serão substituídos por simuladores controlados em testes automatizados. Produção restrita será usada quando a autoridade externa oferecer ambiente oficial.

### 5.6 Camada 5 — E2E

Cobrirá jornadas críticas de ponta a ponta, sem depender exclusivamente de seletores frágeis.

Exemplos:

- admitir e ativar vínculo;
- alterar contrato;
- tratar e fechar ponto;
- conceder férias;
- emitir ASO;
- calcular e aprovar folha sombra;
- transmitir e reconciliar evento;
- desligar e concluir offboarding.

### 5.7 Camada 6 — UX, visual e acessibilidade

Usará o harness existente e ampliará:

- 390×844;
- 1366×768;
- 1920×1080;
- temas claro e escuro;
- console e page errors;
- overflow;
- alvos de toque;
- foco;
- teclado;
- labels;
- contraste;
- reflow;
- leitor de tela em fluxos críticos.

Visual regression não substituirá avaliação semântica e de tarefa.

### 5.8 Camada 7 — desempenho, concorrência e resiliência

Testará:

- fechamento concorrente;
- cálculo em lote;
- lock contention;
- lease de jobs;
- retries;
- duplicate delivery;
- indisponibilidade externa;
- timeout após envio;
- degradação de analytics;
- reprocessamento controlado;
- limites de exportação.

### 5.9 Camada 8 — segurança e privacidade

Abrange:

- ASVS versionado;
- OWASP Top 10 e API Top 10;
- RLS negativa;
- BOLA/BFLA;
- mass assignment;
- open redirect;
- SSRF;
- upload malicioso;
- path traversal;
- segredo em log;
- exposição excessiva;
- rate limiting;
- abuso de fluxo sensível;
- sessão e reautenticação;
- exportação e impressão;
- break-glass.

### 5.10 Camada 9 — migration, recuperação e cutover

Abrange:

- replay do zero;
- upgrade de estado realista;
- expand/contract;
- backfill idempotente;
- checkpoint e retomada;
- reconciliação;
- rollback de onda;
- backup e restore;
- perda parcial de worker;
- verificação pós-restauração.

### 5.11 Camada 10 — sombra e produção assistida

Abrange:

- cálculo sombra;
- comparação com processo oficial;
- piloto por organização/empresa;
- telemetria de negócio e técnica;
- reconciliação diária;
- confirmação de SLO;
- rollback de feature flag;
- hypercare;
- encerramento de incidentes e diferenças.

---

## 6. Datasets e fixtures

### 6.1 Regras gerais

- não usar dados reais em CI;
- não usar CPF, conta, diagnóstico ou documento verdadeiro;
- gerar identificadores sintéticos válidos somente quando necessário;
- separar fixture de seed de demonstração;
- permitir execução repetida;
- possuir cleanup ou transação revertida;
- registrar versão do dataset;
- evitar dependência de relógio real sem controle.

### 6.2 Dataset dourado

Serão criados datasets dourados versionados para:

- jornada normal e especial;
- horas extras e banco;
- férias e abono;
- afastamentos;
- benefícios e descontos;
- folha mensal;
- décimo terceiro;
- folha complementar;
- rescisão;
- eventos e totalizadores externos.

Cada caso terá:

- premissas;
- versão de regra;
- entradas;
- memória esperada;
- resultado esperado;
- tolerância;
- aprovador funcional;
- histórico de alteração.

---

## 7. Cobertura

Não haverá um único percentual de cobertura para todo o RH.

Serão medidos:

- cobertura de requisitos;
- cobertura de invariantes;
- cobertura de transições;
- cobertura de capabilities;
- cobertura RLS positiva e negativa;
- cobertura de erros;
- cobertura de eventos;
- cobertura de migrations;
- cobertura de navegadores e viewports;
- cobertura de riscos ASVS;
- cobertura de runbooks.

Thresholds de linhas, branches e funções poderão existir por pacote, mas não substituirão a matriz comportamental.

---

## 8. Estratégia de cálculo

### 8.1 Determinismo

Mesmas entradas, versões e parâmetros deverão gerar:

- mesmo resultado;
- mesma memória;
- mesmo hash canônico;
- independentemente da ordem de processamento compatível.

### 8.2 Propriedades

Exemplos:

- soma das linhas deve reconciliar com total;
- reversão deve neutralizar o movimento original;
- repetição idempotente não deve duplicar efeito;
- saldo derivado deve corresponder aos movimentos;
- competência fechada não deve mudar sem reabertura;
- rateio não deve alterar o líquido;
- arredondamento deve seguir regra versionada;
- nenhuma rubrica deve depender de ciclo no grafo.

### 8.3 Comparação sombra

A comparação será feita por:

- trabalhador;
- vínculo;
- rubrica;
- base;
- incidência;
- encargo;
- líquido;
- centro de custo;
- total da competência.

Divergência não será reduzida a um único percentual global.

---

## 9. Testes de autorização e RLS

Toda tabela e RPC terá matriz por:

- papel;
- capability;
- organização;
- empresa;
- estabelecimento;
- obra;
- finalidade;
- sensibilidade;
- ownership do dado;
- estado do registro.

Casos negativos obrigatórios:

- tenant A tentando ler tenant B;
- usuário sem capability;
- escopo de obra incorreto;
- acesso clínico por gestor comum;
- acesso judicial sem finalidade;
- exportação sem permissão;
- Service Role sem validação de negócio;
- ID válido pertencente a outro tenant;
- campo sensível omitido em resposta comum;
- função `SECURITY DEFINER` chamada por `anon`.

---

## 10. Testes de contratos, eventos e jobs

### 10.1 Commands

Testarão:

- validação estrutural;
- escopo derivado da sessão;
- idempotency key;
- expected version;
- conflito de payload;
- resposta estável;
- erro público sanitizado.

### 10.2 Events

Testarão:

- nome no passado;
- versão;
- schema compatibility;
- minimização;
- correlação e causação;
- ausência de dado proibido;
- replay.

### 10.3 Jobs

Testarão:

- lease;
- heartbeat;
- retomada após expiração;
- backoff e jitter;
- limite de tentativas;
- dead letter;
- deduplicação;
- cancelamento;
- isolamento por ambiente;
- concorrência entre workers.

---

## 11. Observabilidade

### 11.1 Integração com a Etapa 19

O RH produzirá audit trails próprios e fontes normalizadas para o fluxo observável existente.

Fontes planejadas:

- `rh_core_events`;
- `rh_admission_events`;
- `rh_contract_events`;
- `rh_time_events`;
- `rh_leave_events`;
- `rh_benefit_events`;
- `rh_sst_events`;
- `rh_payroll_events`;
- `rh_compliance_events`;
- `rh_offboarding_events`;
- `rh_analytics_events`;
- `rh_ops` para jobs e integrações.

Esses nomes permanecem indicativos até a migration correspondente.

### 11.2 Contrato observável

Campos mínimos:

```text
organization_id
module_key
bounded_context
operation
result
severity
correlation_id
causation_id
request_id
actor_type
resource_type
resource_id
occurred_at
duration_ms
error_code
metadata_sanitized
```

### 11.3 Redaction

Não registrar em logs comuns:

- senha;
- token;
- cookie;
- Service Role;
- chave privada;
- certificado;
- conta bancária completa;
- CPF completo;
- diagnóstico;
- prontuário;
- payload governamental integral;
- documento em base64;
- conteúdo judicial integral.

### 11.4 Cardinalidade

Métricas não usarão dimensões de cardinalidade não controlada, como:

- CPF;
- nome;
- e-mail;
- ID de trabalhador;
- mensagem de erro livre;
- correlation ID.

Esses valores pertencem a logs ou traces protegidos, não a labels de métricas.

---

## 12. SLIs e SLOs

### 12.1 SLIs propostos

- taxa de sucesso de comandos;
- latência por operação;
- fila e idade de jobs;
- tempo até reconciliação;
- taxa de duplicidade evitada;
- divergência de cálculo sombra;
- percentual de projeções aceitas;
- atraso de read models;
- falhas de RLS ou autorização;
- tempo de geração de folha e arquivos;
- restauração verificada;
- disponibilidade do portal.

### 12.2 SLOs

Cada SLO terá:

- capacidade;
- população;
- janela;
- fórmula;
- fonte;
- exclusões justificadas;
- objetivo;
- orçamento de erro;
- responsável;
- ação ao exceder limite.

Valores numéricos serão definidos antes do piloto, não nesta especificação.

---

## 13. Alertas e runbooks

### 13.1 Severidade

```text
SEV0 — risco imediato de dano amplo ou irreversível
SEV1 — função crítica indisponível ou resultado potencialmente incorreto
SEV2 — degradação relevante com workaround
SEV3 — problema localizado ou preventivo
SEV4 — informação operacional
```

### 13.2 Alertas prioritários

- cálculo divergente além da tolerância;
- fechamento parcial;
- outbox parada;
- job em dead letter;
- retorno externo incerto envelhecido;
- certificado próximo do vencimento;
- falha de reconciliação;
- acesso sensível anômalo;
- tentativa cross-tenant;
- backup ou restore inválido;
- lag de projeção acima do limite;
- fila de pagamento não processada.

### 13.3 Runbook

Cada alerta crítico terá:

- significado;
- impacto;
- primeira verificação;
- consultas seguras;
- contenção;
- rollback ou feature flag;
- escalonamento;
- reconciliação;
- encerramento;
- evidência pós-incidente.

---

## 14. Segurança de aplicação

### 14.1 Baseline

A matriz de segurança usará identificadores versionados do ASVS 5.0.0. A aplicação não declarará certificação ou conformidade integral apenas por possuir a matriz.

### 14.2 Controles prioritários

- arquitetura segura;
- validação e encoding;
- identidade e sessão;
- controle de acesso;
- tokens;
- criptografia;
- comunicação segura;
- configuração;
- proteção de dados;
- uploads;
- APIs e webhooks;
- logging e error handling;
- concorrência e condições excepcionais.

### 14.3 API security

Casos obrigatórios incluirão:

- broken object level authorization;
- broken function level authorization;
- broken property level authorization;
- consumo irrestrito de recursos;
- abuso de fluxo sensível;
- SSRF;
- inventário de endpoints;
- consumo inseguro de APIs externas.

### 14.4 Supply chain

Antes do piloto:

- lockfile congelado;
- dependency audit;
- secret scan;
- SAST;
- inventário de actions;
- imagens pinadas por digest quando aplicável;
- SBOM para releases candidatas;
- política de vulnerabilidade;
- revisão de licenças.

---

## 15. Privacidade e testes

### 15.1 Dados de teste

Nenhum teste automatizado deverá depender de dado pessoal real.

### 15.2 Logs de teste

Artifacts não deverão armazenar segredos, documentos ou dumps integrais de banco.

### 15.3 Screenshots

Capturas de homologação usarão fixtures sintéticas e deverão ser revisadas antes de publicação ou retenção ampliada.

### 15.4 Testes de direitos

Serão testados:

- acesso próprio;
- correção;
- contestação;
- revisão de decisão automatizada;
- restrição de exportação;
- retenção e legal hold;
- minimização por perfil.

---

## 16. Performance e capacidade

Perfis de carga serão definidos para:

- número de trabalhadores por organização;
- empresas e estabelecimentos;
- marcações diárias;
- linhas de folha;
- eventos externos;
- documentos;
- jobs;
- consultas analíticas;
- exportações.

Testes deverão medir:

- p50, p95 e p99 quando aplicável;
- throughput;
- filas;
- locks;
- memória;
- tempo de banco;
- retries;
- erro;
- degradação.

Nenhuma meta numérica será inventada antes de existir capacidade esperada e ambiente representativo.

---

## 17. Resiliência e caos controlado

Cenários:

- banco temporariamente indisponível;
- provider lento;
- resposta perdida após envio;
- worker encerrado durante job;
- lock expirado;
- evento duplicado;
- payload fora de ordem;
- Storage indisponível;
- falha de geração de PDF;
- certificado inválido;
- fila acumulada;
- restore parcial.

Testes destrutivos serão executados somente em ambiente isolado e com plano de recuperação.

---

## 18. Backup, restore e disaster recovery

A plataforma já possui drill de backup e restauração. O RH adicionará verificações específicas:

- schemas `public`, `rh_private` e `rh_ops`;
- documentos e metadados;
- chaves e referências de Storage;
- outbox e inbox;
- execuções de folha;
- trilhas e evidências;
- restauração temporal;
- reconciliação pós-restore;
- rotação de credenciais após incidente;
- validação de RPO e RTO aprovados.

Backup concluído sem restore verificado não satisfará o gate.

---

## 19. CI e pipelines

### 19.1 Pipeline rápido

Em PR:

- documentação estrutural;
- lint;
- typecheck;
- unit tests;
- selected SQL tests;
- contract tests;
- build;
- secret scan;
- dependency checks proporcionais.

### 19.2 Pipeline ampliado

Em merge candidate ou agenda:

- replay de migrations;
- suite SQL completa;
- E2E;
- visual e acessibilidade;
- concorrência;
- adapters simulados;
- SAST/DAST aplicável;
- SBOM;
- package de evidências.

### 19.3 Pipeline de release

Antes de piloto/produção:

- restore drill;
- carga;
- segurança;
- cálculo sombra;
- reconciliação;
- Go/No-Go;
- assinatura dos responsáveis.

---

## 20. Evidence package

Estrutura proposta:

```text
evidence/
  manifest.json
  requirements.json
  environment.json
  commands.log
  results/
  artifacts/
  hashes.sha256
  review.json
  limitations.md
```

O manifesto incluirá:

- schema version;
- commit;
- branch;
- gate;
- ambiente;
- executores;
- timestamps;
- artifacts e hashes;
- requisitos cobertos;
- resultado;
- limitações;
- assinatura ou aprovação.

---

## 21. Retenção e integridade

- artifacts comuns poderão expirar rapidamente;
- evidências de Q3/Q4 terão retenção definida por política;
- hashes detectarão alteração;
- acesso será restrito;
- exportação será auditada;
- evidência invalidada será preservada com estado, não apagada;
- dados pessoais serão minimizados;
- legal hold prevalecerá sobre purge automático quando aplicável.

---

## 22. Defeitos e achados

Estados propostos:

```text
OPEN
TRIAGED
ACCEPTED
IN_PROGRESS
FIXED
VERIFIED
CLOSED
DEFERRED
RISK_ACCEPTED
REOPENED
```

Cada achado terá:

- origem;
- risco;
- requisito;
- reprodução;
- ambiente;
- evidência;
- owner;
- prazo;
- correção;
- teste de regressão;
- risco residual.

Achado não reproduzido não será automaticamente marcado como inexistente.

---

## 23. Gates de qualidade

### QG0 — Base e CI reproduzíveis

- PR mesclável;
- CI estrutural confiável;
- lockfile congelado;
- ledger válido;
- ambientes identificados.

### QG1 — Especificação e rastreabilidade

- requisitos, critérios, riscos e testes mapeados;
- dispensas justificadas.

### QG2 — Estática, unidade e propriedades

- lint, typecheck e build;
- invariantes críticas cobertas.

### QG3 — Banco, RLS, RPCs e contracts

- migrations reproduzíveis;
- isolamento e atomicidade verificados.

### QG4 — Integrações e processamento assíncrono

- outbox/inbox;
- jobs;
- retries;
- estado incerto;
- adapters.

### QG5 — E2E, UX e acessibilidade

- jornadas críticas;
- viewports e temas;
- teclado e leitor de tela.

### QG6 — Capacidade e resiliência

- concorrência;
- carga;
- degradação;
- filas.

### QG7 — Segurança, privacidade e recuperação

- matriz ASVS;
- scans;
- pentest definido;
- restore verificado.

### QG8 — Sombra, reconciliação e piloto

- diferenças explicadas;
- tolerâncias aprovadas;
- piloto restrito.

### QG9 — Produção assistida e estabilização

- SLO observado;
- incidentes tratados;
- runbooks validados;
- aceite final.

---

## 24. Requisitos de qualidade — 120

### 24.1 Governança e risco — QR-001 a QR-010

1. **QR-001:** toda mudança terá classificação Q0–Q4.
2. **QR-002:** a classificação registrará justificativa.
3. **QR-003:** aumento de risco após análise atualizará o plano.
4. **QR-004:** requisito terá critério de aceite verificável.
5. **QR-005:** critério terá teste, análise ou evidência associada.
6. **QR-006:** dispensa de teste terá risco residual.
7. **QR-007:** Q3/Q4 terão revisão independente.
8. **QR-008:** gate terá responsável explícito.
9. **QR-009:** evidência poderá ser invalidada por mudança material.
10. **QR-010:** planejamento não será contabilizado como execução.

### 24.2 Estática e unidade — QR-011 a QR-020

11. **QR-011:** lint executará sem warnings.
12. **QR-012:** typecheck executará sem emissão.
13. **QR-013:** build de produção será verificado.
14. **QR-014:** regras puras terão unit tests.
15. **QR-015:** state machines terão transições válidas e inválidas testadas.
16. **QR-016:** datas terão casos de fronteira.
17. **QR-017:** valores monetários evitarão ponto flutuante.
18. **QR-018:** arredondamentos terão regra versionada testada.
19. **QR-019:** propriedades críticas terão property tests quando viável.
20. **QR-020:** regressões terão teste permanente.

### 24.3 Banco e tenancy — QR-021 a QR-030

21. **QR-021:** toda FK tenant-scoped será testada contra referência cruzada.
22. **QR-022:** RLS terá casos positivos e negativos.
23. **QR-023:** RPC crítica validará organização internamente.
24. **QR-024:** RPC privilegiada validará capability.
25. **QR-025:** append-only bloqueará update/delete comum.
26. **QR-026:** exclusões temporais terão teste de sobreposição.
27. **QR-027:** transações multi-tabela falharão atomicamente.
28. **QR-028:** idempotência será testada com repetição.
29. **QR-029:** concorrência será testada em operações críticas.
30. **QR-030:** teste SQL não deixará dado artificial persistido.

### 24.4 Contratos e jobs — QR-031 a QR-040

31. **QR-031:** commands terão schema versionado.
32. **QR-032:** queries não produzirão efeitos.
33. **QR-033:** erros públicos não exporão detalhes internos.
34. **QR-034:** eventos terão schema compatibility test.
35. **QR-035:** eventos não conterão campos proibidos.
36. **QR-036:** outbox será atômica ao fato.
37. **QR-037:** inbox deduplicará entrega repetida.
38. **QR-038:** jobs terão lease expirável testado.
39. **QR-039:** dead letter será testada.
40. **QR-040:** resposta incerta exigirá reconciliação.

### 24.5 Cálculos — QR-041 a QR-050

41. **QR-041:** datasets dourados terão versão.
42. **QR-042:** resultado terá memória reproduzível.
43. **QR-043:** grafo de rubricas rejeitará ciclos.
44. **QR-044:** total reconciliará com linhas.
45. **QR-045:** reversão neutralizará movimento original.
46. **QR-046:** retroatividade preservará versões anteriores.
47. **QR-047:** rateio não alterará líquido.
48. **QR-048:** cálculo sombra comparará granularmente.
49. **QR-049:** tolerância será explícita.
50. **QR-050:** divergência não explicada bloqueará avanço.

### 24.6 Interface e acessibilidade — QR-051 a QR-060

51. **QR-051:** fluxos críticos terão E2E.
52. **QR-052:** QA visual cobrirá três viewports.
53. **QR-053:** QA visual cobrirá claro e escuro.
54. **QR-054:** console errors serão tratados.
55. **QR-055:** overflow horizontal inesperado falhará o teste.
56. **QR-056:** foco e teclado serão testados.
57. **QR-057:** formulários terão labels e erros associados.
58. **QR-058:** gráficos terão alternativa textual ou tabular.
59. **QR-059:** dados sensíveis permanecerão mascarados por padrão.
60. **QR-060:** portal impedirá acesso a dados de terceiros.

### 24.7 Segurança e privacidade — QR-061 a QR-070

61. **QR-061:** controles terão rastreabilidade ASVS versionada.
62. **QR-062:** BOLA terá teste negativo.
63. **QR-063:** BFLA terá teste negativo.
64. **QR-064:** property authorization será testada.
65. **QR-065:** uploads terão validação e scan testados.
66. **QR-066:** SSRF será testado em adapters aplicáveis.
67. **QR-067:** segredos serão detectados antes do merge.
68. **QR-068:** logs serão testados contra vazamento.
69. **QR-069:** exports sensíveis exigirão capability.
70. **QR-070:** break-glass terá expiração e auditoria.

### 24.8 Observabilidade — QR-071 a QR-080

71. **QR-071:** operação crítica terá correlation ID.
72. **QR-072:** efeito derivado terá causation ID quando aplicável.
73. **QR-073:** logs serão estruturados.
74. **QR-074:** métricas evitarão cardinalidade descontrolada.
75. **QR-075:** auditoria e log técnico serão separados.
76. **QR-076:** health checks terão estado e horário.
77. **QR-077:** alertas críticos terão runbook.
78. **QR-078:** alerta terá owner.
79. **QR-079:** telemetria será redigida.
80. **QR-080:** falha de observabilidade não autorizará sucesso silencioso.

### 24.9 Performance e resiliência — QR-081 a QR-090

81. **QR-081:** operações Q3/Q4 terão perfil de carga.
82. **QR-082:** latência será medida por operação.
83. **QR-083:** filas terão idade observável.
84. **QR-084:** lock contention será medido.
85. **QR-085:** worker interrompido será retomável.
86. **QR-086:** retry terá limite.
87. **QR-087:** indisponibilidade externa terá modo degradado.
88. **QR-088:** exportações terão limites.
89. **QR-089:** analytics informará lag.
90. **QR-090:** chaos ocorrerá somente em ambiente isolado.

### 24.10 Migration e recuperação — QR-091 a QR-100

91. **QR-091:** migrations terão replay do zero.
92. **QR-092:** upgrade de estado anterior será testado.
93. **QR-093:** backfill terá dry-run.
94. **QR-094:** backfill terá checkpoint.
95. **QR-095:** backfill será idempotente.
96. **QR-096:** reconciliação registrará contagens e somas.
97. **QR-097:** rollback de onda será ensaiado.
98. **QR-098:** backup será acompanhado de restore.
99. **QR-099:** pós-restore terá validação funcional.
100. **QR-100:** RPO/RTO serão aprovados antes de produção.

### 24.11 CI e supply chain — QR-101 a QR-110

101. **QR-101:** CI usará lockfile congelado.
102. **QR-102:** runtime e package manager serão fixados.
103. **QR-103:** actions críticas terão versão controlada.
104. **QR-104:** dependências terão análise de vulnerabilidade.
105. **QR-105:** release candidate terá inventário de componentes.
106. **QR-106:** SBOM será gerada quando exigida pelo gate.
107. **QR-107:** licenças serão revisadas.
108. **QR-108:** artifacts críticos terão hashes.
109. **QR-109:** pipeline rápido e ampliado serão separados.
110. **QR-110:** falha de gate não será ignorada sem waiver formal.

### 24.12 Evidência e liberação — QR-111 a QR-120

111. **QR-111:** evidence package terá manifesto.
112. **QR-112:** manifesto identificará commit e ambiente.
113. **QR-113:** comandos e resultados serão preservados.
114. **QR-114:** artifact terá hash.
115. **QR-115:** evidência registrará limitações.
116. **QR-116:** Q3/Q4 terão revisor diferente do executor quando viável.
117. **QR-117:** evidência expirada não aprovará gate.
118. **QR-118:** Go/No-Go será registrado.
119. **QR-119:** produção terá operação assistida.
120. **QR-120:** estabilização exigirá encerramento dos riscos críticos.

---

## 25. Regras de qualidade — 80

### 25.1 Governança — RNQ-001 a RNQ-010

1. teste planejado não é teste executado;
2. CI verde não equivale a aceite funcional;
3. coverage não equivale a confiança;
4. screenshot não prova estado de banco;
5. log não substitui auditoria;
6. norma citada não equivale a conformidade;
7. waiver não poderá ser permanente por padrão;
8. risco residual deverá ter owner;
9. gate Q3/Q4 não será autodeclarado pelo implementador;
10. evidência contradita será invalidada.

### 25.2 Testes — RNQ-011 a RNQ-020

11. teste deverá possuir resultado determinístico quando o domínio permitir;
12. tempo deverá ser controlável em testes temporais;
13. fixture deverá ser sintética;
14. teste SQL deverá usar rollback ou cleanup;
15. retry não será testado somente no caminho de sucesso;
16. concorrência exigirá pelo menos duas sessões reais quando aplicável;
17. erro esperado deverá ser afirmado por código estável;
18. testes frágeis não serão silenciados por retry ilimitado;
19. flake deverá ser rastreado como defeito;
20. caso de regressão permanecerá na suite.

### 25.3 Dados e cálculo — RNQ-021 a RNQ-030

21. dinheiro não usará comparação binária de ponto flutuante;
22. tolerância não será escondida no teste;
23. dataset dourado terá aprovador funcional;
24. mudança legal invalidará casos afetados;
25. cálculo não será aprovado apenas pelo total final;
26. memória deverá identificar versões de entrada;
27. movimento original não será apagado por correção;
28. retroatividade criará novo resultado;
29. dado ambíguo de migration irá para quarentena;
30. reconciliação não corrigirá silenciosamente a origem.

### 25.4 Segurança — RNQ-031 a RNQ-040

31. caso positivo de RLS sem caso negativo será incompleto;
32. Service Role não será usada para contornar teste de autorização;
33. segredo não entrará em artifact;
34. dados clínicos não entrarão em screenshot comum;
35. resposta pública não conterá mensagem SQL;
36. ID pertencente a outro tenant será testado;
37. endpoint interno também exigirá autorização;
38. webhook sem assinatura válida será rejeitado;
39. payload externo será tratado como não confiável;
40. pentest não substituirá secure development contínuo.

### 25.5 Observabilidade — RNQ-041 a RNQ-050

41. correlation ID não será label de métrica;
42. CPF e nome não serão labels;
43. erro livre será normalizado por código;
44. alerta sem ação definida será revisado;
45. saúde desconhecida não será mostrada como saudável;
46. timeout externo não será mostrado como rejeição confirmada;
47. logs sensíveis terão acesso restrito;
48. retenção terá política explícita;
49. telemetria não duplicará fonte canônica;
50. auditoria append-only não será purgada como log efêmero.

### 25.6 CI e artifacts — RNQ-051 a RNQ-060

51. lockfile não será atualizado durante CI de validação;
52. artifact crítico não dependerá apenas da retenção padrão de CI;
53. comando manual de gate será documentado;
54. versão de ferramenta será registrada;
55. pipeline ampliado não bloqueará feedback rápido desnecessariamente;
56. pipeline rápido não autorizará release Q4;
57. falha intermitente não será classificada como sucesso;
58. job cancelado não será contado como aprovado;
59. artifact ausente falhará gate quando obrigatório;
60. evidência deverá ser legível sem depender da interface do provedor.

### 25.7 Operação — RNQ-061 a RNQ-070

61. alerta crítico terá escalonamento;
62. runbook será testado antes de produção;
63. backup sem restore não será evidência de recuperação;
64. feature flag não substituirá autorização;
65. rollback será definido antes do deploy Q4;
66. modo degradado deverá preservar fatos internos;
67. operação assistida terá janela e responsáveis;
68. incidente preservará evidências;
69. postmortem não apagará responsabilidade de correção;
70. SLO será definido por capacidade.

### 25.8 Liberação — RNQ-071 a RNQ-080

71. merge não autorizará produção;
72. deployment não ativará funcionalidade crítica automaticamente;
73. piloto terá população limitada;
74. folha oficial dependerá de sombra;
75. transmissão oficial dependerá de produção restrita quando disponível;
76. divergência crítica bloqueará Go;
77. risco aceito terá prazo de revisão;
78. gate poderá ser reaberto;
79. estabilização exigirá telemetria suficiente;
80. conclusão documental não será tratada como software entregue.

---

## 26. Critérios de aceite — 55

### 26.1 Base e rastreabilidade — CAQ-001 a CAQ-005

1. matriz liga requisitos, riscos, testes e evidências;
2. classes Q0–Q4 estão atribuídas às histórias;
3. CI é reproduzível com lockfile congelado;
4. waivers possuem prazo e owner;
5. artifacts identificam commit e ambiente.

### 26.2 Unidade e banco — CAQ-006 a CAQ-010

6. invariantes críticas possuem testes automatizados;
7. RLS possui matriz positiva e negativa;
8. RPCs críticas falham atomicamente;
9. idempotência não duplica efeito;
10. testes SQL não deixam fixtures persistidas.

### 26.3 Contratos e jobs — CAQ-011 a CAQ-015

11. schemas de commands e events estão versionados;
12. erro público está sanitizado;
13. outbox é gravada com o fato;
14. inbox deduplica eventos;
15. job interrompido é retomado ou enviado a dead letter.

### 26.4 Cálculo — CAQ-016 a CAQ-020

16. dataset dourado está aprovado;
17. cálculo é reproduzível por versão;
18. totais reconciliam com linhas;
19. sombra compara granularmente;
20. divergências acima da tolerância bloqueiam gate.

### 26.5 UX e acessibilidade — CAQ-021 a CAQ-025

21. fluxos críticos funcionam nos viewports definidos;
22. temas claro e escuro não geram falha de contraste crítica;
23. teclado conclui tarefas principais;
24. erros de formulário são associados aos campos;
25. dados sensíveis permanecem minimizados.

### 26.6 Segurança — CAQ-026 a CAQ-030

26. matriz ASVS possui estado por controle aplicável;
27. BOLA/BFLA e property authorization foram testadas;
28. secret scan e dependency scan foram executados;
29. uploads e SSRF aplicáveis foram verificados;
30. revisão de segurança Q3/Q4 está registrada.

### 26.7 Observabilidade — CAQ-031 a CAQ-035

31. operações críticas possuem correlação;
32. logs não contêm campos proibidos;
33. SLIs possuem fonte e fórmula;
34. alertas críticos possuem runbooks;
35. estado externo incerto é observável.

### 26.8 Performance e resiliência — CAQ-036 a CAQ-040

36. perfil de carga representa o piloto;
37. concorrência crítica foi executada;
38. filas e locks são observáveis;
39. indisponibilidade externa preserva fatos;
40. worker interrompido não perde processamento confirmado.

### 26.9 Migration e recuperação — CAQ-041 a CAQ-045

41. migrations passam em replay;
42. backfill retoma de checkpoint;
43. reconciliação não apresenta diferença inexplicada;
44. rollback de onda foi ensaiado;
45. restore foi verificado funcionalmente.

### 26.10 Evidência e piloto — CAQ-046 a CAQ-050

46. evidence package possui manifesto e hashes;
47. revisor aceitou as limitações registradas;
48. cálculo sombra atingiu condição aprovada;
49. piloto está limitado por flag e escopo;
50. Go/No-Go foi registrado.

### 26.11 Produção e estabilização — CAQ-051 a CAQ-055

51. SLOs aprovados estão monitorados;
52. responsáveis e escalonamento estão ativos;
53. incidentes críticos do piloto estão encerrados ou formalmente aceitos;
54. rollback e continuidade foram confirmados;
55. operação assistida foi concluída com aceite.

---

## 27. Matriz de rastreabilidade

O anexo define:

- 96 famílias de teste de domínio, resultantes de 12 contextos × 8 dimensões;
- 24 famílias transversais;
- total de **120 famílias de teste**;
- tipos de evidence package;
- gates e owners;
- invalidação de evidência.

---

## 28. Ondas de implantação da qualidade

### QA-0 — Saneamento

- CI reproduzível;
- lockfile;
- vaccines;
- ledger;
- inventário;
- estratégia de artifacts.

### QA-1 — Fundação

- helpers;
- fixtures;
- schemas;
- matriz RLS;
- evidence manifest.

### QA-2 — Domínios operacionais

- core, org, admissão, contratos, ponto, férias, benefícios e SST.

### QA-3 — Folha e obrigações

- datasets dourados;
- sombra;
- adapters;
- reconciliação;
- carga.

### QA-4 — Segurança e continuidade

- ASVS;
- scans;
- pentest;
- restore;
- runbooks.

### QA-5 — Piloto e estabilização

- SLO;
- alertas;
- operação assistida;
- evidence packages finais.

---

## 29. Baseline técnica consultada

Em 6 de agosto de 2026 foram reconciliados:

- scripts e dependencies do `package.json` da branch;
- configuração Vitest;
- workflow principal de CI;
- harness Playwright de QA visual;
- testes atuais de segurança e erros públicos;
- implementação e documentação da Etapa 19 de observabilidade;
- mecanismos de artifacts e drill de backup da plataforma;
- OWASP ASVS 5.0.0;
- OWASP Top 10:2025;
- OWASP API Security Top 10:2023;
- OWASP Logging Cheat Sheet;
- NIST SSDF 1.1, observando que a versão 1.2 permanece draft;
- conceitos de sinais do OpenTelemetry.

As versões e recomendações deverão ser revalidadas antes da implementação e de cada release relevante.

---

## 30. Estado honesto

Nenhum dos seguintes itens foi criado ou executado pelo Módulo 18:

- teste do RH;
- fixture;
- dataset dourado;
- threshold de coverage;
- scanner;
- SBOM;
- pipeline RH;
- fonte observável RH;
- SLI ou SLO numérico;
- alerta;
- runbook;
- evidence store;
- pentest;
- load test;
- chaos test;
- cálculo sombra;
- restore do RH;
- gate aprovado.

A entrega é exclusivamente documental e permanece condicionada ao Sprint 00 e ao Gate G00.
