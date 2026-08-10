begin;

-- Convergência do modelo de formação de preço.
--
-- Auditoria 2026-08-08 no banco ativo:
--   * 10 versões de orçamento;
--   * 0 usam bdi_model_version_id;
--   * 0 usam administrative_fee_model_id;
--   * 4 usam markup_model_id;
--   * bdi_models, bdi_model_versions e administrative_fee_models estão vazias.
--
-- O runtime atual cria/edita markup_models. Os modelos BDI/admin ficaram como
-- segunda arquitetura de pricing, sem porta de entrada, mas ainda eram copiados
-- entre versões e consultados como fallback pelo cálculo. Esta migration deixa
-- uma única fonte configurável: markup_models. Os campos bdi_rate/bdi_amount
-- permanecem no snapshot da versão por compatibilidade histórica e ficam zero
-- quando não há cálculo específico de BDI separado.
--
-- Guardas de deploy: nenhuma observação destrutiva da auditoria é aceita como
-- verdade eterna. Antes de retirar colunas/tabelas, revalidamos que a migration
-- anterior removeu a RPC antiga, que markup_models existe, que os modelos
-- legados continuam vazios e que nenhuma budget_version passou a usar os FKs
-- antigos. Qualquer mudança de estado aborta o deploy antes de qualquer DROP.
do $$
declare
  v_table text;
  v_has_rows boolean := false;
begin
  if to_regclass('public.markup_models') is null then
    raise exception
      'markup_models ausente; não é seguro convergir o pricing';
  end if;

  if to_regprocedure(
    'public.create_budget_version(uuid,text,public.budget_scenario_type)'
  ) is not null then
    raise exception
      'create_budget_version legada ainda existe; aplique a migration anterior antes da convergência de pricing';
  end if;

  foreach v_table in array array[
    'bdi_model_versions',
    'bdi_models',
    'administrative_fee_models'
  ]
  loop
    if to_regclass('public.' || v_table) is not null then
      execute format('select exists (select 1 from public.%I)', v_table)
        into v_has_rows;

      if v_has_rows then
        raise exception
          'A superfície legada % ganhou dados após a auditoria; migre/reclassifique antes do DROP',
          v_table;
      end if;
    end if;
  end loop;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'budget_versions'
      and column_name = 'bdi_model_version_id'
  ) then
    execute 'select exists (select 1 from public.budget_versions where bdi_model_version_id is not null)'
      into v_has_rows;

    if v_has_rows then
      raise exception
        'budget_versions passou a usar bdi_model_version_id; migre os dados antes da convergência';
    end if;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'budget_versions'
      and column_name = 'administrative_fee_model_id'
  ) then
    execute 'select exists (select 1 from public.budget_versions where administrative_fee_model_id is not null)'
      into v_has_rows;

    if v_has_rows then
      raise exception
        'budget_versions passou a usar administrative_fee_model_id; migre os dados antes da convergência';
    end if;
  end if;
end;
$$;

create or replace function public.calculate_budget_version_core(p_version_id uuid)
returns public.budget_versions
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.budget_versions;
  v_direct numeric(18,2);
  v_indirect numeric(18,2);
  v_fixed numeric(18,2);
  v_admin numeric(18,2);
  v_base numeric(18,2);
  v_factor numeric(18,8);
  v_price numeric(18,2);
  v_profit numeric(18,2);
  v_margin numeric(18,8);
  v_roi numeric(18,8);
  v_markup public.markup_models;
