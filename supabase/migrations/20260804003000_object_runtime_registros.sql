-- Object Runtime — a camada compartilhada de registros.
--
-- É o item 2 e 3 da primeira fatia (`diretrizes/OBJECT-RUNTIME.md` §12.3), e
-- foi descoberta como pré-requisito de T-32.3.3: "campo do tipo pessoa inscreve
-- como seguidor **quando preenchido**" não tem onde acontecer se não existe
-- registro para preencher.
--
-- Três decisões do contrato, aplicadas literalmente:
--
--   §4.2 — **particionada por `hash(organization_id)` em 64 partições.** Numa
--   tabela única, todos os inquilinos dividem o mesmo heap, os mesmos índices e
--   o mesmo autovacuum: um cliente pesado degrada todos. Particionada, o
--   planejador toca só a partição do inquilino.
--
--   §5.2 — **colunas-slot de tipo fixo, com índice parcial compartilhado.** Uma
--   dúzia de índices para todos os objetos da plataforma. Criar objeto não
--   emite DDL: publicar é `insert` em tabela de catálogo.
--
--   §6.2 — **uma política de RLS, escrita uma vez.** Objeto novo nasce
--   protegido porque não existe caminho de leitura fora dela. `module_key` é
--   denormalizado na linha justamente para a política não precisar de
--   subconsulta por linha.

create table if not exists public.object_records (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  object_id uuid not null,
  -- A versão com que o registro nasceu. É o que torna a leitura possível
  -- depois de a definição mudar: o registro é interpretado pela versão dele.
  definition_version integer not null,
  module_key text not null,
  project_id uuid,
  -- Extensão de registro de aplicativo padrão (§7). Sem chave estrangeira:
  -- não há FK que aponte para várias tabelas. A RPC valida o pai.
  parent_kind text,
  parent_id uuid,
  payload jsonb not null default '{}'::jsonb,
  num_1 numeric, num_2 numeric, num_3 numeric, num_4 numeric,
  txt_1 text, txt_2 text, txt_3 text, txt_4 text,
  dt_1 timestamptz, dt_2 timestamptz,
  bool_1 boolean, bool_2 boolean,
  ref_1 uuid, ref_2 uuid,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  primary key (organization_id, id)
) partition by hash (organization_id);

do $$
begin
  for i in 0..63 loop
    execute format(
      'create table if not exists public.object_records_p%s partition of public.object_records for values with (modulus 64, remainder %s)',
      i, i
    );
  end loop;
end;
$$;

-- Índices fixos e compartilhados. `organization_id` e `object_id` lideram: o
-- planejador enxerga cada objeto como uma fatia pequena e seletiva mesmo o
-- índice sendo de todos. O `is not null` elimina o inchaço — objeto que não usa
-- `num_3` não ocupa espaço no índice de `num_3`.
create index if not exists object_records_listagem_idx
  on public.object_records (organization_id, object_id, created_at desc, id)
  where deleted_at is null;
create index if not exists object_records_pai_idx
  on public.object_records (organization_id, parent_kind, parent_id)
  where parent_id is not null and deleted_at is null;
create index if not exists object_records_obra_idx
  on public.object_records (organization_id, project_id)
  where project_id is not null and deleted_at is null;

create index if not exists object_records_num_1_idx on public.object_records (organization_id, object_id, num_1) where num_1 is not null;
create index if not exists object_records_num_2_idx on public.object_records (organization_id, object_id, num_2) where num_2 is not null;
create index if not exists object_records_num_3_idx on public.object_records (organization_id, object_id, num_3) where num_3 is not null;
create index if not exists object_records_num_4_idx on public.object_records (organization_id, object_id, num_4) where num_4 is not null;
create index if not exists object_records_txt_1_idx on public.object_records (organization_id, object_id, txt_1) where txt_1 is not null;
create index if not exists object_records_txt_2_idx on public.object_records (organization_id, object_id, txt_2) where txt_2 is not null;
create index if not exists object_records_txt_3_idx on public.object_records (organization_id, object_id, txt_3) where txt_3 is not null;
create index if not exists object_records_txt_4_idx on public.object_records (organization_id, object_id, txt_4) where txt_4 is not null;
create index if not exists object_records_dt_1_idx on public.object_records (organization_id, object_id, dt_1) where dt_1 is not null;
create index if not exists object_records_dt_2_idx on public.object_records (organization_id, object_id, dt_2) where dt_2 is not null;
create index if not exists object_records_bool_1_idx on public.object_records (organization_id, object_id, bool_1) where bool_1 is not null;
create index if not exists object_records_bool_2_idx on public.object_records (organization_id, object_id, bool_2) where bool_2 is not null;
create index if not exists object_records_ref_1_idx on public.object_records (organization_id, object_id, ref_1) where ref_1 is not null;
create index if not exists object_records_ref_2_idx on public.object_records (organization_id, object_id, ref_2) where ref_2 is not null;

