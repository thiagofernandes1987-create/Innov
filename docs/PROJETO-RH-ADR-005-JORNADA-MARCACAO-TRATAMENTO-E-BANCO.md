# ADR-005 — Separação entre Jornada, Escala, Marcação, Tratamento, Apuração e Banco de Horas

**Projeto:** Projeto RH  
**Estado:** proposta aceita para orientar a especificação; implementação pendente  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  

---

## 1. Contexto

O controle de tempo de trabalho reúne conceitos que parecem semelhantes, mas possuem finalidades, fontes e níveis de confiabilidade diferentes:

- jornada contratual;
- horário contratual;
- escala planejada;
- turno efetivamente atribuído;
- marcação original de entrada, saída e intervalo;
- presença operacional em obra;
- apontamento de tempo em tarefa;
- ajuste ou tratamento do ponto;
- apuração de horas;
- autorização de sobrejornada;
- compensação;
- banco de horas;
- evento de folha;
- evidência para auditoria e fiscalização.

Misturar esses conceitos em uma única tabela ou permitir que o espelho tratado substitua as marcações originais produziria riscos relevantes:

- perda da evidência original;
- marcações fabricadas a partir do horário planejado;
- alteração silenciosa por gestor;
- impossibilidade de explicar diferenças entre planejamento, ponto e folha;
- saldos de banco de horas não reproduzíveis;
- confusão entre presença em obra e jornada trabalhista;
- dependência do login do usuário para registrar trabalhadores sem acesso à plataforma;
- impossibilidade de operar em obras com conexão intermitente;
- cálculos históricos alterados quando regras ou instrumentos coletivos mudarem;
- exposição indevida de localização, biometria e rotina do trabalhador.

A Innovar Platform possui módulos de Obras, Equipes, Tarefas e Diário de Obras. Esses módulos podem fornecer contexto operacional, mas não constituem, por si só, o registro canônico de jornada.

---

## 2. Baseline normativa e técnica consultada

Em 6 de agosto de 2026 foram consultados, como baseline de arquitetura:

- texto compilado da Consolidação das Leis do Trabalho, especialmente as disposições sobre duração, compensação, jornadas especiais e registro de horário;
- Decreto nº 10.854/2021, no capítulo de registro eletrônico de controle de jornada;
- Portaria MTP nº 671/2021 em sua página oficial consolidada e vigente;
- página oficial do Ministério do Trabalho e Emprego sobre Registro Eletrônico de Ponto;
- documentação técnica do eSocial S-1.3 até a Nota Técnica 06/2026;
- leiautes relativos ao horário contratual e alteração contratual.

A baseline atual diferencia sistemas REP-C, REP-A e REP-P, exige preservação fiel das marcações e proíbe mecanismos que desvirtuem o registro, como marcação automática do horário contratual, restrição de horário para marcar, autorização prévia para a marcação ou alteração do dado registrado pelo empregado.

Esta ADR não substitui validação jurídica, sindical, contábil ou técnica. A implementação deverá conferir novamente a legislação, atos consolidados, instrumentos coletivos, categorias, exceções e requisitos técnicos vigentes antes da homologação e da produção.

---

## 3. Decisão

O Projeto RH adotará camadas canônicas separadas.

```text
Jornada contratual versionada
  └─ regra abstrata aplicável ao vínculo

Escala e turno planejados
  └─ expectativa operacional para uma data

Marcação original
  └─ fato recebido do trabalhador, dispositivo ou integração

Tratamento de ponto
  └─ solicitação e decisão auditável, sem apagar o fato original

Apuração
  └─ resultado reproduzível gerado por política versionada

Banco de horas
  └─ razão auxiliar imutável de créditos, débitos, compensações e expirações

Fechamento
  └─ snapshot aprovado do período e interfaces com folha
```

Cada camada deverá manter identidade, vigência, origem, estado, autor e trilha próprios.

---

## 4. Conceitos canônicos

