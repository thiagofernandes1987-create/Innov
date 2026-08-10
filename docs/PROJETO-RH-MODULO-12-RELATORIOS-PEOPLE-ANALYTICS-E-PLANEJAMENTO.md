# Projeto RH — Módulo 12 — Relatórios Consolidados, People Analytics, Indicadores e Planejamento da Força de Trabalho

**Versão:** 0.1.0  
**Estado:** especificação funcional inicial concluída; implementação pendente  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**ADR vinculante:** `PROJETO-RH-ADR-012-METRICA-ANALISE-CENARIO-E-DECISAO.md`

---

## 1. Finalidade

Este módulo define a camada de relatórios e análise do Projeto RH, sem substituir os módulos canônicos que registram pessoas, vínculos, contratos, jornadas, afastamentos, benefícios, SST, folha, obrigações e desligamentos.

A finalidade é permitir que a organização:

- conheça sua força de trabalho com números reproduzíveis;
- acompanhe tendências e riscos coletivos;
- planeje capacidade por empresa, estabelecimento, unidade e obra;
- compare previsto, realizado e cenário;
- identifique problemas de qualidade ou conformidade;
- analise custos, disponibilidade, competências e mobilização;
- produza relatórios operacionais com acesso controlado;
- execute People Analytics sem vigilância ou decisão discriminatória;
- mantenha linhagem, privacidade, explicabilidade e revisão humana.

---

## 2. Escopo

### 2.1 Incluído

- catálogo versionado de métricas;
- camada semântica e dimensões conformadas;
- contratos de dados de origem;
- execuções analíticas reproduzíveis;
- observações, séries, coortes e snapshots;
- qualidade, atualidade e reconciliação;
- relatórios operacionais e estatísticos;
- dashboards executivos e de gestão;
- drill-down autorizado;
- alertas e assinaturas;
- exportações auditadas;
- indicadores de quadro, movimentação, jornada, ausências, benefícios, SST, folha, obrigações e desligamentos;
- análises por empresa, estabelecimento, unidade, cargo, função, posição, vínculo, centro de custo, obra, fase e competência;
- planejamento da força de trabalho;
- demanda, capacidade, lacunas, cenários e premissas;
- projeção de custos e mobilização;
- governança de modelos descritivos, preditivos e prescritivos;
- explicabilidade, viés, drift, revisão humana e contestação;
- políticas de agregação, supressão, pseudonimização e anonimização;
- auditoria de consultas, visualizações e exportações sensíveis.

### 2.2 Fora do escopo

- cadastro mestre paralelo;
- alteração direta de fatos operacionais por dashboards;
- data lake sem contratos e governança;
- monitoramento de mensagens privadas;
- captura indiscriminada de tela, teclado, webcam ou áudio;
- inferência de emoção;
- score universal de trabalhador;
- diagnóstico médico ou psicológico;
- decisão automática de contratar, promover, punir ou desligar;
- avaliação de desempenho individual completa;
- pesquisa salarial externa sem fonte licenciada e governança;
- planejamento financeiro corporativo completo;
- execução automática de admissões, desligamentos ou transferências a partir de cenário;
- SQL arbitrário para usuários de negócio;
- disponibilização pública de dados pessoais ou sensíveis.

---

## 3. Personas

### 3.1 Alta administração

Visualiza indicadores agregados, cenários, tendências, riscos e custos, respeitando supressão e finalidade.

### 3.2 Diretoria e gerência de RH

Gerencia catálogo, relatórios, planejamento, análises e ações de melhoria.

### 3.3 Analista de People Analytics

Prepara definições, execuções, estudos, controles de qualidade e documentação metodológica em ambiente governado.

### 3.4 Planejamento de obras

Analisa demanda de equipes, competências, mobilização, restrições e custos por obra, fase e horizonte.

### 3.5 Gestor de unidade ou obra

Visualiza indicadores e listas operacionais restritos ao seu escopo, sem acesso desnecessário a dados sensíveis.

### 3.6 Folha e controladoria

Reconcilia quadro, custos, encargos, pagamentos, rateios e obrigações.

### 3.7 SST

Acompanha indicadores coletivos de exposição, treinamentos, habilitações, incidentes e ações, sem expor prontuários.

### 3.8 Jurídico, Compliance e DPO

Analisa finalidade, acesso, discriminação, decisões automatizadas, privacidade e auditoria.

### 3.9 Auditor

Consulta definições, versões, execuções, linhagem, acessos e exportações sem alterar resultados.

### 3.10 Trabalhador

Acessa dados e indicadores individuais autorizados sobre si, com explicação e canal de correção ou contestação.

### 3.11 Serviço de integração

Executa cargas, validações, atualizações e publicação de observações por identidade técnica segregada.

---

## 4. Conceitos

| Conceito | Definição |
|---|---|
| Fato canônico | registro aprovado no módulo de origem |
| Dimensão | eixo governado de análise, com identidade e temporalidade |
| Métrica | definição versionada de um cálculo |
| Execução | processamento de uma métrica com fontes, filtros e instante de corte |
| Observação | valor produzido por uma execução |
| Snapshot | retrato imutável de uma população em determinado instante |
| Coorte | grupo definido por evento ou característica comum em período explícito |
| Relatório operacional | lista destinada a executar ação autorizada, podendo identificar pessoas |
| Relatório estatístico | visão agregada destinada a análise e decisão coletiva |
| Insight | interpretação registrada sobre uma ou mais observações |
| Alerta | sinal de regra, variação, vencimento, atraso ou anomalia |
| Previsão | estimativa futura com método e incerteza explícitos |
| Cenário | combinação versionada de premissas e resultados simulados |
| Recomendação | sugestão de ação, não vinculante |
| Decisão | escolha humana registrada com responsável e fundamento |
| FTE | equivalente de tempo integral segundo definição versionada |
| Headcount | contagem de unidade declarada, normalmente pessoa ou vínculo |
| Watermark | instante máximo de atualização conhecido pela execução |
| Supressão | ocultação de resultado para reduzir risco de identificação |
| Linhagem | relação entre resultado, definição, fontes e transformações |
| Drift | alteração relevante no comportamento dos dados ou desempenho do modelo |

