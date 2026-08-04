# Object Runtime — motor de objetos dinâmicos da Innovar Platform

**Documento canônico:** sim
**Estado:** primeira fatia em execução. Aplicados e conferidos no banco em 04/08/2026: catálogo de definições com publicação imutável e checksum (item 1); camada compartilhada particionada em 64, com a política única de RLS e os índices de slot (item 2); `object_record_upsert` com preenchimento de slot, validação de payload e escrita direta revogada (item 3); classes `Cadastro` e `Extensão` (item 5); estúdio mínimo em `/app/administracao/objetos` (item 6). **Faltam:** leitura com paginação keyset e recusa de filtro não indexado (item 4) e o POC de carga com milhões de registros (item 7) — nada aqui foi medido sob carga.
**Precedência:** abaixo de `SPEC.md` e `ARQUITETURA.md`, acima de qualquer documento técnico em `docs/`.
**Método obrigatório de leitura e de trabalho:** `diretrizes/METODO-DE-TRABALHO.md`.

Este documento é a memória da decisão. Qualquer sessão assistida que for mexer em objetos dinâmicos, estúdio, customização por empresa ou armazenamento de dado declarado começa por aqui — não por reinterpretação de conversa.

---

## 1. Problema, escopo e não-escopo

### 1.1 O problema

A plataforma tem hoje 20 aplicativos padrão, 136 tabelas e um modelo de permissão maduro. O que ela não tem é um caminho para a empresa cliente registrar **aquilo que só ela faz**: um checklist de vistoria próprio, um catálogo interno de materiais, um campo extra no cadastro de fornecedor, um apontamento de campo que o setor dela inventou.

Hoje isso só existe se virar código. Virar código significa: migration, deploy, revisão, e um item na fila de alguém. Multiplicado por centenas de empresas, é uma fila que nunca anda. É esse gargalo — não a falta de funcionalidade — que impede a plataforma de escalar como produto.

### 1.2 A oportunidade

A oportunidade não nasce de imitar o Odoo. Nasce de uma observação sobre o próprio produto: **os 20 aplicativos padrão já cobrem o núcleo do negócio**. A customização não precisa ser capaz de construir um ERP do zero. Precisa ser capaz de estender um ERP que já existe.

Isso reduz o problema em uma ordem de grandeza. Não é preciso um gerador de aplicações. É preciso um motor de extensão. Um motor de extensão é um problema muito menor, e problemas menores têm soluções simples.

### 1.3 Escopo

- Definir objetos por composição de características declaradas, sem escrever código.
- Armazenar registros desses objetos com filtro, ordenação e paginação em escala de milhões de linhas.
- Aplicar RLS e permissão sobre dado dinâmico com o **mesmo** modelo de permissão já existente.
- Estender registros dos aplicativos padrão sem alterar as tabelas padrão.
- Instalar, publicar, despublicar e versionar objetos sem downtime.
- Manter caminho de crescimento de infraestrutura sem reescrita.

### 1.4 Não-escopo — explicitamente fora

| Fora | Por quê |
|---|---|
| Geração de código-fonte (SQL, TypeScript) em tempo de execução | Sistema de arquivos é somente leitura no runtime da Vercel; código gerado é indepurável; melhoria no gerador não propaga para o já gerado; é superfície de execução remota de código |
| Linguagem de fórmula Turing-completa | Superfície de ataque e de suporte desproporcional ao ganho na primeira fatia |
| Usuário final criando objeto | Quem cria é o **administrador** da empresa. Decisão do responsável pelo produto |
| Objeto customizado substituindo aplicativo padrão | Extensão, nunca substituição |
| Multi-idioma do estúdio | Fatia futura |
| Marketplace público de objetos entre empresas | Fatia futura, depende deste documento estar estável |

---

## 2. Modelo conceitual

Quatro conceitos. Nenhum a mais.

```text
TIPO DE CAMPO  → o que um dado é           (texto, número, data, referência, anexo…)
CARACTERÍSTICA → o que um objeto sabe fazer (versionar, aprovar, anexar, georreferenciar…)
CLASSE         → combinação nomeada de características (Cadastro, Documento, Registro de campo, Lançamento)
OBJETO         → classe + campos + características extras = uma definição
REGISTRO       → uma linha de dado de um objeto
```

