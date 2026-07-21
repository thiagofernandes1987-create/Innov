-- Etapa 18 — operações transacionais do CRM.

create or replace function public.create_crm_lead(
  p_organization_id uuid,
  p_full_name text,
  p_company_name text,
  p_email text,
  p_phone text,
  p_tax_id text,
  p_source text,
  p_campaign text,
  p_interest text,
  p_estimated_budget numeric,
  p_city text,
  p_state text,
  p_owner_id uuid,
  p_next_follow_up_at timestamptz,
  p_notes text,
  p_consent_contact boolean,
  p_consent_source text,
  p_idempotency_key text
) returns public.crm_leads
language plpgsql security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_lead public.crm_leads;
  v_email text:=lower(trim(coalesce(p_email,'')));
  v_phone text:=public.stage18_normalize_digits(p_phone);
  v_tax text:=public.stage18_normalize_digits(p_tax_id);
begin
  if not public.has_module_permission(p_organization_id,'crm','EDIT',null,null) then
    raise exception 'Permissão insuficiente para criar lead.';
  end if;
  if nullif(trim(p_full_name),'') is null then
    raise exception 'Nome do lead é obrigatório.';
  end if;

  if p_idempotency_key is not null then
    select * into v_lead
    from public.crm_leads
    where organization_id=p_organization_id and idempotency_key=p_idempotency_key;
    if found then return v_lead; end if;
  end if;

  if v_tax is not null and exists(
    select 1 from public.clients c
    where c.organization_id=p_organization_id
      and public.stage18_normalize_digits(c.tax_id)=v_tax
      and c.archived_at is null
  ) then
    raise exception 'Já existe cliente com este documento.';
  end if;

  if v_email<>'' and exists(
    select 1 from public.crm_leads l
    where l.organization_id=p_organization_id
      and lower(trim(coalesce(l.email,'')))=v_email
      and l.archived_at is null
      and l.stage<>'DISQUALIFIED'
  ) then
    raise exception 'Já existe lead ativo com este e-mail.';
  end if;

  if v_phone is not null and exists(
    select 1 from public.crm_leads l
    where l.organization_id=p_organization_id
      and public.stage18_normalize_digits(l.phone)=v_phone
      and l.archived_at is null
      and l.stage<>'DISQUALIFIED'
  ) then
    raise exception 'Já existe lead ativo com este telefone.';
  end if;

  insert into public.crm_leads(
    organization_id,code,full_name,company_name,email,phone,tax_id,
    source,campaign,interest,estimated_budget,city,state,owner_id,
    next_follow_up_at,notes,consent_contact,consent_source,idempotency_key,created_by
  ) values(
    p_organization_id,
    public.stage18_generate_code('LEAD'),
    trim(p_full_name),
    nullif(trim(p_company_name),''),
    nullif(trim(p_email),''),
    nullif(trim(p_phone),''),
    nullif(trim(p_tax_id),''),
    nullif(trim(p_source),''),
    nullif(trim(p_campaign),''),
    nullif(trim(p_interest),''),
    p_estimated_budget,
    nullif(trim(p_city),''),
    nullif(trim(p_state),''),
    p_owner_id,
    p_next_follow_up_at,
    nullif(trim(p_notes),''),
    coalesce(p_consent_contact,false),
    nullif(trim(p_consent_source),''),
    p_idempotency_key,
    auth.uid()
  ) returning * into v_lead;

  return v_lead;
end $$;

create or replace function public.create_crm_opportunity(
  p_organization_id uuid,
  p_client_id uuid,
  p_lead_id uuid,
  p_title text,
  p_description text,
  p_estimated_value numeric,
  p_stage text,
  p_probability numeric,
  p_expected_close_date date,
  p_source text,
  p_owner_id uuid
) returns public.opportunities
language plpgsql security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_opportunity public.opportunities;
  v_stage text:=coalesce(nullif(trim(p_stage),''),'PROSPECTING');
  v_probability numeric:=coalesce(p_probability,25);
