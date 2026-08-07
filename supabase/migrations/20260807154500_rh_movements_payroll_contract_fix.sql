create or replace function public.export_rh_vacation_to_payroll(p_case_id uuid,p_payroll_period_id uuid,p_vacation_rubric uuid,p_third_rubric uuid,p_cash_rubric uuid default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.rh_vacation_cases%rowtype;v_base numeric;v_vac numeric;v_third numeric;v_cash numeric;v_input uuid;
begin
 select * into c from public.rh_vacation_cases where id=p_case_id for update;
 if c.id is null then raise exception 'Férias não encontradas';end if;
 if not public.has_module_permission(c.organization_id,'rh','EDIT',null,null) then raise exception 'FORBIDDEN';end if;
 if c.status not in('APPROVED','EXPORTED_TO_PAYROLL') then raise exception 'Férias precisam estar aprovadas';end if;
 if not exists(select 1 from public.rh_payroll_periods where id=p_payroll_period_id and organization_id=c.organization_id and status in('OPEN','CALCULATED','REVIEW','REOPENED')) then raise exception 'Competência inválida';end if;
 v_base:=c.remuneration_base+c.average_amount;v_vac:=round(v_base*c.days/c.divisor_days,2);v_third:=round(v_vac/3,2);v_cash:=round(v_base*c.cash_conversion_days/c.divisor_days,2);
 if not exists(select 1 from public.rh_vacation_payroll_exports where vacation_case_id=c.id and payroll_period_id=p_payroll_period_id and export_kind='VACATION') then
  insert into public.rh_payroll_inputs(organization_id,period_id,employment_id,rubric_version_id,amount,source_type,source_ref,created_by) values(c.organization_id,p_payroll_period_id,c.employment_id,p_vacation_rubric,v_vac,'VACATION',c.id::text,auth.uid()) returning id into v_input;
  insert into public.rh_vacation_payroll_exports(organization_id,vacation_case_id,payroll_period_id,export_kind,rubric_version_id,payroll_input_id,amount,created_by) values(c.organization_id,c.id,p_payroll_period_id,'VACATION',p_vacation_rubric,v_input,v_vac,auth.uid());
 end if;
 if not exists(select 1 from public.rh_vacation_payroll_exports where vacation_case_id=c.id and payroll_period_id=p_payroll_period_id and export_kind='ONE_THIRD') then
  insert into public.rh_payroll_inputs(organization_id,period_id,employment_id,rubric_version_id,amount,source_type,source_ref,created_by) values(c.organization_id,p_payroll_period_id,c.employment_id,p_third_rubric,v_third,'VACATION',c.id::text,auth.uid()) returning id into v_input;
  insert into public.rh_vacation_payroll_exports(organization_id,vacation_case_id,payroll_period_id,export_kind,rubric_version_id,payroll_input_id,amount,created_by) values(c.organization_id,c.id,p_payroll_period_id,'ONE_THIRD',p_third_rubric,v_input,v_third,auth.uid());
 end if;
 if c.cash_conversion_days>0 and p_cash_rubric is not null and not exists(select 1 from public.rh_vacation_payroll_exports where vacation_case_id=c.id and payroll_period_id=p_payroll_period_id and export_kind='CASH_CONVERSION') then
  insert into public.rh_payroll_inputs(organization_id,period_id,employment_id,rubric_version_id,amount,source_type,source_ref,created_by) values(c.organization_id,p_payroll_period_id,c.employment_id,p_cash_rubric,v_cash,'VACATION',c.id::text,auth.uid()) returning id into v_input;
  insert into public.rh_vacation_payroll_exports(organization_id,vacation_case_id,payroll_period_id,export_kind,rubric_version_id,payroll_input_id,amount,created_by) values(c.organization_id,c.id,p_payroll_period_id,'CASH_CONVERSION',p_cash_rubric,v_input,v_cash,auth.uid());
 end if;
 update public.rh_vacation_cases set status='EXPORTED_TO_PAYROLL',updated_at=now() where id=c.id;
end$$;

create or replace function public.export_rh_benefit_charge_to_payroll(p_charge_id uuid,p_payroll_period_id uuid,p_rubric_version_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.rh_benefit_charges%rowtype;v_emp uuid;v_input uuid;v_amount numeric;
begin
 select * into c from public.rh_benefit_charges where id=p_charge_id for update;
 if c.id is null then raise exception 'Cobrança não encontrada';end if;
 if not public.has_module_permission(c.organization_id,'rh','EDIT',null,null) then raise exception 'FORBIDDEN';end if;
 select employment_id into v_emp from public.rh_benefit_enrollments where id=c.enrollment_id;
 v_amount:=c.employee_amount+c.copay_amount;
 if exists(select 1 from public.rh_benefit_payroll_exports where charge_id=c.id and payroll_period_id=p_payroll_period_id) then select payroll_input_id into v_input from public.rh_benefit_payroll_exports where charge_id=c.id and payroll_period_id=p_payroll_period_id;return v_input;end if;
 insert into public.rh_payroll_inputs(organization_id,period_id,employment_id,rubric_version_id,amount,source_type,source_ref,created_by) values(c.organization_id,p_payroll_period_id,v_emp,p_rubric_version_id,v_amount,'BENEFIT',c.id::text,auth.uid()) returning id into v_input;
 insert into public.rh_benefit_payroll_exports(organization_id,charge_id,payroll_period_id,rubric_version_id,payroll_input_id,amount,created_by) values(c.organization_id,c.id,p_payroll_period_id,p_rubric_version_id,v_input,v_amount,auth.uid());
 update public.rh_benefit_charges set status='EXPORTED_TO_PAYROLL' where id=c.id;return v_input;
end$$;