### 2.1 Tipo de campo — a biblioteca genérica

Conjunto fechado. Fechado é o ponto: cada tipo é uma peça pequena, testada uma vez, usada em toda parte.

| Tipo | Armazenamento no payload | Slot indexável |
|---|---|---|
| `texto` | string | `txt_n` |
| `texto_longo` | string | não |
| `numero` | number | `num_n` |
| `moeda` | number + código da moeda | `num_n` |
| `percentual` | number | `num_n` |
| `data` / `data_hora` | ISO 8601 | `dt_n` |
| `booleano` | boolean | `bool_n` |
| `selecao` | string (chave da opção) | `txt_n` |
| `selecao_multipla` | array de strings | não |
| `referencia` | uuid + alvo | `ref_n` |
| `anexo` | descritor de arquivo | não |
| `geolocalizacao` | `{lat, lng, precisao}` | não |
| `assinatura` | descritor de evidência | não |
| `usuario` | uuid | `ref_n` |

Tipo novo é decisão arquitetural, entra por PR, com teste e documentação. Não é criável pelo administrador.

### 2.2 Característica — a unidade de composição

Uma característica é **uma solução simples e isolada**, com comportamento próprio, testada sozinha. Um objeto é a composição de várias.

| Característica | O que acrescenta |
|---|---|
| `auditavel` | grava evento em `audit_events` a cada escrita |
| `versionavel` | registro tem histórico de versões, não sobrescreve |
| `aprovavel` | máquina de estados rascunho → em aprovação → aprovado / recusado |
| `anexavel` | aceita campos de anexo, roteados por `secureUpload` |
| `comentavel` | fio de comentários no registro |
| `georreferenciado` | captura e exibe posição |
| `vinculado_a_obra` | registro pertence a um `project_id` e herda a permissão de obra |
| `vinculado_a_cliente` | idem para `client_id` |
| `numerado` | numeração sequencial por empresa e por ano |
| `arquivavel` | exclusão lógica com `deleted_at` |
| `importavel` | importação por planilha com validação prévia |
| `exportavel` | exportação autorizada, sujeita a permissão de exportação |
| `alto_volume` | declara intenção de milhões de linhas; pede a camada dedicada |
| `extensao_de` | o registro anexa-se a um registro de aplicativo padrão |

**Esta tabela é a resposta técnica à sua intuição.** O motor não reconstrói código; ele **combina características já prontas**. Cada característica resolve um micro-problema, foi resolvida uma vez e vale para todos os objetos. É por isso que o motor é mais simples do que um gerador: um gerador precisa saber produzir infinitas combinações de código; o motor só precisa saber ligar peças que já funcionam.

### 2.3 Classe — atalho, não conceito novo

Classe é um conjunto pré-aprovado de características, para o administrador não começar de uma tela em branco.

| Classe | Características padrão | Camada padrão |
|---|---|---|
| `Cadastro` | `auditavel`, `arquivavel`, `importavel`, `exportavel` | compartilhada |
| `Documento` | `Cadastro` + `versionavel`, `aprovavel`, `anexavel` | compartilhada |
| `Registro de campo` | `Cadastro` + `anexavel`, `georreferenciado`, `vinculado_a_obra` | compartilhada |
| `Extensão` | `auditavel`, `extensao_de` | compartilhada |
| `Lançamento` | `auditavel`, `alto_volume`, `vinculado_a_obra` | **dedicada** |

Classe é editável na criação. Depois de publicada, mudança de classe é mudança de versão da definição (seção 3).

---

## 3. Catálogo de definições e versionamento imutável

### 3.1 Micro-problema

Definição que muda embaixo de dado já gravado corrompe leitura: um campo que era texto vira número e o registro antigo deixa de ser interpretável.

### 3.2 Solução simples

**Definição publicada é imutável.** Editar cria uma nova versão. Cada registro grava a versão com que nasceu. Leitura sempre interpreta o registro pela versão dele.

Precedente na própria plataforma: `quality_form_versions.schema_json` já faz exatamente isso, em produção, desde a Etapa 13. O Object Runtime generaliza um padrão que já está validado aqui — não importa um padrão de fora.

### 3.3 Estrutura