begin
  if not public.has_module_permission(p_organization_id,'crm','EDIT',null,null) then
    raise exception 'Permissão insuficiente para criar oportunidade.';
  end if;
  if nullif(trim(p_title),'') is null then
    raise exception 'Título da oportunidade é obrigatório.';
  end if;
  if p_client_id is null and p_lead_id is null then
    raise exception 'Informe um cliente ou lead.';
  end if;
  if v_stage not in ('PROSPECTING','QUALIFIED','PROPOSAL','NEGOTIATION') then
    raise exception 'Estágio inicial inválido.';
  end if;
  if v_probability not between 0 and 99.99 then
    raise exception 'Probabilidade inicial inválida.';
  end if;

  insert into public.opportunities(
    organization_id,client_id,lead_id,code,title,stage,owner_id,
    description,estimated_value,probability,expected_close_date,source,created_at,updated_at
  ) values(
    p_organization_id,p_client_id,p_lead_id,public.stage18_generate_code('OPP'),
    trim(p_title),v_stage,p_owner_id,nullif(trim(p_description),''),
    p_estimated_value,v_probability,p_expected_close_date,nullif(trim(p_source),''),now(),now()
  ) returning * into v_opportunity;

  insert into public.crm_opportunity_stage_history(
    organization_id,opportunity_id,from_stage,to_stage,reason,changed_by
  ) values(
    p_organization_id,v_opportunity.id,null,v_stage,'Oportunidade criada',auth.uid()
  );

  return v_opportunity;
end $$;

create or replace function public.convert_crm_lead(
  p_lead_id uuid,
  p_create_opportunity boolean default true,
  p_opportunity_title text default null,
  p_estimated_value numeric default null
) returns jsonb
language plpgsql security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_lead public.crm_leads;
  v_client public.clients;
  v_opportunity public.opportunities;
  v_opportunity_id uuid;
  v_email text;
  v_phone text;
  v_tax text;
