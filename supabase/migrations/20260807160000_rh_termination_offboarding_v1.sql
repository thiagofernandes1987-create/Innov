create table if not exists public.rh_termination_cases(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  employment_id uuid not null references public.rh_employments(id) on delete restrict,
  termination_number text not null,
  termination_date date not null,
  esocial_reason_code text not null,
  internal_reason text not null,
  notice_type text not null check(notice_type in('WORKED','INDEMNIFIED_EMPLOYER','INDEMNIFIED_EMPLOYEE','NOT_APPLICABLE')),
  notice_days integer not null default 0 check(notice_days>=0),
  projected_notice_end date,
  worked_days_in_month integer not null default 0 check(worked_days_in_month between 0 and 31),
  thirteenth_months integer not null default 0 check(thirteenth_months between 0 and 12),
  proportional_vacation_months integer not null default 0 check(proportional_vacation_months between 0 and 12),
  outstanding_vacation_days numeric(8,2) not null default 0 check(outstanding_vacation_days>=0),
  salary_average_base numeric(18,2) not null default 0,
  fgts_termination_base numeric(18,2) not null default 0,
  fgts_penalty_rate numeric(8,4) not null default 0 check(fgts_penalty_rate>=0),
  pension_percentage numeric(8,4),
  pension_amount numeric(18,2),
  death_certificate_number text,
  collective_dismissal_indicator text check(collective_dismissal_indicator is null or collective_dismissal_indicator in('S','N')),
  status text not null default 'DRAFT' check(status in('DRAFT','CALCULATED','REVIEW','APPROVED','EFFECTIVE','EXTERNAL_PENDING','CLOSED','CANCELLED')),
  effective_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,termination_number),
  check((pension_percentage is null or pension_amount is null))
);

create table if not exists public.rh_termination_calculations(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  termination_case_id uuid not null references public.rh_termination_cases(id) on delete cascade,
  version integer not null,
  salary_base numeric(18,2) not null,
  average_base numeric(18,2) not null default 0,
  calculation_base numeric(18,2) not null,
  gross_amount numeric(18,2) not null default 0,
  deduction_amount numeric(18,2) not null default 0,
  net_amount numeric(18,2) not null default 0,
  status text not null default 'CALCULATED' check(status in('CALCULATED','APPROVED','SUPERSEDED','CANCELLED')),
  trace jsonb not null default '{}'::jsonb,
  calculated_by uuid references auth.users(id) on delete set null,
  calculated_at timestamptz not null default now(),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  unique(termination_case_id,version)
);

create table if not exists public.rh_termination_result_lines(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  calculation_id uuid not null references public.rh_termination_calculations(id) on delete cascade,
  line_code text not null,
  description text not null,
  line_kind text not null check(line_kind in('EARNING','DEDUCTION','INFORMATION')),
  quantity numeric(18,6),
  base_amount numeric(18,2),
  rate numeric(18,6),
  amount numeric(18,2) not null,
  payroll_rubric_version_id uuid references public.rh_rubric_versions(id) on delete restrict,
  esocial_nature_code text,
  cod_inc_cp text,
  cod_inc_irrf text,
  cod_inc_fgts text,
  trace jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(calculation_id,line_code)
);

create table if not exists public.rh_termination_adjustments(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  termination_case_id uuid not null references public.rh_termination_cases(id) on delete cascade,
  code text not null,
  description text not null,
  kind text not null check(kind in('EARNING','DEDUCTION','INFORMATION')),
  amount numeric(18,2) not null,
  payroll_rubric_version_id uuid references public.rh_rubric_versions(id) on delete restrict,
  evidence_reference text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(termination_case_id,code)
);

create table if not exists public.rh_offboarding_tasks(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  termination_case_id uuid not null references public.rh_termination_cases(id) on delete cascade,
  task_type text not null check(task_type in('ACCESS','ASSET','BENEFIT','DOCUMENT','PAYROLL','FINANCE','SST','OTHER')),
  title text not null,
  required boolean not null default true,
  status text not null default 'PENDING' check(status in('PENDING','IN_PROGRESS','DONE','WAIVED','BLOCKED')),
  owner_user_id uuid references auth.users(id) on delete set null,
  due_date date,
  evidence_reference text,
  completed_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(termination_case_id,task_type,title)
);

