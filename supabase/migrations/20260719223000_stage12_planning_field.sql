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

create or replace function public.is_project_client(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public,auth,pg_temp
as $$
  select exists(
    select 1
    from public.projects p
    where p.id=p_project_id
      and p.client_released_at is not null
      and p.client_id is not null
      and public.is_client_owner(p.client_id)
  );
$$;

create or replace function public.can_access_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public,auth,pg_temp
as $$
  select exists(
    select 1
    from public.projects p
    where p.id=p_project_id
      and (
        public.has_org_role(p.organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[])
        or exists(
          select 1 from public.project_memberships pm
          where pm.project_id=p.id and pm.user_id=auth.uid() and pm.active
        )
      )
  );
$$;

create or replace function public.can_manage_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public,auth,pg_temp
as $$
  select exists(
    select 1
    from public.projects p
    where p.id=p_project_id
      and (
        public.has_org_role(p.organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR','GESTOR_OBRAS','ENGENHEIRO']::public.org_role[])
        or exists(
          select 1 from public.project_memberships pm
          where pm.project_id=p.id and pm.user_id=auth.uid() and pm.active
            and pm.role in ('GESTOR_OBRAS','ENGENHEIRO')
        )
      )
  );
$$;

create or replace function public.create_project_from_contract(
  p_contract_id uuid,
  p_code text,
  p_name text,
  p_planned_start date,
  p_planned_end date,
  p_address_line text default null,
  p_city text default null,
  p_state text default null
) returns uuid
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_contract public.contracts;
  v_project_id uuid;
begin
  select * into v_contract from public.contracts where id=p_contract_id for update;
  if not found then raise exception 'Contrato não encontrado'; end if;
  if v_contract.status not in ('SIGNED','ACTIVE','AMENDED') then
    raise exception 'O contrato precisa estar assinado ou ativo';
  end if;
  if not public.has_org_role(v_contract.organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR','GESTOR_OBRAS']::public.org_role[]) then
    raise exception 'Acesso negado';
  end if;
  if p_planned_end < p_planned_start then raise exception 'Período planejado inválido'; end if;

  insert into public.projects(
    organization_id,client_id,contract_id,code,name,status,planned_start,planned_end,
    address_line,city,state,manager_id,created_by
  ) values (
    v_contract.organization_id,v_contract.client_id,v_contract.id,upper(trim(p_code)),trim(p_name),'PLANNING',
    p_planned_start,p_planned_end,p_address_line,p_city,p_state,auth.uid(),auth.uid()
  ) returning id into v_project_id;

  insert into public.project_memberships(
    organization_id,project_id,user_id,role,active,can_edit_schedule,can_write_daily_logs,
    can_release_client_content,created_by
  ) values (
    v_contract.organization_id,v_project_id,auth.uid(),'GESTOR_OBRAS',true,true,true,true,auth.uid()
  ) on conflict(project_id,user_id) do nothing;

  update public.contracts set project_id=v_project_id where id=v_contract.id;
  perform public.write_audit(v_contract.organization_id,'PROJECT',v_project_id,'CREATE_FROM_CONTRACT',jsonb_build_object('contract_id',v_contract.id),v_project_id);
  return v_project_id;
end;
$$;

create or replace function public.recalculate_project_progress(p_project_id uuid)
returns numeric
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_org uuid;
  v_progress numeric(7,6);
  v_planned numeric(7,6);
  v_today date:=current_date;
begin
  select organization_id into v_org from public.projects where id=p_project_id;
  if not public.can_manage_project(p_project_id) then raise exception 'Acesso negado'; end if;

  select coalesce(
    case when sum(case when status <> 'CANCELED' then weight else 0 end)>0
      then sum(case when status <> 'CANCELED' then weight*progress else 0 end)/sum(case when status <> 'CANCELED' then weight else 0 end)
      else avg(case when status <> 'CANCELED' then progress end)
    end,0
  ) into v_progress
  from public.project_tasks where project_id=p_project_id;

  select coalesce(avg(
    case
      when planned_start is null or planned_end is null then 0
      when v_today < planned_start then 0
      when v_today >= planned_end then 1
      else greatest(0,least(1,(v_today-planned_start)::numeric/nullif((planned_end-planned_start),0)))
    end
  ),0) into v_planned
  from public.project_tasks where project_id=p_project_id and status <> 'CANCELED';

  update public.projects set progress=v_progress,updated_at=now() where id=p_project_id;
  insert into public.project_progress_snapshots(
    organization_id,project_id,snapshot_date,planned_progress,actual_progress,source,created_by
  ) values (v_org,p_project_id,current_date,v_planned,v_progress,'SYSTEM',auth.uid())
  on conflict(project_id,snapshot_date,source)
  do update set planned_progress=excluded.planned_progress,actual_progress=excluded.actual_progress,created_at=now();

  perform public.write_audit(v_org,'PROJECT',p_project_id,'RECALCULATE_PROGRESS',jsonb_build_object('planned',v_planned,'actual',v_progress),p_project_id);
  return v_progress;
end;
$$;

create or replace function public.move_project_task(
  p_task_id uuid,
  p_status public.task_status,
  p_progress numeric default null,
  p_reason text default null
) returns public.project_tasks
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare v_task public.project_tasks;
begin
  select * into v_task from public.project_tasks where id=p_task_id for update;
  if not found then raise exception 'Tarefa não encontrada'; end if;
  if not public.can_manage_project(v_task.project_id) then raise exception 'Acesso negado'; end if;
  if p_status='BLOCKED' and nullif(trim(coalesce(p_reason,'')),'') is null then
    raise exception 'Motivo do bloqueio obrigatório';
  end if;

  update public.project_tasks set
    status=p_status,
    progress=coalesce(p_progress,case when p_status='COMPLETED' then 1 else progress end),
    blocked_reason=case when p_status='BLOCKED' then p_reason else null end,
    actual_start=case when p_status='IN_PROGRESS' then coalesce(actual_start,current_date) else actual_start end,
    actual_end=case when p_status='COMPLETED' then coalesce(actual_end,current_date) else actual_end end,
    updated_at=now()
  where id=p_task_id returning * into v_task;

  perform public.recalculate_project_progress(v_task.project_id);
  perform public.write_audit(v_task.organization_id,'PROJECT_TASK',v_task.id,'MOVE_STATUS',jsonb_build_object('status',v_task.status,'progress',v_task.progress,'reason',p_reason),v_task.project_id);
  return v_task;
end;
$$;

create or replace function public.create_schedule_baseline(p_project_id uuid,p_name text,p_notes text default null)
returns uuid
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare v_org uuid; v_id uuid; v_version integer;
begin
  if not public.can_manage_project(p_project_id) then raise exception 'Acesso negado'; end if;
  select organization_id into v_org from public.projects where id=p_project_id;
  select coalesce(max(version_number),0)+1 into v_version from public.schedule_baselines where project_id=p_project_id;
  insert into public.schedule_baselines(organization_id,project_id,version_number,name,status,notes,created_by,frozen_by,frozen_at)
  values(v_org,p_project_id,v_version,p_name,'FROZEN',p_notes,auth.uid(),auth.uid(),now()) returning id into v_id;
  insert into public.schedule_baseline_tasks(organization_id,baseline_id,task_id,planned_start,planned_end,duration_days,weight)
  select organization_id,v_id,id,planned_start,planned_end,duration_days,weight from public.project_tasks where project_id=p_project_id;
  update public.schedule_baselines set status='SUPERSEDED'
    where project_id=p_project_id and id<>v_id and status='FROZEN';
  perform public.write_audit(v_org,'SCHEDULE_BASELINE',v_id,'FREEZE',jsonb_build_object('version',v_version),p_project_id);
  return v_id;
end;
$$;

create or replace function public.submit_daily_log(p_daily_log_id uuid)
returns public.daily_logs
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare v public.daily_logs;
begin
  select * into v from public.daily_logs where id=p_daily_log_id for update;
  if not found then raise exception 'Diário não encontrado'; end if;
  if not public.can_access_project(v.project_id) then raise exception 'Acesso negado'; end if;
  if v.status not in ('DRAFT','REJECTED') then raise exception 'Estado inválido para envio'; end if;
  update public.daily_logs set status='SUBMITTED',submitted_by=auth.uid(),submitted_at=now(),rejection_reason=null,updated_at=now()
    where id=v.id returning * into v;
  perform public.write_audit(v.organization_id,'DAILY_LOG',v.id,'SUBMIT',jsonb_build_object('date',v.log_date),v.project_id);
  return v;
end;
$$;

create or replace function public.decide_daily_log(p_daily_log_id uuid,p_approve boolean,p_reason text default null,p_release_client boolean default false)
returns public.daily_logs
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare v public.daily_logs;
begin
  select * into v from public.daily_logs where id=p_daily_log_id for update;
  if not found then raise exception 'Diário não encontrado'; end if;
  if not public.can_manage_project(v.project_id) then raise exception 'Acesso negado'; end if;
  if v.status<>'SUBMITTED' then raise exception 'Somente diário enviado pode ser decidido'; end if;
  if not p_approve and nullif(trim(coalesce(p_reason,'')),'') is null then raise exception 'Motivo da rejeição obrigatório'; end if;
  update public.daily_logs set
    status=case when p_approve then 'APPROVED' else 'REJECTED' end,
    approved_by=case when p_approve then auth.uid() else null end,
    approved_at=case when p_approve then now() else null end,
    rejection_reason=case when p_approve then null else p_reason end,
    client_visible=case when p_approve then p_release_client else false end,
    updated_at=now()
  where id=v.id returning * into v;
  perform public.write_audit(v.organization_id,'DAILY_LOG',v.id,case when p_approve then 'APPROVE' else 'REJECT' end,jsonb_build_object('reason',p_reason,'client_visible',v.client_visible),v.project_id);
  return v;
end;
$$;

create or replace function public.release_project_document_version(p_version_id uuid)
returns public.project_document_versions
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare v public.project_document_versions; v_document public.project_documents;
begin
  select * into v from public.project_document_versions where id=p_version_id for update;
  if not found then raise exception 'Versão não encontrada'; end if;
  if not public.can_manage_project(v.project_id) then raise exception 'Acesso negado'; end if;
  if nullif(v.sha256,'') is null then raise exception 'Hash SHA-256 obrigatório'; end if;
  select * into v_document from public.project_documents where id=v.document_id for update;
  update public.project_document_versions set status='RELEASED',approved_by=coalesce(approved_by,auth.uid()),approved_at=coalesce(approved_at,now()),client_released_at=now()
    where id=v.id returning * into v;
  update public.project_documents set status='RELEASED',current_version_id=v.id,client_visible=true,updated_at=now()
    where id=v.document_id;
  perform public.write_audit(v.organization_id,'PROJECT_DOCUMENT_VERSION',v.id,'RELEASE_TO_CLIENT',jsonb_build_object('sha256',v.sha256),v.project_id);
  return v;
end;
$$;

create or replace function public.prevent_frozen_baseline_mutation()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if exists(select 1 from public.schedule_baselines where id=old.baseline_id and status='FROZEN') then
    raise exception 'Baseline congelada é imutável';
  end if;
  return coalesce(new,old);
end;
$$;

create trigger schedule_baseline_tasks_immutable
before update or delete on public.schedule_baseline_tasks
for each row execute function public.prevent_frozen_baseline_mutation();

create or replace function public.prevent_released_document_mutation()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if old.status='RELEASED' then raise exception 'Versão liberada é imutável'; end if;
  return new;
end;
$$;
create trigger project_document_versions_immutable
before update or delete on public.project_document_versions
for each row execute function public.prevent_released_document_mutation();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values
  ('project-documents','project-documents',false,52428800,array['application/pdf','image/jpeg','image/png','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('daily-log-media','daily-log-media',false,157286400,array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

alter table public.project_memberships enable row level security;
alter table public.work_breakdown_items enable row level security;
alter table public.project_tasks enable row level security;
alter table public.task_dependencies enable row level security;
alter table public.project_milestones enable row level security;
alter table public.schedule_baselines enable row level security;
alter table public.schedule_baseline_tasks enable row level security;
alter table public.project_resources enable row level security;
alter table public.task_resource_allocations enable row level security;
alter table public.project_teams enable row level security;
alter table public.project_team_members enable row level security;
alter table public.daily_logs enable row level security;
alter table public.daily_log_activities enable row level security;
alter table public.daily_log_resources enable row level security;
alter table public.daily_log_media enable row level security;
alter table public.project_documents enable row level security;
alter table public.project_document_versions enable row level security;
alter table public.project_progress_snapshots enable row level security;

create policy projects_internal_or_client_stage12 on public.projects for select to authenticated
using (public.can_access_project(id) or public.is_project_client(id));
create policy projects_internal_write_stage12 on public.projects for all to authenticated
using (public.can_manage_project(id)) with check (public.is_internal_member(organization_id));

create policy project_memberships_internal on public.project_memberships for all to authenticated
using (public.can_manage_project(project_id)) with check (public.can_manage_project(project_id));

create policy wbs_internal_or_client on public.work_breakdown_items for select to authenticated
using (public.can_access_project(project_id) or (client_visible and public.is_project_client(project_id)));
create policy wbs_internal_write on public.work_breakdown_items for all to authenticated
using (public.can_manage_project(project_id)) with check (public.can_manage_project(project_id));

create policy tasks_internal_or_client on public.project_tasks for select to authenticated
using (public.can_access_project(project_id) or (client_visible and public.is_project_client(project_id)));
create policy tasks_internal_write on public.project_tasks for all to authenticated
using (public.can_manage_project(project_id)) with check (public.can_manage_project(project_id));

create policy dependencies_internal on public.task_dependencies for all to authenticated
using (public.can_access_project(project_id)) with check (public.can_manage_project(project_id));

create policy milestones_internal_or_client on public.project_milestones for select to authenticated
using (public.can_access_project(project_id) or (client_visible and public.is_project_client(project_id)));
create policy milestones_internal_write on public.project_milestones for all to authenticated
using (public.can_manage_project(project_id)) with check (public.can_manage_project(project_id));

create policy baselines_internal on public.schedule_baselines for all to authenticated
using (public.can_access_project(project_id)) with check (public.can_manage_project(project_id));
create policy baseline_tasks_internal on public.schedule_baseline_tasks for all to authenticated
using (public.can_access_project((select project_id from public.schedule_baselines where id=baseline_id)))
with check (public.can_manage_project((select project_id from public.schedule_baselines where id=baseline_id)));

create policy resources_internal on public.project_resources for all to authenticated
using (public.can_access_project(project_id)) with check (public.can_manage_project(project_id));
create policy allocations_internal on public.task_resource_allocations for all to authenticated
using (public.can_access_project(project_id)) with check (public.can_manage_project(project_id));
create policy teams_internal on public.project_teams for all to authenticated
using (public.can_access_project(project_id)) with check (public.can_manage_project(project_id));
create policy team_members_internal on public.project_team_members for all to authenticated
using (public.can_access_project(project_id)) with check (public.can_manage_project(project_id));

create policy daily_logs_internal_or_client on public.daily_logs for select to authenticated
using (public.can_access_project(project_id) or (client_visible and status='APPROVED' and public.is_project_client(project_id)));
create policy daily_logs_internal_write on public.daily_logs for all to authenticated
using (public.can_access_project(project_id)) with check (public.can_access_project(project_id));

create policy daily_activities_internal_or_client on public.daily_log_activities for select to authenticated
using (public.can_access_project(project_id) or exists(select 1 from public.daily_logs d where d.id=daily_log_id and d.client_visible and d.status='APPROVED' and public.is_project_client(d.project_id)));
create policy daily_activities_internal_write on public.daily_log_activities for all to authenticated
using (public.can_access_project(project_id)) with check (public.can_access_project(project_id));
create policy daily_resources_internal_or_client on public.daily_log_resources for select to authenticated
using (public.can_access_project(project_id) or exists(select 1 from public.daily_logs d where d.id=daily_log_id and d.client_visible and d.status='APPROVED' and public.is_project_client(d.project_id)));
create policy daily_resources_internal_write on public.daily_log_resources for all to authenticated
using (public.can_access_project(project_id)) with check (public.can_access_project(project_id));
create policy daily_media_internal_or_client on public.daily_log_media for select to authenticated
using (public.can_access_project(project_id) or (client_visible and exists(select 1 from public.daily_logs d where d.id=daily_log_id and d.client_visible and d.status='APPROVED' and public.is_project_client(d.project_id))));
create policy daily_media_internal_write on public.daily_log_media for all to authenticated
using (public.can_access_project(project_id)) with check (public.can_access_project(project_id));

create policy project_documents_internal_or_client on public.project_documents for select to authenticated
using (public.can_access_project(project_id) or (client_visible and public.is_project_client(project_id)));
create policy project_documents_internal_write on public.project_documents for all to authenticated
using (public.can_manage_project(project_id)) with check (public.can_manage_project(project_id));
create policy project_document_versions_internal_or_client on public.project_document_versions for select to authenticated
using (public.can_access_project(project_id) or (client_released_at is not null and public.is_project_client(project_id)));
create policy project_document_versions_internal_write on public.project_document_versions for all to authenticated
using (public.can_manage_project(project_id)) with check (public.can_manage_project(project_id));

create policy progress_internal_or_client on public.project_progress_snapshots for select to authenticated
using (public.can_access_project(project_id) or public.is_project_client(project_id));
create policy progress_internal_write on public.project_progress_snapshots for all to authenticated
using (public.can_manage_project(project_id)) with check (public.can_manage_project(project_id));

create policy project_documents_storage_internal_select on storage.objects for select to authenticated
using (bucket_id='project-documents' and exists(
  select 1 from public.project_document_versions v
  where v.storage_path=name and (public.can_access_project(v.project_id) or (v.client_released_at is not null and public.is_project_client(v.project_id)))
));
create policy project_documents_storage_internal_write on storage.objects for all to authenticated
using (bucket_id='project-documents' and exists(select 1 from public.projects p where name like p.organization_id::text || '/' || p.id::text || '/%' and public.can_manage_project(p.id)))
with check (bucket_id='project-documents' and exists(select 1 from public.projects p where name like p.organization_id::text || '/' || p.id::text || '/%' and public.can_manage_project(p.id)));

create policy daily_log_media_storage_select on storage.objects for select to authenticated
using (bucket_id='daily-log-media' and exists(
  select 1 from public.daily_log_media m
  where m.storage_path=name and (public.can_access_project(m.project_id) or (m.client_visible and public.is_project_client(m.project_id)))
));
create policy daily_log_media_storage_write on storage.objects for all to authenticated
using (bucket_id='daily-log-media' and exists(select 1 from public.projects p where name like p.organization_id::text || '/' || p.id::text || '/%' and public.can_access_project(p.id)))
with check (bucket_id='daily-log-media' and exists(select 1 from public.projects p where name like p.organization_id::text || '/' || p.id::text || '/%' and public.can_access_project(p.id)));

revoke all on function public.is_project_client(uuid) from public,anon;
revoke all on function public.can_access_project(uuid) from public,anon;
revoke all on function public.can_manage_project(uuid) from public,anon;
revoke all on function public.create_project_from_contract(uuid,text,text,date,date,text,text,text) from public,anon;
revoke all on function public.recalculate_project_progress(uuid) from public,anon;
revoke all on function public.move_project_task(uuid,public.task_status,numeric,text) from public,anon;
revoke all on function public.create_schedule_baseline(uuid,text,text) from public,anon;
revoke all on function public.submit_daily_log(uuid) from public,anon;
revoke all on function public.decide_daily_log(uuid,boolean,text,boolean) from public,anon;
revoke all on function public.release_project_document_version(uuid) from public,anon;

grant execute on function public.is_project_client(uuid) to authenticated,service_role;
grant execute on function public.can_access_project(uuid) to authenticated,service_role;
grant execute on function public.can_manage_project(uuid) to authenticated,service_role;
grant execute on function public.create_project_from_contract(uuid,text,text,date,date,text,text,text) to authenticated,service_role;
grant execute on function public.recalculate_project_progress(uuid) to authenticated,service_role;
grant execute on function public.move_project_task(uuid,public.task_status,numeric,text) to authenticated,service_role;
grant execute on function public.create_schedule_baseline(uuid,text,text) to authenticated,service_role;
grant execute on function public.submit_daily_log(uuid) to authenticated,service_role;
grant execute on function public.decide_daily_log(uuid,boolean,text,boolean) to authenticated,service_role;
grant execute on function public.release_project_document_version(uuid) to authenticated,service_role;

commit;
