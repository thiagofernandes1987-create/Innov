# Projeto RH — Módulo 01: Cadastro Mestre de Pessoas, Trabalhadores e Vínculos

**Versão:** 0.1.0  
**Data:** 5 de agosto de 2026  
**Estado:** especificação funcional inicial concluída; validação de produto pendente  
**Implementação:** não iniciada  

---

## 1. Finalidade

O Cadastro Mestre será a fonte canônica das pessoas e vínculos utilizados pelos módulos de Recursos Humanos, Departamento Pessoal, Folha, Obras, Equipes, Documentos, Financeiro, Relatórios e Auditoria.

O módulo deverá eliminar a necessidade de cadastrar a mesma pessoa separadamente como usuário, membro de equipe, recurso de obra, empregado e beneficiário da folha.

A separação central será:

```text
Pessoa → Trabalhador → Vínculo → Condições vigentes → Alocações
```

O acesso à plataforma continuará sendo uma relação opcional da pessoa com `auth.users`.

---

## 2. Usuários do módulo

| Perfil | Operações principais |
|---|---|
| Gestor de RH | criar, revisar, unificar e consultar pessoas e trabalhadores |
| Analista de RH | cadastrar e atualizar dados autorizados |
| Gestor de DP | criar vínculos, matrículas e condições contratuais |
| Analista de DP | completar documentos, lotações e históricos |
| Gestor de Folha | consultar dados necessários ao cálculo |
| Medicina e Segurança | consultar somente dados identificadores necessários e dados ocupacionais autorizados |
| Gestor de Obras | localizar trabalhador e administrar alocação em obra, sem editar vínculo |
| Administrador | configurar permissões, campos obrigatórios e integrações |
| Auditor | consultar histórico e evidências sem alterar o cadastro |
| Empregado | consultar e solicitar correção dos próprios dados liberados |

---

## 3. Telas do módulo

### 3.1 Pessoas

Rota sugerida: `/app/rh/pessoas`

Finalidade: pesquisar pessoas já registradas antes de criar um novo cadastro.

Elementos:

- busca por nome, identificação, e-mail e telefone;
- filtros por organização, situação, existência de vínculo e existência de usuário;
- indicadores de possível duplicidade;
- visualizações em lista e cartões, quando ambas forem úteis;
- ação `Nova pessoa`;
- ação `Revisar duplicidades` para perfis autorizados.

A tela não deverá expor salário, diagnóstico médico ou informação de folha.

### 3.2 Nova pessoa

Rota sugerida: `/app/rh/pessoas/nova`

Etapas recomendadas:

1. identificação;
2. contatos;
3. endereço;
4. documentos necessários;
5. revisão de possíveis duplicidades;
6. confirmação.

Antes da gravação, o sistema deverá pesquisar possíveis correspondências e apresentar motivos objetivos, como identificação igual, e-mail igual, telefone igual ou forte semelhança de nome combinada com data de nascimento.

A confirmação de uma possível duplicidade exigirá permissão e justificativa. O sistema não deverá bloquear automaticamente apenas por semelhança de nome.

### 3.3 Detalhe da pessoa

Rota sugerida: `/app/rh/pessoas/[id]`

Seções:

- resumo cadastral;
- contatos;
- endereços;
- documentos;
- usuários associados;
- trabalhadores e vínculos;
- pendências;
- histórico de alterações;
- solicitações de correção;
- retenção e restrições aplicáveis.

### 3.4 Trabalhadores

Rota sugerida: `/app/rh/trabalhadores`

Finalidade: localizar pessoas que possuem contexto profissional em uma organização.

Filtros:

- organização;
- estabelecimento;
- situação;
- tipo de relação;
- existência de vínculo ativo;
- cargo;
- departamento;
- centro de custo;
- obra atual;
- pendências de documentos.

### 3.5 Novo vínculo

Rota sugerida: `/app/departamento-pessoal/vinculos/novo`

Etapas:

