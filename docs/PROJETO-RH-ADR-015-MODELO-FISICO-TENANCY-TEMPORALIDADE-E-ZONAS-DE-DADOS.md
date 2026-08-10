# Projeto RH — ADR-015 — Modelo Físico, Tenancy, Temporalidade e Zonas de Dados

**Estado:** decisão de dados registrada; migrations não iniciadas  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**Módulo relacionado:** `PROJETO-RH-MODULO-15-DESIGN-DE-DADOS-CATALOGO-RLS-E-MIGRATIONS.md`

---

## 1. Contexto

Os módulos 01 a 12 definiram os domínios funcionais. O Módulo 13 estabeleceu monólito modular, bounded contexts, PostgreSQL/Supabase, RLS, RPCs, outbox e migrations append-only. O Módulo 14 transformou essas definições em backlog, gates e sprints lógicas.

Antes de qualquer migration do RH é necessário decidir como os conceitos serão representados fisicamente sem repetir problemas comuns em bancos multi-tenant:

- tabelas com `organization_id`, mas FKs simples que permitem relacionar registros de organizações diferentes;
- edição destrutiva de condições históricas;
- uso de `status` como substituto de eventos, aprovações ou fatos temporais;
- exclusão em cascata de registros trabalhistas ou financeiros que precisam permanecer auditáveis;
- políticas RLS baseadas apenas na presença de `organization_id`;
- dados clínicos, judiciais ou payloads governamentais expostos pela Data API;
- JSONB usado para evitar modelagem de campos críticos;
- enums de banco usados para códigos legais ou externos que mudam com frequência;
- valores monetários em ponto flutuante;
- datas de vigência confundidas com timestamps de criação;
- documentos armazenados sem hash, versão, classificação ou retenção;
- jobs e integrações tratados como colunas de status dentro de tabelas de negócio;
- tabelas compartilhadas por vários contextos sem proprietário definido;
- views que contornam RLS ou perdem a linhagem da fonte;
- migrations grandes, irreversíveis ou com backfill bloqueante.

O desenho precisa ser compatível com a arquitetura existente da Innovar Platform, que utiliza UUID, `organization_id`, PostgreSQL, RLS, RPCs transacionais, views `security_invoker`, Storage privado, migrations timestampadas e validação por CI.

---

## 2. Decisão

O modelo físico do Projeto RH adotará:

```text
public
  → entidades e fatos de negócio acessíveis pela aplicação sob RLS

rh_private
  → conteúdo clínico, judicial e pessoal de acesso excepcional

rh_ops
  → outbox, jobs, tentativas, payloads técnicos e reconciliação operacional

storage privado
  → bytes de documentos e arquivos, referenciados por metadados canônicos
```

A decisão central é:

> Toda relação interna multi-tenant deverá provar simultaneamente a identidade do registro e a organização proprietária.

Portanto, entidades tenant-scoped possuirão:

```sql
id uuid primary key,
organization_id uuid not null,
unique (organization_id, id)
```

E relações entre duas entidades tenant-scoped usarão, sempre que tecnicamente aplicável:

```sql
foreign key (organization_id, parent_id)
  references ... (organization_id, id)
```

A presença de `organization_id` em duas tabelas não será considerada proteção suficiente.

---

## 3. Zonas de dados

### 3.1 Schema `public`

Conterá entidades de negócio que precisam ser consultadas pela aplicação autenticada sob RLS, incluindo:

- pessoas e trabalhadores;
- empresas, estabelecimentos e estrutura;
- vínculos e contratos;
- jornadas, férias, afastamentos e benefícios;
- registros operacionais de SST sem conteúdo clínico;
- folha, rubricas e resultados autorizados;
- casos de desligamento;
- métricas e relatórios agregados permitidos.

O schema `public` não será sinônimo de dado público. Todas as tabelas tenant-scoped terão RLS habilitada e, quando aplicável, `FORCE ROW LEVEL SECURITY`.

### 3.2 Schema `rh_private`

Não será exposto à Data API para usuários comuns. Conterá, conforme necessidade confirmada:

- prontuários e anotações clínicas;
- resultados detalhados de exames;
- diagnósticos e documentos médicos protegidos;
- ordens judiciais e conteúdo integral de processos;
- dados bancários completos quando não puderem ser tokenizados;
- identificadores governamentais brutos de risco elevado;
- payloads descriptografados temporários, quando indispensáveis;
- chaves de envelope e referências criptográficas, nunca segredos em claro.

O acesso ocorrerá por funções restritas, com finalidade, capacidade, auditoria e retorno minimizado.

### 3.3 Schema `rh_ops`

Não será exposto diretamente à interface de negócio. Conterá:

- outbox;
- jobs;
- leases;
- tentativas;
- dead-letter;
- inbox de webhooks;
- payloads técnicos versionados;
- respostas externas brutas;
- checkpoints de backfill;
- reconciliações operacionais;
- métricas técnicas.

