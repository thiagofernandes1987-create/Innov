-- VACINA-039: referência externa mensal precisa preservar origem, data-base,
-- regime e snapshot; atualização de catálogo nunca altera orçamento congelado.

create table if not exists public.sinapi_import_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  region text not null check (region ~ '^[A-Z]{2}$'),
  base_date date not null,
  tax_relief boolean not null default false,
  status text not null default 'RUNNING'
    check (status in ('RUNNING','COMPLETED','FAILED','SUPERSEDED')),
  source_url text not null,
  source_sha256 text not null check (length(source_sha256) = 64),
  imported_inputs integer not null default 0 check (imported_inputs >= 0),
  imported_compositions integer not null default 0 check (imported_compositions >= 0),
  rejected_records integer not null default 0 check (rejected_records >= 0),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, region, base_date, tax_relief, source_sha256),
  check (date_trunc('month', base_date)::date = base_date),
  check (source_url ~ '^https://([A-Za-z0-9-]+\.)*caixa\.gov\.br/')
);

alter table public.sinapi_import_batches enable row level security;

drop policy if exists sinapi_import_batches_read on public.sinapi_import_batches;
create policy sinapi_import_batches_read
on public.sinapi_import_batches
for select
to authenticated
using (public.is_internal_member(organization_id));

revoke all on table public.sinapi_import_batches from public;
revoke all on table public.sinapi_import_batches from anon;
revoke all on table public.sinapi_import_batches from authenticated;
grant select on table public.sinapi_import_batches to authenticated;
grant all on table public.sinapi_import_batches to service_role;

alter table public.cost_catalog_items
  add column if not exists source_key text,
  add column if not exists source_record_id text,
  add column if not exists tax_relief boolean,
  add column if not exists source_url text,
  add column if not exists source_sha256 text,
  add column if not exists raw_payload jsonb not null default '{}'::jsonb,
  add column if not exists import_batch_id uuid references public.sinapi_import_batches(id) on delete set null;

alter table public.cost_compositions
  add column if not exists source_key text,
  add column if not exists source_record_id text;

alter table public.cost_composition_versions
  add column if not exists tax_relief boolean,
  add column if not exists unit_cost numeric(18,4) not null default 0 check (unit_cost >= 0),
  add column if not exists source_url text,
  add column if not exists source_sha256 text,
  add column if not exists raw_payload jsonb not null default '{}'::jsonb,
  add column if not exists import_batch_id uuid references public.sinapi_import_batches(id) on delete set null;

alter table public.cost_composition_items
  add column if not exists item_type text not null default 'INPUT',
  add column if not exists source_code text,
  add column if not exists total_cost numeric(18,4) not null default 0 check (total_cost >= 0);

create index if not exists cost_catalog_items_sinapi_search_idx
  on public.cost_catalog_items(organization_id, source_key, region, base_date, tax_relief, source_record_id);
create index if not exists cost_catalog_items_description_fts_idx
  on public.cost_catalog_items using gin (to_tsvector('portuguese', description));
create index if not exists cost_compositions_sinapi_search_idx
  on public.cost_compositions(organization_id, source_key, source_record_id);
create unique index if not exists cost_composition_versions_sinapi_snapshot_uidx
  on public.cost_composition_versions(composition_id, base_date, region, tax_relief)
  where import_batch_id is not null;
create index if not exists sinapi_import_batches_latest_idx
  on public.sinapi_import_batches(organization_id, region, tax_relief, base_date desc)
  where status = 'COMPLETED';

create or replace function public.guard_official_cost_reference()
returns trigger
language plpgsql
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_source_key text;
  v_parent_id uuid;
