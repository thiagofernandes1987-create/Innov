begin;

do $$
declare
  v_org uuid:=gen_random_uuid();
  v_org2 uuid:=gen_random_uuid();
  v_user uuid:=gen_random_uuid();
  v_person uuid;
  v_worker uuid;
  v_emp uuid;
  v_failed boolean:=false;
begin
  insert into auth.users(id,email) values(v_user,'rh-tsv@example.test');
  insert into public.organizations(id,name) values(v_org,'RH TSV'),(v_org2,'Outro tenant');
  perform set_config('test.user_id',v_user::text,true);
  perform set_config('test.permission_granted','true',true);
  insert into public.rh_people(organization_id,full_name,cpf,birth_date,created_by) values(v_org,'Diretor Teste','12345678901','1980-01-01',v_user) returning id into v_person;
  insert into public.rh_workers(organization_id,person_id,worker_code,status,created_by) values(v_org,v_person,'TSV-001','ACTIVE',v_user) returning id into v_worker;
  insert into public.rh_employments(organization_id,worker_id,registration_number,employment_type,admission_date,status,base_salary,created_by) values(v_org,v_worker,'TSV001','DIRECTOR','2026-08-01','ACTIVE',10000,v_user) returning id into v_emp;
  insert into public.rh_tsv_esocial_profiles(organization_id,employment_id,category_code,sex,race_color,education_level,birth_country_code,nationality_country_code,street,street_number,postal_code,city_ibge_code,state_code,salary_unit,fgts_option_date,created_by)
    values(v_org,v_emp,'721','M',3,'09','105','105','Rua Teste','100','12000000','3554102','SP',5,'2026-08-01',v_user);
  if not exists(select 1 from public.rh_tsv_esocial_profiles where organization_id=v_org and employment_id=v_emp and category_code='721' and fgts_option_date is not null) then raise exception 'Perfil TSVE 721 não persistiu com FGTS'; end if;

  update public.rh_tsv_esocial_profiles set category_code='722',fgts_option_date=null where organization_id=v_org and employment_id=v_emp;
  if not exists(select 1 from public.rh_tsv_esocial_profiles where organization_id=v_org and employment_id=v_emp and category_code='722' and fgts_option_date is null) then raise exception 'Perfil TSVE 722 não persistiu sem FGTS'; end if;

  v_failed:=false;
  begin update public.rh_tsv_esocial_profiles set fgts_option_date='2026-08-01' where organization_id=v_org and employment_id=v_emp;
  exception when check_violation then v_failed:=true; end;
  if not v_failed then raise exception 'Categoria 722 com grupo FGTS deveria ser bloqueada'; end if;

  v_failed:=false;
  begin update public.rh_tsv_esocial_profiles set category_code='901' where organization_id=v_org and employment_id=v_emp;
  exception when check_violation then v_failed:=true; end;
  if not v_failed then raise exception 'Categoria 901 deveria exigir vertical própria e ser bloqueada neste perfil'; end if;

  v_failed:=false;
  begin
    insert into public.rh_tsv_esocial_profiles(organization_id,employment_id,category_code,sex,race_color,education_level,birth_country_code,nationality_country_code,street,street_number,postal_code,city_ibge_code,state_code,salary_unit,fgts_option_date,created_by)
      values(v_org2,v_emp,'721','M',3,'09','105','105','Rua','1','12000000','3554102','SP',5,'2026-08-01',v_user);
  exception when foreign_key_violation then v_failed:=true; end;
  if not v_failed then raise exception 'Perfil TSVE cross-tenant deveria falhar'; end if;

  raise notice 'RH TSVE — categorias 7XX, FGTS condicional e tenant FK aprovados.';
end$$;

rollback;
