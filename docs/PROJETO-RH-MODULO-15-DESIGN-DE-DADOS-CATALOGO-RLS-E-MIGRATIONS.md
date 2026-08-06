# Projeto RH — Módulo 15 — Design de Dados, Catálogo, Chaves, Constraints, RLS e Ordem de Migrations

**Versão:** 0.1.0  
**Estado:** design físico inicial concluído; migrations não iniciadas  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**ADR vinculante:** `PROJETO-RH-ADR-015-MODELO-FISICO-TENANCY-TEMPORALIDADE-E-ZONAS-DE-DADOS.md`  
**Anexo vinculante:** `PROJETO-RH-MODULO-15-ANEXO-A-CATALOGO-FISICO-DE-TABELAS.md`

---

## 1. Finalidade

Este módulo transforma os conceitos funcionais e a arquitetura técnica do Projeto RH em um desenho físico revisável para PostgreSQL/Supabase.

O documento define:

- zonas de dados;
- convenções de tabelas e colunas;
- entidades raízes, versões, eventos e razões;
- integridade multi-tenant;
- chaves primárias, estrangeiras e naturais;
- constraints temporais e financeiras;
- perfis de RLS;
- views e RPCs esperadas;
- documentos e Storage;
- índices;
- sequência lógica de migrations;
- backfills e reconciliações;
- requisitos, regras e critérios de aceite do banco.

Não contém SQL executável de implantação.

---

## 2. Resultado do design

```text
Conceito funcional
  → bounded context proprietário
    → entidade raiz ou fato
      → tabela e chaves
        → constraints e temporalidade
          → RLS e grants
            → comandos/RPCs
              → views e projeções
                → migration por onda
                  → backfill e reconciliação
```

O catálogo físico inicial contém **233 tabelas propostas**, distribuídas entre:

- entidades de negócio no schema `public` com prefixo `rh_`;
- conteúdo excepcional no schema `rh_private`;
- outbox, jobs, integrações e backfills no schema `rh_ops`.

Esse catálogo representa o estado-alvo completo. Cada onda criará somente as tabelas necessárias ao incremento autorizado pelo gate correspondente.

---

## 3. Compatibilidade com a plataforma existente

O design preserva as convenções observadas no repositório:

- UUID com `gen_random_uuid()`;
- `organization_id` como tenant;
- timestamps com timezone;
- RLS por organização e permissão de módulo;
- funções `SECURITY DEFINER` com `search_path` explícito;
- RPCs para invariantes multi-tabela;
- views `security_invoker=true`;
- Storage privado;
- migrations timestampadas e append-only;
- testes SQL transacionais;
- índices orientados às consultas.

O RH endurece essas convenções ao exigir integridade composta entre tenant e entidade. Em tabelas novas, uma FK simples para `parent_id` não será suficiente quando pai e filho forem tenant-scoped.

---

## 4. Zonas de dados

### 4.1 `public`

Dados de negócio acessíveis pela aplicação sob RLS:

- cadastro mestre;
- estrutura organizacional;
- vínculos e contratos;
- jornada e ausências;
- benefícios;
- SST operacional;
- folha autorizada;
- obrigações e desligamentos;
- analytics governado.

### 4.2 `rh_private`

Conteúdo não exposto pela Data API comum:

- prontuários;
- resultados clínicos;
- conteúdo judicial integral;
- dados pessoais e financeiros que exigem acesso excepcional;
- conteúdo cifrado de alta sensibilidade.

### 4.3 `rh_ops`

Operação técnica não acessada por CRUD de negócio:

- outbox e inbox;
- jobs e tentativas;
- dead-letter;
- idempotência;
- payloads e retornos externos;
- checkpoints de backfill;
- reconciliações técnicas.

### 4.4 Storage privado

Bytes de documentos, arquivos bancários, evidências e anexos permanecerão fora das linhas de negócio. As tabelas guardarão metadados, versão, hash, classificação, estado de scan, retenção e legal hold.

---

## 5. Dependências existentes reutilizadas

| Recurso | Regra de integração |
|---|---|
| `organizations` | tenant canônico; nenhuma duplicação |
| `auth.users` | ator autenticado; não representa pessoa ou vínculo |
| `projects` | obra/projeto operacional |
| `finance_cost_centers` | centro de custo canônico |
| Financeiro | títulos, contas, liquidações e pagamentos efetivos |
| Estoque/Ativos | EPI, ferramentas, equipamentos, custódias e devoluções |
| Documentos/Modelos | templates e geração de documentos |
| Auditoria/Observabilidade | eventos técnicos e alertas de plataforma |
| módulo e permissões | habilitação do aplicativo e capacidades genéricas |

