begin;

alter table public.clients
  add column if not exists status text not null default 'ACTIVE',
  add column if not exists address_line text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists postal_code text,
  add column if not exists notes text,
  add column if not exists archived_at timestamptz;

alter table public.clients
  add constraint clients_status_check
  check (status in ('ACTIVE','INACTIVE','ARCHIVED'));

create unique index if not exists clients_org_tax_id_uidx
  on public.clients(organization_id,tax_id)
  where tax_id is not null and tax_id<>'';
create index if not exists clients_org_status_idx
  on public.clients(organization_id,status,created_at desc);
create index if not exists clients_email_idx
  on public.clients(lower(email)) where email is not null;

alter table public.projects
  add constraint projects_status_stage121_check
  check (status in ('PLANNING','ACTIVE','IN_PROGRESS','ON_HOLD','COMPLETED','CANCELED','ARCHIVED'));

create or replace function public.create_client_record(
  p_organization_id uuid,
  p_type text,
  p_legal_name text,
  p_trade_name text default null,
  p_tax_id text default null,
  p_email text default null,
  p_phone text default null,
  p_address_line text default null,
  p_city text default null,
  p_state text default null,
  p_postal_code text default null,
  p_notes text default null
) returns uuid
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_id uuid;
begin
  if not public.has_module_permission(p_organization_id,'clientes','EDIT',null,null) then
    raise exception 'Acesso negado ao módulo Clientes';
  end if;
  if nullif(trim(p_legal_name),'') is null then
    raise exception 'Nome completo ou razão social é obrigatório';
  end if;
  if upper(coalesce(p_type,'PERSON')) not in ('PERSON','COMPANY') then
    raise exception 'Tipo de cliente inválido';
  end if;

  insert into public.clients(
    organization_id,type,legal_name,trade_name,tax_id,email,phone,
    address_line,city,state,postal_code,notes,created_by
  ) values (
    p_organization_id,upper(coalesce(p_type,'PERSON')),trim(p_legal_name),
    nullif(trim(coalesce(p_trade_name,'')),''),nullif(regexp_replace(coalesce(p_tax_id,''),'[^0-9]','','g'),''),
    nullif(lower(trim(coalesce(p_email,''))),''),nullif(trim(coalesce(p_phone,'')),''),
    nullif(trim(coalesce(p_address_line,'')),''),nullif(trim(coalesce(p_city,'')),''),
    nullif(upper(trim(coalesce(p_state,''))),''),nullif(trim(coalesce(p_postal_code,'')),''),
    nullif(trim(coalesce(p_notes,'')),''),auth.uid()
  ) returning id into v_id;

  perform public.write_audit(
    p_organization_id,'CLIENT',v_id,'CREATE_CLIENT',
    jsonb_build_object('legal_name',trim(p_legal_name),'type',upper(coalesce(p_type,'PERSON'))),null
  );
  return v_id;
end;
$$;

create or replace function public.update_client_record(
  p_client_id uuid,
  p_legal_name text,
  p_trade_name text default null,
  p_tax_id text default null,
  p_email text default null,
  p_phone text default null,
  p_address_line text default null,
  p_city text default null,
  p_state text default null,
  p_postal_code text default null,
  p_notes text default null,
  p_status text default 'ACTIVE'
) returns public.clients
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_client public.clients;
  v_before jsonb;
begin
  select * into v_client from public.clients where id=p_client_id for update;
  if not found then raise exception 'Cliente não encontrado'; end if;
  if not public.has_module_permission(v_client.organization_id,'clientes','EDIT',null,null) then
    raise exception 'Acesso negado ao módulo Clientes';
  end if;
  if upper(p_status) not in ('ACTIVE','INACTIVE','ARCHIVED') then
    raise exception 'Status inválido';
  end if;
  v_before:=to_jsonb(v_client);

  update public.clients set
    legal_name=trim(p_legal_name),
    trade_name=nullif(trim(coalesce(p_trade_name,'')),''),
    tax_id=nullif(regexp_replace(coalesce(p_tax_id,''),'[^0-9]','','g'),''),
    email=nullif(lower(trim(coalesce(p_email,''))),''),
    phone=nullif(trim(coalesce(p_phone,'')),''),
    address_line=nullif(trim(coalesce(p_address_line,'')),''),
    city=nullif(trim(coalesce(p_city,'')),''),
    state=nullif(upper(trim(coalesce(p_state,''))),''),
    postal_code=nullif(trim(coalesce(p_postal_code,'')),''),
    notes=nullif(trim(coalesce(p_notes,'')),''),
    status=upper(p_status),
    archived_at=case when upper(p_status)='ARCHIVED' then coalesce(archived_at,now()) else null end,
    updated_at=now()
  where id=p_client_id
  returning * into v_client;

  perform public.write_audit(
    v_client.organization_id,'CLIENT',v_client.id,'UPDATE_CLIENT',
    jsonb_build_object('before',v_before,'after',to_jsonb(v_client)),null
  );
  return v_client;
