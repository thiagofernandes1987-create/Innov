-- Rodada 02 da campanha QA por personas.
-- VACINA-028: uma capacidade só existe quando possui entrada e conteúdo útil.
-- VACINA-034: aprovação exige ator independente.

create table public.cost_reference_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_key text not null,
  source_name text not null,
  region text not null,
  reference_code text not null,
  base_date date not null,
  publication_date date,
  tax_relief boolean not null default false,
  unit text not null default 'm²',
  total_cost numeric(18,4) not null check (total_cost >= 0),
  materials_cost numeric(18,4),
  labor_cost numeric(18,4),
  administrative_cost numeric(18,4),
  equipment_cost numeric(18,4),
  monthly_change_rate numeric(12,8),
  year_change_rate numeric(12,8),
  twelve_month_change_rate numeric(12,8),
  source_url text not null,
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  raw_payload jsonb not null default '{}'::jsonb,
  retrieved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (source_key, region, reference_code, base_date, tax_relief)
);

create table public.cost_source_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_key text not null,
  status text not null check (status in ('RUNNING','COMPLETED','UNCHANGED','FAILED')),
  source_url text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  imported_records integer not null default 0 check (imported_records >= 0),
  unchanged_records integer not null default 0 check (unchanged_records >= 0),
  rejected_records integer not null default 0 check (rejected_records >= 0),
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index cost_reference_snapshots_latest_idx
  on public.cost_reference_snapshots(source_key, region, reference_code, tax_relief, base_date desc);
create index cost_source_sync_runs_latest_idx
  on public.cost_source_sync_runs(source_key, started_at desc);

alter table public.cost_reference_snapshots enable row level security;
alter table public.cost_source_sync_runs enable row level security;

create policy cost_reference_snapshots_authenticated_read
  on public.cost_reference_snapshots
  for select to authenticated
  using (true);

create policy cost_source_sync_runs_internal_read
  on public.cost_source_sync_runs
  for select to authenticated
  using (
    exists (
      select 1
      from public.organization_memberships membership
      where membership.user_id = (select auth.uid())
        and membership.active
        and membership.role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR','ORCAMENTISTA','FINANCEIRO')
    )
  );

revoke all on public.cost_reference_snapshots from public, anon;
revoke all on public.cost_source_sync_runs from public, anon;
grant select on public.cost_reference_snapshots to authenticated;
grant select on public.cost_source_sync_runs to authenticated;
grant all on public.cost_reference_snapshots to service_role;
grant all on public.cost_source_sync_runs to service_role;

alter table public.budget_versions
  add column reference_snapshot_id uuid references public.cost_reference_snapshots(id) on delete restrict;

create index budget_versions_reference_snapshot_idx
  on public.budget_versions(reference_snapshot_id)
  where reference_snapshot_id is not null;

create or replace function public.refresh_budget_readiness_validations(
  p_version_id uuid
)
returns integer
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v public.budget_versions;
  v_item_count integer;
  v_positive_total numeric(18,4);
  v_missing_source integer;
  v_missing_base_date integer;
  v_future_source integer;
  v_stale_source integer;
  v_last_item_update timestamptz;
  v_calculated_at timestamptz;
  v_blocking integer;
