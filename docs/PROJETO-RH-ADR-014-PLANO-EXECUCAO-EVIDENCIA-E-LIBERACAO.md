# Projeto RH — ADR-014 — Plano, Execução, Evidência, Homologação e Liberação

**Estado:** decisão de planejamento registrada; implementação pendente  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**Módulo relacionado:** `PROJETO-RH-MODULO-14-BACKLOG-EXECUTAVEL-SPRINTS-GATES-E-HOMOLOGACAO.md`

---

## 1. Contexto

Os módulos 01 a 12 definiram o comportamento funcional do Projeto RH. O Módulo 13 definiu a arquitetura técnica, as fronteiras de contexto, os padrões de transação, autorização, eventos, jobs, migrations e rollout.

A próxima etapa precisa transformar essas definições em trabalho executável sem cometer erros recorrentes de governança:

- confundir documentação concluída com software entregue;
- tratar uma lista de tarefas como sequência tecnicamente válida;
- iniciar migrations antes do inventário e da reconciliação da base;
- executar histórias sem critérios de aceite e evidências;
- usar número de sprint como estimativa de calendário;
- afirmar datas sem equipe, capacidade e velocidade conhecidas;
- misturar spike, implementação, correção, homologação e liberação;
- avançar apesar de dependência bloqueante ou CI estruturalmente inválido;
- considerar uma tela pronta quando banco, RLS, concorrência ou auditoria não estão prontos;
- considerar um teste planejado como teste executado;
- liberar folha ou obrigação governamental sem cálculo sombra e reconciliação;
- concluir uma etapa sem rollback, documentação e operação assistida.

O repositório já utiliza etapas, fases, validadores, migrations append-only, testes SQL com `ROLLBACK`, documentação canônica, vacinas e gates de produção. O backlog do RH deve integrar-se a esse modelo, não criar uma governança paralela.

---

## 2. Decisão

O Projeto RH adotará a seguinte cadeia de responsabilidade:

```text
Objetivo do produto
  → épico
    → história ou enabler
      → tarefas e testes
        → implementação
          → evidências reproduzíveis
            → homologação técnica
              → aceite funcional
                → decisão de liberação
                  → operação assistida
```

Os seguintes conceitos serão separados:

1. roadmap;
2. épico;
3. história;
4. enabler técnico;
5. spike;
6. tarefa;
7. defeito;
8. risco;
9. dependência;
10. gate;
11. sprint lógica;
12. incremento executável;
13. evidência;
14. homologação técnica;
15. aceite funcional;
16. liberação;
17. publicação em produção;
18. estabilização.

---

## 3. Princípios

### 3.1 Planejamento não será evidência de entrega

Um item poderá estar:

- proposto;
- refinado;
- pronto;
- em execução;
- bloqueado;
- implementado;
- verificado;
- homologado;
- aceito;
- liberado;
- estabilizado;
- cancelado.

Somente a existência de um item, commit, migration ou tela não autoriza declarar a entrega concluída.

### 3.2 Sprints serão unidades lógicas, não promessas de data

Os identificadores `S00`, `S01`, `S02` e seguintes representam ordem e dependência.

Não representam automaticamente:

- semanas;
- quinzenas;
- meses;
- capacidade fixa;
- data de início;
- data de conclusão.

Datas somente poderão ser assumidas depois de conhecidos:

- equipe disponível;
- papéis e dedicação;
- calendário;
- capacidade histórica;
- dependências externas;
- ambientes;
- licenças e fornecedores;
- riscos jurídicos e operacionais.

### 3.3 O backlog será rastreável

Cada item executável deverá referenciar, conforme aplicável:

- módulo funcional;
- ADR;
- requisito funcional;
- regra de negócio;
- critério de aceite funcional;
- requisito técnico;
- regra técnica;
- critério de aceite técnico;
- risco;
- migration;
- teste;
- evidência;
- gate.

