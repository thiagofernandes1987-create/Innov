-- Corrige a composição das bases da folha: somente linhas de rubricas
-- explicitamente associadas à definição da base podem contribuir para ela.

create or replace function public.run_rh_payroll(p_period_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_org uuid;v_status text;v_run uuid;v_run_number integer;v_input_count integer;v_ref date;
begin
 select organization_id,status,reference_month into v_org,v_status,v_ref from public.rh_payroll_periods where id=p_period_id for update;
 if v_org is null then raise exception 'Período não encontrado';end if;
 if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;
 if not public.has_module_permission(v_org,'rh','EDIT',null,null) then raise exception 'FORBIDDEN';end if;
 if v_status not in('OPEN','CALCULATED','REVIEW','REOPENED') then raise exception 'Período não permite cálculo: %',v_status;end if;
 select count(*) into v_input_count from public.rh_payroll_inputs where period_id=p_period_id;
 if v_input_count=0 then raise exception 'Inclua ao menos um lançamento antes de calcular';end if;
 if exists(
   select 1
   from public.rh_payroll_inputs i
   join public.rh_rubric_versions rv on rv.id=i.rubric_version_id
   where i.period_id=p_period_id
     and(rv.organization_id<>v_org or rv.status<>'PUBLISHED' or rv.valid_from>v_ref or(rv.valid_to is not null and rv.valid_to<=v_ref))
 ) then raise exception 'Existe lançamento com versão de rubrica inválida ou fora de vigência';end if;

 update public.rh_payroll_periods set status='CALCULATING',updated_at=now() where id=p_period_id;
 select coalesce(max(run_number),0)+1 into v_run_number from public.rh_payroll_runs where period_id=p_period_id;
 update public.rh_payroll_runs set status='SUPERSEDED' where period_id=p_period_id and status='COMPLETED';
 insert into public.rh_payroll_runs(organization_id,period_id,run_number,status,input_count,started_by)
 values(v_org,p_period_id,v_run_number,'RUNNING',v_input_count,auth.uid()) returning id into v_run;
 insert into public.rh_payroll_worker_results(organization_id,run_id,employment_id)
 select v_org,v_run,i.employment_id from public.rh_payroll_inputs i where i.period_id=p_period_id group by i.employment_id;

 -- Fase 1: linhas diretamente originadas dos fatos/lançamentos.
 insert into public.rh_payroll_result_lines(
   organization_id,worker_result_id,rubric_version_id,input_id,calculation_order,
   base_amount,quantity,unit_rate,amount,trace
 )
 select v_org,wr.id,i.rubric_version_id,i.id,rv.calculation_priority,
   case when rv.formula_type='PERCENT_OF_AMOUNT' then coalesce(i.amount,0) else null end,
   i.quantity,i.unit_rate,
   round((case rv.formula_type
     when'MANUAL'then coalesce(i.amount,0)
     when'FIXED'then coalesce(rv.fixed_value,0)
     when'QUANTITY_X_RATE'then coalesce(i.quantity,0)*coalesce(i.unit_rate,0)
     when'PERCENT_OF_AMOUNT'then coalesce(i.amount,0)*coalesce(rv.percent_value,0)/100
     else 0 end)::numeric,2),
   jsonb_build_object(
     'phase','INPUT','formulaType',rv.formula_type,'inputAmount',i.amount,
     'quantity',i.quantity,'unitRate',i.unit_rate,'fixedValue',rv.fixed_value,
     'percentValue',rv.percent_value,'rubricVersion',rv.version
   )
 from public.rh_payroll_inputs i
 join public.rh_rubric_versions rv on rv.id=i.rubric_version_id
 join public.rh_payroll_worker_results wr on wr.run_id=v_run and wr.employment_id=i.employment_id
 where i.period_id=p_period_id
 order by i.employment_id,rv.calculation_priority,i.created_at,i.id;

 -- Fase 2: bases declarativas. O vínculo entre linha e base é comprovado
 -- pelo rubric_id da versão da linha; linhas fora da base não entram no total
 -- nem no JSON de composição.
 insert into public.rh_payroll_bases(
   organization_id,run_id,worker_result_id,base_definition_id,base_code,amount,composition
 )
 select v_org,v_run,wr.id,bd.id,bd.code,
   round(coalesce(sum(case when lrv.id is not null then l.amount*bm.factor else 0 end),0),2),
   coalesce(
     jsonb_agg(
       jsonb_build_object(
         'lineId',l.id,
         'rubricVersionId',l.rubric_version_id,
         'amount',l.amount,
         'factor',bm.factor,
         'contribution',round(l.amount*bm.factor,2)
       ) order by l.calculation_order,l.id
     ) filter(where lrv.id is not null),
     '[]'::jsonb
   )
 from public.rh_payroll_worker_results wr
 cross join public.rh_payroll_base_definitions bd
 left join public.rh_payroll_base_members bm
   on bm.base_definition_id=bd.id
  and bm.organization_id=v_org
  and bm.valid_from<=v_ref
  and(bm.valid_to is null or bm.valid_to>v_ref)
 left join public.rh_payroll_result_lines l
   on l.worker_result_id=wr.id
 left join public.rh_rubric_versions lrv
   on lrv.id=l.rubric_version_id
  and lrv.rubric_id=bm.rubric_id
 where wr.run_id=v_run and bd.organization_id=v_org
 group by wr.id,bd.id,bd.code;

 -- Fase 3: rubricas automáticas derivadas de base + parâmetro versionado.
 insert into public.rh_payroll_result_lines(
   organization_id,worker_result_id,rubric_version_id,calculation_order,base_amount,amount,trace
 )
 select v_org,wr.id,rv.id,rv.calculation_priority,b.amount,
   round((case rv.formula_type
     when'PERCENT_OF_BASE'then b.amount*coalesce(pv.numeric_value,0)/100
     when'BRACKET_DEDUCTION'then public.rh_calculate_progressive(b.amount,pv.table_value,'BRACKET_DEDUCTION')
     when'MARGINAL_PROGRESSIVE'then public.rh_calculate_progressive(b.amount,pv.table_value,'MARGINAL_PROGRESSIVE')
     else 0 end)::numeric,2),
   jsonb_build_object(
     'phase','DERIVED','formulaType',rv.formula_type,'baseCode',b.base_code,
     'baseAmount',b.amount,'parameterCode',pp.code,'parameterVersion',pv.version
   )
 from public.rh_payroll_worker_results wr
 join public.rh_rubric_versions rv
   on rv.organization_id=v_org
  and rv.auto_calculate=true
  and rv.status='PUBLISHED'
  and rv.valid_from<=v_ref
  and(rv.valid_to is null or rv.valid_to>v_ref)
 join public.rh_rubrics r on r.id=rv.rubric_id and r.active=true
 join public.rh_payroll_bases b
   on b.worker_result_id=wr.id
  and b.base_code=rv.formula_config->>'baseCode'
 join public.rh_payroll_parameters pp
   on pp.organization_id=v_org
  and pp.code=rv.formula_config->>'parameterCode'
 join public.rh_payroll_parameter_versions pv
   on pv.parameter_id=pp.id
  and pv.status='PUBLISHED'
  and pv.valid_from<=v_ref
  and(pv.valid_to is null or pv.valid_to>v_ref)
 where wr.run_id=v_run
   and rv.formula_type in('PERCENT_OF_BASE','BRACKET_DEDUCTION','MARGINAL_PROGRESSIVE');

 update public.rh_payroll_worker_results wr
 set gross_amount=coalesce(x.gross,0),
     deduction_amount=coalesce(x.deductions,0),
     net_amount=coalesce(x.gross,0)-coalesce(x.deductions,0)
 from(
   select l.worker_result_id,
     sum(case when r.payroll_kind='EARNING'then l.amount else 0 end) gross,
     sum(case when r.payroll_kind='DEDUCTION'then l.amount else 0 end) deductions
   from public.rh_payroll_result_lines l
   join public.rh_rubric_versions rv on rv.id=l.rubric_version_id
   join public.rh_rubrics r on r.id=rv.rubric_id
   where l.worker_result_id in(select id from public.rh_payroll_worker_results where run_id=v_run)
   group by l.worker_result_id
 )x where wr.id=x.worker_result_id;

 update public.rh_payroll_runs r
 set status='COMPLETED',completed_at=now(),
     gross_total=coalesce(x.gross,0),deduction_total=coalesce(x.deductions,0),net_total=coalesce(x.net,0)
 from(
   select sum(gross_amount)gross,sum(deduction_amount)deductions,sum(net_amount)net
   from public.rh_payroll_worker_results where run_id=v_run
 )x where r.id=v_run;

 update public.rh_payroll_periods set status='CALCULATED',updated_at=now() where id=p_period_id;
 return v_run;
exception when others then
 if v_run is not null then update public.rh_payroll_runs set status='FAILED',completed_at=now() where id=v_run;end if;
 if p_period_id is not null then update public.rh_payroll_periods set status='OPEN',updated_at=now() where id=p_period_id and status='CALCULATING';end if;
 raise;
end$$;
