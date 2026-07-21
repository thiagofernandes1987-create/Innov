-- Etapa 19 — Funções canônicas de auditoria, alertas e saúde.
begin;

create or replace function public.stage19_severity_rank(p_severity text)
returns integer language sql immutable set search_path=public as $$
  select case upper(coalesce(p_severity,'INFO'))
    when 'CRITICAL' then 4 when 'ERROR' then 3 when 'WARNING' then 2 else 1 end;
$$;

create or replace function public.sanitize_audit_json(p_value jsonb)
returns jsonb language plpgsql immutable set search_path=public as $$
declare
  v_type text;
  v_key text;
  v_item jsonb;
  v_result jsonb;
begin
  if p_value is null then return null; end if;
  v_type:=jsonb_typeof(p_value);
  if v_type='object' then
    v_result:='{}'::jsonb;
    for v_key,v_item in select key,value from jsonb_each(p_value) loop
      if lower(v_key) ~ '(password|senha|token|authorization|secret|service.?role|private.?key|access.?key|refresh.?token|cookie)' then
        v_result:=v_result||jsonb_build_object(v_key,'[REDACTED]');
      else
        v_result:=v_result||jsonb_build_object(v_key,public.sanitize_audit_json(v_item));
      end if;
    end loop;
    return v_result;
  elsif v_type='array' then
    select coalesce(jsonb_agg(public.sanitize_audit_json(value)),'[]'::jsonb)
      into v_result from jsonb_array_elements(p_value);
    return v_result;
  end if;
  return p_value;
end;
$$;

