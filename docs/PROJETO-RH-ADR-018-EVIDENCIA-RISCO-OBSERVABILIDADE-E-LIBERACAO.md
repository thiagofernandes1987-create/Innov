# Projeto RH — ADR-018 — Evidência, Risco, Observabilidade e Liberação

**Estado:** decisão de qualidade e segurança registrada; implementação pendente  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**Módulo relacionado:** `PROJETO-RH-MODULO-18-QUALIDADE-TESTES-OBSERVABILIDADE-SEGURANCA-E-EVIDENCIAS.md`

---

## 1. Contexto

Os módulos 01 a 17 definiram domínio, arquitetura, backlog, modelo físico, contratos e experiência. O próximo risco é considerar que uma funcionalidade está pronta porque:

- compilou;
- passou em um teste unitário;
- exibiu uma tela correta;
- foi mesclada;
- foi implantada em preview;
- registrou algum log;
- não gerou reclamação imediata;
- ou recebeu uma aprovação informal.

No Projeto RH, erros podem afetar remuneração, tributos, obrigações governamentais, jornadas, férias, benefícios, saúde ocupacional, desligamentos, acesso a dados sensíveis e direitos de titulares. Portanto, a evidência necessária deverá crescer de acordo com o risco da alteração e com o impacto de uma falha.

A plataforma já possui:

- lint, typecheck, build e Vitest;
- Playwright e harness de QA visual;
- validadores semânticos e estruturais;
- testes SQL transacionais com `ROLLBACK`;
- testes concorrentes e E2E;
- replay de migrations;
- observabilidade, alertas, health checks e diagnósticos;
- trilhas append-only;
- correlação por identificador;
- drills de backup e restauração;
- artifacts de CI.

Esses recursos serão reutilizados e ampliados, sem transformar sua existência em prova automática de que o RH atende aos requisitos.

---

## 2. Decisão

A qualidade do RH será governada por uma cadeia explícita:

```text
Risco e requisito
  → critério de aceite
    → estratégia de verificação
      → execução reproduzível
        → evidência íntegra
          → revisão independente
            → decisão de gate
              → monitoramento em operação
```

Nenhuma camada substituirá a anterior.

```text
Teste planejado
  ≠ teste implementado
  ≠ teste executado
  ≠ teste aprovado
  ≠ evidência aceita
  ≠ autorização de liberação
```

A liberação dependerá de evidências proporcionais ao risco e não apenas do estado verde de um pipeline genérico.

---

## 3. Separações obrigatórias

### 3.1 Requisito, critério, teste e evidência

- requisito define o comportamento ou controle esperado;
- critério de aceite define como reconhecer o resultado aceitável;
- caso de teste define a verificação;
- execução produz um resultado;
- artifact preserva uma saída;
- evidência combina resultado, contexto, integridade e rastreabilidade;
- gate decide se o conjunto de evidências é suficiente.

### 3.2 Log, auditoria, métrica e trace

- log técnico descreve execução e diagnóstico;
- auditoria de negócio registra ação, ator, motivo e efeito relevante;
- métrica mede comportamento agregado;
- trace correlaciona uma operação entre componentes;
- alerta comunica uma condição acionável;
- incidente é um evento operacional tratado por processo próprio.

Um log não substituirá auditoria. Uma auditoria não substituirá telemetria. Um alerta não provará a causa.

### 3.3 Cobertura e confiança

Percentual de cobertura de linhas não será usado isoladamente como indicador de confiança.

A cobertura prioritária será de:

- invariantes;
- transições de estado;
- decisões de autorização;
- limites temporais;
- fórmulas e arredondamentos;
- idempotência;
- concorrência;
- segregação de tenant;
- reconciliação;
- compensações;
- falhas e respostas incertas.

### 3.4 Ambiente e produção

- sucesso local não prova sucesso no CI;
- sucesso no CI não prova sucesso no ambiente integrado;
- sucesso em homologação não prova prontidão operacional;
- deployment não prova ativação;
- ativação não prova estabilização.

---

## 4. Classificação por risco

Toda alteração futura receberá uma classe antes da implementação.

| Classe | Descrição | Exemplos |
|---|---|---|
| Q0 | documental ou visual sem efeito de negócio | texto, documentação, ajuste não funcional validado |
| Q1 | operação comum reversível | filtro, consulta, cadastro auxiliar |
| Q2 | regra de negócio relevante | contrato, saldo, fechamento de período |
| Q3 | dado sensível, cálculo financeiro ou integração externa | folha, benefício, prontuário, transmissão |
| Q4 | efeito legal, financeiro ou operacional difícil de reverter | pagamento, fechamento oficial, desligamento, evento governamental |

