-- Etapa 17 — dashboard seguro com mascaramento de custos.

create or replace function public.get_inventory_dashboard(
  p_organization_id uuid,
  p_project_id uuid default null,
  p_warehouse_id uuid default null
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_warehouse_project uuid;
  v_can_read boolean;
  v_sensitive boolean;
  v_summary jsonb;
  v_items jsonb;
  v_warehouses jsonb;
  v_movements jsonb;
  v_assets jsonb;
  v_expiry jsonb;
begin
  if p_project_id is not null and not exists(
    select 1 from public.projects
    where id=p_project_id and organization_id=p_organization_id and archived_at is null
  ) then raise exception 'Obra inválida.'; end if;

  if p_warehouse_id is not null then
    select project_id into v_warehouse_project
    from public.inventory_warehouses
    where id=p_warehouse_id and organization_id=p_organization_id and active;
    if not found then raise exception 'Depósito inválido.'; end if;
    if p_project_id is not null and v_warehouse_project is not null and v_warehouse_project<>p_project_id then
      raise exception 'Depósito incompatível com a obra.';
    end if;
  end if;

  v_can_read:=public.has_module_permission(
    p_organization_id,'estoque','READ',coalesce(p_project_id,v_warehouse_project),null
  );
  if not v_can_read and p_project_id is null and p_warehouse_id is null then
    select exists(
      select 1 from public.inventory_warehouses warehouse
      where warehouse.organization_id=p_organization_id and warehouse.active
        and public.has_module_permission(p_organization_id,'estoque','READ',warehouse.project_id,null)
    ) into v_can_read;
  end if;
  if not v_can_read then raise exception 'Permissão insuficiente para consultar estoque.'; end if;

  v_sensitive:=public.has_module_permission(
    p_organization_id,'estoque','READ',coalesce(p_project_id,v_warehouse_project),'sensitive'
  );

  with allowed_warehouses as (
    select warehouse.*
    from public.inventory_warehouses warehouse
    where warehouse.organization_id=p_organization_id and warehouse.active
      and (p_warehouse_id is null or warehouse.id=p_warehouse_id)
      and (p_project_id is null or warehouse.project_id=p_project_id)
      and public.has_module_permission(p_organization_id,'estoque','READ',warehouse.project_id,null)
  ), allowed_stock as (
    select stock.*
    from public.inventory_available_stock_v stock
    join allowed_warehouses warehouse on warehouse.id=stock.warehouse_id
  ), item_totals as (
    select item.id,item.minimum_stock,
      coalesce(sum(stock.available_quantity),0)::numeric(18,4) as available_quantity
    from public.inventory_items item
    left join allowed_stock stock on stock.item_id=item.id
    where item.organization_id=p_organization_id and item.active
    group by item.id,item.minimum_stock
  )
  select jsonb_build_object(
    'warehouses',(select count(*) from allowed_warehouses),
    'items',(select count(*) from item_totals),
    'physicalQuantity',coalesce((select sum(physical_quantity) from allowed_stock),0),
    'reservedQuantity',coalesce((select sum(reserved_quantity) from allowed_stock),0),
    'availableQuantity',coalesce((select sum(available_quantity) from allowed_stock),0),
    'stockValue',case when v_sensitive then coalesce((select sum(stock_value) from allowed_stock),0) else null end,
    'belowMinimum',(select count(*) from item_totals where available_quantity<minimum_stock),
    'activeReservations',(
      select count(*) from public.inventory_reservations reservation
      where reservation.organization_id=p_organization_id
        and reservation.status in ('ACTIVE','PARTIALLY_CONSUMED')
        and (p_project_id is null or reservation.project_id=p_project_id)
        and (p_warehouse_id is null or reservation.warehouse_id=p_warehouse_id)
        and public.has_module_permission(p_organization_id,'estoque','READ',reservation.project_id,null)
    ),
    'openStocktakes',(
      select count(*)
      from public.inventory_stocktakes stocktake
      join allowed_warehouses warehouse on warehouse.id=stocktake.warehouse_id
      where stocktake.status in ('COUNTING','UNDER_REVIEW','APPROVED')
    ),
    'expiredLots',(
      select count(*)
      from public.inventory_expiry_alerts_v expiry
      join allowed_warehouses warehouse on warehouse.id=expiry.warehouse_id
      where expiry.expiry_health='EXPIRED'
    ),
    'expiringLots',(
      select count(*)
      from public.inventory_expiry_alerts_v expiry
      join allowed_warehouses warehouse on warehouse.id=expiry.warehouse_id
      where expiry.expiry_health in ('CRITICAL','WARNING')
    )
  ) into v_summary;

  with allowed_warehouses as (
    select warehouse.id
    from public.inventory_warehouses warehouse
    where warehouse.organization_id=p_organization_id and warehouse.active
      and (p_warehouse_id is null or warehouse.id=p_warehouse_id)
      and (p_project_id is null or warehouse.project_id=p_project_id)
      and public.has_module_permission(p_organization_id,'estoque','READ',warehouse.project_id,null)
  ), totals as (
    select item.id,item.code,item.name,item.kind,unit.code as unit_code,item.minimum_stock,item.reference_unit_cost,
      coalesce(sum(stock.physical_quantity),0)::numeric(18,4) as physical_quantity,
      coalesce(sum(stock.reserved_quantity),0)::numeric(18,4) as reserved_quantity,
      coalesce(sum(stock.available_quantity),0)::numeric(18,4) as available_quantity,
      coalesce(sum(stock.stock_value),0)::numeric(18,2) as stock_value,
      max(stock.last_movement_at) as last_movement_at
    from public.inventory_items item
    join public.inventory_units unit on unit.id=item.unit_id
    left join public.inventory_available_stock_v stock
      on stock.item_id=item.id and stock.warehouse_id in(select id from allowed_warehouses)
    where item.organization_id=p_organization_id and item.active
    group by item.id,item.code,item.name,item.kind,unit.code,item.minimum_stock,item.reference_unit_cost
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',id,'code',code,'name',name,'kind',kind,'unitCode',unit_code,
    'minimumStock',minimum_stock,'physicalQuantity',physical_quantity,
    'reservedQuantity',reserved_quantity,'availableQuantity',available_quantity,
    'belowMinimum',available_quantity<minimum_stock,
    'referenceUnitCost',case when v_sensitive then reference_unit_cost else null end,
    'stockValue',case when v_sensitive then stock_value else null end,
    'lastMovementAt',last_movement_at
  ) order by (available_quantity<minimum_stock) desc,name),'[]'::jsonb)
  into v_items from totals;

  with allowed as (
    select warehouse.*
    from public.inventory_warehouses warehouse
    where warehouse.organization_id=p_organization_id and warehouse.active
      and (p_warehouse_id is null or warehouse.id=p_warehouse_id)
      and (p_project_id is null or warehouse.project_id=p_project_id)
      and public.has_module_permission(p_organization_id,'estoque','READ',warehouse.project_id,null)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',warehouse.id,'code',warehouse.code,'name',warehouse.name,'kind',warehouse.kind,
    'projectId',warehouse.project_id,
    'physicalQuantity',coalesce((select sum(stock.physical_quantity) from public.inventory_available_stock_v stock where stock.warehouse_id=warehouse.id),0),
    'reservedQuantity',coalesce((select sum(stock.reserved_quantity) from public.inventory_available_stock_v stock where stock.warehouse_id=warehouse.id),0),
    'availableQuantity',coalesce((select sum(stock.available_quantity) from public.inventory_available_stock_v stock where stock.warehouse_id=warehouse.id),0),
    'stockValue',case when v_sensitive then coalesce((select sum(stock.stock_value) from public.inventory_available_stock_v stock where stock.warehouse_id=warehouse.id),0) else null end
  ) order by warehouse.name),'[]'::jsonb)
  into v_warehouses from allowed warehouse;

  select coalesce(jsonb_agg(to_jsonb(recent) order by recent.posted_at desc nulls last,recent.occurred_at desc),'[]'::jsonb)
  into v_movements
  from (
    select movement.id,movement.code,movement.movement_type,movement.status,movement.project_id,
      movement.occurred_at,movement.posted_at,movement.reason,count(line.id)::integer as line_count,
      case when v_sensitive then coalesce(sum(line.total_cost),0) else null end as total_cost
    from public.inventory_movements movement
    left join public.inventory_movement_lines line on line.movement_id=movement.id
    where movement.organization_id=p_organization_id
      and (p_project_id is null or movement.project_id=p_project_id)
      and public.has_module_permission(p_organization_id,'estoque','READ',movement.project_id,null)
      and (p_warehouse_id is null or exists(
        select 1 from public.inventory_movement_lines scoped
        where scoped.movement_id=movement.id and scoped.warehouse_id=p_warehouse_id
      ))
    group by movement.id
    order by movement.created_at desc
    limit 30
  ) recent;

  select coalesce(jsonb_agg(to_jsonb(asset) order by asset.item_name,asset.patrimony_code),'[]'::jsonb)
  into v_assets
  from (
    select current.asset_id,current.item_id,current.item_code,current.item_name,current.patrimony_code,
      current.serial_number,current.status,current.warehouse_id,current.warehouse_name,current.project_id,
      current.project_name,current.team_id,current.team_name,current.responsible_user_id,
      current.responsible_name,current.assigned_at,current.expected_return_at,current.return_overdue
    from public.inventory_asset_current_v current
    where current.organization_id=p_organization_id
      and (p_project_id is null or current.project_id=p_project_id)
      and (p_warehouse_id is null or current.warehouse_id=p_warehouse_id)
      and public.has_module_permission(p_organization_id,'estoque','READ',current.project_id,null)
    limit 100
  ) asset;

  select coalesce(jsonb_agg(to_jsonb(expiry) order by expiry.expires_on),'[]'::jsonb)
  into v_expiry
  from (
    select alert.warehouse_id,alert.location_id,alert.item_id,alert.item_code,alert.item_name,
      alert.lot_id,alert.batch_number,alert.expires_on,alert.physical_quantity,
      alert.days_to_expiry,alert.expiry_health
    from public.inventory_expiry_alerts_v alert
    join public.inventory_warehouses warehouse on warehouse.id=alert.warehouse_id
    where alert.organization_id=p_organization_id
      and (p_project_id is null or warehouse.project_id=p_project_id)
      and (p_warehouse_id is null or alert.warehouse_id=p_warehouse_id)
      and public.has_module_permission(p_organization_id,'estoque','READ',warehouse.project_id,null)
    limit 100
  ) expiry;

  return jsonb_build_object(
    'sensitiveVisible',v_sensitive,
    'summary',coalesce(v_summary,'{}'::jsonb),
    'items',coalesce(v_items,'[]'::jsonb),
    'warehouses',coalesce(v_warehouses,'[]'::jsonb),
    'recentMovements',coalesce(v_movements,'[]'::jsonb),
    'assets',coalesce(v_assets,'[]'::jsonb),
    'expiryAlerts',coalesce(v_expiry,'[]'::jsonb)
  );
end $$;

revoke all on function public.get_inventory_dashboard(uuid,uuid,uuid) from public,anon;
grant execute on function public.get_inventory_dashboard(uuid,uuid,uuid) to authenticated;
