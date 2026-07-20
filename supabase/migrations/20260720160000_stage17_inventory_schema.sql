-- Etapa 17 — Estoque, Inventário e Almoxarifado.

create extension if not exists pgcrypto;

do $$ begin
  create type public.inventory_item_kind as enum ('MATERIAL','CONSUMABLE','TOOL','ASSET');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inventory_warehouse_kind as enum ('GENERAL','PROJECT','MOBILE','EXTERNAL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inventory_movement_type as enum (
    'PROCUREMENT_RECEIPT','MANUAL_IN','ISSUE','RETURN','TRANSFER','LOSS','ADJUSTMENT','REVERSAL'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inventory_movement_status as enum ('DRAFT','POSTED','REVERSED','CANCELED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inventory_reservation_status as enum (
    'DRAFT','ACTIVE','PARTIALLY_CONSUMED','CONSUMED','RELEASED','EXPIRED','CANCELED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inventory_asset_status as enum ('AVAILABLE','IN_USE','MAINTENANCE','LOST','RETIRED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inventory_custody_status as enum ('ACTIVE','RETURNED','LOST','CANCELED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inventory_maintenance_status as enum ('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inventory_stocktake_status as enum (
    'DRAFT','COUNTING','UNDER_REVIEW','APPROVED','POSTED','CANCELED'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.inventory_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  parent_id uuid references public.inventory_categories(id) on delete restrict,
  code text not null,
  name text not null,
  description text not null default '',
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (organization_id, name),
  check (length(trim(code)) > 0),
  check (length(trim(name)) > 0),
  check (parent_id is null or parent_id <> id)
);

create table if not exists public.inventory_units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  decimal_places smallint not null default 4 check (decimal_places between 0 and 6),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  check (length(trim(code)) > 0),
  check (length(trim(name)) > 0)
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category_id uuid references public.inventory_categories(id) on delete set null,
  unit_id uuid not null references public.inventory_units(id) on delete restrict,
  code text not null,
  sku text,
  barcode text,
  name text not null,
  description text not null default '',
  specification text not null default '',
  kind public.inventory_item_kind not null default 'MATERIAL',
  minimum_stock numeric(18,4) not null default 0 check (minimum_stock >= 0),
  reference_unit_cost numeric(18,4) check (reference_unit_cost is null or reference_unit_cost >= 0),
  controls_lot boolean not null default false,
  controls_expiry boolean not null default false,
  controls_individual_asset boolean not null default false,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  check (length(trim(code)) > 0),
  check (length(trim(name)) > 0),
  check (not controls_expiry or controls_lot),
  check (not controls_individual_asset or kind in ('TOOL','ASSET'))
);

create unique index if not exists inventory_items_org_sku_uidx
  on public.inventory_items(organization_id, lower(sku)) where sku is not null and length(trim(sku)) > 0;
create unique index if not exists inventory_items_org_barcode_uidx
  on public.inventory_items(organization_id, barcode) where barcode is not null and length(trim(barcode)) > 0;

create table if not exists public.inventory_warehouses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete restrict,
  code text not null,
  name text not null,
  kind public.inventory_warehouse_kind not null default 'GENERAL',
  address text not null default '',
  responsible_user_id uuid references auth.users(id) on delete set null,
  allows_negative_stock boolean not null default false,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  check (length(trim(code)) > 0),
  check (length(trim(name)) > 0),
  check ((kind = 'PROJECT' and project_id is not null) or kind <> 'PROJECT')
);

create table if not exists public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  warehouse_id uuid not null references public.inventory_warehouses(id) on delete cascade,
  code text not null,
  name text not null,
  description text not null default '',
  is_default boolean not null default false,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (warehouse_id, code),
  check (length(trim(code)) > 0),
  check (length(trim(name)) > 0)
);

create unique index if not exists inventory_locations_default_uidx
  on public.inventory_locations(warehouse_id) where is_default and active;

create table if not exists public.inventory_lots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  supplier_id uuid references public.procurement_suppliers(id) on delete set null,
  batch_number text not null,
  manufactured_on date,
  expires_on date,
  notes text not null default '',
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, item_id, batch_number),
  check (length(trim(batch_number)) > 0),
  check (expires_on is null or manufactured_on is null or expires_on >= manufactured_on)
);

create table if not exists public.inventory_procurement_item_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_item_id uuid not null references public.procurement_order_items(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  conversion_factor numeric(18,6) not null default 1 check (conversion_factor > 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_item_id)
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete restrict,
  code text not null,
  movement_type public.inventory_movement_type not null,
  status public.inventory_movement_status not null default 'DRAFT',
  occurred_at timestamptz not null default now(),
  reason text not null default '',
  notes text not null default '',
  source_type text,
  source_id uuid,
  idempotency_key text,
  reversed_movement_id uuid references public.inventory_movements(id) on delete restrict,
  created_by uuid references auth.users(id) on delete set null,
  posted_by uuid references auth.users(id) on delete set null,
  posted_at timestamptz,
  reversed_by uuid references auth.users(id) on delete set null,
  reversed_at timestamptz,
  canceled_by uuid references auth.users(id) on delete set null,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  check (length(trim(code)) > 0),
  check (reversed_movement_id is null or reversed_movement_id <> id),
  check (status <> 'POSTED' or (posted_at is not null and posted_by is not null)),
  check (status <> 'REVERSED' or reversed_at is not null),
  check (status <> 'CANCELED' or canceled_at is not null)
);