```text
object_definitions          uma linha por objeto por empresa
  id, organization_id, key, nome, classe, module_key,
  storage_tier ('shared' | 'dedicated'), status, current_version, created_by

object_definition_versions  imutável após publicar
  id, definition_id, version, spec jsonb, checksum, published_at, published_by

object_field_slots          projeção do spec, lida na escrita
  definition_id, version, field_key, slot_column
```

`spec` é a fonte de verdade — campos, características, validações, rótulos, ordem de exibição. `object_field_slots` é projeção derivada, existe só para a escrita ser rápida. Projeção divergente do `spec` é falha de integridade e reprova no CI.

`checksum` do `spec` permite provar que a versão não foi alterada depois de publicada — mesma técnica dos manifestos de hash usados na auditoria APEX.

---

## 4. Camadas de armazenamento e o resolver

### 4.1 Micro-problema

"Até 1000 objetos por empresa" e "milhões de registros" não acontecem no mesmo objeto.

A esmagadora maioria dos objetos customizados é **lista**: catálogo, checklist, cadastro auxiliar. Centenas a dezenas de milhares de linhas. Uma minoria — meia dúzia por empresa — é **livro**: apontamento, leitura, medição, evento. Milhões de linhas.

Uma solução única para os dois casos quebra um dos dois.

### 4.2 Solução simples: duas camadas e um resolver

**Camada compartilhada** — `object_records`, particionada por `HASH(organization_id)` em 64 partições.

O particionamento por tenant é o que separa esta solução de uma tabela genérica única. Numa tabela única, todos os inquilinos dividem o mesmo heap, os mesmos índices e o mesmo autovacuum: um cliente pesado degrada todos. Particionada, o planejador toca só a partição do inquilino, as estatísticas são por partição, e o autovacuum trabalha em unidades menores.

```text
object_records (particionada por hash de organization_id, 64 partições)
  id uuid
  organization_id uuid        ← chave de partição
  object_id uuid
  definition_version int
  module_key text             ← denormalizado, ver seção 6
  project_id uuid null
  parent_kind text null       ← ver seção 7
  parent_id uuid null
  payload jsonb               ← todos os campos declarados
  num_1..num_4 numeric        ← slots indexáveis
  txt_1..txt_4 text
  dt_1..dt_2 timestamptz
  bool_1..bool_2 boolean
  ref_1..ref_2 uuid
  created_at, created_by, updated_at, updated_by, deleted_at
  primary key (organization_id, id)
```

**Camada dedicada** — `obj_<empresa>_<objeto>`, tabela física própria, colunas reais tipadas, índices próprios, particionada por tempo quando o objeto for temporal.

**Resolver** — nenhum código de aplicação sabe onde a linha mora. Toda leitura e escrita passa por uma camada de resolução que consulta `storage_tier` na definição. Consequência: promover um objeto de camada é migração de dado, não alteração de aplicação.

### 4.3 A conta

| Item | Quantidade | Impacto |
|---|---|---|
| Definições de objeto | centenas de empresas × até 1000 = ~10⁵ | linhas em tabela de catálogo, irrelevante |
| Partições da camada compartilhada | 64, fixo | irrelevante |
| Tabelas dedicadas | centenas × ~6 = ~10³ | Postgres carrega sem esforço |

O que **não** acontece: o número de objetos nunca vira número de tabelas. É essa separação que faz o desenho aguentar o crescimento.

### 4.4 Promoção entre camadas

1. cria a tabela dedicada com as colunas reais;
2. copia o histórico em lotes, sem lock longo;
3. liga escrita dupla;
4. verifica contagem e amostragem;
5. vira o resolver;
6. desliga a escrita dupla e apaga as linhas antigas.

Sem downtime, sem alteração de aplicação. Reversível até o passo 5.

Gatilhos de promoção: volume acima do limiar, esgotamento do orçamento de slots (seção 5), ou declaração explícita da característica `alto_volume`.

---

## 5. Slots, índices e o advisor de varredura

### 5.1 Micro-problema

Como filtrar e ordenar por um campo declarado, dentro de uma tabela que guarda registros de milhares de objetos diferentes, sem criar estrutura física por objeto?

Duas saídas ingênuas, ambas erradas:

- **Índice GIN sobre o `payload` inteiro.** Índice enorme, cobre todos os objetos de todos os inquilinos, estatísticas ruins, escrita cara.
- **Índice parcial por objeto** (`WHERE object_id = 'X'`). Funciona com 50 objetos. Com 10⁵ definições × 64 partições, é explosão de catálogo — troca-se explosão de tabelas por explosão de índices.

