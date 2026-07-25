-- Etapa 19.1 — paridade do detalhe para todas as origens do fluxo unificado.
begin;

create or replace function public.get_observability_event_detail(
  p_organization_id uuid,
  p_origin_table text,
  p_event_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_detail jsonb;
begin
  if not public.has_module_permission(p_organization_id,'auditoria','READ',null,null) then
    raise exception 'Acesso negado.';
  end if;

  case p_origin_table
    when 'audit_events' then
      select to_jsonb(event)||jsonb_build_object('originTable',p_origin_table)
      into v_detail
      from public.audit_events event
      where event.organization_id=p_organization_id and event.id=p_event_id;

    when 'permission_change_events' then
      select jsonb_build_object(
        'id',event.id,'originTable',p_origin_table,'moduleKey','administracao',
        'eventType','permission.'||lower(event.action),'actorUserId',event.actor_user_id,
        'projectId',event.project_id,'resourceType','permission_change',
        'resourceId',coalesce(event.target_user_id,event.profile_id,event.module_id),
        'action',event.action,'message',event.reason,
        'before',public.sanitize_audit_json(event.before_data),
        'after',public.sanitize_audit_json(event.after_data),'occurredAt',event.created_at
      )
      into v_detail
      from public.permission_change_events event
      where event.organization_id=p_organization_id and event.id=p_event_id;

    when 'signature_events' then
      select jsonb_build_object(
        'id',event.id,'originTable',p_origin_table,'moduleKey','assinaturas',
        'eventType',event.event_type,'resourceType','signature_envelope','resourceId',event.envelope_id,
        'providerEventId',event.provider_event_id,'payloadHash',event.payload_hash,
        'occurredAt',event.occurred_at
      )
      into v_detail
      from public.signature_events event
      where event.organization_id=p_organization_id and event.id=p_event_id;

    when 'document_access_logs' then
      select jsonb_build_object(
        'id',event.id,'originTable',p_origin_table,'moduleKey','documentos',
        'eventType','document.'||lower(event.action),'actorUserId',event.actor_user_id,
        'resourceType',event.resource_type,'resourceId',event.resource_id,
        'action',event.action,'correlationId',event.correlation_id,'occurredAt',event.created_at
      )
      into v_detail
      from public.document_access_logs event
      where event.organization_id=p_organization_id and event.id=p_event_id;

    when 'quality_form_events' then
      select jsonb_build_object(
        'id',event.id,'originTable',p_origin_table,'moduleKey','qualidade',
        'eventType',event.event_type,'actorUserId',event.actor_user_id,
        'resourceType','quality_response',
        'resourceId',coalesce(event.response_id,event.assignment_id,event.template_id),
        'metadata',public.sanitize_audit_json(event.metadata),'occurredAt',event.created_at
      )
      into v_detail
      from public.quality_form_events event
      where event.organization_id=p_organization_id and event.id=p_event_id;

    when 'procurement_events' then
      select jsonb_build_object(
        'id',event.id,'originTable',p_origin_table,'moduleKey','compras',
        'eventType',event.event_type,'actorUserId',event.actor_user_id,
        'projectId',event.project_id,'resourceType','procurement',
        'resourceId',coalesce(event.receipt_id,event.order_id,event.quote_id,event.rfq_id,event.request_id),
        'metadata',public.sanitize_audit_json(event.metadata),'occurredAt',event.created_at
      )
      into v_detail
      from public.procurement_events event
      where event.organization_id=p_organization_id and event.id=p_event_id;

    when 'finance_events' then
      select jsonb_build_object(
        'id',event.id,'originTable',p_origin_table,'moduleKey','financeiro',
        'eventType',event.event_type,'actorUserId',event.actor_user_id,
        'projectId',event.project_id,'resourceType','finance',
        'resourceId',coalesce(event.installment_id,event.entry_id,event.measurement_id),
        'metadata',public.sanitize_audit_json(event.metadata),'occurredAt',event.created_at
      )
      into v_detail
      from public.finance_events event
      where event.organization_id=p_organization_id and event.id=p_event_id;

    when 'report_events' then
      select jsonb_build_object(
        'id',event.id,'originTable',p_origin_table,'moduleKey','relatorios',
        'eventType',event.event_type,'actorUserId',event.actor_user_id,
        'projectId',event.project_id,'resourceType','report',
        'resourceId',coalesce(event.snapshot_id,event.saved_view_id),
        'metadata',public.sanitize_audit_json(event.metadata),'occurredAt',event.created_at
      )
      into v_detail
      from public.report_events event
      where event.organization_id=p_organization_id and event.id=p_event_id;

    when 'inventory_events' then
      select jsonb_build_object(
        'id',event.id,'originTable',p_origin_table,'moduleKey','estoque',
        'eventType',event.event_type,'actorUserId',event.actor_user_id,
        'projectId',event.project_id,'resourceType','inventory',
        'resourceId',coalesce(event.movement_id,event.reservation_id,event.asset_id,event.stocktake_id,event.item_id,event.warehouse_id),
        'metadata',public.sanitize_audit_json(event.metadata),'occurredAt',event.created_at
      )
      into v_detail
      from public.inventory_events event
      where event.organization_id=p_organization_id and event.id=p_event_id;

    when 'sac_ticket_events' then
      select jsonb_build_object(
        'id',event.id,'originTable',p_origin_table,'moduleKey','sac',
        'eventType',event.event_type,'actorUserId',event.actor_user_id,
        'actorClientId',event.actor_client_id,'projectId',ticket.project_id,
        'clientId',ticket.client_id,'resourceType','sac_ticket','resourceId',event.ticket_id,
        'metadata',public.sanitize_audit_json(event.metadata),'occurredAt',event.created_at
      )
      into v_detail
      from public.sac_ticket_events event
      join public.sac_tickets ticket on ticket.id=event.ticket_id
      where event.organization_id=p_organization_id and event.id=p_event_id;

    when 'crm_opportunity_stage_history' then
      select jsonb_build_object(
        'id',event.id,'originTable',p_origin_table,'moduleKey','crm',
        'eventType','crm.opportunity.stage_changed','actorUserId',event.changed_by,
        'resourceType','opportunity','resourceId',event.opportunity_id,'action','UPDATE',
        'message',event.reason,'fromStage',event.from_stage,'toStage',event.to_stage,
        'occurredAt',event.changed_at
      )
      into v_detail
      from public.crm_opportunity_stage_history event
      where event.organization_id=p_organization_id and event.id=p_event_id;

    when 'crm_activities' then
      select jsonb_build_object(
        'id',event.id,'originTable',p_origin_table,'moduleKey','crm',
        'eventType','crm.activity.'||lower(event.activity_type),'actorUserId',event.created_by,
        'clientId',event.client_id,'resourceType','crm_activity',
        'resourceId',coalesce(event.ticket_id,event.opportunity_id,event.lead_id,event.client_id),
        'action',event.activity_type,'message',event.subject,
        'metadata',public.sanitize_audit_json(jsonb_strip_nulls(jsonb_build_object(
          'description',event.description,'dueAt',event.due_at,'completedAt',event.completed_at
        ))),'occurredAt',event.occurred_at
      )
      into v_detail
      from public.crm_activities event
      where event.organization_id=p_organization_id and event.id=p_event_id;

    else
      raise exception 'Origem de evento inválida.';
  end case;

  if v_detail is null then
    raise exception 'Evento não encontrado.';
  end if;
  return public.sanitize_audit_json(v_detail);
end;
$$;

revoke execute on function public.get_observability_event_detail(uuid,text,uuid) from public,anon;
grant execute on function public.get_observability_event_detail(uuid,text,uuid) to authenticated;

commit;
