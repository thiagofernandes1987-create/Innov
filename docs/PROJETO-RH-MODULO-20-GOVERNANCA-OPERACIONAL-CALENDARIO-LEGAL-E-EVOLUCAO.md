# Projeto RH — Módulo 20 — Governança Operacional, Calendário Legal, Administração, Atualização Regulatória e Evolução Contínua

**Versão:** 0.1.0  
**Estado:** especificação de governança concluída; operação não iniciada  
**Data:** 7 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**ADR vinculante:** `PROJETO-RH-ADR-020-GOVERNANCA-REGULATORIA-PARAMETROS-E-EVOLUCAO.md`  
**Anexo vinculante:** `PROJETO-RH-MODULO-20-ANEXO-A-MATRIZ-DE-GOVERNANCA-E-CALENDARIO.md`

---

## 1. Finalidade

Este módulo define como o Projeto RH será administrado e atualizado depois que existirem versões implantadas.

Abrange:

- ownership funcional, técnico e de dados;
- catálogo de fontes oficiais;
- mudança regulatória;
- parâmetros e fórmulas versionados;
- calendário legal e operacional;
- administração crítica e maker-checker;
- recertificação de acessos;
- break-glass;
- segredos, certificados e procurações;
- fornecedores e integrações;
- retenção e legal hold;
- revisão de políticas;
- incidentes e problemas;
- melhoria contínua;
- descontinuação de versões e funcionalidades.

Este documento não altera regras atuais, não publica parâmetros e não executa monitoramento regulatório.

---

## 2. Modelo de governança

A governança possuirá papéis independentes, acumuláveis apenas quando o risco permitir:

| Papel | Responsabilidade |
|---|---|
| Product Owner RH | prioridade, valor e capacidade funcional |
| Domain Owner | semântica e regra do bounded context |
| Data Owner | qualidade, classificação e uso do dado |
| Regulatory Steward | fontes oficiais, mudança e rastreabilidade regulatória |
| Payroll Owner | regras de cálculo, fechamento e reconciliação |
| SST Owner | riscos, saúde ocupacional e controles sensíveis |
| Compliance Owner | obrigações digitais e relação com sistemas externos |
| Platform Owner | arquitetura, disponibilidade e evolução técnica |
| Security Owner | autorização, segurança, vulnerabilidades e incidentes |
| Privacy Owner | finalidade, minimização, retenção e direitos do titular |
| Integration Owner | provider, contrato, health e mudanças externas |
| Release Owner | release candidate, rollout e operação assistida |
| Evidence Reviewer | revisão independente de evidência crítica |

A existência do papel no documento não atribui automaticamente uma pessoa real.

---

## 3. Fórum de governança

A operação deverá possuir um fórum regular e um caminho de decisão emergencial.

Pauta mínima do fórum regular:

1. mudanças regulatórias abertas;
2. obrigações futuras e deadlines;
3. parâmetros com vigência próxima;
4. certificados e procurações próximos de expirar;
5. acessos privilegiados e exceções;
6. incidentes e problemas recorrentes;
7. SLOs e alertas relevantes;
8. fornecedores degradados;
9. findings de segurança e privacidade;
10. mudanças programadas;
11. dívida técnica prioritária;
12. adoção e necessidades de usuários;
13. evidências que venceram ou foram invalidadas;
14. decisões e owners pendentes.

Cadência numérica não será inventada nesta fase; ela será definida conforme criticidade e capacidade operacional.

---

## 4. Registro regulatório

Cada fonte oficial será registrada em um catálogo versionado.

Campos conceituais:

```text
source_id
authority
jurisdiction
subject
artifact_type
official_identifier
canonical_location
published_at
captured_at
effective_from
effective_to
version
content_hash
supersedes_source_id
status
analysis_owner
notes
```

Estados:

```text
OBSERVED
VALIDATING
VALID
SUPERSEDED
REVOKED
NOT_APPLICABLE
```

O conteúdo bruto poderá ser armazenado em Storage privado ou repositório de evidências conforme classificação e licença.

---

## 5. Pipeline de mudança regulatória