begin
  select * into v_lead
  from public.crm_leads
  where id=p_lead_id
  for update;

  if not found then raise exception 'Lead não encontrado.'; end if;
  if not public.has_module_permission(v_lead.organization_id,'crm','EDIT',null,null) then
    raise exception 'Permissão insuficiente para converter lead.';
  end if;

  if v_lead.stage='CONVERTED' then
    return jsonb_build_object(
      'leadId',v_lead.id,
      'clientId',v_lead.converted_client_id,
      'opportunityId',v_lead.converted_opportunity_id,
      'idempotent',true
    );
  end if;
  if v_lead.stage='DISQUALIFIED' then
    raise exception 'Lead desqualificado não pode ser convertido.';
  end if;

  v_email:=lower(trim(coalesce(v_lead.email,'')));
  v_phone:=public.stage18_normalize_digits(v_lead.phone);
  v_tax:=public.stage18_normalize_digits(v_lead.tax_id);

  select * into v_client
  from public.clients c
  where c.organization_id=v_lead.organization_id
    and c.archived_at is null
    and (
      (v_tax is not null and public.stage18_normalize_digits(c.tax_id)=v_tax)
      or (v_email<>'' and lower(trim(coalesce(c.email,'')))=v_email)
      or (v_phone is not null and public.stage18_normalize_digits(c.phone)=v_phone)
    )
  order by case
    when v_tax is not null and public.stage18_normalize_digits(c.tax_id)=v_tax then 0
    when v_email<>'' and lower(trim(coalesce(c.email,'')))=v_email then 1
    else 2
  end
  limit 1;

  if not found then
    insert into public.clients(
      organization_id,type,legal_name,trade_name,tax_id,email,phone,status,
      city,state,notes,source,lifecycle_stage,assigned_owner_id,last_contact_at,
      next_follow_up_at,converted_from_lead_id,created_by
    ) values(
      v_lead.organization_id,
      case when v_lead.company_name is null then 'PERSON' else 'COMPANY' end,
      coalesce(v_lead.company_name,v_lead.full_name),
      case when v_lead.company_name is null then null else v_lead.company_name end,
      v_lead.tax_id,v_lead.email,v_lead.phone,'ACTIVE',v_lead.city,v_lead.state,
      v_lead.notes,v_lead.source,'CUSTOMER',v_lead.owner_id,now(),
      v_lead.next_follow_up_at,v_lead.id,auth.uid()
    ) returning * into v_client;

    if v_lead.company_name is not null then
      insert into public.client_contacts(
        organization_id,client_id,full_name,email,phone,is_primary,created_by
      ) values(
        v_lead.organization_id,v_client.id,v_lead.full_name,
        v_lead.email,v_lead.phone,true,auth.uid()
      );
    end if;

    if v_lead.consent_contact then
      insert into public.client_consents(
        organization_id,client_id,kind,granted,source,evidence,created_by
      ) values(
        v_lead.organization_id,v_client.id,'DATA_PROCESSING',true,
        coalesce(v_lead.consent_source,'LEAD_CONVERSION'),
        'Consentimento informado no lead',auth.uid()
      );
    end if;
  end if;

  if coalesce(p_create_opportunity,true) then
    v_opportunity:=public.create_crm_opportunity(
      v_lead.organization_id,
      v_client.id,
      v_lead.id,
      coalesce(nullif(trim(p_opportunity_title),''),coalesce(v_lead.interest,'Nova oportunidade')),
      v_lead.notes,
      coalesce(p_estimated_value,v_lead.estimated_budget),
      'QUALIFIED',
      35,
      null,
      v_lead.source,
      v_lead.owner_id
    );
    v_opportunity_id:=v_opportunity.id;
  end if;

  update public.crm_leads
  set stage='CONVERTED',
      converted_client_id=v_client.id,
      converted_opportunity_id=v_opportunity_id,
      updated_at=now()
  where id=v_lead.id
  returning * into v_lead;

  insert into public.crm_activities(
    organization_id,activity_type,subject,description,client_id,owner_id,created_by
  ) values(
    v_lead.organization_id,'NOTE','Lead convertido',
    format('Lead %s convertido em cliente.',v_lead.code),
    v_client.id,v_lead.owner_id,auth.uid()
  );

  return jsonb_build_object(
    'leadId',v_lead.id,
    'clientId',v_client.id,
    'opportunityId',v_opportunity_id,
    'idempotent',false
  );
end $$;

create or replace function public.move_crm_opportunity_stage(
  p_opportunity_id uuid,
  p_to_stage text,
  p_reason text default null
) returns public.opportunities
language plpgsql security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_opportunity public.opportunities;
  v_from text;
  v_probability numeric;
begin
  select * into v_opportunity
  from public.opportunities
  where id=p_opportunity_id
  for update;

  if not found then raise exception 'Oportunidade não encontrada.'; end if;
  if not public.has_module_permission(v_opportunity.organization_id,'crm','EDIT',null,null) then
    raise exception 'Permissão insuficiente para mover oportunidade.';
  end if;
  if p_to_stage not in ('PROSPECTING','QUALIFIED','PROPOSAL','NEGOTIATION','WON','LOST') then
    raise exception 'Estágio inválido.';
  end if;
  if p_to_stage='LOST' and nullif(trim(p_reason),'') is null then
    raise exception 'O motivo da perda é obrigatório.';
  end if;
  if p_to_stage='WON' and v_opportunity.client_id is null then
    raise exception 'Oportunidade ganha precisa estar vinculada a cliente.';
  end if;

  v_from:=v_opportunity.stage;
  if v_from=p_to_stage then return v_opportunity; end if;

  v_probability:=case p_to_stage
    when 'PROSPECTING' then 10
    when 'QUALIFIED' then 35
    when 'PROPOSAL' then 60
    when 'NEGOTIATION' then 80
    when 'WON' then 100
    when 'LOST' then 0
  end;

  perform set_config('app.stage18_rpc','true',true);
  update public.opportunities
  set stage=p_to_stage,
      probability=v_probability,
      lost_reason=case when p_to_stage='LOST' then nullif(trim(p_reason),'') else null end,
      closed_at=case when p_to_stage in ('WON','LOST') then now() else null end,
      updated_at=now()
  where id=v_opportunity.id
  returning * into v_opportunity;

  insert into public.crm_opportunity_stage_history(
    organization_id,opportunity_id,from_stage,to_stage,reason,changed_by
  ) values(
    v_opportunity.organization_id,v_opportunity.id,v_from,p_to_stage,
    nullif(trim(p_reason),''),auth.uid()
  );

  return v_opportunity;
