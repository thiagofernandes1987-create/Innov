-- Etapa 17 — integração idempotente com Compras e reservas de saldo disponível.

alter table public.inventory_reservations
  add column if not exists idempotency_key text;
create unique index if not exists inventory_reservations_idempotency_uidx
  on public.inventory_reservations(organization_id,idempotency_key)
  where idempotency_key is not null and length(trim(idempotency_key))>0;

create or replace function public.import_procurement_receipt_to_inventory(
  p_receipt_id uuid,
  p_warehouse_id uuid,
  p_location_id uuid default null,
  p_lot_assignments jsonb default '{}'::jsonb
) returns public.inventory_movements
language plpgsql security definer set search_path=public as $$
declare
  v_receipt public.procurement_receipts;
  v_existing public.inventory_movements;
  v_movement public.inventory_movements;
  v_code text;
  v_line_count integer;
begin
  select * into v_receipt from public.procurement_receipts where id=p_receipt_id for update;
  if not found then raise exception 'Recebimento não encontrado.'; end if;
  if not public.has_module_permission(v_receipt.organization_id,'estoque','EDIT',v_receipt.project_id,null) then
    raise exception 'Permissão insuficiente para importar recebimento.';
  end if;

  select movement.* into v_existing
  from public.inventory_receipt_imports imported
  join public.inventory_movements movement on movement.id=imported.movement_id
  where imported.receipt_id=p_receipt_id;
  if found then return v_existing; end if;

  if v_receipt.status not in ('ACCEPTED','ACCEPTED_WITH_RESTRICTION') then
    raise exception 'Somente recebimento aceito pode gerar entrada de estoque.';
  end if;
  if not exists(
    select 1 from public.inventory_warehouses
    where id=p_warehouse_id and organization_id=v_receipt.organization_id and active
  ) then raise exception 'Depósito inválido para o recebimento.'; end if;
  if p_location_id is not null and not exists(
    select 1 from public.inventory_locations
    where id=p_location_id and warehouse_id=p_warehouse_id and organization_id=v_receipt.organization_id and active
  ) then raise exception 'Localização inválida para o depósito.'; end if;
  if not exists(
    select 1 from public.procurement_receipt_items
    where receipt_id=p_receipt_id and accepted_quantity>0
  ) then raise exception 'Recebimento não possui quantidade aceita.'; end if;

  if exists(
    select 1
    from public.procurement_receipt_items receipt_item
    left join public.inventory_procurement_item_mappings mapping on mapping.order_item_id=receipt_item.order_item_id
    where receipt_item.receipt_id=p_receipt_id and receipt_item.accepted_quantity>0 and mapping.id is null
  ) then raise exception 'Todos os itens aceitos precisam estar mapeados ao catálogo de estoque.'; end if;

  if exists(
    select 1
    from public.procurement_receipt_items receipt_item
    join public.inventory_procurement_item_mappings mapping on mapping.order_item_id=receipt_item.order_item_id
    join public.inventory_items item on item.id=mapping.inventory_item_id
    where receipt_item.receipt_id=p_receipt_id and receipt_item.accepted_quantity>0 and item.controls_lot
      and nullif(p_lot_assignments->>receipt_item.id::text,'') is null
  ) then raise exception 'Itens com controle de lote exigem lote por linha de recebimento.'; end if;

  v_code:='ENT-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  insert into public.inventory_movements(
    organization_id,project_id,code,movement_type,status,occurred_at,reason,source_type,source_id,idempotency_key,created_by
  ) values(
    v_receipt.organization_id,v_receipt.project_id,v_code,'PROCUREMENT_RECEIPT','DRAFT',v_receipt.received_at,
    'Entrada pelo recebimento '||v_receipt.code,'PROCUREMENT_RECEIPT',v_receipt.id,
    'procurement-receipt:'||v_receipt.id,auth.uid()
  ) returning * into v_movement;

  insert into public.inventory_movement_lines(
    organization_id,movement_id,line_number,warehouse_id,location_id,item_id,lot_id,
    procurement_receipt_item_id,quantity_delta,unit_cost,notes
  )
  select
    v_receipt.organization_id,v_movement.id,
    row_number() over(order by receipt_item.created_at,receipt_item.id)::integer,
    p_warehouse_id,p_location_id,mapping.inventory_item_id,
    nullif(p_lot_assignments->>receipt_item.id::text,'')::uuid,
    receipt_item.id,
    round(receipt_item.accepted_quantity*mapping.conversion_factor,4),
    round(order_item.unit_price/mapping.conversion_factor,4),
    coalesce(receipt_item.notes,'')
  from public.procurement_receipt_items receipt_item
  join public.procurement_order_items order_item on order_item.id=receipt_item.order_item_id
  join public.inventory_procurement_item_mappings mapping on mapping.order_item_id=receipt_item.order_item_id
  where receipt_item.receipt_id=p_receipt_id and receipt_item.accepted_quantity>0;

  select count(*) into v_line_count from public.inventory_movement_lines where movement_id=v_movement.id;
  v_movement:=public.post_inventory_movement(v_movement.id);

  insert into public.inventory_receipt_imports(
    organization_id,receipt_id,warehouse_id,location_id,movement_id,imported_by
  ) values(
    v_receipt.organization_id,v_receipt.id,p_warehouse_id,p_location_id,v_movement.id,auth.uid()
  );

  insert into public.inventory_events(
    organization_id,project_id,warehouse_id,movement_id,actor_user_id,event_type,metadata
  ) values(
    v_receipt.organization_id,v_receipt.project_id,p_warehouse_id,v_movement.id,auth.uid(),
    'PROCUREMENT_RECEIPT_IMPORTED',jsonb_build_object('receiptId',v_receipt.id,'receiptCode',v_receipt.code,'lineCount',v_line_count)
  );
  return v_movement;
