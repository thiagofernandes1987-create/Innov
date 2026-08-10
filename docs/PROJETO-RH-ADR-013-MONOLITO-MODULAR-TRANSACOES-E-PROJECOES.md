# Projeto RH — ADR-013 — Monólito Modular, Transações, Eventos e Projeções

**Estado:** decisão técnica registrada; implementação pendente  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**Módulo relacionado:** `PROJETO-RH-MODULO-13-ARQUITETURA-TECNICA-DADOS-APIS-SEGURANCA-E-ROADMAP.md`

---

## 1. Contexto

Os módulos funcionais 01 a 12 definiram as fronteiras do Projeto RH. A plataforma existente adota:

- Next.js 16 com App Router;
- React 19;
- TypeScript estrito;
- Supabase Auth;
- PostgreSQL;
- Row Level Security;
- RPCs transacionais;
- Storage privado;
- Server Components e Server Actions;
- Route Handlers;
- workers Node especializados;
- migrations append-only;
- testes Vitest, Playwright e SQL reproduzíveis;
- autorização por módulo, capacidade e escopo;
- auditoria e observabilidade transversais.

O RH possui operações de alta criticidade, temporalidade e sensibilidade. Exemplos:

- ativar vínculo;
- aplicar alteração contratual;
- fechar ponto;
- conceder férias;
- emitir ASO;
- fechar folha;
- transmitir evento governamental;
- encerrar vínculo;
- publicar indicador sensível.

Essas operações não podem ser implementadas como atualizações independentes de telas ou como chamadas sem coordenação entre tabelas.

---

## 2. Decisão

O Projeto RH será implementado como **bounded contexts dentro do monólito modular existente**, mantendo PostgreSQL como sistema transacional canônico.

```text
Interface Next.js
  → comandos e consultas tipados
    → autorização e validação
      → RPC ou transação de domínio
        → tabelas canônicas e razões imutáveis
          → eventos de domínio/outbox
            → workers e integrações
              → projeções de leitura e analytics
```

Não será adotada arquitetura de microserviços nesta fase.

---

## 3. Fronteiras técnicas

### 3.1 Bounded contexts iniciais

1. `rh_core` — pessoa, trabalhador, vínculo e identificadores;
2. `rh_org` — empresa, estabelecimento, estrutura, posição e lotação;
3. `rh_admission` — pré-admissão e ativação;
4. `rh_contracts` — contratos, versões e alterações;
5. `rh_time` — jornadas, escalas, marcações, apuração e banco;
6. `rh_leave` — férias, ausências, afastamentos e retorno;
7. `rh_benefits` — benefícios, dependentes, pensões e descontos;
8. `rh_sst` — riscos, exposições, exames, ASO, CAT, EPI e habilitações;
9. `rh_payroll` — rubricas, parâmetros, cálculo e fechamento;
10. `rh_compliance` — obrigações digitais e reconciliação;
11. `rh_offboarding` — desligamentos, rescisões e encerramento;
12. `rh_analytics` — métricas, observações e planejamento.

Esses nomes representam fronteiras lógicas. A adoção de schemas físicos separados deverá ser avaliada por exposição, privilégio, operação e custo de manutenção.

### 3.2 Regra de dependência

- contextos não gravarão diretamente em tabelas internas de outro contexto;
- leitura síncrona poderá ocorrer por contrato estável, view ou função autorizada;
- mutação cruzada ocorrerá por comando, RPC ou evento explícito;
- dependências serão acíclicas onde possível;
- integrações inevitavelmente bidirecionais usarão eventos e reconciliação, não atualização circular.

---

## 4. Estrutura no repositório

Estrutura alvo indicativa:

```text
app/
  app/recursos-humanos/
  actions/rh/
  api/rh/

components/
  rh/

lib/
  rh/
    core/
    org/
    admission/
    contracts/
    time/
    leave/
    benefits/
    sst/
    payroll/
    compliance/
    offboarding/
    analytics/
    shared/

scripts/
  rh/

supabase/
  migrations/
  tests/

workers/
  rh/
```

Cada contexto deverá conter:

- tipos de domínio;
- schemas Zod;
- comandos;
- consultas;
- mapeadores;
- políticas de autorização;
- contratos de eventos;
- erros públicos sanitizados;
- testes.

