-- Etapa 12.1 — núcleo modular plug-and-play e autorização por capacidades.

create extension if not exists pgcrypto;

do $$ begin
  create type public.module_lifecycle_state as enum ('ENABLED','DISABLED','MAINTENANCE','DEPRECATED','ARCHIVED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.permission_effect as enum ('ALLOW','DENY');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.access_profile_status as enum ('ACTIVE','INACTIVE','ARCHIVED');
exception when duplicate_object then null; end $$;

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z][a-z0-9_-]+$'),
  name text not null,
  description text not null default '',
  icon text not null default 'app',
  category text not null default 'OPERACIONAL',
  version text not null default '1.0.0',
  route_prefix text not null,
  lifecycle_state public.module_lifecycle_state not null default 'ENABLED',
  sort_order integer not null default 100,
  dependencies text[] not null default '{}',
  manifest jsonb not null default '{}'::jsonb,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_applications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete restrict,
  state public.module_lifecycle_state not null default 'ENABLED',
  settings jsonb not null default '{}'::jsonb,
  enabled_by uuid,
  enabled_at timestamptz,
  disabled_by uuid,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, application_id)
);

create table if not exists public.application_capabilities (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  key text not null,
  name text not null,
  description text not null default '',
  risk_level smallint not null default 1 check (risk_level between 1 and 5),
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  unique (application_id, key)
);

create table if not exists public.access_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  name text not null,
  description text not null default '',
  status public.access_profile_status not null default 'ACTIVE',
  is_system boolean not null default false,
  legacy_role text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, key)
);

create table if not exists public.profile_capabilities (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.access_profiles(id) on delete cascade,
  capability_id uuid not null references public.application_capabilities(id) on delete cascade,
  effect public.permission_effect not null default 'ALLOW',
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (profile_id, capability_id)
);

create table if not exists public.user_profile_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  profile_id uuid not null references public.access_profiles(id) on delete cascade,
  scope_type text not null default 'ORGANIZATION' check (scope_type in ('ORGANIZATION','CLIENT','PROJECT')),
  scope_id uuid,
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  assigned_by uuid,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id, profile_id, scope_type, scope_id)
);

create table if not exists public.user_capability_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  capability_id uuid not null references public.application_capabilities(id) on delete cascade,
  effect public.permission_effect not null,
  scope_type text not null default 'ORGANIZATION' check (scope_type in ('ORGANIZATION','CLIENT','PROJECT')),
  scope_id uuid,
  reason text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id, capability_id, scope_type, scope_id)
);

create table if not exists public.permission_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid,
  affected_user_id uuid,
  profile_id uuid references public.access_profiles(id) on delete set null,
  application_id uuid references public.applications(id) on delete set null,
  capability_id uuid references public.application_capabilities(id) on delete set null,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  reason text,
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create index if not exists organization_applications_org_state_idx on public.organization_applications(organization_id, state);
create index if not exists application_capabilities_app_idx on public.application_capabilities(application_id, sort_order);
create index if not exists access_profiles_org_status_idx on public.access_profiles(organization_id, status);
create index if not exists profile_capabilities_profile_idx on public.profile_capabilities(profile_id);
create index if not exists user_profile_assignments_user_idx on public.user_profile_assignments(organization_id, user_id, active);
create index if not exists user_profile_assignments_scope_idx on public.user_profile_assignments(scope_type, scope_id);
create index if not exists user_capability_overrides_user_idx on public.user_capability_overrides(organization_id, user_id);
create index if not exists permission_audit_events_org_created_idx on public.permission_audit_events(organization_id, created_at desc);

