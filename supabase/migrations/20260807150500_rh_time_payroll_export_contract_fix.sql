create or replace function public.close_rh_time_period_to_payroll(
  p_time_period_id uuid,
  p_payroll_period_id uuid,
  p_overtime_rubric_version_id uuid,
  p_absence_rubric_version_id uuid
) returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  t public.rh_time_periods%rowtype;
  v_salary numeric;
  v_divisor numeric;
  v_ot_factor numeric;
  v_abs_factor numeric;
  v_ot_minutes integer;
  v_abs_minutes integer;
  v_input uuid;
begin
  select * into t from public.rh_time_periods where id=p_time_period_id for update;
  if t.id is null then raise exception 'Período de ponto não encontrado'; end if;
  if not public.has_module_permission(t.organization_id,'rh','EDIT',null,null) then raise exception 'FORBIDDEN'; end if;
  if t.status<>'CALCULATED' then raise exception 'Período precisa estar calculado e sem pendências'; end if;
  if not exists(
    select 1 from public.rh_payroll_periods
    where id=p_payroll_period_id
      and organization_id=t.organization_id
      and status in('OPEN','CALCULATED','REVIEW','REOPENED')
  ) then raise exception 'Competência de folha inválida ou fechada'; end if;

  select c.base_salary,s.monthly_divisor into v_salary,v_divisor
  from public.rh_employment_conditions c
  join public.rh_work_schedules s on s.id=c.work_schedule_id
  where c.organization_id=t.organization_id
    and c.employment_id=t.employment_id
    and c.valid_from<=t.period_start
    and(c.valid_to is null or c.valid_to>t.period_start)
  order by c.valid_from desc limit 1;

  if v_salary is null then raise exception 'Vínculo sem salário vigente'; end if;
  if v_divisor is null or v_divisor<=0 then raise exception 'Jornada sem divisor mensal'; end if;

  select overtime_factor,absence_factor
    into v_ot_factor,v_abs_factor
  from public.rh_time_policies
  where id=t.policy_id and organization_id=t.organization_id;

  select coalesce(sum(overtime_minutes),0),coalesce(sum(absence_minutes),0)
    into v_ot_minutes,v_abs_minutes
  from public.rh_time_daily_results
  where time_period_id=t.id;

  if v_ot_minutes>0 then
    insert into public.rh_payroll_inputs(
      organization_id,period_id,employment_id,rubric_version_id,
      quantity,unit_rate,amount,source_type,source_ref,created_by
    ) values(
      t.organization_id,p_payroll_period_id,t.employment_id,p_overtime_rubric_version_id,
      round(v_ot_minutes/60.0,4),round(v_salary/v_divisor*v_ot_factor,6),
      round(v_ot_minutes/60.0*(v_salary/v_divisor*v_ot_factor),4),
      'TIME',t.id::text,auth.uid()
    ) returning id into v_input;

    insert into public.rh_time_payroll_exports(
      organization_id,time_period_id,payroll_period_id,export_kind,
      rubric_version_id,payroll_input_id,quantity_hours,amount,created_by
    ) values(
      t.organization_id,t.id,p_payroll_period_id,'OVERTIME',p_overtime_rubric_version_id,
      v_input,round(v_ot_minutes/60.0,4),
      round(v_ot_minutes/60.0*(v_salary/v_divisor*v_ot_factor),2),auth.uid()
    );
  end if;

  if v_abs_minutes>0 then
    insert into public.rh_payroll_inputs(
      organization_id,period_id,employment_id,rubric_version_id,
      quantity,unit_rate,amount,source_type,source_ref,created_by
    ) values(
      t.organization_id,p_payroll_period_id,t.employment_id,p_absence_rubric_version_id,
      round(v_abs_minutes/60.0,4),round(v_salary/v_divisor*v_abs_factor,6),
      round(v_abs_minutes/60.0*(v_salary/v_divisor*v_abs_factor),4),
      'TIME',t.id::text,auth.uid()
    ) returning id into v_input;

    insert into public.rh_time_payroll_exports(
      organization_id,time_period_id,payroll_period_id,export_kind,
      rubric_version_id,payroll_input_id,quantity_hours,amount,created_by
    ) values(
      t.organization_id,t.id,p_payroll_period_id,'ABSENCE',p_absence_rubric_version_id,
      v_input,round(v_abs_minutes/60.0,4),
      round(v_abs_minutes/60.0*(v_salary/v_divisor*v_abs_factor),2),auth.uid()
    );
  end if;

  update public.rh_time_periods
  set status='CLOSED',closed_at=now(),updated_at=now()
  where id=t.id;
end$$;

grant execute on function public.close_rh_time_period_to_payroll(uuid,uuid,uuid,uuid) to authenticated;
