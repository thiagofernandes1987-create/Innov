create or replace function public.get_my_rh_payslip_lines(p_publication_id uuid)
returns table(line_id uuid,rubric_code text,rubric_name text,payroll_kind text,quantity numeric,amount numeric,calculation_trace jsonb)
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_wr uuid;begin
 if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;
 select p.worker_result_id into v_wr from public.rh_payslip_publications p
 join public.rh_worker_user_links l on l.organization_id=p.organization_id and l.worker_id=p.worker_id and l.user_id=auth.uid() and l.active and l.valid_from<=current_date and(l.valid_to is null or l.valid_to>=current_date)
 where p.id=p_publication_id and p.status='PUBLISHED';
 if v_wr is null then raise exception 'Recibo não disponível para este usuário';end if;
 return query select ln.id,r.code,r.name,r.payroll_kind,ln.quantity,ln.amount,ln.trace
 from public.rh_payroll_result_lines ln join public.rh_rubric_versions rv on rv.id=ln.rubric_version_id join public.rh_rubrics r on r.id=rv.rubric_id
 where ln.worker_result_id=v_wr order by r.payroll_kind desc,r.code,ln.id;
end$$;
grant execute on function public.get_my_rh_payslip_lines(uuid) to authenticated;