---

## 5. Server Components, Server Actions e Route Handlers

### 5.1 Server Components

Serão padrão para:

- páginas de leitura;
- composição de dados autorizados;
- carregamento inicial;
- proteção contra exposição de segredos;
- redução de JavaScript no cliente.

### 5.2 Server Actions

Serão usadas para comandos originados pela interface autenticada quando:

- a ação estiver ligada a formulário ou interação interna;
- não houver necessidade de contrato HTTP público;
- a validação e a autorização ocorrerem no servidor;
- o comando for idempotente ou possuir chave de idempotência;
- a mutação delegar a invariantes transacionais do banco quando necessário.

Server Action não será considerada fronteira de segurança por si só.

### 5.3 Route Handlers

Serão usados para:

- webhooks;
- callbacks governamentais ou de provedores;
- downloads autenticados;
- APIs de integração explícitas;
- health checks controlados;
- polling técnico;
- endpoints com assinatura, método e status HTTP próprios.

Não será criada duplicidade entre Server Action e Route Handler para o mesmo comando sem justificativa.

---

## 6. Comandos, consultas, eventos e jobs

### 6.1 Comando

Representa intenção de alterar estado.

Deverá conter:

- `command_id`;
- `organization_id`;
- ator;
- contexto;
- payload validado;
- versão esperada quando aplicável;
- chave de idempotência;
- `correlation_id`;
- instante de recebimento.

### 6.2 Consulta

Não altera estado e deverá:

- respeitar RLS e escopo;
- selecionar somente campos necessários;
- usar paginação;
- evitar N+1;
- declarar consistência e instante de corte quando relevante;
- utilizar projeções de leitura para relatórios pesados.

### 6.3 Evento de domínio

Registra fato concluído, no passado, como:

- `worker_activated`;
- `contract_version_applied`;
- `time_period_closed`;
- `leave_case_approved`;
- `aso_issued`;
- `payroll_closed`;
- `external_event_accepted`;
- `employment_terminated`.

Evento não substituirá a tabela canônica nem a trilha específica do domínio.

### 6.4 Job

Representa trabalho assíncrono:

- geração de documentos;
- transmissão externa;
- polling;
- processamento em lote;
- recálculo controlado;
- publicação analítica;
- retenção;
- reconciliação.

Job terá estado, tentativas, lease, timeout, prioridade, próxima execução, erro sanitizado e resultado.

---

## 7. Transações e RPCs

RPC transacional será obrigatória para operações que:

- alteram múltiplas tabelas;
- aplicam máquina de estados;
- exigem locks;
- fecham período;
- postam movimentos em razão;
- congelam snapshots;
- consomem sequência;
- precisam garantir idempotência no banco;
- produzem evento e estado na mesma confirmação.

Toda função `SECURITY DEFINER` deverá:

- possuir `search_path` explícito;
- validar organização e autorização internamente;
- usar privilégios mínimos;
- rejeitar organização fornecida que não corresponda ao contexto autorizado;
- não retornar dados sensíveis além do necessário;
- não ser executável por `anon`;
- ter testes de abuso e concorrência.

---

## 8. Concorrência

A implementação usará, conforme o caso:

- constraints únicas;
- controle otimista por `version`;
- `SELECT ... FOR UPDATE`;
- advisory locks transacionais;
- `SKIP LOCKED` para filas;
- chaves idempotentes;
- serialização de fechamento por organização e período;
- detecção de conflito com retorno explícito.

Locks não serão usados para compensar falta de modelagem.

Chaves de lock deverão ser determinísticas e documentadas.

---

## 9. Modelo temporal

Entidades temporais poderão possuir:

- `valid_from`;
- `valid_to`;
- `recorded_at`;
- `recorded_by`;
- `version_number`;
- `supersedes_id`;
- `status`;
- `correction_reason`;
- `source_type`;
- `source_id`.

Regras:

- intervalos vigentes não poderão se sobrepor quando a exclusividade for requisito;
- estado atual será derivado por vigência e status;
- versão histórica não será atualizada para refletir regra futura;
- correção administrativa não apagará o conhecimento anterior;
- consultas deverão declarar se usam visão “como conhecida na época” ou “corrigida atualmente”.

