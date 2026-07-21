-- Etapa 17 — ativos individualizados, custódias e inventário físico (parte 1).

-- Permite encerrar inventário sem movimento quando não existir divergência.
do $$
declare v_constraint text;
begin
  select check_constraint.constraint_name into v_constraint
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