begin
  if current_user in ('postgres', 'service_role') then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  if tg_table_name = 'cost_catalog_items' then
    v_source_key := case when tg_op = 'DELETE' then old.source_key else new.source_key end;
  elsif tg_table_name = 'cost_compositions' then
    v_source_key := case when tg_op = 'DELETE' then old.source_key else new.source_key end;
  elsif tg_table_name = 'cost_composition_versions' then
    v_parent_id := case when tg_op = 'DELETE' then old.composition_id else new.composition_id end;
    select source_key into v_source_key
    from public.cost_compositions
    where id = v_parent_id;
  elsif tg_table_name = 'cost_composition_items' then
    v_parent_id := case when tg_op = 'DELETE' then old.composition_version_id else new.composition_version_id end;
    select composition.source_key into v_source_key
    from public.cost_composition_versions version
    join public.cost_compositions composition on composition.id = version.composition_id
    where version.id = v_parent_id;
  end if;

  if v_source_key = 'SINAPI_CAIXA' then
    raise exception 'Referência oficial SINAPI é imutável fora do importador autorizado.';
  end if;

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$function$;

revoke all on function public.guard_official_cost_reference() from public;
revoke all on function public.guard_official_cost_reference() from anon;
revoke all on function public.guard_official_cost_reference() from authenticated;

drop trigger if exists trg_guard_sinapi_catalog on public.cost_catalog_items;
create trigger trg_guard_sinapi_catalog
before insert or update or delete on public.cost_catalog_items
for each row execute function public.guard_official_cost_reference();

drop trigger if exists trg_guard_sinapi_compositions on public.cost_compositions;
create trigger trg_guard_sinapi_compositions
before insert or update or delete on public.cost_compositions
for each row execute function public.guard_official_cost_reference();

drop trigger if exists trg_guard_sinapi_composition_versions on public.cost_composition_versions;
create trigger trg_guard_sinapi_composition_versions
before insert or update or delete on public.cost_composition_versions
for each row execute function public.guard_official_cost_reference();

drop trigger if exists trg_guard_sinapi_composition_items on public.cost_composition_items;
create trigger trg_guard_sinapi_composition_items
before insert or update or delete on public.cost_composition_items
for each row execute function public.guard_official_cost_reference();

