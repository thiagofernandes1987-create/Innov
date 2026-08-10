-- Fixture complementar para perfis de bot em banco limpo.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text,
  name text not null,
  status text,
  archived_at timestamptz
);

insert into public.projects(id,organization_id,code,name,status)
values
  ('31000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','OB-001','Obra Alpha','EXECUTION'),
  ('31000000-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','OB-002','Obra Externa','EXECUTION')
on conflict do nothing;
