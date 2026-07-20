-- Etapa 17 — detalhes seguros de item e ativo com custos mascarados.

create or replace function public.get_inventory_item_detail(p_item_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_item public.inventory_items;
  v_sensitive boolean;
  v_lots jsonb;
  v_movements jsonb;
begin
  select * into v_item from public.inventory_items where id=p_item_id;
  if not found then raise exception 'Item não encontrado.'; end if;
  if not public.has_module_permission(v_item.organization_id,'estoque','READ',null,null) then
    raise exception 'Permissão insuficiente para consultar item.';
  end if;
  v_sensitive:=public.has_module_permission(v_item.organization_id,'estoque','READ',null,'sensitive');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',lot.id,'batchNumber',lot.batch_number,'manufacturedOn',lot.manufactured_on,
    'expiresOn',lot.expires_on,'notes',lot.notes,'active',lot.active,
    'supplierName',supplier.legal_name
  ) order by lot.created_at desc),'[]'::jsonb)
  into v_lots
  from public.inventory_lots lot
  left join public.procurement_suppliers supplier on supplier.id=lot.supplier_id
  where lot.item_id=p_item_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',line.id,'quantityDelta',line.quantity_delta,
    'unitCost',case when v_sensitive then line.unit_cost else null end,
    'totalCost',case when v_sensitive then line.total_cost else null end,
    'notes',line.notes,'movementId',movement.id,'movementCode',movement.code,
    'movementType',movement.movement_type,'movementStatus',movement.status,
    'occurredAt',movement.occurred_at,'warehouseName',warehouse.name,
    'locationName',location.name,'batchNumber',lot.batch_number
  ) order by movement.occurred_at desc,line.line_number),'[]'::jsonb)
  into v_movements
  from public.inventory_movement_lines line
  join public.inventory_movements movement on movement.id=line.movement_id
  join public.inventory_warehouses warehouse on warehouse.id=line.warehouse_id
  left join public.inventory_locations location on location.id=line.location_id
  left join public.inventory_lots lot on lot.id=line.lot_id
  where line.item_id=p_item_id
    and public.has_module_permission(v_item.organization_id,'estoque','READ',movement.project_id,null)
  limit 50;

  return jsonb_build_object(
    'sensitiveVisible',v_sensitive,
    'item',jsonb_build_object(
      'id',v_item.id,'organizationId',v_item.organization_id,'categoryId',v_item.category_id,
      'unitId',v_item.unit_id,'code',v_item.code,'sku',v_item.sku,'barcode',v_item.barcode,
      'name',v_item.name,'description',v_item.description,'specification',v_item.specification,
      'kind',v_item.kind,'minimumStock',v_item.minimum_stock,
      'referenceUnitCost',case when v_sensitive then v_item.reference_unit_cost else null end,
      'controlsLot',v_item.controls_lot,'controlsExpiry',v_item.controls_expiry,
      'controlsIndividualAsset',v_item.controls_individual_asset,'active',v_item.active,
      'createdAt',v_item.created_at,'updatedAt',v_item.updated_at
    ),
    'lots',v_lots,
    'movements',v_movements
  );
end $$;

create or replace function public.get_inventory_asset_detail(p_asset_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_asset public.inventory_assets;
  v_sensitive boolean;
  v_item jsonb;
  v_custodies jsonb;
  v_maintenance jsonb;
begin
  select * into v_asset from public.inventory_assets where id=p_asset_id;
  if not found then raise exception 'Ativo não encontrado.'; end if;
  if not public.has_module_permission(v_asset.organization_id,'estoque','READ',v_asset.project_id,null) then
    raise exception 'Permissão insuficiente para consultar ativo.';
  end if;
  v_sensitive:=public.has_module_permission(v_asset.organization_id,'estoque','READ',v_asset.project_id,'sensitive');

  select jsonb_build_object('code',item.code,'name',item.name,'kind',item.kind)
  into v_item from public.inventory_items item where item.id=v_asset.item_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',custody.id,'status',custody.status,'projectId',custody.project_id,
    'projectCode',project.code,'projectName',project.name,'teamId',custody.team_id,
    'teamName',team.name,'responsibleUserId',custody.responsible_user_id,
    'responsibleName',custody.responsible_name,'assignedAt',custody.assigned_at,
    'expectedReturnAt',custody.expected_return_at,'returnedAt',custody.returned_at,
    'assignedCondition',custody.assigned_condition,'returnedCondition',custody.returned_condition,
    'notes',custody.notes
  ) order by custody.assigned_at desc),'[]'::jsonb)
  into v_custodies
  from public.inventory_asset_custodies custody
  left join public.projects project on project.id=custody.project_id
  left join public.project_teams team on team.id=custody.team_id
  where custody.asset_id=p_asset_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',maintenance.id,'status',maintenance.status,'title',maintenance.title,
    'description',maintenance.description,'providerName',maintenance.provider_name,
    'scheduledFor',maintenance.scheduled_for,'startedAt',maintenance.started_at,
    'completedAt',maintenance.completed_at,
    'cost',case when v_sensitive then maintenance.cost else null end,
    'notes',maintenance.notes,'createdAt',maintenance.created_at
  ) order by maintenance.created_at desc),'[]'::jsonb)
  into v_maintenance
  from public.inventory_asset_maintenance maintenance
  where maintenance.asset_id=p_asset_id;

  return jsonb_build_object(
    'sensitiveVisible',v_sensitive,
    'asset',jsonb_build_object(
      'id',v_asset.id,'organizationId',v_asset.organization_id,'itemId',v_asset.item_id,
      'warehouseId',v_asset.warehouse_id,'warehouseName',(select name from public.inventory_warehouses where id=v_asset.warehouse_id),
      'locationId',v_asset.location_id,'locationName',(select name from public.inventory_locations where id=v_asset.location_id),
      'projectId',v_asset.project_id,'projectCode',(select code from public.projects where id=v_asset.project_id),
      'projectName',(select name from public.projects where id=v_asset.project_id),
      'lotId',v_asset.lot_id,'patrimonyCode',v_asset.patrimony_code,'serialNumber',v_asset.serial_number,
      'status',v_asset.status,'acquiredOn',v_asset.acquired_on,
      'acquisitionCost',case when v_sensitive then v_asset.acquisition_cost else null end,
      'conditionNotes',v_asset.condition_notes,'active',v_asset.active,
      'createdAt',v_asset.created_at,'updatedAt',v_asset.updated_at
    ),
    'item',v_item,
    'custodies',v_custodies,
    'maintenance',v_maintenance
  );
end $$;

revoke all on function public.get_inventory_item_detail(uuid) from public,anon;
revoke all on function public.get_inventory_asset_detail(uuid) from public,anon;
grant execute on function public.get_inventory_item_detail(uuid) to authenticated;
grant execute on function public.get_inventory_asset_detail(uuid) to authenticated;
