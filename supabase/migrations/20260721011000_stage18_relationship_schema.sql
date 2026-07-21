-- Etapa 18 — CRM, Cliente 360 e SAC: schema-base.

alter table public.clients
  add column if not exists source text,
  add column if not exists segment text,
  add column if not exists preferred_contact_channel text not null default 'EMAIL',
  add column if not exists lifecycle_stage text not null default 'CUSTOMER',
  add column if not exists assigned_owner_id uuid references auth.users(id),
  add column if not exists last_contact_at timestamptz,
  add column if not exists next_follow_up_at timestamptz;

alter table public.clients drop constraint if exists clients_preferred_contact_channel_check;
alter table public.clients add constraint clients_preferred_contact_channel_check
  check (preferred_contact_channel in ('EMAIL','PHONE','WHATSAPP','PORTAL','NONE'));
alter table public.clients drop constraint if exists clients_lifecycle_stage_check;
alter table public.clients add constraint clients_lifecycle_stage_check
  check (lifecycle_stage in ('PROSPECT','CUSTOMER','ACTIVE','INACTIVE','FORMER'));

create table if not exists public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  stage text not null default 'NEW' check (stage in ('NEW','CONTACTED','QUALIFIED','DISQUALIFIED','CONVERTED')),
  full_name text not null,
  company_name text,
  email text,
  phone text,
  tax_id text,
  source text,
  campaign text,
  interest text,
  estimated_budget numeric(18,2) check (estimated_budget is null or estimated_budget>=0),
  city text,
  state text,
  owner_id uuid references auth.users(id),
  next_follow_up_at timestamptz,
  notes text,
  consent_contact boolean not null default false,
  consent_source text,
  converted_client_id uuid references public.clients(id),
  converted_opportunity_id uuid references public.opportunities(id),
  disqualified_reason text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique(organization_id,code)
);

alter table public.clients
  add column if not exists converted_from_lead_id uuid references public.crm_leads(id);

alter table public.opportunities
  add column if not exists lead_id uuid references public.crm_leads(id),
  add column if not exists code text,
  add column if not exists description text,
  add column if not exists estimated_value numeric(18,2) check (estimated_value is null or estimated_value>=0),
  add column if not exists probability numeric(5,2) not null default 25 check (probability between 0 and 100),
  add column if not exists expected_close_date date,
  add column if not exists source text,
  add column if not exists lost_reason text,
  add column if not exists closed_at timestamptz,
  add column if not exists archived_at timestamptz;

alter table public.opportunities drop constraint if exists opportunities_stage_stage18_check;
alter table public.opportunities add constraint opportunities_stage_stage18_check
  check (stage in ('PROSPECTING','QUALIFIED','PROPOSAL','NEGOTIATION','WON','LOST'));

create unique index if not exists opportunities_org_code_uidx
  on public.opportunities(organization_id,code) where code is not null;

create table if not exists public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  full_name text not null,
  role_title text,
  email text,
  phone text,
  preferred_channel text not null default 'EMAIL' check (preferred_channel in ('EMAIL','PHONE','WHATSAPP','PORTAL','NONE')),
  is_primary boolean not null default false,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create unique index if not exists client_contacts_one_primary_idx
  on public.client_contacts(client_id) where is_primary and archived_at is null;

create table if not exists public.client_consents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  kind text not null check (kind in ('DATA_PROCESSING','MARKETING','EMAIL','WHATSAPP','IMAGE','RESEARCH')),
  granted boolean not null,
  source text not null,
  evidence text,
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.sac_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  default_priority text not null default 'NORMAL' check (default_priority in ('LOW','NORMAL','HIGH','URGENT')),
  first_response_sla_hours integer not null default 24 check (first_response_sla_hours>0),
  resolution_sla_hours integer not null default 120 check (resolution_sla_hours>0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,code)
);

create table if not exists public.sac_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  client_id uuid not null references public.clients(id),
  project_id uuid references public.projects(id),
  contract_id uuid references public.contracts(id),
  category_id uuid references public.sac_categories(id),
  title text not null,
  description text not null,
  source text not null default 'INTERNAL' check (source in ('INTERNAL','PORTAL','EMAIL','PHONE','WHATSAPP')),
  priority text not null default 'NORMAL' check (priority in ('LOW','NORMAL','HIGH','URGENT')),
  status text not null default 'OPEN' check (status in ('OPEN','TRIAGE','IN_PROGRESS','WAITING_CLIENT','WAITING_INTERNAL','RESOLVED','CLOSED','CANCELLED')),
  assigned_to uuid references auth.users(id),
  first_response_due_at timestamptz,
  resolution_due_at timestamptz,
  first_responded_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  reopened_at timestamptz,
  satisfaction_score integer check (satisfaction_score is null or satisfaction_score between 1 and 5),
  satisfaction_comment text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,code)
);