### 3.4 O backlog será um grafo acíclico

Dependências serão registradas como arestas direcionadas.

Uma história não será marcada como pronta quando depender de item:

- não concluído;
- não homologado quando a homologação for pré-condição;
- com contrato instável;
- com risco crítico não tratado;
- com ambiente indisponível.

Ciclos deverão ser resolvidos por decomposição, contrato intermediário, spike ou redefinição de ownership.

### 3.5 Cada sprint entregará um incremento vertical quando possível

Uma sprint lógica deverá combinar, conforme o escopo:

- migration;
- RLS e grants;
- RPC ou contrato;
- código de domínio;
- Server Action ou Route Handler;
- interface mínima;
- auditoria;
- testes;
- documentação;
- evidência de homologação.

Sprints exclusivamente horizontais serão permitidas para fundações, migrations, segurança, infraestrutura, backfills e spikes tecnicamente necessários.

### 3.6 O Sprint 00 será obrigatório

Nenhuma implementação do RH começará antes de:

- reconciliar a branch com a `main`;
- resolver ou isolar conflitos de merge;
- restaurar CI estrutural confiável;
- investigar a divergência de numeração das vacinas;
- confirmar ledger de migrations;
- atualizar inventário da base;
- confirmar ambiente de homologação;
- registrar baseline de testes;
- definir responsáveis e capacidade;
- aprovar o backlog inicial.

O Sprint 00 não implementará domínio funcional do RH.

### 3.7 Definition of Ready será obrigatória

Uma história somente poderá entrar em execução quando possuir:

- objetivo e valor;
- escopo e não escopo;
- contexto proprietário;
- atores e permissões;
- estados e transições;
- critérios de aceite verificáveis;
- dependências conhecidas;
- dados de entrada e saída;
- estratégia de migration quando aplicável;
- impacto de segurança e privacidade;
- estratégia de testes;
- evidência esperada;
- rollback ou reversibilidade;
- tamanho suficientemente pequeno.

### 3.8 Definition of Done será multidimensional

“Done” exigirá, quando aplicável:

- código revisado;
- migration append-only;
- ledger válido;
- RLS e grants testados;
- nenhuma execução operacional para `anon`;
- contratos e schemas tipados;
- testes unitários;
- testes SQL com `ROLLBACK`;
- testes de integração;
- testes concorrentes para invariantes críticas;
- testes negativos de autorização;
- acessibilidade;
- observabilidade e sanitização;
- documentação e inventário atualizados;
- vacina criada para falha relevante;
- CI verde;
- homologação reproduzível;
- cleanup aprovado;
- evidência preservada;
- aceite funcional;
- plano de rollback.

Itens de produção exigirão também operação assistida e critérios de estabilização.

### 3.9 Implementado, homologado e liberado serão estados distintos

- **Implementado:** código e migrations existem na branch.
- **Verificado:** testes automatizados e revisão técnica passaram.
- **Homologado:** comportamento foi executado em ambiente apropriado com evidência.
- **Aceito:** responsável funcional aprovou o resultado.
- **Liberado:** feature flag, módulo e permissões autorizam uso no ambiente definido.
- **Publicado:** usuários reais podem acessar em produção.
- **Estabilizado:** período de operação assistida cumpriu SLOs e não possui incidentes críticos abertos.

### 3.10 Homologação usará dados artificiais

Dados pessoais reais não serão necessários para provar comportamento.

Fixtures deverão:

- ser artificiais;
- ser identificáveis como teste;
- respeitar o tenant;
- possuir criação idempotente;
- permitir cleanup;
- não usar documentos reais;
- não expor segredos;
- terminar com `ROLLBACK` quando o tipo de teste permitir.

### 3.11 Folha terá gates adicionais

Folha oficial somente poderá avançar após:

1. catálogo, parâmetros e fórmulas aprovados;
2. testes unitários de cálculo;
3. testes de propriedades e arredondamento;
4. execução sombra por competências representativas;
5. reconciliação por trabalhador e rubrica;
6. tolerâncias aprovadas;
7. investigação de divergências;
8. homologação funcional;
9. plano de contingência;
10. dupla aprovação para fechamento e pagamento.

### 3.12 Obrigações digitais terão produção restrita

Transmissões governamentais somente poderão ser habilitadas após:

- produção restrita ou ambiente equivalente aprovado;
- certificado e procuração validados;
- payload versionado;
- idempotência;
- retry e reconciliação;
- estado incerto;
- retificação e exclusão testadas;
- trilha de recibos;
- segregação de funções;
- runbook de indisponibilidade.

### 3.13 Analytics não bloqueará o núcleo transacional

Relatórios e People Analytics poderão começar após fontes mínimas estabilizadas, mas:

- não atrasarão a correção de fatos canônicos;
- não serão usados como substitutos de reconciliação operacional;
- não receberão dados clínicos brutos;
- não liberarão modelos de alto risco antes da governança definida.

### 3.14 Estimativas serão relativas e calibradas

Antes de existir histórico da equipe, os itens poderão usar:

- `XS`;
- `S`;
- `M`;
- `L`;
- `XL`.

Itens `XL` deverão ser divididos antes da execução, salvo spike explicitamente limitado.

Story points ou previsões de calendário somente serão adotados após calibração com dados observados.

### 3.15 Trabalho não planejado será explícito

Defeitos, incidentes, dívida técnica e mudanças regulatórias terão itens próprios.

Não serão escondidos como subtarefas de histórias concluídas.

### 3.16 Mudanças regulatórias poderão interromper a sequência

Alterações legais, de leiaute, segurança ou fornecedor poderão criar gate emergencial.

A priorização será revista com impacto, evidência e decisão registrada, sem reescrever silenciosamente o histórico do plano.

### 3.17 Nenhum gate será autodeclarado

O responsável por implementar não será o único responsável por aprovar gates críticos.

Gates poderão exigir representantes de:

- engenharia;
- produto/RH;
- segurança;
- privacidade;
- folha;
- contabilidade;
- jurídico/compliance;
- operação;
- infraestrutura.

### 3.18 O PR documental não autoriza implementação

A aprovação desta ADR e do Módulo 14 não cria automaticamente:

- issues;
- milestones;
- migrations;
- branches de implementação;
- ambientes;
- prazos;
- contratos com fornecedores;
- publicação.

A implementação somente começará após o Gate G00.

---

## 4. Tipos de item

### 4.1 Épico

Objetivo amplo que agrega incrementos verificáveis e possui gate de saída.

### 4.2 História

Comportamento observável por usuário ou integração, com critérios de aceite.

### 4.3 Enabler

Capacidade técnica necessária para histórias, como schema, RLS, outbox, worker ou observabilidade.

### 4.4 Spike

Investigação limitada por pergunta, escopo e artefato de decisão. Spike não produz funcionalidade pronta por padrão.

### 4.5 Tarefa

Unidade operacional necessária para concluir uma história ou enabler.

### 4.6 Defeito

Comportamento divergente de requisito ou evidência aprovada.

### 4.7 Risco

Condição incerta com probabilidade, impacto, responsável, mitigação e gatilho.

### 4.8 Gate

Decisão formal que autoriza ou bloqueia a próxima onda.

---

## 5. Estados do item

```text
PROPOSED
  → REFINING
  → READY
  → IN_PROGRESS
  → IMPLEMENTED
  → VERIFIED
  → HOMOLOGATED
  → ACCEPTED
  → RELEASED
  → STABILIZED
```

Estados laterais:

- `BLOCKED`;
- `ON_HOLD`;
- `REJECTED`;
- `CANCELLED`;
- `SUPERSEDED`;
- `ROLLED_BACK`.