1. selecionar pessoa ou trabalhador;
2. selecionar organização;
3. informar categoria e matrícula;
4. definir empresa, estabelecimento e lotação;
5. definir cargo e função;
6. definir data de admissão e condições iniciais;
7. associar jornada;
8. associar sindicato ou enquadramento aplicável;
9. anexar documentos;
10. revisar pendências;
11. salvar como rascunho ou enviar para conferência.

### 3.6 Detalhe do vínculo

Rota sugerida: `/app/departamento-pessoal/vinculos/[id]`

Seções:

- resumo;
- situação atual;
- matrícula;
- contrato e alterações;
- cargo e função;
- salário e histórico, restrito por permissão;
- jornada;
- lotação e centro de custo;
- sindicato e enquadramentos;
- dependentes;
- benefícios;
- férias;
- afastamentos;
- documentos;
- alocações em obras;
- folha e obrigações, quando disponíveis;
- histórico e auditoria.

---

## 4. Dados necessários

### 4.1 Pessoa

Campos iniciais:

| Campo | Obrigatoriedade | Observação |
|---|---|---|
| Identificador interno | automático | UUID estável |
| Nome completo | obrigatória | sem abreviação automática |
| Nome social | opcional | acesso conforme finalidade |
| Data de nascimento | configurável | necessária conforme processo |
| Nacionalidade | configurável | vocabulário controlado |
| Identificação principal | configurável | armazenada com proteção adequada |
| E-mail pessoal | opcional | validado quando informado |
| Telefone | opcional | normalização sem perder o valor original |
| Endereço | opcional no primeiro cadastro | pode virar obrigatório na admissão |
| Situação cadastral | obrigatória | ativa, restrita, unificada ou arquivada |
| Criado por | automático | auditoria |
| Criado em | automático | auditoria |
| Atualizado em | automático | auditoria |

O conjunto definitivo de documentos e obrigatoriedades dependerá do processo, da categoria do trabalhador e da validação jurídica e operacional.

### 4.2 Trabalhador

| Campo | Obrigatoriedade | Observação |
|---|---|---|
| Pessoa | obrigatória | relação canônica |
| Organização | obrigatória | contexto empresarial |
| Código interno | automático ou configurável | não substitui matrícula |
| Situação | obrigatória | candidato, pré-admissão, ativo, sem vínculo ativo, desligado ou arquivado |
| Origem | obrigatória | recrutamento, importação, cadastro manual ou integração |
| Responsável atual | opcional | fluxo de tratamento |
| Observações internas | opcional | acesso restrito e finalidade definida |

### 4.3 Vínculo

| Campo | Obrigatoriedade | Observação |
|---|---|---|
| Trabalhador | obrigatória | vínculo pertence ao trabalhador |
| Organização | obrigatória | deve coincidir com o trabalhador |
| Matrícula | obrigatória conforme configuração | única no escopo definido |
| Tipo de relação | obrigatória | vocabulário configurado |
| Categoria | obrigatória | parametrizável |
| Data de admissão ou início | obrigatória | base temporal |
| Data de encerramento | opcional | preenchida pelo desligamento |
| Situação | obrigatória | rascunho, em conferência, ativo, afastado, suspenso, encerrado ou cancelado |
| Empresa | obrigatória | cadastro mestre |
| Estabelecimento | obrigatória | cadastro mestre |
| Lotação | obrigatória conforme categoria | versionada |
| Cargo | obrigatória conforme categoria | versionado |
| Função | opcional | versionada |
| Jornada | obrigatória conforme categoria | versionada |
| Salário contratual | restrito e versionado | não deve ficar no registro principal mutável |
| Sindicato/enquadramento | configurável | versionado |
| Centro de custo | configurável | versionado |

### 4.4 Condições com vigência

Os seguintes dados deverão possuir registros próprios de vigência ou versões de contrato:

- salário;
- cargo;
- função;
- jornada;
- lotação;
- departamento;
- estabelecimento quando admitida alteração;
- centro de custo;
- sindicato;
- modalidade de trabalho;
- responsável hierárquico;
- condições adicionais que alterem cálculo ou obrigação.

Cada registro deverá guardar:

- início da vigência;
- fim da vigência, quando houver;
- motivo;
- origem;
- documento de suporte;
- responsável pela alteração;
- instante do registro;
- estado de aprovação;
- referência à alteração anterior quando aplicável.