---

## 5. Arquitetura funcional

```text
Módulos canônicos
  → contratos de origem
    → validação e qualidade
      → camada semântica temporal
        → métricas versionadas
          → execuções reproduzíveis
            → observações e snapshots
              → privacidade e supressão
                → relatórios, alertas e análises
                  → cenários e recomendações
                    → decisão humana e ação em módulo próprio
```

Nenhuma ação de negócio relevante será executada diretamente pela observação ou previsão. A ação deverá ocorrer no módulo canônico correspondente, preservando autorização, estado, validação e auditoria.

---

## 6. Rotas previstas

- `/app/recursos-humanos/analytics`;
- `/app/recursos-humanos/analytics/visao-geral`;
- `/app/recursos-humanos/analytics/catalogo`;
- `/app/recursos-humanos/analytics/metricas/[id]`;
- `/app/recursos-humanos/analytics/qualidade`;
- `/app/recursos-humanos/analytics/relatorios`;
- `/app/recursos-humanos/analytics/relatorios/[id]`;
- `/app/recursos-humanos/analytics/operacionais`;
- `/app/recursos-humanos/analytics/custos`;
- `/app/recursos-humanos/analytics/jornada`;
- `/app/recursos-humanos/analytics/ausencias`;
- `/app/recursos-humanos/analytics/sst`;
- `/app/recursos-humanos/analytics/diversidade`;
- `/app/recursos-humanos/analytics/modelos`;
- `/app/recursos-humanos/analytics/modelos/[id]`;
- `/app/recursos-humanos/planejamento-forca-trabalho`;
- `/app/recursos-humanos/planejamento-forca-trabalho/[id]`;
- `/app/recursos-humanos/planejamento-forca-trabalho/cenarios/[id]`;
- `/app/recursos-humanos/analytics/auditoria`;
- `/app/configuracoes/recursos-humanos/analytics`.

Os caminhos são indicativos e deverão respeitar a arquitetura de navegação real antes da implementação.

---

## 7. Modelo funcional indicativo

### 7.1 Governança semântica

- `analytics_metric_definitions`;
- `analytics_metric_versions`;
- `analytics_dimensions`;
- `analytics_dimension_members`;
- `analytics_source_contracts`;
- `analytics_source_fields`;
- `analytics_calculation_dependencies`;
- `analytics_quality_rules`;
- `analytics_privacy_policies`.

### 7.2 Execução e observação

- `analytics_runs`;
- `analytics_run_sources`;
- `analytics_run_filters`;
- `analytics_run_quality_results`;
- `analytics_observations`;
- `analytics_observation_dimensions`;
- `analytics_snapshots`;
- `analytics_snapshot_members`;
- `analytics_suppression_events`.

### 7.3 Apresentação e distribuição

- `analytics_reports`;
- `analytics_report_versions`;
- `analytics_report_widgets`;
- `analytics_report_parameters`;
- `analytics_subscriptions`;
- `analytics_deliveries`;
- `analytics_exports`;
- `analytics_alert_rules`;
- `analytics_alert_occurrences`;
- `analytics_insights`.

### 7.4 Modelos e decisões

- `analytics_models`;
- `analytics_model_versions`;
- `analytics_model_features`;
- `analytics_model_evaluations`;
- `analytics_model_bias_tests`;
- `analytics_model_drift_checks`;
- `analytics_predictions`;
- `analytics_recommendations`;
- `analytics_human_reviews`;
- `analytics_human_decisions`.

### 7.5 Planejamento

- `workforce_plans`;
- `workforce_plan_versions`;
- `workforce_scenarios`;
- `workforce_scenario_assumptions`;
- `workforce_demand_lines`;
- `workforce_capacity_lines`;
- `workforce_gap_lines`;
- `workforce_cost_projections`;
- `workforce_plan_approvals`.

### 7.6 Auditoria

- `analytics_access_events`;
- `analytics_export_events`;
- `analytics_audit_events`;
- `analytics_decision_events`.

---

## 8. Dimensões conformadas

A camada semântica deverá suportar dimensões temporais e historicamente corretas para:

- organização;
- empresa empregadora;
- estabelecimento;
- inscrição e CNO;
- unidade organizacional;
- cargo;
- função;
- posição;
- lotação;
- centro de custo;
- obra;
- fase e frente de serviço;
- projeto;
- trabalhador;
- pessoa;
- vínculo;
- categoria;
- tipo de contrato;
- jornada;
- escala;
- sindicato ou instrumento coletivo, quando autorizado;
- localização;
- competência;
- calendário;
- evento de entrada;
- evento de saída;
- motivo interno;
- código externo;
- benefício;
- rubrica;
- risco e grupo de exposição;
- treinamento e habilitação.

Dimensões sensíveis ou com alto risco de reidentificação deverão exigir política específica.

---

## 9. Catálogo inicial de indicadores

### 9.1 Quadro e estrutura