insert into public.applications(key,name,description,icon,category,route_prefix,sort_order,is_system,manifest) values
('dashboard','Início','Central de aplicativos e indicadores autorizados.','home','NÚCLEO','/app',1,true,'{"navigationLabel":"Início"}'),
('crm','CRM e Vendas','Leads, oportunidades e pipeline comercial.','target','COMERCIAL','/app/crm',10,false,'{"navigationLabel":"CRM"}'),
('clients','Clientes','Cadastro de clientes e visão multiobra.','users','COMERCIAL','/app/clientes',20,false,'{"navigationLabel":"Clientes"}'),
('works','Obras','Carteira multiobra, progresso e visão executiva.','building','OPERACIONAL','/app/obras',30,false,'{"navigationLabel":"Obras"}'),
('planning','Planejamento','EAP, cronogramas, baselines e marcos.','calendar','OPERACIONAL','/app/planejamento',40,false,'{"navigationLabel":"Planejamento"}'),
('tasks','Tarefas','Quadros Kanban e execução operacional.','check-square','OPERACIONAL','/app/tarefas',50,false,'{"navigationLabel":"Tarefas"}'),
('daily','Diário de Obras','Registros de campo, atividades e evidências.','clipboard','OPERACIONAL','/app/diario',60,false,'{"navigationLabel":"Diário de obras"}'),
('teams','Equipes','Equipes, integrantes e recursos de obra.','hard-hat','OPERACIONAL','/app/equipes',70,false,'{"navigationLabel":"Equipes"}'),
('budgets','Orçamentos','Custos, BDI, markup, cenários e aprovações.','calculator','FINANCEIRO','/app/orcamentos',80,false,'{"navigationLabel":"Orçamentos"}'),
('proposals','Propostas','Propostas comerciais e versões liberadas.','file-text','COMERCIAL','/app/propostas',90,false,'{"navigationLabel":"Propostas"}'),
('contracts','Contratos','Contratos, versões, partes e vigência.','scroll','JURÍDICO','/app/contratos',100,false,'{"navigationLabel":"Contratos"}'),
('addenda','Aditivos','Alterações financeiras e de prazo.','file-plus','JURÍDICO','/app/aditivos',110,false,'{"navigationLabel":"Aditivos"}'),
('signatures','Assinaturas','Envelopes, signatários e evidências.','pen-tool','JURÍDICO','/app/assinaturas',120,false,'{"navigationLabel":"Assinaturas"}'),
('documents','Documentos','Documentos privados e versionados.','folder','OPERACIONAL','/app/documentos',130,false,'{"navigationLabel":"Documentos"}'),
('quality','Qualidade','PO, FVS, FVM e não conformidades.','shield-check','QUALIDADE','/app/qualidade',140,false,'{"navigationLabel":"Qualidade"}'),
('purchases','Compras','Solicitações, cotações e pedidos.','shopping-cart','SUPRIMENTOS','/app/compras',150,false,'{"navigationLabel":"Compras"}'),
('inventory','Estoque','Entradas, saídas e inventários.','package','SUPRIMENTOS','/app/estoque',160,false,'{"navigationLabel":"Estoque"}'),
('finance','Financeiro','Contas, fluxo de caixa e conciliação.','landmark','FINANCEIRO','/app/financeiro',170,false,'{"navigationLabel":"Financeiro"}'),
('service','Pós-venda e SAC','Ocorrências e prestação de serviços.','headphones','PÓS-VENDA','/app/ocorrencias',180,false,'{"navigationLabel":"Pós-venda"}'),
('audit','Auditoria','Eventos de segurança e trilhas de alteração.','history','NÚCLEO','/app/auditoria',190,true,'{"navigationLabel":"Auditoria"}'),
('administration','Administração','Aplicativos, perfis, usuários e permissões.','settings','NÚCLEO','/app/administracao',200,true,'{"navigationLabel":"Administração"}')
on conflict (key) do update set name=excluded.name, description=excluded.description, icon=excluded.icon, category=excluded.category, route_prefix=excluded.route_prefix, sort_order=excluded.sort_order, manifest=excluded.manifest;