create or replace function public.start_sinapi_import(
  p_organization_id uuid,
  p_region text,
  p_base_date date,
  p_tax_relief boolean,
  p_source_url text,
  p_source_sha256 text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_id uuid;
  v_region text := upper(trim(p_region));
begin
  if coalesce(auth.role(), current_user) not in ('postgres', 'service_role') then
    raise exception 'Importação SINAPI exige service_role.';
  end if;
  if v_region !~ '^[A-Z]{2}$' then raise exception 'UF SINAPI inválida.'; end if;
  if date_trunc('month', p_base_date)::date <> p_base_date then
    raise exception 'Data-base SINAPI deve ser o primeiro dia do mês.';
  end if;
  if p_source_url !~ '^https://([A-Za-z0-9-]+\.)*caixa\.gov\.br/' then
    raise exception 'Fonte SINAPI precisa pertencer ao domínio oficial CAIXA.';
  end if;
  if length(coalesce(p_source_sha256, '')) <> 64 then
    raise exception 'SHA-256 do arquivo SINAPI é obrigatório.';
  end if;

  insert into public.sinapi_import_batches(
    organization_id, region, base_date, tax_relief, status,
    source_url, source_sha256, metadata
  ) values (
    p_organization_id, v_region, p_base_date, p_tax_relief, 'RUNNING',
    p_source_url, lower(p_source_sha256), coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (organization_id, region, base_date, tax_relief, source_sha256)
  do update set
    status = 'RUNNING',
    error_message = null,
    imported_inputs = 0,
    imported_compositions = 0,
    rejected_records = 0,
    metadata = excluded.metadata,
    started_at = now(),
    finished_at = null
  returning id into v_id;

  return v_id;
end;
$function$;

create or replace function public.import_sinapi_inputs_chunk(
  p_batch_id uuid,
  p_rows jsonb
)
returns integer
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_batch public.sinapi_import_batches;
  v_row jsonb;
  v_code text;
  v_internal_code text;
  v_description text;
  v_unit text;
  v_type text;
  v_cost numeric;
  v_count integer := 0;
begin
  if coalesce(auth.role(), current_user) not in ('postgres', 'service_role') then
    raise exception 'Importação SINAPI exige service_role.';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 1000 then
    raise exception 'Chunk de insumos deve ser array com até 1000 registros.';
  end if;

  select * into v_batch
  from public.sinapi_import_batches
  where id = p_batch_id and status = 'RUNNING'
  for update;
  if not found then raise exception 'Lote SINAPI em execução não encontrado.'; end if;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_code := trim(coalesce(v_row ->> 'code', ''));
    v_description := trim(coalesce(v_row ->> 'description', ''));
    v_unit := trim(coalesce(v_row ->> 'unit', ''));
    v_type := upper(trim(coalesce(v_row ->> 'itemType', 'OTHER')));
    v_cost := nullif(v_row ->> 'unitCost', '')::numeric;

    if v_code = '' or v_description = '' or v_unit = '' or v_cost is null or v_cost < 0 then
      update public.sinapi_import_batches
      set rejected_records = rejected_records + 1
      where id = v_batch.id;
      continue;
    end if;
    if v_type not in ('MATERIAL','LABOR','EQUIPMENT','SERVICE','OTHER') then
      v_type := 'OTHER';
    end if;

    v_internal_code := format(
      'SINAPI:%s:%s:%s:%s',
      v_batch.region,
      to_char(v_batch.base_date, 'YYYY-MM'),
      case when v_batch.tax_relief then 'CD' else 'SD' end,
      v_code
    );

    insert into public.cost_catalog_items(
      organization_id, code, description, item_type, unit, unit_cost,
      source, region, base_date, active, source_key, source_record_id,
      tax_relief, source_url, source_sha256, raw_payload, import_batch_id
    ) values (
      v_batch.organization_id, v_internal_code, v_description, v_type, v_unit, v_cost,
      'SINAPI CAIXA/IBGE', v_batch.region, v_batch.base_date, true,
      'SINAPI_CAIXA', v_code, v_batch.tax_relief,
      v_batch.source_url, v_batch.source_sha256, v_row, v_batch.id
    )
    on conflict (organization_id, code)
    do update set
      description = excluded.description,
      item_type = excluded.item_type,
      unit = excluded.unit,
      unit_cost = excluded.unit_cost,
      source = excluded.source,
      region = excluded.region,
      base_date = excluded.base_date,
      active = true,
      source_key = excluded.source_key,
      source_record_id = excluded.source_record_id,
      tax_relief = excluded.tax_relief,
      source_url = excluded.source_url,
      source_sha256 = excluded.source_sha256,
      raw_payload = excluded.raw_payload,
      import_batch_id = excluded.import_batch_id,
      updated_at = now();

    v_count := v_count + 1;
  end loop;

  update public.sinapi_import_batches
  set imported_inputs = imported_inputs + v_count
  where id = v_batch.id;
  return v_count;
end;
$function$;

create or replace function public.import_sinapi_compositions_chunk(
  p_batch_id uuid,
  p_rows jsonb
)
returns integer
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_batch public.sinapi_import_batches;
  v_row jsonb;
  v_item jsonb;
  v_code text;
  v_internal_code text;
  v_input_internal_code text;
  v_description text;
  v_unit text;
  v_cost numeric;
  v_composition_id uuid;
  v_version_id uuid;
  v_catalog_item_id uuid;
  v_version_number integer;
  v_count integer := 0;
begin
  if coalesce(auth.role(), current_user) not in ('postgres', 'service_role') then
    raise exception 'Importação SINAPI exige service_role.';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 250 then
    raise exception 'Chunk de composições deve ser array com até 250 registros.';
  end if;

  select * into v_batch
  from public.sinapi_import_batches
  where id = p_batch_id and status = 'RUNNING'
  for update;
  if not found then raise exception 'Lote SINAPI em execução não encontrado.'; end if;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_code := trim(coalesce(v_row ->> 'code', ''));
    v_description := trim(coalesce(v_row ->> 'description', ''));
    v_unit := trim(coalesce(v_row ->> 'unit', ''));
    v_cost := nullif(v_row ->> 'unitCost', '')::numeric;

    if v_code = '' or v_description = '' or v_unit = '' or v_cost is null or v_cost < 0 then
      update public.sinapi_import_batches
      set rejected_records = rejected_records + 1
      where id = v_batch.id;
      continue;
    end if;

    v_internal_code := format(
      'SINAPI:%s:%s:%s',
      v_batch.region,
      case when v_batch.tax_relief then 'CD' else 'SD' end,
      v_code
    );

    insert into public.cost_compositions(
      organization_id, code, name, unit, source_key, source_record_id
    ) values (
      v_batch.organization_id, v_internal_code, v_description, v_unit,
      'SINAPI_CAIXA', v_code
    )
    on conflict (organization_id, code)
    do update set
      name = excluded.name,
      unit = excluded.unit,
      source_key = excluded.source_key,
      source_record_id = excluded.source_record_id,
      updated_at = now()
    returning id into v_composition_id;

    select id into v_version_id
    from public.cost_composition_versions
    where composition_id = v_composition_id
      and base_date = v_batch.base_date
      and region = v_batch.region
      and tax_relief = v_batch.tax_relief
    limit 1;

    if v_version_id is null then
      select coalesce(max(version_number), 0) + 1
      into v_version_number
      from public.cost_composition_versions
      where composition_id = v_composition_id;

      insert into public.cost_composition_versions(
        organization_id, composition_id, version_number, base_date, region,
        status, frozen_at, tax_relief, unit_cost, source_url,
        source_sha256, raw_payload, import_batch_id
      ) values (
        v_batch.organization_id, v_composition_id, v_version_number,
        v_batch.base_date, v_batch.region, 'FROZEN', now(),
        v_batch.tax_relief, v_cost, v_batch.source_url,
        v_batch.source_sha256, v_row - 'items', v_batch.id
      ) returning id into v_version_id;
    else
      update public.cost_composition_versions
      set unit_cost = v_cost,
          source_url = v_batch.source_url,
          source_sha256 = v_batch.source_sha256,
          raw_payload = v_row - 'items',
          import_batch_id = v_batch.id,
          status = 'FROZEN',
          frozen_at = coalesce(frozen_at, now())
      where id = v_version_id;

      delete from public.cost_composition_items
      where composition_version_id = v_version_id;
    end if;

    if jsonb_typeof(v_row -> 'items') = 'array' then
      for v_item in select value from jsonb_array_elements(v_row -> 'items')
      loop
        v_catalog_item_id := null;
        if upper(coalesce(v_item ->> 'itemType', 'INPUT')) = 'INPUT' then
          v_input_internal_code := format(
            'SINAPI:%s:%s:%s:%s',
            v_batch.region,
            to_char(v_batch.base_date, 'YYYY-MM'),
            case when v_batch.tax_relief then 'CD' else 'SD' end,
            trim(coalesce(v_item ->> 'code', ''))
          );
          select id into v_catalog_item_id
          from public.cost_catalog_items
          where organization_id = v_batch.organization_id
            and code = v_input_internal_code;
        end if;

        insert into public.cost_composition_items(
          organization_id, composition_version_id, catalog_item_id,
          description, unit, coefficient, unit_cost,
          item_type, source_code, total_cost
        ) values (
          v_batch.organization_id, v_version_id, v_catalog_item_id,
          trim(coalesce(v_item ->> 'description', 'Item SINAPI')),
          trim(coalesce(v_item ->> 'unit', 'UN')),
          greatest(coalesce(nullif(v_item ->> 'coefficient', '')::numeric, 0), 0),
          greatest(coalesce(nullif(v_item ->> 'unitCost', '')::numeric, 0), 0),
          upper(coalesce(v_item ->> 'itemType', 'INPUT')),
          nullif(trim(coalesce(v_item ->> 'code', '')), ''),
          greatest(coalesce(nullif(v_item ->> 'totalCost', '')::numeric, 0), 0)
        );
      end loop;
    end if;

    update public.cost_compositions composition
    set current_version_id = v_version_id,
        updated_at = now()
    where composition.id = v_composition_id
      and (
        composition.current_version_id is null
        or not exists (
          select 1
          from public.cost_composition_versions current_version
          where current_version.id = composition.current_version_id
            and current_version.base_date > v_batch.base_date
        )
      );

    v_count := v_count + 1;
  end loop;

  update public.sinapi_import_batches
  set imported_compositions = imported_compositions + v_count
  where id = v_batch.id;
  return v_count;
end;
$function$;

create or replace function public.finish_sinapi_import(
  p_batch_id uuid,
  p_error_message text default null
)
returns public.sinapi_import_batches
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_batch public.sinapi_import_batches;
begin
  if coalesce(auth.role(), current_user) not in ('postgres', 'service_role') then
    raise exception 'Importação SINAPI exige service_role.';
  end if;

  select * into v_batch
  from public.sinapi_import_batches
  where id = p_batch_id
  for update;
  if not found then raise exception 'Lote SINAPI não encontrado.'; end if;

  update public.sinapi_import_batches
  set status = case when nullif(trim(coalesce(p_error_message, '')), '') is null
                    then 'COMPLETED' else 'FAILED' end,
      error_message = nullif(left(trim(coalesce(p_error_message, '')), 1000), ''),
      finished_at = now()
  where id = p_batch_id
  returning * into v_batch;

  if v_batch.status = 'COMPLETED' then
    update public.sinapi_import_batches
    set status = 'SUPERSEDED'
    where organization_id = v_batch.organization_id
      and region = v_batch.region
      and tax_relief = v_batch.tax_relief
      and status = 'COMPLETED'
      and id <> v_batch.id
      and base_date = v_batch.base_date;
  end if;

  return v_batch;
end;
$function$;

create or replace function public.search_sinapi_references(
  p_organization_id uuid,
  p_query text default null,
  p_kind text default 'ALL',
  p_region text default 'SP',
  p_base_date date default null,
  p_tax_relief boolean default false,
  p_limit integer default 50
)
returns table(
  kind text,
  reference_id uuid,
  code text,
  description text,
  unit text,
  unit_cost numeric,
  region text,
  base_date date,
  tax_relief boolean,
  source_url text,
  component_count bigint
)
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_base_date date;
  v_kind text := upper(trim(coalesce(p_kind, 'ALL')));
  v_query text := trim(coalesce(p_query, ''));
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
  if not public.is_internal_member(p_organization_id) then
    raise exception 'Acesso negado ao catálogo SINAPI.';
  end if;
  if v_kind not in ('ALL','INPUT','COMPOSITION') then
    raise exception 'Tipo de referência SINAPI inválido.';
  end if;

  v_base_date := p_base_date;
  if v_base_date is null then
    select max(batch.base_date) into v_base_date
    from public.sinapi_import_batches batch
    where batch.organization_id = p_organization_id
      and batch.region = upper(p_region)
      and batch.tax_relief = p_tax_relief
      and batch.status = 'COMPLETED';
  end if;
  if v_base_date is null then return; end if;

  return query
  select result.kind, result.reference_id, result.code, result.description,
         result.unit, result.unit_cost, result.region, result.base_date,
         result.tax_relief, result.source_url, result.component_count
  from (
    select
      'INPUT'::text as kind,
      item.id as reference_id,
      item.source_record_id as code,
      item.description,
      item.unit,
      item.unit_cost,
      item.region,
      item.base_date,
      item.tax_relief,
      item.source_url,
      0::bigint as component_count,
      case when lower(item.source_record_id) = lower(v_query) then 0
           when item.source_record_id ilike v_query || '%' then 1 else 2 end as rank
    from public.cost_catalog_items item
    where v_kind in ('ALL','INPUT')
      and item.organization_id = p_organization_id
      and item.source_key = 'SINAPI_CAIXA'
      and item.region = upper(p_region)
      and item.base_date = v_base_date
      and item.tax_relief = p_tax_relief
      and item.active
      and (
        v_query = ''
        or item.source_record_id ilike '%' || v_query || '%'
        or item.description ilike '%' || v_query || '%'
      )

    union all

    select
      'COMPOSITION'::text as kind,
      version.id as reference_id,
      composition.source_record_id as code,
      composition.name as description,
      composition.unit,
      version.unit_cost,
      version.region,
      version.base_date,
      version.tax_relief,
      version.source_url,
      (select count(*) from public.cost_composition_items component
       where component.composition_version_id = version.id) as component_count,
      case when lower(composition.source_record_id) = lower(v_query) then 0
           when composition.source_record_id ilike v_query || '%' then 1 else 2 end as rank
    from public.cost_compositions composition
    join public.cost_composition_versions version
      on version.composition_id = composition.id
    where v_kind in ('ALL','COMPOSITION')
      and composition.organization_id = p_organization_id
      and composition.source_key = 'SINAPI_CAIXA'
      and version.region = upper(p_region)
      and version.base_date = v_base_date
      and version.tax_relief = p_tax_relief
      and (
        v_query = ''
        or composition.source_record_id ilike '%' || v_query || '%'
        or composition.name ilike '%' || v_query || '%'
      )
  ) result
  order by result.rank, result.code
  limit v_limit;
end;
$function$;

create or replace function public.add_sinapi_reference_to_budget(
  p_budget_version_id uuid,
  p_kind text,
  p_reference_id uuid,
  p_quantity numeric,
  p_section_id uuid default null
)
returns public.budget_items
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_version public.budget_versions;
  v_kind text := upper(trim(p_kind));
  v_sequence integer;
  v_item public.cost_catalog_items;
  v_composition public.cost_compositions;
  v_composition_version public.cost_composition_versions;
  v_budget_item public.budget_items;
  v_category text;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantidade SINAPI deve ser maior que zero.';
  end if;

  select * into v_version
  from public.budget_versions
  where id = p_budget_version_id
  for update;
  if not found then raise exception 'Versão de orçamento não encontrada.'; end if;
  if v_version.frozen_at is not null then raise exception 'Versão congelada é imutável.'; end if;

  if not exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = v_version.organization_id
      and membership.user_id = auth.uid()
      and membership.active
      and membership.role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR','ORCAMENTISTA','FINANCEIRO')
  ) then
    raise exception 'Perfil sem permissão para compor orçamento.';
  end if;

  if p_section_id is not null and not exists (
    select 1 from public.budget_sections section
    where section.id = p_section_id
      and section.budget_version_id = v_version.id
      and section.organization_id = v_version.organization_id
  ) then
    raise exception 'Seção não pertence à versão do orçamento.';
  end if;

  select coalesce(max(sequence), 0) + 1 into v_sequence
  from public.budget_items
  where budget_version_id = v_version.id;

  if v_kind = 'INPUT' then
    select * into v_item
    from public.cost_catalog_items
    where id = p_reference_id
      and organization_id = v_version.organization_id
      and source_key = 'SINAPI_CAIXA';
    if not found then raise exception 'Insumo SINAPI não encontrado.'; end if;

    v_category := case upper(v_item.item_type)
      when 'LABOR' then 'LABOR'
      when 'EQUIPMENT' then 'EQUIPMENT'
      when 'SERVICE' then 'SERVICE'
      else 'MATERIAL'
    end;

    insert into public.budget_items(
      organization_id, budget_version_id, section_id, catalog_item_id,
      cost_type, item_category, code, description, unit, quantity,
      unit_cost, loss_rate, freight_rate, source, region, base_date,
      sequence, created_by
    ) values (
      v_version.organization_id, v_version.id, p_section_id, v_item.id,
      'DIRECT', v_category, v_item.source_record_id, v_item.description,
      v_item.unit, p_quantity, v_item.unit_cost, v_item.loss_rate,
      v_item.freight_rate,
      format('SINAPI CAIXA/IBGE · %s · %s · %s',
        v_item.region, to_char(v_item.base_date, 'MM/YYYY'),
        case when v_item.tax_relief then 'com desoneração' else 'sem desoneração' end),
      v_item.region, v_item.base_date, v_sequence, auth.uid()
    ) returning * into v_budget_item;

  elsif v_kind = 'COMPOSITION' then
    select * into v_composition_version
    from public.cost_composition_versions
    where id = p_reference_id
      and organization_id = v_version.organization_id;
    if not found then raise exception 'Versão de composição SINAPI não encontrada.'; end if;

    select * into v_composition
    from public.cost_compositions
    where id = v_composition_version.composition_id
      and organization_id = v_version.organization_id
      and source_key = 'SINAPI_CAIXA';
    if not found then raise exception 'Composição SINAPI não encontrada.'; end if;

    insert into public.budget_items(
      organization_id, budget_version_id, section_id, composition_version_id,
      cost_type, item_category, code, description, unit, quantity,
      unit_cost, loss_rate, freight_rate, source, region, base_date,
      sequence, created_by
    ) values (
      v_version.organization_id, v_version.id, p_section_id,
      v_composition_version.id, 'DIRECT', 'SERVICE',
      v_composition.source_record_id, v_composition.name,
      v_composition.unit, p_quantity, v_composition_version.unit_cost,
      0, 0,
      format('SINAPI CAIXA/IBGE · %s · %s · %s',
        v_composition_version.region,
        to_char(v_composition_version.base_date, 'MM/YYYY'),
        case when v_composition_version.tax_relief then 'com desoneração' else 'sem desoneração' end),
      v_composition_version.region, v_composition_version.base_date,
      v_sequence, auth.uid()
    ) returning * into v_budget_item;
  else
    raise exception 'Tipo SINAPI inválido.';
  end if;

  perform public.calculate_budget_version(v_version.id);
  perform public.write_audit(
    v_version.organization_id,
    'BUDGET_ITEM',
    v_budget_item.id,
    'ADD_SINAPI_REFERENCE',
    jsonb_build_object(
      'kind', v_kind,
      'referenceId', p_reference_id,
      'quantity', p_quantity,
      'code', v_budget_item.code,
      'baseDate', v_budget_item.base_date
    ),
    null
  );

  return v_budget_item;
end;
$function$;

revoke all on function public.start_sinapi_import(uuid,text,date,boolean,text,text,jsonb) from public;
revoke all on function public.start_sinapi_import(uuid,text,date,boolean,text,text,jsonb) from anon;
revoke all on function public.start_sinapi_import(uuid,text,date,boolean,text,text,jsonb) from authenticated;
grant execute on function public.start_sinapi_import(uuid,text,date,boolean,text,text,jsonb) to service_role;

revoke all on function public.import_sinapi_inputs_chunk(uuid,jsonb) from public;
revoke all on function public.import_sinapi_inputs_chunk(uuid,jsonb) from anon;
revoke all on function public.import_sinapi_inputs_chunk(uuid,jsonb) from authenticated;
grant execute on function public.import_sinapi_inputs_chunk(uuid,jsonb) to service_role;

revoke all on function public.import_sinapi_compositions_chunk(uuid,jsonb) from public;
revoke all on function public.import_sinapi_compositions_chunk(uuid,jsonb) from anon;
revoke all on function public.import_sinapi_compositions_chunk(uuid,jsonb) from authenticated;
grant execute on function public.import_sinapi_compositions_chunk(uuid,jsonb) to service_role;

revoke all on function public.finish_sinapi_import(uuid,text) from public;
revoke all on function public.finish_sinapi_import(uuid,text) from anon;
revoke all on function public.finish_sinapi_import(uuid,text) from authenticated;
grant execute on function public.finish_sinapi_import(uuid,text) to service_role;

revoke all on function public.search_sinapi_references(uuid,text,text,text,date,boolean,integer) from public;
revoke all on function public.search_sinapi_references(uuid,text,text,text,date,boolean,integer) from anon;
grant execute on function public.search_sinapi_references(uuid,text,text,text,date,boolean,integer) to authenticated;
grant execute on function public.search_sinapi_references(uuid,text,text,text,date,boolean,integer) to service_role;

revoke all on function public.add_sinapi_reference_to_budget(uuid,text,uuid,numeric,uuid) from public;
revoke all on function public.add_sinapi_reference_to_budget(uuid,text,uuid,numeric,uuid) from anon;
grant execute on function public.add_sinapi_reference_to_budget(uuid,text,uuid,numeric,uuid) to authenticated;
grant execute on function public.add_sinapi_reference_to_budget(uuid,text,uuid,numeric,uuid) to service_role;
