import fs from "node:fs";

const migrations=[
 "supabase/migrations/20260720160000_stage17_inventory_schema.sql",
 "supabase/migrations/20260720160100_stage17_inventory_balances.sql",
 "supabase/migrations/20260720160200_stage17_inventory_movement_functions.sql",
 "supabase/migrations/20260720160300_stage17_inventory_procurement_reservations.sql",
 "supabase/migrations/20260720160400_stage17_inventory_assets_stocktakes.sql",
 "supabase/migrations/20260720160500_stage17_inventory_security.sql",
 "supabase/migrations/20260720160510_stage17_inventory_dashboard.sql",
 "supabase/migrations/20260720160520_stage17_inventory_movement_detail.sql",
 "supabase/migrations/20260720160525_stage17_inventory_item_asset_detail.sql",
 "supabase/migrations/20260720160530_stage17_inventory_stocktake_found_items.sql",
 "supabase/migrations/20260720160600_stage17_inventory_module.sql",
 "supabase/migrations/20260720160650_stage17_inventory_creation_rpcs.sql",
 "supabase/migrations/20260720160700_stage17_inventory_hardening.sql",
 "supabase/migrations/20260720160720_stage17_inventory_sensitive_columns.sql",
 "supabase/migrations/20260720160730_stage17_inventory_sensitive_write_guard.sql",
 "supabase/migrations/20260720160740_stage17_inventory_state_guards.sql"
];

const appFiles=[
 "lib/inventory/domain.ts",
 "lib/inventory/server.ts",
 "app/actions/inventory.ts",
 "app/actions/inventory-extra.ts",
 "app/actions/inventory-stocktake.ts",
 "components/inventory/inventory-navigation.tsx",
 "components/inventory/inventory-metric-card.tsx",
 "components/inventory/inventory-movement-form.tsx",
 "components/inventory/inventory-reservation-form.tsx",
 "components/inventory/inventory-reservation-consume-form.tsx",
 "components/inventory/inventory-receipt-import-form.tsx",
 "components/inventory/inventory-stocktake-count-form.tsx",
 "app/app/estoque/page.tsx",
 "app/app/estoque/itens/page.tsx",
 "app/app/estoque/itens/novo/page.tsx",
 "app/app/estoque/itens/[id]/page.tsx",
 "app/app/estoque/depositos/page.tsx",
 "app/app/estoque/depositos/[id]/page.tsx",
 "app/app/estoque/movimentos/page.tsx",
 "app/app/estoque/movimentos/novo/page.tsx",
 "app/app/estoque/movimentos/[id]/page.tsx",
 "app/app/estoque/reservas/page.tsx",
 "app/app/estoque/reservas/[id]/page.tsx",
 "app/app/estoque/ativos/page.tsx",
 "app/app/estoque/ativos/[id]/page.tsx",
 "app/app/estoque/inventarios/page.tsx",
 "app/app/estoque/inventarios/novo/page.tsx",
 "app/app/estoque/inventarios/[id]/page.tsx",
 "app/inventory.css",
 "docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md"
];

const errors=[];
const read=file=>fs.readFileSync(file,"utf8");
const allFiles=[...migrations,...appFiles];
for(const file of allFiles)if(!fs.existsSync(file))errors.push(`Arquivo ausente: ${file}`);

function requireTokens(file,tokens,label){
 const content=read(file);
 for(const token of tokens)if(!content.includes(token))errors.push(`${label} sem ${token}: ${file}`);
 return content;
}

function requireRegex(file,patterns,label){
 const content=read(file);
 for(const pattern of patterns)if(!pattern.test(content))errors.push(`${label} não atende ${pattern}: ${file}`);
 return content;
}

