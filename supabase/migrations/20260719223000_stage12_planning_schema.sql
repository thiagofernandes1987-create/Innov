begin;

create type public.task_status as enum (
  'BACKLOG','READY','IN_PROGRESS','BLOCKED','REVIEW','COMPLETED','CANCELED'
);
create type public.task_priority as enum ('LOW','NORMAL','HIGH','CRITICAL');
create type public.task_dependency_type as enum ('FS','SS','FF','SF');
create type public.daily_log_status as enum ('DRAFT','SUBMITTED','APPROVED','REJECTED');
create type public.project_document_status as enum ('DRAFT','REVIEW','APPROVED','RELEASED','ARCHIVED');
create type public.project_resource_type as enum ('LABOR','EQUIPMENT','MATERIAL','SUBCONTRACTOR');
create type public.schedule_baseline_status as enum ('DRAFT','FROZEN','SUPERSEDED');

alter table public.projects
  add column if not exists contract_id uuid references public.contracts(id) on delete set null,
  add column if not exists description text,
  add column if not exists address_line text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists postal_code text,
  add column if not exists planned_start date,
  add column if not exists planned_end date,
  add column if not exists actual_start date,
  add column if not exists actual_end date,
  add column if not exists progress numeric(7,6) not null default 0 check (progress between 0 and 1),
  add column if not exists manager_id uuid references auth.users(id) on delete set null,
  add column if not exists client_released_at timestamptz,
  add column if not exists archived_at timestamptz;

create index if not exists projects_org_status_idx on public.projects(organization_id,status);
create index if not exists projects_client_idx on public.projects(client_id);
create index if not exists projects_manager_idx on public.projects(manager_id);
create unique index if not exists projects_org_contract_uidx
  on public.projects(organization_id,contract_id) where contract_id is not null;

create table public.project_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.org_role not null,
  active boolean not null default true,
  can_edit_schedule boolean not null default false,
  can_write_daily_logs boolean not null default false,
  can_release_client_content boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(project_id,user_id)
);
create index project_memberships_org_idx on public.project_memberships(organization_id);
create index project_memberships_user_idx on public.project_memberships(user_id,active);

create table public.work_breakdown_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  parent_id uuid references public.work_breakdown_items(id) on delete cascade,
  code text not null,
  title text not null,
  description text,
  sequence integer not null default 0,
  weight numeric(12,8) not null default 0 check (weight between 0 and 1),
  status text not null default 'PLANNED' check (status in ('PLANNED','ACTIVE','COMPLETED','CANCELED')),
  planned_start date,
  planned_end date,
  actual_start date,
  actual_end date,
  progress numeric(7,6) not null default 0 check (progress between 0 and 1),
  client_visible boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id,code)
);
create index work_breakdown_project_parent_idx on public.work_breakdown_items(project_id,parent_id,sequence);

create table public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  wbs_id uuid references public.work_breakdown_items(id) on delete set null,
  parent_task_id uuid references public.project_tasks(id) on delete cascade,
  code text not null,
  title text not null,
  description text,
  status public.task_status not null default 'BACKLOG',
  priority public.task_priority not null default 'NORMAL',
  sequence integer not null default 0,
  planned_start date,
  planned_end date,
  actual_start date,
  actual_end date,
  duration_days numeric(10,2) not null default 1 check (duration_days >= 0),
  progress numeric(7,6) not null default 0 check (progress between 0 and 1),
  weight numeric(12,8) not null default 0 check (weight between 0 and 1),
  responsible_id uuid references auth.users(id) on delete set null,
  blocked_reason text,
  client_visible boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id,code),
  check (planned_end is null or planned_start is null or planned_end >= planned_start),
  check (actual_end is null or actual_start is null or actual_end >= actual_start)
);
create index project_tasks_project_status_idx on public.project_tasks(project_id,status,planned_start);
create index project_tasks_responsible_idx on public.project_tasks(responsible_id,status);
create index project_tasks_wbs_idx on public.project_tasks(wbs_id,sequence);

create table public.task_dependencies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  predecessor_task_id uuid not null references public.project_tasks(id) on delete cascade,
  successor_task_id uuid not null references public.project_tasks(id) on delete cascade,
  dependency_type public.task_dependency_type not null default 'FS',
  lag_days numeric(10,2) not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(predecessor_task_id,successor_task_id),
  check (predecessor_task_id <> successor_task_id)
);
create index task_dependencies_project_idx on public.task_dependencies(project_id);
create index task_dependencies_successor_idx on public.task_dependencies(successor_task_id);

create table public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  code text not null,
  title text not null,
  description text,
  planned_date date not null,
  actual_date date,
  completed boolean not null default false,
  client_visible boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id,code)
);
create index project_milestones_project_date_idx on public.project_milestones(project_id,planned_date);