```text
Detecção
  → validação da fonte
    → triagem
      → análise jurídica/funcional
        → aplicabilidade
          → impacto técnico e de dados
            → plano de mudança
              → implementação/configuração
                → testes
                  → reconciliação
                    → aprovação
                      → vigência
                        → monitoramento
```

A detecção poderá ser automatizada. A interpretação e autorização de mudança crítica serão humanas.

---

## 6. Classes de mudança regulatória

| Classe | Exemplo | Tratamento |
|---|---|---|
| R0 | publicação informativa sem efeito | registrar e encerrar |
| R1 | texto/manual sem mudança material | revisão documental |
| R2 | parâmetro ou código externo | nova versão + testes |
| R3 | regra de cálculo, prazo ou integração | análise completa + shadow/reconciliação |
| R4 | mudança legal crítica ou efeito financeiro amplo | revisão independente + gate reforçado + plano de implantação |

Risco regulatório será combinado com a classificação Q0–Q4 do Módulo 18.

---

## 7. Impact assessment

Toda mudança R2+ deverá verificar impacto em:

- pessoas e vínculos;
- contratos;
- jornada;
- férias e afastamentos;
- benefícios;
- SST;
- folha;
- desligamentos;
- eSocial;
- DCTFWeb;
- FGTS Digital;
- Financeiro;
- Contabilidade;
- documentos e demonstrativos;
- relatórios e analytics;
- APIs e adapters;
- schemas e migrations;
- RLS e capacidades;
- dados históricos;
- datasets dourados;
- testes e evidências;
- treinamento e comunicação.

Resultado sem impacto deverá possuir justificativa.

---

## 8. Versionamento de regras e parâmetros

Toda regra de alto impacto terá uma identidade lógica estável e versões imutáveis.

```text
rule_key
  → version 1 [vigência A]
  → version 2 [vigência B]
  → version 3 [vigência C]
```

Uma versão publicada não será editada para representar outra vigência.

Alteração em produção seguirá:

```text
DRAFT
  → UNDER_REVIEW
    → APPROVED
      → SCHEDULED
        → EFFECTIVE
          → SUPERSEDED
```

Possíveis estados adicionais:

```text
REJECTED
CANCELLED
EMERGENCY
```

---

## 9. Configuração administrativa

Configurações serão agrupadas por domínio e risco.

### 9.1 Configuração comum

Pode incluir descrições, preferências de interface e cadastros auxiliares sem efeito histórico crítico.

### 9.2 Configuração sensível

Pode incluir políticas de benefícios, regras de aprovação, parâmetros operacionais ou visibilidade.

### 9.3 Configuração crítica

Pode incluir:

- rubricas;
- incidências;
- fórmulas;
- parâmetros monetários;
- regras de fechamento;
- códigos de obrigação;
- certificados ativos;
- endpoints produtivos;
- políticas de retenção;
- calendário oficial;
- perfis de acesso privilegiado.

Configuração crítica exigirá maker-checker e evidência de teste proporcional ao risco.

---

## 10. Calendário legal

O calendário será calculado a partir de definições versionadas de obrigação.

Entidades conceituais:

- obrigação;
- versão da obrigação;
- população aplicável;
- evento gerador;
- competência;
- regra de vencimento;
- calendário de dias úteis;
- exceção oficial;
- deadline calculado;
- janela interna de preparação;
- responsável;
- evidência de cumprimento;
- atraso ou exceção.

O sistema deverá distinguir prazo legal de prazo interno.

```text
Prazo interno de preparação
  < prazo de revisão
    < prazo de autorização
      < deadline externo
```

Sem inventar offsets fixos nesta especificação.

---

## 11. Calendários e dias úteis

Um calendário deverá possuir:

- jurisdição;
- localidade quando relevante;
- timezone;
- finais de semana;
- feriados;
- dias excepcionais;
- origem da informação;
- versão;
- vigência.

Mudança retroativa em calendário não alterará silenciosamente deadlines já fechados; deverá gerar reconciliação.

---

## 12. Alertas de obrigação

Alertas deverão ser derivados de deadlines e risco.

Estados sugeridos:

```text
UPCOMING
IN_PREPARATION
READY_FOR_REVIEW
READY_FOR_SUBMISSION
SUBMITTED
ACCEPTED
RECONCILED
OVERDUE
BLOCKED
NOT_APPLICABLE
```

`SUBMITTED` não equivale a `ACCEPTED`; `ACCEPTED` não equivale a `RECONCILED`.

---

## 13. Recertificação de acessos

O processo deverá cobrir:

- membros com acesso ao RH;
- perfis múltiplos;
- overrides;
- acesso a folha;
- acesso a SST clínico;
- acesso judicial;
- administração de obrigações;
- exportação de dados;
- Service Role e automações técnicas;
- acessos de fornecedores;
- acessos temporários.

Eventos que exigem revisão imediata:

- desligamento;
- mudança de função;
- mudança de organização;
- incidente;
- suspeita de comprometimento;
- término de contrato de terceiro;
- retirada da necessidade operacional.

---

## 14. Break-glass

Acesso emergencial deverá:

- ser excepcional;
- possuir razão;
- possuir escopo mínimo;
- possuir duração ou expiração;
- ser auditado;
- gerar alerta;
- ser revisado posteriormente;
- não ser usado como perfil operacional normal.

Quando tecnicamente possível, haverá dupla autorização para contextos Q4.

---

## 15. Certificados, procurações e credenciais

O inventário operacional deverá controlar:

- finalidade;
- owner;
- ambiente;
- entidade representada;
- emissor;
- data de emissão;
- expiração;
- fingerprint/serial não secreto;
- relação com provider;
- estado de renovação;
- teste pós-rotação;
- contingência.

O valor secreto, chave privada ou token não será salvo no catálogo de governança.

---

## 16. Rotação

```text
Inventário
  → aviso de expiração
    → emissão/renovação
      → instalação em ambiente controlado
        → teste
          → ativação
            → verificação
              → retirada da credencial antiga
                → evidência
```

Quando o provider permitir, coexistência temporária reduzirá risco de troca abrupta.

---

## 17. Governança de fornecedores

Cada provider deverá possuir:

- criticidade;
- owner;
- contrato e contato;
- autenticação;
- ambiente sandbox/prod;
- versão de API;
- limites;
- health check;
- SLO/expectativa contratual quando houver;
- plano de indisponibilidade;
- retry e idempotência;
- reconciliação;
- processo de incidente;
- data de revisão.

Mudança contratual ou técnica relevante abrirá change record.

---

## 18. Privacidade e retenção

Cada categoria de dados deverá possuir política governada.

Exemplos:

- cadastro pessoal;
- vínculo e contrato;
- folha;
- jornada;
- benefício;
- SST operacional;
- conteúdo clínico;
- conteúdo judicial;
- documentos;
- payload externo;
- audit trail;
- observabilidade;
- evidence packages.

A política definirá condição de retenção e descarte sem presumir que todos os dados compartilham o mesmo prazo.

---

## 19. Legal hold

Legal hold terá:

- identificador;
- fundamento e finalidade;
- escopo;
- objetos alcançados;
- início;
- responsável;
- status;
- revisão;
- término autorizado.

Enquanto ativo, o hold suspenderá descarte aplicável sem permitir alteração destrutiva do histórico.

---

## 20. Qualidade de dados contínua

Serão monitorados, conforme domínio:

- completude;
- validade;
- unicidade;
- integridade referencial;
- consistência temporal;
- reconciliação entre contextos;
- divergência externa;
- registros órfãos;
- dados sem owner;
- parâmetros vencidos;
- certificados próximos do vencimento;
- obrigações sem responsável.

Qualidade baixa gerará issue ou incidente conforme impacto.

---

## 21. Problema e incidente

```text
Evento
  → alerta
    → incidente
      → contenção
        → recuperação
          → análise de causa
            → problema
              → ação corretiva/preventiva
                → mudança
                  → verificação
```

Nem todo erro vira incidente; nem todo incidente prova a causa raiz.

---

## 22. Post-incident review

Incidentes materiais deverão registrar:

- impacto;
- timeline;
- detecção;
- resposta;
- causa ou fatores contribuintes;
- controles que falharam;
- evidências;
- ações corretivas;
- ações preventivas;
- owners;
- critérios de encerramento.

O objetivo será melhorar sistema e processo, não apagar evidências.

---

## 23. Melhoria contínua

Entradas serão priorizadas por:

- risco;
- impacto legal/financeiro;
- frequência;
- alcance;
- esforço;
- reversibilidade;
- impacto no usuário;
- custo operacional;
- qualidade da evidência;
- prazo regulatório.

A priorização produzirá backlog explícito.

---

## 24. Gestão de versão

Cada release futuro deverá saber:

- quais fontes regulatórias suporta;
- quais versões de regras estão disponíveis;
- quais estão efetivas;
- quais adapters são compatíveis;
- quais migrations são necessárias;
- quais features estão ativadas;
- quais limitações são conhecidas.

Versão do software e versão da regra não serão confundidas.

---

## 25. Depreciação

Funcionalidade, API, rule version ou adapter obsoleto seguirá:

```text
ACTIVE
  → DEPRECATED
    → READ_ONLY/COMPATIBILITY
      → DISABLED_FOR_NEW_USE
        → RETIRED
```

Aposentadoria dependerá de ausência de consumidores, retenção adequada e caminho de consulta histórica.

---

## 26. Dados históricos

O sistema deverá continuar explicando:

- qual regra calculou um resultado;
- qual versão estava vigente;
- qual fonte justificava a regra;
- quais parâmetros foram usados;
- qual release executou o cálculo;
- quem aprovou;
- quais retificações posteriores ocorreram.

---

## 27. Fontes oficiais baseline em 07/08/2026

A especificação deve acompanhar, entre outras fontes oficiais:

- portal de documentação técnica do eSocial;
- leiautes e XSDs oficiais do eSocial;
- manuais e notas oficiais do FGTS Digital;
- página oficial da DCTFWeb e seus manuais/leiautes;
- textos vigentes das Normas Regulamentadoras do MTE;
- atos legais e regulamentares aplicáveis;
- publicações oficiais de privacidade e proteção de dados aplicáveis.

Como exemplo da necessidade de versionamento, a documentação técnica oficial consultada em agosto de 2026 apresenta o eSocial S-1.3 consolidado com alterações de 2026 e o FGTS Digital publica manual 1.70. Esses identificadores são baseline de análise, não constantes permanentes do software.

---

## 28. Requisitos de governança — GOV-001 a GOV-120

### Ownership e decisão — GOV-001 a GOV-015

1. GOV-001 — bounded context deverá possuir owner funcional.
2. GOV-002 — dado sensível deverá possuir data owner.
3. GOV-003 — integração externa deverá possuir integration owner.
4. GOV-004 — regra de folha deverá possuir payroll owner.
5. GOV-005 — mudança regulatória deverá possuir steward.
6. GOV-006 — release deverá possuir release owner.
7. GOV-007 — owner deverá ser registrável e substituível.
8. GOV-008 — ausência de owner bloqueará publicação crítica.
9. GOV-009 — decisão crítica deverá registrar aprovador.
10. GOV-010 — acumulação de papéis deverá respeitar segregação.
11. GOV-011 — owner técnico não substituirá owner funcional.
12. GOV-012 — decisão jurídica deverá registrar responsável qualificado.
13. GOV-013 — evidência crítica deverá possuir revisor.
14. GOV-014 — mudança emergencial deverá possuir revisão posterior.
15. GOV-015 — fórum de governança deverá produzir decisões rastreáveis.

### Fontes e regulação — GOV-016 a GOV-035

