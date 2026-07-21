-- Etapa 17 — privilégio mínimo das RPCs transacionais de criação.

revoke all on function public.create_inventory_item(
  uuid,uuid,uuid,text,text,public.inventory_item_kind,text,text,text,text,numeric,numeric,boolean,boolean,boolean
) from public,anon;
grant execute on function public.create_inventory_item(
  uuid,uuid,uuid,text,text,public.inventory_item_kind,text,text,text,text,numeric,numeric,boolean,boolean,boolean
) to authenticated,service_role;

revoke all on function public.create_inventory_movement(
  uuid,uuid,public.inventory_movement_type,timestamptz,text,text,jsonb,text,boolean
) from public,anon;
grant execute on function public.create_inventory_movement(
  uuid,uuid,public.inventory_movement_type,timestamptz,text,text,jsonb,text,boolean
) to authenticated,service_role;

revoke all on function public.create_inventory_warehouse(
  uuid,uuid,text,text,public.inventory_warehouse_kind,text,uuid,text,text
) from public,anon;
grant execute on function public.create_inventory_warehouse(
  uuid,uuid,text,text,public.inventory_warehouse_kind,text,uuid,text,text
) to authenticated,service_role;
