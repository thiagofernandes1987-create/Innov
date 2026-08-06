# Projeto RH — Especificação Funcional do Sistema Integrado de Gestão Empresarial

**Subtítulo:** Módulo de Recursos Humanos, Departamento Pessoal, Folha de Pagamento e Integrações Governamentais  
**Documento:** especificação funcional em elaboração  
**Versão:** 0.1.0  
**Data de início:** 5 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**Produção:** não implementado  
**Responsável pelo produto:** pendente de validação  

---

## 1. Estado desta entrega

### Concluído

- visão inicial do produto;
- fronteiras entre pessoa, usuário, trabalhador, vínculo e equipe de obra;
- mapa preliminar dos módulos de RH;
- definição inicial do produto mínimo viável;
- perfis de usuários;
- princípios de segurança e proteção de dados;
- requisitos funcionais e regras de negócio iniciais;
- dependências com os módulos existentes da Innovar Platform;
- backlog inicial por versões.

### Em elaboração nas próximas seções deste documento

- detalhamento funcional dos cadastros mestres;
- fluxo de admissão;
- contratos de trabalho;
- jornada, ponto e banco de horas;
- férias, afastamentos e benefícios;
- folha de pagamento;
- parametrização de rubricas;
- obrigações governamentais;
- relatórios, indicadores e critérios de aceite completos.

### Situação geral

A especificação foi iniciada. Nenhum módulo, tabela, tela, migration, integração ou cálculo de folha foi declarado implementado.

---

## 2. Visão geral do produto

O Projeto RH acrescentará à Innovar Platform um conjunto modular de funcionalidades para administrar o ciclo completo das pessoas que trabalham para uma organização, desde o planejamento da contratação até o encerramento do vínculo e o cumprimento das obrigações posteriores.

O projeto deverá atender inicialmente às necessidades da Innovar Construções e Reformas, mas será concebido para futura utilização por pequenas e médias empresas, escritórios contábeis, departamentos pessoais, prestadores de serviços e grupos empresariais.

O núcleo do produto será composto por quatro domínios relacionados, mas separados por finalidade e nível de sensibilidade:

1. **Recursos Humanos:** recrutamento, seleção, pessoas, competências, treinamentos e desempenho;
2. **Departamento Pessoal:** vínculos, contratos, jornadas, férias, afastamentos, benefícios e desligamentos;
3. **Folha de Pagamento:** rubricas, lançamentos, cálculos, fechamento, recibos, provisões e contabilização;
4. **Obrigações Trabalhistas Digitais:** preparação, transmissão, retorno, protocolos, recibos, rejeições e reconciliações.

A solução deverá aproveitar a infraestrutura existente da Innovar Platform para multiempresa, autorização, auditoria, documentos, relatórios, notificações e integrações, sem duplicar cadastros que já possuam uma fonte canônica.

---

## 3. Problemas que o sistema deverá resolver

O módulo deverá resolver, no mínimo, os seguintes problemas empresariais:

- informações de empregados espalhadas em planilhas, documentos e sistemas diferentes;
- ausência de histórico confiável de alterações contratuais;
- uso do cadastro de usuário como se fosse cadastro de empregado;
- duplicação de pessoas em equipes, obras e folha;
- fórmulas de folha fixadas diretamente no código;
- perda da regra utilizada em folhas antigas após mudança legal ou parametrização;
- dificuldade para identificar pendências de admissão, férias, documentos e afastamentos;
- acesso excessivo a salário, dados pessoais ou informações médicas;
- divergência entre folha calculada, eventos transmitidos e obrigações apuradas;
- ausência de protocolos, recibos e trilha de retificação;
- dificuldade para conciliar custo de pessoal com obra, centro de custo e financeiro;
- alteração silenciosa de competência fechada;
- falta de relatórios consolidados por empresa, estabelecimento, trabalhador e competência.

---

## 4. Proposta de valor

A proposta de valor é oferecer uma plataforma em que o RH e o Departamento Pessoal consigam executar as rotinas em linguagem operacional, enquanto a equipe técnica dispõe de regras, estados, validações e trilhas suficientes para construir e manter o software de forma segura.

O produto deverá permitir que:

- a pessoa seja cadastrada uma vez;
- cada vínculo possua histórico próprio;
- a mesma pessoa possa ter ou não acesso ao sistema;
- a alocação em obra não substitua o vínculo trabalhista;
- toda regra de folha possua versão e vigência;
- toda competência possa ser reconstruída com as regras utilizadas na época;
- eventos governamentais possuam estado, protocolo, retorno e histórico;
- dados sensíveis sejam acessados somente por perfis autorizados;
- alterações críticas produzam auditoria nominal e justificativa.