- pessoas ativas;
- vínculos ativos;
- headcount no fim do período;
- headcount médio;
- FTE;
- posições autorizadas;
- posições ocupadas;
- posições vagas;
- span of control;
- distribuição por empresa, estabelecimento, unidade, cargo e obra;
- trabalhadores próprios e terceiros em visão segregada;
- mobilizações e desmobilizações.

### 9.2 Movimentação

- admissões;
- ativações;
- transferências;
- alterações contratuais;
- promoções e movimentações registradas;
- desligamentos;
- turnover total;
- turnover voluntário;
- turnover involuntário;
- retenção por coorte;
- tempo até ativação;
- tempo de permanência.

### 9.3 Jornada

- horas previstas;
- horas realizadas;
- horas extras;
- adicional noturno;
- ausências de marcação;
- tratamentos pendentes;
- saldo de banco de horas;
- folgas compensatórias;
- sobrejornada recorrente;
- divergência entre escala e presença;
- horas por obra e centro de custo.

### 9.4 Férias e afastamentos

- saldo de férias;
- períodos em risco de vencimento;
- férias programadas e gozadas;
- ausências justificadas e não justificadas;
- frequência de afastamentos;
- duração agregada;
- retorno pendente;
- impacto de disponibilidade;
- índice de absenteísmo com definição explícita;
- cobertura de equipe durante ausências.

### 9.5 Benefícios

- elegíveis;
- adesões;
- pessoas cobertas;
- custo patronal;
- contribuição do trabalhador;
- coparticipação;
- divergência de fornecedor;
- movimentações pendentes;
- documentos de dependentes a vencer;
- custo por categoria de benefício.

### 9.6 SST

- cobertura de inventário de riscos;
- ações do PGR pendentes;
- exames e ASOs a vencer;
- cobertura de treinamento;
- cobertura de EPI;
- habilitações válidas;
- incidentes e quase acidentes;
- frequência e gravidade segundo definição validada;
- ações corretivas em atraso;
- bloqueios operacionais;
- prontidão de emergência e resgate;
- indicadores psicossociais coletivos e contextuais.

O módulo não premiará redução de registros de incidentes nem usará quantidade reportada como prova automática de pior desempenho.

### 9.7 Folha e custos

- remuneração bruta;
- descontos;
- líquido;
- encargos;
- benefícios;
- custo total de mão de obra;
- custo por empresa, estabelecimento, unidade, centro de custo e obra;
- variação entre competências;
- diferenças retroativas;
- pagamentos rejeitados;
- divergências contábeis;
- custo previsto versus realizado.

### 9.8 Obrigações e conformidade

- eventos pendentes;
- eventos rejeitados;
- tempo de resolução;
- períodos não fechados;
- divergências de totalizadores;
- guias pendentes;
- pagamentos não conciliados;
- certificados a vencer;
- obrigações em risco de prazo;
- taxa de reconciliação por camada.

### 9.9 Desligamentos

- casos abertos;
- proteções pendentes;
- cálculos pendentes;
- pagamentos pendentes;
- eventos externos pendentes;
- offboarding incompleto;
- ativos não conciliados;
- tempo de ciclo;
- reintegrações;
- diferenças posteriores.

### 9.10 Diversidade, equidade e inclusão

Quando houver finalidade e base jurídica validadas:

- composição agregada;
- distribuição por níveis e funções;
- movimentações e promoções por grupos;
- remuneração agregada e faixas;
- admissões e desligamentos;
- acesso a treinamento;
- cobertura de benefícios;
- progressão e permanência;
- acessibilidade e inclusão de pessoas com deficiência.

Não serão publicados grupos pequenos ou cruzamentos que permitam reidentificação.

---

## 10. Planejamento da força de trabalho

### 10.1 Entradas

- carteira de obras e projetos;
- fases e cronogramas;
- produtividade de referência contextualizada;
- calendários e jornadas;
- cargos, funções e competências;
- habilitações e restrições;
- capacidade atual;
- férias e afastamentos conhecidos;
- admissões e desligamentos aprovados;
- terceiros disponíveis;
- custos e encargos;
- deslocamento e localização;
- premissas de absenteísmo e turnover;
- limites de orçamento fornecidos pelo Financeiro.

### 10.2 Resultados

- demanda por período;
- capacidade disponível;
- lacuna de quantidade;
- lacuna de competência;
- excesso ou ociosidade potencial;
- necessidade de mobilização;
- necessidade de treinamento;
- necessidade de contratação;
- necessidade de terceiros;
- conflito de alocação;
- custo projetado;
- riscos e sensibilidades;
- intervalo de incerteza.

### 10.3 Cenários mínimos

- base;
- conservador;
- provável;
- acelerado;
- atraso de obra;
- restrição de orçamento;
- indisponibilidade de função crítica;
- aumento de demanda;
- maior absenteísmo;
- maior turnover;
- internalização ou terceirização;
- alteração de método construtivo.

### 10.4 Conversão em ação

Um cenário aprovado poderá originar propostas, nunca ações automáticas, para:

- criação ou autorização de posições;
- requisições de contratação;
- transferências;
- contratação de terceiros;
- treinamentos;
- alterações de escala;
- reservas de equipe;
- atualização de orçamento.

Cada proposta deverá seguir o fluxo do módulo canônico correspondente.

---

## 11. Privacidade e uso responsável

### 11.1 Finalidade

Cada métrica, relatório, modelo e exportação deverá ter finalidade documentada.

### 11.2 Minimização

Somente campos necessários serão disponibilizados. Nome, CPF, documento, endereço, saúde, biometria e dados familiares não serão dimensões gerais de análise.

### 11.3 Supressão

Resultados serão suprimidos quando grupos, filtros ou cruzamentos permitirem identificação direta ou indireta além do risco aceito.