O RH somente integrará esses recursos por contratos explícitos. Campos livres ou cópias não serão usados para simular uma FK.

---

## 6. Padrões físicos

### 6.1 Entidade raiz

```text
id
organization_id
business_code opcional
status
row_version
created_by / updated_by
created_at / updated_at
```

### 6.2 Tabela de versão

```text
root_id
version_number
previous_version_id
effective_from / effective_to
status
content_hash
created_by / created_at
approved_by / approved_at
```

### 6.3 Movimento ou evento

```text
aggregate_id
sequence_number
movement_type ou event_type
occurred_at
recorded_at
actor_user_id
correlation_id
causation_id
source_type / source_id
metadata sanitizado
```

### 6.4 Execução reproduzível

```text
run_number
engine_version
input_cutoff
input_hash
parameter_snapshot
status
started_at / completed_at
result_hash
```

### 6.5 Concorrência

- `row_version` para controle otimista;
- `FOR UPDATE` em transições críticas;
- advisory lock para fechamento por competência, conta ou escopo;
- constraints como última linha de defesa;
- idempotency key por comando externo ou repetível.

---

## 7. Integridade multi-tenant

### 7.1 Chave composta de tenant

Toda tabela tenant-scoped terá:

```text
unique (organization_id, id)
```

Toda FK para outra entidade tenant-scoped deverá preferencialmente usar:

```text
(organization_id, parent_id)
  → parent(organization_id, id)
```

### 7.2 Regras adicionais

- empresa e estabelecimento devem pertencer ao tenant;
- estabelecimento deve pertencer à empresa indicada;
- obra e centro de custo devem pertencer ao tenant;
- trabalhador, vínculo e contrato devem compartilhar tenant;
- documento deve pertencer ao mesmo tenant da entidade proprietária;
- lote e itens devem compartilhar tenant e ambiente;
- totalizador e obrigação devem compartilhar empresa e competência;
- nenhuma função privilegiada poderá criar relação cross-tenant.

### 7.3 Teste obrigatório

Para cada FK tenant-scoped haverá um teste negativo que tente relacionar registros válidos de organizações diferentes. O banco deverá rejeitar a operação mesmo quando executada por função privilegiada inadequadamente chamada.

---

## 8. Temporalidade

### 8.1 Convenção

Intervalos serão semiabertos:

```text
[início, fim)
```

### 8.2 Tempos separados

- vigência do negócio;
- ocorrência do fato;
- registro no sistema;
- processamento;
- aprovação;
- transmissão;
- publicação.

### 8.3 Constraints temporais

Serão avaliadas exclusion constraints para:

- versões contratuais;
- lotações principais;
- ocupações de posição;
- políticas e parâmetros;
- jornadas atribuídas;
- perfis de exposição;
- autorizações e habilitações.

Quando uma exclusão não puder expressar toda a regra, uma RPC transacional aplicará lock e validará sobreposição.

---

## 9. Normalização e snapshots

### 9.1 Dados normalizados

Devem ser colunas ou relações:

- identidade;
- empresa e estabelecimento;
- vínculos;
- vigência;
- status;
- valores monetários;
- rubricas;
- competências;
- bases e encargos;
- permissões;
- referências externas;
- chaves de idempotência.

### 9.2 Snapshots

Podem usar JSONB imutável:

- população de folha;
- versão de contrato consumida;
- entradas de cálculo;
- payload externo;
- configuração de relatório;
- premissas de cenário;
- conteúdo de uma execução.

O snapshot deverá conter versão e hash, e não poderá ser a única representação de campos usados em autorização ou reconciliação.

---

## 10. Dados monetários e quantitativos

- dinheiro: `numeric(18,2)`;
- taxas e fatores: precisão explícita, normalmente `numeric(20,8)`;
- quantidades de cálculo: precisão por domínio;
- minutos de jornada e banco: inteiro/bigint;
- competências: primeiro dia do mês;
- moeda: código ISO, com BRL como padrão quando aplicável;
- arredondamento: regra persistida na versão da fórmula ou parâmetro.

Valores financeiros derivados não serão mantidos por trigger genérico quando a memória de cálculo precisar ser reproduzível. Serão gravados como resultado de execução imutável.

---

## 11. Estados e transições

### 11.1 CRUD permitido

CRUD direto ficará limitado a cadastros simples em estado de rascunho e sem uso histórico.

### 11.2 RPC obrigatória