---

## 5. Decisão arquitetural fundamental

### 5.1 Entidades que não podem ser confundidas

O sistema deverá separar explicitamente:

| Entidade | Finalidade |
|---|---|
| Usuário | identidade que acessa a plataforma |
| Pessoa | identidade civil ou cadastral comum |
| Trabalhador | pessoa que presta ou prestou atividade à organização |
| Vínculo | relação jurídica ou contratual entre trabalhador e organização |
| Contrato de trabalho | condições aplicáveis a determinado vínculo e período |
| Alocação organizacional | empresa, estabelecimento, departamento, centro de custo, cargo e função |
| Alocação em obra | participação operacional em projeto, equipe, tarefa ou recurso |

### 5.2 Relação recomendada

```text
Pessoa
  ├─ pode possuir Usuário de acesso
  └─ pode possuir um ou mais Trabalhadores/Vínculos
       ├─ Contrato e alterações
       ├─ Jornada
       ├─ Benefícios
       ├─ Férias e afastamentos
       ├─ Folha
       └─ Alocações em obras e equipes
```

### 5.3 Proibição de duplicação

As estruturas atuais `project_teams`, `project_team_members`, `project_resources` e `task_resource_allocations` continuarão representando a operação da obra. Elas não deverão se tornar o cadastro mestre de empregados.

Quando o trabalhador for alocado a uma equipe de obra, a alocação deverá referenciar o trabalhador ou vínculo canônico. Trabalhadores sem acesso à plataforma não deverão ser obrigados a possuir conta em `auth.users`.

---

## 6. Mapa preliminar dos módulos

### 6.1 Recursos Humanos

- planejamento de vagas;
- requisições de contratação;
- recrutamento;
- candidatos;
- seleção;
- banco de talentos;
- cadastro de pessoas;
- cadastro de trabalhadores;
- cargos e funções;
- competências;
- treinamentos;
- avaliações;
- documentos gerais;
- indicadores de pessoas.

### 6.2 Departamento Pessoal

- empresas e estabelecimentos;
- lotações e departamentos;
- vínculos;
- matrículas;
- contratos;
- alterações contratuais;
- sindicatos e instrumentos coletivos;
- jornadas;
- escalas;
- ponto;
- banco de horas;
- férias;
- afastamentos;
- benefícios;
- dependentes;
- pensão alimentícia;
- medicina e segurança do trabalho;
- desligamentos;
- documentos trabalhistas.

### 6.3 Folha de Pagamento

- competências;
- rubricas;
- versões de rubricas;
- fórmulas;
- incidências;
- eventos fixos;
- eventos variáveis;
- importações;
- adiantamentos;
- folha mensal;
- férias;
- décimo terceiro salário;
- rescisões;
- folha complementar;
- diferenças retroativas;
- provisões;
- encargos;
- contabilização;
- fechamento;
- reabertura;
- retificação;
- recibos e relatórios.

### 6.4 Obrigações Digitais

- eventos de tabela;
- eventos não periódicos;
- eventos periódicos;
- fechamento;
- reabertura;
- retificação;
- exclusão quando admitida;
- lotes de transmissão;
- assinatura digital;
- protocolos;
- recibos;
- advertências;
- erros impeditivos;
- reconciliação com apurações e guias.

---

## 7. Produto mínimo viável

O MVP deverá priorizar uma operação segura e rastreável antes de automações governamentais completas.

### 7.1 Incluído no MVP

- cadastro de empresas e estabelecimentos;
- cadastro canônico de pessoas e trabalhadores;
- vínculos e matrículas;
- cargos, funções e departamentos;
- contratos e alterações contratuais;
- jornadas e escalas básicas;
- dependentes;
- benefícios básicos;
- férias;
- afastamentos;
- desligamentos;
- documentos privados;
- alertas de pendências e vencimentos;
- perfis e permissões específicas;
- relatórios cadastrais;
- histórico e auditoria;
- integração de trabalhadores com equipes e obras.

### 7.2 Preparação obrigatória no MVP para a folha

Mesmo que a folha completa entre em uma versão posterior, o MVP deverá prever:

- salário contratual com vigência;
- jornada contratual com vigência;
- lotação e centro de custo com vigência;
- sindicato e enquadramento com vigência;
- eventos recorrentes;
- trilha de alterações;
- identificadores estáveis para integrações futuras.

