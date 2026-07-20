-- Etapa 17 — inventário físico (parte 3).

create or replace function public.submit_inventory_stocktake(p_stocktake_id uuid,p_counts jsonb)
returns public.inventory_stocktakes
language plpgsql security definer set search_path=public as $$
declare
  v_stocktake public.inventory_stocktakes;
  v_project_id uuid;
begin
  select * into v_stocktake from public.inventory_stocktakes where id=p_stocktake_id for update;
  if not found then raise exception 'Inventário não encontrado.'; end if;
  select project_id into v_project_id from public.inventory_warehouses where id=v_stocktake.warehouse_id;
  if not public.has_module_permission(v_stocktake.organization_id,'estoque','EDIT',v_project_id,null) then
    raise exception 'Permissão insuficiente para submeter inventário.';
  end if;
  if v_stocktake.status<>'COUNTING' then raise exception 'Inventário não está em contagem.'; end if;
  if jsonb_typeof(p_counts)<>'array' then raise exception 'Contagens inválidas.'; end if;

  update public.inventory_stocktake_lines line set
    counted_quantity=(input->>'countedQuantity')::numeric,
    recount_quantity=nullif(input->>'recountQuantity','')::numeric,
    count_notes=coalesce(input->>'notes',''),
    counted_by=auth.uid(),counted_at=now(),
    recounted_by=case when nullif(input->>'recountQuantity','') is null then null else auth.uid() end,
    recounted_at=case when nullif(input->>'recountQuantity','') is null then null else now() end,
    updated_at=now()
  from jsonb_array_elements(p_counts) input
  where line.id=(input->>'lineId')::uuid and line.stocktake_id=p_stocktake_id;

  if exists(select 1 from public.inventory_stocktake_lines where stocktake_id=p_stocktake_id and counted_quantity is null) then
    raise exception 'Todas as linhas precisam ser contadas.';
  end if;
  update public.inventory_stocktakes set status='UNDER_REVIEW',submitted_by=auth.uid(),submitted_at=now(),updated_at=now()
  where id=p_stocktake_id returning * into v_stocktake;
  insert into public.inventory_events(organization_id,project_id,warehouse_id,stocktake_id,actor_user_id,event_type,metadata)
  values(v_stocktake.organization_id,v_project_id,v_stocktake.warehouse_id,v_stocktake.id,auth.uid(),'STOCKTAKE_SUBMITTED',
    jsonb_build_object('lines',(select count(*) from public.inventory_stocktake_lines where stocktake_id=p_stocktake_id),
      'differences',(select count(*) from public.inventory_stocktake_lines where stocktake_id=p_stocktake_id and difference_quantity<>0)));
  return v_stocktake;
end $$;

create or replace function public.approve_inventory_stocktake(p_stocktake_id uuid,p_comment text default '')
returns public.inventory_stocktakes
language plpgsql security definer set search_path=public as $$
declare v_stocktake public.inventory_stocktakes;v_project_id uuid;
begin
  select * into v_stocktake from public.inventory_stocktakes where id=p_stocktake_id for update;
  if not found then raise exception 'Inventário não encontrado.'; end if;
  select project_id into v_project_id from public.inventory_warehouses where id=v_stocktake.warehouse_id;
  if not public.has_module_permission(v_stocktake.organization_id,'estoque','READ',v_project_id,'approve') then
    raise exception 'Permissão insuficiente para aprovar inventário.';
  end if;
  if v_stocktake.status='APPROVED' then return v_stocktake; end if;
  if v_stocktake.status<>'UNDER_REVIEW' then raise exception 'Inventário não está em revisão.'; end if;
  update public.inventory_stocktakes set
    status='APPROVED',approved_by=auth.uid(),approved_at=now(),
    notes=concat_ws(E'\n',nullif(notes,''),nullif(trim(coalesce(p_comment,'')),'')),updated_at=now()
  where id=p_stocktake_id returning * into v_stocktake;
  insert into public.inventory_events(organization_id,project_id,warehouse_id,stocktake_id,actor_user_id,event_type,metadata)
  values(v_stocktake.organization_id,v_project_id,v_stocktake.warehouse_id,v_stocktake.id,auth.uid(),'STOCKTAKE_APPROVED',
    jsonb_build_object('comment',coalesce(p_comment,'')));
  return v_stocktake;
