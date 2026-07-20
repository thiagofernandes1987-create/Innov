-- Etapa 17 — RLS e privilégios mínimos do domínio de estoque.

alter table public.inventory_categories enable row level security;
alter table public.inventory_units enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_warehouses enable row level security;
alter table public.inventory_locations enable row level security;
alter table public.inventory_lots enable row level security;
alter table public.inventory_procurement_item_mappings enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.inventory_movement_lines enable row level security;
alter table public.inventory_receipt_imports enable row level security;
alter table public.inventory_reservations enable row level security;
alter table public.inventory_reservation_lines enable row level security;
alter table public.inventory_assets enable row level security;
alter table public.inventory_asset_custodies enable row level security;
alter table public.inventory_asset_maintenance enable row level security;
alter table public.inventory_stocktakes enable row level security;
alter table public.inventory_stocktake_lines enable row level security;
alter table public.inventory_events enable row level security;

-- Catálogo e configuração organizacional.
do $$
declare v_table text;
begin
  foreach v_table in array array[
    'inventory_categories','inventory_units','inventory_items','inventory_warehouses',
    'inventory_locations','inventory_lots','inventory_procurement_item_mappings'
  ] loop
    execute format('create policy %I_select on public.%I for select to authenticated using (public.has_module_permission(organization_id,''estoque'',''READ'',null,null))',v_table,v_table);
    execute format('create policy %I_insert on public.%I for insert to authenticated with check (public.has_module_permission(organization_id,''estoque'',''EDIT'',null,null))',v_table,v_table);
    execute format('create policy %I_update on public.%I for update to authenticated using (public.has_module_permission(organization_id,''estoque'',''EDIT'',null,null)) with check (public.has_module_permission(organization_id,''estoque'',''EDIT'',null,null))',v_table,v_table);
    execute format('create policy %I_delete on public.%I for delete to authenticated using (public.has_module_permission(organization_id,''estoque'',''DELETE'',null,null))',v_table,v_table);
  end loop;
end $$;

create policy inventory_movements_select on public.inventory_movements for select to authenticated
using (public.has_module_permission(inventory_movements.organization_id,'estoque','READ',inventory_movements.project_id,null));
create policy inventory_movements_insert on public.inventory_movements for insert to authenticated
with check (public.has_module_permission(inventory_movements.organization_id,'estoque','EDIT',inventory_movements.project_id,null));
create policy inventory_movements_update on public.inventory_movements for update to authenticated
using (public.has_module_permission(inventory_movements.organization_id,'estoque','EDIT',inventory_movements.project_id,null))
with check (public.has_module_permission(inventory_movements.organization_id,'estoque','EDIT',inventory_movements.project_id,null));
create policy inventory_movements_delete on public.inventory_movements for delete to authenticated
using (public.has_module_permission(inventory_movements.organization_id,'estoque','DELETE',inventory_movements.project_id,null));

create policy inventory_movement_lines_select on public.inventory_movement_lines for select to authenticated
using (exists(
  select 1 from public.inventory_movements movement
  where movement.id=inventory_movement_lines.movement_id
    and movement.organization_id=inventory_movement_lines.organization_id
    and public.has_module_permission(movement.organization_id,'estoque','READ',movement.project_id,null)
));
create policy inventory_movement_lines_insert on public.inventory_movement_lines for insert to authenticated
with check (exists(
  select 1 from public.inventory_movements movement
  where movement.id=inventory_movement_lines.movement_id
    and movement.organization_id=inventory_movement_lines.organization_id
    and public.has_module_permission(movement.organization_id,'estoque','EDIT',movement.project_id,null)
));
create policy inventory_movement_lines_update on public.inventory_movement_lines for update to authenticated
using (exists(
  select 1 from public.inventory_movements movement
  where movement.id=inventory_movement_lines.movement_id
    and movement.organization_id=inventory_movement_lines.organization_id
    and public.has_module_permission(movement.organization_id,'estoque','EDIT',movement.project_id,null)
))
with check (exists(
  select 1 from public.inventory_movements movement
  where movement.id=inventory_movement_lines.movement_id
    and movement.organization_id=inventory_movement_lines.organization_id
    and public.has_module_permission(movement.organization_id,'estoque','EDIT',movement.project_id,null)
));
create policy inventory_movement_lines_delete on public.inventory_movement_lines for delete to authenticated
using (exists(
  select 1 from public.inventory_movements movement
  where movement.id=inventory_movement_lines.movement_id
    and movement.organization_id=inventory_movement_lines.organization_id
    and public.has_module_permission(movement.organization_id,'estoque','DELETE',movement.project_id,null)
));

create policy inventory_receipt_imports_select on public.inventory_receipt_imports for select to authenticated
using (exists(
  select 1 from public.inventory_movements movement
  where movement.id=inventory_receipt_imports.movement_id
    and movement.organization_id=inventory_receipt_imports.organization_id
    and public.has_module_permission(movement.organization_id,'estoque','READ',movement.project_id,null)
));

create policy inventory_reservations_select on public.inventory_reservations for select to authenticated
using (public.has_module_permission(inventory_reservations.organization_id,'estoque','READ',inventory_reservations.project_id,null));
create policy inventory_reservation_lines_select on public.inventory_reservation_lines for select to authenticated
using (exists(
  select 1 from public.inventory_reservations reservation
  where reservation.id=inventory_reservation_lines.reservation_id
    and reservation.organization_id=inventory_reservation_lines.organization_id
    and public.has_module_permission(reservation.organization_id,'estoque','READ',reservation.project_id,null)
));

