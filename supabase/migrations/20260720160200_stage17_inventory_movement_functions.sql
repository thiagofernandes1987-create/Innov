-- Etapa 17 — integridade multi-tenant, imutabilidade e postagem de movimentos.

create or replace function public.validate_inventory_links()
returns trigger language plpgsql set search_path=public as $$
declare
  v_row jsonb:=to_jsonb(new);
  v_org uuid:=nullif(v_row->>'organization_id','')::uuid;
  v_id uuid;
  v_related_org uuid;
  v_related_id uuid;
  v_parent_id uuid;
begin
  if v_org is null then raise exception 'Organização obrigatória.'; end if;

  v_id:=nullif(v_row->>'project_id','')::uuid;
  if v_id is not null then
    select organization_id into v_related_org from public.projects where id=v_id;
    if v_related_org is null or v_related_org<>v_org then raise exception 'Obra incompatível com a organização.'; end if;
  end if;

  if tg_table_name='inventory_categories' then
    v_id:=nullif(v_row->>'parent_id','')::uuid;
    if v_id is not null then
      select organization_id into v_related_org from public.inventory_categories where id=v_id;
      if v_related_org is null or v_related_org<>v_org then raise exception 'Categoria pai incompatível.'; end if;
    end if;
  end if;

  v_id:=nullif(v_row->>'category_id','')::uuid;
  if v_id is not null then
    select organization_id into v_related_org from public.inventory_categories where id=v_id;
    if v_related_org is null or v_related_org<>v_org then raise exception 'Categoria incompatível.'; end if;
  end if;

  v_id:=nullif(v_row->>'unit_id','')::uuid;
  if v_id is not null then
    select organization_id into v_related_org from public.inventory_units where id=v_id;
    if v_related_org is null or v_related_org<>v_org then raise exception 'Unidade incompatível.'; end if;
  end if;

  v_id:=nullif(v_row->>'warehouse_id','')::uuid;
  if v_id is not null then
    select organization_id into v_related_org from public.inventory_warehouses where id=v_id;
    if v_related_org is null or v_related_org<>v_org then raise exception 'Depósito incompatível.'; end if;
  end if;

  v_id:=nullif(v_row->>'location_id','')::uuid;
  if v_id is not null then
    select organization_id,warehouse_id into v_related_org,v_parent_id from public.inventory_locations where id=v_id;
    if v_related_org is null or v_related_org<>v_org then raise exception 'Localização incompatível.'; end if;
    if nullif(v_row->>'warehouse_id','')::uuid is not null and v_parent_id<>nullif(v_row->>'warehouse_id','')::uuid then
      raise exception 'A localização não pertence ao depósito informado.';
    end if;
  end if;

  v_id:=nullif(v_row->>'item_id','')::uuid;
  if v_id is not null then
    select organization_id into v_related_org from public.inventory_items where id=v_id;
    if v_related_org is null or v_related_org<>v_org then raise exception 'Item incompatível.'; end if;
  end if;

  v_id:=nullif(v_row->>'inventory_item_id','')::uuid;
  if v_id is not null then
    select organization_id into v_related_org from public.inventory_items where id=v_id;
    if v_related_org is null or v_related_org<>v_org then raise exception 'Item de estoque incompatível.'; end if;
  end if;

  v_id:=nullif(v_row->>'lot_id','')::uuid;
  if v_id is not null then
    select organization_id,item_id into v_related_org,v_related_id from public.inventory_lots where id=v_id;
    if v_related_org is null or v_related_org<>v_org then raise exception 'Lote incompatível.'; end if;
    if nullif(v_row->>'item_id','')::uuid is not null and v_related_id<>nullif(v_row->>'item_id','')::uuid then
      raise exception 'O lote não pertence ao item informado.';
    end if;
  end if;

  v_id:=nullif(v_row->>'supplier_id','')::uuid;
  if v_id is not null then
    select organization_id into v_related_org from public.procurement_suppliers where id=v_id;
    if v_related_org is null or v_related_org<>v_org then raise exception 'Fornecedor incompatível.'; end if;
  end if;

  v_id:=nullif(v_row->>'order_item_id','')::uuid;
  if v_id is not null then
    select organization_id into v_related_org from public.procurement_order_items where id=v_id;
    if v_related_org is null or v_related_org<>v_org then raise exception 'Item do pedido incompatível.'; end if;
  end if;

  v_id:=nullif(v_row->>'receipt_id','')::uuid;
  if v_id is not null then
    select organization_id into v_related_org from public.procurement_receipts where id=v_id;
    if v_related_org is null or v_related_org<>v_org then raise exception 'Recebimento incompatível.'; end if;
  end if;

  v_id:=nullif(v_row->>'procurement_receipt_item_id','')::uuid;
  if v_id is not null then
    select organization_id into v_related_org from public.procurement_receipt_items where id=v_id;
    if v_related_org is null or v_related_org<>v_org then raise exception 'Linha de recebimento incompatível.'; end if;
  end if;

  v_id:=nullif(v_row->>'movement_id','')::uuid;
  if v_id is not null then
    select organization_id into v_related_org from public.inventory_movements where id=v_id;
    if v_related_org is null or v_related_org<>v_org then raise exception 'Movimento incompatível.'; end if;
  end if;

  v_id:=nullif(v_row->>'reversed_movement_id','')::uuid;
  if v_id is not null then
    select organization_id into v_related_org from public.inventory_movements where id=v_id;
    if v_related_org is null or v_related_org<>v_org then raise exception 'Movimento original incompatível.'; end if;
  end if;

  v_id:=nullif(v_row->>'reservation_id','')::uuid;
  if v_id is not null then
    select organization_id into v_related_org from public.inventory_reservations where id=v_id;
    if v_related_org is null or v_related_org<>v_org then raise exception 'Reserva incompatível.'; end if;
  end if;

  v_id:=nullif(v_row->>'reservation_line_id','')::uuid;
  if v_id is not null then
    select organization_id,item_id into v_related_org,v_related_id from public.inventory_reservation_lines where id=v_id;
    if v_related_org is null or v_related_org<>v_org then raise exception 'Linha de reserva incompatível.'; end if;
    if nullif(v_row->>'item_id','')::uuid is not null and v_related_id<>nullif(v_row->>'item_id','')::uuid then
      raise exception 'A linha de reserva não pertence ao item informado.';
    end if;
  end if;

  v_id:=nullif(v_row->>'asset_id','')::uuid;
  if v_id is not null then
    select organization_id,item_id into v_related_org,v_related_id from public.inventory_assets where id=v_id;
    if v_related_org is null or v_related_org<>v_org then raise exception 'Ativo incompatível.'; end if;
    if nullif(v_row->>'item_id','')::uuid is not null and v_related_id<>nullif(v_row->>'item_id','')::uuid then
      raise exception 'O ativo não pertence ao item informado.';
    end if;
  end if;

  v_id:=nullif(v_row->>'team_id','')::uuid;
  if v_id is not null then
    select organization_id,project_id into v_related_org,v_related_id from public.project_teams where id=v_id;
    if v_related_org is null or v_related_org<>v_org then raise exception 'Equipe incompatível.'; end if;
    if nullif(v_row->>'project_id','')::uuid is not null and v_related_id<>nullif(v_row->>'project_id','')::uuid then
      raise exception 'A equipe não pertence à obra informada.';
    end if;
  end if;

  v_id:=nullif(v_row->>'task_id','')::uuid;
  if v_id is not null then
    select organization_id,project_id into v_related_org,v_related_id from public.project_tasks where id=v_id;
    if v_related_org is null or v_related_org<>v_org then raise exception 'Tarefa incompatível.'; end if;
    if nullif(v_row->>'project_id','')::uuid is not null and v_related_id<>nullif(v_row->>'project_id','')::uuid then
      raise exception 'A tarefa não pertence à obra informada.';
    end if;
  end if;

  v_id:=nullif(v_row->>'stocktake_id','')::uuid;
  if v_id is not null then
    select organization_id into v_related_org from public.inventory_stocktakes where id=v_id;
    if v_related_org is null or v_related_org<>v_org then raise exception 'Inventário físico incompatível.'; end if;
  end if;

  if tg_table_name='inventory_movement_lines' then
    select warehouse_id into v_parent_id from public.inventory_locations where id=nullif(v_row->>'location_id','')::uuid;
    if v_parent_id is not null and v_parent_id<>nullif(v_row->>'warehouse_id','')::uuid then
      raise exception 'Localização e depósito da linha são incompatíveis.';
    end if;
  elsif tg_table_name='inventory_receipt_imports' then
    select warehouse_id into v_parent_id from public.inventory_locations where id=nullif(v_row->>'location_id','')::uuid;
    if v_parent_id is not null and v_parent_id<>nullif(v_row->>'warehouse_id','')::uuid then
      raise exception 'Localização de importação incompatível com o depósito.';
    end if;
  elsif tg_table_name='inventory_reservation_lines' then
    select warehouse_id into v_parent_id from public.inventory_reservations where id=nullif(v_row->>'reservation_id','')::uuid;
    if nullif(v_row->>'location_id','')::uuid is not null and not exists(
      select 1 from public.inventory_locations where id=nullif(v_row->>'location_id','')::uuid and warehouse_id=v_parent_id
    ) then raise exception 'Localização da reserva incompatível com o depósito.'; end if;
  elsif tg_table_name='inventory_stocktake_lines' then
    select warehouse_id into v_parent_id from public.inventory_stocktakes where id=nullif(v_row->>'stocktake_id','')::uuid;
    if nullif(v_row->>'location_id','')::uuid is not null and not exists(
      select 1 from public.inventory_locations where id=nullif(v_row->>'location_id','')::uuid and warehouse_id=v_parent_id
    ) then raise exception 'Localização da contagem incompatível com o depósito.'; end if;
  end if;

  return new;
