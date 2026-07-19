begin;

create extension if not exists pgcrypto;

-- Tipos de domínio
create type public.org_role as enum (
  'SUPER_ADMIN','DIRECAO','ADMINISTRADOR','COMERCIAL','GESTOR_OBRAS',
  'ENGENHEIRO','ORCAMENTISTA','FINANCEIRO','QUALIDADE','SAC','CLIENTE'
);
create type public.budget_status as enum (
  'DRAFT','CALCULATING','TECHNICAL_REVIEW','FINANCIAL_REVIEW','APPROVAL_PENDING',
  'APPROVED','CLIENT_SENT','NEGOTIATION','ACCEPTED','REJECTED','EXPIRED',
  'CONTRACTED','ARCHIVED'
);
create type public.budget_scenario_type as enum (
  'CONSERVATIVE','PROBABLE','OPTIMISTIC','TARGET','MINIMUM','CUSTOM'
);
create type public.approval_status as enum ('PENDING','APPROVED','REJECTED','CANCELED');
create type public.proposal_status as enum (
  'DRAFT','INTERNAL_REVIEW','APPROVED','SENT','VIEWED','ACCEPTED','REJECTED','EXPIRED','CONVERTED'
);
create type public.contract_status as enum (
  'DRAFT','INTERNAL_REVIEW','CLIENT_REVIEW','SIGNATURE_PENDING','PARTIALLY_SIGNED',
  'SIGNED','ACTIVE','AMENDED','COMPLETED','TERMINATED','CANCELED'
);
create type public.amendment_status as enum (
  'DRAFT','REVIEW','SIGNATURE_PENDING','SIGNED','ACTIVE','REJECTED','CANCELED'
);
create type public.signature_status as enum (
  'DRAFT','SENT','VIEWED','PARTIALLY_SIGNED','COMPLETED','DECLINED','EXPIRED','CANCELED','ERROR'
);
create type public.markup_method as enum ('MULTIPLIER','DIVISOR');
create type public.fee_basis as enum (
  'DIRECT_COST','DIRECT_PLUS_INDIRECT','SALE_PRICE','FIXED','MONTHLY','HYBRID'
);
create type public.validation_severity as enum ('INFO','WARNING','BLOCKING');
create type public.cost_type as enum ('DIRECT','INDIRECT','FIXED','ADMINISTRATIVE');
create type public.signature_provider as enum ('SANDBOX','CLICKSIGN','ZAPSIGN','DOCUSIGN');

-- Fundação mínima de identidade e organização
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  trade_name text not null,
  tax_id text,
  currency text not null default 'BRL',
  timezone text not null default 'America/Sao_Paulo',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.org_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id),
  type text not null default 'PERSON',
  legal_name text not null,
  trade_name text,
  tax_id text,
  email text,
  phone text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id),
  code text not null,
  name text not null,
  status text not null default 'PLANNING',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id),
  title text not null,
  stage text not null default 'QUALIFIED',
  owner_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  resource_type text not null,
  resource_id uuid,
  action text not null,
  result text not null default 'SUCCESS',
  before_data jsonb,
  after_data jsonb,
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- Catálogo e composições
create table public.cost_catalog_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  description text not null,
  item_type text not null,
  unit text not null,
  unit_cost numeric(18,4) not null check (unit_cost >= 0),
  source text,
  region text,
  base_date date,
  valid_until date,
  freight_rate numeric(12,8) not null default 0,
  loss_rate numeric(12,8) not null default 0,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.cost_compositions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  unit text not null,
  current_version_id uuid,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.cost_composition_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  composition_id uuid not null references public.cost_compositions(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  base_date date not null,
  region text,
  status text not null default 'DRAFT',
  frozen_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (composition_id, version_number)
);

alter table public.cost_compositions
  add constraint cost_compositions_current_version_fk
  foreign key (current_version_id) references public.cost_composition_versions(id) deferrable initially deferred;

create table public.cost_composition_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  composition_version_id uuid not null references public.cost_composition_versions(id) on delete cascade,
  catalog_item_id uuid references public.cost_catalog_items(id),
  description text not null,
  unit text not null,
  coefficient numeric(18,6) not null check (coefficient >= 0),
  unit_cost numeric(18,4) not null check (unit_cost >= 0),
  created_at timestamptz not null default now()
);

