begin;

-- VACINA-028: capacidade documentada precisa de porta de entrada real.
-- Projeto/obra não nasce obrigatoriamente de contrato; proposta não nasce
-- obrigatoriamente de orçamento.

alter table public.projects
  add column if not exists entry_mode text not null default 'INDEPENDENT',
  add column if not exists data_cutoff date,
  add column if not exists historical_cost numeric(18,2) not null default 0,
  add column if not exists imported_from text;

update public.projects
set entry_mode = 'CONTRACT'
where contract_id is not null
  and entry_mode = 'INDEPENDENT';

alter table public.projects
  drop constraint if exists projects_entry_mode_check;
alter table public.projects
  add constraint projects_entry_mode_check
  check (entry_mode in ('CONTRACT','INDEPENDENT','IN_PROGRESS','HISTORICAL','IMPORTED'));

alter table public.projects
  drop constraint if exists projects_historical_cost_check;
alter table public.projects
  add constraint projects_historical_cost_check check (historical_cost >= 0);

alter table public.proposals alter column budget_id drop not null;
alter table public.proposal_versions alter column budget_version_id drop not null;

alter table public.proposal_versions
  add column if not exists pricing_mode text not null default 'BUDGET',
  add column if not exists base_price numeric(18,2),
  add column if not exists discount_rate numeric(9,6) not null default 0,
  add column if not exists discount_amount numeric(18,2) not null default 0,
  add column if not exists discount_status text not null default 'NOT_REQUIRED',
  add column if not exists discount_reason text;

update public.proposal_versions
set base_price = sale_price
where base_price is null;

alter table public.proposal_versions
  alter column base_price set not null;

alter table public.proposal_versions
  drop constraint if exists proposal_versions_pricing_mode_check;
alter table public.proposal_versions
  add constraint proposal_versions_pricing_mode_check
  check (pricing_mode in ('BUDGET','FIXED'));

alter table public.proposal_versions
  drop constraint if exists proposal_versions_discount_rate_check;
alter table public.proposal_versions
  add constraint proposal_versions_discount_rate_check
  check (discount_rate >= 0 and discount_rate < 1);

alter table public.proposal_versions
  drop constraint if exists proposal_versions_discount_amount_check;
alter table public.proposal_versions
  add constraint proposal_versions_discount_amount_check
  check (discount_amount >= 0 and discount_amount <= base_price);

alter table public.proposal_versions
  drop constraint if exists proposal_versions_discount_status_check;
alter table public.proposal_versions
  add constraint proposal_versions_discount_status_check
  check (discount_status in ('NOT_REQUIRED','APPROVED_BY_POLICY','PENDING','APPROVED','REJECTED'));

create table if not exists public.proposal_discount_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  proposal_version_id uuid not null references public.proposal_versions(id) on delete cascade,
  requested_by uuid references auth.users(id),
  requested_at timestamptz not null default now(),
  discount_rate numeric(9,6) not null check (discount_rate > 0.07 and discount_rate < 1),
  base_price numeric(18,2) not null check (base_price > 0),
  final_price numeric(18,2) not null check (final_price >= 0),
  reason text not null,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  comment text,
  unique (proposal_version_id)
);

alter table public.proposal_discount_decisions enable row level security;
alter table public.proposal_discount_decisions force row level security;

drop policy if exists proposal_discount_decisions_internal_select on public.proposal_discount_decisions;
create policy proposal_discount_decisions_internal_select
on public.proposal_discount_decisions for select to authenticated
using (public.is_internal_member(organization_id));

drop policy if exists proposal_discount_decisions_no_direct_write on public.proposal_discount_decisions;
create policy proposal_discount_decisions_no_direct_write
on public.proposal_discount_decisions for all to authenticated
using (false) with check (false);

revoke all on public.proposal_discount_decisions from anon;
revoke insert, update, delete on public.proposal_discount_decisions from authenticated;
grant select on public.proposal_discount_decisions to authenticated;

