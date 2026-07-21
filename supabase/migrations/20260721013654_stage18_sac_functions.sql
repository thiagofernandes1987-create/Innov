-- Etapa 18 — operações transacionais de atendimento e pós-venda.

create or replace function public.create_sac_ticket(
  p_organization_id uuid,
  p_client_id uuid,
  p_project_id uuid,
  p_contract_id uuid,
  p_category_id uuid,
  p_title text,
  p_description text,
  p_source text,
  p_priority text,
  p_idempotency_key text
) returns public.sac_tickets
language plpgsql security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_ticket public.sac_tickets;
  v_internal boolean;
  v_client_actor uuid;
  v_source text;
  v_priority text:='NORMAL';
  v_first_response_hours integer:=24;
  v_resolution_hours integer:=120;
begin
  v_internal:=public.has_module_permission(p_organization_id,'sac','EDIT',p_project_id,null);

  if not v_internal then
    select id into v_client_actor
    from public.clients
    where id=p_client_id
      and organization_id=p_organization_id
      and user_id=auth.uid()
      and archived_at is null;
    if v_client_actor is null then
      raise exception 'Sem acesso para abrir chamado.';
    end if;
  end if;

  if nullif(trim(p_title),'') is null or nullif(trim(p_description),'') is null then
    raise exception 'Título e descrição são obrigatórios.';
  end if;

  if p_idempotency_key is not null then
    select * into v_ticket
    from public.sac_tickets
    where organization_id=p_organization_id and idempotency_key=p_idempotency_key;
    if found then return v_ticket; end if;
  end if;

  if p_category_id is not null then
    select default_priority,first_response_sla_hours,resolution_sla_hours
      into v_priority,v_first_response_hours,v_resolution_hours
    from public.sac_categories
    where id=p_category_id and organization_id=p_organization_id and active;
    if not found then raise exception 'Categoria inválida.'; end if;
  end if;

  if p_priority in ('LOW','NORMAL','HIGH','URGENT') then
    v_priority:=p_priority;
  end if;

  v_source:=case
    when not v_internal then 'PORTAL'
    when p_source in ('INTERNAL','EMAIL','PHONE','WHATSAPP') then p_source
    else 'INTERNAL'
  end;

  insert into public.sac_tickets(
    organization_id,code,client_id,project_id,contract_id,category_id,
    title,description,source,priority,status,first_response_due_at,
    resolution_due_at,idempotency_key,created_by,opened_by_client_id
  ) values(
    p_organization_id,
    public.stage18_generate_code('SAC'),
    p_client_id,p_project_id,p_contract_id,p_category_id,
    trim(p_title),trim(p_description),v_source,v_priority,'OPEN',
    now()+make_interval(hours=>v_first_response_hours),
    now()+make_interval(hours=>v_resolution_hours),
    p_idempotency_key,
    case when v_internal then auth.uid() else null end,
    case when v_internal then null else v_client_actor end
  ) returning * into v_ticket;

  insert into public.sac_ticket_events(
    organization_id,ticket_id,event_type,actor_user_id,actor_client_id,metadata
  ) values(
    v_ticket.organization_id,v_ticket.id,'TICKET_CREATED',
    case when v_internal then auth.uid() else null end,
    case when v_internal then null else v_client_actor end,
    jsonb_build_object('source',v_source,'priority',v_ticket.priority)
  );

  return v_ticket;
end $$;

create or replace function public.add_sac_ticket_message(
  p_ticket_id uuid,
  p_visibility text,
  p_body text,
  p_idempotency_key text
) returns public.sac_ticket_messages
language plpgsql security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_ticket public.sac_tickets;
  v_message public.sac_ticket_messages;
  v_internal boolean;
  v_client_actor uuid;
  v_visibility text;
