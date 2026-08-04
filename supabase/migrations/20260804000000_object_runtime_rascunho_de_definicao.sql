-- Object Runtime — o rascunho da definição, que faltava para o estúdio existir.
--
-- A fundação aplicada guarda a definição, a versão imutável e a projeção de
-- slots, e tem `publish_object_definition` para congelar uma versão. O que ela
-- **não** tinha era caminho de escrita para a linha de definição: criar um
-- objeto era impossível pela aplicação, e `publish_object_definition` exige uma
-- definição que já exista. Metade da porta.
--
-- Duas peças, cada uma resolvendo um micro-problema:
--
--   1. `draft_spec` — onde o rascunho mora entre uma edição e a próxima. O
--      contrato (§8.1) diz "rascunho: editável livremente"; sem coluna, o
--      rascunho só existiria no navegador e um objeto de trinta campos se
--      perderia num recarregamento.
--   2. `create_object_definition` e `save_object_definition_draft` — as duas
--      únicas escritas, no padrão da VACINA-004 e da VACINA-005: a tabela
--      continua sem `grant insert/update` para `authenticated`.
--
-- A versão publicada segue imutável: o rascunho é o que muda, e publicar
-- congela uma cópia dele em `object_definition_versions`.

alter table public.object_definitions
  add column if not exists draft_spec jsonb not null default '{}'::jsonb;

comment on column public.object_definitions.draft_spec is
  'Especificação em edição. Fonte de verdade só até publicar; depois disso, quem vale é a versão congelada em object_definition_versions.';

-- Criar a definição ----------------------------------------------------------

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
  -- Mesma alçada de `publish_object_definition`: criar objeto é ato de
  -- administração da empresa, não de quem usa o módulo estendido.
  if not public.has_module_permission(p_organization_id, 'administracao', 'EDIT', null, 'configure') then
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

  -- Mensagem em vez de violação de unicidade: quem lê "duplicate key value
  -- violates unique constraint" não sabe o que fazer com a informação.
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

-- Guardar o rascunho ---------------------------------------------------------

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

  if not public.has_module_permission(v_definition.organization_id, 'administracao', 'EDIT', null, 'configure') then
    raise exception 'Permissão insuficiente para editar definição de objeto.';
  end if;

  if p_draft_spec is null or jsonb_typeof(p_draft_spec) <> 'object' then
    raise exception 'A especificação da definição precisa ser um objeto JSON.';
  end if;

  -- Objeto arquivado não volta a ser editado por engano: sai da navegação e
  -- para de aceitar mudança. Reativar é ato explícito, de outra fatia.
  if v_definition.status = 'arquivado' then
    raise exception 'O objeto está arquivado e não aceita edição.';
  end if;

  -- A chave identifica o objeto e é o que liga registro à definição. Trocar a
  -- chave de um objeto que já tem versão publicada renomearia, na prática, um
  -- objeto que já tem dado — sem migrar nada.
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

-- Privilégio mínimo ----------------------------------------------------------

revoke all on function public.create_object_definition(uuid, text, text, text, text, text) from public, anon;
revoke all on function public.save_object_definition_draft(uuid, jsonb) from public, anon;
grant execute on function public.create_object_definition(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.save_object_definition_draft(uuid, jsonb) to authenticated;

-- Verificação embutida -------------------------------------------------------
-- A VACINA-057 nasceu de uma migration escrita, revisada e nunca aplicada. A
-- autoverificação não impede isso — mas garante que, quando aplicada, o efeito
-- foi conferido no mesmo instante.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'object_definitions' and column_name = 'draft_spec'
  ) then
    raise exception 'A coluna draft_spec não foi criada.';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'object_definitions'
      and grantee in ('anon', 'authenticated')
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
  ) then
    raise exception 'Escrita direta em object_definitions concedida a anon/authenticated: a escrita é só por RPC.';
  end if;

  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'create_object_definition' and p.prosecdef
  ) then
    raise exception 'create_object_definition ausente ou sem security definer.';
  end if;

  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'save_object_definition_draft' and p.prosecdef
  ) then
    raise exception 'save_object_definition_draft ausente ou sem security definer.';
  end if;

  -- `search_path` fixo em função `security definer` é a VACINA-013.
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('create_object_definition', 'save_object_definition_draft')
      and coalesce(array_to_string(p.proconfig, ','), '') not like '%search_path%'
  ) then
    raise exception 'Função security definer do rascunho sem search_path fixo.';
  end if;

  raise notice 'Object Runtime — rascunho: coluna, RPCs e privilégios conferidos.';
end;
$$;