### 11.4 Dados sensíveis

Acesso a análises sensíveis exigirá capacidade específica, finalidade, aprovação, agregação e auditoria reforçadas.

### 11.5 Decisões relevantes

Nenhuma decisão adversa será tomada exclusivamente por resultado automatizado. A revisão humana deverá ter autoridade real para discordar.

### 11.6 Transparência

O trabalhador terá acesso, quando aplicável, às informações sobre tratamento, critérios e procedimentos utilizados em decisões automatizadas que afetem seus interesses, respeitados os limites legais.

### 11.7 Não discriminação

Modelos e relatórios não poderão usar atributos protegidos ou proxies indevidos para limitar acesso, manutenção ou progressão na relação de trabalho.

### 11.8 Retenção

Observações, snapshots, logs e exportações terão prazos conforme finalidade, obrigação, necessidade de auditoria e política aprovada.

---

## 12. Governança de modelos

Modelos deverão possuir:

- problema de negócio;
- finalidade;
- população;
- conjunto de dados;
- período de treino e teste;
- variáveis;
- justificativas;
- variáveis proibidas;
- algoritmo;
- métricas de desempenho;
- baseline;
- intervalo de confiança quando aplicável;
- explicabilidade global e local;
- testes por grupos;
- avaliação de impacto;
- aprovação de RH, Privacidade e Compliance;
- plano de monitoramento;
- gatilhos de suspensão;
- revisão periódica;
- registro das recomendações e decisões humanas.

Modelos de alto risco deverão iniciar em modo sombra, sem produzir efeitos operacionais.

---

## 13. Estados

### 13.1 Métrica

`DRAFT`, `UNDER_REVIEW`, `APPROVED`, `ACTIVE`, `DEPRECATED`, `RETIRED`.

### 13.2 Execução

`QUEUED`, `EXTRACTING`, `VALIDATING`, `CALCULATING`, `PRIVACY_CHECK`, `PUBLISHING`, `PUBLISHED`, `BLOCKED_BY_QUALITY`, `BLOCKED_BY_PRIVACY`, `FAILED`, `CANCELLED`, `SUPERSEDED`.

### 13.3 Relatório

`DRAFT`, `UNDER_REVIEW`, `PUBLISHED`, `SUSPENDED`, `ARCHIVED`.

### 13.4 Alerta

`OPEN`, `ACKNOWLEDGED`, `UNDER_ANALYSIS`, `RESOLVED`, `DISMISSED`, `EXPIRED`.

### 13.5 Modelo

`PROPOSED`, `DATA_REVIEW`, `PRIVACY_REVIEW`, `BIAS_REVIEW`, `VALIDATED`, `APPROVED_FOR_PILOT`, `ACTIVE`, `SUSPENDED`, `RETIRED`.

### 13.6 Cenário

`DRAFT`, `CALCULATED`, `UNDER_REVIEW`, `APPROVED`, `SUPERSEDED`, `CANCELLED`, `ARCHIVED`.

---

## 14. Requisitos funcionais

### Catálogo, semântica e definições

- **RF-001:** manter catálogo de métricas com identificador estável.
- **RF-002:** versionar nome, descrição, finalidade, fórmula e vigência da métrica.
- **RF-003:** registrar responsável funcional e técnico por métrica.
- **RF-004:** declarar unidade de contagem e grão.
- **RF-005:** declarar população incluída e excluída.
- **RF-006:** declarar numerador, denominador e unidade de medida.
- **RF-007:** declarar regras temporais e instante de corte.
- **RF-008:** declarar tratamento de nulos, duplicidades e atrasos.
- **RF-009:** declarar arredondamento e precisão.
- **RF-010:** registrar fontes, campos e versões de origem.
- **RF-011:** cadastrar dimensões conformadas com vigência.
- **RF-012:** impedir uso de dimensão não autorizada para a métrica.
- **RF-013:** manter dependências entre métricas.
- **RF-014:** detectar ciclos de dependência.
- **RF-015:** disponibilizar exemplos e casos de teste da definição.
- **RF-016:** submeter definição a revisão e aprovação.
- **RF-017:** impedir alteração silenciosa de versão ativa.
- **RF-018:** marcar métricas substituídas e equivalências.
- **RF-019:** comparar versões e impactos.
- **RF-020:** publicar dicionário acessível aos usuários autorizados.

### Fontes, qualidade e execução

- **RF-021:** cadastrar contratos de dados dos módulos de origem.
- **RF-022:** registrar periodicidade, watermark e SLA de cada fonte.
- **RF-023:** validar esquema, tipo, obrigatoriedade e chaves.
- **RF-024:** validar integridade referencial e temporal.
- **RF-025:** registrar completude, validade, unicidade e atualidade.
- **RF-026:** reconciliar totais analíticos com totais canônicos.
- **RF-027:** bloquear execução quando qualidade impeditiva falhar.
- **RF-028:** publicar ressalva quando qualidade não impeditiva falhar.
- **RF-029:** criar execução imutável para cada processamento.
- **RF-030:** registrar filtros, população, fontes e hash da execução.
- **RF-031:** executar cálculo por período e dimensão autorizados.
- **RF-032:** suportar execução incremental e completa.
- **RF-033:** reprocessar sem sobrescrever observações publicadas.
- **RF-034:** registrar registros aceitos, rejeitados e motivos.
- **RF-035:** registrar duração e consumo da execução.
- **RF-036:** permitir cancelamento seguro antes da publicação.
- **RF-037:** aplicar políticas de privacidade antes da publicação.
- **RF-038:** gerar observações com linhagem.
- **RF-039:** manter snapshots de população quando exigidos.
- **RF-040:** comparar observações produzidas por versões diferentes.

