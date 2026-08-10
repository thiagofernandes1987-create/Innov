alter table public.rh_rubric_versions drop constraint if exists rh_rubric_versions_formula_type_check;
alter table public.rh_rubric_versions add constraint rh_rubric_versions_formula_type_check check(formula_type in(
  'MANUAL','FIXED','QUANTITY_X_RATE','PERCENT_OF_AMOUNT','PERCENT_OF_BASE','BRACKET_DEDUCTION','MARGINAL_PROGRESSIVE',
  'MARGINAL_PROGRESSIVE_ACCUMULATED','IRRF_MONTHLY_2026'
));

create table if not exists public.rh_payroll_worker_tax_contexts(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  period_id uuid not null references public.rh_payroll_periods(id) on delete cascade,
  employment_id uuid not null references public.rh_employments(id) on delete restrict,
  accumulation_order integer not null default 100,
  dependent_count integer not null default 0 check(dependent_count>=0),
  other_irrf_deductions numeric(18,2) not null default 0 check(other_irrf_deductions>=0),
  external_irrf_taxable_income numeric(18,2) not null default 0 check(external_irrf_taxable_income>=0),
  external_social_security_base numeric(18,2) not null default 0 check(external_social_security_base>=0),
  external_social_security_withheld numeric(18,2) not null default 0 check(external_social_security_withheld>=0),
  evidence_reference text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(period_id,employment_id)
);
alter table public.rh_payroll_worker_tax_contexts add constraint rh_payroll_worker_tax_contexts_org_id_uq unique(organization_id,id);
alter table public.rh_payroll_worker_tax_contexts add constraint rh_tax_context_period_tenant_fk foreign key(organization_id,period_id) references public.rh_payroll_periods(organization_id,id) on delete cascade;
alter table public.rh_payroll_worker_tax_contexts add constraint rh_tax_context_employment_tenant_fk foreign key(organization_id,employment_id) references public.rh_employments(organization_id,id) on delete restrict;
alter table public.rh_payroll_worker_tax_contexts enable row level security;
create policy rh_read on public.rh_payroll_worker_tax_contexts for select to authenticated using(public.has_module_permission(organization_id,'rh','READ',null,null));
create policy rh_write on public.rh_payroll_worker_tax_contexts for all to authenticated using(public.has_module_permission(organization_id,'rh','EDIT',null,null)) with check(public.has_module_permission(organization_id,'rh','EDIT',null,null));

create or replace function public.rh_calculate_progressive_accumulated(p_previous_base numeric,p_current_base numeric,p_table jsonb)
returns numeric language plpgsql immutable set search_path=public,pg_temp as $$
declare v_before numeric;v_after numeric;
begin
  v_before:=public.rh_calculate_progressive(greatest(coalesce(p_previous_base,0),0),p_table,'MARGINAL_PROGRESSIVE');
  v_after:=public.rh_calculate_progressive(greatest(coalesce(p_previous_base,0),0)+greatest(coalesce(p_current_base,0),0),p_table,'MARGINAL_PROGRESSIVE');
  return round(greatest(v_after-v_before,0),2);
end$$;

