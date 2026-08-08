create table if not exists public.rh_termination_line_rubric_mappings(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  line_code text not null,
  rubric_version_id uuid not null references public.rh_rubric_versions(id) on delete restrict,
  valid_from date not null,
  valid_to date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(organization_id,line_code,valid_from),
  check(valid_to is null or valid_to>valid_from)
);
alter table public.rh_termination_line_rubric_mappings enable row level security;
create policy rh_read on public.rh_termination_line_rubric_mappings for select to authenticated using(public.has_module_permission(organization_id,'rh','READ',null,null));
create policy rh_write on public.rh_termination_line_rubric_mappings for all to authenticated using(public.has_module_permission(organization_id,'rh','EDIT',null,null)) with check(public.has_module_permission(organization_id,'rh','EDIT',null,null));

alter table public.rh_termination_cases add column if not exists tsv_category_code text;
alter table public.rh_termination_cases add constraint rh_termination_tsv_category_format check(tsv_category_code is null or tsv_category_code ~ '^[0-9]{3}$');

create or replace function public.apply_rh_termination_rubric_mappings(p_calculation_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_org uuid;v_date date;begin
 select c.organization_id,c.termination_date into v_org,v_date from public.rh_termination_calculations x join public.rh_termination_cases c on c.id=x.termination_case_id where x.id=p_calculation_id;
 if v_org is null then raise exception 'Cálculo não encontrado';end if;
 if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;
 if not public.has_module_permission(v_org,'rh','EDIT',null,null) then raise exception 'FORBIDDEN';end if;
 update public.rh_termination_result_lines l set payroll_rubric_version_id=m.rubric_version_id,esocial_nature_code=rv.esocial_nature_code,cod_inc_cp=rv.cod_inc_cp,cod_inc_irrf=rv.cod_inc_irrf,cod_inc_fgts=rv.cod_inc_fgts
 from public.rh_termination_line_rubric_mappings m join public.rh_rubric_versions rv on rv.id=m.rubric_version_id
 where l.calculation_id=p_calculation_id and l.organization_id=v_org and m.organization_id=v_org and m.line_code=l.line_code and m.valid_from<=v_date and(m.valid_to is null or m.valid_to>v_date) and rv.status='PUBLISHED' and rv.valid_from<=v_date and(rv.valid_to is null or rv.valid_to>v_date);
end$$;

grant execute on function public.apply_rh_termination_rubric_mappings(uuid) to authenticated;
