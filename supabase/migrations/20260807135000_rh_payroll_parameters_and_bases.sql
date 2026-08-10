-- Folha V2: bases declarativas, parâmetros por vigência e fórmulas derivadas.

alter table public.rh_rubric_versions drop constraint if exists rh_rubric_versions_formula_type_check;
alter table public.rh_rubric_versions
  add constraint rh_rubric_versions_formula_type_check check(formula_type in(
    'MANUAL','FIXED','QUANTITY_X_RATE','PERCENT_OF_AMOUNT',
    'PERCENT_OF_BASE','BRACKET_DEDUCTION','MARGINAL_PROGRESSIVE'
  ));
alter table public.rh_rubric_versions add column if not exists auto_calculate boolean not null default false;
alter table public.rh_rubric_versions add column if not exists formula_config jsonb not null default '{}'::jsonb;

create table if not exists public.rh_payroll_parameters(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code text not null,
  name text not null,
  category text not null default 'GENERAL',
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(organization_id,code)
);

create table if not exists public.rh_payroll_parameter_versions(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  parameter_id uuid not null references public.rh_payroll_parameters(id) on delete restrict,
  version integer not null,
  valid_from date not null,
  valid_to date,
  numeric_value numeric(18,8),
  table_value jsonb,
  source_reference text,
  status text not null default 'PUBLISHED' check(status in('DRAFT','PUBLISHED','SUPERSEDED','CLOSED')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(parameter_id,version),
  check(valid_to is null or valid_to>valid_from),
  check((numeric_value is not null)::integer+(table_value is not null)::integer=1)
);

create table if not exists public.rh_payroll_base_definitions(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code text not null,
  name text not null,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(organization_id,code)
);

create table if not exists public.rh_payroll_base_members(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  base_definition_id uuid not null references public.rh_payroll_base_definitions(id) on delete cascade,
  rubric_id uuid not null references public.rh_rubrics(id) on delete restrict,
  factor numeric(9,6) not null default 1,
  valid_from date not null,
  valid_to date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(base_definition_id,rubric_id,valid_from),
  check(valid_to is null or valid_to>valid_from)
);

create table if not exists public.rh_payroll_bases(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  run_id uuid not null references public.rh_payroll_runs(id) on delete cascade,
  worker_result_id uuid not null references public.rh_payroll_worker_results(id) on delete cascade,
  base_definition_id uuid not null references public.rh_payroll_base_definitions(id) on delete restrict,
  base_code text not null,
  amount numeric(18,2) not null,
  composition jsonb not null default '[]'::jsonb,
  unique(worker_result_id,base_definition_id)
);

alter table public.rh_payroll_parameters add constraint rh_payroll_parameters_org_id_uq unique(organization_id,id);
alter table public.rh_payroll_parameter_versions add constraint rh_payroll_parameter_versions_org_id_uq unique(organization_id,id);
alter table public.rh_payroll_base_definitions add constraint rh_payroll_base_definitions_org_id_uq unique(organization_id,id);
alter table public.rh_payroll_base_members add constraint rh_payroll_base_members_org_id_uq unique(organization_id,id);

alter table public.rh_payroll_parameter_versions add constraint rh_parameter_version_tenant_fk foreign key(organization_id,parameter_id) references public.rh_payroll_parameters(organization_id,id) on delete restrict;
alter table public.rh_payroll_base_members add constraint rh_base_member_definition_tenant_fk foreign key(organization_id,base_definition_id) references public.rh_payroll_base_definitions(organization_id,id) on delete cascade;
alter table public.rh_payroll_base_members add constraint rh_base_member_rubric_tenant_fk foreign key(organization_id,rubric_id) references public.rh_rubrics(organization_id,id) on delete restrict;
alter table public.rh_payroll_bases add constraint rh_payroll_bases_run_tenant_fk foreign key(organization_id,run_id) references public.rh_payroll_runs(organization_id,id) on delete cascade;
alter table public.rh_payroll_bases add constraint rh_payroll_bases_worker_tenant_fk foreign key(organization_id,worker_result_id) references public.rh_payroll_worker_results(organization_id,id) on delete cascade;
alter table public.rh_payroll_bases add constraint rh_payroll_bases_definition_tenant_fk foreign key(organization_id,base_definition_id) references public.rh_payroll_base_definitions(organization_id,id) on delete restrict;

alter table public.rh_payroll_parameter_versions add constraint rh_parameter_versions_no_overlap exclude using gist(parameter_id with =,daterange(valid_from,valid_to,'[)') with &&);
alter table public.rh_payroll_base_members add constraint rh_base_members_no_overlap exclude using gist(base_definition_id with =,rubric_id with =,daterange(valid_from,valid_to,'[)') with &&);

do $$ declare t text; begin
 foreach t in array array['rh_payroll_parameters','rh_payroll_parameter_versions','rh_payroll_base_definitions','rh_payroll_base_members','rh_payroll_bases'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy rh_read on public.%I for select to authenticated using(public.has_module_permission(organization_id,''rh'',''READ'',null,null))',t);
  execute format('create policy rh_write on public.%I for all to authenticated using(public.has_module_permission(organization_id,''rh'',''EDIT'',null,null)) with check(public.has_module_permission(organization_id,''rh'',''EDIT'',null,null))',t);
 end loop;
end $$;

create or replace function public.rh_calculate_progressive(p_base numeric,p_table jsonb,p_mode text)
returns numeric language plpgsql immutable set search_path=public,pg_temp as $$
declare v_amount numeric:=0;v_item jsonb;v_from numeric;v_to numeric;v_rate numeric;v_deduction numeric;
begin
 if p_base is null or p_base<=0 then return 0; end if;
 if jsonb_typeof(p_table)<>'array' then raise exception 'Tabela progressiva deve ser array'; end if;
 if p_mode='MARGINAL_PROGRESSIVE' then
  for v_item in select value from jsonb_array_elements(p_table) loop
   v_from:=coalesce((v_item->>'from')::numeric,0);
   v_to:=nullif(v_item->>'to','')::numeric;
   v_rate:=coalesce((v_item->>'rate')::numeric,0);
   if p_base>v_from then v_amount:=v_amount+greatest(least(p_base,coalesce(v_to,p_base))-v_from,0)*v_rate/100; end if;
  end loop;
  return round(v_amount,2);
 elsif p_mode='BRACKET_DEDUCTION' then
  select value into v_item from jsonb_array_elements(p_table)
   where p_base>=coalesce(nullif(value->>'from','')::numeric,0)
     and (nullif(value->>'to','') is null or p_base<=nullif(value->>'to','')::numeric)
   order by coalesce(nullif(value->>'from','')::numeric,0) desc limit 1;
  if v_item is null then raise exception 'Nenhuma faixa cobre a base %',p_base; end if;
  v_rate:=coalesce((v_item->>'rate')::numeric,0);v_deduction:=coalesce((v_item->>'deduction')::numeric,0);
  return round(greatest(p_base*v_rate/100-v_deduction,0),2);
 end if;
 raise exception 'Modo progressivo inválido: %',p_mode;
end$$;

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

 -- Fase 1: linhas originadas de lançamentos.
 insert into public.rh_payroll_result_lines(organization_id,worker_result_id,rubric_version_id,input_id,calculation_order,base_amount,quantity,unit_rate,amount,trace)
 select v_org,wr.id,i.rubric_version_id,i.id,rv.calculation_priority,case when rv.formula_type='PERCENT_OF_AMOUNT' then coalesce(i.amount,0) else null end,i.quantity,i.unit_rate,
 round((case rv.formula_type when'MANUAL'then coalesce(i.amount,0) when'FIXED'then coalesce(rv.fixed_value,0) when'QUANTITY_X_RATE'then coalesce(i.quantity,0)*coalesce(i.unit_rate,0) when'PERCENT_OF_AMOUNT'then coalesce(i.amount,0)*coalesce(rv.percent_value,0)/100 else 0 end)::numeric,2),
 jsonb_build_object('phase','INPUT','formulaType',rv.formula_type,'inputAmount',i.amount,'quantity',i.quantity,'unitRate',i.unit_rate,'fixedValue',rv.fixed_value,'percentValue',rv.percent_value,'rubricVersion',rv.version)
 from public.rh_payroll_inputs i join public.rh_rubric_versions rv on rv.id=i.rubric_version_id join public.rh_payroll_worker_results wr on wr.run_id=v_run and wr.employment_id=i.employment_id where i.period_id=p_period_id order by i.employment_id,rv.calculation_priority,i.created_at,i.id;

 -- Fase 2: bases versionadas compostas pelas rubricas calculadas.
 insert into public.rh_payroll_bases(organization_id,run_id,worker_result_id,base_definition_id,base_code,amount,composition)
 select v_org,v_run,wr.id,bd.id,bd.code,round(coalesce(sum(l.amount*bm.factor),0),2),
 coalesce(jsonb_agg(jsonb_build_object('lineId',l.id,'amount',l.amount,'factor',bm.factor)) filter(where l.id is not null),'[]'::jsonb)
 from public.rh_payroll_worker_results wr cross join public.rh_payroll_base_definitions bd
 left join public.rh_payroll_base_members bm on bm.base_definition_id=bd.id and bm.organization_id=v_org and bm.valid_from<=v_ref and(bm.valid_to is null or bm.valid_to>v_ref)
 left join public.rh_payroll_result_lines l on l.worker_result_id=wr.id
 left join public.rh_rubric_versions lrv on lrv.id=l.rubric_version_id and lrv.rubric_id=bm.rubric_id
 where wr.run_id=v_run and bd.organization_id=v_org
 group by wr.id,bd.id,bd.code;

 -- Fase 3: rubricas automáticas derivadas de bases/parâmetros.
 insert into public.rh_payroll_result_lines(organization_id,worker_result_id,rubric_version_id,calculation_order,base_amount,amount,trace)
 select v_org,wr.id,rv.id,rv.calculation_priority,b.amount,
 round((case rv.formula_type
   when'PERCENT_OF_BASE'then b.amount*coalesce(pv.numeric_value,0)/100
   when'BRACKET_DEDUCTION'then public.rh_calculate_progressive(b.amount,pv.table_value,'BRACKET_DEDUCTION')
   when'MARGINAL_PROGRESSIVE'then public.rh_calculate_progressive(b.amount,pv.table_value,'MARGINAL_PROGRESSIVE')
   else 0 end)::numeric,2),
 jsonb_build_object('phase','DERIVED','formulaType',rv.formula_type,'baseCode',b.base_code,'baseAmount',b.amount,'parameterCode',pp.code,'parameterVersion',pv.version)
 from public.rh_payroll_worker_results wr
 join public.rh_rubric_versions rv on rv.organization_id=v_org and rv.auto_calculate=true and rv.status='PUBLISHED' and rv.valid_from<=v_ref and(rv.valid_to is null or rv.valid_to>v_ref)
 join public.rh_rubrics r on r.id=rv.rubric_id and r.active=true
 join public.rh_payroll_bases b on b.worker_result_id=wr.id and b.base_code=rv.formula_config->>'baseCode'
 join public.rh_payroll_parameters pp on pp.organization_id=v_org and pp.code=rv.formula_config->>'parameterCode'
 join public.rh_payroll_parameter_versions pv on pv.parameter_id=pp.id and pv.status='PUBLISHED' and pv.valid_from<=v_ref and(pv.valid_to is null or pv.valid_to>v_ref)
 where wr.run_id=v_run and rv.formula_type in('PERCENT_OF_BASE','BRACKET_DEDUCTION','MARGINAL_PROGRESSIVE');

 update public.rh_payroll_worker_results wr set gross_amount=coalesce(x.gross,0),deduction_amount=coalesce(x.deductions,0),net_amount=coalesce(x.gross,0)-coalesce(x.deductions,0)
 from(select l.worker_result_id,sum(case when r.payroll_kind='EARNING'then l.amount else 0 end)gross,sum(case when r.payroll_kind='DEDUCTION'then l.amount else 0 end)deductions from public.rh_payroll_result_lines l join public.rh_rubric_versions rv on rv.id=l.rubric_version_id join public.rh_rubrics r on r.id=rv.rubric_id where l.worker_result_id in(select id from public.rh_payroll_worker_results where run_id=v_run) group by l.worker_result_id)x where wr.id=x.worker_result_id;
 update public.rh_payroll_runs r set status='COMPLETED',completed_at=now(),gross_total=coalesce(x.gross,0),deduction_total=coalesce(x.deductions,0),net_total=coalesce(x.net,0) from(select sum(gross_amount)gross,sum(deduction_amount)deductions,sum(net_amount)net from public.rh_payroll_worker_results where run_id=v_run)x where r.id=v_run;
 update public.rh_payroll_periods set status='CALCULATED',updated_at=now() where id=p_period_id;return v_run;
exception when others then if v_run is not null then update public.rh_payroll_runs set status='FAILED',completed_at=now() where id=v_run;end if;if p_period_id is not null then update public.rh_payroll_periods set status='OPEN',updated_at=now() where id=p_period_id and status='CALCULATING';end if;raise;end$$;