### 4.1 Jornada contratual

Representa as condições contratadas para duração e distribuição do trabalho.

Deverá registrar, conforme aplicável:

- tipo de regime;
- quantidade média de horas semanais;
- descrição semanal;
- dias e horários;
- intervalos planejados;
- indicação de componente noturno;
- regime parcial;
- regra de descanso;
- instrumento que autoriza o regime;
- vigência;
- vínculo e versão contratual de origem.

A jornada contratual não gera marcações automaticamente.

### 4.2 Modelo de escala

Representa um padrão reutilizável de turnos e folgas.

Exemplos funcionais:

- segunda a sexta em horário fixo;
- horário fixo com folga variável;
- horário fixo com folga semanal definida;
- doze por trinta e seis, quando aplicável;
- turno de revezamento;
- escala cíclica;
- jornada parcial;
- jornada descrita livremente quando não couber em modelo estruturado.

O catálogo deverá ser configurável e não presumirá validade jurídica universal.

### 4.3 Escala atribuída

Representa a aplicação de um modelo ou planejamento específico a um trabalhador e período.

A atribuição deverá guardar:

- vínculo;
- estabelecimento e local;
- obra ou frente de serviço, quando houver;
- modelo de escala;
- turnos planejados;
- início e fim da vigência;
- responsável;
- motivo;
- versão;
- aprovação quando exigida.

### 4.4 Turno planejado

Representa a expectativa para uma data ou intervalo concreto.

Poderá conter:

- início e fim planejados;
- intervalos;
- local planejado;
- obra ou equipe;
- tipo de dia;
- folga;
- feriado aplicável;
- convocação;
- substituição;
- plantão;
- observações.

O turno planejado não será prova de trabalho realizado.

### 4.5 Marcação original

Representa o evento bruto recebido no momento da marcação.

Deverá ser append-only e preservar, conforme o canal:

- identificador estável;
- trabalhador e vínculo resolvidos;
- data e hora recebidas;
- data e hora declaradas pelo coletor;
- fuso horário e deslocamento UTC;
- tipo de marcação informado ou inferido;
- origem;
- dispositivo ou coletor;
- número sequencial, quando aplicável;
- comprovante;
- hash;
- assinatura ou evidência de integridade;
- localização, somente quando autorizada e necessária;
- nível de precisão;
- estado de sincronização;
- chave de idempotência;
- metadados técnicos;
- instante de ingestão.

A marcação original não poderá ser editada ou excluída por fluxo comum.

### 4.6 Comprovante de marcação

Representa a evidência disponibilizada ao trabalhador após a marcação, quando aplicável ao canal e à regulamentação.

Deverá ser correlacionado à marcação original e possuir:

- identificador;
- versão do formato;
- hash;
- assinatura, quando exigida;
- instante de emissão;
- canal de entrega;
- estado de disponibilidade;
- histórico de acesso.

### 4.7 Ocorrência ou anomalia

Representa uma condição detectada sem alterar o fato original.

Exemplos:

- marcação ausente;
- marcações em quantidade ímpar;
- duplicidade provável;
- ordem temporal inconsistente;
- jornada excessivamente longa;
- intervalo inferior ao esperado;
- marcação fora do local planejado;
- dispositivo não reconhecido;
- divergência de fuso;
- sincronização tardia;
- sobrejornada não planejada;
- trabalho em folga;
- trabalho em feriado;
- conflito com afastamento ou férias;
- conflito entre dois vínculos;
- marcação durante bloqueio operacional.

Uma ocorrência poderá exigir tratamento, mas não autorizará apagar ou alterar a marcação.

### 4.8 Caso de tratamento de ponto

Representa a solicitação, análise e decisão sobre uma divergência.

Deverá distinguir:

- inclusão justificada de marcação faltante;
- desconsideração lógica de marcação;
- classificação correta do evento;
- ajuste de vínculo ou local associado;
- correção de erro de integração;
- justificativa de atraso ou ausência;
- abono;
- reconhecimento de sobrejornada;
- contestação do trabalhador;
- correção administrativa.

