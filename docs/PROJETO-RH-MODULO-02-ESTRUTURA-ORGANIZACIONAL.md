# Projeto RH — Módulo 02: Empresas, Estabelecimentos e Estrutura Organizacional

**Versão:** 0.2.0  
**Data:** 6 de agosto de 2026  
**Estado:** especificação funcional inicial concluída; validação de produto pendente  
**Implementação:** não iniciada  
**Dependência principal:** Módulo 01 — Cadastro Mestre de Pessoas, Trabalhadores e Vínculos  

---

## 1. Finalidade

Este módulo será a fonte canônica da estrutura empresarial e organizacional utilizada por Recursos Humanos, Departamento Pessoal, Folha de Pagamento, Obras, Equipes, Financeiro, Relatórios, Documentos e Obrigações Digitais.

Ele deverá responder, em qualquer data relevante:

- qual organização da plataforma administra o dado;
- qual empresa mantém o vínculo;
- em qual estabelecimento o trabalhador está lotado;
- qual unidade organizacional é responsável;
- qual cargo contratual está vigente;
- qual função é exercida;
- qual posição ou posto está ocupado;
- qual centro de custo recebe a despesa;
- qual responsável hierárquico se aplica;
- quais obras e equipes recebem alocação operacional;
- qual histórico deve ser utilizado por determinada competência.

A estrutura não será apenas um conjunto de listas. Ela deverá preservar vigência, hierarquia, aprovações, encerramentos e dependências, de modo que uma reorganização futura não altere retroativamente contratos, folhas ou relatórios antigos.

---

## 2. Escopo

### 2.1 Incluído neste módulo

- empresas empregadoras;
- estabelecimentos;
- unidades organizacionais;
- departamentos;
- setores;
- áreas;
- filiais operacionais;
- cargos;
- funções;
- posições ou postos de trabalho;
- gestores e responsáveis hierárquicos;
- lotações;
- centros de custo;
- rateios de custo;
- relações entre estabelecimento e obra;
- histórico por vigência;
- aprovações e encerramentos;
- relatórios e auditoria da estrutura.

### 2.2 Fora deste módulo

- identidade civil da pessoa;
- vínculo e contrato individual completos;
- salário e histórico salarial;
- jornada e escala;
- recrutamento e seleção;
- orçamento de pessoal detalhado;
- folha de pagamento;
- eventos governamentais;
- ponto;
- férias;
- medicina e segurança do trabalho;
- execução financeira da folha.

Esses domínios utilizarão as estruturas definidas aqui, mas terão especificações próprias.

---

## 3. Princípios funcionais

1. Organização da plataforma, empresa empregadora e estabelecimento são entidades distintas.
2. Obra não será tratada automaticamente como estabelecimento.
3. Cargo, função e posição não serão sinônimos.
4. Lotação organizacional e alocação operacional em obra são relações distintas.
5. Centro de custo terá uma única fonte canônica compartilhada com o Financeiro.
6. Estruturas utilizadas por históricos não serão excluídas fisicamente.
7. Mudanças serão versionadas por vigência quando alterarem interpretação histórica.
8. Reorganização futura não reescreverá folha ou contrato antigo.
9. Estrutura hierárquica não poderá conter ciclos.
10. Toda ativação, suspensão, encerramento ou reativação será auditável.
11. Um cadastro em rascunho não será usado por vínculo ativo sem aprovação.
12. Dados oficiais e códigos sujeitos a mudança serão configuráveis e validados contra fontes vigentes na implementação.
13. Nenhuma regra jurídica ou cadastral será fixada apenas no código sem parametrização e vigência.

---

## 4. Conceitos e distinções

### 4.1 Organização da plataforma

É o tenant técnico e a fronteira principal de isolamento, módulos, usuários, RLS e auditoria.

### 4.2 Empresa empregadora

É a entidade empresarial à qual um vínculo se associa. Uma organização da plataforma poderá administrar mais de uma empresa.

### 4.3 Estabelecimento

É uma unidade vinculada à empresa empregadora. Poderá ser matriz, filial ou outra unidade reconhecida pelo cadastro e pelas configurações aplicáveis.

### 4.4 Unidade organizacional

É um nó da estrutura interna, como diretoria, departamento, área, setor, núcleo ou equipe administrativa. O tipo será configurável.

### 4.5 Cargo

É a posição contratual ou ocupacional prevista na estrutura de pessoas, associável a requisitos, nível, família, faixa e responsabilidades.

### 4.6 Função

É o conjunto de atividades efetivamente exercidas. Poderá coincidir ou não com o cargo, conforme o processo autorizado. A divergência não será criada silenciosamente.

### 4.7 Posição ou posto

É uma vaga estrutural concreta dentro de uma unidade, por exemplo: “Engenheiro de Obras — posição 03”. Permite controlar quantidade planejada, ocupação, vacância e substituição.

### 4.8 Lotação

É a associação vigente do vínculo a empresa, estabelecimento, unidade organizacional, cargo, função, posição, centro de custo e responsável.

### 4.9 Centro de custo

É a dimensão contábil ou gerencial usada para classificar despesas. Não será duplicada por RH e Financeiro.

### 4.10 Alocação em obra

É a associação operacional do trabalhador ou vínculo a uma obra, equipe, tarefa ou recurso. Não altera automaticamente empresa, estabelecimento, cargo, salário ou lotação.

---

## 5. Usuários do módulo

| Perfil | Operações principais |
|---|---|
| Administrador da organização | configurar empresas, acessos e parâmetros globais |
| Gestor de RH | estruturar unidades, cargos, funções, posições e responsáveis |
| Analista de RH | manter cadastros autorizados e preparar alterações |
| Gestor de DP | aprovar estruturas usadas por vínculos e obrigações |
| Analista de DP | consultar e aplicar lotações aprovadas |
| Gestor de Folha | consultar estruturas vigentes e centros de custo |
| Financeiro | manter ou revisar centros de custo compartilhados |
| Gestor de Obras | relacionar obra, equipe e alocação operacional autorizada |
| Direção | aprovar reorganizações e estruturas de maior impacto |
| Auditor | consultar versões, decisões e evidências sem alterar |
| Empregado | consultar estrutura liberada e própria lotação, quando disponibilizado |

---

## 6. Mapa de telas

### 6.1 Visão geral da estrutura

Rota sugerida: `/app/departamento-pessoal/estrutura`

Finalidade:

- apresentar empresas e estabelecimentos ativos;
- mostrar organograma vigente;
- destacar cadastros em conferência;
- informar posições vagas ou excedidas;
- exibir pendências que impedem admissão;
- permitir alternar data de referência para consulta histórica.

Indicadores possíveis:

- empresas ativas;
- estabelecimentos ativos;
- unidades ativas;
- cargos ativos;
- posições abertas;
- vínculos sem lotação completa;
- centros de custo sem integração;
- alterações futuras programadas;
- estruturas encerradas com dependências abertas.

A tela não deverá calcular números sobre consultas falhas nem transformar indisponibilidade em zero.

### 6.2 Empresas empregadoras

Rota sugerida: `/app/departamento-pessoal/empresas`

Funcionalidades:

- busca por nome, código e identificação;
- filtros por situação e vigência;
- lista de estabelecimentos;
- responsáveis;
- pendências cadastrais;
- histórico;
- ação `Nova empresa`;
- ação `Enviar para conferência`;
- ação `Ativar`;
- ação `Suspender`;
- ação `Encerrar`;
- ação `Reativar`, quando admitida pelo fluxo.

