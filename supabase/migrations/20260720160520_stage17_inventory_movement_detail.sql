-- Etapa 17 — detalhe de movimento com mascaramento de custos.

create or replace function public.get_inventory_movement_detail(p_movement_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_movement public.inventory_movements;
  v_sensitive boolean;
  v_lines jsonb;
begin
  select * into v_movement from public.inventory_movements where id=p_movement_id;
  if not found then raise exception 'Movimento não encontrado.'; end if;
  if not public.has_module_permission(v_movement.organization_id,'estoque','READ',v_movement.project_id,null) then
    raise exception 'Permissão insuficiente para consultar movimento.';
  end if;
  v_sensitive:=public.has_module_permission(v_movement.organization_id,'estoque','READ',v_movement.project_id,'sensitive');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',line.id,'lineNumber',line.line_number,'warehouseId',line.warehouse_id,'warehouseName',warehouse.name,
    'locationId',line.location_id,'locationName',location.name,'itemId',line.item_id,'itemCode',item.code,
    'itemName',item.name,'unitCode',unit.code,'lotId',line.lot_id,'batchNumber',lot.batch_number,
    'assetId',line.asset_id,'patrimonyCode',asset.patrimony_code,'serialNumber',asset.serial_number,
    'quantityDelta',line.quantity_delta,'unitCost',case when v_sensitive then line.unit_cost else null end,
    'totalCost',case when v_sensitive then line.total_cost else null end,'notes',line.notes
  ) order by line.line_number),'[]'::jsonb)
  into v_lines
  from public.inventory_movement_lines line
  join public.inventory_warehouses warehouse on warehouse.id=line.warehouse_id
  left join public.inventory_locations location on location.id=line.location_id
  join public.inventory_items item on item.id=line.item_id
  join public.inventory_units unit on unit.id=item.unit_id
  left join public.inventory_lots lot on lot.id=line.lot_id
  left join public.inventory_assets asset on asset.id=line.asset_id
  where line.movement_id=p_movement_id;

  return jsonb_build_object(
    'sensitiveVisible',v_sensitive,
    'movement',jsonb_build_object(
      'id',v_movement.id,'organizationId',v_movement.organization_id,'projectId',v_movement.project_id,
      'code',v_movement.code,'movementType',v_movement.movement_type,'status',v_movement.status,
      'occurredAt',v_movement.occurred_at,'reason',v_movement.reason,'notes',v_movement.notes,
      'sourceType',v_movement.source_type,'sourceId',v_movement.source_id,
      'reversedMovementId',v_movement.reversed_movement_id,'postedAt',v_movement.posted_at,
      'reversedAt',v_movement.reversed_at,'createdAt',v_movement.created_at
    ),
    'lines',v_lines,
    'totalCost',case when v_sensitive then coalesce((select sum(total_cost) from public.inventory_movement_lines where movement_id=p_movement_id),0) else null end
  );
end $$;

revoke all on function public.get_inventory_movement_detail(uuid) from public,anon;
grant execute on function public.get_inventory_movement_detail(uuid) to authenticated;