end $$;

create or replace function public.protect_inventory_movement()
returns trigger language plpgsql set search_path=public as $$
begin
  if tg_op='DELETE' then
    if old.status<>'DRAFT' then raise exception 'Movimento processado não pode ser excluído.'; end if;
    return old;
  end if;
  if old.status='POSTED' then
    if new.status<>'REVERSED' then raise exception 'Movimento postado é imutável.'; end if;
    if (to_jsonb(new)-array['status','reversed_by','reversed_at','updated_at']) <>
       (to_jsonb(old)-array['status','reversed_by','reversed_at','updated_at']) then
      raise exception 'Somente a marcação de reversão pode alterar um movimento postado.';
    end if;
  elsif old.status in ('REVERSED','CANCELED') then
    raise exception 'Movimento encerrado é imutável.';
  end if;
  return new;
end $$;

create or replace function public.protect_inventory_movement_line()
returns trigger language plpgsql set search_path=public as $$
declare v_status public.inventory_movement_status;v_movement_id uuid;
begin
  v_movement_id:=case when tg_op='DELETE' then old.movement_id else new.movement_id end;
  select status into v_status from public.inventory_movements where id=v_movement_id;
  if v_status<>'DRAFT' then raise exception 'Linhas de movimento processado são imutáveis.'; end if;
  return case when tg_op='DELETE' then old else new end;
