# Execução da auditoria de regressão — 2026-08-08

**Branch:** `audit/regressao-main-20260808`  
**Base congelada da main:** `09498a4832087126855243bdd992fdb58f932f64`  
**Main alterada:** não  
**Migrations destrutivas aplicadas no Supabase ativo:** não  
**Estado:** convergência e auditoria final em andamento; branch ainda não autorizada para merge.

## 1. Convergências já executadas

| Área | Estado | Ação executada |
|---|---|---|
| Launcher | corrigido | restaurado contrato estável `LauncherSummaryMap/resumos`; removida fusão `resumos × indicadores` |
| CRM / nova oportunidade | corrigido | rota reconectada a `OpportunityForm → createCrmOpportunitySafe`; UUID livre removido; `CampoMoeda` preservado |
| Planejamento / `schedule.ts` | reconvergido | validações de escopo, hierarquia e ciclo preservadas; numeração automática, vocabulário e modelos de EAP reintegrados |
| Obras / `projects.ts` | reconvergido | porta legada de criação por contrato removida; upload seguro de Diário/Documentos reintegrado; mensagens seguras preservadas |
| Tarefas | reconvergido | cálculo por dependências preservado; resolvedor de nomes único; `profilesById` fantasma removido |
| Equipes | corrigido | consulta redundante de `profiles` removida; erro de consulta não utilizada deixou de bloquear cadastro |
| Launcher / motor concorrente | removido | `lib/casca/indicadores.ts` eliminado; `launcher-metrics.ts` permanece canônico |
| Diário / recursos | reconectado | `daily_log_resources` ganhou action e superfície real no Diário, com validação de escopo e estado |
| Tarefas / recursos | reconectado | `task_resource_allocations` ganhou upsert e superfície real de planejado/realizado |
| Exceções operacionais | reconectado | `create_operational_event` ganhou produtor em `/app/excecoes`; cadeia fecha em notificações e `read_at` |
| Object Runtime | endurecido | Estúdio deixou de expor/logar `error.message` bruto; `object_record_upsert` permanece deliberadamente latente até a leitura keyset |
| QA modular | corrigido | inventário regenerado para os 24 módulos do `registry.ts`, incluindo `modelos` e `whatsapp` |
| QA autenticado | corrigido | harness espera Server Action real; `administrador` e `gestor_de_obras` executam 6 cenários cada |
| QA paralelo antigo | removido/depreciado | fonte paralela antiga eliminada; QA genérico virou manual/parametrizado |
| Vacinas | corrigido | duplicatas 043/044 renumeradas como 062/063; catálogo contínuo 001–063 |

## 2. Detectores adicionados

- `pnpm audit:reachability` — grafo de alcançabilidade a partir dos entrypoints Next;
- `pnpm audit:server-actions` — server actions exportadas sem consumidor por símbolo;
- `pnpm audit:supabase-surface` — superfícies Supabase declaradas versus consumidores de runtime/scripts.

Esses comandos são detectores de candidatos. Nenhum deles autoriza exclusão automática.

## 3. Supabase — superfícies confirmadas como ativas

### Storage

Os dez buckets privados existentes possuem consumidores reais e foram preservados:

- `commercial-documents`;
- `contract-documents`;
- `crm-sac-attachments`;
- `daily-log-media`;
- `finance-attachments`;
- `procurement-attachments`;
- `project-documents`;
- `quality-documents`;
- `quality-form-attachments`;
- `signature-artifacts`.

### Infraestrutura SQL preservada

Não classificar como órfã apenas por ausência de chamada `.rpc()`/`.from()` direta:

- `write_audit` e `record_audit_event` — infraestrutura interna de auditoria;
- `create_project_from_contract` — núcleo usado por `create_project_from_contract_v2`;
- `can_access_project`, `can_access_sac_ticket`, `is_project_client`, `pipeline_permite_cartao` e `quality_client_matches` — helpers ativos de RLS;
- `pipeline_codigo_data` — chamado por dois `CHECK` constraints e uma coluna gerada;
- `record_observability_diagnostic` — API técnica deliberada da Etapa 19, protegida por autorização interna/service-role;
- `membership_access_profiles`, overrides e `permission_change_events` — resolução/administração de acesso;
- `cost_source_sync_runs` — cron de fontes oficiais;
- `project_progress_snapshots` — curvas e páginas interna/cliente;
- `operational_notifications` — avisos operacionais;
- `inventory_reserved_stock_v` — base de `inventory_available_stock_v`, usada por `create_inventory_reservation`, `get_inventory_dashboard` e `post_inventory_movement`;
- `document_types` — 35 registros e FKs de `document_module_types`, `document_templates` e `emitted_documents`;
- tabelas/views de inventário, compras, qualidade, relatórios, assinaturas e SAC restantes — possuem funções, FKs, triggers ou views dependentes comprovadas.

### Object Runtime

`object_record_upsert` não é legado. O contrato canônico `OBJECT-RUNTIME.md` mantém pendente o item 4 — leitura com paginação keyset e recusa de filtro não indexado — e o POC de carga. A escrita de registros não será conectada à UI antes dessa camada de leitura existir.

## 4. Limpeza de banco preparada, mas NÃO aplicada

As migrations abaixo estão registradas em `diretrizes/migrations-aplicadas.json` como `debito.arquivos_sem_aplicacao`. O banco ativo continua com o schema anterior para permanecer compatível com a aplicação atualmente publicada.

### RPCs antigas de criação de obra

Migration: `20260808133000_drop_revoked_legacy_project_creation_rpcs.sql`

- remove `create_independent_project`;
- remove `create_independent_project_v2`;
- preserva `create_independent_project_v3`.

As versões antigas já estavam revogadas para usuários e não possuem objetos dependentes. Dry-run `BEGIN/ROLLBACK` executado no banco ativo com sucesso.

### Núcleo de criação por contrato

Migration: `20260808133500_close_direct_legacy_contract_project_rpc.sql`

- preserva `create_project_from_contract` como núcleo interno;
- retira execução direta de `anon/authenticated`;
- mantém `create_project_from_contract_v2` como porta pública autenticada.

### `fixed_costs`

Migration: `20260808134000_remove_unused_fixed_costs_table.sql`

- tabela vazia;
- nenhum consumidor da aplicação;
- nenhum FK de entrada ou view dependente;
- custo fixo atual é representado em `budget_items` com `cost_type='FIXED'`.

O único match textual em função era `calculate_budget_version_core`, por causa da chave de assumption `fixed_costs_in_bdi`; a função não consulta a tabela `fixed_costs`. Dry-run de `DROP TABLE` executado com rollback e sucesso.

### RPC antiga de versão de orçamento

Migration: `20260808134500_drop_legacy_create_budget_version_rpc.sql`

- remove `create_budget_version`, que ainda copia os IDs antigos de BDI/taxa administrativa;
- preserva `create_next_budget_version`, porta utilizada pelo runtime atual.

A ordem é deliberada: a RPC antiga é removida antes de a migration seguinte retirar suas colunas legadas.

### Convergência BDI/admin → Markup

Migration: `20260808135000_converge_budget_pricing_to_markup.sql`

Estado observado no banco ativo antes da migration:

- 10 `budget_versions`;
- 0 com `bdi_model_version_id`;
- 0 com `administrative_fee_model_id`;
- 4 com `markup_model_id`;
- tabelas `bdi_models`, `bdi_model_versions` e `administrative_fee_models` sem dados.

A migration:

1. torna `markup_models` a única fonte configurável de formação de preço;
2. reescreve `calculate_budget_version_core` e `create_next_budget_version` antes dos `DROP`;
3. ajusta o trigger de imutabilidade;
4. remove os dois FKs/IDs legados de `budget_versions`;
5. remove as tabelas BDI/admin vazias.

