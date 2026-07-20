-- Etapa 14 — Compras e Suprimentos: solicitação → cotação → aprovação → pedido → recebimento → FVM.

create extension if not exists pgcrypto;

do $$ begin create type public.procurement_supplier_status as enum ('INVITED','ACTIVE','SUSPENDED','ARCHIVED'); exception when duplicate_object then null; end $$;
do $$ begin create type public.procurement_request_priority as enum ('LOW','NORMAL','HIGH','URGENT'); exception when duplicate_object then null; end $$;
do $$ begin create type public.procurement_request_status as enum ('DRAFT','SUBMITTED','IN_QUOTATION','UNDER_APPROVAL','APPROVED','ORDERED','PARTIALLY_RECEIVED','RECEIVED','CANCELED'); exception when duplicate_object then null; end $$;
do $$ begin create type public.procurement_rfq_status as enum ('DRAFT','OPEN','CLOSED','AWARDED','CANCELED'); exception when duplicate_object then null; end $$;
do $$ begin create type public.procurement_quote_status as enum ('DRAFT','SUBMITTED','SELECTED','REJECTED','WITHDRAWN'); exception when duplicate_object then null; end $$;
do $$ begin create type public.procurement_approval_status as enum ('PENDING','APPROVED','REJECTED','CANCELED'); exception when duplicate_object then null; end $$;
do $$ begin create type public.procurement_order_status as enum ('DRAFT','ISSUED','PARTIALLY_RECEIVED','RECEIVED','CANCELED'); exception when duplicate_object then null; end $$;
do $$ begin create type public.procurement_receipt_status as enum ('DRAFT','SUBMITTED','ACCEPTED','ACCEPTED_WITH_RESTRICTION','REJECTED'); exception when duplicate_object then null; end $$;

create table if not exists public.procurement_suppliers (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 legal_name text not null, trade_name text, tax_id text, email text not null, phone text, categories text[] not null default '{}',
 status public.procurement_supplier_status not null default 'INVITED', notes text not null default '', invited_at timestamptz,
 activated_at timestamptz, created_by uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,email), unique(organization_id,tax_id)
);

create table if not exists public.procurement_requests (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 project_id uuid not null references public.projects(id) on delete restrict, code text not null, title text not null,
 description text not null default '', priority public.procurement_request_priority not null default 'NORMAL',
 status public.procurement_request_status not null default 'DRAFT', needed_by date, cost_center text, requested_by uuid,
 submitted_at timestamptz, canceled_at timestamptz, cancel_reason text, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), unique(organization_id,code)
);

create table if not exists public.procurement_request_items (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 request_id uuid not null references public.procurement_requests(id) on delete cascade, line_number integer not null check(line_number>0),
 description text not null, specification text not null default '', unit text not null, quantity numeric(16,4) not null check(quantity>0),
 target_unit_price numeric(16,4), notes text not null default '', created_at timestamptz not null default now(),
 unique(request_id,line_number)
);

create table if not exists public.procurement_rfqs (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 request_id uuid not null references public.procurement_requests(id) on delete restrict, code text not null,
 status public.procurement_rfq_status not null default 'DRAFT', currency text not null default 'BRL', due_at timestamptz,
 terms text not null default '', opened_at timestamptz, closed_at timestamptz, created_by uuid,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,code)
);

create table if not exists public.procurement_supplier_invitations (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 rfq_id uuid not null references public.procurement_rfqs(id) on delete cascade,
 supplier_id uuid not null references public.procurement_suppliers(id) on delete restrict,
 token_sha256 text not null unique check(token_sha256 ~ '^[a-f0-9]{64}$'), expires_at timestamptz,
 revoked_at timestamptz, opened_at timestamptz, responded_at timestamptz, access_count integer not null default 0,
 created_by uuid, created_at timestamptz not null default now(), unique(rfq_id,supplier_id)
);

create table if not exists public.procurement_quotes (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 rfq_id uuid not null references public.procurement_rfqs(id) on delete restrict,
 supplier_id uuid not null references public.procurement_suppliers(id) on delete restrict,
 invitation_id uuid references public.procurement_supplier_invitations(id) on delete set null,
 status public.procurement_quote_status not null default 'DRAFT', currency text not null default 'BRL',
 subtotal numeric(16,2) not null default 0, discount numeric(16,2) not null default 0,
 freight numeric(16,2) not null default 0, taxes numeric(16,2) not null default 0, total numeric(16,2) not null default 0,
 payment_terms text not null default '', lead_time_days integer check(lead_time_days is null or lead_time_days>=0),
 validity_date date, notes text not null default '', attachment_name text, attachment_mime_type text,
 attachment_size_bytes bigint, attachment_storage_path text, attachment_sha256 text,
 submitted_at timestamptz, selected_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(rfq_id,supplier_id), check(attachment_sha256 is null or attachment_sha256 ~ '^[a-f0-9]{64}$')
);

create table if not exists public.procurement_quote_items (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 quote_id uuid not null references public.procurement_quotes(id) on delete cascade,
 request_item_id uuid not null references public.procurement_request_items(id) on delete restrict,
 quantity numeric(16,4) not null check(quantity>0), unit_price numeric(16,4) not null check(unit_price>=0),
 total numeric(16,2) generated always as (round(quantity*unit_price,2)) stored,
 brand text, offered_specification text not null default '', notes text not null default '', unique(quote_id,request_item_id)
);