Será exigida para:

- ativar admissão;
- aplicar versão contratual;
- tratar marcação;
- fechar/reabrir ponto;
- conceder/cancelar férias pagas;
- emitir ASO;
- autorizar atividade crítica;
- aprovar e fechar folha;
- gerar lote de pagamento;
- transmitir evento;
- retificar/excluir/reabrir obrigação;
- confirmar desligamento;
- reintegrar trabalhador;
- publicar métrica ou cenário.

### 11.3 Append-only

Eventos, movimentos, tentativas, recibos, retornos, linhas de cálculo, aprovações e evidências não serão atualizados após confirmação. Correções ocorrerão por novo registro, reversão ou substituição vinculada.

---

## 12. RLS

### 12.1 Perfis

- `RH_STANDARD`;
- `RH_SCOPED`;
- `RH_SELF_SERVICE`;
- `RH_SENSITIVE`;
- `RH_CLINICAL`;
- `RH_JUDICIAL`;
- `RH_FINANCIAL`;
- `RH_APPEND_ONLY`;
- `RH_WORKER_ONLY`;
- `RH_OPS`.

### 12.2 Regras

- nenhuma tabela de negócio será aberta para `anon`;
- policies de leitura e escrita serão separadas;
- `FOR ALL` será evitado em domínio crítico;
- gravação de evento/movimento será revogada de `authenticated` quando ocorrer por RPC;
- self-service usará views/RPCs minimizadas;
- dados clínicos não terão policy de leitura genérica;
- dados financeiros exigirão capacidade e segregação;
- escopo de projeto/estabelecimento será validado na policy e na FK;
- service role será restrita a worker e integração técnica.

### 12.3 Auditoria

Acesso a prontuário, ordem judicial, folha, documento sensível, exportação e payload externo deverá produzir evento de auditoria com finalidade e resultado, sem copiar o conteúdo acessado.

---

## 13. Views e projeções

Views serão usadas para:

- condição contratual vigente;
- lotação vigente;
- saldo de férias;
- saldo de banco de horas;
- quadro e posições ocupadas;
- cobertura de treinamentos;
- folha autorizada para portal;
- obrigações pendentes;
- reconciliações;
- indicadores agregados.

Regras:

- `security_invoker=true`;
- sem função que ignore RLS;
- sem dados clínicos em views gerais;
- sem cálculo jurídico crítico apenas em view;
- projeção reconstruível a partir de fontes canônicas;
- versão e instante de corte visíveis quando relevantes.

---

## 14. Índices

### 14.1 Obrigatórios

- PK e uniques;
- índice líder para FKs de alto uso;
- organização + status + data;
- vínculo/trabalhador + vigência;
- competência + empresa + tipo;
- idempotency key;
- correlation ID;
- registros ativos por índice parcial;
- fila por status, prioridade e disponibilidade.

### 14.2 Avaliação de custo

Cada migration deverá incluir:

- consulta que justifica o índice;
- cardinalidade esperada;
- impacto de escrita;
- plano de remoção se redundante;
- validação de índice de FK pelo CI.

Não serão criados índices GIN, trigram ou expressão sobre dados sensíveis sem necessidade comprovada.

---

## 15. Documentos e Storage

### 15.1 Metadados

Cada versão terá:

- `organization_id`;
- proprietário;
- tipo;
- versão;
- caminho;
- nome normalizado;
- MIME declarado e detectado;
- tamanho;
- SHA-256;
- estado de quarentena;
- provider e instante de scan;
- retenção;
- legal hold;
- autor e timestamps.

### 15.2 Acesso

Downloads ocorrerão por rota autenticada ou URL assinada curta, após nova verificação de autorização. A posse do caminho não autoriza acesso.

### 15.3 Conteúdo clínico

O documento clínico terá metadados operacionais mínimos em `public` apenas quando necessário; o conteúdo e a relação detalhada ficarão em zona privada.

---

## 16. Catálogos globais e organizacionais

### 16.1 Globais

- tipos de identificador;
- códigos oficiais;
- eventos e leiautes externos;
- tabelas governamentais;
- perigos/agentes de referência;
- países e códigos padronizados.

### 16.2 Organizacionais

- cargos e funções;
- benefícios e políticas;
- rubricas internas;
- parâmetros próprios;
- checklists;
- treinamentos;
- motivos internos;
- modelos de offboarding.

Um catálogo global não será editável por tenant. Uma configuração organizacional não modificará o catálogo oficial.

---

## 17. Ordem lógica de migrations

