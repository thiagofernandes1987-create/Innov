-- Etapa 14 — RLS, transações e privilégios mínimos.

do $$
declare t text;
begin
 foreach t in array array[
  'procurement_suppliers','procurement_requests','procurement_request_items','procurement_rfqs',
  'procurement_supplier_invitations','procurement_quotes','procurement_quote_items','procurement_approvals',
  'procurement_orders','procurement_order_items','procurement_receipts','procurement_receipt_items',
  'procurement_receipt_quality','procurement_events'
 ] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy %I on public.%I for select to authenticated using (public.has_module_permission(organization_id,''compras'',''READ'',null,null))',t||'_read',t);
  execute format('create policy %I on public.%I for insert to authenticated with check (public.has_module_permission(organization_id,''compras'',''EDIT'',null,null))',t||'_insert',t);
  execute format('create policy %I on public.%I for update to authenticated using (public.has_module_permission(organization_id,''compras'',''EDIT'',null,null)) with check (public.has_module_permission(organization_id,''compras'',''EDIT'',null,null))',t||'_update',t);
  execute format('create policy %I on public.%I for delete to authenticated using (public.has_module_permission(organization_id,''compras'',''DELETE'',null,null))',t||'_delete',t);
 end loop;
end $$;

create policy procurement_storage_read on storage.objects for select to authenticated
using(bucket_id='procurement-attachments' and public.has_module_permission((storage.foldername(name))[1]::uuid,'compras','READ',null,null));
create policy procurement_storage_insert on storage.objects for insert to authenticated
with check(bucket_id='procurement-attachments' and public.has_module_permission((storage.foldername(name))[1]::uuid,'compras','EDIT',null,null));
create policy procurement_storage_delete on storage.objects for delete to authenticated
using(bucket_id='procurement-attachments' and public.has_module_permission((storage.foldername(name))[1]::uuid,'compras','DELETE',null,null));

create or replace function public.submit_procurement_request(p_request_id uuid)
returns public.procurement_requests language plpgsql security definer set search_path=public as $$
declare v public.procurement_requests; v_count integer;
begin
 select * into v from public.procurement_requests where id=p_request_id for update;
 if not found then raise exception 'Solicitação não encontrada.'; end if;
 if not public.has_module_permission(v.organization_id,'compras','EDIT',v.project_id,null) then raise exception 'Permissão insuficiente.'; end if;
 if v.status<>'DRAFT' then raise exception 'Somente solicitações em rascunho podem ser enviadas.'; end if;
 select count(*) into v_count from public.procurement_request_items where request_id=v.id;
 if v_count=0 then raise exception 'Inclua ao menos um item.'; end if;
 update public.procurement_requests set status='SUBMITTED',submitted_at=now(),updated_at=now() where id=v.id returning * into v;
 insert into public.procurement_events(organization_id,project_id,request_id,actor_user_id,event_type)
 values(v.organization_id,v.project_id,v.id,auth.uid(),'REQUEST_SUBMITTED');
 return v;
end $$;

create or replace function public.open_procurement_rfq(p_rfq_id uuid)
returns public.procurement_rfqs language plpgsql security definer set search_path=public as $$
declare v public.procurement_rfqs; v_request public.procurement_requests; v_invites integer;
begin
 select * into v from public.procurement_rfqs where id=p_rfq_id for update;
 if not found then raise exception 'Cotação não encontrada.'; end if;
 select * into v_request from public.procurement_requests where id=v.request_id for update;
 if not public.has_module_permission(v.organization_id,'compras','EDIT',v_request.project_id,null) then raise exception 'Permissão insuficiente.'; end if;
 if v.status<>'DRAFT' then raise exception 'A cotação não está em rascunho.'; end if;
 select count(*) into v_invites from public.procurement_supplier_invitations where rfq_id=v.id and revoked_at is null;
 if v_invites=0 then raise exception 'Convide ao menos um fornecedor.'; end if;
 update public.procurement_rfqs set status='OPEN',opened_at=now(),updated_at=now() where id=v.id returning * into v;
 update public.procurement_requests set status='IN_QUOTATION',updated_at=now() where id=v.request_id;
 insert into public.procurement_events(organization_id,project_id,request_id,rfq_id,actor_user_id,event_type,metadata)
 values(v.organization_id,v_request.project_id,v.request_id,v.id,auth.uid(),'RFQ_OPENED',jsonb_build_object('invites',v_invites));
 return v;
end $$;

