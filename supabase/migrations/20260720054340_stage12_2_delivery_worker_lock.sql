-- Etapa 12.2 — lock transacional da fila de entrega.

alter type public.signature_delivery_status
add value if not exists 'PROCESSING' after 'PENDING';

create or replace function public.lock_signature_delivery_event(p_worker_id text)
returns public.signature_delivery_events
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_delivery public.signature_delivery_events;
begin
  select * into v_delivery
  from public.signature_delivery_events
  where status in('PENDING','FAILED')
    and attempts<10
    and(updated_at<now()-interval '2 minutes' or status='PENDING')
  order by created_at
  for update skip locked
  limit 1;

  if not found then return null; end if;

  update public.signature_delivery_events
  set status='PROCESSING',
      attempts=attempts+1,
      last_error=null,
      updated_at=now()
  where id=v_delivery.id
  returning * into v_delivery;

  update public.signature_evidence_records
  set metadata=metadata
  where false;

  return v_delivery;
end;
$$;

create or replace function public.complete_signature_copy_delivery(
  p_delivery_id uuid,
  p_status public.signature_delivery_status,
  p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_delivery public.signature_delivery_events;
begin
  if p_status not in('SENT','DELIVERED','FAILED','CANCELED') then
    raise exception 'Estado final inválido';
  end if;
  select * into v_delivery
  from public.signature_delivery_events
  where id=p_delivery_id
  for update;
  if not found then raise exception 'Entrega não encontrada'; end if;

  update public.signature_delivery_events
  set status=p_status,
      last_error=p_error,
      sent_at=case when p_status in('SENT','DELIVERED')
        then coalesce(sent_at,now()) else sent_at end,
      delivered_at=case when p_status='DELIVERED'
        then now() else delivered_at end,
      updated_at=now()
  where id=p_delivery_id;

  if p_status in('SENT','DELIVERED') then
    update public.signature_envelopes
    set client_copy_sent_at=coalesce(client_copy_sent_at,now())
    where id=v_delivery.envelope_id;
    update public.signature_signers
    set copy_sent_at=coalesce(copy_sent_at,now())
    where envelope_id=v_delivery.envelope_id
      and lower(email)=lower(v_delivery.recipient_email);
  end if;
  return true;
end;
$$;

revoke all on function public.lock_signature_delivery_event(text)
from public,anon,authenticated;
grant execute on function public.lock_signature_delivery_event(text)
to service_role;
