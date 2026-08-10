-- Projeto RH — primeira fatia executável
-- Pessoas/vínculos + rubricas + competência + entradas + cálculo persistido.

insert into public.app_modules(key,name,description,category,display_order,version,is_core,default_enabled,active)
select 'rh','Recursos Humanos e DP','Empregados, admissão, jornada, folha, SST e obrigações digitais.','Recursos Humanos',175,'0.1.0',false,true,true
where not exists(select 1 from public.app_modules where key='rh');

insert into public.app_module_dependencies(module_id,depends_on_module_id,required)
select rh.id, dep.id, true
from public.app_modules rh
join public.app_modules dep on dep.key in ('documentos','financeiro')
where rh.key='rh'
and not exists(
  select 1 from public.app_module_dependencies d
  where d.module_id=rh.id and d.depends_on_module_id=dep.id
);

create table if not exists public.rh_people(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  full_name text not null check(length(trim(full_name))>=2),
  preferred_name text,
  cpf text,
  birth_date date,
  email text,
  phone text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(cpf is null or cpf ~ '^[0-9]{11}$')
);
create unique index if not exists rh_people_org_cpf_uq on public.rh_people(organization_id,cpf) where cpf is not null;
create index if not exists rh_people_org_name_idx on public.rh_people(organization_id,full_name);

create table if not exists public.rh_workers(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  person_id uuid not null references public.rh_people(id) on delete restrict,
  worker_code text not null,
  status text not null default 'ACTIVE' check(status in ('DRAFT','ACTIVE','SUSPENDED','TERMINATED')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,worker_code),
  unique(organization_id,person_id)
);
create index if not exists rh_workers_org_status_idx on public.rh_workers(organization_id,status);

create table if not exists public.rh_employments(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  worker_id uuid not null references public.rh_workers(id) on delete restrict,
  registration_number text not null,
  employment_type text not null default 'EMPLOYEE' check(employment_type in ('EMPLOYEE','TSV','APPRENTICE','INTERN','DIRECTOR','OTHER')),
  admission_date date not null,
  termination_date date,
  status text not null default 'ACTIVE' check(status in ('DRAFT','ACTIVE','SUSPENDED','TERMINATED')),
  base_salary numeric(14,2) not null default 0 check(base_salary>=0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,registration_number),
  check(termination_date is null or termination_date>=admission_date)
);
create index if not exists rh_employments_org_status_idx on public.rh_employments(organization_id,status);
create index if not exists rh_employments_worker_idx on public.rh_employments(worker_id);

create table if not exists public.rh_rubrics(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code text not null,
  name text not null,
  description text,
  payroll_kind text not null check(payroll_kind in ('EARNING','DEDUCTION','INFORMATION','BASE','EMPLOYER_CHARGE')),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,code)
);

