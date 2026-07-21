-- Etapa 19 — Fluxo unificado sem duplicação das trilhas de domínio.
begin;

create or replace function public.get_observability_events(
  p_organization_id uuid,
  p_module_key text default null,
  p_severity text default null,
  p_query text default null,
  p_correlation_id uuid default null,
  p_period_start timestamptz default now()-interval '30 days',
  p_period_end timestamptz default now(),
  p_page integer default 1,
  p_page_size integer default 50
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb;
begin
  if not public.has_module_permission(p_organization_id,'auditoria','READ',null,null) then raise exception 'Acesso negado.'; end if;
  if p_page<1 or p_page_size<1 or p_page_size>200 then raise exception 'Paginação inválida.'; end if;
  if p_period_start is null or p_period_end is null or p_period_end<p_period_start then raise exception 'Período inválido.'; end if;
  if p_severity is not null and upper(p_severity) not in ('INFO','WARNING','ERROR','CRITICAL') then raise exception 'Severidade inválida.'; end if;

  with normalized as (
    select event.id,event.organization_id,event.project_id,event.client_id,event.module_key,event.event_type,event.severity,event.source,
      event.actor_user_id,event.actor_type,event.resource_type,event.resource_id,event.action,event.result,event.message,
      public.sanitize_audit_json(event.metadata) metadata,event.correlation_id,event.occurred_at,'audit_events'::text origin_table
    from public.audit_events event where event.organization_id=p_organization_id

    union all
    select change.id,change.organization_id,change.project_id,null::uuid,'administracao',
      'permission.'||lower(change.action),'WARNING','SECURITY',change.actor_user_id,'INTERNAL','permission_change',coalesce(change.target_user_id,change.profile_id,change.module_id),
      change.action,'SUCCESS',change.reason,
      public.sanitize_audit_json(jsonb_build_object('targetUserId',change.target_user_id,'profileId',change.profile_id,'moduleId',change.module_id,'before',change.before_data,'after',change.after_data)),
      change.id,change.created_at,'permission_change_events'
    from public.permission_change_events change where change.organization_id=p_organization_id

    union all
    select signature.id,signature.organization_id,null::uuid,null::uuid,'assinaturas',signature.event_type,
      case when lower(signature.event_type) ~ '(fail|error|reject|cancel)' then 'ERROR' else 'INFO' end,'INTEGRATION',null::uuid,'INTEGRATION','signature_envelope',signature.envelope_id,
      signature.event_type,'SUCCESS',null::text,
      jsonb_strip_nulls(jsonb_build_object('providerEventId',signature.provider_event_id,'payloadHash',signature.payload_hash)),signature.id,signature.occurred_at,'signature_events'
    from public.signature_events signature where signature.organization_id=p_organization_id

    union all
    select access.id,access.organization_id,null::uuid,null::uuid,'documentos','document.'||lower(access.action),'INFO','SECURITY',access.actor_user_id,'INTERNAL',
      access.resource_type,access.resource_id,access.action,'SUCCESS',null::text,'{}'::jsonb,access.correlation_id,access.created_at,'document_access_logs'
    from public.document_access_logs access where access.organization_id=p_organization_id

    union all
    select quality.id,quality.organization_id,null::uuid,null::uuid,'qualidade',quality.event_type,
      case when lower(quality.event_type) ~ '(fail|reject|non.?conform)' then 'WARNING' else 'INFO' end,'APPLICATION',quality.actor_user_id,'INTERNAL','quality_response',
      coalesce(quality.response_id,quality.assignment_id,quality.template_id),quality.event_type,'SUCCESS',null::text,public.sanitize_audit_json(quality.metadata),quality.id,quality.created_at,'quality_form_events'
    from public.quality_form_events quality where quality.organization_id=p_organization_id

    union all
    select procurement.id,procurement.organization_id,procurement.project_id,null::uuid,'compras',procurement.event_type,
      case when lower(procurement.event_type) ~ '(fail|reject|cancel)' then 'WARNING' else 'INFO' end,'APPLICATION',procurement.actor_user_id,'INTERNAL','procurement',
      coalesce(procurement.receipt_id,procurement.order_id,procurement.quote_id,procurement.rfq_id,procurement.request_id),procurement.event_type,'SUCCESS',null::text,
      public.sanitize_audit_json(procurement.metadata),procurement.id,procurement.created_at,'procurement_events'
    from public.procurement_events procurement where procurement.organization_id=p_organization_id

    union all
    select finance.id,finance.organization_id,finance.project_id,null::uuid,'financeiro',finance.event_type,
      case when lower(finance.event_type) ~ '(fail|reject|cancel|overdue)' then 'WARNING' else 'INFO' end,'APPLICATION',finance.actor_user_id,'INTERNAL','finance',
      coalesce(finance.installment_id,finance.entry_id,finance.measurement_id),finance.event_type,'SUCCESS',null::text,public.sanitize_audit_json(finance.metadata),finance.id,finance.created_at,'finance_events'
    from public.finance_events finance where finance.organization_id=p_organization_id

    union all
    select report.id,report.organization_id,report.project_id,null::uuid,'relatorios',report.event_type,
      case when lower(report.event_type) ~ '(fail|error)' then 'ERROR' else 'INFO' end,'WORKER',report.actor_user_id,'INTERNAL','report',
      coalesce(report.snapshot_id,report.saved_view_id),report.event_type,'SUCCESS',null::text,public.sanitize_audit_json(report.metadata),report.id,report.created_at,'report_events'
    from public.report_events report where report.organization_id=p_organization_id

    union all
    select inventory.id,inventory.organization_id,inventory.project_id,null::uuid,'estoque',inventory.event_type,
      case when lower(inventory.event_type) ~ '(fail|reject|negative|diverg)' then 'WARNING' else 'INFO' end,'APPLICATION',inventory.actor_user_id,'INTERNAL','inventory',
      coalesce(inventory.movement_id,inventory.reservation_id,inventory.asset_id,inventory.stocktake_id,inventory.item_id,inventory.warehouse_id),inventory.event_type,'SUCCESS',null::text,
      public.sanitize_audit_json(inventory.metadata),inventory.id,inventory.created_at,'inventory_events'
    from public.inventory_events inventory where inventory.organization_id=p_organization_id

    union all
    select sac.id,sac.organization_id,ticket.project_id,ticket.client_id,'sac',sac.event_type,
      case when lower(sac.event_type) ~ '(breach|overdue|fail|reopen)' then 'WARNING' else 'INFO' end,'APPLICATION',sac.actor_user_id,
      case when sac.actor_client_id is not null then 'CLIENT' else 'INTERNAL' end,'sac_ticket',sac.ticket_id,sac.event_type,'SUCCESS',null::text,
      public.sanitize_audit_json(sac.metadata),sac.id,sac.created_at,'sac_ticket_events'
    from public.sac_ticket_events sac join public.sac_tickets ticket on ticket.id=sac.ticket_id where sac.organization_id=p_organization_id

    union all
    select history.id,history.organization_id,null::uuid,null::uuid,'crm','crm.opportunity.stage_changed','INFO','APPLICATION',history.changed_by,'INTERNAL',
      'opportunity',history.opportunity_id,'UPDATE','SUCCESS',history.reason,
      jsonb_build_object('fromStage',history.from_stage,'toStage',history.to_stage),history.id,history.changed_at,'crm_opportunity_stage_history'
    from public.crm_opportunity_stage_history history where history.organization_id=p_organization_id

    union all
    select activity.id,activity.organization_id,null::uuid,activity.client_id,'crm','crm.activity.'||lower(activity.activity_type),'INFO','APPLICATION',activity.created_by,'INTERNAL',
      'crm_activity',coalesce(activity.ticket_id,activity.opportunity_id,activity.lead_id,activity.client_id),activity.activity_type,'SUCCESS',activity.subject,
      public.sanitize_audit_json(jsonb_strip_nulls(jsonb_build_object('description',activity.description,'dueAt',activity.due_at,'completedAt',activity.completed_at))),activity.id,activity.occurred_at,'crm_activities'
    from public.crm_activities activity where activity.organization_id=p_organization_id
  ), filtered as (
    select * from normalized event
    where event.occurred_at between p_period_start and p_period_end
      and (p_module_key is null or event.module_key=p_module_key)
      and (p_severity is null or event.severity=upper(p_severity))
      and (p_correlation_id is null or event.correlation_id=p_correlation_id)
      and (nullif(trim(coalesce(p_query,'')),'') is null or concat_ws(' ',event.event_type,event.resource_type,event.action,event.message,event.origin_table) ilike '%'||trim(p_query)||'%')
  ), total as (
    select count(*) quantity from filtered
  ), page_rows as (
    select * from filtered order by occurred_at desc,id desc offset ((p_page-1)*p_page_size) limit p_page_size
  )
  select jsonb_build_object(
    'items',coalesce((select jsonb_agg(to_jsonb(page_rows) order by occurred_at desc,id desc) from page_rows),'[]'::jsonb),
    'total',(select quantity from total),
    'page',p_page,
    'pageSize',p_page_size,
    'pages',greatest(1,ceil((select quantity from total)::numeric/p_page_size)::integer)
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.get_observability_event_detail(p_organization_id uuid,p_origin_table text,p_event_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_detail jsonb;
begin
  if not public.has_module_permission(p_organization_id,'auditoria','READ',null,null) then raise exception 'Acesso negado.'; end if;
  case p_origin_table
    when 'audit_events' then
      select to_jsonb(event) into v_detail from public.audit_events event where event.organization_id=p_organization_id and event.id=p_event_id;
    when 'permission_change_events' then
      select jsonb_build_object('id',event.id,'originTable',p_origin_table,'moduleKey','administracao','eventType','permission.'||lower(event.action),
        'actorUserId',event.actor_user_id,'projectId',event.project_id,'resourceId',coalesce(event.target_user_id,event.profile_id,event.module_id),
        'message',event.reason,'before',public.sanitize_audit_json(event.before_data),'after',public.sanitize_audit_json(event.after_data),'occurredAt',event.created_at)
      into v_detail from public.permission_change_events event where event.organization_id=p_organization_id and event.id=p_event_id;
    when 'signature_events' then
      select jsonb_build_object('id',event.id,'originTable',p_origin_table,'moduleKey','assinaturas','eventType',event.event_type,'resourceId',event.envelope_id,
        'providerEventId',event.provider_event_id,'payloadHash',event.payload_hash,'occurredAt',event.occurred_at)
      into v_detail from public.signature_events event where event.organization_id=p_organization_id and event.id=p_event_id;
    else
      select jsonb_build_object('id',item.id,'originTable',p_origin_table,'eventType',item.event_type,'metadata',public.sanitize_audit_json(item.metadata),'occurredAt',item.created_at)
      into v_detail from (
        select id,organization_id,event_type,metadata,created_at from public.quality_form_events
        union all select id,organization_id,event_type,metadata,created_at from public.procurement_events
        union all select id,organization_id,event_type,metadata,created_at from public.finance_events
        union all select id,organization_id,event_type,metadata,created_at from public.report_events
        union all select id,organization_id,event_type,metadata,created_at from public.inventory_events
        union all select id,organization_id,event_type,metadata,created_at from public.sac_ticket_events
      ) item where item.organization_id=p_organization_id and item.id=p_event_id limit 1;
  end case;
  if v_detail is null then raise exception 'Evento não encontrado.'; end if;
  return public.sanitize_audit_json(v_detail);
end;
$$;

revoke execute on function public.get_observability_events(uuid,text,text,text,uuid,timestamptz,timestamptz,integer,integer),
  public.get_observability_event_detail(uuid,text,uuid) from public,anon;
grant execute on function public.get_observability_events(uuid,text,text,text,uuid,timestamptz,timestamptz,integer,integer),
  public.get_observability_event_detail(uuid,text,uuid) to authenticated;

commit;
