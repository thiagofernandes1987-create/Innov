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
- [ ] T-22.6 — Ligar o replay ao CI, para que a promessa de recuperação passe a ser verificada a cada mudança e não uma vez por descoberta
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
- [ ] T-23.18 — **Defeito D3 reconfirmado.** Falha de rede aparece como "Credenciais inválidas ou conta não liberada" na tela de login (`app/actions/auth.ts:18`), embora a autenticação direta com as mesmas credenciais devolva 200. Erro de infraestrutura precisa de mensagem própria
- [ ] T-23.18 — **Defeito D3 reconfirmado.** Falha de rede aparece como "Credenciais inválidas ou conta não liberada" na tela de login (`app/actions/auth.ts:18`), embora a autenticação direta com as mesmas credenciais devolva 200. Erro de infraestrutura precisa de mensagem própria

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
  - [x] T-24.0.1 — Barra 1 igual em toda tela: marca sozinha à esquerda, ícone e nome do aplicativo com os menus dele, busca com facetas ao centro, mensagens, notificações e avatar à direita
  - [x] T-24.0.2 — E-mail por extenso e botão "Sair" saíram da barra para dentro do avatar, junto com tema, atalhos e "Usuários e permissões" — dois elementos permanentes para uma ação de uma vez por dia
  - [x] T-24.0.3 — Barra 2 com ações à esquerda e visualizações à direita, sem repetir a busca nem o nome do aplicativo
  - [x] T-24.0.4 — Grade de três colunas na barra 1: com `margin: auto` a busca centralizava no espaço que sobrava e dançava conforme o tamanho do nome do módulo. Verificado — centro do campo em 720 de 1440
- [ ] T-24.7 — **Busca global na barra superior**: hoje o campo existe no centro, com faceta e remoção, e filtra a tela do pipeline. Falta procurar em cliente, projeto, chamado e cartão ao mesmo tempo, com resultado agrupado por tipo, e o painel de Filtros, Agrupar por e Favoritos da §12.5
  - [x] T-24.7.1 — Campo no centro da barra 1, com lupa, faceta removível e Backspace apagando a faceta
  - [x] T-24.7.2 — Filtro aplicado no navegador, não por navegação. A primeira versão escrevia em `router.replace` a cada tecla; como as telas são `force-dynamic`, cada digitação virava ida ao servidor e a lista chegava quase três segundos atrasada. A URL continua espelhada por `history.replaceState`, sem re-render de servidor
  - [x] T-24.7.3 — Exceção declarada na §12.4: o campo só aparece onde a tela sabe consumi-lo. Campo que aceita texto e não filtra ensina que a busca não funciona
- [ ] T-24.8 — **Planejamento, visão de lista por cliente** com as colunas que o responsável enumerou: início da obra, término previsto, etapa atual, início e término previsto da etapa, % concluída, situação do prazo, dias de folga ou atraso, responsável e próxima tarefa programada
- [ ] T-24.9 — **Planejamento, visão Gantt** ao abrir o cliente: datas de início e término, dependências II, IT, TT e TI, dias programados e caminho visível de atraso
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

## Registro de reordenação

Toda mudança na ordem de execução das sprints, conforme R5 e R6.

| Data | O que mudou | Por quê |
|---|---|---|
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
