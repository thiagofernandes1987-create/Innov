-- VACINA-037: versão congelada permanece imutável, mas o usuário precisa de
-- uma porta de entrada explícita para continuar o orçamento em nova versão.

create or replace function public.create_next_budget_version(
  p_budget_id uuid,
  p_change_summary text default 'Nova revisão do orçamento'
)
returns public.budget_versions
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_budget public.budgets;
  v_source public.budget_versions;
  v_new public.budget_versions;
  v_markup public.markup_models;
  v_new_markup_id uuid;
  v_new_version_id uuid := gen_random_uuid();
  v_next_number integer;
  v_section_map jsonb := '{}'::jsonb;
  v_new_section_id uuid;
  v_new_parent_id uuid;
  r record;
begin
  select * into v_budget
  from public.budgets
  where id = p_budget_id
  for update;

  if not found then
    raise exception 'Orçamento não encontrado.';
  end if;

  if not public.has_org_role(
    v_budget.organization_id,
    array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR','ORCAMENTISTA','FINANCEIRO']::public.org_role[]
  ) then
    raise exception 'Alçada insuficiente para criar nova versão.';
  end if;

  if v_budget.current_version_id is null then
    raise exception 'O orçamento não possui versão atual.';
  end if;

  select * into v_source
  from public.budget_versions
  where id = v_budget.current_version_id
  for share;

  if not found then
    raise exception 'A versão atual do orçamento não foi encontrada.';
  end if;

  if v_source.frozen_at is null then
    raise exception 'A versão atual ainda é editável; não é necessário criar outra versão.';
  end if;

  select coalesce(max(version_number), 0) + 1
  into v_next_number
  from public.budget_versions
  where budget_id = v_budget.id;

  if v_source.markup_model_id is not null then
    select * into v_markup
    from public.markup_models
    where id = v_source.markup_model_id;

    if found then
      insert into public.markup_models(
        organization_id, name, method, multiplier,
        tax_rate, commission_rate, variable_expense_rate, desired_margin_rate,
        active, created_by
      ) values (
        v_budget.organization_id,
        'BUDGET_VERSION:' || v_new_version_id,
        v_markup.method,
        v_markup.multiplier,
        v_markup.tax_rate,
        v_markup.commission_rate,
        v_markup.variable_expense_rate,
        v_markup.desired_margin_rate,
        true,
        auth.uid()
      ) returning id into v_new_markup_id;
    end if;
  end if;

  insert into public.budget_versions(
    id, organization_id, budget_id, version_number,
    scenario_type, change_summary, base_date, status,
    bdi_model_version_id, markup_model_id, administrative_fee_model_id,
    invested_capital, maximum_cash_requirement, assumptions,
    reference_snapshot_id, created_by
  ) values (
    v_new_version_id,
    v_budget.organization_id,
    v_budget.id,
    v_next_number,
    v_source.scenario_type,
    coalesce(nullif(trim(p_change_summary), ''), 'Nova revisão do orçamento'),
    current_date,
    'DRAFT',
    v_source.bdi_model_version_id,
    v_new_markup_id,
    v_source.administrative_fee_model_id,
    v_source.invested_capital,
    v_source.maximum_cash_requirement,
    v_source.assumptions,
    v_source.reference_snapshot_id,
    auth.uid()
  ) returning * into v_new;

  for r in
    with recursive section_tree as (
      select section.*, 0 as depth
      from public.budget_sections section
      where section.budget_version_id = v_source.id
        and section.parent_id is null
      union all
      select child.*, parent.depth + 1
      from public.budget_sections child
      join section_tree parent on parent.id = child.parent_id
      where child.budget_version_id = v_source.id
    )
    select * from section_tree order by depth, sequence, code, id
  loop
    v_new_parent_id := case
      when r.parent_id is null then null
      else nullif(v_section_map ->> r.parent_id::text, '')::uuid
    end;

    insert into public.budget_sections(
      organization_id, budget_version_id, parent_id,
      code, title, sequence
    ) values (
      v_budget.organization_id, v_new.id, v_new_parent_id,
      r.code, r.title, r.sequence
    ) returning id into v_new_section_id;

    v_section_map := v_section_map || jsonb_build_object(r.id::text, v_new_section_id);
  end loop;

  insert into public.budget_items(
    organization_id, budget_version_id, section_id,
    catalog_item_id, composition_version_id,
    cost_type, item_category, code, description, unit,
    quantity, unit_cost, loss_rate, freight_rate,
    source, region, base_date, valid_until, sequence, created_by
  )
  select
    v_budget.organization_id,
    v_new.id,
    case
      when item.section_id is null then null
      else nullif(v_section_map ->> item.section_id::text, '')::uuid
    end,
    item.catalog_item_id,
    item.composition_version_id,
    item.cost_type,
    item.item_category,
    item.code,
    item.description,
    item.unit,
    item.quantity,
    item.unit_cost,
    item.loss_rate,
    item.freight_rate,
    item.source,
    item.region,
    item.base_date,
    item.valid_until,
    item.sequence,
    auth.uid()
  from public.budget_items item
  where item.budget_version_id = v_source.id;

  insert into public.budget_scenarios(
    organization_id, budget_id, budget_version_id,
    name, type, assumptions, created_by
  )
  select
    v_budget.organization_id,
    v_budget.id,
    v_new.id,
    scenario.name,
    scenario.type,
    scenario.assumptions,
    auth.uid()
  from public.budget_scenarios scenario
  where scenario.budget_version_id = v_source.id;

  update public.budgets
  set current_version_id = v_new.id,
      status = 'DRAFT',
      updated_at = now()
  where id = v_budget.id;

  perform public.refresh_budget_readiness_validations(v_new.id);

  perform public.write_audit(
    v_budget.organization_id,
    'BUDGET_VERSION',
    v_new.id,
    'CREATE_NEXT_VERSION',
    jsonb_build_object(
      'budgetId', v_budget.id,
      'sourceVersionId', v_source.id,
      'sourceVersionNumber', v_source.version_number,
      'newVersionNumber', v_new.version_number,
      'copiedItems', (
        select count(*) from public.budget_items where budget_version_id = v_new.id
      )
    )
  );

  return v_new;
end;
$function$;

revoke all on function public.create_next_budget_version(uuid, text) from public;
revoke all on function public.create_next_budget_version(uuid, text) from anon;
grant execute on function public.create_next_budget_version(uuid, text) to authenticated;
grant execute on function public.create_next_budget_version(uuid, text) to service_role;
