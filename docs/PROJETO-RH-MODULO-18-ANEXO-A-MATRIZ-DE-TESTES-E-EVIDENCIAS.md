# Projeto RH — Módulo 18 — Anexo A — Matriz de Testes e Evidências

**Versão:** 0.1.0  
**Estado:** matriz inicial concluída; casos executáveis não iniciados  
**Data:** 6 de agosto de 2026  
**Documento principal:** `PROJETO-RH-MODULO-18-QUALIDADE-TESTES-OBSERVABILIDADE-SEGURANCA-E-EVIDENCIAS.md`

---

## 1. Finalidade

Este anexo organiza as verificações mínimas do Projeto RH em:

- famílias de teste por bounded context;
- verificações transversais;
- evidence packages;
- owners e revisores;
- gates;
- condições de invalidação.

A matriz não contém testes executados e não representa cobertura real.

---

## 2. Dimensões comuns por contexto

Cada bounded context possuirá oito famílias:

| Código | Dimensão | Pergunta central |
|---|---|---|
| D1 | Domínio e estado | as transições e invariantes estão corretas? |
| D2 | Temporalidade e cálculo | vigência, datas, saldos e valores são reproduzíveis? |
| D3 | Banco e transação | constraints, locks e atomicidade protegem o estado? |
| D4 | Autorização e privacidade | tenant, capability, escopo e sensibilidade estão protegidos? |
| D5 | Contratos e eventos | commands, queries, eventos e erros são compatíveis? |
| D6 | Integração e assíncrono | adapters, outbox, inbox, jobs e retries são seguros? |
| D7 | Experiência e acessibilidade | a tarefa pode ser concluída e compreendida? |
| D8 | Operação e evidência | telemetria, alerta, runbook e artifact permitem operar? |

Doze contextos multiplicados por oito dimensões resultam em **96 famílias de domínio**.

---

## 3. Matriz por bounded context — 96 famílias

### 3.1 `rh_core` — TF-001 a TF-008

| ID | Família | Escopo mínimo |
|---|---|---|
| TF-001 | core · domínio | pessoa, trabalhador, vínculo e identidades sem duplicação indevida |
| TF-002 | core · temporal/cálculo | vigência de documentos, dados e status do trabalhador |
| TF-003 | core · banco | FKs por tenant, unicidade e criação transacional |
| TF-004 | core · autorização | dados próprios, dados administrativos e campos sensíveis |
| TF-005 | core · contracts | create/update/query, versões e erros públicos |
| TF-006 | core · integração | documentos, Storage, busca e eventos de criação/alteração |
| TF-007 | core · UX | lista, dossiê, máscaras, conflito e acessibilidade |
| TF-008 | core · operação | auditoria de acesso, qualidade de dados e duplicidades |

### 3.2 `rh_org` — TF-009 a TF-016

| ID | Família | Escopo mínimo |
|---|---|---|
| TF-009 | org · domínio | empresa, estabelecimento, unidade, cargo, função, posição e lotação |
| TF-010 | org · temporal/cálculo | reorganização, ocupação e rateio por vigência |
| TF-011 | org · banco | ciclos hierárquicos, overlaps e FKs compostas |
| TF-012 | org · autorização | administração global, empresa, unidade e obra |
| TF-013 | org · contracts | comandos de reorganização e projeções de organograma |
| TF-014 | org · integração | Obras, Equipes e centros de custo |
| TF-015 | org · UX | árvore, lista, timeline e impacto de mudança |
| TF-016 | org · operação | posições vagas, inconsistências e referências órfãs |

### 3.3 `rh_admission` — TF-017 a TF-024