### Relatórios e dashboards

- **RF-041:** criar relatórios a partir de métricas aprovadas.
- **RF-042:** versionar estrutura, filtros e widgets.
- **RF-043:** publicar relatórios com responsável e finalidade.
- **RF-044:** suportar parâmetros permitidos e valores padrão.
- **RF-045:** exibir período, corte, atualização e versão da métrica.
- **RF-046:** exibir qualidade e ressalvas do resultado.
- **RF-047:** permitir drill-down somente quando autorizado.
- **RF-048:** preservar filtros ao navegar para detalhe.
- **RF-049:** diferenciar relatório operacional de estatístico.
- **RF-050:** impedir identificação nominal em relatório estatístico sem permissão.
- **RF-051:** permitir comparação temporal e entre cenários compatíveis.
- **RF-052:** alertar comparações entre definições incompatíveis.
- **RF-053:** suportar séries, coortes, distribuições e funis.
- **RF-054:** suportar metas sem alterar observações.
- **RF-055:** registrar comentários e interpretações com autoria.
- **RF-056:** permitir assinatura de relatório.
- **RF-057:** distribuir relatório com política de acesso vigente no envio.
- **RF-058:** suspender relatório quando fonte ou métrica for invalidada.
- **RF-059:** arquivar mantendo histórico.
- **RF-060:** registrar visualizações de relatórios sensíveis.

### Alertas, exportações e autosserviço

- **RF-061:** configurar alertas sobre métricas aprovadas.
- **RF-062:** versionar regra, janela, limiar e destinatários.
- **RF-063:** deduplicar ocorrências equivalentes.
- **RF-064:** permitir reconhecimento, análise e resolução.
- **RF-065:** impedir alerta de declarar culpa ou fraude automaticamente.
- **RF-066:** permitir exportação somente com permissão específica.
- **RF-067:** registrar finalidade, filtros, colunas e exportador.
- **RF-068:** aplicar supressão e mascaramento também na exportação.
- **RF-069:** incluir classificação e marca d'água quando aplicável.
- **RF-070:** expirar artefatos de exportação.
- **RF-071:** bloquear exportação massiva fora de limite autorizado.
- **RF-072:** auditar downloads e compartilhamentos controlados.
- **RF-073:** disponibilizar construtor semântico sem SQL arbitrário.
- **RF-074:** limitar métricas e dimensões por papel e finalidade.
- **RF-075:** estimar cardinalidade e risco antes de executar consulta.
- **RF-076:** bloquear combinações com alto risco de reidentificação.
- **RF-077:** salvar consultas como rascunho ou relatório governado.
- **RF-078:** impedir publicação de consulta não aprovada.
- **RF-079:** limitar custo e duração de consultas.
- **RF-080:** registrar trilha de consultas sensíveis.

### People Analytics e modelos

- **RF-081:** cadastrar caso de uso analítico ou preditivo.
- **RF-082:** classificar risco e impacto do caso de uso.
- **RF-083:** registrar dataset, período e população.
- **RF-084:** registrar variáveis permitidas e proibidas.
- **RF-085:** justificar uso de cada variável.
- **RF-086:** versionar algoritmo, hiperparâmetros e artefatos.
- **RF-087:** registrar métricas de desempenho e baseline.
- **RF-088:** executar testes de viés por grupos autorizados.
- **RF-089:** executar testes de estabilidade e drift.
- **RF-090:** armazenar explicações globais e locais.
- **RF-091:** operar modelo em modo sombra.
- **RF-092:** aprovar modelo antes de produzir recomendações.
- **RF-093:** suspender modelo por drift, viés ou incidente.
- **RF-094:** registrar cada previsão com versão e entradas.
- **RF-095:** registrar recomendação separada da previsão.
- **RF-096:** exigir revisão humana para efeito relevante.
- **RF-097:** registrar decisão humana e divergência da recomendação.
- **RF-098:** oferecer canal de revisão ou contestação aplicável.
- **RF-099:** impedir decisão adversa exclusivamente automatizada.
- **RF-100:** retirar modelo preservando histórico e explicações.

### Planejamento da força de trabalho

- **RF-101:** criar plano por organização, empresa ou escopo autorizado.
- **RF-102:** versionar horizonte, calendário e premissas.
- **RF-103:** criar múltiplos cenários comparáveis.
- **RF-104:** importar demanda de obras e projetos por período.
- **RF-105:** calcular capacidade por função, competência e localização.
- **RF-106:** considerar férias, afastamentos e indisponibilidades conhecidas.
- **RF-107:** considerar habilitações e treinamentos válidos.
- **RF-108:** calcular lacunas de quantidade e competência.
- **RF-109:** identificar conflitos de alocação.
- **RF-110:** projetar custo com parâmetros versionados.
- **RF-111:** registrar intervalo e sensibilidade das projeções.
- **RF-112:** simular mobilização, desmobilização e terceiros.
- **RF-113:** comparar previsto, aprovado e realizado.
- **RF-114:** submeter cenário a revisão e aprovação.
- **RF-115:** impedir que cenário crie posição ou contratação automaticamente.
- **RF-116:** gerar propostas para módulos canônicos.
- **RF-117:** rastrear proposta até ação aprovada ou rejeitada.
- **RF-118:** preservar cenários aprovados como imutáveis.
- **RF-119:** explicar diferenças entre cenários.
- **RF-120:** consolidar dossiê do plano, premissas, aprovações e resultados.

---

## 15. Regras de negócio

