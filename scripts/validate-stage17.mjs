import fs from"node:fs";

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
 "lib/inventory/domain.ts","lib/inventory/server.ts",
 "app/actions/inventory.ts","app/actions/inventory-extra.ts","app/actions/inventory-stocktake.ts",
 "components/inventory/inventory-navigation.tsx","components/inventory/inventory-metric-card.tsx",
 "components/inventory/inventory-movement-form.tsx","components/inventory/inventory-reservation-form.tsx",
 "components/inventory/inventory-reservation-consume-form.tsx","components/inventory/inventory-receipt-import-form.tsx",
 "components/inventory/inventory-stocktake-count-form.tsx",
 "app/app/estoque/page.tsx","app/app/estoque/itens/page.tsx","app/app/estoque/itens/novo/page.tsx",
 "app/app/estoque/itens/[id]/page.tsx","app/app/estoque/depositos/page.tsx","app/app/estoque/depositos/[id]/page.tsx",
 "app/app/estoque/movimentos/page.tsx","app/app/estoque/movimentos/novo/page.tsx","app/app/estoque/movimentos/[id]/page.tsx",
 "app/app/estoque/reservas/page.tsx","app/app/estoque/reservas/[id]/page.tsx",
 "app/app/estoque/ativos/page.tsx","app/app/estoque/ativos/[id]/page.tsx",
 "app/app/estoque/inventarios/page.tsx","app/app/estoque/inventarios/novo/page.tsx","app/app/estoque/inventarios/[id]/page.tsx",
 "app/inventory.css","docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md"
];
const files=[...migrations,...appFiles];const errors=[];
for(const file of files)if(!fs.existsSync(file))errors.push(`Arquivo ausente: ${file}`);

function must(file,tokens,label){const content=fs.readFileSync(file,"utf8");for(const token of tokens)if(!content.includes(token))errors.push(`${label} incompleto (${token}): ${file}`);return content;}