begin
  select * into v_ticket
  from public.sac_tickets
  where id=p_ticket_id
  for update;

  if not found then raise exception 'Chamado não encontrado.'; end if;
  if v_ticket.status in ('CLOSED','CANCELLED') then
    raise exception 'Chamado encerrado não aceita novas mensagens.';
  end if;

  v_internal:=public.has_module_permission(
    v_ticket.organization_id,'sac','EDIT',v_ticket.project_id,null
  );

  if not v_internal then
    select id into v_client_actor
    from public.clients
    where id=v_ticket.client_id and user_id=auth.uid() and archived_at is null;
    if v_client_actor is null then raise exception 'Sem acesso ao chamado.'; end if;
  end if;

  if nullif(trim(p_body),'') is null then raise exception 'Mensagem vazia.'; end if;

  if p_idempotency_key is not null then
    select * into v_message
    from public.sac_ticket_messages
    where ticket_id=p_ticket_id and idempotency_key=p_idempotency_key;
    if found then return v_message; end if;
  end if;

  v_visibility:=case
    when not v_internal then 'CLIENT'
    when p_visibility='INTERNAL' then 'INTERNAL'
    else 'CLIENT'
  end;

  insert into public.sac_ticket_messages(
    organization_id,ticket_id,visibility,body,
    author_user_id,author_client_id,idempotency_key
  ) values(
    v_ticket.organization_id,v_ticket.id,v_visibility,trim(p_body),
    case when v_internal then auth.uid() else null end,
    case when v_internal then null else v_client_actor end,
    p_idempotency_key
  ) returning * into v_message;

  if v_internal and v_ticket.first_responded_at is null then
    perform set_config('app.stage18_rpc','true',true);
    update public.sac_tickets
    set first_responded_at=now(),updated_at=now()
    where id=v_ticket.id;
  end if;

  insert into public.sac_ticket_events(
    organization_id,ticket_id,event_type,actor_user_id,actor_client_id,metadata
  ) values(
    v_ticket.organization_id,v_ticket.id,'MESSAGE_ADDED',
    case when v_internal then auth.uid() else null end,
    case when v_internal then null else v_client_actor end,
    jsonb_build_object('visibility',v_visibility,'messageId',v_message.id)
  );

  return v_message;
end $$;

create or replace function public.register_sac_ticket_attachment(
  p_ticket_id uuid,
  p_message_id uuid,
  p_storage_path text,
  p_file_name text,
  p_mime_type text,
  p_size_bytes bigint,
  p_sha256 text,
  p_client_visible boolean
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

  v_client_visible:=case when v_internal then coalesce(p_client_visible,true) else true end;

  insert into public.sac_ticket_attachments(
    organization_id,ticket_id,message_id,storage_path,file_name,mime_type,
    size_bytes,sha256,client_visible,uploaded_by,uploaded_client_id
  ) values(
    v_ticket.organization_id,v_ticket.id,p_message_id,p_storage_path,
    trim(p_file_name),p_mime_type,p_size_bytes,p_sha256,v_client_visible,
    case when v_internal then auth.uid() else null end,
    case when v_internal then null else v_client_actor end
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
      'clientVisible',v_attachment.client_visible
    )
  );

  return v_attachment;
end $$;

create or replace function public.assign_sac_ticket(
  p_ticket_id uuid,
  p_assigned_to uuid
) returns public.sac_tickets
language plpgsql security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_ticket public.sac_tickets;
  v_before uuid;
begin
  select * into v_ticket
  from public.sac_tickets
  where id=p_ticket_id
  for update;

  if not found then raise exception 'Chamado não encontrado.'; end if;
  if not public.has_module_permission(
    v_ticket.organization_id,'sac','EDIT',v_ticket.project_id,null
  ) then
    raise exception 'Permissão insuficiente para atribuir chamado.';
  end if;

  if p_assigned_to is not null and not exists(
    select 1 from public.organization_memberships membership
    where membership.organization_id=v_ticket.organization_id
      and membership.user_id=p_assigned_to
      and membership.active
  ) then
    raise exception 'Responsável não pertence à organização.';
  end if;

  v_before:=v_ticket.assigned_to;
  perform set_config('app.stage18_rpc','true',true);
  update public.sac_tickets
  set assigned_to=p_assigned_to,
      status=case
        when status in ('OPEN','TRIAGE') and p_assigned_to is not null then 'IN_PROGRESS'
        else status
      end,
      updated_at=now()
  where id=v_ticket.id
  returning * into v_ticket;

  insert into public.sac_ticket_events(
    organization_id,ticket_id,event_type,actor_user_id,metadata
  ) values(
    v_ticket.organization_id,v_ticket.id,'ASSIGNED',auth.uid(),
    jsonb_build_object('from',v_before,'to',p_assigned_to)
  );

  return v_ticket;
end $$;

create or replace function public.transition_sac_ticket(
  p_ticket_id uuid,
  p_to_status text,
  p_reason text default null
) returns public.sac_tickets
language plpgsql security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_ticket public.sac_tickets;
  v_from text;
  v_allowed boolean:=false;