-- Seguidores do registro ------------------------------------------------------
-- T-32.3.3: campo do tipo pessoa **inscreve como seguidor** quando preenchido.
-- É o que faz "arquiteto do projeto" valer mais que um texto com o nome dele —
-- a pessoa apontada passa a acompanhar o registro em vez de precisar descobrir
-- que foi citada.

create table if not exists public.object_record_followers (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  record_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Qual campo colocou a pessoa aqui. Ninguém deveria descobrir que virou
  -- seguidor sem saber de onde isso veio — mesmo princípio de
  -- `pipeline_card_followers.adicionado_por`.
  field_key text not null,
  adicionado_em timestamptz not null default now(),
  primary key (organization_id, record_id, user_id, field_key),
  foreign key (organization_id, record_id)
    references public.object_records(organization_id, id) on delete cascade
);

create index if not exists object_record_followers_user_idx
  on public.object_record_followers (user_id, adicionado_em desc);

-- RLS ------------------------------------------------------------------------
alter table public.object_records enable row level security;
alter table public.object_records force row level security;
alter table public.object_record_followers enable row level security;
alter table public.object_record_followers force row level security;

drop policy if exists object_records_read on public.object_records;
create policy object_records_read on public.object_records
for select to authenticated
using (
  public.has_module_permission(organization_id, module_key, 'READ', project_id, null)
);

drop policy if exists object_record_followers_read on public.object_record_followers;
create policy object_record_followers_read on public.object_record_followers
for select to authenticated
using (
  exists (
    select 1 from public.object_records r
    where r.organization_id = object_record_followers.organization_id
      and r.id = object_record_followers.record_id
      and public.has_module_permission(r.organization_id, r.module_key, 'READ', r.project_id, null)
  )
);

revoke all on public.object_records from anon, authenticated;
revoke all on public.object_record_followers from anon, authenticated;
grant select on public.object_records to authenticated;
grant select on public.object_record_followers to authenticated;

-- Escrita ---------------------------------------------------------------------
-- Uma RPC, no padrão da VACINA-004 e da VACINA-005. É ela que preenche os
-- slots a partir da projeção — e é por isso que escrita direta é revogada: um
-- `insert` que não passe por aqui deixa os slots dessincronizados do payload, e
-- a listagem filtra por um valor que a linha não tem mais.