create table public.fixed_costs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  cost_center text,
  periodicity text not null default 'MONTHLY',
  amount numeric(18,2) not null check (amount >= 0),
  allocation_method text not null,
  starts_at date,
  ends_at date,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.administrative_fee_models (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  basis public.fee_basis not null,
  rate numeric(12,8) not null default 0,
  fixed_amount numeric(18,2) not null default 0,
  monthly_amount numeric(18,2) not null default 0,
  included_in_bdi boolean not null default false,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bdi_models (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  current_version_id uuid,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bdi_model_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  bdi_model_id uuid not null references public.bdi_models(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  admin_central_rate numeric(12,8) not null default 0,
  insurance_rate numeric(12,8) not null default 0,
  guarantee_rate numeric(12,8) not null default 0,
  risk_rate numeric(12,8) not null default 0,
  financial_expense_rate numeric(12,8) not null default 0,
  profit_rate numeric(12,8) not null default 0,
  tax_rate numeric(12,8) not null default 0,
  calculated_bdi_rate numeric(12,8),
  frozen_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (bdi_model_id, version_number)
);

alter table public.bdi_models
  add constraint bdi_models_current_version_fk
  foreign key (current_version_id) references public.bdi_model_versions(id) deferrable initially deferred;

create table public.markup_models (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  method public.markup_method not null,
  multiplier numeric(18,8),
  tax_rate numeric(12,8) not null default 0,
  commission_rate numeric(12,8) not null default 0,
  variable_expense_rate numeric(12,8) not null default 0,
  desired_margin_rate numeric(12,8) not null default 0,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Orçamentos e versões
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id),
  project_id uuid references public.projects(id),
  opportunity_id uuid references public.opportunities(id),
  code text not null,
  title text not null,
  status public.budget_status not null default 'DRAFT',
  currency text not null default 'BRL',
  owner_id uuid references auth.users(id),
  current_version_id uuid,
  valid_until date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.budget_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  budget_id uuid not null references public.budgets(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  scenario_type public.budget_scenario_type not null default 'PROBABLE',
  change_summary text,
  base_date date not null default current_date,
  status public.budget_status not null default 'DRAFT',
  bdi_model_version_id uuid references public.bdi_model_versions(id),
  markup_model_id uuid references public.markup_models(id),
  administrative_fee_model_id uuid references public.administrative_fee_models(id),
  direct_cost numeric(18,2) not null default 0,
  indirect_cost numeric(18,2) not null default 0,
  fixed_cost numeric(18,2) not null default 0,
  administrative_fee numeric(18,2) not null default 0,
  bdi_rate numeric(12,8) not null default 0,
  bdi_amount numeric(18,2) not null default 0,
  markup_method public.markup_method not null default 'MULTIPLIER',
  markup_factor numeric(18,8) not null default 1,
  sale_price numeric(18,2) not null default 0,
  gross_margin_rate numeric(12,8) not null default 0,
  estimated_profit numeric(18,2) not null default 0,
  invested_capital numeric(18,2) not null default 0,
  estimated_roi_rate numeric(18,8),
  payback_month integer,
  maximum_cash_requirement numeric(18,2) not null default 0,
  assumptions jsonb not null default '{}'::jsonb,
  calculation_memory jsonb not null default '{}'::jsonb,
  frozen_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (budget_id, version_number)
);

alter table public.budgets
  add constraint budgets_current_version_fk
  foreign key (current_version_id) references public.budget_versions(id) deferrable initially deferred;

create table public.budget_sections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  budget_version_id uuid not null references public.budget_versions(id) on delete cascade,
  parent_id uuid references public.budget_sections(id) on delete cascade,
  code text not null,
  title text not null,
  sequence integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  budget_version_id uuid not null references public.budget_versions(id) on delete cascade,
  section_id uuid references public.budget_sections(id) on delete set null,
  catalog_item_id uuid references public.cost_catalog_items(id),
  composition_version_id uuid references public.cost_composition_versions(id),
  cost_type public.cost_type not null default 'DIRECT',
  code text,
  description text not null,
  unit text not null,
  quantity numeric(18,6) not null check (quantity >= 0),
  unit_cost numeric(18,4) not null check (unit_cost >= 0),
  loss_rate numeric(12,8) not null default 0,
  freight_rate numeric(12,8) not null default 0,
  source text,
  region text,
  base_date date,
  valid_until date,
  sequence integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.budget_scenarios (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  budget_id uuid not null references public.budgets(id) on delete cascade,
  budget_version_id uuid not null references public.budget_versions(id) on delete cascade,
  name text not null,
  type public.budget_scenario_type not null,
  assumptions jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.budget_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  budget_version_id uuid not null references public.budget_versions(id) on delete cascade,
  approval_type text not null,
  status public.approval_status not null default 'PENDING',
  requested_by uuid not null references auth.users(id),
  approver_id uuid references auth.users(id),
  minimum_role public.org_role,
  requires_aal2 boolean not null default false,
  reason text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.budget_validation_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  budget_version_id uuid not null references public.budget_versions(id) on delete cascade,
  code text not null,
  severity public.validation_severity not null,
  message text not null,
  field_name text,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  resolution_reason text,
  created_at timestamptz not null default now()
);

-- Propostas
create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id),
  budget_id uuid not null references public.budgets(id),
  code text not null,
  status public.proposal_status not null default 'DRAFT',
  current_version_id uuid,
  valid_until date,
  client_released_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.proposal_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  budget_version_id uuid not null references public.budget_versions(id),
  version_number integer not null,
  title text not null,
  object_text text not null,
  scope_text text not null,
  inclusions text,
  exclusions text,
  assumptions text,
  commercial_summary text,
  sale_price numeric(18,2) not null,
  payment_terms text,
  deadline_text text,
  warranty_text text,
  notes text,
  document_path text,
  document_sha256 text,
  source_snapshot jsonb not null default '{}'::jsonb,
  frozen_at timestamptz,
  client_released_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (proposal_id, version_number)
);

