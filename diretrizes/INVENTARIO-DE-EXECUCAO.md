# Inventário de execução — marcos, sprints e tarefas

**Documento canônico:** sim
**Atualizado em:** 25 de julho de 2026
**Verificado por:** `pnpm validate:inventory`

Este arquivo é o **estado vivo do trabalho**. `INVENTARIO.md` inventaria o que a plataforma **é**; este inventaria o que está sendo **feito**.

---

## Regras de operação — obrigatórias

**R1 — Leitura no início.** Toda sessão assistida lê este arquivo antes de propor ou executar qualquer coisa. Reinício de serviço, contêiner novo, chat novo: lê de novo. Não existe "eu já sei o que estava fazendo" — a memória é este arquivo.

**R2 — Check imediato.** Ao concluir uma tarefa ou subtarefa, marcar `[x]` **no mesmo momento**, com a evidência que prova a conclusão. Não acumular checks para o fim da sessão: sessão interrompida com check pendente perde o progresso.

**R3 — Uma sprint por vez.** Não se inicia sprint nova antes de concluir a atual. **No máximo uma sprint em `em andamento`**, e o validador reprova o contrário.

**R4 — O que é novo vai para o fim.** Sprint nova, oportunidade de melhoria ou lacuna descoberta entra **no final do inventário**, com as tarefas e subtarefas dela. Nunca no meio, nunca empurrando a sprint atual.

**R5 — A ordem pode mudar, mas só na virada.** Ao **iniciar** uma sprint nova — nunca no meio de uma — a ordem de execução das sprints pendentes pode ser reordenada. Dois casos legítimos:

- **Pré-requisito descoberto.** Ia começar um aplicativo e percebeu que falta um módulo ou objeto não previsto e necessário: a sprint do pré-requisito passa à frente.
- **Base reaproveitável.** Uma sprint serve de base para reprodução em massa das seguintes: passa à frente porque otimiza todo o trabalho restante.

**R6 — Reordenar exige registro.** Toda reordenação vira linha na tabela da seção "Registro de reordenação", com data, o que mudou e **por quê**. Reordenação sem justificativa registrada é a forma de o plano virar improviso.

**R7 — Sprint concluída não tem tarefa em aberto.** Marcar sprint como `concluída` com tarefa `[ ]` reprova no validador. Se sobrou tarefa, ou a sprint não está concluída, ou a tarefa vira sprint nova no fim (R4).

---

## Estados

| Estado | Significado |
|---|---|
| `pendente` | ainda não iniciada |
| `em andamento` | em execução — no máximo uma por vez |
| `concluída` | todas as tarefas marcadas e evidência registrada |
| `bloqueada` | não pode avançar; o bloqueio está descrito na sprint |

---

# Marco M-0 — Governança e memória de sessão

Objetivo: nenhuma decisão desta plataforma depende de conversa. Um chat novo recupera tudo do repositório.

## Sprint S-01 — Skills versionadas e regras de sessão
**Estado:** concluída
**Marco:** M-0

- [x] T-01.1 — Copiar as skills dos cinco repositórios de origem para `.claude/skills` (45 skills)
- [x] T-01.2 — Registrar procedência, licenças e o que ficou de fora em `.claude/skills/README.md`
- [x] T-01.3 — Excluir `.claude/skills` do `eslint` e do `tsc` — conteúdo de terceiros não é código da plataforma
- [x] T-01.4 — Fixar em `CLAUDE.md` a tabela de skills de acionamento automático
- [x] T-01.5 — Fixar a precedência de `UI-UX-PRO-MAX.md` sobre a skill em caso de divergência
- [x] T-01.6 — Registrar o que não pôde ser instalado e por quê (CLI do Composio, sessão do NotebookLM)

## Sprint S-02 — Método de trabalho e protocolo de vacinas
**Estado:** concluída
**Marco:** M-0

- [x] T-02.1 — Escrever `METODO-DE-TRABALHO.md` com a regra de decomposição em micro-problemas
- [x] T-02.2 — Registrar PoT e paralelismo como execução, não narração
- [x] T-02.3 — Escrever o protocolo de consulta ao catálogo antes de resolver
- [x] T-02.4 — Escrever o protocolo de registro com as cinco perguntas e o modelo de arquivo
- [x] T-02.5 — Escrever o protocolo de substituição de vacina com os dois portões
  - [x] T-02.5.1 — Portão 1, eliminatório: garantia preservada
  - [x] T-02.5.2 — Portão 2: retorno material, com limiar contra troca marginal
  - [x] T-02.5.3 — Prova executável e tipo de evidência declarado (`medida`, `negativa`, `argumento`)
  - [x] T-02.5.4 — Proibição de substituir no mesmo PR da correção barrada
  - [x] T-02.5.5 — Estados `substituída` e `revogada`, nunca apagadas
- [x] T-02.6 — Replicar o protocolo em `VACINAS.md`, que é onde se olha ao resolver erro
- [x] T-02.7 — Fixar a regra de método em `CLAUDE.md`

## Sprint S-03 — Diretriz do Object Runtime
**Estado:** concluída
**Marco:** M-0

- [x] T-03.1 — Decompor o problema em cinco subsistemas e validar o corte com o responsável
- [x] T-03.2 — Estabelecer os parâmetros: centenas de empresas, ≤1000 objetos por empresa, milhões de registros nos livros
- [x] T-03.3 — Descartar geração de código e registrar as quatro razões
- [x] T-03.4 — Escrever `OBJECT-RUNTIME.md` com as 13 seções
  - [x] T-03.4.1 — Modelo conceitual: tipo, característica, classe, objeto, registro
  - [x] T-03.4.2 — Catálogo e versionamento imutável
  - [x] T-03.4.3 — Duas camadas de armazenamento e o resolver
  - [x] T-03.4.4 — Colunas-slot, índices parciais fixos e advisor
  - [x] T-03.4.5 — Política única de RLS reusando `has_module_permission`
  - [x] T-03.4.6 — Extensão dos aplicativos padrão por anexo
  - [x] T-03.4.7 — Ciclo de vida plug-and-play sem `DROP`
  - [x] T-03.4.8 — Contratos de performance verificáveis
  - [x] T-03.4.9 — Escada de escala e as três costuras
  - [x] T-03.4.10 — Mapa de reaproveitamento do que já existe
  - [x] T-03.4.11 — Riscos, limites declarados e primeira fatia
- [x] T-03.5 — Registrar que nada foi executado e que os números são estimativas não calibradas

## Sprint S-04 — Ponto de entrada e inventário de execução
**Estado:** concluída
**Marco:** M-0

- [x] T-04.1 — Escrever `LEIA-PRIMEIRO.md` mapeando skills, vacinas, blueprint, executable spec, Object Runtime e ordem de leitura
- [x] T-04.2 — Escrever este inventário com marcos, sprints, tarefas e as regras R1 a R7
- [x] T-04.3 — Escrever `scripts/validate-inventory.mjs` que reprova violação das regras estruturais
  - [x] T-04.3.1 — No máximo uma sprint `em andamento`
  - [x] T-04.3.2 — Sprint `concluída` sem tarefa em aberto
  - [x] T-04.3.3 — Toda sprint com estado válido e ao menos uma tarefa
  - [x] T-04.3.4 — Identificadores de sprint únicos
- [x] T-04.4 — Registrar `LEIA-PRIMEIRO.md` e este arquivo no validador de documentação e no `README.md` de `diretrizes/`
- [x] T-04.5 — Apontar `CLAUDE.md` para `LEIA-PRIMEIRO.md` como primeira leitura obrigatória e fixar as regras do inventário
- [x] T-04.6 — **Publicar no GitHub.** As diretrizes estão em `claude/diretrizes-object-runtime`, sobre `feature/etapa-20-prontidao-producao`. As 45 skills de `.claude/skills` seguem fora deste ramo, em entrega separada ainda não publicada
- [x] T-04.7 — Incorporar ao repositório o blueprint e a executable spec recebidos por ZIP, com os defeitos verificados anotados
  - [x] T-04.7.1 — Varrer o pacote por credencial antes de publicar: três URLs de banco encontradas, todas placeholder (`postgres:postgres@localhost`, `change-me`, `REPLACE_WITH_LOCAL_SECRET`)
  - [x] T-04.7.2 — Copiar os 605 arquivos para `docs/referencias/innovar-loop-95`
  - [x] T-04.7.3 — Isolar do `eslint`, do `tsc` e do `vitest` — é referência, não código da plataforma
  - [x] T-04.7.4 — Reverificar os seis defeitos contra os arquivos e registrar em `ANOTACOES-DE-VERIFICACAO.md` com caminho e linha

---

# Marco M-1 — Fundação do Object Runtime

Objetivo: a fundação que aguenta virar prédio. Nenhuma funcionalidade de estúdio antes de a fundação estar medida.

## Sprint S-05 — Catálogo de definições
**Estado:** concluída
**Marco:** M-1

- [x] T-05.1 — Migration de `object_definitions`, `object_definition_versions` e `object_field_slots`
  - [x] T-05.1.1 — `scope` com `organizacao` e `projeto`, para a plataforma servir a qualquer tipo de empresa
  - [x] T-05.1.2 — Índices de catálogo e verificação embutida na própria migration
- [x] T-05.2 — Imutabilidade da versão publicada, com `checksum` do `spec`
  - [x] T-05.2.1 — Guarda no banco: `update` e `delete` em versão publicada levantam exceção
  - [x] T-05.2.2 — Lógica pura de serialização canônica, impressão digital, alocação de slot e validação (`lib/object-runtime/spec.ts`), com 24 testes
  - [x] T-05.2.3 — RPC `publish_object_definition`: calcula o checksum, grava a versão e projeta os slots numa transação
  - [x] T-05.2.4 — Republicar a mesma especificação não cria versão nova
  - [x] T-05.2.5 — Nomes distintos para os dois valores: `specFingerprint` é local, `object_runtime_spec_checksum` é o da versão publicada. Formas canônicas diferentes, para ninguém comparar os dois
- [x] T-05.3 — RLS do catálogo por `organization_id` e permissão de administração
  - [x] T-05.3.1 — Política única por operação reusando `has_module_permission`
  - [x] T-05.3.2 — `revoke` de escrita direta de `anon` e `authenticated`, no padrão da VACINA-004
- [x] T-05.4 — Validador de CI: projeção de slots coerente com o `spec`
  - [x] T-05.4.1 — A projeção é derivada pelo banco a partir do `spec`, nunca recebida pronta — não existe caminho em que os dois divirjam
  - [x] T-05.4.2 — `validate:object-runtime` compara orçamento e mapa de tipos entre SQL e TypeScript
  - [x] T-05.4.3 — Verifica RLS forçada, revogação de escrita direta, guarda de imutabilidade e `search_path` fixo
  - [x] T-05.4.4 — Exercitado em seis estados: cinco sabotagens reprovadas, íntegro aprovado
- [x] T-05.5 — Testes: publicar, republicar, tentar alterar versão publicada
  - [x] T-05.5.1 — Fixture mínima com os pré-requisitos de fronteira (`supabase/tests/object-runtime/fixture.sql`)
  - [x] T-05.5.2 — 14 testes de comportamento mais o de privilégio, executados contra PostgreSQL 16 real
  - [x] T-05.5.3 — O executor exige confirmação explícita dos testes: sem banco ele declara que não rodou, em vez de passar calado
  - [x] T-05.5.4 — Workflow `object-runtime-db.yml` com serviço PostgreSQL, para o teste rodar no CI
  - [x] T-05.5.5 — Três sabotagens confirmam que a bateria reprova: imutabilidade desativada, republicação não idempotente e mapa de tipos alterado

## Sprint S-06 — Camada compartilhada, RLS e índices de slot
**Estado:** pendente
**Marco:** M-1

- [ ] T-06.1 — `object_records` particionada por `HASH(organization_id)` em 64 partições
- [ ] T-06.2 — Colunas-slot e os índices parciais fixos com predicado `IS NOT NULL`
- [ ] T-06.3 — Política única de RLS chamando `has_module_permission`
- [ ] T-06.4 — Validador de CI: nenhuma tabela de objeto sem RLS e sem a política do template
- [ ] T-06.5 — Testes negativos: leitura entre empresas, leitura sem permissão de módulo, leitura por obra sem acesso à obra

## Sprint S-07 — Escrita por RPC e revogação de escrita direta
**Estado:** pendente
**Marco:** M-1

- [ ] T-07.1 — RPC `object_record_upsert` com preenchimento de slot e validação de payload
- [ ] T-07.2 — Revogar `insert`/`update`/`delete` diretos de `anon` e `authenticated`
- [ ] T-07.3 — Limites duros: 64 KB de payload, 200 campos, 14 slots
- [ ] T-07.4 — Validador de CI para a revogação, no padrão da VACINA-004
- [ ] T-07.5 — Testes negativos de escrita direta e de estouro de limite

## Sprint S-08 — Leitura, paginação keyset e recusa de filtro sem índice
**Estado:** pendente
**Marco:** M-1

- [ ] T-08.1 — Camada de consulta com paginação keyset; `OFFSET` recusado
- [ ] T-08.2 — Recusa de filtro por campo não indexado, com mensagem que orienta
- [ ] T-08.3 — Resolver de armazenamento, com leitura separada de escrita desde o início (costura 2)
- [ ] T-08.4 — Validador: nenhuma consulta do runtime cruza `organization_id` (costura 3)
- [ ] T-08.5 — Testes de contrato de performance com dado sintético

## Sprint S-09 — Classes `Cadastro` e `Extensão`
**Estado:** pendente
**Marco:** M-1

- [ ] T-09.1 — Características `auditavel`, `arquivavel` e `extensao_de`
- [ ] T-09.2 — Vínculo `(parent_kind, parent_id)` com validação na RPC
- [ ] T-09.3 — Rotina de reconciliação de órfãos, arquivando sem apagar
- [ ] T-09.4 — Testes de extensão sobre um aplicativo padrão real

## Sprint S-10 — Estúdio mínimo
**Estado:** pendente
**Marco:** M-1

- [ ] T-10.1 — Telas de criar, publicar e listar objeto, sob `UI-UX-PRO-MAX.md`
- [ ] T-10.2 — Renderização do objeto publicado: lista, detalhe e formulário
- [ ] T-10.3 — Região reservada nas telas padrão para campos de extensão
- [ ] T-10.4 — Testes de componente e de navegação

## Sprint S-11 — POC de carga com milhões de registros
**Estado:** pendente
**Marco:** M-1

- [ ] T-11.1 — Gerador de carga: centenas de empresas, milhares de objetos, milhões de registros no objeto pesado
- [ ] T-11.2 — Medir os contratos da seção 9 do `OBJECT-RUNTIME.md`
- [ ] T-11.3 — Calibrar os números estimados: 64 partições, 14 slots, 64 KB, 200 campos
- [ ] T-11.4 — Registrar o resultado no `OBJECT-RUNTIME.md`, corrigindo o que a medição contrariar

---

# Marco M-2 — Customização completa

## Sprint S-12 — Camada dedicada e promoção sem downtime
**Estado:** pendente
**Marco:** M-2

- [ ] T-12.1 — Template de `CREATE TABLE` dedicada com RLS aplicada na criação
- [ ] T-12.2 — Particionamento por tempo para objeto temporal
- [ ] T-12.3 — Promoção em seis passos, reversível até a virada do resolver
- [ ] T-12.4 — Testes de promoção com verificação de contagem e amostragem

## Sprint S-13 — Advisor de varredura e otimização de índice
**Estado:** pendente
**Marco:** M-2

- [ ] T-13.1 — Registro de uso por objeto: campos filtrados, ordenados e latência
- [ ] T-13.2 — Propostas de promoção de campo a slot, liberação de slot ocioso e promoção de camada
- [ ] T-13.3 — Tela de administração com custo estimado — propõe, nunca executa

## Sprint S-14 — Demais características
**Estado:** pendente
**Marco:** M-2

- [ ] T-14.1 — `versionavel` e `aprovavel`
- [ ] T-14.2 — `anexavel` reusando `secureUpload` e o pipeline de quarentena
- [ ] T-14.3 — `georreferenciado`, `numerado`, `comentavel`
- [ ] T-14.4 — `importavel` e `exportavel`, sujeitas à permissão de exportação
- [ ] T-14.5 — Classes `Documento`, `Registro de campo` e `Lançamento`

## Sprint S-15 — Migração entre versões de definição
**Estado:** pendente
**Marco:** M-2

- [ ] T-15.1 — Classificar mudança compatível e incompatível
- [ ] T-15.2 — Pré-visualização obrigatória do efeito sobre N registros antes de aplicar
- [ ] T-15.3 — Recusar publicação de mudança incompatível sem plano
- [ ] T-15.4 — Registro em auditoria

---

# Marco M-3 — Escala e produto público

## Sprint S-16 — Réplica de leitura
**Estado:** pendente
**Marco:** M-3

- [ ] T-16.1 — Apontar a leitura do resolver para réplica
- [ ] T-16.2 — Política de consistência para leitura logo após escrita
- [ ] T-16.3 — Medir o efeito sobre os relatórios pesados

## Sprint S-17 — Roteamento multi-banco
**Estado:** pendente
**Marco:** M-3

- [ ] T-17.1 — Verificar que nenhuma consulta cruza `organization_id`
- [ ] T-17.2 — Roteamento por empresa no resolver
- [ ] T-17.3 — Procedimento de mudança de empresa entre bancos

## Sprint S-18 — Exportar, importar e catálogo compartilhado
**Estado:** pendente
**Marco:** M-3

- [ ] T-18.1 — Exportar definição publicada como JSON com checksum
- [ ] T-18.2 — Importar definição em outra empresa, recriando definição e nunca dado
- [ ] T-18.3 — Catálogo compartilhado de objetos entre empresas

---

# Pendências herdadas

Vindas da auditoria APEX da Etapa 20. Entram no fim conforme R4; sobem de posição quando bloquearem algo.

## Sprint S-19 — Fechamento dos riscos residuais da Etapa 20
**Estado:** pendente
**Marco:** M-0

- [ ] T-19.1 — RSK-0002: verificar a CSP aplicada em navegador, nas telas de assinatura, documentos e diário
- [ ] T-19.2 — RSK-0003: aplicar em homologação a migration `20260725120000_stage20_atomic_access_counters_and_cleanup.sql`
- [ ] T-19.3 — RSK-0001: dimensionar `clamd` para 150 MB (`StreamMaxLength`, `MaxScanSize`) antes do go-live
- [ ] T-19.4 — RSK-0004 e FND-0001: decidir o fim da política transitória da VACINA-008
- [ ] T-19.5 — FND-0011 e RSK-0005: fixar ações de CI por SHA, junto com a atualização da VACINA-006 e do validador

