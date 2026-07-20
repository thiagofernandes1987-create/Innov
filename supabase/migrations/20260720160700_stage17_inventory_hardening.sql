-- Etapa 17 — performance, entradas controladas e invariantes adicionais.

-- Índices de catálogo e estrutura.
create index if not exists inventory_categories_parent_idx on public.inventory_categories(parent_id) where parent_id is not null;
create index if not exists inventory_categories_created_by_idx on public.inventory_categories(created_by) where created_by is not null;
create index if not exists inventory_units_created_by_idx on public.inventory_units(created_by) where created_by is not null;
create index if not exists inventory_items_category_idx on public.inventory_items(category_id) where category_id is not null;
create index if not exists inventory_items_unit_idx on public.inventory_items(unit_id);
create index if not exists inventory_items_created_by_idx on public.inventory_items(created_by) where created_by is not null;
create index if not exists inventory_warehouses_project_idx on public.inventory_warehouses(project_id) where project_id is not null;
create index if not exists inventory_warehouses_responsible_idx on public.inventory_warehouses(responsible_user_id) where responsible_user_id is not null;
create index if not exists inventory_warehouses_created_by_idx on public.inventory_warehouses(created_by) where created_by is not null;
create index if not exists inventory_locations_created_by_idx on public.inventory_locations(created_by) where created_by is not null;
create index if not exists inventory_lots_supplier_idx on public.inventory_lots(supplier_id) where supplier_id is not null;
create index if not exists inventory_lots_created_by_idx on public.inventory_lots(created_by) where created_by is not null;
create index if not exists inventory_lots_expiry_idx on public.inventory_lots(organization_id,expires_on) where expires_on is not null and active;
create index if not exists inventory_procurement_mappings_item_idx on public.inventory_procurement_item_mappings(inventory_item_id);
create index if not exists inventory_procurement_mappings_created_by_idx on public.inventory_procurement_item_mappings(created_by) where created_by is not null;

-- Índices de movimentos e importações.
create index if not exists inventory_movements_project_status_idx on public.inventory_movements(project_id,status,occurred_at desc) where project_id is not null;
create index if not exists inventory_movements_org_status_idx on public.inventory_movements(organization_id,status,occurred_at desc);
create index if not exists inventory_movements_source_idx on public.inventory_movements(source_type,source_id) where source_id is not null;
create index if not exists inventory_movements_created_by_idx on public.inventory_movements(created_by) where created_by is not null;
create index if not exists inventory_movements_posted_by_idx on public.inventory_movements(posted_by) where posted_by is not null;
create index if not exists inventory_movements_reversed_by_idx on public.inventory_movements(reversed_by) where reversed_by is not null;
create index if not exists inventory_movements_canceled_by_idx on public.inventory_movements(canceled_by) where canceled_by is not null;
create index if not exists inventory_movement_lines_warehouse_item_idx on public.inventory_movement_lines(warehouse_id,item_id,location_id,lot_id);
create index if not exists inventory_movement_lines_location_idx on public.inventory_movement_lines(location_id) where location_id is not null;
create index if not exists inventory_movement_lines_item_idx on public.inventory_movement_lines(item_id);
create index if not exists inventory_movement_lines_lot_idx on public.inventory_movement_lines(lot_id) where lot_id is not null;
create index if not exists inventory_movement_lines_asset_idx on public.inventory_movement_lines(asset_id) where asset_id is not null;
create index if not exists inventory_movement_lines_reservation_idx on public.inventory_movement_lines(reservation_line_id) where reservation_line_id is not null;
create index if not exists inventory_movement_lines_receipt_item_idx on public.inventory_movement_lines(procurement_receipt_item_id) where procurement_receipt_item_id is not null;
create index if not exists inventory_receipt_imports_warehouse_idx on public.inventory_receipt_imports(warehouse_id);
create index if not exists inventory_receipt_imports_location_idx on public.inventory_receipt_imports(location_id) where location_id is not null;
create index if not exists inventory_receipt_imports_imported_by_idx on public.inventory_receipt_imports(imported_by) where imported_by is not null;

