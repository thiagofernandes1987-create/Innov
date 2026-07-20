-- Etapa 16 — Relatórios e Indicadores Executivos.

create extension if not exists pgcrypto;

do $$ begin
  create type public.report_kind as enum ('EXECUTIVE','PROJECT','FINANCE','PROCUREMENT','QUALITY');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_snapshot_status as enum ('PENDING','COMPLETED','FAILED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_export_format as enum ('CSV','JSON');
exception when duplicate_object then null; end $$;

create table if not exists public.report_metric_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  metric_key text not null,
  source_module text not null,
  name text not null,
  description text not null default '',
  unit text not null default 'NUMBER',
  category text not null,
  sensitive boolean not null default false,
  display_order integer not null default 0,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, metric_key)
);

create table if not exists public.report_targets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  metric_key text not null,
  comparison text not null check (comparison in ('MIN','MAX')),
  warning_value numeric,
  critical_value numeric,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (organization_id, project_id, metric_key)
);

create table if not exists public.report_saved_views (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  kind public.report_kind not null,
  project_id uuid references public.projects(id) on delete set null,
  period_start date,
  period_end date,
  filters jsonb not null default '{}'::jsonb,
  visible_metrics text[] not null default '{}'::text[],
  shared boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end is null or period_start is null or period_end >= period_start)
);

create table if not exists public.report_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  saved_view_id uuid references public.report_saved_views(id) on delete set null,
  kind public.report_kind not null,
  period_start date not null,
  period_end date not null,
  filters jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  source_sha256 text,
  status public.report_snapshot_status not null default 'PENDING',
  error_message text,
  generated_by uuid references auth.users(id) on delete set null,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  check (period_end >= period_start),
  check (source_sha256 is null or source_sha256 ~ '^[a-f0-9]{64}$')
);

create table if not exists public.report_exports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  saved_view_id uuid references public.report_saved_views(id) on delete set null,
  snapshot_id uuid references public.report_snapshots(id) on delete set null,
  kind public.report_kind not null,
  format public.report_export_format not null,
  file_name text not null,
  row_count integer not null default 0 check (row_count >= 0),
  source_sha256 text not null check (source_sha256 ~ '^[a-f0-9]{64}$'),
  generated_by uuid references auth.users(id) on delete set null,
  generated_at timestamptz not null default now()
);

