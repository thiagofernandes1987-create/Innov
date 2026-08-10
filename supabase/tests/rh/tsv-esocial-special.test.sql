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
  insert into public.organizations(id,name) values(v_org,'RH TSV Especial');
  perform set_config('test.user_id',v_user::text,true);
  perform set_config('test.permission_granted','true',true);

  insert into public.rh_people(organization_id,full_name,cpf,birth_date,created_by)
    values(v_org,'TSVE Especial','12345678901','1980-01-01',v_user) returning id into v_person;
  insert into public.rh_workers(organization_id,person_id,worker_code,status,created_by)
    values(v_org,v_person,'TSV-ESP-001','ACTIVE',v_user) returning id into v_worker;
  insert into public.rh_employments(organization_id,worker_id,registration_number,employment_type,admission_date,status,base_salary,created_by)
    values(v_org,v_worker,'TSVESP001','DIRECTOR','2026-08-01','ACTIVE',8000,v_user) returning id into v_emp;

  insert into public.rh_tsv_esocial_profiles(
    organization_id,employment_id,category_code,sex,race_color,education_level,birth_country_code,nationality_country_code,
    street,street_number,postal_code,city_ibge_code,state_code,salary_unit,
    special_activity_nature,union_origin_category,union_origin_registration_type,union_origin_registration_number,
    union_origin_admission_date,union_origin_registration,union_origin_work_regime,union_origin_social_security_regime,created_by
  ) values(
    v_org,v_emp,'401','M',3,'09','105','105','Rua Teste','100','12000000','3554102','SP',5,
    1,'101',1,'22345678000188','2020-01-02','MAT-ORIG-001',1,1,v_user
  );
  if not exists(select 1 from public.rh_tsv_esocial_profiles where employment_id=v_emp and category_code='401' and union_origin_category='101') then
    raise exception 'Categoria 401 válida não persistiu';
  end if;

  v_failed:=false;
  begin
    update public.rh_tsv_esocial_profiles set union_origin_category='401' where employment_id=v_emp;
  exception when check_violation then v_failed:=true; end;
  if not v_failed then raise exception 'Categoria 401 não pode usar 401 como categoria de origem'; end if;

  update public.rh_tsv_esocial_profiles set
    category_code='305',
    special_activity_nature=null,
    union_origin_category=null,union_origin_registration_type=null,union_origin_registration_number=null,
    union_origin_admission_date=null,union_origin_registration=null,union_origin_work_regime=null,union_origin_social_security_regime=null,
    ceded_origin_category='301',cedent_cnpj='22345678000188',cedent_registration='CED-305-001',cedent_admission_date='2018-03-01',
    ceded_work_regime=2,ceded_social_security_regime=2
  where employment_id=v_emp;
  if not exists(select 1 from public.rh_tsv_esocial_profiles where employment_id=v_emp and category_code='305' and ceded_social_security_regime=2) then
    raise exception 'Categoria 305 válida não persistiu';
  end if;

  v_failed:=false;
  begin
    update public.rh_tsv_esocial_profiles set ceded_social_security_regime=1 where employment_id=v_emp;
  exception when check_violation then v_failed:=true; end;
  if not v_failed then raise exception 'Categoria 305 fora de RPPS deveria falhar'; end if;

  update public.rh_tsv_esocial_profiles set
    category_code='304',
    ceded_origin_category=null,cedent_cnpj=null,cedent_registration=null,cedent_admission_date=null,ceded_work_regime=null,ceded_social_security_regime=null,
    mandate_origin_category='301',mandate_origin_cnpj='22345678000188',mandate_origin_registration='MAND-001',mandate_origin_exercise_date='2020-01-01',
    mandate_keep_origin_remuneration='N',mandate_work_regime=2,mandate_social_security_regime=2
  where employment_id=v_emp;
  if not exists(select 1 from public.rh_tsv_esocial_profiles where employment_id=v_emp and category_code='304' and mandate_origin_category='301') then
    raise exception 'Categoria 304 válida não persistiu';
  end if;

  v_failed:=false;
  begin
    update public.rh_tsv_esocial_profiles set mandate_origin_cnpj='123' where employment_id=v_emp;
  exception when check_violation then v_failed:=true; end;
  if not v_failed then raise exception 'Categoria 304 com CNPJ de origem inválido deveria falhar'; end if;

  update public.rh_tsv_esocial_profiles set
    category_code='410',
    mandate_origin_category=null,mandate_origin_cnpj=null,mandate_origin_registration=null,mandate_origin_exercise_date=null,
    mandate_keep_origin_remuneration=null,mandate_work_regime=null,mandate_social_security_regime=null,
    ceded_origin_category='101',cedent_cnpj='22345678000188',cedent_registration='CED-410-001',cedent_admission_date='2019-04-01',
    ceded_work_regime=1,ceded_social_security_regime=1,
    special_function_name='Assessor técnico',special_function_cbo_code='252205'
  where employment_id=v_emp;
  if not exists(select 1 from public.rh_tsv_esocial_profiles where employment_id=v_emp and category_code='410' and special_function_cbo_code='252205') then
    raise exception 'Categoria 410 válida não persistiu';
  end if;

  v_failed:=false;
  begin
    update public.rh_tsv_esocial_profiles set special_function_cbo_code=null where employment_id=v_emp;
  exception when check_violation then v_failed:=true; end;
  if not v_failed then raise exception 'Função especial sem CBO deveria falhar'; end if;

  raise notice 'RH TSVE especial — categorias 401/305/304/410 e invariantes aprovadas.';
end$$;

rollback;
