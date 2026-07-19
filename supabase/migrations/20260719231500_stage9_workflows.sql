begin;

create or replace function public.create_budget(
  p_organization_id uuid,
  p_client_id uuid,
  p_code text,
  p_title text,
  p_valid_until date default null,
  p_project_id uuid default null,
  p_opportunity_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_budget_id uuid; v_version_id uuid;
begin
  if not public.has_org_role(p_organization_id,array[
    'SUPER_ADMIN','DIRECAO','ADMINISTRADOR','COMERCIAL','ORCAMENTISTA'
  ]::public.org_role[]) then raise exception 'Acesso negado'; end if;

  insert into public.budgets(
    organization_id,client_id,project_id,opportunity_id,code,title,valid_until,owner_id,created_by
  ) values (
    p_organization_id,p_client_id,p_project_id,p_opportunity_id,upper(trim(p_code)),trim(p_title),p_valid_until,auth.uid(),auth.uid()
  ) returning id into v_budget_id;

  insert into public.budget_versions(
    organization_id,budget_id,version_number,scenario_type,change_summary,created_by
  ) values (
    p_organization_id,v_budget_id,1,'PROBABLE','Versão inicial',auth.uid()
  ) returning id into v_version_id;

  update public.budgets set current_version_id=v_version_id where id=v_budget_id;
  perform public.write_audit(p_organization_id,'BUDGET',v_budget_id,'CREATE',jsonb_build_object('version_id',v_version_id));
  return v_budget_id;
end;
$$;

create or replace function public.create_budget_version(
  p_budget_id uuid,
  p_change_summary text,
  p_scenario_type public.budget_scenario_type default 'PROBABLE'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_budget public.budgets; v_source public.budget_versions; v_new_id uuid; v_number integer;
begin
  select * into v_budget from public.budgets where id=p_budget_id for update;
  if not public.has_org_role(v_budget.organization_id,array[
    'SUPER_ADMIN','DIRECAO','ADMINISTRADOR','ORCAMENTISTA'
  ]::public.org_role[]) then raise exception 'Acesso negado'; end if;

  select * into v_source from public.budget_versions where id=v_budget.current_version_id;
  select coalesce(max(version_number),0)+1 into v_number from public.budget_versions where budget_id=p_budget_id;

  insert into public.budget_versions(
    organization_id,budget_id,version_number,scenario_type,change_summary,base_date,status,
    bdi_model_version_id,markup_model_id,administrative_fee_model_id,invested_capital,
    assumptions,created_by
  ) values (
    v_budget.organization_id,p_budget_id,v_number,p_scenario_type,p_change_summary,current_date,'DRAFT',
    v_source.bdi_model_version_id,v_source.markup_model_id,v_source.administrative_fee_model_id,
    v_source.invested_capital,v_source.assumptions,auth.uid()
  ) returning id into v_new_id;

  insert into public.budget_sections(organization_id,budget_version_id,parent_id,code,title,sequence)
  select organization_id,v_new_id,null,code,title,sequence
  from public.budget_sections where budget_version_id=v_source.id and parent_id is null;

  insert into public.budget_items(
    organization_id,budget_version_id,cost_type,code,description,unit,quantity,unit_cost,
    loss_rate,freight_rate,source,region,base_date,valid_until,sequence,created_by
  ) select
    organization_id,v_new_id,cost_type,code,description,unit,quantity,unit_cost,
    loss_rate,freight_rate,source,region,base_date,valid_until,sequence,auth.uid()
  from public.budget_items where budget_version_id=v_source.id;

  update public.budgets set current_version_id=v_new_id,status='DRAFT' where id=p_budget_id;
  perform public.write_audit(v_budget.organization_id,'BUDGET_VERSION',v_new_id,'CREATE',jsonb_build_object('source_version',v_source.id,'version_number',v_number));
  return v_new_id;
end;
$$;

create or replace function public.prevent_frozen_budget_version_mutation()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.frozen_at is not null then
    raise exception 'Versão congelada é imutável; crie uma nova versão';
  end if;
  return case when tg_op='DELETE' then old else new end;
end;
$$;

create trigger prevent_budget_version_update
before update or delete on public.budget_versions
for each row when (old.frozen_at is not null)
execute function public.prevent_frozen_budget_version_mutation();

create or replace function public.prevent_frozen_budget_item_mutation()
returns trigger language plpgsql set search_path = public as $$
declare v_version_id uuid; v_frozen timestamptz;
begin
  v_version_id := case when tg_op='DELETE' then old.budget_version_id else new.budget_version_id end;
  select frozen_at into v_frozen from public.budget_versions where id=v_version_id;
  if v_frozen is not null then raise exception 'Itens de versão congelada são imutáveis'; end if;
  return case when tg_op='DELETE' then old else new end;
end;
$$;

create trigger prevent_budget_item_mutation
before insert or update or delete on public.budget_items
for each row execute function public.prevent_frozen_budget_item_mutation();

create or replace function public.release_proposal_version(p_proposal_version_id uuid)
returns public.proposal_versions
language plpgsql security definer set search_path = public as $$
declare v public.proposal_versions; v_proposal public.proposals;
begin
  select * into v from public.proposal_versions where id=p_proposal_version_id for update;
  select * into v_proposal from public.proposals where id=v.proposal_id for update;
  if not public.has_org_role(v.organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR','COMERCIAL']::public.org_role[]) then
    raise exception 'Acesso negado';
  end if;
  if v.frozen_at is null or v.document_path is null or v.document_sha256 is null then
    raise exception 'A proposta deve estar congelada e possuir PDF com hash';
  end if;
  update public.proposal_versions set client_released_at=now() where id=v.id returning * into v;
  update public.proposals set status='SENT',client_released_at=now(),current_version_id=v.id where id=v.proposal_id;
  perform public.write_audit(v.organization_id,'PROPOSAL_VERSION',v.id,'RELEASE_TO_CLIENT',jsonb_build_object('sha256',v.document_sha256));
  return v;
end;
$$;

create or replace function public.create_contract_from_proposal(
  p_proposal_version_id uuid,
  p_contract_code text,
  p_contract_title text,
  p_rendered_body text,
  p_template_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_pv public.proposal_versions; v_p public.proposals; v_contract_id uuid; v_cv_id uuid;
begin
  select * into v_pv from public.proposal_versions where id=p_proposal_version_id;
  select * into v_p from public.proposals where id=v_pv.proposal_id for update;
  if not public.has_org_role(v_p.organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]) then
    raise exception 'Acesso negado';
  end if;
  if v_p.status <> 'ACCEPTED' then raise exception 'A proposta precisa estar aceita'; end if;

  insert into public.contracts(
    organization_id,client_id,proposal_id,code,title,status,original_value,created_by
  ) values (
    v_p.organization_id,v_p.client_id,v_p.id,upper(trim(p_contract_code)),p_contract_title,'DRAFT',v_pv.sale_price,auth.uid()
  ) returning id into v_contract_id;

  insert into public.contract_versions(
    organization_id,contract_id,template_id,version_number,rendered_body,value,status,created_by
  ) values (
    v_p.organization_id,v_contract_id,p_template_id,1,p_rendered_body,v_pv.sale_price,'DRAFT',auth.uid()
  ) returning id into v_cv_id;

  update public.contracts set current_version_id=v_cv_id where id=v_contract_id;
  update public.proposals set status='CONVERTED' where id=v_p.id;
  update public.budgets set status='CONTRACTED' where id=v_p.budget_id;
  perform public.write_audit(v_p.organization_id,'CONTRACT',v_contract_id,'CREATE_FROM_PROPOSAL',jsonb_build_object('proposal_version_id',p_proposal_version_id));
  return v_contract_id;
end;
$$;

create or replace function public.create_amendment(
  p_contract_id uuid,
  p_code text,
  p_reason text,
  p_scope_delta text,
  p_value_delta numeric,
  p_days_delta integer,
  p_new_end_date date default null,
  p_budget_version_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_contract public.contracts; v_id uuid; v_version_id uuid;
begin
  select * into v_contract from public.contracts where id=p_contract_id for update;
  if not public.has_org_role(v_contract.organization_id,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR','GESTOR_OBRAS']::public.org_role[]) then
    raise exception 'Acesso negado';
  end if;
  insert into public.amendments(
    organization_id,contract_id,budget_version_id,code,reason,scope_delta,value_delta,days_delta,new_end_date,created_by
  ) values (
    v_contract.organization_id,p_contract_id,p_budget_version_id,upper(trim(p_code)),p_reason,p_scope_delta,
    coalesce(p_value_delta,0),coalesce(p_days_delta,0),p_new_end_date,auth.uid()
  ) returning id into v_id;
  insert into public.amendment_versions(
    organization_id,amendment_id,version_number,rendered_body,value_delta,days_delta,created_by
  ) values (
    v_contract.organization_id,v_id,1,p_reason || E'\n\n' || coalesce(p_scope_delta,''),coalesce(p_value_delta,0),coalesce(p_days_delta,0),auth.uid()
  ) returning id into v_version_id;
  update public.amendments set current_version_id=v_version_id where id=v_id;
  perform public.write_audit(v_contract.organization_id,'AMENDMENT',v_id,'CREATE',jsonb_build_object('contract_id',p_contract_id,'value_delta',p_value_delta,'days_delta',p_days_delta));
  return v_id;
end;
$$;

create or replace function public.create_sandbox_signature_envelope(
  p_contract_version_id uuid,
  p_amendment_version_id uuid,
  p_idempotency_key text,
  p_signers jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_id uuid; v_signer jsonb;
begin
  if not public.is_aal2() then raise exception 'MFA AAL2 obrigatório'; end if;
  select organization_id into v_org from public.contract_versions where id=p_contract_version_id;
  if v_org is null then select organization_id into v_org from public.amendment_versions where id=p_amendment_version_id; end if;
  if not public.has_org_role(v_org,array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR']::public.org_role[]) then raise exception 'Acesso negado'; end if;

  insert into public.signature_envelopes(
    organization_id,provider,contract_version_id,amendment_version_id,status,idempotency_key,created_by
  ) values (
    v_org,'SANDBOX',p_contract_version_id,p_amendment_version_id,'DRAFT',p_idempotency_key,auth.uid()
  ) on conflict(organization_id,idempotency_key) do update set updated_at=now()
  returning id into v_id;

  for v_signer in select * from jsonb_array_elements(coalesce(p_signers,'[]'::jsonb)) loop
    insert into public.signature_signers(organization_id,envelope_id,name,email,role_label,signing_order)
    values(v_org,v_id,v_signer->>'name',v_signer->>'email',v_signer->>'role',coalesce((v_signer->>'order')::integer,1))
    on conflict do nothing;
  end loop;

  perform public.write_audit(v_org,'SIGNATURE_ENVELOPE',v_id,'CREATE_SANDBOX',jsonb_build_object('legal_validity','none'));
  return v_id;
end;
$$;

commit;
