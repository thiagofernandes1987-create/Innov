begin;

insert into public.app_modules(
  key,name,description,href,icon_key,display_order,active,sensitive
) values
  ('crm','CRM','Leads, oportunidades e pipeline comercial.','/app/crm','pipeline',10,true,false),
  ('clientes','Clientes','Cadastro, contatos, histórico e obras por cliente.','/app/clientes','clients',20,true,false),
  ('obras','Obras','Carteira multiobra, progresso e operação.','/app/obras','building',30,true,false),
  ('planejamento','Planejamento','EAP, cronograma, marcos e baselines.','/app/planejamento','calendar',40,true,false),
  ('tarefas','Tarefas','Execução, responsáveis, prazos e bloqueios.','/app/tarefas','tasks',50,true,false),
  ('diario','Diário de obras','Registros de campo, fotos, vídeos e ocorrências.','/app/diario','field',60,true,false),
  ('equipes','Equipes e recursos','Mão de obra, equipamentos e alocação.','/app/equipes','team',70,true,true),
  ('orcamentos','Orçamentos','Custos, BDI, markup, margem, lucro e ROI.','/app/orcamentos','budget',80,true,true),
  ('propostas','Propostas','Documentos comerciais, versões e liberações.','/app/propostas','proposal',90,true,true),
  ('contratos','Contratos','Contratos, versões, valores e partes.','/app/contratos','contract',100,true,true),
  ('aditivos','Aditivos','Alterações de escopo, prazo e valor.','/app/aditivos','amendment',110,true,true),
  ('assinaturas','Assinaturas','Envelopes, signatários e evidências.','/app/assinaturas','signature',120,true,true),
  ('documentos','Documentos','Arquivos privados, versões e aprovações.','/app/documentos','documents',130,true,false),
  ('qualidade','Qualidade','PO, FVS, FVM e não conformidades.','/app/qualidade','quality',140,true,false),
  ('compras','Compras','Solicitações, cotações e pedidos.','/app/compras','purchases',150,true,true),
  ('estoque','Estoque','Materiais, movimentações e saldos.','/app/estoque','inventory',160,true,true),
  ('sac','SAC e ocorrências','Chamados, prestação de serviços e comunicação.','/app/sac','support',170,true,false),
  ('relatorios','Relatórios','Indicadores operacionais, financeiros e executivos.','/app/relatorios','reports',180,true,true),
  ('administracao','Administração','Usuários, perfis, acessos e configurações.','/app/administracao','settings',190,true,true),
  ('auditoria','Auditoria','Eventos imutáveis de segurança e negócio.','/app/auditoria','audit',200,true,true)
on conflict(key) do update set
  name=excluded.name,
  description=excluded.description,
  href=excluded.href,
  icon_key=excluded.icon_key,
  display_order=excluded.display_order,
  active=excluded.active,
  sensitive=excluded.sensitive;

insert into public.access_profiles(
  organization_id,code,name,description,base_role,system,active
)
select
  o.id,
  lower(r.role::text),
  case r.role
    when 'SUPER_ADMIN' then 'Superadministrador'
    when 'DIRECAO' then 'Direção'
    when 'ADMINISTRADOR' then 'Administrador'
    when 'COMERCIAL' then 'Comercial'
    when 'GESTOR_OBRAS' then 'Gestor de obras'
    when 'ENGENHEIRO' then 'Engenheiro'
    when 'ORCAMENTISTA' then 'Orçamentista'
    when 'FINANCEIRO' then 'Financeiro'
    when 'QUALIDADE' then 'Qualidade'
    when 'SAC' then 'SAC'
    when 'CLIENTE' then 'Cliente'
  end,
  'Perfil padrão vinculado ao papel ' || r.role::text,
  r.role,
  true,
  true
from public.organizations o
cross join (
  values
    ('SUPER_ADMIN'::public.org_role),('DIRECAO'::public.org_role),
    ('ADMINISTRADOR'::public.org_role),('COMERCIAL'::public.org_role),
    ('GESTOR_OBRAS'::public.org_role),('ENGENHEIRO'::public.org_role),
    ('ORCAMENTISTA'::public.org_role),('FINANCEIRO'::public.org_role),
    ('QUALIDADE'::public.org_role),('SAC'::public.org_role),('CLIENTE'::public.org_role)
) as r(role)
on conflict(organization_id,code) do update set
  name=excluded.name,
  description=excluded.description,
  base_role=excluded.base_role,
  system=true,
  active=true;

