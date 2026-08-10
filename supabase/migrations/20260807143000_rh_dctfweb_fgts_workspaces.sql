-- DCTFWeb + FGTS Digital: workspaces operacionais e reconciliação.
-- Não presume API pública onde o canal oficial é alimentação governamental,
-- arquivo oficial ou operação assistida no portal.

create table if not exists public.rh_dctfweb_declarations(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  reference_month date not null,
  category text not null default 'GENERAL',
  declaration_type text not null default 'ORIGINAL' check(declaration_type in('ORIGINAL','RECTIFYING')),
  previous_declaration_id uuid references public.rh_dctfweb_declarations(id) on delete restrict,
  status text not null default 'AWAITING_GOVERNMENT_FEED' check(status in(
    'AWAITING_GOVERNMENT_FEED','AVAILABLE','RECONCILING','READY_TO_TRANSMIT','TRANSMITTED','RECTIFICATION_REQUIRED','RECONCILED','CANCELLED'
  )),
  esocial_period_closed boolean not null default false,
  reinf_period_closed boolean not null default false,
  mit_required boolean not null default false,
  mit_status text check(mit_status is null or mit_status in('NOT_REQUIRED','PENDING','GENERATED','IMPORTED','VALIDATED')),
  external_declaration_id text,
  receipt_number text,
  total_social_security numeric(18,2),
  total_other_debts numeric(18,2),
  total_debt numeric(18,2),
  total_paid numeric(18,2) not null default 0,
  source_snapshot jsonb not null default '{}'::jsonb,
  source_reference text,
  last_external_update_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,reference_month,category,declaration_type,previous_declaration_id)
);

create table if not exists public.rh_dctfweb_reconciliation_items(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  declaration_id uuid not null references public.rh_dctfweb_declarations(id) on delete cascade,
  dimension text not null,
  reference_key text not null,
  internal_amount numeric(18,2) not null default 0,
  external_amount numeric(18,2) not null default 0,
  difference numeric(18,2) generated always as (external_amount-internal_amount) stored,
  status text not null default 'PENDING' check(status in('PENDING','MATCH','DIVERGENT','JUSTIFIED','RESOLVED')),
  cause text,
  action_required text,
  evidence_reference text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique(declaration_id,dimension,reference_key)
);

create table if not exists public.rh_dctfweb_documents(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  declaration_id uuid not null references public.rh_dctfweb_declarations(id) on delete cascade,
  document_type text not null check(document_type in('MIT_JSON','RECEIPT','DARF','PAYMENT_EVIDENCE','OTHER')),
  external_id text,
  amount numeric(18,2),
  due_date date,
  status text not null default 'RECORDED' check(status in('RECORDED','ISSUED','PAID','CANCELLED','SUPERSEDED')),
  content_hash text,
  evidence_reference text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.rh_fgts_periods(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  reference_month date not null,
  period_type text not null default 'MONTHLY' check(period_type in('MONTHLY','TERMINATION','RETROACTIVE','LABOR_CLAIM')),
  status text not null default 'AWAITING_ESOCIAL' check(status in(
    'AWAITING_ESOCIAL','READY_TO_RECONCILE','RECONCILING','GUIDE_REQUIRED','GUIDE_ISSUED','PAYMENT_PENDING','RECONCILED','DIVERGENT','CANCELLED'
  )),
  esocial_source_status text,
  external_reference text,
  source_snapshot jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,reference_month,period_type)
);

create table if not exists public.rh_fgts_worker_reconciliations(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  fgts_period_id uuid not null references public.rh_fgts_periods(id) on delete cascade,
  employment_id uuid not null references public.rh_employments(id) on delete restrict,
  expected_base numeric(18,2) not null default 0,
  expected_amount numeric(18,2) not null default 0,
  external_base numeric(18,2),
  external_amount numeric(18,2),
  base_difference numeric(18,2) generated always as (coalesce(external_base,0)-expected_base) stored,
  amount_difference numeric(18,2) generated always as (coalesce(external_amount,0)-expected_amount) stored,
  status text not null default 'PENDING' check(status in('PENDING','MATCH','DIVERGENT','JUSTIFIED','RESOLVED')),
  cause text,
  action_required text,
  evidence_reference text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique(fgts_period_id,employment_id)
);