alter table public.rh_termination_cases add constraint rh_termination_cases_org_id_uq unique(organization_id,id);
alter table public.rh_termination_calculations add constraint rh_termination_calculations_org_id_uq unique(organization_id,id);
alter table public.rh_termination_cases add constraint rh_termination_employment_tenant_fk foreign key(organization_id,employment_id) references public.rh_employments(organization_id,id) on delete restrict;
alter table public.rh_termination_calculations drop constraint if exists rh_termination_calculations_termination_case_id_fkey;
alter table public.rh_termination_calculations add constraint rh_termination_calc_tenant_fk foreign key(organization_id,termination_case_id) references public.rh_termination_cases(organization_id,id) on delete cascade;
alter table public.rh_termination_result_lines drop constraint if exists rh_termination_result_lines_calculation_id_fkey;
alter table public.rh_termination_result_lines add constraint rh_termination_lines_tenant_fk foreign key(organization_id,calculation_id) references public.rh_termination_calculations(organization_id,id) on delete cascade;
alter table public.rh_termination_adjustments drop constraint if exists rh_termination_adjustments_termination_case_id_fkey;
alter table public.rh_termination_adjustments add constraint rh_termination_adjustment_tenant_fk foreign key(organization_id,termination_case_id) references public.rh_termination_cases(organization_id,id) on delete cascade;
alter table public.rh_offboarding_tasks drop constraint if exists rh_offboarding_tasks_termination_case_id_fkey;
alter table public.rh_offboarding_tasks add constraint rh_offboarding_tenant_fk foreign key(organization_id,termination_case_id) references public.rh_termination_cases(organization_id,id) on delete cascade;