---

# Marco M-4 — Generalização do produto

Descoberto durante a S-05, ao decidir que o objeto dinâmico aceita escopo por projeto. Entra no fim conforme a regra R4.

A plataforma nasceu com vocabulário de construção civil. Para servir a qualquer tipo de empresa — prestação de serviços, indústria, manutenção — o vocabulário precisa deixar de ser premissa. **O diário de obras passa a ser um módulo entre outros**, não o eixo do produto.

## Sprint S-20 — Biblioteca de vocabulário e presets de segmento
**Estado:** pendente
**Marco:** M-4

Medição feita antes de planejar, em 25 de julho de 2026: 186 ocorrências de "obra" em `.tsx`, 78 em `.ts`, 16 tabelas com nome de domínio e 22 chaves de módulo.

O número que decide o desenho é outro: **os nomes físicos já são neutros.** `projects`, `project_tasks`, `project_milestones`, `daily_logs` são termos genéricos; só `work_breakdown_items` carrega jargão. O que é específico de construção é o **texto exibido** e alguns módulos — não o schema. Isso transforma a sprint de reescrita em camada de tradução.

**Decisão do responsável, 25 de julho de 2026:** o termo **"obra" é substituído por "projeto"**, e a regra vale para todo termo de segmento encontrado — quanto mais genérico e aplicável a áreas diversas, melhor. O padrão da plataforma passa a ser genérico; construção civil deixa de ser a premissa e vira, quando houver preset, uma especialização opcional.

Medição de 25 de julho de 2026, feita antes de planejar. As ocorrências não custam o mesmo, e é isso que separa o que muda do que não muda:

| Onde | Ocorrências | Risco | Decisão |
|---|---|---|---|
| Texto exibido em `.tsx` | 186 | baixo | **trocar** — é o que o usuário vê |
| Sigla `FVS` | 43 | baixo | **trocar** por "verificação de serviço" |
| Sigla `FVM` | 49 | baixo | **trocar** por "verificação de materiais" |
| Rótulo "Diário de Obras" | 4 | baixo | **trocar** por "Diário de campo" |
| `'obras'` como `module_key` em SQL | 30, em 8 arquivos | **alto** | **não trocar** |
| `"obras"` como chave em TypeScript | 10 | alto | **não trocar** |
| Rotas `/app/obras`, `/cliente/obras`, `/app/relatorios/obras` | 3 diretórios | médio | **não trocar agora** |

Os 30 literais `'obras'` estão dentro de policies de RLS e RPCs **já aplicadas em produção**. Trocar a chave exigiria reescrever migration aplicada — o que a VACINA-003 proíbe — ou uma migration transversal no núcleo de permissão. É identificador interno: o usuário nunca vê, e trocá-lo tem custo alto e ganho zero para ele. A rota segue a mesma lógica: URL é identificador, e quem tem `/app/obras` salvo não deve perder o link porque a empresa dele é de manutenção predial.

Vale notar que trocar o rótulo para "Projeto" **aproxima** a interface do esquema, que já se chama `projects`, `project_tasks` e `project_milestones`. A troca reduz divergência entre o que o usuário lê e o que o banco guarda; não cria dívida nova.

- [ ] T-20.1 — **Não renomear tabela, coluna, chave de módulo nem rota.** Registrar a decisão com os números acima
- [ ] T-20.2 — Biblioteca de vocabulário: catálogo de termos por organização
  - [ ] T-20.2.1 — Tabela de termos com chave, singular, plural e gênero
  - [ ] T-20.2.2 — Resolução com precedência: termo da empresa → termo do preset → termo padrão
  - [ ] T-20.2.3 — Hook e utilitário de servidor para consumir termo, sem consulta por componente
- [ ] T-20.3 — Presets de segmento
  - [ ] T-20.3.1 — Preset é conjunto de termos mais módulos habilitados por padrão
  - [ ] T-20.3.2 — Construção civil como preset, não como padrão implícito
  - [ ] T-20.3.3 — Prestação de serviços e manutenção como segundo e terceiro presets
  - [ ] T-20.3.4 — Preset aplicado na criação da empresa, reusando `app_modules.default_enabled` e `organization_modules`
- [ ] T-20.4 — Substituir o vocabulário exibido pelo genérico
  - [ ] T-20.4.1 — "Obra" e "Obras" passam a "Projeto" e "Projetos" nos 186 pontos de `.tsx`
  - [ ] T-20.4.2 — Nome e descrição dos módulos em `app_modules` e em `lib/modules/registry.ts`, sem tocar na chave
  - [ ] T-20.4.3 — "Diário de Obras" passa a "Diário de campo"
  - [ ] T-20.4.4 — `FVS` e `FVM` passam a "verificação de serviço" e "verificação de materiais", sem sigla de segmento
  - [ ] T-20.4.5 — Textos de formulário, tabela, estado vazio e mensagem de erro
  - [ ] T-20.4.6 — Varredura final por termo de segmento remanescente, com validador de CI
- [ ] T-20.5 — Módulos específicos de segmento continuam existindo, como opcionais
  - [ ] T-20.5.1 — `diario` publicado como diário de campo, com rótulo do preset
  - [ ] T-20.5.2 — Termos próprios da qualidade da construção (PO, FVS, FVM) tratados como vocabulário do preset, não como conceito do núcleo
- [ ] T-20.6 — Regra permanente: nenhum termo de segmento em `lib/object-runtime`
  - [ ] T-20.6.1 — Conferir que a biblioteca de tipos e características já é neutra
  - [ ] T-20.6.2 — Validador de CI que reprova jargão de segmento em código de núcleo
- [ ] T-20.7 — Atualizar `SPEC.md`, `MODULOS.md` e `UI-UX-PRO-MAX.md`: a plataforma deixa de se definir por construção civil

---

## Sprint S-21 — Reconciliação do ledger de migrations com a homologação
**Estado:** concluída
**Marco:** M-0

Descoberto em 25 de julho de 2026, ao testar a conexão com o Supabase. Entra no fim conforme a regra R4.

**Três migrations estão aplicadas em homologação e não existem no repositório:**

| Versão | Nome |
|---|---|
| `20260721220507` | `stage19_1_module_dependency_reconciliation` |
| `20260721220509` | `stage19_1_observability_detail_parity` |
| `20260721221145` | `stage19_1_audit_rls_policy_consolidation` |

A divergência é na direção perigosa: existe mudança de esquema no banco sem fonte no repositório. Um ambiente reconstruído a partir da `main`, seguindo `RECUPERACAO.md`, **não teria essas três** — e a política de recuperação do projeto afirma que o projeto pode ser recuperado sem depender de nada fora do repositório.

Na outra direção, três migrations do repositório não estão aplicadas em homologação: `20260722104500`, `20260723062000` e `20260723104500`. Essa parte já era conhecida pela auditoria da Etapa 20 (RSK-0003).

Consulta ao catálogo antes de resolver, conforme o protocolo: a causa raiz **já está catalogada** como `VACINA-003` — "ledger local de migrations diverge do Supabase remoto". A prevenção registrada, porém, não cobre este caso: `scripts/validate-supabase-migrations.mjs` compara o diretório local contra uma **lista fixa de quatro arquivos da Etapa 17**, congelada quando a vacina foi escrita. É um retrato, não uma comparação. O remoto andou depois disso e o validador não tem como perceber.

- [x] T-21.1 — Obter o conteúdo real das três migrations aplicadas
  - [x] T-21.1.1 — `supabase_migrations.schema_migrations` guarda a coluna `statements`: o SQL original foi recuperado, não reconstruído por engenharia reversa
- [x] T-21.2 — Trazê-las para `supabase/migrations` com o mesmo carimbo de versão, sem reescrever histórico aplicado
  - [x] T-21.2.1 — Conferência por `sha256` em vez de leitura: os três arquivos batem byte a byte com o que está aplicado (`9f3435ee…`, `ce2bf7af…`, `516a8458…`)
- [x] T-21.3 — Verificar, por execução, se aplicar o repositório inteiro em base limpa produz o esquema da homologação. **Verificado e refutado.** Fechar a lacuna é escopo da S-22, tarefas T-22.3 e T-22.4
  - [x] T-21.3.1 — Comparação por objeto para os três casos: a homologação tem 12 ramos em `get_observability_event_detail`, 21 dependências de módulo e 1 policy em `audit_events`; os arquivos importados produzem exatamente isso
  - [x] T-21.3.2 — Provado que a importação era necessária: sem ela o repositório reconstrói a função com **3 ramos em vez de 12** — nove origens do fluxo unificado passariam a responder "Origem de evento inválida" — e cria **14 das 21** dependências de módulo
  - [x] T-21.3.3 — Replay completo executado. `scripts/run-migration-replay.mjs` cria base limpa, aplica o bootstrap de fronteira e replica as migrations em ordem. **Resultado: 0 de 111.** Para no primeiro arquivo, `20260719214500_stage10_homologation_hardening.sql`, com `function public.touch_updated_at() does not exist`
- [x] T-21.6 — **Hipótese de renumeração testada e REFUTADA.** Comparação por `sha256` de todas as 143 versões remotas contra os 111 arquivos: **zero** casam por conteúdo sob outro nome. Das 41 que casam por carimbo, só 4 têm conteúdo idêntico. As 16 do estoque trazem o marcador explícito `-- Ledger reparado: DDL aplicado remotamente em partes durante a homologação` e têm o DDL preservado no repositório; essas estão certas. Sobram **102 versões com SQL real, 412.566 caracteres, sem arquivo no repositório**
- [x] T-21.7 — **Descrição correta do achado.** A divergência é maior do que "três migrations ausentes": apenas **41 das 143** versões remotas correspondem a nome de arquivo do repositório. 102 versões remotas não têm arquivo e 70 arquivos não constam do ledger remoto. O padrão indica renumeração histórica das migrations, e não 102 ausências reais — a VACINA-003 já registra um caso desses na Etapa 17. Confirmar objeto a objeto, sem presumir nenhuma das duas hipóteses
- [x] T-21.8 — Ferramenta de evidência entregue: `scripts/run-migration-replay.mjs` e `supabase/tests/replay/bootstrap.sql`, com `pnpm test:db:replay`. Sem PostgreSQL acessível o script declara que não rodou, em vez de sair zero calado
- [x] T-21.9 — Escopo remanescente transferido para a S-22, por exigência das próprias regras: a substituição da VACINA-003 precisa de PR próprio (protocolo de vacinas) e a aplicação em homologação depende de aval do responsável

---

## Sprint S-22 — Reconstruir a capacidade de recuperação do repositório
**Estado:** pendente
**Marco:** M-0

Descoberto em 25 de julho de 2026, ao executar o replay pedido pela T-21.3.3. Entra no fim conforme a R4, porque é ordem de grandeza maior do que a S-21 e não cabe nela.

**O repositório não reconstrói o banco. Replay em base limpa: 0 de 111 migrations.**

> **Medição refeita em 3 de agosto de 2026, com PostgreSQL 16 subido para isso: 0 de 150.**
> Falha na primeira migration aplicada, em `20260719214500_stage10_homologation_hardening.sql`,
> por `function public.touch_updated_at() does not exist`. Quarenta dias depois, o que mudou foi
> o denominador. `has_module_permission` continua sendo chamada por 346 trechos de migration e
> criada por nenhum; a única definição no repositório é um dublê de teste que sempre concede.
> Registrado também em `diretrizes/mapa-do-codigo.debito.json` e na VACINA-056.

O achado central é este:

> **`has_module_permission` não existe em nenhum arquivo do repositório.** É a função no centro do modelo de autorização, chamada por **41 dos 111** arquivos de migration, e a definição dela só existe dentro do banco de homologação.

`diretrizes/RECUPERACAO.md` afirma que o projeto pode ser recuperado a partir do GitHub, sem depender de conversa, contêiner ou máquina local. **Hoje isso não se cumpre**, e nada no CI detectava a diferença.

Dois modos de falha distintos, que pedem soluções distintas:

1. **Ordem.** Arquivos de endurecimento têm carimbo anterior ao dos arquivos que criam o que eles endurecem — `20260719214500_stage10_homologation_hardening` altera `touch_updated_at`, criada em `20260719230000_stage9_financial_contracts`, e `apply_signed_amendment`, criada em `20260719234000_stage9_apply_amendment`. Aplicados em ordem de nome, quebram.
2. **Ausência.** 102 versões com SQL real aplicadas em homologação sem arquivo correspondente, incluindo o núcleo de permissão.

- [ ] T-22.1 — Recuperar as 102 migrations a partir de `supabase_migrations.schema_migrations.statements`, que guarda o SQL original
- [ ] T-22.2 — Definir a ordem de aplicação correta, sem reescrever carimbo de migration já aplicada
- [ ] T-22.3 — `pnpm test:db:replay` verde: 100% das migrations aplicando em base limpa
- [ ] T-22.4 — Comparar o esquema reconstruído com o da homologação, objeto a objeto — tabelas, colunas, funções, policies, índices e privilégios
- [ ] T-22.5 — Completar o bootstrap de fronteira conforme o replay for descobrindo lacunas, distinguindo defeito da fixture de defeito do repositório
- [ ] T-22.6 — Ligar o replay ao CI, para que a promessa de recuperação passe a ser verificada a cada mudança e não uma vez por descoberta. **Pré-requisito já feito:** `--exigir` faz o script reprovar quando o banco falta, em vez de sair 0 dizendo que não rodou (VACINA-056) — sem isso, ligar ao CI produziria um passo verde que não verifica nada
- [ ] T-22.7 — Propor a substituição da prevenção da VACINA-003: comparação viva contra o ledger remoto e replay executável, no lugar da lista fixa de quatro arquivos
  - [ ] T-22.7.1 — Portão 1, eliminatório: cobre a mesma causa raiz com garantia maior — detecta divergência em qualquer direção, e não só nos quatro arquivos congelados
  - [ ] T-22.7.2 — Portão 2: retorno material — a detecção atual é zero para tudo criado depois da vacina, e deixou passar 102 migrations
  - [ ] T-22.7.3 — Tipo de evidência: `negativa` — provar que a divergência de hoje seria detectada
  - [ ] T-22.7.4 — **PR próprio**, separado da correção que a motivou
- [ ] T-22.8 — Aplicar em homologação as migrations pendentes do repositório, incluindo as duas do Object Runtime. Escrita em ambiente compartilhado: depende de aval do responsável
- [x] T-22.9 — Revisar `RECUPERACAO.md`: aviso de estado verificado no topo, com o resultado do replay e as duas causas medidas, e `pnpm test:db:replay` acrescentado às regras inegociáveis do passo de reconstrução do banco
- [ ] T-22.10 — Revisar `README.md`, que afirma na abertura que o repositório basta para recuperar o projeto: enquanto o replay não passar, o documento precisa dizer o que realmente é possível hoje

---

# Marco M-5 — Padrão de interface de mercado

Aberto em 26 de julho de 2026, a partir de revisão do responsável sobre telas reais em produção. Entra no fim conforme a R4.

O diagnóstico foi direto: *"os módulos são rascunhos mal feitos, o pipeline é estático, muito amador"*. A verificação confirmou cada ponto — não é impressão.

## Sprint S-23 — Fundação de interface: validação, visualizações e pipeline
**Estado:** em andamento
**Marco:** M-5

### Defeitos verificados

| # | Defeito | Evidência |
|---|---|---|
| D1 | Nenhuma validação de CPF, CNPJ, CEP ou telefone | `app/actions/relationship.ts` grava `optional(data,"taxId")` sem validar; os campos são `<input name="taxId"/>` puro. Aceito em produção: CPF `3332227772` (10 dígitos), telefone `12982#2($($`, CEP `Usushe` |
| D2 | Erro de banco vazando cru para o usuário | Tela de Documentos exibe `Could not embed because more than one relationship was found for 'project_documents' and 'project_document_versions'` — embed ambíguo do PostgREST sem dica de chave estrangeira |
| D3 | Mensagem de erro que engana | Falha de configuração aparece como "Credenciais inválidas ou conta não liberada" na tela de login |
| D4 | Uma única visualização por módulo | Tudo é tabela. Não há kanban, calendário, gantt, pivô nem gráfico em lugar nenhum |
| D5 | Pipeline estático | Não é possível arrastar cartão entre etapas; a trilha do cliente não é navegável |
| D6 | Planejamento sem cronograma | Não há Gantt nem linha do tempo, apesar de existirem `project_milestones` e `work_breakdown_items` no banco |
| D7 | Orçamento não recebe dados | Não há caminho de inserção de item de custo; a tela abre zerada e permanece zerada |
| D8 | `favicon.ico` retorna 404 | Console do navegador |

### Padrão de mercado — pesquisa de 26 de julho de 2026

Fonte primária: documentação do **Odoo 19.0**, lida do repositório oficial `odoo/documentation`, arquivo `content/applications/studio/views.rst`. O site `odoo.com` recusa leitura automatizada com 403; o conteúdo veio do fonte, não de blog de terceiro.

O Odoo organiza **um mesmo registro em várias visualizações**, e o usuário troca entre elas:

| Categoria | Visualizações | Para quê |
|---|---|---|
| Gerais | Formulário, Atividade, Busca | editar um registro; agendar e acompanhar; filtrar e agrupar sobre qualquer outra visão |
| Múltiplos registros | **Lista**, **Kanban**, Mapa | tabela com edição em massa; cartões por etapa — *"often used to support business flows by moving records across stages"*; geográfico |
| Linha do tempo | **Calendário**, **Gantt**, Cohort | cronologia; previsão com barras em escala de tempo; ciclo de vida e retenção |
| Relatório | **Pivô**, **Gráfico** | *"explore and analyze the data contained in records in an interactive manner"*; barras, linhas, pizza |

Do Pipedrive, o consenso de mercado é que o ganho está no **arrastar e soltar entre colunas** e na organização por atividade que move a venda — pipeline visual como ferramenta de trabalho, não como relatório.

### O padrão que a plataforma adota