end $$;

create or replace function public.protect_inventory_receipt_import()
returns trigger language plpgsql set search_path=public as $$
begin
  if tg_op<>'INSERT' then raise exception 'Importação de recebimento é imutável.'; end if;
  return new;
end $$;

create or replace function public.post_inventory_movement(p_movement_id uuid)
returns public.inventory_movements
language plpgsql security definer set search_path=public as $$
declare
  v_movement public.inventory_movements;
  v_line_count integer;
  v_invalid boolean;
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
      select warehouse_id,location_id,item_id,lot_id,sum(quantity_delta)::numeric(18,4) as delta
      from public.inventory_movement_lines
      where movement_id=p_movement_id
      group by warehouse_id,location_id,item_id,lot_id
    )
    select 1
    from movement_delta delta
    join public.inventory_warehouses warehouse on warehouse.id=delta.warehouse_id
    left join public.inventory_stock_v stock
      on stock.warehouse_id=delta.warehouse_id
     and stock.location_id is not distinct from delta.location_id
     and stock.item_id=delta.item_id
     and stock.lot_id is not distinct from delta.lot_id
    where delta.delta<0
      and not warehouse.allows_negative_stock
      and coalesce(stock.physical_quantity,0)+delta.delta<0
  ) then raise exception 'Movimento produziria saldo negativo.'; end if;

  if exists(
    select 1
    from public.inventory_movement_lines line
    join public.inventory_items item on item.id=line.item_id
    where line.movement_id=p_movement_id
      and item.controls_lot
      and line.lot_id is null
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

create or replace function public.reverse_inventory_movement(p_movement_id uuid,p_reason text)
returns public.inventory_movements
language plpgsql security definer set search_path=public as $$
declare
  v_original public.inventory_movements;
  v_reversal public.inventory_movements;
  v_code text;
begin
  select * into v_original from public.inventory_movements where id=p_movement_id for update;
  if not found then raise exception 'Movimento original não encontrado.'; end if;
  if not public.has_module_permission(v_original.organization_id,'estoque','READ',v_original.project_id,'administer') then
    raise exception 'Permissão insuficiente para reverter movimento.';
  end if;
  if v_original.status='REVERSED' then
    select * into v_reversal from public.inventory_movements where reversed_movement_id=v_original.id;
    return v_reversal;
  end if;
  if v_original.status<>'POSTED' then raise exception 'Somente movimento postado pode ser revertido.'; end if;
  if length(trim(coalesce(p_reason,'')))=0 then raise exception 'Reversão exige motivo.'; end if;

  v_code:='REV-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  insert into public.inventory_movements(
    organization_id,project_id,code,movement_type,status,occurred_at,reason,source_type,source_id,idempotency_key,reversed_movement_id,created_by
  ) values(
    v_original.organization_id,v_original.project_id,v_code,'REVERSAL','DRAFT',now(),trim(p_reason),
    'INVENTORY_MOVEMENT',v_original.id,'inventory-reversal:'||v_original.id,v_original.id,auth.uid()
  ) returning * into v_reversal;

  insert into public.inventory_movement_lines(
    organization_id,movement_id,line_number,warehouse_id,location_id,item_id,lot_id,asset_id,
    procurement_receipt_item_id,quantity_delta,unit_cost,notes
  )
  select organization_id,v_reversal.id,line_number,warehouse_id,location_id,item_id,lot_id,asset_id,
    procurement_receipt_item_id,-quantity_delta,unit_cost,'Reversão de '||v_original.code
  from public.inventory_movement_lines where movement_id=v_original.id order by line_number;

  v_reversal:=public.post_inventory_movement(v_reversal.id);

  with original_consumption as (
    select reservation_line_id,sum(abs(quantity_delta))::numeric(18,4) as quantity
    from public.inventory_movement_lines
    where movement_id=v_original.id and reservation_line_id is not null and quantity_delta<0
    group by reservation_line_id
  )
  update public.inventory_reservation_lines line set
    consumed_quantity=greatest(0,line.consumed_quantity-original_consumption.quantity),updated_at=now()
  from original_consumption where line.id=original_consumption.reservation_line_id;

  update public.inventory_movements set status='REVERSED',reversed_by=auth.uid(),reversed_at=now(),updated_at=now()
  where id=v_original.id;

  insert into public.inventory_events(organization_id,project_id,movement_id,actor_user_id,event_type,metadata)
  values(v_original.organization_id,v_original.project_id,v_original.id,auth.uid(),'MOVEMENT_REVERSED',
    jsonb_build_object('reversalMovementId',v_reversal.id,'reason',trim(p_reason)));
  return v_reversal;