create table if not exists public.rh_rubric_versions(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  rubric_id uuid not null references public.rh_rubrics(id) on delete restrict,
  version integer not null default 1 check(version>0),
  valid_from date not null,
  valid_to date,
  formula_type text not null check(formula_type in ('MANUAL','FIXED','QUANTITY_X_RATE','PERCENT_OF_AMOUNT')),
  fixed_value numeric(14,4),
  percent_value numeric(9,4),
  calculation_priority integer not null default 100,
  esocial_nature_code text,
  cod_inc_cp text,
  cod_inc_irrf text,
  cod_inc_fgts text,
  accounting_debit text,
  accounting_credit text,
  status text not null default 'PUBLISHED' check(status in ('DRAFT','PUBLISHED','SUPERSEDED','CLOSED')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(rubric_id,version),
  check(valid_to is null or valid_to>=valid_from),
  check(formula_type<>'FIXED' or fixed_value is not null),
  check(formula_type<>'PERCENT_OF_AMOUNT' or percent_value is not null)
);
create index if not exists rh_rubric_versions_active_idx on public.rh_rubric_versions(organization_id,rubric_id,valid_from,valid_to);

create table if not exists public.rh_payroll_periods(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  reference_month date not null,
  processing_type text not null default 'MONTHLY' check(processing_type in ('MONTHLY','ADVANCE','VACATION','THIRTEENTH_ADVANCE','THIRTEENTH_FINAL','SUPPLEMENTARY','RETROACTIVE','TERMINATION')),
  pay_date date,
  status text not null default 'OPEN' check(status in ('OPEN','CALCULATING','CALCULATED','REVIEW','CLOSED','REOPENED','CANCELLED')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,reference_month,processing_type),
  check(date_trunc('month',reference_month)::date=reference_month)
);

create table if not exists public.rh_payroll_inputs(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  period_id uuid not null references public.rh_payroll_periods(id) on delete restrict,
  employment_id uuid not null references public.rh_employments(id) on delete restrict,
  rubric_version_id uuid not null references public.rh_rubric_versions(id) on delete restrict,
  quantity numeric(14,4),
  unit_rate numeric(14,6),
  amount numeric(14,4),
  source_type text not null default 'MANUAL' check(source_type in ('MANUAL','CONTRACT','TIME','VACATION','LEAVE','BENEFIT','TERMINATION','IMPORT')),
  source_ref text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists rh_payroll_inputs_period_emp_idx on public.rh_payroll_inputs(period_id,employment_id);

create table if not exists public.rh_payroll_runs(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  period_id uuid not null references public.rh_payroll_periods(id) on delete restrict,
  run_number integer not null,
  status text not null default 'RUNNING' check(status in ('RUNNING','COMPLETED','FAILED','SUPERSEDED')),
  input_count integer not null default 0,
  gross_total numeric(16,2) not null default 0,
  deduction_total numeric(16,2) not null default 0,
  net_total numeric(16,2) not null default 0,
  started_by uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(period_id,run_number)
);

create table if not exists public.rh_payroll_worker_results(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  run_id uuid not null references public.rh_payroll_runs(id) on delete cascade,
  employment_id uuid not null references public.rh_employments(id) on delete restrict,
  gross_amount numeric(16,2) not null default 0,
  deduction_amount numeric(16,2) not null default 0,
  net_amount numeric(16,2) not null default 0,
  unique(run_id,employment_id)
);

create table if not exists public.rh_payroll_result_lines(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  worker_result_id uuid not null references public.rh_payroll_worker_results(id) on delete cascade,
  rubric_version_id uuid not null references public.rh_rubric_versions(id) on delete restrict,
  input_id uuid references public.rh_payroll_inputs(id) on delete set null,
  calculation_order integer not null,
  base_amount numeric(16,4),
  quantity numeric(14,4),
  unit_rate numeric(14,6),
  amount numeric(16,2) not null,
  trace jsonb not null default '{}'::jsonb
);
create index if not exists rh_payroll_result_lines_result_idx on public.rh_payroll_result_lines(worker_result_id,calculation_order);

create table if not exists public.rh_payroll_closures(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  period_id uuid not null references public.rh_payroll_periods(id) on delete restrict,
  run_id uuid not null references public.rh_payroll_runs(id) on delete restrict,
  closed_by uuid references auth.users(id) on delete set null,
  reason text,
  closed_at timestamptz not null default now()
);

alter table public.rh_people enable row level security;
alter table public.rh_workers enable row level security;
alter table public.rh_employments enable row level security;
alter table public.rh_rubrics enable row level security;
alter table public.rh_rubric_versions enable row level security;
alter table public.rh_payroll_periods enable row level security;
alter table public.rh_payroll_inputs enable row level security;
alter table public.rh_payroll_runs enable row level security;
alter table public.rh_payroll_worker_results enable row level security;
alter table public.rh_payroll_result_lines enable row level security;
alter table public.rh_payroll_closures enable row level security;

-- O app continua sendo a primeira barreira de capability; o banco impõe tenant.
-- Funções críticas abaixo reforçam capability explicitamente.
do $$
declare t text;
begin
  foreach t in array array['rh_people','rh_workers','rh_employments','rh_rubrics','rh_rubric_versions','rh_payroll_periods','rh_payroll_inputs','rh_payroll_runs','rh_payroll_worker_results','rh_payroll_result_lines','rh_payroll_closures']
  loop
    execute format('drop policy if exists %I on public.%I','rh_tenant_read',t);
    execute format('drop policy if exists %I on public.%I','rh_tenant_write',t);
    execute format('create policy %I on public.%I for select to authenticated using (exists(select 1 from public.organization_memberships m where m.organization_id=%I.organization_id and m.user_id=auth.uid() and m.active=true))','rh_tenant_read',t,t);
    execute format('create policy %I on public.%I for all to authenticated using (exists(select 1 from public.organization_memberships m where m.organization_id=%I.organization_id and m.user_id=auth.uid() and m.active=true)) with check (exists(select 1 from public.organization_memberships m where m.organization_id=%I.organization_id and m.user_id=auth.uid() and m.active=true))','rh_tenant_write',t,t,t);
  end loop;
end$$;

create or replace function public.create_rh_worker(
  p_organization_id uuid,
  p_full_name text,
  p_preferred_name text,
  p_cpf text,
  p_birth_date date,
  p_email text,
  p_phone text,
  p_worker_code text,
  p_registration_number text,
  p_employment_type text,
  p_admission_date date,
  p_base_salary numeric
) returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_person uuid; v_worker uuid; v_employment uuid;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if not public.has_module_permission(p_organization_id,'rh','EDIT',null,null) then raise exception 'FORBIDDEN'; end if;
  if trim(coalesce(p_full_name,''))='' then raise exception 'Nome obrigatório'; end if;
  if p_cpf is not null and p_cpf !~ '^[0-9]{11}$' then raise exception 'CPF deve conter 11 dígitos'; end if;
  if p_admission_date is null then raise exception 'Data de admissão obrigatória'; end if;

  insert into public.rh_people(organization_id,full_name,preferred_name,cpf,birth_date,email,phone,created_by)
  values(p_organization_id,trim(p_full_name),nullif(trim(coalesce(p_preferred_name,'')),''),nullif(p_cpf,''),p_birth_date,nullif(trim(coalesce(p_email,'')),''),nullif(trim(coalesce(p_phone,'')),''),auth.uid())
  returning id into v_person;

  insert into public.rh_workers(organization_id,person_id,worker_code,status,created_by)
  values(p_organization_id,v_person,trim(p_worker_code),'ACTIVE',auth.uid()) returning id into v_worker;

  insert into public.rh_employments(organization_id,worker_id,registration_number,employment_type,admission_date,status,base_salary,created_by)
  values(p_organization_id,v_worker,trim(p_registration_number),coalesce(nullif(p_employment_type,''),'EMPLOYEE'),p_admission_date,'ACTIVE',coalesce(p_base_salary,0),auth.uid())
  returning id into v_employment;
  return v_employment;
end$$;

create or replace function public.run_rh_payroll(p_period_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_org uuid; v_status text; v_run uuid; v_run_number integer;
begin
  select organization_id,status into v_org,v_status from public.rh_payroll_periods where id=p_period_id for update;
  if v_org is null then raise exception 'Período não encontrado'; end if;
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if not public.has_module_permission(v_org,'rh','EDIT',null,null) then raise exception 'FORBIDDEN'; end if;
  if v_status not in ('OPEN','CALCULATED','REVIEW','REOPENED') then raise exception 'Período não permite cálculo: %',v_status; end if;

  update public.rh_payroll_periods set status='CALCULATING',updated_at=now() where id=p_period_id;
  select coalesce(max(run_number),0)+1 into v_run_number from public.rh_payroll_runs where period_id=p_period_id;
  update public.rh_payroll_runs set status='SUPERSEDED' where period_id=p_period_id and status='COMPLETED';
  insert into public.rh_payroll_runs(organization_id,period_id,run_number,status,input_count,started_by)
  values(v_org,p_period_id,v_run_number,'RUNNING',(select count(*) from public.rh_payroll_inputs where period_id=p_period_id),auth.uid()) returning id into v_run;

  insert into public.rh_payroll_worker_results(organization_id,run_id,employment_id)
  select v_org,v_run,i.employment_id from public.rh_payroll_inputs i where i.period_id=p_period_id group by i.employment_id;

  insert into public.rh_payroll_result_lines(organization_id,worker_result_id,rubric_version_id,input_id,calculation_order,base_amount,quantity,unit_rate,amount,trace)
  select v_org,wr.id,i.rubric_version_id,i.id,rv.calculation_priority,
    case when rv.formula_type='PERCENT_OF_AMOUNT' then coalesce(i.amount,0) else null end,
    i.quantity,i.unit_rate,
    round((case rv.formula_type
      when 'MANUAL' then coalesce(i.amount,0)
      when 'FIXED' then coalesce(rv.fixed_value,0)
      when 'QUANTITY_X_RATE' then coalesce(i.quantity,0)*coalesce(i.unit_rate,0)
      when 'PERCENT_OF_AMOUNT' then coalesce(i.amount,0)*coalesce(rv.percent_value,0)/100
      else 0 end)::numeric,2),
    jsonb_build_object('formulaType',rv.formula_type,'inputAmount',i.amount,'quantity',i.quantity,'unitRate',i.unit_rate,'fixedValue',rv.fixed_value,'percentValue',rv.percent_value)
  from public.rh_payroll_inputs i
  join public.rh_rubric_versions rv on rv.id=i.rubric_version_id
  join public.rh_payroll_worker_results wr on wr.run_id=v_run and wr.employment_id=i.employment_id
  join public.rh_payroll_periods p on p.id=i.period_id
  where i.period_id=p_period_id
    and rv.status='PUBLISHED'
    and rv.valid_from<=p.reference_month
    and (rv.valid_to is null or rv.valid_to>=p.reference_month)
  order by i.employment_id,rv.calculation_priority,i.created_at;

  update public.rh_payroll_worker_results wr set
    gross_amount=coalesce(x.gross,0),
    deduction_amount=coalesce(x.deductions,0),
    net_amount=coalesce(x.gross,0)-coalesce(x.deductions,0)
  from (
    select l.worker_result_id,
      sum(case when r.payroll_kind='EARNING' then l.amount else 0 end) gross,
      sum(case when r.payroll_kind='DEDUCTION' then l.amount else 0 end) deductions
    from public.rh_payroll_result_lines l
    join public.rh_rubric_versions rv on rv.id=l.rubric_version_id
    join public.rh_rubrics r on r.id=rv.rubric_id
    where l.worker_result_id in(select id from public.rh_payroll_worker_results where run_id=v_run)
    group by l.worker_result_id
  ) x where wr.id=x.worker_result_id;

  update public.rh_payroll_runs r set
    status='COMPLETED',completed_at=now(),
    gross_total=coalesce(x.gross,0),deduction_total=coalesce(x.deductions,0),net_total=coalesce(x.net,0)
  from (select sum(gross_amount) gross,sum(deduction_amount) deductions,sum(net_amount) net from public.rh_payroll_worker_results where run_id=v_run) x
  where r.id=v_run;

  update public.rh_payroll_periods set status='CALCULATED',updated_at=now() where id=p_period_id;
  return v_run;
exception when others then
  if v_run is not null then update public.rh_payroll_runs set status='FAILED',completed_at=now() where id=v_run; end if;
  if p_period_id is not null then update public.rh_payroll_periods set status='OPEN',updated_at=now() where id=p_period_id and status='CALCULATING'; end if;
  raise;
end$$;

create or replace function public.close_rh_payroll(p_period_id uuid,p_reason text default null)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_org uuid; v_run uuid; v_closure uuid;
begin
  select organization_id into v_org from public.rh_payroll_periods where id=p_period_id for update;
  if v_org is null then raise exception 'Período não encontrado'; end if;
  if not public.has_module_permission(v_org,'rh','READ',null,'approve') then raise exception 'FORBIDDEN'; end if;
  select id into v_run from public.rh_payroll_runs where period_id=p_period_id and status='COMPLETED' order by run_number desc limit 1;
  if v_run is null then raise exception 'Calcule a folha antes de fechar'; end if;
  insert into public.rh_payroll_closures(organization_id,period_id,run_id,closed_by,reason)
  values(v_org,p_period_id,v_run,auth.uid(),nullif(trim(coalesce(p_reason,'')),'')) returning id into v_closure;
  update public.rh_payroll_periods set status='CLOSED',updated_at=now() where id=p_period_id;
  return v_closure;
end$$;

grant execute on function public.create_rh_worker(uuid,text,text,text,date,text,text,text,text,text,date,numeric) to authenticated;
grant execute on function public.run_rh_payroll(uuid) to authenticated;
grant execute on function public.close_rh_payroll(uuid,text) to authenticated;