A aplicação consumirá projeções ou RPCs, não fará CRUD direto nessas tabelas.

### 3.4 Storage

Os bytes ficarão em buckets privados por classificação e finalidade. O banco manterá:

- organização;
- entidade proprietária;
- versão;
- nome original e nome normalizado;
- MIME declarado e detectado;
- tamanho;
- hash SHA-256;
- caminho;
- classificação;
- estado de quarentena e varredura;
- retenção;
- legal hold;
- origem;
- autor;
- timestamps.

O caminho de Storage não será autoridade suficiente para autorização.

---

## 4. Convenções de nomes

### 4.1 Tabelas

- prefixo `rh_` no schema `public`;
- plural em inglês técnico já compatível com o repositório;
- nomes de ligação explícitos, não abreviações opacas;
- tabelas de versão com sufixo `_versions`;
- movimentos com `_movements`;
- eventos com `_events`;
- tentativas com `_attempts`;
- linhas de cálculo com `_lines`;
- snapshots com `_snapshots`;
- documentos com `_documents` e `_document_versions`;
- relações N:N com os dois conceitos no nome.

### 4.2 Chaves

- PK: `id` UUID;
- FK: `<entity>_id`;
- tenant: `organization_id`;
- ator autenticado: `created_by`, `updated_by`, `approved_by`, `decided_by`;
- correlação: `correlation_id` UUID;
- idempotência: `idempotency_key` text;
- versão otimista: `row_version` bigint;
- versão funcional: `version_number` integer.

### 4.3 Constraints e índices

- PK: `<table>_pkey`;
- FK: `<table>_<column>_fkey`;
- unique: `<table>_<purpose>_key` ou `_uidx`;
- check: `<table>_<rule>_check`;
- índice: `<table>_<query>_idx`;
- policy: `<table>_<operation>_<scope>`;
- function: verbo + domínio, sem sobrecarga ambígua.

---

## 5. Tipos de dados

### 5.1 Identificadores

UUID será o padrão. Códigos humanos terão coluna separada e unicidade por organização ou empresa conforme domínio.

### 5.2 Dinheiro

Valores monetários usarão `numeric(18,2)` por padrão. Bases ou fatores que exigem maior precisão usarão `numeric(20,8)` ou precisão explicitamente justificada.

`real`, `double precision` e `money` não serão usados em cálculo de folha, encargos, benefícios ou rescisões.

### 5.3 Quantidades e horas

- minutos: integer ou bigint quando a unidade inteira for suficiente;
- duração de trabalho: minutos canônicos, com apresentação em horas;
- percentuais: numeric com escala explícita;
- quantidades de obra: precisão definida pelo contexto;
- timestamps: `timestamptz`;
- datas civis e competências: `date` ou domínio específico.

### 5.4 Competência

Competência mensal será armazenada como primeiro dia do mês em `date`, com check de dia igual a 1, ou domínio equivalente validado. Texto `MM/YYYY` não será fonte canônica.

### 5.5 CPF, CNPJ e documentos

Quando armazenados:

- forma normalizada somente com dígitos;
- validação estrutural no domínio/aplicação;
- hash separado para busca ou deduplicação quando adequado;
- criptografia de coluna para conteúdo de maior risco;
- mascaramento nas projeções;
- unicidade condicionada por regras de negócio e histórico.

Não se presumirá que todo identificador é globalmente único ao longo de toda a história sem análise jurídica e operacional.

### 5.6 JSONB

JSONB será aceito para:

- snapshots imutáveis;
- metadados extensíveis;
- payloads de integração;
- resultados técnicos;
- schemas versionados;
- detalhes de auditoria sanitizados.

JSONB não substituirá campos usados em:

- FKs;
- filtros frequentes;
- constraints críticas;
- valores monetários;
- estados;
- vigência;
- autorização;
- reconciliação.

---

## 6. Temporalidade

### 6.1 Quatro tempos

Quando aplicável, o modelo distinguirá:

- `effective_from` / `effective_to`: vigência no mundo do negócio;
- `occurred_at`: momento do fato;
- `recorded_at` ou `created_at`: registro no sistema;
- `processed_at`: processamento técnico.

### 6.2 Intervalos

Intervalos de vigência seguirão a convenção semiaberta:

```text
[effective_from, effective_to)
```

Ou seja, início inclusivo e fim exclusivo. Quando a interface trabalhar com “último dia”, a conversão será explícita.

### 6.3 Sobreposição

Condições que não podem coexistir usarão exclusion constraints, índices parciais ou RPCs transacionais. Exemplos:

- uma versão contratual efetiva por instante;
- uma lotação principal por vínculo e instante;
- um ocupante por posição quando a posição não admite compartilhamento;
- uma política ativa por chave e vigência;
- um fechamento vigente por competência e tipo.