---

## 5. Fluxo principal: cadastrar pessoa e criar vínculo

1. O analista acessa `Pessoas`.
2. Pesquisa pelo menos por nome e uma identificação disponível.
3. O sistema apresenta correspondências possíveis.
4. O analista reutiliza uma pessoa existente ou inicia novo cadastro.
5. O sistema valida os campos e registra a pessoa.
6. O analista cria ou reutiliza o trabalhador no contexto da organização.
7. Inicia o vínculo em estado `RASCUNHO`.
8. Preenche matrícula, categoria, empresa, estabelecimento, cargo, jornada e demais dados aplicáveis.
9. O sistema executa validações de consistência e apresenta pendências.
10. Documentos e condições iniciais são anexados ou registrados.
11. O analista envia o vínculo para conferência.
12. Um perfil autorizado aprova ou devolve com motivo.
13. Após a aprovação e o atendimento dos pré-requisitos, o vínculo muda para `ATIVO` na data aplicável.
14. A operação gera auditoria e disponibiliza o vínculo aos módulos autorizados.

---

## 6. Exceções e estados pessimistas

### Pessoa possivelmente duplicada

- o sistema apresenta as correspondências e os campos coincidentes;
- o analista pode cancelar, reutilizar ou solicitar criação excepcional;
- criação excepcional exige justificativa e permissão;
- unificação posterior não apaga os identificadores históricos.

### Documento obrigatório ausente

- o vínculo permanece em rascunho ou pendente;
- o sistema identifica qual documento falta;
- a pendência possui responsável e prazo;
- nenhuma rotina dependente deve interpretar o vínculo como completo.

### Matrícula já utilizada

- o sistema informa o escopo da duplicidade;
- não deve revelar dados de outra organização ao usuário sem acesso;
- a criação é bloqueada até correção ou autorização prevista.

### Data incompatível

Exemplos:

- encerramento anterior ao início;
- alteração com início anterior ao vínculo;
- sobreposição de duas versões mutuamente exclusivas;
- vigência aberta duplicada para a mesma condição.

A gravação será recusada com mensagem de domínio.

### Integração com usuário indisponível

- a pessoa e o vínculo poderão ser cadastrados sem login;
- a falha em criar ou associar acesso não deverá apagar o cadastro trabalhista;
- a pendência de acesso será registrada separadamente.

### Módulo Equipes indisponível

- a criação do vínculo continuará possível;
- a alocação em obra permanecerá pendente;
- o sistema não deverá criar um membro de equipe órfão ou duplicado.

---

## 7. Regras de negócio

### RN-CAD-001 — Identidade canônica

A pessoa será a identidade comum entre módulos. Módulos não deverão criar cópias independentes sem processo de reconciliação.

### RN-CAD-002 — Pessoa sem usuário

A existência de pessoa, trabalhador ou vínculo não dependerá de `auth.users`.

### RN-CAD-003 — Usuário sem vínculo

Administradores, contadores externos ou prestadores autorizados poderão possuir usuário sem vínculo trabalhista.

### RN-CAD-004 — Matrícula não é identidade da pessoa

Matrícula identifica um vínculo no escopo configurado. Não substitui o identificador da pessoa.

### RN-CAD-005 — Histórico preservado

Condições contratuais não serão sobrescritas quando sua mudança afetar interpretação histórica. Uma nova vigência será criada.

### RN-CAD-006 — Sem sobreposição incompatível

O sistema impedirá duas condições abertas incompatíveis para o mesmo vínculo e período, salvo regra explícita que permita simultaneidade.

### RN-CAD-007 — Desligamento sem exclusão

Encerrar vínculo não excluirá pessoa, trabalhador, alocação histórica, documentos, folha ou auditoria.

### RN-CAD-008 — Alocação não altera contrato

Mover trabalhador entre equipes ou obras não alterará salário, jornada, cargo ou vínculo sem processo contratual próprio.

### RN-CAD-009 — Dados sensíveis por finalidade

Dados pessoais, salariais, médicos e de acesso serão protegidos por capacidades distintas.