- [x] T-23.1 — **Validação de dados brasileiros**, com máscara na entrada e verificação de dígito
  - [x] T-23.1.1 — CPF e CNPJ com dígito verificador por módulo 11, não só formato (`lib/validacao/br.ts`)
  - [x] T-23.1.2 — CEP com formato de 8 dígitos
  - [x] T-23.1.2b — CEP com consulta de endereço por `/api/cep`, executada no servidor por causa da CSP; preenche só campo vazio e nunca bloqueia o cadastro se o serviço cair
  - [x] T-23.1.3 — Telefone com DDD de lista fechada e nono dígito do celular
  - [x] T-23.1.4 — E-mail mais estrito que `type="email"`, que aceita `a@b`
  - [x] T-23.1.5 — Guarda de servidor `checarCamposBR` em `createCrmLead`, `createRelationshipClient` e `updateRelationshipClient`
  - [x] T-23.1.6 — Erro inline no campo, com `aria-invalid` e `aria-describedby`
  - [x] T-23.1.7 — Máscara progressiva que nunca descarta dígito
  - [x] T-23.1.8 — Verificado em navegador com os dados exatos das capturas: recusados, e zero registros gravados
  - [x] T-23.1.9 — `CampoDocumento`, `CampoTelefone`, `CampoCEP` e `CampoEmail` substituem `<input>` cru em novo cliente, detalhe do cliente e novo lead
  - [x] T-23.1.10 — Verificado em navegador: máscara produz `529.982.247-25` e `(12) 98216-7788`; CPF de 10 dígitos e CEP de 7 dígitos acendem erro no próprio campo
  - [x] T-23.1.11 — `validarCPF` conferido contra implementação independente de referência: 4.000 CPFs, zero divergência
  - [x] T-23.1.12 — Regra de "dígitos iguais" restringida a CPF e CNPJ; no CEP só zeros são barrados, senão a consulta não conseguiria dizer se o CEP existe
  - [x] T-23.1.13 — Verificado em navegador: CEP `12420010` preencheu `Avenida Nossa Senhora do Bom Sucesso`, `Pindamonhangaba` e `SP`
- [ ] T-23.2 — **Seletor de visualização** por módulo, no padrão do Odoo
  - [ ] T-23.2.1 — Lista com ordenação, agrupamento e edição em massa
  - [ ] T-23.2.2 — Kanban com colunas por etapa e arrastar e soltar
  - [ ] T-23.2.3 — Calendário para o que tem data
  - [ ] T-23.2.4 — Gantt para planejamento e cronograma
  - [ ] T-23.2.5 — Pivô e gráfico para os módulos de análise
- [ ] T-23.3 — **Painel de controle padrão**: caminho de navegação, seletor de visão, busca com filtros e agrupamentos salvos, ações em massa
- [ ] T-23.4 — **Formulário padrão**: barra de etapas clicável no topo, ação primária destacada, abas para seções longas, e painel lateral de conversa — mensagens, notas internas, atividades agendadas, anexos e seguidores
- [ ] T-23.5 — **Pipeline do CRM navegável**: cartão com valor, cliente, responsável, prazo e etiqueta; arrastar muda a etapa; soma e contagem por coluna
- [ ] T-23.6 — **Planejamento com cronograma**: Gantt sobre `work_breakdown_items` e `project_milestones`, que já existem no banco
- [ ] T-23.7 — **Orçamento operável**: inserir, editar e remover item de custo, com recálculo de BDI, markup e preço
- [ ] T-23.8 — Corrigir D2, D3 e D8
- [ ] T-23.9 — Aplicar `diretrizes/UI-UX-PRO-MAX.md` e a skill `ui-ux-pro-max` em cada tela refeita
- [x] T-23.10 — Escrever `diretrizes/PADRAO-DE-INTERFACE.md` com o padrão extraído das fontes oficiais, o catálogo de visualizações, a estrutura de formulário, os componentes de campo e o Definition of Done de módulo
- [ ] T-23.11 — Ordem de adoção: componentes de campo primeiro, CRM como piloto, demais módulos replicando o molde com o vocabulário da S-20 na mesma passagem
- [x] T-23.12 — **Fundação de dados do pipeline**: trilha, etapa, cartão, datas, marcadores, observações e histórico — etapa é dado, não esquema
  - [x] T-23.12.1 — Taxonomia de datas decomposta em dois eixos, natureza × marco, com as dez siglas declaradas derivadas da combinação (`lib/pipeline/datas.ts`, 13 testes)
  - [x] T-23.12.2 — Esquema com as nove tabelas, chaves compostas que herdam organização e trilha por integridade referencial, e RLS forçada em todas (`supabase/migrations/20260726120000_pipeline_trilhas.sql`)
  - [x] T-23.12.3 — Presets com as duas listas declaradas pelo responsável — projeto e assistência —, mais a trilha comercial do cliente, instaláveis por RPC (`supabase/migrations/20260726123000_pipeline_presets.sql`)
  - [x] T-23.12.4 — Cada etapa declara que datas exibe e quais exige; toda etapa exibe previsto e efetivo de início e término, que é o que alimenta o Gantt da T-23.6
  - [x] T-23.12.5 — Histórico de etapa escrito só por gatilho, com escrita direta revogada — é o que responde "há quanto tempo está parado aqui"
  - [x] T-23.12.6 — 21 testes de comportamento + RLS + privilégio contra PostgreSQL real, em banco limpo (`pnpm test:db:pipeline`); sabotagem do CHECK de origem reprova o TESTE 8
  - [x] T-23.12.7 — `pnpm validate:pipeline` cruza as siglas do banco com as do TypeScript e recusa jargão de segmento em CHECK; ligado ao CI
- [x] T-23.13 — **Kanban e lista do pipeline**, sobre os mesmos dados e o mesmo filtro
  - [x] T-23.13.1 — Seletor de visualização kanban ↔ lista sem recarregar a página (`components/pipeline/pipeline-view.tsx`)
  - [x] T-23.13.2 — Coluna com contagem, soma e barra de proporção; etapa final recolhida em faixa, como o `fold` do padrão de mercado
  - [x] T-23.13.3 — Arrastar e soltar move o cartão de etapa e grava pela ação de servidor, com erro em português
  - [x] T-23.13.4 — Cartão com título, cliente, estrelas de prioridade, marcadores e **prazo com contagem regressiva**; ordenação da coluna pelo que aperta primeiro
  - [x] T-23.13.5 — 17 testes das regras de coluna, prazo e ordenação (`tests/pipeline-domain.test.ts`)
- [x] T-23.14 — **Cartão completo** na estrutura da seção 5 do padrão de interface
  - [x] T-23.14.1 — Barra de etapas clicável no topo, que move o cartão
  - [x] T-23.14.2 — Botões de estatística — projetos, documentos, chamados, prazos — que abrem a aba correspondente
  - [x] T-23.14.3 — Abas: dados do cliente, projetos, documentos, chamados e prazos, com link para o objeto de cada linha
  - [x] T-23.14.4 — Aba de prazos monta os campos a partir do que a etapa declara, com a sigla e o significado por extenso
  - [x] T-23.14.5 — Conversa lateral com observação e histórico de movimentação de etapa
  - [x] T-23.14.6 — Leitura sem embed aninhado, para não repetir o defeito D2: `pipeline_card_dates` tem duas chaves estrangeiras para o cartão e o PostgREST responderia com embed ambíguo
- [x] T-23.15 — **Segunda passagem sobre as 261 capturas**, cobrindo 12 telas de 8 aplicativos, registrada em `PADRAO-DE-INTERFACE.md` seção 10
  - [x] T-23.15.1 — Três faixas fixas da tela e a ordem delas; paginação à esquerda do seletor de visão; todo menu de app termina em `Relatórios` e `Configuração`
  - [x] T-23.15.2 — Tela única de configurações, com barra lateral de aplicativos, ajuste como caixa + título + descrição, sub-opções reveladas e `Salvar`/`Descartar` no topo
  - [x] T-23.15.3 — Painel de módulo em matriz, com todo número clicável, e cartão por equipe com contadores no rodapé
  - [x] T-23.15.4 — Grade de linhas editável do pedido de compra como molde do orçamento (D7): `adicionar item`, `adicionar seção`, `adicionar nota`, colunas opcionais e totais à direita
  - [x] T-23.15.5 — Anatomia do cartão de kanban por tipo de registro, e o estado vazio com exemplos esmaecidos ao fundo
- [x] T-23.16 — **Aplicação em homologação**, autorizada pelo responsável em 26 de julho de 2026
  - [x] T-23.16.1 — Três migrations aplicadas no projeto `wyeojufebtwblsubkunr`: 9 tabelas, 9 com RLS forçada, 21 políticas
  - [x] T-23.16.2 — Presets instalados pelo caminho real da RPC, sob a identidade do usuário `admin@admin.com`, com a checagem de permissão exercitada — e não contornada
  - [x] T-23.16.3 — Registros reais colocados nas trilhas: 5 chamados e 2 clientes. DLA derivada do `resolution_due_at` já gravado no chamado; nenhuma data inventada. A trilha do projeto ficou vazia porque a organização não tem projeto cadastrado
  - [x] T-23.16.4 — Movimentação de etapa exercitada sob o papel `authenticated`: histórico gravado pelo gatilho com autoria correta
  - [x] T-23.16.5 — **Advisor do Supabase apontou dois defeitos meus**, corrigidos em migration própria (`20260726190000_pipeline_endurecimento.sql`): quatro funções sem `search_path` fixo — a pior é `pipeline_codigo_data`, que decide o que um CHECK aceita e o que a coluna gerada grava — e `pipeline_permite`/`pipeline_permite_cartao` expostas a `anon` em `/rest/v1/rpc`
  - [x] T-23.16.6 — `validate:pipeline` passou a exigir `search_path` em toda função do pipeline, não só nas `security definer`; sabotagem confirmada
  - [x] T-23.16.7 — Kanban e lista verificados em navegador real: colunas com contagem e soma, etapa final recolhida, prazo colorido por situação, ordenação por urgência, busca por marcador e alternância de visão sem recarregar
- [ ] T-23.17 — **Verificar a tela contra a homologação real.** O `fetch` do servidor Next é recusado pelo proxy de egresso do ambiente (`Host not in allowlist: wyeojufebtwblsubkunr.supabase.co`), enquanto `curl` passa por túnel CONNECT. A verificação em navegador foi feita com dados fixos; falta repetir contra o banco depois que o host entrar na lista de egresso do ambiente
- [x] T-23.19 — **Casca vertical: grade de aplicativos por permissão, sem menu lateral**
  - [x] T-23.19.1 — Tela inicial `/app` lista só os aplicativos que o perfil libera, agrupados por categoria, com busca que ignora acento (`components/casca/launcher.tsx`)
  - [x] T-23.19.2 — Barra superior única: logotipo volta à grade, e o nome do aplicativo corrente responde "onde eu estou" agora que não há item de menu marcado
  - [x] T-23.19.3 — Menu lateral removido do aplicativo interno; devolveu 278px de largura a tabelas e kanbans. O portal do cliente mantém o dele, por ter poucas telas
  - [x] T-23.19.4 — Caminho da requisição propagado em `proxy.ts` por `x-pathname`, porque Server Component não enxerga a rota
  - [x] T-23.19.5 — **Ícones viraram SVG** (`components/casca/icones.tsx`). Antes eram glifos escolhidos por semelhança de forma — `♙` para Clientes, `∑` para Orçamentos, `◌` para SAC. Peão de xadrez não é cliente
  - [x] T-23.19.6 — Verificado em navegador com três perfis: produção vê 6 aplicativos, financeiro vê 7, administrador vê 21. Busca sem acento encontra "Orçamentos"; foco de teclado chega ao cartão
  - [x] T-23.19.7 — Alvos de 44px, foco visível, `prefers-reduced-motion` respeitado e nenhum emoji como ícone, conforme a lista de verificação da skill `ui-ux-pro-max`
- [x] T-23.22 — **Grade alinhada e tema claro/escuro**
  - [x] T-23.22.1 — Seis por linha na largura cheia, degradando 6 → 5 → 4 → 3 → 2. Medido em navegador: uma única largura (210px) e uma única altura (129px) entre todos os cartões
  - [x] T-23.22.2 — Categoria deixou de ser título de seção e virou filtro com contador. Como seção, uma categoria com um aplicativo só deixava cinco buracos na linha
  - [x] T-23.22.3 — Tema claro e escuro por token, com terceira opção "seguir o sistema". Preferência em cookie, lida no servidor: o HTML já sai no tema certo e a página não pisca branco antes de escurecer
  - [x] T-23.22.4 — Regras do escuro registradas no CSS: superfície que sobe clareia, nada de preto puro, cor de estado perde saturação e ganha claridade
  - [x] T-23.22.5 — `.campo-br-erro` deixou de usar `#812a34` fixo e passou a ler `var(--danger)`
  - [x] T-23.22.6 — **Defeito encontrado na própria verificação**: `img, svg { max-width: 100% }` do reset zera a largura de um SVG dentro de contêiner de largura indefinida. O alternador de tema renderizou como pílula vazia, sem erro nenhum no console. Fixar `width` não bastava — o `max-width` precisa ser desligado
  - [x] T-23.22.7 — Verificado em navegador nos dois temas, em 1440, 1024, 760 e 420px, sem erro de console
- [x] T-23.23 — **Responsável e seguidores no cartão**
  - [x] T-23.23.1 — `pipeline_card_followers` com RLS: quem enxerga o cartão pode seguir a si mesmo; inscrever outra pessoa exige edição; sair da lista é direito de quem está nela
  - [x] T-23.23.2 — Sem UPDATE na tabela: seguir ou não seguir são duas linhas de estado, e trocar o `user_id` de uma inscrição burlaria a política de inserção
  - [x] T-23.23.3 — Responsável exibido por nome, lido de `profiles`, e trocável por quem tem edição. Antes só existia o uuid na coluna
  - [x] T-23.23.4 — Aplicada em homologação e verificada em navegador: seguir grava, deixar de seguir remove, avatar aparece com as iniciais
- [x] T-23.24 — **Varredura funcional e de acessibilidade**, com login real contra a homologação
  - [x] T-23.24.1 — 21 aplicativos do launcher abertos um a um: todos HTTP 200, nenhum erro de console
  - [x] T-23.24.2 — Cartão do pipeline: barra de etapas move, botões de estatística trocam de aba, cinco abas respondem, observação grava, prazo grava
  - [x] T-23.24.3 — Nenhum controle sem nome acessível; um `h1` por página; nenhuma imagem sem `alt`; foco de teclado visível com contorno de 3px
  - [x] T-23.24.4 — **Alvo de toque corrigido**: as estrelas de prioridade tinham menos de 30px. Passaram a 32×32
  - [x] T-23.24.5 — **Defeito encontrado e corrigido**: `revalidatePath` sem `"layout"` não alcançava a rota do cartão, e seguir alguém gravava no banco sem mudar a tela
  - [x] T-23.24.6 — Contorno da verificação registrado: o `fetch` do servidor local passou a atravessar o proxy do ambiente por túnel CONNECT, o mesmo caminho que o `curl` usa. Arquivo de pré-carga fora do repositório; em produção o servidor fala direto
- [x] T-23.25 — **Publicado no Vercel**, deploy `dpl_6RujGN7CrjLsGQdFeisg1iNMYms6`, estado READY, commit `6cc342f`
  - [x] T-23.25.1 — O push no ramo dispara o deploy: o projeto `innov` está ligado ao GitHub. Não foi preciso subir árvore de arquivos
  - [x] T-23.25.2 — Verificado no ar: `/login` responde 200, `<html data-tema="sistema">` sai do servidor, `/icon.svg` está no `<head>` e os cabeçalhos de CSP, HSTS e `x-frame-options` chegam
  - [x] T-23.25.3 — Alias do ramo: `innov-git-claude-diretrizes-object-runtime-apex-method.vercel.app`
- [x] T-23.26 — **Promovido para produção em 27/07**, por decisão explícita do responsável: *"já faz o main para produção, depois de finalizar o projeto trocamos as senhas, são todos dados fictícios de clientes"*
  - [x] T-23.26.1 — `main` avançou de `55f4d56` (21/07) para `e72d172` por *fast-forward*: os 178 commits do ramo entraram sem merge de conciliação, porque `main` não tinha commit próprio
  - [x] T-23.26.2 — Portão completo executado **em `main`**, não só no ramo: `lint`, `typecheck`, `test` (149), `test:python` (5), `build`, `validate:docs`, `validate:inventory`, `validate:pipeline`, `validate:migrations` e os 26 testes de banco contra PostgreSQL 16 real
  - [x] T-23.26.3 — Endereço de produção: `innov-apex-method.vercel.app`
  - [ ] T-23.26.4 — **Pendência assumida e datada**: `admin321` e `cliente321` continuam valendo. A decisão do responsável foi promover assim porque os dados são fictícios, e trocar as senhas ao fim do projeto. Enquanto não forem trocadas, o endereço público aceita credencial fraca conhecida — isto não é um detalhe resolvido, é uma dívida em aberto com dono e prazo
- [ ] T-23.27 — **Verificar o fluxo autenticado no ar.** A proteção de deploy do Vercel intercepta as rotas de `/app` antes da aplicação, então a varredura autenticada foi feita contra o servidor local ligado à mesma homologação. Repetir no ar depende de liberar o acesso ou usar um link de compartilhamento
- [x] T-23.28 — **Tese do responsável conferida contra as 261 capturas** (`PADRAO-DE-INTERFACE.md` §11)
  - [x] T-23.28.1 — As 261 enumeradas por aplicativo a partir da rota no nome do arquivo: Helpdesk 46, Sign 39, Project 39, CRM 27, ações diversas 27, Contacts 25, Purchase 19, Settings 12, Appointments/Calendar 13, demais 14
  - [x] T-23.28.2 — Dezoito abertas e lidas, escolhidas para cobrir cada aplicativo e cada tipo de visualização. **Não foi comparação imagem a imagem das 261**, e o documento diz isso
  - [x] T-23.28.3 — Dez elementos nomeados pelo responsável conferidos, nenhum desmentido. Appointments e Purchase têm a mesma casca, mudando só o miolo
  - [x] T-23.28.4 — Exceção encontrada e registrada: `Sign → Green Savings` é relatório de leitura pura, sem conversa, sem seletor e sem barra de etapas. Página onde se trabalha não sai do molde; página de leitura pode
  - [x] T-23.28.5 — Tabela do que a Innovar já segue e do que falta, item a item