create or replace function public.rh_irrf_2026_trace(
  p_taxable_income numeric,
  p_social_security_deduction numeric,
  p_dependent_count integer,
  p_other_deductions numeric,
  p_external_taxable_income numeric,
  p_config jsonb
) returns jsonb language plpgsql immutable set search_path=public,pg_temp as $$
declare
  v_dep numeric:=coalesce((p_config->>'dependentDeduction')::numeric,0);
  v_simplified numeric:=coalesce((p_config->>'simplifiedDiscountLimit')::numeric,0);
  v_legal_deductions numeric;
  v_deduction_used numeric;
  v_base numeric;
  v_raw_tax numeric;
  v_income_reduction numeric;
  v_zero_until numeric:=coalesce((p_config#>>'{monthlyReduction,zeroIncomeUntil}')::numeric,0);
  v_linear_until numeric:=coalesce((p_config#>>'{monthlyReduction,linearIncomeUntil}')::numeric,0);
  v_max_reduction numeric:=coalesce((p_config#>>'{monthlyReduction,maxReduction}')::numeric,0);
  v_intercept numeric:=coalesce((p_config#>>'{monthlyReduction,intercept}')::numeric,0);
  v_slope numeric:=coalesce((p_config#>>'{monthlyReduction,slope}')::numeric,0);
  v_reduction numeric:=0;
  v_tax numeric;
begin
  if jsonb_typeof(p_config->'brackets')<>'array' then raise exception 'Configuração IRRF 2026 sem brackets';end if;
  v_legal_deductions:=greatest(coalesce(p_social_security_deduction,0),0)+greatest(coalesce(p_dependent_count,0),0)*v_dep+greatest(coalesce(p_other_deductions,0),0);
  v_deduction_used:=greatest(v_legal_deductions,v_simplified);
  v_base:=greatest(coalesce(p_taxable_income,0)-v_deduction_used,0);
  v_raw_tax:=public.rh_calculate_progressive(v_base,p_config->'brackets','BRACKET_DEDUCTION');
  v_income_reduction:=greatest(coalesce(p_taxable_income,0),0)+greatest(coalesce(p_external_taxable_income,0),0);
  if v_income_reduction<=v_zero_until then
    v_reduction:=least(v_raw_tax,v_max_reduction);
  elsif v_income_reduction<=v_linear_until then
    v_reduction:=least(v_raw_tax,greatest(v_intercept-v_slope*v_income_reduction,0));
  end if;
  v_tax:=round(greatest(v_raw_tax-v_reduction,0),2);
  return jsonb_build_object(
    'taxableIncome',round(coalesce(p_taxable_income,0),2),
    'socialSecurityDeduction',round(coalesce(p_social_security_deduction,0),2),
    'dependentCount',coalesce(p_dependent_count,0),
    'dependentDeduction',v_dep,
    'otherDeductions',round(coalesce(p_other_deductions,0),2),
    'legalDeductions',round(v_legal_deductions,2),
    'simplifiedDiscount',v_simplified,
    'deductionUsed',round(v_deduction_used,2),
    'taxBase',round(v_base,2),
    'rawTax',round(v_raw_tax,2),
    'reductionIncome',round(v_income_reduction,2),
    'reduction',round(v_reduction,2),
    'tax',v_tax
  );
end$$;

create or replace function public.rh_calculate_irrf_2026(
  p_taxable_income numeric,p_social_security_deduction numeric,p_dependent_count integer,p_other_deductions numeric,p_external_taxable_income numeric,p_config jsonb
) returns numeric language sql immutable set search_path=public,pg_temp as $$
  select coalesce((public.rh_irrf_2026_trace($1,$2,$3,$4,$5,$6)->>'tax')::numeric,0)
$$;

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
 if exists(select 1 from public.rh_payroll_inputs i join public.rh_rubric_versions rv on rv.id=i.rubric_version_id where i.period_id=p_period_id and(rv.organization_id<>v_org or rv.status<>'PUBLISHED' or rv.valid_from>v_ref or(rv.valid_to is not null and rv.valid_to<=v_ref))) then raise exception 'Existe lançamento com versão de rubrica inválida ou fora de vigência';end if;

 update public.rh_payroll_periods set status='CALCULATING',updated_at=now() where id=p_period_id;
 select coalesce(max(run_number),0)+1 into v_run_number from public.rh_payroll_runs where period_id=p_period_id;
 update public.rh_payroll_runs set status='SUPERSEDED' where period_id=p_period_id and status='COMPLETED';
 insert into public.rh_payroll_runs(organization_id,period_id,run_number,status,input_count,started_by) values(v_org,p_period_id,v_run_number,'RUNNING',v_input_count,auth.uid()) returning id into v_run;
 insert into public.rh_payroll_worker_results(organization_id,run_id,employment_id) select v_org,v_run,i.employment_id from public.rh_payroll_inputs i where i.period_id=p_period_id group by i.employment_id;

 insert into public.rh_payroll_result_lines(organization_id,worker_result_id,rubric_version_id,input_id,calculation_order,base_amount,quantity,unit_rate,amount,trace)
 select v_org,wr.id,i.rubric_version_id,i.id,rv.calculation_priority,case when rv.formula_type='PERCENT_OF_AMOUNT' then coalesce(i.amount,0) else null end,i.quantity,i.unit_rate,
 round((case rv.formula_type when'MANUAL'then coalesce(i.amount,0) when'FIXED'then coalesce(rv.fixed_value,0) when'QUANTITY_X_RATE'then coalesce(i.quantity,0)*coalesce(i.unit_rate,0) when'PERCENT_OF_AMOUNT'then coalesce(i.amount,0)*coalesce(rv.percent_value,0)/100 else 0 end)::numeric,2),
 jsonb_build_object('phase','INPUT','formulaType',rv.formula_type,'inputAmount',i.amount,'quantity',i.quantity,'unitRate',i.unit_rate,'fixedValue',rv.fixed_value,'percentValue',rv.percent_value,'rubricVersion',rv.version)
 from public.rh_payroll_inputs i join public.rh_rubric_versions rv on rv.id=i.rubric_version_id join public.rh_payroll_worker_results wr on wr.run_id=v_run and wr.employment_id=i.employment_id where i.period_id=p_period_id order by i.employment_id,rv.calculation_priority,i.created_at,i.id;

 insert into public.rh_payroll_bases(organization_id,run_id,worker_result_id,base_definition_id,base_code,amount,composition)
 select v_org,v_run,wr.id,bd.id,bd.code,round(coalesce(sum(l.amount*bm.factor),0),2),
 coalesce(jsonb_agg(jsonb_build_object('lineId',l.id,'amount',l.amount,'factor',bm.factor)) filter(where l.id is not null),'[]'::jsonb)
 from public.rh_payroll_worker_results wr cross join public.rh_payroll_base_definitions bd
 left join public.rh_payroll_base_members bm on bm.base_definition_id=bd.id and bm.organization_id=v_org and bm.valid_from<=v_ref and(bm.valid_to is null or bm.valid_to>v_ref)
 left join public.rh_payroll_result_lines l on l.worker_result_id=wr.id
 left join public.rh_rubric_versions lrv on lrv.id=l.rubric_version_id and lrv.rubric_id=bm.rubric_id
 where wr.run_id=v_run and bd.organization_id=v_org
 group by wr.id,bd.id,bd.code;

 if exists(
   select 1
   from public.rh_payroll_worker_results wr
   join public.rh_employments e on e.id=wr.employment_id
   join public.rh_workers w on w.id=e.worker_id
   left join public.rh_payroll_worker_tax_contexts c on c.period_id=p_period_id and c.employment_id=e.id
   where wr.run_id=v_run
   group by w.person_id
   having count(*)>1 and count(distinct coalesce(c.accumulation_order,-1))<>count(*)
 ) then raise exception 'Múltiplos vínculos da mesma pessoa exigem ordem de acumulação distinta no contexto fiscal';end if;

 insert into public.rh_payroll_result_lines(organization_id,worker_result_id,rubric_version_id,calculation_order,base_amount,amount,trace)
 select v_org,wr.id,rv.id,rv.calculation_priority,b.amount,
 round((case rv.formula_type
   when'PERCENT_OF_BASE'then b.amount*coalesce(pv.numeric_value,0)/100
   when'BRACKET_DEDUCTION'then public.rh_calculate_progressive(b.amount,pv.table_value,'BRACKET_DEDUCTION')
   when'MARGINAL_PROGRESSIVE'then public.rh_calculate_progressive(b.amount,pv.table_value,'MARGINAL_PROGRESSIVE')
   when'MARGINAL_PROGRESSIVE_ACCUMULATED'then public.rh_calculate_progressive_accumulated(
     coalesce(ctx.external_social_security_base,0)+coalesce((
       select sum(pb.amount) from public.rh_payroll_worker_results pwr
       join public.rh_employments pe on pe.id=pwr.employment_id
       join public.rh_workers pw on pw.id=pe.worker_id
       join public.rh_payroll_bases pb on pb.worker_result_id=pwr.id and pb.base_code=b.base_code
       left join public.rh_payroll_worker_tax_contexts pc on pc.period_id=p_period_id and pc.employment_id=pe.id
       where pwr.run_id=v_run and pw.person_id=w.person_id
         and (coalesce(pc.accumulation_order,100),pe.id::text)<(coalesce(ctx.accumulation_order,100),e.id::text)
     ),0),b.amount,pv.table_value)
   when'IRRF_MONTHLY_2026' then public.rh_calculate_irrf_2026(
     b.amount,
     coalesce((select sum(sl.amount) from public.rh_payroll_result_lines sl join public.rh_rubric_versions srv on srv.id=sl.rubric_version_id join public.rh_rubrics sr on sr.id=srv.rubric_id where sl.worker_result_id=wr.id and sr.code=rv.formula_config->>'socialSecurityRubricCode'),0),
     coalesce(ctx.dependent_count,0),coalesce(ctx.other_irrf_deductions,0),coalesce(ctx.external_irrf_taxable_income,0),pv.table_value)
   else 0 end)::numeric,2),
 case when rv.formula_type='IRRF_MONTHLY_2026' then
   jsonb_build_object('phase','DERIVED','formulaType',rv.formula_type,'baseCode',b.base_code,'baseAmount',b.amount,'parameterCode',pp.code,'parameterVersion',pv.version,'irrf',public.rh_irrf_2026_trace(
     b.amount,
     coalesce((select sum(sl.amount) from public.rh_payroll_result_lines sl join public.rh_rubric_versions srv on srv.id=sl.rubric_version_id join public.rh_rubrics sr on sr.id=srv.rubric_id where sl.worker_result_id=wr.id and sr.code=rv.formula_config->>'socialSecurityRubricCode'),0),
     coalesce(ctx.dependent_count,0),coalesce(ctx.other_irrf_deductions,0),coalesce(ctx.external_irrf_taxable_income,0),pv.table_value))
 else jsonb_build_object('phase','DERIVED','formulaType',rv.formula_type,'baseCode',b.base_code,'baseAmount',b.amount,'parameterCode',pp.code,'parameterVersion',pv.version,'externalSocialSecurityBase',coalesce(ctx.external_social_security_base,0),'accumulationOrder',coalesce(ctx.accumulation_order,100)) end
 from public.rh_payroll_worker_results wr
 join public.rh_employments e on e.id=wr.employment_id
 join public.rh_workers w on w.id=e.worker_id
 left join public.rh_payroll_worker_tax_contexts ctx on ctx.period_id=p_period_id and ctx.employment_id=e.id
 join public.rh_rubric_versions rv on rv.organization_id=v_org and rv.auto_calculate=true and rv.status='PUBLISHED' and rv.valid_from<=v_ref and(rv.valid_to is null or rv.valid_to>v_ref)
 join public.rh_rubrics r on r.id=rv.rubric_id and r.active=true
 join public.rh_payroll_bases b on b.worker_result_id=wr.id and b.base_code=rv.formula_config->>'baseCode'
 join public.rh_payroll_parameters pp on pp.organization_id=v_org and pp.code=rv.formula_config->>'parameterCode'
 join public.rh_payroll_parameter_versions pv on pv.parameter_id=pp.id and pv.status='PUBLISHED' and pv.valid_from<=v_ref and(pv.valid_to is null or pv.valid_to>v_ref)
 where wr.run_id=v_run and rv.formula_type in('PERCENT_OF_BASE','BRACKET_DEDUCTION','MARGINAL_PROGRESSIVE','MARGINAL_PROGRESSIVE_ACCUMULATED','IRRF_MONTHLY_2026');

 update public.rh_payroll_worker_results wr set gross_amount=coalesce(x.gross,0),deduction_amount=coalesce(x.deductions,0),net_amount=coalesce(x.gross,0)-coalesce(x.deductions,0)
 from(select l.worker_result_id,sum(case when r.payroll_kind='EARNING'then l.amount else 0 end)gross,sum(case when r.payroll_kind='DEDUCTION'then l.amount else 0 end)deductions from public.rh_payroll_result_lines l join public.rh_rubric_versions rv on rv.id=l.rubric_version_id join public.rh_rubrics r on r.id=rv.rubric_id where l.worker_result_id in(select id from public.rh_payroll_worker_results where run_id=v_run) group by l.worker_result_id)x where wr.id=x.worker_result_id;
 update public.rh_payroll_runs r set status='COMPLETED',completed_at=now(),gross_total=coalesce(x.gross,0),deduction_total=coalesce(x.deductions,0),net_total=coalesce(x.net,0) from(select sum(gross_amount)gross,sum(deduction_amount)deductions,sum(net_amount)net from public.rh_payroll_worker_results where run_id=v_run)x where r.id=v_run;
 update public.rh_payroll_periods set status='CALCULATED',updated_at=now() where id=p_period_id;return v_run;
exception when others then if v_run is not null then update public.rh_payroll_runs set status='FAILED',completed_at=now() where id=v_run;end if;if p_period_id is not null then update public.rh_payroll_periods set status='OPEN',updated_at=now() where id=p_period_id and status='CALCULATING';end if;raise;end$$;
