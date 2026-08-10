-- Invariantes adicionais da Folha V1.

-- Vigências de versões da mesma rubrica não se sobrepõem.
alter table public.rh_rubric_versions
  add constraint rh_rubric_versions_no_overlap exclude using gist(
    rubric_id with =,
    daterange(valid_from,valid_to,'[)') with &&
  );

create or replace function public.create_rh_rubric(
  p_organization_id uuid,
  p_code text,
  p_name text,
  p_description text,
  p_payroll_kind text,
  p_valid_from date,
  p_valid_to date,
  p_formula_type text,
  p_fixed_value numeric,
  p_percent_value numeric,
  p_calculation_priority integer,
  p_esocial_nature_code text,
  p_cod_inc_cp text,
  p_cod_inc_irrf text,
  p_cod_inc_fgts text,
  p_accounting_debit text,
  p_accounting_credit text
) returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_rubric uuid; v_version uuid;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if not public.has_module_permission(p_organization_id,'rh','READ',null,'administer') then raise exception 'FORBIDDEN'; end if;
  if trim(coalesce(p_code,''))='' or trim(coalesce(p_name,''))='' then raise exception 'Código e nome são obrigatórios'; end if;
  if p_valid_from is null then raise exception 'Início da vigência obrigatório'; end if;
  if p_valid_to is not null and p_valid_to<=p_valid_from then raise exception 'Fim da vigência deve ser posterior ao início'; end if;
  if p_payroll_kind not in('EARNING','DEDUCTION','INFORMATION','BASE','EMPLOYER_CHARGE') then raise exception 'Tipo de rubrica inválido'; end if;
  if p_formula_type not in('MANUAL','FIXED','QUANTITY_X_RATE','PERCENT_OF_AMOUNT') then raise exception 'Fórmula inválida'; end if;
  if p_formula_type='FIXED' and p_fixed_value is null then raise exception 'Valor fixo obrigatório'; end if;
  if p_formula_type='PERCENT_OF_AMOUNT' and p_percent_value is null then raise exception 'Percentual obrigatório'; end if;
  if p_percent_value is not null and (p_percent_value<0 or p_percent_value>100000) then raise exception 'Percentual fora de faixa'; end if;

  insert into public.rh_rubrics(organization_id,code,name,description,payroll_kind,created_by)
  values(p_organization_id,upper(trim(p_code)),trim(p_name),nullif(trim(coalesce(p_description,'')),''),p_payroll_kind,auth.uid())
  returning id into v_rubric;

  insert into public.rh_rubric_versions(
    organization_id,rubric_id,version,valid_from,valid_to,formula_type,fixed_value,percent_value,
    calculation_priority,esocial_nature_code,cod_inc_cp,cod_inc_irrf,cod_inc_fgts,
    accounting_debit,accounting_credit,status,created_by
  ) values(
    p_organization_id,v_rubric,1,p_valid_from,p_valid_to,p_formula_type,p_fixed_value,p_percent_value,
    coalesce(p_calculation_priority,100),nullif(trim(coalesce(p_esocial_nature_code,'')),''),
    nullif(trim(coalesce(p_cod_inc_cp,'')),''),nullif(trim(coalesce(p_cod_inc_irrf,'')),''),nullif(trim(coalesce(p_cod_inc_fgts,'')),''),
    nullif(trim(coalesce(p_accounting_debit,'')),''),nullif(trim(coalesce(p_accounting_credit,'')),''),'PUBLISHED',auth.uid()
  ) returning id into v_version;

  return v_version;
end$$;

grant execute on function public.create_rh_rubric(uuid,text,text,text,text,date,date,text,numeric,numeric,integer,text,text,text,text,text,text) to authenticated;

create or replace function public.run_rh_payroll(p_period_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_org uuid; v_status text; v_run uuid; v_run_number integer; v_input_count integer;
begin
  select organization_id,status into v_org,v_status from public.rh_payroll_periods where id=p_period_id for update;
  if v_org is null then raise exception 'Período não encontrado'; end if;
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if not public.has_module_permission(v_org,'rh','EDIT',null,null) then raise exception 'FORBIDDEN'; end if;
  if v_status not in ('OPEN','CALCULATED','REVIEW','REOPENED') then raise exception 'Período não permite cálculo: %',v_status; end if;

  select count(*) into v_input_count from public.rh_payroll_inputs where period_id=p_period_id;
  if v_input_count=0 then raise exception 'Inclua ao menos um lançamento antes de calcular'; end if;

  -- Todas as entradas precisam apontar para versões publicadas e vigentes na competência.
  if exists(
    select 1
    from public.rh_payroll_inputs i
    join public.rh_rubric_versions rv on rv.id=i.rubric_version_id
    join public.rh_payroll_periods p on p.id=i.period_id
    where i.period_id=p_period_id
      and (rv.organization_id<>v_org or rv.status<>'PUBLISHED' or rv.valid_from>p.reference_month or (rv.valid_to is not null and rv.valid_to<=p.reference_month))
  ) then raise exception 'Existe lançamento com versão de rubrica inválida ou fora de vigência'; end if;

  update public.rh_payroll_periods set status='CALCULATING',updated_at=now() where id=p_period_id;
  select coalesce(max(run_number),0)+1 into v_run_number from public.rh_payroll_runs where period_id=p_period_id;
  update public.rh_payroll_runs set status='SUPERSEDED' where period_id=p_period_id and status='COMPLETED';
  insert into public.rh_payroll_runs(organization_id,period_id,run_number,status,input_count,started_by)
  values(v_org,p_period_id,v_run_number,'RUNNING',v_input_count,auth.uid()) returning id into v_run;

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
    jsonb_build_object(
      'formulaType',rv.formula_type,'inputAmount',i.amount,'quantity',i.quantity,'unitRate',i.unit_rate,
      'fixedValue',rv.fixed_value,'percentValue',rv.percent_value,'rubricVersion',rv.version
    )
  from public.rh_payroll_inputs i
  join public.rh_rubric_versions rv on rv.id=i.rubric_version_id
  join public.rh_payroll_worker_results wr on wr.run_id=v_run and wr.employment_id=i.employment_id
  where i.period_id=p_period_id
  order by i.employment_id,rv.calculation_priority,i.created_at,i.id;

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