create table if not exists public.procurement_approvals (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 request_id uuid not null references public.procurement_requests(id) on delete restrict,
 quote_id uuid not null references public.procurement_quotes(id) on delete restrict,
 status public.procurement_approval_status not null default 'PENDING', amount numeric(16,2) not null,
 requested_by uuid, requested_at timestamptz not null default now(), decided_by uuid, decided_at timestamptz,
 comment text not null default '', unique(request_id,quote_id)
);

create table if not exists public.procurement_orders (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 project_id uuid not null references public.projects(id) on delete restrict,
 request_id uuid not null references public.procurement_requests(id) on delete restrict,
 quote_id uuid not null references public.procurement_quotes(id) on delete restrict,
 supplier_id uuid not null references public.procurement_suppliers(id) on delete restrict,
 code text not null, status public.procurement_order_status not null default 'DRAFT', currency text not null default 'BRL',
 subtotal numeric(16,2) not null, discount numeric(16,2) not null default 0, freight numeric(16,2) not null default 0,
 taxes numeric(16,2) not null default 0, total numeric(16,2) not null, payment_terms text not null default '',
 expected_at date, issued_at timestamptz, issued_by uuid, notes text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,code)
);

create table if not exists public.procurement_order_items (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 order_id uuid not null references public.procurement_orders(id) on delete cascade,
 request_item_id uuid not null references public.procurement_request_items(id) on delete restrict,
 description text not null, specification text not null default '', unit text not null,
 ordered_quantity numeric(16,4) not null check(ordered_quantity>0), received_quantity numeric(16,4) not null default 0 check(received_quantity>=0),
 unit_price numeric(16,4) not null check(unit_price>=0), total numeric(16,2) not null, unique(order_id,request_item_id),
 check(received_quantity<=ordered_quantity)
);

create table if not exists public.procurement_receipts (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 project_id uuid not null references public.projects(id) on delete restrict,
 order_id uuid not null references public.procurement_orders(id) on delete restrict,
 code text not null, status public.procurement_receipt_status not null default 'DRAFT', invoice_number text,
 received_at timestamptz not null default now(), received_by uuid, notes text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,code)
);

create table if not exists public.procurement_receipt_items (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 receipt_id uuid not null references public.procurement_receipts(id) on delete cascade,
 order_item_id uuid not null references public.procurement_order_items(id) on delete restrict,
 received_quantity numeric(16,4) not null check(received_quantity>0), accepted_quantity numeric(16,4) not null default 0 check(accepted_quantity>=0),
 rejected_quantity numeric(16,4) not null default 0 check(rejected_quantity>=0), notes text not null default '',
 unique(receipt_id,order_item_id), check(accepted_quantity+rejected_quantity<=received_quantity)
);

create table if not exists public.procurement_receipt_quality (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 receipt_id uuid not null references public.procurement_receipts(id) on delete cascade,
 assignment_id uuid references public.quality_form_assignments(id) on delete set null,
 response_id uuid references public.quality_form_responses(id) on delete set null,
 created_at timestamptz not null default now(), unique(receipt_id)
);

create table if not exists public.procurement_events (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 project_id uuid references public.projects(id) on delete set null, request_id uuid references public.procurement_requests(id) on delete set null,
 rfq_id uuid references public.procurement_rfqs(id) on delete set null, quote_id uuid references public.procurement_quotes(id) on delete set null,
 order_id uuid references public.procurement_orders(id) on delete set null, receipt_id uuid references public.procurement_receipts(id) on delete set null,
 actor_user_id uuid, event_type text not null, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create index if not exists procurement_suppliers_org_status_idx on public.procurement_suppliers(organization_id,status,legal_name);
create index if not exists procurement_requests_project_status_idx on public.procurement_requests(project_id,status,created_at desc);
create index if not exists procurement_request_items_request_idx on public.procurement_request_items(request_id,line_number);
create index if not exists procurement_rfqs_request_idx on public.procurement_rfqs(request_id,status);
create index if not exists procurement_invitations_rfq_idx on public.procurement_supplier_invitations(rfq_id,revoked_at);
create index if not exists procurement_quotes_rfq_status_idx on public.procurement_quotes(rfq_id,status,total);
create index if not exists procurement_quote_items_quote_idx on public.procurement_quote_items(quote_id);
create index if not exists procurement_approvals_status_idx on public.procurement_approvals(organization_id,status,requested_at);
create index if not exists procurement_orders_project_status_idx on public.procurement_orders(project_id,status,created_at desc);
create index if not exists procurement_order_items_order_idx on public.procurement_order_items(order_id);
create index if not exists procurement_receipts_order_idx on public.procurement_receipts(order_id,received_at desc);
create index if not exists procurement_receipt_items_receipt_idx on public.procurement_receipt_items(receipt_id);
create index if not exists procurement_events_org_created_idx on public.procurement_events(organization_id,created_at desc);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('procurement-attachments','procurement-attachments',false,26214400,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
