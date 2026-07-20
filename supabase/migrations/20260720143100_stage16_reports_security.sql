-- Etapa 16 — RLS, contratos analíticos e operações auditáveis.

alter table public.report_metric_definitions enable row level security;
alter table public.report_targets enable row level security;
alter table public.report_saved_views enable row level security;
alter table public.report_snapshots enable row level security;
alter table public.report_exports enable row level security;
alter table public.report_events enable row level security;

create policy report_metric_definitions_select on public.report_metric_definitions for select to authenticated
using (public.has_module_permission(organization_id,'relatorios','READ',null,null));
create policy report_metric_definitions_insert on public.report_metric_definitions for insert to authenticated
with check (public.has_module_permission(organization_id,'relatorios','READ',null,'administer'));
create policy report_metric_definitions_update on public.report_metric_definitions for update to authenticated
using (public.has_module_permission(organization_id,'relatorios','READ',null,'administer'))
with check (public.has_module_permission(organization_id,'relatorios','READ',null,'administer'));
create policy report_metric_definitions_delete on public.report_metric_definitions for delete to authenticated
using (public.has_module_permission(organization_id,'relatorios','READ',null,'administer'));

create policy report_targets_select on public.report_targets for select to authenticated
using (public.has_module_permission(organization_id,'relatorios','READ',project_id,null));
create policy report_targets_insert on public.report_targets for insert to authenticated
with check (public.has_module_permission(organization_id,'relatorios','READ',project_id,'administer'));
create policy report_targets_update on public.report_targets for update to authenticated
using (public.has_module_permission(organization_id,'relatorios','READ',project_id,'administer'))
with check (public.has_module_permission(organization_id,'relatorios','READ',project_id,'administer'));
create policy report_targets_delete on public.report_targets for delete to authenticated
using (public.has_module_permission(organization_id,'relatorios','READ',project_id,'administer'));

create policy report_saved_views_select on public.report_saved_views for select to authenticated
using (
  public.has_module_permission(organization_id,'relatorios','READ',project_id,null)
  and (owner_user_id=auth.uid() or shared or public.has_module_permission(organization_id,'relatorios','READ',project_id,'administer'))
);
create policy report_saved_views_insert on public.report_saved_views for insert to authenticated
with check (
  owner_user_id=auth.uid()
  and public.has_module_permission(organization_id,'relatorios','EDIT',project_id,null)
);
create policy report_saved_views_update on public.report_saved_views for update to authenticated
using (
  public.has_module_permission(organization_id,'relatorios','EDIT',project_id,null)
  and (owner_user_id=auth.uid() or public.has_module_permission(organization_id,'relatorios','READ',project_id,'administer'))
)
with check (
  public.has_module_permission(organization_id,'relatorios','EDIT',project_id,null)
  and (owner_user_id=auth.uid() or public.has_module_permission(organization_id,'relatorios','READ',project_id,'administer'))
);
create policy report_saved_views_delete on public.report_saved_views for delete to authenticated
using (
  public.has_module_permission(organization_id,'relatorios','DELETE',project_id,null)
  and (owner_user_id=auth.uid() or public.has_module_permission(organization_id,'relatorios','READ',project_id,'administer'))
);

create policy report_snapshots_select on public.report_snapshots for select to authenticated
using (public.has_module_permission(organization_id,'relatorios','READ',project_id,null));
create policy report_exports_select on public.report_exports for select to authenticated
using (public.has_module_permission(organization_id,'relatorios','READ',project_id,null));
create policy report_events_select on public.report_events for select to authenticated
using (public.has_module_permission(organization_id,'relatorios','READ',project_id,null));

revoke all on public.report_metric_definitions, public.report_targets, public.report_saved_views,
  public.report_snapshots, public.report_exports, public.report_events from anon;
grant select,insert,update,delete on public.report_metric_definitions, public.report_targets, public.report_saved_views to authenticated;
grant select on public.report_snapshots, public.report_exports, public.report_events to authenticated;
grant select on public.report_project_kpis_v, public.report_executive_kpis_v to authenticated;

