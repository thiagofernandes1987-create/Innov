begin;

create or replace function public.create_proposal_from_budget_version(
  p_budget_version_id uuid,
  p_code text,
  p_title text,
  p_object_text text,
  p_scope_text text,
  p_inclusions text,
  p_exclusions text,
  p_assumptions text,
  p_commercial_summary text,
  p_payment_terms text,
  p_deadline_text text,
  p_warranty_text text,
  p_notes text,
  p_valid_until date,
  p_document_path text,
  p_document_sha256 text,
  p_release_client boolean default false
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_budget_version public.budget_versions;
  v_budget public.budgets;
  v_proposal_id uuid;
  v_version_id uuid;
  v_released_at timestamptz;
begin
  select * into v_budget_version
    from public.budget_versions
    where id = p_budget_version_id
    for update;

  if v_budget_version.id is null then
    raise exception 'Versão de orçamento não encontrada';
  end if;

  select * into v_budget
    from public.budgets
    where id = v_budget_version.budget_id
    for update;

  if not public.has_org_role(
    v_budget.organization_id,
    array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR','COMERCIAL','ORCAMENTISTA']::public.org_role[]
  ) then
    raise exception 'Acesso negado';
  end if;

  if v_budget_version.status <> 'APPROVED' or v_budget_version.frozen_at is null then
    raise exception 'O orçamento precisa estar aprovado e congelado';
  end if;

  if nullif(trim(p_code), '') is null
    or nullif(trim(p_title), '') is null
    or nullif(trim(p_object_text), '') is null
    or nullif(trim(p_scope_text), '') is null then
    raise exception 'Código, título, objeto e escopo são obrigatórios';
  end if;

  if nullif(trim(p_document_path), '') is null
    or p_document_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'PDF autenticado com hash SHA-256 é obrigatório';
  end if;

  v_released_at := case when p_release_client then now() else null end;

  insert into public.proposals(
    organization_id,
    client_id,
    budget_id,
    code,
    status,
    valid_until,
    client_released_at,
    created_by
  ) values (
    v_budget.organization_id,
    v_budget.client_id,
    v_budget.id,
    upper(trim(p_code)),
    case when p_release_client then 'SENT'::public.proposal_status else 'APPROVED'::public.proposal_status end,
    p_valid_until,
    v_released_at,
    auth.uid()
  ) returning id into v_proposal_id;

  insert into public.proposal_versions(
    organization_id,
    proposal_id,
    budget_version_id,
    version_number,
    title,
    object_text,
    scope_text,
    inclusions,
    exclusions,
    assumptions,
    commercial_summary,
    sale_price,
    payment_terms,
    deadline_text,
    warranty_text,
    notes,
    document_path,
    document_sha256,
    source_snapshot,
    frozen_at,
    client_released_at,
    created_by
  ) values (
    v_budget.organization_id,
    v_proposal_id,
    v_budget_version.id,
    1,
    trim(p_title),
    trim(p_object_text),
    trim(p_scope_text),
    nullif(trim(p_inclusions), ''),
    nullif(trim(p_exclusions), ''),
    nullif(trim(p_assumptions), ''),
    nullif(trim(p_commercial_summary), ''),
    v_budget_version.sale_price,
    nullif(trim(p_payment_terms), ''),
    nullif(trim(p_deadline_text), ''),
    nullif(trim(p_warranty_text), ''),
    nullif(trim(p_notes), ''),
    trim(p_document_path),
    p_document_sha256,
    jsonb_build_object(
      'budget_id', v_budget.id,
      'budget_version_id', v_budget_version.id,
      'budget_code', v_budget.code,
      'budget_title', v_budget.title,
      'sale_price', v_budget_version.sale_price,
      'approved_at', v_budget_version.approved_at
    ),
    now(),
    v_released_at,
    auth.uid()
  ) returning id into v_version_id;

  update public.proposals
    set current_version_id = v_version_id
    where id = v_proposal_id;

  update public.budgets
    set status = case
      when p_release_client then 'CLIENT_SENT'::public.budget_status
      else 'APPROVED'::public.budget_status
    end
    where id = v_budget.id;

  perform public.write_audit(
    v_budget.organization_id,
    'PROPOSAL',
    v_proposal_id,
    case when p_release_client then 'CREATE_AND_RELEASE' else 'CREATE_FROM_BUDGET' end,
    jsonb_build_object(
      'budget_version_id', v_budget_version.id,
      'proposal_version_id', v_version_id,
      'document_sha256', p_document_sha256
    )
  );

  return v_proposal_id;
end;
$$;

revoke execute on function public.create_proposal_from_budget_version(
  uuid,text,text,text,text,text,text,text,text,text,text,text,text,date,text,text,boolean
) from public;
revoke execute on function public.create_proposal_from_budget_version(
  uuid,text,text,text,text,text,text,text,text,text,text,text,text,date,text,text,boolean
) from anon;
grant execute on function public.create_proposal_from_budget_version(
  uuid,text,text,text,text,text,text,text,text,text,text,text,text,date,text,text,boolean
) to authenticated;

commit;