create or replace function public.record_audit_event(
  p_organization_id uuid,
  p_module_key text,
  p_event_type text,
  p_resource_type text,
  p_resource_id uuid default null,
  p_action text default 'READ',
  p_result text default 'SUCCESS',
  p_severity text default 'INFO',
  p_source text default 'APPLICATION',
  p_message text default null,
  p_before jsonb default null,
  p_after jsonb default null,
  p_metadata jsonb default '{}'::jsonb,
  p_project_id uuid default null,
  p_client_id uuid default null,
  p_correlation_id uuid default null,
  p_request_id text default null,
  p_deduplication_key text default null,
  p_actor_type text default 'INTERNAL',
  p_ip_sha256 text default null,
  p_user_agent_sha256 text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_id uuid;
  v_correlation uuid:=coalesce(p_correlation_id,gen_random_uuid());
  v_retention integer:=365;
  v_rule public.observability_alert_rules;
  v_count integer;
  v_alert_id uuid;
begin
  if auth.role()<>'service_role' then
    if auth.uid() is null then raise exception 'Autenticação obrigatória.'; end if;
    if p_actor_type='CLIENT' then
      if p_client_id is null or not public.is_client_owner(p_client_id) then raise exception 'Cliente inválido.'; end if;
    elsif not public.is_internal_member(p_organization_id) then
      raise exception 'Organização inválida para auditoria.';
    end if;
  end if;
  if not exists(select 1 from public.organizations where id=p_organization_id) then raise exception 'Organização inexistente.'; end if;
  if p_project_id is not null and not exists(select 1 from public.projects where id=p_project_id and organization_id=p_organization_id) then raise exception 'Obra incompatível.'; end if;
  if p_client_id is not null and not exists(select 1 from public.clients where id=p_client_id and organization_id=p_organization_id) then raise exception 'Cliente incompatível.'; end if;
  if p_module_key is not null and not exists(select 1 from public.app_modules where key=p_module_key and active) then raise exception 'Módulo desconhecido.'; end if;
  if upper(p_severity) not in ('INFO','WARNING','ERROR','CRITICAL') then raise exception 'Severidade inválida.'; end if;
  if upper(p_source) not in ('APPLICATION','DATABASE','WORKER','INTEGRATION','SECURITY','HEALTH') then raise exception 'Origem inválida.'; end if;
  if upper(p_actor_type) not in ('INTERNAL','CLIENT','SYSTEM','INTEGRATION') then raise exception 'Ator inválido.'; end if;
  if p_ip_sha256 is not null and p_ip_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'Hash de IP inválido.'; end if;
  if p_user_agent_sha256 is not null and p_user_agent_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'Hash de user-agent inválido.'; end if;

  if p_deduplication_key is not null then
    select id into v_id from public.audit_events
    where organization_id=p_organization_id and deduplication_key=p_deduplication_key
    order by occurred_at desc limit 1;
    if v_id is not null then return v_id; end if;
  end if;
  select retention_days into v_retention from public.observability_retention_policies
    where organization_id=p_organization_id and source_table='audit_events' and active limit 1;
  v_retention:=coalesce(v_retention,365);

  insert into public.audit_events(
    organization_id,project_id,client_id,actor_user_id,event_type,resource_type,resource_id,action,result,
    before_data,after_data,correlation_id,module_key,severity,source,actor_type,message,metadata,request_id,
    deduplication_key,ip_sha256,user_agent_sha256,occurred_at,retention_until
  ) values (
    p_organization_id,p_project_id,p_client_id,auth.uid(),p_event_type,p_resource_type,p_resource_id,upper(p_action),upper(p_result),
    public.sanitize_audit_json(p_before),public.sanitize_audit_json(p_after),v_correlation,p_module_key,upper(p_severity),upper(p_source),
    upper(p_actor_type),p_message,coalesce(public.sanitize_audit_json(p_metadata),'{}'::jsonb),p_request_id,p_deduplication_key,
    p_ip_sha256,p_user_agent_sha256,now(),now()+make_interval(days=>v_retention)
  ) returning id into v_id;

  for v_rule in select * from public.observability_alert_rules rule
    where rule.organization_id=p_organization_id and rule.active
      and (rule.module_key is null or rule.module_key=p_module_key)
      and (rule.event_type_pattern is null or p_event_type like rule.event_type_pattern)
      and public.stage19_severity_rank(p_severity)>=public.stage19_severity_rank(rule.minimum_severity)
  loop
    select count(*) into v_count from public.audit_events event
    where event.organization_id=p_organization_id
      and event.occurred_at>=now()-make_interval(mins=>v_rule.window_minutes)
      and (v_rule.module_key is null or event.module_key=v_rule.module_key)
      and (v_rule.event_type_pattern is null or event.event_type like v_rule.event_type_pattern)
      and public.stage19_severity_rank(event.severity)>=public.stage19_severity_rank(v_rule.minimum_severity);
    if v_count>=v_rule.threshold_count then
      select id into v_alert_id from public.observability_alerts alert
      where alert.organization_id=p_organization_id and alert.rule_id=v_rule.id and alert.status in ('OPEN','ACKNOWLEDGED')
        and alert.last_occurred_at>=now()-make_interval(mins=>v_rule.cooldown_minutes)
      order by alert.last_occurred_at desc limit 1 for update;
      if v_alert_id is null then
        insert into public.observability_alerts(organization_id,rule_id,audit_event_id,project_id,module_key,severity,title,message,correlation_id,metadata)
        values(p_organization_id,v_rule.id,v_id,p_project_id,p_module_key,upper(p_severity),v_rule.name,coalesce(p_message,p_event_type),v_correlation,
          jsonb_build_object('eventType',p_event_type,'threshold',v_rule.threshold_count,'windowMinutes',v_rule.window_minutes))
        returning id into v_alert_id;
      else
        update public.observability_alerts set occurrence_count=occurrence_count+1,last_occurred_at=now(),audit_event_id=v_id,
          severity=case when public.stage19_severity_rank(p_severity)>public.stage19_severity_rank(severity) then upper(p_severity) else severity end,
          updated_at=now() where id=v_alert_id;
      end if;
    end if;
  end loop;

  if upper(p_severity)='CRITICAL' and not exists(select 1 from public.observability_alerts where audit_event_id=v_id) then
    insert into public.observability_alerts(organization_id,audit_event_id,project_id,module_key,severity,title,message,correlation_id,metadata)
    values(p_organization_id,v_id,p_project_id,p_module_key,'CRITICAL','Evento crítico',coalesce(p_message,p_event_type),v_correlation,
      jsonb_build_object('eventType',p_event_type,'automatic',true));
  end if;
  return v_id;
end;
$$;

create or replace function public.write_audit(
  p_organization_id uuid,
  p_resource_type text,
  p_resource_id uuid,
  p_action text,
  p_after jsonb default null,
  p_project_id uuid default null
) returns uuid language plpgsql security definer set search_path=public as $$
begin
  return public.record_audit_event(
    p_organization_id,null,p_resource_type||'.'||lower(p_action),p_resource_type,p_resource_id,p_action,'SUCCESS','INFO','DATABASE',null,
    null,p_after,'{}'::jsonb,p_project_id,null,null,null,null,'INTERNAL',null,null
  );
end;
$$;

create or replace function public.acknowledge_observability_alert(p_alert_id uuid,p_reason text)
returns public.observability_alerts language plpgsql security definer set search_path=public as $$
declare v_alert public.observability_alerts;
begin
  if length(trim(coalesce(p_reason,'')))<3 then raise exception 'Motivo obrigatório.'; end if;
  select * into v_alert from public.observability_alerts where id=p_alert_id for update;
  if not found or not public.has_module_permission(v_alert.organization_id,'auditoria','READ',v_alert.project_id,'administer') then raise exception 'Acesso negado.'; end if;
  if v_alert.status='RESOLVED' then raise exception 'Alerta já resolvido.'; end if;
  update public.observability_alerts set status='ACKNOWLEDGED',acknowledged_by=auth.uid(),acknowledged_at=now(),acknowledgement_reason=trim(p_reason)
    where id=p_alert_id returning * into v_alert;
  perform public.record_audit_event(v_alert.organization_id,'auditoria','observability.alert.acknowledged','observability_alert',v_alert.id,'UPDATE','SUCCESS','INFO','APPLICATION',p_reason,
    null,to_jsonb(v_alert),jsonb_build_object('alertId',v_alert.id),v_alert.project_id,null,v_alert.correlation_id,null,null,'INTERNAL',null,null);
  return v_alert;
end;
$$;

create or replace function public.resolve_observability_alert(p_alert_id uuid,p_reason text)
returns public.observability_alerts language plpgsql security definer set search_path=public as $$
declare v_alert public.observability_alerts;
begin
  if length(trim(coalesce(p_reason,'')))<3 then raise exception 'Motivo obrigatório.'; end if;
  select * into v_alert from public.observability_alerts where id=p_alert_id for update;
  if not found or not public.has_module_permission(v_alert.organization_id,'auditoria','READ',v_alert.project_id,'administer') then raise exception 'Acesso negado.'; end if;
  update public.observability_alerts set status='RESOLVED',resolved_by=auth.uid(),resolved_at=now(),resolution_reason=trim(p_reason)
    where id=p_alert_id returning * into v_alert;
  perform public.record_audit_event(v_alert.organization_id,'auditoria','observability.alert.resolved','observability_alert',v_alert.id,'UPDATE','SUCCESS','INFO','APPLICATION',p_reason,
    null,to_jsonb(v_alert),jsonb_build_object('alertId',v_alert.id),v_alert.project_id,null,v_alert.correlation_id,null,null,'INTERNAL',null,null);
  return v_alert;
end;
$$;

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
  select count(*) into v_diagnostics from public.observability_diagnostics where (organization_id=p_organization_id or organization_id is null) and resolved_at is null;

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
    'unresolvedDiagnostics',(select count(*) from public.observability_diagnostics where (organization_id=p_organization_id or organization_id is null) and resolved_at is null),
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

revoke execute on function public.stage19_severity_rank(text), public.sanitize_audit_json(jsonb) from public,anon,authenticated;
revoke execute on function public.record_audit_event(uuid,text,text,text,uuid,text,text,text,text,text,jsonb,jsonb,jsonb,uuid,uuid,uuid,text,text,text,text,text) from public,anon;
revoke execute on function public.write_audit(uuid,text,uuid,text,jsonb,uuid) from public,anon;
revoke execute on function public.acknowledge_observability_alert(uuid,text), public.resolve_observability_alert(uuid,text),
  public.run_observability_health_snapshot(uuid), public.get_observability_dashboard(uuid,integer) from public,anon;
grant execute on function public.record_audit_event(uuid,text,text,text,uuid,text,text,text,text,text,jsonb,jsonb,jsonb,uuid,uuid,uuid,text,text,text,text,text) to authenticated,service_role;
grant execute on function public.write_audit(uuid,text,uuid,text,jsonb,uuid) to authenticated,service_role;
grant execute on function public.acknowledge_observability_alert(uuid,text), public.resolve_observability_alert(uuid,text),
  public.run_observability_health_snapshot(uuid), public.get_observability_dashboard(uuid,integer) to authenticated;

commit;
