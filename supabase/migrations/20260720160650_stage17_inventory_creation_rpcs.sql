-- Etapa 17 — criação transacional de itens, depósitos, movimentos e ativos.

create or replace function public.create_inventory_item(
  p_organization_id uuid,
  p_category_id uuid,
  p_unit_id uuid,
  p_code text,
  p_name text,
  p_kind public.inventory_item_kind default 'MATERIAL',
  p_description text default '',
  p_specification text default '',
  p_sku text default null,
  p_barcode text default null,
  p_minimum_stock numeric default 0,
  p_reference_unit_cost numeric default null,
  p_controls_lot boolean default false,
  p_controls_expiry boolean default false,
  p_controls_individual_asset boolean default false
) returns public.inventory_items
language plpgsql security definer set search_path=public as $$
declare v_item public.inventory_items;
begin
  if not public.has_module_permission(p_organization_id,'estoque','EDIT',null,null) then
    raise exception 'Permissão insuficiente para cadastrar item.';
  end if;
  if length(trim(coalesce(p_code,'')))=0 or length(trim(coalesce(p_name,'')))=0 then
    raise exception 'Código e nome são obrigatórios.';
  end if;
  if not exists(select 1 from public.inventory_units where id=p_unit_id and organization_id=p_organization_id and active) then
    raise exception 'Unidade inválida.';
  end if;
  if p_category_id is not null and not exists(
    select 1 from public.inventory_categories where id=p_category_id and organization_id=p_organization_id and active
  ) then raise exception 'Categoria inválida.'; end if;

  insert into public.inventory_items(
    organization_id,category_id,unit_id,code,sku,barcode,name,description,specification,kind,
    minimum_stock,reference_unit_cost,controls_lot,controls_expiry,controls_individual_asset,created_by
  ) values(
    p_organization_id,p_category_id,p_unit_id,upper(trim(p_code)),nullif(trim(coalesce(p_sku,'')),''),
    nullif(trim(coalesce(p_barcode,'')),''),trim(p_name),coalesce(p_description,''),coalesce(p_specification,''),p_kind,
    greatest(coalesce(p_minimum_stock,0),0),p_reference_unit_cost,coalesce(p_controls_lot,false),
    coalesce(p_controls_expiry,false),coalesce(p_controls_individual_asset,false),auth.uid()
  ) returning * into v_item;

  insert into public.inventory_events(organization_id,item_id,actor_user_id,event_type,metadata)
  values(p_organization_id,v_item.id,auth.uid(),'ITEM_CREATED',jsonb_build_object('code',v_item.code,'kind',v_item.kind));
  return v_item;
end $$;

create or replace function public.create_inventory_warehouse(
  p_organization_id uuid,
  p_project_id uuid,
  p_code text,
  p_name text,
  p_kind public.inventory_warehouse_kind default 'GENERAL',
  p_address text default '',
  p_responsible_user_id uuid default null,
  p_default_location_code text default 'PADRAO',
  p_default_location_name text default 'Localização padrão'
) returns public.inventory_warehouses
language plpgsql security definer set search_path=public as $$
declare v_warehouse public.inventory_warehouses;
begin
  if not public.has_module_permission(p_organization_id,'estoque','EDIT',p_project_id,null) then
    raise exception 'Permissão insuficiente para cadastrar depósito.';
  end if;
  if p_kind='PROJECT' and p_project_id is null then raise exception 'Depósito de obra exige obra.'; end if;
  if p_project_id is not null and not exists(
    select 1 from public.projects where id=p_project_id and organization_id=p_organization_id and archived_at is null
  ) then raise exception 'Obra inválida.'; end if;
  if length(trim(coalesce(p_code,'')))=0 or length(trim(coalesce(p_name,'')))=0 then
    raise exception 'Código e nome são obrigatórios.';
  end if;

  insert into public.inventory_warehouses(
    organization_id,project_id,code,name,kind,address,responsible_user_id,allows_negative_stock,created_by
  ) values(
    p_organization_id,p_project_id,upper(trim(p_code)),trim(p_name),p_kind,coalesce(p_address,''),
    p_responsible_user_id,false,auth.uid()
  ) returning * into v_warehouse;

  insert into public.inventory_locations(
    organization_id,warehouse_id,code,name,is_default,created_by
  ) values(
    p_organization_id,v_warehouse.id,upper(trim(coalesce(nullif(p_default_location_code,''),'PADRAO'))),
    trim(coalesce(nullif(p_default_location_name,''),'Localização padrão')),true,auth.uid()
  );

  insert into public.inventory_events(organization_id,project_id,warehouse_id,actor_user_id,event_type,metadata)
  values(p_organization_id,p_project_id,v_warehouse.id,auth.uid(),'WAREHOUSE_CREATED',
    jsonb_build_object('code',v_warehouse.code,'kind',v_warehouse.kind));
  return v_warehouse;