end;
$$;

create or replace function public.create_project_for_client(
  p_client_id uuid,
  p_code text,
  p_name text,
  p_planned_start date,
  p_planned_end date,
  p_contract_id uuid default null,
  p_description text default null,
  p_address_line text default null,
  p_city text default null,
  p_state text default null,
  p_postal_code text default null
) returns uuid
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_client public.clients;
  v_contract public.contracts;
  v_membership public.organization_memberships;
  v_project_id uuid;
begin
  select * into v_client from public.clients where id=p_client_id and archived_at is null;
  if not found then raise exception 'Cliente não encontrado ou arquivado'; end if;
  if not public.has_module_permission(v_client.organization_id,'obras','EDIT',null,null) then
    raise exception 'Acesso negado ao módulo Obras';
  end if;
  if nullif(trim(p_code),'') is null or nullif(trim(p_name),'') is null then
    raise exception 'Código e nome da obra são obrigatórios';
  end if;
  if p_planned_start is not null and p_planned_end is not null and p_planned_end<p_planned_start then
    raise exception 'Período planejado inválido';
  end if;

  if p_contract_id is not null then
    select * into v_contract from public.contracts where id=p_contract_id for update;
    if not found then raise exception 'Contrato não encontrado'; end if;
    if v_contract.organization_id<>v_client.organization_id or v_contract.client_id<>v_client.id then
      raise exception 'Contrato não pertence ao cliente selecionado';
    end if;
    if v_contract.status not in ('SIGNED','ACTIVE','AMENDED') then
      raise exception 'Contrato precisa estar assinado, ativo ou aditado';
    end if;
    if v_contract.project_id is not null then
      raise exception 'Contrato já está vinculado a outra obra';
    end if;
  end if;

  select * into v_membership
  from public.organization_memberships
  where organization_id=v_client.organization_id
    and user_id=auth.uid()
    and active
  limit 1;

  insert into public.projects(
    organization_id,client_id,contract_id,code,name,status,description,
    planned_start,planned_end,address_line,city,state,postal_code,
    manager_id,created_by
  ) values (
    v_client.organization_id,v_client.id,p_contract_id,upper(trim(p_code)),trim(p_name),
    'PLANNING',nullif(trim(coalesce(p_description,'')),''),p_planned_start,p_planned_end,
    coalesce(nullif(trim(coalesce(p_address_line,'')),''),v_client.address_line),
    coalesce(nullif(trim(coalesce(p_city,'')),''),v_client.city),
    coalesce(nullif(upper(trim(coalesce(p_state,''))),''),v_client.state),
    coalesce(nullif(trim(coalesce(p_postal_code,'')),''),v_client.postal_code),
    auth.uid(),auth.uid()
  ) returning id into v_project_id;

  if v_membership.id is not null then
    insert into public.project_memberships(
      organization_id,project_id,user_id,role,active,can_edit_schedule,
      can_write_daily_logs,can_release_client_content,created_by
    ) values (
      v_client.organization_id,v_project_id,auth.uid(),v_membership.role,true,
      v_membership.role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR','GESTOR_OBRAS','ENGENHEIRO'),
      v_membership.role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR','GESTOR_OBRAS','ENGENHEIRO','QUALIDADE'),
      v_membership.role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR','GESTOR_OBRAS'),
      auth.uid()
    ) on conflict(project_id,user_id) do nothing;
  end if;

  if p_contract_id is not null then
    update public.contracts set project_id=v_project_id where id=p_contract_id;
  end if;

  perform public.write_audit(
    v_client.organization_id,'PROJECT',v_project_id,'CREATE_FOR_CLIENT',
    jsonb_build_object('client_id',v_client.id,'contract_id',p_contract_id),v_project_id
  );
  return v_project_id;
