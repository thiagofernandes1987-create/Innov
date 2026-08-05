-- T-37.9 — ausência de custo deixa de ser gravada como zero.
--
-- O leitor do SINAPI já não inventa preço: item sem custo na UF chega com
-- `null`. O banco desfazia isso na porta de entrada —
--
--   greatest(coalesce(nullif(v_item ->> 'unitCost','')::numeric, 0), 0)
--
-- — e `unit_cost numeric not null` não deixava alternativa. Ausência virava
-- zero, e zero é um número plausível: soma, arredonda, aparece na tela e fecha
-- a composição mais barata sem nada denunciar.
--
-- Medido no arquivo oficial de 06/2026, em SP sem desoneração:
--
--   43.923 itens analíticos
--    4.677 (10,6%) apontam para insumo sem preço no estado
--    1.996 dos 4.876 insumos do relatório não têm preço em SP
--
-- Duas ausências diferentes, e a diferença importa para quem orça:
--
--   SEM_PRECO_NA_UF     está no relatório, não houve coleta mínima no estado
--   FORA_DO_RELATORIO   não aparece na aba — costuma ser insumo em estudo
--
-- Guardamos também a situação que a **planilha** declara. Ela não substitui a
-- de cima: a legenda da aba Analítico diz que COM PREÇO significa "coletado em
-- pelo menos uma UF". É estado nacional, não do estado lido — os 4.677 itens
-- acima são justamente COM PREÇO sem preço em SP.

begin;

alter table public.cost_composition_items
  add column if not exists price_status text not null default 'COM_CUSTO',
  add column if not exists sinapi_situation text;

alter table public.cost_composition_items
  drop constraint if exists cost_composition_items_price_status_check;
alter table public.cost_composition_items
  add constraint cost_composition_items_price_status_check
  check (price_status in ('COM_CUSTO', 'SEM_PRECO_NA_UF', 'FORA_DO_RELATORIO'));

-- O custo passa a poder faltar — e só pode faltar quando o status diz que
-- falta. Sem esta amarra, `null` viraria um segundo jeito de dizer zero, e a
-- tela teria de adivinhar de novo.
alter table public.cost_composition_items alter column unit_cost drop not null;
alter table public.cost_composition_items alter column total_cost drop not null;

alter table public.cost_composition_items
  drop constraint if exists cost_composition_items_custo_coerente_com_status;
alter table public.cost_composition_items
  add constraint cost_composition_items_custo_coerente_com_status
  check (
    (price_status = 'COM_CUSTO' and unit_cost is not null and total_cost is not null)
    or (price_status <> 'COM_CUSTO' and unit_cost is null and total_cost is null)
  );

-- Quantos itens da composição ficaram sem custo. É o que permite dizer
-- "incompleta" em vez de mostrar um preço que não fecha.
alter table public.cost_composition_versions
  add column if not exists items_without_cost integer not null default 0
  check (items_without_cost >= 0);

-- A importação passa a gravar a ausência em vez de fabricar zero.
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
  v_price_status text;
  v_unit_cost numeric;
  v_total_cost numeric;
  v_sem_custo integer;
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

    v_sem_custo := 0;
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

        -- **Ausência não é zero.** O `coalesce(...,0)` que estava aqui
        -- transformava "não houve coleta neste estado" em item de graça. O
        -- vocabulário é fechado; qualquer valor inesperado vira ausência, que é
        -- o lado seguro: aparece na tela e pede conferência.
        v_price_status := upper(coalesce(v_item ->> 'priceStatus', 'COM_CUSTO'));
        if v_price_status not in ('COM_CUSTO', 'SEM_PRECO_NA_UF', 'FORA_DO_RELATORIO') then
          v_price_status := 'FORA_DO_RELATORIO';
        end if;
        v_unit_cost := nullif(v_item ->> 'unitCost', '')::numeric;
        v_total_cost := nullif(v_item ->> 'totalCost', '')::numeric;
        if v_unit_cost is null or v_total_cost is null or v_unit_cost < 0 or v_total_cost < 0 then
          if v_price_status = 'COM_CUSTO' then v_price_status := 'FORA_DO_RELATORIO'; end if;
          v_unit_cost := null;
          v_total_cost := null;
        end if;
        if v_price_status <> 'COM_CUSTO' then
          v_unit_cost := null;
          v_total_cost := null;
          v_sem_custo := v_sem_custo + 1;
        end if;

        insert into public.cost_composition_items(
          organization_id, composition_version_id, catalog_item_id,
          description, unit, coefficient, unit_cost,
          item_type, source_code, total_cost,
          price_status, sinapi_situation
        ) values (
          v_batch.organization_id, v_version_id, v_catalog_item_id,
          trim(coalesce(v_item ->> 'description', 'Item SINAPI')),
          trim(coalesce(v_item ->> 'unit', 'UN')),
          greatest(coalesce(nullif(v_item ->> 'coefficient', '')::numeric, 0), 0),
          v_unit_cost,
          upper(coalesce(v_item ->> 'itemType', 'INPUT')),
          nullif(trim(coalesce(v_item ->> 'code', '')), ''),
          v_total_cost,
          v_price_status,
          nullif(trim(coalesce(v_item ->> 'sinapiSituation', '')), '')
        );
      end loop;
    end if;

    update public.cost_composition_versions
    set items_without_cost = v_sem_custo
    where id = v_version_id;

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

-- `create or replace` preserva privilégio, mas VACINA-004 pede explícito: quem
-- lê a migration tem de ver quem pode executar, sem ir procurar noutro arquivo.
revoke all on function public.import_sinapi_compositions_chunk(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.import_sinapi_compositions_chunk(uuid, jsonb) to service_role;

commit;