### 6.4 Histórico

Registros usados por fatos posteriores não serão apagados. Serão encerrados, arquivados, substituídos ou compensados.

---

## 7. Estados, eventos e versões

### 7.1 Estado atual

A entidade poderá manter `status` para consulta operacional, desde que:

- transições ocorram por comando controlado;
- evento correspondente seja registrado;
- aprovação e evidência não sejam comprimidas no status;
- estados finais não sejam alterados por CRUD genérico.

### 7.2 Versionamento

Entidades versionadas terão:

- raiz estável;
- tabela de versões;
- `version_number` crescente;
- vigência;
- autor e motivo;
- hash de conteúdo quando relevante;
- referência à versão anterior;
- estado de aprovação;
- imutabilidade após aprovação ou uso.

### 7.3 Razões e movimentos

Saldos de férias, banco de horas, descontos pendentes e outros valores acumulativos serão derivados de movimentos. Não haverá edição direta do saldo sem movimento compensatório.

---

## 8. Tenancy e integridade referencial

### 8.1 Regra composta

Toda entidade tenant-scoped terá `unique (organization_id, id)`. FKs internas usarão a dupla sempre que ambas as tabelas forem tenant-scoped.

### 8.2 Entidades globais

Catálogos oficiais globais poderão não ter `organization_id`, mas deverão ser:

- somente leitura para usuários comuns;
- versionados por fonte e vigência;
- separados de configurações específicas da organização;
- referenciados por FK estável.

### 8.3 Empresa e estabelecimento

`organization_id` representa o tenant. `legal_entity_id` representa a empresa empregadora. `establishment_id` representa o estabelecimento.

Esses conceitos não serão substituídos uns pelos outros nas chaves.

### 8.4 Delete actions

- `CASCADE`: somente para filhos sem significado autônomo e ainda não usados como evidência;
- `RESTRICT`: contratos, versões, cálculos, eventos, pagamentos, recibos e históricos;
- `SET NULL`: referência contextual opcional cuja remoção não destrói o fato;
- exclusão lógica ou encerramento: entidades históricas.

`ON DELETE CASCADE` a partir de `organizations` não será aplicado cegamente a registros sujeitos a retenção ou legal hold. A estratégia de encerramento de tenant deverá ser definida antes da produção.

---

## 9. RLS e autorização

### 9.1 Default deny

Para tabelas expostas:

- habilitar RLS;
- aplicar `FORCE ROW LEVEL SECURITY` quando compatível com operações internas;
- revogar privilégios não necessários;
- criar policies por operação;
- negar `anon` por padrão;
- evitar policy única `FOR ALL` em dados críticos.

### 9.2 Camadas

Uma policy poderá considerar:

```text
organization_id
  + module capability
  + domain capability
  + project/establishment scope
  + sensitivity
  + purpose
  + relationship to worker
```

### 9.3 Dados do próprio trabalhador

Acesso self-service não será concedido por uma policy ampla sobre tabelas internas. Serão preferidas:

- views minimizadas;
- RPCs específicas;
- projeções próprias do portal;
- colunas explicitamente permitidas.

### 9.4 Funções `SECURITY DEFINER`

Toda função terá:

- `set search_path` explícito;
- validação de organização e capacidade;
- parâmetros tipados;
- locks quando necessário;
- grants mínimos;
- revogação de `public` e `anon`;
- auditoria;
- testes negativos;
- retorno minimizado.

O papel privilegiado não substituirá a autorização de domínio.

### 9.5 Views

Views expostas usarão `security_invoker=true`. Views materializadas não serão expostas sem uma camada de autorização compatível.

---

## 10. Criptografia e segredos

- segredos não ficarão em tabelas de negócio;
- senhas de certificado não serão persistidas em claro;
- tokens externos serão mantidos em secrets manager;
- dados de coluna criptografados usarão gestão de chaves separada;
- hashes não serão tratados como anonimização automática;
- logs não conterão dados clínicos, bancários, documentos ou payloads completos;
- rotação de chave não reescreverá fatos sem trilha.

---

## 11. Índices

Índices serão derivados de consultas e constraints, não adicionados indiscriminadamente.

Padrões recorrentes:

- `(organization_id, status, updated_at desc)`;
- `(organization_id, worker_id, effective_from desc)`;
- `(organization_id, employment_id, competence_date)`;
- índices parciais para registros ativos ou pendentes;
- índices únicos parciais para uma condição atual;
- GiST para intervalos quando necessário;
- índices líderes em todas as FKs relevantes;
- índice em `correlation_id` e idempotency keys;
- GIN somente para JSONB e arrays com consulta comprovada.

Dados sensíveis não serão indexados em texto claro sem avaliação específica.

---