- [x] T-23.29 — **Cor por aplicativo na grade**, atendendo "olha como é colorida e moderna". Vinte e um ícones da mesma cor obrigam a ler todos os rótulos; a cor é do aplicativo, não da categoria
- [x] T-23.30 — **Criar e editar etapa pela própria coluna do kanban**, com `+` para cartão e engrenagem no hover — o item que o responsável marcou em três comentários distintos
  - [x] T-23.30.1 — Política `pipeline_stages_write` afrouxada de `administracao EDIT` para `pipeline_permite(pipeline_id,'EDIT')`: quem trabalha o kanban nomeia as colunas dele (`20260727090000_pipeline_conversa_e_etapas.sql`)
  - [x] T-23.30.2 — Ações `criarEtapa`, `renomearEtapa`, `alternarEtapaRecolhida`, `excluirEtapa` e `criarCartao` com mensagem em português — nenhum erro de PostgREST na tela
  - [x] T-23.30.3 — `components/pipeline/coluna-acoes.tsx`: `+` no cabeçalho, engrenagem que só aparece no hover (`opacity`, não `display`, para não sumir do teclado) e campo de etapa nova no fim das colunas
  - [x] T-23.30.4 — Formulário rápido exige o registro da trilha, porque o CHECK `pipeline_cards_origem_coerente` recusa cartão de assistência sem chamado; `registrosDisponiveis()` exclui quem já tem cartão
  - [x] T-23.30.5 — Excluir etapa com cartão é recusado com frase, não com erro de chave estrangeira. Verificado no navegador: *"Prospecção" tem 1 cartão. Mova ou arquive antes de excluir a etapa.*
  - [x] T-23.30.6 — Coluna recolhida mantém a engrenagem visível: girar o cabeçalho inteiro empurrava o controle para fora da faixa de 62px e recolher virava caminho sem volta
- [x] T-23.31 — **Completar o canto direito da barra**: mensagens, notificações e configuração, ao lado do tema e do usuário
  - [x] T-23.31.1 — `lib/casca/avisos.ts`: mensagem é observação que outra pessoa escreveu em cartão que eu respondo ou sigo; notificação é atividade em aberto no meu nome. Nenhum contador decorativo
  - [x] T-23.31.2 — "Não lido" é marco de tempo em cookie `httpOnly`, não tabela de leitura por linha; ler em um aparelho não marca lido no outro, e isso está registrado como limitação
  - [x] T-23.31.3 — Falha ao carregar avisos não derruba a casca: `catch` devolve painéis vazios em vez de deixar o usuário sem barra e sem saída
  - [x] T-23.31.4 — Ícone de configuração desenhado como engrenagem com oito dentes calculados, não círculo com raios — que é o mesmo desenho do tema claro, dois botões à esquerda
  - [x] T-23.31.5 — Defeito de render encontrado e corrigido: `startTransition` dentro do atualizador de `setState` impedia dois dos três painéis de abrir (`VACINA-015`)
- [x] T-23.32 — **Conversa lateral completa**: mensagem, nota interna, WhatsApp e atividade agendada, como componente único reusado por todos os módulos
  - [x] T-23.32.1 — `components/conversa/` com contrato `AcoesConversa` injetado: o que muda de módulo para módulo é onde grava, não a tela. As classes CSS não levam o nome do módulo, para não virarem `chamado-conversa` e `obra-conversa` no primeiro reúso
  - [x] T-23.32.2 — WhatsApp entra como tipo de observação, não como tabela: mesma linha do tempo, só o canal muda (`tipo in ('nota','mensagem','whatsapp')` + coluna `destino`)
  - [x] T-23.32.3 — Não existe envio: a plataforma registra e abre o WhatsApp com o texto pronto. A janela só abre depois de gravar, para ninguém sair achando que ficou registrado
  - [x] T-23.32.4 — `pipeline_card_activities` com RLS, chave composta para a organização e três índices — o que está em aberto é o que a tela consulta o tempo todo
  - [x] T-23.32.5 — Observação e movimento de etapa em uma lista só, ordenada pelo relógio; duas listas obrigariam quem lê a intercalar de cabeça
  - [x] T-23.32.6 — Telefone sujo do mundo real (`12982#2($($`) é recusado **antes** do envio, com o número mostrado na frase; antes o rodapé prometia abrir e só depois recusava
  - [x] T-23.32.7 — Seis testes novos contra PostgreSQL 16 real (22 a 26): canal não declarado, tipo de atividade inventado, atividade sem título, organização divergente pela chave composta e exclusão de etapa com e sem cartão
  - [x] T-23.32.8 — `run-pipeline-db-tests.mjs` passou a descobrir as migrations em vez de listá-las: duas migrations aplicadas ao Supabase estavam fora do encadeamento e a suíte dava verde sobre esquema antigo (`VACINA-014`)
- [x] T-23.20 — **Defeito D8 corrigido**: `app/icon.svg` declara o ícone da aba; o 404 de favicon apareceu no console durante a verificação desta sprint
- [x] T-23.21 — **Menus por aplicativo na barra superior**, no padrão `CRM · Sales · Reporting · Configuration` das capturas
  - [x] T-23.21.1 — `lib/casca/menus.ts` declara os menus de 15 módulos. Declarados e não descobertos: nenhuma convenção de pasta expressa que "Leads" vem antes de "Oportunidades"
  - [x] T-23.21.2 — `pnpm validate:menus` confronta cada destino com o roteador do Next e reprova o que não tem página. Reprovou dois na primeira execução — `/app/qualidade/respostas` e `/app/assinaturas/documentos` só existem por id — e os dois foram corrigidos. No CI
  - [x] T-23.21.3 — Módulo sem menu declarado fica só com ícone e nome: inventar "Configuração" para preencher a barra criaria destino que não existe
  - [x] T-23.21.4 — **Defeito encontrado ao verificar**: o layout do Next não re-renderiza em navegação suave, então resolver o módulo pelo `x-pathname` do servidor congelava a barra na primeira tela. O `h1` mudava e o menu ativo continuava marcando a anterior. Passou a `usePathname` em `components/casca/navegacao-do-modulo.tsx`
- [x] T-23.33 — **Cabeçalho de página reduzido em toda a casca**, atendendo "não precisaria desse título aqui, precisa ser mais clean"
  - [x] T-23.33.1 — Resolvido na regra que governa as 84 páginas, não em 84 arquivos: dentro de `.casca`, o `h1` cai de `clamp(34px, 4.6vw, 54px)` para 1,06rem, o selo do módulo sai (o módulo agora está na barra, com ícone) e a descrição continua visível em corpo menor
  - [x] T-23.33.2 — Fora da casca — login, portal do cliente, página de assinatura — o título grande continua: ali ele é conteúdo, não moldura
  - [x] T-23.33.3 — A descrição foi reduzida, não escondida: `display: none` a tiraria também de quem usa leitor de tela, o que é troca e não economia
  - [x] T-23.33.4 — Pipeline ganhou a barra de controle do padrão: `Novo` à esquerda, nome da tela ao lado, busca ao centro, visualizações em ícone à direita. As três trilhas viraram os menus do módulo. O kanban começa em y=160 no lugar de y=385
  - [x] T-23.33.5 — Visualizações em ícone com `aria-label` e `title`: "ícones, igual ao Odoo, ocupam menos espaço, poluem menos e facilita a leitura do pipeline"
  - [x] T-23.33.6 — Cartão deixou de repetir o nome do registro duas vezes na mesma tela; o `h1` passou para dentro do formulário, onde o nome é conteúdo
  - [x] T-23.33.7 — Engrenagem antes do `+` no cabeçalho da coluna, na ordem do padrão
- [x] T-23.18 — **Defeito D3 corrigido.** Login classifica o erro pelo `code`/`status` estável do Supabase Auth; credencial inválida, e-mail não confirmado, limite e indisponibilidade recebem mensagens diferentes. Falha de transporte também é cercada, e o log não recebe e-mail, senha nem mensagem interna (`lib/auth-errors.ts`, 5 testes, `VACINA-018`)
- [x] T-23.34 — **Acessibilidade e navegação responsiva da casca.** Menus do módulo não desaparecem mais abaixo de 900 px: viram menu móvel com os mesmos destinos e estado ativo. Mensagens, notificações, avatar e controles de toque foram alinhados ao alvo mínimo de 44 × 44 px (`VACINA-019`)

---

## Sprint S-24 — Pipelines como objeto do usuário, criação em toda parte e planejamento com Gantt
**Estado:** pendente
**Marco:** M-5

Nasceu da revisão do responsável em 27 de julho, sobre a entrega da S-23. O que
ele apontou não é acabamento: são funções que a plataforma não tem e que toda
ferramenta do mercado tem. Vai para o fim do inventário conforme R4.

### O que a revisão apontou

| # | Apontamento | Consequência |
|---|---|---|
| A1 | "Pipeline" foi tratado como aplicativo, agregando as três trilhas | Corrigido ainda na S-23 (T-23.21): o funil pertence ao aplicativo dono — CRM, Projetos e Chamados |
| A2 | Não existe criar, editar nem excluir **pipeline** | Só as etapas eram configuráveis. O funil em si é fixo, um por trilha, criado por preset |
| A3 | Um módulo precisa de **vários** pipelines | CRM tem SDR, pré-venda e venda; pós-venda tem projeto e execução; assistência tem o seu |
| A4 | "Sempre eu deveria ter a opção de criar coisas: pipelines, cards, clientes" | O `Novo` do pipeline cria cartão para registro **existente**. Não há como cadastrar cliente, projeto ou chamado de dentro do fluxo |
| A5 | Planejamento não abre Gantt ao clicar no cliente | Não há Gantt, nem dependência de tarefa (II, IT, TT, TI), nem dias programados |
| A6 | Falta a visão de lista do planejamento, por cliente | Sem início da obra, término previsto, etapa atual e suas datas, % concluída, sinalização de prazo, dias de folga ou atraso, responsável e próxima tarefa |
| A7 | Cadastro de obra deveria vir do App Projetos ao criar no pipeline | Hoje o pipeline exige que o projeto já exista |
| A8 | Não há busca no meio da barra superior | Bitrix, Pipedrive e Sophia têm busca global no topo; a busca atual é só do pipeline, na barra de controle |
| A9 | A seção de cadastrar usuários não foi encontrada | `/app/administracao/usuarios` existe desde a S-12.1 e não tinha caminho de menu. Menu criado na T-23.21; falta conferir a tela contra o padrão |
| A10 | Personas e rotinas não foram produzidas | Foram pedidas e não entregues. Sem elas, cada tela é decidida no gosto de quem escreve, que é exatamente a crítica |

### Tarefas

- [x] T-24.1 — **Personas e rotinas escritas**, em `diretrizes/PERSONAS-E-ROTINAS.md`, canônico e no validador
  - [x] T-24.1.1 — Seis personas com fonte citada: as palavras do responsável sobre nível de acesso, as 261 capturas e o fluxo de móveis planejados já modelado nos presets. Nenhuma inventada
  - [x] T-24.1.2 — Cada uma responde às quatro perguntas: por onde entra, qual a pergunta do dia, o que precisa em três cliques e o que a plataforma ainda não faz
  - [x] T-24.1.3 — P3, o montador, tem poder de veto sobre desenho móvel: é a única persona que trabalha de pé, com uma mão, em tela pequena e sinal ruim ao mesmo tempo
  - [x] T-24.1.4 — Regra levada ao `CLAUDE.md`: tela que não declara persona, origem, pergunta e contagem de cliques não é construída
  - [x] T-24.1.5 — **Reescrito no mesmo dia, depois da crítica que invalidou a primeira versão**: *"o cara de planejamento deve saber trabalhar com project (…) quais conhecimentos ele precisa ter? isso que é matriz de competências!!!"*. A primeira versão descrevia **o que cada persona clica**, e caminho de clique é consequência, não causa. Persona escrita por cliques só valida a tela que já existe — nunca aponta o campo que falta, porque não conhece a técnica que precisaria dele
  - [x] T-24.1.6 — Estrutura nova em quatro camadas, de baixo para cima: **competência → ferramenta → técnica → rotina**, e cada técnica **declara o dado que exige**. É o que faz a persona virar requisito de banco em vez de opinião de tela
  - [x] T-24.1.7 — P2 separada em duas: **planejador** (rede, prazo e custo do prazo) e **P7 projetista** (detalhamento executivo). Juntar as duas produziu um "engenheiro" que não existe em nenhuma das duas cadeiras
  - [x] T-24.1.8 — Catálogo de onze técnicas do planejamento com a conta **executada**, e o diagnóstico de esquema de cada uma: PERT três pontos, CPM com folga total, custo marginal de aceleração, corrente crítica com pulmão, linha de base, curva S, curva ABC, DSM, calendário e regime, nivelamento de recurso, referência de preço com data-base
  - [x] T-24.1.9 — Layout de referência lido de MS Project e Primavera P6, oito características comuns, com o que já existe e o que falta. A mais cara é a que falta: **grade editável ao lado do Gantt**, com predecessora digitável no formato `12TI+3d` — é o gesto mais repetido do dia e nenhum modal ganha dele
- [x] T-24.2 — **Pesquisa de campo do CRUD de pipeline** (`PADRAO-DE-INTERFACE.md` §13), lida das capturas antes de qualquer código
  - [x] T-24.2.1 — Achado que muda o desenho: **o Odoo não tem objeto "pipeline"**. Tem um escopo dono — `Sales Team` no CRM, o próprio projeto em Project — e etapas ligadas a ele. Criar funil é criar escopo, não abrir tela de configuração à parte
  - [x] T-24.2.2 — Mapa de onde cada comando mora, com a captura que prova cada linha: trocar de funil no breadcrumb, configurar na engrenagem colada ao nome, criar no menu `Configuração` do aplicativo, etapa no fim das colunas
  - [x] T-24.2.3 — Diagnóstico do que falta: o banco **já aceita** vários funis por trilha. O que trava é `carregarPipeline` pegar só o padrão, a restrição de um padrão por trilha e a ausência de seletor. É leitura e tela, não modelagem — a T-24.3 começa pela consulta, não pelo esquema
  - [x] T-24.2.4 — Cinco decisões fixadas, entre elas: não existe tela central de criar funil, porque não existe aplicativo "Pipeline"; e preset é atalho, não obrigação — quem cria "SDR" não recebe "medição" e "fabricação"
- [x] T-24.3 — **Vários funis por aplicativo**, sem nenhuma migration — a pesquisa da T-24.2 estava certa
  - [x] T-24.3.1 — Confirmado no esquema: `pipelines_padrao_unico_idx` é índice **parcial** (`where padrao`), então limita quantos são padrão e não quantos existem. O esquema sempre aceitou vários
  - [x] T-24.3.2 — `funisDaTrilha()` lista todos os ativos; `carregarPipeline` já aceitava a chave e passou a receber a da URL
  - [x] T-24.3.3 — Funil escolhido vai para `?funil=`: recarregar mantém, e o endereço pode ser mandado apontando para o funil certo
- [x] T-24.4 — **CRUD de funil**: criar em branco ou de preset, renomear, arquivar, definir padrão e excluir
  - [x] T-24.4.1 — Preset é atalho, não obrigação: quem cria "SDR" começa em branco e cria as etapas na própria coluna
  - [x] T-24.4.2 — Arquivar é o caminho normal, excluir é para o que nasceu errado. Funil com cartão manda arquivar, para preservar o histórico
  - [x] T-24.4.3 — Excluir ou arquivar o padrão é recusado com frase. Verificado no navegador: *"Trilha do cliente" é o funil padrão da trilha. Defina outro como padrão antes de excluir este.*
  - [x] T-24.4.4 — `definirFunilPadrao` limpa o anterior antes de marcar o novo, porque o índice parcial recusa dois padrões — e é ele que garante que a tela nunca fique sem saber qual abrir
- [x] T-24.5 — **Seletor de funil na barra de controle**, ao lado do nome, com engrenagem no hover — a posição que a §13 leu do breadcrumb `Projects / Teste ⚙`
  - [x] T-24.5.1 — Nunca na barra 1: trocar de funil não troca de aplicativo, e a barra 1 é do aplicativo
  - [x] T-24.5.2 — Verificado ponta a ponta: criar "SDR" em branco, trocar para ele por `?funil=sdr_...`, ver zero coluna e o campo de etapa nova, e excluir. Zero erro de console
- [x] T-24.6 — **Criar registro de dentro do funil**: cliente, projeto e chamado nascem do `+` da coluna, sem sair do fluxo
  - [x] T-24.6.1 — Duas abas no formulário da coluna: vincular registro existente, ou cadastrar novo. Coluna sem registro livre leva direto ao cadastro
  - [x] T-24.6.2 — A validação brasileira é a **mesma** `checarCamposBR` do formulário completo, não uma segunda cópia. Verificado no navegador: CPF de 10 dígitos recusado com *"CPF precisa ter 11 dígitos; recebeu 10"* e o telefone sujo `12982#2($($` com *"precisa ter 10 dígitos com DDD; recebeu 6"* — os dois valores que passaram para produção no defeito D1
  - [x] T-24.6.3 — **Projeto nasce sem contrato**, que era o "como vou planejar algo que nem existe cadastro?" do print do planejamento. `projects.contract_id` é anulável e o índice de unicidade é parcial: o que existia era só o caminho pelo contrato, não uma restrição do banco
  - [x] T-24.6.4 — Chamado nasce pela RPC `create_sac_ticket`, não por INSERT: é ela que numera e aplica os prazos de primeira resposta e resolução. Inserir direto criaria chamado sem SLA
  - [x] T-24.6.5 — **Defeito encontrado ao verificar**: eu gravava `lifecycle_stage: "LEAD"`, valor que o CHECK não aceita — os válidos são PROSPECT, CUSTOMER, ACTIVE, INACTIVE e FORMER. Corrigido para `PROSPECT`, e a violação de CHECK passou a ter mensagem própria em vez de cair no "não foi possível", que é o defeito D2 por uma porta nova
- [x] T-24.0 — **Mapa das duas barras escrito antes do código** (`PADRAO-DE-INTERFACE.md` §12), ditado pelo responsável e conferido contra as capturas: o que fica em cada posição, o que nunca pode estar ali, quando cada visualização aparece e a exceção declarada da busca
  - [x] T-24.0.1 — Barra 1 igual em toda tela: marca sozinha à esquerda, ícone e nome do aplicativo com os menus dele, mensagens, notificações e avatar à direita; busca reconciliada na barra 2 em 28/07
  - [x] T-24.0.2 — E-mail por extenso e botão "Sair" saíram da barra para dentro do avatar, junto com tema, atalhos e "Usuários e permissões" — dois elementos permanentes para uma ação de uma vez por dia
  - [x] T-24.0.3 — Barra 2 com ações à esquerda, busca contextual ao centro e visualizações à direita, sem repetir o nome do aplicativo
  - [x] T-24.0.4 — `BarraDeTrabalho` extraída como componente transversal e usada no pipeline e na administração de responsabilidades
