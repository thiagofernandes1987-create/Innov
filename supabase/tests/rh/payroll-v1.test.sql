do $$
declare
  v_org uuid; v_other_org uuid; v_user uuid; v_employment uuid;
  v_salary_rubric uuid; v_salary_version uuid; v_discount_rubric uuid; v_discount_version uuid;
  v_period uuid; v_run uuid; v_closure uuid; v_gross numeric; v_ded numeric; v_net numeric;
  v_raised boolean;
begin
  insert into auth.users(email) values('rh-test@innovar.local') returning id into v_user;
  insert into public.organizations(name) values('RH teste') returning id into v_org;
  insert into public.organizations(name) values('Outra organização') returning id into v_other_org;
  insert into public.organization_memberships(organization_id,user_id,role,active) values(v_org,v_user,'ADMIN',true);
  perform set_config('test.user_id',v_user::text,false);
  perform set_config('test.permission_granted','true',false);

  -- TESTE 1: criação transacional pessoa → worker → vínculo.
  v_employment:=public.create_rh_worker(v_org,'Maria da Silva','Maria','12345678901','1990-05-10','maria@example.test','12999999999','EMP-001','MAT-001','EMPLOYEE','2026-08-01',5000);
  if (select count(*) from public.rh_people where organization_id=v_org)<>1 then raise exception 'TESTE 1 falhou: pessoa não criada'; end if;
  if (select count(*) from public.rh_workers where organization_id=v_org)<>1 then raise exception 'TESTE 1 falhou: worker não criado'; end if;
  if (select count(*) from public.rh_employments where id=v_employment and base_salary=5000)<>1 then raise exception 'TESTE 1 falhou: vínculo/salário incorreto'; end if;

  -- TESTE 2: permissão negada bloqueia a RPC crítica.
  perform set_config('test.permission_granted','false',false);
  v_raised:=false;
  begin
    perform public.create_rh_worker(v_org,'Sem Permissão',null,null,null,null,null,'EMP-002','MAT-002','EMPLOYEE','2026-08-01',1000);
  exception when others then
    if sqlerrm like '%FORBIDDEN%' then v_raised:=true; end if;
  end;
  if not v_raised then raise exception 'TESTE 2 falhou: criação sem capability foi aceita'; end if;
  perform set_config('test.permission_granted','true',false);

  -- Configuração mínima da folha.
  insert into public.rh_rubrics(organization_id,code,name,payroll_kind,created_by)
    values(v_org,'SAL_BASE','Salário base','EARNING',v_user) returning id into v_salary_rubric;
  insert into public.rh_rubric_versions(organization_id,rubric_id,version,valid_from,formula_type,calculation_priority,esocial_nature_code,created_by)
    values(v_org,v_salary_rubric,1,'2026-01-01','MANUAL',10,'1000',v_user) returning id into v_salary_version;
  insert into public.rh_rubrics(organization_id,code,name,payroll_kind,created_by)
    values(v_org,'DESC_TESTE','Desconto de teste','DEDUCTION',v_user) returning id into v_discount_rubric;
  insert into public.rh_rubric_versions(organization_id,rubric_id,version,valid_from,formula_type,calculation_priority,created_by)
    values(v_org,v_discount_rubric,1,'2026-01-01','MANUAL',900,v_user) returning id into v_discount_version;

  insert into public.rh_payroll_periods(organization_id,reference_month,processing_type,pay_date,created_by)
    values(v_org,'2026-08-01','MONTHLY','2026-09-05',v_user) returning id into v_period;
  insert into public.rh_payroll_inputs(organization_id,period_id,employment_id,rubric_version_id,amount,source_type,created_by)
    values(v_org,v_period,v_employment,v_salary_version,5000,'CONTRACT',v_user);
  insert into public.rh_payroll_inputs(organization_id,period_id,employment_id,rubric_version_id,amount,source_type,created_by)
    values(v_org,v_period,v_employment,v_discount_version,500,'MANUAL',v_user);

  -- TESTE 3: cálculo gera bruto, desconto e líquido reproduzíveis.
  v_run:=public.run_rh_payroll(v_period);
  select gross_amount,deduction_amount,net_amount into v_gross,v_ded,v_net from public.rh_payroll_worker_results where run_id=v_run and employment_id=v_employment;
  if v_gross<>5000 or v_ded<>500 or v_net<>4500 then raise exception 'TESTE 3 falhou: resultado %, %, %',v_gross,v_ded,v_net; end if;
  if (select count(*) from public.rh_payroll_result_lines l join public.rh_payroll_worker_results w on w.id=l.worker_result_id where w.run_id=v_run)<>2 then raise exception 'TESTE 3 falhou: memória de cálculo incompleta'; end if;

  -- TESTE 4: fechamento referencia a execução calculada e muda estado.
  v_closure:=public.close_rh_payroll(v_period,'Teste de fechamento');
  if v_closure is null or (select status from public.rh_payroll_periods where id=v_period)<>'CLOSED' then raise exception 'TESTE 4 falhou: fechamento não concluído'; end if;

  -- TESTE 5: FK composta bloqueia referência de outro tenant.
  v_raised:=false;
  begin
    insert into public.rh_payroll_inputs(organization_id,period_id,employment_id,rubric_version_id,amount,created_by)
      values(v_other_org,v_period,v_employment,v_salary_version,1,v_user);
  exception when foreign_key_violation then v_raised:=true;
  end;
  if not v_raised then raise exception 'TESTE 5 falhou: referência cross-tenant foi aceita'; end if;

  -- TESTE 6: período fechado não pode ser recalculado.
  v_raised:=false;
  begin perform public.run_rh_payroll(v_period); exception when others then if sqlerrm like '%não permite cálculo%' then v_raised:=true; end if; end;
  if not v_raised then raise exception 'TESTE 6 falhou: folha fechada foi recalculada'; end if;

  raise notice 'RH — 6 testes da vertical empregado/folha V1 aprovados.';
end$$;
