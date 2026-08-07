do $$
declare
  v_irrf jsonb;v_inss jsonb;v_tax numeric;v_before numeric;v_increment numeric;v_after numeric;v_trace jsonb;
begin
  select json_value into v_irrf from public.rh_regulatory_parameter_templates where template_key='IRRF_MONTHLY_2026' and version=1;
  select json_value into v_inss from public.rh_regulatory_parameter_templates where template_key='INSS_EMPLOYEE_MONTHLY_2026' and version=1;
  if v_irrf is null or v_inss is null then raise exception 'IRRF/INSS templates ausentes';end if;

  v_tax:=public.rh_calculate_irrf_2026(5000,0,0,0,0,v_irrf);
  if v_tax<>0 then raise exception 'IRRF 2026 1 falhou: renda 5000 deveria zerar, obtido %',v_tax;end if;

  v_tax:=public.rh_calculate_irrf_2026(6000,0,0,0,0,v_irrf);
  if v_tax<>394.54 then raise exception 'IRRF 2026 2 falhou: esperado 394.54, obtido %',v_tax;end if;

  v_tax:=public.rh_calculate_irrf_2026(7350,0,0,0,0,v_irrf);
  if v_tax<>945.54 then raise exception 'IRRF 2026 3 falhou: esperado 945.54, obtido %',v_tax;end if;

  v_trace:=public.rh_irrf_2026_trace(6000,0,4,0,0,v_irrf);
  if (v_trace->>'deductionUsed')::numeric<>758.36 then raise exception 'IRRF 2026 4 falhou: dedução legal por dependentes não prevaleceu: %',v_trace;end if;

  v_before:=public.rh_calculate_progressive(2000,v_inss,'MARGINAL_PROGRESSIVE');
  v_increment:=public.rh_calculate_progressive_accumulated(2000,2000,v_inss);
  v_after:=public.rh_calculate_progressive(4000,v_inss,'MARGINAL_PROGRESSIVE');
  if v_before+v_increment<>v_after then raise exception 'INSS acumulado falhou: antes % + incremento % <> total %',v_before,v_increment,v_after;end if;

  raise notice 'RH folha legal — IRRF 2026 e acumulados aprovados.';
end$$;