create unique index if not exists inventory_movements_idempotency_uidx
  on public.inventory_movements(organization_id, idempotency_key)
  where idempotency_key is not null and length(trim(idempotency_key)) > 0;
create unique index if not exists inventory_movements_single_reversal_uidx
  on public.inventory_movements(reversed_movement_id)
  where reversed_movement_id is not null;

create table if not exists public.inventory_movement_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  movement_id uuid not null references public.inventory_movements(id) on delete cascade,
  line_number integer not null check (line_number > 0),
  warehouse_id uuid not null references public.inventory_warehouses(id) on delete restrict,
  location_id uuid references public.inventory_locations(id) on delete restrict,
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  lot_id uuid references public.inventory_lots(id) on delete restrict,
  asset_id uuid,
  reservation_line_id uuid,
  procurement_receipt_item_id uuid references public.procurement_receipt_items(id) on delete restrict,
  quantity_delta numeric(18,4) not null check (quantity_delta <> 0),
  unit_cost numeric(18,4) check (unit_cost is null or unit_cost >= 0),
  total_cost numeric(18,2) generated always as (
    case when unit_cost is null then null else round(abs(quantity_delta) * unit_cost, 2) end
  ) stored,
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (movement_id, line_number)
);

create table if not exists public.inventory_receipt_imports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  receipt_id uuid not null references public.procurement_receipts(id) on delete restrict,
  warehouse_id uuid not null references public.inventory_warehouses(id) on delete restrict,
  location_id uuid references public.inventory_locations(id) on delete restrict,
  movement_id uuid not null references public.inventory_movements(id) on delete restrict,
  imported_by uuid references auth.users(id) on delete set null,
  imported_at timestamptz not null default now(),
  unique (receipt_id),
  unique (movement_id)
);

create table if not exists public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete restrict,
  task_id uuid references public.project_tasks(id) on delete set null,
  warehouse_id uuid not null references public.inventory_warehouses(id) on delete restrict,
  code text not null,
  status public.inventory_reservation_status not null default 'DRAFT',
  needed_by date,
  expires_at timestamptz,
  reason text not null default '',
  requested_by uuid references auth.users(id) on delete set null,
  activated_by uuid references auth.users(id) on delete set null,
  activated_at timestamptz,
  released_by uuid references auth.users(id) on delete set null,
  released_at timestamptz,
  canceled_by uuid references auth.users(id) on delete set null,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  check (length(trim(code)) > 0),
  check (expires_at is null or expires_at > created_at)
);

create table if not exists public.inventory_reservation_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reservation_id uuid not null references public.inventory_reservations(id) on delete cascade,
  line_number integer not null check (line_number > 0),
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  location_id uuid references public.inventory_locations(id) on delete restrict,
  lot_id uuid references public.inventory_lots(id) on delete restrict,
  requested_quantity numeric(18,4) not null check (requested_quantity > 0),
  reserved_quantity numeric(18,4) not null default 0 check (reserved_quantity >= 0),
  consumed_quantity numeric(18,4) not null default 0 check (consumed_quantity >= 0),
  released_quantity numeric(18,4) not null default 0 check (released_quantity >= 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reservation_id, line_number),
  check (reserved_quantity <= requested_quantity),
  check (consumed_quantity + released_quantity <= reserved_quantity)
);

create table if not exists public.inventory_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  warehouse_id uuid references public.inventory_warehouses(id) on delete restrict,
  location_id uuid references public.inventory_locations(id) on delete restrict,
  project_id uuid references public.projects(id) on delete set null,
  lot_id uuid references public.inventory_lots(id) on delete set null,
  patrimony_code text,
  serial_number text,
  status public.inventory_asset_status not null default 'AVAILABLE',
  acquired_on date,
  acquisition_cost numeric(18,2) check (acquisition_cost is null or acquisition_cost >= 0),
  condition_notes text not null default '',
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (patrimony_code is not null or serial_number is not null)
);

create unique index if not exists inventory_assets_org_patrimony_uidx
  on public.inventory_assets(organization_id, lower(patrimony_code))
  where patrimony_code is not null and length(trim(patrimony_code)) > 0;
create unique index if not exists inventory_assets_org_serial_uidx
  on public.inventory_assets(organization_id, lower(serial_number))
  where serial_number is not null and length(trim(serial_number)) > 0;