| ID | Família | Escopo mínimo |
|---|---|---|
| TF-017 | admission · domínio | caso, checklist, pendência, aprovação, cancelamento e ativação |
| TF-018 | admission · temporal/cálculo | prazos, data prevista e documentos vigentes |
| TF-019 | admission · banco | ativação atômica e idempotente |
| TF-020 | admission · autorização | recrutador, RH, aprovador e candidato |
| TF-021 | admission · contracts | etapas, bloqueios, errors e evento de ativação |
| TF-022 | admission · integração | assinatura, documentos e registro governamental preliminar |
| TF-023 | admission · UX | stepper, revisão final, bloqueios e mobile |
| TF-024 | admission · operação | casos parados, prazo, falha de integração e reconciliação |

### 3.4 `rh_contracts` — TF-025 a TF-032

| ID | Família | Escopo mínimo |
|---|---|---|
| TF-025 | contracts · domínio | raiz, versões, alteração, correção e aprovação |
| TF-026 | contracts · temporal/cálculo | vigência futura, retroativa e impacto |
| TF-027 | contracts · banco | exclusão temporal, versionamento e concorrência |
| TF-028 | contracts · autorização | solicitação, revisão, aprovação e acesso salarial |
| TF-029 | contracts · contracts | diffs, expected version, eventos e documentos |
| TF-030 | contracts · integração | folha, Obras, Financeiro, assinatura e eSocial |
| TF-031 | contracts · UX | comparação de versões e confirmação proporcional |
| TF-032 | contracts · operação | alteração futura, retroativa e impacto não processado |

### 3.5 `rh_time` — TF-033 a TF-040

| ID | Família | Escopo mínimo |
|---|---|---|
| TF-033 | time · domínio | jornada, escala, marcação, tratamento, apuração e fechamento |
| TF-034 | time · temporal/cálculo | turnos, virada de dia, tolerância, extras e banco |
| TF-035 | time · banco | marcação append-only, saldo por movimentos e lock de fechamento |
| TF-036 | time · autorização | trabalhador, gestor, RH e aprovador |
| TF-037 | time · contracts | importação, tratamento, lote para folha e eventos |
| TF-038 | time · integração | dispositivos, offline, Diário de Obras e folha |
| TF-039 | time · UX | espelho, exceções, correção, acessibilidade e mobile |
| TF-040 | time · operação | marcações ausentes, fila offline, divergência e período parado |

### 3.6 `rh_leave` — TF-041 a TF-048

| ID | Família | Escopo mínimo |
|---|---|---|
| TF-041 | leave · domínio | direito, concessão, ausência, afastamento, benefício e retorno |
| TF-042 | leave · temporal/cálculo | saldo, fracionamento, sobreposição e retroatividade |
| TF-043 | leave · banco | movimentos, exclusões temporais e fechamento |
| TF-044 | leave · autorização | trabalhador, gestor, RH, médico e financeiro |
| TF-045 | leave · contracts | solicitação, decisão, retorno e eventos externos |
| TF-046 | leave · integração | ponto, folha, SST, benefícios e eSocial |
| TF-047 | leave · UX | calendário, saldo explicado, documentos e privacidade |
| TF-048 | leave · operação | retorno vencido, conflito, benefício pendente e impacto retroativo |

### 3.7 `rh_benefits` — TF-049 a TF-056

| ID | Família | Escopo mínimo |
|---|---|---|
| TF-049 | benefits · domínio | catálogo, política, plano, adesão, cobertura e desconto |
| TF-050 | benefits · temporal/cálculo | preço, elegibilidade, coparticipação e pensão por vigência |
| TF-051 | benefits · banco | papéis independentes, movimentos, estornos e unicidade |
| TF-052 | benefits · autorização | trabalhador, RH, financeiro e dado judicial |
| TF-053 | benefits · contracts | adesão, cobrança, desconto e reconciliação |
| TF-054 | benefits · integração | fornecedor, folha, banco e Financeiro |
| TF-055 | benefits · UX | pessoas cobertas, custos, consentimento e self-service |
| TF-056 | benefits · operação | arquivo rejeitado, cobrança órfã, diferença e vencimento |

### 3.8 `rh_sst` — TF-057 a TF-064