insert into public.application_capabilities(application_id,key,name,description,risk_level,sort_order)
select a.id, c.key, c.name, c.description, c.risk_level, c.sort_order
from public.applications a
cross join (values
 ('create','Criar','Criar novos registros.',2,10),
 ('read','Ler','Consultar registros autorizados.',1,20),
 ('update','Editar','Atualizar registros existentes.',2,30),
 ('delete','Excluir','Excluir ou arquivar registros.',4,40),
 ('approve','Aprovar','Executar aprovações e alçadas.',4,50),
 ('release_to_client','Liberar ao cliente','Publicar versão no portal do cliente.',4,60),
 ('sign','Assinar','Executar ou administrar assinatura.',5,70),
 ('export','Exportar','Gerar ou baixar documentos e relatórios.',2,80),
 ('manage','Administrar','Configurar o aplicativo.',5,90),
 ('view_sensitive_financials','Ver dados financeiros sensíveis','Consultar custos, BDI, margem, lucro e ROI.',5,100),
 ('assign_users','Atribuir usuários','Administrar acessos do aplicativo.',5,110),
 ('configure','Configurar','Alterar configurações do aplicativo.',5,120)
) as c(key,name,description,risk_level,sort_order)
on conflict (application_id,key) do update set name=excluded.name, description=excluded.description, risk_level=excluded.risk_level, sort_order=excluded.sort_order;

insert into public.organization_applications(organization_id,application_id,state,enabled_at)
select o.id,a.id,
  case when a.key in ('quality','purchases','inventory','finance') then 'DISABLED'::public.module_lifecycle_state else 'ENABLED'::public.module_lifecycle_state end,
  case when a.key in ('quality','purchases','inventory','finance') then null else now() end
from public.organizations o cross join public.applications a
on conflict (organization_id,application_id) do nothing;

insert into public.access_profiles(organization_id,key,name,description,is_system,legacy_role)
select o.id, p.key, p.name, p.description, true, p.legacy_role
from public.organizations o
cross join (values
 ('direcao','Direção','Acesso executivo e aprovações de alto risco.','DIRECAO'),
 ('administrador','Administrador','Administração da plataforma e acessos.','ADMINISTRADOR'),
 ('super-admin','Super Admin','Recuperação e administração total.','SUPER_ADMIN'),
 ('vendas','Vendas','CRM, clientes e propostas comerciais.','COMERCIAL'),
 ('financeiro','Financeiro','Financeiro, contratos e documentos comerciais.','FINANCEIRO'),
 ('orcamentista','Orçamentista','Orçamentos e memória financeira.','ORCAMENTISTA'),
 ('operacional','Operacional','Obras, tarefas, diário e equipes.','GESTOR_OBRAS'),
 ('engenharia','Engenharia','Planejamento técnico e execução de obras.','ENGENHEIRO'),
 ('qualidade','Qualidade','Inspeções, documentos e conformidade.','QUALIDADE'),
 ('pos-venda','Pós-venda','Ocorrências, clientes e acompanhamento.','SAC'),
 ('cliente','Cliente','Portal externo do cliente.','CLIENTE'),
 ('usuario-comum','Usuário comum','Sem aplicativos concedidos por padrão.',null)
) as p(key,name,description,legacy_role)
on conflict (organization_id,key) do update set name=excluded.name, description=excluded.description, legacy_role=excluded.legacy_role;

-- Direção, administrador e super admin recebem todas as capacidades.
insert into public.profile_capabilities(profile_id,capability_id,effect)
select p.id,c.id,'ALLOW'::public.permission_effect
from public.access_profiles p cross join public.application_capabilities c
where p.key in ('direcao','administrador','super-admin')
on conflict (profile_id,capability_id) do nothing;

