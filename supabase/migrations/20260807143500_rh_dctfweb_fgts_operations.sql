create or replace function public.create_rh_dctfweb_declaration(
  p_organization_id uuid,
  p_reference_month date,
  p_category text,
  p_esocial_period_closed boolean,
  p_reinf_period_closed boolean,
  p_mit_required boolean,
  p_source_snapshot jsonb default '{}'::jsonb,
  p_source_reference text default null
) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if not public.has_module_permission(p_organization_id,'rh','EDIT',null,null) then raise exception 'FORBIDDEN'; end if;
  if p_reference_month is null or date_trunc('month',p_reference_month)::date<>p_reference_month then raise exception 'Competência deve ser o primeiro dia do mês'; end if;
  insert into public.rh_dctfweb_declarations(
    organization_id,reference_month,category,esocial_period_closed,reinf_period_closed,mit_required,mit_status,
    source_snapshot,source_reference,created_by
  ) values(
    p_organization_id,p_reference_month,coalesce(nullif(trim(p_category),''),'GENERAL'),
    coalesce(p_esocial_period_closed,false),coalesce(p_reinf_period_closed,false),coalesce(p_mit_required,false),
    case when coalesce(p_mit_required,false) then 'PENDING' else 'NOT_REQUIRED' end,
    coalesce(p_source_snapshot,'{}'::jsonb),nullif(trim(coalesce(p_source_reference,'')),''),auth.uid()
  ) returning id into v_id;
  return v_id;
end$$;

grant execute on function public.create_rh_dctfweb_declaration(uuid,date,text,boolean,boolean,boolean,jsonb,text) to authenticated;

create or replace function public.record_rh_dctfweb_external_snapshot(
  p_declaration_id uuid,
  p_external_declaration_id text,
  p_receipt_number text,
  p_total_social_security numeric,
  p_total_other_debts numeric,
  p_total_debt numeric,
  p_total_paid numeric,
  p_status text,
  p_source_reference text
) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.rh_dctfweb_declarations where id=p_declaration_id for update;
  if v_org is null then raise exception 'Declaração não encontrada'; end if;
  if not public.has_module_permission(v_org,'rh','EDIT',null,null) then raise exception 'FORBIDDEN'; end if;
  if p_status not in('AVAILABLE','RECONCILING','READY_TO_TRANSMIT','TRANSMITTED','RECTIFICATION_REQUIRED','RECONCILED') then raise exception 'Status externo inválido'; end if;
  if p_total_debt is not null and p_total_debt<0 then raise exception 'Total de débitos não pode ser negativo'; end if;
  if coalesce(p_total_paid,0)<0 then raise exception 'Total pago não pode ser negativo'; end if;
  update public.rh_dctfweb_declarations
  set external_declaration_id=nullif(trim(coalesce(p_external_declaration_id,'')),''),
      receipt_number=nullif(trim(coalesce(p_receipt_number,'')),''),
      total_social_security=p_total_social_security,
      total_other_debts=p_total_other_debts,
      total_debt=p_total_debt,
      total_paid=coalesce(p_total_paid,0),
      status=p_status,
      source_reference=coalesce(nullif(trim(coalesce(p_source_reference,'')),''),source_reference),
      last_external_update_at=now(),updated_at=now()
  where id=p_declaration_id;
end$$;

grant execute on function public.record_rh_dctfweb_external_snapshot(uuid,text,text,numeric,numeric,numeric,numeric,text,text) to authenticated;

create or replace function public.upsert_rh_dctfweb_reconciliation_item(
  p_declaration_id uuid,p_dimension text,p_reference_key text,p_internal_amount numeric,p_external_amount numeric,
  p_status text,p_cause text,p_action_required text,p_evidence_reference text
) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_org uuid;v_id uuid;v_status text;
begin
  select organization_id into v_org from public.rh_dctfweb_declarations where id=p_declaration_id;
  if v_org is null then raise exception 'Declaração não encontrada'; end if;
  if not public.has_module_permission(v_org,'rh','EDIT',null,null) then raise exception 'FORBIDDEN'; end if;
  v_status:=coalesce(nullif(p_status,''),case when round(coalesce(p_internal_amount,0)-coalesce(p_external_amount,0),2)=0 then 'MATCH' else 'DIVERGENT' end);
  if v_status not in('PENDING','MATCH','DIVERGENT','JUSTIFIED','RESOLVED') then raise exception 'Status inválido'; end if;
  insert into public.rh_dctfweb_reconciliation_items(
    organization_id,declaration_id,dimension,reference_key,internal_amount,external_amount,status,cause,action_required,evidence_reference,updated_by
  ) values(
    v_org,p_declaration_id,upper(trim(p_dimension)),trim(p_reference_key),coalesce(p_internal_amount,0),coalesce(p_external_amount,0),v_status,
    nullif(trim(coalesce(p_cause,'')),''),nullif(trim(coalesce(p_action_required,'')),''),nullif(trim(coalesce(p_evidence_reference,'')),''),auth.uid()
  ) on conflict(declaration_id,dimension,reference_key) do update set
    internal_amount=excluded.internal_amount,external_amount=excluded.external_amount,status=excluded.status,cause=excluded.cause,
    action_required=excluded.action_required,evidence_reference=excluded.evidence_reference,updated_by=auth.uid(),updated_at=now()
  returning id into v_id;
  return v_id;