A classe poderá aumentar por:

- volume;
- retroatividade;
- abrangência multiempresa;
- acesso privilegiado;
- uso de Service Role;
- alteração de RLS;
- migration destrutiva;
- mudança de fórmula;
- dependência externa;
- ausência de rollback simples.

Alterações Q3 e Q4 exigirão revisão independente e evidência reforçada.

---

## 5. Camadas mínimas de verificação

```text
Estática e estrutural
  → unidade e propriedades
    → banco, constraints, RLS e RPCs
      → contratos, eventos e schemas
        → integração e adapters
          → E2E e jornadas
            → visual e acessibilidade
              → carga, concorrência e resiliência
                → segurança e privacidade
                  → migration, recuperação e cutover
                    → sombra, reconciliação e produção assistida
```

Nem toda alteração executará todas as camadas, mas toda dispensa deverá ser justificada pelo risco.

---

## 6. Qualidade de cálculo

Motores de folha, ponto, férias, rescisão, benefícios e indicadores usarão:

- testes determinísticos;
- tabelas de decisão;
- casos de fronteira;
- testes baseados em propriedades;
- datasets dourados versionados;
- comparação com memória de cálculo aprovada;
- reconciliação por trabalhador, rubrica, base e total;
- tolerância explícita e nunca implícita;
- reprodução por versão de regra e parâmetros.

Um valor correto sem memória reproduzível não será suficiente para folha oficial.

---

## 7. Evidência reproduzível

Cada pacote de evidência deverá registrar, conforme aplicável:

- identificador do requisito e do risco;
- commit e branch;
- ambiente e versões;
- comando executado;
- dados de teste ou seed;
- tenant e escopo artificiais;
- horário de início e fim;
- resultado esperado e observado;
- arquivos produzidos;
- hashes dos artifacts;
- logs sanitizados;
- correlation IDs;
- autor da execução;
- revisor;
- exceções e limitações;
- validade ou condição de invalidação.

Captura de tela isolada não provará uma transação de banco. Log isolado não provará uma regra de negócio. Documento escrito não provará execução.

---

## 8. Observabilidade

O RH integrará a estrutura existente da Etapa 19 e adicionará fontes próprias sem copiar eventos canônicos.

```text
Evento de domínio ou operação
  → audit trail próprio
    → normalização observável
      → correlation_id e causation_id
        → métricas, logs e traces
          → alerta acionável
            → diagnóstico e runbook
```

A telemetria deverá:

- ser estruturada;
- preservar correlação;
- usar códigos estáveis;
- evitar dados pessoais desnecessários;
- redigir segredos e conteúdo clínico;
- distinguir ambiente, tenant e componente;
- registrar estado incerto;
- permitir investigação sem acesso irrestrito ao conteúdo de negócio.

---

## 9. SLI, SLO e alertas

SLIs e SLOs serão definidos por capacidade, não por uma disponibilidade genérica do aplicativo.

Exemplos de capacidades:

- autenticar e obter contexto;
- registrar marcação;
- fechar período de ponto;
- calcular folha;
- emitir demonstrativo;
- processar transmissão;
- reconciliar retorno;
- gerar arquivo bancário;
- consultar portal do trabalhador.

Nenhum valor numérico de SLO será inventado nesta fase. Metas serão aprovadas antes do piloto com base em criticidade, capacidade operacional e dados observados.

Alertas deverão ser:

- acionáveis;
- deduplicados;
- classificados por severidade;
- ligados a responsável e runbook;
- sujeitos a janela, cooldown e manutenção;
- avaliados quanto a falso positivo e fadiga.

---

## 10. Segurança de desenvolvimento

O RH adotará como referências de controle:

- OWASP ASVS 5.0.0, com identificadores versionados;
- OWASP Top 10:2025;
- OWASP API Security Top 10:2023;
- NIST SSDF 1.1 como baseline final, acompanhando a revisão 1.2 ainda não final;
- práticas de logging seguro e minimização de dados;
- controles de cadeia de suprimentos e dependências.

Essas referências serão usadas como catálogo e matriz de rastreabilidade. O projeto não declarará conformidade integral sem avaliação específica.

Fluxos de maior risco terão baseline equivalente ao rigor ASVS nível 2, acrescida de controles selecionados de nível 3 para:

- administração privilegiada;
- folha e pagamentos;
- prontuário e dados clínicos;
- dados judiciais;
- certificados e segredos;
- transmissão governamental;
- mudanças de autorização e RLS.

---

## 11. Cadeia de suprimentos

Antes da implementação deverão existir gates para:

- lockfile imutável no CI;
- dependências reproduzíveis;
- inventário de componentes;
- detecção de segredos;
- análise de vulnerabilidades;
- atualização controlada;
- procedência de actions e imagens;
- SBOM quando aplicável;
- licenças e notices;
- resposta a vulnerabilidades.

A instalação atual com `--no-frozen-lockfile` será tratada como gap de reprodutibilidade no Sprint 00, sem ser corrigida silenciosamente por este PR documental.

---

## 12. Retenção das evidências

Artifacts efêmeros do CI poderão continuar com retenção curta para diagnóstico rápido. Evidências de gates críticos terão repositório, política e retenção próprios.

A política distinguirá:

- artifact de conveniência;
- relatório técnico;
- evidência de homologação;
- evidência de segurança;
- evidência de cálculo sombra;
- evidência de cutover;
- evidência de operação assistida;
- documento sujeito a retenção legal.

Retenção não será definida apenas pelo limite padrão do provedor de CI.

---

## 13. Falhas, incidentes e continuidade

Antes de produção serão obrigatórios:

- runbooks;
- classificação de incidentes;
- canais de escalonamento;
- matriz de responsáveis;
- restauração ensaiada;
- rotação de credenciais;
- resposta a certificado vencido;
- modo degradado;
- feature flag de contenção;
- reconciliação pós-incidente;
- post-incident review sem apagar evidências.

Backup existente não será considerado suficiente sem restauração verificada para os dados e fluxos do RH.

---

## 14. Gates de qualidade

Serão usados dez gates:

```text
QG0 — base e CI reproduzíveis
QG1 — especificação e rastreabilidade
QG2 — estática, unidade e propriedades
QG3 — banco, RLS, RPCs e contracts
QG4 — integração, jobs e resposta incerta
QG5 — E2E, UX e acessibilidade
QG6 — desempenho, concorrência e resiliência
QG7 — segurança, privacidade e recuperação
QG8 — cálculo sombra, reconciliação e piloto
QG9 — produção assistida e estabilização
```

Gate aprovado poderá ser invalidado por:

- mudança de requisito;
- mudança de versão ou dependência;
- alteração de migration;
- novo risco material;
- ambiente diferente;
- artifact corrompido;
- evidência expirada;
- falha posterior que contradiga a conclusão.

---

## 15. Consequências positivas

- confiança vinculada ao risco;
- rastreabilidade entre requisito e evidência;
- cálculo reproduzível;
- redução de falso verde;
- melhor investigação operacional;
- menor exposição de dados em logs;
- liberação gradual e reversível;
- evidências preservadas para auditoria e aprendizado.

---

## 16. Custos e riscos assumidos

- mais tempo para preparar fixtures e evidências;
- manutenção de datasets dourados;
- necessidade de observabilidade e ambientes estáveis;
- custo de armazenamento de artifacts críticos;
- revisão independente para alterações de maior risco;
- disciplina para não transformar exceções em rotina.

Esses custos são aceitos porque falhas silenciosas em RH podem ser mais caras e difíceis de reparar que o custo preventivo de verificação.

---

## 17. Alternativas rejeitadas

### 17.1 Um único pipeline igual para qualquer mudança

Rejeitada porque mudanças documentais e fechamento de folha não possuem o mesmo risco.

### 17.2 Meta global de cobertura como principal gate

Rejeitada porque pode atingir percentual elevado sem testar invariantes críticas.

### 17.3 Logs como única evidência

Rejeitada porque logs podem ser incompletos, redigidos, rotacionados ou não comprovar o estado de negócio.

### 17.4 Testar somente pela interface

Rejeitada porque não cobre constraints, RLS, concorrência, atomicidade e estados externos incertos.

### 17.5 Declarar conformidade apenas por citar uma norma

Rejeitada porque referência de controle não equivale a avaliação executada.

---

## 18. Estado honesto

Esta ADR não cria:

- testes do RH;
- thresholds de cobertura;
- scanner de segurança;
- SBOM;
- integração OpenTelemetry;
- SLI ou SLO numérico;
- alertas;
- runbooks;
- evidence store;
- pentest;
- execução de backup;
- ou aprovação de gate.

Tudo permanece planejado e condicionado ao Gate G00 e às ondas definidas no Módulo 14.