begin
  select * into v from public.budget_versions where id = p_version_id for update;
  if not found or not public.is_org_member(v.organization_id) then
    raise exception 'Acesso negado';
  end if;
  if v.frozen_at is not null then
    raise exception 'Versão congelada não pode ser recalculada';
  end if;

  select
    coalesce(sum(case when cost_type = 'DIRECT' then quantity * unit_cost * (1 + loss_rate + freight_rate) else 0 end),0),
    coalesce(sum(case when cost_type = 'INDIRECT' then quantity * unit_cost * (1 + loss_rate + freight_rate) else 0 end),0),
    coalesce(sum(case when cost_type = 'FIXED' then quantity * unit_cost else 0 end),0),
    coalesce(sum(case when cost_type = 'ADMINISTRATIVE' then quantity * unit_cost else 0 end),0)
  into v_direct, v_indirect, v_fixed, v_admin
  from public.budget_items
  where budget_version_id = p_version_id;

  v_base := round(v_direct + v_indirect + v_fixed + v_admin, 2);

  if v.markup_model_id is not null then
    select * into v_markup
    from public.markup_models
    where id = v.markup_model_id
      and organization_id = v.organization_id;

    if not found then
      raise exception 'Modelo de formação de preço não encontrado';
    end if;

    if v_markup.method = 'MULTIPLIER' then
      v_factor := coalesce(v_markup.multiplier, 1);
    else
      if (1 - v_markup.tax_rate - v_markup.commission_rate -
          v_markup.variable_expense_rate - v_markup.desired_margin_rate) <= 0 then
        raise exception 'Markup divisor inválido';
      end if;
      v_factor := round(1 / (1 - v_markup.tax_rate - v_markup.commission_rate -
        v_markup.variable_expense_rate - v_markup.desired_margin_rate), 8);
    end if;
  else
    v_factor := 1;
  end if;

  v_price := round(v_base * v_factor, 2);
  v_profit := round(v_price - v_base, 2);
  v_margin := case when v_price > 0 then round(v_profit / v_price, 8) else 0 end;
  v_roi := case when v.invested_capital > 0 then round(v_profit / v.invested_capital, 8) else null end;

  update public.budget_versions set
    status = 'CALCULATING',
    direct_cost = v_direct,
    indirect_cost = v_indirect,
    fixed_cost = v_fixed,
    administrative_fee = v_admin,
    bdi_rate = 0,
    bdi_amount = 0,
    markup_method = coalesce(v_markup.method, 'MULTIPLIER'),
    markup_factor = v_factor,
    sale_price = v_price,
    gross_margin_rate = v_margin,
    estimated_profit = v_profit,
    estimated_roi_rate = v_roi,
    calculation_memory = jsonb_build_object(
      'base_cost', v_base,
      'bdi_rate', 0,
      'markup_factor', v_factor,
      'formula_version', 'MARKUP_CANONICAL_V2',
      'calculated_at', now()
    )
  where id = p_version_id
  returning * into v;

  delete from public.budget_validation_results
  where budget_version_id = p_version_id and resolved_at is null;

  if v.invested_capital <= 0 then
    insert into public.budget_validation_results(organization_id,budget_version_id,code,severity,message,field_name)
    values(v.organization_id,p_version_id,'ROI_WITHOUT_CAPITAL','BLOCKING','O ROI exige capital investido maior que zero.','invested_capital');
  end if;
  if v.sale_price < (v.direct_cost + v.indirect_cost + v.fixed_cost + v.administrative_fee) then
    insert into public.budget_validation_results(organization_id,budget_version_id,code,severity,message)
    values(v.organization_id,p_version_id,'PRICE_BELOW_COST','BLOCKING','O preço de venda está abaixo do custo-base.');
  end if;
  if v.administrative_fee > 0 and coalesce((v.assumptions->>'administrative_fee_in_bdi')::boolean,false) then
    insert into public.budget_validation_results(organization_id,budget_version_id,code,severity,message,field_name)
    values(v.organization_id,p_version_id,'ADMIN_FEE_DUPLICATED','BLOCKING','Taxa administrativa duplicada com a formação de preço.','administrative_fee');
  end if;
  if v.fixed_cost > 0 and coalesce((v.assumptions->>'fixed_costs_in_bdi')::boolean,false) then
    insert into public.budget_validation_results(organization_id,budget_version_id,code,severity,message,field_name)
    values(v.organization_id,p_version_id,'FIXED_COST_DUPLICATED','BLOCKING','Custos fixos rateados e incluídos novamente na formação de preço.','fixed_cost');
  end if;

  perform public.write_audit(v.organization_id,'BUDGET_VERSION',p_version_id,'CALCULATE',v.calculation_memory);
  return v;