end $$;

create or replace function public.post_inventory_stocktake_adjustment(p_stocktake_id uuid)
returns public.inventory_stocktakes
language plpgsql security definer set search_path=public as $$
declare
  v_stocktake public.inventory_stocktakes;
  v_project_id uuid;
  v_movement public.inventory_movements;
  v_code text;
  v_difference_count integer;
begin
  select * into v_stocktake from public.inventory_stocktakes where id=p_stocktake_id for update;
  if not found then raise exception 'Inventário não encontrado.'; end if;
  select project_id into v_project_id from public.inventory_warehouses where id=v_stocktake.warehouse_id;
  if not public.has_module_permission(v_stocktake.organization_id,'estoque','READ',v_project_id,'administer') then
    raise exception 'Permissão insuficiente para contabilizar inventário.';
  end if;
  if v_stocktake.status='POSTED' then return v_stocktake; end if;
  if v_stocktake.status<>'APPROVED' then raise exception 'Inventário precisa estar aprovado.'; end if;
  select count(*) into v_difference_count from public.inventory_stocktake_lines
  where stocktake_id=p_stocktake_id and difference_quantity<>0;

  if v_difference_count>0 then
    v_code:='AJI-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
    insert into public.inventory_movements(
      organization_id,project_id,code,movement_type,status,occurred_at,reason,source_type,source_id,idempotency_key,created_by
    ) values(
      v_stocktake.organization_id,v_project_id,v_code,'ADJUSTMENT','DRAFT',now(),'Ajuste do inventário '||v_stocktake.code,
      'INVENTORY_STOCKTAKE',v_stocktake.id,'stocktake-adjustment:'||v_stocktake.id,auth.uid()
    ) returning * into v_movement;

    insert into public.inventory_movement_lines(
      organization_id,movement_id,line_number,warehouse_id,location_id,item_id,lot_id,quantity_delta,unit_cost,notes
    )
    select
      v_stocktake.organization_id,v_movement.id,row_number() over(order by line.line_number)::integer,
      v_stocktake.warehouse_id,line.location_id,line.item_id,line.lot_id,line.difference_quantity,
      coalesce(stock.average_unit_cost,item.reference_unit_cost,0),'Ajuste pela contagem física'
    from public.inventory_stocktake_lines line
    join public.inventory_items item on item.id=line.item_id
    left join public.inventory_stock_v stock
      on stock.warehouse_id=v_stocktake.warehouse_id
     and stock.location_id is not distinct from line.location_id
     and stock.item_id=line.item_id
     and stock.lot_id is not distinct from line.lot_id
    where line.stocktake_id=p_stocktake_id and line.difference_quantity<>0;
    v_movement:=public.post_inventory_movement(v_movement.id);
  end if;

  update public.inventory_stocktakes set
    status='POSTED',posted_by=auth.uid(),posted_at=now(),adjustment_movement_id=v_movement.id,updated_at=now()
  where id=p_stocktake_id returning * into v_stocktake;
  insert into public.inventory_events(organization_id,project_id,warehouse_id,movement_id,stocktake_id,actor_user_id,event_type,metadata)
  values(v_stocktake.organization_id,v_project_id,v_stocktake.warehouse_id,v_movement.id,v_stocktake.id,auth.uid(),'STOCKTAKE_POSTED',
    jsonb_build_object('differenceLines',v_difference_count,'adjustmentMovementId',v_movement.id));
  return v_stocktake;
end $$;

drop trigger if exists inventory_asset_custodies_protect on public.inventory_asset_custodies;

create trigger inventory_asset_custodies_protect before update or delete on public.inventory_asset_custodies
for each row execute function public.protect_inventory_asset_custody();

drop trigger if exists inventory_stocktakes_protect on public.inventory_stocktakes;

create trigger inventory_stocktakes_protect before update or delete on public.inventory_stocktakes
for each row execute function public.protect_inventory_stocktake();

drop trigger if exists inventory_stocktake_lines_protect on public.inventory_stocktake_lines;