-- Índices de reservas.
create index if not exists inventory_reservations_project_status_idx on public.inventory_reservations(project_id,status,needed_by);
create index if not exists inventory_reservations_task_idx on public.inventory_reservations(task_id) where task_id is not null;
create index if not exists inventory_reservations_warehouse_status_idx on public.inventory_reservations(warehouse_id,status,needed_by);
create index if not exists inventory_reservations_expiry_idx on public.inventory_reservations(expires_at) where expires_at is not null and status in ('ACTIVE','PARTIALLY_CONSUMED');
create index if not exists inventory_reservations_requested_by_idx on public.inventory_reservations(requested_by) where requested_by is not null;
create index if not exists inventory_reservations_activated_by_idx on public.inventory_reservations(activated_by) where activated_by is not null;
create index if not exists inventory_reservations_released_by_idx on public.inventory_reservations(released_by) where released_by is not null;
create index if not exists inventory_reservations_canceled_by_idx on public.inventory_reservations(canceled_by) where canceled_by is not null;
create index if not exists inventory_reservation_lines_item_idx on public.inventory_reservation_lines(item_id);
create index if not exists inventory_reservation_lines_location_idx on public.inventory_reservation_lines(location_id) where location_id is not null;
create index if not exists inventory_reservation_lines_lot_idx on public.inventory_reservation_lines(lot_id) where lot_id is not null;

-- Índices de ativos.
create index if not exists inventory_assets_item_status_idx on public.inventory_assets(item_id,status);
create index if not exists inventory_assets_warehouse_idx on public.inventory_assets(warehouse_id,status) where warehouse_id is not null;
create index if not exists inventory_assets_location_idx on public.inventory_assets(location_id) where location_id is not null;
create index if not exists inventory_assets_project_idx on public.inventory_assets(project_id,status) where project_id is not null;
create index if not exists inventory_assets_lot_idx on public.inventory_assets(lot_id) where lot_id is not null;
create index if not exists inventory_assets_created_by_idx on public.inventory_assets(created_by) where created_by is not null;
create index if not exists inventory_asset_custodies_asset_idx on public.inventory_asset_custodies(asset_id,assigned_at desc);
create index if not exists inventory_asset_custodies_project_idx on public.inventory_asset_custodies(project_id,status) where project_id is not null;
create index if not exists inventory_asset_custodies_team_idx on public.inventory_asset_custodies(team_id,status) where team_id is not null;
create index if not exists inventory_asset_custodies_responsible_idx on public.inventory_asset_custodies(responsible_user_id,status) where responsible_user_id is not null;
create index if not exists inventory_asset_custodies_assigned_by_idx on public.inventory_asset_custodies(assigned_by) where assigned_by is not null;
create index if not exists inventory_asset_custodies_returned_by_idx on public.inventory_asset_custodies(returned_by) where returned_by is not null;
create index if not exists inventory_asset_maintenance_asset_status_idx on public.inventory_asset_maintenance(asset_id,status,scheduled_for);
create index if not exists inventory_asset_maintenance_created_by_idx on public.inventory_asset_maintenance(created_by) where created_by is not null;
create index if not exists inventory_asset_maintenance_completed_by_idx on public.inventory_asset_maintenance(completed_by) where completed_by is not null;

-- Índices de inventário físico e eventos.
create index if not exists inventory_stocktakes_warehouse_status_idx on public.inventory_stocktakes(warehouse_id,status,created_at desc);
create index if not exists inventory_stocktakes_started_by_idx on public.inventory_stocktakes(started_by) where started_by is not null;
create index if not exists inventory_stocktakes_submitted_by_idx on public.inventory_stocktakes(submitted_by) where submitted_by is not null;
create index if not exists inventory_stocktakes_approved_by_idx on public.inventory_stocktakes(approved_by) where approved_by is not null;
create index if not exists inventory_stocktakes_posted_by_idx on public.inventory_stocktakes(posted_by) where posted_by is not null;
create index if not exists inventory_stocktakes_adjustment_idx on public.inventory_stocktakes(adjustment_movement_id) where adjustment_movement_id is not null;
create index if not exists inventory_stocktakes_canceled_by_idx on public.inventory_stocktakes(canceled_by) where canceled_by is not null;
create index if not exists inventory_stocktake_lines_item_idx on public.inventory_stocktake_lines(item_id);
create index if not exists inventory_stocktake_lines_location_idx on public.inventory_stocktake_lines(location_id) where location_id is not null;
create index if not exists inventory_stocktake_lines_lot_idx on public.inventory_stocktake_lines(lot_id) where lot_id is not null;
create index if not exists inventory_stocktake_lines_counted_by_idx on public.inventory_stocktake_lines(counted_by) where counted_by is not null;
create index if not exists inventory_stocktake_lines_recounted_by_idx on public.inventory_stocktake_lines(recounted_by) where recounted_by is not null;
create index if not exists inventory_events_org_created_idx on public.inventory_events(organization_id,created_at desc);
create index if not exists inventory_events_project_created_idx on public.inventory_events(project_id,created_at desc) where project_id is not null;
create index if not exists inventory_events_warehouse_idx on public.inventory_events(warehouse_id,created_at desc) where warehouse_id is not null;
create index if not exists inventory_events_item_idx on public.inventory_events(item_id,created_at desc) where item_id is not null;
create index if not exists inventory_events_movement_idx on public.inventory_events(movement_id) where movement_id is not null;
create index if not exists inventory_events_reservation_idx on public.inventory_events(reservation_id) where reservation_id is not null;
create index if not exists inventory_events_asset_idx on public.inventory_events(asset_id) where asset_id is not null;
create index if not exists inventory_events_stocktake_idx on public.inventory_events(stocktake_id) where stocktake_id is not null;
create index if not exists inventory_events_actor_idx on public.inventory_events(actor_user_id) where actor_user_id is not null;