16. GOV-016 — fonte regulatória deverá possuir autoridade.
17. GOV-017 — fonte deverá possuir identificador e data de captura.
18. GOV-018 — artifact deverá possuir hash quando preservado.
19. GOV-019 — vigência deverá ser registrada quando conhecida.
20. GOV-020 — substituição entre fontes deverá ser rastreável.
21. GOV-021 — material secundário não substituirá fonte oficial.
22. GOV-022 — detecção automática não autorizará mudança crítica.
23. GOV-023 — toda mudança material terá change record.
24. GOV-024 — change record terá classe R0–R4.
25. GOV-025 — aplicabilidade deverá ser explícita.
26. GOV-026 — R2+ exigirá impact assessment.
27. GOV-027 — conflito entre fontes exigirá análise humana.
28. GOV-028 — interpretação aprovada deverá ser versionada.
29. GOV-029 — fonte retirada não será apagada do histórico.
30. GOV-030 — regra deverá apontar sua fonte.
31. GOV-031 — mudança retroativa deverá ser identificada.
32. GOV-032 — mudança futura deverá suportar ativação por vigência.
33. GOV-033 — versão externa suportada será declarada por release.
34. GOV-034 — fonte vencida deverá ser marcada.
35. GOV-035 — mudança sem efeito deverá poder ser encerrada como não aplicável.

### Parâmetros e calendário — GOV-036 a GOV-055

36. GOV-036 — parâmetro crítico será versionado.
37. GOV-037 — versão publicada será imutável.
38. GOV-038 — parâmetro terá unidade e precisão.
39. GOV-039 — parâmetro terá vigência.
40. GOV-040 — parâmetro terá fonte e justificativa.
41. GOV-041 — mudança crítica terá maker-checker.
42. GOV-042 — regra de prazo será versionada.
43. GOV-043 — deadline será reproduzível.
44. GOV-044 — prazo legal e interno serão separados.
45. GOV-045 — timezone será explícito.
46. GOV-046 — calendário de dias úteis será versionado.
47. GOV-047 — exceção oficial terá fonte.
48. GOV-048 — mudança retroativa de calendário gerará reconciliação.
49. GOV-049 — obrigação terá população aplicável.
50. GOV-050 — obrigação terá owner.
51. GOV-051 — cumprimento terá evidência.
52. GOV-052 — submissão não será confundida com aceitação.
53. GOV-053 — aceitação não será confundida com reconciliação.
54. GOV-054 — atraso terá causa e tratamento.
55. GOV-055 — obrigação não aplicável terá justificativa.

### Administração e acessos — GOV-056 a GOV-075

56. GOV-056 — configuração terá classificação de risco.
57. GOV-057 — configuração crítica não será alterada por escrita direta ad hoc.
58. GOV-058 — alteração crítica terá antes/depois.
59. GOV-059 — alteração crítica terá justificativa.
60. GOV-060 — capabilities existentes serão reutilizadas.
61. GOV-061 — menu não será autorização.
62. GOV-062 — recertificação abrangerá perfis e overrides.
63. GOV-063 — desligamento removerá acesso conforme workflow de segurança.
64. GOV-064 — mudança de função disparará revisão.
65. GOV-065 — acesso temporário terá expiração.
66. GOV-066 — break-glass terá motivo.
67. GOV-067 — break-glass terá escopo mínimo.
68. GOV-068 — break-glass gerará alerta e auditoria.
69. GOV-069 — acesso clínico será revisado separadamente.
70. GOV-070 — acesso judicial será revisado separadamente.
71. GOV-071 — acesso a folha terá segregação adequada.
72. GOV-072 — acesso de terceiro terá owner interno.
73. GOV-073 — treinamento não concederá acesso.
74. GOV-074 — override negado terá precedência conforme núcleo modular.
75. GOV-075 — mudança administrativa integrará `permission_change_events` quando aplicável.

### Credenciais e fornecedores — GOV-076 a GOV-090

76. GOV-076 — segredo não será salvo em configuração comum.
77. GOV-077 — certificado terá owner e expiração.
78. GOV-078 — procuração terá escopo e validade.
79. GOV-079 — token terá referência segura ao cofre.
80. GOV-080 — rotação terá procedimento testado.
81. GOV-081 — credencial antiga será retirada após validação.
82. GOV-082 — expiração próxima deverá ser observável.
83. GOV-083 — provider terá criticidade.
84. GOV-084 — provider terá health check quando tecnicamente possível.
85. GOV-085 — provider terá plano de indisponibilidade.
86. GOV-086 — mudança de API abrirá change record.
87. GOV-087 — versão de API suportada será registrada.
88. GOV-088 — retries respeitarão idempotência.
89. GOV-089 — resposta externa incerta exigirá reconciliação.
90. GOV-090 — credencial produtiva não será usada em ambiente inadequado.

