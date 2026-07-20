-- Etapa 15 — Financeiro Operacional.

create extension if not exists pgcrypto;

do $$ begin create type public.finance_entry_direction as enum ('PAYABLE','RECEIVABLE'); exception when duplicate_object then null; end $$;
do $$ begin create type public.finance_entry_source as enum ('MANUAL','CONTRACT','AMENDMENT','PROCUREMENT_ORDER','MEASUREMENT'); exception when duplicate_object then null; end $$;
do $$ begin create type public.finance_entry_status as enum ('DRAFT','PENDING_APPROVAL','APPROVED','PARTIALLY_SETTLED','SETTLED','OVERDUE','CANCELED'); exception when duplicate_object then null; end $$;
do $$ begin create type public.finance_installment_status as enum ('OPEN','PARTIALLY_SETTLED','SETTLED','OVERDUE','CANCELED'); exception when duplicate_object then null; end $$;
do $$ begin create type public.finance_approval_status as enum ('PENDING','APPROVED','REJECTED','CANCELED'); exception when duplicate_object then null; end $$;
do $$ begin create type public.finance_settlement_method as enum ('PIX','BANK_TRANSFER','BOLETO','CASH','CARD','CHECK','OFFSET','OTHER'); exception when duplicate_object then null; end $$;
do $$ begin create type public.finance_measurement_status as enum ('DRAFT','SUBMITTED','APPROVED','REJECTED','INVOICED','CANCELED'); exception when duplicate_object then null; end $$;

create table if not exists public.finance_categories (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 code text not null, name text not null, direction public.finance_entry_direction, active boolean not null default true,
 created_by uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,code)
);

create table if not exists public.finance_cost_centers (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 project_id uuid references public.projects(id) on delete set null, code text not null, name text not null,
 active boolean not null default true, created_by uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,code)
);

create table if not exists public.finance_cash_accounts (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 name text not null, account_type text not null default 'BANK' check(account_type in ('BANK','CASH','DIGITAL')),
 bank_name text, branch text, account_last4 text, opening_balance numeric(18,2) not null default 0,
 active boolean not null default true, created_by uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,name)
);

create table if not exists public.finance_measurements (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 project_id uuid not null references public.projects(id) on delete restrict,
 contract_id uuid not null references public.contracts(id) on delete restrict,
 client_id uuid not null references public.clients(id) on delete restrict,
 code text not null, period_start date not null, period_end date not null, due_date date not null,
 description text not null default '', status public.finance_measurement_status not null default 'DRAFT',
 gross_amount numeric(18,2) not null default 0, retention_amount numeric(18,2) not null default 0 check(retention_amount>=0),
 deduction_amount numeric(18,2) not null default 0 check(deduction_amount>=0),
 net_amount numeric(18,2) generated always as (greatest(0,gross_amount-retention_amount-deduction_amount)) stored,
 submitted_at timestamptz, reviewed_at timestamptz, reviewed_by uuid, review_comment text not null default '',
 created_by uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,code), check(period_end>=period_start)
);

create table if not exists public.finance_measurement_items (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 measurement_id uuid not null references public.finance_measurements(id) on delete cascade,
 line_number integer not null check(line_number>0), description text not null, unit text not null,
 previous_quantity numeric(18,4) not null default 0 check(previous_quantity>=0),
 current_quantity numeric(18,4) not null check(current_quantity>=0),
 cumulative_quantity numeric(18,4) generated always as (previous_quantity+current_quantity) stored,
 unit_price numeric(18,4) not null check(unit_price>=0),
 amount numeric(18,2) generated always as (round(current_quantity*unit_price,2)) stored,
 notes text not null default '', created_at timestamptz not null default now(), unique(measurement_id,line_number)
);

create table if not exists public.finance_entries (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 project_id uuid references public.projects(id) on delete set null,
 client_id uuid references public.clients(id) on delete set null,
 supplier_id uuid references public.procurement_suppliers(id) on delete set null,
 contract_id uuid references public.contracts(id) on delete set null,
 amendment_id uuid references public.amendments(id) on delete set null,
 procurement_order_id uuid references public.procurement_orders(id) on delete set null,
 measurement_id uuid references public.finance_measurements(id) on delete set null,
 category_id uuid references public.finance_categories(id) on delete set null,
 cost_center_id uuid references public.finance_cost_centers(id) on delete set null,
 code text not null, direction public.finance_entry_direction not null,
 source_type public.finance_entry_source not null default 'MANUAL', description text not null,
 document_number text, status public.finance_entry_status not null default 'DRAFT', currency text not null default 'BRL',
 total_amount numeric(18,2) not null check(total_amount>0), issue_date date not null default current_date,
 competence_date date, notes text not null default '', approved_at timestamptz, canceled_at timestamptz,
 cancel_reason text, created_by uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,code)
);

create unique index if not exists finance_entry_procurement_source_uidx on public.finance_entries(procurement_order_id)
 where procurement_order_id is not null and source_type='PROCUREMENT_ORDER';
create unique index if not exists finance_entry_contract_source_uidx on public.finance_entries(contract_id)
 where contract_id is not null and source_type='CONTRACT';
create unique index if not exists finance_entry_measurement_source_uidx on public.finance_entries(measurement_id)
 where measurement_id is not null and source_type='MEASUREMENT';

