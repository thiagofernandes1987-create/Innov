begin;

-- A criação precisa preservar acesso do autor, coerência temporal e origem real.
alter table public.projects drop constraint if exists projects_planned_period_check;
alter table public.projects add constraint projects_planned_period_check
  check (planned_end is null or planned_start is null or planned_end >= planned_start) not valid;

alter table public.projects drop constraint if exists projects_existing_cutoff_check;
alter table public.projects add constraint projects_existing_cutoff_check
  check (entry_mode not in ('IN_PROGRESS','HISTORICAL','IMPORTED') or data_cutoff is not null) not valid;

alter table public.projects drop constraint if exists projects_existing_actual_start_check;
alter table public.projects add constraint projects_existing_actual_start_check
  check (entry_mode not in ('IN_PROGRESS','HISTORICAL') or actual_start is not null) not valid;

alter table public.projects drop constraint if exists projects_actual_start_cutoff_check;
alter table public.projects add constraint projects_actual_start_cutoff_check
  check (actual_start is null or data_cutoff is null or actual_start <= data_cutoff) not valid;

alter table public.projects drop constraint if exists projects_historical_consistency_check;
alter table public.projects add constraint projects_historical_consistency_check
  check (entry_mode <> 'HISTORICAL' or (status = 'COMPLETED' and progress = 1)) not valid;

alter table public.projects drop constraint if exists projects_in_progress_consistency_check;
alter table public.projects add constraint projects_in_progress_consistency_check
  check (entry_mode <> 'IN_PROGRESS' or status in ('ACTIVE','IN_PROGRESS','ON_HOLD')) not valid;

alter table public.projects drop constraint if exists projects_import_source_check;
alter table public.projects add constraint projects_import_source_check
  check (entry_mode <> 'IMPORTED' or nullif(trim(imported_from), '') is not null) not valid;

create or replace function public.create_independent_project_v3(
  p_organization_id uuid,
  p_client_id uuid,
  p_entry_mode text,
  p_code text,
  p_name text,
  p_status text,
  p_description text,
  p_planned_start date,
  p_planned_end date,
  p_actual_start date,
  p_progress numeric,
  p_data_cutoff date,
  p_historical_cost numeric,
  p_address_line text,
  p_district text,
  p_city text,
  p_state text,
  p_postal_code text,
  p_manager_id uuid,
  p_imported_from text
) returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_project_id uuid;
  v_entry_mode text := upper(trim(coalesce(p_entry_mode, 'INDEPENDENT')));
  v_status text := upper(trim(coalesce(p_status, 'PLANNING')));
  v_creator_role public.org_role;
  v_manager_role public.org_role;
