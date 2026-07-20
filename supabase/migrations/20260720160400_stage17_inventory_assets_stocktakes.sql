-- Etapa 17 — ativos individualizados, custódias e inventário físico.

-- Permite encerrar inventário sem movimento quando não existir divergência.
do $$
declare v_constraint text;
begin
  select constraint_name into v_constraint
  from information_schema.check_constraints check_constraint
  join information_schema.constraint_column_usage usage
    on usage.constraint_name=check_constraint.constraint_name
   and usage.constraint_schema=check_constraint.constraint_schema
  where usage.table_schema='public' and usage.table_name='inventory_stocktakes'
    and check_constraint.check_clause ilike '%adjustment_movement_id%'
  limit 1;
  if v_constraint is not null then
    execute format('alter table public.inventory_stocktakes drop constraint %I',v_constraint);
  end if;
end $$;

alter table public.inventory_stocktakes
  add constraint inventory_stocktakes_posted_state_check
  check (status<>'POSTED' or posted_at is not null);

create or replace function public.protect_inventory_asset_custody()
returns trigger language plpgsql set search_path=public as $$
begin
  if tg_op='DELETE' then raise exception 'Custódia não pode ser excluída.'; end if;
  if old.status<>'ACTIVE' then raise exception 'Custódia encerrada é imutável.'; end if;
  if new.status='ACTIVE' and (
    new.asset_id<>old.asset_id or new.project_id is distinct from old.project_id
    or new.team_id is distinct from old.team_id or new.responsible_user_id is distinct from old.responsible_user_id
    or new.responsible_name is distinct from old.responsible_name or new.assigned_at<>old.assigned_at
  ) then raise exception 'Responsável e origem da custódia ativa não podem ser reescritos.'; end if;
  return new;
end $$;

create or replace function public.protect_inventory_stocktake()
returns trigger language plpgsql set search_path=public as $$
begin
  if tg_op='DELETE' then
    if old.status<>'DRAFT' then raise exception 'Inventário iniciado não pode ser excluído.'; end if;
    return old;
  end if;
  if old.status in ('POSTED','CANCELED') then raise exception 'Inventário encerrado é imutável.'; end if;
  return new;
end $$;

create or replace function public.protect_inventory_stocktake_line()
returns trigger language plpgsql set search_path=public as $$
declare v_status public.inventory_stocktake_status;v_stocktake_id uuid;
begin
  v_stocktake_id:=case when tg_op='DELETE' then old.stocktake_id else new.stocktake_id end;
  select status into v_status from public.inventory_stocktakes where id=v_stocktake_id;
  if tg_op='INSERT' and v_status not in ('DRAFT','COUNTING') then raise exception 'Não é possível adicionar linha neste estado.'; end if;
  if tg_op='UPDATE' and v_status<>'COUNTING' then raise exception 'Contagens só podem ser alteradas durante a contagem.'; end if;
  if tg_op='DELETE' and v_status<>'DRAFT' then raise exception 'Linha de inventário iniciado não pode ser excluída.'; end if;
  return case when tg_op='DELETE' then old else new end;
end $$;

create or replace function public.assign_inventory_asset(
  p_asset_id uuid,
  p_project_id uuid,
  p_team_id uuid default null,
  p_responsible_user_id uuid default null,
  p_responsible_name text default null,
  p_expected_return_at timestamptz default null,
  p_condition text default '',
  p_notes text default ''
) returns public.inventory_asset_custodies
language plpgsql security definer set search_path=public as $$
declare
  v_asset public.inventory_assets;
  v_item public.inventory_items;
  v_custody public.inventory_asset_custodies;
  v_movement public.inventory_movements;
  v_cost numeric(18,4);
  v_code text;