O tratamento produzirá eventos derivados e não mutará o registro original.

### 4.9 Linha tratada

Representa o resultado lógico da decisão de tratamento.

Deverá apontar:

- marcação original relacionada, quando houver;
- caso de tratamento;
- decisão;
- responsável;
- justificativa;
- evidência;
- instante da decisão;
- efeito na apuração;
- versão do período.

### 4.10 Política de apuração

Representa o conjunto versionado de regras utilizado para interpretar jornada, marcações e tratamentos.

Poderá incluir, conforme a validade aplicável:

- tolerâncias;
- critérios de arredondamento;
- intervalos;
- trabalho noturno;
- redução ficta quando aplicável;
- prorrogação noturna;
- horas extras;
- percentuais;
- dias de descanso;
- feriados;
- compensações;
- banco de horas;
- atrasos;
- faltas;
- abonos;
- regras especiais por categoria;
- instrumento coletivo;
- prioridade entre regras;
- vigência.

Regras legais ou coletivas não ficarão somente em código.

### 4.11 Apuração do período

Representa o resultado reproduzível para um trabalhador e intervalo.

Deverá guardar:

- período;
- vínculo;
- jornada e escala efetivas;
- conjunto de marcações considerado;
- tratamentos considerados;
- política e versão;
- calendário;
- resultados detalhados;
- memória de cálculo;
- avisos;
- impedimentos;
- hash das entradas;
- estado;
- responsável pela conferência.

### 4.12 Acordo ou regra de banco de horas

Representa a autorização e as condições para compensação.

Deverá informar:

- modalidade;
- base jurídica ou instrumento;
- escopo de trabalhadores;
- vigência;
- prazo de compensação;
- limites;
- regras de crédito e débito;
- tratamento de expiração;
- tratamento no desligamento;
- prioridades;
- necessidade de anuência;
- documentos;
- responsáveis.

O sistema não presumirá que todo trabalhador participa de banco de horas.

### 4.13 Conta de banco de horas

Representa a conta individual vinculada a um acordo vigente.

Não armazenará apenas um saldo mutável. O saldo será derivado de uma razão de movimentos.

### 4.14 Movimento de banco de horas

Representa crédito, débito, compensação, expiração, transferência admitida, ajuste ou liquidação.

Cada movimento deverá guardar:

- conta;
- competência e data do fato;
- tipo;
- quantidade;
- unidade;
- origem;
- apuração relacionada;
- movimento compensado;
- prazo de expiração;
- justificativa;
- aprovação;
- estado;
- hash;
- instante de registro.

Movimentos contabilizados não serão alterados diretamente.

### 4.15 Fechamento do ponto

Representa o congelamento aprovado de um período.

O fechamento deverá:

- validar pendências;
- congelar entradas e versões consideradas;
- gerar snapshot;
- registrar aprovadores;
- produzir interfaces para folha;
- impedir mutação silenciosa;
- permitir reabertura controlada;
- manter histórico de reprocessamentos.

---

## 5. Fontes de verdade

| Informação | Fonte canônica |
|---|---|
| Jornada contratual | versão contratual vigente |
| Escala planejada | módulo de jornada e escala |
| Presença operacional em obra | Diário de Obras ou módulo operacional correspondente |
| Tempo dedicado a tarefa | apontamento operacional de tarefas |
| Marcação de ponto | evento original do módulo de ponto ou REP integrado |
| Tratamento | caso de tratamento aprovado |
| Horas apuradas | execução versionada da política de apuração |
| Saldo de banco | soma da razão de movimentos válidos |
| Evento de folha | módulo de folha a partir da interface fechada |

Dados de um módulo poderão servir de evidência para outro, mas não substituirão automaticamente sua fonte canônica.

---

## 6. Imutabilidade e correção

### 6.1 Marcações originais

Marcações originais serão imutáveis.