create table if not exists public.rh_fgts_guides(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  fgts_period_id uuid not null references public.rh_fgts_periods(id) on delete restrict,
  external_guide_id text,
  guide_type text not null default 'PORTAL' check(guide_type in('PORTAL','OFFICIAL_FILE','API')),
  channel_type text not null check(channel_type in('PORTAL_ASSISTED','OFFICIAL_FILE_IMPORT','DIRECT_API')),
  due_date date,
  principal_amount numeric(18,2) not null default 0,
  additions_amount numeric(18,2) not null default 0,
  total_amount numeric(18,2) generated always as (principal_amount+additions_amount) stored,
  status text not null default 'PREPARING' check(status in('PREPARING','ISSUED','DUE','OVERDUE','PARTIALLY_PAID','PAID','CANCELLED','SUPERSEDED')),
  evidence_reference text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rh_fgts_payments(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  guide_id uuid not null references public.rh_fgts_guides(id) on delete restrict,
  amount numeric(18,2) not null check(amount>0),
  paid_at timestamptz not null,
  payment_channel text not null default 'PIX',
  external_payment_id text,
  evidence_reference text not null,
  status text not null default 'RECORDED' check(status in('RECORDED','CONFIRMED','REVERSED')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.rh_government_assisted_tasks(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  system text not null check(system in('DCTFWEB','FGTS_DIGITAL','ESOCIAL')),
  operation text not null,
  reference_type text not null,
  reference_id uuid,
  channel_type text not null check(channel_type in('PORTAL_ASSISTED','OFFICIAL_FILE_IMPORT','OFFICIAL_FILE_EXPORT','MANUAL_EVIDENCE')),
  status text not null default 'READY' check(status in('READY','IN_PROGRESS_EXTERNAL','EVIDENCE_RECORDED','RECONCILING','RECONCILED','BLOCKED','CANCELLED')),
  expected_data jsonb not null default '{}'::jsonb,
  external_reference text,
  evidence_reference text,
  assigned_to uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rh_dctfweb_declarations add constraint rh_dctfweb_declarations_org_id_uq unique(organization_id,id);
alter table public.rh_fgts_periods add constraint rh_fgts_periods_org_id_uq unique(organization_id,id);
alter table public.rh_fgts_guides add constraint rh_fgts_guides_org_id_uq unique(organization_id,id);

alter table public.rh_dctfweb_reconciliation_items add constraint rh_dctfweb_reconciliation_tenant_fk foreign key(organization_id,declaration_id) references public.rh_dctfweb_declarations(organization_id,id) on delete cascade;
alter table public.rh_dctfweb_documents add constraint rh_dctfweb_documents_tenant_fk foreign key(organization_id,declaration_id) references public.rh_dctfweb_declarations(organization_id,id) on delete cascade;
alter table public.rh_fgts_worker_reconciliations add constraint rh_fgts_worker_period_tenant_fk foreign key(organization_id,fgts_period_id) references public.rh_fgts_periods(organization_id,id) on delete cascade;
alter table public.rh_fgts_worker_reconciliations add constraint rh_fgts_worker_employment_tenant_fk foreign key(organization_id,employment_id) references public.rh_employments(organization_id,id) on delete restrict;
alter table public.rh_fgts_guides add constraint rh_fgts_guides_period_tenant_fk foreign key(organization_id,fgts_period_id) references public.rh_fgts_periods(organization_id,id) on delete restrict;
alter table public.rh_fgts_payments add constraint rh_fgts_payments_guide_tenant_fk foreign key(organization_id,guide_id) references public.rh_fgts_guides(organization_id,id) on delete restrict;

do $$ declare t text; begin
  foreach t in array array[
    'rh_dctfweb_declarations','rh_dctfweb_reconciliation_items','rh_dctfweb_documents',
    'rh_fgts_periods','rh_fgts_worker_reconciliations','rh_fgts_guides','rh_fgts_payments','rh_government_assisted_tasks'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create policy rh_read on public.%I for select to authenticated using(public.has_module_permission(organization_id,''rh'',''READ'',null,null))',t);
    execute format('create policy rh_write on public.%I for all to authenticated using(public.has_module_permission(organization_id,''rh'',''EDIT'',null,null)) with check(public.has_module_permission(organization_id,''rh'',''EDIT'',null,null))',t);
  end loop;
end$$;