O script completo foi validado no PostgreSQL real dentro de `BEGIN ... ROLLBACK`, incluindo os `DROP`; o dry-run passou. Não foi persistido.

### Superfícies superseded de contratos, inventário e relatórios

Migration: `20260808135500_drop_superseded_contract_inventory_report_surfaces.sql`

Prepara a remoção de:

- `contract_parties` — 0 linhas, 0 FKs de entrada, 0 triggers, 0 funções, 0 views dependentes e nenhum consumidor de aplicação; superseded pela arquitetura avançada de assinaturas;
- `inventory_item_totals_v` — sem consumidor/dependente; o dashboard canônico é `get_inventory_dashboard`;
- `report_executive_kpis_v` — sem consumidor/dependente; o dashboard canônico é `get_report_dashboard` sobre `report_project_kpis_v`.

Guardas da própria migration:

- aborta se `contract_parties` ganhar qualquer registro antes do deploy;
- usa `DROP ...` sem `CASCADE`, portanto qualquer nova dependência criada depois da auditoria bloqueia a aplicação.

A lógica exata foi executada no PostgreSQL ativo dentro de `BEGIN ... ROLLBACK`; os três objetos desapareceram dentro da transação e foram confirmados novamente presentes após o rollback. Nada foi aplicado permanentemente.

## 5. Ordem e regra de deploy das migrations

As migrations estruturais acima **não devem ser aplicadas antes do código desta branch**. A aplicação atualmente publicada ainda corresponde à `main` anterior e pode referenciar o schema legado.

A ordem dos arquivos destrutivos é deliberada:

1. `13:30` — remover portas `create_independent_project` revogadas;
2. `13:35` — fechar execução direta do núcleo `create_project_from_contract`;
3. `13:40` — remover `fixed_costs`, já sem consumidor real;
4. `13:45` — remover `create_budget_version`, antes de retirar os campos que ela copia;
5. `13:50` — reescrever cálculo/versionamento e convergir BDI/admin para markup;
6. `13:55` — remover as três superfícies superseded independentes.

Sequência operacional segura:

1. CI completo da branch;
2. preview/homologação da aplicação corrigida;
3. aplicar migrations em ambiente compatível, na ordem acima;
4. executar testes DB e fluxos críticos;
5. captura visual e QA por persona;
6. auditor final código ↔ Supabase ↔ rotas ↔ módulos;
7. somente depois avaliar merge.

## 6. Estado dos gates e pendências finais

Checkpoint anterior a esta atualização documental (`d7be130896d23603951deacd4044293d35772797`):

- CI #3975: verde;
- Audit Orphan Surfaces #105: verde;
- Object Runtime Database Tests #28: verde;
- Stage 20 File Security E2E #1099: verde;
- QA Fixture Pública #607: verde;
- QA Launcher e Projetos #614: verde;
- Stage 18 #610: cancelado por concorrência antes de criar job; não foi falha funcional.

Pendências:

- obter uma execução Stage 18 limpa no HEAD final;
- revisar dependências cruzadas do lote destrutivo como conjunto;
- aplicar o lote somente em ambiente compatível, nunca no banco ativo antes do deploy;
- repetir testes DB, CI, auditores e QA depois da aplicação controlada;
- manter a PR em Draft até todos os gates finais.

## 7. Critério para remoção futura

Uma tabela, RPC, arquivo ou árvore só pode ser removida quando o conjunto de evidências mostrar:

1. ausência de consumidor alcançável no runtime;
2. ausência de consumidor operacional necessário;
3. ausência de dependência SQL interna, trigger, view, FK ou worker;
4. ausência de dados que precisem ser migrados;
5. existência de uma porta canônica substituta quando o objeto representa um fluxo de negócio;
6. teste ou dry-run que demonstre que a remoção não quebra o contrato vigente.
