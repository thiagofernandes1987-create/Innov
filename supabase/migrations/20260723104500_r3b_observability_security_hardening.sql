-- R3B hardening — generic audit RPCs are service-only and global diagnostics are platform-only.
begin;

revoke execute on function public.record_audit_event(uuid,text,text,text,uuid,text,text,text,text,text,jsonb,jsonb,jsonb,uuid,uuid,uuid,text,text,text,text,text)
  from authenticated;
revoke execute on function public.write_audit(uuid,text,uuid,text,jsonb,uuid)
  from authenticated;
grant execute on function public.record_audit_event(uuid,text,text,text,uuid,text,text,text,text,text,jsonb,jsonb,jsonb,uuid,uuid,uuid,text,text,text,text,text)
  to service_role;
grant execute on function public.write_audit(uuid,text,uuid,text,jsonb,uuid)
  to service_role;

create or replace function public.stage19_can_read_global_diagnostics()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select auth.role()='service_role';
$$;

revoke execute on function public.stage19_can_read_global_diagnostics() from public,anon,authenticated;
grant execute on function public.stage19_can_read_global_diagnostics() to service_role;

drop policy if exists observability_diagnostics_select on public.observability_diagnostics;
create policy observability_diagnostics_select on public.observability_diagnostics
for select to authenticated
using (
  organization_id is not null
  and public.has_module_permission(organization_id,'auditoria','READ',null,null)
);

