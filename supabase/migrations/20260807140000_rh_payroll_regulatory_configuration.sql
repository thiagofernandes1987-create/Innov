-- Catálogo de referência regulatória + operações transacionais de configuração.
-- Os templates são dados versionados e datados; o motor não embute alíquotas legais.

create table if not exists public.rh_regulatory_parameter_templates(
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  version integer not null,
  name text not null,
  category text not null,
  valid_from date not null,
  valid_to date,
  value_kind text not null check(value_kind in('NUMERIC','TABLE','CONFIG')),
  numeric_value numeric(18,8),
  json_value jsonb,
  source_title text not null,
  source_url text not null,
  source_published_at date,
  verified_at timestamptz not null,
  status text not null default 'REFERENCE' check(status in('REFERENCE','SUPERSEDED','WITHDRAWN')),
  unique(template_key,version),
  check(valid_to is null or valid_to>valid_from),
  check((numeric_value is not null)::integer+(json_value is not null)::integer=1)
);

alter table public.rh_regulatory_parameter_templates enable row level security;
create policy rh_regulatory_templates_read on public.rh_regulatory_parameter_templates
  for select to authenticated using(true);

insert into public.rh_regulatory_parameter_templates(
  template_key,version,name,category,valid_from,value_kind,json_value,
  source_title,source_url,source_published_at,verified_at
) values
(
 'INSS_EMPLOYEE_MONTHLY_2026',1,'INSS empregado/doméstico/avulso — tabela mensal 2026','SOCIAL_SECURITY','2026-01-01','TABLE',
 '[{"from":0,"to":1621.00,"rate":7.5},{"from":1621.00,"to":2902.84,"rate":9.0},{"from":2902.84,"to":4354.27,"rate":12.0},{"from":4354.27,"to":8475.55,"rate":14.0}]'::jsonb,
 'INSS — Tabela de contribuição mensal',
 'https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/tabela-de-contribuicao-mensal',
 '2026-01-13',now()
),
(
 'IRRF_MONTHLY_2026',1,'IRRF mensal 2026 — incidência, deduções e redução','INCOME_TAX','2026-01-01','CONFIG',
 '{
   "brackets":[
     {"from":0,"to":2428.80,"rate":0,"deduction":0},
     {"from":2428.80,"to":2826.65,"rate":7.5,"deduction":182.16},
     {"from":2826.65,"to":3751.05,"rate":15,"deduction":394.16},
     {"from":3751.05,"to":4664.68,"rate":22.5,"deduction":675.49},
     {"from":4664.68,"to":null,"rate":27.5,"deduction":908.73}
   ],
   "dependentDeduction":189.59,
   "simplifiedDiscountLimit":607.20,
   "monthlyReduction":{
     "zeroIncomeUntil":5000.00,
     "linearIncomeUntil":7350.00,
     "maxReduction":312.89,
     "intercept":978.62,
     "slope":0.133145
   }
 }'::jsonb,
 'Receita Federal — Tributação de 2026',
 'https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026',
 '2025-12-22',now()
)
on conflict(template_key,version) do nothing;

create or replace function public.create_rh_payroll_parameter_from_template(
  p_organization_id uuid,
  p_template_id uuid,
  p_code text
) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare t public.rh_regulatory_parameter_templates%rowtype;v_parameter uuid;v_version uuid;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;
  if not public.has_module_permission(p_organization_id,'rh','READ',null,'administer') then raise exception 'FORBIDDEN';end if;
  select * into t from public.rh_regulatory_parameter_templates where id=p_template_id and status='REFERENCE';
  if t.id is null then raise exception 'Template regulatório não encontrado';end if;
  if trim(coalesce(p_code,''))='' then raise exception 'Código do parâmetro é obrigatório';end if;

  insert into public.rh_payroll_parameters(organization_id,code,name,category,description,created_by)
  values(
    p_organization_id,upper(trim(p_code)),t.name,t.category,
    'Criado a partir do template regulatório '||t.template_key||' v'||t.version,
    auth.uid()
  ) returning id into v_parameter;

  insert into public.rh_payroll_parameter_versions(
    organization_id,parameter_id,version,valid_from,valid_to,numeric_value,table_value,source_reference,status,created_by
  ) values(
    p_organization_id,v_parameter,1,t.valid_from,t.valid_to,t.numeric_value,t.json_value,
    t.source_title||' | '||t.source_url||' | verificado '||t.verified_at::text,
    'PUBLISHED',auth.uid()
  ) returning id into v_version;
  return v_version;
end$$;

grant execute on function public.create_rh_payroll_parameter_from_template(uuid,uuid,text) to authenticated;

