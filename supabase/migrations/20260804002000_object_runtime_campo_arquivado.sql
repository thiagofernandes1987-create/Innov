-- Object Runtime — campo arquivado devolve a coluna-slot.
--
-- T-32.3.5: arquivar em vez de excluir. Excluir um campo tornaria ilegível o
-- que já foi registrado com ele — o registro guarda a versão com que nasceu, e
-- essa versão declara o campo. Arquivado sai do formulário, continua legível
-- no histórico, e **devolve o slot**: a versão publicada guarda a alocação
-- dela, então segurar a coluna para sempre gastaria o orçamento com um campo
-- que ninguém preenche mais.
--
-- A alocação é derivada do spec **pelo banco**, e é isso que impede a projeção
-- de divergir da definição. Se só o TypeScript soubesse de `archived`, o banco
-- continuaria alocando slot para campo arquivado e as duas contas divergiriam
-- na primeira publicação.

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
    continue when coalesce((v_field ->> 'archived')::boolean, false);
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

revoke all on function public.object_runtime_allocate_slots(jsonb) from public, anon, authenticated;

-- A publicação conta os campos que ainda são preenchidos. Um objeto em que
-- todos os campos foram arquivados é um formulário sem nada para preencher.
create or replace function public.object_runtime_active_field_count(p_spec jsonb)
returns integer
language sql
immutable
set search_path = pg_catalog, pg_temp
as $$
  select count(*)::integer
  from jsonb_array_elements(coalesce(p_spec -> 'fields', '[]'::jsonb)) as campo
  where not coalesce((campo.value ->> 'archived')::boolean, false);
$$;

revoke all on function public.object_runtime_active_field_count(jsonb) from public, anon, authenticated;

-- Guarda de versão publicável ------------------------------------------------
-- Trigger, e não uma quarta cópia de `publish_object_definition`: a regra vale
-- para qualquer caminho que crie uma versão, e não só para o que existe hoje.
-- Publicar um objeto em que todos os campos estão arquivados é publicar um
-- formulário sem nada para preencher.

create or replace function public.object_definition_versions_exige_campo_ativo()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.object_runtime_active_field_count(new.spec) = 0 then
    raise exception
      'A versão não tem nenhum campo ativo: todos os campos estão arquivados, e não sobra nada para preencher.';
  end if;
  return new;
end;
$$;

revoke all on function public.object_definition_versions_exige_campo_ativo() from public, anon, authenticated;

drop trigger if exists object_definition_versions_campo_ativo on public.object_definition_versions;
create trigger object_definition_versions_campo_ativo
  before insert on public.object_definition_versions
  for each row execute function public.object_definition_versions_exige_campo_ativo();

-- Verificação embutida -------------------------------------------------------
do $$
declare
  v_spec jsonb := jsonb_build_object('fields', jsonb_build_array(
    jsonb_build_object('key', 'antigo', 'type', 'data', 'indexed', true, 'archived', true),
    jsonb_build_object('key', 'atual', 'type', 'data', 'indexed', true)
  ));
  v_slots text;
begin
  select string_agg(field_key || '=' || slot_column, ',' order by slot_column)
    into v_slots
  from public.object_runtime_allocate_slots(v_spec);

  if v_slots is distinct from 'atual=dt_1' then
    raise exception 'Campo arquivado ainda consome slot: alocação veio "%".', coalesce(v_slots, '(vazia)');
  end if;

  if public.object_runtime_active_field_count(v_spec) <> 1 then
    raise exception 'A contagem de campos ativos não desconta os arquivados.';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'object_definition_versions_campo_ativo' and not tgisinternal
  ) then
    raise exception 'A guarda de campo ativo na publicação não foi criada.';
  end if;

  raise notice 'Object Runtime — arquivado: o slot é devolvido, a contagem desconta e a versão exige campo ativo.';
end;
$$;
