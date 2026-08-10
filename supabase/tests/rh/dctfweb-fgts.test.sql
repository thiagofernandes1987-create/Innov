do $$
declare
  v_org uuid; v_user uuid; v_emp uuid; v_est uuid; v_employment uuid;
  v_salary uuid; v_salary_v uuid; v_fgts_value uuid; v_fgts_value_v uuid; v_base uuid;
  v_period uuid; v_run uuid; v_fgts_period uuid; v_fgts_item uuid; v_guide uuid; v_payment uuid;
  v_dctf uuid; v_item uuid; v_raised boolean;
begin
  insert into auth.users(email) values('rh-gov@innovar.local') returning id into v_user;
  insert into public.organizations(name) values('RH obrigações teste') returning id into v_org;
  insert into public.organization_memberships(organization_id,user_id,role,active) values(v_org,v_user,'ADMIN',true);
  perform set_config('test.user_id',v_user::text,false);
  perform set_config('test.permission_granted','true',false);

  insert into public.rh_employers(organization_id,code,legal_name,tax_id,created_by)
    values(v_org,'EMP','Empregador','44444444000144',v_user) returning id into v_emp;
  insert into public.rh_establishments(organization_id,employer_id,code,name,registration_type,registration_number,created_by)
    values(v_org,v_emp,'MATRIZ','Matriz','CNPJ','44444444000144',v_user) returning id into v_est;
  v_employment:=public.create_rh_worker(v_org,'Trabalhador FGTS',null,'44455566677',null,null,null,'EMP-GOV','MAT-GOV','EMPLOYEE','2026-01-01',3000);
  insert into public.rh_employment_conditions(organization_id,employment_id,valid_from,employer_id,establishment_id,base_salary,change_reason,created_by)
    values(v_org,v_employment,'2026-01-01',v_emp,v_est,3000,'Admissão',v_user);

  insert into public.rh_rubrics(organization_id,code,name,payroll_kind,created_by)
    values(v_org,'SAL_GOV','Salário','EARNING',v_user) returning id into v_salary;
  insert into public.rh_rubric_versions(organization_id,rubric_id,version,valid_from,formula_type,calculation_priority,created_by)
    values(v_org,v_salary,1,'2026-01-01','MANUAL',10,v_user) returning id into v_salary_v;
  v_base:=public.create_rh_payroll_base(v_org,'FGTS_BASE_TEST','Base FGTS teste',null);
  perform public.add_rh_payroll_base_member(v_org,v_base,v_salary,1,'2026-01-01',null);
  insert into public.rh_payroll_parameters(organization_id,code,name,category,created_by)
    values(v_org,'FGTS_RATE_TEST','Alíquota FGTS teste','FGTS',v_user);
  insert into public.rh_payroll_parameter_versions(organization_id,parameter_id,version,valid_from,numeric_value,source_reference,created_by)
    select v_org,id,1,'2026-01-01',8,'Fixture determinística',v_user from public.rh_payroll_parameters where organization_id=v_org and code='FGTS_RATE_TEST';
  v_fgts_value_v:=public.create_rh_derived_rubric(v_org,'FGTS_VALOR_TEST','FGTS valor teste',null,'EMPLOYER_CHARGE','2026-01-01',null,'PERCENT_OF_BASE',800,'FGTS_BASE_TEST','FGTS_RATE_TEST','9908',null,null,null);

  insert into public.rh_payroll_periods(organization_id,reference_month,processing_type,created_by)
    values(v_org,'2026-08-01','MONTHLY',v_user) returning id into v_period;
  insert into public.rh_payroll_inputs(organization_id,period_id,employment_id,rubric_version_id,amount,source_type,created_by)
    values(v_org,v_period,v_employment,v_salary_v,3000,'CONTRACT',v_user);
  v_run:=public.run_rh_payroll(v_period);

  -- TESTE 1: período FGTS nasce da folha por trabalhador, sem alíquota hard-coded na RPC.
  v_fgts_period:=public.create_rh_fgts_period_from_payroll(v_period,'MONTHLY','FGTS_BASE_TEST','FGTS_VALOR_TEST');
  select id into v_fgts_item from public.rh_fgts_worker_reconciliations where fgts_period_id=v_fgts_period and employment_id=v_employment;
  if (select expected_base from public.rh_fgts_worker_reconciliations where id=v_fgts_item)<>3000 then raise exception 'GOV 1 falhou: base FGTS'; end if;
  if (select expected_amount from public.rh_fgts_worker_reconciliations where id=v_fgts_item)<>240 then raise exception 'GOV 1 falhou: valor FGTS'; end if;

  -- TESTE 2: valor externo divergente fica explícito.
  perform public.update_rh_fgts_worker_external(v_fgts_item,3000,230,null,'Diferença externa','Corrigir origem','EVID-FGTS-1');
  if (select status from public.rh_fgts_worker_reconciliations where id=v_fgts_item)<>'DIVERGENT' then raise exception 'GOV 2 falhou: divergência não marcada'; end if;
  if (select amount_difference from public.rh_fgts_worker_reconciliations where id=v_fgts_item)<>-10 then raise exception 'GOV 2 falhou: diferença incorreta'; end if;

  -- TESTE 3: guia e pagamento parcial/total preservam estado.
  v_guide:=public.create_rh_fgts_guide(v_fgts_period,'GUIA-1','PORTAL_ASSISTED','2026-09-20',240,0,'EVID-GUIA');
  v_payment:=public.record_rh_fgts_payment(v_guide,100,'2026-09-10 10:00:00+00','PIX','PAG-1','EVID-PAG-1');
  if (select status from public.rh_fgts_guides where id=v_guide)<>'PARTIALLY_PAID' then raise exception 'GOV 3 falhou: pagamento parcial'; end if;
  perform public.record_rh_fgts_payment(v_guide,140,'2026-09-11 10:00:00+00','PIX','PAG-2','EVID-PAG-2');
  if (select status from public.rh_fgts_guides where id=v_guide)<>'PAID' then raise exception 'GOV 3 falhou: pagamento total'; end if;

  -- TESTE 4: DCTFWeb registra snapshot e divergência sem alterar origem.
  v_dctf:=public.create_rh_dctfweb_declaration(v_org,'2026-08-01','GENERAL',true,true,false,jsonb_build_object('payrollRunId',v_run),'Teste');
  perform public.record_rh_dctfweb_external_snapshot(v_dctf,'DCTF-1','REC-DCTF',500,0,500,0,'RECONCILING','CONSULTA-OFICIAL');
  v_item:=public.upsert_rh_dctfweb_reconciliation_item(v_dctf,'CONTRIBUTION','CP_TOTAL',490,500,null,'Total externo maior','Revisar eSocial','EVID-DCTF');
  if (select status from public.rh_dctfweb_reconciliation_items where id=v_item)<>'DIVERGENT' then raise exception 'GOV 4 falhou: DCTF divergência'; end if;
  if (select difference from public.rh_dctfweb_reconciliation_items where id=v_item)<>10 then raise exception 'GOV 4 falhou: diferença DCTF'; end if;

  -- TESTE 5: pagamento FGTS exige evidência.
  v_raised:=false;
  begin
    perform public.record_rh_fgts_payment(v_guide,1,'2026-09-12 10:00:00+00','PIX','PAG-ERR',null);
  exception when others then
    if sqlerrm like '%evidência%' then v_raised:=true; end if;
  end;
  if not v_raised then raise exception 'GOV 5 falhou: pagamento sem evidência aceito'; end if;

  raise notice 'RH DCTFWeb/FGTS — 5 testes aprovados.';
end$$;