end $$;

create or replace function public.record_crm_activity(
  p_organization_id uuid,
  p_activity_type text,
  p_subject text,
  p_description text,
  p_lead_id uuid,
  p_opportunity_id uuid,
  p_client_id uuid,
  p_ticket_id uuid,
  p_occurred_at timestamptz,
  p_due_at timestamptz,
  p_owner_id uuid
) returns public.crm_activities
language plpgsql security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_activity public.crm_activities;
begin
  if num_nonnulls(p_lead_id,p_opportunity_id,p_client_id,p_ticket_id)<>1 then
    raise exception 'A atividade precisa de exatamente uma entidade.';
  end if;
  if not (
    public.has_module_permission(p_organization_id,'crm','EDIT',null,null)
    or public.has_module_permission(p_organization_id,'clientes','EDIT',null,null)
    or public.has_module_permission(p_organization_id,'sac','EDIT',null,null)
  ) then
    raise exception 'Permissão insuficiente para registrar atividade.';
  end if;

  insert into public.crm_activities(
    organization_id,activity_type,subject,description,lead_id,opportunity_id,
    client_id,ticket_id,occurred_at,due_at,owner_id,created_by
  ) values(
    p_organization_id,p_activity_type,trim(p_subject),nullif(trim(p_description),''),
    p_lead_id,p_opportunity_id,p_client_id,p_ticket_id,
    coalesce(p_occurred_at,now()),p_due_at,p_owner_id,auth.uid()
  ) returning * into v_activity;

  return v_activity;
end $$;

revoke all on function public.create_crm_lead(uuid,text,text,text,text,text,text,text,text,numeric,text,text,uuid,timestamptz,text,boolean,text,text) from public,anon;
grant execute on function public.create_crm_lead(uuid,text,text,text,text,text,text,text,text,numeric,text,text,uuid,timestamptz,text,boolean,text,text) to authenticated,service_role;

revoke all on function public.create_crm_opportunity(uuid,uuid,uuid,text,text,numeric,text,numeric,date,text,uuid) from public,anon;
grant execute on function public.create_crm_opportunity(uuid,uuid,uuid,text,text,numeric,text,numeric,date,text,uuid) to authenticated,service_role;

revoke all on function public.convert_crm_lead(uuid,boolean,text,numeric) from public,anon;
grant execute on function public.convert_crm_lead(uuid,boolean,text,numeric) to authenticated,service_role;

revoke all on function public.move_crm_opportunity_stage(uuid,text,text) from public,anon;
grant execute on function public.move_crm_opportunity_stage(uuid,text,text) to authenticated,service_role;

revoke all on function public.record_crm_activity(uuid,text,text,text,uuid,uuid,uuid,uuid,timestamptz,timestamptz,uuid) from public,anon;
grant execute on function public.record_crm_activity(uuid,text,text,text,uuid,uuid,uuid,uuid,timestamptz,timestamptz,uuid) to authenticated,service_role;