### 6.3 Nova empresa

Rota sugerida: `/app/departamento-pessoal/empresas/nova`

Etapas:

1. identificação interna;
2. dados cadastrais;
3. vigência;
4. responsáveis;
5. configurações iniciais;
6. documentos;
7. revisão de duplicidade;
8. confirmação.

### 6.4 Detalhe da empresa

Rota sugerida: `/app/departamento-pessoal/empresas/[id]`

Seções:

- resumo;
- dados cadastrais;
- estabelecimentos;
- estrutura organizacional;
- responsáveis;
- configurações;
- documentos;
- vínculos relacionados;
- competências abertas;
- pendências;
- histórico e auditoria.

### 6.5 Estabelecimentos

Rota sugerida: `/app/departamento-pessoal/estabelecimentos`

Filtros:

- empresa;
- tipo;
- situação;
- município e unidade federativa;
- vigência;
- existência de vínculos ativos;
- relação com obras;
- pendências cadastrais.

### 6.6 Novo estabelecimento

Rota sugerida: `/app/departamento-pessoal/estabelecimentos/novo`

Etapas:

1. empresa empregadora;
2. identificação;
3. endereço e localização;
4. tipo e finalidade;
5. vigência;
6. configurações próprias;
7. responsáveis;
8. documentos;
9. conferência;
10. ativação.

### 6.7 Organograma

Rota sugerida: `/app/rh/estrutura/organograma`

Visualizações:

- árvore hierárquica;
- lista tabular acessível;
- consulta por data;
- unidades sem responsável;
- unidades encerradas;
- quantidade de posições;
- vínculos ocupantes;
- filtros por empresa e estabelecimento.

A representação visual não substituirá uma lista acessível e pesquisável.

### 6.8 Unidades organizacionais

Rota sugerida: `/app/rh/estrutura/unidades`

Funcionalidades:

- criar unidade raiz ou subordinada;
- escolher tipo;
- vincular empresa e estabelecimento;
- definir responsável;
- definir centro de custo padrão;
- programar início e encerramento;
- reorganizar com nova vigência;
- consultar histórico de pais e responsáveis;
- bloquear ciclos hierárquicos.

### 6.9 Cargos

Rota sugerida: `/app/rh/estrutura/cargos`

Funcionalidades:

- famílias de cargos;
- níveis;
- código;
- nome;
- descrição;
- responsabilidades;
- requisitos;
- riscos e exigências ocupacionais por referência, sem expor diagnóstico;
- situação;
- vigência;
- documentos;
- posições vinculadas;
- vínculos atuais;
- histórico.

### 6.10 Funções

Rota sugerida: `/app/rh/estrutura/funcoes`

Funcionalidades:

- código e nome;
- descrição das atividades;
- cargo de referência opcional;
- unidade aplicável;
- vigência;
- situação;
- controles de acumulação ou substituição;
- documentos;
- histórico.

### 6.11 Posições e quadro planejado

Rota sugerida: `/app/rh/estrutura/posicoes`

Funcionalidades:

- criar posição vinculada a unidade e cargo;
- definir quantidade ou posição individual;
- indicar situação: planejada, aberta, ocupada, bloqueada, extinta;
- associar gestor;
- definir estabelecimento e centro de custo padrão;
- acompanhar ocupação;
- relacionar requisição de contratação futura;
- controlar substituição temporária;
- registrar motivo de abertura ou extinção.

### 6.12 Centros de custo

Rota sugerida: `/app/administracao/centros-de-custo`

O cadastro será compartilhado entre RH e Financeiro.

Funcionalidades:

- código e nome;
- hierarquia opcional;
- projeto relacionado, quando aplicável;
- tipo;
- vigência;
- situação;
- responsável;
- restrições de uso;
- mapeamento contábil futuro;
- histórico;
- consulta de dependências.

### 6.13 Lotações

Rota sugerida: `/app/departamento-pessoal/lotacoes`

Finalidade:

- consultar lotações vigentes;
- preparar transferências;
- revisar divergências;
- aplicar alterações em lote;
- identificar vínculos sem centro de custo;
- comparar lotação organizacional e alocação em obra.

### 6.14 Rateios

Rota sugerida: `/app/departamento-pessoal/rateios`

Funcionalidades:

- definir rateio por vínculo;
- distribuir percentuais entre centros de custo;
- definir vigência;
- importar ou aplicar regra padrão;
- validar soma de 100%;
- tratar períodos incompletos;
- consultar impacto previsto;
- aprovar antes do fechamento aplicável.

---

## 7. Dados necessários

### 7.1 Empresa empregadora

| Campo | Obrigatoriedade | Observação |
|---|---|---|
| Identificador interno | automático | UUID estável |
| Organização | obrigatória | tenant proprietário |
| Código interno | obrigatória | único na organização |
| Nome empresarial | obrigatória | valor oficial quando aplicável |
| Nome de exibição | obrigatória | utilizado na interface |
| Identificação cadastral | configurável | protegida e validada |
| Tipo | configurável | vocabulário controlado |
| Situação | obrigatória | estado do fluxo |
| Início de vigência | obrigatória | não confundir com criação técnica |
| Encerramento | opcional | exige motivo e validações |
| Responsável principal | opcional | pessoa ou usuário autorizado |
| Configuração de folha | futura | referência, não regra duplicada |
| Observações internas | opcional | acesso restrito |
| Criado por/em | automático | auditoria |
| Atualizado por/em | automático | auditoria |
| Aprovado por/em | conforme fluxo | auditoria |

### 7.2 Estabelecimento

| Campo | Obrigatoriedade | Observação |
|---|---|---|
| Empresa empregadora | obrigatória | mesma organização |
| Código interno | obrigatória | único no escopo definido |
| Nome | obrigatória | identificação operacional |
| Tipo | obrigatória | vocabulário configurável |
| Identificação cadastral | configurável | conforme finalidade |
| Endereço | configurável | estruturado |
| Município | configurável | vocabulário controlado |
| Unidade federativa | configurável | validada |
| País | obrigatório quando aplicável | vocabulário controlado |
| Situação | obrigatória | fluxo próprio |
| Início de vigência | obrigatória | base temporal |
| Encerramento | opcional | preserva histórico |
| Responsável | opcional | usuário ou pessoa autorizada |
| Configurações próprias | configurável | herança explícita da empresa |
| Criado/aprovado por | automático | auditoria |

### 7.3 Unidade organizacional

| Campo | Obrigatoriedade | Observação |
|---|---|---|
| Organização | obrigatória | RLS |
| Empresa | obrigatória | escopo empresarial |
| Estabelecimento | opcional/configurável | unidade pode ser corporativa |
| Código | obrigatória | único no escopo |
| Nome | obrigatória | sem abreviação automática |
| Tipo | obrigatória | diretoria, área, departamento, setor etc. |
| Unidade superior | opcional | nula para raiz |
| Responsável | opcional | vínculo, trabalhador ou posição conforme decisão |
| Centro de custo padrão | opcional | não força rateio individual |
| Situação | obrigatória | rascunho, ativa, suspensa, encerrada |
| Início de vigência | obrigatória | histórico |
| Fim de vigência | opcional | histórico |
| Ordem de exibição | opcional | não define hierarquia |
| Descrição | opcional | finalidade da unidade |

### 7.4 Cargo