---

## 10. Dados imutáveis e razões

Serão append-only ou reversíveis por movimento compensatório:

- marcações originais;
- razão de banco de horas;
- movimentos de férias;
- entregas e devoluções de EPI;
- execuções e linhas de folha;
- tentativas de transmissão;
- recibos;
- pagamentos e estornos;
- eventos de desligamento;
- observações analíticas publicadas;
- auditoria.

Um registro “imutável” poderá receber metadados de retenção, legal hold e classificação, sem alteração do fato principal.

---

## 11. Eventos e outbox

Operações transacionais relevantes gravarão o estado canônico e um evento de outbox na mesma transação.

```text
transação de domínio
  ├─ altera estado canônico
  ├─ grava trilha de domínio
  └─ grava outbox

worker
  → reivindica item
  → processa efeito externo
  → registra tentativa
  → conclui ou agenda retry
```

A entrega será pelo menos uma vez. Consumidores deverão ser idempotentes.

Não será assumido “exactly once” entre banco e serviços externos.

---

## 12. Projeções de leitura

Consultas complexas poderão usar:

- views;
- materialized views;
- tabelas de projeção;
- snapshots;
- agregações incrementais.

Projeção:

- não será fonte canônica;
- terá versão de contrato;
- informará freshness;
- poderá ser reconstruída;
- manterá reconciliação com fatos;
- não receberá mutação de usuário como atalho.

---

## 13. Schemas e exposição pela Data API

A decisão física deverá separar:

1. objetos acessíveis à aplicação autenticada via Data API e RLS;
2. objetos internos não expostos;
3. dados clínicos, judiciais ou altamente sensíveis;
4. tabelas técnicas de jobs, outbox e integrações.

Regras:

- grants e RLS serão configurados explicitamente;
- ausência de policy deverá produzir negação;
- objetos internos não dependerão apenas de convenção de nome;
- dados clínicos detalhados não serão consultáveis diretamente pelo cliente;
- acesso sensível ocorrerá por função ou serviço mínimo e auditado;
- owner e papéis com `BYPASSRLS` não serão usados em fluxo comum de usuário.

---

## 14. Autorização

O módulo `recursos-humanos` será incluído no registry com dependências explícitas.

A camada atual de capacidades genéricas será preservada para navegação e acesso básico, mas o RH exigirá capacidades de domínio em catálogo de banco, como:

- `rh.worker.read`;
- `rh.worker.manage`;
- `rh.contract.approve`;
- `rh.time.close`;
- `rh.medical.record`;
- `rh.aso.issue`;
- `rh.payroll.calculate`;
- `rh.payroll.approve`;
- `rh.payroll.close`;
- `rh.compliance.transmit`;
- `rh.termination.approve`;
- `rh.analytics.sensitive`.

A implementação não ampliará indefinidamente um union TypeScript global. Capacidades terão chaves estáveis, validação e tipos gerados ou verificados.

Autorização combinará:

- módulo;
- capacidade;
- organização;
- empresa;
- estabelecimento;
- obra;
- população;
- finalidade;
- nível de sensibilidade;
- separação de funções;
- MFA quando exigido.

---

## 15. Dados sensíveis

Classificação mínima:

- `PUBLIC`;
- `INTERNAL`;
- `CONFIDENTIAL`;
- `RESTRICTED_PERSONAL`;
- `RESTRICTED_FINANCIAL`;
- `RESTRICTED_MEDICAL`;
- `RESTRICTED_JUDICIAL`;
- `SECRET_TECHNICAL`.

Controles possíveis:

- coluna não selecionada por padrão;
- schema privado;
- função de leitura mínima;
- criptografia de campo quando justificada;
- pseudonimização;
- tokenização;
- mascaramento;
- auditoria de visualização;
- proibição em logs;
- retenção específica;
- legal hold;
- exportação controlada.

Criptografia de campo não substituirá controle de acesso e gestão de chaves.

---

## 16. Service Role e segredos