## 12. Particionamento

Não será aplicado preventivamente a todas as tabelas.

Candidatos futuros:

- marcações de ponto;
- eventos de auditoria;
- outbox e jobs concluídos;
- linhas de cálculo de folha;
- payloads e retornos externos;
- observações analíticas.

Particionamento dependerá de volumetria, plano de retenção, consultas, vacuum, backup e testes. O design manterá chaves compatíveis, mas não declarará necessidade sem evidência.

---

## 13. Ordem de migrations

As migrations serão divididas por responsabilidade:

```text
00 — saneamento e pré-condições
01 — schemas, extensions e helpers
02 — módulo, capabilities e feature flags
03 — pessoas, trabalhadores e empresas
04 — estrutura organizacional
05 — vínculos, contratos e admissão
06 — jornada e movimentos
07 — férias e afastamentos
08 — benefícios e relações
09 — SST operacional
10 — dados privados de saúde e judiciais
11 — folha, rubricas e parâmetros
12 — obrigações e integrações
13 — desligamentos e offboarding
14 — analytics e planejamento
15 — Storage e documentos
16 — outbox, jobs e observabilidade
17 — views e projeções
18 — RLS, grants e hardening
19 — backfills e reconciliação
20 — validações e testes de homologação
```

A numeração acima representa ordem lógica. Timestamps reais somente serão reservados após o Gate G00 e verificação do ledger.

---

## 14. Backfills

Cada backfill terá:

- inventário de origem;
- regra de transformação;
- dry-run;
- contagens por tenant;
- hash ou totais de reconciliação;
- tratamento de ambiguidades;
- checkpoint;
- lotes;
- idempotência;
- retomada;
- log sanitizado;
- rollback lógico ou tabela de mapeamento;
- relatório de exceções.

Nome semelhante, e-mail semelhante ou telefone semelhante não serão suficientes para fundir pessoas automaticamente.

---

## 15. Alternativas rejeitadas

### 15.1 Todas as tabelas somente no schema `public`

Rejeitada porque aumenta a superfície da Data API e mistura conteúdo clínico, judicial e operacional técnico com dados comuns.

### 15.2 Um schema por bounded context

Rejeitada nesta fase por aumentar complexidade de PostgREST, grants, tooling e migrations antes de existir necessidade operacional. Prefixos e ownership documentado serão suficientes para os dados de negócio; schemas separados serão usados apenas por zona de exposição.

### 15.3 FKs simples com RLS como única proteção multi-tenant

Rejeitada porque RLS controla acesso, mas não impede necessariamente inconsistência persistida por função privilegiada, migration ou bug interno.

### 15.4 JSONB para todo o RH

Rejeitada por impedir constraints, joins confiáveis, qualidade, lineage e desempenho previsível.

### 15.5 Soft delete universal

Rejeitada porque nem toda entidade deve ser apagável e um campo `deleted_at` não substitui encerramento, revogação, arquivamento ou compensação.

### 15.6 Enum de banco para todos os códigos legais

Rejeitada porque códigos externos e legais mudam e exigem catálogo versionado. Enums ficam restritos a estados internos estáveis.

### 15.7 Migration única do RH

Rejeitada por risco de lock, rollback difícil, revisão impossível e falta de gates intermediários.

---

## 16. Consequências positivas

- integridade multi-tenant no banco;
- temporalidade reproduzível;
- histórico imutável quando necessário;
- menor exposição de dados sensíveis;
- RLS mais verificável;
- migrations menores e auditáveis;
- backfills reconciliáveis;
- possibilidade de evolução por expand/contract;
- isolamento entre fatos, operações técnicas e arquivos;
- suporte a cálculo sombra e integrações idempotentes.

---

## 17. Custos aceitos

- mais constraints compostas;
- FKs e índices adicionais;
- maior disciplina no cadastro de versões;
- RPCs para transições críticas;
- schemas privados e grants específicos;
- catálogos de dados e ownership;
- scripts de backfill e reconciliação;
- revisão de performance por onda;
- testes RLS e concorrentes mais extensos.

---

## 18. Regra de implementação

Esta ADR não cria schemas, tabelas, tipos, policies, buckets ou migrations.

Nenhum SQL do RH será escrito para aplicação antes de:

1. concluir o Gate G00;
2. reconciliar a branch e o ledger;
3. aprovar o catálogo físico;
4. revisar dados legados;
5. validar a matriz de RLS;
6. definir owners funcionais e técnicos;
7. dividir migrations por onda;
8. preparar testes e rollback.

---

## 19. Decisão final

O Projeto RH adotará um modelo físico relacional e temporal, com integridade multi-tenant composta, zonas de exposição distintas, dados críticos normalizados, snapshots controlados, RLS default deny, operações críticas por RPC e migrations progressivas com backfill e reconciliação obrigatórios.
