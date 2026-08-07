alter table public.rh_work_schedules add column if not exists monthly_divisor numeric(8,2) check(monthly_divisor is null or monthly_divisor>0);

create table if not exists public.rh_work_schedule_days(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  work_schedule_id uuid not null references public.rh_work_schedules(id) on delete cascade,
  iso_weekday integer not null check(iso_weekday between 1 and 7),
  planned_minutes integer not null default 0 check(planned_minutes between 0 and 1440),
  planned_start time,
  planned_end time,
  break_minutes integer not null default 0 check(break_minutes between 0 and 720),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(work_schedule_id,iso_weekday)
);

create table if not exists public.rh_time_policies(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code text not null,
  name text not null,
  overtime_factor numeric(8,4) not null default 1.5 check(overtime_factor>=1),
  absence_factor numeric(8,4) not null default 1 check(absence_factor>=0),
  tolerance_minutes integer not null default 0 check(tolerance_minutes between 0 and 120),
  valid_from date not null,
  valid_to date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(organization_id,code),
  check(valid_to is null or valid_to>valid_from)
);

create table if not exists public.rh_time_periods(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  employment_id uuid not null references public.rh_employments(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  policy_id uuid not null references public.rh_time_policies(id) on delete restrict,
  status text not null default 'OPEN' check(status in('OPEN','CALCULATED','PENDING','CLOSED','REOPENED')),
  calculated_at timestamptz,
  closed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,employment_id,period_start,period_end),
  check(period_end>=period_start)
);