### RN-CAD-010 — Unificação auditável

A unificação de pessoas duplicadas deverá preservar aliases, identificadores anteriores, referências e responsável pela decisão.

---

## 8. Validações

O sistema deverá validar, no mínimo:

- formato dos campos estruturados;
- identificadores duplicados no escopo aplicável;
- datas e vigências;
- organização da pessoa, trabalhador e vínculo;
- existência e estado de empresa, estabelecimento, cargo, função e jornada;
- permissões de leitura e alteração por categoria de dado;
- associação de documentos ao titular correto;
- compatibilidade das alocações com organização e obra;
- ausência de sobreposição de condições exclusivas;
- obrigatoriedades configuradas para ativação;
- integridade entre vínculo e histórico contratual.

Validações legais, códigos oficiais e obrigatoriedades variáveis deverão ser parametrizadas e confirmadas em fontes oficiais atualizadas antes da implementação produtiva.

---

## 9. Alertas

Alertas iniciais:

- pré-admissão incompleta;
- documento obrigatório pendente;
- documento próximo do vencimento;
- vínculo aguardando conferência;
- alteração contratual futura programada;
- dado obrigatório incompatível;
- trabalhador ativo sem alocação quando a política exigir;
- pessoa possivelmente duplicada;
- acesso solicitado e não provisionado;
- condição com vigência próxima do encerramento.

Cada alerta deverá possuir:

- tipo;
- severidade;
- pessoa, trabalhador ou vínculo relacionado;
- responsável;
- prazo;
- estado;
- origem;
- ação recomendada;
- histórico de reconhecimento e resolução.

---

## 10. Documentos e relatórios

### Documentos

- ficha cadastral;
- contrato e versões;
- termos e declarações;
- documentos pessoais necessários;
- comprovantes;
- anexos de alterações;
- comunicações de pendência;
- histórico exportável conforme permissão.

### Relatórios

- trabalhadores por situação;
- vínculos ativos e encerrados;
- admissões por período;
- alterações contratuais futuras;
- pendências cadastrais;
- documentos vencidos ou próximos do vencimento;
- distribuição por cargo, estabelecimento e lotação;
- trabalhadores por obra;
- pessoas duplicadas em revisão;
- acessos associados e pendentes.

Relatórios com salário ou dados sensíveis deverão exigir capacidades específicas e gerar auditoria de exportação.

---

## 11. Segurança e auditoria

Eventos auditáveis mínimos:

- criação de pessoa;
- alteração de identificador;
- associação ou remoção de usuário;
- criação de trabalhador;
- criação, aprovação, ativação e encerramento de vínculo;
- alteração contratual;
- consulta ou exportação de salário;
- acesso a documento sensível;
- unificação de duplicidades;
- alocação e desalocação em obra;
- concessão ou revogação de capacidade sensível.

A auditoria deverá registrar contexto suficiente para investigação sem copiar desnecessariamente o conteúdo integral dos documentos ou campos sensíveis.

---

## 12. Requisitos funcionais detalhados

### RF-CAD-001 — Pesquisar pessoa antes do cadastro

- **Objetivo:** reduzir duplicidades.
- **Atores:** RH e DP.
- **Pré-condição:** sessão válida e permissão de cadastro.
- **Fluxo principal:** informar critérios, consultar correspondências, selecionar ou continuar.
- **Exceção:** serviço de busca indisponível impede confirmação automática, mas não deve ser apresentado como ausência de correspondência.
- **Prioridade:** crítica.
- **Versão:** MVP.
- **Critério de aceite:** a tela diferencia claramente “nenhuma correspondência” de “busca indisponível”.

### RF-CAD-002 — Cadastrar pessoa sem usuário

- **Objetivo:** permitir cadastro de trabalhador sem login.
- **Prioridade:** crítica.
- **Versão:** MVP.
- **Critério de aceite:** pessoa é criada sem registro obrigatório em `auth.users`.

### RF-CAD-003 — Associar pessoa a usuário existente

- **Objetivo:** relacionar identidade de acesso sem transformar usuário em vínculo.
- **Prioridade:** média.
- **Versão:** MVP.
- **Critério de aceite:** remover a associação não exclui pessoa, usuário, trabalhador ou vínculo.

