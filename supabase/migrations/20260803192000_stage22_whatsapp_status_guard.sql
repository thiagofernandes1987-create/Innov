-- Etapa 22 — máquina de estados monotônica para entrega de mensagens.
-- Webhooks podem chegar repetidos ou fora de ordem; o banco não permite regressão.

begin;

create or replace function public.guard_whatsapp_message_delivery_status()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
declare
  v_old_rank integer;
  v_new_rank integer;
begin
  if old.direction<>'OUTBOUND' or new.status is not distinct from old.status then
    return new;
  end if;

  v_old_rank:=case old.status
    when 'QUEUED' then 0
    when 'SENT' then 1
    when 'DELIVERED' then 2
    when 'READ' then 3
    else -1
  end;
  v_new_rank:=case new.status
    when 'QUEUED' then 0
    when 'SENT' then 1
    when 'DELIVERED' then 2
    when 'READ' then 3
    else -1
  end;

  if old.status='FAILED'
    or (new.status='FAILED' and old.status not in ('QUEUED','SENT'))
    or (new.status<>'FAILED' and (v_new_rank<0 or (v_old_rank>=0 and v_new_rank<=v_old_rank)))
  then
    new.status:=old.status;
    new.sent_at:=old.sent_at;
    new.delivered_at:=old.delivered_at;
    new.read_at:=old.read_at;
    new.failed_at:=old.failed_at;
    new.error_code:=old.error_code;
    new.error_message:=old.error_message;
  end if;

  return new;
end;
$$;

drop trigger if exists whatsapp_messages_guard_delivery_status
  on public.whatsapp_messages;
create trigger whatsapp_messages_guard_delivery_status
before update of status,sent_at,delivered_at,read_at,failed_at,error_code,error_message
on public.whatsapp_messages
for each row execute function public.guard_whatsapp_message_delivery_status();

revoke all on function public.guard_whatsapp_message_delivery_status()
  from public,anon,authenticated;

commit;