create or replace function public.run_observability_health_snapshot(p_organization_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_failed_conversion integer;
  v_failed_delivery integer;
  v_failed_reports integer;
  v_overdue_sac integer;
  v_diagnostics integer;
  v_snapshot_at timestamptz:=now();
begin
  if not public.has_module_permission(p_organization_id,'auditoria','READ',null,'administer') then raise exception 'Acesso negado.'; end if;
  select count(*) into v_failed_conversion from public.signature_conversion_jobs where organization_id=p_organization_id and status='FAILED';
  select count(*) into v_failed_delivery from public.signature_delivery_events where organization_id=p_organization_id and status='FAILED';
  select count(*) into v_failed_reports from public.report_snapshots where organization_id=p_organization_id and status='FAILED' and created_at>=now()-interval '24 hours';
  select count(*) into v_overdue_sac from public.sac_tickets where organization_id=p_organization_id and status not in ('RESOLVED','CLOSED','CANCELLED') and resolution_due_at<now();
  select count(*) into v_diagnostics from public.observability_diagnostics where organization_id=p_organization_id and resolved_at is null;

  insert into public.observability_health_checks(organization_id,check_key,component,status,message,details,source,checked_at) values
    (p_organization_id,'database_connectivity','database','HEALTHY','Banco acessível.',jsonb_build_object('timestamp',v_snapshot_at),'DATABASE',v_snapshot_at),
    (p_organization_id,'signature_conversion','assinaturas',case when v_failed_conversion=0 then 'HEALTHY' else 'DEGRADED' end,
      case when v_failed_conversion=0 then 'Conversões sem falhas.' else v_failed_conversion||' conversão(ões) com falha.' end,jsonb_build_object('failed',v_failed_conversion),'WORKER',v_snapshot_at),
    (p_organization_id,'signature_delivery','assinaturas',case when v_failed_delivery=0 then 'HEALTHY' else 'DEGRADED' end,
      case when v_failed_delivery=0 then 'Entregas sem falhas.' else v_failed_delivery||' entrega(s) com falha.' end,jsonb_build_object('failed',v_failed_delivery),'WORKER',v_snapshot_at),
    (p_organization_id,'report_generation','relatorios',case when v_failed_reports=0 then 'HEALTHY' else 'DEGRADED' end,
      case when v_failed_reports=0 then 'Relatórios sem falhas recentes.' else v_failed_reports||' relatório(s) falharam nas últimas 24h.' end,jsonb_build_object('failed24h',v_failed_reports),'WORKER',v_snapshot_at),
    (p_organization_id,'sac_sla','sac',case when v_overdue_sac=0 then 'HEALTHY' else 'DEGRADED' end,
      case when v_overdue_sac=0 then 'Nenhum chamado fora do SLA.' else v_overdue_sac||' chamado(s) fora do SLA.' end,jsonb_build_object('overdue',v_overdue_sac),'DATABASE',v_snapshot_at),
    (p_organization_id,'database_advisors','database',case when v_diagnostics=0 then 'HEALTHY' else 'DEGRADED' end,
      case when v_diagnostics=0 then 'Nenhum diagnóstico pendente.' else v_diagnostics||' diagnóstico(s) pendente(s).' end,jsonb_build_object('unresolved',v_diagnostics),'DATABASE',v_snapshot_at);

  perform public.record_audit_event(p_organization_id,'auditoria','observability.health.snapshot','observability_health_snapshot',null,'CREATE','SUCCESS',
    case when v_failed_conversion+v_failed_delivery+v_failed_reports+v_overdue_sac+v_diagnostics=0 then 'INFO' else 'WARNING' end,'HEALTH','Snapshot de saúde executado.',
    null,null,jsonb_build_object('failedConversion',v_failed_conversion,'failedDelivery',v_failed_delivery,'failedReports',v_failed_reports,'overdueSac',v_overdue_sac,'diagnostics',v_diagnostics),
    null,null,null,null,'health-'||extract(epoch from v_snapshot_at)::bigint,'SYSTEM',null,null);
  return jsonb_build_object('checkedAt',v_snapshot_at,'failedConversion',v_failed_conversion,'failedDelivery',v_failed_delivery,
    'failedReports',v_failed_reports,'overdueSac',v_overdue_sac,'diagnostics',v_diagnostics);
end;
$$;

create or replace function public.get_observability_dashboard(p_organization_id uuid,p_period_hours integer default 24)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb;
begin
  if p_period_hours<1 or p_period_hours>8760 then raise exception 'Período inválido.'; end if;
  if not public.has_module_permission(p_organization_id,'auditoria','READ',null,null) then raise exception 'Acesso negado.'; end if;
  select jsonb_build_object(
    'periodHours',p_period_hours,
    'events',jsonb_build_object(
      'total',count(*),
      'info',count(*) filter(where severity='INFO'),
      'warning',count(*) filter(where severity='WARNING'),
      'error',count(*) filter(where severity='ERROR'),
      'critical',count(*) filter(where severity='CRITICAL')
    ),
    'openAlerts',(select count(*) from public.observability_alerts where organization_id=p_organization_id and status in ('OPEN','ACKNOWLEDGED')),
    'unhealthyChecks',(select count(*) from (select distinct on(check_key) check_key,status from public.observability_health_checks where organization_id=p_organization_id order by check_key,checked_at desc) h where status in ('DEGRADED','UNHEALTHY')),
    'unresolvedDiagnostics',(select count(*) from public.observability_diagnostics where organization_id=p_organization_id and resolved_at is null),
    'byModule',coalesce((select jsonb_agg(jsonb_build_object('module',module_key,'count',quantity) order by quantity desc) from (
      select coalesce(module_key,'sistema') module_key,count(*) quantity from public.audit_events where organization_id=p_organization_id and occurred_at>=now()-make_interval(hours=>p_period_hours) group by 1 limit 12
    ) module_counts),'[]'::jsonb),
    'recentAlerts',coalesce((select jsonb_agg(to_jsonb(alert_item) order by alert_item.last_occurred_at desc) from (
      select id,module_key,severity,title,status,occurrence_count,last_occurred_at from public.observability_alerts where organization_id=p_organization_id order by last_occurred_at desc limit 10
    ) alert_item),'[]'::jsonb),
    'latestHealth',coalesce((select jsonb_agg(to_jsonb(health_item) order by health_item.check_key) from (
      select distinct on(check_key) id,check_key,component,status,message,details,checked_at from public.observability_health_checks where organization_id=p_organization_id order by check_key,checked_at desc
    ) health_item),'[]'::jsonb)
  ) into v_result
  from public.audit_events where organization_id=p_organization_id and occurred_at>=now()-make_interval(hours=>p_period_hours);
  return v_result;
end;
$$;

do $$
begin
  if has_function_privilege('authenticated', 'public.record_audit_event(uuid,text,text,text,uuid,text,text,text,text,text,jsonb,jsonb,jsonb,uuid,uuid,uuid,text,text,text,text,text)', 'EXECUTE') then
    raise exception 'authenticated ainda executa record_audit_event diretamente.';
  end if;
  if has_function_privilege('authenticated', 'public.write_audit(uuid,text,uuid,text,jsonb,uuid)', 'EXECUTE') then
    raise exception 'authenticated ainda executa write_audit diretamente.';
  end if;
end $$;

commit;