create or replace function public.create_independent_project(
  p_organization_id uuid,
  p_client_id uuid,
  p_entry_mode text,
  p_code text,
  p_name text,
  p_status text,
  p_description text,
  p_planned_start date,
  p_planned_end date,
  p_actual_start date,
  p_progress numeric,
  p_data_cutoff date,
  p_historical_cost numeric,
  p_address_line text,
  p_city text,
  p_state text,
  p_postal_code text,
  p_manager_id uuid,
  p_imported_from text
) returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_project_id uuid;
  v_entry_mode text := upper(trim(coalesce(p_entry_mode, 'INDEPENDENT')));
  v_status text := upper(trim(coalesce(p_status, 'PLANNING')));
begin
  if not public.has_org_role(
    p_organization_id,
    array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR','GESTOR_OBRAS','ENGENHEIRO']::public.org_role[]
  ) then
    raise exception 'Acesso negado para criar obra ou projeto.';
  end if;

  if v_entry_mode not in ('INDEPENDENT','IN_PROGRESS','HISTORICAL','IMPORTED') then
    raise exception 'Origem de projeto inválida.';
  end if;

  if v_status not in ('PLANNING','ACTIVE','IN_PROGRESS','ON_HOLD','COMPLETED') then
    raise exception 'Situação inicial inválida.';
  end if;

  if nullif(trim(p_code), '') is null or nullif(trim(p_name), '') is null then
    raise exception 'Código e nome são obrigatórios.';
  end if;

  if p_client_id is not null and not exists (
    select 1 from public.clients
    where id = p_client_id and organization_id = p_organization_id
  ) then
    raise exception 'Cliente não pertence à organização.';
  end if;

  if p_manager_id is not null and not exists (
    select 1 from public.organization_memberships
    where organization_id = p_organization_id
      and user_id = p_manager_id
      and active
  ) then
    raise exception 'Responsável não é membro ativo da organização.';
  end if;

  if p_planned_start is not null and p_planned_end is not null and p_planned_end < p_planned_start then
    raise exception 'Término planejado não pode ser anterior ao início.';
  end if;

  if v_entry_mode in ('IN_PROGRESS','HISTORICAL','IMPORTED') and p_data_cutoff is null then
    raise exception 'Obra existente ou importada exige data de corte.';
  end if;

  if coalesce(p_progress, 0) < 0 or coalesce(p_progress, 0) > 1 then
    raise exception 'Progresso precisa estar entre 0 e 100%%.';
  end if;

  insert into public.projects (
    organization_id, client_id, code, name, status, description,
    planned_start, planned_end, actual_start, progress, manager_id,
    address_line, city, state, postal_code, entry_mode, data_cutoff,
    historical_cost, imported_from, created_by
  ) values (
    p_organization_id, p_client_id, upper(trim(p_code)), trim(p_name), v_status,
    nullif(trim(p_description), ''), p_planned_start, p_planned_end,
    p_actual_start, coalesce(p_progress, 0), p_manager_id,
    nullif(trim(p_address_line), ''), nullif(trim(p_city), ''),
    nullif(upper(trim(p_state)), ''), nullif(trim(p_postal_code), ''),
    v_entry_mode, p_data_cutoff, coalesce(p_historical_cost, 0),
    nullif(trim(p_imported_from), ''), auth.uid()
  ) returning id into v_project_id;

  perform public.write_audit(
    p_organization_id,
    'PROJECT',
    v_project_id,
    'CREATE_WITHOUT_CONTRACT',
    jsonb_build_object(
      'entry_mode', v_entry_mode,
      'status', v_status,
      'data_cutoff', p_data_cutoff,
      'progress', coalesce(p_progress, 0),
      'historical_cost', coalesce(p_historical_cost, 0)
    ),
    v_project_id
  );

  return v_project_id;
end;
$function$;