create table if not exists public.sac_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ticket_id uuid not null references public.sac_tickets(id) on delete cascade,
  visibility text not null default 'CLIENT' check (visibility in ('INTERNAL','CLIENT')),
  body text not null,
  author_user_id uuid references auth.users(id),
  author_client_id uuid references public.clients(id),
  created_at timestamptz not null default now(),
  check (author_user_id is not null or author_client_id is not null)
);

create table if not exists public.sac_ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ticket_id uuid not null references public.sac_tickets(id) on delete cascade,
  message_id uuid references public.sac_ticket_messages(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes>0 and size_bytes<=26214400),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  client_visible boolean not null default true,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(organization_id,storage_path)
);

create table if not exists public.sac_ticket_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ticket_id uuid not null references public.sac_tickets(id) on delete cascade,
  event_type text not null,
  actor_user_id uuid references auth.users(id),
  actor_client_id uuid references public.clients(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  activity_type text not null check (activity_type in ('NOTE','CALL','EMAIL','MESSAGE','MEETING','VISIT','FOLLOW_UP')),
  subject text not null,
  description text,
  lead_id uuid references public.crm_leads(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  ticket_id uuid references public.sac_tickets(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  due_at timestamptz,
  completed_at timestamptz,
  owner_id uuid references auth.users(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(lead_id,opportunity_id,client_id,ticket_id)=1)
);

create table if not exists public.crm_opportunity_stage_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  reason text,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

create index if not exists clients_org_lifecycle_idx on public.clients(organization_id,lifecycle_stage,archived_at);
create index if not exists clients_org_owner_idx on public.clients(organization_id,assigned_owner_id);
create index if not exists clients_email_normalized_idx on public.clients(organization_id,lower(trim(email))) where email is not null and archived_at is null;
create index if not exists clients_phone_normalized_idx on public.clients(organization_id,regexp_replace(phone,'\D','','g')) where phone is not null and archived_at is null;
create unique index if not exists clients_tax_id_normalized_uidx on public.clients(organization_id,regexp_replace(tax_id,'\D','','g')) where tax_id is not null and regexp_replace(tax_id,'\D','','g')<>'' and archived_at is null;
create index if not exists crm_leads_org_stage_idx on public.crm_leads(organization_id,stage,archived_at);
create index if not exists crm_leads_org_owner_followup_idx on public.crm_leads(organization_id,owner_id,next_follow_up_at) where archived_at is null;
create index if not exists crm_leads_email_idx on public.crm_leads(organization_id,lower(trim(email))) where email is not null and archived_at is null;
create index if not exists opportunities_org_stage_idx on public.opportunities(organization_id,stage,archived_at);
create index if not exists opportunities_org_owner_close_idx on public.opportunities(organization_id,owner_id,expected_close_date) where archived_at is null;
create index if not exists client_contacts_org_client_idx on public.client_contacts(organization_id,client_id,archived_at);
create index if not exists client_consents_org_client_idx on public.client_consents(organization_id,client_id,kind,occurred_at desc);
create index if not exists sac_categories_org_active_idx on public.sac_categories(organization_id,active);
create index if not exists sac_tickets_org_status_idx on public.sac_tickets(organization_id,status,priority,created_at desc);
create index if not exists sac_tickets_client_idx on public.sac_tickets(client_id,status,created_at desc);
create index if not exists sac_tickets_project_idx on public.sac_tickets(project_id,status) where project_id is not null;
create index if not exists sac_tickets_assignee_idx on public.sac_tickets(assigned_to,status,resolution_due_at) where assigned_to is not null;
create index if not exists sac_ticket_messages_ticket_idx on public.sac_ticket_messages(ticket_id,created_at);
create index if not exists sac_ticket_attachments_ticket_idx on public.sac_ticket_attachments(ticket_id,created_at);
create index if not exists sac_ticket_events_ticket_idx on public.sac_ticket_events(ticket_id,created_at);
create index if not exists crm_activities_org_due_idx on public.crm_activities(organization_id,owner_id,due_at) where completed_at is null;
create index if not exists crm_activities_lead_idx on public.crm_activities(lead_id,occurred_at desc) where lead_id is not null;
create index if not exists crm_activities_opportunity_idx on public.crm_activities(opportunity_id,occurred_at desc) where opportunity_id is not null;
create index if not exists crm_activities_client_idx on public.crm_activities(client_id,occurred_at desc) where client_id is not null;
create index if not exists crm_activities_ticket_idx on public.crm_activities(ticket_id,occurred_at desc) where ticket_id is not null;
create index if not exists crm_stage_history_opportunity_idx on public.crm_opportunity_stage_history(opportunity_id,changed_at desc);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('crm-sac-attachments','crm-sac-attachments',false,26214400,array['application/pdf','image/jpeg','image/png','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
