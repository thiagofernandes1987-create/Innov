-- Valida a compatibilidade entre o tipo de fórmula derivada e o valor do
-- parâmetro vigente. Também evita atribuir uma data editorial imprecisa às
-- referências: a data de verificação permanece a evidência temporal canônica.

update public.rh_regulatory_parameter_templates
set source_published_at=null
where template_key in('INSS_EMPLOYEE_MONTHLY_2026','IRRF_MONTHLY_2026');

create or replace function public.create_rh_derived_rubric(
  p_organization_id uuid,p_code text,p_name text,p_description text,p_payroll_kind text,
  p_valid_from date,p_valid_to date,p_formula_type text,p_calculation_priority integer,
  p_base_code text,p_parameter_code text,p_esocial_nature_code text,p_cod_inc_cp text,p_cod_inc_irrf text,p_cod_inc_fgts text
) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_rubric uuid;v_version uuid;v_parameter public.rh_payroll_parameters%rowtype;v_parameter_version public.rh_payroll_parameter_versions%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;
  if not public.has_module_permission(p_organization_id,'rh','READ',null,'administer') then raise exception 'FORBIDDEN';end if;
  if p_formula_type not in('PERCENT_OF_BASE','BRACKET_DEDUCTION','MARGINAL_PROGRESSIVE') then raise exception 'Fórmula derivada inválida';end if;
  if p_valid_from is null then raise exception 'Vigência inicial obrigatória';end if;
  if p_valid_to is not null and p_valid_to<=p_valid_from then raise exception 'Fim da vigência deve ser posterior ao início';end if;
  if not exists(select 1 from public.rh_payroll_base_definitions where organization_id=p_organization_id and code=upper(trim(p_base_code))) then raise exception 'Base não encontrada';end if;
  select * into v_parameter from public.rh_payroll_parameters where organization_id=p_organization_id and code=upper(trim(p_parameter_code));
  if v_parameter.id is null then raise exception 'Parâmetro não encontrado';end if;
  select * into v_parameter_version
    from public.rh_payroll_parameter_versions
    where parameter_id=v_parameter.id and status='PUBLISHED' and valid_from<=p_valid_from and(valid_to is null or valid_to>p_valid_from)
    order by version desc limit 1;
  if v_parameter_version.id is null then raise exception 'Parâmetro sem versão publicada vigente no início da rubrica';end if;

  if p_formula_type='PERCENT_OF_BASE' and v_parameter_version.numeric_value is null then
    raise exception 'PERCENT_OF_BASE exige parâmetro numérico';
  end if;
  if p_formula_type in('BRACKET_DEDUCTION','MARGINAL_PROGRESSIVE') and(
    v_parameter_version.table_value is null or jsonb_typeof(v_parameter_version.table_value)<>'array'
  ) then
    raise exception '% exige parâmetro em formato de lista de faixas',p_formula_type;
  end if;

  insert into public.rh_rubrics(organization_id,code,name,description,payroll_kind,created_by)
  values(p_organization_id,upper(trim(p_code)),trim(p_name),nullif(trim(coalesce(p_description,'')),''),p_payroll_kind,auth.uid()) returning id into v_rubric;
  insert into public.rh_rubric_versions(
    organization_id,rubric_id,version,valid_from,valid_to,formula_type,calculation_priority,auto_calculate,formula_config,
    esocial_nature_code,cod_inc_cp,cod_inc_irrf,cod_inc_fgts,status,created_by
  ) values(
    p_organization_id,v_rubric,1,p_valid_from,p_valid_to,p_formula_type,coalesce(p_calculation_priority,500),true,
    jsonb_build_object('baseCode',upper(trim(p_base_code)),'parameterCode',upper(trim(p_parameter_code))),
    nullif(trim(coalesce(p_esocial_nature_code,'')),''),nullif(trim(coalesce(p_cod_inc_cp,'')),''),
    nullif(trim(coalesce(p_cod_inc_irrf,'')),''),nullif(trim(coalesce(p_cod_inc_fgts,'')),''),'PUBLISHED',auth.uid()
  ) returning id into v_version;
  return v_version;
end$$;
