-- Etapa 17 — custos e valores não ficam disponíveis por SELECT direto.

revoke select on public.inventory_items from authenticated;
grant select(
  id,organization_id,category_id,unit_id,code,sku,barcode,name,description,specification,kind,
  minimum_stock,controls_lot,controls_expiry,controls_individual_asset,active,created_by,created_at,updated_at
) on public.inventory_items to authenticated;

revoke select on public.inventory_movement_lines from authenticated;
grant select(
  id,organization_id,movement_id,line_number,warehouse_id,location_id,item_id,lot_id,asset_id,
  reservation_line_id,procurement_receipt_item_id,quantity_delta,notes,created_at
) on public.inventory_movement_lines to authenticated;

revoke select on public.inventory_assets from authenticated;
grant select(
  id,organization_id,item_id,warehouse_id,location_id,project_id,lot_id,patrimony_code,serial_number,
  status,acquired_on,condition_notes,active,created_by,created_at,updated_at
) on public.inventory_assets to authenticated;

revoke select on public.inventory_asset_maintenance from authenticated;
grant select(
  id,organization_id,asset_id,status,title,description,provider_name,scheduled_for,started_at,completed_at,
  notes,created_by,completed_by,created_at,updated_at
) on public.inventory_asset_maintenance to authenticated;

-- Escrita de custos continua permitida apenas por ações/RPCs autorizadas; leitura retorna via contratos mascarados.
