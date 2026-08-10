create table if not exists public.rh_payslip_access_log(
 id bigserial primary key,organization_id uuid not null references public.organizations(id) on delete restrict,publication_id uuid not null references public.rh_payslip_publications(id) on delete restrict,actor_user_id uuid references auth.users(id) on delete set null,access_kind text not null check(access_kind in('VIEW','PDF')),worker_self_service boolean not null default false,accessed_at timestamptz not null default now()
);
alter table public.rh_payslip_access_log enable row level security;
create policy rh_payslip_access_internal on public.rh_payslip_access_log for select to authenticated using(public.has_module_permission(organization_id,'rh','READ',null,'sensitive'));

create or replace function public.get_rh_payslip_pdf_data(p_publication_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.rh_payslip_publications%rowtype;v_self boolean:=false;v_result jsonb;begin
 select * into p from public.rh_payslip_publications where id=p_publication_id and status='PUBLISHED';if p.id is null then raise exception 'Recibo publicado não encontrado';end if;
 if public.has_module_permission(p.organization_id,'rh','READ',null,null) then v_self:=false;
 elsif exists(select 1 from public.rh_worker_user_links l where l.organization_id=p.organization_id and l.worker_id=p.worker_id and l.user_id=auth.uid() and l.active and l.valid_from<=current_date and(l.valid_to is null or l.valid_to>=current_date)) then v_self:=true;
 else raise exception 'FORBIDDEN';end if;
 select jsonb_build_object(
  'publicationId',p.id,'organizationId',p.organization_id,'publicationVersion',p.publication_version,'publishedAt',p.published_at,
  'referenceMonth',per.reference_month,'processingType',per.processing_type,'payDate',per.pay_date,'registrationNumber',e.registration_number,
  'workerName',coalesce(pe.preferred_name,pe.full_name),'workerFullName',pe.full_name,'cpf',pe.cpf,
  'grossAmount',wr.gross_amount,'deductionAmount',wr.deduction_amount,'netAmount',wr.net_amount,
  'lines',coalesce((select jsonb_agg(jsonb_build_object('code',r.code,'name',r.name,'kind',r.payroll_kind,'quantity',l.quantity,'baseAmount',l.base_amount,'amount',l.amount,'trace',l.trace) order by l.calculation_order,l.id) from public.rh_payroll_result_lines l join public.rh_rubric_versions rv on rv.id=l.rubric_version_id join public.rh_rubrics r on r.id=rv.rubric_id where l.worker_result_id=p.worker_result_id),'[]'::jsonb)
 ) into v_result
 from public.rh_payroll_periods per join public.rh_payroll_worker_results wr on wr.id=p.worker_result_id join public.rh_employments e on e.id=p.employment_id join public.rh_workers w on w.id=p.worker_id join public.rh_people pe on pe.id=w.person_id where per.id=p.period_id;
 insert into public.rh_payslip_access_log(organization_id,publication_id,actor_user_id,access_kind,worker_self_service) values(p.organization_id,p.id,auth.uid(),'PDF',v_self);
 return v_result;
end$$;
grant execute on function public.get_rh_payslip_pdf_data(uuid) to authenticated;