alter table public.proposals
  add constraint proposals_current_version_fk
  foreign key (current_version_id) references public.proposal_versions(id) deferrable initially deferred;

create table public.proposal_acceptances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  proposal_version_id uuid not null references public.proposal_versions(id),
  client_user_id uuid not null references auth.users(id),
  decision text not null check (decision in ('ACCEPTED','REJECTED')),
  comment text,
  correlation_id uuid not null default gen_random_uuid(),
  accepted_at timestamptz not null default now(),
  unique (proposal_version_id, client_user_id)
);

-- Contratos, aditivos e assinatura
create table public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  version_number integer not null default 1,
  body_template text not null,
  variables_schema jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id),
  project_id uuid references public.projects(id),
  proposal_id uuid references public.proposals(id),
  code text not null,
  title text not null,
  status public.contract_status not null default 'DRAFT',
  current_version_id uuid,
  original_value numeric(18,2) not null default 0,
  amendment_value numeric(18,2) not null default 0,
  consolidated_value numeric(18,2) generated always as (original_value + amendment_value) stored,
  starts_at date,
  ends_at date,
  client_released_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.contract_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  template_id uuid references public.contract_templates(id),
  version_number integer not null,
  variables jsonb not null default '{}'::jsonb,
  rendered_body text not null,
  value numeric(18,2) not null,
  currency text not null default 'BRL',
  document_path text,
  document_sha256 text,
  status public.contract_status not null default 'DRAFT',
  frozen_at timestamptz,
  client_released_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (contract_id, version_number)
);

alter table public.contracts
  add constraint contracts_current_version_fk
  foreign key (current_version_id) references public.contract_versions(id) deferrable initially deferred;

create table public.contract_parties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  party_type text not null,
  name text not null,
  tax_id text,
  email text,
  role_label text,
  signing_order integer not null default 1,
  created_at timestamptz not null default now()
);

create table public.amendments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  budget_version_id uuid references public.budget_versions(id),
  code text not null,
  status public.amendment_status not null default 'DRAFT',
  reason text not null,
  scope_delta text,
  value_delta numeric(18,2) not null default 0,
  days_delta integer not null default 0,
  new_end_date date,
  current_version_id uuid,
  client_released_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.amendment_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  amendment_id uuid not null references public.amendments(id) on delete cascade,
  version_number integer not null,
  rendered_body text not null,
  value_delta numeric(18,2) not null default 0,
  days_delta integer not null default 0,
  document_path text,
  document_sha256 text,
  status public.amendment_status not null default 'DRAFT',
  frozen_at timestamptz,
  client_released_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (amendment_id, version_number)
);

