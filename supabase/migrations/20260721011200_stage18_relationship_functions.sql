-- Etapa 18 — invariantes, conversão comercial e atendimento transacional.

create or replace function public.stage18_generate_code(p_prefix text)
returns text
language sql volatile set search_path=public
as $$
  select upper(p_prefix)||'-'||to_char(clock_timestamp(),'YYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
$$;

create or replace function public.stage18_normalize_digits(p_value text)
returns text
language sql immutable set search_path=public
as $$ select nullif(regexp_replace(coalesce(p_value,''),'\D','','g'),''); $$;

create or replace function public.stage18_validate_links()
returns trigger
language plpgsql set search_path=public
as $$
declare
  v_org uuid:=nullif(to_jsonb(new)->>'organization_id','')::uuid;
  v_client uuid:=nullif(to_jsonb(new)->>'client_id','')::uuid;
  v_project uuid:=nullif(to_jsonb(new)->>'project_id','')::uuid;
  v_contract uuid:=nullif(to_jsonb(new)->>'contract_id','')::uuid;
  v_ticket uuid:=nullif(to_jsonb(new)->>'ticket_id','')::uuid;
  v_message uuid:=nullif(to_jsonb(new)->>'message_id','')::uuid;
  v_lead uuid:=nullif(to_jsonb(new)->>'lead_id','')::uuid;
  v_opportunity uuid:=nullif(to_jsonb(new)->>'opportunity_id','')::uuid;
begin
  if v_client is not null and not exists(select 1 from public.clients x where x.id=v_client and x.organization_id=v_org) then
    raise exception 'Cliente incompatível com a organização.';
  end if;
  if v_project is not null and not exists(select 1 from public.projects x where x.id=v_project and x.organization_id=v_org and (v_client is null or x.client_id=v_client)) then
    raise exception 'Obra incompatível com organização ou cliente.';
  end if;
  if v_contract is not null and not exists(select 1 from public.contracts x where x.id=v_contract and x.organization_id=v_org and (v_client is null or x.client_id=v_client) and (v_project is null or x.project_id=v_project)) then
    raise exception 'Contrato incompatível com organização, cliente ou obra.';
  end if;
  if v_ticket is not null and not exists(select 1 from public.sac_tickets x where x.id=v_ticket and x.organization_id=v_org) then
    raise exception 'Chamado incompatível com a organização.';
  end if;
  if v_message is not null and not exists(select 1 from public.sac_ticket_messages x where x.id=v_message and x.organization_id=v_org and (v_ticket is null or x.ticket_id=v_ticket)) then
    raise exception 'Mensagem incompatível com o chamado.';
  end if;
  if v_lead is not null and not exists(select 1 from public.crm_leads x where x.id=v_lead and x.organization_id=v_org) then
    raise exception 'Lead incompatível com a organização.';
  end if;
  if v_opportunity is not null and not exists(select 1 from public.opportunities x where x.id=v_opportunity and x.organization_id=v_org) then
    raise exception 'Oportunidade incompatível com a organização.';
  end if;
  if tg_table_name='sac_tickets' and new.category_id is not null and not exists(select 1 from public.sac_categories x where x.id=new.category_id and x.organization_id=new.organization_id and x.active) then
    raise exception 'Categoria de atendimento incompatível ou inativa.';
  end if;
  if tg_table_name='sac_ticket_messages' and new.author_client_id is not null and not exists(select 1 from public.sac_tickets t where t.id=new.ticket_id and t.client_id=new.author_client_id) then
    raise exception 'Autor cliente incompatível com o chamado.';
  end if;
  return new;
end $$;

create or replace function public.stage18_protect_append_only()
returns trigger
language plpgsql set search_path=public
as $$ begin raise exception 'Registro de histórico imutável.'; end $$;

create or replace function public.stage18_protect_workflow_state()
returns trigger
language plpgsql set search_path=public
as $$
begin
  if coalesce(current_setting('app.stage18_rpc',true),'')<>'true' then
    if tg_table_name='opportunities' and new.stage is distinct from old.stage then raise exception 'Altere o estágio pela RPC do CRM.'; end if;
    if tg_table_name='sac_tickets' and (
      new.status is distinct from old.status or new.assigned_to is distinct from old.assigned_to
      or new.first_responded_at is distinct from old.first_responded_at or new.resolved_at is distinct from old.resolved_at
      or new.closed_at is distinct from old.closed_at or new.reopened_at is distinct from old.reopened_at
    ) then raise exception 'Altere o fluxo do chamado pelas RPCs do SAC.'; end if;
  end if;
  return new;
end $$;

create trigger clients_stage18_links before insert or update on public.client_contacts for each row execute function public.stage18_validate_links();
create trigger consents_stage18_links before insert or update on public.client_consents for each row execute function public.stage18_validate_links();
create trigger opportunities_stage18_links before insert or update on public.opportunities for each row execute function public.stage18_validate_links();
create trigger tickets_stage18_links before insert or update on public.sac_tickets for each row execute function public.stage18_validate_links();
create trigger ticket_messages_stage18_links before insert or update on public.sac_ticket_messages for each row execute function public.stage18_validate_links();
create trigger ticket_attachments_stage18_links before insert or update on public.sac_ticket_attachments for each row execute function public.stage18_validate_links();
create trigger ticket_events_stage18_links before insert or update on public.sac_ticket_events for each row execute function public.stage18_validate_links();
create trigger activities_stage18_links before insert or update on public.crm_activities for each row execute function public.stage18_validate_links();
create trigger stage_history_stage18_links before insert or update on public.crm_opportunity_stage_history for each row execute function public.stage18_validate_links();

create trigger client_consents_append_only before update or delete on public.client_consents for each row execute function public.stage18_protect_append_only();
create trigger crm_stage_history_append_only before update or delete on public.crm_opportunity_stage_history for each row execute function public.stage18_protect_append_only();
create trigger sac_ticket_events_append_only before update or delete on public.sac_ticket_events for each row execute function public.stage18_protect_append_only();
create trigger sac_ticket_messages_append_only before update or delete on public.sac_ticket_messages for each row execute function public.stage18_protect_append_only();
create trigger opportunities_workflow_guard before update on public.opportunities for each row execute function public.stage18_protect_workflow_state();
create trigger sac_tickets_workflow_guard before update on public.sac_tickets for each row execute function public.stage18_protect_workflow_state();

create or replace function public.create_crm_lead(
  p_organization_id uuid,p_full_name text,p_company_name text,p_email text,p_phone text,p_tax_id text,
  p_source text,p_campaign text,p_interest text,p_estimated_budget numeric,p_city text,p_state text,
  p_owner_id uuid,p_next_follow_up_at timestamptz,p_notes text,p_consent_contact boolean,p_consent_source text,p_idempotency_key text
) returns public.crm_leads
language plpgsql security definer set search_path=public,auth,pg_temp
as $$
declare v_lead public.crm_leads; v_email text:=lower(trim(coalesce(p_email,''))); v_tax text:=public.stage18_normalize_digits(p_tax_id);
begin
  if not public.has_module_permission(p_organization_id,'crm','EDIT',null,null) then raise exception 'Permissão insuficiente para criar lead.'; end if;
  if p_idempotency_key is not null then
    select * into v_lead from public.crm_leads where organization_id=p_organization_id and idempotency_key=p_idempotency_key;
    if found then return v_lead; end if;
  end if;
  if v_tax is not null and exists(select 1 from public.clients c where c.organization_id=p_organization_id and public.stage18_normalize_digits(c.tax_id)=v_tax and c.archived_at is null) then raise exception 'Já existe cliente com este documento.'; end if;
  if v_email<>'' and exists(select 1 from public.crm_leads l where l.organization_id=p_organization_id and lower(trim(coalesce(l.email,'')))=v_email and l.archived_at is null and l.stage<>'DISQUALIFIED') then raise exception 'Já existe lead ativo com este e-mail.'; end if;
  insert into public.crm_leads(organization_id,code,full_name,company_name,email,phone,tax_id,source,campaign,interest,estimated_budget,city,state,owner_id,next_follow_up_at,notes,consent_contact,consent_source,idempotency_key,created_by)
  values(p_organization_id,public.stage18_generate_code('LEAD'),trim(p_full_name),nullif(trim(p_company_name),''),nullif(trim(p_email),''),nullif(trim(p_phone),''),nullif(trim(p_tax_id),''),nullif(trim(p_source),''),nullif(trim(p_campaign),''),nullif(trim(p_interest),''),p_estimated_budget,nullif(trim(p_city),''),nullif(trim(p_state),''),p_owner_id,p_next_follow_up_at,nullif(trim(p_notes),''),coalesce(p_consent_contact,false),nullif(trim(p_consent_source),''),p_idempotency_key,auth.uid()) returning * into v_lead;
  return v_lead;
end $$;

create or replace function public.convert_crm_lead(p_lead_id uuid,p_create_opportunity boolean default true,p_opportunity_title text default null,p_estimated_value numeric default null)
returns jsonb
language plpgsql security definer set search_path=public,auth,pg_temp
as $$
declare v_lead public.crm_leads; v_client public.clients; v_opportunity public.opportunities; v_email text; v_tax text;
begin
  select * into v_lead from public.crm_leads where id=p_lead_id for update;
  if not found then raise exception 'Lead não encontrado.'; end if;
  if not public.has_module_permission(v_lead.organization_id,'crm','EDIT',null,null) then raise exception 'Permissão insuficiente para converter lead.'; end if;
  if v_lead.stage='CONVERTED' then return jsonb_build_object('leadId',v_lead.id,'clientId',v_lead.converted_client_id,'opportunityId',v_lead.converted_opportunity_id,'idempotent',true); end if;
  v_email:=lower(trim(coalesce(v_lead.email,''))); v_tax:=public.stage18_normalize_digits(v_lead.tax_id);
  select * into v_client from public.clients c where c.organization_id=v_lead.organization_id and c.archived_at is null and (
    (v_tax is not null and public.stage18_normalize_digits(c.tax_id)=v_tax) or (v_email<>'' and lower(trim(coalesce(c.email,'')))=v_email)
  ) order by case when v_tax is not null and public.stage18_normalize_digits(c.tax_id)=v_tax then 0 else 1 end limit 1;
  if not found then
    insert into public.clients(organization_id,type,legal_name,trade_name,tax_id,email,phone,status,address_line,city,state,postal_code,notes,source,lifecycle_stage,assigned_owner_id,last_contact_at,next_follow_up_at,converted_from_lead_id,created_by)
    values(v_lead.organization_id,case when v_lead.company_name is null then 'PERSON' else 'COMPANY' end,coalesce(v_lead.company_name,v_lead.full_name),case when v_lead.company_name is null then null else v_lead.company_name end,v_lead.tax_id,v_lead.email,v_lead.phone,'ACTIVE',null,v_lead.city,v_lead.state,null,v_lead.notes,v_lead.source,'CUSTOMER',v_lead.owner_id,now(),v_lead.next_follow_up_at,v_lead.id,auth.uid()) returning * into v_client;
    if v_lead.company_name is not null then
      insert into public.client_contacts(organization_id,client_id,full_name,email,phone,is_primary,created_by)
      values(v_lead.organization_id,v_client.id,v_lead.full_name,v_lead.email,v_lead.phone,true,auth.uid());
    end if;
    if v_lead.consent_contact then
      insert into public.client_consents(organization_id,client_id,kind,granted,source,evidence,created_by)
      values(v_lead.organization_id,v_client.id,'DATA_PROCESSING',true,coalesce(v_lead.consent_source,'LEAD_CONVERSION'),'Consentimento informado no lead',auth.uid());
    end if;
  end if;
  if p_create_opportunity then
    insert into public.opportunities(organization_id,client_id,lead_id,code,title,stage,owner_id,description,estimated_value,probability,source,created_at,updated_at)
    values(v_lead.organization_id,v_client.id,v_lead.id,public.stage18_generate_code('OPP'),coalesce(nullif(trim(p_opportunity_title),''),coalesce(v_lead.interest,'Nova oportunidade')),'QUALIFIED',v_lead.owner_id,v_lead.notes,coalesce(p_estimated_value,v_lead.estimated_budget),35,v_lead.source,now(),now()) returning * into v_opportunity;
    insert into public.crm_opportunity_stage_history(organization_id,opportunity_id,from_stage,to_stage,reason,changed_by)
    values(v_lead.organization_id,v_opportunity.id,null,'QUALIFIED','Conversão do lead',auth.uid());
  end if;
  update public.crm_leads set stage='CONVERTED',converted_client_id=v_client.id,converted_opportunity_id=v_opportunity.id,updated_at=now() where id=v_lead.id returning * into v_lead;
  insert into public.crm_activities(organization_id,activity_type,subject,description,client_id,owner_id,created_by)
  values(v_lead.organization_id,'NOTE','Lead convertido',format('Lead %s convertido em cliente.',v_lead.code),v_client.id,v_lead.owner_id,auth.uid());
  return jsonb_build_object('leadId',v_lead.id,'clientId',v_client.id,'opportunityId',v_opportunity.id,'idempotent',false);
end $$;

create or replace function public.move_crm_opportunity_stage(p_opportunity_id uuid,p_to_stage text,p_reason text default null)
returns public.opportunities
language plpgsql security definer set search_path=public,auth,pg_temp
as $$
declare v_opp public.opportunities; v_from text; v_probability numeric;
begin
  select * into v_opp from public.opportunities where id=p_opportunity_id for update;
  if not found then raise exception 'Oportunidade não encontrada.'; end if;
  if not public.has_module_permission(v_opp.organization_id,'crm','EDIT',null,null) then raise exception 'Permissão insuficiente para mover oportunidade.'; end if;
  if p_to_stage not in ('PROSPECTING','QUALIFIED','PROPOSAL','NEGOTIATION','WON','LOST') then raise exception 'Estágio inválido.'; end if;
  if p_to_stage='LOST' and nullif(trim(p_reason),'') is null then raise exception 'O motivo da perda é obrigatório.'; end if;
  if p_to_stage='WON' and v_opp.client_id is null then raise exception 'Oportunidade ganha precisa estar vinculada a cliente.'; end if;
  v_from:=v_opp.stage;
  if v_from=p_to_stage then return v_opp; end if;
  v_probability:=case p_to_stage when 'PROSPECTING' then 10 when 'QUALIFIED' then 35 when 'PROPOSAL' then 60 when 'NEGOTIATION' then 80 when 'WON' then 100 when 'LOST' then 0 end;
  perform set_config('app.stage18_rpc','true',true);
  update public.opportunities set stage=p_to_stage,probability=v_probability,lost_reason=case when p_to_stage='LOST' then p_reason else null end,closed_at=case when p_to_stage in ('WON','LOST') then now() else null end,updated_at=now() where id=v_opp.id returning * into v_opp;
  insert into public.crm_opportunity_stage_history(organization_id,opportunity_id,from_stage,to_stage,reason,changed_by)
  values(v_opp.organization_id,v_opp.id,v_from,p_to_stage,nullif(trim(p_reason),''),auth.uid());
  return v_opp;
end $$;

create or replace function public.record_crm_activity(p_organization_id uuid,p_activity_type text,p_subject text,p_description text,p_lead_id uuid,p_opportunity_id uuid,p_client_id uuid,p_ticket_id uuid,p_occurred_at timestamptz,p_due_at timestamptz,p_owner_id uuid)
returns public.crm_activities
language plpgsql security definer set search_path=public,auth,pg_temp
as $$
declare v_activity public.crm_activities;
begin
  if num_nonnulls(p_lead_id,p_opportunity_id,p_client_id,p_ticket_id)<>1 then raise exception 'A atividade precisa de exatamente uma entidade.'; end if;
  if not (
    public.has_module_permission(p_organization_id,'crm','EDIT',null,null)
    or public.has_module_permission(p_organization_id,'clientes','EDIT',null,null)
    or public.has_module_permission(p_organization_id,'sac','EDIT',null,null)
  ) then raise exception 'Permissão insuficiente para registrar atividade.'; end if;
  insert into public.crm_activities(organization_id,activity_type,subject,description,lead_id,opportunity_id,client_id,ticket_id,occurred_at,due_at,owner_id,created_by)
  values(p_organization_id,p_activity_type,trim(p_subject),nullif(trim(p_description),''),p_lead_id,p_opportunity_id,p_client_id,p_ticket_id,coalesce(p_occurred_at,now()),p_due_at,p_owner_id,auth.uid()) returning * into v_activity;
  return v_activity;
end $$;

create or replace function public.create_sac_ticket(p_organization_id uuid,p_client_id uuid,p_project_id uuid,p_contract_id uuid,p_category_id uuid,p_title text,p_description text,p_source text,p_priority text,p_idempotency_key text)
returns public.sac_tickets
language plpgsql security definer set search_path=public,auth,pg_temp
as $$
declare v_ticket public.sac_tickets; v_category public.sac_categories; v_internal boolean; v_source text;
begin
  v_internal:=public.has_module_permission(p_organization_id,'sac','EDIT',p_project_id,null);
  if not v_internal and not public.is_client_owner(p_client_id) then raise exception 'Sem acesso para abrir chamado.'; end if;
  if p_idempotency_key is not null then select * into v_ticket from public.sac_tickets where organization_id=p_organization_id and idempotency_key=p_idempotency_key; if found then return v_ticket; end if; end if;
  if p_category_id is not null then select * into v_category from public.sac_categories where id=p_category_id and organization_id=p_organization_id and active; if not found then raise exception 'Categoria inválida.'; end if; end if;
  v_source:=case when v_internal then coalesce(p_source,'INTERNAL') else 'PORTAL' end;
  insert into public.sac_tickets(organization_id,code,client_id,project_id,contract_id,category_id,title,description,source,priority,status,first_response_due_at,resolution_due_at,idempotency_key,created_by)
  values(p_organization_id,public.stage18_generate_code('SAC'),p_client_id,p_project_id,p_contract_id,p_category_id,trim(p_title),trim(p_description),v_source,coalesce(nullif(p_priority,''),coalesce(v_category.default_priority,'NORMAL')),'OPEN',now()+make_interval(hours=>coalesce(v_category.first_response_sla_hours,24)),now()+make_interval(hours=>coalesce(v_category.resolution_sla_hours,120)),p_idempotency_key,case when v_internal then auth.uid() else null end) returning * into v_ticket;
  insert into public.sac_ticket_events(organization_id,ticket_id,event_type,actor_user_id,actor_client_id,metadata)
  values(v_ticket.organization_id,v_ticket.id,'TICKET_CREATED',case when v_internal then auth.uid() else null end,case when v_internal then null else p_client_id end,jsonb_build_object('source',v_source,'priority',v_ticket.priority));
  return v_ticket;
end $$;

create or replace function public.add_sac_ticket_message(p_ticket_id uuid,p_visibility text,p_body text,p_idempotency_key text)
returns public.sac_ticket_messages
language plpgsql security definer set search_path=public,auth,pg_temp
as $$
declare v_ticket public.sac_tickets; v_message public.sac_ticket_messages; v_internal boolean; v_client uuid; v_visibility text;
begin
  select * into v_ticket from public.sac_tickets where id=p_ticket_id for update;
  if not found then raise exception 'Chamado não encontrado.'; end if;
  v_internal:=public.has_module_permission(v_ticket.organization_id,'sac','EDIT',v_ticket.project_id,null);
  if not v_internal then select id into v_client from public.clients where id=v_ticket.client_id and user_id=auth.uid(); if v_client is null then raise exception 'Sem acesso ao chamado.'; end if; end if;
  if p_idempotency_key is not null then select * into v_message from public.sac_ticket_messages where ticket_id=p_ticket_id and idempotency_key=p_idempotency_key; if found then return v_message; end if; end if;
  v_visibility:=case when v_internal then coalesce(nullif(p_visibility,''),'CLIENT') else 'CLIENT' end;
  insert into public.sac_ticket_messages(organization_id,ticket_id,visibility,body,author_user_id,author_client_id,idempotency_key)
  values(v_ticket.organization_id,v_ticket.id,v_visibility,trim(p_body),case when v_internal then auth.uid() else null end,case when v_internal then null else v_client end,p_idempotency_key) returning * into v_message;
  if v_internal and v_ticket.first_responded_at is null then perform set_config('app.stage18_rpc','true',true); update public.sac_tickets set first_responded_at=now(),updated_at=now() where id=v_ticket.id; end if;
  insert into public.sac_ticket_events(organization_id,ticket_id,event_type,actor_user_id,actor_client_id,metadata)
  values(v_ticket.organization_id,v_ticket.id,'MESSAGE_ADDED',case when v_internal then auth.uid() else null end,case when v_internal then null else v_client end,jsonb_build_object('visibility',v_visibility,'messageId',v_message.id));
  return v_message;
end $$;

create or replace function public.assign_sac_ticket(p_ticket_id uuid,p_assigned_to uuid)
returns public.sac_tickets
language plpgsql security definer set search_path=public,auth,pg_temp
as $$
declare v_ticket public.sac_tickets; v_before uuid;
begin
  select * into v_ticket from public.sac_tickets where id=p_ticket_id for update;
  if not found then raise exception 'Chamado não encontrado.'; end if;
  if not public.has_module_permission(v_ticket.organization_id,'sac','EDIT',v_ticket.project_id,null) then raise exception 'Permissão insuficiente para atribuir chamado.'; end if;
  if p_assigned_to is not null and not exists(select 1 from public.organization_memberships m where m.organization_id=v_ticket.organization_id and m.user_id=p_assigned_to and m.active) then raise exception 'Responsável não pertence à organização.'; end if;
  v_before:=v_ticket.assigned_to; perform set_config('app.stage18_rpc','true',true);
  update public.sac_tickets set assigned_to=p_assigned_to,status=case when status in ('OPEN','TRIAGE') and p_assigned_to is not null then 'IN_PROGRESS' else status end,updated_at=now() where id=v_ticket.id returning * into v_ticket;
  insert into public.sac_ticket_events(organization_id,ticket_id,event_type,actor_user_id,metadata) values(v_ticket.organization_id,v_ticket.id,'ASSIGNED',auth.uid(),jsonb_build_object('from',v_before,'to',p_assigned_to));
  return v_ticket;
end $$;

create or replace function public.transition_sac_ticket(p_ticket_id uuid,p_to_status text,p_reason text default null)
returns public.sac_tickets
language plpgsql security definer set search_path=public,auth,pg_temp
as $$
declare v_ticket public.sac_tickets; v_from text;
begin
  select * into v_ticket from public.sac_tickets where id=p_ticket_id for update;
  if not found then raise exception 'Chamado não encontrado.'; end if;
  if not public.has_module_permission(v_ticket.organization_id,'sac','EDIT',v_ticket.project_id,null) then raise exception 'Permissão insuficiente para alterar chamado.'; end if;
  if p_to_status not in ('OPEN','TRIAGE','IN_PROGRESS','WAITING_CLIENT','WAITING_INTERNAL','RESOLVED','CLOSED','CANCELLED') then raise exception 'Status inválido.'; end if;
  if p_to_status in ('CANCELLED','CLOSED') and nullif(trim(p_reason),'') is null then raise exception 'Motivo obrigatório.'; end if;
  v_from:=v_ticket.status; if v_from=p_to_status then return v_ticket; end if;
  perform set_config('app.stage18_rpc','true',true);
  update public.sac_tickets set status=p_to_status,resolved_at=case when p_to_status='RESOLVED' then now() when p_to_status not in ('CLOSED','RESOLVED') then null else resolved_at end,closed_at=case when p_to_status='CLOSED' then now() when p_to_status<>'CLOSED' then null else closed_at end,reopened_at=case when v_from in ('RESOLVED','CLOSED') and p_to_status not in ('RESOLVED','CLOSED') then now() else reopened_at end,updated_at=now() where id=v_ticket.id returning * into v_ticket;
  insert into public.sac_ticket_events(organization_id,ticket_id,event_type,actor_user_id,metadata) values(v_ticket.organization_id,v_ticket.id,'STATUS_CHANGED',auth.uid(),jsonb_build_object('from',v_from,'to',p_to_status,'reason',nullif(trim(p_reason),'')));
  return v_ticket;
end $$;

create or replace function public.rate_sac_ticket(p_ticket_id uuid,p_score integer,p_comment text default null)
returns public.sac_tickets
language plpgsql security definer set search_path=public,auth,pg_temp
as $$
declare v_ticket public.sac_tickets;
begin
  select * into v_ticket from public.sac_tickets where id=p_ticket_id for update;
  if not found or not public.is_client_owner(v_ticket.client_id) then raise exception 'Chamado não encontrado.'; end if;
  if v_ticket.status not in ('RESOLVED','CLOSED') then raise exception 'Somente chamado resolvido pode ser avaliado.'; end if;
  if p_score not between 1 and 5 then raise exception 'Nota deve ficar entre 1 e 5.'; end if;
  update public.sac_tickets set satisfaction_score=p_score,satisfaction_comment=nullif(trim(p_comment),''),updated_at=now() where id=v_ticket.id returning * into v_ticket;
  insert into public.sac_ticket_events(organization_id,ticket_id,event_type,actor_client_id,metadata) values(v_ticket.organization_id,v_ticket.id,'RATED',v_ticket.client_id,jsonb_build_object('score',p_score));
  return v_ticket;
end $$;

create or replace function public.get_crm_pipeline(p_organization_id uuid)
returns jsonb
language plpgsql stable security definer set search_path=public,auth,pg_temp
as $$
begin
  if not public.has_module_permission(p_organization_id,'crm','READ',null,null) then raise exception 'Permissão insuficiente.'; end if;
  return jsonb_build_object(
    'leadsByStage',(select coalesce(jsonb_object_agg(stage,total),'{}'::jsonb) from (select stage,count(*) total from public.crm_leads where organization_id=p_organization_id and archived_at is null group by stage) q),
    'opportunitiesByStage',(select coalesce(jsonb_object_agg(stage,jsonb_build_object('count',total,'value',value)),'{}'::jsonb) from (select stage,count(*) total,coalesce(sum(estimated_value),0) value from public.opportunities where organization_id=p_organization_id and archived_at is null group by stage) q),
    'followUpsDue',(select count(*) from public.crm_activities where organization_id=p_organization_id and completed_at is null and due_at<now()),
    'weightedPipeline',(select coalesce(sum(coalesce(estimated_value,0)*probability/100),0) from public.opportunities where organization_id=p_organization_id and stage not in ('WON','LOST') and archived_at is null)
  );
end $$;

create or replace function public.get_client_360(p_client_id uuid)
returns jsonb
language plpgsql stable security definer set search_path=public,auth,pg_temp
as $$
declare v_client public.clients;
begin
  select * into v_client from public.clients where id=p_client_id;
  if not found then raise exception 'Cliente não encontrado.'; end if;
  if not (public.is_client_owner(v_client.id) or public.has_module_permission(v_client.organization_id,'clientes','READ',null,null) or public.has_module_permission(v_client.organization_id,'crm','READ',null,null) or public.has_module_permission(v_client.organization_id,'sac','READ',null,null)) then raise exception 'Permissão insuficiente.'; end if;
  return jsonb_build_object(
    'client',to_jsonb(v_client)-'tax_id'-'notes',
    'contacts',(select coalesce(jsonb_agg(to_jsonb(c) order by c.is_primary desc,c.full_name),'[]'::jsonb) from public.client_contacts c where c.client_id=v_client.id and c.archived_at is null),
    'projects',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'code',p.code,'name',p.name,'status',p.status,'progress',p.progress) order by p.created_at desc),'[]'::jsonb) from public.projects p where p.client_id=v_client.id),
    'opportunities',(select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'code',o.code,'title',o.title,'stage',o.stage,'estimatedValue',o.estimated_value,'probability',o.probability) order by o.created_at desc),'[]'::jsonb) from public.opportunities o where o.client_id=v_client.id and o.archived_at is null),
    'contracts',(select count(*) from public.contracts c where c.client_id=v_client.id),
    'openTickets',(select count(*) from public.sac_tickets t where t.client_id=v_client.id and t.status not in ('CLOSED','CANCELLED')),
    'recentActivities',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'type',a.activity_type,'subject',a.subject,'occurredAt',a.occurred_at) order by a.occurred_at desc),'[]'::jsonb) from (select * from public.crm_activities where client_id=v_client.id order by occurred_at desc limit 20) a)
  );
