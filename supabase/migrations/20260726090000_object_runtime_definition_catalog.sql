-- Object Runtime — catálogo de definições de objeto dinâmico.
-- Sprint S-05 do inventário de execução. Contrato em diretrizes/OBJECT-RUNTIME.md.
--
-- Três tabelas: a definição, a versão imutável e a projeção de slots.
-- A definição é mutável em rascunho; a versão publicada nunca muda.
-- Nenhuma escrita direta: apenas RPC, no padrão da VACINA-004 e da VACINA-005.

create table if not exists public.object_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  name text not null,
  class text not null check (class in ('cadastro','extensao')),
  -- Aplicativo do qual o objeto herda o modelo de permissão. Sem árvore
  -- paralela de perfis: quem enxerga o módulo enxerga o objeto, no nível
  -- que o perfil dele já define.
  module_key text not null,
  -- 'projeto' liga o registro a um project_id e faz a permissão ser resolvida
  -- também pela obra, contrato ou frente de serviço.
  scope text not null default 'organizacao' check (scope in ('organizacao','projeto')),
  storage_tier text not null default 'shared' check (storage_tier in ('shared','dedicated')),
  status text not null default 'rascunho' check (status in ('rascunho','publicado','depreciado','arquivado')),
  current_version integer,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, key)
);

create table if not exists public.object_definition_versions (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references public.object_definitions(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  version integer not null check (version > 0),
  spec jsonb not null,
  -- sha256 da serialização canônica do spec. Prova que a versão publicada
  -- não foi alterada depois de publicada.
  checksum text not null check (checksum ~ '^[0-9a-f]{64}$'),
  published_at timestamptz not null default now(),
  published_by uuid references auth.users(id),
  unique (definition_id, version)
);

-- Projeção derivada do spec, lida no caminho de escrita de registro.
-- Divergência entre esta tabela e o spec é falha de integridade.
create table if not exists public.object_field_slots (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references public.object_definitions(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  version integer not null,
  field_key text not null,
  slot_column text not null check (slot_column ~ '^(num|txt|dt|bool|ref)_[1-9][0-9]?$'),
  unique (definition_id, version, field_key),
  unique (definition_id, version, slot_column),
  foreign key (definition_id, version)
    references public.object_definition_versions(definition_id, version) on delete cascade
);

create index if not exists object_definitions_org_status_idx
  on public.object_definitions(organization_id, status, key);
create index if not exists object_definitions_module_idx
  on public.object_definitions(organization_id, module_key) where status = 'publicado';
create index if not exists object_definition_versions_definition_idx
  on public.object_definition_versions(definition_id, version desc);
create index if not exists object_field_slots_lookup_idx
  on public.object_field_slots(definition_id, version);

-- Imutabilidade da versão publicada -----------------------------------------
-- Não é convenção: é guarda no banco. Alterar ou apagar versão publicada
-- corrompe a leitura de todo registro que nasceu sob ela.

create or replace function public.object_definition_versions_freeze()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  raise exception 'Versão de definição publicada é imutável (definição %, versão %). Publique uma nova versão.',
    coalesce(old.definition_id, new.definition_id), coalesce(old.version, new.version);
end;
$$;

drop trigger if exists object_definition_versions_no_update on public.object_definition_versions;
create trigger object_definition_versions_no_update
  before update or delete on public.object_definition_versions
  for each row execute function public.object_definition_versions_freeze();

-- RLS ------------------------------------------------------------------------
-- Uma política por operação, reusando has_module_permission. Objeto novo nasce
-- protegido porque a proteção está na tabela, não no objeto: nenhuma linha de
-- SQL de segurança é gerada quando alguém cria um objeto.

alter table public.object_definitions enable row level security;
alter table public.object_definition_versions enable row level security;
alter table public.object_field_slots enable row level security;

alter table public.object_definitions force row level security;
alter table public.object_definition_versions force row level security;
alter table public.object_field_slots force row level security;

drop policy if exists object_definitions_read on public.object_definitions;
create policy object_definitions_read on public.object_definitions
for select to authenticated
using (
  public.has_module_permission(organization_id, module_key, 'READ', null, null)
  or public.has_module_permission(organization_id, 'administracao', 'READ', null, null)
);

drop policy if exists object_definition_versions_read on public.object_definition_versions;
create policy object_definition_versions_read on public.object_definition_versions
for select to authenticated
using (
  exists (
    select 1 from public.object_definitions d
    where d.id = object_definition_versions.definition_id
      and d.organization_id = object_definition_versions.organization_id
      and (
        public.has_module_permission(d.organization_id, d.module_key, 'READ', null, null)
        or public.has_module_permission(d.organization_id, 'administracao', 'READ', null, null)
      )
  )
);

drop policy if exists object_field_slots_read on public.object_field_slots;
create policy object_field_slots_read on public.object_field_slots
for select to authenticated
using (
  exists (
    select 1 from public.object_definitions d
    where d.id = object_field_slots.definition_id
      and d.organization_id = object_field_slots.organization_id
      and (
        public.has_module_permission(d.organization_id, d.module_key, 'READ', null, null)
        or public.has_module_permission(d.organization_id, 'administracao', 'READ', null, null)
      )
  )
);

-- Privilégio mínimo ----------------------------------------------------------
-- Leitura por política; escrita somente por RPC. Sem isto, a guarda de
-- imutabilidade e a coerência da projeção de slots dependeriam de disciplina
-- da aplicação, e disciplina não é controle.

revoke all on public.object_definitions from anon, authenticated;
revoke all on public.object_definition_versions from anon, authenticated;
revoke all on public.object_field_slots from anon, authenticated;

grant select on public.object_definitions to authenticated;
grant select on public.object_definition_versions to authenticated;
grant select on public.object_field_slots to authenticated;

revoke all on function public.object_definition_versions_freeze() from public, anon, authenticated;

-- Verificação embutida -------------------------------------------------------
do $$
declare
  v_missing text;
begin
  select string_agg(t.name, ', ')
    into v_missing
  from (values
    ('object_definitions'),
    ('object_definition_versions'),
    ('object_field_slots')
  ) as t(name)
  where not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = t.name and c.relrowsecurity
  );
  if v_missing is not null then
    raise exception 'Tabelas do Object Runtime sem RLS habilitada: %', v_missing;
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'object_definition_versions_no_update' and not tgisinternal
  ) then
    raise exception 'Guarda de imutabilidade da versão publicada não foi criada.';
  end if;
end;
$$;
