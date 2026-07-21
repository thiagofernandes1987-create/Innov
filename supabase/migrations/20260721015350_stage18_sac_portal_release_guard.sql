-- Etapa 18 — o portal só vincula obras e contratos já liberados ao cliente.

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

    if p_project_id is not null and not exists(
      select 1 from public.projects project
      where project.id=p_project_id
        and project.organization_id=p_organization_id
        and project.client_id=p_client_id
        and project.client_released_at is not null
        and project.archived_at is null
    ) then
      raise exception 'Obra não está liberada no portal do cliente.';
    end if;

    if p_contract_id is not null and not exists(
      select 1 from public.contracts contract
      where contract.id=p_contract_id
        and contract.organization_id=p_organization_id
        and contract.client_id=p_client_id
        and contract.client_released_at is not null
    ) then
      raise exception 'Contrato não está liberado no portal do cliente.';
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

revoke all on function public.create_sac_ticket(uuid,uuid,uuid,uuid,uuid,text,text,text,text,text) from public,anon;
grant execute on function public.create_sac_ticket(uuid,uuid,uuid,uuid,uuid,text,text,text,text,text) to authenticated,service_role;