create table if not exists public.rh_time_punches(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  employment_id uuid not null references public.rh_employments(id) on delete restrict,
  punched_at timestamptz not null,
  direction text not null check(direction in('IN','OUT')),
  source text not null default 'MANUAL' check(source in('MANUAL','DEVICE','IMPORT','MOBILE')),
  source_reference text,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists rh_time_punches_emp_time_idx on public.rh_time_punches(organization_id,employment_id,punched_at);

create table if not exists public.rh_time_adjustments(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  time_period_id uuid not null references public.rh_time_periods(id) on delete cascade,
  work_date date not null,
  adjustment_type text not null check(adjustment_type in('WORKED_MINUTES','PLANNED_MINUTES','OVERTIME_MINUTES','ABSENCE_MINUTES','JUSTIFIED_ABSENCE')),
  minutes integer check(minutes is null or minutes>=0),
  reason text not null,
  evidence_reference text,
  approved_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.rh_time_daily_results(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  time_period_id uuid not null references public.rh_time_periods(id) on delete cascade,
  work_date date not null,
  planned_minutes integer not null default 0,
  worked_minutes integer not null default 0,
  overtime_minutes integer not null default 0,
  absence_minutes integer not null default 0,
  punch_count integer not null default 0,
  status text not null default 'OK' check(status in('OK','INCOMPLETE_PUNCH','ADJUSTED','JUSTIFIED')),
  trace jsonb not null default '{}'::jsonb,
  unique(time_period_id,work_date)
);

create table if not exists public.rh_time_payroll_exports(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  time_period_id uuid not null references public.rh_time_periods(id) on delete restrict,
  payroll_period_id uuid not null references public.rh_payroll_periods(id) on delete restrict,
  export_kind text not null check(export_kind in('OVERTIME','ABSENCE')),
  rubric_version_id uuid not null references public.rh_rubric_versions(id) on delete restrict,
  payroll_input_id uuid not null references public.rh_payroll_inputs(id) on delete restrict,
  quantity_hours numeric(12,4) not null,
  amount numeric(18,2) not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(time_period_id,payroll_period_id,export_kind)
);

alter table public.rh_work_schedule_days add constraint rh_work_schedule_days_org_id_uq unique(organization_id,id);
alter table public.rh_time_policies add constraint rh_time_policies_org_id_uq unique(organization_id,id);
alter table public.rh_time_periods add constraint rh_time_periods_org_id_uq unique(organization_id,id);
alter table public.rh_time_periods add constraint rh_time_period_emp_tenant_fk foreign key(organization_id,employment_id) references public.rh_employments(organization_id,id) on delete restrict;
alter table public.rh_work_schedule_days add constraint rh_schedule_day_tenant_fk foreign key(organization_id,work_schedule_id) references public.rh_work_schedules(organization_id,id) on delete cascade;
alter table public.rh_time_punches add constraint rh_time_punch_emp_tenant_fk foreign key(organization_id,employment_id) references public.rh_employments(organization_id,id) on delete restrict;
alter table public.rh_time_adjustments add constraint rh_time_adjustment_period_tenant_fk foreign key(organization_id,time_period_id) references public.rh_time_periods(organization_id,id) on delete cascade;
alter table public.rh_time_daily_results add constraint rh_time_daily_period_tenant_fk foreign key(organization_id,time_period_id) references public.rh_time_periods(organization_id,id) on delete cascade;

do $$ declare t text; begin
  foreach t in array array['rh_work_schedule_days','rh_time_policies','rh_time_periods','rh_time_punches','rh_time_adjustments','rh_time_daily_results','rh_time_payroll_exports'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create policy rh_read on public.%I for select to authenticated using(public.has_module_permission(organization_id,''rh'',''READ'',null,null))',t);
    execute format('create policy rh_write on public.%I for all to authenticated using(public.has_module_permission(organization_id,''rh'',''EDIT'',null,null)) with check(public.has_module_permission(organization_id,''rh'',''EDIT'',null,null))',t);
  end loop;
end$$;

create or replace function public.calculate_rh_time_period(p_period_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.rh_time_periods%rowtype; d date; v_schedule uuid; v_planned integer; v_count integer; v_worked integer; v_status text; v_adj integer;
begin
  select * into p from public.rh_time_periods where id=p_period_id for update;
  if p.id is null then raise exception 'Período de ponto não encontrado'; end if;
  if not public.has_module_permission(p.organization_id,'rh','EDIT',null,null) then raise exception 'FORBIDDEN'; end if;
  if p.status not in('OPEN','CALCULATED','PENDING','REOPENED') then raise exception 'Período não permite cálculo'; end if;

  select work_schedule_id into v_schedule
  from public.rh_employment_conditions
  where organization_id=p.organization_id and employment_id=p.employment_id
    and valid_from<=p.period_start and(valid_to is null or valid_to>p.period_start)
  order by valid_from desc limit 1;
  if v_schedule is null then raise exception 'Vínculo sem jornada vigente no início do período'; end if;

  delete from public.rh_time_daily_results where time_period_id=p.id;
  for d in select generate_series(p.period_start,p.period_end,'1 day'::interval)::date loop
    select coalesce(planned_minutes,0) into v_planned from public.rh_work_schedule_days where work_schedule_id=v_schedule and iso_weekday=extract(isodow from d)::integer;
    v_planned:=coalesce(v_planned,0);
    select count(*) into v_count from public.rh_time_punches where organization_id=p.organization_id and employment_id=p.employment_id and punched_at>=d::timestamptz and punched_at<(d+1)::timestamptz;

    if v_count%2<>0 then
      v_worked:=0;v_status:='INCOMPLETE_PUNCH';
    else
      select coalesce(sum(extract(epoch from(out_p-in_p))/60),0)::integer into v_worked
      from(
        select punched_at as in_p,lead(punched_at) over(order by punched_at) as out_p,row_number() over(order by punched_at) as rn,direction
        from public.rh_time_punches
        where organization_id=p.organization_id and employment_id=p.employment_id and punched_at>=d::timestamptz and punched_at<(d+1)::timestamptz
      ) q where rn%2=1 and direction='IN' and out_p is not null;
      v_status:='OK';
    end if;

    select minutes into v_adj from public.rh_time_adjustments where time_period_id=p.id and work_date=d and adjustment_type='WORKED_MINUTES' order by created_at desc limit 1;
    if v_adj is not null then v_worked:=v_adj;v_status:='ADJUSTED'; end if;
    select minutes into v_adj from public.rh_time_adjustments where time_period_id=p.id and work_date=d and adjustment_type='PLANNED_MINUTES' order by created_at desc limit 1;
    if v_adj is not null then v_planned:=v_adj;v_status:='ADJUSTED'; end if;

    insert into public.rh_time_daily_results(organization_id,time_period_id,work_date,planned_minutes,worked_minutes,overtime_minutes,absence_minutes,punch_count,status,trace)
    values(p.organization_id,p.id,d,v_planned,v_worked,greatest(v_worked-v_planned,0),greatest(v_planned-v_worked,0),v_count,v_status,jsonb_build_object('scheduleId',v_schedule,'punchCount',v_count));
  end loop;

  update public.rh_time_periods set status=case when exists(select 1 from public.rh_time_daily_results where time_period_id=p.id and status='INCOMPLETE_PUNCH') then 'PENDING' else 'CALCULATED' end,calculated_at=now(),updated_at=now() where id=p.id;
end$$;

grant execute on function public.calculate_rh_time_period(uuid) to authenticated;

create or replace function public.close_rh_time_period_to_payroll(
  p_time_period_id uuid,p_payroll_period_id uuid,p_overtime_rubric_version_id uuid,p_absence_rubric_version_id uuid
) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare t public.rh_time_periods%rowtype; v_salary numeric;v_divisor numeric;v_ot_factor numeric;v_abs_factor numeric;v_ot_minutes integer;v_abs_minutes integer;v_input uuid;
begin
  select * into t from public.rh_time_periods where id=p_time_period_id for update;
  if t.id is null then raise exception 'Período de ponto não encontrado'; end if;
  if not public.has_module_permission(t.organization_id,'rh','EDIT',null,null) then raise exception 'FORBIDDEN'; end if;
  if t.status<>'CALCULATED' then raise exception 'Período precisa estar calculado e sem pendências'; end if;
  if not exists(select 1 from public.rh_payroll_periods where id=p_payroll_period_id and organization_id=t.organization_id and status in('OPEN','CALCULATED','REVIEW','REOPENED')) then raise exception 'Competência de folha inválida ou fechada'; end if;

  select c.base_salary,s.monthly_divisor into v_salary,v_divisor
  from public.rh_employment_conditions c join public.rh_work_schedules s on s.id=c.work_schedule_id
  where c.organization_id=t.organization_id and c.employment_id=t.employment_id and c.valid_from<=t.period_start and(c.valid_to is null or c.valid_to>t.period_start)
  order by c.valid_from desc limit 1;
  if v_divisor is null or v_divisor<=0 then raise exception 'Jornada sem divisor mensal'; end if;
  select overtime_factor,absence_factor into v_ot_factor,v_abs_factor from public.rh_time_policies where id=t.policy_id;
  select coalesce(sum(overtime_minutes),0),coalesce(sum(absence_minutes),0) into v_ot_minutes,v_abs_minutes from public.rh_time_daily_results where time_period_id=t.id;

  if v_ot_minutes>0 then
    insert into public.rh_payroll_inputs(organization_id,period_id,employment_id,rubric_version_id,quantity,unit_rate,amount,source_type,source_reference,created_by)
    values(t.organization_id,p_payroll_period_id,t.employment_id,p_overtime_rubric_version_id,v_ot_minutes/60.0,v_salary/v_divisor*v_ot_factor,v_ot_minutes/60.0*(v_salary/v_divisor*v_ot_factor),'TIME_CLOSE',t.id::text,auth.uid()) returning id into v_input;
    insert into public.rh_time_payroll_exports(organization_id,time_period_id,payroll_period_id,export_kind,rubric_version_id,payroll_input_id,quantity_hours,amount,created_by)
    values(t.organization_id,t.id,p_payroll_period_id,'OVERTIME',p_overtime_rubric_version_id,v_input,v_ot_minutes/60.0,v_ot_minutes/60.0*(v_salary/v_divisor*v_ot_factor),auth.uid());
  end if;
  if v_abs_minutes>0 then
    insert into public.rh_payroll_inputs(organization_id,period_id,employment_id,rubric_version_id,quantity,unit_rate,amount,source_type,source_reference,created_by)
    values(t.organization_id,p_payroll_period_id,t.employment_id,p_absence_rubric_version_id,v_abs_minutes/60.0,v_salary/v_divisor*v_abs_factor,v_abs_minutes/60.0*(v_salary/v_divisor*v_abs_factor),'TIME_CLOSE',t.id::text,auth.uid()) returning id into v_input;
    insert into public.rh_time_payroll_exports(organization_id,time_period_id,payroll_period_id,export_kind,rubric_version_id,payroll_input_id,quantity_hours,amount,created_by)
    values(t.organization_id,t.id,p_payroll_period_id,'ABSENCE',p_absence_rubric_version_id,v_input,v_abs_minutes/60.0,v_abs_minutes/60.0*(v_salary/v_divisor*v_abs_factor),auth.uid());
  end if;
  update public.rh_time_periods set status='CLOSED',closed_at=now(),updated_at=now() where id=t.id;
end$$;

grant execute on function public.close_rh_time_period_to_payroll(uuid,uuid,uuid,uuid) to authenticated;
