# Projeto RH — ADR-012 — Métrica, Observação, Análise, Cenário e Decisão

**Estado:** decisão funcional registrada; implementação pendente  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**Módulo relacionado:** `PROJETO-RH-MODULO-12-RELATORIOS-PEOPLE-ANALYTICS-E-PLANEJAMENTO.md`

---

## 1. Contexto

O Projeto RH já possui especificações funcionais para cadastro mestre, estrutura organizacional, admissão, contratos, jornada, férias, afastamentos, benefícios, SST, folha, obrigações digitais e desligamentos.

Esses domínios produzem fatos operacionais e financeiros com temporalidade, versões, aprovações e graus de sensibilidade diferentes. A camada de relatórios não poderá:

- recriar fatos sem referência às fontes canônicas;
- definir fórmulas diretamente em cada dashboard;
- misturar pessoas, vínculos, posições e lotações como se fossem a mesma unidade de análise;
- apresentar números sem população, período, granularidade ou versão;
- permitir identificação indevida por grupos pequenos;
- converter correlação em causalidade;
- transformar previsão em decisão automática sobre trabalhadores;
- usar dados de saúde, raça, deficiência, filiação sindical ou outros dados sensíveis para ranqueamento individual;
- recompensar subnotificação de acidentes, afastamentos ou horas trabalhadas;
- produzir indicadores aparentemente comparáveis a partir de definições diferentes.

A plataforma necessita de uma camada semântica governada que transforme fatos canônicos em observações reproduzíveis, relatórios, análises e cenários sem alterar as fontes.

---

## 2. Decisão

A arquitetura distinguirá explicitamente:

```text
Fato canônico
  → definição versionada de métrica
    → execução analítica reproduzível
      → observação agregada
        → relatório ou dashboard
          → análise e interpretação
            → cenário ou previsão
              → recomendação
                → decisão humana registrada
```

Os seguintes objetos não serão tratados como equivalentes:

1. fato operacional;
2. dimensão analítica;
3. definição de métrica;
4. execução da métrica;
5. observação calculada;
6. relatório;
7. insight;
8. alerta;
9. previsão;
10. cenário;
11. recomendação;
12. decisão humana;
13. ação operacional.

---

## 3. Princípios arquiteturais

### 3.1 A fonte canônica permanecerá nos módulos de origem

People Analytics não será sistema mestre de:

- pessoa;
- trabalhador;
- vínculo;
- contrato;
- lotação;
- marcação de ponto;
- afastamento;
- benefício;
- exposição ocupacional;
- cálculo de folha;
- obrigação governamental;
- desligamento;
- obra;
- centro de custo.

A camada analítica somente referenciará versões, eventos, snapshots ou projeções aprovadas desses domínios.

### 3.2 Dashboard não será definição de métrica

Uma métrica será cadastrada em catálogo próprio e terá, no mínimo:

- identificador estável;
- nome e descrição;
- finalidade;
- responsável funcional;
- versão;
- vigência;
- unidade de medida;
- grão;
- população incluída;
- população excluída;
- numerador;
- denominador;
- dimensões permitidas;
- dimensões proibidas;
- regra temporal;
- regra de arredondamento;
- tratamento de dados ausentes;
- fontes e campos de origem;
- critérios de qualidade;
- classificação de sensibilidade;
- política de supressão;
- periodicidade de atualização;
- testes e exemplos.

Dashboards apenas selecionarão métricas aprovadas e parâmetros permitidos.

### 3.3 Métrica e observação serão separadas

A definição informa como calcular. A observação registra o valor calculado em determinada execução, com:

- período de referência;
- instante de corte;
- versão da métrica;
- população efetivamente utilizada;
- filtros;
- fontes;
- watermark de atualização;
- hash da consulta ou plano;
- quantidade de registros considerados;
- quantidade rejeitada por qualidade;
- valor calculado;
- avisos e limitações.

Recalcular uma métrica não sobrescreverá observações anteriormente publicadas.

### 3.4 Tempo do fato, tempo de vigência e tempo de processamento serão preservados