create table if not exists public.report_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  saved_view_id uuid references public.report_saved_views(id) on delete set null,
  snapshot_id uuid references public.report_snapshots(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists report_metric_definitions_org_active_idx on public.report_metric_definitions(organization_id, active, category, display_order);
create index if not exists report_targets_org_project_idx on public.report_targets(organization_id, project_id, active);
create index if not exists report_saved_views_org_owner_idx on public.report_saved_views(organization_id, owner_user_id, active, updated_at desc);
create index if not exists report_saved_views_org_shared_idx on public.report_saved_views(organization_id, shared, active) where shared;
create index if not exists report_snapshots_org_created_idx on public.report_snapshots(organization_id, created_at desc);
create index if not exists report_snapshots_project_period_idx on public.report_snapshots(project_id, period_end desc) where project_id is not null;
create index if not exists report_exports_org_generated_idx on public.report_exports(organization_id, generated_at desc);
create index if not exists report_events_org_created_idx on public.report_events(organization_id, created_at desc);
create index if not exists report_events_project_created_idx on public.report_events(project_id, created_at desc) where project_id is not null;

create or replace view public.report_project_kpis_v with (security_invoker=true) as
with task_stats as (
  select organization_id, project_id,
    count(*) filter (where status::text <> 'CANCELED')::integer as total_tasks,
    count(*) filter (where status::text = 'COMPLETED')::integer as completed_tasks,
    count(*) filter (where status::text = 'BLOCKED')::integer as blocked_tasks,
    count(*) filter (where planned_end < current_date and status::text not in ('COMPLETED','CANCELED'))::integer as overdue_tasks,
    coalesce(
      sum(progress * nullif(weight,0)) / nullif(sum(nullif(weight,0)),0),
      avg(progress),
      0
    )::numeric(8,2) as weighted_task_progress
  from public.project_tasks
  group by organization_id, project_id
), contract_stats as (
  select organization_id, project_id,
    coalesce(sum(coalesce(consolidated_value, original_value + amendment_value, 0)) filter (
      where status::text in ('SIGNED','ACTIVE','AMENDED','COMPLETED')
    ),0)::numeric(18,2) as contract_value
  from public.contracts
  where project_id is not null
  group by organization_id, project_id
), finance_stats as (
  select entry.organization_id, entry.project_id,
    coalesce(sum(installment.balance) filter (where entry.direction::text='RECEIVABLE' and entry.status::text<>'CANCELED'),0)::numeric(18,2) as receivable_open,
    coalesce(sum(installment.balance) filter (where entry.direction::text='PAYABLE' and entry.status::text<>'CANCELED'),0)::numeric(18,2) as payable_open,
    count(*) filter (where installment.status::text='OVERDUE')::integer as overdue_installments
  from public.finance_entries entry
  join public.finance_installments installment on installment.entry_id=entry.id
  where entry.project_id is not null
  group by entry.organization_id, entry.project_id
), finance_approval_stats as (
  select entry.organization_id, entry.project_id,
    count(*) filter (where approval.status::text='PENDING')::integer as pending_finance_approvals
  from public.finance_approvals approval
  join public.finance_entries entry on entry.id=approval.entry_id
  where entry.project_id is not null
  group by entry.organization_id, entry.project_id
), procurement_stats as (
  select project.organization_id, project.id as project_id,
    coalesce(sum(ord.total) filter (where ord.status::text<>'CANCELED'),0)::numeric(18,2) as purchase_committed,
    count(distinct ord.id) filter (where ord.status::text in ('ISSUED','PARTIALLY_RECEIVED'))::integer as open_purchase_orders,
    count(distinct ord.id) filter (where ord.expected_at < current_date and ord.status::text in ('ISSUED','PARTIALLY_RECEIVED'))::integer as overdue_purchase_orders,
    count(distinct req.id) filter (where req.status::text not in ('RECEIVED','CANCELED'))::integer as open_purchase_requests,
    count(distinct receipt.id) filter (where receipt.status::text in ('ACCEPTED','ACCEPTED_WITH_RESTRICTION'))::integer as accepted_receipts
  from public.projects project
  left join public.procurement_orders ord on ord.project_id=project.id
  left join public.procurement_requests req on req.project_id=project.id
  left join public.procurement_receipts receipt on receipt.project_id=project.id
  group by project.organization_id, project.id
), quality_stats as (
  select response.organization_id, response.project_id,
    count(*) filter (where response.status::text<>'DRAFT')::integer as quality_responses,
    count(*) filter (where response.status::text='APPROVED')::integer as quality_approved,
    count(*) filter (where response.status::text='REJECTED')::integer as quality_rejected,
    count(*) filter (where response.status::text in ('SUBMITTED','UNDER_REVIEW'))::integer as pending_quality_reviews,
    coalesce(avg(response.score) filter (where response.score is not null),0)::numeric(8,2) as average_quality_score
  from public.quality_form_responses response
  where response.project_id is not null
  group by response.organization_id, response.project_id
), assignment_stats as (
  select organization_id, project_id,
    count(*) filter (where status::text in ('PENDING','OPEN'))::integer as pending_quality_assignments
  from public.quality_form_assignments
  where project_id is not null
  group by organization_id, project_id
), survey_values as (
  select response.organization_id, response.project_id,
    case when (answer.value_json #>> '{}') ~ '^[0-9]+([.][0-9]+)?$'
      then (answer.value_json #>> '{}')::numeric else null end as nps_value
  from public.quality_form_answers answer
  join public.quality_form_responses response on response.id=answer.response_id
  join public.quality_form_versions version on version.id=response.template_version_id
  join public.quality_form_templates template on template.id=version.template_id
  where response.project_id is not null and template.kind::text='SURVEY' and answer.field_key='nps'
), survey_stats as (
  select organization_id, project_id,
    case when count(nps_value)>0 then
      round((100.0*count(*) filter (where nps_value>=9)/count(nps_value)) -
            (100.0*count(*) filter (where nps_value<=6)/count(nps_value)),2)
      else null end as nps
  from survey_values
  group by organization_id, project_id
), field_stats as (
  select project.organization_id, project.id as project_id,
    count(distinct log.id) filter (where log.log_date >= current_date-29)::integer as daily_logs_30d,
    count(distinct document.id) filter (where document.status::text<>'ARCHIVED')::integer as project_documents
  from public.projects project
  left join public.daily_logs log on log.project_id=project.id
  left join public.project_documents document on document.project_id=project.id
  group by project.organization_id, project.id
)
select project.id as project_id, project.organization_id, project.client_id, project.code, project.name,
  project.status, project.planned_start, project.planned_end, project.actual_start, project.actual_end,
  project.progress::numeric(8,2) as progress,
  coalesce(latest.planned_progress, project.progress, 0)::numeric(8,2) as planned_progress,
  coalesce(latest.actual_progress, project.progress, 0)::numeric(8,2) as actual_progress,
  (coalesce(latest.actual_progress, project.progress, 0)-coalesce(latest.planned_progress, project.progress, 0))::numeric(8,2) as schedule_variance_pp,
  case when project.actual_end is null and project.planned_end < current_date and coalesce(project.progress,0)<100
    then (current_date-project.planned_end)::integer else 0 end as overdue_days,
  coalesce(task.total_tasks,0) as total_tasks,
  coalesce(task.completed_tasks,0) as completed_tasks,
  coalesce(task.blocked_tasks,0) as blocked_tasks,
  coalesce(task.overdue_tasks,0) as overdue_tasks,
  coalesce(task.weighted_task_progress,project.progress,0)::numeric(8,2) as weighted_task_progress,
  coalesce(contract.contract_value,0)::numeric(18,2) as contract_value,
  coalesce(finance.receivable_open,0)::numeric(18,2) as receivable_open,
  coalesce(finance.payable_open,0)::numeric(18,2) as payable_open,
  coalesce(finance.overdue_installments,0) as overdue_installments,
  coalesce(approval.pending_finance_approvals,0) as pending_finance_approvals,
  coalesce(procurement.purchase_committed,0)::numeric(18,2) as purchase_committed,
  coalesce(procurement.open_purchase_orders,0) as open_purchase_orders,
  coalesce(procurement.overdue_purchase_orders,0) as overdue_purchase_orders,
  coalesce(procurement.open_purchase_requests,0) as open_purchase_requests,
  coalesce(procurement.accepted_receipts,0) as accepted_receipts,
  coalesce(quality.quality_responses,0) as quality_responses,
  coalesce(quality.quality_approved,0) as quality_approved,
  coalesce(quality.quality_rejected,0) as quality_rejected,
  coalesce(quality.pending_quality_reviews,0) as pending_quality_reviews,
  coalesce(quality.average_quality_score,0)::numeric(8,2) as average_quality_score,
  coalesce(assignment.pending_quality_assignments,0) as pending_quality_assignments,
  survey.nps::numeric(8,2) as nps,
  coalesce(field.daily_logs_30d,0) as daily_logs_30d,
  coalesce(field.project_documents,0) as project_documents
from public.projects project
left join lateral (
  select snapshot.planned_progress, snapshot.actual_progress, snapshot.snapshot_date
  from public.project_progress_snapshots snapshot
  where snapshot.project_id=project.id
  order by snapshot.snapshot_date desc, snapshot.created_at desc
  limit 1
) latest on true
left join task_stats task on task.project_id=project.id
left join contract_stats contract on contract.project_id=project.id
left join finance_stats finance on finance.project_id=project.id
left join finance_approval_stats approval on approval.project_id=project.id
left join procurement_stats procurement on procurement.project_id=project.id
left join quality_stats quality on quality.project_id=project.id
left join assignment_stats assignment on assignment.project_id=project.id
left join survey_stats survey on survey.project_id=project.id
left join field_stats field on field.project_id=project.id
where project.archived_at is null;

create or replace view public.report_executive_kpis_v with (security_invoker=true) as
select organization_id,
  count(*)::integer as active_projects,
  count(*) filter (where overdue_days>0)::integer as delayed_projects,
  coalesce(avg(progress),0)::numeric(8,2) as average_progress,
  coalesce(sum(contract_value),0)::numeric(18,2) as contract_value,
  coalesce(sum(receivable_open),0)::numeric(18,2) as receivable_open,
  coalesce(sum(payable_open),0)::numeric(18,2) as payable_open,
  coalesce(sum(purchase_committed),0)::numeric(18,2) as purchase_committed,
  coalesce(sum(blocked_tasks),0)::integer as blocked_tasks,
  coalesce(sum(overdue_tasks),0)::integer as overdue_tasks,
  coalesce(sum(overdue_purchase_orders),0)::integer as overdue_purchase_orders,
  coalesce(sum(pending_finance_approvals),0)::integer as pending_finance_approvals,
  coalesce(sum(pending_quality_reviews),0)::integer as pending_quality_reviews,
  coalesce(avg(nullif(average_quality_score,0)),0)::numeric(8,2) as average_quality_score,
  avg(nps)::numeric(8,2) as nps
from public.report_project_kpis_v
group by organization_id;

create or replace function public.protect_completed_report_snapshot()
returns trigger language plpgsql set search_path=public as $$
begin
  if old.status='COMPLETED' then
    raise exception 'Snapshot concluído é imutável.';
  end if;
  return case when tg_op='DELETE' then old else new end;
end $$;

drop trigger if exists report_snapshots_immutable on public.report_snapshots;
create trigger report_snapshots_immutable
before update or delete on public.report_snapshots
for each row execute function public.protect_completed_report_snapshot();

revoke all on function public.protect_completed_report_snapshot() from public, anon, authenticated;
