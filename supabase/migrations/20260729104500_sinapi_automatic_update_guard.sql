-- VACINA-039: atualização automática precisa ser idempotente e impedir
-- duas importações concorrentes da mesma organização/UF/mês/regime/hash.

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
  v_existing public.sinapi_import_batches;
  v_region text := upper(trim(p_region));
  v_hash text := lower(trim(coalesce(p_source_sha256, '')));
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
  if v_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'SHA-256 do arquivo SINAPI é obrigatório.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    concat_ws('|', p_organization_id::text, v_region, p_base_date::text, p_tax_relief::text, v_hash),
    0
  ));

  select * into v_existing
  from public.sinapi_import_batches
  where organization_id = p_organization_id
    and region = v_region
    and base_date = p_base_date
    and tax_relief = p_tax_relief
    and source_sha256 = v_hash
  for update;

  if found then
    if v_existing.status = 'COMPLETED' then
      return v_existing.id;
    end if;
    if v_existing.status = 'RUNNING'
       and v_existing.started_at > now() - interval '30 minutes' then
      raise exception 'Já existe uma atualização SINAPI em andamento para esta base.';
    end if;

    update public.sinapi_import_batches
    set status = 'RUNNING',
        source_url = p_source_url,
        error_message = null,
        imported_inputs = 0,
        imported_compositions = 0,
        rejected_records = 0,
        metadata = coalesce(p_metadata, '{}'::jsonb),
        started_at = now(),
        finished_at = null
    where id = v_existing.id
    returning id into v_id;
    return v_id;
  end if;

  insert into public.sinapi_import_batches(
    organization_id, region, base_date, tax_relief, status,
    source_url, source_sha256, metadata
  ) values (
    p_organization_id, v_region, p_base_date, p_tax_relief, 'RUNNING',
    p_source_url, v_hash, coalesce(p_metadata, '{}'::jsonb)
  ) returning id into v_id;

  return v_id;
end;
$function$;

revoke all on function public.start_sinapi_import(uuid,text,date,boolean,text,text,jsonb) from public;
revoke all on function public.start_sinapi_import(uuid,text,date,boolean,text,text,jsonb) from anon;
revoke all on function public.start_sinapi_import(uuid,text,date,boolean,text,text,jsonb) from authenticated;
grant execute on function public.start_sinapi_import(uuid,text,date,boolean,text,text,jsonb) to service_role;
