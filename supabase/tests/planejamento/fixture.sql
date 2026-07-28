-- Fixture do planejamento: só o que falta entre a fixture do pipeline e o
-- esquema da etapa 12.
--
-- O replay completo das migrations não roda hoje — é a lacuna registrada na
-- S-22, anterior a este trabalho. Enquanto ela não fecha, o teste encadeia a
-- fixture do pipeline, esta ponte e as migrations de planejamento.
--
-- Aqui entra **apenas** a tabela que a etapa 12 referencia e que a fixture do
-- pipeline não cria. Reproduzir o esquema real de contratos seria copiar
-- migration para dentro de teste, que é a causa raiz da VACINA-014.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'org_role') then
    create type public.org_role as enum ('OWNER','ADMIN','MANAGER','MEMBER','VIEWER');
  end if;
end;
$$;

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  code text not null,
  created_at timestamptz not null default now()
);

-- A fixture do pipeline cria `projects` no mínimo que o pipeline usa. A etapa 12
-- indexa por `status` e `code`, que ali não existem. As colunas entram aqui, com
-- os mesmos tipos da migration real da etapa 9.
alter table public.projects
  add column if not exists code text,
  add column if not exists status text not null default 'PLANNING';

create unique index if not exists projects_org_code_uidx
  on public.projects(organization_id, code) where code is not null;
