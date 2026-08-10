do $$
declare
  v_org uuid; v_user uuid; v_employment uuid; v_employer uuid; v_establishment uuid; v_allocation uuid;
  v_position uuid; v_function uuid; v_union uuid; v_schedule uuid; v_raised boolean;
begin
  insert into auth.users(email) values('rh-structure@innovar.local') returning id into v_user;
  insert into public.organizations(name) values('RH estrutura teste') returning id into v_org;
  insert into public.organization_memberships(organization_id,user_id,role,active) values(v_org,v_user,'ADMIN',true);
  perform set_config('test.user_id',v_user::text,false);
  perform set_config('test.permission_granted','true',false);

  v_employment:=public.create_rh_worker(v_org,'João Estrutura',null,'98765432100',null,null,null,'EMP-E01','MAT-E01','EMPLOYEE','2026-01-01',3000);

  insert into public.rh_employers(organization_id,code,legal_name,tax_id,created_by)
    values(v_org,'EMPRESA','Empresa Teste LTDA','12345678000199',v_user) returning id into v_employer;
  insert into public.rh_establishments(organization_id,employer_id,code,name,registration_type,registration_number,created_by)
    values(v_org,v_employer,'MATRIZ','Matriz','CNPJ','12345678000199',v_user) returning id into v_establishment;
  insert into public.rh_tax_allocations(organization_id,employer_id,establishment_id,code,name,esocial_lotacao_code,valid_from,created_by)
    values(v_org,v_employer,v_establishment,'LOT01','Administrativo','01','2026-01-01',v_user) returning id into v_allocation;
  insert into public.rh_positions(organization_id,code,name,cbo_code,created_by) values(v_org,'ENG','Engenheiro','214205',v_user) returning id into v_position;
  insert into public.rh_functions(organization_id,code,name,created_by) values(v_org,'RESP','Responsável técnico',v_user) returning id into v_function;
  insert into public.rh_unions(organization_id,code,name,category_name,created_by) values(v_org,'SIND','Sindicato teste','Construção',v_user) returning id into v_union;
  insert into public.rh_work_schedules(organization_id,code,name,weekly_hours,created_by) values(v_org,'44H','44 horas',44,v_user) returning id into v_schedule;

  -- TESTE 1: condição completa pode ser criada.
  insert into public.rh_employment_conditions(organization_id,employment_id,valid_from,valid_to,employer_id,establishment_id,tax_allocation_id,position_id,function_id,union_id,work_schedule_id,base_salary,change_reason,created_by)
    values(v_org,v_employment,'2026-01-01','2026-07-01',v_employer,v_establishment,v_allocation,v_position,v_function,v_union,v_schedule,3000,'Admissão',v_user);
  if (select count(*) from public.rh_employment_conditions where employment_id=v_employment)<>1 then raise exception 'ESTRUTURA 1 falhou'; end if;

  -- TESTE 2: intervalo seguinte pode começar exatamente no fim anterior ([from,to)).
  insert into public.rh_employment_conditions(organization_id,employment_id,valid_from,employer_id,establishment_id,tax_allocation_id,position_id,function_id,union_id,work_schedule_id,base_salary,change_reason,created_by)
    values(v_org,v_employment,'2026-07-01',v_employer,v_establishment,v_allocation,v_position,v_function,v_union,v_schedule,3500,'Reajuste',v_user);
  if (select count(*) from public.rh_employment_conditions where employment_id=v_employment)<>2 then raise exception 'ESTRUTURA 2 falhou'; end if;

  -- TESTE 3: sobreposição temporal é recusada pelo banco.
  v_raised:=false;
  begin
    insert into public.rh_employment_conditions(organization_id,employment_id,valid_from,valid_to,employer_id,establishment_id,base_salary,created_by)
      values(v_org,v_employment,'2026-06-15','2026-08-01',v_employer,v_establishment,3200,v_user);
  exception when exclusion_violation then v_raised:=true;
  end;
  if not v_raised then raise exception 'ESTRUTURA 3 falhou: sobreposição foi aceita'; end if;

  -- TESTE 4: o estabelecimento pertence ao mesmo tenant/empresa por FK composta.
  if (select count(*) from public.rh_establishments where id=v_establishment and employer_id=v_employer and organization_id=v_org)<>1 then raise exception 'ESTRUTURA 4 falhou'; end if;

  raise notice 'RH estrutura — 4 testes aprovados.';
end$$;