| Campo | Obrigatoriedade | Observação |
|---|---|---|
| Código | obrigatória | único conforme escopo |
| Nome | obrigatória | nome controlado |
| Família | opcional | agrupamento |
| Nível | opcional | júnior, pleno etc. configurável |
| Descrição | obrigatória conforme processo | atribuições gerais |
| Requisitos | opcional | estruturados e versionáveis |
| Situação | obrigatória | uso controlado |
| Início/fim de vigência | obrigatória/opcional | histórico |
| Empresa aplicável | configurável | global no tenant ou específica |
| Documentos | opcional | descrição formal, aprovação |
| Classificações externas | configurável | códigos oficiais sujeitos a validação vigente |

### 7.5 Função

| Campo | Obrigatoriedade | Observação |
|---|---|---|
| Código | obrigatória | único conforme escopo |
| Nome | obrigatória | atividade efetiva |
| Cargo de referência | opcional | não substitui cargo |
| Descrição | obrigatória conforme processo | atividades |
| Unidade aplicável | opcional | restrição operacional |
| Permite acumulação | configurável | regra aprovada |
| Permite substituição | configurável | regra aprovada |
| Situação | obrigatória | fluxo próprio |
| Vigência | obrigatória | histórico |
| Classificações externas | configurável | validação vigente |

### 7.6 Posição

| Campo | Obrigatoriedade | Observação |
|---|---|---|
| Código | obrigatória | identificador da posição |
| Unidade | obrigatória | estrutura responsável |
| Cargo | obrigatória | cargo planejado |
| Função padrão | opcional | referência |
| Estabelecimento | obrigatório conforme unidade | coerência |
| Centro de custo padrão | opcional | sugestão |
| Gestor da posição | opcional | hierarquia |
| Quantidade planejada | obrigatória | quando posição agregada |
| Situação | obrigatória | planejada, aberta, ocupada etc. |
| Motivo | obrigatório em mudanças críticas | auditoria |
| Vigência | obrigatória | histórico |
| Ocupante | derivado | não editar diretamente |

### 7.7 Centro de custo

| Campo | Obrigatoriedade | Observação |
|---|---|---|
| Organização | obrigatória | RLS |
| Código | obrigatória | único na organização |
| Nome | obrigatória | descrição gerencial |
| Tipo | opcional | corporativo, obra, administrativo etc. |
| Centro superior | opcional | hierarquia |
| Projeto | opcional | compatibilidade com estrutura existente |
| Empresa | opcional/configurável | escopo de utilização |
| Estabelecimento | opcional | restrição adicional |
| Responsável | opcional | gestão |
| Situação | obrigatória | ativo, suspenso, encerrado |
| Vigência | obrigatória | histórico |
| Mapeamento externo | futuro | contabilidade ou integração |

### 7.8 Lotação vigente

| Campo | Obrigatoriedade | Observação |
|---|---|---|
| Vínculo | obrigatória | fonte do contexto |
| Empresa | obrigatória | deve coincidir com vínculo |
| Estabelecimento | obrigatória conforme categoria | vigência |
| Unidade organizacional | obrigatória conforme processo | vigência |
| Cargo | obrigatória conforme categoria | vigência |
| Função | opcional | vigência |
| Posição | opcional | ocupação estrutural |
| Centro de custo principal | configurável | integração financeira |
| Responsável hierárquico | opcional | derivável ou explícito |
| Início de vigência | obrigatória | não sobrepor indevidamente |
| Fim de vigência | opcional | fechado na transferência |
| Motivo | obrigatória em alteração | vocabulário controlado |
| Documento de suporte | configurável | evidência |
| Estado de aprovação | obrigatória | rascunho, aprovada, cancelada |

### 7.9 Rateio de custo

| Campo | Obrigatoriedade | Observação |
|---|---|---|
| Vínculo | obrigatória | trabalhador afetado |
| Centro de custo | obrigatória | fonte canônica |
| Percentual | obrigatória | precisão definida |
| Início de vigência | obrigatória | competência |
| Fim de vigência | opcional | histórico |
| Origem | obrigatória | manual, regra, importação, obra etc. |
| Estado | obrigatória | rascunho, aprovado, encerrado |
| Aprovado por/em | conforme fluxo | auditoria |

---

## 8. Reuso da Innovar Platform

### 8.1 `organizations`

Será mantida como fronteira de tenant, autorização e RLS. Não será substituída nem reinterpretada silenciosamente como única empresa empregadora.

### 8.2 `finance_cost_centers`

A plataforma já possui `finance_cost_centers`, com:

- `organization_id`;
- `project_id` opcional;
- código;
- nome;
- situação ativa;
- auditoria básica.

O Projeto RH não criará um segundo catálogo manual concorrente.

Direção de arquitetura:

1. adotar um catálogo canônico compartilhado de centros de custo;
2. preservar os identificadores e referências existentes sempre que possível;
3. migrar ou generalizar `finance_cost_centers` de forma controlada;
4. manter compatibilidade com lançamentos financeiros;
5. acrescentar vigência, hierarquia, escopo e histórico apenas após análise de impacto;
6. impedir que RH e Financeiro editem conceitos diferentes sob o mesmo código.

Até existir migration aprovada, esta é uma decisão funcional, não uma alteração de banco.

### 8.3 `projects`

Obras poderão ser relacionadas a estabelecimentos e centros de custo, mas permanecerão entidades operacionais independentes.

### 8.4 `project_teams` e `project_team_members`

Continuarão representando organização operacional da obra. Uma futura alocação deverá apontar para o trabalhador ou vínculo canônico sem copiar cargo, salário ou dados pessoais desnecessários.

### 8.5 `project_resources`

Continuará representando recursos planejados ou utilizados na obra. Custo operacional não será convertido automaticamente em salário.

### 8.6 Administração e permissões

O módulo de Administração será reutilizado para habilitação dos aplicativos, perfis e overrides. Novas capacidades sensíveis serão adicionadas somente com contrato explícito e validador.

### 8.7 Auditoria e observabilidade

Eventos críticos utilizarão a infraestrutura transversal existente, sem substituir históricos de domínio.

---

## 9. Fluxos principais

### 9.1 Criar empresa e primeiro estabelecimento

1. Administrador acessa `Empresas`.
2. Pesquisa possíveis duplicidades.
3. Cria empresa em `RASCUNHO`.
4. Preenche identificação, vigência e responsáveis.
5. Anexa documentos aplicáveis.
6. Envia para conferência.
7. Revisor consulta pendências.
8. Aprova ou devolve com motivo.
9. Empresa passa a `ATIVA`.
10. Usuário cria o primeiro estabelecimento.
11. O estabelecimento segue o mesmo fluxo de conferência.
12. Somente após ativação poderá ser utilizado em vínculo ativo.

### 9.2 Criar estrutura organizacional

1. Gestor seleciona empresa e data de vigência.
2. Cria unidade raiz ou reutiliza estrutura existente.
3. Adiciona unidades subordinadas.
4. Define tipos, responsáveis e centros de custo padrão.
5. O sistema valida ciclos e coerência de escopo.
6. Gestor cria cargos e funções.
7. Cria posições dentro das unidades.
8. Envia reorganização para aprovação quando necessário.
9. Estrutura aprovada fica disponível na data de início.

### 9.3 Reorganizar departamento

1. Gestor consulta estrutura vigente.
2. Inicia `Nova versão` com data futura.
3. Move ou cria unidades sem alterar o histórico anterior.
4. Define destino de posições e vínculos afetados.
5. O sistema identifica dependências.
6. Gestor resolve vínculos sem destino.
7. Revisor aprova.
8. Na data de vigência, a nova estrutura passa a ser atual.
9. Consultas antigas continuam mostrando a estrutura anterior.