Uma mudança de estado deverá registrar ator, instante, evidência e justificativa quando aplicável.

---

## 6. Gates principais

- **G00 — Base confiável:** mergeabilidade, CI, vacinas, ledger, inventário e ambientes reconciliados.
- **G01 — Fundação segura:** módulo, capacidades, schemas, RLS, auditoria e outbox homologados.
- **G02 — Cadastro canônico:** pessoa, trabalhador, empresa, estabelecimento e estrutura reconciliados.
- **G03 — Ciclo contratual:** admissão e contratos homologados.
- **G04 — Operação trabalhista:** jornada, férias, afastamentos, benefícios e SST homologados.
- **G05 — Folha sombra:** motor, parâmetros e reconciliação sombra aprovados.
- **G06 — Obrigações restritas:** eventos externos homologados em ambiente controlado.
- **G07 — Folha oficial controlada:** fechamento, pagamento e contabilização aprovados para piloto.
- **G08 — Encerramento e analytics:** desligamentos e relatórios essenciais homologados.
- **G09 — Produção:** segurança, carga, backup, rollback, operação e aceite final aprovados.
- **G10 — Estabilização:** SLOs atendidos e incidentes críticos encerrados.

---

## 7. Evidências mínimas

Cada incremento deverá produzir, conforme aplicável:

- commit e diff;
- migration e ledger;
- inventário de tabelas, funções, policies e índices;
- relatório de testes;
- teste SQL reproduzível;
- teste de autorização negativa;
- teste concorrente;
- screenshots ou vídeo de fluxo, sem dados reais;
- payloads sanitizados;
- relatório de reconciliação;
- resultado de acessibilidade;
- resultado de carga;
- relatório de backup e restauração;
- artifact do workflow;
- checklist de homologação;
- decisão de gate;
- runbook;
- vacina quando houver falha relevante.

---

## 8. Consequências positivas

- sequência executável e auditável;
- menor risco de construir sobre base divergente;
- dependências explícitas;
- separação entre plano e entrega;
- redução de declarações prematuras de conclusão;
- melhor controle de migrations e backfills;
- homologação reproduzível;
- folha e integrações protegidas por gates adicionais;
- estimativas honestas;
- rollout gradual e reversível;
- evidências consistentes com a governança existente.

---

## 9. Custos aceitos

- maior esforço de refinamento;
- mais documentos e evidências;
- gates multidisciplinares;
- necessidade de fixtures e cleanup;
- execução sombra;
- homologação por onda;
- manutenção do grafo de dependências;
- disciplina para não avançar com CI inválido.

Esses custos são aceitos porque o RH processará dados sensíveis, pagamentos, obrigações e decisões com impacto humano e financeiro significativo.

---

## 10. Alternativas rejeitadas

### 10.1 Implementar os módulos na ordem numérica sem analisar dependências

Rejeitada porque integrações, dados canônicos e segurança atravessam vários módulos.

### 10.2 Criar todas as tabelas em uma única migration

Rejeitada por ampliar risco, dificultar rollback, revisão, homologação e reconciliação.

### 10.3 Desenvolver todas as telas antes do domínio

Rejeitada porque produziria fluxos sem invariantes, segurança ou estado canônico.

### 10.4 Liberar folha após poucos exemplos manuais

Rejeitada porque não prova precisão, retroatividade, arredondamento, concorrência ou reconciliação.

### 10.5 Usar datas arbitrárias para o roadmap

Rejeitada porque não existe base suficiente de equipe e velocidade.

### 10.6 Considerar merge como conclusão

Rejeitada porque merge não prova migration aplicada, homologação, liberação ou estabilização.

---

## 11. Regra final

O backlog executável será tratado como contrato versionado de intenção, dependência e evidência. Nenhuma história será iniciada sem Definition of Ready, nenhuma será concluída sem Definition of Done, e nenhuma onda crítica avançará sem decisão formal de gate.