| ID | Família | Escopo mínimo |
|---|---|---|
| TF-057 | sst · domínio | risco, exposição, exame, ASO, incidente, EPI e habilitação |
| TF-058 | sst · temporal/cálculo | vigência, validade, vencimento e perfil de exposição |
| TF-059 | sst · banco | prontuário segregado, append-only e autorizações |
| TF-060 | sst · autorização | gestor, SST, médico, trabalhador e acesso clínico |
| TF-061 | sst · contracts | emissão de ASO, CAT, habilitação e eventos |
| TF-062 | sst · integração | clínicas, laboratórios, Estoque, Obras e eSocial |
| TF-063 | sst · UX | conclusão operacional sem diagnóstico e fluxos de campo |
| TF-064 | sst · operação | exame vencido, EPI pendente, incidente e autorização suspensa |

### 3.9 `rh_payroll` — TF-065 a TF-072

| ID | Família | Escopo mínimo |
|---|---|---|
| TF-065 | payroll · domínio | competência, ciclo, fatos, rubricas, cálculo, aprovação e fechamento |
| TF-066 | payroll · temporal/cálculo | fórmulas, incidências, arredondamento, retroativo e complementar |
| TF-067 | payroll · banco | snapshots, imutabilidade, locks, idempotência e fechamento atômico |
| TF-068 | payroll · autorização | calculista, conferente, aprovador, financeiro e self-service |
| TF-069 | payroll · contracts | entradas, execuções, memória, pagamento e eventos |
| TF-070 | payroll · integração | ponto, benefícios, SST, Financeiro, banco e Contabilidade |
| TF-071 | payroll · UX | ciclo, divergência, memória, dupla aprovação e portal |
| TF-072 | payroll · operação | cálculo lento, divergência, fechamento parcial e pagamento pendente |

### 3.10 `rh_compliance` — TF-073 a TF-080

| ID | Família | Escopo mínimo |
|---|---|---|
| TF-073 | compliance · domínio | obrigação, projeção, lote, tentativa, recibo, totalizador e guia |
| TF-074 | compliance · temporal/cálculo | prazo, competência, retificação, exclusão e reabertura |
| TF-075 | compliance · banco | payload imutável, tentativa append-only e estado incerto |
| TF-076 | compliance · autorização | preparação, aprovação, transmissão e certificado |
| TF-077 | compliance · contracts | adapters, schemas, recibos, erros e versões |
| TF-078 | compliance · integração | eSocial, DCTFWeb, FGTS Digital e certificados |
| TF-079 | compliance · UX | fila, status externo, reconciliação e ações seguras |
| TF-080 | compliance · operação | indisponibilidade, retry, certificado e prazo vencendo |

### 3.11 `rh_offboarding` — TF-081 a TF-088

| ID | Família | Escopo mínimo |
|---|---|---|
| TF-081 | offboarding · domínio | caso, proteção, aviso, término, cálculo, pagamento e conclusão |
| TF-082 | offboarding · temporal/cálculo | datas, projeção, verbas, estabilidade e retroatividade |
| TF-083 | offboarding · banco | término atômico, cálculo imutável e checklist |
| TF-084 | offboarding · autorização | solicitante, RH, jurídico, aprovador e financeiro |
| TF-085 | offboarding · contracts | decisão, rescisão, eventos, documentos e reintegração |
| TF-086 | offboarding · integração | acessos, Estoque, SST, Financeiro, banco e governo |
| TF-087 | offboarding · UX | riscos, revisão, dupla aprovação e pendências |
| TF-088 | offboarding · operação | acesso não revogado, ativo não devolvido, evento e pagamento pendentes |

### 3.12 `rh_analytics` — TF-089 a TF-096