end $$;

create or replace function public.create_inventory_reservation(
  p_organization_id uuid,
  p_project_id uuid,
  p_warehouse_id uuid,
  p_task_id uuid,
  p_needed_by date,
  p_expires_at timestamptz,
  p_reason text,
  p_lines jsonb,
  p_idempotency_key text default null
) returns public.inventory_reservations
language plpgsql security definer set search_path=public as $$
declare
  v_reservation public.inventory_reservations;
  v_code text;
begin
  if not public.has_module_permission(p_organization_id,'estoque','EDIT',p_project_id,null) then
    raise exception 'Permissão insuficiente para criar reserva.';
  end if;
  if not exists(select 1 from public.projects where id=p_project_id and organization_id=p_organization_id and archived_at is null) then
    raise exception 'Obra inválida.';
  end if;
  if not exists(select 1 from public.inventory_warehouses where id=p_warehouse_id and organization_id=p_organization_id and active) then
    raise exception 'Depósito inválido.';
  end if;
  if p_task_id is not null and not exists(select 1 from public.project_tasks where id=p_task_id and project_id=p_project_id) then
    raise exception 'Tarefa inválida para a obra.';
  end if;
  if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)=0 then
    raise exception 'Reserva precisa de linhas.';
  end if;
  if p_expires_at is not null and p_expires_at<=now() then raise exception 'Expiração precisa estar no futuro.'; end if;

  if p_idempotency_key is not null then
    select * into v_reservation from public.inventory_reservations
    where organization_id=p_organization_id and idempotency_key=p_idempotency_key;
    if found then return v_reservation; end if;
  end if;

  if exists(
    select 1 from jsonb_array_elements(p_lines) input
    where nullif(input->>'itemId','') is null
       or nullif(input->>'locationId','') is null
       or coalesce((input->>'quantity')::numeric,0)<=0
  ) then raise exception 'Cada linha exige item, localização e quantidade positiva.'; end if;

  if exists(
    with requested as (
      select
        (input->>'itemId')::uuid as item_id,
        (input->>'locationId')::uuid as location_id,
        nullif(input->>'lotId','')::uuid as lot_id,
        sum((input->>'quantity')::numeric)::numeric(18,4) as quantity
      from jsonb_array_elements(p_lines) input
      group by (input->>'itemId')::uuid,(input->>'locationId')::uuid,nullif(input->>'lotId','')::uuid
    )
    select 1 from requested request
    left join public.inventory_available_stock_v stock
      on stock.organization_id=p_organization_id
     and stock.warehouse_id=p_warehouse_id
     and stock.location_id=request.location_id
     and stock.item_id=request.item_id
     and stock.lot_id is not distinct from request.lot_id
    where coalesce(stock.available_quantity,0)<request.quantity
  ) then raise exception 'Quantidade disponível insuficiente para a reserva.'; end if;

  if exists(
    select 1
    from jsonb_array_elements(p_lines) input
    join public.inventory_items item on item.id=(input->>'itemId')::uuid
    where item.organization_id<>p_organization_id
       or not item.active
       or (item.controls_lot and nullif(input->>'lotId','') is null)
       or not exists(
         select 1 from public.inventory_locations location
         where location.id=(input->>'locationId')::uuid
           and location.warehouse_id=p_warehouse_id
           and location.organization_id=p_organization_id
           and location.active
       )
  ) then raise exception 'Item, lote ou localização inválidos na reserva.'; end if;

  v_code:='RES-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  insert into public.inventory_reservations(
    organization_id,project_id,task_id,warehouse_id,code,status,needed_by,expires_at,reason,
    requested_by,activated_by,activated_at,idempotency_key
  ) values(
    p_organization_id,p_project_id,p_task_id,p_warehouse_id,v_code,'ACTIVE',p_needed_by,p_expires_at,
    coalesce(p_reason,''),auth.uid(),auth.uid(),now(),nullif(trim(coalesce(p_idempotency_key,'')),'')
  ) returning * into v_reservation;

  insert into public.inventory_reservation_lines(
    organization_id,reservation_id,line_number,item_id,location_id,lot_id,
    requested_quantity,reserved_quantity,notes
  )
  select
    p_organization_id,v_reservation.id,row_number() over()::integer,
    (input->>'itemId')::uuid,(input->>'locationId')::uuid,nullif(input->>'lotId','')::uuid,
    (input->>'quantity')::numeric,(input->>'quantity')::numeric,coalesce(input->>'notes','')
  from jsonb_array_elements(p_lines) input;

  insert into public.inventory_events(
    organization_id,project_id,warehouse_id,reservation_id,actor_user_id,event_type,metadata
  ) values(
    p_organization_id,p_project_id,p_warehouse_id,v_reservation.id,auth.uid(),'RESERVATION_ACTIVATED',
    jsonb_build_object('code',v_code,'lines',jsonb_array_length(p_lines),'neededBy',p_needed_by)
  );
  return v_reservation;