create or replace function public.finalize_procurement_quote(p_quote_id uuid)
returns public.procurement_quotes language plpgsql security definer set search_path=public as $$
declare v public.procurement_quotes; v_subtotal numeric(16,2);
begin
 select * into v from public.procurement_quotes where id=p_quote_id for update;
 if not found then raise exception 'Proposta não encontrada.'; end if;
 if v.status not in ('DRAFT','SUBMITTED') then raise exception 'A proposta não pode ser enviada.'; end if;
 select coalesce(sum(total),0) into v_subtotal from public.procurement_quote_items where quote_id=v.id;
 if v_subtotal<=0 then raise exception 'Informe os preços dos itens.'; end if;
 update public.procurement_quotes set status='SUBMITTED',subtotal=v_subtotal,
 total=greatest(0,v_subtotal-discount+freight+taxes),submitted_at=now(),updated_at=now()
 where id=v.id returning * into v;
 update public.procurement_supplier_invitations set responded_at=now() where id=v.invitation_id;
 insert into public.procurement_events(organization_id,rfq_id,quote_id,event_type,metadata)
 values(v.organization_id,v.rfq_id,v.id,'QUOTE_SUBMITTED',jsonb_build_object('total',v.total,'supplierId',v.supplier_id));
 return v;
end $$;

create or replace function public.select_procurement_quote(p_quote_id uuid)
returns public.procurement_approvals language plpgsql security definer set search_path=public as $$
declare v_quote public.procurement_quotes; v_rfq public.procurement_rfqs; v_request public.procurement_requests; v_approval public.procurement_approvals;
begin
 select * into v_quote from public.procurement_quotes where id=p_quote_id for update;
 if not found or v_quote.status<>'SUBMITTED' then raise exception 'Proposta enviada não encontrada.'; end if;
 select * into v_rfq from public.procurement_rfqs where id=v_quote.rfq_id for update;
 select * into v_request from public.procurement_requests where id=v_rfq.request_id for update;
 if not public.has_module_permission(v_quote.organization_id,'compras','EDIT',v_request.project_id,null) then raise exception 'Permissão insuficiente.'; end if;
 update public.procurement_quotes set status=case when id=v_quote.id then 'SELECTED'::public.procurement_quote_status else 'REJECTED'::public.procurement_quote_status end,
 selected_at=case when id=v_quote.id then now() else selected_at end,updated_at=now()
 where rfq_id=v_quote.rfq_id and status in ('SUBMITTED','SELECTED');
 update public.procurement_rfqs set status='AWARDED',closed_at=now(),updated_at=now() where id=v_rfq.id;
 update public.procurement_requests set status='UNDER_APPROVAL',updated_at=now() where id=v_request.id;
 insert into public.procurement_approvals(organization_id,request_id,quote_id,status,amount,requested_by)
 values(v_quote.organization_id,v_request.id,v_quote.id,'PENDING',v_quote.total,auth.uid())
 on conflict(request_id,quote_id) do update set status='PENDING',amount=excluded.amount,requested_by=excluded.requested_by,requested_at=now(),decided_by=null,decided_at=null,comment=''
 returning * into v_approval;
 insert into public.procurement_events(organization_id,project_id,request_id,rfq_id,quote_id,actor_user_id,event_type,metadata)
 values(v_quote.organization_id,v_request.project_id,v_request.id,v_rfq.id,v_quote.id,auth.uid(),'QUOTE_SELECTED',jsonb_build_object('total',v_quote.total));
 return v_approval;
end $$;

