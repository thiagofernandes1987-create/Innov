-- R2/FND-R1-0002 — enforce procurement parent-chain integrity.

create or replace function public.assert_procurement_quote_item_parent_chain()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_quote_org uuid; v_request_id uuid; v_item_org uuid; v_item_request uuid;
begin
 select q.organization_id,r.request_id into v_quote_org,v_request_id
 from public.procurement_quotes q join public.procurement_rfqs r on r.id=q.rfq_id
 where q.id=new.quote_id for key share of q,r;
 if not found then raise exception using errcode='23503',message='Cotação pai não encontrada.'; end if;
 select organization_id,request_id into v_item_org,v_item_request from public.procurement_request_items
 where id=new.request_item_id for key share;
 if not found then raise exception using errcode='23503',message='Item da solicitação não encontrado.'; end if;
 if new.organization_id<>v_quote_org or v_item_org<>v_quote_org or v_item_request<>v_request_id then
  raise exception using errcode='23514',message='Item da cotação não pertence à solicitação e organização do RFQ.';
 end if;
 return new;
end $$;

create or replace function public.assert_procurement_receipt_item_parent_chain()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_receipt_org uuid; v_order_id uuid; v_item_org uuid; v_item_order uuid;
begin
 select r.organization_id,r.order_id into v_receipt_org,v_order_id from public.procurement_receipts r
 where r.id=new.receipt_id for key share;
 if not found then raise exception using errcode='23503',message='Recebimento pai não encontrado.'; end if;
 select organization_id,order_id into v_item_org,v_item_order from public.procurement_order_items
 where id=new.order_item_id for key share;
 if not found then raise exception using errcode='23503',message='Item do pedido não encontrado.'; end if;
 if new.organization_id<>v_receipt_org or v_item_org<>v_receipt_org or v_item_order<>v_order_id then
  raise exception using errcode='23514',message='Item recebido não pertence ao pedido e organização do recebimento.';
 end if;
 return new;
end $$;

-- Fail the migration if legacy rows already violate the intended chain.
do $$ begin
 if exists(select 1 from public.procurement_quote_items qi join public.procurement_quotes q on q.id=qi.quote_id join public.procurement_rfqs r on r.id=q.rfq_id join public.procurement_request_items ri on ri.id=qi.request_item_id where qi.organization_id<>q.organization_id or ri.organization_id<>q.organization_id or ri.request_id<>r.request_id) then
  raise exception 'Existem itens de cotação com cadeia pai-filho inválida.';
 end if;
 if exists(select 1 from public.procurement_receipt_items ri join public.procurement_receipts r on r.id=ri.receipt_id join public.procurement_order_items oi on oi.id=ri.order_item_id where ri.organization_id<>r.organization_id or oi.organization_id<>r.organization_id or oi.order_id<>r.order_id) then
  raise exception 'Existem itens de recebimento com cadeia pai-filho inválida.';
 end if;
end $$;

drop trigger if exists procurement_quote_items_parent_chain_guard on public.procurement_quote_items;
create trigger procurement_quote_items_parent_chain_guard before insert or update of organization_id,quote_id,request_item_id
on public.procurement_quote_items for each row execute function public.assert_procurement_quote_item_parent_chain();

drop trigger if exists procurement_receipt_items_parent_chain_guard on public.procurement_receipt_items;
create trigger procurement_receipt_items_parent_chain_guard before insert or update of organization_id,receipt_id,order_item_id
on public.procurement_receipt_items for each row execute function public.assert_procurement_receipt_item_parent_chain();

revoke all on function public.assert_procurement_quote_item_parent_chain() from public,anon,authenticated;
revoke all on function public.assert_procurement_receipt_item_parent_chain() from public,anon,authenticated;