end $$;

create or replace function public.release_inventory_reservation(p_reservation_id uuid,p_reason text)
returns public.inventory_reservations
language plpgsql security definer set search_path=public as $$
declare v_reservation public.inventory_reservations;
begin
  select * into v_reservation from public.inventory_reservations where id=p_reservation_id for update;
  if not found then raise exception 'Reserva não encontrada.'; end if;
  if not public.has_module_permission(v_reservation.organization_id,'estoque','EDIT',v_reservation.project_id,null) then
    raise exception 'Permissão insuficiente para liberar reserva.';
  end if;
  if v_reservation.status='RELEASED' then return v_reservation; end if;
  if v_reservation.status not in ('ACTIVE','PARTIALLY_CONSUMED') then raise exception 'Reserva não pode ser liberada neste estado.'; end if;

  update public.inventory_reservation_lines set
    released_quantity=reserved_quantity-consumed_quantity,updated_at=now()
  where reservation_id=p_reservation_id;
  update public.inventory_reservations set
    status='RELEASED',released_by=auth.uid(),released_at=now(),
    reason=concat_ws(E'\n',nullif(reason,''),'Liberação: '||coalesce(nullif(trim(p_reason),''),'sem observação')),updated_at=now()
  where id=p_reservation_id returning * into v_reservation;

  insert into public.inventory_events(organization_id,project_id,warehouse_id,reservation_id,actor_user_id,event_type,metadata)
  values(v_reservation.organization_id,v_reservation.project_id,v_reservation.warehouse_id,v_reservation.id,auth.uid(),
    'RESERVATION_RELEASED',jsonb_build_object('reason',coalesce(p_reason,'')));
  return v_reservation;
end $$;

create or replace function public.consume_inventory_reservation(
  p_reservation_id uuid,
  p_lines jsonb,
  p_reason text,
  p_idempotency_key text default null
) returns public.inventory_movements
language plpgsql security definer set search_path=public as $$
declare
  v_reservation public.inventory_reservations;
  v_movement public.inventory_movements;
  v_code text;
