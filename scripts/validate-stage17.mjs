import fs from "node:fs";

const paths={
 schema:"supabase/migrations/20260720160000_stage17_inventory_schema.sql",
 balances:"supabase/migrations/20260720160100_stage17_inventory_balances.sql",
 movements:"supabase/migrations/20260720160200_stage17_inventory_movement_functions.sql",
 reservations:"supabase/migrations/20260720160300_stage17_inventory_procurement_reservations.sql",
 assets:[
  "supabase/migrations/20260720160400_stage17_inventory_assets_stocktakes_01.sql",
  "supabase/migrations/20260720160410_stage17_inventory_assets_stocktakes_02.sql",
  "supabase/migrations/20260720160420_stage17_inventory_assets_stocktakes_03.sql",
  "supabase/migrations/20260720160430_stage17_inventory_assets_stocktakes_04.sql"
 ],
 security:"supabase/migrations/20260720160500_stage17_inventory_security.sql",
 dashboard:"supabase/migrations/20260720160510_stage17_inventory_dashboard.sql",
 movementDetail:"supabase/migrations/20260720160520_stage17_inventory_movement_detail.sql",
 entityDetail:"supabase/migrations/20260720160525_stage17_inventory_item_asset_detail.sql",
 foundItems:"supabase/migrations/20260720160530_stage17_inventory_stocktake_found_items.sql",
 module:"supabase/migrations/20260720160600_stage17_inventory_module.sql",
 creation:"supabase/migrations/20260720160650_stage17_inventory_creation_rpcs.sql",
 hardening:"supabase/migrations/20260720160700_stage17_inventory_hardening.sql",
 sensitiveColumns:"supabase/migrations/20260720160720_stage17_inventory_sensitive_columns.sql",
 sensitiveWrite:"supabase/migrations/20260720160730_stage17_inventory_sensitive_write_guard.sql",
 states:"supabase/migrations/20260720160740_stage17_inventory_state_guards.sql",
 concurrency:"supabase/migrations/20260720233052_stage17_inventory_concurrency_locks.sql",
 projectScope:"supabase/migrations/20260720233657_stage17_homologation_balance_project_scope.sql",
 performance:"supabase/migrations/20260720234333_stage17_inventory_performance_indexes.sql",
 rpcPrivileges:"supabase/migrations/20260720234549_stage17_inventory_rpc_privileges.sql"
};

const migrations=[
 paths.schema,paths.balances,paths.movements,paths.reservations,...paths.assets,
 paths.security,paths.dashboard,paths.movementDetail,paths.entityDetail,paths.foundItems,
 paths.module,paths.creation,paths.hardening,paths.sensitiveColumns,paths.sensitiveWrite,
 paths.states,paths.concurrency,paths.projectScope,paths.performance,paths.rpcPrivileges
];
const testFiles=["supabase/tests/stage17_inventory_homologation.sql"];
const appFiles=[
 "lib/inventory/domain.ts","lib/inventory/server.ts","app/actions/inventory.ts","app/actions/inventory-extra.ts","app/actions/inventory-stocktake.ts",
 "components/inventory/inventory-navigation.tsx","components/inventory/inventory-metric-card.tsx","components/inventory/inventory-movement-form.tsx",
 "components/inventory/inventory-reservation-form.tsx","components/inventory/inventory-reservation-consume-form.tsx",
 "components/inventory/inventory-receipt-import-form.tsx","components/inventory/inventory-stocktake-count-form.tsx",
 "app/app/estoque/page.tsx","app/app/estoque/itens/page.tsx","app/app/estoque/itens/novo/page.tsx","app/app/estoque/itens/[id]/page.tsx",
 "app/app/estoque/depositos/page.tsx","app/app/estoque/depositos/[id]/page.tsx","app/app/estoque/movimentos/page.tsx",
 "app/app/estoque/movimentos/novo/page.tsx","app/app/estoque/movimentos/[id]/page.tsx","app/app/estoque/reservas/page.tsx",
 "app/app/estoque/reservas/[id]/page.tsx","app/app/estoque/ativos/page.tsx","app/app/estoque/ativos/[id]/page.tsx",
 "app/app/estoque/inventarios/page.tsx","app/app/estoque/inventarios/novo/page.tsx","app/app/estoque/inventarios/[id]/page.tsx",
 "app/inventory.css","docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md","docs/ETAPA-17-HOMOLOGACAO-POS-MERGE.md"
];

