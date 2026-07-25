-- Object Runtime — publicação de definição.
-- Sprint S-05, tarefa T-05.2.3. Contrato em diretrizes/OBJECT-RUNTIME.md.
--
-- A projeção de slots é DERIVADA do spec pelo próprio banco, nunca recebida
-- pronta do cliente. É o que torna impossível a projeção divergir da
-- definição: não existe caminho em que os dois sejam informados separadamente.

-- Funções puras --------------------------------------------------------------

create or replace function public.object_runtime_slot_family(p_type text)
returns text
language sql
immutable
set search_path = pg_catalog, pg_temp
as $$
  select case p_type
    when 'texto' then 'txt'
    when 'selecao' then 'txt'
    when 'numero' then 'num'
    when 'moeda' then 'num'
    when 'percentual' then 'num'
    when 'data' then 'dt'
    when 'data_hora' then 'dt'
    when 'booleano' then 'bool'
    when 'referencia' then 'ref'
    when 'usuario' then 'ref'
    else null
  end;
$$;

-- Orçamento de colunas-slot por família. Espelha SLOT_BUDGET em
-- lib/object-runtime/spec.ts; `validate:object-runtime` reprova divergência.
create or replace function public.object_runtime_slot_budget(p_family text)
returns integer
language sql
immutable
set search_path = pg_catalog, pg_temp
as $$
  select case p_family
    when 'num' then 4
    when 'txt' then 4
    when 'dt' then 2
    when 'bool' then 2
    when 'ref' then 2
    else 0
  end;
$$;

-- Checksum da versão publicada. Calculado sobre a forma canônica do jsonb,
-- que o PostgreSQL normaliza sozinho. `sha256` é embutido desde a versão 11:
-- sem extensão, sem dependência a mais.
create or replace function public.object_runtime_spec_checksum(p_spec jsonb)
returns text
language sql
immutable
set search_path = pg_catalog, pg_temp
as $$
  select encode(sha256(convert_to(p_spec::text, 'UTF8')), 'hex');
$$;

-- Alocação determinística de slots, na ordem de declaração dos campos.
-- Falha fechado no estouro, nomeando o campo exato que não coube.
create or replace function public.object_runtime_allocate_slots(p_spec jsonb)
returns table(field_key text, slot_column text)
language plpgsql
immutable
set search_path = pg_catalog, pg_temp
as $$
declare
  v_field jsonb;
  v_family text;
  v_used integer;
  v_num integer := 0;
  v_txt integer := 0;
  v_dt integer := 0;
  v_bool integer := 0;
  v_ref integer := 0;
begin
  for v_field in
    select value from jsonb_array_elements(coalesce(p_spec -> 'fields', '[]'::jsonb))
  loop
    continue when not coalesce((v_field ->> 'indexed')::boolean, false);

    v_family := public.object_runtime_slot_family(v_field ->> 'type');
    continue when v_family is null;

    case v_family
      when 'num' then v_num := v_num + 1; v_used := v_num;
      when 'txt' then v_txt := v_txt + 1; v_used := v_txt;
      when 'dt' then v_dt := v_dt + 1; v_used := v_dt;
      when 'bool' then v_bool := v_bool + 1; v_used := v_bool;
      when 'ref' then v_ref := v_ref + 1; v_used := v_ref;
    end case;

    if v_used > public.object_runtime_slot_budget(v_family) then
      raise exception
        'O campo "%" não coube no orçamento de campos filtráveis da família "%" (limite %). Reduza os campos filtráveis ou promova o objeto à camada dedicada.',
        v_field ->> 'key', v_family, public.object_runtime_slot_budget(v_family);
    end if;

    field_key := v_field ->> 'key';
    slot_column := v_family || '_' || v_used;
    return next;
  end loop;
end;
$$;

-- Publicação -----------------------------------------------------------------

