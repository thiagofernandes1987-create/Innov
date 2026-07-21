-- Etapa 18 — contratos seguros de consulta para CRM, Cliente 360 e SAC.

create or replace function public.get_crm_pipeline(p_organization_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path=public,auth,pg_temp
as $$
begin
  if not public.has_module_permission(p_organization_id,'crm','READ',null,null) then
    raise exception 'Permissão insuficiente.';
  end if;

  return jsonb_build_object(
    'leadsByStage',(
      select coalesce(jsonb_object_agg(stage,total),'{}'::jsonb)
      from (
        select stage,count(*) total
        from public.crm_leads
        where organization_id=p_organization_id and archived_at is null
        group by stage
      ) q
    ),
    'opportunitiesByStage',(
      select coalesce(
        jsonb_object_agg(stage,jsonb_build_object('count',total,'value',value)),
        '{}'::jsonb
      )
      from (
        select stage,count(*) total,coalesce(sum(estimated_value),0) value
        from public.opportunities
        where organization_id=p_organization_id and archived_at is null
        group by stage
      ) q
    ),
    'followUpsDue',(
      select count(*)
      from public.crm_activities
      where organization_id=p_organization_id
        and completed_at is null
        and due_at<now()
    ),
    'weightedPipeline',(
      select coalesce(sum(coalesce(estimated_value,0)*probability/100),0)
      from public.opportunities
      where organization_id=p_organization_id
        and stage not in ('WON','LOST')
        and archived_at is null
    ),
    'wonValue',(
      select coalesce(sum(estimated_value),0)
      from public.opportunities
      where organization_id=p_organization_id
        and stage='WON'
        and archived_at is null
    )
  );
end $$;

create or replace function public.get_client_360(p_client_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_client public.clients;
  v_allowed boolean;
  v_sensitive boolean;
begin
  select * into v_client from public.clients where id=p_client_id;
  if not found then raise exception 'Cliente não encontrado.'; end if;

  v_allowed:=
    public.has_module_permission(v_client.organization_id,'clientes','READ',null,null)
    or public.has_module_permission(v_client.organization_id,'crm','READ',null,null)
    or public.has_module_permission(v_client.organization_id,'sac','READ',null,null);
  if not v_allowed then raise exception 'Permissão insuficiente.'; end if;

  v_sensitive:=
    public.has_module_permission(v_client.organization_id,'clientes','READ',null,'sensitive')
    or public.has_module_permission(v_client.organization_id,'crm','READ',null,'sensitive')
    or public.has_module_permission(v_client.organization_id,'sac','READ',null,'sensitive');

  return jsonb_build_object(
    'sensitiveVisible',v_sensitive,
    'client',
      (to_jsonb(v_client)-'notes'-'tax_id')
      ||jsonb_build_object(
        'taxId',case when v_sensitive then v_client.tax_id else null end,
        'notes',case when v_sensitive then v_client.notes else null end
      ),
    'contacts',(
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id',contact.id,
            'fullName',contact.full_name,
            'roleTitle',contact.role_title,
            'email',contact.email,
            'phone',contact.phone,
            'preferredChannel',contact.preferred_channel,
            'primary',contact.is_primary
          ) order by contact.is_primary desc,contact.full_name
        ),'[]'::jsonb
      )
      from public.client_contacts contact
      where contact.client_id=v_client.id and contact.archived_at is null
    ),
    'projects',(
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id',project.id,'code',project.code,'name',project.name,
            'status',project.status,'progress',project.progress,
            'startDate',project.start_date,'endDate',project.end_date
          ) order by project.created_at desc
        ),'[]'::jsonb
      )
      from public.projects project where project.client_id=v_client.id
    ),
    'opportunities',(
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id',opportunity.id,'code',opportunity.code,'title',opportunity.title,
            'stage',opportunity.stage,'estimatedValue',opportunity.estimated_value,
            'probability',opportunity.probability,'expectedCloseDate',opportunity.expected_close_date
          ) order by opportunity.created_at desc
        ),'[]'::jsonb
      )
      from public.opportunities opportunity
      where opportunity.client_id=v_client.id and opportunity.archived_at is null
    ),
    'contracts',(
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id',contract.id,'code',contract.code,'status',contract.status,
            'projectId',contract.project_id,'totalValue',
            case when v_sensitive then contract.consolidated_value else null end
          ) order by contract.created_at desc
        ),'[]'::jsonb
      )
      from public.contracts contract where contract.client_id=v_client.id
    ),
    'tickets',(
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id',ticket.id,'code',ticket.code,'title',ticket.title,
            'status',ticket.status,'priority',ticket.priority,
            'projectId',ticket.project_id,'createdAt',ticket.created_at,
            'resolutionDueAt',ticket.resolution_due_at
          ) order by ticket.created_at desc
        ),'[]'::jsonb
      )
      from public.sac_tickets ticket where ticket.client_id=v_client.id
    ),
    'recentActivities',(
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id',activity.id,'type',activity.activity_type,'subject',activity.subject,
            'description',activity.description,'occurredAt',activity.occurred_at,
            'dueAt',activity.due_at,'completedAt',activity.completed_at
          ) order by activity.occurred_at desc
        ),'[]'::jsonb
      )
      from (
        select * from public.crm_activities
        where client_id=v_client.id
        order by occurred_at desc
        limit 30
      ) activity
    )
  );