create or replace function public.get_report_dashboard(
  p_organization_id uuid,
  p_project_id uuid default null,
  p_period_start date default (date_trunc('month',current_date)-interval '11 months')::date,
  p_period_end date default current_date
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_projects jsonb;
  v_executive jsonb;
  v_finance jsonb;
  v_targets jsonb;
  v_sensitive_any boolean;
  v_can_read boolean;
begin
  if p_period_start is null or p_period_end is null or p_period_end<p_period_start then
    raise exception 'Período inválido.';
  end if;
  if p_project_id is not null and not exists(
    select 1 from public.projects where id=p_project_id and organization_id=p_organization_id and archived_at is null
  ) then raise exception 'Obra inválida.'; end if;

  v_can_read:=public.has_module_permission(p_organization_id,'relatorios','READ',p_project_id,null);
  if not v_can_read and p_project_id is null then
    select exists(
      select 1 from public.projects project
      where project.organization_id=p_organization_id and project.archived_at is null
        and public.has_module_permission(p_organization_id,'relatorios','READ',project.id,null)
    ) into v_can_read;
  end if;
  if not v_can_read then raise exception 'Permissão insuficiente para relatórios.'; end if;

  with allowed as (
    select report.*,
      public.has_module_permission(p_organization_id,'relatorios','READ',report.project_id,'sensitive') as can_sensitive
    from public.report_project_kpis_v report
    where report.organization_id=p_organization_id
      and (p_project_id is null or report.project_id=p_project_id)
      and public.has_module_permission(p_organization_id,'relatorios','READ',report.project_id,null)
  ), masked as (
    select to_jsonb(allowed)
      || jsonb_build_object(
        'contract_value',case when can_sensitive then contract_value else null end,
        'receivable_open',case when can_sensitive then receivable_open else null end,
        'payable_open',case when can_sensitive then payable_open else null end,
        'purchase_committed',case when can_sensitive then purchase_committed else null end,
        'pending_finance_approvals',case when can_sensitive then pending_finance_approvals else null end,
        'overdue_installments',case when can_sensitive then overdue_installments else null end
      ) - 'can_sensitive' as payload
    from allowed
  )
  select coalesce(jsonb_agg(payload order by payload->>'name'),'[]'::jsonb) into v_projects from masked;

  with allowed as (
    select report.*,
      public.has_module_permission(p_organization_id,'relatorios','READ',report.project_id,'sensitive') as can_sensitive
    from public.report_project_kpis_v report
    where report.organization_id=p_organization_id
      and (p_project_id is null or report.project_id=p_project_id)
      and public.has_module_permission(p_organization_id,'relatorios','READ',report.project_id,null)
  )
  select coalesce(bool_or(can_sensitive),false), jsonb_build_object(
    'activeProjects',count(*) filter (where status not in ('COMPLETED','CANCELED','ARCHIVED')),
    'delayedProjects',count(*) filter (where overdue_days>0),
    'averageProgress',coalesce(round(avg(progress),2),0),
    'contractValue',case when bool_or(can_sensitive) then coalesce(sum(contract_value) filter (where can_sensitive),0) else null end,
    'receivableOpen',case when bool_or(can_sensitive) then coalesce(sum(receivable_open) filter (where can_sensitive),0) else null end,
    'payableOpen',case when bool_or(can_sensitive) then coalesce(sum(payable_open) filter (where can_sensitive),0) else null end,
    'purchaseCommitted',case when bool_or(can_sensitive) then coalesce(sum(purchase_committed) filter (where can_sensitive),0) else null end,
    'blockedTasks',coalesce(sum(blocked_tasks),0),
    'overdueTasks',coalesce(sum(overdue_tasks),0),
    'overduePurchaseOrders',coalesce(sum(overdue_purchase_orders),0),
    'pendingFinanceApprovals',case when bool_or(can_sensitive) then coalesce(sum(pending_finance_approvals) filter (where can_sensitive),0) else null end,
    'pendingQualityReviews',coalesce(sum(pending_quality_reviews),0),
    'averageQualityScore',coalesce(round(avg(nullif(average_quality_score,0)),2),0),
    'nps',round(avg(nps),2)
  ) into v_sensitive_any,v_executive from allowed;

  if v_sensitive_any then
    with authorized_flow as (
      select flow.*
      from public.finance_cash_flow_monthly_v flow
      where flow.organization_id=p_organization_id
        and flow.period_month between date_trunc('month',p_period_start)::date and date_trunc('month',p_period_end)::date
        and (p_project_id is null or flow.project_id=p_project_id)
        and (
          (flow.project_id is null and public.has_module_permission(p_organization_id,'relatorios','READ',null,'sensitive'))
          or (flow.project_id is not null and public.has_module_permission(p_organization_id,'relatorios','READ',flow.project_id,'sensitive'))
        )
    ), monthly as (
      select period_month,
        sum(planned_inflow)::numeric(18,2) as planned_inflow,
        sum(planned_outflow)::numeric(18,2) as planned_outflow,
        sum(realized_inflow)::numeric(18,2) as realized_inflow,
        sum(realized_outflow)::numeric(18,2) as realized_outflow
      from authorized_flow group by period_month
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'periodMonth',period_month,
      'plannedInflow',planned_inflow,
      'plannedOutflow',planned_outflow,
      'realizedInflow',realized_inflow,
      'realizedOutflow',realized_outflow,
      'plannedNet',planned_inflow-planned_outflow,
      'realizedNet',realized_inflow-realized_outflow
    ) order by period_month),'[]'::jsonb) into v_finance from monthly;
  else
    v_finance:='[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(to_jsonb(target) order by target.metric_key),'[]'::jsonb) into v_targets
  from public.report_targets target
  where target.organization_id=p_organization_id and target.active
    and (target.project_id is null or public.has_module_permission(p_organization_id,'relatorios','READ',target.project_id,null))
    and (p_project_id is null or target.project_id is null or target.project_id=p_project_id);

  return jsonb_build_object(
    'period',jsonb_build_object('start',p_period_start,'end',p_period_end),
    'financialVisible',v_sensitive_any,
    'executive',coalesce(v_executive,'{}'::jsonb),
    'projects',coalesce(v_projects,'[]'::jsonb),
    'financeMonthly',coalesce(v_finance,'[]'::jsonb),
    'targets',coalesce(v_targets,'[]'::jsonb)
  );