if(errors.length===0){
 const schema=read(migrations[0]);
 const tables=[...schema.matchAll(/create table if not exists public\.(inventory_[a-z_]+)/gi)].map(match=>match[1]);
 const uniqueTables=[...new Set(tables)];
 if(uniqueTables.length!==18)errors.push(`Esperadas 18 tabelas de estoque; encontradas ${uniqueTables.length}.`);
 for(const table of[
  "inventory_items","inventory_warehouses","inventory_locations","inventory_lots",
  "inventory_movements","inventory_movement_lines","inventory_receipt_imports",
  "inventory_reservations","inventory_reservation_lines","inventory_assets",
  "inventory_asset_custodies","inventory_asset_maintenance","inventory_stocktakes",
  "inventory_stocktake_lines","inventory_events"
 ])if(!uniqueTables.includes(table))errors.push(`Tabela obrigatória ausente no schema: ${table}`);
 requireTokens(migrations[0],["quantity_delta","idempotency_key","organization_id"],"Schema");

 const balances=read(migrations[1]);
 const views=[...balances.matchAll(/create or replace view public\.(inventory_[a-z_]+)/gi)].map(match=>match[1]);
 for(const view of[
  "inventory_stock_v","inventory_reserved_stock_v","inventory_available_stock_v",
  "inventory_item_totals_v","inventory_asset_current_v","inventory_expiry_alerts_v"
 ])if(!views.includes(view))errors.push(`View obrigatória ausente: ${view}`);
 if((balances.match(/security_invoker=true/g)??[]).length<6)errors.push("As seis views precisam usar security_invoker=true.");

 requireRegex(migrations[2],[
  /create or replace function public\.validate_inventory_links\s*\(/i,
  /create or replace function public\.post_inventory_movement\s*\(/i,
  /create or replace function public\.reverse_inventory_movement\s*\(/i,
  /protect_inventory_movement/i
 ],"Movimentos");

 requireRegex(migrations[3],[
  /import_procurement_receipt_to_inventory/i,
  /create_inventory_reservation/i,
  /release_inventory_reservation/i,
  /consume_inventory_reservation/i,
  /expire_inventory_reservations/i,
  /accepted_quantity/i
 ],"Compras e reservas");

 requireRegex(migrations[4],[
  /assign_inventory_asset/i,
  /return_inventory_asset/i,
  /start_inventory_stocktake/i,
  /submit_inventory_stocktake/i,
  /approve_inventory_stocktake/i,
  /post_inventory_stocktake_adjustment/i
 ],"Ativos e inventários");

 const security=read(migrations[5]);
 const rlsTables=[...security.matchAll(/alter table public\.(inventory_[a-z_]+) enable row level security/gi)].map(match=>match[1]);
 if(new Set(rlsTables).size!==18)errors.push(`RLS esperada em 18 tabelas; encontrada em ${new Set(rlsTables).size}.`);
 requireTokens(migrations[5],["inventory_movements_select","inventory_movement_lines_select","inventory_stocktakes_select","from anon"],"RLS");

 requireRegex(migrations[6],[/get_inventory_dashboard/i,/sensitiveVisible/i,/stockValue/i,/has_module_permission/i],"Dashboard");
 requireRegex(migrations[7],[/get_inventory_movement_detail/i,/unitCost/i,/totalCost/i,/sensitiveVisible/i],"Detalhe de movimento");
 requireRegex(migrations[8],[/get_inventory_item_detail/i,/get_inventory_asset_detail/i,/referenceUnitCost/i,/acquisitionCost/i],"Detalhes de item e ativo");
 requireRegex(migrations[9],[/add_inventory_stocktake_line/i,/expected_quantity/i],"Itens encontrados");
 requireRegex(migrations[10],[/'estoque'/i,/'1\.0\.0'/i,/install_inventory_defaults/i,/ALM-GERAL/i,/PADRAO/i],"Instalação modular");
 requireRegex(migrations[11],[/create_inventory_item/i,/create_inventory_warehouse/i,/create_inventory_movement/i,/create_inventory_asset/i],"Criação transacional");
 requireRegex(migrations[12],[/inventory_movements_org_status_idx/i,/inventory_movement_lines_warehouse_item_idx/i,/enforce_inventory_direct_write_rules/i],"Hardening");
 requireRegex(migrations[13],[/revoke select on public\.inventory_items/i,/revoke select on public\.inventory_movement_lines/i,/reference_unit_cost/i,/unit_cost/i,/acquisition_cost/i],"Colunas sensíveis");
 requireRegex(migrations[14],[/enforce_inventory_sensitive_write/i,/inventory_items_sensitive_write_guard/i,/inventory_assets_sensitive_write_guard/i],"Escrita sensível");
 requireRegex(migrations[15],[/inventory_reservation_lines_recalculate_status/i,/protect_inventory_asset_custody/i],"Estados finais");

 const domain=requireTokens("lib/inventory/domain.ts",["normalizeInventoryDashboard","formatInventoryQuantity","formatInventoryCurrency","movementLabel"],"Domínio TypeScript");
 if(domain.includes("reference_unit_cost"))errors.push("Dashboard TypeScript não pode depender de coluna SQL sensível direta.");

 const actions=requireTokens("app/actions/inventory.ts",[
  "createInventoryItem","createInventoryMovement","importProcurementReceipt",
  "createInventoryReservation","createInventoryAsset","startInventoryStocktake",
  "view_sensitive_financials"
 ],"Ações server-side");
 if(actions.includes("SUPABASE_SERVICE_ROLE_KEY"))errors.push("Ações web não podem referenciar Service Role.");

 const itemPage=read("app/app/estoque/itens/[id]/page.tsx");
 const assetPage=read("app/app/estoque/ativos/[id]/page.tsx");
 if(!itemPage.includes("get_inventory_item_detail"))errors.push("Detalhe de item não usa RPC segura.");
 if(!assetPage.includes("get_inventory_asset_detail"))errors.push("Detalhe de ativo não usa RPC segura.");
 if(itemPage.includes('.select("*')||assetPage.includes('.select("*'))errors.push("Detalhes sensíveis não podem usar SELECT *.");

 const layout=read("app/layout.tsx");
 if(!layout.includes('"./inventory.css"'))errors.push("Layout não importa inventory.css.");
 const registry=read("lib/modules/registry.ts");
 if(!/key:\s*"estoque"/.test(registry))errors.push("Registry não contém módulo estoque.");
 const auth=read("lib/authorization.ts");
 if(!auth.includes('"estoque"')||!auth.includes('"relatorios"'))errors.push("Fallback de autorização não reconhece estoque/relatórios.");

 const docs=read("docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md");
 for(const token of["saldo","idempotente","imutável","RLS","inventário físico"])
  if(!docs.toLowerCase().includes(token.toLowerCase()))errors.push(`Documento da Etapa 17 sem ${token}.`);
}

if(errors.length){
 console.error(`Etapa 17 inválida (${errors.length} falha(s)):`);
 for(const error of errors)console.error(`- ${error}`);
 process.exit(1);
}

console.log(`Etapa 17 validada: ${migrations.length} migrations, 18 tabelas, 6 views derivadas, RLS, contratos seguros, reservas, ativos, inventário físico e ${appFiles.length} arquivos de aplicação/documentação.`);
