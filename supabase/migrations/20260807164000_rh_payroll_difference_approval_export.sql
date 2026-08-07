create or replace function public.approve_rh_payroll_difference_case(p_case_id uuid,p_target_period_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.rh_payroll_difference_cases%rowtype;v_missing integer;begin
 select * into c from public.rh_payroll_difference_cases where id=p_case_id for update;if c.id is null then raise exception 'Caso de diferença não encontrado';end if;if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;if not public.has_module_permission(c.organization_id,'rh','APPROVE',null,null) then raise exception 'FORBIDDEN';end if;if c.status not in('CALCULATED','REVIEW') then raise exception 'Caso não está pronto para aprovação';end if;if not exists(select 1 from public.rh_payroll_periods where id=p_target_period_id and organization_id=c.organization_id and status in('OPEN','CALCULATED','REVIEW','REOPENED')) then raise exception 'Competência complementar inválida';end if;select count(*) into v_missing from public.rh_payroll_difference_lines where difference_case_id=c.id and delta_amount<>0 and export_rubric_version_id is null;if v_missing>0 then raise exception 'Existem % diferenças sem rubrica corretiva mapeada',v_missing;end if;update public.rh_payroll_difference_cases set target_period_id=p_target_period_id,status='APPROVED',approved_by=auth.uid(),approved_at=now() where id=c.id;end$$;

create or replace function public.export_rh_payroll_difference_case(p_case_id uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.rh_payroll_difference_cases%rowtype;l public.rh_payroll_difference_lines%rowtype;v_input uuid;v_count integer:=0;begin
 select * into c from public.rh_payroll_difference_cases where id=p_case_id for update;if c.id is null then raise exception 'Caso de diferença não encontrado';end if;if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;if not public.has_module_permission(c.organization_id,'rh','EDIT',null,null) then raise exception 'FORBIDDEN';end if;if c.status<>'APPROVED' or c.target_period_id is null then raise exception 'Caso precisa estar aprovado e possuir competência destino';end if;
 for l in select * from public.rh_payroll_difference_lines where difference_case_id=c.id and delta_amount<>0 order by employment_id,source_rubric_id for update loop
   if l.payroll_input_id is null then
     if l.export_rubric_version_id is null then raise exception 'Diferença % sem rubrica corretiva',l.id;end if;
     insert into public.rh_payroll_inputs(organization_id,period_id,employment_id,rubric_version_id,amount,source_type,source_ref,created_by)
     values(c.organization_id,c.target_period_id,l.employment_id,l.export_rubric_version_id,abs(l.delta_amount),'RETRO_DIFFERENCE',l.id::text,auth.uid()) returning id into v_input;
     update public.rh_payroll_difference_lines set payroll_input_id=v_input where id=l.id;v_count:=v_count+1;
   end if;
 end loop;
 update public.rh_payroll_difference_cases set status='EXPORTED' where id=c.id;return v_count;
end$$;

grant execute on function public.approve_rh_payroll_difference_case(uuid,uuid) to authenticated;
grant execute on function public.export_rh_payroll_difference_case(uuid) to authenticated;