update public.organization_memberships om
set access_profile_id=ap.id
from public.access_profiles ap
where ap.organization_id=om.organization_id
  and ap.base_role=om.role
  and om.access_profile_id is null;

with permission_matrix(role,module_key,level,approve,release,sign_doc,export_data,administer,view_sensitive) as (
  values
    ('SUPER_ADMIN'::public.org_role,'*','DELETE'::public.app_access_level,true,true,true,true,true,true),
    ('DIRECAO'::public.org_role,'*','DELETE'::public.app_access_level,true,true,true,true,true,true),
    ('ADMINISTRADOR'::public.org_role,'*','DELETE'::public.app_access_level,true,true,true,true,true,true),

    ('COMERCIAL'::public.org_role,'crm','EDIT'::public.app_access_level,false,false,false,true,false,false),
    ('COMERCIAL'::public.org_role,'clientes','EDIT'::public.app_access_level,false,false,false,true,false,false),
    ('COMERCIAL'::public.org_role,'obras','READ'::public.app_access_level,false,false,false,false,false,false),
    ('COMERCIAL'::public.org_role,'propostas','EDIT'::public.app_access_level,false,true,false,true,false,false),
    ('COMERCIAL'::public.org_role,'contratos','READ'::public.app_access_level,false,false,false,true,false,false),
    ('COMERCIAL'::public.org_role,'assinaturas','READ'::public.app_access_level,false,false,false,false,false,false),
    ('COMERCIAL'::public.org_role,'relatorios','READ'::public.app_access_level,false,false,false,true,false,false),

    ('GESTOR_OBRAS'::public.org_role,'clientes','READ'::public.app_access_level,false,false,false,false,false,false),
    ('GESTOR_OBRAS'::public.org_role,'obras','EDIT'::public.app_access_level,true,true,false,true,false,false),
    ('GESTOR_OBRAS'::public.org_role,'planejamento','EDIT'::public.app_access_level,true,true,false,true,false,false),
    ('GESTOR_OBRAS'::public.org_role,'tarefas','EDIT'::public.app_access_level,true,true,false,true,false,false),
    ('GESTOR_OBRAS'::public.org_role,'diario','EDIT'::public.app_access_level,true,true,false,true,false,false),
    ('GESTOR_OBRAS'::public.org_role,'equipes','EDIT'::public.app_access_level,false,false,false,true,false,true),
    ('GESTOR_OBRAS'::public.org_role,'contratos','READ'::public.app_access_level,false,false,false,false,false,false),
    ('GESTOR_OBRAS'::public.org_role,'assinaturas','READ'::public.app_access_level,false,false,false,false,false,false),
    ('GESTOR_OBRAS'::public.org_role,'documentos','EDIT'::public.app_access_level,true,true,false,true,false,false),
    ('GESTOR_OBRAS'::public.org_role,'qualidade','EDIT'::public.app_access_level,true,true,false,true,false,false),
    ('GESTOR_OBRAS'::public.org_role,'relatorios','READ'::public.app_access_level,false,false,false,true,false,false),

    ('ENGENHEIRO'::public.org_role,'clientes','READ'::public.app_access_level,false,false,false,false,false,false),
    ('ENGENHEIRO'::public.org_role,'obras','EDIT'::public.app_access_level,false,true,false,true,false,false),
    ('ENGENHEIRO'::public.org_role,'planejamento','EDIT'::public.app_access_level,false,true,false,true,false,false),
    ('ENGENHEIRO'::public.org_role,'tarefas','EDIT'::public.app_access_level,false,true,false,true,false,false),
    ('ENGENHEIRO'::public.org_role,'diario','EDIT'::public.app_access_level,false,true,false,true,false,false),
    ('ENGENHEIRO'::public.org_role,'equipes','READ'::public.app_access_level,false,false,false,false,false,true),
    ('ENGENHEIRO'::public.org_role,'documentos','EDIT'::public.app_access_level,false,true,false,true,false,false),
    ('ENGENHEIRO'::public.org_role,'qualidade','EDIT'::public.app_access_level,false,true,false,true,false,false),
    ('ENGENHEIRO'::public.org_role,'relatorios','READ'::public.app_access_level,false,false,false,true,false,false),

    ('ORCAMENTISTA'::public.org_role,'clientes','READ'::public.app_access_level,false,false,false,false,false,false),
    ('ORCAMENTISTA'::public.org_role,'obras','READ'::public.app_access_level,false,false,false,false,false,false),
    ('ORCAMENTISTA'::public.org_role,'orcamentos','EDIT'::public.app_access_level,false,false,false,true,false,true),
    ('ORCAMENTISTA'::public.org_role,'propostas','EDIT'::public.app_access_level,false,true,false,true,false,true),
    ('ORCAMENTISTA'::public.org_role,'contratos','READ'::public.app_access_level,false,false,false,true,false,false),
    ('ORCAMENTISTA'::public.org_role,'documentos','READ'::public.app_access_level,false,false,false,true,false,false),
    ('ORCAMENTISTA'::public.org_role,'relatorios','READ'::public.app_access_level,false,false,false,true,false,true),

    ('FINANCEIRO'::public.org_role,'clientes','READ'::public.app_access_level,false,false,false,false,false,false),
    ('FINANCEIRO'::public.org_role,'orcamentos','READ'::public.app_access_level,true,false,false,true,false,true),
    ('FINANCEIRO'::public.org_role,'propostas','READ'::public.app_access_level,true,false,false,true,false,true),
    ('FINANCEIRO'::public.org_role,'contratos','EDIT'::public.app_access_level,true,false,false,true,false,true),
    ('FINANCEIRO'::public.org_role,'aditivos','EDIT'::public.app_access_level,true,false,false,true,false,true),
    ('FINANCEIRO'::public.org_role,'assinaturas','READ'::public.app_access_level,false,false,false,true,false,false),
    ('FINANCEIRO'::public.org_role,'relatorios','EDIT'::public.app_access_level,true,false,false,true,false,true),
    ('FINANCEIRO'::public.org_role,'auditoria','READ'::public.app_access_level,false,false,false,true,false,true),

    ('QUALIDADE'::public.org_role,'clientes','READ'::public.app_access_level,false,false,false,false,false,false),
    ('QUALIDADE'::public.org_role,'obras','READ'::public.app_access_level,false,false,false,false,false,false),
    ('QUALIDADE'::public.org_role,'planejamento','READ'::public.app_access_level,false,false,false,false,false,false),
    ('QUALIDADE'::public.org_role,'tarefas','READ'::public.app_access_level,false,false,false,false,false,false),
    ('QUALIDADE'::public.org_role,'diario','EDIT'::public.app_access_level,true,true,false,true,false,false),
    ('QUALIDADE'::public.org_role,'documentos','EDIT'::public.app_access_level,true,true,false,true,false,false),
    ('QUALIDADE'::public.org_role,'qualidade','EDIT'::public.app_access_level,true,true,false,true,false,false),
    ('QUALIDADE'::public.org_role,'relatorios','READ'::public.app_access_level,false,false,false,true,false,false),

    ('SAC'::public.org_role,'clientes','READ'::public.app_access_level,false,false,false,false,false,false),
    ('SAC'::public.org_role,'obras','READ'::public.app_access_level,false,false,false,false,false,false),
    ('SAC'::public.org_role,'documentos','READ'::public.app_access_level,false,false,false,false,false,false),
    ('SAC'::public.org_role,'sac','EDIT'::public.app_access_level,true,true,false,true,false,false),
    ('SAC'::public.org_role,'relatorios','READ'::public.app_access_level,false,false,false,true,false,false)
), expanded as (
  select
    ap.organization_id,
    ap.id as profile_id,
    m.id as module_id,
    pm.level,
    pm.approve,
    pm.release,
    pm.sign_doc,
    pm.export_data,
    pm.administer,
    pm.view_sensitive
  from permission_matrix pm
  join public.access_profiles ap on ap.base_role=pm.role
  join public.app_modules m on pm.module_key='*' or m.key=pm.module_key
)
insert into public.profile_module_permissions(
  organization_id,profile_id,module_id,access_level,can_approve,can_release,
  can_sign,can_export,can_administer,can_view_sensitive
)
select
  organization_id,profile_id,module_id,level,approve,release,
  sign_doc,export_data,administer,view_sensitive
from expanded
on conflict(profile_id,module_id) do update set
  access_level=excluded.access_level,
  can_approve=excluded.can_approve,
  can_release=excluded.can_release,
  can_sign=excluded.can_sign,
  can_export=excluded.can_export,
  can_administer=excluded.can_administer,
  can_view_sensitive=excluded.can_view_sensitive;

commit;