### 5.2 Solução simples: colunas-slot de tipo fixo

A tabela tem um conjunto **fixo** de colunas indexáveis. A definição mapeia "campo declarado → slot". Na escrita, o valor é copiado do payload para o slot.

Os índices são fixos e compartilhados — uma dúzia no total, para todos os objetos da plataforma:

```sql
create index on object_records (organization_id, object_id, created_at desc, id)
  where deleted_at is null;                                   -- listagem padrão
create index on object_records (organization_id, object_id, num_1) where num_1 is not null;
create index on object_records (organization_id, object_id, txt_1) where txt_1 is not null;
-- … um por slot
```

Três razões pelas quais isso funciona:

1. **`organization_id` e `object_id` lideram o índice.** O planejador enxerga cada objeto como uma fatia pequena e seletiva, mesmo o índice sendo compartilhado.
2. **O predicado `IS NOT NULL` elimina o inchaço.** Objeto que não usa `num_3` não ocupa espaço no índice de `num_3`.
3. **Criar objeto não emite DDL.** Nenhum `CREATE INDEX` em tempo de execução, nenhum lock, nenhuma migração — publicar um objeto é `INSERT` em tabela de catálogo.

Orçamento por objeto: **14 campos indexáveis** (4 numéricos, 4 textos, 2 datas, 2 booleanos, 2 referências). Campos não indexáveis são ilimitados — vivem no payload e são exibidos, não filtrados. Objeto que precisa de mais campos filtráveis vai para a camada dedicada, onde tem colunas reais.

O padrão de índice parcial já é o padrão desta base: `finance_entries_client_idx ... where client_id is not null`, `observability_diagnostics_pending_idx ... where resolved_at is null`. Não é técnica nova aqui.

### 5.3 Quem preenche os slots

**A RPC de escrita**, não um trigger.

Trigger que consulta o mapa de slots a cada linha paga um `SELECT` por escrita. A aplicação já conhece a definição — preencher no caminho de escrita é mais barato e mais fácil de depurar.

Escrita direta na tabela é revogada; só a RPC `object_record_upsert` escreve. Isso não é padrão novo: é exatamente o que a VACINA-004 e a VACINA-005 já impõem no restante da plataforma. A garantia contra "alguém escreveu direto e o slot ficou dessincronizado" é a mesma que já protege `post_inventory_movement` e `apply_signed_amendment`.

Validador de CI: nenhuma `grant insert/update` em `object_records` para `authenticated` ou `anon`.

### 5.4 Advisor de varredura e otimização

Micro-problema: um administrador pode declarar 14 campos filtráveis e usar dois, ou declarar zero e filtrar por um campo do payload em varredura sequencial.

Solução simples: o runtime registra, por objeto, quais campos aparecem em filtro e ordenação, com latência observada. O advisor lê esse registro e **propõe**:

- promover campo do payload a slot;
- liberar slot ocioso;
- promover o objeto à camada dedicada.

**Propõe, não executa.** DDL automática em produção é a forma mais confiável de perder um sábado. A proposta vai para a tela de administração com o custo estimado e o efeito esperado.

---

## 6. RLS e permissão sobre dado dinâmico

### 6.1 Micro-problema

Objeto criado em tempo de execução não pode depender de alguém escrever uma política de RLS para ele. Se a proteção depende de um passo humano, existirá objeto desprotegido.

### 6.2 Solução simples: a proteção está na tabela, não no objeto

A camada compartilhada tem **uma** política, escrita uma vez:

```sql
create policy object_records_read on public.object_records
for select using (
  public.has_module_permission(organization_id, module_key, 'READ', project_id, null)
);
```

`has_module_permission(organization_id, module_key, level, project_id, action)` é a mesma função que já protege as 136 tabelas atuais. Objeto novo nasce protegido porque não existe caminho de leitura fora dessa política. Nenhum SQL é sintetizado no caminho de segurança — a superfície de segurança do runtime é **zero linha nova por objeto**.

`module_key` é denormalizado na linha, preenchido pela RPC de escrita, justamente para a política não precisar de subconsulta por linha.

