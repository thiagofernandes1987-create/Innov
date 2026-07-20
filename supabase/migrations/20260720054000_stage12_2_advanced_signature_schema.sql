-- Etapa 12.2 — documentos PDF/DOCX, campos posicionáveis, anexos e evidências.

do $$ begin
  create type public.signature_document_status as enum (
    'DRAFT','LAYOUT_READY','SIGNATURE_PENDING','PARTIALLY_SIGNED','COMPLETED','CANCELED','ARCHIVED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.signature_source_format as enum ('PDF','DOCX');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.signature_conversion_status as enum (
    'NOT_REQUIRED','PENDING','PROCESSING','READY','FAILED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.signature_field_type as enum (
    'SIGNATURE','INITIALS','DATE','FULL_NAME','TEXT','CHECKBOX','PHOTO','ATTACHMENT'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.signature_attachment_kind as enum ('PHOTO','DOCUMENT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.signature_delivery_channel as enum ('EMAIL','PORTAL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.signature_delivery_status as enum (
    'PENDING','SENT','DELIVERED','FAILED','CANCELED'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.signature_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  category text not null default 'OUTRO',
  status public.signature_document_status not null default 'DRAFT',
  current_version_id uuid,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.signature_document_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null references public.signature_documents(id) on delete cascade,
  version_number integer not null check(version_number > 0),
  source_format public.signature_source_format not null,
  original_storage_path text not null,
  original_file_name text not null,
  original_mime_type text not null check(original_mime_type in (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )),
  original_size_bytes bigint not null check(original_size_bytes > 0),
  original_sha256 text not null check(original_sha256 ~ '^[a-f0-9]{64}$'),
  rendered_pdf_path text,
  rendered_pdf_sha256 text check(rendered_pdf_sha256 is null or rendered_pdf_sha256 ~ '^[a-f0-9]{64}$'),
  final_pdf_path text,
  final_pdf_sha256 text check(final_pdf_sha256 is null or final_pdf_sha256 ~ '^[a-f0-9]{64}$'),
  audit_artifact_path text,
  audit_artifact_sha256 text check(audit_artifact_sha256 is null or audit_artifact_sha256 ~ '^[a-f0-9]{64}$'),
  conversion_status public.signature_conversion_status not null,
  conversion_error text,
  page_count integer check(page_count is null or page_count > 0),
  layout_frozen_at timestamptz,
  layout_frozen_by uuid references auth.users(id),
  completed_at timestamptz,
  completed_by uuid references auth.users(id),
  client_released_at timestamptz,
  client_released_by uuid references auth.users(id),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique(document_id,version_number),
  check(
    (source_format='PDF' and conversion_status in ('NOT_REQUIRED','READY'))
    or(source_format='DOCX' and conversion_status in ('PENDING','PROCESSING','READY','FAILED'))
  ),
  check(
    conversion_status<>'READY'
    or(rendered_pdf_path is not null and rendered_pdf_sha256 is not null and page_count is not null)
  ),
  check(
    completed_at is null
    or(final_pdf_path is not null and final_pdf_sha256 is not null and audit_artifact_path is not null and audit_artifact_sha256 is not null)
  )
);

alter table public.signature_documents
  drop constraint if exists signature_documents_current_version_id_fkey;
alter table public.signature_documents
  add constraint signature_documents_current_version_id_fkey
  foreign key(current_version_id) references public.signature_document_versions(id) on delete set null;

alter table public.signature_envelopes
  add column if not exists document_version_id uuid references public.signature_document_versions(id),
  add column if not exists final_document_sha256 text,
  add column if not exists evidence_sha256 text,
  add column if not exists client_copy_required boolean not null default true,
  add column if not exists client_copy_sent_at timestamptz;

alter table public.signature_envelopes
  drop constraint if exists signature_envelopes_check;
alter table public.signature_envelopes
  add constraint signature_envelopes_single_target_check
  check(
    ((contract_version_id is not null)::integer
    +(amendment_version_id is not null)::integer
    +(document_version_id is not null)::integer)=1
  );
alter table public.signature_envelopes
  drop constraint if exists signature_envelopes_final_document_sha256_check;
alter table public.signature_envelopes
  add constraint signature_envelopes_final_document_sha256_check
  check(final_document_sha256 is null or final_document_sha256 ~ '^[a-f0-9]{64}$');
alter table public.signature_envelopes
  drop constraint if exists signature_envelopes_evidence_sha256_check;
alter table public.signature_envelopes
  add constraint signature_envelopes_evidence_sha256_check
  check(evidence_sha256 is null or evidence_sha256 ~ '^[a-f0-9]{64}$');

alter table public.signature_signers
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists legal_name text,
  add column if not exists initials text,
  add column if not exists authentication_method text not null default 'EMAIL_LINK',
  add column if not exists authentication_metadata jsonb not null default '{}'::jsonb,
  add column if not exists copy_sent_at timestamptz;

create table if not exists public.signature_fields (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_version_id uuid not null references public.signature_document_versions(id) on delete cascade,
  signer_id uuid references public.signature_signers(id) on delete set null,
  field_type public.signature_field_type not null,
  page_number integer not null check(page_number > 0),
  x_ratio numeric(8,6) not null check(x_ratio >= 0 and x_ratio <= 1),
  y_ratio numeric(8,6) not null check(y_ratio >= 0 and y_ratio <= 1),
  width_ratio numeric(8,6) not null check(width_ratio > 0 and width_ratio <= 1),
  height_ratio numeric(8,6) not null check(height_ratio > 0 and height_ratio <= 1),
  label text,
  placeholder text,
  required boolean not null default true,
  signing_order integer not null default 1 check(signing_order > 0),
  config jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(x_ratio + width_ratio <= 1.000001),
  check(y_ratio + height_ratio <= 1.000001)
);

create table if not exists public.signature_field_values (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  field_id uuid not null unique references public.signature_fields(id) on delete cascade,
  signer_id uuid references public.signature_signers(id) on delete set null,
  text_value text,
  boolean_value boolean,
  file_storage_path text,
  file_name text,
  file_mime_type text,
  file_size_bytes bigint check(file_size_bytes is null or file_size_bytes > 0),
  file_sha256 text check(file_sha256 is null or file_sha256 ~ '^[a-f0-9]{64}$'),
  value_sha256 text not null check(value_sha256 ~ '^[a-f0-9]{64}$'),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.signature_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  envelope_id uuid not null references public.signature_envelopes(id) on delete cascade,
  signer_id uuid references public.signature_signers(id) on delete set null,
  field_id uuid references public.signature_fields(id) on delete set null,
  kind public.signature_attachment_kind not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check(size_bytes > 0),
  sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
  captured_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.signature_delivery_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  envelope_id uuid not null references public.signature_envelopes(id) on delete cascade,
  recipient_user_id uuid references auth.users(id) on delete set null,
  recipient_email text not null,
  channel public.signature_delivery_channel not null,
  status public.signature_delivery_status not null default 'PENDING',
  copy_storage_path text,
  copy_sha256 text check(copy_sha256 is null or copy_sha256 ~ '^[a-f0-9]{64}$'),
  attempts integer not null default 0 check(attempts >= 0),
  last_error text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.signature_evidence_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  envelope_id uuid not null references public.signature_envelopes(id) on delete cascade,
  signer_id uuid references public.signature_signers(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  document_sha256 text check(document_sha256 is null or document_sha256 ~ '^[a-f0-9]{64}$'),
  payload_sha256 text not null check(payload_sha256 ~ '^[a-f0-9]{64}$'),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists signature_documents_org_status_idx
  on public.signature_documents(organization_id,status,updated_at desc);
create index if not exists signature_documents_client_idx
  on public.signature_documents(client_id,created_at desc) where client_id is not null;
create index if not exists signature_documents_project_idx
  on public.signature_documents(project_id,created_at desc) where project_id is not null;
create index if not exists signature_document_versions_document_idx
  on public.signature_document_versions(document_id,version_number desc);
create index if not exists signature_envelopes_document_version_idx
  on public.signature_envelopes(document_version_id) where document_version_id is not null;
create index if not exists signature_fields_version_page_idx
  on public.signature_fields(document_version_id,page_number,signing_order);
create index if not exists signature_fields_signer_idx
  on public.signature_fields(signer_id) where signer_id is not null;
create index if not exists signature_attachments_envelope_idx
  on public.signature_attachments(envelope_id,created_at);
create index if not exists signature_delivery_events_envelope_idx
  on public.signature_delivery_events(envelope_id,created_at desc);
create index if not exists signature_evidence_records_envelope_idx
  on public.signature_evidence_records(envelope_id,occurred_at);