create or replace function public.object_record_upsert(
  p_object_id uuid,
  p_payload jsonb,
  p_record_id uuid default null,
  p_project_id uuid default null,
  p_parent_kind text default null,
  p_parent_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_definition public.object_definitions;
  v_spec jsonb;
  v_id uuid;
  v_faltando text;
  v_atualiza boolean;
  v_versao integer;
  v_atribuicoes text := '';
  v_sql text;
begin
  select * into v_definition from public.object_definitions where id = p_object_id;
  if not found then
    raise exception 'Objeto não encontrado.';
  end if;

  if v_definition.status <> 'publicado' then
    raise exception 'O objeto "%" não está publicado e não aceita registro.', v_definition.name;
  end if;

  if not public.has_module_permission(
    v_definition.organization_id, v_definition.module_key, 'EDIT', p_project_id, null
  ) then
    raise exception 'Permissão insuficiente para registrar em "%".', v_definition.name;
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'O conteúdo do registro precisa ser um objeto JSON.';
  end if;

  -- §9: teto de 64 KB por registro. Payload grande é pressão de TOAST e
  -- listagem lenta para todo mundo que divide a partição.
  if octet_length(p_payload::text) > 65536 then
    raise exception 'O registro tem % bytes e o teto é 65536.', octet_length(p_payload::text);
  end if;

  v_atualiza := p_record_id is not null;

  -- **A versão é a do registro, não a de hoje.** Registro que nasceu na versão
  -- 1 continua sendo validado e lido pela versão 1: é isso que faz um campo
  -- novo obrigatório valer para frente sem invalidar o que já foi salvo
  -- (T-32.3.5).
  if v_atualiza then
    select definition_version into v_versao
    from public.object_records
    where organization_id = v_definition.organization_id and id = p_record_id;
    if v_versao is null then
      raise exception 'Registro não encontrado.';
    end if;
  else
    v_versao := v_definition.current_version;
  end if;

  select spec into v_spec
  from public.object_definition_versions
  where definition_id = p_object_id and version = v_versao;
  if v_spec is null then
    raise exception 'Versão % da definição não existe.', v_versao;
  end if;

  -- Obrigatoriedade, avaliada contra a versão do registro e ignorando campo
  -- arquivado — arquivado saiu do formulário.
  select string_agg(campo.value ->> 'label', ', ')
    into v_faltando
  from jsonb_array_elements(coalesce(v_spec -> 'fields', '[]'::jsonb)) as campo
  where coalesce((campo.value ->> 'required')::boolean, false)
    and not coalesce((campo.value ->> 'archived')::boolean, false)
    and coalesce(nullif(trim(coalesce(p_payload ->> (campo.value ->> 'key'), '')), ''), '') = '';
  if v_faltando is not null then
    raise exception 'Faltam campos obrigatórios: %.', v_faltando;
  end if;

  -- Pai da extensão: sem FK, a validação é aqui (§7.2).
  if p_parent_id is not null then
    if p_parent_kind is null then
      raise exception 'Registro que se liga a outro precisa dizer a que tipo de registro se liga.';
    end if;
    if not exists (select 1 from public.app_modules where key = p_parent_kind) then
      raise exception 'Tipo de registro pai desconhecido: "%".', p_parent_kind;
    end if;
  end if;

  if v_atualiza then
    v_id := p_record_id;
    update public.object_records
       set payload = p_payload,
           project_id = coalesce(p_project_id, project_id),
           parent_kind = coalesce(p_parent_kind, parent_kind),
           parent_id = coalesce(p_parent_id, parent_id),
           updated_at = now(),
           updated_by = auth.uid()
     where organization_id = v_definition.organization_id and id = v_id;
  else
    insert into public.object_records(
      organization_id, object_id, definition_version, module_key, project_id,
      parent_kind, parent_id, payload, created_by, updated_by
    ) values (
      v_definition.organization_id, p_object_id, v_versao, v_definition.module_key, p_project_id,
      p_parent_kind, p_parent_id, p_payload, auth.uid(), auth.uid()
    )
    returning id into v_id;
  end if;

  -- Slots: montados a partir da projeção que o banco derivou na publicação.
  -- Um `update` dinâmico com as colunas do mapa, e não um `update` por campo —
  -- e as colunas vêm de `object_field_slots`, cujo nome é validado por
  -- `check (slot_column ~ '^(num|txt|dt|bool|ref)_[1-9][0-9]?$')`, então não há
  -- texto de fora entrando no SQL.
  select string_agg(
    format(
      '%I = %s',
      s.slot_column,
      case split_part(s.slot_column, '_', 1)
        when 'num' then format('nullif(%L, '''')::numeric', p_payload ->> s.field_key)
        when 'dt' then format('nullif(%L, '''')::timestamptz', p_payload ->> s.field_key)
        when 'bool' then format('nullif(%L, '''')::boolean', p_payload ->> s.field_key)
        when 'ref' then format('nullif(%L, '''')::uuid', p_payload ->> s.field_key)
        else format('nullif(%L, '''')', p_payload ->> s.field_key)
      end
    ),
    ', '
  )
    into v_atribuicoes
  from public.object_field_slots s
  where s.definition_id = p_object_id and s.version = v_versao;

  if v_atribuicoes is not null and v_atribuicoes <> '' then
    v_sql := format(
      'update public.object_records set %s where organization_id = %L and id = %L',
      v_atribuicoes, v_definition.organization_id, v_id
    );
    execute v_sql;
  end if;

  -- Seguidores: todo campo do tipo pessoa preenchido inscreve quem foi
  -- apontado. Não desinscreve quem sai — deixar de ser o responsável não apaga
  -- o que a pessoa já acompanhou, e sair da lista é ato dela.
  insert into public.object_record_followers(organization_id, record_id, user_id, field_key)
  select v_definition.organization_id, v_id,
         (p_payload ->> (campo.value ->> 'key'))::uuid,
         campo.value ->> 'key'
  from jsonb_array_elements(coalesce(v_spec -> 'fields', '[]'::jsonb)) as campo
  where campo.value ->> 'type' = 'usuario'
    and coalesce(nullif(trim(coalesce(p_payload ->> (campo.value ->> 'key'), '')), ''), '') <> ''
    and exists (
      select 1 from auth.users u where u.id = (p_payload ->> (campo.value ->> 'key'))::uuid
    )
  on conflict do nothing;

  return v_id;
end;
$$;

revoke all on function public.object_record_upsert(uuid, jsonb, uuid, uuid, text, uuid) from public, anon;
grant execute on function public.object_record_upsert(uuid, jsonb, uuid, uuid, text, uuid) to authenticated;

-- Verificação embutida -------------------------------------------------------
do $$
declare
  v_particoes integer;
begin
  select count(*) into v_particoes
  from pg_inherits i join pg_class c on c.oid = i.inhrelid
  where i.inhparent = 'public.object_records'::regclass;
  if v_particoes <> 64 then
    raise exception 'object_records deveria ter 64 partições, tem %.', v_particoes;
  end if;

  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'object_records' and c.relrowsecurity and c.relforcerowsecurity
  ) then
    raise exception 'object_records sem RLS habilitada e forçada.';
  end if;

  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public' and table_name in ('object_records', 'object_record_followers')
      and grantee in ('anon', 'authenticated')
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
  ) then
    raise exception 'Escrita direta em object_records concedida: a escrita é só por RPC.';
  end if;

  raise notice 'Object Runtime — registros: 64 partições, RLS forçada, escrita só por RPC e seguidores por campo de pessoa.';
end;
$$;
