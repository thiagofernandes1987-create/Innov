do $$
declare
 v_org uuid;v_user uuid;v_employment uuid;v_salary uuid;v_salary_v uuid;v_base uuid;
 v_inss_template uuid;v_irrf_template uuid;v_inss_param_v uuid;v_irrf_param_v uuid;v_inss_rubric_v uuid;
 v_period uuid;v_run uuid;v_deduction numeric;v_raised boolean;
begin
 insert into auth.users(email) values('rh-regulatory@innovar.local') returning id into v_user;
 insert into public.organizations(name) values('RH regulatório teste') returning id into v_org;
 insert into public.organization_memberships(organization_id,user_id,role,active) values(v_org,v_user,'ADMIN',true);
 perform set_config('test.user_id',v_user::text,false);perform set_config('test.permission_granted','true',false);

 select id into v_inss_template from public.rh_regulatory_parameter_templates where template_key='INSS_EMPLOYEE_MONTHLY_2026' and version=1;
 select id into v_irrf_template from public.rh_regulatory_parameter_templates where template_key='IRRF_MONTHLY_2026' and version=1;
 if v_inss_template is null or v_irrf_template is null then raise exception 'REG 1 falhou: templates oficiais ausentes';end if;

 v_inss_param_v:=public.create_rh_payroll_parameter_from_template(v_org,v_inss_template,'INSS_2026');
 v_irrf_param_v:=public.create_rh_payroll_parameter_from_template(v_org,v_irrf_template,'IRRF_2026');
 if v_inss_param_v is null or v_irrf_param_v is null then raise exception 'REG 2 falhou: cópia de template';end if;
 if jsonb_typeof((select table_value from public.rh_payroll_parameter_versions where id=v_inss_param_v))<>'array' then raise exception 'REG 2 falhou: INSS não é tabela de faixas';end if;
 if jsonb_typeof((select table_value from public.rh_payroll_parameter_versions where id=v_irrf_param_v))<>'object' then raise exception 'REG 2 falhou: IRRF completo não preservou redução/config';end if;

 v_employment:=public.create_rh_worker(v_org,'Parâmetro Oficial',null,'33344455566',null,null,null,'EMP-RG','MAT-RG','EMPLOYEE','2026-01-01',5000);
 insert into public.rh_rubrics(organization_id,code,name,payroll_kind,created_by) values(v_org,'SAL_REG','Salário','EARNING',v_user) returning id into v_salary;
 insert into public.rh_rubric_versions(organization_id,rubric_id,version,valid_from,formula_type,calculation_priority,created_by) values(v_org,v_salary,1,'2026-01-01','MANUAL',10,v_user) returning id into v_salary_v;
 v_base:=public.create_rh_payroll_base(v_org,'CP_REG','Base INSS',null);
 perform public.add_rh_payroll_base_member(v_org,v_base,v_salary,1,'2026-01-01',null);
 v_inss_rubric_v:=public.create_rh_derived_rubric(v_org,'INSS_AUTO','INSS automático de referência',null,'DEDUCTION','2026-01-01',null,'MARGINAL_PROGRESSIVE',500,'CP_REG','INSS_2026','9201',null,null,null);

 insert into public.rh_payroll_periods(organization_id,reference_month,processing_type,created_by) values(v_org,'2026-08-01','MONTHLY',v_user) returning id into v_period;
 insert into public.rh_payroll_inputs(organization_id,period_id,employment_id,rubric_version_id,amount,source_type,created_by) values(v_org,v_period,v_employment,v_salary_v,5000,'CONTRACT',v_user);
 v_run:=public.run_rh_payroll(v_period);
 select deduction_amount into v_deduction from public.rh_payroll_worker_results where run_id=v_run;
 if v_deduction<>501.51 then raise exception 'REG 3 falhou: progressivo INSS esperado 501,51 pela tabela de referência, obtido %',v_deduction;end if;
 if (select count(*) from public.rh_payroll_result_lines l join public.rh_payroll_worker_results wr on wr.id=l.worker_result_id where wr.run_id=v_run and l.rubric_version_id=v_inss_rubric_v)<>1 then raise exception 'REG 3 falhou: linha automática ausente';end if;

 -- O template de IRRF 2026 inclui tabela + redução mensal e não pode ser
 -- tratado como uma lista simples de faixas; a combinação deve ser recusada.
 v_raised:=false;
 begin
  perform public.create_rh_derived_rubric(v_org,'IRRF_ERRADO','IRRF simplificado indevido',null,'DEDUCTION','2026-01-01',null,'BRACKET_DEDUCTION',600,'CP_REG','IRRF_2026','9203',null,null,null);
 exception when others then if sqlerrm like '%formato de lista de faixas%' then v_raised:=true;end if;end;
 if not v_raised then raise exception 'REG 4 falhou: IRRF 2026 completo foi aceito como faixa simples';end if;

 raise notice 'RH regulatório — templates, INSS e bloqueio de IRRF simplificado aprovados.';
end$$;