### 7.3 Fora do primeiro corte

- transmissão real ao eSocial;
- assinatura com certificado real;
- DCTFWeb automatizada;
- FGTS Digital automatizado;
- medicina ocupacional completa;
- recrutamento com inteligência artificial;
- integrações bancárias de pagamento;
- contabilidade oficial completa;
- aplicação de regras legais sem validação por responsável técnico.

---

## 8. Perfis de usuários

| Perfil | Responsabilidade principal |
|---|---|
| Administrador da plataforma | configura organizações, módulos e acessos |
| Gestor de RH | administra pessoas, vagas, treinamentos e indicadores |
| Analista de RH | executa rotinas de pessoas sem acesso amplo à folha |
| Gestor de Departamento Pessoal | administra vínculos, contratos, férias, afastamentos e desligamentos |
| Analista de Departamento Pessoal | executa cadastros e rotinas autorizadas |
| Gestor de Folha | configura, calcula, revisa, fecha e reabre competências |
| Analista de Folha | realiza lançamentos e conferências conforme alçada |
| Medicina e Segurança | acessa exclusivamente dados ocupacionais autorizados |
| Financeiro | recebe valores contabilizados e pagamentos autorizados, sem acesso irrestrito aos documentos pessoais |
| Contabilidade | acessa integrações e relatórios contábeis permitidos |
| Gestor de Obras | consulta alocações e disponibilidade, sem acesso automático a salário ou dados médicos |
| Empregado | acessa seus próprios documentos, recibos, férias e solicitações liberadas |
| Auditor | consulta trilhas e evidências conforme autorização, sem alterar dados operacionais |

---

## 9. Princípios de acesso e segurança

O módulo deverá seguir negação por padrão e segregação por finalidade.

Capacidades mínimas a serem acrescentadas ou representadas no modelo de autorização:

- `view_personal_data`;
- `view_salary`;
- `view_medical_data`;
- `manage_employment_contract`;
- `manage_time_records`;
- `approve_leave`;
- `manage_payroll_entries`;
- `calculate_payroll`;
- `close_payroll`;
- `reopen_payroll`;
- `rectify_payroll`;
- `manage_rubrics`;
- `transmit_government_events`;
- `view_government_returns`;
- `export_payroll_data`.

Regras iniciais:

- acesso à folha não será concedido apenas por acesso ao módulo Financeiro;
- acesso a salário não concederá acesso automático a dados médicos;
- gestores de obra não visualizarão remuneração sem permissão específica;
- o empregado visualizará somente seus próprios dados liberados;
- consultas e exportações sensíveis deverão produzir auditoria;
- documentos deverão permanecer em armazenamento privado;
- links de download deverão ser temporários ou passar por rota autenticada;
- competências fechadas não poderão ser alteradas silenciosamente;
- alterações de parâmetros deverão guardar versão, vigência, autor e justificativa.

---

## 10. Integração com módulos existentes

| Módulo existente | Integração prevista |
|---|---|
| Administração | organizações, usuários, perfis, permissões e configurações |
| Obras | alocação de trabalhadores e custos por obra |
| Equipes | composição de equipes a partir do trabalhador canônico |
| Planejamento | necessidade de recursos e disponibilidade |
| Tarefas | responsabilidade e esforço, sem substituir ponto ou jornada |
| Diário de Obras | presença e recursos registrados em campo como evidência operacional |
| Financeiro | pagamentos, provisões e lançamentos autorizados |
| Relatórios | indicadores de RH, DP e folha conforme permissão |
| Auditoria | acessos, alterações, fechamentos, reaberturas e transmissões |
| Documentos | contratos, recibos, atestados e documentos privados |
| Modelos | modelos versionados de contratos, comunicados e documentos |
| Qualidade | treinamentos, habilitações e requisitos por atividade |

---

## 11. Requisitos funcionais iniciais

### RF-RH-001 — Cadastrar pessoa

- **Objetivo:** manter uma identidade canônica sem obrigar a criação de usuário.
- **Atores:** RH e Departamento Pessoal autorizados.
- **Dados principais:** nome, identificação, contatos, endereço e documentos necessários.
- **Resultado:** pessoa criada com identificador estável.
- **Prioridade:** crítica.
- **Versão:** MVP.
- **Critério de aceite:** o sistema impede duplicidade conforme regras configuradas e registra o responsável pelo cadastro.

### RF-RH-002 — Cadastrar trabalhador

