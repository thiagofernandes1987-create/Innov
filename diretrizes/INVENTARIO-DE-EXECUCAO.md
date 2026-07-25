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
**Estado:** em andamento
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

## Registro de reordenação

Toda mudança na ordem de execução das sprints, conforme R5 e R6.

| Data | O que mudou | Por quê |
|---|---|---|
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
