begin;

alter table public.app_modules
  add column if not exists version text not null default '1.0.0',
  add column if not exists category text not null default 'GERAL',
  add column if not exists manifest jsonb not null default '{}'::jsonb,
  add column if not exists default_enabled boolean not null default false,
  add column if not exists is_core boolean not null default false,
  add column if not exists deprecated_at timestamptz;

update public.app_modules
set default_enabled=true,
    is_core=true,
    category=case
      when key in ('crm','clientes','propostas') then 'COMERCIAL'
      when key in ('obras','planejamento','tarefas','diario','equipes','documentos','qualidade') then 'OPERACIONAL'
      when key in ('orcamentos','contratos','aditivos','assinaturas','compras','estoque') then 'FINANCEIRO'
      when key in ('sac') then 'POS_VENDA'
      when key in ('administracao','auditoria','relatorios') then 'GESTAO'
      else 'GERAL'
    end,
    manifest=jsonb_build_object(
      'schemaVersion',1,
      'route',href,
      'icon',icon_key,
      'sensitive',sensitive
    )
where manifest='{}'::jsonb;

create table public.organization_modules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module_id uuid not null references public.app_modules(id) on delete restrict,
  status text not null default 'ENABLED'
    check (status in ('ENABLED','DISABLED','ARCHIVED')),
  installed_version text not null,
  settings jsonb not null default '{}'::jsonb,
  installed_by uuid references auth.users(id) on delete set null,
  enabled_at timestamptz,
  disabled_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,module_id)
);
create index organization_modules_status_idx
  on public.organization_modules(organization_id,status);
create index organization_modules_module_idx
  on public.organization_modules(module_id,status);

create table public.app_module_dependencies (
  module_id uuid not null references public.app_modules(id) on delete cascade,
  depends_on_module_id uuid not null references public.app_modules(id) on delete restrict,
  minimum_version text,
  required boolean not null default true,
  created_at timestamptz not null default now(),
  primary key(module_id,depends_on_module_id),
  check (module_id<>depends_on_module_id)
);

insert into public.organization_modules(
  organization_id,module_id,status,installed_version,enabled_at
)
select o.id,m.id,'ENABLED',m.version,now()
from public.organizations o
cross join public.app_modules m
where m.active and m.default_enabled
on conflict(organization_id,module_id) do nothing;

create trigger organization_modules_touch_updated_at
before update on public.organization_modules
for each row execute function public.touch_updated_at();

create or replace function public.ensure_default_organization_modules(p_organization_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
begin
  insert into public.organization_modules(
    organization_id,module_id,status,installed_version,enabled_at
  )
  select p_organization_id,m.id,'ENABLED',m.version,now()
  from public.app_modules m
  where m.active and m.default_enabled
  on conflict(organization_id,module_id) do nothing;
  return true;
end;
$$;

create or replace function public.ensure_default_organization_modules_trigger()
returns trigger
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
begin
  perform public.ensure_default_organization_modules(new.id);
  return new;
end;
$$;

create trigger organizations_modules_after_insert
after insert on public.organizations
for each row execute function public.ensure_default_organization_modules_trigger();

commit;
