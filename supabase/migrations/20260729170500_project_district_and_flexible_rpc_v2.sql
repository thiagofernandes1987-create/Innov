begin;

alter table public.projects
  add column if not exists district text;

create or replace function public.create_independent_project_v2(
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
begin
  if not public.has_org_role(
    p_organization_id,
    array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR','GESTOR_OBRAS','ENGENHEIRO']::public.org_role[]
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

  if p_manager_id is not null and not exists (
    select 1 from public.organization_memberships
    where organization_id = p_organization_id
      and user_id = p_manager_id
      and active
  ) then
    raise exception 'Responsável não é membro ativo da organização.';
  end if;

  if p_planned_start is not null and p_planned_end is not null and p_planned_end < p_planned_start then
    raise exception 'Término planejado não pode ser anterior ao início.';
  end if;

  if v_entry_mode in ('IN_PROGRESS','HISTORICAL','IMPORTED') and p_data_cutoff is null then
    raise exception 'Obra existente ou importada exige data de corte.';
  end if;

  if coalesce(p_progress, 0) < 0 or coalesce(p_progress, 0) > 1 then
    raise exception 'Progresso precisa estar entre 0 e 100%%.';
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
    nullif(trim(p_postal_code), ''), v_entry_mode, p_data_cutoff,
    coalesce(p_historical_cost, 0), nullif(trim(p_imported_from), ''), auth.uid()
  ) returning id into v_project_id;

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
      'district', nullif(trim(p_district), '')
    ),
    v_project_id
  );

  return v_project_id;
end;
$function$;

revoke all on function public.create_independent_project_v2(
  uuid,uuid,text,text,text,text,text,date,date,date,numeric,date,numeric,text,text,text,text,text,uuid,text
) from public;
revoke all on function public.create_independent_project_v2(
  uuid,uuid,text,text,text,text,text,date,date,date,numeric,date,numeric,text,text,text,text,text,uuid,text
) from anon;
grant execute on function public.create_independent_project_v2(
  uuid,uuid,text,text,text,text,text,date,date,date,numeric,date,numeric,text,text,text,text,text,uuid,text
) to authenticated;

create index if not exists projects_organization_location_idx
on public.projects(organization_id, city, district)
where archived_at is null;

commit;
