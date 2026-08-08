# Projeto RH — Módulo 14 — Backlog Executável, Épicos, Sprints, Dependências, Gates e Plano de Homologação

**Versão:** 0.1.0  
**Estado:** planejamento executável inicial concluído; implementação não iniciada  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**ADR vinculante:** `PROJETO-RH-ADR-014-PLANO-EXECUCAO-EVIDENCIA-E-LIBERACAO.md`

---

## 1. Finalidade

Este documento transforma a especificação funcional dos módulos 01 a 12 e a arquitetura técnica do Módulo 13 em uma sequência executável, rastreável e bloqueada por evidências.

O documento não estima datas. Os identificadores de sprint representam ordem lógica e poderão ser replanejados depois que equipe, capacidade, ambientes e dependências forem confirmados.

---

## 2. Resultado esperado

```text
Especificação aprovada
  → backlog refinado
    → base confiável
      → incrementos verticais
        → testes e evidências
          → homologação por onda
            → piloto controlado
              → produção gradual
                → operação assistida
                  → estabilização
```

O backlog deverá permitir que qualquer item responda:

- por que existe;
- qual requisito atende;
- qual contexto é proprietário;
- do que depende;
- quem pode executar e aprovar;
- que dados toca;
- que migration exige;
- como será testado;
- qual evidência prova o resultado;
- qual gate autoriza o avanço;
- como será revertido ou desabilitado.

---

## 3. Convenções

### 3.1 Identificadores

- `EP-RH-xx`: épico;
- `US-RH-xxx`: história de usuário;
- `EN-RH-xxx`: enabler técnico;
- `SP-RH-xxx`: spike;
- `DF-RH-xxx`: defeito;
- `RK-RH-xxx`: risco;
- `GT-RH-xx`: gate;
- `Sxx`: sprint lógica;
- `EV-RH-xxx`: evidência.

### 3.2 Tamanho relativo

- `XS`: alteração local e de baixo risco;
- `S`: incremento pequeno com testes diretos;
- `M`: fluxo vertical limitado;
- `L`: fluxo com múltiplas camadas ou integrações;
- `XL`: item que deve ser dividido antes da execução.

### 3.3 Prioridade

- `P0`: bloqueia início, segurança ou integridade;
- `P1`: necessário para a onda atual;
- `P2`: necessário para onda posterior;
- `P3`: evolução não bloqueante.

### 3.4 Estados

`PROPOSED`, `REFINING`, `READY`, `IN_PROGRESS`, `BLOCKED`, `IMPLEMENTED`, `VERIFIED`, `HOMOLOGATED`, `ACCEPTED`, `RELEASED`, `STABILIZED`, `CANCELLED`, `SUPERSEDED`, `ROLLED_BACK`.

---

## 4. Definition of Ready

Uma história somente poderá receber `READY` quando:

- [ ] objetivo e valor estão claros;
- [ ] módulo, ADR e requisitos vinculados estão identificados;
- [ ] contexto proprietário está definido;
- [ ] escopo e não escopo estão explícitos;
- [ ] atores, capacidades e escopos estão definidos;
- [ ] dados de entrada, saída e temporalidade estão definidos;
- [ ] estados e transições estão definidos;
- [ ] critérios de aceite são verificáveis;
- [ ] dependências não possuem ciclo;
- [ ] migration e backfill foram avaliados;
- [ ] RLS, grants e sensibilidade foram avaliados;
- [ ] concorrência e idempotência foram avaliadas;
- [ ] testes e fixtures foram planejados;
- [ ] evidência esperada foi definida;
- [ ] rollback, reversão ou feature flag foram definidos;
- [ ] item não está em tamanho `XL` sem justificativa de spike.

---

## 5. Definition of Done

### 5.1 Incremento comum

- [ ] código e migrations revisados;
- [ ] contracts e validações tipados;
- [ ] testes unitários aprovados;
- [ ] testes de integração aprovados;
- [ ] testes negativos de autorização aprovados;
- [ ] RLS e grants validados;
- [ ] logs sanitizados;
- [ ] auditoria e correlação implementadas;
- [ ] documentação e inventário atualizados;
- [ ] CI verde;
- [ ] evidência preservada;
- [ ] aceite funcional registrado.

### 5.2 Incremento crítico

Além do item comum:

- [ ] teste SQL com `ROLLBACK`;
- [ ] teste concorrente ou de idempotência;
- [ ] cleanup aprovado;
- [ ] rollback ou compensação demonstrados;
- [ ] segregação de funções verificada;
- [ ] acesso `anon` e cliente externo negado;
- [ ] runbook criado;
- [ ] gate formal aprovado.

### 5.3 Produção

Além dos anteriores:

- [ ] backup e restauração relevantes testados;
- [ ] feature flag e plano de desativação testados;
- [ ] métricas e alertas ativos;
- [ ] suporte e escalonamento definidos;
- [ ] decisão `GO`, `NO_GO` ou `CONDITIONAL_GO` registrada;
- [ ] operação assistida concluída;
- [ ] incidentes críticos encerrados;
- [ ] critérios de estabilização atendidos.

