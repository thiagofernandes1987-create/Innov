create table if not exists public.rh_payroll_provision_policies(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
  code text not null,name text not null,base_code text not null,percentage numeric(12,6) not null check(percentage>=0),
  valid_from date not null,valid_to date,debit_account text,credit_account text,active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),
  unique(organization_id,code,valid_from),check(valid_to is null or valid_to>valid_from)
);
create table if not exists public.rh_payroll_provisions(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
  run_id uuid not null references public.rh_payroll_runs(id) on delete cascade,worker_result_id uuid not null references public.rh_payroll_worker_results(id) on delete cascade,
  employment_id uuid not null references public.rh_employments(id) on delete restrict,policy_id uuid not null references public.rh_payroll_provision_policies(id) on delete restrict,
  base_amount numeric(18,2) not null,percentage numeric(12,6) not null,amount numeric(18,2) not null,trace jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),
  unique(run_id,worker_result_id,policy_id)
);
create table if not exists public.rh_payroll_accounting_rules(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
  rubric_id uuid not null references public.rh_rubrics(id) on delete restrict,debit_account text not null,credit_account text not null,
  history_code text,description_template text,valid_from date not null,valid_to date,active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),unique(organization_id,rubric_id,valid_from),check(valid_to is null or valid_to>valid_from)
);
create table if not exists public.rh_payroll_accounting_batches(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
  run_id uuid not null references public.rh_payroll_runs(id) on delete restrict,reference_date date not null,status text not null default 'DRAFT' check(status in('DRAFT','GENERATED','REVIEW','APPROVED','EXPORTED','POSTED','CANCELLED')),
  debit_total numeric(18,2) not null default 0,credit_total numeric(18,2) not null default 0,export_reference text,
  created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),approved_by uuid references auth.users(id) on delete set null,approved_at timestamptz,
  unique(run_id)
);
create table if not exists public.rh_payroll_accounting_entries(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
  batch_id uuid not null references public.rh_payroll_accounting_batches(id) on delete cascade,employment_id uuid references public.rh_employments(id) on delete restrict,
  source_type text not null check(source_type in('PAYROLL_LINE','PROVISION')),source_id uuid not null,debit_account text not null,credit_account text not null,
  amount numeric(18,2) not null check(amount>=0),history_code text,description text not null,trace jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),
  unique(batch_id,source_type,source_id)
);

alter table public.rh_payroll_provision_policies add constraint rh_provision_policy_org_id_uq unique(organization_id,id);
alter table public.rh_payroll_accounting_batches add constraint rh_accounting_batch_org_id_uq unique(organization_id,id);
alter table public.rh_payroll_provisions add constraint rh_provision_emp_tenant_fk foreign key(organization_id,employment_id) references public.rh_employments(organization_id,id) on delete restrict;
alter table public.rh_payroll_accounting_entries drop constraint if exists rh_payroll_accounting_entries_batch_id_fkey;
alter table public.rh_payroll_accounting_entries add constraint rh_account_entry_batch_tenant_fk foreign key(organization_id,batch_id) references public.rh_payroll_accounting_batches(organization_id,id) on delete cascade;

do $$declare t text;begin foreach t in array array['rh_payroll_provision_policies','rh_payroll_provisions','rh_payroll_accounting_rules','rh_payroll_accounting_batches','rh_payroll_accounting_entries'] loop execute format('alter table public.%I enable row level security',t);execute format('create policy rh_read on public.%I for select to authenticated using(public.has_module_permission(organization_id,''rh'',''READ'',null,null))',t);execute format('create policy rh_write on public.%I for all to authenticated using(public.has_module_permission(organization_id,''rh'',''EDIT'',null,null)) with check(public.has_module_permission(organization_id,''rh'',''EDIT'',null,null))',t);end loop;end$$;

