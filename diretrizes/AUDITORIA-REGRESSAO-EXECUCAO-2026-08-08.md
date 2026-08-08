# Execução da auditoria de regressão — 2026-08-08

**Branch:** `audit/regressao-main-20260808`  
**Base congelada da main:** `09498a4832087126855243bdd992fdb58f932f64`  
**Main alterada:** não  
**Migrations destrutivas aplicadas no Supabase ativo:** não  
**Estado:** correção em andamento; branch ainda não autorizada para merge.

## 1. Convergências já executadas

| Área | Estado | Ação executada |
|---|---|---|
| Launcher | corrigido estaticamente | restaurado contrato estável `LauncherSummaryMap/resumos`; removida fusão `resumos × indicadores` |
| CRM / nova oportunidade | corrigido estaticamente | rota reconectada a `OpportunityForm → createCrmOpportunitySafe`; UUID livre removido; `CampoMoeda` preservado |
| Planejamento / `schedule.ts` | reconvergido | validações de escopo, hierarquia e ciclo preservadas; numeração automática, vocabulário e modelos de EAP reintegrados |
| Obras / `projects.ts` | reconvergido | porta legada de criação por contrato removida; upload seguro de Diário/Documentos reintegrado; mensagens seguras preservadas |
| Tarefas | reconvergido | cálculo por dependências preservado; resolvedor de nomes único; `profilesById` fantasma removido |
| Equipes | corrigido | consulta redundante de `profiles` removida; erro de consulta não utilizada deixou de bloquear cadastro |
| Launcher / motor concorrente | removido | `lib/casca/indicadores.ts` eliminado; `launcher-metrics.ts` permanece canônico |
| QA modular | corrigido | inventário regenerado para os 24 módulos do `registry.ts`, incluindo `modelos` e `whatsapp` |
| QA paralelo antigo | removido/depreciado | `validate-module-qa-status.mjs` removido; JSON antigo virou ponte para o inventário canônico |
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

Não classificar como órfã apenas por ausência de chamada `.rpc()` direta:

- `write_audit` — núcleo chamado por dezenas de funções SQL;
- `record_audit_event` — infraestrutura interna de auditoria;
- `create_project_from_contract` — núcleo usado por `create_project_from_contract_v2`;
- `membership_access_profiles` — resolução e administração de perfis;
- `permission_change_events` — trilha das alterações de acesso;
- `project_module_permission_overrides` e `user_module_permission_overrides` — exercitados por `app/actions/access-control.ts`;
- `cost_source_sync_runs` — cron de fontes oficiais;
- `project_progress_snapshots` — curvas e páginas interna/cliente;
- `operational_notifications` — avisos operacionais.

## 4. Limpeza de banco preparada, mas NÃO aplicada

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
- nenhum FK de entrada, view ou função que leia a tabela;
- custo fixo atual é representado em `budget_items` com `cost_type='FIXED'`.

Dry-run de `DROP TABLE` executado com rollback e sucesso.

### RPC antiga de versão de orçamento

Migration: `20260808134500_drop_legacy_create_budget_version_rpc.sql`

- remove `create_budget_version`;
- preserva `create_next_budget_version`, porta utilizada pelo runtime atual.

### Convergência BDI/admin → Markup

Migration: `20260808135000_converge_budget_pricing_to_markup.sql`

Estado observado no banco ativo antes da migration:

- 10 `budget_versions`;
- 0 com `bdi_model_version_id`;
- 0 com `administrative_fee_model_id`;
- 4 com `markup_model_id`;
- 0 com `bdi_rate` diferente de zero;
- tabelas `bdi_models`, `bdi_model_versions` e `administrative_fee_models` sem dados.

A migration:

1. torna `markup_models` a única fonte configurável de formação de preço;
2. reescreve cálculo e criação da próxima versão;
3. ajusta o trigger de imutabilidade;
4. remove os dois FKs/IDs legados de `budget_versions`;
5. remove as tabelas BDI/admin vazias.

O script completo foi validado no PostgreSQL real dentro de `BEGIN ... ROLLBACK`, incluindo os `DROP`; o dry-run passou. Não foi persistido.

## 5. Regra de deploy das migrations

As migrations estruturais acima **não devem ser aplicadas antes do código desta branch**. A aplicação atualmente publicada ainda corresponde à `main` anterior e pode referenciar o schema legado.

Ordem segura:

1. CI completo da branch;
2. preview/homologação da aplicação corrigida;
3. aplicar migrations em ambiente compatível;
4. executar testes DB e fluxos críticos;
5. captura visual e QA por persona;
6. somente depois avaliar merge.

## 6. Pendências de auditoria

- executar CI real, typecheck, lint, testes e build da branch;
- executar os três novos detectores num checkout do commit do PR;
- regenerar `MAPA-DO-CODIGO.md` depois do código compilar;
- revisar candidatos de server actions sem consumidores produzidos pelo detector;
- continuar cruzamento das tabelas vazias com consumidores reais sem remover tabelas de domínio legítimas;
- validar visualmente Launcher, CRM, Planejamento, Tarefas e Equipes em 375/768/1280, claro/escuro;
- aplicar migrations somente em homologação/ordem de deploy compatível.

## 7. Critério para remoção futura

Uma tabela, RPC, arquivo ou árvore só pode ser removida quando o conjunto de evidências mostrar:

1. ausência de consumidor alcançável no runtime;
2. ausência de consumidor operacional necessário;
3. ausência de dependência SQL interna, trigger, view, FK ou worker;
4. ausência de dados que precisem ser migrados;
5. existência de uma porta canônica substituta quando o objeto representa um fluxo de negócio;
6. teste ou dry-run que demonstre que a remoção não quebra o contrato vigente.