### RF-CAD-004 — Criar trabalhador por organização

- **Objetivo:** representar o contexto profissional da pessoa.
- **Prioridade:** crítica.
- **Versão:** MVP.
- **Critério de aceite:** o trabalhador referencia uma pessoa e uma organização válidas.

### RF-VIN-001 — Criar vínculo em rascunho

- **Objetivo:** permitir preenchimento progressivo sem ativação prematura.
- **Prioridade:** crítica.
- **Versão:** MVP.
- **Critério de aceite:** vínculo incompleto não aparece como ativo para folha ou obrigações.

### RF-VIN-002 — Conferir e aprovar vínculo

- **Objetivo:** aplicar segregação entre preparação e aprovação quando configurada.
- **Prioridade:** alta.
- **Versão:** MVP.
- **Critério de aceite:** o mesmo usuário não aprova quando a organização exigir separação de funções.

### RF-VIN-003 — Consultar condição vigente em uma data

- **Objetivo:** permitir reconstrução histórica.
- **Prioridade:** crítica.
- **Versão:** MVP.
- **Critério de aceite:** a consulta por data retorna cargo, salário, jornada e lotação vigentes naquela data, respeitando permissões.

### RF-VIN-004 — Registrar alteração contratual futura

- **Objetivo:** programar mudança com início posterior.
- **Prioridade:** alta.
- **Versão:** MVP.
- **Critério de aceite:** antes da vigência, a condição atual continua válida; na data aplicável, a consulta vigente passa a retornar a nova condição.

### RF-VIN-005 — Encerrar vínculo

- **Objetivo:** concluir a relação sem apagar histórico.
- **Prioridade:** crítica.
- **Versão:** MVP.
- **Critério de aceite:** o encerramento registra data, motivo, responsável e mantém todas as referências históricas.

### RF-ALO-001 — Alocar vínculo em obra

- **Objetivo:** conectar RH à operação.
- **Prioridade:** alta.
- **Versão:** MVP.
- **Critério de aceite:** a equipe recebe referência canônica; nenhuma nova pessoa é criada.

### RF-DUP-001 — Unificar pessoas duplicadas

- **Objetivo:** consolidar cadastros preservando referências.
- **Prioridade:** alta.
- **Versão:** 1.1.
- **Critério de aceite:** todas as referências passam à pessoa canônica e o cadastro substituído permanece identificável na auditoria.

---

## 13. Critérios de aceite do módulo

O módulo será considerado funcionalmente especificado quando:

1. todas as telas e estados estiverem definidos;
2. os campos possuírem finalidade e classificação de acesso;
3. pessoa, usuário, trabalhador, vínculo e alocação estiverem separados;
4. as vigências e sobreposições estiverem definidas;
5. os fluxos de rascunho, conferência, aprovação, ativação e encerramento estiverem completos;
6. os cenários de duplicidade e indisponibilidade estiverem tratados;
7. as integrações com Equipes, Obras, Documentos, Financeiro e Auditoria estiverem contratadas;
8. os requisitos receberem testes positivos e negativos propostos;
9. a política de retenção for validada;
10. o modelo for revisado pela equipe de produto e pelos responsáveis técnicos antes de qualquer migration.

---

## 14. Dependências

- revisão do estado canônico da `main`;
- definição do módulo e suas chaves no registry;
- ampliação do modelo de capacidades;
- classificação de dados pessoais e sensíveis;
- definição de empresas, estabelecimentos, departamentos e centros de custo canônicos;
- decisão sobre múltiplos vínculos;
- integração com o cadastro de usuários;
- revisão de retenção e proteção de dados;
- confirmação das regras e documentos por responsável trabalhista e contábil.

---

## 15. Próximo módulo

O próximo bloco lógico será:

**Módulo 02 — Empresas, Estabelecimentos, Estrutura Organizacional, Cargos, Funções, Lotações e Centros de Custo.**

Esse bloco deverá ser concluído antes de detalhar admissão e folha, porque os dois processos dependem diretamente dessa estrutura.
