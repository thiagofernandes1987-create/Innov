# Projeto RH — Módulo 20 — Anexo A — Matriz de Governança e Calendário

**Versão:** 0.1.0  
**Estado:** matriz de governança concluída; execução não iniciada  
**Data:** 7 de agosto de 2026  
**Documento principal:** `PROJETO-RH-MODULO-20-GOVERNANCA-OPERACIONAL-CALENDARIO-LEGAL-E-EVOLUCAO.md`

---

## 1. Finalidade

Este anexo organiza o Módulo 20 em rotinas operacionais verificáveis. Nenhuma linha abaixo representa atividade já executada.

Estados futuros:

```text
NOT_CONFIGURED
CONFIGURED
SCHEDULED
RUNNING
COMPLIANT
ATTENTION
BREACHED
SUSPENDED
NOT_APPLICABLE
```

---

## 2. Matriz de governança — 80 rotinas

### G0 — Ownership e fóruns

| ID | Rotina | Owner esperado | Evidência futura |
|---|---|---|---|
| G001 | manter owner de cada bounded context | Product/Domain | registry de ownership |
| G002 | manter data owner por zona sensível | Data/Privacy | registry |
| G003 | manter integration owner | Platform | registry |
| G004 | manter payroll owner | RH/Payroll | registry |
| G005 | manter SST owner | SST | registry |
| G006 | manter compliance owner | Compliance | registry |
| G007 | revisar conflitos de segregação | Security | relatório |
| G008 | registrar decisões do fórum | Governance | ata/decision log |
| G009 | acompanhar ações abertas | Governance | action ledger |
| G010 | substituir owner sem perder histórico | Governance | audit trail |

### G1 — Fontes e mudanças regulatórias

| ID | Rotina | Owner esperado | Evidência futura |
|---|---|---|---|
| G011 | consultar fontes oficiais cadastradas | Regulatory | source snapshot |
| G012 | detectar versão nova | Regulatory | detection record |
| G013 | validar origem oficial | Regulatory | validation |
| G014 | calcular hash do artifact | Platform | manifest |
| G015 | abrir change record | Regulatory | change record |
| G016 | classificar R0–R4 | Regulatory/Domain | classificação |
| G017 | analisar aplicabilidade | Domain/Legal | parecer |
| G018 | mapear impacto | Architecture/Data | impact matrix |
| G019 | registrar interpretação aprovada | Domain/Legal | decision record |
| G020 | encerrar fonte superseded sem excluir | Regulatory | source history |

### G2 — Regras, parâmetros e fórmulas

| ID | Rotina | Owner esperado | Evidência futura |
|---|---|---|---|
| G021 | criar nova versão de parâmetro | Domain | version record |
| G022 | informar fonte e vigência | Regulatory/Domain | metadata |
| G023 | revisar unidade e precisão | Payroll/Data | review |
| G024 | executar maker-checker | Domain/Reviewer | approvals |
| G025 | gerar diff semântico | Platform | diff report |
| G026 | executar datasets afetados | QA/Domain | evidence package |
| G027 | testar fronteiras e arredondamento | QA | test report |
| G028 | agendar vigência | Release/Domain | schedule |
| G029 | ativar versão aprovada | Release | audit event |
| G030 | superseder versão anterior | Domain | state history |

### G3 — Calendário legal e operacional

| ID | Rotina | Owner esperado | Evidência futura |
|---|---|---|---|
| G031 | manter definição de obrigação | Compliance | version record |
| G032 | manter regra de vencimento | Compliance | rule record |
| G033 | manter população aplicável | Compliance | applicability |
| G034 | manter calendário de dias úteis | Governance | calendar version |
| G035 | registrar exceção oficial | Regulatory | source link |
| G036 | calcular deadlines | Platform | calculation trace |
| G037 | calcular janelas internas | Compliance | schedule |
| G038 | atribuir owner de obrigação | Compliance | assignment |
| G039 | alertar risco de atraso | Observability | alert |
| G040 | registrar evidência de reconciliação | Compliance | evidence package |

### G4 — Acessos e administração

| ID | Rotina | Owner esperado | Evidência futura |
|---|---|---|---|
| G041 | revisar perfis do RH | Security/RH | access review |
| G042 | revisar overrides | Security | access review |
| G043 | revisar acessos clínicos | SST/Privacy | review |
| G044 | revisar acessos judiciais | Legal/Privacy | review |
| G045 | revisar acessos de folha | Payroll/Security | review |
| G046 | retirar acesso por desligamento | Security | audit event |
| G047 | revisar acesso por mudança de função | RH/Security | review |
| G048 | expirar acesso temporário | Security | expiry evidence |
| G049 | controlar break-glass | Security | emergency ledger |
| G050 | revisar uso de break-glass | Security/Audit | review |

### G5 — Segredos, certificados e fornecedores