-- Perfis especializados recebem capacidades por aplicativo.
with grants(profile_key,app_key,capability_key) as (values
 ('vendas','crm','create'),('vendas','crm','read'),('vendas','crm','update'),('vendas','crm','export'),
 ('vendas','clients','create'),('vendas','clients','read'),('vendas','clients','update'),
 ('vendas','proposals','create'),('vendas','proposals','read'),('vendas','proposals','update'),('vendas','proposals','export'),
 ('vendas','contracts','read'),('vendas','signatures','read'),
 ('financeiro','finance','create'),('financeiro','finance','read'),('financeiro','finance','update'),('financeiro','finance','approve'),('financeiro','finance','export'),('financeiro','finance','view_sensitive_financials'),
 ('financeiro','contracts','create'),('financeiro','contracts','read'),('financeiro','contracts','update'),('financeiro','contracts','export'),
 ('financeiro','addenda','create'),('financeiro','addenda','read'),('financeiro','addenda','update'),
 ('financeiro','signatures','create'),('financeiro','signatures','read'),('financeiro','signatures','update'),('financeiro','signatures','sign'),
 ('financeiro','budgets','read'),('financeiro','budgets','view_sensitive_financials'),('financeiro','clients','read'),
 ('orcamentista','budgets','create'),('orcamentista','budgets','read'),('orcamentista','budgets','update'),('orcamentista','budgets','export'),('orcamentista','budgets','view_sensitive_financials'),
 ('orcamentista','clients','read'),('orcamentista','documents','create'),('orcamentista','documents','read'),('orcamentista','documents','update'),
 ('operacional','works','create'),('operacional','works','read'),('operacional','works','update'),
 ('operacional','planning','create'),('operacional','planning','read'),('operacional','planning','update'),
 ('operacional','tasks','create'),('operacional','tasks','read'),('operacional','tasks','update'),
 ('operacional','daily','create'),('operacional','daily','read'),('operacional','daily','update'),
 ('operacional','teams','create'),('operacional','teams','read'),('operacional','teams','update'),
 ('operacional','documents','create'),('operacional','documents','read'),('operacional','documents','update'),('operacional','clients','read'),
 ('engenharia','works','read'),('engenharia','works','update'),('engenharia','planning','create'),('engenharia','planning','read'),('engenharia','planning','update'),('engenharia','planning','approve'),
 ('engenharia','tasks','create'),('engenharia','tasks','read'),('engenharia','tasks','update'),('engenharia','daily','create'),('engenharia','daily','read'),('engenharia','daily','update'),('engenharia','documents','create'),('engenharia','documents','read'),('engenharia','documents','update'),
 ('qualidade','quality','create'),('qualidade','quality','read'),('qualidade','quality','update'),('qualidade','quality','approve'),('qualidade','works','read'),('qualidade','daily','read'),('qualidade','documents','create'),('qualidade','documents','read'),('qualidade','documents','update'),
 ('pos-venda','service','create'),('pos-venda','service','read'),('pos-venda','service','update'),('pos-venda','clients','read'),('pos-venda','works','read'),
 ('cliente','dashboard','read')
)
insert into public.profile_capabilities(profile_id,capability_id,effect)
select p.id,c.id,'ALLOW'::public.permission_effect
from grants g
join public.access_profiles p on p.key=g.profile_key
join public.applications a on a.key=g.app_key
join public.application_capabilities c on c.application_id=a.id and c.key=g.capability_key
on conflict (profile_id,capability_id) do nothing;

-- Converte memberships existentes em atribuições editáveis.
insert into public.user_profile_assignments(organization_id,user_id,profile_id,scope_type,active,assigned_by)
select m.organization_id,m.user_id,p.id,'ORGANIZATION',m.active,m.user_id
from public.organization_memberships m
join public.access_profiles p on p.organization_id=m.organization_id and p.legacy_role=m.role::text
where m.active=true
on conflict do nothing;