begin
  select * into v_ticket
  from public.sac_tickets
  where id=p_ticket_id
  for update;

  if not found then raise exception 'Chamado não encontrado.'; end if;
  if not public.has_module_permission(
    v_ticket.organization_id,'sac','EDIT',v_ticket.project_id,null
  ) then
    raise exception 'Permissão insuficiente para alterar chamado.';
  end if;
  if p_to_status not in (
    'OPEN','TRIAGE','IN_PROGRESS','WAITING_CLIENT','WAITING_INTERNAL',
    'RESOLVED','CLOSED','CANCELLED'
  ) then
    raise exception 'Status inválido.';
  end if;

  v_from:=v_ticket.status;
  if v_from=p_to_status then return v_ticket; end if;

  v_allowed:=case v_from
    when 'OPEN' then p_to_status in ('TRIAGE','IN_PROGRESS','CANCELLED')
    when 'TRIAGE' then p_to_status in ('IN_PROGRESS','WAITING_CLIENT','WAITING_INTERNAL','CANCELLED')
    when 'IN_PROGRESS' then p_to_status in ('WAITING_CLIENT','WAITING_INTERNAL','RESOLVED','CANCELLED')
    when 'WAITING_CLIENT' then p_to_status in ('IN_PROGRESS','RESOLVED','CANCELLED')
    when 'WAITING_INTERNAL' then p_to_status in ('IN_PROGRESS','RESOLVED','CANCELLED')
    when 'RESOLVED' then p_to_status in ('CLOSED','IN_PROGRESS')
    when 'CLOSED' then p_to_status='IN_PROGRESS'
    when 'CANCELLED' then p_to_status='OPEN'
    else false
  end;

  if not v_allowed then
    raise exception 'Transição de % para % não permitida.',v_from,p_to_status;
  end if;
  if p_to_status in ('CLOSED','CANCELLED') and nullif(trim(p_reason),'') is null then
    raise exception 'Motivo obrigatório.';
  end if;

  perform set_config('app.stage18_rpc','true',true);
  update public.sac_tickets
  set status=p_to_status,
      resolved_at=case
        when p_to_status='RESOLVED' then now()
        when p_to_status not in ('CLOSED','RESOLVED') then null
        else resolved_at
      end,
      closed_at=case
        when p_to_status='CLOSED' then now()
        when p_to_status<>'CLOSED' then null
        else closed_at
      end,
      reopened_at=case
        when v_from in ('RESOLVED','CLOSED','CANCELLED')
          and p_to_status not in ('RESOLVED','CLOSED','CANCELLED') then now()
        else reopened_at
      end,
      updated_at=now()
  where id=v_ticket.id
  returning * into v_ticket;

  insert into public.sac_ticket_events(
    organization_id,ticket_id,event_type,actor_user_id,metadata
  ) values(
    v_ticket.organization_id,v_ticket.id,'STATUS_CHANGED',auth.uid(),
    jsonb_build_object('from',v_from,'to',p_to_status,'reason',nullif(trim(p_reason),''))
  );

  return v_ticket;
end $$;

create or replace function public.rate_sac_ticket(
  p_ticket_id uuid,
  p_score integer,
  p_comment text default null
) returns public.sac_tickets
language plpgsql security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_ticket public.sac_tickets;
begin
  select * into v_ticket
  from public.sac_tickets
  where id=p_ticket_id
  for update;

  if not found or not public.is_client_owner(v_ticket.client_id) then
    raise exception 'Chamado não encontrado.';
  end if;
  if v_ticket.status not in ('RESOLVED','CLOSED') then
    raise exception 'Somente chamado resolvido pode ser avaliado.';
  end if;
  if v_ticket.satisfaction_score is not null then
    return v_ticket;
  end if;
  if p_score not between 1 and 5 then
    raise exception 'Nota deve ficar entre 1 e 5.';
  end if;

  update public.sac_tickets
  set satisfaction_score=p_score,
      satisfaction_comment=nullif(trim(p_comment),''),
      updated_at=now()
  where id=v_ticket.id
  returning * into v_ticket;

  insert into public.sac_ticket_events(
    organization_id,ticket_id,event_type,actor_client_id,metadata
  ) values(
    v_ticket.organization_id,v_ticket.id,'RATED',v_ticket.client_id,
    jsonb_build_object('score',p_score)
  );

  return v_ticket;
end $$;

revoke all on function public.create_sac_ticket(uuid,uuid,uuid,uuid,uuid,text,text,text,text,text) from public,anon;
grant execute on function public.create_sac_ticket(uuid,uuid,uuid,uuid,uuid,text,text,text,text,text) to authenticated,service_role;

revoke all on function public.add_sac_ticket_message(uuid,text,text,text) from public,anon;
grant execute on function public.add_sac_ticket_message(uuid,text,text,text) to authenticated,service_role;

revoke all on function public.register_sac_ticket_attachment(uuid,uuid,text,text,text,bigint,text,boolean) from public,anon;
grant execute on function public.register_sac_ticket_attachment(uuid,uuid,text,text,text,bigint,text,boolean) to authenticated,service_role;

revoke all on function public.assign_sac_ticket(uuid,uuid) from public,anon;
grant execute on function public.assign_sac_ticket(uuid,uuid) to authenticated,service_role;

revoke all on function public.transition_sac_ticket(uuid,text,text) from public,anon;
grant execute on function public.transition_sac_ticket(uuid,text,text) to authenticated,service_role;

revoke all on function public.rate_sac_ticket(uuid,integer,text) from public,anon;
grant execute on function public.rate_sac_ticket(uuid,integer,text) to authenticated,service_role;