### 9.4 Transferir lotação

1. Analista abre o vínculo.
2. Seleciona `Alterar lotação`.
3. Informa data de início e motivo.
4. Escolhe estabelecimento, unidade, cargo, função, posição e centro de custo.
5. O sistema valida coerência e sobreposição.
6. Exibe impactos em jornada, folha, benefícios, documentos e obrigações, quando esses módulos existirem.
7. Usuário salva rascunho.
8. Revisor aprova.
9. Registro anterior é encerrado na data correta.
10. Nova lotação passa a vigorar sem apagar o histórico.

### 9.5 Ratear custo do vínculo

1. Analista seleciona vínculo e período.
2. Sistema sugere centro de custo da lotação ou posição.
3. Analista mantém 100% em um centro ou distribui entre vários.
4. Sistema valida soma e vigência.
5. Alteração é enviada para aprovação.
6. Após aprovação, fica disponível para folha e financeiro.
7. Competência fechada não é alterada silenciosamente.

### 9.6 Relacionar obra e estabelecimento

1. Administrador ou gestor autorizado abre a obra.
2. Seleciona empresa e estabelecimento relacionado.
3. Informa finalidade e vigência da relação.
4. Sistema valida organização e período.
5. Relação é registrada.
6. Nenhum vínculo é transferido automaticamente.
7. Alocações operacionais usam a relação apenas como contexto e validação.

---

## 10. Estados pessimistas e exceções

### 10.1 Empresa duplicada

- O sistema encontra identificação igual ou forte correspondência.
- A criação não prossegue automaticamente.
- Usuário pode reutilizar, solicitar unificação ou justificar exceção conforme permissão.
- A decisão fica auditada.

### 10.2 Estabelecimento de outra empresa

- Operação é bloqueada.
- A interface informa que o estabelecimento não pertence à empresa do vínculo.
- Nenhuma referência parcial é gravada.

### 10.3 Unidade hierárquica cíclica

- Operação é recusada.
- O sistema informa a cadeia que produziria o ciclo.
- Estrutura anterior permanece intacta.

### 10.4 Encerramento com vínculos ativos

- O sistema identifica vínculos, posições, competências e integrações dependentes.
- Encerramento direto é bloqueado ou enviado a fluxo especial.
- Usuário recebe lista nominal e ações necessárias.

### 10.5 Cargo inativo na data da admissão

- O cargo não aparece como opção válida ou é recusado no salvamento.
- O sistema diferencia inativo, futuro e encerrado.

### 10.6 Centro de custo indisponível

- Falha de consulta não é apresentada como lista vazia.
- Rateio e lotação dependentes ficam bloqueados.
- Dados independentes permanecem disponíveis.

### 10.7 Percentuais não fecham

- Soma diferente de 100% é recusada para rateio completo.
- O sistema mostra diferença e linhas responsáveis.
- Regras de rateio parcial, se aprovadas futuramente, terão estado explícito.

### 10.8 Alteração retroativa

- O sistema identifica competências fechadas e históricos afetados.
- A alteração exige permissão, justificativa e fluxo de retificação.
- Não há reprocessamento automático silencioso.

### 10.9 Responsável desligado

- A unidade ou posição não é excluída.
- O sistema cria pendência para substituição.
- Histórico mantém o responsável anterior durante a vigência correta.

### 10.10 Reorganização sem destino

- Posições ou vínculos órfãos são listados.
- A versão não pode ser ativada enquanto houver dependências obrigatórias sem destino.

### 10.11 Código reutilizado

- O sistema verifica escopo e vigência.
- Reutilização que gere ambiguidade histórica é bloqueada.
- Quando admitida, deverá haver regra clara e consulta por identificador interno.

### 10.12 Concorrência de edição

- Duas pessoas alteram a mesma estrutura.
- A segunda gravação não sobrescreve silenciosamente a primeira.
- O sistema pede recarregamento ou usa versão transacional apropriada.

---

## 11. Regras de negócio

### RN-ORG-001 — Organização não é empresa empregadora automática

`organizations` continuará como tenant. A associação com empresa empregadora será explícita.

### RN-ORG-002 — Empresa obrigatória no vínculo

Todo vínculo ativo deverá possuir empresa empregadora válida.

### RN-ORG-003 — Estabelecimento pertence à empresa

O estabelecimento usado por um vínculo deverá pertencer à empresa do vínculo.

### RN-ORG-004 — Obra não substitui estabelecimento

Projeto ou obra poderá ser relacionado ao estabelecimento, sem identidade automática entre as entidades.

### RN-ORG-005 — Hierarquia acíclica

Uma unidade não poderá ser superior de si própria, direta ou indiretamente.

### RN-ORG-006 — Histórico por vigência

Mudanças estruturais que afetem interpretação histórica deverão possuir início e fim de vigência.

### RN-ORG-007 — Sem exclusão de cadastro referenciado

Empresa, estabelecimento, unidade, cargo, função, posição ou centro de custo já utilizado não será excluído fisicamente por usuário comum.

### RN-ORG-008 — Cargo e função distintos

Alterar função não alterará automaticamente cargo. Divergências serão explícitas.

### RN-ORG-009 — Posição ocupada derivada

Ocupação da posição será derivada de vínculos e lotações aprovadas, não de campo editável isolado.

### RN-ORG-010 — Uma lotação vigente principal

Um vínculo terá, por padrão, uma lotação organizacional principal por instante, salvo modelo futuro explicitamente configurado.

### RN-ORG-011 — Rateio independente da alocação operacional

Participação em obra não modificará automaticamente o rateio contábil. Regras de derivação deverão ser aprovadas e rastreáveis.

### RN-ORG-012 — Soma de rateio

Rateio completo aprovado deverá somar exatamente 100% na precisão configurada.

### RN-ORG-013 — Centro de custo canônico

RH e Financeiro não manterão catálogos manuais concorrentes de centros de custo.

### RN-ORG-014 — Vigência sem sobreposição indevida

Registros mutuamente exclusivos não poderão possuir períodos sobrepostos para o mesmo vínculo e finalidade.

### RN-ORG-015 — Cadastro aprovado para uso operacional

Estruturas em rascunho ou conferência não serão utilizadas por novos vínculos ativos, salvo exceção formalmente configurada.

### RN-ORG-016 — Encerramento preserva histórico

Encerramento interrompe uso futuro, mas não remove referências passadas.

### RN-ORG-017 — Retroatividade controlada

Alteração retroativa que afete competência fechada exigirá fluxo de retificação e não recalculará dados silenciosamente.

### RN-ORG-018 — Responsável não é texto livre

Responsável hierárquico será referência válida a pessoa, trabalhador, vínculo, posição ou usuário conforme decisão de modelagem; não apenas nome digitado.

### RN-ORG-019 — Herança explícita

Configurações herdadas de empresa para estabelecimento deverão indicar origem. Sobrescrita será explícita e auditada.

### RN-ORG-020 — Unicidade técnica por identificador

Códigos e identificações serão validados no escopo correto, mas relações internas usarão UUID estável.

### RN-ORG-021 — Estado de consulta separado de falha

Falha de carregamento não será apresentada como inexistência de empresas, unidades, cargos ou centros de custo.

### RN-ORG-022 — Data de referência obrigatória em histórico