- [ ] T-24.7 — **Busca global na barra de trabalho**: hoje o campo existe no centro, com faceta e remoção, e filtra a tela do pipeline. Falta procurar em cliente, projeto, chamado e cartão ao mesmo tempo, com resultado agrupado por tipo, e o painel de Filtros, Agrupar por e Favoritos da §12.5
  - [x] T-24.7.1 — Campo no centro da barra 2, com lupa, faceta removível e Backspace apagando a faceta
  - [x] T-24.7.2 — Filtro aplicado no navegador, não por navegação. A primeira versão escrevia em `router.replace` a cada tecla; como as telas são `force-dynamic`, cada digitação virava ida ao servidor e a lista chegava quase três segundos atrasada. A URL continua espelhada por `history.replaceState`, sem re-render de servidor
  - [x] T-24.7.3 — Exceção declarada na §12.4: o campo só aparece onde a tela sabe consumi-lo. Campo que aceita texto e não filtra ensina que a busca não funciona
- [ ] T-24.8 — **Planejamento, visão de lista por cliente** — parcial
  - [x] T-24.8.1 — Coluna de situação do prazo em três estados, com a régua de sete dias: é o intervalo em que ainda dá para remanejar equipe ou antecipar material; menos que isso, o aviso chega junto com o problema
  - [x] T-24.8.2 — O código da obra abre o cronograma, que era o "clicar no nome e abrir o gantt" do print
  - [x] T-24.8.3 — Coleção agora mostra etapa atual, datas da etapa, dias de folga ou atraso, responsável e próxima tarefa programada; o código continua abrindo o Gantt
- [x] T-24.9 — **Gantt com dependências**, no lugar da barra por porcentagem que existia na tela de cronograma
  - [x] T-24.9.1 — Achado que reduziu o trabalho: os quatro tipos **já existiam** como enum desde a etapa 12 — `FS`, `SS`, `FF`, `SF` são exatamente TI, II, TT e IT. `lag_days` e `duration_days` também. Não foi preciso criar modelo de dependência
  - [x] T-24.9.2 — O que faltava era a única coisa que torna cronograma incalculável: **ciclo**. `A→B→C→A` passava por toda restrição existente, porque nenhuma olha além do par imediato. Gatilho com CTE recursiva, cobrindo INSERT e UPDATE
  - [x] T-24.9.3 — Chave composta `(tarefa, projeto)` nos dois lados: dependência entre tarefas de projetos diferentes vira erro de integridade, não disciplina de quem escreve
  - [x] T-24.9.4 — `lib/planejamento/cronograma.ts` com passada para frente, folga positiva e negativa, e a regra de que a data fixada pelo planejador vence quando é mais tarde. **17 testes antes da tela existir**, incluindo virada de mês e de ano
  - [x] T-24.9.5 — 7 testes contra PostgreSQL real, com `pnpm test:db:planejamento` no CI
  - [x] T-24.9.6 — Cadeia que empurra a entrega destacada, e nomeada pelo que é: não é caminho crítico do CPM, porque não há passada para trás nem folga total. Vender o nome sem a conta seria prometer o que não se entrega
  - [x] T-24.9.7 — **Defeito encontrado ao verificar**: a migration estava no repositório e **não no banco**. O formulário aceitou `T5 → T1` e fechou o laço. Aplicada ao Supabase e reverificada: a recusa aparece com a frase certa
  - [x] T-24.9.9 — **Calendário de trabalho**, `lib/planejamento/calendario.ts`: quatro regimes, 13 feriados nacionais (9 fixos e 4 móveis **calculados** pela Páscoa, Meeus/Jones/Butcher — tabela ano a ano envelhece em silêncio e erra no ano que ninguém conferiu), e toda a aritmética do cronograma convertida para **dia útil**. A conta do responsável, executada: 20 úteis + 8 de fim de semana + 1 feriado = **29 corridos**; quatro fins de semana são oito dias, e só o total muda
  - [x] T-24.9.10 — **Três curvas** sob o Gantt, `lib/planejamento/curvas.ts`: planejado total, previsto parcial e realizado parcial, com liga-desliga. Ponderação por dia útil, nunca por contagem de tarefas. Limitação **declarada no arquivo**: a plataforma guarda o progresso de hoje e não a série diária dele, então a curva do passado é reconstruída — o apontamento datado da S-25 substitui a reconstrução. Registrar isso é o que impede alguém de usar a curva como prova em discussão de prazo
  - [x] T-24.9.11 — Fim de semana e feriado hachurados no quadro, feriado com nome; escala fixa no topo e nomes fixos à esquerda; quadro limitado a `calc(100vh - 320px)` com rolagem própria — o "todos calendários têm que pegar até o final da tela" do print do Odoo
  - [x] T-24.9.8 — Verificado com cenário real de 5 tarefas e 5 dependências: T2 começa no dia seguinte ao término de T1, T3 respeita a folga de 2 dias, e a compra de ferragens fica **fora** da cadeia — o ramo curto não empurra a entrega
- [ ] T-24.10 — **Conferir a tela de cadastro de usuários** contra o padrão pesquisado, já que o responsável não a encontrou
- [ ] T-24.11 — **Varredura do texto poluído** nas 84 telas: o cabeçalho encolheu na S-23, mas cada tela ainda precisa ser olhada uma a uma contra o padrão

---

## Sprint S-25 — Serviço de campo: execução, apontamento e retroalimentação do planejamento
**Estado:** pendente
**Marco:** M-5

Ditada pelo responsável em 27 de julho. Desenho completo em
[`SERVICO-DE-CAMPO.md`](SERVICO-DE-CAMPO.md). Vai para o fim conforme R4.

Não é um módulo a mais: é o fechamento do ciclo. Hoje o planejamento produz uma
previsão que ninguém confronta com a realidade, e a realidade fica na cabeça de
quem está na obra.

### Tarefas

- [x] T-25.1 — **Natureza do check-in decidida pelo responsável em 27/07: alimenta a folha de pagamento.** Registro de jornada é artefato regulado (Portaria 671/2021 do MTP), e isso eleva a exigência técnica desde a primeira linha — detalhado na §7.1
- [ ] T-25.1.1 — Marcação imutável: `UPDATE` e `DELETE` negados; correção é linha nova de ajuste apontando para a original, com autor e motivo obrigatórios
- [ ] T-25.1.2 — Comprovante por marcação e espelho de ponto por pessoa e competência
- [ ] T-25.1.3 — Encadeamento por hash, para que adulteração em lote seja detectável
- [ ] T-25.1.4 — Marcação fora da janela ou do raio **não é bloqueada**, é gravada com a divergência anotada. Bloquear faria a pessoa trabalhar sem conseguir registrar que trabalhou
- [ ] T-25.1.5 — Deixar explícito o que fica fora: a plataforma produz registro e espelho; não calcula folha, convenção coletiva, banco de horas nem adicional noturno
- [ ] T-25.2 — **Check-in e check-out com localização**, alimentando horas trabalhadas
- [ ] T-25.3 — **To-do de campo**: alimentado pelo planejador, atualizado pelo profissional com o número de dias que faltam. Reaproveita `pipeline_card_activities`
- [ ] T-25.4 — **DPPT e DEPT como naturezas de data**, na taxonomia que já existe. Não é modelo novo: é mais um par na tabela que `pipeline_codigo_data` governa
- [ ] T-25.5 — **TEP e TEPr**: `TEP = DPPT − DEPT` no cartão e na notificação; `TEPr = TEP / prazo × 100` para ordenar, acender sinal e comparar equipes. Sem o relativo, o ranking premia quem pega tarefa longa
- [ ] T-25.6 — **Motivo obrigatório quando TEP fica negativo**, em lista fechada — chuva, material, saúde, tarefa anterior, cliente, outro. Texto livre não vira métrica
- [ ] T-25.7 — **Notificação para responsável e seguidores** quando o TEP vira negativo, pelo canto direito que já existe
- [ ] T-25.8 — **Solicitação de insumo abre uma parada**, não só um pedido. Regra do responsável: se falta material, o montador obrigatoriamente para
  - [ ] T-25.8.1 — Parada com início e fim: abre na solicitação, fecha quando o material chega. Tempo medido, não estimado de memória
  - [ ] T-25.8.2 — Entra no `TEP` como causa declarada, separando "rendeu menos" de "ficou esperando" — problemas de setores diferentes
  - [ ] T-25.8.3 — Notifica o almoxarifado e alimenta o KPI de parada de obra por falta de material
- [ ] T-25.9 — **Calendário do dia** para o perfil de execução
- [ ] T-25.15 — **A janela dos 15 minutos é do sistema**: notificação no horário de fechamento do dia, listando o que falta preencher. Esperar o profissional lembrar produz diário em branco e `DEPT` desatualizado — e `DEPT` desatualizado derruba `TEP`, sinal amarelo, painel e matriz, nessa ordem
- [ ] T-25.16 — **Três momentos, não uso contínuo.** O aplicativo interrompe o trabalho: chegada, necessidade e 15 minutos antes de sair. O critério de pronto passa a ser **terminar de primeira** — fluxo que exige segunda tentativa custa uma segunda parada
- [ ] T-25.10 — **Sinal amarelo propagado**: cartão, planner, módulo de projeto e painel
- [ ] T-25.11 — **Painel de obras**: quantas no prazo, quantas atrasadas, desempenho por equipe e do planejador
- [ ] T-25.12 — **Matriz de competências**: rendimento por tipo de tarefa, média de 6 meses **com desvio padrão**. Média sozinha esconde a equipe que faz em 4 ou em 8 dias
- [ ] T-25.13 — **Avaliação do cliente** de 0 a 5 em sete critérios, alimentando a matriz. Antes de gravar, decidir o que a §7.2 levanta: quem vê a nota individual e por quanto tempo ela pesa
- [ ] T-25.14 — **Conferir tudo com a persona P3**, que tem veto: de pé, uma mão, tela pequena, sinal ruim

---

## Sprint S-26 — KPIs setoriais e individuais
**Estado:** pendente
**Marco:** M-5

Pedida pelo responsável em 27 de julho: "quero que você crie kpis por setor e
individual para todos os módulos, isso é de extrema importância". Catálogo
completo em [`KPIS.md`](KPIS.md). Vai para o fim conforme R4.

### O que a escrita do catálogo já resolveu

- **A fonte existe.** `pipeline_card_stage_history` grava toda transição com
  origem, destino e instante. Dela saem toda conversão, todo tempo de ciclo,
  toda estagnação e todo retrabalho — sem tabela nova.
- **O erro do denominador foi documentado com a conta feita.** "Leads Ganhos"
  (contratos ÷ leads) e "Taxa de Conversão" (contratos ÷ briefings) parecem o
  mesmo indicador e não são: a razão entre eles é exatamente o filtro da
  entrada. Cobrar o vendedor pelo primeiro quando o marketing mudou a fonte é
  punir quem não causou.

### Tarefas

- [ ] T-26.0 — **Aplicar o teste da §0 a cada KPI antes de implementar**: se atrasar gera grande impacto? dá para medir o acerto? quem fica abaixo é identificável? só então o geral do setor. Candidato que não passa da primeira pergunta vira relatório, não indicador
- [ ] T-26.1 — **Camada de cálculo única**, lendo de `pipeline_card_stage_history` e das tabelas de domínio. Um KPI calculado em dois lugares diverge no primeiro ajuste
- [ ] T-26.1.1 — Janela de 6 meses anteriores + 6 meses atuais, com **desvio padrão amostral (n−1)**. A comparação entre as metades é a tendência; o ano é o retrato
- [ ] T-26.1.2 — Faixa de alerta derivada do próprio histórico — `média ± 1σ` —, com a média de mercado da §0.2 como segunda régua. Alvo arbitrário reprova quem não merece
- [ ] T-26.1.3 — Ordenação para escolha de equipe por `média + desvio`, nunca só pela média: calculado, duas equipes com média idêntica de 6 dias diferem em 1,9 dia no pior caso
- [ ] T-26.2 — **Motivo de perda no CRM**: campo em lista fechada. É o único KPI do módulo hoje marcado 🔴 — o dado não existe
- [ ] T-26.3 — **Conversões do funil comercial**, depois dos funis por setor da S-24: qualidade de lead, conversão de leads, conversão em projeto, leads ganhos e taxa de conversão, com os dois denominadores convivendo
- [ ] T-26.4 — **KPIs de campo e do planejador** (aderência, desvio relativo, acerto do plano), depois da S-25
- [ ] T-26.5 — **KPIs de assistência**, com destaque para chamados por obra entregue — o indicador que liga o pós-venda a quem executou
- [ ] T-26.6 — **KPIs de qualidade, financeiro, compras e estoque**, incluindo parada de obra por falta de material
- [ ] T-26.7 — **Matriz de competências** por tipo de tarefa, com média **e desvio padrão** de 6 meses. Ordenação por `média − desvio` para escolha de equipe
- [ ] T-26.8 — **Painel executivo** compondo os anteriores
- [ ] T-26.9 — **Decidir as quatro regras da §15 antes de publicar qualquer KPI individual**: quem vê o próprio número, janela de esquecimento, caminho de contestação, e nunca publicar contagem absoluta antes do denominador que a normaliza

---

## Sprint S-27 — Planejamento profissional: as técnicas que o planejador executa
**Estado:** pendente
**Marco:** M-5

Nasceu da crítica de 27 de julho que invalidou a primeira versão das personas:

> "o cara de planejamento deve saber trabalhar com project, como se faz um
> planejamento, quais ferramentas ele usa, quais conhecimentos ele precisa ter?
> (…) o que é curva A, ABC, custo marginal, otimista, pessimista e normal,
> caminho crítico, linha de base, corrente crítica, DSM"

Cada item da lista é uma **técnica com dado exigido**, não um adorno de tela.
Catálogo completo em [`PERSONAS-E-ROTINAS.md`](PERSONAS-E-ROTINAS.md) §P2.3, com
a conta de cada uma executada. Vai para o fim conforme R4.

### O diagnóstico que ordena a sprint

Metade das técnicas **não precisa de migration** — o dado já está no banco desde
a etapa 9 ou 12 e o que falta é leitura e tela. Essas vão primeiro, por retorno
sobre esforço:

| Técnica | Esquema | Situação |
|---|---|---|
| CPM com folga total | nenhuma migration | Função pura sobre `task_dependencies`, que já tem os quatro tipos e `lag_days` |
| Linha de base | nenhuma migration | `schedule_baselines` e `schedule_baseline_tasks` existem desde a etapa 12; `curvaDeAvanco()` **já aceita** a linha de base |
| DSM | nenhuma migration | `task_dependencies` **é** a matriz N×N; falta lê-la em N×N |
| Curva ABC | nenhuma migration | `budget_items` tem `quantity`, `unit_cost`, `loss_rate` e `freight_rate` |
| Data-base de preço | nenhuma migration | `budget_items.source`, `region` e `base_date` existem desde a etapa 9; falta a importação |
| Três pontos (PERT) | migration pequena | `project_tasks.duration_days` é um campo só; faltam otimista, provável e pessimista |
| Aceleração | migration pequena | Falta o par `crash_duration_days` / `crash_cost`; `project_resources.daily_cost` já existe |
| Corrente crítica | modelo novo | Pulmão como objeto de cronograma; nada existe |
| Nivelamento | leitura nova | `task_resource_allocations` já tem quantidade e horas, planejadas e reais |

### Tarefas

- [ ] T-27.0 — **Grade editável ao lado do Gantt**, com divisor arrastável: código, nome, duração, início, término, **predecessoras**, responsável, % concluída. Digitar `12TI+3d` na célula de predecessora é o gesto mais repetido do dia do planejador, e nenhum modal ganha dele. Sem migration
- [ ] T-27.1 — **Passada para trás e folga total**, fechando o CPM. Hoje `cadeiaMaisLonga()` só faz a passada para frente e o próprio comentário da função declara isso. Calculado no exemplo de quatro tarefas: a tarefa fora da cadeia tem **5 dias de folga**, e é esse número que diz onde o planejador **não** precisa correr
  - [ ] T-27.1.1 — Renomear para caminho crítico só depois de a folga existir. Vender o nome sem a conta é prometer o que não se entrega
  - [ ] T-27.1.2 — Folga livre além da folga total: a primeira diz quanto atrasa sem mover a entrega, a segunda quanto atrasa sem mover **a sucessora**
- [ ] T-27.2 — **Linha de base pela tela**: congelar, comparar e desenhar a barra fina abaixo da atual. O banco está pronto e a função de curva também. Replanejar sem linha de base apaga a prova do desvio, e a reunião de prazo vira memória contra memória
- [ ] T-27.3 — **Matriz DSM** sobre as dependências que já existem. Marca acima da diagonal é realimentação — retrabalho **previsível**, não acidente. É o que o Gantt não mostra e o que explica a obra que "sempre atrasa na aprovação"
- [ ] T-27.4 — **Curva ABC no orçamento**. Calculado sobre orçamento de R$ 1,1 mi: **3 itens de 8 concentram 80% do custo**. É a régua que decide o que merece três cotações e o que não merece reunião
- [ ] T-27.5 — **Estimativa de três pontos**: otimista, provável e pessimista por tarefa, com `duration_days` derivada de `TE = (O + 4M + P)/6`
  - [ ] T-27.5.1 — Desvio do caminho por **raiz da soma das variâncias**, nunca por soma de desvios: calculado, a soma ingênua erra 2,01 dias em três tarefas. Variância soma, desvio padrão não
  - [ ] T-27.5.2 — Faixa de confiança na negociação de prazo, em vez do número único que ninguém consegue cumprir