| Pacote | Conteúdo | Gate mínimo |
|---|---|---|
| `M00` | pré-condições, inventário e ledger | `G00` |
| `M01` | schemas `rh_private` e `rh_ops`, helpers e grants base | `G00` |
| `M02` | aplicativo RH, capabilities, flags e auditoria base | `G00` |
| `M03` | documentos compartilhados e Storage base | `G01` |
| `M04` | pessoa, trabalhador, empresa e estabelecimento | `G01` |
| `M05` | estrutura, cargos, funções, posições e lotações | `G01` |
| `M06` | admissão, vínculo, contrato e versões | `G02` |
| `M07` | jornada, marcações, apuração e banco | `G03` |
| `M08` | férias, ausências, afastamentos e retorno | `G03` |
| `M09` | benefícios, relações e descontos | `G03` |
| `M10` | SST operacional, riscos, EPI e treinamentos | `G03` |
| `M11` | zona clínica e judicial | `G04` |
| `M12` | rubricas, fórmulas, parâmetros e entradas | `G04` |
| `M13` | execuções, linhas, aprovações e fechamento de folha | `G04` |
| `M14` | pagamentos, contabilidade e rateios | `G05` |
| `M15` | catálogos externos, projeções e validações | `G05` |
| `M16` | lotes, tentativas, recibos e totalizadores | `G05` |
| `M17` | desligamento, rescisão e offboarding | `G06` |
| `M18` | métricas, observações e planejamento | `G08` |
| `M19` | views, projeções e portal do trabalhador | conforme domínio |
| `M20` | hardening de RLS, grants e RPCs | em cada onda |
| `M21` | backfills, mapas e reconciliação | em cada onda |
| `M22` | testes de homologação e validadores | em cada onda |

Timestamps reais não foram reservados. O pacote lógico não deverá ser usado como nome de arquivo antes da validação do ledger.

---

## 18. Expand/contract

Para substituir dados legados:

1. criar estrutura nova sem remover a antiga;
2. criar mapeamento e dual-read controlado quando necessário;
3. executar backfill em lotes;
4. reconciliar contagens e hashes;
5. ativar leitura nova por feature flag;
6. bloquear nova escrita no legado;
7. observar e estabilizar;
8. remover somente em migration posterior e aprovada.

Dual-write será evitado. Quando inevitável, deverá ser idempotente, temporário, monitorado e possuir reconciliação.

---

## 19. Backfills prioritários

### 19.1 Pessoas e equipes

- inventariar pessoas, membros de equipe, usuários e terceiros;
- gerar candidatos de correspondência;
- aplicar match automático somente com evidência forte e regra aprovada;
- encaminhar ambiguidade para revisão;
- preservar mapa origem → destino;
- nunca converter terceiro em empregado automaticamente.

### 19.2 Empresas e estabelecimentos

- mapear organizações atuais;
- identificar empresas empregadoras;
- identificar estabelecimentos e CNOs;
- não inferir estabelecimento apenas pela obra;
- validar inscrições e vigências.

### 19.3 Centros de custo e obras

- reutilizar `finance_cost_centers`;
- mapear rateios sem duplicar catálogo;
- detectar códigos duplicados ou inativos;
- preservar histórico de apropriação.

### 19.4 Documentos

- classificar legado como `LEGACY` quando não houver evidência de scan;
- calcular hash quando os bytes estiverem disponíveis;
- não declarar assinatura ou verificação inexistente;
- definir retenção e proprietário.

---

## 20. Reconciliação

Cada pacote terá um relatório com:

- registros de origem;
- registros elegíveis;
- inseridos;
- atualizados por idempotência;
- ignorados justificadamente;
- ambíguos;
- rejeitados;
- totais monetários;
- hashes de conjuntos;
- distribuição por tenant;
- referências órfãs;
- diferenças antes/depois.

O gate não será aprovado com divergência sem resolução, aceite de risco ou plano de correção formal.

---

## 21. Requisitos de dados — 120

### Convenções, ownership e tenancy

- **RD-001:** registrar owner funcional e técnico de cada tabela.
- **RD-002:** associar cada tabela a um bounded context.
- **RD-003:** classificar cada tabela como global, tenant, privada ou operacional.
- **RD-004:** usar UUID como PK das novas entidades.
- **RD-005:** incluir `organization_id` em toda entidade tenant-scoped.
- **RD-006:** criar unique `(organization_id,id)` nas entidades tenant-scoped.
- **RD-007:** usar FK composta entre entidades tenant-scoped.
- **RD-008:** rejeitar referência cross-tenant no banco.
- **RD-009:** distinguir tenant, empresa, estabelecimento, obra e centro de custo.
- **RD-010:** documentar toda exceção à FK composta.
- **RD-011:** reutilizar recursos canônicos existentes.
- **RD-012:** impedir catálogo paralelo de centro de custo.
- **RD-013:** impedir pessoa de ser substituída por `auth.users`.
- **RD-014:** impedir login de ser prova de vínculo.
- **RD-015:** manter código humano separado da PK.