do $$ declare t text;begin foreach t in array array['rh_termination_cases','rh_termination_calculations','rh_termination_result_lines','rh_termination_adjustments','rh_offboarding_tasks'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy rh_read on public.%I for select to authenticated using(public.has_module_permission(organization_id,''rh'',''READ'',null,null))',t);
 execute format('create policy rh_write on public.%I for all to authenticated using(public.has_module_permission(organization_id,''rh'',''EDIT'',null,null)) with check(public.has_module_permission(organization_id,''rh'',''EDIT'',null,null))',t);
end loop;end$$;

create or replace function public.create_rh_termination_case(
  p_organization_id uuid,p_employment_id uuid,p_termination_date date,p_esocial_reason_code text,p_internal_reason text,p_notice_type text,p_notice_days integer,
  p_projected_notice_end date,p_worked_days_in_month integer,p_thirteenth_months integer,p_proportional_vacation_months integer,p_outstanding_vacation_days numeric,
  p_salary_average_base numeric,p_fgts_termination_base numeric,p_fgts_penalty_rate numeric,p_pension_percentage numeric,p_pension_amount numeric,p_death_certificate_number text
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;v_number text;
begin
 if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;
 if not public.has_module_permission(p_organization_id,'rh','EDIT',null,null) then raise exception 'FORBIDDEN';end if;
 if not exists(select 1 from public.rh_employments where id=p_employment_id and organization_id=p_organization_id and status in('ACTIVE','SUSPENDED')) then raise exception 'Vínculo inválido para desligamento';end if;
 if p_termination_date is null or coalesce(p_esocial_reason_code,'')='' then raise exception 'Data e motivo eSocial são obrigatórios';end if;
 v_number:='RES-'||to_char(p_termination_date,'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
 insert into public.rh_termination_cases(
  organization_id,employment_id,termination_number,termination_date,esocial_reason_code,internal_reason,notice_type,notice_days,projected_notice_end,
  worked_days_in_month,thirteenth_months,proportional_vacation_months,outstanding_vacation_days,salary_average_base,fgts_termination_base,fgts_penalty_rate,
  pension_percentage,pension_amount,death_certificate_number,created_by
 ) values(p_organization_id,p_employment_id,v_number,p_termination_date,p_esocial_reason_code,p_internal_reason,p_notice_type,coalesce(p_notice_days,0),p_projected_notice_end,
  coalesce(p_worked_days_in_month,0),coalesce(p_thirteenth_months,0),coalesce(p_proportional_vacation_months,0),coalesce(p_outstanding_vacation_days,0),coalesce(p_salary_average_base,0),coalesce(p_fgts_termination_base,0),coalesce(p_fgts_penalty_rate,0),p_pension_percentage,p_pension_amount,p_death_certificate_number,auth.uid()) returning id into v_id;
 insert into public.rh_offboarding_tasks(organization_id,termination_case_id,task_type,title,required) values
 (p_organization_id,v_id,'PAYROLL','Conferir cálculo rescisório',true),(p_organization_id,v_id,'DOCUMENT','Emitir documentos de desligamento',true),(p_organization_id,v_id,'ACCESS','Revogar acessos na data efetiva',true),(p_organization_id,v_id,'ASSET','Baixar ou recolher ativos vinculados',false),(p_organization_id,v_id,'BENEFIT','Encerrar benefícios conforme regra',true),(p_organization_id,v_id,'FINANCE','Conferir pagamento rescisório',true),(p_organization_id,v_id,'SST','Conferir exame demissional quando aplicável',false);
 return v_id;
end$$;

create or replace function public.calculate_rh_termination(p_case_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.rh_termination_cases%rowtype;v_salary numeric;v_base numeric;v_calc uuid;v_version integer;v_gross numeric:=0;v_ded numeric:=0;v_amount numeric;
begin
 select * into c from public.rh_termination_cases where id=p_case_id for update;if c.id is null then raise exception 'Desligamento não encontrado';end if;
 if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;if not public.has_module_permission(c.organization_id,'rh','EDIT',null,null) then raise exception 'FORBIDDEN';end if;if c.status in('EFFECTIVE','CLOSED','CANCELLED') then raise exception 'Desligamento não permite recálculo';end if;
 select base_salary into v_salary from public.rh_employment_conditions where employment_id=c.employment_id and valid_from<=c.termination_date and(valid_to is null or valid_to>c.termination_date) order by valid_from desc limit 1;if v_salary is null then select base_salary into v_salary from public.rh_employments where id=c.employment_id;end if;if v_salary is null then raise exception 'Salário vigente não encontrado';end if;
 v_base:=round(v_salary+c.salary_average_base,2);select coalesce(max(version),0)+1 into v_version from public.rh_termination_calculations where termination_case_id=c.id;update public.rh_termination_calculations set status='SUPERSEDED' where termination_case_id=c.id and status in('CALCULATED','APPROVED');
 insert into public.rh_termination_calculations(organization_id,termination_case_id,version,salary_base,average_base,calculation_base,calculated_by,trace) values(c.organization_id,c.id,v_version,v_salary,c.salary_average_base,v_base,auth.uid(),jsonb_build_object('salaryBase',v_salary,'averageBase',c.salary_average_base,'terminationDate',c.termination_date,'noticeType',c.notice_type)) returning id into v_calc;
 if c.worked_days_in_month>0 then v_amount:=round(v_base/30*c.worked_days_in_month,2);insert into public.rh_termination_result_lines(organization_id,calculation_id,line_code,description,line_kind,quantity,base_amount,rate,amount,trace) values(c.organization_id,v_calc,'SALARY_BALANCE','Saldo de salário','EARNING',c.worked_days_in_month,v_base,1.0/30,v_amount,jsonb_build_object('formula','base/30*dias'));v_gross:=v_gross+v_amount;end if;
 if c.notice_type='INDEMNIFIED_EMPLOYER' and c.notice_days>0 then v_amount:=round(v_base/30*c.notice_days,2);insert into public.rh_termination_result_lines(organization_id,calculation_id,line_code,description,line_kind,quantity,base_amount,rate,amount,trace) values(c.organization_id,v_calc,'NOTICE_INDEMNITY','Aviso prévio indenizado pelo empregador','EARNING',c.notice_days,v_base,1.0/30,v_amount,jsonb_build_object('formula','base/30*diasAviso'));v_gross:=v_gross+v_amount;end if;
 if c.thirteenth_months>0 then v_amount:=round(v_base/12*c.thirteenth_months,2);insert into public.rh_termination_result_lines(organization_id,calculation_id,line_code,description,line_kind,quantity,base_amount,rate,amount,trace) values(c.organization_id,v_calc,'THIRTEENTH_PROPORTIONAL','13º proporcional','EARNING',c.thirteenth_months,v_base,1.0/12,v_amount,jsonb_build_object('formula','base/12/avos'));v_gross:=v_gross+v_amount;end if;
 if c.proportional_vacation_months>0 then v_amount:=round(v_base/12*c.proportional_vacation_months,2);insert into public.rh_termination_result_lines(organization_id,calculation_id,line_code,description,line_kind,quantity,base_amount,rate,amount,trace) values(c.organization_id,v_calc,'VACATION_PROPORTIONAL','Férias proporcionais','EARNING',c.proportional_vacation_months,v_base,1.0/12,v_amount,jsonb_build_object('formula','base/12/avos'));v_gross:=v_gross+v_amount;insert into public.rh_termination_result_lines(organization_id,calculation_id,line_code,description,line_kind,base_amount,rate,amount,trace) values(c.organization_id,v_calc,'VACATION_PROPORTIONAL_ONE_THIRD','1/3 sobre férias proporcionais','EARNING',v_amount,1.0/3,round(v_amount/3,2),jsonb_build_object('formula','feriasProporcionais/3'));v_gross:=v_gross+round(v_amount/3,2);end if;
 if c.outstanding_vacation_days>0 then v_amount:=round(v_base/30*c.outstanding_vacation_days,2);insert into public.rh_termination_result_lines(organization_id,calculation_id,line_code,description,line_kind,quantity,base_amount,rate,amount,trace) values(c.organization_id,v_calc,'VACATION_OUTSTANDING','Férias vencidas/remanescentes','EARNING',c.outstanding_vacation_days,v_base,1.0/30,v_amount,jsonb_build_object('formula','base/30*dias'));v_gross:=v_gross+v_amount;insert into public.rh_termination_result_lines(organization_id,calculation_id,line_code,description,line_kind,base_amount,rate,amount,trace) values(c.organization_id,v_calc,'VACATION_OUTSTANDING_ONE_THIRD','1/3 sobre férias vencidas/remanescentes','EARNING',v_amount,1.0/3,round(v_amount/3,2),jsonb_build_object('formula','feriasVencidas/3'));v_gross:=v_gross+round(v_amount/3,2);end if;
 if c.fgts_termination_base>0 and c.fgts_penalty_rate>0 then v_amount:=round(c.fgts_termination_base*c.fgts_penalty_rate/100,2);insert into public.rh_termination_result_lines(organization_id,calculation_id,line_code,description,line_kind,base_amount,rate,amount,trace) values(c.organization_id,v_calc,'FGTS_TERMINATION_PENALTY','Indenização FGTS informada para a hipótese rescisória','INFORMATION',c.fgts_termination_base,c.fgts_penalty_rate,v_amount,jsonb_build_object('source','explicit-case-parameters'));end if;
 insert into public.rh_termination_result_lines(organization_id,calculation_id,line_code,description,line_kind,amount,trace) select c.organization_id,v_calc,'ADJ_'||a.code,a.description,a.kind,a.amount,jsonb_build_object('adjustmentId',a.id,'evidence',a.evidence_reference) from public.rh_termination_adjustments a where a.termination_case_id=c.id;
 select coalesce(sum(case when line_kind='EARNING' then amount else 0 end),0),coalesce(sum(case when line_kind='DEDUCTION' then amount else 0 end),0) into v_gross,v_ded from public.rh_termination_result_lines where calculation_id=v_calc;
 update public.rh_termination_calculations set gross_amount=v_gross,deduction_amount=v_ded,net_amount=v_gross-v_ded where id=v_calc;update public.rh_termination_cases set status='CALCULATED',updated_at=now() where id=c.id;return v_calc;
end$$;

create or replace function public.approve_rh_termination_calculation(p_calculation_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_org uuid;v_case uuid;begin select organization_id,termination_case_id into v_org,v_case from public.rh_termination_calculations where id=p_calculation_id for update;if v_org is null then raise exception 'Cálculo não encontrado';end if;if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;if not public.has_module_permission(v_org,'rh','APPROVE',null,null) then raise exception 'FORBIDDEN';end if;update public.rh_termination_calculations set status='APPROVED',approved_by=auth.uid(),approved_at=now() where id=p_calculation_id and status='CALCULATED';if not found then raise exception 'Cálculo não está disponível para aprovação';end if;update public.rh_termination_cases set status='APPROVED',updated_at=now() where id=v_case;end$$;

create or replace function public.make_rh_termination_effective(p_case_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.rh_termination_cases%rowtype;begin select * into c from public.rh_termination_cases where id=p_case_id for update;if c.id is null then raise exception 'Desligamento não encontrado';end if;if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;if not public.has_module_permission(c.organization_id,'rh','APPROVE',null,null) then raise exception 'FORBIDDEN';end if;if c.status<>'APPROVED' then raise exception 'Cálculo rescisório precisa estar aprovado';end if;if not exists(select 1 from public.rh_termination_calculations where termination_case_id=c.id and status='APPROVED') then raise exception 'Não há cálculo aprovado';end if;update public.rh_employments set status='TERMINATED',termination_date=c.termination_date,updated_at=now() where id=c.employment_id and organization_id=c.organization_id;update public.rh_workers w set status=case when exists(select 1 from public.rh_employments e where e.worker_id=w.id and e.organization_id=c.organization_id and e.status='ACTIVE' and e.id<>c.employment_id) then w.status else 'INACTIVE' end,updated_at=now() where id=(select worker_id from public.rh_employments where id=c.employment_id);update public.rh_termination_cases set status='EFFECTIVE',effective_at=now(),updated_at=now() where id=c.id;end$$;

grant execute on function public.create_rh_termination_case(uuid,uuid,date,text,text,text,integer,date,integer,integer,integer,numeric,numeric,numeric,numeric,numeric,numeric,text) to authenticated;
grant execute on function public.calculate_rh_termination(uuid) to authenticated;
grant execute on function public.approve_rh_termination_calculation(uuid) to authenticated;
grant execute on function public.make_rh_termination_effective(uuid) to authenticated;
