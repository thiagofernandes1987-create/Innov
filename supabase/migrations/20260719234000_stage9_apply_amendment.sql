begin;

alter table public.amendments
  add column if not exists applied_at timestamptz;

create or replace function public.apply_signed_amendment(p_amendment_id uuid)
returns public.contracts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amendment public.amendments;
  v_contract public.contracts;
begin
  select * into v_amendment
  from public.amendments
  where id = p_amendment_id
  for update;

  if not found then raise exception 'Aditivo não encontrado'; end if;
  if v_amendment.status not in ('SIGNED','ACTIVE') then
    raise exception 'Somente aditivo assinado pode ser aplicado';
  end if;

  select * into v_contract
  from public.contracts
  where id = v_amendment.contract_id
  for update;

  if v_amendment.applied_at is not null then
    return v_contract;
  end if;

  update public.contracts
  set amendment_value = amendment_value + v_amendment.value_delta,
      ends_at = case
        when v_amendment.new_end_date is not null then v_amendment.new_end_date
        when ends_at is not null and v_amendment.days_delta <> 0 then ends_at + v_amendment.days_delta
        else ends_at
      end,
      status = 'AMENDED'
  where id = v_contract.id
  returning * into v_contract;

  update public.amendments
  set status = 'ACTIVE', applied_at = now()
  where id = v_amendment.id;

  insert into public.audit_events(
    organization_id, project_id, actor_user_id, event_type,
    resource_type, resource_id, action, result, after_data
  ) values (
    v_contract.organization_id, v_contract.project_id, auth.uid(),
    'amendment.applied', 'AMENDMENT', v_amendment.id, 'APPLY', 'SUCCESS',
    jsonb_build_object(
      'contract_id', v_contract.id,
      'value_delta', v_amendment.value_delta,
      'days_delta', v_amendment.days_delta,
      'consolidated_value', v_contract.consolidated_value,
      'new_end_date', v_contract.ends_at
    )
  );

  return v_contract;
end;
$$;

commit;