end $$;

create or replace function public.get_client_portal_relationship()
returns jsonb
language plpgsql stable security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_client public.clients;
begin
  select * into v_client
  from public.clients
  where user_id=auth.uid() and archived_at is null
  order by created_at
  limit 1;

  if not found then raise exception 'Cliente não vinculado à sessão.'; end if;

  return jsonb_build_object(
    'client',jsonb_build_object(
      'id',v_client.id,
      'legalName',v_client.legal_name,
      'tradeName',v_client.trade_name,
      'email',v_client.email,
      'phone',v_client.phone,
      'preferredContactChannel',v_client.preferred_contact_channel
    ),
    'projects',(
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id',project.id,'code',project.code,'name',project.name,
            'status',project.status,'progress',project.progress
          ) order by project.created_at desc
        ),'[]'::jsonb
      )
      from public.projects project where project.client_id=v_client.id
    ),
    'tickets',(
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id',ticket.id,'code',ticket.code,'title',ticket.title,
            'status',ticket.status,'priority',ticket.priority,
            'projectId',ticket.project_id,'createdAt',ticket.created_at,
            'resolutionDueAt',ticket.resolution_due_at,
            'satisfactionScore',ticket.satisfaction_score
          ) order by ticket.created_at desc
        ),'[]'::jsonb
      )
      from public.sac_tickets ticket where ticket.client_id=v_client.id
    )
  );
end $$;

