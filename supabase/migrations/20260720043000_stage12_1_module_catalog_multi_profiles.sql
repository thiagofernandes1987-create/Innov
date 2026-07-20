-- Etapa 12.1 — catálogo plug-and-play e múltiplos perfis por usuário.

insert into public.app_modules(
  key,name,description,href,icon_key,display_order,active,sensitive,
  version,category,manifest,default_enabled,is_core
) values
('crm','CRM e Vendas','Leads, oportunidades e pipeline comercial.','/app/crm','target',10,true,false,'1.0.0','COMERCIAL','{"navigationLabel":"CRM"}',true,false),
('clientes','Clientes','Cadastro de clientes e visão multiobra.','/app/clientes','users',20,true,false,'1.0.0','COMERCIAL','{"navigationLabel":"Clientes"}',true,false),
('obras','Obras','Carteira multiobra e progresso executivo.','/app/obras','building',30,true,false,'1.0.0','OPERACIONAL','{"navigationLabel":"Obras"}',true,false),
('planejamento','Planejamento','EAP, cronogramas, marcos e baselines.','/app/planejamento','calendar',40,true,false,'1.0.0','OPERACIONAL','{"navigationLabel":"Planejamento"}',true,false),
('tarefas','Tarefas','Quadros de execução e responsabilidades.','/app/tarefas','check-square',50,true,false,'1.0.0','OPERACIONAL','{"navigationLabel":"Tarefas"}',true,false),
('diario','Diário de Obras','Registros, atividades e evidências de campo.','/app/diario','clipboard',60,true,false,'1.0.0','OPERACIONAL','{"navigationLabel":"Diário de obras"}',true,false),
('equipes','Equipes','Equipes, integrantes e recursos.','/app/equipes','hard-hat',70,true,false,'1.0.0','OPERACIONAL','{"navigationLabel":"Equipes"}',true,false),
('orcamentos','Orçamentos','Custos, BDI, markup, cenários e aprovações.','/app/orcamentos','calculator',80,true,true,'1.0.0','FINANCEIRO','{"navigationLabel":"Orçamentos"}',true,false),
('propostas','Propostas','Propostas comerciais e versões liberadas.','/app/propostas','file-text',90,true,false,'1.0.0','COMERCIAL','{"navigationLabel":"Propostas"}',true,false),
('contratos','Contratos','Contratos, partes, versões e vigência.','/app/contratos','scroll',100,true,true,'1.0.0','JURIDICO','{"navigationLabel":"Contratos"}',true,false),
('aditivos','Aditivos','Alterações de valor, escopo e prazo.','/app/aditivos','file-plus',110,true,true,'1.0.0','JURIDICO','{"navigationLabel":"Aditivos"}',true,false),
('assinaturas','Assinaturas','Envelopes, signatários e evidências.','/app/assinaturas','pen-tool',120,true,true,'1.0.0','JURIDICO','{"navigationLabel":"Assinaturas"}',true,false),
('documentos','Documentos','Arquivos privados, versões e liberações.','/app/documentos','folder',130,true,false,'1.0.0','OPERACIONAL','{"navigationLabel":"Documentos"}',true,false),
('qualidade','Qualidade','PO, FVS, FVM e não conformidades.','/app/qualidade','shield-check',140,true,false,'1.0.0','QUALIDADE','{"navigationLabel":"Qualidade"}',false,false),
('compras','Compras','Solicitações, cotações e pedidos.','/app/compras','shopping-cart',150,true,true,'1.0.0','SUPRIMENTOS','{"navigationLabel":"Compras"}',false,false),
('estoque','Estoque','Entradas, saídas e inventários.','/app/estoque','package',160,true,false,'1.0.0','SUPRIMENTOS','{"navigationLabel":"Estoque"}',false,false),
('financeiro','Financeiro','Contas, fluxo de caixa e conciliação.','/app/financeiro','landmark',170,true,true,'1.0.0','FINANCEIRO','{"navigationLabel":"Financeiro"}',false,false),
('sac','Pós-venda e SAC','Ocorrências e prestação de serviços.','/app/ocorrencias','headphones',180,true,false,'1.0.0','POS_VENDA','{"navigationLabel":"Pós-venda"}',true,false),
('relatorios','Relatórios','Indicadores e análises autorizadas.','/app/relatorios','bar-chart',190,true,true,'1.0.0','GERAL','{"navigationLabel":"Relatórios"}',true,false),
('auditoria','Auditoria','Eventos de segurança e alterações.','/app/auditoria','history',200,true,true,'1.0.0','NUCLEO','{"navigationLabel":"Auditoria"}',true,true),
('administracao','Administração','Aplicativos, perfis e usuários.','/app/administracao','settings',210,true,true,'1.0.0','NUCLEO','{"navigationLabel":"Administração"}',true,true)
on conflict(key) do update set
  name=excluded.name,
  description=excluded.description,
  href=excluded.href,
  icon_key=excluded.icon_key,
  display_order=excluded.display_order,
  active=excluded.active,
  sensitive=excluded.sensitive,
  version=excluded.version,
  category=excluded.category,
  manifest=excluded.manifest,
  default_enabled=excluded.default_enabled,
  is_core=excluded.is_core,
  updated_at=now();

insert into public.app_module_dependencies(module_id,depends_on_module_id,minimum_version,required)
select module.id,dependency.id,'1.0.0',true
from (values
  ('obras','clientes'),
  ('planejamento','obras'),
  ('tarefas','obras'),
  ('diario','obras'),
  ('equipes','obras'),
  ('orcamentos','clientes'),
  ('propostas','orcamentos'),
  ('contratos','propostas'),
  ('aditivos','contratos'),
  ('assinaturas','documentos'),
  ('qualidade','obras'),
  ('estoque','compras'),
  ('sac','clientes')
) dependency_map(module_key,dependency_key)
join public.app_modules module on module.key=dependency_map.module_key
join public.app_modules dependency on dependency.key=dependency_map.dependency_key
on conflict(module_id,depends_on_module_id) do update set
  minimum_version=excluded.minimum_version,
  required=excluded.required;

create table if not exists public.membership_access_profiles(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  membership_id uuid not null references public.organization_memberships(id) on delete cascade,
  profile_id uuid not null references public.access_profiles(id) on delete cascade,
  scope_type text not null default 'ORGANIZATION'
    check(scope_type in('ORGANIZATION','CLIENT','PROJECT')),
  scope_id uuid,
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists membership_access_profiles_unique_nd
  on public.membership_access_profiles(
    organization_id,membership_id,profile_id,scope_type,scope_id
  ) nulls not distinct;
create index if not exists membership_access_profiles_membership_idx
  on public.membership_access_profiles(membership_id,active,starts_at,ends_at);
create index if not exists membership_access_profiles_scope_idx
  on public.membership_access_profiles(scope_type,scope_id);
