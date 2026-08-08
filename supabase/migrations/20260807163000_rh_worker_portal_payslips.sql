create table if not exists public.rh_worker_user_links(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
  worker_id uuid not null references public.rh_workers(id) on delete restrict,user_id uuid not null references auth.users(id) on delete cascade,
  active boolean not null default true,valid_from date not null default current_date,valid_to date,
  created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),
  unique(organization_id,worker_id,user_id),check(valid_to is null or valid_to>=valid_from)
);
create table if not exists public.rh_payslip_publications(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
  worker_result_id uuid not null references public.rh_payroll_worker_results(id) on delete restrict,employment_id uuid not null references public.rh_employments(id) on delete restrict,
  worker_id uuid not null references public.rh_workers(id) on delete restrict,period_id uuid not null references public.rh_payroll_periods(id) on delete restrict,
  publication_version integer not null default 1,status text not null default 'DRAFT' check(status in('DRAFT','PUBLISHED','REVOKED')),
  published_at timestamptz,revoked_at timestamptz,reason text,created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),
  unique(worker_result_id,publication_version)
);
alter table public.rh_worker_user_links add constraint rh_worker_user_links_org_id_uq unique(organization_id,id);
alter table public.rh_payslip_publications add constraint rh_payslip_publications_org_id_uq unique(organization_id,id);
alter table public.rh_worker_user_links add constraint rh_worker_user_worker_tenant_fk foreign key(organization_id,worker_id) references public.rh_workers(organization_id,id) on delete restrict;
alter table public.rh_payslip_publications add constraint rh_payslip_employment_tenant_fk foreign key(organization_id,employment_id) references public.rh_employments(organization_id,id) on delete restrict;

alter table public.rh_worker_user_links enable row level security;
alter table public.rh_payslip_publications enable row level security;
create policy rh_admin_read on public.rh_worker_user_links for select to authenticated using(public.has_module_permission(organization_id,'rh','READ',null,null) or user_id=auth.uid());
create policy rh_admin_write on public.rh_worker_user_links for all to authenticated using(public.has_module_permission(organization_id,'rh','EDIT',null,null)) with check(public.has_module_permission(organization_id,'rh','EDIT',null,null));
create policy rh_admin_or_self_read on public.rh_payslip_publications for select to authenticated using(public.has_module_permission(organization_id,'rh','READ',null,null) or exists(select 1 from public.rh_worker_user_links l where l.organization_id=rh_payslip_publications.organization_id and l.worker_id=rh_payslip_publications.worker_id and l.user_id=auth.uid() and l.active and l.valid_from<=current_date and(l.valid_to is null or l.valid_to>=current_date)));
create policy rh_admin_write on public.rh_payslip_publications for all to authenticated using(public.has_module_permission(organization_id,'rh','EDIT',null,null)) with check(public.has_module_permission(organization_id,'rh','EDIT',null,null));

create or replace function public.publish_rh_payslips(p_period_id uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare v_org uuid;v_run uuid;v_count integer:=0;begin
 select organization_id into v_org from public.rh_payroll_periods where id=p_period_id and status='CLOSED';if v_org is null then raise exception 'Competência fechada não encontrada';end if;if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;if not public.has_module_permission(v_org,'rh','APPROVE',null,null) then raise exception 'FORBIDDEN';end if;select id into v_run from public.rh_payroll_runs where period_id=p_period_id and status='COMPLETED' order by run_number desc limit 1;if v_run is null then raise exception 'Execução concluída não encontrada';end if;
 insert into public.rh_payslip_publications(organization_id,worker_result_id,employment_id,worker_id,period_id,status,published_at,created_by)
 select v_org,wr.id,wr.employment_id,e.worker_id,p_period_id,'PUBLISHED',now(),auth.uid() from public.rh_payroll_worker_results wr join public.rh_employments e on e.id=wr.employment_id where wr.run_id=v_run and not exists(select 1 from public.rh_payslip_publications p where p.worker_result_id=wr.id and p.status='PUBLISHED');get diagnostics v_count=row_count;return v_count;
end$$;

create or replace function public.get_my_rh_payslips()
returns table(publication_id uuid,organization_id uuid,period_id uuid,reference_month date,processing_type text,worker_result_id uuid,employment_id uuid,registration_number text,gross_amount numeric,deduction_amount numeric,net_amount numeric,published_at timestamptz)
language sql security definer set search_path=public,pg_temp as $$
 select p.id,p.organization_id,p.period_id,per.reference_month,per.processing_type,p.worker_result_id,p.employment_id,e.registration_number,wr.gross_amount,wr.deduction_amount,wr.net_amount,p.published_at
 from public.rh_payslip_publications p join public.rh_worker_user_links l on l.organization_id=p.organization_id and l.worker_id=p.worker_id and l.user_id=auth.uid() and l.active and l.valid_from<=current_date and(l.valid_to is null or l.valid_to>=current_date)
 join public.rh_payroll_periods per on per.id=p.period_id join public.rh_payroll_worker_results wr on wr.id=p.worker_result_id join public.rh_employments e on e.id=p.employment_id
 where p.status='PUBLISHED' order by per.reference_month desc,p.published_at desc;
$$;

grant execute on function public.publish_rh_payslips(uuid) to authenticated;
grant execute on function public.get_my_rh_payslips() to authenticated;