if(errors.length===0){
 const schema=must(migrations[0],[
  "inventory_items","inventory_warehouses","inventory_locations","inventory_lots","inventory_movements",
  "inventory_movement_lines","inventory_receipt_imports","inventory_reservations","inventory_reservation_lines",
  "inventory_assets","inventory_asset_custodies","inventory_asset_maintenance","inventory_stocktakes",
  "inventory_stocktake_lines","inventory_events","quantity_delta","idempotency_key"
 ],"Schema");
 const tables=[...schema.matchAll(/create table if not exists public\.(inventory_[a-z_]+)/g)].map(match=>match[1]);
 if(new Set(tables).size<18)errors.push(`Schema possui apenas ${new Set(tables).size} tabelas de inventário.`);
 must(migrations[1],["inventory_stock_v","inventory_reserved_stock_v","inventory_available_stock_v","inventory_item_totals_v","inventory_asset_current_v","inventory_expiry_alerts_v","security_invoker=true"],"Saldos");
 must(migrations[2],["validate_inventory_links","protect_inventory_movement","post_inventory_movement","reverse_inventory_movement","saldo negativo","Transferência precisa conservar","MOVEMENT_POSTED","MOVEMENT_REVERSED"],"Movimentos");
 must(migrations[3],["import_procurement_receipt_to_inventory","create_inventory_reservation","release_inventory_reservation","consume_inventory_reservation","expire_inventory_reservations","procurement-receipt:","accepted_quantity","Quantidade disponível insuficiente"],"Compras/reservas");
 must(migrations[4],["assign_inventory_asset","return_inventory_asset","start_inventory_stocktake","submit_inventory_stocktake","approve_inventory_stocktake","post_inventory_stocktake_adjustment","Custódia encerrada é imutável"],"Ativos/inventários");
 const security=must(migrations[5],["enable row level security","inventory_movements_select","inventory_movement_lines_select","inventory_stocktakes_select","revoke all on public.inventory_stock_v","from anon"],"RLS");
 const rlsTables=[...security.matchAll(/alter table public\.(inventory_[a-z_]+) enable row level security/g)].map(match=>match[1]);
 if(new Set(rlsTables).size<18)errors.push(`RLS habilitada em apenas ${new Set(rlsTables).size} tabelas.`);
 must(migrations[6],["get_inventory_dashboard","sensitiveVisible","stockValue","belowMinimum","activeReservations","openStocktakes","expiryAlerts","has_module_permission"],"Dashboard");
 must(migrations[7],["get_inventory_movement_detail","unitCost","totalCost","sensitiveVisible"],"Detalhe de movimento");
 must(migrations[8],["get_inventory_item_detail","get_inventory_asset_detail","referenceUnitCost","acquisitionCost","maintenance.cost"],"Detalhes sensíveis");
 must(migrations[9],["add_inventory_stocktake_line","expected_quantity","STOCKTAKE_FOUND_ITEM_ADDED"],"Item encontrado");
 must(migrations[10],["'estoque'","'1.0.0'","install_inventory_defaults","organizations_install_inventory_defaults","ALM-GERAL","PADRAO","base_role is not null"],"Módulo");
 must(migrations[11],["create_inventory_item","create_inventory_warehouse","create_inventory_movement","create_inventory_asset","asset-initial-entry"],"Criação transacional");
 must(migrations[12],["inventory_movements_org_status_idx","inventory_movement_lines_warehouse_item_idx","enforce_inventory_direct_write_rules","recalculate_inventory_reservation_status","revoke update on public.inventory_movements"],"Hardening");
 must(migrations[13],["revoke select on public.inventory_items","revoke select on public.inventory_movement_lines","reference_unit_cost","unit_cost","acquisition_cost","cost"],"Colunas sensíveis");
 must(migrations[14],["enforce_inventory_sensitive_write","inventory_items_sensitive_write_guard","inventory_assets_sensitive_write_guard","inventory_asset_maintenance_sensitive_write_guard"],"Escrita sensível");
 must(migrations[15],["inventory_reservation_lines_recalculate_status","protect_inventory_asset_custody","Origem, responsável e condições de entrega"],"Estados finais");

 const domain=must("lib/inventory/domain.ts",["normalizeInventoryDashboard","formatInventoryQuantity","formatInventoryCurrency","movementLabel"],"Domínio TypeScript");
 if(domain.includes("reference_unit_cost"))errors.push("Domínio do dashboard não deve depender de coluna SQL sensível direta.");
 const actions=must("app/actions/inventory.ts",["createInventoryItem","createInventoryMovement","importProcurementReceipt","createInventoryReservation","createInventoryAsset","startInventoryStocktake","view_sensitive_financials"],"Ações");
 if(actions.includes("SUPABASE_SERVICE_ROLE_KEY"))errors.push("Ações de estoque não podem referenciar Service Role.");
 const itemPage=fs.readFileSync("app/app/estoque/itens/[id]/page.tsx","utf8");
 const assetPage=fs.readFileSync("app/app/estoque/ativos/[id]/page.tsx","utf8");
 for(const [name,content] of [["item",itemPage],["ativo",assetPage]]){
  if(content.includes('.select("*'))errors.push(`Detalhe de ${name} usa SELECT *.`);
 }
 if(!itemPage.includes("get_inventory_item_detail"))errors.push("Detalhe de item não usa RPC segura.");
 if(!assetPage.includes("get_inventory_asset_detail"))errors.push("Detalhe de ativo não usa RPC segura.");
 const layout=fs.readFileSync("app/layout.tsx","utf8");if(!layout.includes('"./inventory.css"'))errors.push("Layout não importa inventory.css.");
 const registry=fs.readFileSync("lib/modules/registry.ts","utf8");if(!registry.includes('key:"estoque"'))errors.push("Registry não contém módulo estoque.");
 const auth=fs.readFileSync("lib/authorization.ts","utf8");if(!auth.includes('"estoque"')||!auth.includes('"relatorios"'))errors.push("Fallback de autorização não reconhece estoque/relatórios.");
}

if(errors.length){console.error(`Etapa 17 inválida (${errors.length} falha(s)):`);for(const error of errors)console.error(`- ${error}`);process.exit(1);}
console.log(`Etapa 17 validada: ${migrations.length} migrations, 18 tabelas, saldos derivados, RLS, custos mascarados, reservas, ativos, inventário físico e ${appFiles.length} arquivos de aplicação/documentação.`);