create or replace function public.modular_is_org_member(p_organization_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public,auth,pg_temp as $$
  select p_user_id is not null and exists(
    select 1 from public.organization_memberships m
    where m.organization_id=p_organization_id and m.user_id=p_user_id and m.active=true
  );
$$;

create or replace function public.can_manage_modular_access(p_organization_id uuid)
returns boolean language sql stable security definer set search_path=public,auth,pg_temp as $$
  select exists(
    select 1 from public.organization_memberships m
    where m.organization_id=p_organization_id and m.user_id=auth.uid() and m.active=true
      and m.role::text in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR')
  );
$$;

create or replace function public.has_effective_capability(
  p_organization_id uuid,
  p_application_key text,
  p_capability_key text,
  p_scope_id uuid default null
) returns boolean
language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
declare v_user uuid:=auth.uid(); v_capability uuid;
begin
  if v_user is null or not public.modular_is_org_member(p_organization_id,v_user) then return false; end if;
  select c.id into v_capability
  from public.application_capabilities c join public.applications a on a.id=c.application_id
  join public.organization_applications oa on oa.application_id=a.id and oa.organization_id=p_organization_id
  where a.key=p_application_key and c.key=p_capability_key and a.lifecycle_state='ENABLED' and oa.state='ENABLED';
  if v_capability is null then return false; end if;

  if exists(select 1 from public.user_capability_overrides o where o.organization_id=p_organization_id and o.user_id=v_user and o.capability_id=v_capability and o.effect='DENY' and o.starts_at<=now() and (o.ends_at is null or o.ends_at>now()) and (o.scope_type='ORGANIZATION' or o.scope_id=p_scope_id)) then return false; end if;
  if exists(select 1 from public.user_capability_overrides o where o.organization_id=p_organization_id and o.user_id=v_user and o.capability_id=v_capability and o.effect='ALLOW' and o.starts_at<=now() and (o.ends_at is null or o.ends_at>now()) and (o.scope_type='ORGANIZATION' or o.scope_id=p_scope_id)) then return true; end if;

  return exists(
    select 1 from public.user_profile_assignments upa
    join public.access_profiles p on p.id=upa.profile_id and p.status='ACTIVE'
    join public.profile_capabilities pc on pc.profile_id=p.id and pc.capability_id=v_capability and pc.effect='ALLOW'
    where upa.organization_id=p_organization_id and upa.user_id=v_user and upa.active=true
      and upa.starts_at<=now() and (upa.ends_at is null or upa.ends_at>now())
      and (upa.scope_type='ORGANIZATION' or upa.scope_id=p_scope_id)
  );
end;
$$;

create or replace function public.list_effective_applications(p_organization_id uuid)
returns table(application_key text,name text,description text,icon text,category text,route_prefix text,sort_order integer,access_level text)
language sql stable security definer set search_path=public,auth,pg_temp as $$
  select a.key,a.name,a.description,a.icon,a.category,a.route_prefix,a.sort_order,
    case
      when public.has_effective_capability(p_organization_id,a.key,'delete') then 'FULL'
      when public.has_effective_capability(p_organization_id,a.key,'update') then 'READ_WRITE'
      when public.has_effective_capability(p_organization_id,a.key,'read') then 'READ'
      else 'NONE'
    end
  from public.applications a
  join public.organization_applications oa on oa.application_id=a.id and oa.organization_id=p_organization_id and oa.state='ENABLED'
  where a.lifecycle_state='ENABLED' and public.has_effective_capability(p_organization_id,a.key,'read')
  order by a.sort_order,a.name;
$$;

create or replace function public.set_organization_application_state(p_organization_id uuid,p_application_key text,p_state public.module_lifecycle_state,p_reason text)
returns void language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_app uuid; v_before jsonb;
begin
  if not public.can_manage_modular_access(p_organization_id) then raise exception 'PERMISSION_DENIED'; end if;
  select id into v_app from public.applications where key=p_application_key;
  if v_app is null then raise exception 'APPLICATION_NOT_FOUND'; end if;
  select to_jsonb(x) into v_before from public.organization_applications x where x.organization_id=p_organization_id and x.application_id=v_app;
  insert into public.organization_applications(organization_id,application_id,state,enabled_by,enabled_at,disabled_by,disabled_at)
  values(p_organization_id,v_app,p_state,case when p_state='ENABLED' then auth.uid() end,case when p_state='ENABLED' then now() end,case when p_state<>'ENABLED' then auth.uid() end,case when p_state<>'ENABLED' then now() end)
  on conflict(organization_id,application_id) do update set state=excluded.state,enabled_by=excluded.enabled_by,enabled_at=excluded.enabled_at,disabled_by=excluded.disabled_by,disabled_at=excluded.disabled_at,updated_at=now();
  insert into public.permission_audit_events(organization_id,actor_user_id,application_id,action,before_data,after_data,reason) values(p_organization_id,auth.uid(),v_app,'APPLICATION_STATE_CHANGED',v_before,jsonb_build_object('state',p_state),p_reason);
end;
$$;

create or replace function public.create_access_profile(p_organization_id uuid,p_key text,p_name text,p_description text)
returns uuid language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_id uuid;
begin
 if not public.can_manage_modular_access(p_organization_id) then raise exception 'PERMISSION_DENIED'; end if;
 insert into public.access_profiles(organization_id,key,name,description,created_by) values(p_organization_id,lower(regexp_replace(trim(p_key),'[^a-zA-Z0-9]+','-','g')),trim(p_name),coalesce(trim(p_description),''),auth.uid()) returning id into v_id;
 insert into public.permission_audit_events(organization_id,actor_user_id,profile_id,action,after_data) values(p_organization_id,auth.uid(),v_id,'PROFILE_CREATED',jsonb_build_object('name',p_name));
 return v_id;
end;
$$;

create or replace function public.set_profile_access_level(p_profile_id uuid,p_application_key text,p_level text,p_reason text)
returns void language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_org uuid; v_app uuid; v_caps text[];
begin
 select organization_id into v_org from public.access_profiles where id=p_profile_id;
 if v_org is null or not public.can_manage_modular_access(v_org) then raise exception 'PERMISSION_DENIED'; end if;
 select id into v_app from public.applications where key=p_application_key;
 if p_level not in ('NONE','READ','READ_WRITE','FULL') then raise exception 'INVALID_ACCESS_LEVEL'; end if;
 delete from public.profile_capabilities pc using public.application_capabilities c where pc.profile_id=p_profile_id and pc.capability_id=c.id and c.application_id=v_app;
 v_caps:=case p_level when 'READ' then array['read'] when 'READ_WRITE' then array['create','read','update','export'] when 'FULL' then array['create','read','update','delete','approve','release_to_client','sign','export','manage','view_sensitive_financials','assign_users','configure'] else array[]::text[] end;
 insert into public.profile_capabilities(profile_id,capability_id,effect,created_by) select p_profile_id,c.id,'ALLOW',auth.uid() from public.application_capabilities c where c.application_id=v_app and c.key=any(v_caps) on conflict(profile_id,capability_id) do update set effect='ALLOW',created_by=auth.uid();
 insert into public.permission_audit_events(organization_id,actor_user_id,profile_id,application_id,action,after_data,reason) values(v_org,auth.uid(),p_profile_id,v_app,'PROFILE_ACCESS_LEVEL_CHANGED',jsonb_build_object('level',p_level),p_reason);
end;
$$;

create or replace function public.assign_access_profile(p_organization_id uuid,p_user_id uuid,p_profile_id uuid,p_scope_type text default 'ORGANIZATION',p_scope_id uuid default null,p_reason text default null)
returns uuid language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_id uuid;
begin
 if not public.can_manage_modular_access(p_organization_id) then raise exception 'PERMISSION_DENIED'; end if;
 if not exists(select 1 from public.access_profiles where id=p_profile_id and organization_id=p_organization_id and status='ACTIVE') then raise exception 'PROFILE_NOT_AVAILABLE'; end if;
 insert into public.user_profile_assignments(organization_id,user_id,profile_id,scope_type,scope_id,assigned_by) values(p_organization_id,p_user_id,p_profile_id,p_scope_type,p_scope_id,auth.uid()) on conflict(organization_id,user_id,profile_id,scope_type,scope_id) do update set active=true,ends_at=null,assigned_by=auth.uid() returning id into v_id;
 insert into public.permission_audit_events(organization_id,actor_user_id,affected_user_id,profile_id,action,reason) values(p_organization_id,auth.uid(),p_user_id,p_profile_id,'PROFILE_ASSIGNED',p_reason);
 return v_id;
end;
$$;

create or replace function public.set_user_capability_override(p_organization_id uuid,p_user_id uuid,p_application_key text,p_capability_key text,p_effect public.permission_effect,p_scope_type text,p_scope_id uuid,p_reason text)
returns uuid language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_cap uuid; v_id uuid;
begin
 if not public.can_manage_modular_access(p_organization_id) then raise exception 'PERMISSION_DENIED'; end if;
 select c.id into v_cap from public.application_capabilities c join public.applications a on a.id=c.application_id where a.key=p_application_key and c.key=p_capability_key;
 if v_cap is null then raise exception 'CAPABILITY_NOT_FOUND'; end if;
 insert into public.user_capability_overrides(organization_id,user_id,capability_id,effect,scope_type,scope_id,reason,created_by) values(p_organization_id,p_user_id,v_cap,p_effect,p_scope_type,p_scope_id,p_reason,auth.uid()) on conflict(organization_id,user_id,capability_id,scope_type,scope_id) do update set effect=excluded.effect,reason=excluded.reason,starts_at=now(),ends_at=null,created_by=auth.uid() returning id into v_id;
 insert into public.permission_audit_events(organization_id,actor_user_id,affected_user_id,capability_id,action,after_data,reason) values(p_organization_id,auth.uid(),p_user_id,v_cap,'USER_CAPABILITY_OVERRIDE',jsonb_build_object('effect',p_effect,'scope_type',p_scope_type,'scope_id',p_scope_id),p_reason);
 return v_id;
end;
$$;

alter table public.applications enable row level security;
alter table public.organization_applications enable row level security;
alter table public.application_capabilities enable row level security;
alter table public.access_profiles enable row level security;
alter table public.profile_capabilities enable row level security;
alter table public.user_profile_assignments enable row level security;
alter table public.user_capability_overrides enable row level security;
alter table public.permission_audit_events enable row level security;

create policy applications_read_authenticated on public.applications for select to authenticated using(true);
create policy capabilities_read_authenticated on public.application_capabilities for select to authenticated using(true);
create policy organization_apps_read_members on public.organization_applications for select to authenticated using(public.modular_is_org_member(organization_id));
create policy profiles_read_members on public.access_profiles for select to authenticated using(public.modular_is_org_member(organization_id));
create policy profile_capabilities_read_members on public.profile_capabilities for select to authenticated using(exists(select 1 from public.access_profiles p where p.id=profile_id and public.modular_is_org_member(p.organization_id)));
create policy assignments_read_self_or_admin on public.user_profile_assignments for select to authenticated using(user_id=auth.uid() or public.can_manage_modular_access(organization_id));
create policy overrides_read_self_or_admin on public.user_capability_overrides for select to authenticated using(user_id=auth.uid() or public.can_manage_modular_access(organization_id));
create policy permission_audit_read_admin on public.permission_audit_events for select to authenticated using(public.can_manage_modular_access(organization_id));

revoke insert,update,delete on public.applications,public.organization_applications,public.application_capabilities,public.access_profiles,public.profile_capabilities,public.user_profile_assignments,public.user_capability_overrides,public.permission_audit_events from anon,authenticated;
revoke all on function public.modular_is_org_member(uuid,uuid) from public,anon;
revoke all on function public.can_manage_modular_access(uuid) from public,anon;
revoke all on function public.has_effective_capability(uuid,text,text,uuid) from public,anon;
revoke all on function public.list_effective_applications(uuid) from public,anon;
revoke all on function public.set_organization_application_state(uuid,text,public.module_lifecycle_state,text) from public,anon;
revoke all on function public.create_access_profile(uuid,text,text,text) from public,anon;
revoke all on function public.set_profile_access_level(uuid,text,text,text) from public,anon;
revoke all on function public.assign_access_profile(uuid,uuid,uuid,text,uuid,text) from public,anon;
revoke all on function public.set_user_capability_override(uuid,uuid,text,text,public.permission_effect,text,uuid,text) from public,anon;

grant execute on function public.modular_is_org_member(uuid,uuid) to authenticated,service_role;
grant execute on function public.can_manage_modular_access(uuid) to authenticated,service_role;
grant execute on function public.has_effective_capability(uuid,text,text,uuid) to authenticated,service_role;
grant execute on function public.list_effective_applications(uuid) to authenticated,service_role;
grant execute on function public.set_organization_application_state(uuid,text,public.module_lifecycle_state,text) to authenticated,service_role;
grant execute on function public.create_access_profile(uuid,text,text,text) to authenticated,service_role;
grant execute on function public.set_profile_access_level(uuid,text,text,text) to authenticated,service_role;
grant execute on function public.assign_access_profile(uuid,uuid,uuid,text,uuid,text) to authenticated,service_role;
grant execute on function public.set_user_capability_override(uuid,uuid,text,text,public.permission_effect,text,uuid,text) to authenticated,service_role;