- chave privilegiada somente em ambiente servidor confiável;
- cliente privilegiado separado do cliente de sessão;
- uso limitado a jobs e operações técnicas justificadas;
- organização e finalidade validadas antes de qualquer acesso;
- nenhum valor em browser, log, erro ou documento;
- rotação e inventário de segredo;
- credencial distinta por serviço quando suportado;
- preferência por operação com identidade do usuário e RLS quando possível.

Service Role não será atalho para contornar modelagem de autorização.

---

## 17. Storage

Buckets do RH serão privados e separados por finalidade de risco quando necessário.

Caminho mínimo:

```text
organization_id/context/resource_id/document_id/version/file
```

Upload deverá validar:

- sessão;
- módulo;
- capacidade;
- organização;
- tipo de documento;
- MIME real;
- tamanho;
- hash;
- extensão;
- status do recurso;
- finalidade;
- duplicidade;
- malware quando o serviço estiver disponível.

Metadados canônicos ficarão no banco. Objeto no Storage não será o único registro do documento.

---

## 18. APIs externas

Cada integração terá adapter próprio:

- eSocial;
- FGTS Digital;
- DCTFWeb quando houver contrato técnico aplicável;
- bancos;
- fornecedores de benefícios;
- clínicas e laboratórios;
- assinatura;
- BI autorizado.

Adapter deverá separar:

- modelo interno;
- mapeamento de versão;
- serialização;
- autenticação;
- transporte;
- resposta bruta protegida;
- retorno normalizado;
- retry;
- idempotência;
- reconciliação.

Payload externo nunca será entidade canônica interna.

---

## 19. Observabilidade

Cada comando crítico terá:

- `correlation_id`;
- `request_id`;
- ator;
- organização;
- recurso;
- operação;
- resultado;
- duração;
- código de erro sanitizado;
- origem;
- versão do contrato.

A trilha de domínio continuará sendo fonte de investigação funcional. `audit_events` permanecerá transversal e não duplicará todos os detalhes do domínio.

Métricas técnicas mínimas:

- taxa de sucesso;
- latência;
- conflitos;
- retries;
- filas;
- idade do item mais antigo;
- rejeições externas;
- divergências;
- falhas de RLS;
- downloads sensíveis;
- jobs mortos;
- freshness de projeções.

---

## 20. Migrations

Migrations serão:

- append-only;
- pequenas;
- ordenadas;
- reproduzíveis;
- validadas pelo ledger;
- sem dependência de edição manual em produção;
- acompanhadas de teste SQL;
- com estratégia de rollback operacional, ainda que o rollback de schema seja por migration corretiva.

Uma onda de dados deverá separar:

1. criação aditiva;
2. índices e constraints não bloqueantes quando possível;
3. dual write controlado quando necessário;
4. backfill idempotente;
5. validação e reconciliação;
6. mudança de leitura;
7. bloqueio da rota antiga;
8. limpeza posterior autorizada.

---

## 21. Backfills

Backfill deverá possuir:

- identificador;
- versão;
- escopo;
- dry-run;
- checkpoint;
- lote;
- limite de carga;
- idempotência;
- registros processados, ignorados e falhos;
- reconciliação antes/depois;
- capacidade de retomada;
- plano de interrupção.

Backfill não usará timestamps ou usuários fictícios sem marcação explícita de migração.

---

## 22. Compatibilidade

Evolução de API e eventos seguirá:

- adição antes de remoção;
- consumidores tolerantes a campos extras;
- versão de payload;
- período de coexistência;
- telemetria de uso;
- remoção somente após evidência;
- contrato de erro estável.

---

## 23. Testes

Cada contexto exigirá:

- unitários de regras puras;
- contrato de schemas e eventos;
- integração com Supabase;
- SQL com `ROLLBACK`;
- RLS por perfil e escopo;
- concorrência;
- idempotência;
- migration replay;
- E2E de jornadas críticas;
- segurança e abuso;
- observabilidade;
- backup e restauração para dados críticos.

---

## 24. Ambientes

- desenvolvimento local;
- testes automatizados;
- homologação;
- produção restrita de integrações quando suportada;
- produção.

Dados pessoais reais não serão copiados livremente para desenvolvimento ou homologação.

Fixtures serão sintéticas, determinísticas e isoladas por organização.

---

## 25. Roadmap técnico de alto nível