begin
  select * into v_reservation from public.inventory_reservations where id=p_reservation_id for update;
  if not found then raise exception 'Reserva não encontrada.'; end if;
  if not public.has_module_permission(v_reservation.organization_id,'estoque','EDIT',v_reservation.project_id,null) then
    raise exception 'Permissão insuficiente para consumir reserva.';
  end if;
  if v_reservation.status not in ('ACTIVE','PARTIALLY_CONSUMED') then raise exception 'Reserva não está disponível para consumo.'; end if;
  if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)=0 then raise exception 'Consumo precisa de linhas.'; end if;

  if p_idempotency_key is not null then
    select * into v_movement from public.inventory_movements
    where organization_id=v_reservation.organization_id and idempotency_key=p_idempotency_key;
    if found then return v_movement; end if;
  end if;

  if exists(
    select 1
    from jsonb_array_elements(p_lines) input
    left join public.inventory_reservation_lines line on line.id=(input->>'reservationLineId')::uuid
    where line.id is null or line.reservation_id<>p_reservation_id
       or coalesce((input->>'quantity')::numeric,0)<=0
       or (input->>'quantity')::numeric>line.reserved_quantity-line.consumed_quantity-line.released_quantity
  ) then raise exception 'Linha ou quantidade de consumo inválida.'; end if;

  v_code:='SAI-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  insert into public.inventory_movements(
    organization_id,project_id,code,movement_type,status,occurred_at,reason,source_type,source_id,idempotency_key,created_by
  ) values(
    v_reservation.organization_id,v_reservation.project_id,v_code,'ISSUE','DRAFT',now(),coalesce(p_reason,''),
    'INVENTORY_RESERVATION',v_reservation.id,nullif(trim(coalesce(p_idempotency_key,'')),''),auth.uid()
  ) returning * into v_movement;

  insert into public.inventory_movement_lines(
    organization_id,movement_id,line_number,warehouse_id,location_id,item_id,lot_id,reservation_line_id,
    quantity_delta,unit_cost,notes
  )
  select
    v_reservation.organization_id,v_movement.id,row_number() over()::integer,v_reservation.warehouse_id,
    line.location_id,line.item_id,line.lot_id,line.id,-(input->>'quantity')::numeric,
    coalesce(stock.average_unit_cost,item.reference_unit_cost),coalesce(input->>'notes','')
  from jsonb_array_elements(p_lines) input
  join public.inventory_reservation_lines line on line.id=(input->>'reservationLineId')::uuid
  join public.inventory_items item on item.id=line.item_id
  left join public.inventory_stock_v stock
    on stock.warehouse_id=v_reservation.warehouse_id
   and stock.location_id=line.location_id
   and stock.item_id=line.item_id
   and stock.lot_id is not distinct from line.lot_id;

  if exists(select 1 from public.inventory_movement_lines where movement_id=v_movement.id and unit_cost is null) then
    raise exception 'Item sem custo disponível para contabilizar a saída.';
  end if;
  v_movement:=public.post_inventory_movement(v_movement.id);

  insert into public.inventory_events(organization_id,project_id,warehouse_id,movement_id,reservation_id,actor_user_id,event_type,metadata)
  values(v_reservation.organization_id,v_reservation.project_id,v_reservation.warehouse_id,v_movement.id,v_reservation.id,auth.uid(),
    'RESERVATION_CONSUMED',jsonb_build_object('movementCode',v_movement.code,'lines',jsonb_array_length(p_lines)));
  return v_movement;
end $$;

create or replace function public.expire_inventory_reservations()
returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
  with expired as (
    update public.inventory_reservations set status='EXPIRED',released_at=now(),updated_at=now()
    where status in ('ACTIVE','PARTIALLY_CONSUMED') and expires_at is not null and expires_at<=now()
    returning id,organization_id,project_id,warehouse_id
  ), released as (
    update public.inventory_reservation_lines line set
      released_quantity=line.reserved_quantity-line.consumed_quantity,updated_at=now()
    from expired where line.reservation_id=expired.id returning line.reservation_id
  ), events as (
    insert into public.inventory_events(organization_id,project_id,warehouse_id,reservation_id,event_type,metadata)
    select organization_id,project_id,warehouse_id,id,'RESERVATION_EXPIRED','{}'::jsonb from expired
    returning id
  ) select count(*) into v_count from expired;
  return v_count;
end $$;

revoke all on function public.import_procurement_receipt_to_inventory(uuid,uuid,uuid,jsonb) from public,anon;
revoke all on function public.create_inventory_reservation(uuid,uuid,uuid,uuid,date,timestamptz,text,jsonb,text) from public,anon;
revoke all on function public.release_inventory_reservation(uuid,text) from public,anon;
revoke all on function public.consume_inventory_reservation(uuid,jsonb,text,text) from public,anon;
revoke all on function public.expire_inventory_reservations() from public,anon,authenticated;
grant execute on function public.import_procurement_receipt_to_inventory(uuid,uuid,uuid,jsonb) to authenticated;
grant execute on function public.create_inventory_reservation(uuid,uuid,uuid,uuid,date,timestamptz,text,jsonb,text) to authenticated;
grant execute on function public.release_inventory_reservation(uuid,text) to authenticated;
grant execute on function public.consume_inventory_reservation(uuid,jsonb,text,text) to authenticated;
grant execute on function public.expire_inventory_reservations() to service_role;