create table public.schedule_baselines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  version_number integer not null,
  name text not null,
  status public.schedule_baseline_status not null default 'DRAFT',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  frozen_by uuid references auth.users(id) on delete set null,
  frozen_at timestamptz,
  created_at timestamptz not null default now(),
  unique(project_id,version_number)
);
create index schedule_baselines_project_idx on public.schedule_baselines(project_id,status);

create table public.schedule_baseline_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  baseline_id uuid not null references public.schedule_baselines(id) on delete cascade,
  task_id uuid not null references public.project_tasks(id) on delete cascade,
  planned_start date,
  planned_end date,
  duration_days numeric(10,2) not null default 1,
  weight numeric(12,8) not null default 0,
  created_at timestamptz not null default now(),
  unique(baseline_id,task_id)
);
create index schedule_baseline_tasks_baseline_idx on public.schedule_baseline_tasks(baseline_id);

create table public.project_resources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  resource_type public.project_resource_type not null,
  code text,
  name text not null,
  unit text not null default 'un',
  hourly_cost numeric(18,4),
  daily_cost numeric(18,4),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id,code)
);
create index project_resources_project_type_idx on public.project_resources(project_id,resource_type,active);

create table public.task_resource_allocations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid not null references public.project_tasks(id) on delete cascade,
  resource_id uuid not null references public.project_resources(id) on delete cascade,
  planned_quantity numeric(18,4) not null default 0,
  actual_quantity numeric(18,4) not null default 0,
  planned_hours numeric(18,4) not null default 0,
  actual_hours numeric(18,4) not null default 0,
  planned_start date,
  planned_end date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(task_id,resource_id)
);
create index task_resource_allocations_project_idx on public.task_resource_allocations(project_id,task_id);

create table public.project_teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  specialty text,
  leader_user_id uuid references auth.users(id) on delete set null,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id,name)
);

create table public.project_team_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  team_id uuid not null references public.project_teams(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  role_label text,
  hourly_cost numeric(18,4),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index project_team_members_team_idx on public.project_team_members(team_id,active);

create table public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  log_date date not null,
  status public.daily_log_status not null default 'DRAFT',
  shift text not null default 'DAY',
  weather text,
  min_temperature numeric(6,2),
  max_temperature numeric(6,2),
  summary text,
  planned_activities text,
  executed_activities text,
  occurrences text,
  safety_notes text,
  quality_notes text,
  delay_notes text,
  client_visible boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  submitted_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id,log_date,shift)
);
create index daily_logs_project_date_idx on public.daily_logs(project_id,log_date desc);
create index daily_logs_status_idx on public.daily_logs(organization_id,status);

create table public.daily_log_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  daily_log_id uuid not null references public.daily_logs(id) on delete cascade,
  task_id uuid references public.project_tasks(id) on delete set null,
  description text not null,
  unit text,
  executed_quantity numeric(18,4),
  progress_before numeric(7,6) check (progress_before between 0 and 1),
  progress_after numeric(7,6) check (progress_after between 0 and 1),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index daily_log_activities_log_idx on public.daily_log_activities(daily_log_id);

create table public.daily_log_resources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  daily_log_id uuid not null references public.daily_logs(id) on delete cascade,
  resource_id uuid references public.project_resources(id) on delete set null,
  resource_name text not null,
  unit text not null default 'un',
  quantity numeric(18,4) not null default 0,
  hours numeric(18,4) not null default 0,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index daily_log_resources_log_idx on public.daily_log_resources(daily_log_id);

create table public.daily_log_media (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  daily_log_id uuid not null references public.daily_logs(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  sha256 text,
  caption text,
  captured_at timestamptz,
  client_visible boolean not null default false,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(daily_log_id,storage_path)
);
create index daily_log_media_log_idx on public.daily_log_media(daily_log_id,client_visible);

create table public.project_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  code text not null,
  title text not null,
  discipline text not null,
  category text not null,
  status public.project_document_status not null default 'DRAFT',
  current_version_id uuid,
  client_visible boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id,code)
);
create index project_documents_project_discipline_idx on public.project_documents(project_id,discipline,status);

create table public.project_document_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  document_id uuid not null references public.project_documents(id) on delete cascade,
  version_number integer not null,
  status public.project_document_status not null default 'DRAFT',
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  sha256 text,
  change_summary text,
  uploaded_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  approved_at timestamptz,
  client_released_at timestamptz,
  created_at timestamptz not null default now(),
  unique(document_id,version_number)
);
alter table public.project_documents
  add constraint project_documents_current_version_fk
  foreign key(current_version_id) references public.project_document_versions(id) on delete set null;
create index project_document_versions_document_idx on public.project_document_versions(document_id,version_number desc);

create table public.project_progress_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  snapshot_date date not null,
  planned_progress numeric(7,6) not null default 0 check (planned_progress between 0 and 1),
  actual_progress numeric(7,6) not null default 0 check (actual_progress between 0 and 1),
  source text not null default 'SYSTEM',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(project_id,snapshot_date,source)
);
create index project_progress_snapshots_project_date_idx on public.project_progress_snapshots(project_id,snapshot_date);

commit;