end;
$$;

create or replace function public.create_project_from_contract(
  p_contract_id uuid,
  p_code text,
  p_name text,
  p_planned_start date,
  p_planned_end date,
  p_address_line text default null,
  p_city text default null,
  p_state text default null
) returns uuid
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_contract public.contracts;
begin
  select * into v_contract from public.contracts where id=p_contract_id;
  if not found then raise exception 'Contrato não encontrado'; end if;
  return public.create_project_for_client(
    v_contract.client_id,p_code,p_name,p_planned_start,p_planned_end,
    p_contract_id,null,p_address_line,p_city,p_state,null
  );
end;
$$;

create or replace function public.set_project_lifecycle_status(
  p_project_id uuid,
  p_status text,
  p_reason text default null
) returns public.projects
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_project public.projects;
  v_next text:=upper(p_status);
  v_allowed boolean:=false;
begin
  select * into v_project from public.projects where id=p_project_id for update;
  if not found then raise exception 'Obra não encontrada'; end if;
  if not public.has_module_permission(v_project.organization_id,'obras','EDIT',v_project.id,null) then
    raise exception 'Acesso negado ao módulo Obras';
  end if;
  if v_next not in ('PLANNING','ACTIVE','IN_PROGRESS','ON_HOLD','COMPLETED','CANCELED','ARCHIVED') then
    raise exception 'Status inválido';
  end if;

  v_allowed:=case v_project.status
    when 'PLANNING' then v_next in ('ACTIVE','IN_PROGRESS','ON_HOLD','CANCELED')
    when 'ACTIVE' then v_next in ('IN_PROGRESS','ON_HOLD','COMPLETED','CANCELED')
    when 'IN_PROGRESS' then v_next in ('ACTIVE','ON_HOLD','COMPLETED','CANCELED')
    when 'ON_HOLD' then v_next in ('ACTIVE','IN_PROGRESS','CANCELED')
    when 'COMPLETED' then v_next in ('ARCHIVED','ACTIVE')
    when 'CANCELED' then v_next in ('ARCHIVED','PLANNING')
    when 'ARCHIVED' then false
    else false
  end;
  if not v_allowed then
    raise exception 'Transição de % para % não permitida',v_project.status,v_next;
  end if;
  if v_next in ('ON_HOLD','CANCELED') and nullif(trim(coalesce(p_reason,'')),'') is null then
    raise exception 'Motivo obrigatório para suspensão ou cancelamento';
  end if;

  update public.projects set
    status=v_next,
    actual_start=case when v_next in ('ACTIVE','IN_PROGRESS') then coalesce(actual_start,current_date) else actual_start end,
    actual_end=case when v_next='COMPLETED' then coalesce(actual_end,current_date) when v_next='ACTIVE' and status='COMPLETED' then null else actual_end end,
    archived_at=case when v_next='ARCHIVED' then now() else archived_at end,
    updated_at=now()
  where id=p_project_id
  returning * into v_project;

  perform public.write_audit(
    v_project.organization_id,'PROJECT',v_project.id,'SET_LIFECYCLE_STATUS',
    jsonb_build_object('status',v_next,'reason',p_reason),v_project.id
  );
  return v_project;
end;
$$;

revoke all on function public.create_client_record(uuid,text,text,text,text,text,text,text,text,text,text,text) from public,anon;
revoke all on function public.update_client_record(uuid,text,text,text,text,text,text,text,text,text,text,text) from public,anon;
revoke all on function public.create_project_for_client(uuid,text,text,date,date,uuid,text,text,text,text,text) from public,anon;
revoke all on function public.create_project_from_contract(uuid,text,text,date,date,text,text,text) from public,anon;
revoke all on function public.set_project_lifecycle_status(uuid,text,text) from public,anon;

grant execute on function public.create_client_record(uuid,text,text,text,text,text,text,text,text,text,text,text) to authenticated,service_role;
grant execute on function public.update_client_record(uuid,text,text,text,text,text,text,text,text,text,text,text) to authenticated,service_role;
grant execute on function public.create_project_for_client(uuid,text,text,date,date,uuid,text,text,text,text,text) to authenticated,service_role;
grant execute on function public.create_project_from_contract(uuid,text,text,date,date,text,text,text) to authenticated,service_role;
grant execute on function public.set_project_lifecycle_status(uuid,text,text) to authenticated,service_role;

commit;