Consultas históricas deverão declarar a data utilizada e não misturar versões de períodos diferentes.

### RN-ORG-023 — Reorganização não altera retroativamente o pai

Mover unidade produzirá nova vigência ou versão, em vez de reescrever a árvore passada.

### RN-ORG-024 — Coerência de organização

Todas as relações deverão preservar `organization_id`; nenhuma consulta ou mutação cruzará tenants.

### RN-ORG-025 — Evidência de decisão crítica

Ativação, suspensão, encerramento, reativação e alteração retroativa guardarão responsável, instante, motivo e resultado.

---

## 12. Validações

### 12.1 Validações cadastrais

- campos obrigatórios conforme estado;
- normalização sem perda do valor original quando necessário;
- identificação no formato permitido;
- código único no escopo;
- datas coerentes;
- situação compatível com vigência;
- empresa e estabelecimento da mesma organização;
- unidade e cargo ativos na data;
- centro de custo válido;
- documentos mínimos configurados.

### 12.2 Validações temporais

- fim não anterior ao início;
- ausência de sobreposição indevida;
- encerramento posterior ao início;
- estrutura futura não usada antes da vigência;
- estrutura encerrada não usada depois do fim;
- alteração retroativa identificada;
- dependências de competência fechada verificadas.

### 12.3 Validações hierárquicas

- unidade não aponta para si;
- ausência de ciclo indireto;
- pai pertence ao escopo permitido;
- estabelecimento compatível;
- responsável não cria inconsistência proibida;
- centro superior de custo sem ciclo;
- posição dentro de unidade válida.

### 12.4 Validações de rateio

- percentual maior ou igual a zero;
- percentual dentro do limite configurado;
- soma exata conforme precisão;
- centros válidos no período;
- ausência de duplicidade da mesma linha;
- vigência compatível;
- estado de aprovação antes do uso.

### 12.5 Validações de encerramento

- vínculos ativos;
- posições ocupadas;
- admissões em andamento;
- competências abertas;
- rateios futuros;
- obras relacionadas;
- integrações pendentes;
- documentos obrigatórios;
- responsabilidades não transferidas.

---

## 13. Alertas e pendências

### ALT-ORG-001 — Empresa sem estabelecimento ativo

Alerta para empresa ativa que não possua estabelecimento apto a receber vínculo.

### ALT-ORG-002 — Estabelecimento com encerramento próximo

Alerta configurável para responsáveis e DP.

### ALT-ORG-003 — Unidade sem responsável

Alerta quando a regra da organização exigir responsável.

### ALT-ORG-004 — Posição aberta sem requisição

Alerta para posição vaga sem processo associado, quando o recrutamento existir.

### ALT-ORG-005 — Vínculo sem lotação completa

Alerta impeditivo ou informativo conforme categoria.

### ALT-ORG-006 — Rateio não fecha

Alerta impeditivo para competência ou processo configurado.

### ALT-ORG-007 — Centro de custo encerrado em uso

Alerta para RH, Financeiro e Auditoria.

### ALT-ORG-008 — Reorganização futura incompleta

Alerta para posições ou vínculos sem destino.

### ALT-ORG-009 — Responsável desligado

Alerta para substituição de gestor ou responsável cadastral.

### ALT-ORG-010 — Divergência cargo e função

Alerta quando a combinação exigir revisão ou autorização.

### ALT-ORG-011 — Estrutura em rascunho referenciada

Alerta impeditivo contra uso indevido.

### ALT-ORG-012 — Alteração retroativa com impacto

Alerta crítico com lista de competências e integrações afetadas.

---

## 14. Relatórios

### REL-ORG-001 — Empresas e estabelecimentos

Filtros por situação, vigência, localização e pendências.

### REL-ORG-002 — Organograma por data

Apresenta estrutura vigente em uma data, com lista acessível e exportação autorizada.

### REL-ORG-003 — Cargos e funções

Cargos ativos, funções relacionadas, vínculos ocupantes e histórico.

### REL-ORG-004 — Quadro de posições

Planejadas, abertas, ocupadas, bloqueadas e extintas.

### REL-ORG-005 — Lotações vigentes

Por empresa, estabelecimento, unidade, cargo, centro de custo e responsável.

### REL-ORG-006 — Histórico de transferências

Mostra alterações de lotação por período, motivo e responsável.

### REL-ORG-007 — Rateio por centro de custo

Percentuais e vínculos por vigência, sem valores salariais para perfil não autorizado.

### REL-ORG-008 — Estruturas sem uso

Cargos, funções, unidades e centros de custo ativos sem dependências.

### REL-ORG-009 — Pendências de encerramento

Dependências que impedem encerrar empresa, estabelecimento ou unidade.

### REL-ORG-010 — Relação obra × estabelecimento

Obras relacionadas, período, finalidade e responsáveis.

### REL-ORG-011 — Auditoria estrutural

Criações, aprovações, alterações, suspensões, encerramentos e reativações.

### REL-ORG-012 — Divergências de integração

Centros de custo, empresas ou estabelecimentos sem mapeamento necessário.

---

## 15. Integrações internas

### 15.1 Cadastro Mestre

Fornece pessoa, trabalhador e vínculo que receberão lotação.

### 15.2 Administração

Fornece organização, usuários, perfis, módulos e overrides.

### 15.3 Obras

Recebe relações de estabelecimento e alocações operacionais sem acessar salário.

### 15.4 Equipes

Recebe referência de trabalhador ou vínculo para membro de equipe, sem duplicar cadastro mestre.

### 15.5 Planejamento

Poderá utilizar posição, função e alocação para capacidade, sem alterar contrato.

### 15.6 Financeiro

Compartilha centro de custo e recebe lançamentos ou provisões futuras da folha.

### 15.7 Folha

Consome empresa, estabelecimento, lotação, cargo, função e rateios vigentes na competência.

### 15.8 Documentos e Modelos

Fornece modelos e armazena documentos de aprovação, organogramas e descrições.

### 15.9 Relatórios

Consolida dados autorizados por organização, empresa e estabelecimento.

### 15.10 Auditoria

Recebe eventos transversais, mantendo histórico próprio do domínio.

### 15.11 Obrigações Digitais

Consumirá cadastros empresariais e estruturais conforme layouts vigentes; códigos e validações serão confirmados em fontes oficiais na etapa específica.

---

## 16. Segurança, privacidade e auditoria

### 16.1 Capacidades sugeridas

- `view_organization_structure`;
- `manage_organization_structure`;
- `approve_organization_structure`;
- `view_employer_company`;
- `manage_employer_company`;
- `close_employer_company`;
- `view_establishment`;
- `manage_establishment`;
- `close_establishment`;
- `manage_job_catalog`;
- `manage_positions`;
- `manage_cost_centers`;
- `approve_cost_allocations`;
- `view_sensitive_registration_data`;
- `perform_retroactive_structure_change`.

### 16.2 Segregação

- gestor de obra consulta alocação operacional, não identificação cadastral completa;
- Financeiro consulta centro de custo e valores autorizados, não documentos pessoais;
- RH consulta estrutura e pessoas conforme finalidade;
- DP acessa dados cadastrais e contratuais autorizados;
- empregado consulta somente estrutura liberada e próprios dados;
- auditor tem leitura imutável e rastreável;
- administradores técnicos não recebem automaticamente conteúdo salarial ou médico.

### 16.3 Eventos auditáveis