end $$;

create or replace function public.create_inventory_movement(
  p_organization_id uuid,
  p_project_id uuid,
  p_movement_type public.inventory_movement_type,
  p_occurred_at timestamptz,
  p_reason text,
  p_notes text,
  p_lines jsonb,
  p_idempotency_key text default null,
  p_post boolean default false
) returns public.inventory_movements
language plpgsql security definer set search_path=public as $$
declare
  v_movement public.inventory_movements;
  v_code text;
begin
  if not public.has_module_permission(p_organization_id,'estoque','EDIT',p_project_id,null) then
    raise exception 'Permissão insuficiente para criar movimento.';
  end if;
  if p_project_id is not null and not exists(
    select 1 from public.projects where id=p_project_id and organization_id=p_organization_id and archived_at is null
  ) then raise exception 'Obra inválida.'; end if;
  if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)=0 then raise exception 'Movimento precisa de linhas.'; end if;

  if p_idempotency_key is not null then
    select * into v_movement from public.inventory_movements
    where organization_id=p_organization_id and idempotency_key=p_idempotency_key;
    if found then return v_movement; end if;
  end if;

  if exists(
    select 1 from jsonb_array_elements(p_lines) input
    where nullif(input->>'warehouseId','') is null
       or nullif(input->>'itemId','') is null
       or coalesce((input->>'quantityDelta')::numeric,0)=0
       or nullif(input->>'unitCost','') is null
  ) then raise exception 'Cada linha exige depósito, item, quantidade diferente de zero e custo unitário.'; end if;

  v_code:='MOV-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  insert into public.inventory_movements(
    organization_id,project_id,code,movement_type,status,occurred_at,reason,notes,idempotency_key,created_by
  ) values(
    p_organization_id,p_project_id,v_code,p_movement_type,'DRAFT',coalesce(p_occurred_at,now()),
    coalesce(p_reason,''),coalesce(p_notes,''),nullif(trim(coalesce(p_idempotency_key,'')),''),auth.uid()
  ) returning * into v_movement;

  insert into public.inventory_movement_lines(
    organization_id,movement_id,line_number,warehouse_id,location_id,item_id,lot_id,asset_id,
    reservation_line_id,procurement_receipt_item_id,quantity_delta,unit_cost,notes
  )
  select
    p_organization_id,v_movement.id,row_number() over()::integer,
    (input->>'warehouseId')::uuid,nullif(input->>'locationId','')::uuid,(input->>'itemId')::uuid,
    nullif(input->>'lotId','')::uuid,nullif(input->>'assetId','')::uuid,
    nullif(input->>'reservationLineId','')::uuid,nullif(input->>'procurementReceiptItemId','')::uuid,
    (input->>'quantityDelta')::numeric,(input->>'unitCost')::numeric,coalesce(input->>'notes','')
  from jsonb_array_elements(p_lines) input;

  if p_post then v_movement:=public.post_inventory_movement(v_movement.id); end if;
  return v_movement;
end $$;

create or replace function public.create_inventory_asset(
  p_organization_id uuid,
  p_item_id uuid,
  p_warehouse_id uuid,
  p_location_id uuid,
  p_lot_id uuid,
  p_patrimony_code text,
  p_serial_number text,
  p_acquired_on date,
  p_acquisition_cost numeric,
  p_condition text default ''
) returns public.inventory_assets
language plpgsql security definer set search_path=public as $$
declare
  v_item public.inventory_items;
  v_asset public.inventory_assets;
  v_movement public.inventory_movements;
  v_code text;
  v_project_id uuid;