### Temporalidade e versionamento

- **RD-016:** separar vigência, ocorrência, registro e processamento.
- **RD-017:** usar intervalos semiabertos.
- **RD-018:** validar fim posterior ao início.
- **RD-019:** impedir sobreposição de condição exclusiva.
- **RD-020:** criar raiz estável para conteúdo versionado.
- **RD-021:** numerar versões por raiz.
- **RD-022:** preservar versão anterior.
- **RD-023:** registrar hash de conteúdo quando relevante.
- **RD-024:** tornar versão aprovada imutável.
- **RD-025:** preservar versão consumida por cálculo ou evento.
- **RD-026:** impedir edição de condição histórica usada.
- **RD-027:** registrar correção como nova versão ou evento.
- **RD-028:** suportar condição futura sem substituir a vigente.
- **RD-029:** suportar retroatividade com impacto explícito.
- **RD-030:** normalizar competência mensal.

### Estados, eventos e movimentos

- **RD-031:** manter status operacional quando necessário.
- **RD-032:** registrar transições críticas em eventos.
- **RD-033:** aplicar transições por RPC.
- **RD-034:** manter eventos confirmados append-only.
- **RD-035:** manter movimentos financeiros/temporais append-only.
- **RD-036:** calcular saldos a partir de movimentos.
- **RD-037:** criar reversão vinculada em vez de apagar.
- **RD-038:** guardar correlation e causation IDs.
- **RD-039:** numerar eventos por agregado quando necessário.
- **RD-040:** impedir update/delete de linhas de cálculo confirmadas.
- **RD-041:** separar aprovação de status.
- **RD-042:** separar documento de fato.
- **RD-043:** separar tentativa de resultado externo.
- **RD-044:** separar valor devido de valor pago.
- **RD-045:** separar observação analítica de definição da métrica.

### Tipos, valores e documentos

- **RD-046:** usar `numeric` para dinheiro.
- **RD-047:** persistir regra de arredondamento.
- **RD-048:** usar minutos canônicos para jornada.
- **RD-049:** validar percentuais e somas de rateio.
- **RD-050:** normalizar identificadores antes de busca.
- **RD-051:** proteger identificadores de alto risco.
- **RD-052:** não registrar segredo em tabela de negócio.
- **RD-053:** usar JSONB somente para conteúdo extensível/snapshot.
- **RD-054:** não guardar FK crítica apenas em JSONB.
- **RD-055:** guardar metadados de documento no banco.
- **RD-056:** guardar bytes em Storage privado.
- **RD-057:** calcular SHA-256 dos bytes.
- **RD-058:** registrar MIME declarado e detectado.
- **RD-059:** registrar status de quarentena e scan.
- **RD-060:** suportar retenção e legal hold.

### RLS, grants e privacidade

- **RD-061:** habilitar RLS em tabela exposta.
- **RD-062:** aplicar default deny.
- **RD-063:** negar `anon` em dados RH.
- **RD-064:** separar policies de leitura e escrita.
- **RD-065:** evitar policy crítica `FOR ALL`.
- **RD-066:** revogar escrita direta em append-only.
- **RD-067:** usar capability de domínio.
- **RD-068:** aplicar escopo de obra/estabelecimento quando necessário.
- **RD-069:** usar projeção minimizada para self-service.
- **RD-070:** manter prontuário fora da Data API comum.
- **RD-071:** restringir conteúdo judicial por finalidade.
- **RD-072:** segregar folha e pagamento.
- **RD-073:** auditar acesso sensível.
- **RD-074:** sanitizar logs e metadados.
- **RD-075:** limitar retorno de RPC sensível.
- **RD-076:** definir `search_path` de função privilegiada.
- **RD-077:** revogar execução pública de RPC interna.
- **RD-078:** usar view `security_invoker`.
- **RD-079:** testar ausência de acesso cross-tenant.
- **RD-080:** testar ausência de acesso por função sem capacidade.

### Índices, performance e operação

