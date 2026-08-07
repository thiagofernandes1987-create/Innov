create or replace function public.create_rh_worker_esocial_profile_version(
  p_worker_id uuid,p_valid_from date,p_full_name text,p_social_name text,p_sex text,p_race_color integer,p_marital_status integer,
  p_education_level text,p_nationality_country_code text,p_street_type text,p_street text,p_street_number text,p_complement text,
  p_neighborhood text,p_postal_code text,p_city_ibge_code text,p_state_code text,p_phone text,p_email text,p_reason text
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_org uuid;v_current public.rh_worker_esocial_profiles%rowtype;v_new uuid;v_person uuid;
begin
 select organization_id,person_id into v_org,v_person from public.rh_workers where id=p_worker_id;
 if v_org is null then raise exception 'Trabalhador não encontrado';end if;
 if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;
 if not public.has_module_permission(v_org,'rh','EDIT',null,null) then raise exception 'FORBIDDEN';end if;
 if p_valid_from is null then raise exception 'Vigência obrigatória';end if;
 select * into v_current from public.rh_worker_esocial_profiles where worker_id=p_worker_id and valid_from<=p_valid_from and(valid_to is null or valid_to>p_valid_from) order by valid_from desc limit 1 for update;
 if v_current.id is not null and v_current.valid_from=p_valid_from then raise exception 'Já existe versão eSocial do trabalhador nesta data';end if;
 if v_current.id is not null then update public.rh_worker_esocial_profiles set valid_to=p_valid_from where id=v_current.id;end if;
 insert into public.rh_worker_esocial_profiles(
  organization_id,worker_id,valid_from,full_name,social_name,sex,race_color,marital_status,education_level,nationality_country_code,
  street_type,street,street_number,complement,neighborhood,postal_code,city_ibge_code,state_code,phone,email,source_type,source_id,created_by
 ) values(v_org,p_worker_id,p_valid_from,p_full_name,p_social_name,p_sex,p_race_color,p_marital_status,p_education_level,p_nationality_country_code,
  p_street_type,p_street,p_street_number,p_complement,p_neighborhood,p_postal_code,p_city_ibge_code,p_state_code,p_phone,p_email,'PROFILE_CHANGE',null,auth.uid()) returning id into v_new;
 update public.rh_people set full_name=p_full_name,preferred_name=coalesce(p_social_name,preferred_name),email=p_email,phone=p_phone,updated_at=now() where id=v_person and organization_id=v_org;
 return v_new;
end$$;

create or replace function public.create_rh_employment_esocial_contract_profile_version(
  p_employment_id uuid,p_valid_from date,p_social_security_regime_type integer,p_work_regime_journey integer,p_activity_nature integer,
  p_union_base_month integer,p_fixed_salary_unit integer,p_contract_type integer,p_contract_end_date date,p_reciprocal_termination_clause text,
  p_determined_object text,p_journey_type integer,p_partial_time_type integer,p_night_work text
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_org uuid;v_current public.rh_employment_esocial_contract_profiles%rowtype;v_new uuid;
begin
 select organization_id into v_org from public.rh_employments where id=p_employment_id;
 if v_org is null then raise exception 'Vínculo não encontrado';end if;
 if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;
 if not public.has_module_permission(v_org,'rh','EDIT',null,null) then raise exception 'FORBIDDEN';end if;
 select * into v_current from public.rh_employment_esocial_contract_profiles where employment_id=p_employment_id and valid_from<=p_valid_from and(valid_to is null or valid_to>p_valid_from) order by valid_from desc limit 1 for update;
 if v_current.id is not null and v_current.valid_from=p_valid_from then raise exception 'Já existe versão contratual eSocial nesta data';end if;
 if v_current.id is not null then update public.rh_employment_esocial_contract_profiles set valid_to=p_valid_from where id=v_current.id;end if;
 insert into public.rh_employment_esocial_contract_profiles(
  organization_id,employment_id,valid_from,social_security_regime_type,work_regime_journey,activity_nature,union_base_month,fixed_salary_unit,
  contract_type,contract_end_date,reciprocal_termination_clause,determined_object,journey_type,partial_time_type,night_work,source_type,created_by
 ) values(v_org,p_employment_id,p_valid_from,p_social_security_regime_type,p_work_regime_journey,p_activity_nature,p_union_base_month,p_fixed_salary_unit,
  p_contract_type,p_contract_end_date,p_reciprocal_termination_clause,p_determined_object,p_journey_type,p_partial_time_type,p_night_work,'CONTRACT_CHANGE',auth.uid()) returning id into v_new;
 return v_new;
end$$;

grant execute on function public.create_rh_worker_esocial_profile_version(uuid,date,text,text,text,integer,integer,text,text,text,text,text,text,text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.create_rh_employment_esocial_contract_profile_version(uuid,date,integer,integer,integer,integer,integer,integer,date,text,text,integer,integer,text) to authenticated;