---

## 6. Gates

| Gate | Objetivo | Bloqueios mínimos de saída |
|---|---|---|
| `G00` | Base confiável | branch reconciliada, PR mesclável, CI confiável, vacinas e ledger válidos, ambientes e responsáveis confirmados |
| `G01` | Fundação segura | módulo, capabilities, schemas, RLS, auditoria, outbox e Storage base homologados |
| `G02` | Cadastro canônico | pessoa, trabalhador, empresa, estabelecimento, estrutura e migração de legados reconciliados |
| `G03` | Ciclo contratual | admissão, vínculo, contrato, documentos e alterações homologados |
| `G04` | Operação trabalhista | ponto, férias, afastamentos, benefícios e SST homologados |
| `G05` | Folha sombra | rubricas, fórmulas, parâmetros, cálculo sombra e reconciliação aprovados |
| `G06` | Obrigações restritas | projeções, certificados, transmissão restrita, recibos e reconciliação aprovados |
| `G07` | Folha oficial controlada | fechamento, pagamento, contabilização e contingência aprovados para piloto |
| `G08` | Encerramento e gestão | desligamentos, offboarding, relatórios essenciais e planejamento homologados |
| `G09` | Produção | segurança, carga, backup, rollback, privacidade, aceite e runbooks aprovados |
| `G10` | Estabilização | SLOs atendidos, reconciliações estáveis e incidentes críticos encerrados |

---

## 7. Backlog por épico — 120 itens executáveis

### EP-RH-00 — Governança e saneamento da base

1. **EN-RH-001 — Reconciliar branch do RH com a `main`** (`P0`, `M`): identificar divergências e obter estado mesclável sem apagar documentação.
2. **EN-RH-002 — Investigar falha de mergeabilidade do PR #42** (`P0`, `S`): registrar se decorre de conflito, proteção, base avançada ou estado transitório.
3. **EN-RH-003 — Restaurar CI estrutural confiável** (`P0`, `L`): separar falha preexistente de falha introduzida pelo RH.
4. **EN-RH-004 — Auditar numeração e referências das vacinas** (`P0`, `M`): corrigir em escopo próprio sem renumeração cega.
5. **EN-RH-005 — Validar ledger local e remoto de migrations** (`P0`, `M`): comprovar ausência de timestamp, nome e conteúdo divergentes.
6. **EN-RH-006 — Atualizar inventário canônico da plataforma** (`P0`, `M`): registrar base real antes do primeiro schema RH.
7. **EN-RH-007 — Confirmar ambientes, secrets e identidades técnicas** (`P0`, `M`): desenvolvimento, homologação, produção restrita e produção.
8. **EN-RH-008 — Aprovar matriz de responsáveis e gates** (`P0`, `S`): engenharia, RH, folha, SST, segurança, privacidade, contabilidade e operação.

### EP-RH-01 — Fundação modular, autorização e infraestrutura

9. **EN-RH-009 — Registrar aplicativo `rh` no module registry** (`P1`, `S`).
10. **EN-RH-010 — Criar catálogo de capabilities de domínio** (`P1`, `L`).
11. **EN-RH-011 — Integrar capabilities com `has_module_permission`** (`P1`, `L`).
12. **EN-RH-012 — Criar schemas e convenções de ownership** (`P1`, `M`).
13. **EN-RH-013 — Criar helper de contexto RH autenticado** (`P1`, `M`).
14. **EN-RH-014 — Implementar outbox transacional base** (`P1`, `L`).
15. **EN-RH-015 — Implementar fila, retry, lease e dead letter base** (`P1`, `L`).
16. **EN-RH-016 — Criar bucket privado e metadados documentais RH** (`P1`, `L`).

### EP-RH-02 — Cadastro mestre e identidade canônica

17. **US-RH-017 — Cadastrar pessoa sem exigir usuário** (`P1`, `M`).
18. **US-RH-018 — Criar trabalhador vinculado à pessoa** (`P1`, `M`).
19. **US-RH-019 — Vincular opcionalmente pessoa a usuário** (`P1`, `S`).
20. **US-RH-020 — Gerenciar identificadores e documentos protegidos** (`P1`, `L`).
21. **US-RH-021 — Manter contatos, endereços e dados bancários por finalidade** (`P1`, `L`).
22. **US-RH-022 — Manter relações entre pessoas sem inferir papéis** (`P1`, `M`).
23. **EN-RH-023 — Criar deduplicação assistida e revisão de possíveis duplicatas** (`P1`, `L`).
24. **EN-RH-024 — Migrar e reconciliar integrantes de equipes sem fusão automática** (`P1`, `XL`; dividir por fonte).

### EP-RH-03 — Empresa, estabelecimento e estrutura organizacional

