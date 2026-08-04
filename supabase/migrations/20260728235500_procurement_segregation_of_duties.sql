-- VACINA-034: seleção, solicitação e aprovação de compra são papéis lógicos
-- distintos, mesmo quando a empresa possui poucos usuários.

create or replace function public.decide_procurement_approval(
  p_approval_id uuid,
  p_decision public.procurement_approval_status,
  p_comment text default ''
)
returns public.procurement_orders
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_approval public.procurement_approvals;
  v_quote public.procurement_quotes;
  v_request public.procurement_requests;
  v_order public.procurement_orders;
begin
  if p_decision not in ('APPROVED', 'REJECTED') then
    raise exception 'Decisão inválida.';
  end if;

  select * into v_approval
  from public.procurement_approvals
  where id = p_approval_id
  for update;

  if not found or v_approval.status <> 'PENDING' then
    raise exception 'Aprovação pendente não encontrada.';
  end if;

  select * into v_quote
  from public.procurement_quotes
  where id = v_approval.quote_id;

  select * into v_request
  from public.procurement_requests
  where id = v_approval.request_id
  for update;

  if not public.has_module_permission(
    v_approval.organization_id, 'compras', 'READ', v_request.project_id, 'approve'
  ) then
    raise exception 'Permissão insuficiente para aprovar.';
  end if;

  if auth.uid() is null then
    raise exception 'Aprovação exige usuário identificado.';
  end if;

  if auth.uid() = v_approval.requested_by then
    raise exception 'Quem selecionou a cotação não pode decidir a própria aprovação.';
  end if;

  if auth.uid() = v_request.requested_by then
    raise exception 'Quem solicitou a compra não pode decidir a própria aprovação.';
  end if;

  update public.procurement_approvals
  set status = p_decision,
      decided_by = auth.uid(),
      decided_at = now(),
      comment = coalesce(p_comment, '')
  where id = v_approval.id;

  if p_decision = 'REJECTED' then
    update public.procurement_requests
    set status = 'IN_QUOTATION', updated_at = now()
    where id = v_request.id;

    update public.procurement_quotes
    set status = 'SUBMITTED', updated_at = now()
    where id = v_quote.id;

    insert into public.procurement_events(
      organization_id, project_id, request_id, quote_id,
      actor_user_id, event_type, metadata
    ) values (
      v_approval.organization_id, v_request.project_id, v_request.id, v_quote.id,
      auth.uid(), 'APPROVAL_REJECTED', jsonb_build_object('comment', p_comment)
    );

    return null;
  end if;

  insert into public.procurement_orders(
    organization_id, project_id, request_id, quote_id, supplier_id,
    code, status, currency, subtotal, discount, freight, taxes, total,
    payment_terms, expected_at, issued_at, issued_by, notes
  ) values (
    v_quote.organization_id, v_request.project_id, v_request.id, v_quote.id,
    v_quote.supplier_id,
    'PC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    'ISSUED', v_quote.currency, v_quote.subtotal, v_quote.discount,
    v_quote.freight, v_quote.taxes, v_quote.total, v_quote.payment_terms,
    case when v_quote.lead_time_days is null then null
         else current_date + v_quote.lead_time_days end,
    now(), auth.uid(), v_quote.notes
  ) returning * into v_order;

  insert into public.procurement_order_items(
    organization_id, order_id, request_item_id, description,
    specification, unit, ordered_quantity, unit_price, total
  )
  select
    v_quote.organization_id, v_order.id, request_item.id,
    request_item.description,
    coalesce(nullif(quote_item.offered_specification, ''), request_item.specification),
    request_item.unit, quote_item.quantity, quote_item.unit_price, quote_item.total
  from public.procurement_quote_items quote_item
  join public.procurement_request_items request_item
    on request_item.id = quote_item.request_item_id
  where quote_item.quote_id = v_quote.id;

  update public.procurement_requests
  set status = 'ORDERED', updated_at = now()
  where id = v_request.id;

  insert into public.procurement_events(
    organization_id, project_id, request_id, quote_id, order_id,
    actor_user_id, event_type, metadata
  ) values (
    v_order.organization_id, v_order.project_id, v_order.request_id,
    v_order.quote_id, v_order.id, auth.uid(), 'ORDER_ISSUED',
    jsonb_build_object('code', v_order.code, 'total', v_order.total)
  );

  return v_order;
end;
$function$;

revoke all on function public.decide_procurement_approval(
  uuid, public.procurement_approval_status, text
) from public;
revoke all on function public.decide_procurement_approval(
  uuid, public.procurement_approval_status, text
) from anon;
grant execute on function public.decide_procurement_approval(
  uuid, public.procurement_approval_status, text
) to authenticated;
grant execute on function public.decide_procurement_approval(
  uuid, public.procurement_approval_status, text
) to service_role;