- [ ] T-27.6 — **Custo marginal de aceleração**: duração e custo acelerados por tarefa, e o gradiente em R$/dia ganho. Calculado: comprime-se pela mais barata **do caminho crítico**, e acelerar tarefa com folga é dinheiro jogado fora. Depois da T-27.1, porque sem folga não se sabe onde não gastar
- [ ] T-27.7 — **Referência de preço com data-base**: importar tabela por praça e reajustar por índice. Orçamento que não guarda data-base e região não pode ser reajustado nem defendido
- [ ] T-27.8 — **Nivelamento de recurso** com histograma de uso. Duas tarefas paralelas pedindo o mesmo montador não são paralelas — sem nivelar, o cronograma promete uma simultaneidade que a equipe não tem. Depois da T-27.1: nivela-se consumindo folga primeiro
- [ ] T-27.9 — **Corrente crítica**: pulmão de projeto e de alimentação, com consumo como semáforo. Calculado, o pulmão agregado entrega **3,38 dias antes** da soma das seguranças individuais com a mesma proteção, porque nem todas as tarefas atrasam juntas. É o único indicador de prazo que não depende de alguém julgar se "está no prazo". Depende da T-27.1 e da T-27.5
- [ ] T-27.10 — **Calendário por equipe no banco**, com feriado municipal e estadual por organização. Hoje o cálculo é em dia útil, mas o regime é escolhido na tela e os feriados são só os nacionais — anunciar feriado municipal que não vale na cidade da obra seria pior que não ter nenhum
- [ ] T-27.11 — **Painel inferior de detalhe** da linha selecionada, por abas, como em Primavera P6: situação, recursos, relacionamentos e apontamento

---

## Sprint S-28 — O que a dissecação de riscos exige: parada, solicitação e obrigação
**Estado:** pendente
**Marco:** M-5

Nasce da crítica de 27 de julho:

> "um fluxo de trabalho otimista, um pessimista (o que pode dar de problema, o
> que poderia realmente atrapalhar uma atividade, e se atrapalhasse o que eu
> precisaria ter disponível na ferramenta, quais departamentos isso afetaria e a
> quem eu precisaria realizar uma solicitação para resolver), isso é dissecar o
> problema (…) você continua sendo muito superficial"

Dissecação completa em [`FLUXOS-E-RISCOS.md`](FLUXOS-E-RISCOS.md). **Todo
requisito desta sprint existe porque alguma coisa deu errado** — nenhum deles
apareceria numa lista de funcionalidades, e é essa a diferença que a crítica
apontou. Vai para o fim conforme R4.

### As três contas que ordenam a sprint

| Conta | Resultado | O que ela decide |
|---|---|---|
| `P(dia de montagem sem imprevisto)` | **52,9%**; em 5 dias, **4,1%** | Desenhar só o caminho feliz atende metade dos dias |
| Erro de medida por estágio de descoberta | 1× na obra → **300×** na montagem → 700× na assistência | A conferência de medida antes de liberar fabricação é a trava mais barata do sistema |
| Equipe de quatro parada | **R$ 104,00/hora**, **R$ 942,40** por dia queimado | Dá peso à solicitação de insumo e justifica compra local com teto |
| Ciclo real de reposição de peça | **9 dias úteis**; conferindo na expedição, **5** | 4 dias economizados por ocorrência |

### Tarefas

- [ ] T-28.0 — **Parada como objeto de primeira classe**: início, fim, motivo em **lista fechada**, evidência, e o campo que ninguém quer gravar e é o mais valioso — **de quem era a obrigação** (cliente, obra, fábrica, expedição, compras, projeto ou clima). Sem ele, espera vira baixa produtividade de quem estava parado por decisão de outro setor
  - [ ] T-28.0.1 — Abertura em **dois toques**. Se abrir parada der trabalho, ninguém abre, e o dado que sustenta o `TEP` deixa de existir
  - [ ] T-28.0.2 — Os oito motivos da §0 como ponto de partida da lista fechada. Texto livre não vira indicador
  - [ ] T-28.0.3 — Separar **improdutivo por clima** de **improdutivo por falha**: misturar destrói a matriz de competências, porque pune quem pegou chuva
- [ ] T-28.1 — **Solicitação com destinatário nominal, departamento e prazo**. "Avisar o sistema" não é solicitação. Os prazos vieram da dissecação e cada um tem motivo de campo: compra local 1 h, expedição 2 h, coordenação 2 h, projetista 4 h, comercial 4 h
  - [ ] T-28.1.1 — **Escalonamento por prazo vencido**, senão prazo de resposta é decoração
  - [ ] T-28.1.2 — Solicitação de insumo **abre parada junto**, porque falta de material é parada obrigatória e não observação
- [ ] T-28.2 — **Pré-condições de medição** conferidas e assinadas, com **medição condicional** marcada como tal e remedição agendada. É o requisito de maior retorno de todos: previne a maior parte do R3.1, que a 12% de frequência custa 300× quando aparece na montagem
- [ ] T-28.3 — **Romaneio conferível item a item, com foto de referência**, distinguindo "faltou" de "veio diferente" — causas diferentes, departamentos diferentes. Inclui o campo **em qual conferência o erro deveria ter sido pego**: sem ele a expedição nunca melhora, porque o custo cai sempre na montagem
- [ ] T-28.4 — **Ficha de acesso do endereço** preenchida **na medição**: horário de carga e descarga, contato de portaria e síndico, exigência de ART, seguro ou aviso prévio. O dado mais barato de coletar meses antes e o mais caro de descobrir na hora
- [ ] T-28.5 — **Compra local com teto e alçada**: R$ 180 de ferragem na esquina contra R$ 942,40 de dia queimado — **5,2× mais barato**. Precisa de autorização em 1 hora, senão a equipe espera de qualquer forma
- [ ] T-28.6 — **Pedido do cliente registrado no local**, com foto e assinatura no telefone, e o caminho direto para aditivo. **O montador não pode ter autoridade para aceitar mudança de escopo** — e a ferramenta é que precisa deixar isso óbvio, porque no local a pressão é real
- [ ] T-28.7 — **Revisão vigente do desenho no telefone**, e liberação de fabricação amarrada à revisão aprovada. `project_documents` já tem os cinco estados e `project_document_versions` já versiona; falta a amarração, que hoje é disciplina — e disciplina falha a 100× de custo
- [ ] T-28.8 — **Ver quem mais está alocado no mesmo endereço hoje**. Resolve por conversa, no local, em cinco minutos, o conflito de sequenciamento que hoje escala para a coordenação
- [ ] T-28.9 — **Situação financeira do cliente visível antes de a equipe sair**, não depois. Descobrir depois custa os R$ 942,40 da Lei 2
- [ ] T-28.10 — **Cobertura de apontamento** como número visível, e detecção do padrão suspeito — progresso monotônico com variância zero é o padrão de quem preenche de cabeça no fim de semana. **Falso é pior que ausente**, porque ausente ao menos se enxerga
- [ ] T-28.11 — **Gravar `project_progress_snapshots` ao aprovar o diário**, e ler dele em `curvas.ts`. A tabela existe desde a etapa 12 com `snapshot_date`, `planned_progress`, `actual_progress` e `source`, e `daily_log_activities` já tem `progress_before`/`progress_after` datados pelo `log_date` do diário. **Sem migration** — falta só escrever e ler, e a curva de realizado deixa de ser reconstruída para ser medida

---

## Sprint S-29 — Acompanhamento a distância: seguir, notificar por exceção e evidenciar
**Estado:** pendente
**Marco:** M-5

Ditada pelo responsável em 27 de julho:

> "o montador solicitar material que faltou ou enviar fotos do andamento, assim
> mesmo sem visitar a montagem, ou obra, os gerentes, diretores, cliente, sabem o
> que está acontecendo (…) por isso temos notificações e alertas para as pessoas
> que são responsáveis e seguem o projeto"

Desenho e dissecação em
[`ACOMPANHAMENTO-A-DISTANCIA.md`](ACOMPANHAMENTO-A-DISTANCIA.md). Vai para o fim
conforme R4.

### O diagnóstico que ordena a sprint

**Metade do sistema já está construída, e é a metade que se costuma achar que
falta.** O portal do cliente existe em `app/cliente/` e já lê `client_visible`
em diário aprovado, mídia, tarefas, marcos e documentos liberados. `daily_logs`
já tem aprovação com autor e data, e `daily_log_media` já tem `captured_at`,
`sha256` e `client_visible`. **A lacuna inteira é o empurrão**: hoje tudo é
*pull* — quem quer saber precisa abrir a tela. Não existe tabela de notificação,
não existe assinatura ("quem segue o quê") e não existe entrega.

### As contas que fixam os limites

| Conta | Resultado | O que decide |
|---|---|---|
| Eventos para 1 gerente com 6 obras | **2.640/mês (120/dia)** bruto → **259/mês (11,8/dia)** por exceção | Notificar por exceção, redução de **90,2%** |
| Falso positivo tolerável | acima de **20%** o alerta vira ruído | Tipo de alerta acima disso é desligado até corrigir |
| Evidência remota × visita | R$ 0,94 contra R$ 365,40 — **390×** | Substitui a visita de rotina, não a visita |
| Foto original × comprimida | 4,20 MB → 0,35 MB, **12×**; upload de 8 s → 0,7 s | Compressão não é economia, é viabilidade dentro da janela de 15 min |
| Fila offline de 7 dias | 168 registros, 29,4 MB por equipe | Cabe com folga; 7 dias é o teto, acima disso o dado envelheceu |

### Tarefas

- [ ] T-29.0 — **Assinatura: "seguir" como ato explícito e visível**, com inscrição automática por papel (responsável, gerente da obra, planejador) e a lista de seguidores exibida na própria obra. Diretor que "achava que estava vendo" e não estava é a falha mais comum deste tipo de sistema — e sem registro de quem seguia o quê, "ninguém me avisou" não tem resposta
- [ ] T-29.1 — **Notificação por exceção**, nunca por evento. Normal não avisa
  - [ ] T-29.1.1 — Faixa derivada do próprio histórico, conforme a janela 6+6 da `KPIS.md`
  - [ ] T-29.1.2 — Teto diário por pessoa, com excedente virando resumo; e agrupamento por obra — cinco eventos da mesma obra são um aviso, não cinco
  - [ ] T-29.1.3 — **Falso positivo medido por tipo de alerta**, e tipo acima de 20% desligado até ser corrigido. Alerta que ninguém abre há um mês é alerta que não deveria existir
  - [ ] T-29.1.4 — Janela de silêncio por perfil, respeitando o regime de trabalho que o calendário já conhece, com classe de urgência estreita e nominal que atravessa
- [ ] T-29.2 — **Um fato, seis recortes**: montador, coordenador, planejador, gerente, diretor e cliente recebem agregações diferentes do mesmo evento. Mandar o mesmo texto para os seis produz 6× o volume e 1× o valor
- [ ] T-29.3 — **Foto amarrada à tarefa**, não ao dia, com legenda obrigatória curta — descrever obriga a olhar. Comprimida no dispositivo, e com **hora de captura separada da hora de envio**: divergir não é fraude, é sinal para olhar
- [ ] T-29.4 — **Fila offline de 7 dias** com estado visível ao montador ("3 registros aguardando envio"), e check-in/check-out gravando hora do dispositivo **e** do servidor, para que sincronizar tarde não vire fraude de ponto nem acusação de fraude
- [ ] T-29.5 — **Localização só no check-in e no check-out**, nunca contínua, com finalidade declarada, prazo de retenção e acesso restrito a quem processa folha. Rastreamento durante a jornada não é acompanhamento — é outra coisa, e não foi o que se pediu
- [ ] T-29.6 — **`client_visible` como decisão explícita de quem aprova**, nunca padrão, e o diário aprovado como única porta para o cliente. Foto de instalação pela metade parece defeito para quem não sabe que aquilo é uma etapa
- [ ] T-29.7 — **Detecção de apontamento inventado**: progresso monotônico com variância zero, sempre redondo, sempre igual ao planejado. E correção que **não sobrescreve o original**, para que revisar para baixo seja barato e honesto. Progresso que nunca desce em obra nenhuma é o indicador mais confiável de que o dado é ficção
- [ ] T-29.8 — **As cinco regras que separam acompanhamento de vigilância**, implementadas e não só escritas: o próprio profissional vê o número dele primeiro; o indicador aponta a tarefa e não a pessoa; toda queda tem motivo que entra no número; a janela esquece; e **a resposta da gestão às solicitações do campo é medida e publicada do mesmo jeito que o `TEP`**
  - [ ] T-29.8.1 — Justificativa registrada: na meta-análise clássica de intervenções de feedback, o efeito médio é positivo (**d ≈ 0,41**) mas **mais de um terço das intervenções piorou o desempenho**. A direção confirma a intuição; a variância diz que o **como** decide o sinal. Se o painel cobra o campo em 15 minutos e a gestão responde em três dias, o campo aprende o que o sistema realmente vale
- [ ] T-29.9 — **Resumo semanal** ao cliente e ao diretor: um e-mail, não trinta

---

## Sprint S-30 — Cobertura profissional integral e cenários intersetoriais
**Estado:** pendente
**Marco:** M-5

Nasceu da revisão do responsável em 28 de julho: validar se cada persona é o
profissional real da cadeira, construir matriz de competências para todas,
testar rotina otimista, normal e pessimista e definir quem precisa saber quando
algo quebra. Vai para o fim conforme R4; a S-23 continua sendo a única sprint
em andamento.

### Diagnóstico

As sete personas existentes aprofundavam Planejamento, Comercial, Campo,
Financeiro, Assistência, Administração e Projeto, mas deixavam oito famílias de
aplicativo sem dono profissional específico. “Administrador” não substitui
comprador, almoxarife, qualidade, contratos, diretoria ou auditoria.

### Tarefas

- [x] T-30.1 — **Dezesseis profissões reais**, com separação de cadeiras que exigem segregação: comprador ≠ almoxarife; orçamentista ≠ financeiro; administrador ≠ auditor; planejador ≠ gerente de obra; projetista ≠ planejador
- [x] T-30.2 — **Matriz competência → técnica → dado** para todas as personas, documentada em `PERSONAS-E-ROTINAS.md` e codificada em `lib/personas/catalog.ts`
- [x] T-30.3 — **Cobertura automática dos 22 aplicativos**: o teste reprova módulo sem profissional, persona com menos de quatro competências, técnica sem dado e destinatário inexistente
- [x] T-30.4 — **Três cenários para cada persona** — otimista, normal e pessimista — com evento, destinatários intersetoriais e resposta esperada, em `FLUXOS-E-RISCOS.md`
- [x] T-30.5 — **Runner de cenário funcional**: 333 execuções (111 combinações persona × aplicativo operacional × otimista, normal e pessimista) ligam profissão, todos os módulos que utiliza, objeto, decisão e destinatários; PostgreSQL executa gravação, permissão e notificação em 14 testes, incluindo P15 sob identidade de cliente
- [x] T-30.6 — **Evento operacional transversal no domínio**: fato, objeto, impacto, obrigação, destinatário, SLA e evidência; otimista e normal retornam zero notificações (`lib/operations/notifications.ts`, 5 testes)
- [ ] T-30.7 — **Entrega por recorte**: executor, dono da restrição, gerente, diretoria, financeiro, cliente e auditoria recebem visões diferentes do mesmo fato
  - [x] T-30.7.1 — Planejamento determinístico dos recortes, bloqueio do cliente sem aprovação, escalonamento sem duplicação e agrupamento por objeto
  - [ ] T-30.7.2 — Persistência, inscrição por usuário, quiet hours, fila de entrega e leitura
- [ ] T-30.8 — **Aplicar ao Supabase** com RLS, idempotência, escalonamento e teste negativo multiempresa antes da interface
  - [x] T-30.8.1 — Migration local com tipos de evento, responsabilidade nominal, fato imutável, destinatário materializado, cliente só com aprovação, RLS forçada, RPC e privilégios mínimos
  - [x] T-30.8.2 — PostgreSQL 16 real: 14 testes de idempotência, isolamento multiempresa, persona de origem, cliente aprovado, leitura, autoria externa e proibição de escrita direta (`pnpm test:db:operations`, `VACINA-020`, `VACINA-022`)
  - [x] T-30.8.3 — Aplicada no projeto Supabase `wyeojufebtwblsubkunr`: 16 tipos, 8 políticas, escrita direta e `anon` negados; advisors executados e correção de performance versionada (`VACINA-021`)
- [ ] T-30.9 — **Aplicar à casca e aos arquétipos de tela**, começando pelo piloto CRM e repetindo coleção, registro, transação, planejamento e campo
- [ ] T-30.10 — **Homologar em três cenários por persona** e registrar defeito em Vacinas antes de corrigir
  - [x] T-30.10.1 — Auditoria autenticada de 17 aplicativos do Odoo, inventário de menus e capturas em `artifacts/odoo-audit-2026-07-28/`
  - [x] T-30.10.2 — Corrigir a primeira classe transversal: capacidade existente sem porta de entrada (`VACINA-028`), com menus reais para todos os aplicativos e criação de proposta, contrato, aditivo e documento
  - [x] T-30.10.3 — Branch publicada e QA autenticado do preview percorreu os 21 aplicativos e os seis fluxos críticos; menu recortado e contraste de aviso viraram `VACINA-030` e `VACINA-031`
  - [ ] T-30.10.4 — Aplicar a migration no Supabase remoto e repetir as mutações autenticadas de proposta → aceite → contrato → aditivo na homologação

---

## Sprint S-31 — Qualidade: Ishikawa sobre dado, Pareto sobre custo, e a cobrança do gestor
**Estado:** pendente
**Marco:** M-5

Ditada pelo responsável em 27 de julho:

> "daí Pareto e Ishikawa entram na qualidade, entendeu como tudo se conecta? daí
> você começa mapear e identificar os erros (…) daí você começa a pegar custos
> invisíveis, identificar pontos de falha, consegue identificar qual área precisa
> de maior atenção, começa a criar treinamentos para começar a capacitar e
> corrigir as equipes, consegue cobrar as pessoas que estão em nível gerencial"

Desenho, aritmética e dissecação em
[`QUALIDADE-CAUSA-RAIZ.md`](QUALIDADE-CAUSA-RAIZ.md). Dono da rotina é a persona
**P12**, cuja matriz já declara 8D, 5 porquês, PDCA e verificação de eficácia —
esta sprint dá a **aritmética** que faltava a essas técnicas. Vai para o fim
conforme R4.

### O achado que ordena a sprint

Pareto sobre 1.584 dias-montagem/ano, com custo por ocorrência = horas paradas ×
R$ 104,00 + retrabalho:

| Causa | Ocor./ano | R$/ano | Acum. | Espinha 6M |
|---|---:|---:|---:|---|
| Medida diferente do projeto | 190 | **387.003** | 48,1% | Medição |
| Peça faltando ou trocada | 158 | **158.552** | 67,8% | Método |
| Chuva ou condição | 63 | **52.716** | 74,3% | Meio ambiente |
| Acesso bloqueado | 95 | 49.421 | 80,5% | Meio ambiente |
| Cliente muda no local | 79 | 44.986 | 86,1% | Método |
| Ferragem errada | 111 | 43.021 | 91,4% | Material |
| Sem energia / andaime | 127 | 39.537 | 96,3% | Meio ambiente |
| Outra equipe no ambiente | 143 | 29.652 | 100,0% | Método |
| **Total** | | **804.887** | | |

**3 causas de 8 concentram 80% da perda.** E o achado que justifica a sprint
inteira: somando por espinha do Ishikawa, **mão de obra responde por 0,0%**.
Nenhuma das oito causas é do montador — mas sem dado a classificação default é
"falta de atenção", o treinamento vai para quem não causou o problema, e a
reunião seguinte conclui que "o pessoal não aprende".

Custo invisível anual: **R$ 986.715**, sendo R$ 804.887 o Pareto acima
decomposto e **R$ 181.827** de hora de gestão apagando incêndio, retorno de
assistência evitável e escopo executado e não cobrado. Nenhum tem linha própria
no DRE — aparecem diluídos em folha, frete e "margem menor que a esperada".

Retorno de atacar a causa 1 (a T-28.2, já registrada): reduzir 30% economiza
**R$ 116.101/ano**, e uma ação de R$ 25.000 paga em **2,6 meses**. Esta sprint
não pede trabalho novo — ela **precifica** o que já estava na fila e mostra que
é o mais rentável de todos.

### Tarefas

- [ ] T-31.0 — **Sintoma e causa como campos separados**, com Pareto rodando sobre **causa**. "Porta desalinhada" 40 vezes vira projeto de melhoria de porta quando a causa era assentamento de piso — sintoma agrupa chamado, causa decide investimento
- [ ] T-31.1 — **Classificação nos 6M no momento do fato**, por quem estava lá, com exemplos por espinha
  - [ ] T-31.1.1 — Painel de distribuição por espinha, com alerta de concentração: 100% numa espinha só é classificação preguiçosa, não operação com causa única
  - [ ] T-31.1.2 — Auditoria por amostragem cruzando causa declarada com evidência anexada; e comparação entre equipes, porque distribuição muito diferente na mesma praça é classificação diferente, não operação diferente
- [ ] T-31.2 — **Pareto ordenado por custo**, com frequência como segunda leitura. Calculado, a causa mais frequente da lista responde por 3,7% da perda — priorizar por frequência é trabalhar muito para economizar pouco
- [ ] T-31.3 — **Custo invisível publicado em reais**, por obra e por carteira. Enquanto for adjetivo, não entra em decisão
- [ ] T-31.4 — **Reincidência 6+6 como prova da ação**, na mesma janela da `KPIS.md`
  - [ ] T-31.4.1 — **Cobertura de apontamento no mesmo gráfico** (T-28.10): queda de ocorrência com queda de cobertura não é melhoria, é o sistema perdendo visão — e precisa aparecer como alerta, não como conquista
- [ ] T-31.5 — **Plano de ação amarrado à causa**, com dono nominal, prazo, e eficácia verificada pela reincidência e não pela conclusão da tarefa. Causa de classe A sem ação é decisão de não agir, e fica registrada como tal
- [ ] T-31.6 — **Cinco porquês apoiados em registro**: cada nível referencia parada, foto, medição ou documento. Nível sem evidência fica marcado como hipótese, e hipótese não vira plano de ação de classe A
- [ ] T-31.7 — **Da causa ao treinamento**: cada causa aponta competência nomeada da matriz de `PERSONAS-E-ROTINAS.md` e o nível alvo. Transforma "precisamos treinar a equipe" em "três projetistas precisam subir de 3 para 4 em metrologia, e isso vale R$ 193.501/ano". Subida de nível se afirma por reincidência, não por certificado de presença
- [ ] T-31.8 — **Painel do gestor**, com o que é dele e não do campo: tempo de resposta à solicitação, cobertura de apontamento da equipe, reincidência sob sua alçada, causas classe A com ação aberta, evolução da matriz da equipe e custo invisível da carteira
  - [ ] T-31.8.1 — Regra registrada: gestor com equipe de `TEP` ruim **e** resposta em três dias tem problema de gestão; com resposta em 40 minutos tem problema de competência ou de recurso. Sem separar os dois, toda reunião de resultado termina cobrando quem estava na obra
- [ ] T-31.9 — **Registrar problema nunca pode piorar o indicador de quem registrou**: parada com obrigação de terceiro não entra na produtividade de quem a abriu, e taxa de registro é indicador **positivo** do gestor. É a falha que inutiliza o programa inteiro — se registrar dói, ninguém registra, e a operação fica cega com o painel verde

---

## Sprint S-32 — Reúso de informação: sugestão, documento por modelo e campo próprio
**Estado:** pendente
**Marco:** M-5

Ditada pelo responsável em 2 de agosto. Desenho e dissecação em
[`REUSO-DE-INFORMACAO.md`](REUSO-DE-INFORMACAO.md). Vai para o fim conforme R4.

### O levantamento que mudou o escopo

Metade do pedido **já estava no banco**, e conferir antes de desenhar evitou
reconstruir o que funciona:

| Pedido | Situação |
|---|---|
| Vários seguidores por cartão | **Pronto**: `pipeline_card_followers` com RLS, ações e interface. Verificado no cartão — *"SEGUIDORES 1 · Deixar de seguir"* |
| Modelo com variáveis | **Metade**: `contract_templates.body_template` e `variables_schema` existem desde a etapa 9; falta o motor e falta sair de contrato |
| Campos próprios | **Desenhado e nunca construído**: `OBJECT-RUNTIME.md` é canônico e não tem uma migration sequer |
| Auto-sugestão | Não existe |

### Tarefas

- [ ] T-32.0 — **Catálogo de valores usados** por `(organização, escopo, valor)`, com contagem e último uso. Uma tabela e um componente de campo servem a EAP, funil, marcador, disciplina, unidade, motivo de perda e motivo de parada
  - [x] T-32.0.1 — Ordenar por frequência recente e cortar em 8; digitar filtra. Sugestão com 300 valores é ruído — `lib/sugestoes/catalogo.ts` com decaimento de meia-vida 90 dias; 18 testes em `tests/sugestoes.test.ts`; verificado no navegador (`verif28.mjs`, passo 4: digitar filtrou de 2 para 1)
  - [x] T-32.0.2 — Valor usado uma vez só há mais de 6 meses sai da lista: erro de digitação antigo não vira sugestão para sempre — regra em `ordenarSugestoes`, com teste do caso simétrico (usado várias vezes há muito tempo permanece: é vocabulário sazonal, não erro)
  - [x] T-32.0.3 — **Sugestão nunca é lista fechada.** É campo de texto com apoio, e valor novo sempre passa — `components/comum/campo-com-sugestao.tsx`, ligado à EAP e às atividades do cronograma; verificado no navegador: valor inédito gravou (passo 2) e voltou como sugestão no uso seguinte (passo 3)
  - [x] T-32.0.4 — Limpar o catálogo é ação de administrador, porque o catálogo é da organização — `/app/administracao/vocabulario` com `requireCapability("administracao","manage")` na tela e `has_module_permission(…,'administracao','DELETE')` na função do banco. Teste negativo executado contra a API: limpar catálogo de outra organização recusa (`P0001`), gravar em outra organização recusa, sem autenticação recusa no `grant` (`42501`), e na própria organização devolve 204. Verificado no navegador que remover tira da tela **e** da sugestão do cronograma
  - [x] T-32.0.5 — Ligar o campo com sugestão nos escopos que têm campo real: **etapa do funil** (coluna nova, em modo controlado), **disciplina de documento** (no acervo geral e na obra) e **unidade de medida** (item manual de orçamento). Os três gravam e leem, verificados no navegador
    - Disciplina na obra era `select` de nove opções fixas — lista fechada, que a diretriz proíbe. As nove viraram sugestão padrão da plataforma e qualquer outra passa: verificado que "Paisagismo" é aceito
    - `comPadroes` existe para o dia zero: catálogo vazio com campo sem sugestão nenhuma seria pior que a lista fechada substituída. Padrão nunca envelhece como engano e a tela diz "sugestão padrão", não "usado 0 vezes"
    - **Marcador de cartão** e **motivo de parada** não foram ligados porque os campos não existem no produto — parada de obra é da S-28
    - **Motivo de perda** não foi ligado por decisão, não por falta: o único campo é a mesma caixa de "Motivo/observação" de toda mudança de estágio, prosa sobre uma negociação. Sugerir ali empurraria a reutilizar um motivo genérico — dado errado com aparência de arrumado. Registrado em T-33.13
  - [x] T-32.0.6 — Campo curto e próprio de motivo de perda no funil, separado da observação livre da mudança de estágio; só então ligar `negocio.motivo_perda` — a caixa única "Motivo/observação" virou dois campos: **motivo** curto, com sugestão, que só aparece ao escolher "Perdida"; e **observação** livre, em toda mudança. Coluna `note` em `crm_opportunity_stage_history` e quarto parâmetro em `move_crm_opportunity_stage`, com a assinatura antiga de três argumentos removida para não sobrar caminho que grava sem observação em silêncio. Linhas antigas não são reclassificadas: o que está em `reason` foi escrito sob a regra antiga e decidir por elas seria inventar dado. Verificado no navegador — motivo escondido fora de "Perdida", obrigatório dentro, perda sem motivo recusada, e o par gravado separado (`lost_reason` + `note`) com o motivo entrando no vocabulário. **Corrigido na S-34 no mesmo dia**: o responsável pediu lista cadastrada, não campo livre com sugestão, e está certo — motivo de perda alimenta contagem, e contagem não fecha sobre texto que cada pessoa escreve do seu jeito
- [ ] T-32.1 — **Modelo de EAP**: sugerir o conjunto, não só a palavra. Quem cria "Fundação" pela terceira vez com as mesmas cinco atividades embaixo deveria poder trazer as cinco. É o "modelo de projeto" que o atlas mostra em 3 das 46 telas do capítulo Projetos
- [~] T-32.2 — **Motor de documento por modelo**, um só para proposta, orçamento, contrato, laudo e ordem de serviço — corpo, variáveis e pré-visualização em 2 de agosto; **gravar, publicar, arquivar e importar em 3 de agosto**. Falta o dicionário sair de registro real sob RLS (T-32.2.5) e o documento emitido guardar o texto resolvido (T-32.2.7)
  - [x] T-32.2.1 — Corpo em **Markdown**, não editor proprietário: versiona em diff legível, converte para PDF e DOCX e sobrevive à plataforma. O editor é visual, o que grava é Markdown
  - [x] T-32.2.17 — **Aplicativo próprio: Modelos e Documentações** (`/app/modelos`), com **uma tabela só** para proposta, orçamento, contrato, aditivo, termos, FVS, FVM, procedimento, mensagens de CRM, mensagem por etapa do funil, lembrete, agendamento, e-mail e e-mail marketing — 35 tipos em 7 categorias. **Correção de rota pedida pelo responsável em 3 de agosto**: o desenho anterior prendia cada modelo ao módulo emissor, e ele apontou o caso que derruba isso — enviar a proposta na etapa de projeto, ou o contrato assinado. Registrado em `VACINA-050`
  - [x] T-32.2.18 — **Todo aplicativo lê o mesmo acervo.** A permissão é a do aplicativo `modelos`; `document_type` classifica. Conferido: proposta aparece em Obras e contrato chega ao pós-venda, os dois casos que o responsável citou, escritos como teste
  - [x] T-32.2.19 — **Disponibilização por aplicativo, com checks, na Administração** (`/app/administracao/modelos`), gravada por empresa em `document_module_types`. É filtro de lista, **não permissão**, e a tela diz isso. Um aplicativo por vez: 19 × 35 numa grade seriam 665 caixas, e ninguém confere 665 caixas
  - [x] T-32.2.20 — **Duas origens.** `PLATAFORMA` vale para todas as empresas e muda por migration; `ORGANIZACAO` é da empresa. Quem quer sua versão do padrão **duplica**, com `derived_from` guardando de onde veio — editar por cima mudaria o de todas as outras
  - [x] T-32.2.2 — **Variável escolhida, não decorada**: nome legível e valor de exemplo do registro atual, agrupada por escopo; clicar insere no cursor. Decorar nome de variável é a razão de esse recurso morrer sem uso. **Fica atrás de um botão "Variáveis ▾" na barra de ferramentas, com busca**, e não em painel fixo na lateral — correção do responsável em 3 de agosto sobre o layout que ele mesmo desenhou: painel fixo cobra largura permanente de quem escreve por uma ação ocasional
  - [x] T-32.2.3 — Vocabulário `{{escopo.campo}}` — `{{cliente.nome_completo}}`, `{{obra.codigo}}`, `{{orcamento.valor_total}}`, `{{hoje}}`. O editor aceita também a forma com sublinhado na colagem e normaliza
  - [x] T-32.2.4 — **Substituição, nunca execução**: sem expressão, sem laço, sem chamada, com HTML escapado. Modelo é dado, e dado que executa é o caminho mais curto para extrair o que não se pode ver
  - [x] T-32.2.9 — **Tabela `document_templates`** com `module_key` e `purpose`, RLS pela permissão do módulo, aplicada e conferida no banco: RLS ligada, forçada e quatro políticas
  - [x] T-32.2.5 — **O dicionário respeita a RLS** de quem gera. `lib/documentos/resolucao.ts` consulta com o cliente da sessão, nunca com `service_role`: quem não pode ler um cliente recebe lacuna no lugar do nome dele. Se usasse o cliente administrativo "porque é só leitura", bastaria escrever `{{cliente.documento}}` num modelo para extrair o que a permissão nega
  - [x] T-32.2.12 — **Gravar, abrir, publicar e arquivar pela tela.** Explorador lista o acervo agrupado por categoria e tipo; `File` abre, salva, salva como, publica, arquiva e importa
  - [x] T-32.2.13 — **Salvar não rebaixa publicado** (`VACINA-049`). O estado seguinte é lido do atual, e alterar publicado exige a mesma alçada de publicar — no aplicativo **e** na política de `UPDATE` do banco, migration `20260803120000`. Arquivar continua exigindo só `EDIT`: tirar de circulação um modelo com defeito tem de ser barato
  - [x] T-32.2.14 — **Concorrência tratada, não ignorada**: `version_number` viaja no formulário e a gravação só acontece se a versão ainda for aquela. Duas abas editando o mesmo modelo: a segunda grava, a primeira recebe "alguém salvou depois de você (versão 3)" **com o texto preservado** — não o silêncio de sobrescrever o trabalho do outro
  - [x] T-32.2.15 — **Importar DOCX, XLSX, CSV, TXT e Markdown, sem dependência.** `.docx` e `.xlsx` são ZIP com XML, e o navegador descomprime sozinho com `DecompressionStream`. A conversão acontece **na máquina de quem importa**: modelo de proposta traz preço, cliente e margem, e nada disso precisa sair para virar texto. `.doc`, `.xls`, `.rtf`, `.odt` e `.pdf` são **recusados com o motivo e o que fazer** — PDF é o único que pediria biblioteca de verdade
  - [x] T-32.2.16 — Verificado com os **dois arquivos reais entregues pelo responsável** em 3 de agosto: um procedimento operacional (535 linhas, 6 títulos, 15 tabelas, 86 itens de lista) e uma proposta de fundações (233 linhas, 1 tabela). Foi neles que apareceram os defeitos que exemplo de manual não mostra — runs vizinhos partidos no meio da palavra e estilo de título no idioma da instalação do Word
  - [x] T-32.2.6 — **Variável não resolvida aparece**, com contagem de lacunas no envio e bloqueio antes da assinatura. Documento assinado com buraco em branco é pior que documento que não gerou
  - [x] T-32.2.7 — **Documento emitido guarda o texto resolvido**, nunca a referência ao molde: contrato não pode mudar porque alguém editou o modelo depois. Tabela `emitted_documents` **sem UPDATE e sem DELETE** — corrigir um documento emitido é emitir outro —, com SHA-256 do texto, as lacunas do instante da emissão e `template_id` só como procedência
  - [x] T-32.2.21 — **Tela de emissão** (`/app/modelos/emitir`): escolher modelo e registros, conferir a prévia, emitir. A prévia e a gravação são **o mesmo caminho no servidor**, com um campo a menos — prévia calculada no navegador mostraria valores que o servidor recusaria a preencher. Só modelo publicado emite
  - [x] T-32.2.22 — `VACINA-051`: a prévia saía com 7 lacunas e o documento emitido com 11. O `select` controlado perde a seleção **no DOM** quando a resposta da server action re-renderiza a árvore, e é o DOM que o formulário envia; o estado do React ficava intacto o tempo todo. Corrigido, e a verificação passou a comparar as duas contagens
  - [x] T-32.2.8 — Validação do modelo lista variáveis inexistentes **antes** de publicar
  - [x] T-32.2.10 — **Interface no layout entregue pelo responsável**: barra do documento, barra de menu (File · Edit · Inserir · View), barra de ferramentas e três regiões — explorador ⟷ editor ⟷ pré-visualização — com explorador e prévia ligando e desligando pelo menu View. Conferido em navegador em 1366, 1440 e 1920: três regiões, sem transbordo, sem erro de console
  - [x] T-32.2.11 — **Numeração de linha por espelho**: cada linha lógica é repetida invisível com a mesma fonte e a mesma largura de conteúdo do campo, para o número ficar na altura certa quando a linha quebra sozinha. Contar `\n` erra assim que um parágrafo ocupa duas alturas, e na coluna de 474px do editor a 1366 quase todo parágrafo ocupa. Medido: linha que quebra ocupa 69px contra 23px, e o número seguinte cai abaixo dos 69px; a numeração acompanha o tamanho escolhido na barra e a rolagem do campo
- [ ] T-32.3 — **Campos próprios por objeto**, primeiro corte do Object Runtime, que é canônico desde antes desta sprint e nunca virou migration
  - [ ] T-32.3.1 — A tela pergunta **o que a informação faz** — "é uma data?", "é uma pessoa da equipe?", "é dinheiro?" — e o tipo sai daí. O usuário não responde "qual tipo?" na forma técnica
  - [ ] T-32.3.2 — **Nasce filtrável**: campo que não entra na busca vira campo que ninguém lê
  - [ ] T-32.3.3 — Campo do tipo pessoa **inscreve como seguidor** quando preenchido — é o que faz "arquiteto do projeto" valer mais que texto
  - [ ] T-32.3.4 — Sugestão de campo existente por nome parecido **antes** de criar, para não nascerem "Arquiteto" e "arquiteto"
  - [ ] T-32.3.5 — Arquivar em vez de excluir, preservando o preenchido; obrigatoriedade vale para frente e não invalida registro antigo

