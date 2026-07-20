-- Etapa 17 — correções encontradas na homologação transacional.
-- 1. Um movimento original REVERSED continua no razão e é neutralizado pelo movimento REVERSAL.
-- 2. Depósitos exclusivos de uma obra não podem ser usados por operações de outra obra.

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
    when sum(line.quantity_delta)=0 then null
    else (sum(line.quantity_delta * line.unit_cost)/sum(line.quantity_delta))::numeric(18,4)
  end as average_unit_cost,
  max(movement.posted_at) as last_movement_at
from public.inventory_movement_lines line
join public.inventory_movements movement on movement.id=line.movement_id
where movement.status in ('POSTED','REVERSED')
group by line.organization_id,line.warehouse_id,line.location_id,line.item_id,line.lot_id;

comment on view public.inventory_stock_v is
  'Razão físico derivado de movimentos POSTED e originais REVERSED; a contrapartida REVERSAL neutraliza o movimento original.';

create or replace function public.validate_inventory_project_scope()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  v_operation_project_id uuid;
  v_warehouse_project_id uuid;
begin
  select warehouse.project_id
    into v_warehouse_project_id
  from public.inventory_warehouses warehouse
  where warehouse.id=new.warehouse_id;

  if tg_table_name='inventory_movement_lines' then
    select movement.project_id
      into v_operation_project_id
    from public.inventory_movements movement
    where movement.id=new.movement_id;
  elsif tg_table_name='inventory_receipt_imports' then
    select receipt.project_id
      into v_operation_project_id
    from public.procurement_receipts receipt
    where receipt.id=new.receipt_id;
  else
    v_operation_project_id:=new.project_id;
  end if;

  if v_warehouse_project_id is not null
     and v_operation_project_id is distinct from v_warehouse_project_id then
    raise exception 'Depósito exclusivo de outra obra não pode ser usado nesta operação.';
  end if;

  return new;
end $$;

revoke all on function public.validate_inventory_project_scope() from public,anon,authenticated;

drop trigger if exists inventory_movement_lines_project_scope on public.inventory_movement_lines;
create trigger inventory_movement_lines_project_scope
before insert or update of movement_id,warehouse_id
on public.inventory_movement_lines
for each row execute function public.validate_inventory_project_scope();

drop trigger if exists inventory_reservations_project_scope on public.inventory_reservations;
create trigger inventory_reservations_project_scope
before insert or update of project_id,warehouse_id
on public.inventory_reservations
for each row execute function public.validate_inventory_project_scope();

drop trigger if exists inventory_receipt_imports_project_scope on public.inventory_receipt_imports;
create trigger inventory_receipt_imports_project_scope
before insert or update of receipt_id,warehouse_id
on public.inventory_receipt_imports
for each row execute function public.validate_inventory_project_scope();

drop trigger if exists inventory_assets_project_scope on public.inventory_assets;
create trigger inventory_assets_project_scope
before insert or update of project_id,warehouse_id
on public.inventory_assets
for each row execute function public.validate_inventory_project_scope();
