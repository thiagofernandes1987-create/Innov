-- VACINA-035: ramos de CASE que alimentam colunas enum precisam devolver o
-- tipo enum explicitamente; literais textuais não são convertidos de forma
-- implícita em UPDATE preparado dentro de PL/pgSQL.

create or replace function public.finalize_procurement_receipt(
  p_receipt_id uuid
)
returns public.procurement_receipts
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v public.procurement_receipts;
  v_order public.procurement_orders;
  r record;
  v_remaining numeric;
  v_rejected numeric;
  v_open integer;
  v_items integer;
begin
  select * into v
  from public.procurement_receipts
  where id = p_receipt_id
  for update;

  if not found or v.status <> 'DRAFT' then
    raise exception 'Recebimento em rascunho não encontrado.';
  end if;

  select count(*) into v_items
  from public.procurement_receipt_items
  where receipt_id = v.id;

  if v_items = 0 then
    raise exception 'Inclua ao menos um item recebido.';
  end if;

  select * into v_order
  from public.procurement_orders
  where id = v.order_id
  for update;

  for r in
    select receipt_item.*,
           order_item.received_quantity as prior_received,
           order_item.ordered_quantity
    from public.procurement_receipt_items receipt_item
    join public.procurement_order_items order_item
      on order_item.id = receipt_item.order_item_id
    where receipt_item.receipt_id = v.id
  loop
    v_remaining := r.ordered_quantity - r.prior_received;
    if r.received_quantity > v_remaining then
      raise exception 'Quantidade recebida superior ao saldo do pedido.';
    end if;

    update public.procurement_order_items
    set received_quantity = received_quantity + r.received_quantity
    where id = r.order_item_id;
  end loop;

  select coalesce(sum(rejected_quantity), 0)
  into v_rejected
  from public.procurement_receipt_items
  where receipt_id = v.id;

  update public.procurement_receipts
  set status = case
        when v_rejected > 0
          then 'ACCEPTED_WITH_RESTRICTION'::public.procurement_receipt_status
        else 'ACCEPTED'::public.procurement_receipt_status
      end,
      updated_at = now()
  where id = v.id
  returning * into v;

  select count(*) into v_open
  from public.procurement_order_items
  where order_id = v_order.id
    and received_quantity < ordered_quantity;

  update public.procurement_orders
  set status = case
        when v_open = 0
          then 'RECEIVED'::public.procurement_order_status
        else 'PARTIALLY_RECEIVED'::public.procurement_order_status
      end,
      updated_at = now()
  where id = v_order.id;

  update public.procurement_requests
  set status = case
        when v_open = 0
          then 'RECEIVED'::public.procurement_request_status
        else 'PARTIALLY_RECEIVED'::public.procurement_request_status
      end,
      updated_at = now()
  where id = v_order.request_id;

  insert into public.procurement_events(
    organization_id, project_id, request_id, order_id, receipt_id,
    event_type, metadata
  ) values (
    v.organization_id, v.project_id, v_order.request_id, v.order_id, v.id,
    'RECEIPT_FINALIZED',
    jsonb_build_object('status', v.status, 'hasRejected', v_rejected > 0)
  );

  return v;
end;
$function$;

revoke all on function public.finalize_procurement_receipt(uuid) from public;
revoke all on function public.finalize_procurement_receipt(uuid) from anon;
revoke all on function public.finalize_procurement_receipt(uuid) from authenticated;
grant execute on function public.finalize_procurement_receipt(uuid) to service_role;

create or replace function public.decide_daily_log(
  p_daily_log_id uuid,
  p_approve boolean,
  p_reason text default null,
  p_release_client boolean default false
)
returns public.daily_logs
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v public.daily_logs;
begin
  select * into v
  from public.daily_logs
  where id = p_daily_log_id
  for update;

  if not found then raise exception 'Diário não encontrado'; end if;
  if not public.can_manage_project(v.project_id) then raise exception 'Acesso negado'; end if;
  if v.status <> 'SUBMITTED' then raise exception 'Somente diário enviado pode ser decidido'; end if;

  if not p_approve and nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'Motivo da rejeição obrigatório';
  end if;

  update public.daily_logs
  set status = case
        when p_approve then 'APPROVED'::public.daily_log_status
        else 'REJECTED'::public.daily_log_status
      end,
      approved_by = case when p_approve then auth.uid() else null end,
      approved_at = case when p_approve then now() else null end,
      rejection_reason = case when p_approve then null else p_reason end,
      client_visible = case when p_approve then p_release_client else false end,
      updated_at = now()
  where id = v.id
  returning * into v;

  perform public.write_audit(
    v.organization_id,
    'DAILY_LOG',
    v.id,
    case when p_approve then 'APPROVE' else 'REJECT' end,
    jsonb_build_object('reason', p_reason, 'client_visible', v.client_visible),
    v.project_id
  );

  return v;
end;
$function$;

revoke all on function public.decide_daily_log(uuid, boolean, text, boolean) from public;
revoke all on function public.decide_daily_log(uuid, boolean, text, boolean) from anon;
grant execute on function public.decide_daily_log(uuid, boolean, text, boolean) to authenticated;
grant execute on function public.decide_daily_log(uuid, boolean, text, boolean) to service_role;