### Ordem, e por que ela mudou

O desenho original era sugestão → documento → campo próprio. **O responsável
inverteu os dois primeiros em 2 de agosto**, com a justificativa que decide:

> "o editor tem que ser uma prioridade para continuar a desenvolver os outros
> módulos que utilizam documentações, como propostas, layouts de mensagens
> padrão, orçamentos, FVS, FVM, um monte de apps dependem desse módulo"

É pré-requisito descoberto, o caso previsto na R5. O motor de documento não é
uma funcionalidade do módulo de propostas: é **infraestrutura de sete módulos**,
e construir cada um sem ele significa construir sete editores que depois
precisam ser desfeitos.

Quem depende, nominalmente:

| Módulo | O que precisa do motor |
|---|---|
| Propostas | Corpo da proposta com dados do cliente e do orçamento |
| Orçamentos | Layout padrão de envio |
| Contratos | Já tem `contract_templates`, sem motor |
| Aditivos | Mesmo corpo do contrato, com o que mudou |
| Qualidade | **FVS e FVM** — ficha de verificação de serviço e de material |
| Relacionamento | Layouts de mensagem padrão, e-mail e WhatsApp |
| SAC | Resposta padrão e laudo de atendimento |

Ordem vigente: **motor de documento → sugestão → campo próprio.** Sugestão
continua barata e entrega sozinha, mas não destrava ninguém; o motor destrava
sete.

---

## Sprint S-33 — Defeitos silenciosos encontrados na verificação da S-32

**Estado:** pendente

Descobertos ao verificar T-32.0 no navegador, e registrados no fim conforme a
R4. Nenhum deles tem sintoma: todos aprovam nas ferramentas e falham em uso.

- [x] T-33.0 — **Embed ambíguo derruba a consulta inteira** (VACINA-052). A tela de obras listava zero com duas obras no banco, e a obra existente respondia 404. Sete telas, quatro pares de tabelas. Corrigido com chave nomeada; falha de carga separada de registro inexistente; `pnpm validate:postgrest-embeds` reconstrói o grafo de chaves estrangeiras e reprova embed ambíguo sem chave — provado com teste negativo
- [x] T-33.1 — **Chave de módulo inexistente nega todo mundo** (VACINA-053). `'dashboard'` não existe em `app_modules`, e o catálogo de valores nunca gravava. O mesmo validador encontrou `'modelos'`: dez guardas do acervo apoiados numa chave que nenhuma migration cria — o app inteiro nasceria negando todo mundo num ambiente novo. Corrigido com `is_org_member`, migration de semeadura e `pnpm validate:module-keys`
- [x] T-33.2 — **`Escape` fechava o formulário junto com a lista de sugestão** (VACINA-054), descartando o preenchimento. Camada interna aberta consome a tecla; fechada, deixa passar
- [x] T-33.3 — **Medidor de contraste não entendia `color(srgb …)`** e lia o fundo como preto, acusando 1,3:1 onde havia 15:1. Quarto ponto cego do instrumento, e o primeiro a errar acusando. Corrigido com conferência unitária dos dois lados
- [x] T-33.4 — **Cronograma com 14 alvos de toque abaixo de 44px** — barra da obra em 43px, um pixel abaixo, e botões do planejador em 34px. Agora 0 nas três larguras e nos dois temas
- [x] T-33.5 — **Barra de navegação da obra com fundo branco fixo no tema escuro**: 2,11:1 nos sete links. E `--muted` em 4,49:1, um centésimo abaixo do mínimo. Cronograma, início, obras, modelos, CRM e orçamentos fecham em 0/0 nos dois temas
- [x] T-33.6 — Herói da obra com título em `--text` sobre fundo escuro (1,12:1) e percentual branco sobre miolo branco, invisível também no portal do cliente — o único dado do cartão. Título em branco, anel com miolo escuro declarado no elemento que carrega o número (pseudo-elemento não é enxergado por auditoria de contraste)
- [x] T-33.7 — Kanban de tarefas com colunas de fundo claro fixo no tema escuro: 12 reprovações, os seis nomes de coluna ilegíveis. Todo fundo de `app/stage12.css` passou a token de superfície — kanban, cartão, trilha, barra do Gantt, nó da EAP, mídia, alerta e barra de ações
- [x] T-33.8 — Um erro de console na tela de tarefas, nas seis combinações de largura e tema: `PGRST200` no embed `profiles(full_name)` a partir de `project_memberships`, cuja `user_id` aponta para `auth.users`. O seletor de responsável mostrava um pedaço de UUID no lugar do nome. Corrigido em tarefas e equipes com `lib/pessoas/nomes.ts` (VACINA-055)
- [x] T-33.9 — Ramo de PGRST200 no validador de embeds, com leitor de `select` sensível à profundidade da árvore e universo de tabelas vindo dos `create table`. A versão achatada acusou 22 embeds válidos e escondeu cinco ambíguos reais — contratos, propostas, orçamentos, qualidade e assinaturas, todos corrigidos
- [x] T-33.10 — `--muted`, `--warning` e o `--brand` do tema escuro abaixo de 4,5:1 sobre as próprias superfícies; estado vazio e link de voltar com fundo e alvo fixos. Onze rotas fecham em 0/0 de contraste nos dois temas e 0 alvo abaixo de 44px
- [ ] T-33.11 — Duas paletas de tema escuro convivem em `app/globals.css`: a antiga (superfícies `#161b25`, linhas 68–118) está morta, vencida pela nova (`#102238`). Editar a errada não produz efeito nenhum — unificar

- [ ] T-33.12 — Tabela em tela estreita: as 20 telas do produto rolam na horizontal dentro de `.table-wrap`, sem indicar que há coluna fora de vista. Em 390px a coluna de ação some. Decidir um padrão único para o produto — cartão por linha, coluna prioritária ou indicação de rolagem — em vez de resolver tela a tela

- [ ] T-33.13 — Página de orçamento transborda em todas as larguras (1627px contra 1366 disponíveis), inclusive no desktop. Medido com e sem a alteração desta sprint: idêntico nos dois, é anterior
- [ ] T-33.14 — Cartão do funil com alvo de toque de 19px em 390px de largura — o título do cartão, que é o alvo principal do kanban no telefone. Também anterior, confirmado por medição com e sem alteração
- [ ] T-33.15 — `chaveNormalizada` não funde "m2" e "m²", que são a mesma unidade escrita de dois jeitos e as duas serão digitadas. Fundir expoentes ajudaria unidade e poderia atrapalhar outros escopos — decidir por escopo, não globalmente

- [x] T-33.16 — **Mapa do código gerado**, não escrito à mão: `diretrizes/MAPA-DO-CODIGO.md` com aplicativos, 151 rotas e a guarda de cada uma, 174 server actions por arquivo, 78 módulos de `lib/` com exportados e cobertura, 220 funções do banco com quem as declara e quem as chama, suítes de teste e validadores. `pnpm validate:code-map` reprova no CI quando o arquivo diverge do código
- [x] T-33.17 — O mapa **confronta** em vez de listar: RPC chamada sem migration, módulo nunca importado e server action que nenhuma tela referencia. O débito conhecido está congelado em `diretrizes/mapa-do-codigo.debito.json` com responsável nomeado, e o validador reprova tanto item novo quanto item já consertado que continue na lista — provado nos três casos
- [x] T-33.18 — Aritmética de cor do medidor de contraste extraída para `scripts/qa/cor.mjs` e coberta por 19 testes, um por defeito que o instrumento já teve. Antes não tinha nenhum: função serializada para o navegador não é importável, e foi assim que quatro versões erradas entraram
- [x] T-33.19 — `--exigir` nos dois scripts que saíam 0 quando o banco faltava (VACINA-056). "Não rodou" deixou de ter o mesmo código de saída de "passou"
- [ ] T-33.20 — Sete server actions e um módulo de `lib/` sem nenhum uso, listados no débito do mapa. Decidir, um a um, entre ligar à tela que os justifica e remover — são superfície exposta sem função

## Sprint S-34 — Listas cadastradas: o que a empresa decide que existe como opção

**Estado:** pendente

> **Nota de estado, para não parecer contradição.** As tarefas marcadas abaixo já estão
> entregues, e a sprint segue `pendente` porque a R3 admite **uma** sprint em andamento e a
> vigente é a S-23. O mesmo vale para a S-32 e a S-33: o trabalho vem sendo dirigido pelo
> responsável tarefa a tarefa, fora da ordem formal do inventário. Regularizar isso — abrir e
> fechar sprint conforme a R5 — é decisão dele, não da sessão.

Correção de rota do responsável em 3 de agosto de 2026, sobre a T-32.0.6 entregue no
mesmo dia:

> "quando for para perdido precisa abrir um formulário com os motivos da perca do lead, tipo
> parou de responder, praça errada, Produto errado, etc… esses itens tem que ser possível
> cadastrar no menu"

Ele está certo, e a razão é a mesma que fez o campo livre não servir: **motivo de perda
alimenta contagem.** "Quantos perdemos por preço neste trimestre" não fecha sobre texto que
cada pessoa escreve do seu jeito — nem com sugestão, porque sugestão não obriga.

Isto **não contraria** a diretriz de reúso, e vale escrever a diferença para não ser confundida
depois. `value_catalog` é **observado**: nasce do uso, serve para lembrar a grafia que a empresa
já escolheu, e ali lista fechada seria uma piora. `managed_list_values` é **curado**: alguém
decidiu quais opções existem, em que ordem e quais saíram de circulação. Etapa de EAP é
vocabulário; motivo de perda é dimensão de análise. São campos de naturezas diferentes, e tratar
os dois igual foi o erro de T-32.0.6.

- [x] T-34.1 — Tabela `managed_list_values` **por escopo**, não uma tabela de motivos: marcador de cartão e etapa de funil vão pedir a mesma tela, e três tabelas quase iguais é três vezes a mesma correção
- [x] T-34.2 — **Desativar em vez de excluir.** Excluir apagaria a opção de negócios que já a escolheram, e a contagem do trimestre passado mudaria sozinha
- [x] T-34.3 — Cadastro em `/app/administracao/motivos-de-perda`, no menu de Administração: acrescentar, renomear, reordenar e tirar de circulação. Reordenação troca vizinhos, não renumera a lista — duas pessoas mexendo ao mesmo tempo embaralhariam a ordem uma da outra
- [x] T-34.4 — Nove motivos semeados como ponto de partida, começando pelos três que o responsável nomeou. Empresa nova nasce com a lista por trigger, como a semeadura de modelos
- [x] T-34.5 — **O funil abre o formulário de perda** ao escolher "Perdida", com os motivos cadastrados em rádio aberto — poucas opções curtas, e a lista visível deixa comparar antes de escolher. Nenhum vem marcado
- [x] T-34.6 — **Conferência no servidor**, não só no `required` do rádio: o que chega é um POST, e um POST montado à mão gravaria qualquer texto em `lost_reason`, que é justamente a coluna que precisa ser contável
- [x] T-34.7 — Lista vazia **bloqueia o envio** e diz onde cadastrar, em vez de mostrar um seletor sem opção; a mensagem muda conforme quem está olhando pode ou não administrar
- [x] T-34.8 — `negocio.motivo_perda` deixa de gravar em `value_catalog`: duas fontes para o mesmo campo fariam o mesmo valor aparecer em duas telas de administração como se fossem coisas diferentes
- [x] T-34.9 — Contagem de perdas por motivo, que é a razão de a lista ser curada — `/app/relatorios/perdas`, Pareto **ordenado por valor e não por contagem**: doze perdas de R$ 5 mil somam menos que uma de R$ 400 mil, e ordenar por contagem mandaria resolver o problema errado. Classificação A/B/C na convenção de `QUALIDADE-CAUSA-RAIZ.md` §2, com teste que reproduz os oito valores da tabela de lá — se ela mudar, ou a diretriz mudou junto, ou a implementação divergiu
  - [x] T-34.9.1 — Perda **sem motivo** entra na conta como linha própria. Esconder produziria um relatório bonito e falso: os percentuais fechariam em 100% sobre uma base que não é o total perdido
  - [x] T-34.9.2 — Seção dos motivos cadastrados que ninguém escolheu no período. É o outro lado da curadoria: motivo que ninguém escolhe em doze meses ou não descreve a realidade da empresa, ou está escrito de um jeito que ninguém reconhece — e o que não aparece não chama atenção
  - [x] T-34.9.3 — A classificação A/B/C **some abaixo de cinco motivos**. Medido na tela: com dois, "praça errada" com 44% da perda saía como classe C, que é o rótulo de desprezível. ABC pressupõe cauda longa; sem ela, a ordem por valor já é a mensagem inteira
  - [x] T-34.9.4 — Regra da tabela canônica corrigida num caso que ela não previa: com um motivo só, o acumulado da primeira linha já é 100% e a maior causa sairia como C. A primeira linha é sempre A — ela é, por definição, a prioridade
- [x] T-34.10 — Avaliada a mesma tela para marcador de cartão e etapa de funil. **Resposta: não, e por motivos diferentes.** Etapa de funil é vocabulário, não dimensão: cada construtora nomeia as próprias etapas, elas mudam por trilha e ninguém soma "quantas etapas 'Qualificação' existem" — curar obrigaria a passar por Administração para criar uma coluna, que é o oposto do que a tela do funil precisa ser. Marcador de cartão não existe no produto; avaliar antes de existir seria decidir sobre o que não se viu. O critério fica escrito: **cura-se o que alimenta contagem; observa-se o que nomeia**
  - [ ] T-34.10.1 — Reavaliar marcador de cartão quando ele existir, contra esse critério

- [x] T-34.11 — Medidor de alvo de toque passa a aplicar a isenção da WCAG 2.5.5 para link **dentro de frase**: aumentar um link em texto corrido exigiria quebrar a linha do parágrafo, e reprovar a marcação correta ensina a ignorar o vermelho. Só isenta quando há frase em volta — link sozinho num parágrafo é botão mal vestido e continua medido. Provado com teste negativo: encolhendo a barra de relatórios de propósito, a reprovação volta
- [x] T-34.12 — Barra de navegação dos relatórios em 41px, três abaixo do mínimo. Executivo, obras, financeiro, compras, qualidade, perdas, metas, salvos e snapshots fecham em 0
- [x] T-34.13 — Relatório executivo: transbordo e alvos corrigidos. O transbordo era a **VACINA-044 outra vez** — `grid-template-columns:1fr` na consulta de mídia não encolhe abaixo do `min-content` do filho, e a tabela de desempenho por obra (621px) arrastava a página. Aplicada a solução já registrada (`minmax(0,1fr)` mais `min-width:0` no item), não uma nova
- [x] T-34.14 — Tons do módulo de relatórios eram fixos do tema claro: no escuro o cartão de indicador ficava com fundo verde ou vermelho claro e o número em branco por cima — 1,03:1 no "0%". Mesma causa raiz de `stage12.css` e do estado vazio. **As nove telas de relatório fecham em 0/0** de contraste nos dois temas e 0 alvo abaixo de 44px nas três larguras

---

## Registro de reordenação

Toda mudança na ordem de execução das sprints, conforme R5 e R6.

| Data | O que mudou | Por quê |
|---|---|---|
| 2026-08-02 | Dentro da S-32, o motor de documento passa à frente da auto-sugestão | **Pré-requisito descoberto**, caso previsto na R5. O responsável nomeou os dependentes: propostas, orçamentos, contratos, aditivos, FVS e FVM da qualidade, layouts de mensagem padrão e resposta do SAC. Construir esses módulos antes do motor significa construir sete editores para desfazer depois. A auto-sugestão continua barata e entrega sozinha, mas não destrava nenhum módulo. |
| 2026-07-26 | S-23 passa à frente da S-22 e da S-20 | Caso de **base reaproveitável** previsto na R5. Os componentes de campo da S-23 servem aos 20 módulos e resolvem o defeito mais grave já verificado — dado inválido gravado em produção. A S-22 trata de reconstrução do banco e não bloqueia interface; a S-20 troca vocabulário nas mesmas telas que a S-23 vai refazer, então entra junto, tela por tela, para não refazer duas vezes. |
| 2026-07-25 | Virada S-21 → S-22, sem reordenação | A S-22 nasceu do resultado da própria S-21 e é pré-requisito de tudo: enquanto o repositório não reconstrói o banco, nenhuma sprint que crie migration tem base verificável. A S-06 e a S-20 seguem atrás dela. |
| 2026-07-25 | S-21 passa à frente da S-06 | Pré-requisito descoberto, caso previsto na R5. A S-06 cria a camada compartilhada sobre o esquema da homologação; enquanto o repositório não reproduz esse esquema, qualquer migration nova é aplicada sobre chão que ninguém consegue recriar. Reconciliar o ledger primeiro é o que torna a S-06 verificável. |
| 2026-07-25 | Virada S-05 → S-06, sem reordenação | Avaliadas as pendentes na virada, conforme R5. S-06 continua a próxima: a camada compartilhada consome a projeção de slots que a S-05 acabou de produzir, e S-07 e S-08 dependem da tabela existir. A S-20, descoberta durante a S-05, não passa à frente por ser vocabulário de interface, sem bloquear nada da fundação. |
| 2026-07-25 | Virada S-04 → S-05, sem reordenação | Avaliadas as pendentes na virada, conforme R5. S-05 continua primeira: o catálogo de definições é pré-requisito físico de todas as demais sprints do M-1 — sem ele não há o que armazenar, indexar ou proteger. Nenhuma sprint pendente é pré-requisito descoberto nem base reaproveitável que justifique passar à frente. |

---

## Como uma sessão usa este arquivo

1. Lê no início, sempre (R1).
2. Localiza a sprint `em andamento` e a primeira tarefa `[ ]` dela.
3. Executa aplicando a decomposição em micro-problemas.
4. Marca `[x]` ao concluir, com evidência (R2).
5. Ao terminar a sprint, marca `concluída`, e só então escolhe a próxima — podendo reordenar as pendentes, com registro (R5, R6).
6. Descobriu algo novo? Vai para o fim (R4), nunca no meio.