- **RN-001:** dashboard nunca será fonte canônica de fatos.
- **RN-002:** métrica sem definição aprovada não poderá ser publicada.
- **RN-003:** mudança de fórmula, população ou temporalidade exigirá nova versão.
- **RN-004:** observação publicada não será sobrescrita.
- **RN-005:** todo resultado deverá indicar unidade de contagem.
- **RN-006:** pessoa, vínculo, posição e FTE não serão intercambiáveis.
- **RN-007:** headcount deverá declarar instante ou regra de média.
- **RN-008:** turnover deverá declarar população, entradas, saídas e denominador.
- **RN-009:** absenteísmo deverá declarar horas previstas e ausências incluídas.
- **RN-010:** custo deverá declarar competência, caixa ou apropriação.
- **RN-011:** comparação exigirá definições compatíveis ou alerta explícito.
- **RN-012:** fato, vigência, registro e processamento manterão tempos separados.
- **RN-013:** correção retroativa não apagará observação originalmente publicada.
- **RN-014:** toda execução terá watermark e fontes identificadas.
- **RN-015:** registros rejeitados por qualidade serão quantificados.
- **RN-016:** falha impeditiva de qualidade bloqueará publicação.
- **RN-017:** falha não impeditiva produzirá ressalva visível.
- **RN-018:** dimensão historicamente variável será resolvida conforme modalidade declarada.
- **RN-019:** drill-down não ampliará o escopo autorizado.
- **RN-020:** filtro não poderá contornar política de acesso.
- **RN-021:** relatório estatístico aplicará agregação por padrão.
- **RN-022:** relatório operacional identificará apenas quem exige ação autorizada.
- **RN-023:** grupo abaixo do limite de privacidade será suprimido ou generalizado.
- **RN-024:** o limite de grupo será política versionada, não constante universal.
- **RN-025:** cruzamentos sucessivos serão avaliados contra reidentificação.
- **RN-026:** dado sensível não será dimensão geral de autosserviço.
- **RN-027:** dado de saúde não será exibido a gestor fora da finalidade operacional autorizada.
- **RN-028:** prontuário clínico não alimentará People Analytics geral.
- **RN-029:** dado biométrico bruto não será usado como variável analítica geral.
- **RN-030:** filiação sindical não será usada para decisão adversa.
- **RN-031:** raça, deficiência, sexo, idade e situação familiar não serão usados para discriminação.
- **RN-032:** análises de equidade terão finalidade, acesso e agregação reforçados.
- **RN-033:** relatório de diversidade não permitirá identificação por grupo pequeno.
- **RN-034:** exportação exigirá permissão distinta de visualização.
- **RN-035:** exportação manterá filtros, supressões e classificação.
- **RN-036:** arquivo exportado expirará conforme política.
- **RN-037:** consultas ad hoc não executarão código ou SQL arbitrário de usuário de negócio.
- **RN-038:** alerta não será prova de fraude, culpa ou baixo desempenho.
- **RN-039:** correlação não será descrita como causalidade.
- **RN-040:** previsão deverá informar incerteza e limitações.
- **RN-041:** recomendação não executará ação automaticamente.
- **RN-042:** decisão relevante terá responsável humano identificado.
- **RN-043:** revisão humana deverá poder rejeitar a recomendação.
- **RN-044:** divergência humana do modelo será registrada sem punição automática.
- **RN-045:** modelo sem caso de uso aprovado não processará dados reais.
- **RN-046:** variável sem justificativa será removida do modelo.
- **RN-047:** atributo protegido e proxy indevido serão proibidos conforme caso de uso.
- **RN-048:** modelo de alto risco iniciará em modo sombra.
- **RN-049:** modelo com drift ou viés acima do limite será suspenso.
- **RN-050:** score único de trabalhador será proibido.
- **RN-051:** inferência de emoção será proibida.
- **RN-052:** quantidade de atestados não gerará ranking individual.
- **RN-053:** número de acidentes reportados não gerará punição automática.
- **RN-054:** redução de notificações não será usada isoladamente como indicador positivo de SST.
- **RN-055:** produtividade individual não será inferida somente de horas ou tarefas.
- **RN-056:** análise de obra considerará método, equipe, risco, qualidade e restrições.
- **RN-057:** plano de força de trabalho não criará vínculo.
- **RN-058:** cenário não criará posição autorizada.
- **RN-059:** cenário aprovado será imutável.
- **RN-060:** nova premissa gerará nova versão ou cenário.
- **RN-061:** capacidade deverá considerar vigência de lotação e disponibilidade.
- **RN-062:** trabalhador ativo não será automaticamente contado como disponível.
- **RN-063:** terceiro será contado separadamente de empregado.
- **RN-064:** vaga será separada de pessoa ausente.
- **RN-065:** conflito de alocação não será resolvido automaticamente.
- **RN-066:** custo projetado não será lançamento financeiro.
- **RN-067:** proposta de contratação seguirá o módulo canônico de admissão.
- **RN-068:** proposta de transferência seguirá fluxo contratual e de lotação.
- **RN-069:** proposta de treinamento seguirá o domínio de habilitações.
- **RN-070:** dado desatualizado além do SLA será sinalizado.
- **RN-071:** assinatura de relatório respeitará acesso vigente em cada entrega.
- **RN-072:** perda de acesso interromperá entregas futuras.
- **RN-073:** relatório invalidado será suspenso, não apagado.
- **RN-074:** histórico de definição, execução e decisão será preservado.
- **RN-075:** acesso sensível será auditado com finalidade.
- **RN-076:** logs não armazenarão payload pessoal desnecessário.
- **RN-077:** caches respeitarão tenant, escopo e política de privacidade.
- **RN-078:** observações de organizações diferentes não serão misturadas.
- **RN-079:** modelos e relatórios não atravessarão tenant sem autorização legítima e arquitetura específica.
- **RN-080:** qualquer implementação deverá revalidar legislação, política e riscos vigentes.

