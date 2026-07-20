-- Etapa 17 — concorrência de saldo e proteção de reservas.

create or replace function public.inventory_stock_lock_key(
  p_organization_id uuid,
  p_warehouse_id uuid,
  p_location_id uuid,
  p_item_id uuid,
  p_lot_id uuid
) returns bigint
language sql immutable set search_path=public as $$
  select hashtextextended(
    concat_ws('|',p_organization_id::text,p_warehouse_id::text,coalesce(p_location_id::text,'-'),p_item_id::text,coalesce(p_lot_id::text,'-')),
    0
  );
$$;

create or replace function public.post_inventory_movement(p_movement_id uuid)
returns public.inventory_movements
language plpgsql security definer set search_path=public as $$
declare
  v_movement public.inventory_movements;
  v_line_count integer;
  v_invalid boolean;
  v_lock_key bigint;
begin
  select * into v_movement from public.inventory_movements where id=p_movement_id for update;
  if not found then raise exception 'Movimento não encontrado.'; end if;
  if not public.has_module_permission(v_movement.organization_id,'estoque','EDIT',v_movement.project_id,null) then
    raise exception 'Permissão insuficiente para postar movimento.';
  end if;
  if v_movement.status='POSTED' then return v_movement; end if;
  if v_movement.status<>'DRAFT' then raise exception 'Somente movimentos em rascunho podem ser postados.'; end if;

  select count(*) into v_line_count from public.inventory_movement_lines where movement_id=p_movement_id;
  if v_line_count=0 then raise exception 'Movimento sem linhas.'; end if;
  if exists(select 1 from public.inventory_movement_lines where movement_id=p_movement_id and unit_cost is null) then
    raise exception 'Todas as linhas precisam de custo unitário para preservar a valorização do saldo.';
  end if;

  -- Todas as operações que afetam a mesma posição usam o mesmo lock transacional.
  for v_lock_key in
    select public.inventory_stock_lock_key(
      line.organization_id,line.warehouse_id,line.location_id,line.item_id,line.lot_id
    )
    from public.inventory_movement_lines line
    where line.movement_id=p_movement_id
    group by line.organization_id,line.warehouse_id,line.location_id,line.item_id,line.lot_id
    order by 1
  loop
    perform pg_advisory_xact_lock(v_lock_key);
  end loop;

  if v_movement.movement_type in ('PROCUREMENT_RECEIPT','MANUAL_IN','RETURN') then
    select exists(select 1 from public.inventory_movement_lines where movement_id=p_movement_id and quantity_delta<0) into v_invalid;
    if v_invalid then raise exception 'Movimento de entrada não aceita quantidade negativa.'; end if;
  elsif v_movement.movement_type in ('ISSUE','LOSS') then
    select exists(select 1 from public.inventory_movement_lines where movement_id=p_movement_id and quantity_delta>0) into v_invalid;
    if v_invalid then raise exception 'Movimento de saída não aceita quantidade positiva.'; end if;
  elsif v_movement.movement_type='TRANSFER' then
    if not exists(select 1 from public.inventory_movement_lines where movement_id=p_movement_id and quantity_delta<0)
       or not exists(select 1 from public.inventory_movement_lines where movement_id=p_movement_id and quantity_delta>0) then
      raise exception 'Transferência exige saída e entrada.';
    end if;
    if exists(
      select 1 from public.inventory_movement_lines
      where movement_id=p_movement_id
      group by item_id,lot_id,asset_id
      having sum(quantity_delta)<>0
    ) then raise exception 'Transferência precisa conservar a quantidade de cada item, lote e ativo.'; end if;
  elsif v_movement.movement_type='ADJUSTMENT' and length(trim(v_movement.reason))=0 then
    raise exception 'Ajuste exige motivo.';
  elsif v_movement.movement_type='REVERSAL' and v_movement.reversed_movement_id is null then
    raise exception 'Reversão precisa apontar para o movimento original.';
  end if;

  if exists(
    with movement_delta as (
      select
        warehouse_id,location_id,item_id,lot_id,
        sum(quantity_delta)::numeric(18,4) as physical_delta,
        sum(case when reservation_line_id is null and quantity_delta<0 then quantity_delta else 0 end)::numeric(18,4) as unreserved_delta
      from public.inventory_movement_lines
      where movement_id=p_movement_id
      group by warehouse_id,location_id,item_id,lot_id
    )
    select 1
    from movement_delta delta
    join public.inventory_warehouses warehouse on warehouse.id=delta.warehouse_id
    left join public.inventory_available_stock_v stock
      on stock.warehouse_id=delta.warehouse_id
     and stock.location_id is not distinct from delta.location_id
     and stock.item_id=delta.item_id
     and stock.lot_id is not distinct from delta.lot_id
    where delta.physical_delta<0
      and not warehouse.allows_negative_stock
      and (
        coalesce(stock.physical_quantity,0)+delta.physical_delta<0
        or coalesce(stock.available_quantity,0)+delta.unreserved_delta<0
      )
  ) then raise exception 'Movimento produziria saldo negativo ou consumiria quantidade reservada.'; end if;

  if exists(
    select 1
    from public.inventory_movement_lines line
    join public.inventory_items item on item.id=line.item_id
    where line.movement_id=p_movement_id and item.controls_lot and line.lot_id is null
  ) then raise exception 'Item com controle de lote exige lote em todas as linhas.'; end if;

  if exists(
    select 1
    from public.inventory_movement_lines line
    join public.inventory_items item on item.id=line.item_id
    where line.movement_id=p_movement_id
      and item.controls_individual_asset
      and (line.asset_id is null or abs(line.quantity_delta)<>1)
  ) then raise exception 'Item individualizado exige ativo e quantidade unitária.'; end if;

  if exists(
    select 1
    from public.inventory_movement_lines line
    join public.inventory_reservation_lines reservation_line on reservation_line.id=line.reservation_line_id
    where line.movement_id=p_movement_id
      and (line.quantity_delta>=0 or abs(line.quantity_delta)>
        reservation_line.reserved_quantity-reservation_line.consumed_quantity-reservation_line.released_quantity)
  ) then raise exception 'Consumo incompatível com a quantidade restante da reserva.'; end if;

  update public.inventory_movements set
    status='POSTED',posted_by=auth.uid(),posted_at=now(),updated_at=now()
  where id=p_movement_id returning * into v_movement;

  with consumed as (
    select reservation_line_id,sum(abs(quantity_delta))::numeric(18,4) as quantity
    from public.inventory_movement_lines
    where movement_id=p_movement_id and reservation_line_id is not null and quantity_delta<0
    group by reservation_line_id
  )
  update public.inventory_reservation_lines line set
    consumed_quantity=line.consumed_quantity+consumed.quantity,updated_at=now()
  from consumed where line.id=consumed.reservation_line_id;

  update public.inventory_reservations reservation set
    status=case
      when not exists(select 1 from public.inventory_reservation_lines line where line.reservation_id=reservation.id and line.consumed_quantity<line.reserved_quantity-line.released_quantity)
        then 'CONSUMED'::public.inventory_reservation_status
      when exists(select 1 from public.inventory_reservation_lines line where line.reservation_id=reservation.id and line.consumed_quantity>0)
        then 'PARTIALLY_CONSUMED'::public.inventory_reservation_status
      else reservation.status end,
    updated_at=now()
  where reservation.id in (
    select distinct line.reservation_id
    from public.inventory_movement_lines movement_line
    join public.inventory_reservation_lines line on line.id=movement_line.reservation_line_id
    where movement_line.movement_id=p_movement_id
  );

  insert into public.inventory_events(
    organization_id,project_id,movement_id,actor_user_id,event_type,metadata
  ) values(
    v_movement.organization_id,v_movement.project_id,v_movement.id,auth.uid(),'MOVEMENT_POSTED',
    jsonb_build_object('code',v_movement.code,'type',v_movement.movement_type,'lineCount',v_line_count)
  );
  return v_movement;
end $$;

revoke all on function public.inventory_stock_lock_key(uuid,uuid,uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.post_inventory_movement(uuid) from public,anon;
grant execute on function public.post_inventory_movement(uuid) to authenticated;