- criação de empresa;
- alteração cadastral;
- aprovação;
- ativação;
- suspensão;
- encerramento;
- reativação;
- criação e reorganização de unidade;
- alteração de responsável;
- criação e extinção de cargo, função ou posição;
- transferência de lotação;
- alteração de centro de custo;
- aprovação de rateio;
- alteração retroativa;
- tentativa negada por escopo ou permissão.

### 16.4 Conteúdo mínimo da auditoria

- organização;
- empresa;
- estabelecimento quando aplicável;
- usuário ator;
- pessoa ou vínculo afetado quando aplicável;
- recurso;
- ação;
- resultado;
- motivo;
- valores anteriores e novos sanitizados;
- vigência;
- correlação;
- instante;
- origem.

---

## 17. Requisitos funcionais resumidos

| ID | Título | Prioridade | Versão |
|---|---|---:|---|
| RF-ORG-001 | Cadastrar empresa empregadora | Crítica | MVP |
| RF-ORG-002 | Conferir e ativar empresa | Crítica | MVP |
| RF-ORG-003 | Cadastrar estabelecimento | Crítica | MVP |
| RF-ORG-004 | Conferir e ativar estabelecimento | Crítica | MVP |
| RF-ORG-005 | Consultar estrutura por data | Alta | MVP |
| RF-ORG-006 | Manter unidades organizacionais | Crítica | MVP |
| RF-ORG-007 | Validar hierarquia sem ciclos | Crítica | MVP |
| RF-ORG-008 | Manter cargos | Crítica | MVP |
| RF-ORG-009 | Manter funções | Alta | MVP |
| RF-ORG-010 | Manter posições | Alta | 1.1 |
| RF-ORG-011 | Manter centro de custo compartilhado | Crítica | MVP |
| RF-ORG-012 | Criar lotação vigente | Crítica | MVP |
| RF-ORG-013 | Transferir lotação | Crítica | MVP |
| RF-ORG-014 | Manter rateio de custo | Alta | 1.1 |
| RF-ORG-015 | Relacionar obra e estabelecimento | Alta | MVP |
| RF-ORG-016 | Encerrar empresa com validação | Crítica | MVP |
| RF-ORG-017 | Encerrar estabelecimento com validação | Crítica | MVP |
| RF-ORG-018 | Reorganizar estrutura com nova vigência | Alta | 1.1 |
| RF-ORG-019 | Consultar histórico e auditoria | Crítica | MVP |
| RF-ORG-020 | Emitir relatórios estruturais | Alta | MVP |
| RF-ORG-021 | Importar estrutura com validação | Média | 1.1 |
| RF-ORG-022 | Alterar estruturas em lote | Média | 1.1 |
| RF-ORG-023 | Controlar quadro planejado | Alta | 1.1 |
| RF-ORG-024 | Identificar impactos retroativos | Crítica | MVP |
| RF-ORG-025 | Compartilhar centro de custo com Financeiro | Crítica | MVP |

---

## 18. Requisitos funcionais detalhados

### RF-ORG-001 — Cadastrar empresa empregadora

**Objetivo:** criar empresa administrada pela organização sem confundi-la com o tenant.  
**Atores:** Administrador, Gestor de DP.  
**Precondições:** organização ativa; permissão de gestão.  
**Fluxo principal:** pesquisar duplicidade, preencher dados, informar vigência, salvar rascunho.  
**Exceções:** identificação duplicada, organização indisponível, data inválida.  
**Dados:** código, nome, identificação, tipo, vigência, responsáveis.  
**Saída:** empresa em `RASCUNHO`.  
**Dependências:** Administração e Auditoria.  
**Critérios de aceite:** registro pertence à organização; não fica utilizável antes de ativação; auditoria criada.

### RF-ORG-002 — Conferir e ativar empresa

**Objetivo:** impedir uso de empresa incompleta.  
**Atores:** Gestor de DP, Direção ou perfil configurado.  
**Precondições:** empresa em rascunho ou conferência; campos obrigatórios completos.  
**Fluxo principal:** executar validações, revisar pendências, aprovar e ativar.  
**Exceções:** documento pendente, duplicidade, permissão insuficiente.  
**Saída:** empresa ativa ou devolvida com motivo.  
**Critérios de aceite:** aprovador e instante registrados; falha não altera estado.

### RF-ORG-003 — Cadastrar estabelecimento

**Objetivo:** registrar unidade vinculada à empresa.  
**Atores:** Administrador, Gestor ou Analista de DP.  
**Precondições:** empresa existente.  
**Fluxo principal:** selecionar empresa, informar dados, vigência, responsáveis e documentos.  
**Exceções:** empresa de outro tenant, código duplicado, empresa encerrada.  
**Saída:** estabelecimento em rascunho.  
**Critérios de aceite:** relação com empresa e organização validada.

### RF-ORG-004 — Conferir e ativar estabelecimento

**Objetivo:** liberar estabelecimento para vínculos.  
**Atores:** Gestor de DP.  
**Precondições:** empresa ativa; estabelecimento completo.  
**Fluxo principal:** revisar, validar e ativar.  
**Exceções:** empresa suspensa, vigência incompatível, pendência obrigatória.  
**Critérios de aceite:** somente estabelecimento ativo aparece em novos vínculos na data válida.

### RF-ORG-005 — Consultar estrutura por data

**Objetivo:** reconstruir organograma e cadastros vigentes em data informada.  
**Atores:** RH, DP, Folha, Auditor.  
**Precondições:** acesso autorizado.  
**Fluxo principal:** selecionar empresa e data, carregar versões coerentes, mostrar fonte temporal.  
**Exceções:** consulta parcial ou indisponível.  
**Saída:** estrutura histórica identificada pela data.  
**Critérios de aceite:** reorganização futura não modifica resultado passado.

### RF-ORG-006 — Manter unidades organizacionais

**Objetivo:** cadastrar árvore de áreas e departamentos.  
**Atores:** Gestor de RH.  
**Precondições:** empresa ativa.  
**Fluxo principal:** criar unidade, selecionar pai, tipo, responsável, centro padrão e vigência.  
**Exceções:** ciclo, pai inválido, código duplicado.  
**Critérios de aceite:** unidade válida aparece na estrutura correta.

### RF-ORG-007 — Validar hierarquia sem ciclos

**Objetivo:** impedir árvore inconsistente.  
**Atores:** sistema.  
**Precondições:** criação ou alteração de pai.  
**Fluxo principal:** percorrer ancestrais dentro da transação e recusar ciclo.  
**Exceções:** concorrência ou estrutura indisponível.  
**Critérios de aceite:** ciclos diretos e indiretos são bloqueados; estado anterior preservado.

### RF-ORG-008 — Manter cargos

**Objetivo:** criar catálogo de cargos com vigência.  
**Atores:** Gestor de RH.  
**Precondições:** empresa ou escopo configurado.  
**Fluxo principal:** informar código, nome, família, nível, descrição e vigência.  
**Exceções:** duplicidade e classificação inválida.  
**Critérios de aceite:** cargo inativo não é usado em nova lotação fora da vigência.

### RF-ORG-009 — Manter funções

**Objetivo:** registrar atividades exercidas separadamente do cargo.  
**Atores:** Gestor de RH.  
**Precondições:** escopo ativo.  
**Fluxo principal:** informar dados e cargo de referência opcional.  
**Exceções:** função encerrada ou relação incompatível.  
**Critérios de aceite:** alterar função não altera cargo automaticamente.

### RF-ORG-010 — Manter posições