alter table public.amendments
  add constraint amendments_current_version_fk
  foreign key (current_version_id) references public.amendment_versions(id) deferrable initially deferred;

create table public.signature_envelopes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider public.signature_provider not null default 'SANDBOX',
  external_id text,
  contract_version_id uuid references public.contract_versions(id),
  amendment_version_id uuid references public.amendment_versions(id),
  status public.signature_status not null default 'DRAFT',
  idempotency_key text not null,
  provider_payload jsonb not null default '{}'::jsonb,
  final_document_path text,
  audit_artifact_path text,
  sent_at timestamptz,
  completed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, idempotency_key),
  check ((contract_version_id is not null)::integer + (amendment_version_id is not null)::integer = 1)
);

create table public.signature_signers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  envelope_id uuid not null references public.signature_envelopes(id) on delete cascade,
  name text not null,
  email text not null,
  role_label text,
  signing_order integer not null default 1,
  status public.signature_status not null default 'DRAFT',
  viewed_at timestamptz,
  signed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.signature_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  envelope_id uuid not null references public.signature_envelopes(id) on delete cascade,
  provider_event_id text,
  event_type text not null,
  payload_hash text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (envelope_id, provider_event_id)
);

create table public.document_access_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  resource_type text not null,
  resource_id uuid not null,
  action text not null,
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- Índices
create index organization_memberships_user_idx on public.organization_memberships(user_id, active);
create index budgets_org_status_idx on public.budgets(organization_id, status, updated_at desc);
create index budget_versions_budget_idx on public.budget_versions(budget_id, version_number desc);
create index budget_items_version_idx on public.budget_items(budget_version_id, cost_type, sequence);
create index budget_approvals_pending_idx on public.budget_approvals(organization_id, status, created_at);
create index proposals_client_idx on public.proposals(client_id, status, client_released_at);
create index contracts_client_idx on public.contracts(client_id, status, client_released_at);
create index amendments_contract_idx on public.amendments(contract_id, status);
create index signature_envelopes_status_idx on public.signature_envelopes(organization_id, status, updated_at);
create index signature_events_envelope_idx on public.signature_events(envelope_id, occurred_at);
create index audit_events_resource_idx on public.audit_events(organization_id, resource_type, resource_id, created_at desc);

-- Atualização automática
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_profiles before update on public.profiles for each row execute function public.touch_updated_at();
create trigger touch_organizations before update on public.organizations for each row execute function public.touch_updated_at();
create trigger touch_clients before update on public.clients for each row execute function public.touch_updated_at();
create trigger touch_projects before update on public.projects for each row execute function public.touch_updated_at();
create trigger touch_opportunities before update on public.opportunities for each row execute function public.touch_updated_at();
create trigger touch_catalog before update on public.cost_catalog_items for each row execute function public.touch_updated_at();
create trigger touch_compositions before update on public.cost_compositions for each row execute function public.touch_updated_at();
create trigger touch_fixed_costs before update on public.fixed_costs for each row execute function public.touch_updated_at();
create trigger touch_fee_models before update on public.administrative_fee_models for each row execute function public.touch_updated_at();
create trigger touch_bdi_models before update on public.bdi_models for each row execute function public.touch_updated_at();
create trigger touch_markup_models before update on public.markup_models for each row execute function public.touch_updated_at();
create trigger touch_budgets before update on public.budgets for each row execute function public.touch_updated_at();
create trigger touch_budget_items before update on public.budget_items for each row execute function public.touch_updated_at();
create trigger touch_proposals before update on public.proposals for each row execute function public.touch_updated_at();
create trigger touch_contracts before update on public.contracts for each row execute function public.touch_updated_at();
create trigger touch_amendments before update on public.amendments for each row execute function public.touch_updated_at();
create trigger touch_signature_envelopes before update on public.signature_envelopes for each row execute function public.touch_updated_at();

-- Helpers de autorização
create or replace function public.is_org_member(p_organization_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_memberships m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.active
  );
$$;

create or replace function public.has_org_role(p_organization_id uuid, p_roles public.org_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_memberships m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.active
      and m.role = any(p_roles)
  );
$$;

create or replace function public.is_client_owner(p_client_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.clients c
    where c.id = p_client_id and c.user_id = auth.uid()
  );
$$;

create or replace function public.is_aal2()
returns boolean language sql stable as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