begin
  select role into v_creator_role
  from public.organization_memberships
  where organization_id = p_organization_id
    and user_id = auth.uid()
    and active;

  if v_creator_role is null or v_creator_role not in (
    'SUPER_ADMIN','DIRECAO','ADMINISTRADOR','GESTOR_OBRAS','ENGENHEIRO'
  ) then
    raise exception 'Acesso negado para criar obra ou projeto.';
  end if;

  if v_entry_mode not in ('INDEPENDENT','IN_PROGRESS','HISTORICAL','IMPORTED') then
    raise exception 'Origem de projeto inválida.';
  end if;

  if v_status not in ('PLANNING','ACTIVE','IN_PROGRESS','ON_HOLD','COMPLETED') then
    raise exception 'Situação inicial inválida.';
  end if;

  if nullif(trim(p_code), '') is null or nullif(trim(p_name), '') is null then
    raise exception 'Código e nome são obrigatórios.';
  end if;

  if p_client_id is not null and not exists (
    select 1 from public.clients
    where id = p_client_id and organization_id = p_organization_id
  ) then
    raise exception 'Cliente não pertence à organização.';
  end if;

  if p_manager_id is not null then
    select role into v_manager_role
    from public.organization_memberships
    where organization_id = p_organization_id
      and user_id = p_manager_id
      and active;

    if v_manager_role is null or v_manager_role not in (
      'SUPER_ADMIN','DIRECAO','ADMINISTRADOR','GESTOR_OBRAS','ENGENHEIRO'
    ) then
      raise exception 'Responsável não é membro ativo da equipe de gestão.';
    end if;
  end if;

  if (p_planned_start is null) <> (p_planned_end is null) then
    raise exception 'Início e término planejados devem ser informados em conjunto.';
  end if;

  if p_planned_start is not null and p_planned_end < p_planned_start then
    raise exception 'Término planejado não pode ser anterior ao início.';
  end if;

  if v_entry_mode in ('IN_PROGRESS','HISTORICAL','IMPORTED') then
    if p_data_cutoff is null then
      raise exception 'Obra existente ou importada exige data de corte.';
    end if;
    if p_data_cutoff > current_date then
      raise exception 'Data de corte não pode estar no futuro.';
    end if;
  end if;

  if v_entry_mode in ('IN_PROGRESS','HISTORICAL') and p_actual_start is null then
    raise exception 'Obra existente ou histórica exige início real.';
  end if;

  if p_actual_start is not null and p_data_cutoff is not null and p_actual_start > p_data_cutoff then
    raise exception 'Início real não pode ser posterior à data de corte.';
  end if;

  if coalesce(p_progress, 0) < 0 or coalesce(p_progress, 0) > 1 then
    raise exception 'Progresso precisa estar entre 0 e 100%%.';
  end if;

  if coalesce(p_historical_cost, 0) < 0 then
    raise exception 'Custo histórico não pode ser negativo.';
  end if;

  if v_entry_mode = 'HISTORICAL' and (v_status <> 'COMPLETED' or coalesce(p_progress, 0) <> 1) then
    raise exception 'Obra histórica deve entrar concluída e com 100%% de avanço.';
  end if;

  if v_entry_mode = 'IN_PROGRESS' and v_status not in ('ACTIVE','IN_PROGRESS','ON_HOLD') then
    raise exception 'Obra em andamento exige situação ativa, em andamento ou pausada.';
  end if;

  if v_entry_mode = 'IMPORTED' and nullif(trim(p_imported_from), '') is null then
    raise exception 'Projeto importado exige identificação da origem.';
  end if;

  if nullif(trim(p_state), '') is not null and upper(trim(p_state)) !~ '^[A-Z]{2}$' then
    raise exception 'Estado deve ser informado com duas letras.';
  end if;

  insert into public.projects (
    organization_id, client_id, code, name, status, description,
    planned_start, planned_end, actual_start, progress, manager_id,
    address_line, district, city, state, postal_code, entry_mode, data_cutoff,
    historical_cost, imported_from, created_by
  ) values (
    p_organization_id, p_client_id, upper(trim(p_code)), trim(p_name), v_status,
    nullif(trim(p_description), ''), p_planned_start, p_planned_end,
    p_actual_start, coalesce(p_progress, 0), p_manager_id,
    nullif(trim(p_address_line), ''), nullif(trim(p_district), ''),
    nullif(trim(p_city), ''), nullif(upper(trim(p_state)), ''),
    nullif(regexp_replace(coalesce(p_postal_code, ''), '\D', '', 'g'), ''),
    v_entry_mode, p_data_cutoff, coalesce(p_historical_cost, 0),
    nullif(trim(p_imported_from), ''), auth.uid()
  ) returning id into v_project_id;

  insert into public.project_memberships (
    organization_id, project_id, user_id, role, active, can_edit_schedule,
    can_write_daily_logs, can_release_client_content, created_by
  ) values (
    p_organization_id, v_project_id, auth.uid(), v_creator_role, true, true, true, true, auth.uid()
  ) on conflict (project_id, user_id) do update set
    role = excluded.role,
    active = true,
    can_edit_schedule = true,
    can_write_daily_logs = true,
    can_release_client_content = true;

  if p_manager_id is not null and p_manager_id <> auth.uid() then
    insert into public.project_memberships (
      organization_id, project_id, user_id, role, active, can_edit_schedule,
      can_write_daily_logs, can_release_client_content, created_by
    ) values (
      p_organization_id, v_project_id, p_manager_id, v_manager_role, true, true, true, true, auth.uid()
    ) on conflict (project_id, user_id) do update set
      role = excluded.role,
      active = true,
      can_edit_schedule = true,
      can_write_daily_logs = true,
      can_release_client_content = true;
  end if;

  perform public.write_audit(
    p_organization_id,
    'PROJECT',
    v_project_id,
    'CREATE_WITHOUT_CONTRACT',
    jsonb_build_object(
      'entry_mode', v_entry_mode,
      'status', v_status,
      'data_cutoff', p_data_cutoff,
      'progress', coalesce(p_progress, 0),
      'historical_cost', coalesce(p_historical_cost, 0),
      'district', nullif(trim(p_district), ''),
      'manager_id', p_manager_id
    ),
    v_project_id
  );

  return v_project_id;
exception
  when unique_violation then
    raise exception 'Código de obra já utilizado nesta organização.';
end;
$function$;

revoke all on function public.create_independent_project_v3(
  uuid,uuid,text,text,text,text,text,date,date,date,numeric,date,numeric,text,text,text,text,text,uuid,text
) from public;
revoke all on function public.create_independent_project_v3(
  uuid,uuid,text,text,text,text,text,date,date,date,numeric,date,numeric,text,text,text,text,text,uuid,text
) from anon;
grant execute on function public.create_independent_project_v3(
  uuid,uuid,text,text,text,text,text,date,date,date,numeric,date,numeric,text,text,text,text,text,uuid,text
) to authenticated;