**Objetivo:** controlar postos planejados e ocupação.  
**Atores:** RH, Direção.  
**Precondições:** unidade e cargo ativos.  
**Fluxo principal:** criar posição, definir quantidade, estado e centro padrão.  
**Exceções:** unidade encerrada, quantidade inválida.  
**Critérios de aceite:** ocupação é derivada das lotações aprovadas.

### RF-ORG-011 — Manter centro de custo compartilhado

**Objetivo:** fornecer um catálogo único para RH e Financeiro.  
**Atores:** Financeiro e Administrador conforme alçada.  
**Precondições:** organização ativa.  
**Fluxo principal:** criar ou atualizar centro, validar dependências e vigência.  
**Exceções:** código duplicado, centro referenciado, conflito de edição.  
**Critérios de aceite:** RH e Financeiro consultam o mesmo identificador canônico.

### RF-ORG-012 — Criar lotação vigente

**Objetivo:** associar vínculo à estrutura.  
**Atores:** Analista e Gestor de DP.  
**Precondições:** vínculo e estruturas válidos.  
**Fluxo principal:** selecionar estabelecimento, unidade, cargo, função, posição e centro.  
**Exceções:** escopo divergente, sobreposição, cadastro inativo.  
**Critérios de aceite:** consulta por data encontra exatamente a lotação aprovada.

### RF-ORG-013 — Transferir lotação

**Objetivo:** alterar estrutura sem apagar histórico.  
**Atores:** DP.  
**Precondições:** lotação atual ativa.  
**Fluxo principal:** informar nova vigência, destino, motivo e aprovação.  
**Exceções:** data retroativa, competência fechada, destino inválido.  
**Critérios de aceite:** lotação anterior é encerrada; nova inicia sem lacuna ou sobreposição indevida.

### RF-ORG-014 — Manter rateio de custo

**Objetivo:** distribuir custo por centro com vigência.  
**Atores:** DP, Folha e Financeiro conforme alçada.  
**Precondições:** vínculo e centros válidos.  
**Fluxo principal:** criar linhas, validar 100%, aprovar.  
**Exceções:** centro encerrado, soma inválida, competência fechada.  
**Critérios de aceite:** rateio aprovado é reproduzível por competência.

### RF-ORG-015 — Relacionar obra e estabelecimento

**Objetivo:** fornecer contexto operacional sem fundir entidades.  
**Atores:** Administrador, Gestor de Obras.  
**Precondições:** obra e estabelecimento da mesma organização.  
**Fluxo principal:** criar relação com finalidade e vigência.  
**Exceções:** escopo divergente ou período inválido.  
**Critérios de aceite:** vínculo não é transferido automaticamente.

### RF-ORG-016 — Encerrar empresa com validação

**Objetivo:** impedir encerramento inconsistente.  
**Atores:** Direção ou Gestor autorizado.  
**Precondições:** permissão específica.  
**Fluxo principal:** informar data e motivo, calcular dependências, resolver bloqueios, aprovar.  
**Exceções:** vínculos ativos, competências abertas, integrações pendentes.  
**Critérios de aceite:** histórico preservado e uso futuro bloqueado.

### RF-ORG-017 — Encerrar estabelecimento com validação

**Objetivo:** controlar fim de uso de unidade empresarial.  
**Atores:** Gestor de DP.  
**Precondições:** estabelecimento existente.  
**Fluxo principal:** avaliar vínculos, lotações, obras e pendências.  
**Exceções:** dependências não resolvidas.  
**Critérios de aceite:** vínculos passados continuam consultáveis.

### RF-ORG-018 — Reorganizar estrutura com nova vigência

**Objetivo:** criar versão futura do organograma.  
**Atores:** Gestor de RH, Direção.  
**Precondições:** estrutura atual válida.  
**Fluxo principal:** copiar referência, alterar nós, mapear destinos, aprovar.  
**Exceções:** ciclos, órfãos, sobreposição, dependências.  
**Critérios de aceite:** antes da vigência permanece antiga; depois, nova; passado não muda.

### RF-ORG-019 — Consultar histórico e auditoria

**Objetivo:** investigar evolução estrutural.  
**Atores:** Auditor e gestores autorizados.  
**Precondições:** leitura autorizada.  
**Fluxo principal:** filtrar recurso, período, ator e ação.  
**Exceções:** dados sensíveis são mascarados conforme perfil.  
**Critérios de aceite:** cada decisão crítica possui ator, motivo, data e resultado.

### RF-ORG-020 — Emitir relatórios estruturais

**Objetivo:** apoiar operação e auditoria.  
**Atores:** gestores autorizados.  
**Precondições:** consultas confirmadas.  
**Fluxo principal:** selecionar relatório, filtros e formato.  
**Exceções:** falha bloqueia exportação enganosa.  
**Critérios de aceite:** filtros, data de referência e autorização constam na saída.

### RF-ORG-021 — Importar estrutura com validação

**Objetivo:** carregar cadastros legados sem contornar regras.  
**Atores:** Administrador.  
**Precondições:** arquivo autorizado e formato validado.  
**Fluxo principal:** pré-validar, mostrar erros, simular, aprovar e importar idempotentemente.  
**Exceções:** duplicidade, código inválido, ciclo e referência ausente.  
**Critérios de aceite:** importação parcial não ocorre sem política explícita; relatório disponível.

### RF-ORG-022 — Alterar estruturas em lote

**Objetivo:** executar reorganizações controladas.  
**Atores:** Gestor de RH.  
**Precondições:** conjunto definido e permissão.  
**Fluxo principal:** preparar alterações, validar impactos, aprovar e aplicar transacionalmente.  
**Exceções:** qualquer inconsistência impede lote ou segue política explícita.  
**Critérios de aceite:** resultado nominal por item e correlação comum.

### RF-ORG-023 — Controlar quadro planejado

**Objetivo:** comparar posições planejadas e ocupadas.  
**Atores:** RH e Direção.  
**Precondições:** posições cadastradas.  
**Fluxo principal:** definir quadro, consultar vacâncias e excedentes.  
**Exceções:** lotação sem posição é exibida separadamente.  
**Critérios de aceite:** números derivam de dados confirmados e data declarada.

### RF-ORG-024 — Identificar impactos retroativos

**Objetivo:** impedir alteração histórica silenciosa.  
**Atores:** sistema e gestor autorizado.  
**Precondições:** data anterior ao presente operacional ou competência fechada.  
**Fluxo principal:** listar contratos, folhas, relatórios e integrações afetadas.  
**Exceções:** dependência indisponível resulta em bloqueio, não em ausência presumida.  
**Critérios de aceite:** alteração só avança com fluxo e justificativa adequados.

### RF-ORG-025 — Compartilhar centro de custo com Financeiro

**Objetivo:** evitar duplicação de catálogo.  
**Atores:** RH, DP e Financeiro.  
**Precondições:** decisão de migração aprovada.  
**Fluxo principal:** resolver centro canônico, preservar referências e disponibilizar nos dois módulos.  
**Exceções:** códigos conflitantes entram em reconciliação.  
**Critérios de aceite:** um único centro representa a mesma dimensão nos módulos integrados.

---

## 19. Requisitos não funcionais

### RNF-ORG-001 — Isolamento multiempresa

Nenhuma consulta, relação ou alteração poderá cruzar `organization_id`.

### RNF-ORG-002 — Histórico reproduzível

Consultas por data deverão reconstruir a estrutura vigente sem depender do estado atual.

