-- Etapa 17 — inclusão controlada de itens encontrados durante a contagem.

create or replace function public.add_inventory_stocktake_line(
  p_stocktake_id uuid,
  p_item_id uuid,
  p_location_id uuid default null,
  p_lot_id uuid default null,
  p_notes text default ''
) returns public.inventory_stocktake_lines
language plpgsql security definer set search_path=public as $$
declare
  v_stocktake public.inventory_stocktakes;
  v_project_id uuid;
  v_line public.inventory_stocktake_lines;
  v_line_number integer;
begin
  select * into v_stocktake from public.inventory_stocktakes where id=p_stocktake_id for update;
  if not found then raise exception 'Inventário não encontrado.'; end if;
  select project_id into v_project_id from public.inventory_warehouses where id=v_stocktake.warehouse_id;
  if not public.has_module_permission(v_stocktake.organization_id,'estoque','EDIT',v_project_id,null) then
    raise exception 'Permissão insuficiente para incluir item na contagem.';
  end if;
  if v_stocktake.status<>'COUNTING' then raise exception 'Itens só podem ser incluídos durante a contagem.'; end if;
  if not exists(select 1 from public.inventory_items where id=p_item_id and organization_id=v_stocktake.organization_id and active) then
    raise exception 'Item inválido.';
  end if;
  if p_location_id is not null and not exists(
    select 1 from public.inventory_locations
    where id=p_location_id and warehouse_id=v_stocktake.warehouse_id and organization_id=v_stocktake.organization_id and active
  ) then raise exception 'Localização inválida.'; end if;
  if p_lot_id is not null and not exists(
    select 1 from public.inventory_lots
    where id=p_lot_id and item_id=p_item_id and organization_id=v_stocktake.organization_id and active
  ) then raise exception 'Lote inválido.'; end if;
  if exists(
    select 1 from public.inventory_stocktake_lines
    where stocktake_id=p_stocktake_id and item_id=p_item_id
      and location_id is not distinct from p_location_id and lot_id is not distinct from p_lot_id
  ) then raise exception 'Item, localização e lote já estão na contagem.'; end if;

  select coalesce(max(line_number),0)+1 into v_line_number
  from public.inventory_stocktake_lines where stocktake_id=p_stocktake_id;
  insert into public.inventory_stocktake_lines(
    organization_id,stocktake_id,line_number,item_id,location_id,lot_id,expected_quantity,count_notes
  ) values(
    v_stocktake.organization_id,p_stocktake_id,v_line_number,p_item_id,p_location_id,p_lot_id,0,coalesce(p_notes,'')
  ) returning * into v_line;

  insert into public.inventory_events(organization_id,project_id,warehouse_id,item_id,stocktake_id,actor_user_id,event_type,metadata)
  values(v_stocktake.organization_id,v_project_id,v_stocktake.warehouse_id,p_item_id,p_stocktake_id,auth.uid(),
    'STOCKTAKE_FOUND_ITEM_ADDED',jsonb_build_object('lineId',v_line.id,'locationId',p_location_id,'lotId',p_lot_id));
  return v_line;
end $$;

revoke all on function public.add_inventory_stocktake_line(uuid,uuid,uuid,uuid,text) from public,anon;
grant execute on function public.add_inventory_stocktake_line(uuid,uuid,uuid,uuid,text) to authenticated;
