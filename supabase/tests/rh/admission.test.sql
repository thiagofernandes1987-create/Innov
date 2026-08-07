do $$
declare
 v_org uuid;v_user uuid;v_emp uuid;v_est uuid;v_case uuid;v_worker uuid;v_raised boolean;
begin
 insert into auth.users(email) values('rh-admission@innovar.local') returning id into v_user;
 insert into public.organizations(name) values('RH admissão teste') returning id into v_org;
 insert into public.organization_memberships(organization_id,user_id,role,active) values(v_org,v_user,'ADMIN',true);
 perform set_config('test.user_id',v_user::text,false);perform set_config('test.permission_granted','true',false);
 insert into public.rh_employers(organization_id,code,legal_name,tax_id,created_by) values(v_org,'E1','Empregador','11111111000111',v_user) returning id into v_emp;
 insert into public.rh_establishments(organization_id,employer_id,code,name,registration_type,registration_number,created_by) values(v_org,v_emp,'M1','Matriz','CNPJ','11111111000111',v_user) returning id into v_est;

 v_case:=public.create_rh_admission_case(v_org,'Ana Admissão',null,'11122233344','1990-01-01',null,null,'EMP-A1','MAT-A1','EMPLOYEE','2026-08-10',v_emp,v_est,null,null,null,null,null,4200,'S2200');
 if (select count(*) from public.rh_admission_checklist_items where admission_case_id=v_case)<>4 then raise exception 'ADMISSÃO 1 falhou: checklist não criado'; end if;

 -- Não ativa com checklist pendente.
 v_raised:=false;begin perform public.activate_rh_admission(v_case);exception when others then if sqlerrm like '%Checklist obrigatório incompleto%' then v_raised:=true;end if;end;
 if not v_raised then raise exception 'ADMISSÃO 2 falhou: checklist pendente não bloqueou';end if;

 update public.rh_admission_checklist_items set status='COMPLETED',completed_by=v_user,completed_at=now() where admission_case_id=v_case;

 -- Nova pré-condição: dados eSocial mínimos precisam estar persistidos.
 v_raised:=false;begin perform public.activate_rh_admission(v_case);exception when others then if sqlerrm like '%Perfil eSocial da admissão obrigatório%' then v_raised:=true;end if;end;
 if not v_raised then raise exception 'ADMISSÃO 3 falhou: ativou sem perfil eSocial';end if;

 insert into public.rh_admission_esocial_profiles(
   organization_id,admission_case_id,sex,race_color,marital_status,education_level,birth_country_code,nationality_country_code,
   street,street_number,postal_code,city_ibge_code,state_code,esocial_category_code,activity_nature,work_regime_type,
   social_security_regime_type,admission_type,admission_indicator,work_regime_journey,fixed_salary_unit,contract_type,
   journey_type,partial_time_type,night_work,created_by
 ) values(
   v_org,v_case,'F',3,1,'07','105','105','Rua Teste','100','12000000','3554102','SP','101',1,1,1,1,1,1,5,1,9,0,'N',v_user
 );

 v_worker:=public.activate_rh_admission(v_case);
 if v_worker is null then raise exception 'ADMISSÃO 4 falhou: worker não retornado';end if;
 if (select status from public.rh_admission_cases where id=v_case)<>'ACTIVATED' then raise exception 'ADMISSÃO 4 falhou: caso não ativado';end if;
 if (select count(*) from public.rh_employment_conditions c join public.rh_employments e on e.id=c.employment_id where e.worker_id=v_worker and c.base_salary=4200 and c.esocial_category_code='101')<>1 then raise exception 'ADMISSÃO 4 falhou: condição inicial/categoria eSocial não criada';end if;

 -- Idempotência: chamada repetida retorna o mesmo worker, sem duplicar pessoa.
 perform public.activate_rh_admission(v_case);
 if (select count(*) from public.rh_people where organization_id=v_org and cpf='11122233344')<>1 then raise exception 'ADMISSÃO 5 falhou: ativação duplicou pessoa';end if;

 raise notice 'RH admissão — 5 testes aprovados.';
end$$;