end;
$$;

create or replace function public.create_next_budget_version(
  p_budget_id uuid,
  p_change_summary text default 'Nova revisão do orçamento'::text
)
returns public.budget_versions
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
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
  select * into v_budget from public.budgets where id = p_budget_id for update;
  if not found then raise exception 'Orçamento não encontrado.'; end if;
  if not public.has_org_role(v_budget.organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR','ORCAMENTISTA','FINANCEIRO']::public.org_role[]) then
    raise exception 'Alçada insuficiente para criar nova versão.';
  end if;
  if v_budget.current_version_id is null then raise exception 'O orçamento não possui versão atual.'; end if;

  select * into v_source from public.budget_versions where id = v_budget.current_version_id for share;
  if not found then raise exception 'A versão atual do orçamento não foi encontrada.'; end if;
  if v_source.frozen_at is null then raise exception 'A versão atual ainda é editável; não é necessário criar outra versão.'; end if;

  select coalesce(max(version_number),0)+1 into v_next_number
  from public.budget_versions where budget_id = v_budget.id;

  if v_source.markup_model_id is not null then
    select * into v_markup from public.markup_models where id = v_source.markup_model_id;
    if found then
      insert into public.markup_models(
        organization_id,name,method,multiplier,tax_rate,commission_rate,
        variable_expense_rate,desired_margin_rate,active,created_by
      ) values (
        v_budget.organization_id,'BUDGET_VERSION:'||v_new_version_id,
        v_markup.method,v_markup.multiplier,v_markup.tax_rate,v_markup.commission_rate,
        v_markup.variable_expense_rate,v_markup.desired_margin_rate,true,auth.uid()
      ) returning id into v_new_markup_id;
    end if;
  end if;

  insert into public.budget_versions(
    id,organization_id,budget_id,version_number,scenario_type,change_summary,
    base_date,status,markup_model_id,invested_capital,maximum_cash_requirement,
    assumptions,reference_snapshot_id,created_by
  ) values (
    v_new_version_id,v_budget.organization_id,v_budget.id,v_next_number,
    v_source.scenario_type,coalesce(nullif(trim(p_change_summary),''),'Nova revisão do orçamento'),
    current_date,'DRAFT',v_new_markup_id,v_source.invested_capital,
    v_source.maximum_cash_requirement,v_source.assumptions,
    v_source.reference_snapshot_id,auth.uid()
  ) returning * into v_new;

  for r in
    with recursive section_tree as (
      select section.*,0 as depth
      from public.budget_sections section
      where section.budget_version_id=v_source.id and section.parent_id is null
      union all
      select child.*,parent.depth+1
      from public.budget_sections child
      join section_tree parent on parent.id=child.parent_id
      where child.budget_version_id=v_source.id
    )
    select * from section_tree order by depth,sequence,code,id
  loop
    v_new_parent_id := case when r.parent_id is null then null else nullif(v_section_map->>r.parent_id::text,'')::uuid end;
    insert into public.budget_sections(organization_id,budget_version_id,parent_id,code,title,sequence)
    values(v_budget.organization_id,v_new.id,v_new_parent_id,r.code,r.title,r.sequence)
    returning id into v_new_section_id;
    v_section_map := v_section_map || jsonb_build_object(r.id::text,v_new_section_id);
  end loop;

  insert into public.budget_items(
    organization_id,budget_version_id,section_id,catalog_item_id,composition_version_id,
    cost_type,item_category,code,description,unit,quantity,unit_cost,loss_rate,
    freight_rate,source,region,base_date,valid_until,sequence,created_by
  )
  select
    v_budget.organization_id,v_new.id,
    case when item.section_id is null then null else nullif(v_section_map->>item.section_id::text,'')::uuid end,
    item.catalog_item_id,item.composition_version_id,item.cost_type,item.item_category,
    item.code,item.description,item.unit,item.quantity,item.unit_cost,item.loss_rate,
    item.freight_rate,item.source,item.region,item.base_date,item.valid_until,item.sequence,auth.uid()
  from public.budget_items item
  where item.budget_version_id=v_source.id;

  insert into public.budget_scenarios(
    organization_id,budget_id,budget_version_id,name,type,assumptions,created_by
  )
  select v_budget.organization_id,v_budget.id,v_new.id,scenario.name,scenario.type,scenario.assumptions,auth.uid()
  from public.budget_scenarios scenario
  where scenario.budget_version_id=v_source.id;

  update public.budgets
  set current_version_id=v_new.id,status='DRAFT',updated_at=now()
  where id=v_budget.id;

  perform public.refresh_budget_readiness_validations(v_new.id);
  perform public.write_audit(
    v_budget.organization_id,'BUDGET_VERSION',v_new.id,'CREATE_NEXT_VERSION',
    jsonb_build_object(
      'budgetId',v_budget.id,
      'sourceVersionId',v_source.id,
      'sourceVersionNumber',v_source.version_number,
      'newVersionNumber',v_new.version_number,
      'copiedItems',(select count(*) from public.budget_items where budget_version_id=v_new.id)
    )
  );
  return v_new;
end;
$$;

create or replace function public.prevent_frozen_budget_version_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.frozen_at is not null then
      raise exception 'Versão congelada é imutável; crie uma nova versão';
    end if;
    return old;
  end if;

  if old.frozen_at is not null then
    if new.organization_id is distinct from old.organization_id
      or new.budget_id is distinct from old.budget_id
      or new.version_number is distinct from old.version_number
      or new.scenario_type is distinct from old.scenario_type
      or new.change_summary is distinct from old.change_summary
      or new.base_date is distinct from old.base_date
      or new.markup_model_id is distinct from old.markup_model_id
      or new.direct_cost is distinct from old.direct_cost
      or new.indirect_cost is distinct from old.indirect_cost
      or new.fixed_cost is distinct from old.fixed_cost
      or new.administrative_fee is distinct from old.administrative_fee
      or new.bdi_rate is distinct from old.bdi_rate
      or new.bdi_amount is distinct from old.bdi_amount
      or new.markup_method is distinct from old.markup_method
      or new.markup_factor is distinct from old.markup_factor
      or new.sale_price is distinct from old.sale_price
      or new.gross_margin_rate is distinct from old.gross_margin_rate
      or new.estimated_profit is distinct from old.estimated_profit
      or new.invested_capital is distinct from old.invested_capital
      or new.estimated_roi_rate is distinct from old.estimated_roi_rate
      or new.payback_month is distinct from old.payback_month
      or new.maximum_cash_requirement is distinct from old.maximum_cash_requirement
      or new.assumptions is distinct from old.assumptions
      or new.calculation_memory is distinct from old.calculation_memory
      or new.frozen_at is distinct from old.frozen_at
      or new.created_by is distinct from old.created_by
      or new.created_at is distinct from old.created_at
    then
      raise exception 'Valores de versão congelada são imutáveis; apenas status e metadados de aprovação podem avançar';
    end if;
  end if;

  return new;
end;
$$;

alter table public.budget_versions
  drop constraint if exists budget_versions_bdi_model_version_id_fkey,
  drop constraint if exists budget_versions_administrative_fee_model_id_fkey;

alter table public.budget_versions
  drop column if exists bdi_model_version_id,
  drop column if exists administrative_fee_model_id;

alter table public.bdi_models
  drop constraint if exists bdi_models_current_version_fk;

drop table if exists public.bdi_model_versions;
drop table if exists public.bdi_models;
drop table if exists public.administrative_fee_models;

commit;