end $$;

create or replace function public.get_sac_dashboard(p_organization_id uuid)
returns jsonb
language plpgsql stable security definer set search_path=public,auth,pg_temp
as $$
begin
  if not public.has_module_permission(p_organization_id,'sac','READ',null,null) then raise exception 'Permissão insuficiente.'; end if;
  return jsonb_build_object(
    'byStatus',(select coalesce(jsonb_object_agg(status,total),'{}'::jsonb) from (select status,count(*) total from public.sac_tickets where organization_id=p_organization_id group by status) q),
    'open',(select count(*) from public.sac_tickets where organization_id=p_organization_id and status not in ('CLOSED','CANCELLED')),
    'overdue',(select count(*) from public.sac_tickets where organization_id=p_organization_id and status not in ('RESOLVED','CLOSED','CANCELLED') and resolution_due_at<now()),
    'averageSatisfaction',(select round(avg(satisfaction_score)::numeric,2) from public.sac_tickets where organization_id=p_organization_id and satisfaction_score is not null),
    'averageResolutionHours',(select round(avg(extract(epoch from (resolved_at-created_at))/3600)::numeric,2) from public.sac_tickets where organization_id=p_organization_id and resolved_at is not null)
  );
end $$;

-- Helpers e triggers são internos.
revoke all on function public.stage18_generate_code(text) from public,anon,authenticated;
revoke all on function public.stage18_normalize_digits(text) from public,anon,authenticated;
revoke all on function public.stage18_validate_links() from public,anon,authenticated;
revoke all on function public.stage18_protect_append_only() from public,anon,authenticated;
revoke all on function public.stage18_protect_workflow_state() from public,anon,authenticated;

