# ADR-001 — Separação entre Pessoa, Usuário, Trabalhador, Vínculo e Alocação em Obra

**Projeto:** Projeto RH  
**Estado:** proposta aceita para orientar a especificação; implementação pendente  
**Data:** 5 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  

## Contexto

A Innovar Platform já possui:

- usuários autenticados;
- associações de usuários às organizações;
- perfis e permissões;
- equipes de obra;
- membros de equipes;
- recursos de projeto;
- responsáveis por tarefas;
- custos operacionais por recurso.

Essas estruturas atendem acesso à plataforma e operação das obras. Elas não representam de forma suficiente a identidade civil da pessoa, o trabalhador, o vínculo contratual, a matrícula, a vigência das condições de trabalho ou o histórico necessário à folha de pagamento.

Transformar diretamente `auth.users`, `project_team_members` ou `project_resources` no cadastro mestre de empregados produziria dependências incorretas:

- trabalhador seria obrigado a possuir login;
- desligamento poderia afetar histórico operacional;
- uma pessoa alocada em duas obras poderia ser duplicada;
- mudança de equipe poderia parecer mudança de vínculo;
- custo operacional poderia ser confundido com salário;
- dados pessoais e salariais seriam expostos a perfis operacionais;
- múltiplos vínculos da mesma pessoa não seriam representados corretamente.

## Decisão

O Projeto RH adotará entidades canônicas separadas.

### Pessoa

Representa a identidade cadastral comum. Pode existir sem vínculo e sem acesso ao sistema.

### Usuário

Representa a identidade de autenticação e autorização. Um usuário poderá ser associado a uma pessoa, mas essa associação não comprovará vínculo trabalhista.

### Trabalhador

Representa a pessoa no contexto profissional de uma organização. Poderá existir antes, durante e depois de um vínculo específico.

### Vínculo

Representa a relação jurídica ou contratual entre trabalhador e organização. Conterá matrícula, categoria, admissão, situação e histórico por vigência.

### Contrato e condições vigentes

Representam salário, jornada, cargo, função, lotação, sindicato e demais condições aplicáveis por período.

### Alocação em obra

Representa o uso operacional do trabalhador em uma obra, equipe, tarefa ou recurso. Não substitui o vínculo.

## Modelo conceitual inicial

```text
people
  ├─ user_person_links ── auth.users
  └─ workers
       └─ employment_relationships
            ├─ employment_contract_versions
            ├─ organizational_assignments
            ├─ work_schedules
            ├─ benefits
            ├─ leaves
            └─ project_worker_allocations
                   └─ project_teams / tasks / resources
```

Os nomes das tabelas são provisórios. Esta ADR define a fronteira funcional, não autoriza migrations antes do detalhamento e da revisão do modelo.

## Regras obrigatórias

1. Pessoa não dependerá de conta de acesso.
2. Conta de acesso não será considerada prova de vínculo.
3. Trabalhador desligado permanecerá referenciável pelo histórico.
4. Alocação em obra não modificará automaticamente salário, contrato ou jornada.
5. Exclusão de equipe não excluirá trabalhador ou vínculo.
6. Custo operacional de obra não será tratado automaticamente como salário.
7. Dados de folha e medicina não serão adicionados às tabelas de equipes.
8. A mesma pessoa poderá possuir histórico de mais de um vínculo, conforme a regra funcional aprovada.
9. Alterações contratuais serão versionadas por vigência.
10. Integrações existentes deverão migrar por referência, sem duplicar cadastros.

## Consequências positivas

- separação clara de responsabilidades;
- empregados sem login;
- histórico preservado;
- suporte futuro a múltiplos vínculos;
- integração com obra sem duplicação;
- autorização mais granular;
- melhor aderência à minimização de dados;
- folha reproduzível por vínculo e competência.

## Custos e impactos

- necessidade de novas entidades e relações;
- migração gradual dos membros de equipes existentes;
- telas distintas para pessoa, trabalhador, vínculo e alocação;
- necessidade de resolver duplicidades históricas;
- revisão de relatórios que hoje usam usuário ou nome livre como pessoa;
- criação de contratos claros entre RH, Equipes, Obras, Financeiro e Auditoria.

## Alternativas rejeitadas

### Usar `auth.users` como empregado

Rejeitada porque nem todo trabalhador possui login e uma conta pode existir sem vínculo.

### Usar `project_team_members` como empregado

Rejeitada porque a entidade pertence à operação de uma obra e não possui histórico contratual suficiente.

### Criar um cadastro independente por módulo

Rejeitada porque duplicaria a pessoa entre RH, Equipes, Financeiro e documentos.

### Colocar todos os dados em uma única tabela de empregado

Rejeitada porque mistura identidade, vínculo, condições com vigência, saúde, folha e alocação, ampliando exposição e dificultando histórico.

## Critérios de aceite da futura implementação

- trabalhador sem login pode ser cadastrado e alocado;
- usuário sem vínculo pode administrar o sistema;
- a mesma pessoa não precisa ser duplicada para mudar de obra;
- desligar vínculo não remove histórico de equipe ou folha;
- gestor de obra consulta a alocação sem receber salário ou dado médico;
- RH consegue consultar as condições vigentes em uma data passada;
- auditoria identifica quem criou, alterou ou encerrou cada relação.

## Relações com outros documentos

- `docs/PROJETO-RH-ESPECIFICACAO-FUNCIONAL.md`;
- `diretrizes/ARQUITETURA.md`;
- `diretrizes/PERSONAS-E-ROTINAS.md`;
- `diretrizes/CONTRATO-AUDITAVEL-DE-PERSONAS.md`;
- `diretrizes/REUSO-DE-INFORMACAO.md`.
