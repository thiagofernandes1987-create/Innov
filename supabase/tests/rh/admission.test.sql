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

 v_case:=public.create_rh_admission_case(v_org,'Ana Admissão',null,'11122233344',null,null,null,'EMP-A1','MAT-A1','EMPLOYEE','2026-08-10',v_emp,v_est,null,null,null,null,null,4200,'S2200');
 if (select count(*) from public.rh_admission_checklist_items where admission_case_id=v_case)<>4 then raise exception 'ADMISSÃO 1 falhou: checklist não criado'; end if;

 -- Não ativa com checklist pendente.
 v_raised:=false;begin perform public.activate_rh_admission(v_case);exception when others then if sqlerrm like '%Checklist obrigatório incompleto%' then v_raised:=true;end if;end;
 if not v_raised then raise exception 'ADMISSÃO 2 falhou: ativou com pendências';end if;

 update public.rh_admission_checklist_items set status='COMPLETED',completed_by=v_user,completed_at=now() where admission_case_id=v_case;
 v_worker:=public.activate_rh_admission(v_case);
 if v_worker is null then raise exception 'ADMISSÃO 3 falhou: worker não retornado';end if;
 if (select status from public.rh_admission_cases where id=v_case)<>'ACTIVATED' then raise exception 'ADMISSÃO 3 falhou: caso não ativado';end if;
 if (select count(*) from public.rh_employment_conditions c join public.rh_employments e on e.id=c.employment_id where e.worker_id=v_worker and c.base_salary=4200)<>1 then raise exception 'ADMISSÃO 3 falhou: condição inicial não criada';end if;

 -- Idempotência: chamada repetida retorna o mesmo vínculo, sem duplicar pessoa.
 perform public.activate_rh_admission(v_case);
 if (select count(*) from public.rh_people where organization_id=v_org and cpf='11122233344')<>1 then raise exception 'ADMISSÃO 4 falhou: ativação duplicou pessoa';end if;

 raise notice 'RH admissão — 4 testes aprovados.';
end$$;