create or replace function public.create_rh_payroll_parameter(
  p_organization_id uuid,p_code text,p_name text,p_category text,p_description text,
  p_valid_from date,p_valid_to date,p_numeric_value numeric,p_table_value jsonb,p_source_reference text
) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_parameter uuid;v_version uuid;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;
  if not public.has_module_permission(p_organization_id,'rh','READ',null,'administer') then raise exception 'FORBIDDEN';end if;
  if trim(coalesce(p_code,''))='' or trim(coalesce(p_name,''))='' or p_valid_from is null then raise exception 'Código, nome e vigência são obrigatórios';end if;
  if (p_numeric_value is null)=(p_table_value is null) then raise exception 'Informe exatamente um valor numérico ou uma tabela JSON';end if;
  insert into public.rh_payroll_parameters(organization_id,code,name,category,description,created_by)
  values(p_organization_id,upper(trim(p_code)),trim(p_name),coalesce(nullif(trim(p_category),''),'GENERAL'),nullif(trim(coalesce(p_description,'')),''),auth.uid())
  returning id into v_parameter;
  insert into public.rh_payroll_parameter_versions(organization_id,parameter_id,version,valid_from,valid_to,numeric_value,table_value,source_reference,status,created_by)
  values(p_organization_id,v_parameter,1,p_valid_from,p_valid_to,p_numeric_value,p_table_value,nullif(trim(coalesce(p_source_reference,'')),''),'PUBLISHED',auth.uid())
  returning id into v_version;
  return v_version;
end$$;

grant execute on function public.create_rh_payroll_parameter(uuid,text,text,text,text,date,date,numeric,jsonb,text) to authenticated;

create or replace function public.create_rh_payroll_base(
  p_organization_id uuid,p_code text,p_name text,p_description text
) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;
  if not public.has_module_permission(p_organization_id,'rh','READ',null,'administer') then raise exception 'FORBIDDEN';end if;
  if trim(coalesce(p_code,''))='' or trim(coalesce(p_name,''))='' then raise exception 'Código e nome são obrigatórios';end if;
  insert into public.rh_payroll_base_definitions(organization_id,code,name,description,created_by)
  values(p_organization_id,upper(trim(p_code)),trim(p_name),nullif(trim(coalesce(p_description,'')),''),auth.uid()) returning id into v_id;
  return v_id;
end$$;

grant execute on function public.create_rh_payroll_base(uuid,text,text,text) to authenticated;

create or replace function public.add_rh_payroll_base_member(
  p_organization_id uuid,p_base_definition_id uuid,p_rubric_id uuid,p_factor numeric,p_valid_from date,p_valid_to date
) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;
  if not public.has_module_permission(p_organization_id,'rh','READ',null,'administer') then raise exception 'FORBIDDEN';end if;
  if p_valid_from is null then raise exception 'Vigência inicial obrigatória';end if;
  insert into public.rh_payroll_base_members(organization_id,base_definition_id,rubric_id,factor,valid_from,valid_to,created_by)
  values(p_organization_id,p_base_definition_id,p_rubric_id,coalesce(p_factor,1),p_valid_from,p_valid_to,auth.uid()) returning id into v_id;
  return v_id;
end$$;

grant execute on function public.add_rh_payroll_base_member(uuid,uuid,uuid,numeric,date,date) to authenticated;

create or replace function public.create_rh_derived_rubric(
  p_organization_id uuid,p_code text,p_name text,p_description text,p_payroll_kind text,
  p_valid_from date,p_valid_to date,p_formula_type text,p_calculation_priority integer,
  p_base_code text,p_parameter_code text,p_esocial_nature_code text,p_cod_inc_cp text,p_cod_inc_irrf text,p_cod_inc_fgts text
) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_rubric uuid;v_version uuid;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED';end if;
  if not public.has_module_permission(p_organization_id,'rh','READ',null,'administer') then raise exception 'FORBIDDEN';end if;
  if p_formula_type not in('PERCENT_OF_BASE','BRACKET_DEDUCTION','MARGINAL_PROGRESSIVE') then raise exception 'Fórmula derivada inválida';end if;
  if not exists(select 1 from public.rh_payroll_base_definitions where organization_id=p_organization_id and code=upper(trim(p_base_code))) then raise exception 'Base não encontrada';end if;
  if not exists(select 1 from public.rh_payroll_parameters where organization_id=p_organization_id and code=upper(trim(p_parameter_code))) then raise exception 'Parâmetro não encontrado';end if;
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

grant execute on function public.create_rh_derived_rubric(uuid,text,text,text,text,date,date,text,integer,text,text,text,text,text,text) to authenticated;