25. **US-RH-025 — Cadastrar empresa empregadora sob a organização** (`P1`, `M`).
26. **US-RH-026 — Cadastrar estabelecimentos e inscrições** (`P1`, `M`).
27. **US-RH-027 — Manter unidades organizacionais temporais** (`P1`, `M`).
28. **US-RH-028 — Manter cargos, funções e classificações** (`P1`, `M`).
29. **US-RH-029 — Manter posições autorizadas e vagas** (`P1`, `L`).
30. **US-RH-030 — Manter lotações e alocações com vigência** (`P1`, `L`).
31. **EN-RH-031 — Reconciliar centro de custo canônico com Financeiro** (`P1`, `L`).
32. **EN-RH-032 — Integrar obra, fase, frente e equipe sem duplicar cadastros** (`P1`, `L`).

### EP-RH-04 — Admissão, vínculo e contrato

33. **US-RH-033 — Abrir caso de pré-admissão** (`P1`, `M`).
34. **US-RH-034 — Aplicar checklist versionado de admissão** (`P1`, `M`).
35. **US-RH-035 — Receber, conferir e rejeitar documentos** (`P1`, `L`).
36. **US-RH-036 — Registrar condições propostas e aprovações** (`P1`, `L`).
37. **US-RH-037 — Ativar vínculo por transação idempotente** (`P1`, `L`).
38. **US-RH-038 — Criar contrato e primeira versão imutável** (`P1`, `L`).
39. **US-RH-039 — Solicitar, aprovar e aplicar alteração contratual** (`P1`, `L`).
40. **US-RH-040 — Tratar alteração futura, retroativa e correção** (`P1`, `XL`; dividir por modalidade).

### EP-RH-05 — Jornada, ponto e banco de horas

41. **US-RH-041 — Cadastrar políticas de jornada e vigência** (`P1`, `L`).
42. **US-RH-042 — Planejar escalas e turnos concretos** (`P1`, `L`).
43. **US-RH-043 — Receber marcações online e offline append-only** (`P1`, `L`).
44. **US-RH-044 — Tratar inconsistências sem alterar marcação original** (`P1`, `L`).
45. **US-RH-045 — Apurar jornada por política versionada** (`P1`, `XL`; dividir por regras).
46. **US-RH-046 — Manter razão imutável do banco de horas** (`P1`, `L`).
47. **US-RH-047 — Fechar e reabrir período de ponto** (`P1`, `L`).
48. **EN-RH-048 — Exportar lote fechado e idempotente para folha** (`P1`, `L`).

### EP-RH-06 — Férias, afastamentos e benefícios

49. **US-RH-049 — Gerar períodos aquisitivos e razão de saldo** (`P1`, `L`).
50. **US-RH-050 — Programar, aprovar e comunicar férias** (`P1`, `L`).
51. **US-RH-051 — Tratar fracionamento, abono, remarcação e cancelamento** (`P1`, `XL`; dividir).
52. **US-RH-052 — Registrar ausências e justificativas** (`P1`, `M`).
53. **US-RH-053 — Gerenciar casos de afastamento e retorno** (`P1`, `L`).
54. **US-RH-054 — Manter catálogo, política e elegibilidade de benefícios** (`P1`, `L`).
55. **US-RH-055 — Gerenciar adesões, coberturas e dependentes por finalidade** (`P1`, `L`).
56. **US-RH-056 — Conciliar cobranças, descontos, estornos e fornecedores** (`P1`, `XL`; dividir).

### EP-RH-07 — Segurança e Saúde no Trabalho

57. **US-RH-057 — Manter contextos, perigos e inventários de risco** (`P1`, `L`).
58. **US-RH-058 — Manter avaliações, medições e plano de ação** (`P1`, `L`).
59. **US-RH-059 — Gerenciar grupos e perfis de exposição** (`P1`, `L`).
60. **US-RH-060 — Gerenciar programa médico e necessidades de exame** (`P1`, `L`).
61. **US-RH-061 — Registrar exame, ASO e conclusão operacional segregada** (`P1`, `XL`; dividir clínico/operacional).
62. **US-RH-062 — Gerenciar incidentes, investigação, ações e CAT** (`P1`, `L`).
63. **US-RH-063 — Gerenciar EPI, estoque, entrega, inspeção e troca** (`P1`, `L`).
64. **US-RH-064 — Derivar habilitação por treinamento, aptidão e permissão** (`P1`, `L`).

### EP-RH-08 — Fundação e cálculo sombra da folha

65. **US-RH-065 — Manter calendários, competências e tipos de processamento** (`P1`, `M`).
66. **US-RH-066 — Manter catálogo e versões de rubricas** (`P1`, `L`).
67. **US-RH-067 — Manter parâmetros e tabelas por vigência** (`P1`, `L`).
68. **EN-RH-068 — Implementar DSL declarativa segura de fórmulas** (`P1`, `XL`; dividir parser, tipos e execução).
69. **EN-RH-069 — Construir grafo de dependências e bloquear ciclos** (`P1`, `L`).
70. **US-RH-070 — Coletar e congelar entradas por população e competência** (`P1`, `L`).
71. **EN-RH-071 — Executar cálculo determinístico com memória por linha** (`P1`, `XL`; dividir por motor e resultados).
72. **EN-RH-072 — Executar cálculo sombra e reconciliar legado** (`P1`, `XL`; dividir por competência e população).

