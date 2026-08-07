drop function if exists public.activate_rh_admission(uuid,uuid);

create or replace function public.activate_rh_admission(p_case_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare
 c public.rh_admission_cases%rowtype;
 v_esocial public.rh_admission_esocial_profiles%rowtype;
 v_person uuid;v_worker uuid;v_employment uuid;
begin
 if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;
 select * into c from public.rh_admission_cases where id=p_case_id for update;
 if c.id is null then raise exception 'Caso de admissão não encontrado';end if;
 if not public.has_module_permission(c.organization_id,'rh','EDIT',null,null) then raise exception 'FORBIDDEN';end if;
 if c.status='ACTIVATED' then return c.activated_worker_id;end if;
 if c.status<>'REVIEW' then raise exception 'Caso deve estar em revisão antes de ativar';end if;
 if exists(select 1 from public.rh_admission_checklist_items where admission_case_id=c.id and required and status not in('COMPLETED','WAIVED')) then raise exception 'Checklist obrigatório incompleto';end if;
 select * into v_esocial from public.rh_admission_esocial_profiles where admission_case_id=c.id;
 if v_esocial.id is null then raise exception 'Perfil eSocial da admissão obrigatório antes da ativação';end if;
 if c.esocial_strategy='S2190_THEN_S2200' and not exists(
   select 1 from public.rh_esocial_events
   where organization_id=c.organization_id and event_type='S-2190' and source_type='ADMISSION_CASE' and source_id=c.id
     and status in('SIGNED','BATCHED','SENT','PROCESSING','ACCEPTED')
 ) then raise exception 'Estratégia S-2190 exige evento preliminar gerado antes da ativação';end if;
 if c.cpf is not null and exists(select 1 from public.rh_people where organization_id=c.organization_id and cpf=c.cpf) then raise exception 'Já existe pessoa com este CPF';end if;
 if exists(select 1 from public.rh_workers where organization_id=c.organization_id and worker_code=c.worker_code) then raise exception 'Código de trabalhador já existe';end if;
 if exists(select 1 from public.rh_employments where organization_id=c.organization_id and registration_number=c.registration_number) then raise exception 'Matrícula já existe';end if;

 insert into public.rh_people(organization_id,full_name,preferred_name,cpf,birth_date,email,phone,created_by)
 values(c.organization_id,c.full_name,c.preferred_name,c.cpf,c.birth_date,c.email,c.phone,auth.uid()) returning id into v_person;
 insert into public.rh_workers(organization_id,person_id,worker_code,status,created_by)
 values(c.organization_id,v_person,c.worker_code,'ACTIVE',auth.uid()) returning id into v_worker;
 insert into public.rh_employments(organization_id,worker_id,registration_number,employment_type,admission_date,status,base_salary,created_by)
 values(c.organization_id,v_worker,c.registration_number,c.employment_type,c.admission_date,'ACTIVE',c.base_salary,auth.uid()) returning id into v_employment;
 insert into public.rh_employment_conditions(
   organization_id,employment_id,valid_from,employer_id,establishment_id,tax_allocation_id,position_id,function_id,union_id,work_schedule_id,base_salary,esocial_category_code,change_reason,created_by
 ) values(
   c.organization_id,v_employment,c.admission_date,c.employer_id,c.establishment_id,c.tax_allocation_id,c.position_id,c.function_id,c.union_id,c.work_schedule_id,c.base_salary,v_esocial.esocial_category_code,'Admissão',auth.uid()
 );
 update public.rh_admission_cases set status='ACTIVATED',activated_worker_id=v_worker,activated_employment_id=v_employment,activated_at=now(),updated_at=now() where id=c.id;
 return v_worker;
end$$;

grant execute on function public.activate_rh_admission(uuid) to authenticated;
