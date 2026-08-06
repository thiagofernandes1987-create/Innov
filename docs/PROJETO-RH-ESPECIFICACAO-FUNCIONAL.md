# Projeto RH — Especificação Funcional do Sistema Integrado de Gestão Empresarial

**Subtítulo:** Módulo de Recursos Humanos, Departamento Pessoal, Folha de Pagamento e Integrações Governamentais  
**Documento:** especificação funcional em elaboração  
**Versão:** 0.2.0  
**Data de início:** 5 de agosto de 2026  
**Última atualização:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**Produção:** não implementado  
**Responsável pelo produto:** pendente de validação  

---

## 1. Estado desta entrega

### Concluído

- visão inicial do produto;
- fronteiras entre pessoa, usuário, trabalhador, vínculo e equipe de obra;
- separação entre tenant, empresa empregadora e estabelecimento;
- mapa preliminar dos módulos de RH;
- definição inicial do produto mínimo viável;
- perfis de usuários;
- princípios de segurança e proteção de dados;
- requisitos funcionais e regras de negócio iniciais;
- dependências com os módulos existentes da Innovar Platform;
- backlog inicial por versões;
- Módulo 01 — Cadastro Mestre de Pessoas, Trabalhadores e Vínculos;
- Módulo 02 — Empresas, Estabelecimentos e Estrutura Organizacional.

### Em elaboração nas próximas entregas

- admissão e pré-admissão;
- contratos de trabalho e alterações;
- jornada, ponto e banco de horas;
- férias, afastamentos e benefícios;
- medicina e segurança do trabalho;
- folha de pagamento;
- parametrização de rubricas;
- obrigações governamentais;
- relatórios, indicadores e critérios de aceite completos.

### Situação geral

A especificação funcional está em andamento. Nenhum módulo, tabela, tela, migration, integração ou cálculo de folha foi declarado implementado.

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
- confusão entre tenant, empresa empregadora, estabelecimento e obra;
- duplicação de centros de custo entre RH e Financeiro;
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
- uma organização da plataforma administre uma ou mais empresas empregadoras;
- empresa, estabelecimento e obra mantenham finalidades distintas;
- a alocação em obra não substitua o vínculo trabalhista;
- RH e Financeiro compartilhem o mesmo centro de custo canônico;
- toda regra de folha possua versão e vigência;
- toda competência possa ser reconstruída com as regras utilizadas na época;
- eventos governamentais possuam estado, protocolo, retorno e histórico;
- dados sensíveis sejam acessados somente por perfis autorizados;
- alterações críticas produzam auditoria nominal e justificativa.

---

## 5. Decisões arquiteturais fundamentais

### 5.1 Entidades que não podem ser confundidas

| Entidade | Finalidade |
|---|---|
| Organização | tenant, autorização, módulos e isolamento |
| Empresa empregadora | entidade empresarial à qual o vínculo pertence |
| Estabelecimento | unidade vinculada à empresa empregadora |
| Usuário | identidade que acessa a plataforma |
| Pessoa | identidade civil ou cadastral comum |
| Trabalhador | pessoa que presta ou prestou atividade à organização |
| Vínculo | relação jurídica ou contratual entre trabalhador e empresa |
| Contrato de trabalho | condições aplicáveis a determinado vínculo e período |
| Unidade organizacional | diretoria, área, departamento, setor ou unidade equivalente |
| Cargo | posição contratual ou ocupacional prevista |
| Função | atividades efetivamente exercidas |
| Posição | posto estrutural planejado ou ocupado |
| Lotação | associação vigente do vínculo à estrutura |
| Centro de custo | dimensão contábil ou gerencial compartilhada |
| Alocação em obra | participação operacional em projeto, equipe, tarefa ou recurso |

### 5.2 Relação recomendada

```text
Organização
  └─ Empresa empregadora
       └─ Estabelecimento
            └─ Estrutura organizacional

Pessoa
  ├─ pode possuir Usuário de acesso
  └─ pode possuir um ou mais Trabalhadores/Vínculos
       ├─ Contrato e alterações
       ├─ Lotação, cargo e função
       ├─ Jornada
       ├─ Benefícios
       ├─ Férias e afastamentos
       ├─ Folha
       └─ Alocações em obras e equipes
```