---

## 16. Requisitos não funcionais

### 16.1 Segurança

- RLS e autorização por tenant, capacidade e escopo;
- criptografia em trânsito e repouso;
- segregação de datasets sensíveis;
- segredos fora de código e logs;
- proteção contra inferência e extração massiva;
- trilha de acesso e exportação;
- expiração de artefatos;
- revisão periódica de permissões.

### 16.2 Privacidade

- privacidade desde a concepção;
- minimização;
- finalidade e retenção;
- pseudonimização e anonimização quando apropriadas;
- avaliação de impacto para tratamentos de risco;
- suporte a direitos dos titulares;
- revisão de decisões automatizadas aplicáveis.

### 16.3 Reprodutibilidade

- versões imutáveis;
- hashes;
- snapshots;
- lineage;
- parâmetros persistidos;
- execução idempotente;
- distinção entre reprocessamento e correção.

### 16.4 Desempenho

- agregações incrementais;
- particionamento temporal;
- limites de consulta;
- cache com escopo seguro;
- filas para cargas pesadas;
- degradação controlada;
- paginação em detalhes.

### 16.5 Observabilidade

- duração e estado de cargas;
- freshness;
- qualidade;
- falhas e retries;
- consumo;
- acessos sensíveis;
- exportações;
- drift e desempenho de modelos.

### 16.6 Acessibilidade

- navegação por teclado;
- leitores de tela;
- contraste;
- tabelas acessíveis;
- alternativas textuais para gráficos;
- não depender somente de cor;
- exportações acessíveis quando aplicável.

---

## 17. Critérios de aceite

- **CA-001:** uma métrica publicada exibe definição, versão, população, fórmula e fonte.
- **CA-002:** alterar a fórmula cria nova versão sem modificar a anterior.
- **CA-003:** dashboard não permite editar fatos canônicos.
- **CA-004:** execução registra filtros, corte, fontes e hash.
- **CA-005:** reprocessamento cria nova execução e preserva a observação anterior.
- **CA-006:** indicador declara se conta pessoa, vínculo, posição ou FTE.
- **CA-007:** headcount de fechamento difere corretamente de headcount médio.
- **CA-008:** comparação incompatível apresenta bloqueio ou alerta.
- **CA-009:** falha de qualidade impeditiva bloqueia publicação.
- **CA-010:** falha não impeditiva aparece como ressalva.
- **CA-011:** drill-down respeita tenant e escopo do usuário.
- **CA-012:** gestor sem permissão não acessa dado clínico ou sensível.
- **CA-013:** relatório estatístico suprime grupo abaixo da política.
- **CA-014:** filtros sucessivos não revelam célula suprimida.
- **CA-015:** exportação aplica a mesma supressão da tela.
- **CA-016:** usuário com visualização e sem exportação não baixa arquivo.
- **CA-017:** exportação registra finalidade, filtros, colunas e responsável.
- **CA-018:** artefato expirado não pode ser baixado.
- **CA-019:** assinatura deixa de entregar após perda de acesso.
- **CA-020:** relatório suspenso mantém histórico e não aparece como vigente.
- **CA-021:** alerta registra estado, responsável e resolução.
- **CA-022:** alerta não executa punição ou desligamento.
- **CA-023:** consulta ad hoc não aceita SQL arbitrário.
- **CA-024:** consulta com risco de reidentificação é bloqueada.
- **CA-025:** dado sensível exige capacidade específica e auditoria.
- **CA-026:** análise de diversidade não identifica grupos pequenos.
- **CA-027:** modelo registra dataset, versão, variáveis e desempenho.
- **CA-028:** variável proibida impede aprovação do modelo.
- **CA-029:** modelo de alto risco opera primeiro em modo sombra.
- **CA-030:** recomendação registra explicação e limitações.
- **CA-031:** ação relevante exige revisão humana.
- **CA-032:** revisor pode discordar e registrar fundamento.
- **CA-033:** decisão humana não é sobrescrita por nova previsão.
- **CA-034:** modelo com drift acima do limite é suspenso.
- **CA-035:** versão retirada continua auditável.
- **CA-036:** sistema não oferece score único de trabalhador.
- **CA-037:** sistema não cria ranking por atestados ou acidentes.
- **CA-038:** relatório de SST não expõe prontuário clínico.
- **CA-039:** cenário mantém premissas, horizonte e versões utilizadas.
- **CA-040:** alterar premissa cria nova versão ou cenário.
- **CA-041:** cenário aprovado permanece imutável.
- **CA-042:** plano diferencia demanda, capacidade e lacuna.
- **CA-043:** capacidade exclui indisponibilidades conforme regra aprovada.
- **CA-044:** conflito de alocação é apresentado sem remanejamento automático.
- **CA-045:** custo projetado não gera lançamento financeiro.
- **CA-046:** proposta de contratação não cria vínculo automaticamente.
- **CA-047:** proposta mantém rastreabilidade até aprovação ou rejeição.
- **CA-048:** cenários podem ser comparados com diferenças explicadas.
- **CA-049:** previsto, aprovado e realizado permanecem separados.
- **CA-050:** relatório exibe data de atualização e atraso da fonte.
- **CA-051:** execução entre tenants não mistura observações.
- **CA-052:** logs não exibem dados pessoais sensíveis desnecessários.
- **CA-053:** acesso e exportação sensíveis aparecem na auditoria.
- **CA-054:** dossiê reproduz definição, execução, observação e decisão.
- **CA-055:** nenhuma migration, dashboard ou modelo é criado apenas pela aprovação desta especificação.