begin
  select * into v
  from public.budget_versions
  where id = p_version_id;

  if not found then
    raise exception 'Versão de orçamento não encontrada.';
  end if;

  if not public.is_org_member(v.organization_id) then
    raise exception 'Acesso negado.';
  end if;

  delete from public.budget_validation_results
  where budget_version_id = p_version_id
    and resolved_at is null
    and code in (
      'BUDGET_WITHOUT_ITEMS',
      'BUDGET_ZERO_COST',
      'ITEM_WITHOUT_SOURCE',
      'ITEM_WITHOUT_BASE_DATE',
      'ITEM_SOURCE_IN_FUTURE',
      'STALE_COST_SOURCE',
      'CALCULATION_STALE'
    );

  select
    count(*),
    coalesce(sum(quantity * unit_cost * (1 + loss_rate + freight_rate)), 0),
    count(*) filter (
      where cost_type in ('DIRECT','INDIRECT')
        and nullif(trim(coalesce(source, '')), '') is null
    ),
    count(*) filter (
      where cost_type in ('DIRECT','INDIRECT') and base_date is null
    ),
    count(*) filter (
      where base_date is not null and base_date > v.base_date
    ),
    count(*) filter (
      where cost_type in ('DIRECT','INDIRECT')
        and base_date is not null
        and base_date < (v.base_date - 60)
    ),
    max(updated_at)
  into
    v_item_count,
    v_positive_total,
    v_missing_source,
    v_missing_base_date,
    v_future_source,
    v_stale_source,
    v_last_item_update
  from public.budget_items
  where budget_version_id = p_version_id;

  begin
    v_calculated_at := nullif(v.calculation_memory ->> 'calculated_at', '')::timestamptz;
  exception when others then
    v_calculated_at := null;
  end;

  if v_item_count = 0 then
    insert into public.budget_validation_results(
      organization_id, budget_version_id, code, severity, message, field_name
    ) values (
      v.organization_id, p_version_id, 'BUDGET_WITHOUT_ITEMS', 'BLOCKING',
      'Inclua ao menos um item de custo antes de solicitar aprovação.', 'budget_items'
    );
  end if;

  if v_item_count > 0 and v_positive_total <= 0 then
    insert into public.budget_validation_results(
      organization_id, budget_version_id, code, severity, message, field_name
    ) values (
      v.organization_id, p_version_id, 'BUDGET_ZERO_COST', 'BLOCKING',
      'O orçamento possui itens, mas o custo calculável é igual a zero.', 'budget_items'
    );
  end if;

  if v_missing_source > 0 then
    insert into public.budget_validation_results(
      organization_id, budget_version_id, code, severity, message, field_name
    ) values (
      v.organization_id, p_version_id, 'ITEM_WITHOUT_SOURCE', 'BLOCKING',
      format('%s item(ns) direto(s) ou indireto(s) não informam a fonte do custo.', v_missing_source),
      'source'
    );
  end if;

  if v_missing_base_date > 0 then
    insert into public.budget_validation_results(
      organization_id, budget_version_id, code, severity, message, field_name
    ) values (
      v.organization_id, p_version_id, 'ITEM_WITHOUT_BASE_DATE', 'BLOCKING',
      format('%s item(ns) direto(s) ou indireto(s) não informam a data-base.', v_missing_base_date),
      'base_date'
    );
  end if;

  if v_future_source > 0 then
    insert into public.budget_validation_results(
      organization_id, budget_version_id, code, severity, message, field_name
    ) values (
      v.organization_id, p_version_id, 'ITEM_SOURCE_IN_FUTURE', 'BLOCKING',
      format('%s item(ns) usam data-base posterior à data-base do orçamento.', v_future_source),
      'base_date'
    );
  end if;

  if v_stale_source > 0 then
    insert into public.budget_validation_results(
      organization_id, budget_version_id, code, severity, message, field_name
    ) values (
      v.organization_id, p_version_id, 'STALE_COST_SOURCE', 'BLOCKING',
      format('%s item(ns) usam fonte com mais de 60 dias em relação à data-base do orçamento.', v_stale_source),
      'base_date'
    );
  end if;

  if v_calculated_at is null
     or (v_last_item_update is not null and v_last_item_update > v_calculated_at) then
    insert into public.budget_validation_results(
      organization_id, budget_version_id, code, severity, message, field_name
    ) values (
      v.organization_id, p_version_id, 'CALCULATION_STALE', 'BLOCKING',
      'Recalcule o orçamento depois da última alteração de itens.', 'calculation_memory'
    );
  end if;

  select count(*) into v_blocking
  from public.budget_validation_results
  where budget_version_id = p_version_id
    and severity = 'BLOCKING'
    and resolved_at is null;

  return v_blocking;
end;
$function$;

revoke all on function public.refresh_budget_readiness_validations(uuid) from public, anon;
grant execute on function public.refresh_budget_readiness_validations(uuid) to authenticated, service_role;

create or replace function public.calculate_budget_version(p_version_id uuid)
returns public.budget_versions
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_org uuid;
  v public.budget_versions;