create table if not exists public.finance_installments (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 entry_id uuid not null references public.finance_entries(id) on delete cascade,
 installment_number integer not null check(installment_number>0), due_date date not null,
 original_amount numeric(18,2) not null check(original_amount>0), discount_amount numeric(18,2) not null default 0 check(discount_amount>=0),
 interest_amount numeric(18,2) not null default 0 check(interest_amount>=0), penalty_amount numeric(18,2) not null default 0 check(penalty_amount>=0),
 total_due numeric(18,2) generated always as (greatest(0,original_amount-discount_amount+interest_amount+penalty_amount)) stored,
 settled_amount numeric(18,2) not null default 0 check(settled_amount>=0),
 balance numeric(18,2) generated always as (greatest(0,original_amount-discount_amount+interest_amount+penalty_amount-settled_amount)) stored,
 status public.finance_installment_status not null default 'OPEN', barcode text, pix_key text, notes text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(entry_id,installment_number), check(settled_amount<=original_amount-discount_amount+interest_amount+penalty_amount)
);

create table if not exists public.finance_approvals (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 entry_id uuid not null references public.finance_entries(id) on delete cascade,
 status public.finance_approval_status not null default 'PENDING', amount numeric(18,2) not null,
 requested_by uuid, requested_at timestamptz not null default now(), decided_by uuid, decided_at timestamptz,
 comment text not null default '', unique(entry_id)
);

create table if not exists public.finance_settlements (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 installment_id uuid not null references public.finance_installments(id) on delete restrict,
 cash_account_id uuid references public.finance_cash_accounts(id) on delete set null,
 amount numeric(18,2) not null check(amount>0), settled_at timestamptz not null default now(),
 method public.finance_settlement_method not null, reference text, notes text not null default '',
 created_by uuid, created_at timestamptz not null default now()
);

create table if not exists public.finance_attachments (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 entry_id uuid references public.finance_entries(id) on delete cascade,
 settlement_id uuid references public.finance_settlements(id) on delete cascade,
 file_name text not null, mime_type text not null, size_bytes bigint not null check(size_bytes>0),
 storage_path text not null unique, sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 created_by uuid, created_at timestamptz not null default now(),
 check((entry_id is not null)::int+(settlement_id is not null)::int=1)
);

create table if not exists public.finance_events (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 project_id uuid references public.projects(id) on delete set null,
 entry_id uuid references public.finance_entries(id) on delete set null,
 installment_id uuid references public.finance_installments(id) on delete set null,
 measurement_id uuid references public.finance_measurements(id) on delete set null,
 actor_user_id uuid, event_type text not null, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);

create index if not exists finance_categories_org_active_idx on public.finance_categories(organization_id,active,name);
create index if not exists finance_cost_centers_org_project_idx on public.finance_cost_centers(organization_id,project_id,active);
create index if not exists finance_cash_accounts_org_active_idx on public.finance_cash_accounts(organization_id,active,name);
create index if not exists finance_measurements_project_status_idx on public.finance_measurements(project_id,status,period_end desc);
create index if not exists finance_measurement_items_measurement_idx on public.finance_measurement_items(measurement_id,line_number);
create index if not exists finance_entries_org_status_idx on public.finance_entries(organization_id,status,issue_date desc);
create index if not exists finance_entries_project_direction_idx on public.finance_entries(project_id,direction,status);
create index if not exists finance_installments_due_idx on public.finance_installments(organization_id,status,due_date);
create index if not exists finance_installments_entry_idx on public.finance_installments(entry_id,installment_number);
create index if not exists finance_approvals_pending_idx on public.finance_approvals(organization_id,status,requested_at);
create index if not exists finance_settlements_installment_idx on public.finance_settlements(installment_id,settled_at desc);
create index if not exists finance_settlements_cash_idx on public.finance_settlements(cash_account_id,settled_at desc) where cash_account_id is not null;
create index if not exists finance_attachments_entry_idx on public.finance_attachments(entry_id) where entry_id is not null;
create index if not exists finance_attachments_settlement_idx on public.finance_attachments(settlement_id) where settlement_id is not null;
create index if not exists finance_events_org_created_idx on public.finance_events(organization_id,created_at desc);

create or replace view public.finance_entry_balances_v with (security_invoker=true) as
select entry.id,entry.organization_id,entry.project_id,entry.direction,entry.status,entry.total_amount,
 coalesce(sum(installment.total_due),0)::numeric(18,2) as scheduled_amount,
 coalesce(sum(installment.settled_amount),0)::numeric(18,2) as settled_amount,
 coalesce(sum(installment.balance),0)::numeric(18,2) as balance
from public.finance_entries entry
left join public.finance_installments installment on installment.entry_id=entry.id
group by entry.id;

create or replace view public.finance_cash_flow_monthly_v with (security_invoker=true) as
select organization_id,project_id,month,
 sum(planned_inflow)::numeric(18,2) planned_inflow,
 sum(planned_outflow)::numeric(18,2) planned_outflow,
 sum(realized_inflow)::numeric(18,2) realized_inflow,
 sum(realized_outflow)::numeric(18,2) realized_outflow
from (
 select entry.organization_id,entry.project_id,date_trunc('month',installment.due_date)::date month,
  case when entry.direction='RECEIVABLE' then installment.total_due else 0 end planned_inflow,
  case when entry.direction='PAYABLE' then installment.total_due else 0 end planned_outflow,
  0::numeric realized_inflow,0::numeric realized_outflow
 from public.finance_installments installment join public.finance_entries entry on entry.id=installment.entry_id
 where installment.status<>'CANCELED' and entry.status<>'CANCELED'
 union all
 select entry.organization_id,entry.project_id,date_trunc('month',settlement.settled_at)::date month,
  0::numeric,0::numeric,
  case when entry.direction='RECEIVABLE' then settlement.amount else 0 end,
  case when entry.direction='PAYABLE' then settlement.amount else 0 end
 from public.finance_settlements settlement
 join public.finance_installments installment on installment.id=settlement.installment_id
 join public.finance_entries entry on entry.id=installment.entry_id
) cash
 group by organization_id,project_id,month;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('finance-attachments','finance-attachments',false,26214400,array['application/pdf','image/png','image/jpeg','image/webp','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
