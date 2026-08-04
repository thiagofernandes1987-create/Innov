begin;

insert into auth.users(id, email) values
  ('12000000-0000-0000-0000-000000000001', 'orcamentista-versao@example.com'),
  ('12000000-0000-0000-0000-000000000002', 'cliente-versao@example.com');

insert into public.organizations(id, legal_name, trade_name, created_by)
values (
  '22000000-0000-0000-0000-000000000001',
  'Organização Versão Teste Ltda.',
  'Organização Versão Teste',
  '12000000-0000-0000-0000-000000000001'
);

insert into public.organization_memberships(organization_id, user_id, role, active)
values
  ('22000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 'ORCAMENTISTA', true),
  ('22000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000002', 'CLIENTE', true);

insert into public.clients(id, organization_id, user_id, legal_name, created_by)
values (
  '32000000-0000-0000-0000-000000000001',
  '22000000-0000-0000-0000-000000000001',
  '12000000-0000-0000-0000-000000000002',
  'Cliente Versão Teste',
  '12000000-0000-0000-0000-000000000001'
);

select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"12000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;

insert into public.markup_models(
  id, organization_id, name, method, tax_rate, desired_margin_rate, created_by
) values (
  '43000000-0000-0000-0000-000000000002',
  '22000000-0000-0000-0000-000000000001',
  'BUDGET_VERSION:42000000-0000-0000-0000-000000000003',
  'DIVISOR', 0.10, 0.20,
  '12000000-0000-0000-0000-000000000001'
);

insert into public.budgets(
  id, organization_id, client_id, code, title, status, owner_id, created_by
) values (
  '41000000-0000-0000-0000-000000000003',
  '22000000-0000-0000-0000-000000000001',
  '32000000-0000-0000-0000-000000000001',
  'ORC-VERSAO-001',
  'Orçamento para continuidade',
  'APPROVAL_PENDING',
  '12000000-0000-0000-0000-000000000001',
  '12000000-0000-0000-0000-000000000001'
);

-- A fixture nasce editável. Seções e itens são montados primeiro; somente depois
-- a versão é congelada. Preparar conteúdo após `frozen_at` enfraqueceria o teste,
-- porque o trigger de imutabilidade deve bloquear exatamente essa mutação.
insert into public.budget_versions(
  id, organization_id, budget_id, version_number, base_date, status,
  markup_model_id, invested_capital, direct_cost, sale_price,
  frozen_at, created_by
) values (
  '42000000-0000-0000-0000-000000000003',
  '22000000-0000-0000-0000-000000000001',
  '41000000-0000-0000-0000-000000000003',
  1, current_date, 'APPROVAL_PENDING',
  '43000000-0000-0000-0000-000000000002',
  1000, 1000, 1428.57,
  null,
  '12000000-0000-0000-0000-000000000001'
);

update public.budgets
set current_version_id = '42000000-0000-0000-0000-000000000003'
where id = '41000000-0000-0000-0000-000000000003';

insert into public.budget_sections(
  id, organization_id, budget_version_id, code, title, sequence
) values (
  '45000000-0000-0000-0000-000000000001',
  '22000000-0000-0000-0000-000000000001',
  '42000000-0000-0000-0000-000000000003',
  '01', 'Serviços preliminares', 1
);

insert into public.budget_items(
  organization_id, budget_version_id, section_id,
  cost_type, item_category, code, description, unit,
  quantity, unit_cost, source, region, base_date, sequence, created_by
) values (
  '22000000-0000-0000-0000-000000000001',
  '42000000-0000-0000-0000-000000000003',
  '45000000-0000-0000-0000-000000000001',
  'DIRECT', 'LABOR', 'MO-REV-001', 'Mão de obra da revisão', 'h',
  10, 100, 'Custo interno', 'SP', current_date, 1,
  '12000000-0000-0000-0000-000000000001'
);

update public.budget_versions
set frozen_at = now()
where id = '42000000-0000-0000-0000-000000000003';

-- Não usa `\gset`: variáveis psql não são interpoladas dentro de um bloco DO.
-- A tabela temporária vive só nesta transação e torna a evidência acessível ao
-- PL/pgSQL sem acoplamento ao cliente que executa o arquivo.
create temporary table next_budget_version_result on commit drop as
select id as next_version_id
from public.create_next_budget_version(
  '41000000-0000-0000-0000-000000000003',
  'Revisão após congelamento'
);

do $$
declare
  v_source public.budget_versions;
  v_next public.budget_versions;
  v_current uuid;
  v_source_markup public.markup_models;
  v_next_markup public.markup_models;
begin
  select * into v_source
  from public.budget_versions
  where id = '42000000-0000-0000-0000-000000000003';

  select * into v_next
  from public.budget_versions
  where id = (select next_version_id from next_budget_version_result);

  select current_version_id into v_current
  from public.budgets
  where id = '41000000-0000-0000-0000-000000000003';

  select * into v_source_markup from public.markup_models where id = v_source.markup_model_id;
  select * into v_next_markup from public.markup_models where id = v_next.markup_model_id;

  if v_source.frozen_at is null
    or v_next.frozen_at is not null
    or v_next.version_number <> 2
    or v_next.status <> 'DRAFT'
    or v_current <> v_next.id
    or v_next_markup.id = v_source_markup.id
    or v_next_markup.tax_rate <> v_source_markup.tax_rate
    or v_next_markup.desired_margin_rate <> v_source_markup.desired_margin_rate then
    raise exception 'Nova versão não preservou imutabilidade e configuração: %', to_jsonb(v_next);
  end if;

  if (select count(*) from public.budget_sections where budget_version_id = v_next.id) <> 1
    or (select count(*) from public.budget_items where budget_version_id = v_next.id) <> 1
    or not exists (
      select 1 from public.budget_items
      where budget_version_id = v_next.id
        and item_category = 'LABOR'
        and section_id in (
          select id from public.budget_sections where budget_version_id = v_next.id and code = '01'
        )
    ) then
    raise exception 'Seções ou itens não foram copiados para a nova versão';
  end if;

  if not exists (
    select 1 from public.budget_validation_results
    where budget_version_id = v_next.id
      and code = 'CALCULATION_STALE'
      and severity = 'BLOCKING'
      and resolved_at is null
  ) then
    raise exception 'Nova versão copiada não exigiu recálculo';
  end if;

  raise notice 'Nova versão editável preserva histórico, itens, seção e markup independente.';
end;
$$;

rollback;