Uma marcação incorreta ou duplicada poderá ser:

- sinalizada;
- desconsiderada logicamente;
- relacionada a uma correção;
- substituída na visão tratada;
- mantida na evidência bruta.

### 6.2 Tratamentos

Tratamentos aprovados não serão reescritos. Nova decisão produzirá novo evento que substitui logicamente a anterior.

### 6.3 Apurações

Reprocessar um período criará nova versão de apuração. A versão anterior permanecerá consultável.

### 6.4 Banco de horas

Correção de saldo produzirá movimento de ajuste com justificativa e aprovação, nunca edição direta do saldo.

### 6.5 Fechamentos

Período fechado somente poderá mudar por reabertura autorizada, nova apuração e novo fechamento.

---

## 7. Marcação livre e detecção posterior

O sistema não deverá bloquear a marcação apenas porque:

- ocorreu antes ou depois do horário planejado;
- não havia autorização de hora extra;
- o trabalhador estava fora de uma geocerca;
- o dispositivo não era o preferencial;
- a escala possuía inconsistência;
- a jornada ultrapassaria um limite configurado.

Nessas situações, deverá registrar o fato e produzir ocorrência para análise.

Bloqueios técnicos somente serão admitidos quando o evento não puder ser autenticado, íntegro ou associado de forma segura, e ainda assim deverá existir tratamento de contingência.

---

## 8. Idempotência, offline e concorrência

### 8.1 Idempotência

Cada marcação deverá possuir chave idempotente produzida pelo coletor ou pela camada de ingestão.

Reenvios não gerarão marcações duplicadas.

### 8.2 Operação offline

Coletores móveis ou de obra poderão registrar eventos offline, preservando:

- hora local do evento;
- fuso;
- contador local;
- dispositivo;
- hash;
- assinatura técnica disponível;
- instante posterior de sincronização.

Sincronização tardia será identificada, não ocultada.

### 8.3 Concorrência

Duas decisões simultâneas sobre a mesma ocorrência deverão usar controle otimista ou bloqueio transacional. O sistema não aceitará aprovação sobre versão desatualizada sem nova conferência.

---

## 9. Privacidade e dados sensíveis

Localização, biometria, identificadores de dispositivo e padrões de rotina exigem finalidade, proporcionalidade, retenção e acesso específicos.

Regras obrigatórias:

1. biometria não será requisito arquitetural universal;
2. geolocalização não será coletada continuamente pelo módulo de ponto;
3. localização será associada ao instante da marcação somente quando houver base e finalidade aprovadas;
4. coordenadas completas não serão expostas a qualquer gestor de obra;
5. imagens e biometria terão armazenamento e autorização segregados;
6. relatórios gerenciais utilizarão minimização e agregação quando possível;
7. consultas e exportações sensíveis produzirão auditoria;
8. retenção será definida por classe de dado e obrigação;
9. o trabalhador terá acesso aos próprios registros liberados;
10. o uso antifraude não eliminará contestação e revisão humana.

---

## 10. Integração com Obras e Diário de Obras

### 10.1 Presença em obra

A presença registrada no Diário de Obras poderá:

- sugerir divergência;
- apoiar conferência;
- comprovar contexto;
- identificar equipe ou frente de serviço;
- alimentar relatórios operacionais.

Não criará automaticamente marcação de ponto.

### 10.2 Equipes

Alocação em equipe poderá definir local planejado ou aprovador operacional. Não modificará jornada contratual nem saldo de banco.

### 10.3 Tarefas

Tempo em tarefa poderá ser comparado ao tempo apurado. Não será tratado automaticamente como jornada trabalhada.

### 10.4 Custos

Horas fechadas poderão alimentar custos por obra e centro de custo após regras explícitas de rateio. Custo operacional não substituirá remuneração de folha.

---

## 11. Integração com folha

A folha receberá uma interface fechada e versionada, contendo eventos como:

- horas normais;
- horas extras por classificação;
- adicional noturno e reflexos configurados;
- atrasos;
- faltas;
- abonos;
- compensações;
- saldo liquidado;
- eventos informativos.

A folha não deverá recalcular silenciosamente o ponto usando regras diferentes. Divergências exigirão contrato explícito de integração e memória de cálculo.

---

## 12. Proposta conceitual de entidades

Os nomes são provisórios e não autorizam migrations antes da modelagem física e revisão.

```text
work_schedule_policies
work_schedule_policy_versions
work_schedule_templates
work_schedule_template_versions
worker_schedule_assignments
planned_shifts
work_calendars
work_calendar_days
clocking_devices
clocking_collectors
clocking_device_enrollments
time_clock_events
time_clock_event_receipts
time_clock_ingestion_attempts
time_occurrences
time_treatment_cases
time_treatment_decisions
treated_time_events
time_calculation_policies
time_calculation_policy_versions
time_calculation_runs
time_calculation_items
time_periods
time_period_closures
time_period_reopenings
overtime_authorizations
compensatory_time_agreements
compensatory_time_agreement_scopes
time_bank_accounts
time_bank_transactions
time_exports
time_integration_outbox
time_audit_events
```

---

## 13. Estados mínimos

### 13.1 Marcação

```text
RECEIVED
  → VALIDATED
  → LINKED
  → AVAILABLE

RECEIVED
  → QUARANTINED
  → RESOLVED | REJECTED
```

`REJECTED` significa falha técnica ou de autenticidade, não exclusão da evidência recebida.

### 13.2 Tratamento

```text
DRAFT
  → SUBMITTED
  → UNDER_REVIEW
  → APPROVED | REJECTED | RETURNED
  → APPLIED

DRAFT | RETURNED
  → CANCELED
```

### 13.3 Apuração

```text
PENDING
  → CALCULATING
  → CALCULATED
  → WITH_WARNINGS | BLOCKED
  → REVIEWED
  → APPROVED
  → CLOSED

CALCULATED | WITH_WARNINGS | BLOCKED
  → SUPERSEDED
```

### 13.4 Banco de horas

```text
PENDING
  → POSTED
  → PARTIALLY_COMPENSATED
  → COMPENSATED | EXPIRED | LIQUIDATED

POSTED
  → REVERSED
```

A reversão produzirá movimento oposto.

---

## 14. Regras obrigatórias

1. Jornada contratual não gera marcação automática.
2. Escala planejada não prova trabalho realizado.
3. Diário de Obras não substitui o ponto.
4. Marca original é append-only.
5. Tratamento não altera o evento bruto.
6. Toda inclusão manual deve possuir solicitante, responsável, motivo e evidência.
7. O sistema deve permitir marcação mesmo fora do horário planejado, registrando ocorrência.
8. Hora extra sem autorização prévia pode gerar fluxo de análise, mas não pode impedir a marcação.
9. Políticas de apuração possuem versão e vigência.
10. Instrumentos coletivos e acordos possuem escopo e vigência.
11. Banco de horas só existe para trabalhador abrangido por regra válida.
12. Saldo de banco deriva de movimentos imutáveis.
13. Expiração não apaga crédito; produz movimento e efeito conforme regra validada.
14. Reprocessamento cria nova versão.
15. Fechamento congela entradas e políticas consideradas.
16. Reabertura exige permissão e justificativa.
17. Exportação para folha é versionada e idempotente.
18. Trabalhador sem login poderá marcar por coletor autorizado.
19. Conta de usuário não será prova da identidade trabalhista sem associação válida.
20. Dados de localização e biometria terão autorização segregada.
21. Fuso horário será armazenado explicitamente.
22. Jornada que atravessa meia-noite não será dividida de forma simplista pela data civil.
23. Eventos offline manterão hora do fato e hora de sincronização.
24. Marcações duplicadas tecnicamente serão preservadas e relacionadas, não apagadas.
25. O cálculo deverá ser reproduzível a partir das entradas e versões registradas.