end$$;

grant execute on function public.upsert_rh_dctfweb_reconciliation_item(uuid,text,text,numeric,numeric,text,text,text,text) to authenticated;

create or replace function public.create_rh_fgts_period_from_payroll(
  p_payroll_period_id uuid,
  p_period_type text,
  p_base_code text,
  p_amount_rubric_code text
) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_org uuid;v_reference date;v_run uuid;v_fgts_period uuid;v_count integer;
begin
  select organization_id,reference_month into v_org,v_reference from public.rh_payroll_periods where id=p_payroll_period_id;
  if v_org is null then raise exception 'Competência da folha não encontrada'; end if;
  if not public.has_module_permission(v_org,'rh','EDIT',null,null) then raise exception 'FORBIDDEN'; end if;
  if p_period_type not in('MONTHLY','TERMINATION','RETROACTIVE','LABOR_CLAIM') then raise exception 'Tipo FGTS inválido'; end if;
  select id into v_run from public.rh_payroll_runs where period_id=p_payroll_period_id and status='COMPLETED' order by run_number desc limit 1;
  if v_run is null then raise exception 'Folha precisa estar calculada'; end if;
  if not exists(select 1 from public.rh_payroll_base_definitions where organization_id=v_org and code=upper(trim(p_base_code))) then raise exception 'Base FGTS não encontrada'; end if;
  if not exists(select 1 from public.rh_rubrics where organization_id=v_org and code=upper(trim(p_amount_rubric_code))) then raise exception 'Rubrica de valor FGTS não encontrada'; end if;

  insert into public.rh_fgts_periods(
    organization_id,reference_month,period_type,status,esocial_source_status,source_snapshot,created_by
  ) values(
    v_org,v_reference,p_period_type,'READY_TO_RECONCILE','AWAITING_EXTERNAL_CONFIRMATION',
    jsonb_build_object('payrollPeriodId',p_payroll_period_id,'payrollRunId',v_run,'baseCode',upper(trim(p_base_code)),'amountRubricCode',upper(trim(p_amount_rubric_code))),auth.uid()
  ) returning id into v_fgts_period;

  insert into public.rh_fgts_worker_reconciliations(
    organization_id,fgts_period_id,employment_id,expected_base,expected_amount,status,updated_by
  )
  select v_org,v_fgts_period,wr.employment_id,
         coalesce(b.amount,0),
         coalesce(sum(case when r.code=upper(trim(p_amount_rubric_code)) then l.amount else 0 end),0),
         'PENDING',auth.uid()
  from public.rh_payroll_worker_results wr
  left join public.rh_payroll_bases b on b.worker_result_id=wr.id and b.base_code=upper(trim(p_base_code))
  left join public.rh_payroll_result_lines l on l.worker_result_id=wr.id
  left join public.rh_rubric_versions rv on rv.id=l.rubric_version_id
  left join public.rh_rubrics r on r.id=rv.rubric_id
  where wr.run_id=v_run
  group by wr.employment_id,b.amount;

  select count(*) into v_count from public.rh_fgts_worker_reconciliations where fgts_period_id=v_fgts_period;
  if v_count=0 then raise exception 'Nenhum trabalhador foi projetado para o FGTS'; end if;
  return v_fgts_period;
end$$;

grant execute on function public.create_rh_fgts_period_from_payroll(uuid,text,text,text) to authenticated;

