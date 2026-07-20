-- Etapa 17 — custos só podem ser definidos ou alterados por perfis sensíveis.

create or replace function public.enforce_inventory_sensitive_write()
returns trigger language plpgsql set search_path=public as $$
declare
  v_project_id uuid;
  v_changed boolean:=false;
begin
  if tg_table_name='inventory_items' then
    v_changed:=tg_op='INSERT' and new.reference_unit_cost is not null
      or tg_op='UPDATE' and new.reference_unit_cost is distinct from old.reference_unit_cost;
    if v_changed and not public.has_module_permission(new.organization_id,'estoque','READ',null,'sensitive') then
      raise exception 'Permissão sensível necessária para definir custo de referência.';
    end if;
  elsif tg_table_name='inventory_assets' then
    v_changed:=tg_op='INSERT' and new.acquisition_cost is not null
      or tg_op='UPDATE' and new.acquisition_cost is distinct from old.acquisition_cost;
    if v_changed and not public.has_module_permission(new.organization_id,'estoque','READ',new.project_id,'sensitive') then
      raise exception 'Permissão sensível necessária para definir custo de aquisição.';
    end if;
  elsif tg_table_name='inventory_asset_maintenance' then
    select project_id into v_project_id from public.inventory_assets where id=new.asset_id;
    v_changed:=tg_op='INSERT' and new.cost is not null
      or tg_op='UPDATE' and new.cost is distinct from old.cost;
    if v_changed and not public.has_module_permission(new.organization_id,'estoque','READ',v_project_id,'sensitive') then
      raise exception 'Permissão sensível necessária para definir custo de manutenção.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists inventory_items_sensitive_write_guard on public.inventory_items;
create trigger inventory_items_sensitive_write_guard
before insert or update on public.inventory_items
for each row execute function public.enforce_inventory_sensitive_write();

drop trigger if exists inventory_assets_sensitive_write_guard on public.inventory_assets;
create trigger inventory_assets_sensitive_write_guard
before insert or update on public.inventory_assets
for each row execute function public.enforce_inventory_sensitive_write();

drop trigger if exists inventory_asset_maintenance_sensitive_write_guard on public.inventory_asset_maintenance;
create trigger inventory_asset_maintenance_sensitive_write_guard
before insert or update on public.inventory_asset_maintenance
for each row execute function public.enforce_inventory_sensitive_write();

revoke all on function public.enforce_inventory_sensitive_write() from public,anon,authenticated;
