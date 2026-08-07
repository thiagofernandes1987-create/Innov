do $$
declare
 v_org uuid;v_user uuid;v_employment uuid;v_salary uuid;v_salary_v uuid;v_tax uuid;v_tax_v uuid;
 v_base uuid;v_param uuid;v_period uuid;v_run uuid;v_gross numeric;v_ded numeric;v_net numeric;v_base_amount numeric;
begin
 insert into auth.users(email) values('rh-payroll-v2@innovar.local') returning id into v_user;
 insert into public.organizations(name) values('RH folha V2') returning id into v_org;
 insert into public.organization_memberships(organization_id,user_id,role,active) values(v_org,v_user,'ADMIN',true);
 perform set_config('test.user_id',v_user::text,false);perform set_config('test.permission_granted','true',false);
 v_employment:=public.create_rh_worker(v_org,'Folha Progressiva',null,'22233344455',null,null,null,'EMP-P2','MAT-P2','EMPLOYEE','2026-01-01',5000);

 insert into public.rh_rubrics(organization_id,code,name,payroll_kind,created_by) values(v_org,'SAL','Salário','EARNING',v_user) returning id into v_salary;
 insert into public.rh_rubric_versions(organization_id,rubric_id,version,valid_from,formula_type,calculation_priority,created_by) values(v_org,v_salary,1,'2026-01-01','MANUAL',10,v_user) returning id into v_salary_v;
 insert into public.rh_payroll_base_definitions(organization_id,code,name,created_by) values(v_org,'CP','Base previdenciária de teste',v_user) returning id into v_base;
 insert into public.rh_payroll_base_members(organization_id,base_definition_id,rubric_id,factor,valid_from,created_by) values(v_org,v_base,v_salary,1,'2026-01-01',v_user);

 insert into public.rh_payroll_parameters(organization_id,code,name,category,created_by) values(v_org,'INSS_TEST','Tabela progressiva de teste','SOCIAL_SECURITY',v_user) returning id into v_param;
 insert into public.rh_payroll_parameter_versions(organization_id,parameter_id,version,valid_from,table_value,source_reference,created_by)
 values(v_org,v_param,1,'2026-01-01','[{"from":0,"to":1000,"rate":10},{"from":1000,"to":null,"rate":20}]'::jsonb,'Fixture determinística',v_user);

 insert into public.rh_rubrics(organization_id,code,name,payroll_kind,created_by) values(v_org,'DESC_PROGRESSIVO','Desconto progressivo','DEDUCTION',v_user) returning id into v_tax;
 insert into public.rh_rubric_versions(organization_id,rubric_id,version,valid_from,formula_type,calculation_priority,auto_calculate,formula_config,created_by)
 values(v_org,v_tax,1,'2026-01-01','MARGINAL_PROGRESSIVE',500,true,'{"baseCode":"CP","parameterCode":"INSS_TEST"}'::jsonb,v_user) returning id into v_tax_v;

 insert into public.rh_payroll_periods(organization_id,reference_month,processing_type,created_by) values(v_org,'2026-08-01','MONTHLY',v_user) returning id into v_period;
 insert into public.rh_payroll_inputs(organization_id,period_id,employment_id,rubric_version_id,amount,source_type,created_by) values(v_org,v_period,v_employment,v_salary_v,5000,'CONTRACT',v_user);
 v_run:=public.run_rh_payroll(v_period);
 select gross_amount,deduction_amount,net_amount into v_gross,v_ded,v_net from public.rh_payroll_worker_results where run_id=v_run;
 select amount into v_base_amount from public.rh_payroll_bases where run_id=v_run and base_code='CP';

 if v_base_amount<>5000 then raise exception 'FOLHA V2 1 falhou: base esperada 5000, obtida %',v_base_amount;end if;
 if v_gross<>5000 or v_ded<>900 or v_net<>4100 then raise exception 'FOLHA V2 2 falhou: bruto %, desconto %, líquido %',v_gross,v_ded,v_net;end if;
 if (select count(*) from public.rh_payroll_result_lines l join public.rh_payroll_worker_results w on w.id=l.worker_result_id where w.run_id=v_run and l.rubric_version_id=v_tax_v and l.trace->>'phase'='DERIVED')<>1 then raise exception 'FOLHA V2 3 falhou: rubrica derivada ausente';end if;

 raise notice 'RH folha V2 — bases e progressivo aprovados.';
end$$;
