-- Etapa 17 — ativos individualizados e inventário físico (parte 4).

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