create or replace function public.write_audit(
  p_organization_id uuid,
  p_resource_type text,
  p_resource_id uuid,
  p_action text,
  p_after jsonb default null,
  p_project_id uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into public.audit_events(
    organization_id, project_id, actor_user_id, event_type,
    resource_type, resource_id, action, after_data
  ) values (
    p_organization_id, p_project_id, auth.uid(),
    p_resource_type || '.' || lower(p_action),
    p_resource_type, p_resource_id, p_action, p_after
  ) returning id into v_id;
  return v_id;
end;
$$;

-- Cálculo financeiro canônico no banco
create or replace function public.calculate_budget_version(p_version_id uuid)
returns public.budget_versions
language plpgsql security definer set search_path = public as $$
declare
  v public.budget_versions;
  v_direct numeric(18,2);
  v_indirect numeric(18,2);
  v_fixed numeric(18,2);
  v_admin numeric(18,2);
  v_base numeric(18,2);
  v_bdi numeric(18,8);
  v_factor numeric(18,8);
  v_price numeric(18,2);
  v_profit numeric(18,2);
  v_margin numeric(18,8);
  v_roi numeric(18,8);
  v_bdi_model public.bdi_model_versions;
  v_markup public.markup_models;
begin
  select * into v from public.budget_versions where id = p_version_id for update;
  if not found or not public.is_org_member(v.organization_id) then
    raise exception 'Acesso negado';
  end if;
  if v.frozen_at is not null then
    raise exception 'Versão congelada não pode ser recalculada';
  end if;

  select
    coalesce(sum(case when cost_type = 'DIRECT' then quantity * unit_cost * (1 + loss_rate + freight_rate) else 0 end),0),
    coalesce(sum(case when cost_type = 'INDIRECT' then quantity * unit_cost * (1 + loss_rate + freight_rate) else 0 end),0),
    coalesce(sum(case when cost_type = 'FIXED' then quantity * unit_cost else 0 end),0),
    coalesce(sum(case when cost_type = 'ADMINISTRATIVE' then quantity * unit_cost else 0 end),0)
  into v_direct, v_indirect, v_fixed, v_admin
  from public.budget_items where budget_version_id = p_version_id;

  v_base := round(v_direct + v_indirect + v_fixed + v_admin, 2);

  if v.bdi_model_version_id is not null then
    select * into v_bdi_model from public.bdi_model_versions where id = v.bdi_model_version_id;
    if (1 - v_bdi_model.tax_rate) <= 0 then raise exception 'Tributos inválidos no BDI'; end if;
    v_bdi := round((
      ((1 + v_bdi_model.admin_central_rate + v_bdi_model.insurance_rate +
        v_bdi_model.guarantee_rate + v_bdi_model.risk_rate) *
       (1 + v_bdi_model.financial_expense_rate) *
       (1 + v_bdi_model.profit_rate)) /
      (1 - v_bdi_model.tax_rate)
    ) - 1, 8);
  else
    v_bdi := 0;
  end if;

  if v.markup_model_id is not null then
    select * into v_markup from public.markup_models where id = v.markup_model_id;
    if v_markup.method = 'MULTIPLIER' then
      v_factor := coalesce(v_markup.multiplier, 1);
    else
      if (1 - v_markup.tax_rate - v_markup.commission_rate -
          v_markup.variable_expense_rate - v_markup.desired_margin_rate) <= 0 then
        raise exception 'Markup divisor inválido';
      end if;
      v_factor := round(1 / (1 - v_markup.tax_rate - v_markup.commission_rate -
        v_markup.variable_expense_rate - v_markup.desired_margin_rate), 8);
    end if;
  else
    v_factor := 1 + v_bdi;
  end if;

  v_price := round(v_base * v_factor, 2);
  v_profit := round(v_price - v_base, 2);
  v_margin := case when v_price > 0 then round(v_profit / v_price, 8) else 0 end;
  v_roi := case when v.invested_capital > 0 then round(v_profit / v.invested_capital, 8) else null end;

  update public.budget_versions set
    status = 'CALCULATING',
    direct_cost = v_direct,
    indirect_cost = v_indirect,
    fixed_cost = v_fixed,
    administrative_fee = v_admin,
    bdi_rate = v_bdi,
    bdi_amount = round(v_base * v_bdi, 2),
    markup_method = coalesce(v_markup.method, 'MULTIPLIER'),
    markup_factor = v_factor,
    sale_price = v_price,
    gross_margin_rate = v_margin,
    estimated_profit = v_profit,
    estimated_roi_rate = v_roi,
    calculation_memory = jsonb_build_object(
      'base_cost', v_base,
      'bdi_rate', v_bdi,
      'markup_factor', v_factor,
      'formula_version', 'STAGE9_V1',
      'calculated_at', now()
    )
  where id = p_version_id
  returning * into v;

  delete from public.budget_validation_results where budget_version_id = p_version_id and resolved_at is null;

  if v.invested_capital <= 0 then
    insert into public.budget_validation_results(organization_id,budget_version_id,code,severity,message,field_name)
    values(v.organization_id,p_version_id,'ROI_WITHOUT_CAPITAL','BLOCKING','O ROI exige capital investido maior que zero.','invested_capital');
  end if;
  if v.sale_price < (v.direct_cost + v.indirect_cost + v.fixed_cost + v.administrative_fee) then
    insert into public.budget_validation_results(organization_id,budget_version_id,code,severity,message)
    values(v.organization_id,p_version_id,'PRICE_BELOW_COST','BLOCKING','O preço de venda está abaixo do custo-base.');
  end if;
  if v.administrative_fee > 0 and coalesce((v.assumptions->>'administrative_fee_in_bdi')::boolean,false) then
    insert into public.budget_validation_results(organization_id,budget_version_id,code,severity,message,field_name)
    values(v.organization_id,p_version_id,'ADMIN_FEE_DUPLICATED','BLOCKING','Taxa administrativa duplicada com o BDI.','administrative_fee');
  end if;
  if v.fixed_cost > 0 and coalesce((v.assumptions->>'fixed_costs_in_bdi')::boolean,false) then
    insert into public.budget_validation_results(organization_id,budget_version_id,code,severity,message,field_name)
    values(v.organization_id,p_version_id,'FIXED_COST_DUPLICATED','BLOCKING','Custos fixos rateados e incluídos novamente no BDI.','fixed_cost');
  end if;

  perform public.write_audit(v.organization_id,'BUDGET_VERSION',p_version_id,'CALCULATE',v.calculation_memory);
  return v;
end;
$$;

create or replace function public.freeze_budget_version(p_version_id uuid)
returns public.budget_versions language plpgsql security definer set search_path = public as $$
declare v public.budget_versions; v_blocking integer;
begin
  select * into v from public.budget_versions where id = p_version_id for update;
  if not public.has_org_role(v.organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR','ORCAMENTISTA']::public.org_role[]) then
    raise exception 'Acesso negado';
  end if;
  select count(*) into v_blocking from public.budget_validation_results
    where budget_version_id = p_version_id and severity = 'BLOCKING' and resolved_at is null;
  if v_blocking > 0 then raise exception 'Existem validações bloqueantes pendentes'; end if;
  update public.budget_versions set frozen_at = now(), status = 'APPROVAL_PENDING'
    where id = p_version_id returning * into v;
  perform public.write_audit(v.organization_id,'BUDGET_VERSION',p_version_id,'FREEZE',to_jsonb(v));
  return v;
end;
$$;

create or replace function public.decide_budget_approval(
  p_approval_id uuid, p_decision public.approval_status, p_reason text
) returns public.budget_approvals language plpgsql security definer set search_path = public as $$
declare v public.budget_approvals; v_version public.budget_versions;
begin
  select * into v from public.budget_approvals where id = p_approval_id for update;
  select * into v_version from public.budget_versions where id = v.budget_version_id;
  if not public.has_org_role(v.organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR','FINANCEIRO']::public.org_role[]) then
    raise exception 'Alçada insuficiente';
  end if;
  if v.requires_aal2 and not public.is_aal2() then raise exception 'MFA AAL2 obrigatório'; end if;
  if v.requested_by = auth.uid() and v.approval_type in ('MARGIN_EXCEPTION','ROI_EXCEPTION','DISCOUNT_EXCEPTION') then
    raise exception 'Separação de funções: o solicitante não pode aprovar a própria exceção';
  end if;
  update public.budget_approvals set status=p_decision, approver_id=auth.uid(), reason=p_reason, decided_at=now()
    where id=p_approval_id returning * into v;
  if p_decision='APPROVED' and not exists(
    select 1 from public.budget_approvals where budget_version_id=v.budget_version_id and status='PENDING'
  ) then
    update public.budget_versions set status='APPROVED',approved_at=now(),approved_by=auth.uid()
      where id=v.budget_version_id;
  end if;
  perform public.write_audit(v.organization_id,'BUDGET_APPROVAL',v.id,p_decision::text,to_jsonb(v));
  return v;
end;
$$;

create or replace function public.accept_proposal(p_proposal_version_id uuid, p_decision text, p_comment text default null)
returns public.proposal_acceptances language plpgsql security definer set search_path = public as $$
declare v_proposal public.proposals; v_version public.proposal_versions; v_accept public.proposal_acceptances;
begin
  select pv.* into v_version from public.proposal_versions pv where pv.id=p_proposal_version_id;
  select p.* into v_proposal from public.proposals p where p.id=v_version.proposal_id for update;
  if not public.is_client_owner(v_proposal.client_id) or v_version.client_released_at is null then
    raise exception 'Acesso negado';
  end if;
  if p_decision not in ('ACCEPTED','REJECTED') then raise exception 'Decisão inválida'; end if;
  insert into public.proposal_acceptances(organization_id,proposal_version_id,client_user_id,decision,comment)
  values(v_proposal.organization_id,p_proposal_version_id,auth.uid(),p_decision,p_comment)
  returning * into v_accept;
  update public.proposals set status=p_decision::public.proposal_status where id=v_proposal.id;
  perform public.write_audit(v_proposal.organization_id,'PROPOSAL_VERSION',p_proposal_version_id,p_decision,to_jsonb(v_accept));
  return v_accept;
end;
$$;

create or replace function public.sandbox_signature_event(
  p_envelope_id uuid, p_event_type text, p_provider_event_id text
) returns public.signature_envelopes language plpgsql security definer set search_path = public as $$
declare v public.signature_envelopes; v_status public.signature_status;
begin
  select * into v from public.signature_envelopes where id=p_envelope_id for update;
  if not public.is_org_member(v.organization_id) then raise exception 'Acesso negado'; end if;
  if v.provider <> 'SANDBOX' then raise exception 'Esta função aceita somente provider SANDBOX'; end if;
  v_status := case p_event_type
    when 'SENT' then 'SENT'
    when 'VIEWED' then 'VIEWED'
    when 'SIGNED' then 'PARTIALLY_SIGNED'
    when 'COMPLETED' then 'COMPLETED'
    when 'DECLINED' then 'DECLINED'
    else 'ERROR' end;
  insert into public.signature_events(organization_id,envelope_id,provider_event_id,event_type,payload_hash)
  values(v.organization_id,v.id,p_provider_event_id,p_event_type,encode(digest(p_provider_event_id || p_event_type,'sha256'),'hex'))
  on conflict(envelope_id,provider_event_id) do nothing;
  update public.signature_envelopes set status=v_status,
    sent_at=case when v_status='SENT' then coalesce(sent_at,now()) else sent_at end,
    completed_at=case when v_status='COMPLETED' then now() else completed_at end
  where id=v.id returning * into v;
  perform public.write_audit(v.organization_id,'SIGNATURE_ENVELOPE',v.id,p_event_type,to_jsonb(v));
  return v;
end;
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.opportunities enable row level security;
alter table public.audit_events enable row level security;

-- Habilita RLS em todas as tabelas financeiras/contratuais.
do $$
declare t text;
begin
  foreach t in array array[
    'cost_catalog_items','cost_compositions','cost_composition_versions','cost_composition_items',
    'fixed_costs','administrative_fee_models','bdi_models','bdi_model_versions','markup_models',
    'budgets','budget_versions','budget_sections','budget_items','budget_scenarios',
    'budget_approvals','budget_validation_results','proposals','proposal_versions',
    'proposal_acceptances','contract_templates','contracts','contract_versions',
    'contract_parties','amendments','amendment_versions','signature_envelopes',
    'signature_signers','signature_events','document_access_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

create policy profiles_self on public.profiles for select using (id=auth.uid());
create policy organizations_member_select on public.organizations for select using (public.is_org_member(id));
create policy memberships_self_or_admin on public.organization_memberships for select using (
  user_id=auth.uid() or public.has_org_role(organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[])
);
create policy clients_internal_or_owner on public.clients for select using (
  public.is_org_member(organization_id) or user_id=auth.uid()
);
create policy projects_internal_or_client on public.projects for select using (
  public.is_org_member(organization_id) or public.is_client_owner(client_id)
);
create policy opportunities_internal on public.opportunities for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy audit_internal_read on public.audit_events for select using (
  public.has_org_role(organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR','FINANCEIRO']::public.org_role[])
);

-- Políticas internas genéricas.
do $$
declare t text;
begin
  foreach t in array array[
    'cost_catalog_items','cost_compositions','cost_composition_versions','cost_composition_items',
    'fixed_costs','administrative_fee_models','bdi_models','bdi_model_versions','markup_models',
    'budgets','budget_versions','budget_sections','budget_items','budget_scenarios',
    'budget_approvals','budget_validation_results','contract_templates','contract_parties',
    'signature_envelopes','signature_signers','signature_events','document_access_logs'
  ] loop
    execute format(
      'create policy %I_internal on public.%I for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id))',
      t, t
    );
  end loop;
end $$;

create policy proposals_internal_or_client on public.proposals for select using (
  public.is_org_member(organization_id) or (public.is_client_owner(client_id) and client_released_at is not null)
);
create policy proposals_internal_write on public.proposals for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy proposal_versions_internal_or_client on public.proposal_versions for select using (
  public.is_org_member(organization_id) or (
    client_released_at is not null and exists(
      select 1 from public.proposals p where p.id=proposal_id and public.is_client_owner(p.client_id)
    )
  )
);
create policy proposal_versions_internal_write on public.proposal_versions for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy proposal_acceptance_client on public.proposal_acceptances for select using (client_user_id=auth.uid() or public.is_org_member(organization_id));

create policy contracts_internal_or_client on public.contracts for select using (
  public.is_org_member(organization_id) or (public.is_client_owner(client_id) and client_released_at is not null)
);
create policy contracts_internal_write on public.contracts for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy contract_versions_internal_or_client on public.contract_versions for select using (
  public.is_org_member(organization_id) or (
    client_released_at is not null and exists(
      select 1 from public.contracts c where c.id=contract_id and public.is_client_owner(c.client_id)
    )
  )
);
create policy contract_versions_internal_write on public.contract_versions for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

create policy amendments_internal_or_client on public.amendments for select using (
  public.is_org_member(organization_id) or (
    client_released_at is not null and exists(
      select 1 from public.contracts c where c.id=contract_id and public.is_client_owner(c.client_id)
    )
  )
);
create policy amendments_internal_write on public.amendments for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy amendment_versions_internal_or_client on public.amendment_versions for select using (
  public.is_org_member(organization_id) or (
    client_released_at is not null and exists(
      select 1 from public.amendments a join public.contracts c on c.id=a.contract_id
      where a.id=amendment_id and public.is_client_owner(c.client_id)
    )
  )
);
create policy amendment_versions_internal_write on public.amendment_versions for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

-- Storage privado
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values
  ('commercial-documents','commercial-documents',false,20971520,array['application/pdf']),
  ('contract-documents','contract-documents',false,20971520,array['application/pdf']),
  ('signature-artifacts','signature-artifacts',false,20971520,array['application/pdf','application/json'])
on conflict(id) do update set public=false;

create policy commercial_documents_internal on storage.objects for all using (
  bucket_id='commercial-documents' and public.is_org_member((storage.foldername(name))[1]::uuid)
) with check (
  bucket_id='commercial-documents' and public.is_org_member((storage.foldername(name))[1]::uuid)
);
create policy contract_documents_internal on storage.objects for all using (
  bucket_id='contract-documents' and public.is_org_member((storage.foldername(name))[1]::uuid)
) with check (
  bucket_id='contract-documents' and public.is_org_member((storage.foldername(name))[1]::uuid)
);
create policy signature_artifacts_internal on storage.objects for all using (
  bucket_id='signature-artifacts' and public.is_org_member((storage.foldername(name))[1]::uuid)
) with check (
  bucket_id='signature-artifacts' and public.is_org_member((storage.foldername(name))[1]::uuid)
);

-- Eventos imutáveis: nenhum UPDATE/DELETE direto para authenticated.
revoke update, delete on public.audit_events from authenticated;
revoke update, delete on public.signature_events from authenticated;
revoke update, delete on public.document_access_logs from authenticated;

commit;