create or replace function public.enforce_inventory_direct_write_rules()
returns trigger language plpgsql set search_path=public as $$
begin
  if tg_table_name='inventory_movements' and tg_op='INSERT' then
    if current_user in ('authenticated','anon') and new.status<>'DRAFT' then
      raise exception 'Movimento deve ser criado como rascunho e postado pela RPC oficial.';
    end if;
  elsif tg_table_name='inventory_warehouses' and tg_op='UPDATE' then
    if old.allows_negative_stock=false and new.allows_negative_stock=true
       and not public.has_module_permission(new.organization_id,'estoque','READ',new.project_id,'administer') then
      raise exception 'Somente administrador pode habilitar saldo negativo.';
    end if;
  elsif tg_table_name='inventory_assets' and tg_op='INSERT' then
    if current_user in ('authenticated','anon') and (new.status<>'AVAILABLE' or new.warehouse_id is null) then
      raise exception 'Ativo deve ser cadastrado disponível em um depósito.';
    end if;
    if not exists(
      select 1 from public.inventory_items item
      where item.id=new.item_id and item.organization_id=new.organization_id
        and item.active and item.controls_individual_asset and item.kind in ('TOOL','ASSET')
    ) then raise exception 'Ativo exige item individualizado do tipo ferramenta ou ativo.'; end if;
  end if;
  return new;
end $$;

create or replace function public.validate_inventory_stocktake_adjustment_link()
returns trigger language plpgsql set search_path=public as $$
declare v_org uuid;v_type public.inventory_movement_type;
begin
  if new.adjustment_movement_id is not null then
    select organization_id,movement_type into v_org,v_type
    from public.inventory_movements where id=new.adjustment_movement_id;
    if v_org is null or v_org<>new.organization_id or v_type<>'ADJUSTMENT' then
      raise exception 'Movimento de ajuste incompatível com o inventário.';
    end if;
  end if;
  return new;
end $$;

create or replace function public.recalculate_inventory_reservation_status(p_reservation_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_status public.inventory_reservation_status;
begin
  select status into v_status from public.inventory_reservations where id=p_reservation_id for update;
  if not found or v_status in ('RELEASED','EXPIRED','CANCELED') then return; end if;
  update public.inventory_reservations set
    status=case
      when not exists(
        select 1 from public.inventory_reservation_lines line
        where line.reservation_id=p_reservation_id
          and line.consumed_quantity<line.reserved_quantity-line.released_quantity
      ) then 'CONSUMED'::public.inventory_reservation_status
      when exists(
        select 1 from public.inventory_reservation_lines line
        where line.reservation_id=p_reservation_id and line.consumed_quantity>0
      ) then 'PARTIALLY_CONSUMED'::public.inventory_reservation_status
      else 'ACTIVE'::public.inventory_reservation_status end,
    updated_at=now()
  where id=p_reservation_id;
end $$;

drop trigger if exists inventory_movements_direct_write_guard on public.inventory_movements;
create trigger inventory_movements_direct_write_guard before insert on public.inventory_movements
for each row execute function public.enforce_inventory_direct_write_rules();
drop trigger if exists inventory_warehouses_direct_write_guard on public.inventory_warehouses;
create trigger inventory_warehouses_direct_write_guard before update on public.inventory_warehouses
for each row execute function public.enforce_inventory_direct_write_rules();
drop trigger if exists inventory_assets_direct_write_guard on public.inventory_assets;
create trigger inventory_assets_direct_write_guard before insert on public.inventory_assets
for each row execute function public.enforce_inventory_direct_write_rules();
drop trigger if exists inventory_stocktakes_adjustment_guard on public.inventory_stocktakes;
create trigger inventory_stocktakes_adjustment_guard before insert or update on public.inventory_stocktakes
for each row execute function public.validate_inventory_stocktake_adjustment_link();

-- Status de movimento não pode ser alterado diretamente pelo papel autenticado.
revoke update on public.inventory_movements from authenticated;

revoke all on function public.enforce_inventory_direct_write_rules() from public,anon,authenticated;
revoke all on function public.validate_inventory_stocktake_adjustment_link() from public,anon,authenticated;
revoke all on function public.recalculate_inventory_reservation_status(uuid) from public,anon,authenticated;