A camada analítica distinguirá:

- quando o fato ocorreu;
- quando a regra ou condição passou a valer;
- quando o fato foi registrado;
- quando foi corrigido;
- quando entrou no processamento analítico;
- quando o relatório foi publicado.

Relatórios históricos poderão ser reproduzidos com o estado conhecido na época ou com o estado corrigido posteriormente, desde que a modalidade esteja explícita.

### 3.5 Pessoa, trabalhador, vínculo, posição e FTE não serão confundidos

Indicadores deverão declarar a unidade de contagem. Por exemplo:

- uma pessoa pode possuir mais de um vínculo;
- um vínculo pode ocupar diferentes posições ao longo do tempo;
- uma posição vaga não é pessoa ausente;
- headcount não é FTE;
- trabalhador ativo não significa trabalhador disponível;
- trabalhador alocado não significa presença realizada;
- vínculo encerrado no mês pode integrar população média e fluxo de desligamento.

### 3.6 Linhagem será obrigatória

Todo número publicado deverá ser rastreável até:

- definição da métrica;
- versão e vigência;
- execução;
- fontes canônicas;
- filtros;
- transformações;
- snapshots;
- responsáveis;
- aprovações;
- eventuais supressões ou imputações.

Não será permitido apresentar indicador crítico sem drill-down controlado ou explicação de sua origem.

### 3.7 Qualidade de dados será parte do resultado

A execução analítica registrará controles como:

- completude;
- validade;
- unicidade;
- consistência temporal;
- integridade referencial;
- atualidade;
- reconciliação com totais canônicos;
- estabilidade da série;
- cobertura da população.

Um indicador poderá ser bloqueado, degradado ou publicado com ressalva conforme regras versionadas de qualidade.

### 3.8 Privacidade por padrão

Relatórios seguirão finalidade, adequação, necessidade, transparência, segurança, prevenção, não discriminação e prestação de contas.

A arquitetura aplicará:

- agregação mínima;
- supressão de células pequenas;
- generalização de dimensões;
- pseudonimização quando identificação não for necessária;
- anonimização quando tecnicamente adequada e compatível com a finalidade;
- limitação de exportações;
- marca d'água e auditoria de arquivos;
- acesso por finalidade e escopo;
- expiração de links e consultas;
- proteção contra inferência por cruzamento de filtros.

O valor mínimo de grupo não será constante universal. Será política versionada por finalidade, sensibilidade e risco de reidentificação.

### 3.9 Dados sensíveis terão compartimentos e finalidades próprias

Dados sobre saúde, origem racial ou étnica, deficiência, biometria, filiação sindical, religião, opinião política, vida sexual ou genética não entrarão em relatórios gerais por padrão.

Quando necessários para obrigação, equidade, inclusão, SST ou auditoria legítima, deverão existir:

- finalidade documentada;
- hipótese legal validada;
- acesso restrito;
- agregação reforçada;
- avaliação de risco;
- trilha de auditoria;
- proibição de uso para punição, ranking ou decisão adversa individual incompatível.

### 3.10 People Analytics não será mecanismo de vigilância individual

A plataforma não criará automaticamente:

- score de lealdade;
- score de saúde;
- score de risco de gravidez;
- score de sindicalização;
- score de propensão a afastamento;
- ranking de “funcionário problema”;
- ranking por quantidade de atestados;
- ranking por acidentes reportados;
- ranking por mensagens, cliques, presença digital ou tempo conectado;
- inferência de estado emocional a partir de biometria ou comunicação;
- produtividade individual baseada apenas em horas, tarefas ou movimentos.

Indicadores de operação serão preferencialmente coletivos, contextuais e combinados com qualidade, segurança e complexidade do trabalho.

### 3.11 Decisão automatizada e apoio à decisão serão separados

Modelos poderão apoiar:

- previsão de demanda de mão de obra;
- risco de déficit de competências;
- planejamento de escalas;
- projeção de custos;
- identificação de anomalias de dados;
- priorização de auditorias;
- simulação de cenários.

