create table if not exists public.rh_thirteenth_cases(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  employment_id uuid not null references public.rh_employments(id) on delete restrict,
  reference_year integer not null check(reference_year between 2000 and 2200),
  reference_date date not null,
  entitled_months integer not null check(entitled_months between 0 and 12),
  average_base numeric(18,2) not null default 0,
  advance_percent numeric(8,4) not null default 50 check(advance_percent>=0 and advance_percent<=100),
  salary_base numeric(18,2),
  annual_gross numeric(18,2),
  advance_amount numeric(18,2),
  final_gross_before_taxes numeric(18,2),
  status text not null default 'DRAFT' check(status in('DRAFT','CALCULATED','ADVANCE_EXPORTED','FINAL_EXPORTED','CLOSED','CANCELLED')),
  calculation_trace jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,employment_id,reference_year)
);

create table if not exists public.rh_thirteenth_rubric_mappings(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
  mapping_key text not null check(mapping_key in('ADVANCE_EARNING','FINAL_TOTAL_EARNING','ADVANCE_DEDUCTION')),
  rubric_version_id uuid not null references public.rh_rubric_versions(id) on delete restrict,
  valid_from date not null,valid_to date,created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),
  unique(organization_id,mapping_key,valid_from),check(valid_to is null or valid_to>valid_from)
);

create table if not exists public.rh_thirteenth_exports(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
  thirteenth_case_id uuid not null references public.rh_thirteenth_cases(id) on delete cascade,
  period_id uuid not null references public.rh_payroll_periods(id) on delete restrict,
  installment text not null check(installment in('ADVANCE','FINAL')),
  payroll_input_id uuid not null references public.rh_payroll_inputs(id) on delete restrict,
  export_role text not null check(export_role in('ADVANCE_EARNING','FINAL_TOTAL_EARNING','ADVANCE_DEDUCTION')),
  amount numeric(18,2) not null,created_at timestamptz not null default now(),unique(thirteenth_case_id,installment,export_role)
);

create table if not exists public.rh_payroll_difference_cases(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
  original_run_id uuid not null references public.rh_payroll_runs(id) on delete restrict,
  revised_run_id uuid not null references public.rh_payroll_runs(id) on delete restrict,
  target_period_id uuid references public.rh_payroll_periods(id) on delete restrict,
  reason text not null,
  status text not null default 'DRAFT' check(status in('DRAFT','CALCULATED','REVIEW','APPROVED','EXPORTED','CANCELLED')),
  created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),approved_by uuid references auth.users(id) on delete set null,approved_at timestamptz,
  check(original_run_id<>revised_run_id)
);

create table if not exists public.rh_payroll_difference_lines(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
  difference_case_id uuid not null references public.rh_payroll_difference_cases(id) on delete cascade,
  employment_id uuid not null references public.rh_employments(id) on delete restrict,
  source_rubric_id uuid not null references public.rh_rubrics(id) on delete restrict,
  original_amount numeric(18,2) not null,revised_amount numeric(18,2) not null,delta_amount numeric(18,2) not null,
  export_rubric_version_id uuid references public.rh_rubric_versions(id) on delete restrict,
  payroll_input_id uuid references public.rh_payroll_inputs(id) on delete restrict,
  explanation text,created_at timestamptz not null default now(),unique(difference_case_id,employment_id,source_rubric_id)
);

alter table public.rh_thirteenth_cases add constraint rh_thirteenth_cases_org_id_uq unique(organization_id,id);
alter table public.rh_payroll_difference_cases add constraint rh_payroll_difference_cases_org_id_uq unique(organization_id,id);
alter table public.rh_thirteenth_cases add constraint rh_thirteenth_emp_tenant_fk foreign key(organization_id,employment_id) references public.rh_employments(organization_id,id) on delete restrict;
alter table public.rh_thirteenth_exports drop constraint if exists rh_thirteenth_exports_thirteenth_case_id_fkey;
alter table public.rh_thirteenth_exports add constraint rh_thirteenth_export_case_tenant_fk foreign key(organization_id,thirteenth_case_id) references public.rh_thirteenth_cases(organization_id,id) on delete cascade;
alter table public.rh_payroll_difference_lines drop constraint if exists rh_payroll_difference_lines_difference_case_id_fkey;
alter table public.rh_payroll_difference_lines add constraint rh_payroll_diff_line_case_tenant_fk foreign key(organization_id,difference_case_id) references public.rh_payroll_difference_cases(organization_id,id) on delete cascade;