### EP-RH-09 — Folha oficial, pagamentos e contabilidade

73. **US-RH-073 — Conferir divergências e bloqueios por trabalhador** (`P1`, `L`).
74. **US-RH-074 — Registrar e aprovar ajustes manuais** (`P1`, `L`).
75. **US-RH-075 — Aprovar execução vinculada a hash** (`P1`, `M`).
76. **US-RH-076 — Fechar e reabrir folha preservando versões** (`P1`, `L`).
77. **US-RH-077 — Gerar demonstrativos protegidos** (`P1`, `L`).
78. **US-RH-078 — Gerar e aprovar lote de pagamento** (`P1`, `L`).
79. **US-RH-079 — Processar retorno bancário e reconciliar liquidação** (`P1`, `L`).
80. **US-RH-080 — Gerar contabilização e rateios reconciliáveis** (`P1`, `XL`; dividir por integração).

### EP-RH-10 — Obrigações digitais e reconciliação governamental

81. **US-RH-081 — Manter catálogo de sistemas, leiautes e eventos** (`P1`, `L`).
82. **US-RH-082 — Projetar evento versionado a partir de fato aprovado** (`P1`, `L`).
83. **US-RH-083 — Validar, aprovar e assinar payload** (`P1`, `L`).
84. **EN-RH-084 — Transmitir com idempotência, retry e estado incerto** (`P1`, `XL`; dividir por adapter).
85. **US-RH-085 — Registrar retorno, recibo e processamento assíncrono** (`P1`, `L`).
86. **US-RH-086 — Retificar, excluir, reabrir e reenviar com linhagem** (`P1`, `XL`; dividir por operação).
87. **US-RH-087 — Reconciliar totalizadores, declaração, débito e guia** (`P1`, `XL`; dividir por sistema).
88. **US-RH-088 — Reconciliar pagamento governamental e pendências** (`P1`, `L`).

### EP-RH-11 — Desligamentos, rescisões e offboarding

89. **US-RH-089 — Abrir caso de desligamento com fundamento e evidências** (`P2`, `L`).
90. **US-RH-090 — Avaliar proteções, impedimentos e aprovações** (`P2`, `L`).
91. **US-RH-091 — Gerenciar aviso, projeção e datas de término** (`P2`, `L`).
92. **US-RH-092 — Calcular rescisão com memória e versões** (`P2`, `XL`; dividir por modalidades).
93. **US-RH-093 — Gerar documentos, assinatura e ciência** (`P2`, `L`).
94. **US-RH-094 — Processar pagamento, FGTS e eventos externos** (`P2`, `XL`; dividir por integração).
95. **US-RH-095 — Executar offboarding de acessos, ativos e responsabilidades** (`P2`, `L`).
96. **US-RH-096 — Tratar reintegração e diferenças posteriores** (`P2`, `L`).

### EP-RH-12 — Relatórios, People Analytics e planejamento

97. **EN-RH-097 — Criar catálogo e versões de métricas** (`P2`, `L`).
98. **EN-RH-098 — Criar contratos de fonte, qualidade e linhagem** (`P2`, `L`).
99. **EN-RH-099 — Gerar observações, snapshots e supressões** (`P2`, `L`).
100. **US-RH-100 — Publicar relatórios operacionais essenciais** (`P2`, `L`).
101. **US-RH-101 — Publicar dashboards agregados e exportações auditadas** (`P2`, `L`).
102. **US-RH-102 — Planejar demanda, capacidade e lacunas por obra** (`P2`, `XL`; dividir por cenário).
103. **EN-RH-103 — Governar modelos, explicabilidade, viés e drift** (`P3`, `XL`; iniciar por spike).
104. **US-RH-104 — Registrar recomendação, revisão e decisão humana** (`P3`, `L`).

### EP-RH-13 — Hardening, produção e operação assistida

105. **EN-RH-105 — Executar revisão de segurança e threat model** (`P0`, `L`).
106. **EN-RH-106 — Executar testes de carga e volumetria** (`P0`, `L`).
107. **EN-RH-107 — Executar testes de concorrência e caos controlado** (`P0`, `L`).
108. **EN-RH-108 — Validar backup, restauração e recuperação de documentos** (`P0`, `L`).
109. **EN-RH-109 — Validar retenção, legal hold e descarte** (`P0`, `L`).
110. **EN-RH-110 — Validar acessibilidade e responsividade** (`P1`, `M`).
111. **EN-RH-111 — Executar revisão jurídica, contábil, SST e LGPD** (`P0`, `L`).
112. **EN-RH-112 — Preparar rollout, feature flags, runbooks e treinamento** (`P0`, `L`).