| ID | Família | Escopo mínimo |
|---|---|---|
| TF-089 | analytics · domínio | métrica, execução, observação, cenário, recomendação e decisão |
| TF-090 | analytics · temporal/cálculo | corte, versão, população, FTE, agregação e supressão |
| TF-091 | analytics · banco | linhagem, snapshots, read models e qualidade |
| TF-092 | analytics · autorização | operacional, estatístico, sensível e exportação |
| TF-093 | analytics · contracts | métricas, filtros, exportações e propostas de ação |
| TF-094 | analytics · integração | todos os contextos, Obras e Financeiro |
| TF-095 | analytics · UX | dashboards explicáveis, qualidade, cenário e contestação |
| TF-096 | analytics · operação | lag, drift, quebra de fonte, grupo pequeno e export anômalo |

---

## 4. Famílias transversais — 24

### Arquitetura, tenancy e dados

- **TF-097 — criação cross-tenant:** impedir referências e comandos entre organizações;
- **TF-098 — isolamento por empresa/estabelecimento:** validar escopos abaixo do tenant;
- **TF-099 — temporalidade transversal:** validar `asOf`, retroatividade e intervalo semiaberto;
- **TF-100 — integridade de documentos:** hash, versão, MIME, scan, retenção e legal hold;

### Identidade, segurança e privacidade

- **TF-101 — identidade e sessão:** autenticação, expiração, troca de organização e reautenticação;
- **TF-102 — capabilities:** função, ação, escopo, finalidade e segregação de funções;
- **TF-103 — dados sensíveis:** masking, reveal, exportação, impressão e auditoria;
- **TF-104 — ASVS e Top 10:** matriz versionada de controles aplicáveis;
- **TF-105 — APIs:** BOLA, BFLA, property authorization, rate limit e abuso de fluxo;
- **TF-106 — cadeia de suprimentos:** lockfile, dependencies, secrets, SAST, SBOM e licenças;

### Contratos, eventos e operação assíncrona

- **TF-107 — envelopes:** comandos, consultas, erros, eventos e jobs;
- **TF-108 — idempotência:** mesma chave/mesmo payload e chave/payload divergente;
- **TF-109 — outbox/inbox:** atomicidade, deduplicação, replay e ordem;
- **TF-110 — jobs/workers:** lease, heartbeat, retry, dead letter e cancelamento;
- **TF-111 — resposta incerta:** timeout após envio, consulta e reconciliação;
- **TF-112 — adapters:** versionamento, validação de terceiros e falhas controladas;

### Experiência e acessibilidade

- **TF-113 — casca e navegação:** menus, rotas, busca, foco e contexto;
- **TF-114 — responsividade:** 390×844, 1366×768 e 1920×1080;
- **TF-115 — temas e contraste:** claro, escuro, foco e estados;
- **TF-116 — formulários e conflitos:** validação, resumo de erros, autosave e versão;

### Continuidade e evidências

- **TF-117 — migrations e replay:** instalação limpa e upgrade;
- **TF-118 — backfill e reconciliação:** dry-run, checkpoint, retomada e quarentena;
- **TF-119 — backup e restore:** restauração, integridade e validação funcional;
- **TF-120 — evidence package:** manifesto, hashes, revisão, retenção e invalidação.

---

## 5. Tipos de evidence package

| Código | Pacote | Conteúdo mínimo |
|---|---|---|
| EP-01 | structural | validadores, lint, typecheck e build |
| EP-02 | unit | resultados, coverage e casos críticos |
| EP-03 | database | migrations, SQL tests, RLS e constraints |
| EP-04 | contracts | schemas, compatibility e errors |
| EP-05 | integration | simuladores, requests, responses e reconciliação |
| EP-06 | async | outbox, inbox, jobs, retry e dead letter |
| EP-07 | e2e | jornada, fixtures, screenshots e estado final |
| EP-08 | visual | viewports, temas, console e medidas |
| EP-09 | accessibility | teclado, foco, contraste, semântica e leitor de tela |
| EP-10 | security | ASVS, scans, testes negativos e achados |
| EP-11 | privacy | minimização, masking, exportação e direitos |
| EP-12 | performance | perfil, carga, percentis, filas e locks |
| EP-13 | resilience | falhas injetadas, contenção e recuperação |
| EP-14 | migration | replay, backfill, reconciliação e rollback |
| EP-15 | restore | backup, restauração e validação pós-restore |
| EP-16 | shadow | comparação granular e divergências |
| EP-17 | pilot | população, flags, SLOs, incidentes e aceite |
| EP-18 | release | Go/No-Go, owners, rollback e hypercare |