begin
  select * into v_asset from public.inventory_assets where id=p_asset_id for update;
  if not found then raise exception 'Ativo não encontrado.'; end if;
  if not public.has_module_permission(v_asset.organization_id,'estoque','EDIT',p_project_id,null) then
    raise exception 'Permissão insuficiente para entregar ativo.';
  end if;
  select * into v_item from public.inventory_items where id=v_asset.item_id;
  if not v_item.controls_individual_asset then raise exception 'Item não está configurado como ativo individualizado.'; end if;
  if v_asset.status<>'AVAILABLE' or v_asset.warehouse_id is null then raise exception 'Ativo não está disponível em depósito.'; end if;
  if exists(select 1 from public.inventory_asset_custodies where asset_id=v_asset.id and status='ACTIVE') then
    raise exception 'Ativo já possui custódia ativa.';
  end if;
  if not exists(select 1 from public.projects where id=p_project_id and organization_id=v_asset.organization_id and archived_at is null) then
    raise exception 'Obra inválida.';
  end if;
  if p_team_id is null and p_responsible_user_id is null and length(trim(coalesce(p_responsible_name,'')))=0 then
    raise exception 'Informe equipe ou responsável.';
  end if;
  if p_team_id is not null and not exists(select 1 from public.project_teams where id=p_team_id and project_id=p_project_id and organization_id=v_asset.organization_id) then
    raise exception 'Equipe incompatível com a obra.';
  end if;

  select coalesce(stock.average_unit_cost,v_item.reference_unit_cost,v_asset.acquisition_cost,0)
  into v_cost
  from (select 1) source
  left join public.inventory_stock_v stock
    on stock.warehouse_id=v_asset.warehouse_id
   and stock.location_id is not distinct from v_asset.location_id
   and stock.item_id=v_asset.item_id
   and stock.lot_id is not distinct from v_asset.lot_id;

  v_code:='ATV-SAI-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  insert into public.inventory_movements(
    organization_id,project_id,code,movement_type,status,occurred_at,reason,source_type,source_id,idempotency_key,created_by
  ) values(
    v_asset.organization_id,p_project_id,v_code,'ISSUE','DRAFT',now(),'Entrega de ativo individualizado',
    'INVENTORY_ASSET',v_asset.id,'asset-assignment:'||v_asset.id||':'||clock_timestamp()::text,auth.uid()
  ) returning * into v_movement;

  insert into public.inventory_movement_lines(
    organization_id,movement_id,line_number,warehouse_id,location_id,item_id,lot_id,asset_id,quantity_delta,unit_cost,notes
  ) values(
    v_asset.organization_id,v_movement.id,1,v_asset.warehouse_id,v_asset.location_id,v_asset.item_id,v_asset.lot_id,
    v_asset.id,-1,v_cost,coalesce(p_notes,'')
  );
  v_movement:=public.post_inventory_movement(v_movement.id);

  insert into public.inventory_asset_custodies(
    organization_id,asset_id,project_id,team_id,responsible_user_id,responsible_name,status,
    assigned_at,expected_return_at,assigned_condition,notes,assigned_by
  ) values(
    v_asset.organization_id,v_asset.id,p_project_id,p_team_id,p_responsible_user_id,nullif(trim(coalesce(p_responsible_name,'')),''),
    'ACTIVE',now(),p_expected_return_at,coalesce(p_condition,''),coalesce(p_notes,''),auth.uid()
  ) returning * into v_custody;

  update public.inventory_assets set
    warehouse_id=null,location_id=null,project_id=p_project_id,status='IN_USE',condition_notes=coalesce(p_condition,''),updated_at=now()
  where id=v_asset.id;

  insert into public.inventory_events(organization_id,project_id,asset_id,movement_id,actor_user_id,event_type,metadata)
  values(v_asset.organization_id,p_project_id,v_asset.id,v_movement.id,auth.uid(),'ASSET_ASSIGNED',
    jsonb_build_object('custodyId',v_custody.id,'teamId',p_team_id,'responsibleUserId',p_responsible_user_id,
      'responsibleName',p_responsible_name,'expectedReturnAt',p_expected_return_at));
  return v_custody;
end $$;

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
create trigger inventory_stocktake_lines_protect before insert or update or delete on public.inventory_stocktake_lines
for each row execute function public.protect_inventory_stocktake_line();

revoke all on function public.protect_inventory_asset_custody() from public,anon,authenticated;
revoke all on function public.protect_inventory_stocktake() from public,anon,authenticated;
revoke all on function public.protect_inventory_stocktake_line() from public,anon,authenticated;
revoke all on function public.assign_inventory_asset(uuid,uuid,uuid,uuid,text,timestamptz,text,text) from public,anon;
revoke all on function public.return_inventory_asset(uuid,uuid,uuid,text,text) from public,anon;
revoke all on function public.start_inventory_stocktake(uuid,uuid,text,text) from public,anon;
revoke all on function public.submit_inventory_stocktake(uuid,jsonb) from public,anon;
revoke all on function public.approve_inventory_stocktake(uuid,text) from public,anon;
revoke all on function public.post_inventory_stocktake_adjustment(uuid) from public,anon;
grant execute on function public.assign_inventory_asset(uuid,uuid,uuid,uuid,text,timestamptz,text,text) to authenticated;
grant execute on function public.return_inventory_asset(uuid,uuid,uuid,text,text) to authenticated;
grant execute on function public.start_inventory_stocktake(uuid,uuid,text,text) to authenticated;
grant execute on function public.submit_inventory_stocktake(uuid,jsonb) to authenticated;
grant execute on function public.approve_inventory_stocktake(uuid,text) to authenticated;
grant execute on function public.post_inventory_stocktake_adjustment(uuid) to authenticated;
