-- Object Runtime — a guarda de permissão citava uma ação que não existe.
--
-- As três RPCs do estúdio pediam:
--
--   has_module_permission(org, 'administracao', 'EDIT', null, 'configure')
--
-- e `has_module_permission` resolve a ação num `case` fechado —
-- `approve`, `release`, `sign`, `export`, `administer`, `sensitive` — com
-- `else false`. **`'configure'` cai no `else` e nega todo mundo, inclusive
-- SUPER_ADMIN**, sem erro de sintaxe, sem aviso e sem falha de teste.
--
-- Consequência medida no navegador, com sessão de administrador de verdade:
-- criar objeto respondia "Permissão insuficiente para criar definição de
-- objeto". `publish_object_definition`, escrita em 26 de julho, nunca foi
-- executável — o defeito veio dela e foi copiado para as duas RPCs do
-- rascunho.
--
-- `'configure'` é vocabulário da camada de aplicação: `lib/authorization.ts`
-- traduz a capacidade `configure` para `{level:"READ", action:"administer"}`.
-- Quem escreveu o SQL usou o nome da capacidade onde vai o nome da ação. É
-- irmã da VACINA-053 — lá a chave de módulo inexistente devolvia zero linhas;
-- aqui a ação inexistente devolve `false` literal.
--
-- Registrado na VACINA-058, com prevenção executável em
-- `scripts/validate-module-keys.mjs`.

-- Conferência antes de corrigir: a ação que vamos passar a usar precisa
-- existir no `case` de quem vai resolvê-la. É o que faltava fazer da primeira
-- vez, e é barato.
do $$
begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'has_module_permission'
      and pg_get_functiondef(p.oid) like '%''administer''%'
  ) then
    raise exception
      'has_module_permission não reconhece a ação "administer": corrigir para ela repetiria o defeito.';
  end if;
end;
$$;

create or replace function public.create_object_definition(
  p_organization_id uuid,
  p_key text,
  p_name text,
  p_class text,
  p_module_key text,
  p_scope text default 'organizacao'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if not public.has_module_permission(p_organization_id, 'administracao', 'EDIT', null, 'administer') then
    raise exception 'Permissão insuficiente para criar definição de objeto.';
  end if;

  if p_key !~ '^[a-z][a-z0-9_]{0,62}$' then
    raise exception 'Chave de objeto inválida: "%". Use minúsculas, dígitos e sublinhado, começando por letra.', p_key;
  end if;
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'O objeto precisa de um nome.';
  end if;
  if coalesce(btrim(p_module_key), '') = '' then
    raise exception 'O objeto precisa declarar o aplicativo do qual herda a permissão.';
  end if;

  if exists (
    select 1 from public.object_definitions
    where organization_id = p_organization_id and key = p_key
  ) then
    raise exception 'Já existe um objeto com a chave "%" nesta empresa.', p_key;
  end if;

  insert into public.object_definitions(
    organization_id, key, name, class, module_key, scope, status, draft_spec, created_by
  ) values (
    p_organization_id, p_key, btrim(p_name), p_class, btrim(p_module_key), p_scope, 'rascunho',
    jsonb_build_object(
      'key', p_key,
      'name', btrim(p_name),
      'class', p_class,
      'moduleKey', btrim(p_module_key),
      'scope', p_scope,
      'traits', '[]'::jsonb,
      'fields', '[]'::jsonb
    ),
    auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.save_object_definition_draft(
  p_definition_id uuid,
  p_draft_spec jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_definition public.object_definitions;
begin
  select * into v_definition from public.object_definitions where id = p_definition_id;
  if not found then
    raise exception 'Definição de objeto não encontrada.';
  end if;

  if not public.has_module_permission(v_definition.organization_id, 'administracao', 'EDIT', null, 'administer') then
    raise exception 'Permissão insuficiente para editar definição de objeto.';
  end if;

  if p_draft_spec is null or jsonb_typeof(p_draft_spec) <> 'object' then
    raise exception 'A especificação da definição precisa ser um objeto JSON.';
  end if;

  if v_definition.status = 'arquivado' then
    raise exception 'O objeto está arquivado e não aceita edição.';
  end if;

  if v_definition.current_version is not null
     and coalesce(p_draft_spec ->> 'key', v_definition.key) <> v_definition.key then
    raise exception 'A chave de um objeto já publicado não muda. Crie outro objeto.';
  end if;

  update public.object_definitions
     set draft_spec = p_draft_spec,
         name = coalesce(nullif(btrim(p_draft_spec ->> 'name'), ''), name),
         updated_at = now()
   where id = p_definition_id;

  return jsonb_build_object(
    'definitionId', p_definition_id,
    'fields', coalesce(jsonb_array_length(p_draft_spec -> 'fields'), 0)
  );
end;
$$;

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

  if not public.has_module_permission(v_definition.organization_id, 'administracao', 'EDIT', null, 'administer') then
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

revoke all on function public.create_object_definition(uuid, text, text, text, text, text) from public, anon;
revoke all on function public.save_object_definition_draft(uuid, jsonb) from public, anon;
revoke all on function public.publish_object_definition(uuid, jsonb) from public, anon;
grant execute on function public.create_object_definition(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.save_object_definition_draft(uuid, jsonb) to authenticated;
grant execute on function public.publish_object_definition(uuid, jsonb) to authenticated;

-- Verificação embutida -------------------------------------------------------
do $$
declare
  v_restante text;
begin
  select string_agg(p.proname, ', ')
    into v_restante
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('create_object_definition', 'save_object_definition_draft', 'publish_object_definition')
    and pg_get_functiondef(p.oid) like '%''configure''%';

  if v_restante is not null then
    raise exception 'Ainda há RPC do Object Runtime pedindo a ação inexistente "configure": %', v_restante;
  end if;

  select string_agg(p.proname, ', ')
    into v_restante
  from (values
    ('create_object_definition'), ('save_object_definition_draft'), ('publish_object_definition')
  ) as t(name)
  join pg_proc p on p.proname = t.name
  join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
  where pg_get_functiondef(p.oid) not like '%''administer''%';

  if v_restante is not null then
    raise exception 'RPC do Object Runtime sem a ação "administer": %', v_restante;
  end if;

  raise notice 'Object Runtime — permissão: as três RPCs pedem a ação "administer", que existe.';
end;
$$;