-- RPCs operacionais exigem sessão autenticada e fazem autorização interna.
revoke all on function public.create_crm_lead(uuid,text,text,text,text,text,text,text,text,numeric,text,text,uuid,timestamptz,text,boolean,text,text) from public,anon;
grant execute on function public.create_crm_lead(uuid,text,text,text,text,text,text,text,text,numeric,text,text,uuid,timestamptz,text,boolean,text,text) to authenticated,service_role;
revoke all on function public.convert_crm_lead(uuid,boolean,text,numeric) from public,anon;
grant execute on function public.convert_crm_lead(uuid,boolean,text,numeric) to authenticated,service_role;
revoke all on function public.move_crm_opportunity_stage(uuid,text,text) from public,anon;
grant execute on function public.move_crm_opportunity_stage(uuid,text,text) to authenticated,service_role;
revoke all on function public.record_crm_activity(uuid,text,text,text,uuid,uuid,uuid,uuid,timestamptz,timestamptz,uuid) from public,anon;
grant execute on function public.record_crm_activity(uuid,text,text,text,uuid,uuid,uuid,uuid,timestamptz,timestamptz,uuid) to authenticated,service_role;
revoke all on function public.create_sac_ticket(uuid,uuid,uuid,uuid,uuid,text,text,text,text,text) from public,anon;
grant execute on function public.create_sac_ticket(uuid,uuid,uuid,uuid,uuid,text,text,text,text,text) to authenticated,service_role;
revoke all on function public.add_sac_ticket_message(uuid,text,text,text) from public,anon;
grant execute on function public.add_sac_ticket_message(uuid,text,text,text) to authenticated,service_role;
revoke all on function public.assign_sac_ticket(uuid,uuid) from public,anon;
grant execute on function public.assign_sac_ticket(uuid,uuid) to authenticated,service_role;
revoke all on function public.transition_sac_ticket(uuid,text,text) from public,anon;
grant execute on function public.transition_sac_ticket(uuid,text,text) to authenticated,service_role;
revoke all on function public.rate_sac_ticket(uuid,integer,text) from public,anon;
grant execute on function public.rate_sac_ticket(uuid,integer,text) to authenticated,service_role;
revoke all on function public.get_crm_pipeline(uuid) from public,anon;
grant execute on function public.get_crm_pipeline(uuid) to authenticated,service_role;
revoke all on function public.get_client_360(uuid) from public,anon;
grant execute on function public.get_client_360(uuid) to authenticated,service_role;
revoke all on function public.get_sac_dashboard(uuid) from public,anon;
grant execute on function public.get_sac_dashboard(uuid) to authenticated,service_role;
