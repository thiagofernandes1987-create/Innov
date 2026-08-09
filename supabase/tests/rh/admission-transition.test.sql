do $$
declare
 v_org uuid;v_user uuid;v_emp uuid;v_est uuid;v_case uuid;v_raised boolean;
begin
 insert into auth.users(email) values('rh-admission-transition@innovar.local') returning id into v_user;
 insert into public.organizations(name) values('RH transição S-2200 teste') returning id into v_org;
 insert into public.organization_memberships(organization_id,user_id,role,active) values(v_org,v_user,'ADMIN',true);
 perform set_config('test.user_id',v_user::text,false);perform set_config('test.permission_granted','true',false);
 insert into public.rh_employers(organization_id,code,legal_name,tax_id,created_by) values(v_org,'TR1','Sucessora','12345678000199',v_user) returning id into v_emp;
 insert into public.rh_establishments(organization_id,employer_id,code,name,registration_type,registration_number,created_by) values(v_org,v_emp,'M1','Matriz','CNPJ','12345678000199',v_user) returning id into v_est;
 v_case:=public.create_rh_admission_case(v_org,'Trabalhador Transferido',null,'98765432100','1990-01-01',null,null,'EMP-T1','MAT-NOVA','EMPLOYEE','2026-08-01',v_emp,v_est,null,null,null,null,null,7000,'S2200');
 insert into public.rh_admission_esocial_profiles(
  organization_id,admission_case_id,sex,race_color,education_level,birth_country_code,nationality_country_code,street,street_number,postal_code,city_ibge_code,state_code,
  esocial_category_code,activity_nature,work_regime_type,social_security_regime_type,admission_type,admission_indicator,work_regime_journey,fixed_salary_unit,contract_type,journey_type,partial_time_type,night_work,created_by
 ) values(v_org,v_case,'M',3,'07','105','105','Rua A','10','12000000','3554102','SP','101',1,1,1,1,1,1,5,1,9,0,'N',v_user);

 update public.rh_admission_esocial_profiles set
  admission_type=4,original_admission_date='2020-02-03',succession_registration_type=1,succession_registration_number='99888777000166',succession_previous_registration='MAT-ANTIGA',succession_transfer_date='2026-08-01'
 where admission_case_id=v_case;
 if (select admission_type from public.rh_admission_esocial_profiles where admission_case_id=v_case)<>4 then raise exception 'TRANSIÇÃO 1 falhou: sucessão válida não persistiu';end if;

 v_raised:=false;begin
  update public.rh_admission_esocial_profiles set succession_previous_registration=null where admission_case_id=v_case;
 exception when check_violation then v_raised:=true;end;
 if not v_raised then raise exception 'TRANSIÇÃO 2 falhou: sucessão sem matrícula anterior não foi bloqueada';end if;

 v_raised:=false;begin
  update public.rh_admission_esocial_profiles set admission_indicator=3 where admission_case_id=v_case;
 exception when check_violation then v_raised:=true;end;
 if not v_raised then raise exception 'TRANSIÇÃO 3 falhou: decisão judicial sem processo não foi bloqueada';end if;
 update public.rh_admission_esocial_profiles set admission_indicator=3,admission_judicial_process_number='12345678901234567890' where admission_case_id=v_case;

 update public.rh_admission_esocial_profiles set
  admission_type=6,admission_indicator=1,admission_judicial_process_number=null,
  succession_registration_type=null,succession_registration_number=null,succession_previous_registration=null,succession_transfer_date=null,succession_observation=null,
  cpf_change_previous_cpf='12345678901',cpf_change_previous_registration='MAT-ANTIGA',cpf_change_date='2026-08-02'
 where admission_case_id=v_case;
 if (select admission_type from public.rh_admission_esocial_profiles where admission_case_id=v_case)<>6 then raise exception 'TRANSIÇÃO 4 falhou: mudança de CPF válida não persistiu';end if;

 v_raised:=false;begin
  update public.rh_admission_esocial_profiles set cpf_change_previous_cpf='987654321' where admission_case_id=v_case;
 exception when check_violation then v_raised:=true;end;
 if not v_raised then raise exception 'TRANSIÇÃO 5 falhou: CPF anterior inválido não foi bloqueado';end if;

 raise notice 'RH admissão transição — 5 testes aprovados.';
end$$;
