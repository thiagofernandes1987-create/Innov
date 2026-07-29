begin;

insert into auth.users(id, email) values
  ('11000000-0000-0000-0000-000000000001', 'orcamentista@example.com'),
  ('11000000-0000-0000-0000-000000000002', 'direcao@example.com'),
  ('11000000-0000-0000-0000-000000000003', 'cliente@example.com');

insert into public.organizations(id, legal_name, trade_name, created_by)
values (
  '21000000-0000-0000-0000-000000000001',
  'Organização Orçamento Teste Ltda.',
  'Organização Orçamento Teste',
  '11000000-0000-0000-0000-000000000002'
);

insert into public.organization_memberships(organization_id, user_id, role, active)
values
  ('21000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'ORCAMENTISTA', true),
  ('21000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000002', 'DIRECAO', true),
  ('21000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000003', 'CLIENTE', true);

insert into public.clients(id, organization_id, user_id, legal_name, email, created_by)
values (
  '31000000-0000-0000-0000-000000000001',
  '21000000-0000-0000-0000-000000000001',
  '11000000-0000-0000-0000-000000000003',
  'Cliente Orçamento Teste',
  'cliente@example.com',
  '11000000-0000-0000-0000-000000000001'
);

select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"11000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;

insert into public.budgets(
  id, organization_id, client_id, code, title, owner_id, created_by
) values (
  '41000000-0000-0000-0000-000000000001',
  '21000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000001',
  'ORC-VAZIO-001',
  'Orçamento vazio',
  '11000000-0000-0000-0000-000000000001',
  '11000000-0000-0000-0000-000000000001'
);

insert into public.budget_versions(
  id, organization_id, budget_id, version_number, base_date,
  invested_capital, created_by
) values (
  '42000000-0000-0000-0000-000000000001',
  '21000000-0000-0000-0000-000000000001',
  '41000000-0000-0000-0000-000000000001',
  1,
  current_date,
  1,
  '11000000-0000-0000-0000-000000000001'
);

update public.budgets
set current_version_id = '42000000-0000-0000-0000-000000000001'
where id = '41000000-0000-0000-0000-000000000001';

select public.calculate_budget_version('42000000-0000-0000-0000-000000000001');

do $$
begin
  begin
    perform public.freeze_budget_version('42000000-0000-0000-0000-000000000001');
    raise exception 'Orçamento vazio foi congelado';
  exception
    when others then
      if sqlerrm = 'Orçamento vazio foi congelado' then raise; end if;
  end;

  if not exists (
    select 1
    from public.budget_validation_results
    where budget_version_id = '42000000-0000-0000-0000-000000000001'
      and code = 'BUDGET_WITHOUT_ITEMS'
      and severity = 'BLOCKING'
      and resolved_at is null
  ) then
    raise exception 'Validação de orçamento vazio não foi criada';
  end if;

  raise notice 'Orçamento vazio bloqueado antes da aprovação.';
end;
$$;

insert into public.markup_models(
  id, organization_id, name, method,
  tax_rate, commission_rate, variable_expense_rate, desired_margin_rate,
  created_by
) values (
  '43000000-0000-0000-0000-000000000001',
  '21000000-0000-0000-0000-000000000001',
  'BUDGET_VERSION:42000000-0000-0000-0000-000000000002',
  'DIVISOR',
  0.10, 0, 0, 0.20,
  '11000000-0000-0000-0000-000000000001'
);

insert into public.budgets(
  id, organization_id, client_id, code, title, owner_id, created_by
) values (
  '41000000-0000-0000-0000-000000000002',
  '21000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000001',
  'ORC-COMPLETO-001',
  'Orçamento completo',
  '11000000-0000-0000-0000-000000000001',
  '11000000-0000-0000-0000-000000000001'
);

insert into public.budget_versions(
  id, organization_id, budget_id, version_number, base_date,
  markup_model_id, invested_capital, created_by
) values (
  '42000000-0000-0000-0000-000000000002',
  '21000000-0000-0000-0000-000000000001',
  '41000000-0000-0000-0000-000000000002',
  1,
  current_date,
  '43000000-0000-0000-0000-000000000001',
  3300,
  '11000000-0000-0000-0000-000000000001'
);

update public.budgets
set current_version_id = '42000000-0000-0000-0000-000000000002'
where id = '41000000-0000-0000-0000-000000000002';

insert into public.budget_items(
  organization_id, budget_version_id, cost_type, item_category,
  code, description, unit, quantity, unit_cost,
  source, region, base_date, sequence, created_by
) values
(
  '21000000-0000-0000-0000-000000000001',
  '42000000-0000-0000-0000-000000000002',
  'DIRECT', 'MATERIAL', 'MAT-001', 'Material', 'un', 10, 100,
  'Cotação fornecedor', 'SP', current_date, 1,
  '11000000-0000-0000-0000-000000000001'
),
(
  '21000000-0000-0000-0000-000000000001',
  '42000000-0000-0000-0000-000000000002',
  'DIRECT', 'LABOR', 'MO-001', 'Mão de obra', 'h', 20, 50,
  'Convenção e custo interno', 'SP', current_date, 2,
  '11000000-0000-0000-0000-000000000001'
),
(
  '21000000-0000-0000-0000-000000000001',
  '42000000-0000-0000-0000-000000000002',
  'FIXED', 'FIXED_COST', 'FIX-001', 'Canteiro', 'mês', 2, 500,
  'Contrato mensal', 'SP', current_date, 3,
  '11000000-0000-0000-0000-000000000001'
),
(
  '21000000-0000-0000-0000-000000000001',
  '42000000-0000-0000-0000-000000000002',
  'ADMINISTRATIVE', 'SERVICE', 'ADM-001', 'Administração local', 'vb', 1, 300,
  'Planejamento interno', 'SP', current_date, 4,
  '11000000-0000-0000-0000-000000000001'
);

select public.calculate_budget_version('42000000-0000-0000-0000-000000000002');
select public.freeze_budget_version('42000000-0000-0000-0000-000000000002');

do $$
declare
  v public.budget_versions;
  v_categories text[];
begin
  select * into v
  from public.budget_versions
  where id = '42000000-0000-0000-0000-000000000002';

  select array_agg(item_category order by sequence)
  into v_categories
  from public.budget_items
  where budget_version_id = v.id;

  if v.direct_cost <> 2000
    or v.fixed_cost <> 1000
    or v.administrative_fee <> 300
    or v.markup_factor <> 1.42857143
    or v.sale_price <> 4714.29
    or v.status <> 'APPROVAL_PENDING'
    or v_categories <> array['MATERIAL','LABOR','FIXED_COST','SERVICE'] then
    raise exception 'Composição ou formação de preço divergente: %', to_jsonb(v);
  end if;

  if exists (
    select 1
    from public.budget_validation_results
    where budget_version_id = v.id
      and severity = 'BLOCKING'
      and resolved_at is null
  ) then
    raise exception 'Orçamento completo permaneceu bloqueado';
  end if;

  raise notice 'Material, mão de obra, custo fixo, impostos e margem aprovados.';
end;
$$;

insert into public.budget_approvals(
  id, organization_id, budget_version_id, approval_type,
  status, requested_by, requires_aal2
) values (
  '44000000-0000-0000-0000-000000000001',
  '21000000-0000-0000-0000-000000000001',
  '42000000-0000-0000-0000-000000000002',
  'STANDARD_APPROVAL',
  'PENDING',
  '11000000-0000-0000-0000-000000000001',
  false
);

do $$
begin
  begin
    perform public.decide_budget_approval(
      '44000000-0000-0000-0000-000000000001',
      'APPROVED',
      'Tentativa de autoaprovação'
    );
    raise exception 'Autoaprovação foi aceita';
  exception
    when others then
      if sqlerrm = 'Autoaprovação foi aceita' then raise; end if;
  end;
  raise notice 'Autoaprovação de orçamento bloqueada.';
end;
$$;

reset role;
select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"11000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;

select public.decide_budget_approval(
  '44000000-0000-0000-0000-000000000001',
  'APPROVED',
  'Aprovação independente da direção'
);

do $$
begin
  if not exists (
    select 1
    from public.budget_approvals
    where id = '44000000-0000-0000-0000-000000000001'
      and status = 'APPROVED'
      and approver_id = '11000000-0000-0000-0000-000000000002'
  ) then
    raise exception 'Aprovação independente não foi registrada';
  end if;
  raise notice 'Aprovação independente registrada.';
end;
$$;

rollback;