create or replace function public.generate_rh_payroll_provisions(p_run_id uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare v_org uuid;v_period date;v_count integer:=0;begin
 select r.organization_id,p.reference_month into v_org,v_period from public.rh_payroll_runs r join public.rh_payroll_periods p on p.id=r.period_id where r.id=p_run_id and r.status='COMPLETED';if v_org is null then raise exception 'Execução concluída não encontrada';end if;if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;if not public.has_module_permission(v_org,'rh','EDIT',null,null) then raise exception 'FORBIDDEN';end if;
 delete from public.rh_payroll_provisions where run_id=p_run_id;
 insert into public.rh_payroll_provisions(organization_id,run_id,worker_result_id,employment_id,policy_id,base_amount,percentage,amount,trace)
 select v_org,p_run_id,wr.id,wr.employment_id,pol.id,b.amount,pol.percentage,round(b.amount*pol.percentage/100,2),jsonb_build_object('baseCode',pol.base_code,'policyCode',pol.code,'referenceMonth',v_period)
 from public.rh_payroll_worker_results wr join public.rh_payroll_provision_policies pol on pol.organization_id=v_org and pol.active and pol.valid_from<=v_period and(pol.valid_to is null or pol.valid_to>v_period)
 join public.rh_payroll_bases b on b.run_id=p_run_id and b.worker_result_id=wr.id and b.base_code=pol.base_code where wr.run_id=p_run_id;
 get diagnostics v_count=row_count;return v_count;
end$$;

create or replace function public.generate_rh_payroll_accounting_batch(p_run_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_org uuid;v_period date;v_batch uuid;v_missing integer;v_debit numeric;v_credit numeric;begin
 select r.organization_id,p.reference_month into v_org,v_period from public.rh_payroll_runs r join public.rh_payroll_periods p on p.id=r.period_id where r.id=p_run_id and r.status='COMPLETED';if v_org is null then raise exception 'Execução concluída não encontrada';end if;if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;if not public.has_module_permission(v_org,'rh','EDIT',null,null) then raise exception 'FORBIDDEN';end if;
 select count(*) into v_missing from public.rh_payroll_result_lines l join public.rh_payroll_worker_results wr on wr.id=l.worker_result_id join public.rh_rubric_versions rv on rv.id=l.rubric_version_id where wr.run_id=p_run_id and l.amount<>0 and not exists(select 1 from public.rh_payroll_accounting_rules ar where ar.organization_id=v_org and ar.rubric_id=rv.rubric_id and ar.active and ar.valid_from<=v_period and(ar.valid_to is null or ar.valid_to>v_period));if v_missing>0 then raise exception 'Existem % linhas de folha sem mapeamento contábil',v_missing;end if;
 if exists(select 1 from public.rh_payroll_accounting_batches where run_id=p_run_id) then select id into v_batch from public.rh_payroll_accounting_batches where run_id=p_run_id;delete from public.rh_payroll_accounting_entries where batch_id=v_batch;update public.rh_payroll_accounting_batches set status='DRAFT',debit_total=0,credit_total=0 where id=v_batch;else insert into public.rh_payroll_accounting_batches(organization_id,run_id,reference_date,status,created_by) values(v_org,p_run_id,v_period,'DRAFT',auth.uid()) returning id into v_batch;end if;
 insert into public.rh_payroll_accounting_entries(organization_id,batch_id,employment_id,source_type,source_id,debit_account,credit_account,amount,history_code,description,trace)
 select v_org,v_batch,wr.employment_id,'PAYROLL_LINE',l.id,ar.debit_account,ar.credit_account,abs(l.amount),ar.history_code,coalesce(ar.description_template,r.name)||' - '||e.registration_number,jsonb_build_object('rubricCode',r.code,'rubricVersion',rv.version,'workerResultId',wr.id)
 from public.rh_payroll_result_lines l join public.rh_payroll_worker_results wr on wr.id=l.worker_result_id join public.rh_employments e on e.id=wr.employment_id join public.rh_rubric_versions rv on rv.id=l.rubric_version_id join public.rh_rubrics r on r.id=rv.rubric_id join public.rh_payroll_accounting_rules ar on ar.organization_id=v_org and ar.rubric_id=r.id and ar.active and ar.valid_from<=v_period and(ar.valid_to is null or ar.valid_to>v_period) where wr.run_id=p_run_id and l.amount<>0;
 insert into public.rh_payroll_accounting_entries(organization_id,batch_id,employment_id,source_type,source_id,debit_account,credit_account,amount,history_code,description,trace)
 select v_org,v_batch,p.employment_id,'PROVISION',p.id,pol.debit_account,pol.credit_account,p.amount,'PROV-'||pol.code,pol.name,jsonb_build_object('policyCode',pol.code,'baseAmount',p.base_amount,'percentage',p.percentage)
 from public.rh_payroll_provisions p join public.rh_payroll_provision_policies pol on pol.id=p.policy_id where p.run_id=p_run_id and p.amount<>0 and pol.debit_account is not null and pol.credit_account is not null;
 select coalesce(sum(amount),0),coalesce(sum(amount),0) into v_debit,v_credit from public.rh_payroll_accounting_entries where batch_id=v_batch;update public.rh_payroll_accounting_batches set status='GENERATED',debit_total=v_debit,credit_total=v_credit where id=v_batch;return v_batch;
end$$;

create or replace function public.approve_rh_payroll_accounting_batch(p_batch_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$declare v_org uuid;v_d numeric;v_c numeric;begin select organization_id,debit_total,credit_total into v_org,v_d,v_c from public.rh_payroll_accounting_batches where id=p_batch_id for update;if v_org is null then raise exception 'Lote contábil não encontrado';end if;if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;if not public.has_module_permission(v_org,'rh','APPROVE',null,null) then raise exception 'FORBIDDEN';end if;if v_d<>v_c then raise exception 'Lote contábil não balanceado';end if;update public.rh_payroll_accounting_batches set status='APPROVED',approved_by=auth.uid(),approved_at=now() where id=p_batch_id and status='GENERATED';if not found then raise exception 'Lote não está pronto para aprovação';end if;end$$;

grant execute on function public.generate_rh_payroll_provisions(uuid) to authenticated;
grant execute on function public.generate_rh_payroll_accounting_batch(uuid) to authenticated;
grant execute on function public.approve_rh_payroll_accounting_batch(uuid) to authenticated;