- **RD-081:** indexar FKs de uso relevante.
- **RD-082:** criar índices de fila por status e disponibilidade.
- **RD-083:** criar índices de vigência por vínculo/trabalhador.
- **RD-084:** criar índices de competência por empresa.
- **RD-085:** criar unique parcial para condição atual quando aplicável.
- **RD-086:** justificar índice por consulta.
- **RD-087:** medir impacto de escrita.
- **RD-088:** evitar índice sensível em claro.
- **RD-089:** usar particionamento somente com evidência.
- **RD-090:** definir retenção antes de particionar.
- **RD-091:** manter outbox no mesmo commit do fato.
- **RD-092:** manter inbox idempotente.
- **RD-093:** persistir tentativas de job.
- **RD-094:** suportar dead-letter.
- **RD-095:** suportar lease e retomada segura.

### Migrations, backfills e reconciliação

- **RD-096:** criar migration append-only.
- **RD-097:** dividir migrations por responsabilidade.
- **RD-098:** verificar ledger antes de reservar timestamp.
- **RD-099:** usar expand/contract.
- **RD-100:** evitar operação bloqueante sem plano.
- **RD-101:** criar rollback ou compensação por pacote.
- **RD-102:** executar backfill com dry-run.
- **RD-103:** executar backfill em lotes.
- **RD-104:** persistir checkpoint.
- **RD-105:** tornar backfill idempotente.
- **RD-106:** preservar mapa origem/destino.
- **RD-107:** separar ambiguidade para revisão.
- **RD-108:** não fundir pessoas apenas por nome.
- **RD-109:** reconciliar contagens por tenant.
- **RD-110:** reconciliar totais monetários.
- **RD-111:** reconciliar hashes ou conjuntos.
- **RD-112:** registrar órfãos e rejeições.
- **RD-113:** executar cleanup de fixture.
- **RD-114:** atualizar inventário e documentação.
- **RD-115:** validar migration em banco restaurado.

### Qualidade e liberação

- **RD-116:** gerar catálogo de dados legível por máquina.
- **RD-117:** validar schema esperado no CI.
- **RD-118:** validar RLS, grants, FKs e índices no CI.
- **RD-119:** produzir evidência de homologação por pacote.
- **RD-120:** impedir produção sem gate e reconciliação aprovados.

---

## 22. Regras de dados — 80