end $$;

-- Integridade multi-tenant em todas as tabelas do domínio.
do $$
declare v_table text;
begin
  foreach v_table in array array[
    'inventory_categories','inventory_units','inventory_items','inventory_warehouses','inventory_locations','inventory_lots',
    'inventory_procurement_item_mappings','inventory_movements','inventory_movement_lines','inventory_receipt_imports',
    'inventory_reservations','inventory_reservation_lines','inventory_assets','inventory_asset_custodies',
    'inventory_asset_maintenance','inventory_stocktakes','inventory_stocktake_lines','inventory_events'
  ] loop
    execute format('drop trigger if exists %I_validate_links on public.%I',v_table,v_table);
    execute format('create trigger %I_validate_links before insert or update on public.%I for each row execute function public.validate_inventory_links()',v_table,v_table);
  end loop;
end $$;

drop trigger if exists inventory_movements_protect on public.inventory_movements;
create trigger inventory_movements_protect before update or delete on public.inventory_movements
for each row execute function public.protect_inventory_movement();

drop trigger if exists inventory_movement_lines_protect on public.inventory_movement_lines;
create trigger inventory_movement_lines_protect before insert or update or delete on public.inventory_movement_lines
for each row execute function public.protect_inventory_movement_line();

drop trigger if exists inventory_receipt_imports_protect on public.inventory_receipt_imports;
create trigger inventory_receipt_imports_protect before update or delete on public.inventory_receipt_imports
for each row execute function public.protect_inventory_receipt_import();

revoke all on function public.validate_inventory_links() from public,anon,authenticated;
revoke all on function public.protect_inventory_movement() from public,anon,authenticated;
revoke all on function public.protect_inventory_movement_line() from public,anon,authenticated;
revoke all on function public.protect_inventory_receipt_import() from public,anon,authenticated;
revoke all on function public.post_inventory_movement(uuid) from public,anon;
revoke all on function public.reverse_inventory_movement(uuid,text) from public,anon;
grant execute on function public.post_inventory_movement(uuid) to authenticated;
grant execute on function public.reverse_inventory_movement(uuid,text) to authenticated;
