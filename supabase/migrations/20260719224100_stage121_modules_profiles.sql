begin;

insert into public.app_modules(key,name,description,href,icon_key,display_order,active,sensitive) values
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
on conflict(key) do update set name=excluded.name,description=excluded.description,href=excluded.href,icon_key=excluded.icon_key,display_order=excluded.display_order,active=excluded.active,sensitive=excluded.sensitive;

insert into public.access_profiles(organization_id,code,name,description,base_role,system,active)
select o.id,lower(r.role::text),
case r.role when 'SUPER_ADMIN' then 'Superadministrador' when 'DIRECAO' then 'Direção' when 'ADMINISTRADOR' then 'Administrador' when 'COMERCIAL' then 'Comercial' when 'GESTOR_OBRAS' then 'Gestor de obras' when 'ENGENHEIRO' then 'Engenheiro' when 'ORCAMENTISTA' then 'Orçamentista' when 'FINANCEIRO' then 'Financeiro' when 'QUALIDADE' then 'Qualidade' when 'SAC' then 'SAC' when 'CLIENTE' then 'Cliente' end,
'Perfil padrão vinculado ao papel '||r.role::text,r.role,true,true
from public.organizations o cross join (values
('SUPER_ADMIN'::public.org_role),('DIRECAO'::public.org_role),('ADMINISTRADOR'::public.org_role),('COMERCIAL'::public.org_role),('GESTOR_OBRAS'::public.org_role),('ENGENHEIRO'::public.org_role),('ORCAMENTISTA'::public.org_role),('FINANCEIRO'::public.org_role),('QUALIDADE'::public.org_role),('SAC'::public.org_role),('CLIENTE'::public.org_role)) as r(role)
on conflict(organization_id,code) do update set name=excluded.name,description=excluded.description,base_role=excluded.base_role,system=true,active=true;

update public.organization_memberships om set access_profile_id=ap.id
from public.access_profiles ap
where ap.organization_id=om.organization_id and ap.base_role=om.role and om.access_profile_id is null;

commit;