### EP-RH-14 — Estabilização e evolução contínua

113. **EN-RH-113 — Operar piloto com organizações e população limitadas** (`P1`, `L`).
114. **EN-RH-114 — Monitorar SLOs, erros, jobs e reconciliações** (`P1`, `L`).
115. **EN-RH-115 — Triar incidentes e registrar post-mortems** (`P1`, `M`).
116. **EN-RH-116 — Criar vacinas para falhas relevantes** (`P1`, `M`).
117. **EN-RH-117 — Medir adoção, retrabalho e qualidade dos dados** (`P2`, `M`).
118. **EN-RH-118 — Reavaliar capacidade, custos e roadmap** (`P2`, `M`).
119. **EN-RH-119 — Avaliar extração de workers ou analytics por evidência de escala** (`P3`, `L`).
120. **EN-RH-120 — Encerrar operação assistida e aprovar estabilização** (`P1`, `M`).

---

## 8. Sequência de sprints lógicas

| Sprint | Objetivo | Itens principais | Dependência | Gate/Evidência de saída |
|---|---|---|---|---|
| `S00` | sanear base e planejamento | 001–008 | nenhuma | `G00` |
| `S01` | registry, capabilities e schemas | 009–013 | G00 | módulo navegável sem dado de negócio; testes de permissão |
| `S02` | outbox, jobs e Storage base | 014–016 | S01 | G01 parcial; teste idempotente e arquivo privado |
| `S03` | pessoa e trabalhador | 017–024, primeira parte | G01 | cadastro e deduplicação homologados |
| `S04` | empresa e estabelecimento | 025–026 | S03 | estruturas empregadoras com RLS |
| `S05` | organização, posição e lotação | 027–032 | S04 | G02; reconciliação com Obras e Financeiro |
| `S06` | pré-admissão e documentos | 033–036 | G02 | caso auditável e documentos protegidos |
| `S07` | ativação e primeira versão contratual | 037–038 | S06 | transação idempotente e vínculo ativo |
| `S08` | alterações contratuais | 039–040 | S07 | G03; histórico temporal e impactos |
| `S09` | políticas, escalas e marcações | 041–044 | G03 | marcação append-only e offline |
| `S10` | apuração, banco e fechamento | 045–048 | S09 | ponto fechado e lote para folha |
| `S11` | férias e ausências | 049–053 | S10 | saldo reproduzível e retorno controlado |
| `S12` | benefícios e conciliação | 054–056 | S07/S11 | adesões, descontos e fornecedor reconciliados |
| `S13` | riscos e exposições | 057–059 | S05 | inventário e plano de ação temporal |
| `S14` | saúde ocupacional e incidentes | 060–062 | S13 | segregação clínica e fluxo CAT |
| `S15` | EPI, treinamento e habilitação | 063–064 | S13/S14 | G04; autorização operacional derivada |
| `S16` | competências, rubricas e parâmetros | 065–067 | G04 | catálogo e vigências aprovados |
| `S17` | DSL e grafo de fórmulas | 068–069 | S16 | parser seguro, ciclos bloqueados e testes unitários |
| `S18` | entradas e motor determinístico | 070–071 | S10/S11/S12/S15/S17 | memória de cálculo reproduzível |
| `S19` | cálculo sombra e reconciliação | 072–073 | S18 | G05; relatório de divergências aprovado |
| `S20` | ajustes, aprovação e fechamento | 074–077 | G05 | execução aprovada por hash e demonstrativo protegido |
| `S21` | pagamento e contabilidade | 078–080 | S20 | G07 condicionado; retorno e rateio conciliados |
| `S22` | catálogo e projeção governamental | 081–083 | S16/S20 | payloads validados em ambiente controlado |
| `S23` | transmissão, recibos e retificações | 084–086 | S22/G01 | produção restrita e estado incerto testados |
| `S24` | totalizadores, guias e pagamentos | 087–088 | S23 | G06; reconciliação por camada |
| `S25` | desligamentos e cálculo rescisório | 089–094 | G05/G06 | rescisão sombra e eventos controlados |
| `S26` | offboarding e reintegração | 095–096 | S25 | fluxo completo sem apagar histórico |
| `S27` | catálogo analítico e relatórios essenciais | 097–101 | fontes estabilizadas | relatórios com qualidade, linhagem e supressão |
| `S28` | planejamento da força de trabalho | 102 | S05/S27 | cenários sem ações automáticas |
| `S29` | modelos e decisão humana | 103–104 | governança/privacidade | piloto em modo sombra |
| `S30` | hardening integral | 105–112 | G04–G08 | G09; segurança, carga, backup e aceite |
| `S31` | piloto e operação assistida | 113–116 | G09 | métricas, incidentes e vacinas ativos |
| `S32` | estabilização | 117–120 | S31 | G10; decisão formal de estabilização |

