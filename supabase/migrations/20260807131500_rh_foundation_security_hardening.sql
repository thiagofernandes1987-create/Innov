-- Hardening da primeira vertical RH.
-- Impede referência cross-tenant e exige capability RH também no RLS.

alter table public.rh_people add constraint rh_people_org_id_uq unique(organization_id,id);
alter table public.rh_workers add constraint rh_workers_org_id_uq unique(organization_id,id);
alter table public.rh_employments add constraint rh_employments_org_id_uq unique(organization_id,id);
alter table public.rh_rubrics add constraint rh_rubrics_org_id_uq unique(organization_id,id);
alter table public.rh_rubric_versions add constraint rh_rubric_versions_org_id_uq unique(organization_id,id);
alter table public.rh_payroll_periods add constraint rh_payroll_periods_org_id_uq unique(organization_id,id);
alter table public.rh_payroll_runs add constraint rh_payroll_runs_org_id_uq unique(organization_id,id);
alter table public.rh_payroll_worker_results add constraint rh_payroll_worker_results_org_id_uq unique(organization_id,id);

alter table public.rh_workers add constraint rh_workers_person_tenant_fk foreign key(organization_id,person_id) references public.rh_people(organization_id,id) on delete restrict;
alter table public.rh_employments add constraint rh_employments_worker_tenant_fk foreign key(organization_id,worker_id) references public.rh_workers(organization_id,id) on delete restrict;
alter table public.rh_rubric_versions add constraint rh_rubric_versions_rubric_tenant_fk foreign key(organization_id,rubric_id) references public.rh_rubrics(organization_id,id) on delete restrict;
alter table public.rh_payroll_inputs add constraint rh_payroll_inputs_period_tenant_fk foreign key(organization_id,period_id) references public.rh_payroll_periods(organization_id,id) on delete restrict;
alter table public.rh_payroll_inputs add constraint rh_payroll_inputs_employment_tenant_fk foreign key(organization_id,employment_id) references public.rh_employments(organization_id,id) on delete restrict;
alter table public.rh_payroll_inputs add constraint rh_payroll_inputs_rubric_version_tenant_fk foreign key(organization_id,rubric_version_id) references public.rh_rubric_versions(organization_id,id) on delete restrict;
alter table public.rh_payroll_runs add constraint rh_payroll_runs_period_tenant_fk foreign key(organization_id,period_id) references public.rh_payroll_periods(organization_id,id) on delete restrict;
alter table public.rh_payroll_worker_results add constraint rh_payroll_worker_results_run_tenant_fk foreign key(organization_id,run_id) references public.rh_payroll_runs(organization_id,id) on delete cascade;
alter table public.rh_payroll_worker_results add constraint rh_payroll_worker_results_employment_tenant_fk foreign key(organization_id,employment_id) references public.rh_employments(organization_id,id) on delete restrict;
alter table public.rh_payroll_result_lines add constraint rh_payroll_result_lines_worker_result_tenant_fk foreign key(organization_id,worker_result_id) references public.rh_payroll_worker_results(organization_id,id) on delete cascade;
alter table public.rh_payroll_result_lines add constraint rh_payroll_result_lines_rubric_tenant_fk foreign key(organization_id,rubric_version_id) references public.rh_rubric_versions(organization_id,id) on delete restrict;
alter table public.rh_payroll_closures add constraint rh_payroll_closures_period_tenant_fk foreign key(organization_id,period_id) references public.rh_payroll_periods(organization_id,id) on delete restrict;
alter table public.rh_payroll_closures add constraint rh_payroll_closures_run_tenant_fk foreign key(organization_id,run_id) references public.rh_payroll_runs(organization_id,id) on delete restrict;

-- Troca a política de membership simples por autorização do núcleo modular.
do $$
declare t text;
begin
  foreach t in array array['rh_people','rh_workers','rh_employments','rh_rubrics','rh_rubric_versions','rh_payroll_periods','rh_payroll_inputs','rh_payroll_runs','rh_payroll_worker_results','rh_payroll_result_lines','rh_payroll_closures']
  loop
    execute format('drop policy if exists %I on public.%I','rh_tenant_read',t);
    execute format('drop policy if exists %I on public.%I','rh_tenant_write',t);
    execute format($policy$
      create policy rh_tenant_read on public.%I for select to authenticated
      using(public.has_module_permission(
        p_organization_id => organization_id,
        p_module_key => 'rh',
        p_required_level => 'READ',
        p_project_id => null,
        p_action => null
      ))
    $policy$,t);
    execute format($policy$
      create policy rh_tenant_write on public.%I for all to authenticated
      using(public.has_module_permission(
        p_organization_id => organization_id,
        p_module_key => 'rh',
        p_required_level => 'EDIT',
        p_project_id => null,
        p_action => null
      ))
      with check(public.has_module_permission(
        p_organization_id => organization_id,
        p_module_key => 'rh',
        p_required_level => 'EDIT',
        p_project_id => null,
        p_action => null
      ))
    $policy$,t);
  end loop;
end$$;

create or replace function public.close_rh_payroll(p_period_id uuid,p_reason text default null)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_org uuid; v_run uuid; v_closure uuid; v_status text; v_result_count integer;
begin
  select organization_id,status into v_org,v_status from public.rh_payroll_periods where id=p_period_id for update;
  if v_org is null then raise exception 'Período não encontrado'; end if;
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if not public.has_module_permission(v_org,'rh','READ',null,'approve') then raise exception 'FORBIDDEN'; end if;
  if v_status not in ('CALCULATED','REVIEW') then raise exception 'Somente folha calculada/em conferência pode ser fechada'; end if;
  if exists(select 1 from public.rh_payroll_closures where period_id=p_period_id) then raise exception 'Competência já possui fechamento'; end if;
  select id into v_run from public.rh_payroll_runs where period_id=p_period_id and status='COMPLETED' order by run_number desc limit 1;
  if v_run is null then raise exception 'Calcule a folha antes de fechar'; end if;
  select count(*) into v_result_count from public.rh_payroll_worker_results where run_id=v_run;
  if v_result_count=0 then raise exception 'Folha sem trabalhadores calculados não pode ser fechada'; end if;
  insert into public.rh_payroll_closures(organization_id,period_id,run_id,closed_by,reason)
  values(v_org,p_period_id,v_run,auth.uid(),nullif(trim(coalesce(p_reason,'')),'')) returning id into v_closure;
  update public.rh_payroll_periods set status='CLOSED',updated_at=now() where id=p_period_id;
  return v_closure;
end$$;
