-- Etapa 15 — índices de apoio às relações financeiras.

create index if not exists finance_measurement_items_org_idx on public.finance_measurement_items(organization_id);
create index if not exists finance_measurements_contract_idx on public.finance_measurements(contract_id);
create index if not exists finance_measurements_client_idx on public.finance_measurements(client_id);
create index if not exists finance_entries_client_idx on public.finance_entries(client_id) where client_id is not null;
create index if not exists finance_entries_supplier_idx on public.finance_entries(supplier_id) where supplier_id is not null;
create index if not exists finance_entries_amendment_idx on public.finance_entries(amendment_id) where amendment_id is not null;
create index if not exists finance_entries_category_idx on public.finance_entries(category_id) where category_id is not null;
create index if not exists finance_entries_cost_center_idx on public.finance_entries(cost_center_id) where cost_center_id is not null;
create index if not exists finance_settlements_org_idx on public.finance_settlements(organization_id);
create index if not exists finance_attachments_org_idx on public.finance_attachments(organization_id);
create index if not exists finance_events_project_idx on public.finance_events(project_id) where project_id is not null;
create index if not exists finance_events_entry_idx on public.finance_events(entry_id) where entry_id is not null;
create index if not exists finance_events_installment_idx on public.finance_events(installment_id) where installment_id is not null;
create index if not exists finance_events_measurement_idx on public.finance_events(measurement_id) where measurement_id is not null;
