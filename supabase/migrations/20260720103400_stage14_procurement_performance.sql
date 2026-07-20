-- Etapa 14 — índices de apoio às relações e consultas de auditoria.

create index if not exists procurement_request_items_org_idx on public.procurement_request_items(organization_id);
create index if not exists procurement_invitations_org_idx on public.procurement_supplier_invitations(organization_id);
create index if not exists procurement_quotes_org_idx on public.procurement_quotes(organization_id);
create index if not exists procurement_quotes_invitation_idx on public.procurement_quotes(invitation_id) where invitation_id is not null;
create index if not exists procurement_quote_items_org_idx on public.procurement_quote_items(organization_id);
create index if not exists procurement_orders_request_idx on public.procurement_orders(request_id);
create index if not exists procurement_orders_quote_idx on public.procurement_orders(quote_id);
create index if not exists procurement_orders_supplier_idx on public.procurement_orders(supplier_id);
create index if not exists procurement_order_items_org_idx on public.procurement_order_items(organization_id);
create index if not exists procurement_receipts_project_idx on public.procurement_receipts(project_id);
create index if not exists procurement_receipt_items_org_idx on public.procurement_receipt_items(organization_id);
create index if not exists procurement_receipt_quality_org_idx on public.procurement_receipt_quality(organization_id);
create index if not exists procurement_receipt_quality_assignment_idx on public.procurement_receipt_quality(assignment_id) where assignment_id is not null;
create index if not exists procurement_receipt_quality_response_idx on public.procurement_receipt_quality(response_id) where response_id is not null;
create index if not exists procurement_events_project_idx on public.procurement_events(project_id) where project_id is not null;
create index if not exists procurement_events_request_idx on public.procurement_events(request_id) where request_id is not null;
create index if not exists procurement_events_rfq_idx on public.procurement_events(rfq_id) where rfq_id is not null;
create index if not exists procurement_events_quote_idx on public.procurement_events(quote_id) where quote_id is not null;
create index if not exists procurement_events_order_idx on public.procurement_events(order_id) where order_id is not null;
create index if not exists procurement_events_receipt_idx on public.procurement_events(receipt_id) where receipt_id is not null;
