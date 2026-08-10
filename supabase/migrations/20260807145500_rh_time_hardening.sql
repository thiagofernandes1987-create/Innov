create or replace function public.prevent_rh_raw_punch_mutation()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  raise exception 'Marcação original é imutável. Registre tratamento/ajuste em objeto próprio.';
end$$;

drop trigger if exists trg_rh_time_punches_immutable on public.rh_time_punches;
create trigger trg_rh_time_punches_immutable
before update or delete on public.rh_time_punches
for each row execute function public.prevent_rh_raw_punch_mutation();

create or replace function public.calculate_rh_time_period(p_period_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.rh_time_periods%rowtype; d date; v_schedule uuid; v_planned integer; v_count integer; v_worked integer; v_status text; v_adj integer;v_bad_sequence boolean;
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

    with ordered as(
      select direction,row_number() over(order by punched_at,id) rn
      from public.rh_time_punches
      where organization_id=p.organization_id and employment_id=p.employment_id and punched_at>=d::timestamptz and punched_at<(d+1)::timestamptz
    )
    select count(*),coalesce(bool_or((rn%2=1 and direction<>'IN') or(rn%2=0 and direction<>'OUT')),false)
    into v_count,v_bad_sequence from ordered;

    if v_count%2<>0 or v_bad_sequence then
      v_worked:=0;v_status:='INCOMPLETE_PUNCH';
    else
      select coalesce(sum(extract(epoch from(out_p-in_p))/60),0)::integer into v_worked
      from(
        select punched_at as in_p,lead(punched_at) over(order by punched_at,id) as out_p,row_number() over(order by punched_at,id) as rn,direction
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
    values(p.organization_id,p.id,d,v_planned,v_worked,greatest(v_worked-v_planned,0),greatest(v_planned-v_worked,0),v_count,v_status,jsonb_build_object('scheduleId',v_schedule,'punchCount',v_count,'badSequence',v_bad_sequence));
  end loop;

  update public.rh_time_periods set status=case when exists(select 1 from public.rh_time_daily_results where time_period_id=p.id and status='INCOMPLETE_PUNCH') then 'PENDING' else 'CALCULATED' end,calculated_at=now(),updated_at=now() where id=p.id;
end$$;