begin
  select * into v_item from public.inventory_items
  where id=p_item_id and organization_id=p_organization_id and active;
  if not found then raise exception 'Item não encontrado.'; end if;
  select project_id into v_project_id from public.inventory_warehouses
  where id=p_warehouse_id and organization_id=p_organization_id and active;
  if not found then raise exception 'Depósito inválido.'; end if;
  if not public.has_module_permission(p_organization_id,'estoque','EDIT',v_project_id,null) then
    raise exception 'Permissão insuficiente para cadastrar ativo.';
  end if;
  if not v_item.controls_individual_asset or v_item.kind not in ('TOOL','ASSET') then
    raise exception 'Item não está configurado para controle individual.';
  end if;
  if p_location_id is not null and not exists(
    select 1 from public.inventory_locations where id=p_location_id and warehouse_id=p_warehouse_id and active
  ) then raise exception 'Localização inválida.'; end if;
  if p_lot_id is not null and not exists(
    select 1 from public.inventory_lots where id=p_lot_id and item_id=p_item_id and active
  ) then raise exception 'Lote inválido.'; end if;
  if length(trim(coalesce(p_patrimony_code,'')))=0 and length(trim(coalesce(p_serial_number,'')))=0 then
    raise exception 'Informe patrimônio ou número de série.';
  end if;

  insert into public.inventory_assets(
    organization_id,item_id,warehouse_id,location_id,project_id,lot_id,patrimony_code,serial_number,
    status,acquired_on,acquisition_cost,condition_notes,created_by
  ) values(
    p_organization_id,p_item_id,p_warehouse_id,p_location_id,v_project_id,p_lot_id,
    nullif(trim(coalesce(p_patrimony_code,'')),''),nullif(trim(coalesce(p_serial_number,'')),''),
    'AVAILABLE',p_acquired_on,p_acquisition_cost,coalesce(p_condition,''),auth.uid()
  ) returning * into v_asset;

  v_code:='ATV-ENT-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  insert into public.inventory_movements(
    organization_id,project_id,code,movement_type,status,occurred_at,reason,source_type,source_id,idempotency_key,created_by
  ) values(
    p_organization_id,v_project_id,v_code,'MANUAL_IN','DRAFT',coalesce(p_acquired_on::timestamptz,now()),
    'Entrada de ativo individualizado','INVENTORY_ASSET',v_asset.id,'asset-initial-entry:'||v_asset.id,auth.uid()
  ) returning * into v_movement;
  insert into public.inventory_movement_lines(
    organization_id,movement_id,line_number,warehouse_id,location_id,item_id,lot_id,asset_id,quantity_delta,unit_cost,notes
  ) values(
    p_organization_id,v_movement.id,1,p_warehouse_id,p_location_id,p_item_id,p_lot_id,v_asset.id,1,
    coalesce(p_acquisition_cost,v_item.reference_unit_cost,0),'Entrada inicial do ativo'
  );
  perform public.post_inventory_movement(v_movement.id);

  insert into public.inventory_events(organization_id,project_id,warehouse_id,item_id,asset_id,movement_id,actor_user_id,event_type,metadata)
  values(p_organization_id,v_project_id,p_warehouse_id,p_item_id,v_asset.id,v_movement.id,auth.uid(),'ASSET_CREATED',
    jsonb_build_object('patrimonyCode',v_asset.patrimony_code,'serialNumber',v_asset.serial_number));
  return v_asset;
end $$;

revoke all on function public.create_inventory_item(uuid,uuid,uuid,text,text,public.inventory_item_kind,text,text,text,text,numeric,numeric,boolean,boolean,boolean) from public,anon;
revoke all on function public.create_inventory_warehouse(uuid,uuid,text,text,public.inventory_warehouse_kind,text,uuid,text,text) from public,anon;
revoke all on function public.create_inventory_movement(uuid,uuid,public.inventory_movement_type,timestamptz,text,text,jsonb,text,boolean) from public,anon;
revoke all on function public.create_inventory_asset(uuid,uuid,uuid,uuid,uuid,text,text,date,numeric,text) from public,anon;
grant execute on function public.create_inventory_item(uuid,uuid,uuid,text,text,public.inventory_item_kind,text,text,text,text,numeric,numeric,boolean,boolean,boolean) to authenticated;
grant execute on function public.create_inventory_warehouse(uuid,uuid,text,text,public.inventory_warehouse_kind,text,uuid,text,text) to authenticated;
grant execute on function public.create_inventory_movement(uuid,uuid,public.inventory_movement_type,timestamptz,text,text,jsonb,text,boolean) to authenticated;
grant execute on function public.create_inventory_asset(uuid,uuid,uuid,uuid,uuid,text,text,date,numeric,text) to authenticated;

-- Ativos devem ser cadastrados pela operação transacional que também cria a entrada física.
revoke insert on public.inventory_assets from authenticated;