| ID | Rotina | Owner esperado | Evidência futura |
|---|---|---|---|
| G051 | inventariar certificado sem chave privada | Integration/Security | metadata registry |
| G052 | acompanhar expiração | Integration | alert |
| G053 | planejar renovação | Integration | change plan |
| G054 | testar credencial nova | Integration/QA | health evidence |
| G055 | ativar credencial nova | Release/Integration | audit event |
| G056 | retirar credencial anterior | Security | removal evidence |
| G057 | revisar procurações | Compliance | review |
| G058 | revisar provider crítico | Integration | supplier review |
| G059 | testar modo de indisponibilidade | QA/Operations | drill evidence |
| G060 | registrar mudança de API | Integration | change record |

### G6 — Privacidade, retenção e qualidade

| ID | Rotina | Owner esperado | Evidência futura |
|---|---|---|---|
| G061 | revisar classificação de dados | Privacy/Data | classification |
| G062 | revisar política de retenção | Privacy/Legal | policy version |
| G063 | identificar registros elegíveis ao descarte | Data | dry-run |
| G064 | verificar legal holds | Legal/Privacy | hold check |
| G065 | executar descarte autorizado | Platform/Data | execution evidence |
| G066 | reconciliar descarte | Data/Audit | report |
| G067 | monitorar qualidade de dados | Data | quality report |
| G068 | detectar parâmetros vencidos | Platform | diagnostic |
| G069 | detectar obrigação sem owner | Platform | diagnostic |
| G070 | tratar inconsistência crítica | Domain/Data | issue + evidence |

### G7 — Operação e evolução

| ID | Rotina | Owner esperado | Evidência futura |
|---|---|---|---|
| G071 | revisar incidentes materiais | Operations | PIR |
| G072 | abrir problem record | Operations/Engineering | problem record |
| G073 | acompanhar ação corretiva | Owner | action ledger |
| G074 | verificar ação preventiva | QA/Audit | verification |
| G075 | revisar findings de segurança | Security | finding ledger |
| G076 | priorizar backlog regulatório | Product/Regulatory | backlog |
| G077 | revisar dívida técnica | Platform | backlog |
| G078 | revisar uso e adoção | Product | analytics report |
| G079 | conduzir depreciação governada | Product/Platform | deprecation plan |
| G080 | revisar documentação canônica por release | Release/Governance | documentation check |

---

## 3. Matriz de fontes oficiais

O registry executável futuro deverá suportar no mínimo estas famílias, sem limitar-se a elas:

| Família | Autoridade típica | Conteúdo monitorado | Consumidores |
|---|---|---|---|
| eSocial | órgãos responsáveis pelo eSocial | leiautes, XSDs, MOS, notas técnicas/orientativas | compliance, payroll, SST, offboarding |
| FGTS Digital | MTE/SIT | manuais, notas, funcionalidades e regras operacionais | payroll, compliance, offboarding |
| DCTFWeb | Receita Federal | manuais, atos e leiautes | compliance, payroll |
| SST/NR | MTE | textos vigentes, portarias, revisões de NR | SST, core |
| legislação trabalhista | fonte oficial aplicável | leis, decretos, portarias e atos | todos os contextos afetados |
| proteção de dados | autoridade competente | regulamentos, guias e atos | privacy, security, analytics |
| integrações financeiras | provider/autoridade aplicável | layouts, protocolos e certificados | payroll, finance |

Fonte secundária poderá gerar alerta de investigação, mas não será baseline final de mudança crítica.

---

## 4. Modelo de obrigação

Cada obrigação futura deverá poder ser representada por:

```text
obligation_key
version
authority
source_id
applicability_rule
generating_event
periodicity
competence_rule
due_rule
business_calendar_id
timezone
internal_preparation_rule
internal_review_rule
internal_approval_rule
required_evidence
external_system
owner_role
valid_from
valid_to
```

Datas concretas serão instâncias calculadas, não o modelo canônico da obrigação.

---

## 5. Matriz de estados de obrigação

| Estado | Significado |
|---|---|
| UPCOMING | existe e ainda não entrou na preparação |
| IN_PREPARATION | informações em preparação |
| BLOCKED | dependência impede avanço |
| READY_FOR_REVIEW | pronta para conferência |
| IN_REVIEW | revisão em andamento |
| READY_FOR_APPROVAL | conferida |
| APPROVED | autorizada internamente |
| READY_FOR_SUBMISSION | tecnicamente pronta |
| SUBMITTING | transmissão em curso |
| SUBMITTED | envio realizado, retorno conclusivo ainda não garantido |
| ACCEPTED | sistema externo aceitou conforme contrato conhecido |
| RECONCILING | totalizadores/efeitos sendo conferidos |
| RECONCILED | efeitos conciliados |
| OVERDUE | deadline ultrapassado sem condição final aceitável |
| NOT_APPLICABLE | obrigação não se aplica, com justificativa |
| CANCELLED | instância cancelada legitimamente |

---

## 6. Matriz de maker-checker