Na camada dedicada, a mesma política vem de um **template** aplicado no `CREATE TABLE` da promoção, e um validador de CI reprova tabela `obj_*` sem RLS habilitada, sem a política do template, ou com `grant` direto a `authenticated`.

### 6.3 A quem o objeto pertence

O objeto declara o `module_key` do aplicativo que ele estende. Um checklist customizado da Qualidade declara `qualidade`. Consequência: **a customização herda o modelo de permissão do módulo que estende**. O administrador não inventa permissão nova, não existe segunda árvore de perfis, e quem já tinha acesso à Qualidade já tem acesso ao objeto — no nível que o perfil dele define.

Objeto que precisa de permissão própria registra-se como módulo no catálogo `app_modules` com chave prefixada (`obj:<key>`), aparecendo nas telas de perfil como qualquer outro aplicativo. É o mesmo catálogo plug-and-play que já existe desde a Etapa 12.1 — sem mecanismo paralelo.

---

## 7. Extensão dos aplicativos padrão

### 7.1 Micro-problema

O jeito óbvio de acrescentar um campo ao cadastro de fornecedor é `ALTER TABLE`. É também o jeito de tornar cada atualização do produto uma negociação com a customização de cada cliente — a dívida que assombra os ERPs customizáveis.

### 7.2 Solução simples: anexar, nunca alterar

A customização **nunca** toca a tabela padrão. Ela cria um objeto com a característica `extensao_de`, cujos registros se ligam ao registro padrão por `(parent_kind, parent_id)`.

- Atualizar o módulo de Compras não toca a extensão da empresa X.
- Remover a extensão não toca o dado padrão.
- A tela padrão renderiza os campos da extensão em uma região reservada, se houver extensão publicada; se não houver, renderiza como sempre renderizou.

`parent_id` não tem chave estrangeira — não há FK que aponte para várias tabelas. Em troca:

- a RPC de escrita valida que o pai existe, é da mesma empresa e é de um tipo permitido;
- uma rotina de reconciliação marca órfãos como arquivados, sem apagar;
- `parent_kind` é um valor de conjunto fechado, validado contra o catálogo de módulos.

Trocar integridade referencial declarativa por validação na RPC é o custo consciente da extensibilidade, e está registrado como risco na seção 12.

---

## 8. Ciclo de vida plug-and-play

### 8.1 Estados

```text
rascunho → publicado → depreciado → arquivado
```

- **Rascunho**: editável livremente, sem dado de produção. Pode ser testado com dado de exemplo isolado.
- **Publicado**: imutável. Aceita dado. Edição gera nova versão.
- **Depreciado**: não aceita registro novo, continua legível e exportável.
- **Arquivado**: sai da navegação. Dado preservado.

### 8.2 Regra inegociável

**Despublicar nunca apaga dado. Não existe `DROP` no ciclo de vida do objeto.**

Desinstalar um objeto é desativar, do mesmo modo que `organization_modules.status` já desativa um aplicativo padrão sem destruir as tabelas dele. Exclusão definitiva de dado é operação administrativa separada, explícita, com confirmação e registro em auditoria.

### 8.3 Migração entre versões

Mudança compatível (campo novo opcional, rótulo, ordem) não exige migração: registros antigos continuam legíveis pela versão deles.

Mudança incompatível (tipo alterado, campo obrigatório novo, campo removido) exige plano de migração explícito, com pré-visualização do efeito sobre N registros antes de aplicar, e é registrada em auditoria. Sem plano, a publicação é recusada.

### 8.4 Exportar e importar objeto

Uma definição publicada exporta como JSON assinado por checksum. Importar em outra empresa recria a definição, nunca o dado. É a base de um catálogo compartilhado no futuro — e a razão de a definição ser imutável e verificável desde agora.

---

## 9. Contratos de performance

Contrato, não aspiração. Cada item é verificável.

| Contrato | Valor | Como se garante |
|---|---|---|
| Listagem paginada de objeto | p95 < 300 ms | índice `(organization_id, object_id, …)` obrigatório |
| Paginação | **keyset**, nunca `OFFSET` | `OFFSET` recusado pela camada de consulta |
| Filtro por campo não indexado | recusado, com mensagem que orienta | validação na montagem da consulta |
| Tamanho do payload | ≤ 64 KB por registro | validação na RPC |
| Campos por objeto | ≤ 200 | validação na publicação |
| Campos indexáveis por objeto | ≤ 14 na camada compartilhada | orçamento de slots |
| Escrita de registro | p95 < 150 ms | RPC única, sem trigger de consulta |