A quantidade real de sprints poderá mudar após refinamento. A ordem de dependências e os gates não poderão ser removidos apenas para atender uma data desejada.

---

## 9. Dependências críticas

```text
G00
  → Fundação de autorização e dados
    → Cadastro canônico
      → Estrutura e lotação
        → Admissão e contratos
          ├─ Jornada, ausências e benefícios
          ├─ SST e habilitações
          └─ Folha
               ├─ Pagamentos e Contabilidade
               ├─ Obrigações digitais
               └─ Desligamentos
                    → Analytics e planejamento
                         → Hardening
                              → Piloto
                                   → Produção e estabilização
```

Dependências que não poderão ser invertidas:

- folha antes de vínculo e contrato canônicos;
- cálculo oficial antes de sombra e reconciliação;
- transmissão antes de payload, certificado e idempotência;
- desligamento oficial antes do motor rescisório homologado;
- analytics nominal antes da política de privacidade e supressão;
- produção antes de backup, rollback e operação assistida.

---

## 10. Plano de homologação

### 10.1 Camadas

1. **Estrutural:** schema, constraints, índices, functions, grants, policies e ledger.
2. **Unitária:** regras puras, fórmulas, estados, precisão e validações.
3. **Transacional:** RPCs, locks, idempotência, reversões e invariantes.
4. **Integração:** contratos entre contextos e sistemas.
5. **Segurança:** RLS, capabilities, Storage, MFA, segregação e logs.
6. **Concorrência:** operações simultâneas e retries.
7. **Ponta a ponta:** fluxos de usuário e integração.
8. **Reconciliação:** origem, resultado, totalizador, pagamento e analytics.
9. **Carga:** volume, latência, locks, filas e exportações.
10. **Recuperação:** backup, restauração, reprocessamento e rollback.
11. **Funcional:** RH, folha, SST, contabilidade e operação.
12. **Produção assistida:** população limitada, métricas e suporte.

### 10.2 Ambientes

- local/desenvolvimento: testes unitários e migrations efêmeras;
- CI: validadores, testes automatizados e build;
- homologação: banco isolado, fixtures artificiais e E2E;
- produção restrita: integrações externas sem efeito irrestrito;
- piloto: organização, módulos e população limitados;
- produção: rollout gradual por feature flag e permissão.

### 10.3 Evidência de homologação

Cada relatório deverá registrar:

- commit e branch;
- migrations aplicadas;
- ambiente e instante;
- dados artificiais utilizados;
- testes executados;
- resultado e duração;
- erros e divergências;
- cleanup;
- hashes e artifacts;
- responsáveis técnico e funcional;
- decisão do gate;
- pendências aceitas e prazo de revisão, quando aplicável.

---

## 11. Estratégia de branches e PRs

- uma branch por incremento coerente;
- PRs pequenos o suficiente para revisão;
- migrations e código consumidor no mesmo plano de compatibilidade;
- nenhuma migration aplicada será reescrita;
- PR dependente será explicitamente marcado como empilhado;
- PR documental não será misturado com migrations sem decisão expressa;
- PR crítico permanecerá em rascunho até evidências mínimas;
- merge somente com head conhecido, CI verde e gate aplicável;
- nenhuma ativação de produção ocorrerá automaticamente após merge.

---

## 12. Regras de planejamento — 80 regras

