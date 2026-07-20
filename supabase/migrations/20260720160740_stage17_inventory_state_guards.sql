-- Etapa 17 — recalcula reservas e impede reescrita de custódias.

create or replace function public.recalculate_inventory_reservation_from_line()
returns trigger language plpgsql set search_path=public as $$
begin
  perform public.recalculate_inventory_reservation_status(new.reservation_id);
  return new;
end $$;

drop trigger if exists inventory_reservation_lines_recalculate_status on public.inventory_reservation_lines;
create trigger inventory_reservation_lines_recalculate_status
after update of consumed_quantity,released_quantity on public.inventory_reservation_lines
for each row when (
  old.consumed_quantity is distinct from new.consumed_quantity
  or old.released_quantity is distinct from new.released_quantity
)
execute function public.recalculate_inventory_reservation_from_line();

create or replace function public.protect_inventory_asset_custody()
returns trigger language plpgsql set search_path=public as $$
begin
  if tg_op='DELETE' then raise exception 'Custódia não pode ser excluída.'; end if;
  if old.status<>'ACTIVE' then raise exception 'Custódia encerrada é imutável.'; end if;

  if new.asset_id<>old.asset_id
     or new.organization_id<>old.organization_id
     or new.project_id is distinct from old.project_id
     or new.team_id is distinct from old.team_id
     or new.responsible_user_id is distinct from old.responsible_user_id
     or new.responsible_name is distinct from old.responsible_name
     or new.assigned_at<>old.assigned_at
     or new.expected_return_at is distinct from old.expected_return_at
     or new.assigned_condition is distinct from old.assigned_condition
     or new.assigned_by is distinct from old.assigned_by then
    raise exception 'Origem, responsável e condições de entrega da custódia são imutáveis.';
  end if;

  if new.status='ACTIVE' and (
    new.returned_at is not null or new.returned_by is not null
    or length(trim(coalesce(new.returned_condition,'')))>0
  ) then raise exception 'Custódia ativa não pode conter dados de devolução.'; end if;

  if new.status='RETURNED' and (new.returned_at is null or new.returned_by is null) then
    raise exception 'Devolução exige data e responsável pelo registro.';
  end if;
  return new;
end $$;

revoke all on function public.recalculate_inventory_reservation_from_line() from public,anon,authenticated;
revoke all on function public.protect_inventory_asset_custody() from public,anon,authenticated;