### Privacidade, retenção e qualidade — GOV-091 a GOV-105

91. GOV-091 — categoria de dado terá classificação.
92. GOV-092 — política de retenção terá owner.
93. GOV-093 — descarte terá condição explícita.
94. GOV-094 — legal hold suspenderá descarte aplicável.
95. GOV-095 — hold terá início e término autorizados.
96. GOV-096 — dado clínico terá governança própria.
97. GOV-097 — dado judicial terá governança própria.
98. GOV-098 — audit trail terá retenção apropriada.
99. GOV-099 — logs não conterão segredos desnecessários.
100. GOV-100 — qualidade de dados será monitorável.
101. GOV-101 — parâmetro vencido será detectável.
102. GOV-102 — obrigação sem owner será detectável.
103. GOV-103 — órfão ou inconsistência gerará tratamento.
104. GOV-104 — reconciliação externa será mensurável.
105. GOV-105 — descarte não apagará evidência sujeita a hold.

### Evolução contínua — GOV-106 a GOV-120

106. GOV-106 — incidente material poderá gerar problem record.
107. GOV-107 — post-incident review terá ações rastreáveis.
108. GOV-108 — ação corretiva terá owner.
109. GOV-109 — ação preventiva terá verificação.
110. GOV-110 — finding de segurança entrará no backlog governado.
111. GOV-111 — dívida técnica terá criticidade.
112. GOV-112 — melhoria terá hipótese de valor ou risco.
113. GOV-113 — depreciação terá etapas explícitas.
114. GOV-114 — versão aposentada continuará explicável historicamente.
115. GOV-115 — release declarará regras e adapters suportados.
116. GOV-116 — software version e rule version serão independentes.
117. GOV-117 — evidência invalidada deverá ser reexecutada quando necessária.
118. GOV-118 — mudança material atualizará documentação canônica.
119. GOV-119 — decisões de governança alimentarão planejamento.
120. GOV-120 — operação contínua não será declarada implementada por esta especificação.

---

## 29. Regras de governança — GR-001 a GR-080