---

## 6. Manifesto de evidência

Exemplo conceitual:

```json
{
  "schemaVersion": "1.0.0",
  "evidenceId": "EP-EXAMPLE",
  "gate": "QG3",
  "riskClass": "Q3",
  "commitSha": "<sha>",
  "environment": "homologation",
  "requirements": ["QR-021", "QR-022"],
  "testFamilies": ["TF-004", "TF-098"],
  "startedAt": "<timestamp>",
  "finishedAt": "<timestamp>",
  "result": "PASSED",
  "artifacts": [
    { "path": "results/rls.json", "sha256": "<hash>" }
  ],
  "limitations": [],
  "executor": "<identity>",
  "reviewer": "<identity>"
}
```

O exemplo não define implementação ou storage final.

---

## 7. Matriz de gates e evidências

| Gate | Evidências mínimas |
|---|---|
| QG0 | EP-01, ledger, lockfile e inventário |
| QG1 | matriz de rastreabilidade e revisão de risco |
| QG2 | EP-01 e EP-02 |
| QG3 | EP-03 e EP-04 |
| QG4 | EP-05 e EP-06 |
| QG5 | EP-07, EP-08 e EP-09 |
| QG6 | EP-12 e EP-13 |
| QG7 | EP-10, EP-11 e EP-15 |
| QG8 | EP-14, EP-16 e EP-17 |
| QG9 | EP-18 e telemetria de estabilização |

A matriz poderá ser ampliada conforme o risco.

---

## 8. Owners e independência

| Área | Executor típico | Revisor típico |
|---|---|---|
| domínio | desenvolvedor | SME + QA |
| banco/RLS | backend/DBA | segurança/QA |
| folha | desenvolvedor/motor | DP/folha + QA independente |
| SST | desenvolvedor | profissional SST/médico conforme escopo |
| compliance | integration engineer | especialista DP/compliance |
| segurança | equipe técnica | revisor de segurança independente |
| acessibilidade | frontend/QA | avaliador de acessibilidade |
| migration | DBA/migration lead | owner de dados + QA |
| Go/No-Go | release lead | negócio, segurança e operação |

A mesma pessoa poderá acumular papéis em equipe pequena, mas o acúmulo será registrado como risco e compensado por revisão posterior quando necessário.

---

## 9. Critérios de invalidação

Uma evidência poderá ser invalidada por:

- commit diferente;
- migration alterada;
- mudança de dependência relevante;
- ambiente não equivalente;
- fixture ou dataset alterado;
- requisito alterado;
- vulnerabilidade nova;
- falha reproduzida após a execução;
- artifact ausente ou hash divergente;
- expiração da validade definida;
- erro no método de teste;
- conflito de interesse não declarado.

Evidência invalidada não será apagada. Permanecerá com o estado e o motivo.

---

## 10. Critérios para automação

Uma família deverá ser automatizada quando:

- executada frequentemente;
- determinística;
- crítica para regressão;
- difícil de verificar manualmente com consistência;
- necessária para qualquer PR ou release;
- ou envolver grande combinação de casos.

Uma verificação poderá permanecer manual quando:

- exigir julgamento especializado;
- ocorrer raramente;
- depender de autoridade externa não automatizável;
- ou a automação tiver custo desproporcional.

Mesmo manual, deverá gerar evidência estruturada.

---

## 11. Estado honesto

As 120 famílias são um catálogo inicial. Nenhuma possui atualmente:

- arquivo de teste do RH;
- executor automatizado;
- fixture;
- artifact;
- resultado;
- revisor;
- ou aceite.

A matriz deverá ser refinada por sprint e por história antes da implementação correspondente.