### RNF-ORG-003 — Concorrência

Alterações críticas deverão detectar edição concorrente ou executar por RPC transacional.

### RNF-ORG-004 — Acessibilidade

Organograma possuirá alternativa tabular, navegação por teclado, foco visível e informação não dependente apenas de cor.

### RNF-ORG-005 — Desempenho

Listagens utilizarão paginação e filtros indexáveis. Árvores grandes serão carregadas sem consulta por nó.

### RNF-ORG-006 — Observabilidade

Falhas terão correlação, contexto estável e mensagens de domínio sem expor SQL ou dados sensíveis.

### RNF-ORG-007 — Exportação auditada

Exportações registrarão ator, filtros, quantidade, formato e hash quando aplicável.

### RNF-ORG-008 — Privacidade

A interface exibirá somente dados necessários à finalidade do perfil.

### RNF-ORG-009 — Recuperabilidade

Migrations, testes, documentação e procedimentos serão versionados no repositório.

### RNF-ORG-010 — Configuração com vigência

Códigos e regras externas serão parametrizados e associados à versão ou período aplicável.

---

## 20. Critérios de aceite integrados

### CA-ORG-001

Uma organização administra duas empresas empregadoras sem duplicar usuários ou módulos.

### CA-ORG-002

Cada empresa possui estabelecimentos próprios e o sistema bloqueia referências cruzadas.

### CA-ORG-003

A árvore organizacional rejeita ciclo direto e indireto.

### CA-ORG-004

Uma reorganização futura não modifica consulta histórica anterior.

### CA-ORG-005

Cargo, função e posição são apresentados separadamente e não se alteram em cascata sem regra.

### CA-ORG-006

Uma lotação transferida preserva registro anterior e vigência correta.

### CA-ORG-007

Centro de custo utilizado pelo RH é o mesmo identificado pelo Financeiro.

### CA-ORG-008

Rateio aprovado soma 100% e é recuperável pela competência.

### CA-ORG-009

Gestor de obra visualiza alocação sem salário ou documento cadastral completo.

### CA-ORG-010

Encerrar estabelecimento com vínculo ativo é bloqueado e apresenta dependências.

### CA-ORG-011

Falha de consulta de centros de custo não aparece como “nenhum centro cadastrado”.

### CA-ORG-012

Alteração retroativa lista impactos e exige justificativa e permissão.

### CA-ORG-013

Ocupação de posição é derivada de lotações e não editada manualmente.

### CA-ORG-014

Relação obra-estabelecimento não transfere vínculos automaticamente.

### CA-ORG-015

Auditoria identifica ator, motivo, vigência, resultado e correlação de mudança crítica.

---

## 21. Sequência recomendada de implementação

### Fase 1 — Modelo e reconciliação

1. confirmar ADR-002;
2. mapear `organizations` e configurações existentes;
3. analisar `finance_cost_centers` e referências;
4. definir nomes canônicos;
5. definir estratégia de migração sem duplicação;
6. validar permissões e RLS;
7. escrever migrations append-only;
8. escrever testes negativos de tenant e integridade.

### Fase 2 — Empresas e estabelecimentos

1. esquema;
2. estados;
3. RPCs de criação, aprovação e encerramento;
4. telas;
5. auditoria;
6. relatórios básicos;
7. homologação.

### Fase 3 — Unidades, cargos e funções

1. árvore e prevenção de ciclos;
2. vigência;
3. catálogo de cargos;
4. catálogo de funções;
5. responsáveis;
6. histórico;
7. organograma acessível.

### Fase 4 — Lotação e integração

1. lotação versionada;
2. transferência;
3. relação com vínculo;
4. relação com obra;
5. centro de custo compartilhado;
6. impactos retroativos;
7. relatórios.

### Fase 5 — Posições e rateios

1. quadro planejado;
2. ocupação derivada;
3. rateios;
4. aprovação;
5. integração com folha e Financeiro;
6. testes de competência.

Nenhuma fase será considerada concluída sem código, migration, testes, documentação, CI e evidência compatíveis.

---

## 22. Riscos

| Risco | Impacto | Tratamento inicial |
|---|---|---|
| Confundir tenant com empresa | arquitetura limitada | ADR-002 e relação explícita |
| Duplicar centro de custo | divergência financeira | catálogo canônico compartilhado |
| Reorganização sobrescrever passado | folha e relatórios incorretos | vigência e consulta histórica |
| Cargo e função misturados | contrato inconsistente | entidades distintas |
| Obra virar estabelecimento por conveniência | obrigações incorretas | relação explícita sem fusão |
| Alteração retroativa silenciosa | cálculo e transmissão divergentes | análise de impacto e retificação |
| Árvore com ciclos | consultas quebradas | validação transacional |
| Exclusão de estrutura usada | histórico órfão | encerramento, não exclusão |
| Permissão ampla | exposição indevida | capacidades específicas |
| Importação contornar regras | base inconsistente | simulação e validação idempotente |
| Posição ocupada manualmente | quadro falso | ocupação derivada |
| Centro encerrado em rateio | contabilização incorreta | validação por vigência |

---

## 23. Decisões pendentes

- nomes técnicos definitivos das entidades;
- se cargos serão globais ao tenant ou específicos por empresa;
- se funções poderão ser globais com restrição por unidade;
- modelo de posição individual ou agregada;
- responsável hierárquico por vínculo, posição ou unidade;
- estratégia de generalização de `finance_cost_centers`;
- precisão dos percentuais de rateio;
- política de rateio parcial;
- relação entre obra e estabelecimento;
- tratamento de unidades corporativas compartilhadas por empresas;
- workflow de aprovação por tipo de alteração;
- regras de retroatividade;
- identificadores e classificações oficiais vigentes;
- política de importação inicial;
- necessidade de organograma público ao empregado;
- alçadas para encerramento e reativação.

---

## 24. Política de fontes oficiais

Este documento não fixa códigos legais, layouts, prazos ou classificações governamentais.

Antes da implementação de campos e integrações sujeitos a regra externa, a equipe deverá:

1. consultar a fonte oficial vigente;
2. registrar a data da consulta;
3. identificar versão, leiaute ou nota aplicável;
4. separar obrigação legal de decisão de produto;
5. parametrizar validade e histórico;
6. criar teste contra a regra implementada;
7. registrar limitações e pendências.

Comportamento de produto privado poderá servir como benchmark, nunca como fonte primária de obrigação.

---

## 25. Estado desta entrega

### Concluído nesta especificação

- separação entre tenant, empresa e estabelecimento;
- conceitos de unidade, cargo, função, posição, lotação e centro de custo;
- mapa de telas;
- dados necessários;
- fluxos principais;
- estados pessimistas;
- regras de negócio;
- validações;
- alertas;
- relatórios;
- integrações;
- segurança;
- 25 requisitos funcionais;
- requisitos não funcionais;
- critérios de aceite;
- sequência de implementação;
- riscos e decisões pendentes.

### Não concluído

- validação jurídica e contábil dos campos;
- modelo físico;
- migrations;
- telas;
- testes;
- integração com fontes oficiais;
- homologação;
- aprovação de produto.

### Próximo módulo lógico

**Módulo 03 — Admissão, Pré-admissão, Conferência Documental e Ativação do Vínculo.**

Ele utilizará o Cadastro Mestre e a Estrutura Organizacional para transformar uma pessoa selecionada em vínculo ativo, sem pular conferência, documentos, condições iniciais, jornada e pendências.