end $$;

create or replace function public.create_report_snapshot(
  p_organization_id uuid,
  p_kind public.report_kind,
  p_project_id uuid default null,
  p_period_start date default (date_trunc('month',current_date)-interval '11 months')::date,
  p_period_end date default current_date,
  p_saved_view_id uuid default null,
  p_filters jsonb default '{}'::jsonb
) returns public.report_snapshots
language plpgsql security definer set search_path=public as $$
declare
  v_snapshot public.report_snapshots;
  v_metrics jsonb;
  v_hash text;
begin
  if not public.has_module_permission(p_organization_id,'relatorios','EDIT',p_project_id,null) then
    raise exception 'Permissão insuficiente para gerar snapshot.';
  end if;
  if p_saved_view_id is not null and not exists(
    select 1 from public.report_saved_views
    where id=p_saved_view_id and organization_id=p_organization_id
      and (owner_user_id=auth.uid() or shared or public.has_module_permission(p_organization_id,'relatorios','READ',p_project_id,'administer'))
  ) then raise exception 'Relatório salvo inválido.'; end if;

  insert into public.report_snapshots(
    organization_id,project_id,saved_view_id,kind,period_start,period_end,filters,status,generated_by
  ) values(
    p_organization_id,p_project_id,p_saved_view_id,p_kind,p_period_start,p_period_end,coalesce(p_filters,'{}'::jsonb),'PENDING',auth.uid()
  ) returning * into v_snapshot;

  begin
    v_metrics:=public.get_report_dashboard(p_organization_id,p_project_id,p_period_start,p_period_end);
    v_hash:=encode(digest(v_metrics::text,'sha256'),'hex');
    update public.report_snapshots set metrics=v_metrics,source_sha256=v_hash,status='COMPLETED',generated_at=now()
    where id=v_snapshot.id returning * into v_snapshot;
    insert into public.report_events(organization_id,project_id,saved_view_id,snapshot_id,actor_user_id,event_type,metadata)
    values(p_organization_id,p_project_id,p_saved_view_id,v_snapshot.id,auth.uid(),'SNAPSHOT_COMPLETED',jsonb_build_object('kind',p_kind,'sha256',v_hash));
  exception when others then
    update public.report_snapshots set status='FAILED',error_message=sqlerrm,generated_at=now()
    where id=v_snapshot.id returning * into v_snapshot;
    insert into public.report_events(organization_id,project_id,saved_view_id,snapshot_id,actor_user_id,event_type,metadata)
    values(p_organization_id,p_project_id,p_saved_view_id,v_snapshot.id,auth.uid(),'SNAPSHOT_FAILED',jsonb_build_object('error',sqlerrm));
  end;
  return v_snapshot;
end $$;

create or replace function public.record_report_export(
  p_organization_id uuid,
  p_kind public.report_kind,
  p_project_id uuid,
  p_format public.report_export_format,
  p_file_name text,
  p_row_count integer,
  p_source_sha256 text,
  p_saved_view_id uuid default null,
  p_snapshot_id uuid default null
) returns public.report_exports
language plpgsql security definer set search_path=public as $$
declare v_export public.report_exports;
begin
  if not public.has_module_permission(p_organization_id,'relatorios','READ',p_project_id,'export') then
    raise exception 'Permissão insuficiente para exportar.';
  end if;
  if p_source_sha256 is null or p_source_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'Hash inválido.'; end if;
  insert into public.report_exports(
    organization_id,project_id,saved_view_id,snapshot_id,kind,format,file_name,row_count,source_sha256,generated_by
  ) values(
    p_organization_id,p_project_id,p_saved_view_id,p_snapshot_id,p_kind,p_format,p_file_name,greatest(coalesce(p_row_count,0),0),p_source_sha256,auth.uid()
  ) returning * into v_export;
  insert into public.report_events(organization_id,project_id,saved_view_id,snapshot_id,actor_user_id,event_type,metadata)
  values(p_organization_id,p_project_id,p_saved_view_id,p_snapshot_id,auth.uid(),'REPORT_EXPORTED',jsonb_build_object('exportId',v_export.id,'format',p_format,'rows',v_export.row_count,'sha256',p_source_sha256));
  return v_export;
end $$;

revoke all on function public.get_report_dashboard(uuid,uuid,date,date) from public,anon;
revoke all on function public.create_report_snapshot(uuid,public.report_kind,uuid,date,date,uuid,jsonb) from public,anon;
revoke all on function public.record_report_export(uuid,public.report_kind,uuid,public.report_export_format,text,integer,text,uuid,uuid) from public,anon;
grant execute on function public.get_report_dashboard(uuid,uuid,date,date) to authenticated;
grant execute on function public.create_report_snapshot(uuid,public.report_kind,uuid,date,date,uuid,jsonb) to authenticated;
grant execute on function public.record_report_export(uuid,public.report_kind,uuid,public.report_export_format,text,integer,text,uuid,uuid) to authenticated;
