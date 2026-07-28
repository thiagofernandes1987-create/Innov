-- VACINA-036: uma RPC não pode depender de coluna inexistente em tabela
-- relacionada. A ordem canônica da importação vem da linha da solicitação.

create or replace function public.import_procurement_receipt_to_inventory(
  p_receipt_id uuid,
  p_warehouse_id uuid,
  p_location_id uuid default null,
  p_lot_assignments jsonb default '{}'::jsonb
)
returns public.inventory_movements
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_receipt public.procurement_receipts;
  v_existing public.inventory_movements;
  v_movement public.inventory_movements;
  v_code text;
  v_line_count integer;
begin
  select * into v_receipt
  from public.procurement_receipts
  where id = p_receipt_id
  for update;

  if not found then raise exception 'Recebimento não encontrado.'; end if;

  if not public.has_module_permission(
    v_receipt.organization_id, 'estoque', 'EDIT', v_receipt.project_id, null
  ) then
    raise exception 'Permissão insuficiente para importar recebimento.';
  end if;

  select movement.* into v_existing
  from public.inventory_receipt_imports imported
  join public.inventory_movements movement on movement.id = imported.movement_id
  where imported.receipt_id = p_receipt_id;

  if found then return v_existing; end if;

  if v_receipt.status not in ('ACCEPTED', 'ACCEPTED_WITH_RESTRICTION') then
    raise exception 'Somente recebimento aceito pode gerar entrada de estoque.';
  end if;

  if not exists(
    select 1 from public.inventory_warehouses
    where id = p_warehouse_id
      and organization_id = v_receipt.organization_id
      and active
  ) then
    raise exception 'Depósito inválido para o recebimento.';
  end if;

  if p_location_id is not null and not exists(
    select 1 from public.inventory_locations
    where id = p_location_id
      and warehouse_id = p_warehouse_id
      and organization_id = v_receipt.organization_id
      and active
  ) then
    raise exception 'Localização inválida para o depósito.';
  end if;

  if not exists(
    select 1 from public.procurement_receipt_items
    where receipt_id = p_receipt_id and accepted_quantity > 0
  ) then
    raise exception 'Recebimento não possui quantidade aceita.';
  end if;

  if exists(
    select 1
    from public.procurement_receipt_items receipt_item
    left join public.inventory_procurement_item_mappings mapping
      on mapping.order_item_id = receipt_item.order_item_id
    where receipt_item.receipt_id = p_receipt_id
      and receipt_item.accepted_quantity > 0
      and mapping.id is null
  ) then
    raise exception 'Todos os itens aceitos precisam estar mapeados ao catálogo de estoque.';
  end if;

  if exists(
    select 1
    from public.procurement_receipt_items receipt_item
    join public.inventory_procurement_item_mappings mapping
      on mapping.order_item_id = receipt_item.order_item_id
    join public.inventory_items item on item.id = mapping.inventory_item_id
    where receipt_item.receipt_id = p_receipt_id
      and receipt_item.accepted_quantity > 0
      and item.controls_lot
      and nullif(p_lot_assignments ->> receipt_item.id::text, '') is null
  ) then
    raise exception 'Itens com controle de lote exigem lote por linha de recebimento.';
  end if;

  v_code := 'ENT-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS') || '-'
    || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.inventory_movements(
    organization_id, project_id, code, movement_type, status,
    occurred_at, reason, source_type, source_id, idempotency_key, created_by
  ) values (
    v_receipt.organization_id, v_receipt.project_id, v_code,
    'PROCUREMENT_RECEIPT', 'DRAFT', v_receipt.received_at,
    'Entrada pelo recebimento ' || v_receipt.code,
    'PROCUREMENT_RECEIPT', v_receipt.id,
    'procurement-receipt:' || v_receipt.id, auth.uid()
  ) returning * into v_movement;

  insert into public.inventory_movement_lines(
    organization_id, movement_id, line_number, warehouse_id, location_id,
    item_id, lot_id, procurement_receipt_item_id,
    quantity_delta, unit_cost, notes
  )
  select
    v_receipt.organization_id,
    v_movement.id,
    row_number() over(
      order by request_item.line_number, receipt_item.id
    )::integer,
    p_warehouse_id,
    p_location_id,
    mapping.inventory_item_id,
    nullif(p_lot_assignments ->> receipt_item.id::text, '')::uuid,
    receipt_item.id,
    round(receipt_item.accepted_quantity * mapping.conversion_factor, 4),
    round(order_item.unit_price / mapping.conversion_factor, 4),
    coalesce(receipt_item.notes, '')
  from public.procurement_receipt_items receipt_item
  join public.procurement_order_items order_item
    on order_item.id = receipt_item.order_item_id
  join public.procurement_request_items request_item
    on request_item.id = order_item.request_item_id
  join public.inventory_procurement_item_mappings mapping
    on mapping.order_item_id = receipt_item.order_item_id
  where receipt_item.receipt_id = p_receipt_id
    and receipt_item.accepted_quantity > 0;

  select count(*) into v_line_count
  from public.inventory_movement_lines
  where movement_id = v_movement.id;

  v_movement := public.post_inventory_movement(v_movement.id);

  insert into public.inventory_receipt_imports(
    organization_id, receipt_id, warehouse_id, location_id, movement_id, imported_by
  ) values (
    v_receipt.organization_id, v_receipt.id, p_warehouse_id,
    p_location_id, v_movement.id, auth.uid()
  );

  insert into public.inventory_events(
    organization_id, project_id, warehouse_id, movement_id,
    actor_user_id, event_type, metadata
  ) values (
    v_receipt.organization_id, v_receipt.project_id, p_warehouse_id,
    v_movement.id, auth.uid(), 'PROCUREMENT_RECEIPT_IMPORTED',
    jsonb_build_object(
      'receiptId', v_receipt.id,
      'receiptCode', v_receipt.code,
      'lineCount', v_line_count
    )
  );

  return v_movement;
end;
$function$;

revoke all on function public.import_procurement_receipt_to_inventory(
  uuid, uuid, uuid, jsonb
) from public;
revoke all on function public.import_procurement_receipt_to_inventory(
  uuid, uuid, uuid, jsonb
) from anon;
grant execute on function public.import_procurement_receipt_to_inventory(
  uuid, uuid, uuid, jsonb
) to authenticated;
grant execute on function public.import_procurement_receipt_to_inventory(
  uuid, uuid, uuid, jsonb
) to service_role;
