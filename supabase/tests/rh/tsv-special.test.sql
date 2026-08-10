begin;

do $$
declare
  v_org uuid:=gen_random_uuid();
  v_user uuid:=gen_random_uuid();
  v_person uuid;
  v_worker uuid;
  v_emp uuid;
  v_failed boolean:=false;
begin
  insert into auth.users(id,email) values(v_user,'rh-tsv-special@example.test');
  insert into public.organizations(id,name) values(v_org,'RH TSV especial');
  perform set_config('test.user_id',v_user::text,true);
  perform set_config('test.permission_granted','true',true);

  insert into public.rh_people(organization_id,full_name,cpf,birth_date,created_by)
    values(v_org,'TSVE Especial','12345678901','1980-01-01',v_user) returning id into v_person;
  insert into public.rh_workers(organization_id,person_id,worker_code,status,created_by)
    values(v_org,v_person,'TSVE-SP-001','ACTIVE',v_user) returning id into v_worker;
  insert into public.rh_employments(organization_id,worker_id,registration_number,employment_type,admission_date,status,base_salary,created_by)
    values(v_org,v_worker,'TSVE-SP-001','TSV','2026-08-01','ACTIVE',8000,v_user) returning id into v_emp;

  insert into public.rh_tsv_esocial_profiles(
    organization_id,employment_id,category_code,sex,race_color,education_level,birth_country_code,nationality_country_code,
    street,street_number,postal_code,city_ibge_code,state_code,salary_unit,fgts_option_date,created_by
  ) values(v_org,v_emp,'721','M',3,'09','105','105','Rua Teste','100','12000000','3554102','SP',5,'2026-08-01',v_user);

  update public.rh_tsv_esocial_profiles set
    category_code='401',fgts_option_date=null,special_activity_nature=1,
    union_origin_category='101',union_origin_registration_type=1,union_origin_registration_number='22345678000188',
    union_origin_admission_date='2020-01-02',union_origin_registration='MAT-ORIG-401',union_origin_work_regime=1,union_origin_social_security_regime=1
  where organization_id=v_org and employment_id=v_emp;
  if not exists(select 1 from public.rh_tsv_esocial_profiles where employment_id=v_emp and category_code='401' and union_origin_category='101') then raise exception 'TSVE SPECIAL 1 falhou: 401 válido não persistiu'; end if;

  v_failed:=false;
  begin update public.rh_tsv_esocial_profiles set special_activity_nature=null where organization_id=v_org and employment_id=v_emp;
  exception when check_violation then v_failed:=true; end;
  if not v_failed then raise exception 'TSVE SPECIAL 2 falhou: 401 sem natAtividade não foi bloqueado'; end if;

  update public.rh_tsv_esocial_profiles set
    category_code='305',special_activity_nature=null,
    union_origin_category=null,union_origin_registration_type=null,union_origin_registration_number=null,union_origin_admission_date=null,union_origin_registration=null,union_origin_work_regime=null,union_origin_social_security_regime=null,
    ceded_origin_category='301',cedent_cnpj='22345678000188',cedent_registration='CED-305',cedent_admission_date='2018-03-01',ceded_work_regime=2,ceded_social_security_regime=2
  where organization_id=v_org and employment_id=v_emp;
  if not exists(select 1 from public.rh_tsv_esocial_profiles where employment_id=v_emp and category_code='305' and ceded_social_security_regime=2) then raise exception 'TSVE SPECIAL 3 falhou: 305 válido não persistiu'; end if;

  v_failed:=false;
  begin update public.rh_tsv_esocial_profiles set ceded_social_security_regime=1 where organization_id=v_org and employment_id=v_emp;
  exception when check_violation then v_failed:=true; end;
  if not v_failed then raise exception 'TSVE SPECIAL 4 falhou: 305 fora de RPPS não foi bloqueado'; end if;

  update public.rh_tsv_esocial_profiles set
    category_code='410',ceded_social_security_regime=1,special_function_name='Assessor técnico',special_function_cbo_code='252205'
  where organization_id=v_org and employment_id=v_emp;
  if not exists(select 1 from public.rh_tsv_esocial_profiles where employment_id=v_emp and category_code='410' and special_function_cbo_code='252205') then raise exception 'TSVE SPECIAL 5 falhou: 410 válido não persistiu'; end if;

  update public.rh_tsv_esocial_profiles set
    category_code='304',special_function_name=null,special_function_cbo_code=null,
    ceded_origin_category=null,cedent_cnpj=null,cedent_registration=null,cedent_admission_date=null,ceded_work_regime=null,ceded_social_security_regime=null,
    mandate_origin_category='301',mandate_origin_cnpj='22345678000188',mandate_origin_registration='MAND-304',mandate_origin_exercise_date='2020-01-01',mandate_keep_origin_remuneration='N',mandate_work_regime=2,mandate_social_security_regime=2
  where organization_id=v_org and employment_id=v_emp;
  if not exists(select 1 from public.rh_tsv_esocial_profiles where employment_id=v_emp and category_code='304' and mandate_origin_category='301') then raise exception 'TSVE SPECIAL 6 falhou: 304 válido não persistiu'; end if;

  v_failed:=false;
  begin update public.rh_tsv_esocial_profiles set mandate_origin_cnpj=null where organization_id=v_org and employment_id=v_emp;
  exception when check_violation then v_failed:=true; end;
  if not v_failed then raise exception 'TSVE SPECIAL 7 falhou: 304 sem CNPJ origem não foi bloqueado'; end if;

  raise notice 'RH TSVE especial — 401/305/410/304 e invariantes null-safe aprovados.';
end$$;

rollback;
