-- W-10 — falha terminal deve interromper novas entregas da conta.

begin;

create or replace function public.open_channel_delivery_circuit_on_terminal_attempt()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
declare command_row public.channel_commands%rowtype;
begin
  if new.outcome<>'TERMINAL' or old.outcome='TERMINAL' then return new; end if;
  select * into command_row from public.channel_commands where id=new.command_id;
  if not found then return new; end if;
  insert into public.channel_delivery_circuits(
    organization_id,account_id,state,consecutive_failures,
    opened_until,last_failure_class,version
  ) values(
    command_row.organization_id,command_row.account_id,'OPEN',1,
    now()+interval '30 seconds',new.failure_class,1
  ) on conflict(organization_id,account_id) do update set
    state='OPEN',
    consecutive_failures=public.channel_delivery_circuits.consecutive_failures+1,
    opened_until=now()+interval '30 seconds',
    last_failure_class=excluded.last_failure_class,
    version=public.channel_delivery_circuits.version+1,
    updated_at=now();
  return new;
end;
$$;

drop trigger if exists channel_delivery_attempt_terminal_circuit
  on public.channel_delivery_attempts;
create trigger channel_delivery_attempt_terminal_circuit
after update of outcome on public.channel_delivery_attempts
for each row execute function public.open_channel_delivery_circuit_on_terminal_attempt();

commit;
