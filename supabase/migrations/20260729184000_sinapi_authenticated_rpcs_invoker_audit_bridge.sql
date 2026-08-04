-- VACINA-004 + VACINA-039: a inclusão de referência SINAPI continua como
-- SECURITY INVOKER. A única operação elevada é a gravação de um evento fixo,
-- derivado do item já persistido e validado, sem payload arbitrário do cliente.

create or replace function public.write_sinapi_budget_item_audit(
  p_budget_item_id uuid
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_item public.budget_items;
  v_kind text;
  v_reference_id uuid;
  v_existing_id uuid;
begin
  select * into v_item
  from public.budget_items
  where id = p_budget_item_id;

  if not found then
    raise exception 'Item de orçamento não encontrado para auditoria SINAPI.';
  end if;

  if v_item.created_by is distinct from auth.uid() then
    raise exception 'Somente o autor do item pode registrar a auditoria SINAPI.';
  end if;

  if not public.has_org_role(
    v_item.organization_id,
    array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR','ORCAMENTISTA','FINANCEIRO']::public.org_role[]
  ) then
    raise exception 'Perfil sem permissão para auditar composição SINAPI.';
  end if;

  if v_item.catalog_item_id is not null and exists (
    select 1
    from public.cost_catalog_items catalog
    where catalog.id = v_item.catalog_item_id
      and catalog.organization_id = v_item.organization_id
      and catalog.source_key = 'SINAPI_CAIXA'
  ) then
    v_kind := 'INPUT';
    v_reference_id := v_item.catalog_item_id;
  elsif v_item.composition_version_id is not null and exists (
    select 1
    from public.cost_composition_versions version
    join public.cost_compositions composition on composition.id = version.composition_id
    where version.id = v_item.composition_version_id
      and version.organization_id = v_item.organization_id
      and composition.organization_id = v_item.organization_id
      and composition.source_key = 'SINAPI_CAIXA'
  ) then
    v_kind := 'COMPOSITION';
    v_reference_id := v_item.composition_version_id;
  else
    raise exception 'Item não possui referência oficial SINAPI verificável.';
  end if;

  select event.id into v_existing_id
  from public.audit_events event
  where event.organization_id = v_item.organization_id
    and event.resource_type = 'BUDGET_ITEM'
    and event.resource_id = v_item.id
    and event.action = 'ADD_SINAPI_REFERENCE'
  order by event.created_at
  limit 1;

  if v_existing_id is not null then
    return v_existing_id;
  end if;

  return public.write_audit(
    v_item.organization_id,
    'BUDGET_ITEM',
    v_item.id,
    'ADD_SINAPI_REFERENCE',
    jsonb_build_object(
      'kind', v_kind,
      'referenceId', v_reference_id,
      'quantity', v_item.quantity,
      'code', v_item.code,
      'baseDate', v_item.base_date
    ),
    null
  );
end;
$function$;

revoke all on function public.write_sinapi_budget_item_audit(uuid) from public;
revoke all on function public.write_sinapi_budget_item_audit(uuid) from anon;
grant execute on function public.write_sinapi_budget_item_audit(uuid) to authenticated;

create or replace function public.add_sinapi_reference_to_budget(
  p_budget_version_id uuid,
  p_kind text,
  p_reference_id uuid,
  p_quantity numeric,
  p_section_id uuid default null
)
returns public.budget_items
language plpgsql
security invoker
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_version public.budget_versions;
  v_kind text := upper(trim(p_kind));
  v_sequence integer;
  v_item public.cost_catalog_items;
  v_composition public.cost_compositions;
  v_composition_version public.cost_composition_versions;
  v_budget_item public.budget_items;
  v_category text;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantidade SINAPI deve ser maior que zero.';
  end if;

  select * into v_version
  from public.budget_versions
  where id = p_budget_version_id
  for update;
  if not found then raise exception 'Versão de orçamento não encontrada.'; end if;
  if v_version.frozen_at is not null then raise exception 'Versão congelada é imutável.'; end if;

  if not exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = v_version.organization_id
      and membership.user_id = auth.uid()
      and membership.active
      and membership.role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR','ORCAMENTISTA','FINANCEIRO')
  ) then
    raise exception 'Perfil sem permissão para compor orçamento.';
  end if;

  if p_section_id is not null and not exists (
    select 1 from public.budget_sections section
    where section.id = p_section_id
      and section.budget_version_id = v_version.id
      and section.organization_id = v_version.organization_id
  ) then
    raise exception 'Seção não pertence à versão do orçamento.';
  end if;

  select coalesce(max(sequence), 0) + 1 into v_sequence
  from public.budget_items
  where budget_version_id = v_version.id;

  if v_kind = 'INPUT' then
    select * into v_item
    from public.cost_catalog_items
    where id = p_reference_id
      and organization_id = v_version.organization_id
      and source_key = 'SINAPI_CAIXA';
    if not found then raise exception 'Insumo SINAPI não encontrado.'; end if;

    v_category := case upper(v_item.item_type)
      when 'LABOR' then 'LABOR'
      when 'EQUIPMENT' then 'EQUIPMENT'
      when 'SERVICE' then 'SERVICE'
      else 'MATERIAL'
    end;

    insert into public.budget_items(
      organization_id, budget_version_id, section_id, catalog_item_id,
      cost_type, item_category, code, description, unit, quantity,
      unit_cost, loss_rate, freight_rate, source, region, base_date,
      sequence, created_by
    ) values (
      v_version.organization_id, v_version.id, p_section_id, v_item.id,
      'DIRECT', v_category, v_item.source_record_id, v_item.description,
      v_item.unit, p_quantity, v_item.unit_cost, v_item.loss_rate,
      v_item.freight_rate,
      format('SINAPI CAIXA/IBGE · %s · %s · %s',
        v_item.region, to_char(v_item.base_date, 'MM/YYYY'),
        case when v_item.tax_relief then 'com desoneração' else 'sem desoneração' end),
      v_item.region, v_item.base_date, v_sequence, auth.uid()
    ) returning * into v_budget_item;

  elsif v_kind = 'COMPOSITION' then
    select * into v_composition_version
    from public.cost_composition_versions
    where id = p_reference_id
      and organization_id = v_version.organization_id;
    if not found then raise exception 'Versão de composição SINAPI não encontrada.'; end if;

    select * into v_composition
    from public.cost_compositions
    where id = v_composition_version.composition_id
      and organization_id = v_version.organization_id
      and source_key = 'SINAPI_CAIXA';
    if not found then raise exception 'Composição SINAPI não encontrada.'; end if;

    insert into public.budget_items(
      organization_id, budget_version_id, section_id, composition_version_id,
      cost_type, item_category, code, description, unit, quantity,
      unit_cost, loss_rate, freight_rate, source, region, base_date,
      sequence, created_by
    ) values (
      v_version.organization_id, v_version.id, p_section_id,
      v_composition_version.id, 'DIRECT', 'SERVICE',
      v_composition.source_record_id, v_composition.name,
      v_composition.unit, p_quantity, v_composition_version.unit_cost,
      0, 0,
      format('SINAPI CAIXA/IBGE · %s · %s · %s',
        v_composition_version.region,
        to_char(v_composition_version.base_date, 'MM/YYYY'),
        case when v_composition_version.tax_relief then 'com desoneração' else 'sem desoneração' end),
      v_composition_version.region, v_composition_version.base_date,
      v_sequence, auth.uid()
    ) returning * into v_budget_item;
  else
    raise exception 'Tipo SINAPI inválido.';
  end if;

  perform public.calculate_budget_version(v_version.id);
  perform public.write_sinapi_budget_item_audit(v_budget_item.id);

  return v_budget_item;
end;
$function$;

revoke all on function public.add_sinapi_reference_to_budget(uuid,text,uuid,numeric,uuid) from public;
revoke all on function public.add_sinapi_reference_to_budget(uuid,text,uuid,numeric,uuid) from anon;
grant execute on function public.add_sinapi_reference_to_budget(uuid,text,uuid,numeric,uuid) to authenticated;
grant execute on function public.add_sinapi_reference_to_budget(uuid,text,uuid,numeric,uuid) to service_role;