create or replace function public.get_sac_dashboard(p_organization_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path=public,auth,pg_temp
as $$
begin
  if not public.has_module_permission(p_organization_id,'sac','READ',null,null) then
    raise exception 'Permissão insuficiente.';
  end if;

  return jsonb_build_object(
    'byStatus',(
      select coalesce(jsonb_object_agg(status,total),'{}'::jsonb)
      from (
        select status,count(*) total
        from public.sac_tickets
        where organization_id=p_organization_id
        group by status
      ) q
    ),
    'open',(
      select count(*) from public.sac_tickets
      where organization_id=p_organization_id
        and status not in ('CLOSED','CANCELLED')
    ),
    'overdue',(
      select count(*) from public.sac_tickets
      where organization_id=p_organization_id
        and status not in ('RESOLVED','CLOSED','CANCELLED')
        and resolution_due_at<now()
    ),
    'waitingClient',(
      select count(*) from public.sac_tickets
      where organization_id=p_organization_id and status='WAITING_CLIENT'
    ),
    'averageSatisfaction',(
      select round(avg(satisfaction_score)::numeric,2)
      from public.sac_tickets
      where organization_id=p_organization_id and satisfaction_score is not null
    ),
    'averageResolutionHours',(
      select round(avg(extract(epoch from (resolved_at-created_at))/3600)::numeric,2)
      from public.sac_tickets
      where organization_id=p_organization_id and resolved_at is not null
    )
  );
end $$;

create or replace function public.get_sac_ticket_detail(p_ticket_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_ticket public.sac_tickets;
  v_internal boolean;
  v_client_owner boolean;
begin
  select * into v_ticket from public.sac_tickets where id=p_ticket_id;
  if not found then raise exception 'Chamado não encontrado.'; end if;

  v_internal:=public.has_module_permission(
    v_ticket.organization_id,'sac','READ',v_ticket.project_id,null
  );
  v_client_owner:=public.is_client_owner(v_ticket.client_id);
  if not v_internal and not v_client_owner then
    raise exception 'Permissão insuficiente.';
  end if;

  return jsonb_build_object(
    'internal',v_internal,
    'ticket',jsonb_build_object(
      'id',v_ticket.id,'code',v_ticket.code,'clientId',v_ticket.client_id,
      'projectId',v_ticket.project_id,'contractId',v_ticket.contract_id,
      'categoryId',v_ticket.category_id,'title',v_ticket.title,
      'description',v_ticket.description,'source',v_ticket.source,
      'priority',v_ticket.priority,'status',v_ticket.status,
      'assignedTo',case when v_internal then v_ticket.assigned_to else null end,
      'firstResponseDueAt',v_ticket.first_response_due_at,
      'resolutionDueAt',v_ticket.resolution_due_at,
      'firstRespondedAt',v_ticket.first_responded_at,
      'resolvedAt',v_ticket.resolved_at,'closedAt',v_ticket.closed_at,
      'satisfactionScore',v_ticket.satisfaction_score,
      'satisfactionComment',v_ticket.satisfaction_comment,
      'createdAt',v_ticket.created_at,'updatedAt',v_ticket.updated_at
    ),
    'messages',(
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id',message.id,'visibility',message.visibility,'body',message.body,
            'authorUserId',case when v_internal then message.author_user_id else null end,
            'authorClientId',message.author_client_id,'createdAt',message.created_at
          ) order by message.created_at
        ),'[]'::jsonb
      )
      from public.sac_ticket_messages message
      where message.ticket_id=v_ticket.id
        and (v_internal or message.visibility='CLIENT')
    ),
    'attachments',(
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id',attachment.id,'messageId',attachment.message_id,
            'fileName',attachment.file_name,'mimeType',attachment.mime_type,
            'sizeBytes',attachment.size_bytes,'sha256',attachment.sha256,
            'clientVisible',attachment.client_visible,'createdAt',attachment.created_at
          ) order by attachment.created_at
        ),'[]'::jsonb
      )
      from public.sac_ticket_attachments attachment
      where attachment.ticket_id=v_ticket.id
        and (v_internal or attachment.client_visible)
    ),
    'events',case when v_internal then (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id',event.id,'type',event.event_type,'metadata',event.metadata,
            'createdAt',event.created_at
          ) order by event.created_at
        ),'[]'::jsonb
      )
      from public.sac_ticket_events event where event.ticket_id=v_ticket.id
    ) else '[]'::jsonb end
  );
end $$;

revoke all on function public.get_crm_pipeline(uuid) from public,anon;
grant execute on function public.get_crm_pipeline(uuid) to authenticated,service_role;

revoke all on function public.get_client_360(uuid) from public,anon;
grant execute on function public.get_client_360(uuid) to authenticated,service_role;

revoke all on function public.get_client_portal_relationship() from public,anon;
grant execute on function public.get_client_portal_relationship() to authenticated,service_role;

revoke all on function public.get_sac_dashboard(uuid) from public,anon;
grant execute on function public.get_sac_dashboard(uuid) to authenticated,service_role;

revoke all on function public.get_sac_ticket_detail(uuid) from public,anon;
grant execute on function public.get_sac_ticket_detail(uuid) to authenticated,service_role;
