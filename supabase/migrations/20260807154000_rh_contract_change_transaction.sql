create or replace function public.create_rh_contract_change(
  p_employment_id uuid,p_valid_from date,p_effect_date date,p_description text,
  p_employer_id uuid,p_establishment_id uuid,p_tax_allocation_id uuid,p_position_id uuid,p_function_id uuid,p_union_id uuid,p_work_schedule_id uuid,p_base_salary numeric,
  p_social_security_regime_type integer,p_work_regime_journey integer,p_activity_nature integer,p_union_base_month integer,p_fixed_salary_unit integer,
  p_contract_type integer,p_contract_end_date date,p_reciprocal_termination_clause text,p_determined_object text,p_journey_type integer,p_partial_time_type integer,p_night_work text
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_org uuid;v_current_condition public.rh_employment_conditions%rowtype;v_current_profile public.rh_employment_esocial_contract_profiles%rowtype;v_condition uuid;
begin
 select organization_id into v_org from public.rh_employments where id=p_employment_id for update;
 if v_org is null then raise exception 'Vínculo não encontrado';end if;
 if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;
 if not public.has_module_permission(v_org,'rh','EDIT',null,null) then raise exception 'FORBIDDEN';end if;
 if p_valid_from is null or p_base_salary is null then raise exception 'Vigência e salário são obrigatórios';end if;

 select * into v_current_condition from public.rh_employment_conditions
 where employment_id=p_employment_id and valid_from<=p_valid_from and(valid_to is null or valid_to>p_valid_from)
 order by valid_from desc limit 1 for update;
 if v_current_condition.id is not null and v_current_condition.valid_from=p_valid_from then raise exception 'Já existe condição contratual nesta data';end if;
 if v_current_condition.id is not null then update public.rh_employment_conditions set valid_to=p_valid_from where id=v_current_condition.id;end if;

 select * into v_current_profile from public.rh_employment_esocial_contract_profiles
 where employment_id=p_employment_id and valid_from<=p_valid_from and(valid_to is null or valid_to>p_valid_from)
 order by valid_from desc limit 1 for update;
 if v_current_profile.id is not null and v_current_profile.valid_from=p_valid_from then raise exception 'Já existe perfil contratual eSocial nesta data';end if;
 if v_current_profile.id is not null then update public.rh_employment_esocial_contract_profiles set valid_to=p_valid_from where id=v_current_profile.id;end if;

 insert into public.rh_employment_conditions(
  organization_id,employment_id,valid_from,employer_id,establishment_id,tax_allocation_id,position_id,function_id,union_id,work_schedule_id,base_salary,esocial_category_code,change_reason,created_by
 ) values(
  v_org,p_employment_id,p_valid_from,p_employer_id,p_establishment_id,p_tax_allocation_id,p_position_id,p_function_id,p_union_id,p_work_schedule_id,p_base_salary,
  coalesce(v_current_condition.esocial_category_code,'101'),coalesce(p_description,'Alteração contratual'),auth.uid()
 ) returning id into v_condition;

 insert into public.rh_employment_esocial_contract_profiles(
  organization_id,employment_id,valid_from,social_security_regime_type,work_regime_journey,activity_nature,union_base_month,fixed_salary_unit,
  contract_type,contract_end_date,reciprocal_termination_clause,determined_object,journey_type,partial_time_type,night_work,source_type,source_id,created_by
 ) values(
  v_org,p_employment_id,p_valid_from,p_social_security_regime_type,p_work_regime_journey,p_activity_nature,p_union_base_month,p_fixed_salary_unit,
  p_contract_type,p_contract_end_date,p_reciprocal_termination_clause,p_determined_object,p_journey_type,p_partial_time_type,p_night_work,'CONTRACT_CHANGE',v_condition,auth.uid()
 );

 if p_valid_from<=current_date then update public.rh_employments set base_salary=p_base_salary,updated_at=now() where id=p_employment_id;end if;
 return v_condition;
end$$;

grant execute on function public.create_rh_contract_change(uuid,date,date,text,uuid,uuid,uuid,uuid,uuid,uuid,uuid,numeric,integer,integer,integer,integer,integer,integer,date,text,text,integer,integer,text) to authenticated;