create or replace function public.decide_procurement_approval(p_approval_id uuid,p_decision public.procurement_approval_status,p_comment text default '')
returns public.procurement_orders language plpgsql security definer set search_path=public as $$
declare v_approval public.procurement_approvals; v_quote public.procurement_quotes; v_rfq public.procurement_rfqs; v_request public.procurement_requests; v_order public.procurement_orders;
begin
 if p_decision not in ('APPROVED','REJECTED') then raise exception 'Decisão inválida.'; end if;
 select * into v_approval from public.procurement_approvals where id=p_approval_id for update;
 if not found or v_approval.status<>'PENDING' then raise exception 'Aprovação pendente não encontrada.'; end if;
 select * into v_quote from public.procurement_quotes where id=v_approval.quote_id;
 select * into v_rfq from public.procurement_rfqs where id=v_quote.rfq_id;
 select * into v_request from public.procurement_requests where id=v_approval.request_id for update;
 if not public.has_module_permission(v_approval.organization_id,'compras','READ',v_request.project_id,'approve') then raise exception 'Permissão insuficiente para aprovar.'; end if;
 update public.procurement_approvals set status=p_decision,decided_by=auth.uid(),decided_at=now(),comment=coalesce(p_comment,'') where id=v_approval.id;
 if p_decision='REJECTED' then
  update public.procurement_requests set status='IN_QUOTATION',updated_at=now() where id=v_request.id;
  update public.procurement_quotes set status='SUBMITTED',updated_at=now() where id=v_quote.id;
  insert into public.procurement_events(organization_id,project_id,request_id,quote_id,actor_user_id,event_type,metadata)
  values(v_approval.organization_id,v_request.project_id,v_request.id,v_quote.id,auth.uid(),'APPROVAL_REJECTED',jsonb_build_object('comment',p_comment));
  return null;
 end if;
 insert into public.procurement_orders(organization_id,project_id,request_id,quote_id,supplier_id,code,status,currency,subtotal,discount,freight,taxes,total,payment_terms,expected_at,issued_at,issued_by,notes)
 values(v_quote.organization_id,v_request.project_id,v_request.id,v_quote.id,v_quote.supplier_id,'PC-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),'ISSUED',v_quote.currency,v_quote.subtotal,v_quote.discount,v_quote.freight,v_quote.taxes,v_quote.total,v_quote.payment_terms,case when v_quote.lead_time_days is null then null else current_date+v_quote.lead_time_days end,now(),auth.uid(),v_quote.notes)
 returning * into v_order;
 insert into public.procurement_order_items(organization_id,order_id,request_item_id,description,specification,unit,ordered_quantity,unit_price,total)
 select v_quote.organization_id,v_order.id,ri.id,ri.description,coalesce(nullif(qi.offered_specification,''),ri.specification),ri.unit,qi.quantity,qi.unit_price,qi.total
 from public.procurement_quote_items qi join public.procurement_request_items ri on ri.id=qi.request_item_id where qi.quote_id=v_quote.id;
 update public.procurement_requests set status='ORDERED',updated_at=now() where id=v_request.id;
 insert into public.procurement_events(organization_id,project_id,request_id,quote_id,order_id,actor_user_id,event_type,metadata)
 values(v_order.organization_id,v_order.project_id,v_order.request_id,v_order.quote_id,v_order.id,auth.uid(),'ORDER_ISSUED',jsonb_build_object('code',v_order.code,'total',v_order.total));
 return v_order;
end $$;

create or replace function public.finalize_procurement_receipt(p_receipt_id uuid)
returns public.procurement_receipts language plpgsql security definer set search_path=public as $$
declare v public.procurement_receipts; v_order public.procurement_orders; r record; v_remaining numeric; v_rejected numeric; v_open integer;
begin
 select * into v from public.procurement_receipts where id=p_receipt_id for update;
 if not found or v.status<>'DRAFT' then raise exception 'Recebimento em rascunho não encontrado.'; end if;
 select * into v_order from public.procurement_orders where id=v.order_id for update;
 for r in select ri.*,oi.received_quantity as prior_received,oi.ordered_quantity from public.procurement_receipt_items ri join public.procurement_order_items oi on oi.id=ri.order_item_id where ri.receipt_id=v.id loop
  v_remaining:=r.ordered_quantity-r.prior_received;
  if r.received_quantity>v_remaining then raise exception 'Quantidade recebida superior ao saldo do pedido.'; end if;
  update public.procurement_order_items set received_quantity=received_quantity+r.received_quantity where id=r.order_item_id;
 end loop;
 select coalesce(sum(rejected_quantity),0) into v_rejected from public.procurement_receipt_items where receipt_id=v.id;
 update public.procurement_receipts set status=case when v_rejected>0 then 'ACCEPTED_WITH_RESTRICTION' else 'ACCEPTED' end,updated_at=now() where id=v.id returning * into v;
 select count(*) into v_open from public.procurement_order_items where order_id=v_order.id and received_quantity<ordered_quantity;
 update public.procurement_orders set status=case when v_open=0 then 'RECEIVED' else 'PARTIALLY_RECEIVED' end,updated_at=now() where id=v_order.id;
 update public.procurement_requests set status=case when v_open=0 then 'RECEIVED' else 'PARTIALLY_RECEIVED' end,updated_at=now() where id=v_order.request_id;
 insert into public.procurement_events(organization_id,project_id,request_id,order_id,receipt_id,event_type,metadata)
 values(v.organization_id,v.project_id,v_order.request_id,v.order_id,v.id,'RECEIPT_FINALIZED',jsonb_build_object('status',v.status,'hasRejected',v_rejected>0));
 return v;
end $$;

revoke all on function public.submit_procurement_request(uuid) from public,anon;
revoke all on function public.open_procurement_rfq(uuid) from public,anon;
revoke all on function public.select_procurement_quote(uuid) from public,anon;
revoke all on function public.decide_procurement_approval(uuid,public.procurement_approval_status,text) from public,anon;
revoke all on function public.finalize_procurement_quote(uuid) from public,anon,authenticated;
revoke all on function public.finalize_procurement_receipt(uuid) from public,anon,authenticated;
grant execute on function public.submit_procurement_request(uuid) to authenticated,service_role;
grant execute on function public.open_procurement_rfq(uuid) to authenticated,service_role;
grant execute on function public.select_procurement_quote(uuid) to authenticated,service_role;
grant execute on function public.decide_procurement_approval(uuid,public.procurement_approval_status,text) to authenticated,service_role;
grant execute on function public.finalize_procurement_quote(uuid) to service_role;
grant execute on function public.finalize_procurement_receipt(uuid) to service_role;