Recusar uma consulta sem índice é deliberado. O modo de falha alternativo — degradar em silêncio até a plataforma inteira ficar lenta por causa de um objeto mal declarado — é pior, e é invisível até ser tarde.

---

## 10. A escada de escala e as três costuras

### 10.1 As três costuras

Escalabilidade não se constrói agora. O que se constrói agora são as três costuras que tornam cada degrau futuro barato. São baratas hoje e caríssimas de retrofitar depois.

1. **Resolver de armazenamento.** Nenhum código de aplicação sabe onde a linha mora. Permite trocar de camada sem tocar em aplicação.
2. **Leitura separada de escrita, desde o primeiro dia**, mesmo apontando as duas para o mesmo banco. No dia da réplica de leitura, é configuração — não caçada por `select` espalhado pelo código.
3. **Nenhuma consulta cruza `organization_id`.** Nenhum join atravessa empresas, nenhuma referência aponta para outra empresa. Já é quase verdade por causa da RLS; formalizado e verificado no CI, é o que torna possível mover uma empresa para outro banco. Sem isso, sharding é reescrita; com isso, é roteamento.

### 10.2 A escada

| Degrau | Quando | Custo |
|---|---|---|
| 0. Um Postgres do Supabase | centenas de empresas | ponto de partida |
| 1. Aumentar o compute | latência subindo | configuração |
| 2. Indexar campo quente | consulta específica lenta | uma migration |
| 3. Promover objeto à camada dedicada | objeto passa do limiar | migração em background, zero aplicação |
| 4. Particionar o dedicado por tempo + arquivamento | livro com anos de histórico | DDL |
| 5. Réplica de leitura | relatório pesado disputando com operação | configuração, graças à costura 2 |
| 6. Empresa grande em banco próprio | um inquilino domina o consumo | roteamento, graças à costura 3 |

Com centenas de empresas, o degrau 6 quase certamente não é alcançado. O desenho não impede chegar lá — é essa a diferença entre uma casa e uma fundação que aguenta virar prédio.

### 10.3 Independência de fornecedor

Nada específico do Supabase no caminho de dado do runtime: é Postgres. Os degraus 5 e 6 dependem do plano contratado; a costura que garante saída é não amarrar o motor a um fornecedor.

---

## 11. Reaproveitamento do que já existe

O Object Runtime não começa do zero. Mapa concreto:

| Peça já pronta | Onde | Papel no Object Runtime |
|---|---|---|
| Runtime de metadados em produção | `quality_form_versions.schema_json`, `lib/quality/database.ts` | precedente validado de definição versionada em jsonb; o padrão é generalizado, não inventado |
| Catálogo plug-and-play | `app_modules`, `organization_modules`, `app_module_dependencies` | objeto publicado registra-se aqui; instalar/desinstalar já funciona |
| Registro estático de módulos | `lib/modules/registry.ts` | contrato de manifesto, rota, categoria e dependência que o objeto passa a preencher |
| Motor de permissão | `has_module_permission(org, module_key, level, project_id, action)` | política única da camada compartilhada e template da dedicada |
| Padrão RPC + revoke | VACINA-004, VACINA-005 | escrita de registro é RPC; escrita direta revogada |
| Normalização de relações | `lib/supabase/relations.ts`, VACINA-001 | leitura de referência entre objetos |
| Pipeline de arquivo | `lib/file-security/`, `secureUpload` | campo do tipo `anexo` reusa quarentena e antimalware, sem caminho novo |
| Auditoria | `audit_events` | característica `auditavel` grava aqui |
| Índice parcial e coluna gerada | migrations das Etapas 15 a 19 | padrão de índice dos slots já é o padrão da base |
| Validadores de CI | `scripts/validate-*.mjs` | invariantes novas entram no mesmo mecanismo |
| Diretriz de interface | `diretrizes/UI-UX-PRO-MAX.md` | o estúdio é interface e obedece à diretriz — não pode parecer construtor de formulário genérico |

Nenhum mecanismo paralelo. Toda peça nova entra por um encaixe que já existe.

