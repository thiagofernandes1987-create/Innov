-- Etapa 13 — Qualidade, FVS/FVM e formulários dinâmicos.

create extension if not exists pgcrypto;

do $$ begin
  create type public.quality_document_kind as enum ('PROCEDURE','FVS','FVM','FORM_ATTACHMENT','SURVEY_REPORT','OTHER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.quality_form_kind as enum ('FVS','FVM','INTERNAL_FORM','CLIENT_FORM','SURVEY');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.quality_form_scope as enum ('INTERNAL','CLIENT','PUBLIC');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.quality_form_status as enum ('DRAFT','PUBLISHED','ARCHIVED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.quality_assignment_status as enum ('PENDING','OPEN','COMPLETED','EXPIRED','CANCELED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.quality_response_status as enum ('DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED');
exception when duplicate_object then null; end $$;

create table if not exists public.quality_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  logical_id uuid not null default gen_random_uuid(),
  version_number integer not null default 1 check (version_number > 0),
  kind public.quality_document_kind not null default 'OTHER',
  title text not null,
  description text not null default '',
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  storage_path text not null unique,
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  client_visible boolean not null default false,
  is_current boolean not null default true,
  uploaded_by uuid,
  created_at timestamptz not null default now(),
  unique (logical_id, version_number)
);

create table if not exists public.quality_form_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  title text not null,
  description text not null default '',
  kind public.quality_form_kind not null,
  scope public.quality_form_scope not null default 'INTERNAL',
  status public.quality_form_status not null default 'DRAFT',
  current_version_id uuid,
  allow_attachments boolean not null default true,
  allow_photos boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table if not exists public.quality_form_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_id uuid not null references public.quality_form_templates(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  schema_json jsonb not null,
  presentation_json jsonb not null default '{}'::jsonb,
  change_summary text not null default '',
  frozen_at timestamptz,
  frozen_by uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (template_id, version_number),
  check (jsonb_typeof(schema_json) = 'object')
);

alter table public.quality_form_templates
  drop constraint if exists quality_form_templates_current_version_id_fkey;
alter table public.quality_form_templates
  add constraint quality_form_templates_current_version_id_fkey
  foreign key (current_version_id) references public.quality_form_versions(id) on delete set null;

create table if not exists public.quality_form_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_version_id uuid not null references public.quality_form_versions(id) on delete restrict,
  project_id uuid references public.projects(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  assignee_user_id uuid,
  title text not null,
  instructions text not null default '',
  status public.quality_assignment_status not null default 'PENDING',
  opens_at timestamptz not null default now(),
  due_at timestamptz,
  max_responses integer not null default 1 check (max_responses > 0),
  responses_count integer not null default 0 check (responses_count >= 0),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quality_public_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assignment_id uuid not null references public.quality_form_assignments(id) on delete cascade,
  token_sha256 text not null unique check (token_sha256 ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz,
  revoked_at timestamptz,
  last_access_at timestamptz,
  access_count integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.quality_form_responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assignment_id uuid not null references public.quality_form_assignments(id) on delete restrict,
  template_version_id uuid not null references public.quality_form_versions(id) on delete restrict,
  project_id uuid references public.projects(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  respondent_user_id uuid,
  respondent_name text,
  respondent_email text,
  status public.quality_response_status not null default 'DRAFT',
  score numeric(8,2),
  result text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  review_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quality_form_answers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  response_id uuid not null references public.quality_form_responses(id) on delete cascade,
  field_key text not null,
  value_json jsonb,
  file_name text,
  file_mime_type text,
  file_size_bytes bigint,
  file_storage_path text,
  file_sha256 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (response_id, field_key),
  check (file_sha256 is null or file_sha256 ~ '^[a-f0-9]{64}$')
);

create table if not exists public.quality_form_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_id uuid references public.quality_form_templates(id) on delete set null,
  assignment_id uuid references public.quality_form_assignments(id) on delete set null,
  response_id uuid references public.quality_form_responses(id) on delete set null,
  actor_user_id uuid,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists quality_documents_org_kind_idx on public.quality_documents(organization_id,kind,created_at desc);
create index if not exists quality_documents_project_idx on public.quality_documents(project_id,client_visible,is_current);
create index if not exists quality_form_templates_org_kind_idx on public.quality_form_templates(organization_id,kind,status);
create index if not exists quality_form_versions_template_idx on public.quality_form_versions(template_id,version_number desc);
create index if not exists quality_assignments_org_status_idx on public.quality_form_assignments(organization_id,status,due_at);
create index if not exists quality_assignments_client_idx on public.quality_form_assignments(client_id,status);
create index if not exists quality_responses_assignment_idx on public.quality_form_responses(assignment_id,status,created_at desc);
create index if not exists quality_answers_response_idx on public.quality_form_answers(response_id);
create index if not exists quality_events_org_created_idx on public.quality_form_events(organization_id,created_at desc);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'quality-documents','quality-documents',false,52428800,
  array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/png','image/jpeg','image/webp']
)
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'quality-form-attachments','quality-form-attachments',false,20971520,
  array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg','image/webp','image/heic']
)
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