Modelos não decidirão autonomamente sobre:

- contratação;
- promoção;
- remuneração;
- punição;
- desligamento;
- elegibilidade para benefício;
- aptidão médica;
- autorização de atividade de risco;
- seleção para demissão coletiva.

Toda recomendação com efeito relevante manterá explicação, versão do modelo, fatores considerados, limitações, revisão humana e decisão final identificada.

### 3.12 Correlação não será apresentada como causalidade

Relatórios e modelos deverão identificar se o resultado é:

- descritivo;
- diagnóstico;
- correlacional;
- preditivo;
- causal;
- prescritivo;
- simulado.

Uma relação estatística não será descrita como causa sem desenho metodológico e validação apropriados.

### 3.13 Modelos terão governança independente dos dashboards

Cada modelo analítico ou preditivo possuirá:

- caso de uso aprovado;
- proprietário;
- versão;
- conjunto de dados e período;
- variáveis permitidas e proibidas;
- justificativa de cada variável;
- métricas de desempenho;
- testes de viés e estabilidade;
- limites de uso;
- explicabilidade;
- monitoramento de drift;
- data de revisão;
- critérios de suspensão;
- rollback;
- relatório de impacto quando aplicável.

### 3.14 Cenário não será orçamento aprovado

O planejamento da força de trabalho distinguirá:

- demanda observada;
- previsão;
- premissa;
- cenário;
- plano proposto;
- plano aprovado;
- posição autorizada;
- requisição de contratação;
- contratação efetiva;
- alocação realizada.

Alterar um cenário não criará posição, vaga, contrato ou custo no Financeiro.

### 3.15 Cenários serão imutáveis após publicação

Um cenário publicado manterá:

- horizonte;
- premissas;
- curvas de produção ou demanda;
- produtividade esperada;
- calendário;
- competências requeridas;
- restrições;
- custos;
- versão das métricas;
- responsável;
- aprovação.

Nova premissa gerará nova versão ou novo cenário comparável.

### 3.16 Planejamento integrará obras sem ranquear trabalhadores

A integração com construção poderá analisar:

- demanda de equipes por fase de obra;
- capacidade por função e habilitação;
- cobertura de treinamentos e ASOs;
- conflitos de alocação;
- deslocamentos;
- horas previstas e realizadas;
- custo de mão de obra;
- necessidade de terceiros;
- risco de ociosidade ou sobrecarga;
- curvas de mobilização e desmobilização.

O sistema não inferirá produtividade individual apenas pela quantidade executada na obra sem considerar equipe, método, risco, qualidade, retrabalho, disponibilidade de materiais e condições externas.

### 3.17 Relatórios operacionais e estatísticos terão contratos diferentes

Relatório operacional poderá identificar pessoas quando necessário para executar uma tarefa autorizada, como:

- exames a vencer;
- treinamentos pendentes;
- marcações não tratadas;
- documentos incompletos;
- pagamentos rejeitados;
- ativos não devolvidos.

Relatório estatístico deverá utilizar agregação e minimização, evitando exposição nominal sem necessidade.

### 3.18 Exportação será uma operação auditada

Exportar não será equivalente a visualizar. A exportação exigirá:

- permissão específica;
- justificativa ou finalidade;
- escopo autorizado;
- filtros preservados;
- classificação do arquivo;
- responsável;
- data de expiração;
- marca d'água ou identificação do exportador quando aplicável;
- registro de download;
- restrição de colunas sensíveis.

### 3.19 Consultas ad hoc não executarão SQL arbitrário

Usuários de negócio usarão camada semântica, dimensões e métricas autorizadas.

Consultas avançadas deverão ocorrer em ambiente controlado, com:

- conta técnica segregada;
- dados minimizados;
- revisão de acesso;
- limitação de recursos;
- logs;
- bloqueio de funções perigosas;
- prevenção contra extração massiva;
- catálogo de datasets aprovados.

### 3.20 Alertas serão evidências, não decisões

Um alerta poderá indicar:

- mudança fora do intervalo esperado;
- aproximação de limite;
- possível inconsistência;
- risco de capacidade;
- vencimento;
- atraso de atualização;
- divergência de reconciliação.

O alerta não comprovará irregularidade, fraude, baixo desempenho ou responsabilidade individual.

---

## 4. Objetos funcionais principais

A implementação deverá considerar, no mínimo:

- `analytics_metric_definitions`;
- `analytics_metric_versions`;
- `analytics_dimensions`;
- `analytics_dimension_members`;
- `analytics_source_contracts`;
- `analytics_data_quality_rules`;
- `analytics_runs`;
- `analytics_run_sources`;
- `analytics_observations`;
- `analytics_privacy_policies`;
- `analytics_suppression_events`;
- `analytics_reports`;
- `analytics_report_versions`;
- `analytics_report_widgets`;
- `analytics_report_subscriptions`;
- `analytics_exports`;
- `analytics_insights`;
- `analytics_alert_rules`;
- `analytics_alert_occurrences`;
- `analytics_models`;
- `analytics_model_versions`;
- `analytics_model_evaluations`;
- `analytics_predictions`;
- `analytics_recommendations`;
- `analytics_human_decisions`;
- `workforce_plans`;
- `workforce_plan_versions`;
- `workforce_scenarios`;
- `workforce_scenario_assumptions`;
- `workforce_demand_lines`;
- `workforce_capacity_lines`;
- `workforce_gap_lines`;
- `workforce_plan_approvals`;
- `analytics_audit_events`.

Os nomes físicos são indicativos. O desenho final deverá reconciliar convenções existentes antes de qualquer migration.

---

## 5. Estados mínimos

### 5.1 Definição de métrica

```text
DRAFT
  → UNDER_REVIEW
  → APPROVED
  → ACTIVE
  → DEPRECATED
  → RETIRED
```

Nova fórmula ou população gerará nova versão, não edição silenciosa da versão ativa.

### 5.2 Execução analítica

```text
QUEUED
  → EXTRACTING
  → VALIDATING
  → CALCULATING
  → PRIVACY_CHECK
  → PUBLISHING
  → PUBLISHED
```

Estados excepcionais:

- `BLOCKED_BY_QUALITY`;
- `BLOCKED_BY_PRIVACY`;
- `FAILED`;
- `CANCELLED`;
- `SUPERSEDED`.

### 5.3 Relatório

```text
DRAFT
  → UNDER_REVIEW
  → PUBLISHED
  → SUSPENDED
  → ARCHIVED
```

### 5.4 Modelo

```text
PROPOSED
  → DATA_REVIEW
  → PRIVACY_REVIEW
  → BIAS_REVIEW
  → VALIDATED
  → APPROVED_FOR_PILOT
  → ACTIVE
  → SUSPENDED
  → RETIRED
```

### 5.5 Cenário de força de trabalho

```text
DRAFT
  → CALCULATED
  → UNDER_REVIEW
  → APPROVED
  → SUPERSEDED
  → CANCELLED
  → ARCHIVED
```

---

## 6. Permissões e segregação

Capacidades mínimas:

- `view_analytics_catalog`;
- `manage_metric_definitions`;
- `approve_metric_definition`;
- `run_analytics`;
- `publish_analytics`;
- `view_operational_reports`;
- `view_aggregate_people_analytics`;
- `view_sensitive_analytics`;
- `view_identified_drilldown`;
- `export_analytics`;
- `manage_report_subscriptions`;
- `manage_privacy_policies`;
- `approve_sensitive_analysis`;
- `manage_analytics_models`;
- `approve_analytics_model`;
- `view_model_explanations`;
- `review_automated_recommendation`;
- `manage_workforce_scenarios`;
- `approve_workforce_plan`;
- `view_analytics_audit`.

A mesma pessoa não deverá, em análises de alto risco, preparar o dataset, aprovar o modelo, publicar o resultado e decidir a ação final sem controles compensatórios.

---

## 7. Consequências positivas