create or replace function public.create_commercial_proposal(
  p_client_id uuid,
  p_budget_version_id uuid,
  p_pricing_mode text,
  p_fixed_value numeric,
  p_discount_rate numeric,
  p_discount_reason text,
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
set search_path = public, auth, pg_temp
as $function$
declare
  v_mode text := upper(trim(coalesce(p_pricing_mode, 'FIXED')));
  v_budget_version public.budget_versions;
  v_budget public.budgets;
  v_client public.clients;
  v_organization_id uuid;
  v_client_id uuid;
  v_budget_id uuid;
  v_base_price numeric(18,2);
  v_discount_rate numeric(9,6) := coalesce(p_discount_rate, 0);
  v_discount_amount numeric(18,2);
  v_final_price numeric(18,2);
  v_discount_status text;
  v_proposal_status public.proposal_status;
  v_proposal_id uuid;
  v_version_id uuid;
  v_released_at timestamptz;
  v_has_document boolean;
begin
  if v_mode not in ('BUDGET','FIXED') then
    raise exception 'Modo de precificação inválido.';
  end if;

  if v_mode = 'BUDGET' then
    if p_budget_version_id is null then raise exception 'Selecione um orçamento calculado.'; end if;

    select * into v_budget_version
    from public.budget_versions
    where id = p_budget_version_id
    for update;

    if v_budget_version.id is null or v_budget_version.frozen_at is null or v_budget_version.sale_price <= 0 then
      raise exception 'O orçamento precisa estar calculado, congelado e possuir preço de venda.';
    end if;

    if v_budget_version.status not in ('APPROVAL_PENDING','APPROVED') then
      raise exception 'A versão do orçamento ainda não está pronta para proposta.';
    end if;

    select * into v_budget from public.budgets where id = v_budget_version.budget_id;
    v_organization_id := v_budget.organization_id;
    v_client_id := v_budget.client_id;
    v_budget_id := v_budget.id;
    v_base_price := v_budget_version.sale_price;
  else
    if p_client_id is null then raise exception 'Selecione o cliente da proposta.'; end if;
    select * into v_client from public.clients where id = p_client_id;
    if v_client.id is null then raise exception 'Cliente não encontrado.'; end if;
    v_organization_id := v_client.organization_id;
    v_client_id := v_client.id;
    v_budget_id := null;
    v_base_price := round(coalesce(p_fixed_value, 0), 2);
    if v_base_price <= 0 then raise exception 'Valor fixo precisa ser maior que zero.'; end if;
  end if;

  if not public.has_org_role(
    v_organization_id,
    array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR','COMERCIAL','ORCAMENTISTA']::public.org_role[]
  ) then
    raise exception 'Acesso negado para criar proposta.';
  end if;

  if nullif(trim(p_code), '') is null
    or nullif(trim(p_title), '') is null
    or nullif(trim(p_object_text), '') is null
    or nullif(trim(p_scope_text), '') is null then
    raise exception 'Código, título, objeto e escopo são obrigatórios.';
  end if;

  if v_discount_rate < 0 or v_discount_rate >= 1 then
    raise exception 'Desconto precisa estar entre 0%% e 99,99%%.';
  end if;

  if v_discount_rate > 0.07 and nullif(trim(p_discount_reason), '') is null then
    raise exception 'Desconto acima de 7%% exige justificativa para a diretoria.';
  end if;

  v_discount_amount := round(v_base_price * v_discount_rate, 2);
  v_final_price := round(v_base_price - v_discount_amount, 2);
  v_has_document := nullif(trim(coalesce(p_document_path, '')), '') is not null
    and coalesce(p_document_sha256, '') ~ '^[0-9a-f]{64}$';

  if v_discount_rate > 0.07 then
    v_discount_status := 'PENDING';
  elsif v_discount_rate > 0 then
    v_discount_status := 'APPROVED_BY_POLICY';
  else
    v_discount_status := 'NOT_REQUIRED';
  end if;

  if p_release_client and not v_has_document then
    raise exception 'Para enviar ao cliente, anexe o PDF final da proposta.';
  end if;

  if p_release_client and v_discount_status = 'PENDING' then
    raise exception 'Desconto acima de 7%% precisa ser aprovado pela diretoria antes do envio.';
  end if;

  if p_release_client and v_mode = 'BUDGET' and v_budget_version.status <> 'APPROVED' then
    raise exception 'Orçamento em aprovação pode gerar rascunho, mas não pode ser enviado ao cliente.';
  end if;

  v_released_at := case when p_release_client then now() else null end;
  v_proposal_status := case
    when v_discount_status = 'PENDING' then 'INTERNAL_REVIEW'::public.proposal_status
    when p_release_client then 'SENT'::public.proposal_status
    when not v_has_document then 'DRAFT'::public.proposal_status
    else 'APPROVED'::public.proposal_status
  end;

  insert into public.proposals (
    organization_id, client_id, budget_id, code, status, valid_until,
    client_released_at, created_by
  ) values (
    v_organization_id, v_client_id, v_budget_id, upper(trim(p_code)),
    v_proposal_status, p_valid_until, v_released_at, auth.uid()
  ) returning id into v_proposal_id;

  insert into public.proposal_versions (
    organization_id, proposal_id, budget_version_id, version_number,
    title, object_text, scope_text, inclusions, exclusions, assumptions,
    commercial_summary, pricing_mode, base_price, discount_rate,
    discount_amount, discount_status, discount_reason, sale_price,
    payment_terms, deadline_text, warranty_text, notes, document_path,
    document_sha256, source_snapshot, frozen_at, client_released_at, created_by
  ) values (
    v_organization_id, v_proposal_id, case when v_mode = 'BUDGET' then v_budget_version.id else null end,
    1, trim(p_title), trim(p_object_text), trim(p_scope_text),
    nullif(trim(p_inclusions), ''), nullif(trim(p_exclusions), ''),
    nullif(trim(p_assumptions), ''), nullif(trim(p_commercial_summary), ''),
    v_mode, v_base_price, v_discount_rate, v_discount_amount,
    v_discount_status, nullif(trim(p_discount_reason), ''), v_final_price,
    nullif(trim(p_payment_terms), ''), nullif(trim(p_deadline_text), ''),
    nullif(trim(p_warranty_text), ''), nullif(trim(p_notes), ''),
    nullif(trim(p_document_path), ''), case when v_has_document then p_document_sha256 else null end,
    case when v_mode = 'BUDGET' then jsonb_build_object(
      'pricing_mode','BUDGET','budget_id',v_budget.id,'budget_version_id',v_budget_version.id,
      'budget_code',v_budget.code,'budget_title',v_budget.title,
      'budget_status',v_budget_version.status,'base_price',v_base_price,
      'discount_rate',v_discount_rate,'final_price',v_final_price
    ) else jsonb_build_object(
      'pricing_mode','FIXED','base_price',v_base_price,
      'discount_rate',v_discount_rate,'final_price',v_final_price
    ) end,
    case when v_has_document then now() else null end,
    v_released_at, auth.uid()
  ) returning id into v_version_id;

  update public.proposals set current_version_id = v_version_id where id = v_proposal_id;

  if v_discount_status = 'PENDING' then
    insert into public.proposal_discount_decisions (
      organization_id, proposal_id, proposal_version_id, requested_by,
      discount_rate, base_price, final_price, reason
    ) values (
      v_organization_id, v_proposal_id, v_version_id, auth.uid(),
      v_discount_rate, v_base_price, v_final_price, trim(p_discount_reason)
    );
  end if;

  perform public.write_audit(
    v_organization_id,
    'PROPOSAL',
    v_proposal_id,
    case when v_mode = 'FIXED' then 'CREATE_FIXED_PRICE' else 'CREATE_FROM_BUDGET' end,
    jsonb_build_object(
      'proposal_version_id',v_version_id,'pricing_mode',v_mode,
      'base_price',v_base_price,'discount_rate',v_discount_rate,
      'final_price',v_final_price,'discount_status',v_discount_status,
      'client_released',p_release_client
    )
  );

  return v_proposal_id;
end;
$function$;

create or replace function public.decide_proposal_discount(
  p_proposal_version_id uuid,
  p_decision text,
  p_comment text
) returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_decision public.proposal_discount_decisions;
  v_status text := upper(trim(coalesce(p_decision, '')));
begin
  select * into v_decision
  from public.proposal_discount_decisions
  where proposal_version_id = p_proposal_version_id
  for update;

  if v_decision.id is null or v_decision.status <> 'PENDING' then
    raise exception 'Solicitação de desconto pendente não encontrada.';
  end if;

  if not public.has_org_role(
    v_decision.organization_id,
    array['SUPER_ADMIN','DIRECAO']::public.org_role[]
  ) then
    raise exception 'Somente a diretoria pode decidir desconto acima da alçada.';
  end if;

  if auth.uid() = v_decision.requested_by then
    raise exception 'O solicitante não pode aprovar o próprio desconto.';
  end if;

  if v_status not in ('APPROVED','REJECTED') then
    raise exception 'Decisão inválida.';
  end if;

  if nullif(trim(p_comment), '') is null then
    raise exception 'Comentário da diretoria é obrigatório.';
  end if;

  update public.proposal_discount_decisions
  set status = v_status,
      decided_by = auth.uid(),
      decided_at = now(),
      comment = trim(p_comment)
  where id = v_decision.id;

  update public.proposal_versions
  set discount_status = v_status
  where id = p_proposal_version_id;

  update public.proposals
  set status = case
    when v_status = 'APPROVED' then 'APPROVED'::public.proposal_status
    else 'DRAFT'::public.proposal_status
  end,
  updated_at = now()
  where id = v_decision.proposal_id;

  perform public.write_audit(
    v_decision.organization_id,
    'PROPOSAL',
    v_decision.proposal_id,
    'DISCOUNT_' || v_status,
    jsonb_build_object(
      'proposal_version_id',p_proposal_version_id,
      'discount_rate',v_decision.discount_rate,
      'comment',trim(p_comment)
    )
  );

  return v_decision.proposal_id;
end;
$function$;

revoke all on function public.create_independent_project(
  uuid,uuid,text,text,text,text,text,date,date,date,numeric,date,numeric,text,text,text,text,uuid,text
) from public;
revoke all on function public.create_independent_project(
  uuid,uuid,text,text,text,text,text,date,date,date,numeric,date,numeric,text,text,text,text,uuid,text
) from anon;
grant execute on function public.create_independent_project(
  uuid,uuid,text,text,text,text,text,date,date,date,numeric,date,numeric,text,text,text,text,uuid,text
) to authenticated;

revoke all on function public.create_commercial_proposal(
  uuid,uuid,text,numeric,numeric,text,text,text,text,text,text,text,text,text,text,text,text,text,date,text,text,boolean
) from public;
revoke all on function public.create_commercial_proposal(
  uuid,uuid,text,numeric,numeric,text,text,text,text,text,text,text,text,text,text,text,text,text,date,text,text,boolean
) from anon;
grant execute on function public.create_commercial_proposal(
  uuid,uuid,text,numeric,numeric,text,text,text,text,text,text,text,text,text,text,text,text,text,date,text,text,boolean
) to authenticated;

revoke all on function public.decide_proposal_discount(uuid,text,text) from public;
revoke all on function public.decide_proposal_discount(uuid,text,text) from anon;
grant execute on function public.decide_proposal_discount(uuid,text,text) to authenticated;

create index if not exists projects_organization_entry_mode_idx
on public.projects(organization_id, entry_mode, status)
where archived_at is null;

create index if not exists proposal_versions_pricing_mode_idx
on public.proposal_versions(organization_id, pricing_mode, discount_status);

create index if not exists proposal_discount_decisions_pending_idx
on public.proposal_discount_decisions(organization_id, requested_at)
where status = 'PENDING';

commit;