- **RG-001:** nenhuma tabela nova poderá existir sem owner.
- **RG-002:** nenhuma entidade tenant poderá omitir `organization_id`.
- **RG-003:** RLS não substitui integridade referencial composta.
- **RG-004:** PK UUID não será código exibido ao usuário.
- **RG-005:** empresa não será inferida apenas do tenant.
- **RG-006:** estabelecimento não será inferido apenas da obra.
- **RG-007:** usuário não será pessoa canônica.
- **RG-008:** trabalhador não será vínculo.
- **RG-009:** vínculo não será contrato versionado.
- **RG-010:** posição não será ocupação.
- **RG-011:** condição futura não será condição vigente.
- **RG-012:** fim de vigência será exclusivo.
- **RG-013:** versão aprovada não será editada.
- **RG-014:** versão usada não será apagada.
- **RG-015:** correção retroativa não apagará o estado conhecido à época.
- **RG-016:** status não substituirá evento.
- **RG-017:** evento não substituirá estado canônico quando este for necessário.
- **RG-018:** movimento não terá update/delete.
- **RG-019:** saldo não será editado diretamente.
- **RG-020:** reversão referenciará o movimento original.
- **RG-021:** documento não será única fonte do fato.
- **RG-022:** caminho de Storage não autorizará download.
- **RG-023:** arquivo sem scan comprovado será `LEGACY` ou quarentena.
- **RG-024:** hash não será tratado como anonimização.
- **RG-025:** JSONB não substituirá constraint crítica.
- **RG-026:** código externo mutável não será enum eterno.
- **RG-027:** estado interno estável poderá usar enum após análise.
- **RG-028:** dinheiro não usará float.
- **RG-029:** competência não será texto livre.
- **RG-030:** arredondamento fará parte da versão da regra.
- **RG-031:** prontuário não ficará em `public`.
- **RG-032:** diagnóstico não aparecerá em view operacional.
- **RG-033:** conteúdo judicial não aparecerá em log.
- **RG-034:** conta bancária completa será minimizada/tokenizada.
- **RG-035:** service role não será autorização de usuário.
- **RG-036:** função privilegiada verificará tenant e capacidade.
- **RG-037:** função privilegiada terá `search_path` explícito.
- **RG-038:** RPC interna não será executável por `anon`.
- **RG-039:** tabela append-only não aceitará escrita direta autenticada.
- **RG-040:** self-service não lerá tabela interna ampla.
- **RG-041:** policy não confiará em parâmetro de tenant sem contexto autenticado.
- **RG-042:** cache não cruzará tenant ou sensibilidade.
- **RG-043:** view exposta respeitará RLS da origem.
- **RG-044:** materialized view exigirá autorização própria.
- **RG-045:** índice será justificado por consulta ou constraint.
- **RG-046:** FK relevante terá índice líder.
- **RG-047:** índice redundante será removido em migration posterior.
- **RG-048:** dado sensível não terá índice textual sem avaliação.
- **RG-049:** particionamento dependerá de volumetria.
- **RG-050:** particionamento não será usado para ocultar consulta ruim.
- **RG-051:** fato e outbox serão atômicos.
- **RG-052:** consumidor aceitará entrega repetida.
- **RG-053:** idempotency key terá escopo explícito.
- **RG-054:** timeout externo poderá produzir estado incerto.
- **RG-055:** estado incerto será reconciliado antes de reenviar.
- **RG-056:** tentativa técnica não criará novo fato.
- **RG-057:** migration aplicada não será reescrita.
- **RG-058:** timestamp de migration será validado contra ledger.
- **RG-059:** migration destrutiva exigirá fase contract posterior.
- **RG-060:** backfill não rodará sem dry-run.
- **RG-061:** backfill não fundirá pessoa por nome isolado.
- **RG-062:** terceiro não será convertido em empregado automaticamente.
- **RG-063:** ambiguidade irá para fila humana.
- **RG-064:** reconciliação será por tenant.
- **RG-065:** diferença monetária exigirá tolerância versionada.
- **RG-066:** divergência não será ocultada por arredondamento ad hoc.
- **RG-067:** fixture de teste não permanecerá como dado real.
- **RG-068:** cleanup ou rollback será evidenciado.
- **RG-069:** migration e código compatível serão implantados coordenadamente.
- **RG-070:** feature flag não substituirá RLS.
- **RG-071:** tabela do estado-alvo não precisa ser criada antes de sua onda.
- **RG-072:** catálogo físico será revisado antes de cada pacote.
- **RG-073:** nome físico poderá mudar somente com análise de impacto.
- **RG-074:** documentação refletirá o schema realmente aplicado.
- **RG-075:** teste planejado não será evidência executada.
- **RG-076:** CI verde não substituirá aceite funcional.
- **RG-077:** homologação não autorizará produção automaticamente.
- **RG-078:** produção exigirá backup, rollback e runbook.
- **RG-079:** retenção respeitará obrigação e legal hold.
- **RG-080:** toda decisão física será revalidada antes da migration.

---

## 23. Critérios de aceite — 55

- **CA-001:** o catálogo identifica owner e contexto de cada tabela.
- **CA-002:** o catálogo distingue `public`, `rh_private` e `rh_ops`.
- **CA-003:** toda tabela tenant proposta contém `organization_id`.
- **CA-004:** toda tabela tenant propõe unique composto.
- **CA-005:** relações tenant propostas utilizam FK composta.
- **CA-006:** teste cross-tenant é definido para cada pacote.
- **CA-007:** pessoa, usuário, trabalhador e vínculo possuem raízes distintas.
- **CA-008:** empresa, estabelecimento, obra e centro de custo são distintos.
- **CA-009:** versões possuem vigência e número.
- **CA-010:** intervalo inválido é rejeitado.
- **CA-011:** condição exclusiva sobreposta é rejeitada.
- **CA-012:** versão aprovada não pode ser alterada.
- **CA-013:** evento confirmado não pode ser atualizado.
- **CA-014:** movimento confirmado não pode ser apagado.
- **CA-015:** saldo é reproduzido pelos movimentos.
- **CA-016:** reversão preserva o movimento original.
- **CA-017:** dinheiro usa numeric.
- **CA-018:** competência é normalizada.
- **CA-019:** JSONB não contém FK crítica sem coluna correspondente.
- **CA-020:** documento possui hash, MIME, tamanho e estado de scan.
- **CA-021:** caminho de Storage isolado não permite download.
- **CA-022:** prontuário não está exposto na Data API comum.
- **CA-023:** view operacional não revela diagnóstico.
- **CA-024:** ordem judicial integral exige acesso segregado.
- **CA-025:** `anon` não possui acesso RH.
- **CA-026:** usuário sem módulo não lê dados RH.
- **CA-027:** usuário sem capacidade sensível não lê dados sensíveis.
- **CA-028:** trabalhador acessa somente projeção própria permitida.
- **CA-029:** função `SECURITY DEFINER` tem `search_path` explícito.
- **CA-030:** execução pública da função interna está revogada.
- **CA-031:** view exposta usa `security_invoker`.
- **CA-032:** escrita direta em append-only é negada.
- **CA-033:** transição crítica ocorre por RPC.
- **CA-034:** comando repetido com mesma idempotency key não duplica fato.
- **CA-035:** outbox é gravada com o fato.
- **CA-036:** job repetido não duplica efeito de negócio.
- **CA-037:** timeout externo pode ser reconciliado.
- **CA-038:** índice de FK é validado.
- **CA-039:** índice parcial representa condição ativa correta.
- **CA-040:** migration nova não altera arquivo aplicado.
- **CA-041:** ledger é verificado antes do timestamp.
- **CA-042:** pacote segue expand/contract quando necessário.
- **CA-043:** backfill possui dry-run.
- **CA-044:** backfill retoma de checkpoint.
- **CA-045:** backfill repetido é idempotente.
- **CA-046:** correspondência ambígua não é aplicada automaticamente.
- **CA-047:** mapa origem/destino é preservado.
- **CA-048:** contagens são reconciliadas por tenant.
- **CA-049:** totais monetários são reconciliados.
- **CA-050:** órfãos e rejeições aparecem no relatório.
- **CA-051:** fixture é removida por cleanup ou rollback.
- **CA-052:** inventário é atualizado com o schema aplicado.
- **CA-053:** migration é validada em ambiente restaurado.
- **CA-054:** evidências do pacote ficam preservadas.
- **CA-055:** nenhum SQL é aplicado apenas pela aprovação deste documento.