create table if not exists public.inventory_asset_custodies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_id uuid not null references public.inventory_assets(id) on delete restrict,
  project_id uuid references public.projects(id) on delete restrict,
  team_id uuid references public.project_teams(id) on delete set null,
  responsible_user_id uuid references auth.users(id) on delete set null,
  responsible_name text,
  status public.inventory_custody_status not null default 'ACTIVE',
  assigned_at timestamptz not null default now(),
  expected_return_at timestamptz,
  returned_at timestamptz,
  assigned_condition text not null default '',
  returned_condition text not null default '',
  notes text not null default '',
  assigned_by uuid references auth.users(id) on delete set null,
  returned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (responsible_user_id is not null or team_id is not null or length(trim(coalesce(responsible_name,''))) > 0),
  check (returned_at is null or returned_at >= assigned_at),
  check (expected_return_at is null or expected_return_at >= assigned_at),
  check (status <> 'RETURNED' or returned_at is not null)
);

create unique index if not exists inventory_asset_custodies_active_uidx
  on public.inventory_asset_custodies(asset_id) where status = 'ACTIVE';

create table if not exists public.inventory_asset_maintenance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_id uuid not null references public.inventory_assets(id) on delete restrict,
  status public.inventory_maintenance_status not null default 'SCHEDULED',
  title text not null,
  description text not null default '',
  provider_name text,
  scheduled_for date,
  started_at timestamptz,
  completed_at timestamptz,
  cost numeric(18,2) check (cost is null or cost >= 0),
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  completed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(title)) > 0),
  check (completed_at is null or started_at is null or completed_at >= started_at),
  check (status <> 'COMPLETED' or completed_at is not null)
);

create table if not exists public.inventory_stocktakes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  warehouse_id uuid not null references public.inventory_warehouses(id) on delete restrict,
  code text not null,
  name text not null,
  status public.inventory_stocktake_status not null default 'DRAFT',
  cutoff_at timestamptz,
  notes text not null default '',
  started_by uuid references auth.users(id) on delete set null,
  started_at timestamptz,
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  posted_by uuid references auth.users(id) on delete set null,
  posted_at timestamptz,
  adjustment_movement_id uuid references public.inventory_movements(id) on delete restrict,
  canceled_by uuid references auth.users(id) on delete set null,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  check (length(trim(code)) > 0),
  check (length(trim(name)) > 0),
  check (status <> 'COUNTING' or started_at is not null),
  check (status <> 'UNDER_REVIEW' or submitted_at is not null),
  check (status <> 'APPROVED' or approved_at is not null),
  check (status <> 'POSTED' or (posted_at is not null and adjustment_movement_id is not null)),
  check (status <> 'CANCELED' or canceled_at is not null)
);

create unique index if not exists inventory_stocktakes_active_warehouse_uidx
  on public.inventory_stocktakes(warehouse_id)
  where status in ('COUNTING','UNDER_REVIEW','APPROVED');

create table if not exists public.inventory_stocktake_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  stocktake_id uuid not null references public.inventory_stocktakes(id) on delete cascade,
  line_number integer not null check (line_number > 0),
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  location_id uuid references public.inventory_locations(id) on delete restrict,
  lot_id uuid references public.inventory_lots(id) on delete restrict,
  expected_quantity numeric(18,4) not null default 0,
  counted_quantity numeric(18,4),
  recount_quantity numeric(18,4),
  final_quantity numeric(18,4) generated always as (coalesce(recount_quantity, counted_quantity)) stored,
  difference_quantity numeric(18,4) generated always as (
    case when coalesce(recount_quantity, counted_quantity) is null then null
      else coalesce(recount_quantity, counted_quantity) - expected_quantity end
  ) stored,
  count_notes text not null default '',
  counted_by uuid references auth.users(id) on delete set null,
  counted_at timestamptz,
  recounted_by uuid references auth.users(id) on delete set null,
  recounted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (stocktake_id, line_number),
  check (counted_quantity is null or counted_quantity >= 0),
  check (recount_quantity is null or recount_quantity >= 0)
);

create unique index if not exists inventory_stocktake_lines_scope_uidx
  on public.inventory_stocktake_lines(stocktake_id, item_id, location_id, lot_id) nulls not distinct;

create table if not exists public.inventory_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  warehouse_id uuid references public.inventory_warehouses(id) on delete set null,
  item_id uuid references public.inventory_items(id) on delete set null,
  movement_id uuid references public.inventory_movements(id) on delete set null,
  reservation_id uuid references public.inventory_reservations(id) on delete set null,
  asset_id uuid references public.inventory_assets(id) on delete set null,
  stocktake_id uuid references public.inventory_stocktakes(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (length(trim(event_type)) > 0)
);

-- FKs circulares opcionais adicionadas depois da criação das tabelas.
alter table public.inventory_movement_lines
  add constraint inventory_movement_lines_asset_fk
  foreign key (asset_id) references public.inventory_assets(id) on delete restrict;
alter table public.inventory_movement_lines
  add constraint inventory_movement_lines_reservation_line_fk
  foreign key (reservation_line_id) references public.inventory_reservation_lines(id) on delete set null;