const errors=[];
const read=file=>fs.readFileSync(file,"utf8");
for(const file of[...migrations,...testFiles,...appFiles])if(!fs.existsSync(file))errors.push(`Arquivo ausente: ${file}`);

function requireTokens(file,tokens,label){
 const content=read(file);
 for(const token of tokens)if(!content.includes(token))errors.push(`${label} sem ${token}: ${file}`);
 return content;
}
function requireRegex(content,patterns,label){
 for(const pattern of patterns)if(!pattern.test(content))errors.push(`${label} não atende ${pattern}`);
}

if(!errors.length){
 const schema=read(paths.schema);
 const tables=[...schema.matchAll(/create table if not exists public\.(inventory_[a-z_]+)/gi)].map(match=>match[1]);
 if(new Set(tables).size!==18)errors.push(`Esperadas 18 tabelas; encontradas ${new Set(tables).size}.`);
 requireTokens(paths.schema,["quantity_delta","idempotency_key","organization_id"],"Schema");

 const balances=read(paths.balances);
 const views=[...balances.matchAll(/create or replace view public\.(inventory_[a-z_]+)/gi)].map(match=>match[1]);
 for(const view of["inventory_stock_v","inventory_reserved_stock_v","inventory_available_stock_v","inventory_item_totals_v","inventory_asset_current_v","inventory_expiry_alerts_v"])
  if(!views.includes(view))errors.push(`View ausente: ${view}`);
 if((balances.match(/security_invoker=true/g)??[]).length<6)errors.push("As seis views precisam usar security_invoker=true.");

 requireRegex(read(paths.movements),[/validate_inventory_links/i,/post_inventory_movement/i,/reverse_inventory_movement/i,/protect_inventory_movement/i],"Movimentos");
 requireRegex(read(paths.reservations),[/import_procurement_receipt_to_inventory/i,/create_inventory_reservation/i,/consume_inventory_reservation/i,/expire_inventory_reservations/i,/accepted_quantity/i],"Compras e reservas");

 const assets=paths.assets.map(read).join("\n");
 requireRegex(assets,[/select check_constraint\.constraint_name/i,/assign_inventory_asset/i,/return_inventory_asset/i,/start_inventory_stocktake/i,/submit_inventory_stocktake/i,/approve_inventory_stocktake/i,/post_inventory_stocktake_adjustment/i],"Ativos e inventários divididos");

 const security=read(paths.security);
 if(new Set([...security.matchAll(/alter table public\.(inventory_[a-z_]+) enable row level security/gi)].map(match=>match[1])).size!==18)
  errors.push("RLS não cobre 18 tabelas.");
 requireRegex(read(paths.dashboard),[/get_inventory_dashboard/i,/sensitiveVisible/i,/stockValue/i],"Dashboard");
 requireRegex(read(paths.movementDetail),[/get_inventory_movement_detail/i,/unitCost/i,/totalCost/i],"Detalhe de movimento");
 requireRegex(read(paths.entityDetail),[/get_inventory_item_detail/i,/get_inventory_asset_detail/i,/referenceUnitCost/i,/acquisitionCost/i],"Detalhes seguros");
 requireRegex(read(paths.foundItems),[/add_inventory_stocktake_line/i,/expected_quantity/i],"Itens encontrados");
 requireRegex(read(paths.module),[/'estoque'/i,/'1\.0\.0'/i,/install_inventory_defaults/i,/ALM-GERAL/i,/PADRAO/i],"Módulo");
 requireRegex(read(paths.creation),[/create_inventory_item/i,/create_inventory_warehouse/i,/create_inventory_movement/i,/create_inventory_asset/i],"Criação transacional");
 requireRegex(read(paths.hardening),[/inventory_movements_org_status_idx/i,/inventory_movement_lines_warehouse_item_idx/i,/enforce_inventory_direct_write_rules/i],"Hardening");
 requireRegex(read(paths.sensitiveColumns),[/reference_unit_cost/i,/unit_cost/i,/acquisition_cost/i,/revoke select/i],"Colunas sensíveis");
 requireRegex(read(paths.sensitiveWrite),[/enforce_inventory_sensitive_write/i,/inventory_items_sensitive_write_guard/i,/inventory_assets_sensitive_write_guard/i],"Escrita sensível");
 requireRegex(read(paths.states),[/inventory_reservation_lines_recalculate_status/i,/protect_inventory_asset_custody/i],"Estados finais");
 requireRegex(read(paths.concurrency),[/inventory_stock_lock_key/i,/pg_advisory_xact_lock/i,/unreserved_delta/i],"Concorrência");
 requireRegex(read(paths.projectScope),[/movement\.status in \('POSTED','REVERSED'\)/i,/validate_inventory_project_scope/i,/Depósito exclusivo de outra obra/i],"Escopo de obra");
 requireRegex(read(paths.performance),[/inventory_asset_custodies_organization_idx/i,/inventory_asset_maintenance_organization_idx/i,/inventory_locations_organization_idx/i,/inventory_lots_item_idx/i,/inventory_movement_lines_organization_idx/i,/inventory_procurement_item_mappings_organization_idx/i,/inventory_receipt_imports_organization_idx/i,/inventory_reservation_lines_organization_idx/i,/inventory_stocktake_lines_organization_idx/i],"Índices finais");
 requireRegex(read(paths.rpcPrivileges),[/revoke all on function public\.create_inventory_item/i,/revoke all on function public\.create_inventory_movement/i,/revoke all on function public\.create_inventory_warehouse/i,/from public,anon/i,/to authenticated,service_role/i],"Privilégios mínimos");

 const homologation=read(testFiles[0]);
 for(const testName of[
  "authorization_super_admin","balance_not_direct_column","defaults_categories","defaults_units",
  "entry_increases_balance","issue_reduces_balance","module_installation","movement_idempotency",
  "multi_company_isolation","multi_project_isolation","negative_stock_block",
  "posted_movement_immutable","reversal_restores_balance","transfer_atomic_conservation"
 ])if(!homologation.includes(`'${testName}'`))errors.push(`Teste de homologação ausente: ${testName}`);
 if(!/^begin;/mi.test(homologation)||!/rollback;\s*$/i.test(homologation))errors.push("Teste da Etapa 17 precisa terminar com ROLLBACK.");
 if(!homologation.includes("request.jwt.claims"))errors.push("Teste da Etapa 17 não simula identidade autenticada.");

 const domain=requireTokens("lib/inventory/domain.ts",["normalizeInventoryDashboard","formatInventoryQuantity","formatInventoryCurrency","movementLabel"],"Domínio TypeScript");
 if(domain.includes("reference_unit_cost"))errors.push("Dashboard TypeScript não pode depender de coluna SQL sensível direta.");
 const actions=requireTokens("app/actions/inventory.ts",["createInventoryItem","createInventoryMovement","importProcurementReceipt","createInventoryReservation","createInventoryAsset","startInventoryStocktake","view_sensitive_financials"],"Ações");
 if(actions.includes("SUPABASE_SERVICE_ROLE_KEY"))errors.push("Ações web referenciam Service Role.");
 const itemPage=read("app/app/estoque/itens/[id]/page.tsx"),assetPage=read("app/app/estoque/ativos/[id]/page.tsx");
 if(!itemPage.includes("get_inventory_item_detail")||!assetPage.includes("get_inventory_asset_detail"))errors.push("Detalhes não usam RPCs seguras.");
 if(!read("app/layout.tsx").includes('"./inventory.css"'))errors.push("Layout não importa inventory.css.");
 if(!/key:\s*"estoque"/.test(read("lib/modules/registry.ts")))errors.push("Registry sem estoque.");
}

if(errors.length){
 console.error(`Etapa 17 inválida (${errors.length} falha(s)):`);
 for(const error of errors)console.error(`- ${error}`);
 process.exit(1);
}
console.log(`Etapa 17 validada: ${migrations.length} migrations canônicas, incluindo quatro partes de ativos/inventário, 18 tabelas, 6 views, RLS, locks, índices, privilégios mínimos e ${appFiles.length} arquivos de aplicação/documentação.`);
