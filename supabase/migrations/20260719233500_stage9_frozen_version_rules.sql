begin;

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
      or new.bdi_model_version_id is distinct from old.bdi_model_version_id
      or new.markup_model_id is distinct from old.markup_model_id
      or new.administrative_fee_model_id is distinct from old.administrative_fee_model_id
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

-- O trigger já criado na migration anterior passa a usar esta versão refinada da função.

commit;
