-- Etapa 17 — saldos derivados exclusivamente de movimentos postados.

create or replace view public.inventory_stock_v with (security_invoker=true) as
select
  line.organization_id,
  line.warehouse_id,
  line.location_id,
  line.item_id,
  line.lot_id,
  sum(line.quantity_delta)::numeric(18,4) as physical_quantity,
  sum(line.quantity_delta * line.unit_cost)::numeric(18,2) as stock_value,
  case
    when sum(line.quantity_delta) = 0 then null
    else (sum(line.quantity_delta * line.unit_cost) / sum(line.quantity_delta))::numeric(18,4)
  end as average_unit_cost,
  max(movement.posted_at) as last_movement_at
from public.inventory_movement_lines line
join public.inventory_movements movement on movement.id=line.movement_id
where movement.status='POSTED'
group by line.organization_id,line.warehouse_id,line.location_id,line.item_id,line.lot_id;

create or replace view public.inventory_reserved_stock_v with (security_invoker=true) as
select
  reservation.organization_id,
  reservation.warehouse_id,
  line.location_id,
  line.item_id,
  line.lot_id,
  sum(line.reserved_quantity-line.consumed_quantity-line.released_quantity)::numeric(18,4) as reserved_quantity,
  min(reservation.needed_by) as earliest_needed_by,
  min(reservation.expires_at) as earliest_expiry_at
from public.inventory_reservation_lines line
join public.inventory_reservations reservation on reservation.id=line.reservation_id
where reservation.status in ('ACTIVE','PARTIALLY_CONSUMED')
group by reservation.organization_id,reservation.warehouse_id,line.location_id,line.item_id,line.lot_id;

create or replace view public.inventory_available_stock_v with (security_invoker=true) as
select
  coalesce(stock.organization_id,reserved.organization_id) as organization_id,
  coalesce(stock.warehouse_id,reserved.warehouse_id) as warehouse_id,
  coalesce(stock.location_id,reserved.location_id) as location_id,
  coalesce(stock.item_id,reserved.item_id) as item_id,
  coalesce(stock.lot_id,reserved.lot_id) as lot_id,
  coalesce(stock.physical_quantity,0)::numeric(18,4) as physical_quantity,
  coalesce(reserved.reserved_quantity,0)::numeric(18,4) as reserved_quantity,
  (coalesce(stock.physical_quantity,0)-coalesce(reserved.reserved_quantity,0))::numeric(18,4) as available_quantity,
  stock.stock_value,
  stock.average_unit_cost,
  stock.last_movement_at,
  reserved.earliest_needed_by,
  reserved.earliest_expiry_at
from public.inventory_stock_v stock
full join public.inventory_reserved_stock_v reserved
  on reserved.organization_id=stock.organization_id
 and reserved.warehouse_id=stock.warehouse_id
 and reserved.location_id is not distinct from stock.location_id
 and reserved.item_id=stock.item_id
 and reserved.lot_id is not distinct from stock.lot_id;

create or replace view public.inventory_item_totals_v with (security_invoker=true) as
select
  item.organization_id,
  item.id as item_id,
  item.code,
  item.name,
  item.kind,
  item.minimum_stock,
  item.reference_unit_cost,
  unit.code as unit_code,
  coalesce(sum(stock.physical_quantity),0)::numeric(18,4) as physical_quantity,
  coalesce(sum(stock.reserved_quantity),0)::numeric(18,4) as reserved_quantity,
  coalesce(sum(stock.available_quantity),0)::numeric(18,4) as available_quantity,
  coalesce(sum(stock.stock_value),0)::numeric(18,2) as stock_value,
  case when coalesce(sum(stock.available_quantity),0)<item.minimum_stock then true else false end as below_minimum,
  max(stock.last_movement_at) as last_movement_at
from public.inventory_items item
join public.inventory_units unit on unit.id=item.unit_id
left join public.inventory_available_stock_v stock on stock.item_id=item.id
where item.active
group by item.organization_id,item.id,item.code,item.name,item.kind,item.minimum_stock,item.reference_unit_cost,unit.code;

create or replace view public.inventory_asset_current_v with (security_invoker=true) as
select
  asset.id as asset_id,
  asset.organization_id,
  asset.item_id,
  item.code as item_code,
  item.name as item_name,
  asset.patrimony_code,
  asset.serial_number,
  asset.status,
  asset.warehouse_id,
  warehouse.name as warehouse_name,
  asset.location_id,
  location.name as location_name,
  asset.project_id,
  project.name as project_name,
  custody.id as active_custody_id,
  custody.team_id,
  team.name as team_name,
  custody.responsible_user_id,
  custody.responsible_name,
  custody.assigned_at,
  custody.expected_return_at,
  case when custody.expected_return_at<now() and custody.status='ACTIVE' then true else false end as return_overdue,
  asset.updated_at
from public.inventory_assets asset
join public.inventory_items item on item.id=asset.item_id
left join public.inventory_warehouses warehouse on warehouse.id=asset.warehouse_id
left join public.inventory_locations location on location.id=asset.location_id
left join public.projects project on project.id=asset.project_id
left join public.inventory_asset_custodies custody on custody.asset_id=asset.id and custody.status='ACTIVE'
left join public.project_teams team on team.id=custody.team_id
where asset.active;

create or replace view public.inventory_expiry_alerts_v with (security_invoker=true) as
select
  stock.organization_id,
  stock.warehouse_id,
  stock.location_id,
  stock.item_id,
  item.code as item_code,
  item.name as item_name,
  stock.lot_id,
  lot.batch_number,
  lot.expires_on,
  stock.physical_quantity,
  (lot.expires_on-current_date)::integer as days_to_expiry,
  case
    when lot.expires_on<current_date then 'EXPIRED'
    when lot.expires_on<=current_date+30 then 'CRITICAL'
    when lot.expires_on<=current_date+90 then 'WARNING'
    else 'OK'
  end as expiry_health
from public.inventory_stock_v stock
join public.inventory_lots lot on lot.id=stock.lot_id
join public.inventory_items item on item.id=stock.item_id
where stock.physical_quantity>0 and lot.expires_on is not null;