- **Objetivo:** representar uma pessoa que presta ou prestou atividade para uma organização.
- **Dependência:** RF-RH-001.
- **Resultado:** trabalhador associado à pessoa e à organização.
- **Prioridade:** crítica.
- **Versão:** MVP.

### RF-DP-001 — Criar vínculo

- **Objetivo:** registrar a relação contratual entre trabalhador e organização.
- **Dados principais:** matrícula, categoria, admissão, estabelecimento, lotação, cargo, função, jornada e salário inicial.
- **Prioridade:** crítica.
- **Versão:** MVP.
- **Critério de aceite:** não é possível criar vínculo sem pessoa, trabalhador, organização e vigência válidos.

### RF-DP-002 — Versionar alterações contratuais

- **Objetivo:** preservar o histórico sem reescrever o passado.
- **Fluxo:** selecionar vínculo, informar alteração, data de vigência, justificativa e documento de suporte.
- **Prioridade:** crítica.
- **Versão:** MVP.
- **Critério de aceite:** consultar uma data passada devolve as condições vigentes naquela data.

### RF-DP-003 — Alocar trabalhador em obra

- **Objetivo:** conectar o vínculo ao módulo Equipes sem duplicar o empregado.
- **Prioridade:** alta.
- **Versão:** MVP.
- **Critério de aceite:** a remoção da alocação não exclui a pessoa, o trabalhador ou o vínculo.

### RF-SEG-001 — Restringir dados salariais

- **Objetivo:** impedir exposição de remuneração a perfis sem finalidade autorizada.
- **Prioridade:** crítica.
- **Versão:** MVP.
- **Critério de aceite:** usuário sem `view_salary` não recebe o valor nem por tela, exportação, RPC ou resposta de API.

### RF-FOL-001 — Cadastrar rubrica versionada

- **Objetivo:** permitir configuração de vencimentos e descontos sem gravar a regra exclusivamente no código.
- **Dados principais:** código, descrição, tipo, fórmula, prioridade, incidências, vigência e versão.
- **Prioridade:** crítica.
- **Versão:** 1.1.
- **Critério de aceite:** alterar uma versão futura não muda competências antigas.

### RF-FOL-002 — Calcular folha de forma reproduzível

- **Objetivo:** gerar resultado detalhado a partir de dados, parâmetros e versões identificáveis.
- **Prioridade:** crítica.
- **Versão:** 1.1.
- **Critério de aceite:** o mesmo conjunto de entradas e versões produz o mesmo resultado e apresenta memória de cálculo.

### RF-FOL-003 — Fechar competência

- **Objetivo:** congelar os resultados aprovados.
- **Prioridade:** crítica.
- **Versão:** 1.1.
- **Critério de aceite:** após o fechamento, alteração exige reabertura autorizada, justificativa e auditoria.

### RF-OBR-001 — Preparar evento governamental

- **Objetivo:** transformar dados validados em evento versionado, sem alegar transmissão real.
- **Prioridade:** alta.
- **Versão:** 2.
- **Critério de aceite:** o evento guarda origem, versão, competência, trabalhador, hash e estado de processamento.

---

## 12. Regras de negócio iniciais

### RN-RH-001 — Pessoa não depende de login

Uma pessoa ou trabalhador poderá existir sem conta de acesso à plataforma.

### RN-RH-002 — Login não representa vínculo

Uma conta de acesso não comprova emprego, categoria ou contrato.

### RN-DP-001 — Histórico por vigência

Cargo, função, salário, jornada, lotação, sindicato e demais condições variáveis deverão possuir início e, quando aplicável, fim de vigência.

### RN-DP-002 — Desligamento não apaga histórico

O desligamento encerrará o vínculo, mas manterá documentos, cálculos, auditoria e alocações históricas conforme a política de retenção.

### RN-FOL-001 — Regra legal não ficará apenas no código

Rubricas, incidências, prioridades e fórmulas deverão ser parametrizáveis e versionadas. O código poderá implementar o motor seguro de execução, mas não será a única fonte das condições aplicadas.

### RN-FOL-002 — Competência fechada é imutável

A competência fechada não aceitará mutação direta. Correções ocorrerão por reabertura, retificação, folha complementar ou procedimento equivalente definido no fluxo funcional.

### RN-FOL-003 — Exemplo não é parâmetro universal

Qualquer rubrica apresentada na documentação será identificada como exemplo, configuração vigente verificada ou configuração dependente do caso concreto.

### RN-OBR-001 — Transmissão possui estado

