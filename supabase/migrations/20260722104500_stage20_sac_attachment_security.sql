-- Etapa 20 — proteção de anexos do SAC por quarentena e antimalware.

alter table public.sac_ticket_attachments
  add column if not exists security_status text not null default 'LEGACY',
  add column if not exists security_scan_id uuid,
  add column if not exists security_provider text,
  add column if not exists security_scanned_at timestamptz;

alter table public.sac_ticket_attachments
  drop constraint if exists sac_ticket_attachments_security_status_check;
alter table public.sac_ticket_attachments
  add constraint sac_ticket_attachments_security_status_check
  check (security_status in ('LEGACY','CLEAN'));

alter table public.sac_ticket_attachments
  drop constraint if exists sac_ticket_attachments_security_state_check;
alter table public.sac_ticket_attachments
  add constraint sac_ticket_attachments_security_state_check
  check (
    (
      security_status='LEGACY'
      and security_scan_id is null
      and security_provider is null
      and security_scanned_at is null
    )
    or
    (
      security_status='CLEAN'
      and security_scan_id is not null
      and security_provider in ('clamav','test-clean')
      and security_scanned_at is not null
    )
  );

create index if not exists sac_ticket_attachments_ticket_security_idx
  on public.sac_ticket_attachments(ticket_id,security_status,created_at desc);

-- A assinatura anterior é removida para impedir novos registros sem evidência de scan.
drop function if exists public.register_sac_ticket_attachment(
  uuid,uuid,text,text,text,bigint,text,boolean
);

create or replace function public.register_sac_ticket_attachment(
  p_ticket_id uuid,
  p_message_id uuid,
  p_storage_path text,
  p_file_name text,
  p_mime_type text,
  p_size_bytes bigint,
  p_sha256 text,
  p_client_visible boolean,
  p_security_scan_id uuid,
  p_security_provider text,
  p_security_scanned_at timestamptz
) returns public.sac_ticket_attachments
language plpgsql security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_ticket public.sac_tickets;
  v_attachment public.sac_ticket_attachments;
  v_internal boolean;
  v_client_actor uuid;
  v_client_visible boolean;
begin
  select * into v_ticket
  from public.sac_tickets
  where id=p_ticket_id;
  if not found then raise exception 'Chamado não encontrado.'; end if;

  v_internal:=public.has_module_permission(
    v_ticket.organization_id,'sac','EDIT',v_ticket.project_id,null
  );
  if not v_internal then
    select id into v_client_actor
    from public.clients
    where id=v_ticket.client_id and user_id=auth.uid() and archived_at is null;
    if v_client_actor is null then raise exception 'Sem acesso ao chamado.'; end if;
  end if;

  if p_message_id is not null and not exists(
    select 1 from public.sac_ticket_messages message
    where message.id=p_message_id
      and message.ticket_id=v_ticket.id
      and (v_internal or message.visibility='CLIENT')
  ) then
    raise exception 'Mensagem incompatível com o anexo.';
  end if;

  if p_storage_path not like v_ticket.organization_id::text||'/'||v_ticket.id::text||'/%' then
    raise exception 'Caminho de arquivo inválido.';
  end if;
  if p_size_bytes<=0 or p_size_bytes>26214400 then
    raise exception 'Tamanho de arquivo inválido.';
  end if;
  if p_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'Hash SHA-256 inválido.';
  end if;
  if p_security_scan_id is null
     or p_security_provider not in ('clamav','test-clean')
     or p_security_scanned_at is null then
    raise exception 'Evidência antimalware obrigatória ausente.';
  end if;

  v_client_visible:=case when v_internal then coalesce(p_client_visible,true) else true end;

  insert into public.sac_ticket_attachments(
    organization_id,ticket_id,message_id,storage_path,file_name,mime_type,
    size_bytes,sha256,client_visible,uploaded_by,uploaded_client_id,
    security_status,security_scan_id,security_provider,security_scanned_at
  ) values(
    v_ticket.organization_id,v_ticket.id,p_message_id,p_storage_path,
    trim(p_file_name),p_mime_type,p_size_bytes,p_sha256,v_client_visible,
    case when v_internal then auth.uid() else null end,
    case when v_internal then null else v_client_actor end,
    'CLEAN',p_security_scan_id,p_security_provider,p_security_scanned_at
  ) returning * into v_attachment;

  insert into public.sac_ticket_events(
    organization_id,ticket_id,event_type,actor_user_id,actor_client_id,metadata
  ) values(
    v_ticket.organization_id,v_ticket.id,'ATTACHMENT_ADDED',
    case when v_internal then auth.uid() else null end,
    case when v_internal then null else v_client_actor end,
    jsonb_build_object(
      'attachmentId',v_attachment.id,
      'fileName',v_attachment.file_name,
      'sha256',v_attachment.sha256,
      'clientVisible',v_attachment.client_visible,
      'securityStatus',v_attachment.security_status,
      'securityScanId',v_attachment.security_scan_id,
      'securityProvider',v_attachment.security_provider
    )
  );

  return v_attachment;
end $$;

revoke all on function public.register_sac_ticket_attachment(
  uuid,uuid,text,text,text,bigint,text,boolean,uuid,text,timestamptz
) from public,anon;
grant execute on function public.register_sac_ticket_attachment(
  uuid,uuid,text,text,text,bigint,text,boolean,uuid,text,timestamptz
) to authenticated,service_role;

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
  if not v_internal and not v_client_owner then raise exception 'Permissão insuficiente.'; end if;

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
      select coalesce(jsonb_agg(jsonb_build_object(
        'id',message.id,'visibility',message.visibility,'body',message.body,
        'authorUserId',case when v_internal then message.author_user_id else null end,
        'authorClientId',message.author_client_id,'createdAt',message.created_at
      ) order by message.created_at),'[]'::jsonb)
      from public.sac_ticket_messages message
      where message.ticket_id=v_ticket.id and (v_internal or message.visibility='CLIENT')
    ),
    'attachments',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'id',attachment.id,'messageId',attachment.message_id,
        'fileName',attachment.file_name,'mimeType',attachment.mime_type,
        'sizeBytes',attachment.size_bytes,'sha256',attachment.sha256,
        'clientVisible',attachment.client_visible,
        'securityStatus',attachment.security_status,
        'securityScanId',case when v_internal then attachment.security_scan_id else null end,
        'securityProvider',case when v_internal then attachment.security_provider else null end,
        'securityScannedAt',attachment.security_scanned_at,
        'createdAt',attachment.created_at
      ) order by attachment.created_at),'[]'::jsonb)
      from public.sac_ticket_attachments attachment
      where attachment.ticket_id=v_ticket.id
        and (
          v_internal
          or (attachment.client_visible and attachment.security_status='CLEAN')
        )
    ),
    'events',case when v_internal then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id',event.id,'type',event.event_type,
        'metadata',event.metadata,'createdAt',event.created_at
      ) order by event.created_at),'[]'::jsonb)
      from public.sac_ticket_events event where event.ticket_id=v_ticket.id
    ) else '[]'::jsonb end
  );
end $$;

revoke all on function public.get_sac_ticket_detail(uuid) from public,anon;
grant execute on function public.get_sac_ticket_detail(uuid) to authenticated,service_role;
