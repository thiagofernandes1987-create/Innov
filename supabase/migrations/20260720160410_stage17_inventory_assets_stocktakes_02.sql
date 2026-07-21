-- Etapa 17 — ativos individualizados e inventário físico (parte 2).

create or replace function public.return_inventory_asset(
  p_custody_id uuid,
  p_warehouse_id uuid,
  p_location_id uuid default null,
  p_condition text default '',
  p_notes text default ''
) returns public.inventory_asset_custodies
language plpgsql security definer set search_path=public as $$
declare
  v_custody public.inventory_asset_custodies;
  v_asset public.inventory_assets;
  v_item public.inventory_items;
  v_movement public.inventory_movements;
  v_cost numeric(18,4);
  v_code text;
begin
  select * into v_custody from public.inventory_asset_custodies where id=p_custody_id for update;
  if not found then raise exception 'Custódia não encontrada.'; end if;
  select * into v_asset from public.inventory_assets where id=v_custody.asset_id for update;
  if not public.has_module_permission(v_custody.organization_id,'estoque','EDIT',v_custody.project_id,null) then
    raise exception 'Permissão insuficiente para devolver ativo.';
  end if;
  if v_custody.status='RETURNED' then return v_custody; end if;
  if v_custody.status<>'ACTIVE' then raise exception 'Custódia não está ativa.'; end if;
  if not exists(select 1 from public.inventory_warehouses where id=p_warehouse_id and organization_id=v_custody.organization_id and active) then
    raise exception 'Depósito de devolução inválido.';
  end if;
  if p_location_id is not null and not exists(select 1 from public.inventory_locations where id=p_location_id and warehouse_id=p_warehouse_id and active) then
    raise exception 'Localização de devolução inválida.';
  end if;
  select * into v_item from public.inventory_items where id=v_asset.item_id;
  select coalesce(
    (select unit_cost from public.inventory_movement_lines line
      join public.inventory_movements movement on movement.id=line.movement_id
      where line.asset_id=v_asset.id and line.quantity_delta<0 and movement.status='POSTED'
      order by movement.posted_at desc limit 1),
    v_item.reference_unit_cost,v_asset.acquisition_cost,0
  ) into v_cost;

  v_code:='ATV-RET-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  insert into public.inventory_movements(
    organization_id,project_id,code,movement_type,status,occurred_at,reason,source_type,source_id,idempotency_key,created_by
  ) values(
    v_custody.organization_id,v_custody.project_id,v_code,'RETURN','DRAFT',now(),'Devolução de ativo individualizado',
    'INVENTORY_ASSET_CUSTODY',v_custody.id,'asset-return:'||v_custody.id,auth.uid()
  ) returning * into v_movement;
  insert into public.inventory_movement_lines(
    organization_id,movement_id,line_number,warehouse_id,location_id,item_id,lot_id,asset_id,quantity_delta,unit_cost,notes
  ) values(
    v_custody.organization_id,v_movement.id,1,p_warehouse_id,p_location_id,v_asset.item_id,v_asset.lot_id,v_asset.id,1,v_cost,coalesce(p_notes,'')
  );
  v_movement:=public.post_inventory_movement(v_movement.id);

  update public.inventory_asset_custodies set
    status='RETURNED',returned_at=now(),returned_condition=coalesce(p_condition,''),
    notes=concat_ws(E'\n',nullif(notes,''),nullif(p_notes,'')),returned_by=auth.uid(),updated_at=now()
  where id=v_custody.id returning * into v_custody;
  update public.inventory_assets set
    warehouse_id=p_warehouse_id,location_id=p_location_id,project_id=null,status='AVAILABLE',
    condition_notes=coalesce(p_condition,''),updated_at=now()
  where id=v_asset.id;

  insert into public.inventory_events(organization_id,project_id,warehouse_id,asset_id,movement_id,actor_user_id,event_type,metadata)
  values(v_custody.organization_id,v_custody.project_id,p_warehouse_id,v_asset.id,v_movement.id,auth.uid(),'ASSET_RETURNED',
    jsonb_build_object('custodyId',v_custody.id,'condition',p_condition));
  return v_custody;
end $$;

create or replace function public.start_inventory_stocktake(
  p_organization_id uuid,
  p_warehouse_id uuid,
  p_name text,
  p_notes text default ''
) returns public.inventory_stocktakes
language plpgsql security definer set search_path=public as $$
declare
  v_stocktake public.inventory_stocktakes;
  v_project_id uuid;
  v_code text;
begin
  select project_id into v_project_id from public.inventory_warehouses
  where id=p_warehouse_id and organization_id=p_organization_id and active;
  if not found then raise exception 'Depósito não encontrado.'; end if;
  if not public.has_module_permission(p_organization_id,'estoque','READ',v_project_id,'administer') then
    raise exception 'Permissão insuficiente para iniciar inventário.';
  end if;
  if length(trim(coalesce(p_name,'')))=0 then raise exception 'Nome do inventário obrigatório.'; end if;
  if exists(select 1 from public.inventory_stocktakes where warehouse_id=p_warehouse_id and status in ('COUNTING','UNDER_REVIEW','APPROVED')) then
    raise exception 'Já existe inventário ativo neste depósito.';
  end if;

  v_code:='INV-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  insert into public.inventory_stocktakes(
    organization_id,warehouse_id,code,name,status,cutoff_at,notes,started_by,started_at
  ) values(
    p_organization_id,p_warehouse_id,v_code,trim(p_name),'COUNTING',now(),coalesce(p_notes,''),auth.uid(),now()
  ) returning * into v_stocktake;

  insert into public.inventory_stocktake_lines(
    organization_id,stocktake_id,line_number,item_id,location_id,lot_id,expected_quantity
  )
  select p_organization_id,v_stocktake.id,row_number() over(order by item_id,location_id,lot_id)::integer,
    item_id,location_id,lot_id,physical_quantity
  from public.inventory_stock_v
  where organization_id=p_organization_id and warehouse_id=p_warehouse_id and physical_quantity<>0;

  insert into public.inventory_events(organization_id,project_id,warehouse_id,stocktake_id,actor_user_id,event_type,metadata)
  values(p_organization_id,v_project_id,p_warehouse_id,v_stocktake.id,auth.uid(),'STOCKTAKE_STARTED',
    jsonb_build_object('code',v_code,'cutoffAt',v_stocktake.cutoff_at));
  return v_stocktake;
end $$;