---

## 24. Testes obrigatórios

### 24.1 Estrutura

- tabelas, colunas e tipos;
- PKs, uniques, FKs e checks;
- índices de FK;
- funções, views e grants;
- RLS habilitada e forçada conforme matriz.

### 24.2 Multi-tenant

- leitura cruzada;
- escrita cruzada;
- FK cruzada;
- função privilegiada com parâmetros cruzados;
- Storage e documento cruzados;
- cache/projeção cruzada.

### 24.3 Temporal

- intervalo inválido;
- sobreposição;
- versão futura;
- retroatividade;
- condição vigente no instante;
- reabertura e nova versão.

### 24.4 Concorrência

- ativação duplicada;
- fechamento simultâneo;
- movimento concorrente;
- idempotência;
- claim de job;
- criação de versão concorrente.

### 24.5 Privacidade

- dados clínicos;
- dados judiciais;
- folha;
- documentos;
- self-service;
- exportação;
- logs sanitizados.

### 24.6 Migration e backfill

- banco vazio;
- banco com dados legados;
- aplicação repetida;
- retomada após falha;
- rollback/compensação;
- restauração e reaplicação;
- reconciliação final.

---

## 25. Riscos

- excesso de tabelas criadas antes da necessidade;
- nomes conflitantes com schema existente;
- FKs compostas ausentes em ponto crítico;
- RLS permissiva por reutilização indevida;
- conteúdo sensível no schema exposto;
- migration muito grande;
- lock prolongado;
- dual-write inconsistente;
- backfill que funde pessoas incorretamente;
- documento legado tratado como verificado;
- índices excessivos;
- JSONB sem governança;
- partição prematura;
- Service Role usada como atalho;
- produção sem reconciliação.

Cada risco possui controles definidos na ADR, nos requisitos e nos gates do Módulo 14.

---

## 26. Estado honesto

Foram concluídos:

- desenho das zonas;
- convenções físicas;
- catálogo proposto de 233 tabelas;
- matriz de tipos e padrões;
- integridade multi-tenant;
- perfis de RLS;
- ordem lógica de migrations;
- estratégia de backfill e reconciliação;
- requisitos, regras e critérios de aceite.

Não foram criados:

- schemas;
- tabelas;
- tipos;
- constraints;
- policies;
- RPCs;
- views;
- índices;
- buckets;
- migrations;
- backfills;
- fixtures;
- testes executáveis.

O Gate G00 continua bloqueando qualquer migration do RH.

---

## 27. Próximo módulo

**Módulo 16 — Contratos de API, Comandos, Consultas, RPCs, Eventos, Jobs e Integrações.**

O próximo documento deverá transformar as entidades e transições em contratos tipados, com payloads, autorização, idempotência, erros, eventos, filas e compatibilidade de versão.