| Objeto | Maker | Checker mínimo | Publicação |
|---|---|---|---|
| regra de folha | payroll specialist | payroll reviewer | release control |
| incidência/rubrica | payroll | payroll/compliance | release control |
| obrigação externa | compliance | compliance/regulatory | release control |
| regra de SST crítica | SST | SST/reviewer | release control |
| política de retenção | privacy/data | privacy/legal | platform |
| certificado produtivo | integration | security/integration reviewer | controlled rotation |
| acesso privilegiado | administrator | independent authorized reviewer | access engine |
| break-glass | requester | emergency approver quando possível | temporary grant |

A matriz real deverá ser configurável e poderá exigir mais aprovadores conforme Q/R risk.

---

## 7. Matriz de recertificação

Recertificação futura deverá observar pelo menos:

- usuário continua ativo;
- organização correta;
- função atual;
- necessidade de cada capability;
- perfis adicionais;
- overrides positivos e negativos;
- escopo de obra/cliente quando existente;
- acesso a dados sensíveis;
- acesso a exportação;
- acesso a folha;
- acesso clínico;
- acesso judicial;
- acesso de fornecedor;
- concessões temporárias;
- break-glass recente.

Resultados possíveis:

```text
KEEP
REDUCE
REVOKE
EXPIRE
ESCALATE
```

---

## 8. Matriz de expiração operacional

Itens que deverão suportar alerta de expiração quando aplicável:

1. certificados digitais;
2. procurações;
3. tokens de integração;
4. credenciais temporárias;
5. acessos temporários;
6. feature flags temporárias;
7. exceções regulatórias;
8. versões em coexistência;
9. contratos de provider;
10. evidências com validade operacional;
11. aprovações temporárias;
12. legal holds sujeitos a revisão.

Expiração não implica renovação automática.

---

## 9. Matriz de revisão por mudança

| Mudança | Reavaliações mínimas |
|---|---|
| nova regra legal | domínio, cálculo, dados, testes, UX, treinamento, release |
| novo layout eSocial | schema de projeção, adapter, XSD, testes, coexistência |
| novo manual FGTS | aplicabilidade, fluxos, reconciliação e treinamento |
| nova NR | SST, riscos, exames, treinamentos, documentação |
| nova tabela monetária | parâmetros, fórmula, golden data, shadow |
| nova API provider | contrato, autenticação, idempotência, jobs, monitoring |
| novo certificado | inventory, secrets, rotation, health |
| mudança de RLS | access matrix, negative tests, recertification impact |
| mudança de retenção | data inventory, holds, jobs, evidence |
| mudança de feature | docs, support, training, telemetry |

---

## 10. Dossiês futuros de governança — 16 tipos

1. `REG-SOURCE` — captura e validação de fonte;
2. `REG-CHANGE` — mudança regulatória;
3. `REG-IMPACT` — análise de impacto;
4. `PARAM-RELEASE` — versão de parâmetro/fórmula;
5. `CALENDAR-RULE` — regra de deadline;
6. `OBLIGATION-CYCLE` — ciclo de obrigação;
7. `ACCESS-REVIEW` — recertificação;
8. `BREAK-GLASS` — emergência de acesso;
9. `CERT-ROTATION` — rotação de certificado;
10. `PROVIDER-REVIEW` — fornecedor/integração;
11. `RETENTION-RUN` — descarte governado;
12. `LEGAL-HOLD` — suspensão de descarte;
13. `DATA-QUALITY` — qualidade e reconciliação;
14. `POST-INCIDENT` — revisão pós-incidente;
15. `DEPRECATION` — aposentadoria de capacidade;
16. `GOV-REVIEW` — revisão geral de governança.

---

## 11. Indicadores futuros

Sem definir metas numéricas nesta fase, a governança deverá conseguir medir:

- mudanças regulatórias detectadas e abertas;
- tempo entre publicação e triagem;
- mudanças próximas da vigência ainda não aprovadas;
- parâmetros sem fonte ou sem owner;
- obrigações próximas do vencimento;
- obrigações bloqueadas;
- divergências de reconciliação;
- acessos aguardando recertificação;
- acessos temporários expirados;
- certificados próximos da expiração;
- providers degradados;
- holds ativos;
- descartes pendentes;
- incidentes recorrentes;
- ações corretivas vencidas;
- versões deprecated ainda consumidas.

---

## 12. Baseline oficial observado em 07/08/2026

A governança foi desenhada considerando que fontes oficiais mudam independentemente do ciclo do software. Na consulta desta especificação:

- a documentação técnica oficial do eSocial apresentava a versão S-1.3 consolidada com atualizações de 2026;
- o portal do FGTS Digital apresentava Manual versão 1.70;
- a Receita Federal mantinha a página oficial da DCTFWeb com manuais e leiautes;
- o MTE mantinha o catálogo de textos vigentes das Normas Regulamentadoras.

Esses valores servem apenas como evidência de que versões mudam e precisam de governance registry; não devem ser usados como constantes permanentes.

---

## 13. Estado honesto

Esta matriz não:

- monitora sites;
- cria deadlines;
- envia alertas;
- altera parâmetros;
- recertifica usuários;
- gira certificados;
- executa descarte;
- cria legal hold;
- abre incidents ou problems automaticamente.

Tudo permanece como desenho operacional para implementação futura.