1. GR-001 — nenhuma fonte sem procedência será usada como baseline crítica.
2. GR-002 — nenhuma regra vencida será atualizada por edição da versão histórica.
3. GR-003 — nenhuma mudança crítica será autoaprovada.
4. GR-004 — nenhuma interpretação legal será inferida apenas por diff textual.
5. GR-005 — nenhuma regra futura afetará fatos passados sem processo explícito.
6. GR-006 — nenhuma regra retroativa será aplicada sem reconciliação.
7. GR-007 — nenhuma fórmula publicada será alterada destrutivamente.
8. GR-008 — nenhum parâmetro financeiro usará float.
9. GR-009 — nenhum deadline dependerá apenas de string fixa em UI.
10. GR-010 — nenhum prazo externo será apresentado como cumprido por simples envio.
11. GR-011 — nenhuma obrigação sem owner poderá chegar silenciosamente ao vencimento.
12. GR-012 — nenhum alerta sem ação esperada será tratado como crítico.
13. GR-013 — nenhuma alteração Q4 será aprovada pelo mesmo ator em todas as etapas.
14. GR-014 — nenhum break-glass será permanente.
15. GR-015 — nenhum acesso temporário ficará sem expiração.
16. GR-016 — nenhum acesso será concedido por conclusão de treinamento.
17. GR-017 — nenhum acesso privilegiado dependerá só de menu oculto.
18. GR-018 — nenhum override escapará da recertificação.
19. GR-019 — nenhum segredo será documentado em Markdown.
20. GR-020 — nenhuma chave privada será armazenada como metadado comum.
21. GR-021 — nenhum certificado será renovado sem teste.
22. GR-022 — nenhuma credencial antiga será removida antes da confirmação da nova quando coexistência for possível.
23. GR-023 — nenhum provider crítico ficará sem owner.
24. GR-024 — nenhuma mudança externa relevante será tratada como detalhe invisível.
25. GR-025 — nenhum retry cego será executado após resposta incerta.
26. GR-026 — nenhum log carregará prontuário ou payload sensível integral por conveniência.
27. GR-027 — nenhuma política de retenção única será presumida para todo RH.
28. GR-028 — nenhum descarte ocorrerá contra legal hold ativo.
29. GR-029 — nenhum hold será encerrado sem autorização.
30. GR-030 — nenhuma inconsistência de dados será corrigida silenciosamente em lote crítico.
31. GR-031 — nenhuma reconciliação será considerada aprovada apenas por igualdade do total geral.
32. GR-032 — nenhum incidente será encerrado apenas porque o serviço voltou.
33. GR-033 — nenhuma causa raiz será declarada sem evidência suficiente.
34. GR-034 — nenhuma ação preventiva será considerada concluída sem verificação.
35. GR-035 — nenhuma depreciação removerá consulta histórica necessária.
36. GR-036 — nenhum adapter antigo será desligado antes da ausência de consumidores.
37. GR-037 — nenhum release ocultará limitações conhecidas materiais.
38. GR-038 — nenhuma versão de software implicará automaticamente versão legal.
39. GR-039 — nenhuma versão legal implicará automaticamente deployment.
40. GR-040 — nenhuma mudança urgente dispensará registro posterior.
41. GR-041 — fonte oficial capturada deverá manter data de captura.
42. GR-042 — hash de artifact não provará autenticidade jurídica sozinho.
43. GR-043 — change record deverá apontar requisito e teste afetados.
44. GR-044 — mudança regulatória sem impacto deverá possuir justificativa.
45. GR-045 — regra de prazo deverá permitir teste determinístico.
46. GR-046 — dias úteis deverão possuir calendário identificável.
47. GR-047 — timezone deverá ser explícito em deadlines.
48. GR-048 — feriado local deverá ter escopo adequado.
49. GR-049 — exceção temporária deverá possuir início e fim.
50. GR-050 — parâmetro deverá registrar valor anterior e novo quando alterado.
51. GR-051 — configuração crítica deverá permitir revisão antes da publicação.
52. GR-052 — aplicação de parâmetro deverá registrar quem publicou.
53. GR-053 — capability de administração não dará acesso clínico automaticamente.
54. GR-054 — capability clínica não dará administração de folha automaticamente.
55. GR-055 — Service Role continuará restrita ao servidor.
56. GR-056 — job privilegiado deverá possuir finalidade limitada.
57. GR-057 — acesso de fornecedor será minimizado.
58. GR-058 — expiração de fornecedor ou contrato disparará revisão de acesso.
59. GR-059 — rotação emergencial deverá gerar incidente/change record.
60. GR-060 — observabilidade de expiração não armazenará segredo.
61. GR-061 — retenção deverá considerar dados derivados e artifacts.
62. GR-062 — analytics deverá respeitar retenção e anonimização aplicável.
63. GR-063 — evidência de fonte terá política de retenção própria.
64. GR-064 — histórico de cálculo permanecerá reproduzível.
65. GR-065 — retificação não apagará cálculo anterior.
66. GR-066 — obrigação superseded permanecerá consultável historicamente.
67. GR-067 — novo manual não substituirá automaticamente regra implementada.
68. GR-068 — diferença entre manual e sistema deverá abrir análise.
69. GR-069 — backlog regulatório terá prioridade compatível com vigência.
70. GR-070 — risco de perda de prazo poderá antecipar release sem dispensar gate mínimo.
71. GR-071 — emergência terá escopo reduzido.
72. GR-072 — feature flag não substituirá autorização.
73. GR-073 — configuração global deverá ser evitada quando houver escopo por tenant.
74. GR-074 — mudança por tenant deverá manter versão e histórico.
75. GR-075 — decisão do fórum deverá registrar owner e prazo de ação quando aplicável.
76. GR-076 — decisão cancelada permanecerá auditável.
77. GR-077 — melhoria contínua não alterará fato histórico sem regra de correção.
78. GR-078 — depreciação deverá ser comunicável aos consumidores.
79. GR-079 — documentação canônica deverá refletir estado implantado.
80. GR-080 — nenhuma regra deste módulo será considerada executada sem evidência de implementação.