---

## 15. Alternativas rejeitadas

### 15.1 Usar o horário contratual como marcação

Rejeitada porque fabrica presença e elimina a evidência do evento real.

### 15.2 Editar a marcação original após justificativa

Rejeitada porque impede auditoria e comparação entre fato e tratamento.

### 15.3 Armazenar somente o saldo do banco

Rejeitada porque não permite explicar créditos, compensações, expirações ou ajustes.

### 15.4 Usar o Diário de Obras como folha de ponto

Rejeitada porque o diário possui finalidade operacional distinta e pode registrar equipes, recursos ou presenças sem os requisitos técnicos do ponto.

### 15.5 Bloquear marcação fora da geocerca

Rejeitada porque transforma uma regra de validação em supressão do fato. O evento será recebido e sinalizado.

### 15.6 Calcular tudo diretamente na folha

Rejeitada porque mistura aquisição de evidência, tratamento, apuração e remuneração, prejudicando segregação e reprodutibilidade.

### 15.7 Fixar limites legais universais no código

Rejeitada porque categorias, instrumentos, regimes e alterações normativas podem produzir regras diferentes.

---

## 16. Consequências positivas

- preservação integral das marcações;
- tratamento transparente;
- melhor defesa de auditoria;
- cálculo reproduzível;
- suporte a múltiplos regimes;
- integração segura com folha;
- banco de horas explicável;
- operação offline em obras;
- separação entre presença operacional e ponto;
- redução de exposição de dados sensíveis;
- maior capacidade de contestação e correção;
- suporte a integrações com REP sem acoplamento ao fornecedor.

---

## 17. Custos e impactos

- maior número de entidades;
- necessidade de armazenamento imutável e retenção;
- motor de cálculo temporal complexo;
- reconciliação de fusos e eventos offline;
- necessidade de interface de tratamento;
- necessidade de políticas versionadas;
- integração cuidadosa com folha e custos;
- testes extensivos de datas, viradas de dia e horários especiais;
- governança de dispositivos e coletores;
- revisão jurídica dos regimes e acordos.

Esses custos são aceitos porque reduzem riscos maiores de perda de evidência e cálculo não auditável.

---

## 18. Critérios de aceite da futura implementação

- uma marcação original não pode ser atualizada por fluxo normal;
- um ajuste aprovado mantém visível o antes e o depois;
- reenvio offline não duplica marcação;
- marcação fora do horário é recebida e sinalizada;
- trabalhador obtém comprovante conforme canal aplicável;
- gestor de obra não pode alterar ponto bruto;
- presença no diário não cria marcação automaticamente;
- apuração identifica todas as versões utilizadas;
- alteração de política futura não modifica período antigo;
- banco de horas apresenta razão completa;
- saldo exibido é reconciliável com movimentos;
- reabertura não apaga o fechamento anterior;
- folha recebe lote versionado e idempotente;
- marcação em outro fuso mantém instante e contexto originais;
- dados de localização não são expostos sem capacidade específica;
- trabalhador consegue consultar e contestar registros próprios;
- auditor consegue reconstruir o período sem acesso de escrita.

---

## 19. Relações com outros documentos

- `docs/PROJETO-RH-ESPECIFICACAO-FUNCIONAL.md`;
- `docs/PROJETO-RH-INDICE-E-ESTADO.md`;
- `docs/PROJETO-RH-ADR-001-PESSOA-TRABALHADOR-VINCULO.md`;
- `docs/PROJETO-RH-ADR-004-CONTRATO-VERSOES-E-ALTERACOES.md`;
- `docs/PROJETO-RH-MODULO-04-CONTRATOS-E-ALTERACOES.md`;
- `diretrizes/ARQUITETURA.md`;
- `diretrizes/CONTRATO-AUDITAVEL-DE-PERSONAS.md`;
- `diretrizes/REUSO-DE-INFORMACAO.md`.