### Onda 0 — Fundação e inventário

- corrigir baseline de CI fora do escopo do RH;
- inventariar tabelas, rotas, capacidades, módulos e integrações;
- congelar contratos existentes afetados;
- definir estratégia de nomenclatura e schemas.

### Onda 1 — Core e organização

- Módulos 01 e 02;
- registry;
- capacidades;
- RLS;
- pessoa, trabalhador, vínculo, empresa, estabelecimento e lotação.

### Onda 2 — Admissão e contratos

- Módulos 03 e 04;
- portal seguro;
- documentos;
- ativação e versionamento contratual.

### Onda 3 — Jornada e ausências

- Módulos 05 e 06;
- marcações append-only;
- apuração;
- banco;
- férias e afastamentos.

### Onda 4 — Benefícios e SST

- Módulos 07 e 08;
- segregação médica;
- fornecedores;
- EPI e habilitações.

### Onda 5 — Folha

- Módulo 09;
- catálogo de rubricas;
- motor declarativo;
- cálculo sombra;
- fechamento controlado.

### Onda 6 — Obrigações digitais

- Módulo 10;
- outbox;
- adapters;
- produção restrita;
- reconciliação.

### Onda 7 — Desligamentos

- Módulo 11;
- cálculo rescisório;
- eventos;
- offboarding.

### Onda 8 — Analytics

- Módulo 12;
- catálogo de métricas;
- qualidade;
- projeções;
- cenários;
- modelos somente após governança.

### Onda 9 — Estabilização

- performance;
- retenção;
- DR;
- pentest;
- operação assistida;
- expansão gradual.

---

## 26. Alternativas rejeitadas

### 26.1 Microserviço por módulo desde o início

Rejeitado por aumentar transações distribuídas, operação, observabilidade, segredos, deploys e reconciliação antes de existir escala comprovada.

### 26.2 Lógica principal apenas no frontend

Rejeitada porque não protege invariantes nem concorrência.

### 26.3 Service Role em todas as operações

Rejeitado porque ignora RLS e amplia impacto de erro ou vazamento.

### 26.4 Trigger para toda regra

Rejeitado porque reduz clareza, testabilidade e controle de efeitos. Triggers serão reservados a invariantes centrais e trilhas técnicas apropriadas.

### 26.5 Atualizar tabelas de outro contexto diretamente

Rejeitado por acoplamento e corrupção de fronteiras.

### 26.6 Usar auditoria como barramento de eventos

Rejeitado porque auditoria e eventos de domínio possuem finalidades diferentes.

### 26.7 Prometer exactly once externo

Rejeitado porque transporte e serviços externos podem repetir, atrasar ou perder resposta. A arquitetura adotará idempotência e reconciliação.

---

## 27. Consequências

### Positivas

- alinhamento com a arquitetura existente;
- menor complexidade operacional;
- transações fortes no núcleo;
- evolução incremental;
- fronteiras explícitas;
- integração externa resiliente;
- dados sensíveis segregados;
- replay e auditoria;
- migrações reversíveis operacionalmente;
- possibilidade futura de extrair serviços com evidência real.

### Custos aceitos

- mais contratos e validações;
- disciplina temporal;
- catálogo de capacidades;
- jobs e outbox;
- testes de RLS e concorrência;
- backfills controlados;
- projeções e reconciliações;
- maior esforço inicial de segurança.

---

## 28. Regra de implementação

Esta ADR não autoriza migrations ou código de produção.

Antes da primeira migration deverão existir:

- inventário técnico validado;
- matriz de ownership de tabelas;
- mapa de dependências;
- modelo alvo da Onda 1;
- catálogo inicial de capacidades;
- matriz de RLS;
- plano de dados sensíveis;
- convenção de eventos e jobs;
- plano de testes;
- plano de backfill;
- critérios de rollback;
- CI estrutural confiável.

---

## 29. Decisão final

O Projeto RH será construído como extensão modular e transacional da Innovar Platform, usando Next.js e PostgreSQL/Supabase de forma coerente com a base existente. O banco protegerá invariantes, o servidor coordenará comandos, eventos e integrações, e as projeções permanecerão reconstruíveis e separadas da verdade canônica.