create or replace function public.update_rh_fgts_worker_external(
  p_item_id uuid,p_external_base numeric,p_external_amount numeric,p_status text,p_cause text,p_action_required text,p_evidence_reference text
) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_org uuid;v_expected_base numeric;v_expected_amount numeric;v_status text;
begin
  select organization_id,expected_base,expected_amount into v_org,v_expected_base,v_expected_amount from public.rh_fgts_worker_reconciliations where id=p_item_id for update;
  if v_org is null then raise exception 'Item FGTS não encontrado'; end if;
  if not public.has_module_permission(v_org,'rh','EDIT',null,null) then raise exception 'FORBIDDEN'; end if;
  v_status:=coalesce(nullif(p_status,''),case when round(coalesce(p_external_base,0)-v_expected_base,2)=0 and round(coalesce(p_external_amount,0)-v_expected_amount,2)=0 then 'MATCH' else 'DIVERGENT' end);
  update public.rh_fgts_worker_reconciliations set
    external_base=p_external_base,external_amount=p_external_amount,status=v_status,cause=nullif(trim(coalesce(p_cause,'')),''),
    action_required=nullif(trim(coalesce(p_action_required,'')),''),evidence_reference=nullif(trim(coalesce(p_evidence_reference,'')),''),updated_by=auth.uid(),updated_at=now()
  where id=p_item_id;
end$$;

grant execute on function public.update_rh_fgts_worker_external(uuid,numeric,numeric,text,text,text,text) to authenticated;

create or replace function public.create_rh_fgts_guide(
  p_fgts_period_id uuid,p_external_guide_id text,p_channel_type text,p_due_date date,p_principal_amount numeric,p_additions_amount numeric,p_evidence_reference text
) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_org uuid;v_id uuid;v_type text;
begin
  select organization_id into v_org from public.rh_fgts_periods where id=p_fgts_period_id;
  if v_org is null then raise exception 'Período FGTS não encontrado'; end if;
  if not public.has_module_permission(v_org,'rh','EDIT',null,null) then raise exception 'FORBIDDEN'; end if;
  if p_channel_type not in('PORTAL_ASSISTED','OFFICIAL_FILE_IMPORT','DIRECT_API') then raise exception 'Canal inválido'; end if;
  v_type:=case p_channel_type when 'PORTAL_ASSISTED' then 'PORTAL' when 'OFFICIAL_FILE_IMPORT' then 'OFFICIAL_FILE' else 'API' end;
  insert into public.rh_fgts_guides(
    organization_id,fgts_period_id,external_guide_id,guide_type,channel_type,due_date,principal_amount,additions_amount,status,evidence_reference,created_by
  ) values(
    v_org,p_fgts_period_id,nullif(trim(coalesce(p_external_guide_id,'')),''),v_type,p_channel_type,p_due_date,coalesce(p_principal_amount,0),coalesce(p_additions_amount,0),'ISSUED',nullif(trim(coalesce(p_evidence_reference,'')),''),auth.uid()
  ) returning id into v_id;
  update public.rh_fgts_periods set status='GUIDE_ISSUED',updated_at=now() where id=p_fgts_period_id;
  return v_id;
end$$;

grant execute on function public.create_rh_fgts_guide(uuid,text,text,date,numeric,numeric,text) to authenticated;

create or replace function public.record_rh_fgts_payment(
  p_guide_id uuid,p_amount numeric,p_paid_at timestamptz,p_payment_channel text,p_external_payment_id text,p_evidence_reference text
) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_org uuid;v_period uuid;v_id uuid;v_total numeric;v_paid numeric;
begin
  select organization_id,fgts_period_id,total_amount into v_org,v_period,v_total from public.rh_fgts_guides where id=p_guide_id for update;
  if v_org is null then raise exception 'Guia FGTS não encontrada'; end if;
  if not public.has_module_permission(v_org,'rh','EDIT',null,null) then raise exception 'FORBIDDEN'; end if;
  if coalesce(p_amount,0)<=0 or p_paid_at is null or trim(coalesce(p_evidence_reference,''))='' then raise exception 'Valor, data e evidência são obrigatórios'; end if;
  insert into public.rh_fgts_payments(organization_id,guide_id,amount,paid_at,payment_channel,external_payment_id,evidence_reference,status,created_by)
  values(v_org,p_guide_id,p_amount,p_paid_at,coalesce(nullif(trim(p_payment_channel),''),'PIX'),nullif(trim(coalesce(p_external_payment_id,'')),''),trim(p_evidence_reference),'CONFIRMED',auth.uid()) returning id into v_id;
  select coalesce(sum(amount),0) into v_paid from public.rh_fgts_payments where guide_id=p_guide_id and status='CONFIRMED';
  update public.rh_fgts_guides set status=case when v_paid>=v_total then 'PAID' else 'PARTIALLY_PAID' end,updated_at=now() where id=p_guide_id;
  update public.rh_fgts_periods set status=case when v_paid>=v_total then 'RECONCILING' else 'PAYMENT_PENDING' end,updated_at=now() where id=v_period;
  return v_id;
end$$;

grant execute on function public.record_rh_fgts_payment(uuid,numeric,timestamptz,text,text,text) to authenticated;