---

## 18. Testes obrigatórios

### 18.1 Unitários

- fórmulas de métricas;
- população e denominadores;
- regras temporais;
- supressão;
- qualidade;
- estados;
- comparação de versões;
- cenários e custos.

### 18.2 Contrato

- fontes canônicas;
- campos e tipos;
- watermarks;
- eventos de alteração;
- compatibilidade de versões.

### 18.3 Integração

- cadastro e estrutura;
- contratos e lotações;
- ponto e banco;
- férias e afastamentos;
- benefícios;
- SST;
- folha e Financeiro;
- obrigações digitais;
- desligamentos;
- obras e centros de custo.

### 18.4 Segurança e privacidade

- RLS;
- escopo;
- exportação;
- supressão por filtros;
- inferência;
- caches;
- logs;
- acesso sensível;
- expiração;
- isolamento de tenant.

### 18.5 Modelos

- qualidade de dados;
- leakage;
- desempenho;
- robustez;
- viés;
- explicabilidade;
- drift;
- modo sombra;
- suspensão e rollback.

### 18.6 Concorrência

- execução duplicada;
- publicação concorrente;
- alteração de métrica durante execução;
- expiração durante download;
- aprovação concorrente de cenário.

### 18.7 Ponta a ponta

- definição até dashboard;
- qualidade bloqueando publicação;
- supressão de grupo pequeno;
- exportação auditada;
- modelo em modo sombra até revisão humana;
- cenário de obra até proposta sem execução automática.

---

## 19. Relatórios mínimos de primeira onda

1. quadro atual e histórico;
2. admissões, desligamentos e turnover;
3. posições, vagas e ocupação;
4. jornada, horas extras e banco;
5. férias e afastamentos;
6. benefícios e custos;
7. cobertura de SST e habilitações;
8. incidentes e ações corretivas agregadas;
9. folha e custo de mão de obra;
10. obrigações digitais e reconciliações;
11. offboarding e pendências;
12. capacidade de equipes por obra;
13. lacunas de competências;
14. previsto versus realizado;
15. qualidade e atualidade dos dados.

---

## 20. Riscos principais

- métricas com definições divergentes;
- contagem dupla por múltiplos vínculos;
- uso de posição como pessoa;
- histórico reescrito por correção tardia;
- grupos pequenos reidentificados;
- exportações fora de controle;
- dados clínicos expostos;
- proxies discriminatórios;
- correlação descrita como causa;
- modelo com drift;
- recomendação tratada como decisão;
- vigilância individual;
- score único de trabalhador;
- incentivo à subnotificação de incidentes;
- produtividade sem contexto;
- cenário confundido com orçamento ou contratação;
- dados desatualizados apresentados como atuais;
- consultas que atravessam tenant;
- dashboards paralelos em planilhas;
- dependência de fornecedor de BI sem portabilidade ou linhagem.

---

## 21. Sequência de implementação proposta

1. inventário de fontes canônicas;
2. classificação de dados e finalidades;
3. contratos de origem;
4. dimensões conformadas e temporalidade;
5. catálogo inicial de métricas;
6. regras de qualidade;
7. políticas de privacidade e supressão;
8. execução e observações;
9. relatórios operacionais prioritários;
10. dashboards agregados;
11. exportações e assinaturas;
12. planejamento da força de trabalho;
13. governança de modelos;
14. piloto em modo sombra;
15. auditoria e homologação;
16. expansão controlada.

Nenhuma fase deverá avançar sem testes, evidências e reconciliação com os módulos canônicos.

---

## 22. Baseline oficial verificada em 6 de agosto de 2026

A especificação considera:

- Lei Geral de Proteção de Dados Pessoais em texto compilado;
- definição de dados pessoais, dados sensíveis, anonimização e relatório de impacto;
- princípios de finalidade, adequação, necessidade, qualidade, transparência, segurança, prevenção, não discriminação e prestação de contas;
- requisitos para tratamento de dados sensíveis;
- direito de solicitar revisão de decisões tomadas unicamente com base em tratamento automatizado que afetem interesses;
- deveres de registro, segurança desde a concepção e governança;
- Lei nº 9.029/1995 sobre práticas discriminatórias e limitativas na relação de trabalho;
- Agenda Regulatória da ANPD 2025–2026;
- Mapa de Temas Prioritários da ANPD 2026–2027, com atenção a direitos dos titulares e inteligência artificial e tecnologias emergentes.

A implementação deverá revalidar normas e orientações, especialmente para decisões automatizadas, inteligência artificial, dados de alto risco, anonimização, pseudonimização, biometria, saúde, relatórios de impacto e direitos dos titulares.

---

## 23. Estado honesto

Este documento contém apenas especificação funcional.

Não foram implementados:

- tabelas;
- migrations;
- data warehouse;
- camada semântica;
- métrica executável;
- ETL ou ELT;
- dashboard;
- exportação;
- modelo preditivo;
- score;
- cenário executável;
- decisão automatizada;
- integração de BI.

---

## 24. Conclusão

O Módulo 12 encerra a primeira especificação funcional dos domínios do Projeto RH com uma camada analítica governada, reproduzível e orientada a decisões humanas.

Os próximos documentos deverão transformar a arquitetura funcional em plano técnico executável, com dados, APIs, migrations, segurança, implantação, testes e roadmap sem quebrar as fronteiras definidas nos módulos 01 a 12.