create or replace function public.publish_object_definition(
  p_definition_id uuid,
  p_spec jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_definition public.object_definitions;
  v_checksum text;
  v_current public.object_definition_versions;
  v_version integer;
  v_field_count integer;
  v_distinct_keys integer;
  v_unknown text;
begin
  select * into v_definition from public.object_definitions where id = p_definition_id;
  if not found then
    raise exception 'Definição de objeto não encontrada.';
  end if;

  -- Criar e publicar objeto é ato de administração da empresa.
  if not public.has_module_permission(v_definition.organization_id, 'administracao', 'EDIT', null, 'configure') then
    raise exception 'Permissão insuficiente para publicar definição de objeto.';
  end if;

  if p_spec is null or jsonb_typeof(p_spec) <> 'object' then
    raise exception 'A especificação da definição precisa ser um objeto JSON.';
  end if;

  v_field_count := coalesce(jsonb_array_length(p_spec -> 'fields'), 0);
  if v_field_count = 0 then
    raise exception 'O objeto precisa de ao menos um campo.';
  end if;
  if v_field_count > 200 then
    raise exception 'O objeto declara % campos e o teto é 200.', v_field_count;
  end if;

  select count(distinct value ->> 'key') into v_distinct_keys
  from jsonb_array_elements(p_spec -> 'fields');
  if v_distinct_keys <> v_field_count then
    raise exception 'Há chaves de campo duplicadas na definição.';
  end if;

  select string_agg(distinct value ->> 'type', ', ') into v_unknown
  from jsonb_array_elements(p_spec -> 'fields')
  where public.object_runtime_slot_family(value ->> 'type') is null
    and value ->> 'type' not in (
      'texto_longo', 'selecao_multipla', 'anexo', 'geolocalizacao', 'assinatura'
    );
  if v_unknown is not null then
    raise exception 'Tipo de campo desconhecido: %.', v_unknown;
  end if;

  v_checksum := public.object_runtime_spec_checksum(p_spec);

  -- Republicar a mesma especificação não cria versão nova. Sem isto, um clique
  -- duplo no estúdio gera duas versões idênticas e polui o histórico.
  select * into v_current
  from public.object_definition_versions
  where definition_id = p_definition_id
  order by version desc
  limit 1;

  if found and v_current.checksum = v_checksum then
    update public.object_definitions
       set status = 'publicado', current_version = v_current.version, updated_at = now()
     where id = p_definition_id;
    return jsonb_build_object(
      'version', v_current.version, 'checksum', v_checksum, 'created', false
    );
  end if;

  v_version := coalesce(v_current.version, 0) + 1;

  insert into public.object_definition_versions(
    definition_id, organization_id, version, spec, checksum, published_by
  ) values (
    p_definition_id, v_definition.organization_id, v_version, p_spec, v_checksum, auth.uid()
  );

  insert into public.object_field_slots(
    definition_id, organization_id, version, field_key, slot_column
  )
  select p_definition_id, v_definition.organization_id, v_version, allocation.field_key, allocation.slot_column
  from public.object_runtime_allocate_slots(p_spec) as allocation;

  update public.object_definitions
     set status = 'publicado', current_version = v_version, updated_at = now()
   where id = p_definition_id;

  return jsonb_build_object('version', v_version, 'checksum', v_checksum, 'created', true);
end;
$$;

-- Privilégio mínimo ----------------------------------------------------------

revoke all on function public.object_runtime_slot_family(text) from public, anon, authenticated;
revoke all on function public.object_runtime_slot_budget(text) from public, anon, authenticated;
revoke all on function public.object_runtime_spec_checksum(jsonb) from public, anon, authenticated;
revoke all on function public.object_runtime_allocate_slots(jsonb) from public, anon, authenticated;
revoke all on function public.publish_object_definition(uuid, jsonb) from public, anon;

grant execute on function public.publish_object_definition(uuid, jsonb) to authenticated;

-- Autoverificação ------------------------------------------------------------
-- As quatro funções acima são puras, então podem ser exercitadas aqui mesmo,
-- sem tocar em nenhuma tabela. Migration que aplica sem provar nada é
-- migration que só será testada em produção.

do $$
declare
  v_spec jsonb;
  v_slots text;
  v_first text;
  v_second text;
  v_raised boolean := false;
begin
  -- Alocação na ordem de declaração, ignorando campo não indexável e tipo não filtrável.
  v_spec := jsonb_build_object('fields', jsonb_build_array(
    jsonb_build_object('key', 'observacao', 'type', 'texto_longo', 'indexed', true),
    jsonb_build_object('key', 'titulo', 'type', 'texto', 'indexed', true),
    jsonb_build_object('key', 'valor', 'type', 'moeda', 'indexed', true),
    jsonb_build_object('key', 'descricao', 'type', 'texto'),
    jsonb_build_object('key', 'codigo', 'type', 'selecao', 'indexed', true)
  ));
  select string_agg(field_key || '=' || slot_column, ',' order by slot_column)
    into v_slots
  from public.object_runtime_allocate_slots(v_spec);
  if v_slots is distinct from 'valor=num_1,codigo=txt_2,titulo=txt_1' then
    -- ordenação por slot_column: num_1, txt_1, txt_2
    if v_slots is distinct from 'valor=num_1,titulo=txt_1,codigo=txt_2' then
      raise exception 'Alocação de slots inesperada: %', coalesce(v_slots, '(vazio)');
    end if;
  end if;

  -- Estouro de orçamento falha fechado, nomeando o campo.
  begin
    perform public.object_runtime_allocate_slots(jsonb_build_object('fields', jsonb_build_array(
      jsonb_build_object('key', 'a', 'type', 'data', 'indexed', true),
      jsonb_build_object('key', 'b', 'type', 'data_hora', 'indexed', true),
      jsonb_build_object('key', 'c', 'type', 'data', 'indexed', true)
    )));
  exception when others then
    v_raised := true;
    if position('"c"' in sqlerrm) = 0 then
      raise exception 'O estouro de slot não nomeou o campo que não coube: %', sqlerrm;
    end if;
  end;
  if not v_raised then
    raise exception 'O estouro do orçamento de slots não falhou fechado.';
  end if;

  -- Checksum determinístico e independente da ordem de escrita das chaves.
  v_first := public.object_runtime_spec_checksum('{"a":1,"b":2}'::jsonb);
  v_second := public.object_runtime_spec_checksum('{"b":2,"a":1}'::jsonb);
  if v_first is distinct from v_second then
    raise exception 'Checksum do spec depende da ordem das chaves.';
  end if;
  if v_first !~ '^[0-9a-f]{64}$' then
    raise exception 'Checksum do spec não é sha256 hexadecimal: %', v_first;
  end if;
  if public.object_runtime_spec_checksum('{"a":1}'::jsonb) = v_first then
    raise exception 'Checksum não muda quando o spec muda.';
  end if;

  -- Orçamento coerente com o que a camada compartilhada oferece.
  if public.object_runtime_slot_budget('num') <> 4
     or public.object_runtime_slot_budget('txt') <> 4
     or public.object_runtime_slot_budget('dt') <> 2
     or public.object_runtime_slot_budget('bool') <> 2
     or public.object_runtime_slot_budget('ref') <> 2
     or public.object_runtime_slot_budget('inexistente') <> 0 then
    raise exception 'Orçamento de slots divergente do contrato.';
  end if;

  -- A RPC de publicação existe, é security definer e tem search_path fixo.
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'publish_object_definition'
      and p.prosecdef
      and array_to_string(coalesce(p.proconfig, array[]::text[]), ',') like '%search_path%'
  ) then
    raise exception 'publish_object_definition não é security definer com search_path fixo.';
  end if;
end;
$$;