### 5.3 Proibição de duplicação

As estruturas atuais `project_teams`, `project_team_members`, `project_resources` e `task_resource_allocations` continuarão representando a operação da obra. Elas não deverão se tornar o cadastro mestre de empregados.

A estrutura atual `finance_cost_centers` não será copiada para um catálogo paralelo de RH. A arquitetura futura deverá generalizar ou migrar o cadastro de forma compatível, preservando referências existentes sempre que possível.

Trabalhadores sem acesso à plataforma não deverão ser obrigados a possuir conta em `auth.users`.

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
- estrutura organizacional;
- cargos, funções e posições;
- competências;
- treinamentos;
- avaliações;
- documentos gerais;
- indicadores de pessoas.

### 6.2 Departamento Pessoal

- empresas e estabelecimentos;
- unidades, lotações e departamentos;
- centros de custo e rateios;
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
- rateios e contabilização;
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

## 7. Documentos detalhados disponíveis

| Documento | Estado |
|---|---|
| `PROJETO-RH-ADR-001-PESSOA-TRABALHADOR-VINCULO.md` | decisão funcional registrada |
| `PROJETO-RH-ADR-002-TENANT-EMPRESA-ESTABELECIMENTO.md` | decisão funcional registrada |
| `PROJETO-RH-MODULO-01-CADASTRO-MESTRE.md` | especificação inicial concluída |
| `PROJETO-RH-MODULO-02-ESTRUTURA-ORGANIZACIONAL.md` | especificação inicial concluída |

---

## 8. MVP funcional inicial

O MVP não deverá tentar entregar folha e obrigações antes da fundação cadastral.

### MVP — Fundação

1. organizações e empresas empregadoras;
2. estabelecimentos;
3. cadastro mestre de pessoas;
4. trabalhadores;
5. vínculos;
6. unidades organizacionais;
7. cargos e funções;
8. lotações;
9. centro de custo compartilhado;
10. documentos;
11. permissões sensíveis;
12. auditoria e histórico.

### Versão 1.1

- posições e quadro planejado;
- rateios;
- admissão completa;
- contratos e alterações;
- jornadas;
- férias e afastamentos;
- benefícios;
- relatórios operacionais.

### Versão 2

- folha de pagamento;
- rubricas e fórmulas;
- décimo terceiro;
- férias calculadas;
- rescisões;
- provisões e contabilização;
- obrigações digitais.

A ordem poderá ser ajustada por dependências comprovadas, sem iniciar cálculo antes de a base temporal e cadastral estar definida.

---

## 9. Perfis e segregação inicial

| Perfil | Acesso esperado |
|---|---|
| Gestor de RH | pessoas, estrutura, cargos, posições e processos de RH |
| Analista de RH | manutenção autorizada de cadastros e processos |
| Gestor de DP | empresas, estabelecimentos, vínculos, contratos e aprovações |
| Analista de DP | operação cadastral e documental |
| Gestor de Folha | parametrização e fechamento, sem administração geral automática |
| Analista de Folha | lançamentos e conferência conforme alçada |
| Medicina e Segurança | dados ocupacionais segregados |
| Financeiro | centros de custo e integração contábil autorizada |
| Gestor de Obras | alocação operacional sem salário ou documento pessoal completo |
| Direção | aprovações e relatórios consolidados autorizados |
| Auditor | leitura histórica e evidências sem mutação |
| Empregado | autosserviço dos próprios dados liberados |
| Administrador técnico | configuração técnica sem acesso automático a conteúdo sensível |

---

## 10. Capacidades sensíveis previstas

- visualizar dados pessoais;
- visualizar documentos cadastrais;
- visualizar salário;
- visualizar dados médicos;
- administrar empresa e estabelecimento;
- administrar estrutura organizacional;
- aprovar estrutura;
- administrar vínculos;
- aprovar admissão;
- administrar cargos, funções e posições;
- administrar centros de custo;
- aprovar rateios;
- alterar informação retroativa;
- calcular folha;
- fechar folha;
- reabrir folha;
- retificar folha;
- administrar rubricas;
- transmitir eventos governamentais;
- visualizar retornos e protocolos;
- exportar dados de folha.