begin
  select organization_id into v_org
  from public.budget_versions
  where id = p_version_id;

  if not public.has_org_role(v_org, array[
    'SUPER_ADMIN','DIRECAO','ADMINISTRADOR','ORCAMENTISTA','FINANCEIRO'
  ]::public.org_role[]) then
    raise exception 'Alçada insuficiente para calcular orçamento';
  end if;

  v := public.calculate_budget_version_core(p_version_id);
  perform public.refresh_budget_readiness_validations(p_version_id);
  return v;
end;
$function$;

revoke all on function public.calculate_budget_version(uuid) from public, anon;
grant execute on function public.calculate_budget_version(uuid) to authenticated, service_role;

create or replace function public.freeze_budget_version(p_version_id uuid)
returns public.budget_versions
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v public.budget_versions;
  v_blocking integer;
begin
  select * into v
  from public.budget_versions
  where id = p_version_id
  for update;

  if not found then
    raise exception 'Versão de orçamento não encontrada.';
  end if;

  if not public.has_org_role(
    v.organization_id,
    array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR','ORCAMENTISTA']::public.org_role[]
  ) then
    raise exception 'Acesso negado';
  end if;

  if v.frozen_at is not null then
    raise exception 'Versão já congelada.';
  end if;

  v_blocking := public.refresh_budget_readiness_validations(p_version_id);

  if v_blocking > 0 then
    raise exception 'Existem validações bloqueantes pendentes';
  end if;

  update public.budget_versions
  set frozen_at = now(), status = 'APPROVAL_PENDING'
  where id = p_version_id
  returning * into v;

  perform public.write_audit(
    v.organization_id,
    'BUDGET_VERSION',
    p_version_id,
    'FREEZE',
    to_jsonb(v)
  );

  return v;
end;
$function$;

revoke all on function public.freeze_budget_version(uuid) from public, anon;
grant execute on function public.freeze_budget_version(uuid) to authenticated, service_role;

create or replace function public.decide_budget_approval(
  p_approval_id uuid,
  p_decision public.approval_status,
  p_reason text
)
returns public.budget_approvals
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v public.budget_approvals;
  v_version public.budget_versions;
begin
  if p_decision not in ('APPROVED','REJECTED') then
    raise exception 'Decisão inválida.';
  end if;

  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'Justificativa obrigatória.';
  end if;

  select * into v
  from public.budget_approvals
  where id = p_approval_id
  for update;

  if not found then
    raise exception 'Aprovação não encontrada.';
  end if;

  if v.status <> 'PENDING' then
    raise exception 'Aprovação já decidida.';
  end if;

  select * into v_version
  from public.budget_versions
  where id = v.budget_version_id;

  if not public.has_org_role(
    v.organization_id,
    array['SUPER_ADMIN','DIRECAO','ADMINISTRADOR','FINANCEIRO']::public.org_role[]
  ) then
    raise exception 'Alçada insuficiente';
  end if;

  if v.requires_aal2 and not public.is_aal2() then
    raise exception 'MFA AAL2 obrigatório';
  end if;

  if auth.uid() is null or v.requested_by = auth.uid() then
    raise exception 'Separação de funções: o solicitante não pode decidir a própria aprovação';
  end if;

  update public.budget_approvals
  set status = p_decision,
      approver_id = auth.uid(),
      reason = p_reason,
      decided_at = now()
  where id = p_approval_id
  returning * into v;

  if p_decision = 'APPROVED'
     and not exists (
       select 1
       from public.budget_approvals
       where budget_version_id = v.budget_version_id
         and status = 'PENDING'
     )
     and not exists (
       select 1
       from public.budget_approvals
       where budget_version_id = v.budget_version_id
         and status = 'REJECTED'
     ) then
    update public.budget_versions
    set status = 'APPROVED', approved_at = now(), approved_by = auth.uid()
    where id = v.budget_version_id;
  end if;

  perform public.write_audit(
    v.organization_id,
    'BUDGET_APPROVAL',
    v.id,
    p_decision::text,
    to_jsonb(v)
  );

  return v;
end;
$function$;

revoke all on function public.decide_budget_approval(uuid, public.approval_status, text) from public, anon;
grant execute on function public.decide_budget_approval(uuid, public.approval_status, text) to authenticated, service_role;