---

## 12. Riscos, limites e a primeira fatia

### 12.1 Riscos declarados

| ID | Risco | Severidade | Mitigação |
|---|---|---|---|
| OR-R01 | Inchaço do payload jsonb e pressão de TOAST | média | limite de 64 KB, campos longos fora do payload |
| OR-R02 | Esgotamento do orçamento de slots em objeto legítimo | média | promoção à camada dedicada; advisor sinaliza antes |
| OR-R03 | Ausência de FK em `parent_id` permite órfão | média | validação na RPC, reconciliação periódica, arquivamento em vez de exclusão |
| OR-R04 | Inquilino barulhento degradando a partição vizinha | média | 64 partições, promoção do objeto pesado, degrau 6 na escada |
| OR-R05 | Administrador declara objeto mal modelado e culpa a plataforma | alta | recusa de consulta sem índice, advisor, limites duros e mensagem que orienta |
| OR-R06 | Migração entre versões incompatíveis com perda de dado | alta | pré-visualização obrigatória, imutabilidade da versão publicada, auditoria |
| OR-R07 | Superfície de segurança nova em dado dinâmico | alta | política única e template; validador de CI; sem SQL sintetizado |
| OR-R08 | Estúdio com aparência de construtor genérico | média | `diretrizes/UI-UX-PRO-MAX.md` é obrigatória e prevalece |

### 12.2 Limites conhecidos deste desenho

- Não foi executado. Nenhuma afirmação aqui é medida — os contratos da seção 9 são alvos a verificar, não resultados observados.
- Os limiares numéricos (64 partições, 14 slots, 64 KB, 200 campos) são estimativas fundamentadas, não calibradas com carga real. A primeira fatia deve medir e corrigir.
- O POC de carga do blueprint original mira 100 mil registros — uma ordem de grandeza abaixo do requisito declarado. Qualquer POC deste desenho precisa mirar **milhões**, senão aprova uma arquitetura que quebra em produção.
- A camada dedicada ainda não tem desenho de particionamento por tempo detalhado. É a primeira lacuna a fechar quando o primeiro objeto for promovido.

### 12.3 A primeira fatia

Ordem deliberada: cada item é uma solução simples, verificável isoladamente, e nenhum depende do seguinte.

1. ~~Catálogo (`object_definitions`, `object_definition_versions`, `object_field_slots`) com publicação imutável e checksum.~~ **Feito** — aplicado em 04/08/2026, com rascunho editável em `draft_spec` e escrita só por RPC.
2. ~~Camada compartilhada particionada, com a política única de RLS e os índices de slot.~~ **Feito** — `object_records` em 64 partições por `hash(organization_id)`, uma política de leitura, catorze índices parciais de slot.
3. ~~RPC `object_record_upsert` com preenchimento de slot, validação de payload e revogação de escrita direta.~~ **Feito** — mais o teto de 64 KB, a validação do pai da extensão e a inscrição de seguidor por campo de pessoa.
4. Leitura com paginação keyset e recusa de filtro não indexado. **Falta.**
5. ~~Duas classes apenas: `Cadastro` e `Extensão`.~~ **Feito** desde a migration do catálogo.
6. ~~Estúdio mínimo: criar, publicar, listar — sob a diretriz de interface.~~ **Feito** — `/app/administracao/objetos`, onde a tela pergunta o que a informação faz em vez do tipo.
7. POC de carga com **milhões** de registros antes de qualquer promessa de escala. **Falta** — nenhum número desta implementação foi medido sob carga.

Camada dedicada, advisor, importação, aprovação e demais características ficam para fatias seguintes. A fundação primeiro.

---

## 13. Como esta diretriz é usada

Toda sessão assistida que tocar em objeto dinâmico, estúdio, customização por empresa ou armazenamento de dado declarado:

1. lê este documento antes de propor qualquer coisa;
2. lê `diretrizes/METODO-DE-TRABALHO.md` e aplica a decomposição em micro-problemas;
3. consulta `diretrizes/VACINAS.md` antes de resolver qualquer erro;
4. registra aqui qualquer decisão que contrarie ou complemente o que está escrito, no mesmo PR.

Divergência entre este documento e o código bloqueia a entrega, conforme `diretrizes/PADRAO-DOCUMENTACAO.md`.