Os nomes técnicos e o mapeamento ao modelo atual serão definidos antes da implementação.

---

## 11. Integrações com módulos existentes

### Administração

Organização, usuários, perfis, módulos e overrides.

### Obras e Equipes

Alocação de trabalhador canônico em obra e equipe, sem duplicação cadastral.

### Planejamento

Posições, capacidade e alocação operacional, sem alterar contrato.

### Financeiro

Centro de custo canônico, provisões, lançamentos e contabilização futura.

### Documentos e Modelos

Modelos, contratos, documentos pessoais, evidências e arquivos versionados.

### Relatórios

Dados autorizados por organização, empresa, estabelecimento, vínculo e competência.

### Auditoria

Eventos críticos, correlação, sanitização e investigação.

---

## 12. Regras transversais iniciais

### RN-RH-001

Pessoa não dependerá de login.

### RN-RH-002

Usuário não será prova de vínculo.

### RN-RH-003

Trabalhador desligado permanecerá disponível para histórico autorizado.

### RN-RH-004

Vínculo terá empresa empregadora explícita.

### RN-RH-005

Estabelecimento usado no vínculo pertencerá à empresa do vínculo.

### RN-RH-006

Obra não será automaticamente estabelecimento.

### RN-RH-007

Cargo, função e posição serão conceitos distintos.

### RN-RH-008

Lotação e condições contratuais relevantes terão vigência.

### RN-RH-009

Alocação em obra não alterará automaticamente salário, jornada ou cargo.

### RN-RH-010

RH e Financeiro não manterão centros de custo manuais concorrentes.

### RN-RH-011

Cadastro referenciado será encerrado, não apagado.

### RN-RH-012

Competência fechada não será modificada silenciosamente por alteração retroativa.

### RN-RH-013

Folha deverá conservar regra, versão, entradas e resultado utilizados.

### RN-RH-014

Integração governamental deverá conservar payload, protocolo, recibo, retorno e histórico.

### RN-RH-015

Falha de consulta não será apresentada como estado vazio verdadeiro.

---

## 13. Backlog de especificação

### Concluído

- [x] visão e arquitetura funcional inicial;
- [x] ADR de Pessoa, Trabalhador e Vínculo;
- [x] Cadastro Mestre;
- [x] ADR de Tenant, Empresa e Estabelecimento;
- [x] Empresas, Estabelecimentos e Estrutura Organizacional.

### Próximo

- [ ] Admissão e pré-admissão;
- [ ] conferência documental;
- [ ] condições iniciais do vínculo;
- [ ] ativação e cancelamento de admissão;
- [ ] integrações e pendências da admissão.

### Posterior

- [ ] contratos e alterações;
- [ ] jornada e ponto;
- [ ] férias;
- [ ] afastamentos;
- [ ] benefícios;
- [ ] medicina e segurança;
- [ ] folha;
- [ ] rubricas;
- [ ] obrigações digitais;
- [ ] desligamentos;
- [ ] relatórios consolidados;
- [ ] critérios de aceite finais.

---

## 14. Estado técnico

Nenhuma migration, tabela, rota, ação, componente ou integração foi implementada nesta branch.

O CI da primeira rodada reprovou no validador de documentação por uma divergência preexistente na numeração das vacinas da árvore combinada, com duplicidade a partir de `VACINA-044`. O Projeto RH não alterou arquivos de vacinas e não mascarará essa falha dentro deste PR funcional.

---

## 15. Próxima entrega lógica

**Módulo 03 — Admissão, Pré-admissão, Conferência Documental e Ativação do Vínculo.**

A admissão deverá consumir somente empresas, estabelecimentos, estruturas, cargos, funções, jornadas e documentos válidos, sem criar atalhos que contornem o Cadastro Mestre ou a aprovação da estrutura.
