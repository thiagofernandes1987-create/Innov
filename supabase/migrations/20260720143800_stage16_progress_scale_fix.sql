-- Etapa 16 — converte progresso armazenado em fração para percentual analítico.

alter view public.report_project_kpis_v rename to report_project_kpis_fraction_v;

create or replace view public.report_project_kpis_v with (security_invoker=true) as
with task_progress as (
  select project_id,
    (coalesce(
      sum(progress*nullif(weight,0))/nullif(sum(nullif(weight,0)),0),
      avg(progress),0
    )*100)::numeric(8,2) as weighted_task_progress
  from public.project_tasks
  group by project_id
)
select
  raw.project_id,raw.organization_id,raw.client_id,raw.code,raw.name,raw.status,
  raw.planned_start,raw.planned_end,raw.actual_start,raw.actual_end,
  (project.progress*100)::numeric(8,2) as progress,
  (coalesce(latest.planned_progress,project.progress,0)*100)::numeric(8,2) as planned_progress,
  (coalesce(latest.actual_progress,project.progress,0)*100)::numeric(8,2) as actual_progress,
  ((coalesce(latest.actual_progress,project.progress,0)-coalesce(latest.planned_progress,project.progress,0))*100)::numeric(8,2) as schedule_variance_pp,
  case when project.actual_end is null and project.planned_end<current_date and coalesce(project.progress,0)<1
    then (current_date-project.planned_end)::integer else 0 end as overdue_days,
  raw.total_tasks,raw.completed_tasks,raw.blocked_tasks,raw.overdue_tasks,
  coalesce(task.weighted_task_progress,(project.progress*100)::numeric(8,2),0)::numeric(8,2) as weighted_task_progress,
  raw.contract_value,raw.receivable_open,raw.payable_open,raw.overdue_installments,
  raw.pending_finance_approvals,raw.purchase_committed,raw.open_purchase_orders,
  raw.overdue_purchase_orders,raw.open_purchase_requests,raw.accepted_receipts,
  raw.quality_responses,raw.quality_approved,raw.quality_rejected,raw.pending_quality_reviews,
  raw.average_quality_score,raw.pending_quality_assignments,raw.nps,raw.daily_logs_30d,raw.project_documents
from public.report_project_kpis_fraction_v raw
join public.projects project on project.id=raw.project_id
left join lateral (
  select snapshot.planned_progress,snapshot.actual_progress
  from public.project_progress_snapshots snapshot
  where snapshot.project_id=project.id
  order by snapshot.snapshot_date desc,snapshot.created_at desc
  limit 1
) latest on true
left join task_progress task on task.project_id=project.id;

create or replace view public.report_executive_kpis_v with (security_invoker=true) as
select organization_id,
  count(*)::integer as active_projects,
  count(*) filter(where overdue_days>0)::integer as delayed_projects,
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

revoke all on public.report_project_kpis_fraction_v from public,anon,authenticated;
revoke all on public.report_project_kpis_v from public,anon,authenticated;
revoke all on public.report_executive_kpis_v from public,anon,authenticated;