- **RP-001:** sprint lógica não representa duração fixa.
- **RP-002:** data não será prometida sem capacidade conhecida.
- **RP-003:** item `XL` será dividido antes da execução.
- **RP-004:** spike terá pergunta, limite e artefato de saída.
- **RP-005:** spike não será contabilizado como funcionalidade entregue.
- **RP-006:** história sem critério verificável não ficará `READY`.
- **RP-007:** dependência bloqueante impedirá início.
- **RP-008:** dependências não formarão ciclos.
- **RP-009:** item bloqueado registrará causa e responsável.
- **RP-010:** mudança regulatória criará item próprio.
- **RP-011:** defeito não será ocultado em história encerrada.
- **RP-012:** débito técnico terá prioridade e risco explícitos.
- **RP-013:** planejamento não será evidência de execução.
- **RP-014:** commit não será evidência suficiente de homologação.
- **RP-015:** merge não significará liberação.
- **RP-016:** liberação não significará estabilização.
- **RP-017:** teste planejado não será marcado como executado.
- **RP-018:** evidência deverá ser reproduzível.
- **RP-019:** fixture não usará dado pessoal real.
- **RP-020:** fixture terá cleanup ou rollback.
- **RP-021:** Sprint 00 será concluído antes de migration RH.
- **RP-022:** CI estrutural inválido bloqueará G00.
- **RP-023:** conflito de branch bloqueará declaração de prontidão.
- **RP-024:** ledger divergente bloqueará migration.
- **RP-025:** inventário desatualizado bloqueará desenho de backfill.
- **RP-026:** aplicação não criará catálogo mestre paralelo sem reconciliação.
- **RP-027:** cada tabela terá contexto proprietário.
- **RP-028:** cada comando terá capacidade e escopo.
- **RP-029:** cada operação crítica terá idempotência.
- **RP-030:** cada integração externa terá estado incerto e reconciliação.
- **RP-031:** toda migration será append-only.
- **RP-032:** backfill terá dry-run.
- **RP-033:** backfill terá checkpoint e retomada.
- **RP-034:** backfill terá reconciliação antes e depois.
- **RP-035:** alteração destrutiva usará expand/contract.
- **RP-036:** feature flag não substituirá autorização.
- **RP-037:** rollback não dependerá de apagar evidência.
- **RP-038:** reversão financeira usará movimento compensatório.
- **RP-039:** estado fechado não será editado diretamente.
- **RP-040:** concorrência crítica terá teste com sessões independentes.
- **RP-041:** RLS terá teste positivo e negativo.
- **RP-042:** função privilegiada terá `search_path` explícito.
- **RP-043:** função operacional não será executável por `anon`.
- **RP-044:** Service Role não substituirá verificação de autorização.
- **RP-045:** dado clínico não aparecerá em logs.
- **RP-046:** segredo não aparecerá em artifact.
- **RP-047:** exportação sensível terá evidência e finalidade.
- **RP-048:** documento crítico terá hash.
- **RP-049:** Storage permanecerá privado.
- **RP-050:** acesso a prontuário exigirá trilha reforçada.
- **RP-051:** folha oficial dependerá de cálculo sombra.
- **RP-052:** tolerância de reconciliação será aprovada, não presumida.
- **RP-053:** divergência de folha será investigada por trabalhador e rubrica.
- **RP-054:** aprovação de folha será vinculada ao hash.
- **RP-055:** novo cálculo invalidará aprovação anterior.
- **RP-056:** lote bancário exigirá segregação de funções.
- **RP-057:** recibo externo não significará pagamento.
- **RP-058:** transmissão oficial dependerá de produção restrita.
- **RP-059:** timeout externo não será rejeição automática.
- **RP-060:** reenvio, retificação e exclusão serão testes distintos.
- **RP-061:** desligamento não encerrará acesso e vínculo no mesmo ato sem fluxos próprios.
- **RP-062:** reintegração não apagará desligamento.
- **RP-063:** analytics não será fonte canônica.
- **RP-064:** relatório estatístico aplicará supressão.
- **RP-065:** modelo de alto risco começará em modo sombra.
- **RP-066:** decisão relevante exigirá revisão humana.
- **RP-067:** segurança e privacidade participarão de gates aplicáveis.
- **RP-068:** gate crítico não será aprovado apenas pelo implementador.
- **RP-069:** aceite funcional será separado da homologação técnica.
- **RP-070:** pendência aceita terá responsável e condição de revisão.
- **RP-071:** `CONDITIONAL_GO` registrará condições e limites.
- **RP-072:** incidente crítico poderá suspender rollout.
- **RP-073:** rollout será gradual por organização e capacidade.
- **RP-074:** métricas e alertas existirão antes do piloto.
- **RP-075:** runbook existirá antes da produção.
- **RP-076:** suporte terá escalação definida.
- **RP-077:** operação assistida terá critérios de saída.
- **RP-078:** post-mortem relevante produzirá vacina.
- **RP-079:** velocidade será medida, não inventada.
- **RP-080:** backlog será revisado sem apagar histórico de decisões.

---

## 13. Critérios de aceite do planejamento — 55 critérios