---

## 30. Critérios de aceite — GA-001 a GA-055

1. GA-001 — modelo de ownership definido.
2. GA-002 — segregação de papéis críticos definida.
3. GA-003 — registro de fonte oficial definido.
4. GA-004 — estados de fonte definidos.
5. GA-005 — pipeline regulatório definido.
6. GA-006 — classes R0–R4 definidas.
7. GA-007 — impact assessment definido.
8. GA-008 — vínculo fonte-regra definido.
9. GA-009 — tratamento de retroatividade definido.
10. GA-010 — vigência independente de deployment definida.
11. GA-011 — parâmetro versionado definido.
12. GA-012 — lifecycle de parâmetro definido.
13. GA-013 — maker-checker definido.
14. GA-014 — calendário legal derivado definido.
15. GA-015 — prazo legal x interno separado.
16. GA-016 — calendário de dias úteis versionado.
17. GA-017 — exceções oficiais com fonte.
18. GA-018 — estados de obrigação definidos.
19. GA-019 — cumprimento e reconciliação separados.
20. GA-020 — recertificação de acessos definida.
21. GA-021 — gatilhos imediatos de revisão definidos.
22. GA-022 — break-glass definido.
23. GA-023 — acesso temporário com expiração.
24. GA-024 — reutilização do núcleo modular definida.
25. GA-025 — inventário de certificados definido.
26. GA-026 — segredo separado do metadado.
27. GA-027 — fluxo de rotação definido.
28. GA-028 — governança de providers definida.
29. GA-029 — mudança de API externa governada.
30. GA-030 — retenção por categoria definida.
31. GA-031 — legal hold definido.
32. GA-032 — qualidade contínua definida.
33. GA-033 — incident x problem separados.
34. GA-034 — post-incident review definido.
35. GA-035 — ações corretivas e preventivas rastreáveis.
36. GA-036 — backlog de melhoria governado.
37. GA-037 — software x rule version separados.
38. GA-038 — lifecycle de depreciação definido.
39. GA-039 — consulta histórica preservada.
40. GA-040 — release declara fontes/regras suportadas.
41. GA-041 — baseline oficial de fontes documentada.
42. GA-042 — 120 requisitos registrados.
43. GA-043 — 80 regras registradas.
44. GA-044 — 55 critérios registrados.
45. GA-045 — matriz operacional vinculante definida.
46. GA-046 — nenhum crawler declarado implementado.
47. GA-047 — nenhum job regulatório declarado executado.
48. GA-048 — nenhum parâmetro produtivo alterado.
49. GA-049 — nenhum acesso real recertificado por este documento.
50. GA-050 — nenhum certificado real manipulado.
51. GA-051 — nenhum legal hold real criado.
52. GA-052 — nenhuma política de retenção executada.
53. GA-053 — nenhuma mudança regulatória aplicada automaticamente.
54. GA-054 — nenhum gate produtivo aprovado por esta documentação.
55. GA-055 — estado permanece especificação, sem implementação.

---

## 31. Ondas futuras de governança

```text
GOV-W0 — ownership, fontes e registry
GOV-W1 — parâmetros e calendário
GOV-W2 — administração e recertificação
GOV-W3 — certificados, providers e retenção
GOV-W4 — automação regulatória assistida
GOV-W5 — operação contínua e otimização
```

Cada onda dependerá dos gates técnicos e operacionais correspondentes.

---

## 32. Estado honesto

O módulo conclui o desenho de governança, mas não implementa operação contínua.

Não existem ainda, específicos do RH:

- regulatory source registry executável;
- monitor de fontes oficiais;
- regras de calendário no banco;
- jobs de deadline;
- painel de parâmetros versionados;
- workflow maker-checker;
- recertificação automatizada;
- break-glass do RH;
- inventário executável de certificados;
- alertas de expiração;
- retention jobs;
- legal holds;
- problem management automatizado;
- backlog regulatório integrado.