- métricas comparáveis e reproduzíveis;
- rastreabilidade de números executivos;
- redução de planilhas paralelas;
- separação entre operação e análise;
- proteção contra inferências indevidas;
- histórico de definições e cenários;
- planejamento de capacidade ligado às obras;
- explicabilidade de modelos;
- auditoria de exportações;
- revisão humana de recomendações;
- redução de risco discriminatório;
- indicadores de qualidade junto aos resultados.

---

## 8. Custos e complexidades aceitas

- catálogo e aprovação de métricas;
- camada semântica temporal;
- armazenamento de observações e snapshots;
- políticas de agregação e supressão;
- testes de reidentificação e viés;
- governança de modelos;
- controles de exportação;
- manutenção de linhagem;
- reconciliação entre fontes;
- maior disciplina na interpretação de indicadores.

Esses custos são aceitos porque decisões de pessoas baseadas em números sem definição, contexto ou proteção podem produzir danos jurídicos, humanos e financeiros relevantes.

---

## 9. Alternativas rejeitadas

### 9.1 Fórmulas embutidas em cada dashboard

Rejeitada por gerar divergência, perda de versionamento e impossibilidade de auditoria.

### 9.2 Um grande data lake sem contratos de origem

Rejeitado porque centralizar dados não garante significado, qualidade, temporalidade ou finalidade.

### 9.3 Acesso irrestrito para gestores a dados individuais

Rejeitado por violar necessidade, segregação e risco de discriminação ou vigilância.

### 9.4 Score único de trabalhador

Rejeitado porque comprime contextos incompatíveis, favorece vieses e incentiva decisões indevidas.

### 9.5 Modelo preditivo como decisão final

Rejeitado por falta de explicabilidade, revisão humana, contestação e controle de impacto.

### 9.6 Recalcular o passado com a definição atual sem aviso

Rejeitado porque apaga a leitura histórica e torna séries incomparáveis.

### 9.7 Exportar bases completas para análise externa informal

Rejeitado por aumentar exposição, cópias sem controle e risco de reidentificação.

---

## 10. Baseline oficial verificada em 6 de agosto de 2026

Foram consideradas:

- Lei Geral de Proteção de Dados Pessoais em texto compilado;
- princípios de finalidade, adequação, necessidade, qualidade, transparência, segurança, prevenção, não discriminação e prestação de contas;
- regras sobre dados pessoais sensíveis;
- direitos relacionados a decisões tomadas unicamente com base em tratamento automatizado;
- registro das operações, relatório de impacto, segurança desde a concepção e governança em privacidade;
- Lei nº 9.029/1995, que proíbe práticas discriminatórias e limitativas no acesso ou manutenção da relação de trabalho;
- Agenda Regulatória da ANPD 2025–2026;
- Mapa de Temas Prioritários da ANPD 2026–2027, incluindo direitos dos titulares e inteligência artificial e tecnologias emergentes.

A implementação deverá revalidar legislação, regulamentos, orientações e entendimentos vigentes, especialmente para:

- decisões automatizadas;
- inteligência artificial;
- tratamento de alto risco;
- anonimização e pseudonimização;
- dados biométricos e de saúde;
- relatórios de impacto;
- exercício de direitos dos titulares.

---

## 11. Regra de implementação

Esta ADR não autoriza:

- migration;
- data warehouse;
- modelo preditivo;
- score;
- dashboard;
- conector de BI;
- exportação nominal;
- coleta adicional de dados;
- decisão automatizada;
- monitoramento de comunicação;
- rastreamento individual.

A implementação somente poderá começar após aprovação do modelo de dados, catálogo inicial de métricas, matriz de acesso, política de privacidade analítica, contratos de origem, estratégia de testes e plano de implantação.

---

## 12. Decisão final

O Projeto RH adotará uma camada analítica governada em que fatos permanecem nos módulos canônicos, métricas são definições versionadas, observações são resultados reproduzíveis, dashboards são apresentações, cenários são hipóteses e decisões relevantes continuam humanas, identificadas, explicáveis e auditáveis.