- **CAP-001:** todos os 120 itens possuem identificador único.
- **CAP-002:** todos os itens pertencem a um épico.
- **CAP-003:** itens críticos possuem prioridade e tamanho.
- **CAP-004:** itens `XL` estão marcados para divisão.
- **CAP-005:** Sprint 00 não contém implementação funcional RH.
- **CAP-006:** G00 exige CI e mergeabilidade confiáveis.
- **CAP-007:** nenhuma migration RH precede G00.
- **CAP-008:** cada sprint lógica possui objetivo e saída.
- **CAP-009:** a sequência não promete datas.
- **CAP-010:** dependências principais estão representadas.
- **CAP-011:** folha depende de vínculo, jornada e parâmetros.
- **CAP-012:** folha oficial depende de cálculo sombra.
- **CAP-013:** transmissão depende de ambiente restrito.
- **CAP-014:** produção depende de backup e rollback.
- **CAP-015:** estabilização é posterior à liberação.
- **CAP-016:** Definition of Ready está documentada.
- **CAP-017:** Definition of Done comum está documentada.
- **CAP-018:** Definition of Done crítica está documentada.
- **CAP-019:** Definition of Done de produção está documentada.
- **CAP-020:** plano diferencia implementação, verificação, homologação e aceite.
- **CAP-021:** plano diferencia liberação, publicação e estabilização.
- **CAP-022:** fixtures artificiais e cleanup são obrigatórios.
- **CAP-023:** evidências mínimas estão definidas.
- **CAP-024:** cada gate possui objetivo e bloqueios.
- **CAP-025:** gates críticos exigem decisão multidisciplinar.
- **CAP-026:** migrations seguem expand/contract.
- **CAP-027:** backfills incluem dry-run e checkpoint.
- **CAP-028:** concorrência crítica exige sessões independentes.
- **CAP-029:** RLS exige teste negativo.
- **CAP-030:** funções operacionais não podem ser executáveis por `anon`.
- **CAP-031:** Service Role não é autorização funcional.
- **CAP-032:** dados clínicos possuem segregação de planejamento.
- **CAP-033:** documentos críticos possuem hash e Storage privado.
- **CAP-034:** folha possui reconciliação por trabalhador e rubrica.
- **CAP-035:** aprovação de folha é vinculada ao hash.
- **CAP-036:** transmissão possui estado incerto.
- **CAP-037:** retificação e exclusão possuem histórias próprias.
- **CAP-038:** desligamento e offboarding permanecem separados.
- **CAP-039:** analytics começa após fontes mínimas estáveis.
- **CAP-040:** modelos de alto risco não entram direto em produção.
- **CAP-041:** exportações sensíveis exigem finalidade.
- **CAP-042:** rollout pode ser limitado por organização.
- **CAP-043:** feature flag não substitui RLS.
- **CAP-044:** plano de branches e PRs está definido.
- **CAP-045:** PR documental não autoriza implementação.
- **CAP-046:** merge não autoriza produção automática.
- **CAP-047:** revisão jurídica e LGPD aparece antes de G09.
- **CAP-048:** carga e volumetria aparecem antes de G09.
- **CAP-049:** backup e restauração aparecem antes de G09.
- **CAP-050:** runbooks aparecem antes do piloto.
- **CAP-051:** operação assistida possui sprint própria.
- **CAP-052:** incidentes e vacinas fazem parte da estabilização.
- **CAP-053:** backlog poderá ser recalibrado sem apagar histórico.
- **CAP-054:** documento declara honestamente que nenhuma implementação começou.
- **CAP-055:** aprovação deste módulo não cria datas, migrations, issues ou publicação automática.

---

## 14. Riscos de execução

- base e branch divergentes;
- CI com falso negativo ou falso positivo;
- capacidade insuficiente para trabalho paralelo;
- dependência de especialistas de folha, SST, jurídico e contabilidade;
- dados legados incompletos;
- duplicidade de pessoas e vínculos;
- migrations extensas;
- lock prolongado;
- variação de leiautes governamentais;
- fornecedor indisponível;
- certificado ou procuração inválidos;
- divergência de cálculo sombra;
- baixa qualidade de marcações e eventos de origem;
- exposição de dados sensíveis;
- excesso de escopo por sprint;
- histórias `XL` não divididas;
- ausência de fixtures representativas;
- homologação sem cleanup;
- pressão para liberar antes dos gates;
- operação assistida sem suporte.

Cada risco deverá ser registrado com probabilidade, impacto, mitigação, gatilho e responsável antes da execução da onda correspondente.

---

## 15. Métricas do processo

Após o início da implementação serão medidos:

- lead time de `READY` a `VERIFIED`;
- tempo bloqueado;
- taxa de reabertura;
- defeitos por incremento;
- falhas de CI;
- divergências de migration;
- cobertura de testes críticos;
- taxa de cleanup aprovado;
- divergências de cálculo sombra;
- falhas de reconciliação;
- tempo de jobs e filas;
- incidentes por rollout;
- tempo de recuperação;
- adoção e retrabalho;
- itens entregues versus planejados.

Essas métricas serão usadas para recalibrar capacidade, não para ranquear individualmente integrantes da equipe.

---

## 16. Estado honesto

Este documento contém backlog, sequência, gates e plano de homologação.

Não foram criados ou executados:

- issues;
- milestones;
- datas;
- migrations;
- schemas;
- RLS;
- capabilities de RH;
- código;
- testes;
- ambientes;
- fixtures;
- cálculo sombra;
- transmissões;
- piloto;
- produção.

---

## 17. Próximo bloco lógico

**Módulo 15 — Design de Dados Detalhado, Catálogo de Tabelas, Campos, Chaves, Constraints, RLS e Ordem de Migrations.**

O próximo módulo deverá converter a arquitetura e o backlog em um esquema físico revisável, sem executar migrations, incluindo:

- catálogo de tabelas por bounded context;
- campos, tipos e nulabilidade;
- PKs, FKs, uniques e checks;
- temporalidade e exclusões de sobreposição;
- índices;
- ownership e grants;
- matriz de RLS;
- schemas privados;
- Storage e metadados;
- ordem expand/contract;
- backfills e reconciliações;
- testes SQL esperados.