-- As versões anteriores não podem contornar as invariantes novas.
revoke execute on function public.create_independent_project_v2(
  uuid,uuid,text,text,text,text,text,date,date,date,numeric,date,numeric,text,text,text,text,text,uuid,text
) from authenticated;
revoke execute on function public.create_independent_project(
  uuid,uuid,text,text,text,text,text,date,date,date,numeric,date,numeric,text,text,text,text,uuid,text
) from authenticated;

create or replace function public.create_project_from_contract_v2(
  p_contract_id uuid,
  p_code text,
  p_name text,
  p_planned_start date,
  p_planned_end date,
  p_address_line text default null,
  p_district text default null,
  p_city text default null,
  p_state text default null,
  p_postal_code text default null
) returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_contract public.contracts;
  v_project_id uuid;
  v_creator_role public.org_role;
begin
  select * into v_contract
  from public.contracts
  where id = p_contract_id
  for update;

  if not found then raise exception 'Contrato não encontrado.'; end if;
  if v_contract.project_id is not null then raise exception 'Contrato já possui obra vinculada.'; end if;
  if v_contract.status not in ('SIGNED','ACTIVE','AMENDED') then
    raise exception 'O contrato precisa estar assinado, ativo ou aditado.';
  end if;

  select role into v_creator_role
  from public.organization_memberships
  where organization_id = v_contract.organization_id
    and user_id = auth.uid()
    and active;

  if v_creator_role is null or v_creator_role not in (
    'SUPER_ADMIN','DIRECAO','ADMINISTRADOR','GESTOR_OBRAS','ENGENHEIRO'
  ) then
    raise exception 'Acesso negado para converter contrato em obra.';
  end if;

  if nullif(trim(p_code), '') is null or nullif(trim(p_name), '') is null then
    raise exception 'Código e nome são obrigatórios.';
  end if;

  if p_planned_start is null or p_planned_end is null or p_planned_end < p_planned_start then
    raise exception 'Período planejado inválido.';
  end if;

  if nullif(trim(p_state), '') is not null and upper(trim(p_state)) !~ '^[A-Z]{2}$' then
    raise exception 'Estado deve ser informado com duas letras.';
  end if;

  insert into public.projects (
    organization_id, client_id, contract_id, code, name, status, planned_start, planned_end,
    address_line, district, city, state, postal_code, manager_id, entry_mode, created_by
  ) values (
    v_contract.organization_id, v_contract.client_id, v_contract.id,
    upper(trim(p_code)), trim(p_name), 'PLANNING', p_planned_start, p_planned_end,
    nullif(trim(p_address_line), ''), nullif(trim(p_district), ''), nullif(trim(p_city), ''),
    nullif(upper(trim(p_state)), ''),
    nullif(regexp_replace(coalesce(p_postal_code, ''), '\D', '', 'g'), ''),
    auth.uid(), 'CONTRACT', auth.uid()
  ) returning id into v_project_id;

  insert into public.project_memberships (
    organization_id, project_id, user_id, role, active, can_edit_schedule,
    can_write_daily_logs, can_release_client_content, created_by
  ) values (
    v_contract.organization_id, v_project_id, auth.uid(), v_creator_role, true, true, true, true, auth.uid()
  ) on conflict (project_id, user_id) do update set
    role = excluded.role,
    active = true,
    can_edit_schedule = true,
    can_write_daily_logs = true,
    can_release_client_content = true;

  update public.contracts
  set project_id = v_project_id
  where id = v_contract.id;

  perform public.write_audit(
    v_contract.organization_id,
    'PROJECT',
    v_project_id,
    'CREATE_FROM_CONTRACT',
    jsonb_build_object('contract_id', v_contract.id, 'creator_role', v_creator_role),
    v_project_id
  );

  return v_project_id;
exception
  when unique_violation then
    raise exception 'Código de obra já utilizado nesta organização.';
end;
$function$;

revoke all on function public.create_project_from_contract_v2(
  uuid,text,text,date,date,text,text,text,text,text
) from public;
revoke all on function public.create_project_from_contract_v2(
  uuid,text,text,date,date,text,text,text,text,text
) from anon;
grant execute on function public.create_project_from_contract_v2(
  uuid,text,text,date,date,text,text,text,text,text
) to authenticated;

-- Compatibilidade: a porta antiga herda as mesmas verificações e não eleva o papel.
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
language sql
security invoker
set search_path = public, auth, pg_temp
as $function$
  select public.create_project_from_contract_v2(
    p_contract_id,
    p_code,
    p_name,
    p_planned_start,
    p_planned_end,
    p_address_line,
    null,
    p_city,
    p_state,
    null
  );
$function$;

commit;
