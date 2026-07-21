-- Etapa 17 — índices complementares para relações, RLS e auditoria.

create index if not exists inventory_asset_custodies_organization_idx
  on public.inventory_asset_custodies(organization_id);

create index if not exists inventory_asset_maintenance_organization_idx
  on public.inventory_asset_maintenance(organization_id);

create index if not exists inventory_locations_organization_idx
  on public.inventory_locations(organization_id);

create index if not exists inventory_lots_item_idx
  on public.inventory_lots(item_id);

create index if not exists inventory_movement_lines_organization_idx
  on public.inventory_movement_lines(organization_id);

create index if not exists inventory_procurement_item_mappings_organization_idx
  on public.inventory_procurement_item_mappings(organization_id);

create index if not exists inventory_receipt_imports_organization_idx
  on public.inventory_receipt_imports(organization_id);

create index if not exists inventory_reservation_lines_organization_idx
  on public.inventory_reservation_lines(organization_id);

create index if not exists inventory_stocktake_lines_organization_idx
  on public.inventory_stocktake_lines(organization_id);