create policy inventory_assets_select on public.inventory_assets for select to authenticated
using (public.has_module_permission(inventory_assets.organization_id,'estoque','READ',inventory_assets.project_id,null));
create policy inventory_assets_insert on public.inventory_assets for insert to authenticated
with check (public.has_module_permission(inventory_assets.organization_id,'estoque','EDIT',inventory_assets.project_id,null));

create policy inventory_asset_custodies_select on public.inventory_asset_custodies for select to authenticated
using (public.has_module_permission(inventory_asset_custodies.organization_id,'estoque','READ',inventory_asset_custodies.project_id,null));

create policy inventory_asset_maintenance_select on public.inventory_asset_maintenance for select to authenticated
using (exists(
  select 1 from public.inventory_assets asset
  where asset.id=inventory_asset_maintenance.asset_id
    and asset.organization_id=inventory_asset_maintenance.organization_id
    and public.has_module_permission(asset.organization_id,'estoque','READ',asset.project_id,null)
));
create policy inventory_asset_maintenance_insert on public.inventory_asset_maintenance for insert to authenticated
with check (exists(
  select 1 from public.inventory_assets asset
  where asset.id=inventory_asset_maintenance.asset_id
    and asset.organization_id=inventory_asset_maintenance.organization_id
    and public.has_module_permission(asset.organization_id,'estoque','EDIT',asset.project_id,null)
));
create policy inventory_asset_maintenance_update on public.inventory_asset_maintenance for update to authenticated
using (exists(
  select 1 from public.inventory_assets asset
  where asset.id=inventory_asset_maintenance.asset_id
    and asset.organization_id=inventory_asset_maintenance.organization_id
    and public.has_module_permission(asset.organization_id,'estoque','EDIT',asset.project_id,null)
))
with check (exists(
  select 1 from public.inventory_assets asset
  where asset.id=inventory_asset_maintenance.asset_id
    and asset.organization_id=inventory_asset_maintenance.organization_id
    and public.has_module_permission(asset.organization_id,'estoque','EDIT',asset.project_id,null)
));

create policy inventory_stocktakes_select on public.inventory_stocktakes for select to authenticated
using (exists(
  select 1 from public.inventory_warehouses warehouse
  where warehouse.id=inventory_stocktakes.warehouse_id
    and warehouse.organization_id=inventory_stocktakes.organization_id
    and public.has_module_permission(warehouse.organization_id,'estoque','READ',warehouse.project_id,null)
));
create policy inventory_stocktake_lines_select on public.inventory_stocktake_lines for select to authenticated
using (exists(
  select 1
  from public.inventory_stocktakes stocktake
  join public.inventory_warehouses warehouse on warehouse.id=stocktake.warehouse_id
  where stocktake.id=inventory_stocktake_lines.stocktake_id
    and stocktake.organization_id=inventory_stocktake_lines.organization_id
    and warehouse.organization_id=inventory_stocktake_lines.organization_id
    and public.has_module_permission(stocktake.organization_id,'estoque','READ',warehouse.project_id,null)
));
create policy inventory_stocktake_lines_insert on public.inventory_stocktake_lines for insert to authenticated
with check (exists(
  select 1
  from public.inventory_stocktakes stocktake
  join public.inventory_warehouses warehouse on warehouse.id=stocktake.warehouse_id
  where stocktake.id=inventory_stocktake_lines.stocktake_id
    and stocktake.organization_id=inventory_stocktake_lines.organization_id
    and warehouse.organization_id=inventory_stocktake_lines.organization_id
    and public.has_module_permission(stocktake.organization_id,'estoque','EDIT',warehouse.project_id,null)
));

create policy inventory_events_select on public.inventory_events for select to authenticated
using (public.has_module_permission(inventory_events.organization_id,'estoque','READ',inventory_events.project_id,null));

revoke all on public.inventory_categories,public.inventory_units,public.inventory_items,public.inventory_warehouses,
  public.inventory_locations,public.inventory_lots,public.inventory_procurement_item_mappings,
  public.inventory_movements,public.inventory_movement_lines,public.inventory_receipt_imports,
  public.inventory_reservations,public.inventory_reservation_lines,public.inventory_assets,
  public.inventory_asset_custodies,public.inventory_asset_maintenance,public.inventory_stocktakes,
  public.inventory_stocktake_lines,public.inventory_events from anon;

revoke all on public.inventory_stock_v,public.inventory_reserved_stock_v,public.inventory_available_stock_v,
  public.inventory_item_totals_v,public.inventory_asset_current_v,public.inventory_expiry_alerts_v
  from public,anon,authenticated;

-- Leitura direta apenas das tabelas autorizadas; transições de estado passam por RPCs.
grant select,insert,update,delete on public.inventory_categories,public.inventory_units,public.inventory_items,
  public.inventory_warehouses,public.inventory_locations,public.inventory_lots,
  public.inventory_procurement_item_mappings,public.inventory_movements,public.inventory_movement_lines to authenticated;
grant select on public.inventory_receipt_imports,public.inventory_reservations,public.inventory_reservation_lines,
  public.inventory_asset_custodies,public.inventory_stocktakes,public.inventory_events to authenticated;
grant select,insert on public.inventory_assets to authenticated;
grant select,insert,update on public.inventory_asset_maintenance to authenticated;
grant select,insert on public.inventory_stocktake_lines to authenticated;