do $$declare t text;begin foreach t in array array['rh_thirteenth_cases','rh_thirteenth_rubric_mappings','rh_thirteenth_exports','rh_payroll_difference_cases','rh_payroll_difference_lines'] loop execute format('alter table public.%I enable row level security',t);execute format('create policy rh_read on public.%I for select to authenticated using(public.has_module_permission(organization_id,''rh'',''READ'',null,null))',t);execute format('create policy rh_write on public.%I for all to authenticated using(public.has_module_permission(organization_id,''rh'',''EDIT'',null,null)) with check(public.has_module_permission(organization_id,''rh'',''EDIT'',null,null))',t);end loop;end$$;

create or replace function public.calculate_rh_thirteenth(p_case_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.rh_thirteenth_cases%rowtype;v_salary numeric;v_total numeric;v_adv numeric;begin
 select * into c from public.rh_thirteenth_cases where id=p_case_id for update;if c.id is null then raise exception 'Caso de 13º não encontrado';end if;if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;if not public.has_module_permission(c.organization_id,'rh','EDIT',null,null) then raise exception 'FORBIDDEN';end if;if c.status in('FINAL_EXPORTED','CLOSED','CANCELLED') then raise exception 'Caso não permite recálculo';end if;
 select base_salary into v_salary from public.rh_employment_conditions where employment_id=c.employment_id and valid_from<=c.reference_date and(valid_to is null or valid_to>c.reference_date) order by valid_from desc limit 1;if v_salary is null then select base_salary into v_salary from public.rh_employments where id=c.employment_id;end if;if v_salary is null then raise exception 'Salário de referência não encontrado';end if;
 v_total:=round((v_salary+c.average_base)*c.entitled_months/12,2);v_adv:=round(v_total*c.advance_percent/100,2);
 update public.rh_thirteenth_cases set salary_base=v_salary,annual_gross=v_total,advance_amount=v_adv,final_gross_before_taxes=v_total-v_adv,status='CALCULATED',calculation_trace=jsonb_build_object('salaryBase',v_salary,'averageBase',c.average_base,'entitledMonths',c.entitled_months,'formula','(salary+average)*months/12','advancePercent',c.advance_percent,'annualGross',v_total,'advanceAmount',v_adv),updated_at=now() where id=c.id;
end$$;

create or replace function public.export_rh_thirteenth(p_case_id uuid,p_period_id uuid,p_installment text)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.rh_thirteenth_cases%rowtype;v_ref date;v_rubric uuid;v_input uuid;v_count integer:=0;begin
 select * into c from public.rh_thirteenth_cases where id=p_case_id for update;if c.id is null then raise exception 'Caso de 13º não encontrado';end if;if not public.has_module_permission(c.organization_id,'rh','EDIT',null,null) then raise exception 'FORBIDDEN';end if;if c.status not in('CALCULATED','ADVANCE_EXPORTED') then raise exception 'Calcule o 13º antes da exportação';end if;
 select reference_month into v_ref from public.rh_payroll_periods where id=p_period_id and organization_id=c.organization_id and status in('OPEN','CALCULATED','REVIEW','REOPENED');if v_ref is null then raise exception 'Competência destino inválida';end if;
 if p_installment='ADVANCE' then
   if exists(select 1 from public.rh_thirteenth_exports where thirteenth_case_id=c.id and installment='ADVANCE') then return 0;end if;
   select rubric_version_id into v_rubric from public.rh_thirteenth_rubric_mappings where organization_id=c.organization_id and mapping_key='ADVANCE_EARNING' and valid_from<=v_ref and(valid_to is null or valid_to>v_ref) order by valid_from desc limit 1;if v_rubric is null then raise exception 'Mapeamento ADVANCE_EARNING ausente';end if;
   insert into public.rh_payroll_inputs(organization_id,period_id,employment_id,rubric_version_id,amount,source_type,source_ref,created_by) values(c.organization_id,p_period_id,c.employment_id,v_rubric,c.advance_amount,'THIRTEENTH',c.id::text,auth.uid()) returning id into v_input;
   insert into public.rh_thirteenth_exports(organization_id,thirteenth_case_id,period_id,installment,payroll_input_id,export_role,amount) values(c.organization_id,c.id,p_period_id,'ADVANCE',v_input,'ADVANCE_EARNING',c.advance_amount);update public.rh_thirteenth_cases set status='ADVANCE_EXPORTED',updated_at=now() where id=c.id;return 1;
 elsif p_installment='FINAL' then
   if exists(select 1 from public.rh_thirteenth_exports where thirteenth_case_id=c.id and installment='FINAL') then return 0;end if;
   select rubric_version_id into v_rubric from public.rh_thirteenth_rubric_mappings where organization_id=c.organization_id and mapping_key='FINAL_TOTAL_EARNING' and valid_from<=v_ref and(valid_to is null or valid_to>v_ref) order by valid_from desc limit 1;if v_rubric is null then raise exception 'Mapeamento FINAL_TOTAL_EARNING ausente';end if;
   insert into public.rh_payroll_inputs(organization_id,period_id,employment_id,rubric_version_id,amount,source_type,source_ref,created_by) values(c.organization_id,p_period_id,c.employment_id,v_rubric,c.annual_gross,'THIRTEENTH',c.id::text,auth.uid()) returning id into v_input;insert into public.rh_thirteenth_exports(organization_id,thirteenth_case_id,period_id,installment,payroll_input_id,export_role,amount) values(c.organization_id,c.id,p_period_id,'FINAL',v_input,'FINAL_TOTAL_EARNING',c.annual_gross);v_count:=v_count+1;
   if c.advance_amount>0 then select rubric_version_id into v_rubric from public.rh_thirteenth_rubric_mappings where organization_id=c.organization_id and mapping_key='ADVANCE_DEDUCTION' and valid_from<=v_ref and(valid_to is null or valid_to>v_ref) order by valid_from desc limit 1;if v_rubric is null then raise exception 'Mapeamento ADVANCE_DEDUCTION ausente';end if;insert into public.rh_payroll_inputs(organization_id,period_id,employment_id,rubric_version_id,amount,source_type,source_ref,created_by) values(c.organization_id,p_period_id,c.employment_id,v_rubric,c.advance_amount,'THIRTEENTH',c.id::text,auth.uid()) returning id into v_input;insert into public.rh_thirteenth_exports(organization_id,thirteenth_case_id,period_id,installment,payroll_input_id,export_role,amount) values(c.organization_id,c.id,p_period_id,'FINAL',v_input,'ADVANCE_DEDUCTION',c.advance_amount);v_count:=v_count+1;end if;
   update public.rh_thirteenth_cases set status='FINAL_EXPORTED',updated_at=now() where id=c.id;return v_count;
 else raise exception 'Parcela deve ser ADVANCE ou FINAL';end if;
end$$;

create or replace function public.materialize_rh_payroll_difference(p_original_run uuid,p_revised_run uuid,p_reason text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_org uuid;v_period uuid;v_revised_period uuid;v_case uuid;begin
 select organization_id,period_id into v_org,v_period from public.rh_payroll_runs where id=p_original_run;select period_id into v_revised_period from public.rh_payroll_runs where id=p_revised_run and organization_id=v_org;if v_org is null or v_revised_period is null then raise exception 'Execuções inválidas';end if;if v_period<>v_revised_period then raise exception 'Comparação retroativa exige execuções da mesma competência de origem';end if;if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;if not public.has_module_permission(v_org,'rh','EDIT',null,null) then raise exception 'FORBIDDEN';end if;
 insert into public.rh_payroll_difference_cases(organization_id,original_run_id,revised_run_id,reason,status,created_by) values(v_org,p_original_run,p_revised_run,p_reason,'CALCULATED',auth.uid()) returning id into v_case;
 insert into public.rh_payroll_difference_lines(organization_id,difference_case_id,employment_id,source_rubric_id,original_amount,revised_amount,delta_amount,explanation)
 with oldv as(select wr.employment_id,rv.rubric_id,sum(l.amount) amount from public.rh_payroll_worker_results wr join public.rh_payroll_result_lines l on l.worker_result_id=wr.id join public.rh_rubric_versions rv on rv.id=l.rubric_version_id where wr.run_id=p_original_run group by wr.employment_id,rv.rubric_id),newv as(select wr.employment_id,rv.rubric_id,sum(l.amount) amount from public.rh_payroll_worker_results wr join public.rh_payroll_result_lines l on l.worker_result_id=wr.id join public.rh_rubric_versions rv on rv.id=l.rubric_version_id where wr.run_id=p_revised_run group by wr.employment_id,rv.rubric_id)
 select v_org,v_case,coalesce(n.employment_id,o.employment_id),coalesce(n.rubric_id,o.rubric_id),coalesce(o.amount,0),coalesce(n.amount,0),round(coalesce(n.amount,0)-coalesce(o.amount,0),2),'Diferença entre execuções preservadas' from oldv o full join newv n on n.employment_id=o.employment_id and n.rubric_id=o.rubric_id where round(coalesce(n.amount,0)-coalesce(o.amount,0),2)<>0;
 return v_case;
end$$;

grant execute on function public.calculate_rh_thirteenth(uuid) to authenticated;
grant execute on function public.export_rh_thirteenth(uuid,uuid,text) to authenticated;
grant execute on function public.materialize_rh_payroll_difference(uuid,uuid,text) to authenticated;
