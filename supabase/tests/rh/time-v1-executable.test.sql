do $$
declare
  v_org uuid;v_user uuid;v_emp uuid;v_est uuid;v_schedule uuid;v_policy uuid;v_employment uuid;v_time uuid;v_punch uuid;
  v_ot uuid;v_ot_v uuid;v_abs uuid;v_abs_v uuid;v_payroll uuid;v_raised boolean;v_export numeric;
begin
  insert into auth.users(email) values('rh-time@innovar.local') returning id into v_user;
  insert into public.organizations(name) values('RH ponto teste') returning id into v_org;
  insert into public.organization_memberships(organization_id,user_id,role,active) values(v_org,v_user,'ADMIN',true);
  perform set_config('test.user_id',v_user::text,false);perform set_config('test.permission_granted','true',false);
  insert into public.rh_employers(organization_id,code,legal_name,tax_id,created_by) values(v_org,'EMP','Empresa','55555555000155',v_user) returning id into v_emp;
  insert into public.rh_establishments(organization_id,employer_id,code,name,registration_type,registration_number,created_by) values(v_org,v_emp,'M','Matriz','CNPJ','55555555000155',v_user) returning id into v_est;
  insert into public.rh_work_schedules(organization_id,code,name,weekly_hours,monthly_divisor,created_by) values(v_org,'44H','Jornada teste',44,220,v_user) returning id into v_schedule;
  insert into public.rh_work_schedule_days(organization_id,work_schedule_id,iso_weekday,planned_minutes,created_by) select v_org,v_schedule,g,480,v_user from generate_series(1,5) g;
  insert into public.rh_time_policies(organization_id,code,name,overtime_factor,absence_factor,valid_from,created_by) values(v_org,'PADRAO','Padrão',1.5,1,'2026-01-01',v_user) returning id into v_policy;
  v_employment:=public.create_rh_worker(v_org,'Ponto Teste',null,'55566677788',null,null,null,'EMP-TIME','MAT-TIME','EMPLOYEE','2026-01-01',2200);
  insert into public.rh_employment_conditions(organization_id,employment_id,valid_from,employer_id,establishment_id,work_schedule_id,base_salary,change_reason,created_by) values(v_org,v_employment,'2026-01-01',v_emp,v_est,v_schedule,2200,'Admissão',v_user);
  insert into public.rh_time_periods(organization_id,employment_id,period_start,period_end,policy_id,created_by) values(v_org,v_employment,'2026-08-03','2026-08-04',v_policy,v_user) returning id into v_time;

  insert into public.rh_time_punches(organization_id,employment_id,punched_at,direction,created_by) values(v_org,v_employment,'2026-08-03 08:00:00+00','IN',v_user) returning id into v_punch;
  insert into public.rh_time_punches(organization_id,employment_id,punched_at,direction,created_by) values
  (v_org,v_employment,'2026-08-03 12:00:00+00','OUT',v_user),
  (v_org,v_employment,'2026-08-03 13:00:00+00','IN',v_user),
  (v_org,v_employment,'2026-08-03 18:00:00+00','OUT',v_user);

  perform public.calculate_rh_time_period(v_time);
  if (select overtime_minutes from public.rh_time_daily_results where time_period_id=v_time and work_date='2026-08-03')<>60 then raise exception 'PONTO 1 falhou: hora extra';end if;
  if (select absence_minutes from public.rh_time_daily_results where time_period_id=v_time and work_date='2026-08-04')<>480 then raise exception 'PONTO 1 falhou: ausência';end if;

  v_raised:=false;
  begin update public.rh_time_punches set direction='OUT' where id=v_punch;exception when others then if sqlerrm like '%imutável%' then v_raised:=true;end if;end;
  if not v_raised then raise exception 'PONTO 2 falhou: marcação editável';end if;

  insert into public.rh_rubrics(organization_id,code,name,payroll_kind,created_by) values(v_org,'HE_TIME','Hora extra','EARNING',v_user) returning id into v_ot;
  insert into public.rh_rubric_versions(organization_id,rubric_id,version,valid_from,formula_type,calculation_priority,created_by) values(v_org,v_ot,1,'2026-01-01','MANUAL',100,v_user) returning id into v_ot_v;
  insert into public.rh_rubrics(organization_id,code,name,payroll_kind,created_by) values(v_org,'FALTA_TIME','Falta','DEDUCTION',v_user) returning id into v_abs;
  insert into public.rh_rubric_versions(organization_id,rubric_id,version,valid_from,formula_type,calculation_priority,created_by) values(v_org,v_abs,1,'2026-01-01','MANUAL',110,v_user) returning id into v_abs_v;
  insert into public.rh_payroll_periods(organization_id,reference_month,processing_type,created_by) values(v_org,'2026-08-01','MONTHLY',v_user) returning id into v_payroll;
  perform public.close_rh_time_period_to_payroll(v_time,v_payroll,v_ot_v,v_abs_v);
  select amount into v_export from public.rh_time_payroll_exports where time_period_id=v_time and export_kind='OVERTIME';
  if round(v_export,2)<>15.00 then raise exception 'PONTO 3 falhou: HE esperada R$15, obtida %',v_export;end if;
  if (select amount from public.rh_time_payroll_exports where time_period_id=v_time and export_kind='ABSENCE')<>80.00 then raise exception 'PONTO 3 falhou: falta esperada R$80';end if;
  if (select status from public.rh_time_periods where id=v_time)<>'CLOSED' then raise exception 'PONTO 3 falhou: período não fechado';end if;

  insert into public.rh_time_periods(organization_id,employment_id,period_start,period_end,policy_id,created_by) values(v_org,v_employment,'2026-08-05','2026-08-05',v_policy,v_user) returning id into v_time;
  insert into public.rh_time_punches(organization_id,employment_id,punched_at,direction,created_by) values
  (v_org,v_employment,'2026-08-05 08:00:00+00','OUT',v_user),(v_org,v_employment,'2026-08-05 17:00:00+00','IN',v_user);
  perform public.calculate_rh_time_period(v_time);
  if (select status from public.rh_time_periods where id=v_time)<>'PENDING' then raise exception 'PONTO 4 falhou: sequência inválida não bloqueou';end if;

  raise notice 'RH ponto — 4 testes aprovados.';
end$$;