Nenhuma integração será representada apenas por um campo “enviado”. O fluxo deverá diferenciar preparação, validação, assinatura, fila, transmissão, protocolo, processamento, recibo, advertência, rejeição, correção e retificação.

---

## 13. Requisitos não funcionais iniciais

### RNF-SEG-001 — Proteção em profundidade

A autorização deverá existir na rota, ação, função, tabela, arquivo e exportação, conforme o risco da operação.

### RNF-AUD-001 — Auditoria de operações críticas

Alterações contratuais, acesso a salário, cálculo, fechamento, reabertura, retificação, exportação e transmissão deverão produzir eventos de auditoria.

### RNF-PER-001 — Reprodutibilidade da folha

O sistema deverá manter dados suficientes para reconstruir o cálculo de uma competência com as versões utilizadas.

### RNF-LGPD-001 — Minimização e finalidade

Cada dado pessoal deverá possuir finalidade funcional identificável, acesso proporcional e política de retenção.

### RNF-DOC-001 — Documentos privados

Documentos pessoais, médicos e salariais não deverão ser públicos nem entregues por endereço permanente sem autorização.

### RNF-INT-001 — Idempotência

Comandos repetidos de integração ou geração não deverão duplicar eventos, protocolos, recibos ou lançamentos.

---

## 14. Backlog inicial

### MVP

- pessoas;
- trabalhadores;
- vínculos;
- empresas e estabelecimentos;
- cargos, funções e lotações;
- alterações contratuais;
- jornadas básicas;
- dependentes;
- benefícios básicos;
- férias;
- afastamentos;
- desligamentos;
- documentos;
- alertas;
- permissões sensíveis;
- integração com equipes e obras;
- relatórios cadastrais.

### Versão 1.1

- ponto e banco de horas;
- rubricas;
- eventos fixos e variáveis;
- folha mensal;
- férias calculadas;
- décimo terceiro;
- rescisões;
- folha complementar;
- provisões;
- fechamento, reabertura e retificação;
- recibos;
- contabilização.

### Versão 2

- integração governamental;
- assinatura digital;
- eventos, lotes, protocolos e recibos;
- reconciliação de obrigações;
- medicina e segurança avançadas;
- portal completo do empregado;
- integrações bancárias e contábeis;
- analytics avançado.

---

## 15. Riscos iniciais

| Risco | Consequência | Tratamento recomendado |
|---|---|---|
| Reutilizar usuário como empregado | vínculos incorretos e exclusão de histórico | separar pessoa, trabalhador, vínculo e usuário |
| Reutilizar equipe de obra como cadastro mestre | duplicidade e falta de dados trabalhistas | equipe referencia trabalhador canônico |
| Fixar incidências no código | manutenção legislativa arriscada | parametrização, versão e vigência |
| Permissão genérica demais | exposição de salário ou dado médico | capacidades específicas e negação por padrão |
| Folha sem memória de cálculo | impossibilidade de auditoria | registrar entradas, versões, ordem e resultados |
| Integração síncrona em clique | perda de retorno e duplicidade | outbox, worker, idempotência e estados |
| Iniciar com dados reais antes da prontidão | risco operacional e de proteção de dados | usar dados sintéticos até os gates de produção |

---

## 16. Decisões pendentes

- público inicial: uso exclusivo da Innovar ou produto multiempresa comercial;
- operação interna da folha ou apoio a escritório contábil;
- existência de múltiplos vínculos simultâneos para a mesma pessoa;
- grau de integração com o módulo Financeiro;
- estratégia de motor de fórmulas;
- política de retenção por categoria de documento;
- provedor e arquitetura de assinatura digital;
- interfaces oficiais efetivamente disponíveis para cada obrigação;
- responsabilidade técnica pela validação trabalhista, previdenciária e contábil.

A ausência dessas decisões não impede a continuidade da especificação. As premissas serão registradas e revistas sem reescrever requisitos já aprovados.

---

## 17. Próxima entrega lógica

A próxima seção a ser produzida é o **Cadastro Mestre de Pessoas, Trabalhadores e Vínculos**, contendo:

- telas;
- campos;
- estados;
- permissões;
- fluxo principal;
- exceções;
- validações;
- requisitos numerados;
- critérios de aceite;
- integração com usuários, equipes e obras;
- proposta inicial de entidades sem gerar migration prematura.

---

## 18. Controle de versão

| Versão | Data | Seções alteradas | Motivo | Responsável |
|---|---|---|---|---|
| 0.1.0 | 05/08/2026 | documento inicial | início formal do Projeto RH | elaboração assistida; validação pendente |
